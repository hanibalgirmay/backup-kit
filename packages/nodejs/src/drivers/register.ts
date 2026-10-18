import type { ResolvedBackupKitConfig } from "../core/types/config.js";
import type { DriverRegistry } from "../core/registry/DriverRegistry.js";
import postgresDriver from "./database/postgres/index.js";
import mysqlDriver from "./database/mysql/index.js";
import mongodbDriver from "./database/mongodb/index.js";
import sqliteDriver from "./database/sqlite/index.js";
import redisDriver from "./database/redis/index.js";
import { createLocalDriver } from "./storage/local/index.js";
import { createS3Driver } from "./storage/s3/index.js";
import { createGcsDriver } from "./storage/gcs/index.js";
import { createAzureDriver } from "./storage/azure/index.js";
import { createSftpDriver } from "./storage/sftp/index.js";
import { createWebdavDriver } from "./storage/webdav/index.js";
import { createDriveDriver } from "./storage/drive/index.js";
import { normalizeOutputDriver } from "../core/config/outputs.js";

export function registerBuiltinDrivers(registry: DriverRegistry, config: ResolvedBackupKitConfig): void {
  registry.register(postgresDriver);
  registry.register(mysqlDriver);
  registry.register(mongodbDriver);
  registry.register(sqliteDriver);
  registry.register(redisDriver);

  const local = config.outputs.find((o) => normalizeOutputDriver(o.driver) === "local");
  registry.register(createLocalDriver(local?.path ?? "./backups"));
  // Default discoverable instances (real work uses per-output factories in resolveOutput).
  registry.register(createS3Driver());
  registry.register(createGcsDriver());
  registry.register(createAzureDriver());
  registry.register(createSftpDriver());
  registry.register(createWebdavDriver());
  registry.register(createDriveDriver());
}
