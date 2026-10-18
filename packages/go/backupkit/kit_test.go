package backupkit_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/backup-kit/backup-kit/backupkit"
)

func TestDefineConfigAutoDatabase(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/app")
	cfg, err := backupkit.DefineConfig(backupkit.Config{
		Schedule: "0 2 * * *",
	})
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Sources[0].Driver != "postgres" {
		t.Fatalf("driver=%s", cfg.Sources[0].Driver)
	}
	if cfg.Outputs[0].Driver != "local" {
		t.Fatalf("output=%s", cfg.Outputs[0].Driver)
	}
	if cfg.Schedule == nil || cfg.Schedule.Cron != "0 2 * * *" {
		t.Fatalf("schedule=%v", cfg.Schedule)
	}
	if cfg.Compression != "gzip" {
		t.Fatalf("compression=%s", cfg.Compression)
	}
}

func TestNormalizeSSHAlias(t *testing.T) {
	if got := backupkit.NormalizeOutputDriver("ssh"); got != "sftp" {
		t.Fatalf("got %s", got)
	}
}

func TestBackupLocal(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "backups")
	kit, err := backupkit.New(backupkit.Config{
		Name: "test",
		Sources: []backupkit.Source{
			{Driver: "sqlite", Connection: map[string]any{"path": ":memory:"}},
		},
		Outputs: []backupkit.Output{
			{Driver: "local", Path: dir},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	result, err := kit.Backup()
	if err != nil {
		t.Fatal(err)
	}
	if result.Artifact.Key == "" {
		t.Fatal("empty key")
	}
	entries, _ := os.ReadDir(dir)
	if len(entries) == 0 {
		t.Fatal("expected artifact on disk")
	}
}

func TestSSHRequiresHost(t *testing.T) {
	_, err := backupkit.New(backupkit.Config{
		Sources: []backupkit.Source{{Driver: "mysql", Connection: "mysql://localhost/db"}},
		Outputs: []backupkit.Output{
			{Driver: "ssh", Connection: map[string]any{"username": "backup"}},
		},
	})
	if err != nil {
		// New succeeds; error on Backup when resolving storage
	}
	kit, err := backupkit.New(backupkit.Config{
		Sources: []backupkit.Source{{Driver: "mysql", Connection: "mysql://localhost/db"}},
		Outputs: []backupkit.Output{
			{
				Driver: "ssh",
				Host:   "1.2.3.4",
				Connection: map[string]any{
					"username": "backup",
				},
				Credentials: map[string]any{
					"password": "x",
				},
			},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if kit.Config.Outputs[0].Driver != "sftp" {
		t.Fatalf("expected sftp, got %s", kit.Config.Outputs[0].Driver)
	}
	if _, err := kit.Backup(); err != nil {
		t.Fatal(err)
	}
}
