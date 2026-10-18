import type { BackupKit, BackupKitConfig } from "../../index.js";
import { createBackupKit } from "../../index.js";
import { BackupService } from "./BackupService.js";
import { BackupController } from "./BackupController.js";

export interface NestBackupModuleOptions extends BackupKitConfig {
  /** Auto-start cron when schedule is set (default true). */
  autoStart?: boolean;
}

export interface BackupModuleOptions {
  config: BackupKitConfig;
  autoStart?: boolean;
}

/**
 * NestJS wiring without hard @nestjs/* imports.
 *
 * @example
 * ```ts
 * BackupModule.forRoot({
 *   schedule: "0 2 * * *",
 *   retention: { keepLast: 7, keepDaily: 14 },
 *   outputs: [{ driver: "local", path: "./storage/backups" }],
 * })
 * ```
 */
export const BackupModule = {
  forRoot(options: NestBackupModuleOptions = {}) {
    const { autoStart, ...config } = options;
    return createBackupModule({
      config: {
        framework: "nestjs",
        database: config.database ?? (config.sources ? undefined : "auto"),
        ...config,
      },
      autoStart,
    });
  },
};

export function createBackupModule(options: BackupModuleOptions) {
  const kit: BackupKit = createBackupKit(
    {
      framework: options.config.framework ?? "nestjs",
      ...options.config,
    },
    { autoStart: options.autoStart !== false },
  );
  const service = new BackupService(kit);
  const controller = new BackupController(service);
  return {
    module: "BackupKitModule",
    kit,
    service,
    controller,
    providers: [service],
    controllers: [controller],
    exports: [service, kit],
  };
}

export { BackupService, BackupController };
export default BackupModule;
