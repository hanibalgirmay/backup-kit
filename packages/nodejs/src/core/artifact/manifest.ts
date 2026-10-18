export interface ManifestSource {
  name: string;
  driver: string;
  path: string;
  bytes: number;
  checksum: string;
}

export interface ManifestDestination {
  name?: string;
  driver: string;
  key: string;
  path?: string;
}

export interface ArtifactManifest {
  formatVersion: 1;
  createdAt: string;
  kitVersion: string;
  jobName?: string;
  compression: "none" | "gzip" | "zstd";
  encryption: { algorithm: "none" | "aes-256-gcm" };
  sources: ManifestSource[];
  /** Primary destination (first output) for backward compatibility. */
  destination: ManifestDestination;
  /** All outputs this artifact was written to. */
  destinations: ManifestDestination[];
  metadata: Record<string, string>;
}

export function createManifest(
  partial: Omit<ArtifactManifest, "formatVersion" | "createdAt"> & {
    createdAt?: string;
  },
): ArtifactManifest {
  const destinations = partial.destinations?.length
    ? partial.destinations
    : [partial.destination];
  return {
    formatVersion: 1,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    kitVersion: partial.kitVersion,
    jobName: partial.jobName,
    compression: partial.compression,
    encryption: partial.encryption,
    sources: partial.sources,
    destination: partial.destination ?? destinations[0]!,
    destinations,
    metadata: partial.metadata ?? {},
  };
}
