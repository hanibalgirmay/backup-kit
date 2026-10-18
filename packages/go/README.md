# backup-kit (Go)

Go module for framework-first database backups. Published separately from npm/Composer/PyPI.

## Install

```bash
go get github.com/backup-kit/backup-kit/backupkit
```

## Usage

```go
package main

import (
  "fmt"
  "log"

  "github.com/backup-kit/backup-kit/backupkit"
)

func main() {
  kit, err := backupkit.New(backupkit.Config{
    Name:     "app",
    Database: "auto", // DATABASE_URL / DB_*
    Schedule: "0 2 * * *",
    Retention: &backupkit.Retention{KeepLast: backupkit.Int(7)},
    Outputs: []backupkit.Output{
      {Driver: "local", Path: "./backups"},
      {
        Driver: "ssh", // any SSH host (alias of sftp)
        Host:   "backup.example.com",
        Connection: map[string]any{
          "username":   "backup",
          "remotePath": "/var/backups",
        },
        Credentials: map[string]any{
          "privateKey": map[string]any{"file": "./id_ed25519"},
        },
      },
    },
  })
  if err != nil {
    log.Fatal(err)
  }
  result, err := kit.Backup()
  if err != nil {
    log.Fatal(err)
  }
  fmt.Println(result.Artifact.Key)
}
```

Quick start with `MustNew`:

```go
kit := backupkit.MustNew(backupkit.Config{
  Database: "auto",
  Outputs:  []backupkit.Output{{Driver: "local", Path: "./backups"}},
})
```

## Gin

```go
import ginadapter "github.com/backup-kit/backup-kit/backupkit/adapters/gin"

h, err := ginadapter.Setup(backupkit.Config{
  Schedule: "0 2 * * *",
  Outputs:  []backupkit.Output{{Driver: "local", Path: "./backups"}},
})
// h.Mount(...) or gin.WrapF(h.Backup)
```

## Develop

```bash
cd packages/go
go test ./...
```

See [docs/frameworks/go.md](../../docs/frameworks/go.md) and [docs/publishing.md](../../docs/publishing.md).
