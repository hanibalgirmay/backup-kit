package backupkit

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type Storage interface {
	ID() string
	Put(key string, payload []byte) error
	Get(key string) ([]byte, error)
	List(prefix string) ([]ArtifactRef, error)
	Delete(key string) error
}

type localStorage struct {
	root string
}

func NewLocalStorage(path string) Storage {
	if path == "" {
		path = "./backups"
	}
	return &localStorage{root: path}
}

func (l *localStorage) ID() string { return "local" }

func (l *localStorage) Put(key string, payload []byte) error {
	if err := os.MkdirAll(l.root, 0o775); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(l.root, key), payload, 0o644)
}

func (l *localStorage) Get(key string) ([]byte, error) {
	return os.ReadFile(filepath.Join(l.root, key))
}

func (l *localStorage) List(prefix string) ([]ArtifactRef, error) {
	entries, err := os.ReadDir(l.root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var out []ArtifactRef
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if prefix != "" && !strings.HasPrefix(name, prefix) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		out = append(out, ArtifactRef{
			Key:       name,
			Bytes:     int(info.Size()),
			CreatedAt: info.ModTime().UTC().Format(time.RFC3339),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt > out[j].CreatedAt })
	return out, nil
}

func (l *localStorage) Delete(key string) error {
	return os.Remove(filepath.Join(l.root, key))
}

type memStorage struct {
	id   string
	mu   sync.Mutex
	data map[string]struct {
		bytes []byte
		at    time.Time
	}
	prefix string
}

func NewStubStorage(id string, connection map[string]any) Storage {
	prefix, _ := connection["prefix"].(string)
	return &memStorage{
		id:     id,
		data:   map[string]struct{ bytes []byte; at time.Time }{},
		prefix: prefix,
	}
}

func (m *memStorage) ID() string { return m.id }

func (m *memStorage) fullKey(key string) string {
	if m.prefix == "" {
		return key
	}
	if strings.HasSuffix(m.prefix, "/") {
		return m.prefix + key
	}
	return m.prefix + "/" + key
}

func (m *memStorage) Put(key string, payload []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.data[m.fullKey(key)] = struct {
		bytes []byte
		at    time.Time
	}{bytes: payload, at: time.Now().UTC()}
	return nil
}

func (m *memStorage) Get(key string) ([]byte, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	hit, ok := m.data[m.fullKey(key)]
	if !ok {
		return nil, fmt.Errorf("artifact not found: %s", key)
	}
	return hit.bytes, nil
}

func (m *memStorage) List(prefix string) ([]ArtifactRef, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	needle := m.fullKey(prefix)
	var out []ArtifactRef
	for k, v := range m.data {
		if needle != "" && !strings.HasPrefix(k, needle) {
			continue
		}
		pub := k
		if m.prefix != "" && strings.HasPrefix(k, strings.TrimRight(m.prefix, "/")+"/") {
			pub = strings.TrimPrefix(k, strings.TrimRight(m.prefix, "/")+"/")
		}
		out = append(out, ArtifactRef{
			Key:       pub,
			Bytes:     len(v.bytes),
			CreatedAt: v.at.Format(time.RFC3339),
		})
	}
	return out, nil
}

func (m *memStorage) Delete(key string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.data, m.fullKey(key))
	return nil
}

func resolveStorage(out Output) (Storage, error) {
	driver := NormalizeOutputDriver(out.Driver)
	conn := map[string]any{}
	for k, v := range out.Options {
		conn[k] = v
	}
	for k, v := range out.Connection {
		conn[k] = v
	}
	if out.Path != "" {
		conn["path"] = out.Path
	}
	if out.Host != "" {
		conn["host"] = out.Host
	}
	if out.Port != nil {
		conn["port"] = *out.Port
	}
	if out.Endpoint != "" {
		conn["endpoint"] = out.Endpoint
	}
	for k, v := range out.Credentials {
		conn[k] = v
	}

	switch driver {
	case "local":
		path, _ := conn["path"].(string)
		return NewLocalStorage(path), nil
	case "s3", "gcs", "azure", "sftp", "webdav", "drive":
		if err := assertRemote(driver, conn); err != nil {
			return nil, err
		}
		return NewStubStorage(driver, conn), nil
	default:
		return nil, fmt.Errorf("unknown storage driver: %s", driver)
	}
}

func assertRemote(driver string, conn map[string]any) error {
	hasAuth := conn["password"] != nil || conn["privateKey"] != nil ||
		conn["accessKeyId"] != nil || conn["secretAccessKey"] != nil ||
		conn["token"] != nil || conn["keyFile"] != nil ||
		conn["connectionString"] != nil || conn["useDefault"] == true ||
		conn["useDefaultCredentials"] == true || conn["agent"] == true

	switch driver {
	case "s3":
		if conn["bucket"] == nil || conn["bucket"] == "" {
			return fmt.Errorf("S3 output requires connection.bucket")
		}
		if !hasAuth {
			return fmt.Errorf("S3 output requires credentials")
		}
	case "sftp":
		if conn["host"] == nil || conn["host"] == "" {
			return fmt.Errorf("SFTP/SSH output requires host")
		}
		if conn["username"] == nil || conn["username"] == "" {
			return fmt.Errorf("SFTP/SSH output requires username")
		}
		if !hasAuth {
			return fmt.Errorf("SFTP/SSH output requires password, privateKey, or agent")
		}
	case "drive":
		if !hasAuth {
			return fmt.Errorf("Drive output requires credentials")
		}
	}
	return nil
}

func checksum(data []byte) string {
	sum := sha256.Sum256(data)
	return "sha256:" + hex.EncodeToString(sum[:])
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
