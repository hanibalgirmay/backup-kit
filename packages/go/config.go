package backupkit

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

// DefineConfig normalizes framework-first config (auto DB, defaults, schedule).
func DefineConfig(cfg Config) (ResolvedConfig, error) {
	env := environMap()

	sources := cfg.Sources
	database := cfg.Database
	if len(sources) == 0 {
		if database == nil {
			database = "auto"
		}
		switch v := database.(type) {
		case string:
			if v == "auto" || v == "" {
				discovered, err := DiscoverDatabaseSources(env)
				if err != nil {
					return ResolvedConfig{}, err
				}
				sources = discovered
			} else {
				return ResolvedConfig{}, fmt.Errorf("invalid database string %q", v)
			}
		case Source:
			sources = []Source{normalizeSource(v)}
		case []Source:
			for _, s := range v {
				sources = append(sources, normalizeSource(s))
			}
		case map[string]any:
			raw, _ := json.Marshal(v)
			var s Source
			_ = json.Unmarshal(raw, &s)
			sources = []Source{normalizeSource(s)}
		default:
			// try JSON round-trip for []any
			raw, _ := json.Marshal(v)
			var list []Source
			if err := json.Unmarshal(raw, &list); err == nil && len(list) > 0 {
				for _, s := range list {
					sources = append(sources, normalizeSource(s))
				}
			} else {
				return ResolvedConfig{}, fmt.Errorf("invalid database config")
			}
		}
	} else {
		normalized := make([]Source, 0, len(sources))
		for _, s := range sources {
			normalized = append(normalized, normalizeSource(s))
		}
		sources = normalized
	}

	outputs := cfg.Outputs
	if len(outputs) == 0 && cfg.Destination != nil {
		outputs = []Output{*cfg.Destination}
	}
	if len(outputs) == 0 {
		outputs = []Output{DefaultOutput}
	}
	for i := range outputs {
		outputs[i].Driver = NormalizeOutputDriver(outputs[i].Driver)
		if outputs[i].Name == "" {
			if outputs[i].Driver == "local" && len(outputs) == 1 {
				outputs[i].Name = "local"
			} else {
				outputs[i].Name = fmt.Sprintf("%s-%d", outputs[i].Driver, i)
			}
		}
		if outputs[i].Driver == "local" && outputs[i].Path == "" {
			outputs[i].Path = DefaultOutput.Path
		}
		if (outputs[i].Driver == "sftp") && outputs[i].Port == nil {
			p := 22
			outputs[i].Port = &p
		}
	}

	retention := DefaultRetention
	if cfg.Retention != nil {
		retention = *cfg.Retention
		if retention.KeepLast == nil && retention.KeepDaily == nil &&
			retention.KeepWeekly == nil && retention.KeepMonthly == nil &&
			retention.KeepYearly == nil && retention.MaxAgeDays == nil {
			retention.KeepLast = intPtr(7)
		}
	}

	var schedule *Schedule
	switch v := cfg.Schedule.(type) {
	case string:
		if v != "" {
			schedule = &Schedule{Cron: v, Enabled: boolPtr(true), PruneAfterBackup: boolPtr(true)}
		}
	case Schedule:
		s := v
		if s.Enabled == nil {
			s.Enabled = boolPtr(true)
		}
		if s.PruneAfterBackup == nil {
			s.PruneAfterBackup = boolPtr(true)
		}
		schedule = &s
	case map[string]any:
		raw, _ := json.Marshal(v)
		var s Schedule
		if err := json.Unmarshal(raw, &s); err == nil && s.Cron != "" {
			if s.Enabled == nil {
				s.Enabled = boolPtr(true)
			}
			if s.PruneAfterBackup == nil {
				s.PruneAfterBackup = boolPtr(true)
			}
			schedule = &s
		}
	}

	compression := cfg.Compression
	if compression == "" {
		compression = DefaultCompression
	}
	framework := cfg.Framework
	if framework == "" {
		framework = "auto"
	}

	return ResolvedConfig{
		Version:     1,
		Name:        cfg.Name,
		Framework:   framework,
		Sources:     sources,
		Outputs:     outputs,
		Destination: outputs[0],
		Retention:   retention,
		Schedule:    schedule,
		Compression: compression,
		Metadata:    cfg.Metadata,
	}, nil
}

func normalizeSource(s Source) Source {
	s.Driver = NormalizeDBDriver(s.Driver)
	if s.Kind == "" {
		s.Kind = InferKind(s.Driver)
	}
	if str, ok := s.Connection.(string); ok {
		s.Connection = interpolate(str, environMap())
	}
	return s
}

func interpolate(value string, env map[string]string) string {
	// minimal ${VAR} / ${VAR:-default}
	out := value
	for {
		start := strings.Index(out, "${")
		if start < 0 {
			break
		}
		end := strings.Index(out[start:], "}")
		if end < 0 {
			break
		}
		end += start
		inner := out[start+2 : end]
		name := inner
		fallback := ""
		if i := strings.Index(inner, ":-"); i >= 0 {
			name = inner[:i]
			fallback = inner[i+2:]
		}
		repl := env[name]
		if repl == "" {
			repl = fallback
		}
		out = out[:start] + repl + out[end+1:]
	}
	return out
}

// LoadConfigJSON loads a backup-kit.config.json file.
func LoadConfigJSON(path string) (ResolvedConfig, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return ResolvedConfig{}, err
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return ResolvedConfig{}, err
	}
	return DefineConfig(cfg)
}
