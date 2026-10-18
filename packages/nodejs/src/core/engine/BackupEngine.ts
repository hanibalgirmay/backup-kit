import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ResolvedBackupKitConfig } from "../types/config.js";
import type { BackupResult, OutputArtifactRef } from "../types/result.js";
import type { DriverRegistry } from "../registry/DriverRegistry.js";
import type { EventBus } from "../events/EventBus.js";
import { createTempDir, removePath, ensureDir } from "../utils/fs.js";
import { createManifest } from "../artifact/manifest.js";
import { ArtifactWriter } from "../artifact/writer.js";
import { sha256File, formatChecksum, sha256Buffer } from "../utils/checksum.js";
import { createLogger, type Logger } from "../utils/logger.js";
import { compressBuffer, resolveCompression } from "../utils/compress.js";
import { createOutputStorageCache, resolveOutputStorage } from "../../drivers/resolveOutput.js";

const KIT_VERSION = "0.1.0";

export class BackupEngine {
  private readonly writer = new ArtifactWriter();
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

  async run(): Promise<BackupResult> {
    const runId = randomBytes(3).toString("hex");
    const started = Date.now();
    const jobName = this.config.name ?? "backup";
    const workDir = await createTempDir();
    const compression = resolveCompression(this.config.compression);

    await this.events.emit({
      event: "backup:start",
      timestamp: new Date().toISOString(),
      runId,
      jobName,
    });

    try {
      const dumpDir = join(workDir, "dumps");
      await ensureDir(dumpDir);

      const sourceFiles: Array<{ name: string; filePath: string; driver: string; bytes: number }> = [];

      for (const [index, source] of this.config.sources.entries()) {
        const sourceName = source.name ?? source.driver + "-" + index;
        await this.events.emit({
          event: "backup:source:start",
          timestamp: new Date().toISOString(),
          runId,
          jobName,
          sourceName,
          driver: source.driver,
        });

        const db = this.registry.getDatabase(source.driver);
        const dump = await db.dump(
          { runId, jobName, sourceName, tempDir: dumpDir },
          source.options,
        );

        const filePath = join(dumpDir, `${sourceName}.bin`);
        await pipeline(dump.stream as Readable, createWriteStream(filePath));
        const { stat } = await import("node:fs/promises");
        const bytes: number = dump.bytes ?? (await stat(filePath)).size;

        sourceFiles.push({ name: sourceName, filePath, driver: source.driver, bytes });

        await this.events.emit({
          event: "backup:source:complete",
          timestamp: new Date().toISOString(),
          runId,
          jobName,
          sourceName,
          driver: source.driver,
          bytes,
        });
      }

      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const key = `${jobName}_${stamp}_${runId}.bk`;

      const destinations = this.config.outputs.map((output) => ({
        name: output.name,
        driver: output.driver,
        key,
        path: output.path,
      }));

      const manifest = createManifest({
        kitVersion: KIT_VERSION,
        jobName,
        compression,
        encryption: { algorithm: this.config.encryption?.algorithm ?? "none" },
        sources: sourceFiles.map((s) => ({
          name: s.name,
          driver: s.driver,
          path: `payload/sources/${s.name}/dump.bin`,
          bytes: s.bytes,
          checksum: formatChecksum(""),
        })),
        destination: destinations[0]!,
        destinations,
        metadata: this.config.metadata ?? {},
      });

      for (const source of manifest.sources) {
        const file = sourceFiles.find((s) => s.name === source.name)!;
        source.checksum = formatChecksum(await sha256File(file.filePath));
      }

      const { stagingDir } = await this.writer.stage({
        workDir,
        manifest,
        sourceFiles: sourceFiles.map((s) => ({ name: s.name, filePath: s.filePath })),
      });

      // Scaffold payload: JSON snapshot of staging + manifest, then compress.
      // Next step replaces this with tar → compress → optional encrypt.
      const rawPayload = Buffer.from(JSON.stringify({ stagingDir, manifest }, null, 2));
      const payload = await compressBuffer(rawPayload, compression);
      const checksum = formatChecksum(sha256Buffer(payload));
      const createdAt = manifest.createdAt;

      const artifacts: OutputArtifactRef[] = [];

      for (const output of this.config.outputs) {
        const storage = await resolveOutputStorage(this.registry, output, this.storageCache);
        await storage.put(
          { runId, jobName },
          key,
          {
            stream: Readable.from(payload),
            bytes: payload.length,
            contentType: "application/octet-stream",
          },
        );

        artifacts.push({
          output: output.name ?? output.driver,
          driver: output.driver,
          key,
          bytes: payload.length,
          checksum,
          createdAt,
        });

        this.log.info("wrote artifact to output", {
          output: output.name,
          driver: output.driver,
          key,
          bytes: payload.length,
          compression,
        });
      }

      const result: BackupResult = {
        runId,
        jobName,
        artifact: {
          key,
          bytes: payload.length,
          checksum,
          createdAt,
        },
        artifacts,
        compression,
        durationMs: Date.now() - started,
        sources: sourceFiles.map((s) => ({ name: s.name, driver: s.driver, bytes: s.bytes })),
      };

      await this.events.emit({
        event: "backup:complete",
        timestamp: new Date().toISOString(),
        runId,
        jobName,
        artifact: result.artifact,
        artifacts: result.artifacts,
        compression,
        durationMs: result.durationMs,
      });

      this.log.info("backup complete", {
        key,
        outputs: artifacts.length,
        compression,
        durationMs: result.durationMs,
      });
      return result;
    } catch (err) {
      await this.events.emit({
        event: "backup:error",
        timestamp: new Date().toISOString(),
        runId,
        jobName,
        error: {
          code: "BACKUP_FAILED",
          message: err instanceof Error ? err.message : String(err),
        },
      });
      throw err;
    } finally {
      await removePath(workDir);
    }
  }
}
