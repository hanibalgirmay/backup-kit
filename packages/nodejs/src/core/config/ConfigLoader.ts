import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import type { BackupKitConfig, ResolvedBackupKitConfig } from "../types/config.js";
import { ConfigValidator } from "./ConfigValidator.js";
import { interpolateDeep } from "./interpolate.js";
import { ConfigError } from "../errors/index.js";

export class ConfigLoader {
  private readonly validator = new ConfigValidator();

  async load(path: string): Promise<ResolvedBackupKitConfig> {
    if (path.endsWith(".json")) {
      const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
      return this.validator.validate(interpolateDeep(raw));
    }

    if (path.endsWith(".ts") || path.endsWith(".js") || path.endsWith(".mjs") || path.endsWith(".cjs")) {
      const mod = (await import(pathToFileURL(path).href)) as { default?: unknown; config?: unknown };
      const raw = mod.default ?? mod.config;
      if (!raw) throw new ConfigError(`Config module must export default or config: ${path}`);
      return this.validator.validate(interpolateDeep(raw));
    }

    throw new ConfigError(`Unsupported config file: ${path}`);
  }

  fromObject(input: BackupKitConfig): ResolvedBackupKitConfig {
    return this.validator.validate(interpolateDeep(input));
  }
}
