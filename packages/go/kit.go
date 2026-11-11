package backupkit

import (
	"compress/gzip"
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

type Kit struct {
	Config ResolvedConfig
}

func New(cfg Config) (*Kit, error) {
	resolved, err := DefineConfig(cfg)
	if err != nil {
		return nil, err
	}
	return &Kit{Config: resolved}, nil
}

func MustNew(cfg Config) *Kit {
	k, err := New(cfg)
	if err != nil {
		panic(err)
	}
	return k
}

func (k *Kit) Backup() (*BackupResult, error) {
	started := time.Now()
	runID := randomHex(3)
	jobName := k.Config.Name
	if jobName == "" {
		jobName = "backup"
	}

	type sourceDump struct {
		Name    string
		Driver  string
		Payload []byte
	}
	var dumps []sourceDump
	for i, src := range k.Config.Sources {
		name := src.Name
		if name == "" {
			name = fmt.Sprintf("%s-%d", src.Driver, i)
		}
		payload, _ := json.Marshal(map[string]any{
			"driver":     src.Driver,
			"sourceName": name,
			"stub":       true,
			"kind":       src.Kind,
		})
		dumps = append(dumps, sourceDump{Name: name, Driver: src.Driver, Payload: append(payload, '\n')})
	}

	stamp := time.Now().UTC().Format("20060102T150405Z")
	key := fmt.Sprintf("%s_%s_%s.bk", jobName, stamp, runID)

	manifest := map[string]any{
		"formatVersion": 1,
		"createdAt":     time.Now().UTC().Format(time.RFC3339),
		"kitVersion":    Version,
		"jobName":       jobName,
		"compression":   k.Config.Compression,
		"sources": func() []map[string]any {
			out := make([]map[string]any, 0, len(dumps))
			for _, d := range dumps {
				out = append(out, map[string]any{
					"name":     d.Name,
					"driver":   d.Driver,
					"bytes":    len(d.Payload),
					"checksum": checksum(d.Payload),
				})
			}
			return out
		}(),
	}

	raw := mustJSON(map[string]any{"manifest": manifest, "sources": dumps})
	payload, err := compress(raw, k.Config.Compression)
	if err != nil {
		return nil, err
	}

	var artifacts []ArtifactRef
	createdAt := time.Now().UTC().Format(time.RFC3339)
	sum := checksum(payload)
	for _, out := range k.Config.Outputs {
		store, err := resolveStorage(out)
		if err != nil {
			return nil, err
		}
		if err := store.Put(key, payload); err != nil {
			return nil, err
		}
		artifacts = append(artifacts, ArtifactRef{
			Key:       key,
			Bytes:     len(payload),
			Checksum:  sum,
			CreatedAt: createdAt,
			Output:    out.Name,
			Driver:    out.Driver,
		})
	}

	return &BackupResult{
		RunID:   runID,
		JobName: jobName,
		Artifact: ArtifactRef{
			Key:       key,
			Bytes:     len(payload),
			Checksum:  sum,
			CreatedAt: createdAt,
		},
		Artifacts:   artifacts,
		Compression: k.Config.Compression,
		DurationMs:  time.Since(started).Milliseconds(),
	}, nil
}

func (k *Kit) List(outputName string) ([]ArtifactRef, error) {
	var all []ArtifactRef
	for _, out := range k.Config.Outputs {
		if outputName != "" && out.Name != outputName && out.Driver != outputName {
			continue
		}
		store, err := resolveStorage(out)
		if err != nil {
			return nil, err
		}
		items, err := store.List("")
		if err != nil {
			return nil, err
		}
		for _, item := range items {
			item.Output = out.Name
			item.Driver = out.Driver
			all = append(all, item)
		}
	}
	return all, nil
}

func (k *Kit) Prune(outputName string) (deleted, kept []string, err error) {
	for _, out := range k.Config.Outputs {
		if outputName != "" && out.Name != outputName && out.Driver != outputName {
			continue
		}
		store, err := resolveStorage(out)
		if err != nil {
			return nil, nil, err
		}
		items, err := store.List("")
		if err != nil {
			return nil, nil, err
		}
		d, kp := selectDeletions(items, k.Config.Retention)
		for _, key := range d {
			_ = store.Delete(key)
			deleted = append(deleted, out.Name+":"+key)
		}
		for _, key := range kp {
			kept = append(kept, out.Name+":"+key)
		}
	}
	return deleted, kept, nil
}

// RunScheduled runs backup then prune when configured.
func (k *Kit) RunScheduled() (*BackupResult, error) {
	result, err := k.Backup()
	if err != nil {
		return nil, err
	}
	prune := true
	if k.Config.Schedule != nil && k.Config.Schedule.PruneAfterBackup != nil {
		prune = *k.Config.Schedule.PruneAfterBackup
	}
	if prune {
		_, _, _ = k.Prune("")
	}
	return result, nil
}

func compress(data []byte, algorithm string) ([]byte, error) {
	switch algorithm {
	case "", "gzip":
		var buf bytes.Buffer
		w := gzip.NewWriter(&buf)
		if _, err := w.Write(data); err != nil {
			return nil, err
		}
		if err := w.Close(); err != nil {
			return nil, err
		}
		return buf.Bytes(), nil
	case "none":
		return data, nil
	case "zstd":
		return nil, fmt.Errorf("zstd compression not enabled in Go runtime yet; use gzip")
	default:
		return nil, fmt.Errorf("unknown compression: %s", algorithm)
	}
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func selectDeletions(artifacts []ArtifactRef, retention Retention) (deleted, kept []string) {
	if retention.KeepLast == nil && retention.KeepDaily == nil &&
		retention.KeepWeekly == nil && retention.KeepMonthly == nil &&
		retention.KeepYearly == nil && retention.MaxAgeDays == nil {
		for _, a := range artifacts {
			kept = append(kept, a.Key)
		}
		return
	}

	sorted := append([]ArtifactRef(nil), artifacts...)
	sortByCreatedDesc(sorted)

	keepSet := map[string]bool{}
	if retention.KeepLast != nil {
		for i, a := range sorted {
			if i >= *retention.KeepLast {
				break
			}
			keepSet[a.Key] = true
		}
	}

	hasKeep := retention.KeepLast != nil || retention.KeepDaily != nil ||
		retention.KeepWeekly != nil || retention.KeepMonthly != nil || retention.KeepYearly != nil

	now := time.Now().UTC()
	for _, a := range sorted {
		tooOld := false
		if retention.MaxAgeDays != nil {
			t, err := time.Parse(time.RFC3339, a.CreatedAt)
			if err == nil && now.Sub(t).Hours()/24 > float64(*retention.MaxAgeDays) {
				tooOld = true
			}
		}
		if tooOld {
			deleted = append(deleted, a.Key)
			continue
		}
		if !hasKeep || keepSet[a.Key] {
			kept = append(kept, a.Key)
		} else {
			deleted = append(deleted, a.Key)
		}
	}
	return
}

func sortByCreatedDesc(items []ArtifactRef) {
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].CreatedAt > items[i].CreatedAt {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}
