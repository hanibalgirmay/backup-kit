import { z } from "zod";
import type { BackupKitConfig, ResolvedBackupKitConfig } from "../types/config.js";
import { ConfigError } from "../errors/index.js";
import { withResolvedOutputs } from "./outputs.js";
import { DEFAULT_COMPRESSION } from "../utils/compress.js";
import { resolveSources } from "./database.js";
import { DEFAULT_RETENTION, resolveSchedule } from "./schedule.js";

const retentionSchema = z
  .object({
    keepLast: z.number().int().min(0).optional(),
    keepDaily: z.number().int().min(0).optional(),
    keepWeekly: z.number().int().min(0).optional(),
    keepMonthly: z.number().int().min(0).optional(),
    keepYearly: z.number().int().min(0).optional(),
    maxAgeDays: z.number().int().min(0).optional(),
  })
  .optional();

const sourceSchema = z.object({
  name: z.string().optional(),
  driver: z.string().min(1),
  kind: z.enum(["relational", "document", "keyvalue", "auto"]).optional(),
  connection: z.union([z.string(), z.record(z.unknown())]).optional(),
  options: z.record(z.unknown()).optional(),
});

const outputSchema = z.object({
  name: z.string().optional(),
  driver: z.string().min(1),
  path: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().positive().optional(),
  endpoint: z.string().optional(),
  connection: z.record(z.unknown()).optional(),
  credentials: z.record(z.unknown()).optional(),
  options: z.record(z.unknown()).optional(),
});

const outputsSchema = z.union([outputSchema, z.array(outputSchema).min(1)]).optional();

const scheduleSchema = z
  .union([
    z.string().min(1),
    z.object({
      cron: z.string().min(1),
      timezone: z.string().optional(),
      enabled: z.boolean().optional(),
      pruneAfterBackup: z.boolean().optional(),
    }),
  ])
  .optional();

const configSchema = z
  .object({
    version: z.literal(1).optional().default(1),
    name: z.string().optional(),
    framework: z
      .enum(["auto", "nestjs", "express", "fastify", "laravel", "django", "fastapi", "plain"])
      .optional()
      .default("auto"),
    database: z.union([z.literal("auto"), sourceSchema, z.array(sourceSchema).min(1)]).optional(),
    sources: z.array(sourceSchema).min(1).optional(),
    outputs: outputsSchema,
    destination: outputsSchema,
    retention: retentionSchema,
    schedule: scheduleSchema,
    encryption: z
      .object({
        algorithm: z.enum(["none", "aes-256-gcm"]),
        keyEnv: z.string().optional(),
      })
      .optional(),
    compression: z.enum(["none", "gzip", "zstd"]).optional().default(DEFAULT_COMPRESSION),
    hooks: z
      .object({
        beforeBackup: z.array(z.string()).optional(),
        afterBackup: z.array(z.string()).optional(),
        beforeRestore: z.array(z.string()).optional(),
        afterRestore: z.array(z.string()).optional(),
        onError: z.array(z.string()).optional(),
      })
      .optional(),
    metadata: z.record(z.string()).optional(),
  });

export class ConfigValidator {
  validate(input: unknown): ResolvedBackupKitConfig {
    const parsed = configSchema.safeParse(input ?? {});
    if (!parsed.success) {
      throw new ConfigError(parsed.error.message, parsed.error);
    }

    const data = parsed.data as BackupKitConfig;
    const database = data.database ?? (data.sources?.length ? undefined : "auto");
    let sources;
    try {
      sources = resolveSources({ database, sources: data.sources });
    } catch (err) {
      throw err instanceof ConfigError ? err : new ConfigError(String(err));
    }

    const withOutputs = withResolvedOutputs({
      ...data,
      sources,
      database,
      retention: data.retention ?? { ...DEFAULT_RETENTION },
    });

    const schedule = resolveSchedule(data.schedule);

    return {
      version: 1,
      name: withOutputs.name,
      framework: withOutputs.framework ?? "auto",
      compression: withOutputs.compression,
      sources,
      outputs: withOutputs.outputs,
      destination: withOutputs.destination,
      retention: withOutputs.retention ?? { ...DEFAULT_RETENTION },
      schedule,
      encryption: withOutputs.encryption,
      hooks: withOutputs.hooks,
      metadata: withOutputs.metadata,
    };
  }
}
