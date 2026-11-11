package backupkit

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"
)

func NormalizeOutputDriver(driver string) string {
	switch strings.ToLower(driver) {
	case "ssh":
		return "sftp"
	case "gdrive", "google-drive":
		return "drive"
	default:
		return strings.ToLower(driver)
	}
}

func NormalizeDBDriver(driver string) string {
	switch strings.ToLower(driver) {
	case "postgresql", "pgsql", "pg":
		return "postgres"
	case "mariadb":
		return "mysql"
	case "mongo":
		return "mongodb"
	default:
		return strings.ToLower(driver)
	}
}

func InferKind(driver string) string {
	switch NormalizeDBDriver(driver) {
	case "mongodb":
		return "document"
	case "redis":
		return "keyvalue"
	default:
		return "relational"
	}
}

func driverFromURL(raw string) string {
	lower := strings.ToLower(strings.TrimSpace(raw))
	scheme := lower
	if u, err := url.Parse(raw); err == nil && u.Scheme != "" {
		scheme = strings.ToLower(u.Scheme)
	} else if i := strings.Index(lower, "://"); i >= 0 {
		scheme = lower[:i]
	}
	switch {
	case strings.HasPrefix(scheme, "postgres"):
		return "postgres"
	case strings.HasPrefix(scheme, "mysql"), scheme == "mariadb":
		return "mysql"
	case strings.HasPrefix(scheme, "sqlite"):
		return "sqlite"
	case strings.HasPrefix(scheme, "mongodb"), scheme == "mongo":
		return "mongodb"
	case strings.HasPrefix(scheme, "redis"):
		return "redis"
	default:
		return ""
	}
}

// DiscoverDatabaseSources reads DATABASE_URL / MONGODB_URI / REDIS_URL / DB_*.
func DiscoverDatabaseSources(env map[string]string) ([]Source, error) {
	if env == nil {
		env = environMap()
	}
	var sources []Source
	seen := map[string]bool{}

	candidates := [][2]string{
		{"DATABASE_URL", "primary"},
		{"DB_URL", "primary"},
		{"MONGODB_URI", "mongodb"},
		{"MONGO_URL", "mongodb"},
		{"REDIS_URL", "redis"},
	}
	for _, c := range candidates {
		val := env[c[0]]
		if val == "" {
			continue
		}
		driver := driverFromURL(val)
		if driver == "" {
			continue
		}
		key := driver + ":" + val
		if seen[key] {
			continue
		}
		seen[key] = true
		sources = append(sources, Source{
			Name:       c[1],
			Driver:     NormalizeDBDriver(driver),
			Kind:       InferKind(driver),
			Connection: val,
		})
	}

	if len(sources) == 0 && (env["DB_HOST"] != "" || env["DB_DATABASE"] != "") {
		driver := NormalizeDBDriver(firstNonEmpty(env["DB_CONNECTION"], env["DB_DRIVER"], "postgres"))
		port := 0
		if env["DB_PORT"] != "" {
			port, _ = strconv.Atoi(env["DB_PORT"])
		}
		conn := map[string]any{
			"host":     firstNonEmpty(env["DB_HOST"], "127.0.0.1"),
			"database": firstNonEmpty(env["DB_DATABASE"], env["DB_NAME"]),
			"username": firstNonEmpty(env["DB_USERNAME"], env["DB_USER"]),
			"password": env["DB_PASSWORD"],
		}
		if port > 0 {
			conn["port"] = port
		}
		sources = append(sources, Source{
			Name:       "primary",
			Driver:     driver,
			Kind:       InferKind(driver),
			Connection: conn,
		})
	}

	if len(sources) == 0 {
		return nil, fmt.Errorf(`database: "auto" could not discover a database; set DATABASE_URL or DB_*`)
	}
	return sources, nil
}

func environMap() map[string]string {
	out := map[string]string{}
	for _, e := range os.Environ() {
		parts := strings.SplitN(e, "=", 2)
		if len(parts) == 2 {
			out[parts[0]] = parts[1]
		}
	}
	return out
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}
