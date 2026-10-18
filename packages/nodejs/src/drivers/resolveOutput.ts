import type { OutputConfig, ResolvedBackupKitConfig } from "../core/types/config.js";
import type { StorageDriver } from "../core/types/driver.js";
import type { DriverRegistry } from "../core/registry/DriverRegistry.js";
import type { ResolvedConnection } from "../core/types/storage.js";
import { createLocalDriver } from "./storage/local/index.js";
import { createS3Driver } from "./storage/s3/index.js";
import { createGcsDriver } from "./storage/gcs/index.js";
import { createAzureDriver } from "./storage/azure/index.js";
import { createSftpDriver } from "./storage/sftp/index.js";
import { createWebdavDriver } from "./storage/webdav/index.js";
import { createDriveDriver } from "./storage/drive/index.js";
import { createConfigurableStubDriver } from "./storage/remoteBase.js";
import { normalizeOutputDriver } from "../core/config/outputs.js";
import { assertOutputConnection, resolveOutputConnection } from "../core/config/credentials.js";

export type OutputStorageCache = Map<string, StorageDriver>;

export function createOutputStorageCache(): OutputStorageCache {
  return new Map();
}

function createDriverFor(driverId: string, connection: ResolvedConnection): StorageDriver {
  switch (driverId) {
    case "local":
      return createLocalDriver(connection);
    case "s3":
      return createS3Driver(connection);
    case "gcs":
      return createGcsDriver(connection);
    case "azure":
      return createAzureDriver(connection);
    case "sftp":
      return createSftpDriver(connection);
    case "webdav":
      return createWebdavDriver(connection);
    case "drive":
      return createDriveDriver(connection);
    default:
      return createConfigurableStubDriver(driverId, driverId, connection);
  }
}

/**
 * Resolve a concrete storage driver instance for an output.
 * Loads secrets from env/files, validates required connection fields for remotes,
 * and caches instances per unique connection fingerprint.
 */
export async function resolveOutputStorage(
  _registry: DriverRegistry,
  output: OutputConfig,
  cache: OutputStorageCache,
): Promise<StorageDriver> {
  const driverId = normalizeOutputDriver(output.driver);
  const connection = await resolveOutputConnection(output);
  assertOutputConnection(output.driver, connection);

  const cacheKey = JSON.stringify({
    name: output.name,
    driver: driverId,
    // Avoid putting raw secrets into logs; cache key still needs uniqueness.
    host: connection.host,
    port: connection.port,
    endpoint: connection.endpoint,
    bucket: connection.bucket,
    container: connection.container,
    path: connection.path,
    prefix: connection.prefix,
    remotePath: connection.remotePath,
    folderId: connection.folderId,
    username: connection.username,
    hasPassword: Boolean(connection.password),
    hasPrivateKey: Boolean(connection.privateKey),
    hasAccessKey: Boolean(connection.accessKeyId),
    hasToken: Boolean(connection.token),
    hasKeyFile: Boolean(connection.keyFile),
    hasConnectionString: Boolean(connection.connectionString),
    useDefault: Boolean(connection.useDefaultCredentials),
    agent: Boolean(connection.agent),
  });

  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const driver = createDriverFor(driverId, connection);
  cache.set(cacheKey, driver);
  return driver;
}

export function primaryOutput(config: ResolvedBackupKitConfig): OutputConfig {
  return config.outputs[0] ?? config.destination;
}
