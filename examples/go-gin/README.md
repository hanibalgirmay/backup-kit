# Go + Gin example

```bash
go get github.com/backup-kit/backup-kit/backupkit
```

```go
package main

import (
  "github.com/backup-kit/backup-kit/backupkit"
  ginadapter "github.com/backup-kit/backup-kit/backupkit/adapters/gin"
  "github.com/gin-gonic/gin"
)

func main() {
  r := gin.Default()
  h, _ := ginadapter.Setup(backupkit.Config{
    Database: "auto",
    Schedule: "0 2 * * *",
    Outputs:  []backupkit.Output{{Driver: "local", Path: "./backups"}},
  })
  r.POST("/backup-kit/backup", gin.WrapF(h.Backup))
  r.GET("/backup-kit/list", gin.WrapF(h.List))
  r.Run(":8080")
}
```

See [docs/frameworks/go.md](../../docs/frameworks/go.md).
