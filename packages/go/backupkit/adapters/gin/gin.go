package ginadapter

import (
	"encoding/json"
	"net/http"

	"github.com/backup-kit/backup-kit/backupkit"
)

// Handler exposes backup-kit HTTP endpoints (Gin, chi, stdlib mux, etc.).
type Handler struct {
	Kit *backupkit.Kit
}

// Setup creates a kit from config (framework defaults to "gin", database to "auto").
func Setup(cfg backupkit.Config) (*Handler, error) {
	if cfg.Framework == "" {
		cfg.Framework = "gin"
	}
	if cfg.Database == nil && len(cfg.Sources) == 0 {
		cfg.Database = "auto"
	}
	kit, err := backupkit.New(cfg)
	if err != nil {
		return nil, err
	}
	return &Handler{Kit: kit}, nil
}

func (h *Handler) Backup(w http.ResponseWriter, r *http.Request) {
	result, err := h.Kit.Backup()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, result)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.Kit.List("")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"artifacts": items})
}

func (h *Handler) Prune(w http.ResponseWriter, r *http.Request) {
	deleted, kept, err := h.Kit.Prune("")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"deleted": deleted, "kept": kept})
}

// Mount registers routes on any router that accepts method/path/handler.
//
//	h.Mount(func(method, path string, handler http.HandlerFunc) {
//	  r.Handle(method, path, gin.WrapF(handler))
//	})
func (h *Handler) Mount(register func(method, path string, handler http.HandlerFunc)) {
	register(http.MethodPost, "/backup-kit/backup", h.Backup)
	register(http.MethodGet, "/backup-kit/list", h.List)
	register(http.MethodPost, "/backup-kit/prune", h.Prune)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
