# Go

Package: [`packages/go`](../../packages/go) — Go module **`github.com/backup-kit/backup-kit`**.

## Install

```bash
go get github.com/backup-kit/backup-kit/backupkit
```

## Usage

```go
kit, err := backupkit.New(backupkit.Config{
  Database: "auto",
  Schedule: "0 2 * * *",
  Outputs: []backupkit.Output{
    {Driver: "local", Path: "./backups"},
    {Driver: "ssh", Host: "backup.example.com", Connection: map[string]any{"username": "backup"}, Credentials: map[string]any{"privateKey": map[string]any{"file": "./id_ed25519"}}},
  },
})
result, err := kit.Backup()
```

## Gin

See [docs/frameworks/go.md](../frameworks/go.md) and [`examples/go-gin`](../../examples/go-gin).
