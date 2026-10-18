import type { BackupKitConfig, ResolvedBackupKitConfig } from "./core/types/config.js";
import type { BackupResult, ListResult, PruneResult, RestoreOptions, RestoreResult } from "./core/types/result.js";
import type { EventHandler, BackupKitEventName } from "./core/types/events.js";
import type { AnyDriver } from "./core/types/driver.js";
import { ConfigLoader } from "./core/config/ConfigLoader.js";
import { DriverRegistry } from "./core/registry/DriverRegistry.js";
import { PluginLoader } from "./core/registry/PluginLoader.js";
import { EventBus } from "./core/events/EventBus.js";
import { BackupEngine } from "./core/engine/BackupEngine.js";
import { RestoreEngine } from "./core/engine/RestoreEngine.js";
import { RetentionManager } from "./core/engine/RetentionManager.js";
import { Scheduler } from "./core/engine/Scheduler.js";
import { createLogger, type Logger } from "./core/utils/logger.js";
import { registerBuiltinDrivers } from "./drivers/register.js";
import { createOutputStorageCache, resolveOutputStorage } from "./drivers/resolveOutput.js";

export type {
  BackupKitConfig,
  ResolvedBackupKitConfig,
  OutputConfig,
  DestinationConfig,
  Compression,
  CredentialsConfig,
  StorageConnection,
  SecretInput,
  ResolvedConnection,
  FrameworkId,
  ScheduleConfig,
  ScheduleObject,
  SourceConfig,
} from "./core/types/config.js";
export type {
  BackupResult,
  ListResult,
  PruneResult,
  RestoreOptions,
  RestoreResult,
  OutputArtifactRef,
} from "./core/types/result.js";
export type { AnyDriver, DatabaseDriver, StorageDriver } from "./core/types/driver.js";
export type { BackupKitEvent, BackupKitEventName, EventHandler } from "./core/types/events.js";
export { BackupKitError, ConfigError, DriverError, ArtifactError } from "./core/errors/index.js";
export { DEFAULT_COMPRESSION, compressBuffer, decompressBuffer } from "./core/utils/compress.js";
export { DEFAULT_OUTPUT, normalizeOutputs } from "./core/config/outputs.js";
export { resolveOutputConnection, assertOutputConnection, resolveSecret } from "./core/config/credentials.js";
export { discoverDatabaseSources, resolveSources } from "./core/config/database.js";
export { DEFAULT_RETENTION, resolveSchedule } from "./core/config/schedule.js";

export function defineConfig(config: BackupKitConfig = {}): ResolvedBackupKitConfig {
  return new ConfigLoader().fromObject(config);
}

export interface CreateBackupKitOptions {
  logger?: Logger;
  registerBuiltins?: boolean;
  /** Start cron automatically when config.schedule is set (default true). */
  autoStart?: boolean;
}

export interface BackupKit {
  backup(): Promise<BackupResult>;
  restore(options: RestoreOptions): Promise<RestoreResult>;
  list(output?: string): Promise<ListResult>;
  prune(output?: string): Promise<PruneResult>;
  /** Run backup then optional prune (used by cron). */
  runScheduled(): Promise<BackupResult>;
  /** Start cron from config.schedule (or interval override). */
  start(intervalMs?: number): void;
  /** @deprecated use start(intervalMs) */
  schedule(intervalMs: number): void;
  stopSchedule(): void;
  on(event: BackupKitEventName | "*", handler: EventHandler): () => void;
  registerDriver(driver: AnyDriver): void;
  loadPlugin(modulePath: string): Promise<AnyDriver>;
  readonly config: ResolvedBackupKitConfig;
}

