import type { OutputConfig, ResolvedBackupKitConfig } from "../types/config.js";
import { DEFAULT_COMPRESSION, resolveCompression } from "../utils/compress.js";

export const DEFAULT_OUTPUT: OutputConfig = {
  name: "local",
  driver: "local",
  path: "./backups",
};

/** Map friendly aliases onto registered driver ids. */
export function normalizeOutputDriver(driver: string): string {
  switch (driver) {
    case "ssh":
      return "sftp";
    case "gdrive":
    case "google-drive":
      return "drive";
    default:
      return driver;
  }
}

export function normalizeOutputs(
  outputs?: OutputConfig | OutputConfig[],
  destination?: OutputConfig | OutputConfig[],
): OutputConfig[] {
  const raw = outputs ?? destination;
  const list = raw === undefined ? [DEFAULT_OUTPUT] : Array.isArray(raw) ? raw : [raw];

  if (list.length === 0) return [{ ...DEFAULT_OUTPUT }];

  return list.map((output, index) => {
    const driver = normalizeOutputDriver(output.driver);
    const name = output.name ?? (driver === "local" && list.length === 1 ? "local" : `${driver}-${index}`);
    return {
      ...output,
      name,
      driver,
      path: output.path ?? (driver === "local" ? DEFAULT_OUTPUT.path : output.path),
    };
  });
}

export function withResolvedOutputs<T extends { outputs?: OutputConfig | OutputConfig[]; destination?: OutputConfig | OutputConfig[]; compression?: ResolvedBackupKitConfig["compression"] }>(
  config: T,
): T & Pick<ResolvedBackupKitConfig, "outputs" | "destination" | "compression"> {
  const outputs = normalizeOutputs(config.outputs, config.destination);
  return {
    ...config,
    compression: resolveCompression(config.compression) ?? DEFAULT_COMPRESSION,
    outputs,
    destination: outputs[0]!,
  };
}
