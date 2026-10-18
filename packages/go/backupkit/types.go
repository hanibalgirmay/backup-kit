package backupkit

// Framework-first database backup toolkit for Go (Gin, plain HTTP, CLI).

const Version = "0.1.0"

const DefaultCompression = "gzip"

var DefaultRetention = Retention{KeepLast: intPtr(7)}

var DefaultOutput = Output{
	Name:   "local",
	Driver: "local",
	Path:   "./backups",
}

type Retention struct {
	KeepLast    *int `json:"keepLast,omitempty"`
	KeepDaily   *int `json:"keepDaily,omitempty"`
	KeepWeekly  *int `json:"keepWeekly,omitempty"`
	KeepMonthly *int `json:"keepMonthly,omitempty"`
	KeepYearly  *int `json:"keepYearly,omitempty"`
	MaxAgeDays  *int `json:"maxAgeDays,omitempty"`
}

type Schedule struct {
	Cron             string `json:"cron"`
	Timezone         string `json:"timezone,omitempty"`
	Enabled          *bool  `json:"enabled,omitempty"`
	PruneAfterBackup *bool  `json:"pruneAfterBackup,omitempty"`
}

type Source struct {
	Name       string `json:"name,omitempty"`
	Driver     string `json:"driver"`
	Kind       string `json:"kind,omitempty"` // relational | document | keyvalue
	Connection any    `json:"connection,omitempty"`
	Options    map[string]any `json:"options,omitempty"`
}

type Output struct {
	Name        string         `json:"name,omitempty"`
	Driver      string         `json:"driver"`
	Path        string         `json:"path,omitempty"`
	Host        string         `json:"host,omitempty"`
	Port        *int           `json:"port,omitempty"`
	Endpoint    string         `json:"endpoint,omitempty"`
	Connection  map[string]any `json:"connection,omitempty"`
	Credentials map[string]any `json:"credentials,omitempty"`
	Options     map[string]any `json:"options,omitempty"`
}

type Config struct {
	Version     int            `json:"version,omitempty"`
	Name        string         `json:"name,omitempty"`
	Framework   string         `json:"framework,omitempty"` // auto | gin | plain
	Database    any            `json:"database,omitempty"`  // "auto" | Source | []Source
	Sources     []Source       `json:"sources,omitempty"`
	Outputs     []Output       `json:"outputs,omitempty"`
	Destination *Output        `json:"destination,omitempty"` // legacy
	Retention   *Retention     `json:"retention,omitempty"`
	Schedule    any            `json:"schedule,omitempty"` // string cron | Schedule
	Compression string         `json:"compression,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

type ResolvedConfig struct {
	Version     int
	Name        string
	Framework   string
	Sources     []Source
	Outputs     []Output
	Destination Output
	Retention   Retention
	Schedule    *Schedule
	Compression string
	Metadata    map[string]string
}

type ArtifactRef struct {
	Key       string `json:"key"`
	Bytes     int    `json:"bytes"`
	Checksum  string `json:"checksum"`
	CreatedAt string `json:"createdAt"`
	Output    string `json:"output,omitempty"`
	Driver    string `json:"driver,omitempty"`
}

type BackupResult struct {
	RunID       string        `json:"runId"`
	JobName     string        `json:"jobName,omitempty"`
	Artifact    ArtifactRef   `json:"artifact"`
	Artifacts   []ArtifactRef `json:"artifacts"`
	Compression string        `json:"compression"`
	DurationMs  int64         `json:"durationMs"`
}

func intPtr(v int) *int { return &v }

func boolPtr(v bool) *bool { return &v }

// Int is a helper for optional retention fields.
func Int(v int) *int { return &v }
