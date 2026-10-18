export interface ArtifactRef {
  key: string;
  bytes: number;
  checksum: string;
  createdAt: string;
}

export interface OutputArtifactRef extends ArtifactRef {
  output: string;
  driver: string;
}

export interface BackupResult {
  runId: string;
  jobName?: string;
  /** Primary (first) output artifact — convenience. */
  artifact: ArtifactRef;
  /** Artifacts written to each configured output. */
  artifacts: OutputArtifactRef[];
  compression: "none" | "gzip" | "zstd";
  durationMs: number;
  sources: Array<{ name: string; driver: string; bytes: number }>;
}

export interface RestoreResult {
  runId: string;
  jobName?: string;
  key: string;
  output?: string;
  durationMs: number;
  sources: Array<{ name: string; driver: string }>;
}

export interface ListResult {
  artifacts: Array<ArtifactRef & { output: string; driver: string }>;
}

export interface PruneResult {
  deleted: string[];
  kept: string[];
  byOutput?: Record<string, { deleted: string[]; kept: string[] }>;
}

export interface RestoreOptions {
  key: string;
  sources?: string[];
  /** Output name or driver to restore from (defaults to first output). */
  output?: string;
}
