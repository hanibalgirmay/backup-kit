export type DriverKind = "database" | "storage";

export type DriverCapability =
  | "dump"
  | "restore"
  | "stream"
  | "incremental"
  | "list"
  | "delete"
  | "exists";

export interface DriverMeta {
  id: string;
  kind: DriverKind;
  version: string;
  displayName?: string;
  capabilities?: DriverCapability[];
}

export interface DumpContext {
  runId: string;
  jobName?: string;
  sourceName: string;
  tempDir: string;
}

export interface RestoreContext {
  runId: string;
  jobName?: string;
  sourceName: string;
  tempDir: string;
}

export interface ArtifactStream {
  stream: NodeJS.ReadableStream;
  bytes?: number;
  contentType?: string;
}

export interface SourceInfo {
  driver: string;
  label?: string;
  estimatedBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface DatabaseDriver extends DriverMeta {
  kind: "database";
  dump(ctx: DumpContext, options?: Record<string, unknown>): Promise<ArtifactStream>;
  restore(
    ctx: RestoreContext,
    input: ArtifactStream,
    options?: Record<string, unknown>,
  ): Promise<void>;
  inspect?(ctx: DumpContext): Promise<SourceInfo>;
}

export interface ArtifactMeta {
  key: string;
  bytes: number;
  createdAt: string;
  checksum?: string;
  metadata?: Record<string, unknown>;
}

export interface StorageContext {
  runId: string;
  jobName?: string;
}

export interface StorageDriver extends DriverMeta {
  kind: "storage";
  put(ctx: StorageContext, key: string, input: ArtifactStream): Promise<void>;
  get(ctx: StorageContext, key: string): Promise<ArtifactStream>;
  list(ctx: StorageContext, prefix?: string): Promise<ArtifactMeta[]>;
  delete(ctx: StorageContext, key: string): Promise<void>;
  exists(ctx: StorageContext, key: string): Promise<boolean>;
}

export type AnyDriver = DatabaseDriver | StorageDriver;
