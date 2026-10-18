export type Compression = "none" | "gzip" | "zstd";
export type FrameworkId =
  | "auto"
  | "nestjs"
  | "express"
  | "fastify"
  | "laravel"
  | "django"
  | "fastapi"
  | "plain";

export type DatabaseKind = "relational" | "document" | "keyvalue" | "auto";

export interface RetentionConfig {
  keepLast?: number;
  keepDaily?: number;
  keepWeekly?: number;
  keepMonthly?: number;
  keepYearly?: number;
  maxAgeDays?: number;
}

export interface EncryptionConfig {
  algorithm: "none" | "aes-256-gcm";
  keyEnv?: string;
}

export interface SourceConfig {
  name?: string;
  driver: string;
  /** Hint for relational vs document/kv — usually inferred from driver. */
  kind?: DatabaseKind;
  connection?: string | Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface OutputConfig {
  name?: string;
  driver: string;
  path?: string;
  host?: string;
  port?: number;
  endpoint?: string;
  connection?: import("./storage.js").StorageConnection;
  credentials?: import("./storage.js").CredentialsConfig;
  options?: Record<string, unknown>;
}

/** @deprecated Prefer `outputs`. */
export type DestinationConfig = OutputConfig;

export interface HooksConfig {
  beforeBackup?: string[];
  afterBackup?: string[];
  beforeRestore?: string[];
  afterRestore?: string[];
  onError?: string[];
}

export interface ScheduleObject {
  cron: string;
  timezone?: string;
  enabled?: boolean;
  /** Run retention prune after each scheduled backup (default true). */
  pruneAfterBackup?: boolean;
}

export type ScheduleConfig = string | ScheduleObject;

export interface BackupKitConfig {
  version?: 1;
  name?: string;
  /** Host framework — used by adapters / presets. */
  framework?: FrameworkId;
  /**
   * Database source(s). `"auto"` discovers from env / common ORM vars.
   * Prefer this over manual `sources` in framework apps.
   */
  database?: "auto" | SourceConfig | SourceConfig[];
  /** Explicit sources. Optional when `database` is set. */
  sources?: SourceConfig[];
  outputs?: OutputConfig | OutputConfig[];
  destination?: OutputConfig | OutputConfig[];
  /** Defaults to `{ keepLast: 7 }` when omitted. */
  retention?: RetentionConfig;
  /** Cron string or schedule object for automatic backups. */
  schedule?: ScheduleConfig;
  encryption?: EncryptionConfig;
  compression?: Compression;
  hooks?: HooksConfig;
  metadata?: Record<string, string>;
}

export interface ResolvedSchedule {
  cron: string;
  timezone?: string;
  enabled: boolean;
  pruneAfterBackup: boolean;
}

export interface ResolvedBackupKitConfig {
  version: 1;
  name?: string;
  framework: FrameworkId;
  compression: Compression;
  sources: SourceConfig[];
  outputs: OutputConfig[];
  destination: OutputConfig;
  retention: RetentionConfig;
  schedule?: ResolvedSchedule;
  encryption?: EncryptionConfig;
  hooks?: HooksConfig;
  metadata?: Record<string, string>;
}

export type {
  CredentialsConfig,
  StorageConnection,
  ResolvedConnection,
  SecretInput,
} from "./storage.js";
