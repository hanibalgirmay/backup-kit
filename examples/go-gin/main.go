package main

import (
	"log"

	"github.com/backup-kit/backup-kit/backupkit"
	ginadapter "github.com/backup-kit/backup-kit/backupkit/adapters/gin"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	h, err := ginadapter.Setup(backupkit.Config{
		Database:  "auto",
		Schedule:  "0 2 * * *",
		Retention: &backupkit.Retention{KeepLast: backupkit.Int(7)},
		Outputs: []backupkit.Output{
			{Driver: "local", Path: "./backups"},
			// {Driver: "ssh", Host: "backup.example.com", Connection: map[string]any{"username": "backup"}, Credentials: map[string]any{"privateKey": map[string]any{"file": "./id_ed25519"}}},
		},
	})
	if err != nil {
		log.Fatal(err)
	}

	r.POST("/backup-kit/backup", gin.WrapF(h.Backup))
	r.GET("/backup-kit/list", gin.WrapF(h.List))
	r.POST("/backup-kit/prune", gin.WrapF(h.Prune))

	if err := r.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
