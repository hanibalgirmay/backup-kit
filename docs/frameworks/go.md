# Go (Gin / plain)

Package: [`packages/go`](../../packages/go) — Go module **`github.com/backup-kit/backup-kit`**.

## Install

```bash
go get github.com/backup-kit/backup-kit/backupkit
```

This installs **only** the Go module — not the npm or Composer packages.

## Plain Go

```go
kit, err := backupkit.New(backupkit.Config{
  Database: "auto",
  Schedule: "0 2 * * *",
  Outputs: []backupkit.Output{
    {Driver: "local", Path: "./backups"},
  },
})
result, err := kit.RunScheduled()
```

## Gin

```go
import (
  "github.com/backup-kit/backup-kit/backupkit"
  ginadapter "github.com/backup-kit/backup-kit/backupkit/adapters/gin"
  "github.com/gin-gonic/gin"
)

func main() {
  r := gin.Default()
  h, err := ginadapter.Setup(backupkit.Config{
    Schedule: "0 2 * * *",
    Retention: &backupkit.Retention{KeepLast: backupkit.Int(7)},
    Outputs: []backupkit.Output{
      {Driver: "local", Path: "./backups"},
    },
  })
  if err != nil { panic(err) }

  r.POST("/backup-kit/backup", gin.WrapF(h.Backup))
  r.GET("/backup-kit/list", gin.WrapF(h.List))
  r.POST("/backup-kit/prune", gin.WrapF(h.Prune))
  r.Run(":8080")
}
```

Wire cron with your process supervisor or `robfig/cron` calling `h.Kit.RunScheduled()`.

## Storage drivers

Use `ssh` (or `sftp`) for any SSH remote:

```go
{Driver: "ssh", Host: "1.2.3.4", Connection: map[string]any{"username": "backup"}, Credentials: map[string]any{"password": "..."}}
```

## Example

See [`examples/go-gin`](../../examples/go-gin).