export function createBackupKit(
  config: BackupKitConfig = {},
  options: CreateBackupKitOptions = {},
): BackupKit {
  const resolved = defineConfig(config);
  const registry = new DriverRegistry();
  const events = new EventBus();
  const logger = options.logger ?? createLogger();
  const plugins = new PluginLoader(registry);
  const retention = new RetentionManager();
  const scheduler = new Scheduler(events, logger);
  const storageCache = createOutputStorageCache();

  if (options.registerBuiltins !== false) {
    registerBuiltinDrivers(registry, resolved);
  }

  const backupEngine = new BackupEngine(resolved, registry, events, logger);
  const restoreEngine = new RestoreEngine(resolved, registry, events, logger);

  function selectOutputs(output?: string) {
    if (!output) return resolved.outputs;
    const matched = resolved.outputs.filter((o) => o.name === output || o.driver === output);
    if (matched.length === 0) {
      throw new Error(`Unknown output: ${output}`);
    }
    return matched;
  }

  async function pruneAll(): Promise<PruneResult> {
    await events.emit({
      event: "prune:start",
      timestamp: new Date().toISOString(),
      runId: "prune",
      jobName: resolved.name,
    });

    const deleted: string[] = [];
    const kept: string[] = [];
    const byOutput: Record<string, { deleted: string[]; kept: string[] }> = {};

    for (const out of selectOutputs()) {
      const storage = await resolveOutputStorage(registry, out, storageCache);
      const listed = await storage.list({ runId: "prune", jobName: resolved.name });
      const result = retention.selectDeletions(listed, resolved.retention);
      for (const key of result.deleted) {
        await storage.delete({ runId: "prune", jobName: resolved.name }, key);
      }
      const label = out.name ?? out.driver;
      byOutput[label] = result;
      deleted.push(...result.deleted.map((k) => `${label}:${k}`));
      kept.push(...result.kept.map((k) => `${label}:${k}`));
    }

    await events.emit({
      event: "prune:complete",
      timestamp: new Date().toISOString(),
      runId: "prune",
      jobName: resolved.name,
      deleted,
      kept,
      byOutput,
    });
    return { deleted, kept, byOutput };
  }

  const kit: BackupKit = {
    config: resolved,
    backup: () => backupEngine.run(),
    restore: (opts) => restoreEngine.run(opts),
    async list(output) {
      const artifacts = [];
      for (const out of selectOutputs(output)) {
        const storage = await resolveOutputStorage(registry, out, storageCache);
        const listed = await storage.list({ runId: "list", jobName: resolved.name });
        for (const a of listed) {
          artifacts.push({
            key: a.key,
            bytes: a.bytes,
            checksum: a.checksum ?? "",
            createdAt: a.createdAt,
            output: out.name ?? out.driver,
            driver: out.driver,
          });
        }
      }
      return { artifacts };
    },
    prune: (output) => {
      if (output) {
        return (async () => {
          await events.emit({
            event: "prune:start",
            timestamp: new Date().toISOString(),
            runId: "prune",
            jobName: resolved.name,
          });
          const deleted: string[] = [];
          const kept: string[] = [];
          const byOutput: Record<string, { deleted: string[]; kept: string[] }> = {};
          for (const out of selectOutputs(output)) {
            const storage = await resolveOutputStorage(registry, out, storageCache);
            const listed = await storage.list({ runId: "prune", jobName: resolved.name });
            const result = retention.selectDeletions(listed, resolved.retention);
            for (const key of result.deleted) {
              await storage.delete({ runId: "prune", jobName: resolved.name }, key);
            }
            const label = out.name ?? out.driver;
            byOutput[label] = result;
            deleted.push(...result.deleted.map((k) => `${label}:${k}`));
            kept.push(...result.kept.map((k) => `${label}:${k}`));
          }
          await events.emit({
            event: "prune:complete",
            timestamp: new Date().toISOString(),
            runId: "prune",
            jobName: resolved.name,
            deleted,
            kept,
            byOutput,
          });
          return { deleted, kept, byOutput };
        })();
      }
      return pruneAll();
    },
    async runScheduled() {
      const result = await backupEngine.run();
      if (resolved.schedule?.pruneAfterBackup !== false) {
        await pruneAll();
      }
      return result;
    },
    start(intervalMs?: number) {
      const handler = async () => {
        await kit.runScheduled();
      };
      if (intervalMs !== undefined) {
        scheduler.startInterval(intervalMs, handler, resolved.name);
        return;
      }
      if (resolved.schedule) {
        scheduler.startCron(resolved.schedule, handler, resolved.name);
      }
    },
    schedule(intervalMs: number) {
      kit.start(intervalMs);
    },
    stopSchedule() {
      scheduler.stop();
    },
    on(event, handler) {
      return events.on(event, handler);
    },
    registerDriver(driver) {
      registry.register(driver);
    },
    loadPlugin(modulePath) {
      return plugins.load(modulePath);
    },
  };

  if (options.autoStart !== false && resolved.schedule?.enabled) {
    kit.start();
  }

  return kit;
}
