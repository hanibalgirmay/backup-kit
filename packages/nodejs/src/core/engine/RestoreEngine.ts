import { randomBytes } from "node:crypto";
import type { ResolvedBackupKitConfig } from "../types/config.js";
import type { RestoreOptions, RestoreResult } from "../types/result.js";
import type { DriverRegistry } from "../registry/DriverRegistry.js";
import type { EventBus } from "../events/EventBus.js";
import { createTempDir, removePath } from "../utils/fs.js";
import { ArtifactReader } from "../artifact/reader.js";
import { createLogger, type Logger } from "../utils/logger.js";
import { BackupKitError } from "../errors/index.js";
import { createOutputStorageCache, resolveOutputStorage } from "../../drivers/resolveOutput.js";

export class RestoreEngine {
  private readonly reader = new ArtifactReader();
  private readonly log: Logger;
  private readonly storageCache = createOutputStorageCache();

  constructor(
    private readonly config: ResolvedBackupKitConfig,
    private readonly registry: DriverRegistry,
    private readonly events: EventBus,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger();
  }

  async run(options: RestoreOptions): Promise<RestoreResult> {
    const runId = randomBytes(3).toString("hex");
    const started = Date.now();
    const jobName = this.config.name ?? "backup";
    const workDir = await createTempDir();

    const output =
      this.config.outputs.find((o) => o.name === options.output || o.driver === options.output) ??
      this.config.outputs[0];

    if (!output) {
      throw new BackupKitError("NO_OUTPUT", "No storage outputs configured");
    }

    await this.events.emit({
      event: "restore:start",
      timestamp: new Date().toISOString(),
      runId,
      jobName,
      key: options.key,
      output: output.name,
    });

    try {
      const storage = await resolveOutputStorage(this.registry, output, this.storageCache);
      const artifact = await storage.get({ runId, jobName }, options.key);

      // Scaffold: real path decompresses + extracts tar then restores sources.
      void artifact;
      void this.reader;
      void workDir;

      throw new BackupKitError(
        "RESTORE_NOT_IMPLEMENTED",
        "RestoreEngine packaging/extract path is stubbed; wire decompress + tar extract next",
      );
    } catch (err) {
      await this.events.emit({
        event: "restore:error",
        timestamp: new Date().toISOString(),
        runId,
        jobName,
        error: {
          code: "RESTORE_FAILED",
          message: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    } finally {
      await removePath(workDir);
      this.log.debug("restore cleanup", { runId, durationMs: Date.now() - started });
    }
  }
}
