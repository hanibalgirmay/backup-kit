import { readFile } from "node:fs/promises";
import type { CredentialsConfig, ResolvedConnection, SecretInput } from "../types/storage.js";
import type { OutputConfig } from "../types/config.js";
import { ConfigError } from "../errors/index.js";
import { interpolate } from "./interpolate.js";
import { normalizeOutputDriver } from "./outputs.js";

export async function resolveSecret(
  input: SecretInput | undefined,
  env: NodeJS.ProcessEnv = process.env,
  label = "secret",
): Promise<string | undefined> {
  if (input === undefined) return undefined;
  if (typeof input === "string") return interpolate(input, env);

  if ("env" in input) {
    const value = env[input.env] ?? input.fallback;
    if (value === undefined) {
      throw new ConfigError(`Missing environment variable for ${label}: ${input.env}`);
    }
    return value;
  }

  if ("file" in input) {
    const path = interpolate(input.file, env);
    return readFile(path, "utf8");
  }

  if ("value" in input) return input.value;
  return undefined;
}

function asSecret(value: unknown): SecretInput | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") return value as SecretInput;
  return String(value);
}

/**
 * Merge output.path / top-level convenience fields / connection / options / credentials
 * into one flexible bag, then resolve secrets.
 */
export async function resolveOutputConnection(
  output: OutputConfig,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ResolvedConnection> {
  const driver = normalizeOutputDriver(output.driver);
  const connection = { ...(output.connection ?? {}) } as Record<string, unknown>;
  const options = { ...(output.options ?? {}) } as Record<string, unknown>;
  const credentials = {
    ...(typeof connection.credentials === "object" && connection.credentials
      ? (connection.credentials as CredentialsConfig)
      : {}),
    ...(output.credentials ?? {}),
    ...(typeof options.credentials === "object" && options.credentials
      ? (options.credentials as CredentialsConfig)
      : {}),
  } as CredentialsConfig;

  // Top-level convenience fields win over nested duplicates when set.
  const merged: Record<string, unknown> = {
    ...options,
    ...connection,
    ...(output.path !== undefined ? { path: output.path } : {}),
    ...(output.host !== undefined ? { host: output.host } : {}),
    ...(output.port !== undefined ? { port: output.port } : {}),
    ...(output.endpoint !== undefined ? { endpoint: output.endpoint } : {}),
  };
  delete merged.credentials;

  const resolved: ResolvedConnection = {};

  for (const [key, value] of Object.entries(merged)) {
    if (typeof value === "string") {
      resolved[key] = interpolate(value, env);
    } else {
      resolved[key] = value;
    }
  }

  if (typeof resolved.port === "string") {
    const n = Number(resolved.port);
    if (!Number.isNaN(n)) resolved.port = n;
  }

  // Defaults
  if (driver === "local" && !resolved.path) resolved.path = "./backups";
  if (
    (driver === "sftp" || output.driver === "ssh") &&
    resolved.port === undefined
  ) {
    resolved.port = 22;
  }
  if (driver === "webdav" && resolved.port === undefined && resolved.secure !== false) {
    // leave undefined — URL may embed port
  }

  const username = (credentials.username as string | undefined) ?? (resolved.username as string | undefined);
  if (username) resolved.username = interpolate(String(username), env);

  resolved.password = await resolveSecret(asSecret(credentials.password ?? resolved.password), env, "password");
  resolved.privateKey = await resolveSecret(
    asSecret(credentials.privateKey ?? resolved.privateKey),
    env,
    "privateKey",
  );
  resolved.passphrase = await resolveSecret(
    asSecret(credentials.passphrase ?? resolved.passphrase),
    env,
    "passphrase",
  );
  resolved.accessKeyId = await resolveSecret(
    asSecret(credentials.accessKeyId ?? resolved.accessKeyId),
    env,
    "accessKeyId",
  );
  resolved.secretAccessKey = await resolveSecret(
    asSecret(credentials.secretAccessKey ?? resolved.secretAccessKey),
    env,
    "secretAccessKey",
  );
  resolved.sessionToken = await resolveSecret(
    asSecret(credentials.sessionToken ?? resolved.sessionToken),
    env,
    "sessionToken",
  );
  resolved.token = await resolveSecret(asSecret(credentials.token ?? resolved.token), env, "token");
  resolved.keyFile = await resolveSecret(asSecret(credentials.keyFile ?? resolved.keyFile), env, "keyFile");
  resolved.connectionString = await resolveSecret(
    asSecret(credentials.connectionString ?? resolved.connectionString),
    env,
    "connectionString",
  );

  if (credentials.useDefault === true || resolved.useDefault === true) {
    resolved.useDefaultCredentials = true;
  }
  if (credentials.agent === true || resolved.agent === true) {
    resolved.agent = true;
  }

  // Normalize aliases
  if (!resolved.endpoint && typeof resolved.url === "string") resolved.endpoint = resolved.url;
  if (!resolved.remotePath && typeof resolved.path === "string" && driver !== "local") {
    resolved.remotePath = resolved.path as string;
  }
  if (!resolved.prefix && typeof resolved.remotePath === "string" && ["s3", "gcs", "azure"].includes(driver)) {
    resolved.prefix = resolved.remotePath;
  }

  return resolved;
}

export function assertOutputConnection(driver: string, connection: ResolvedConnection): void {
  const id = normalizeOutputDriver(driver);

  const hasAuth = Boolean(
    connection.useDefaultCredentials ||
      connection.agent ||
      connection.password ||
      connection.privateKey ||
      connection.accessKeyId ||
      connection.secretAccessKey ||
      connection.token ||
      connection.keyFile ||
      connection.connectionString,
  );

  switch (id) {
    case "local":
      return;
    case "s3":
      if (!connection.bucket) {
        throw new ConfigError('S3 output requires connection.bucket (or options.bucket)');
      }
      if (!hasAuth && !connection.useDefaultCredentials) {
        throw new ConfigError(
          "S3 output requires credentials (accessKeyId/secretAccessKey, connectionString, keyFile, or useDefault)",
        );
      }
      return;
    case "gcs":
      if (!connection.bucket) {
        throw new ConfigError("GCS output requires connection.bucket");
      }
      if (!hasAuth) {
        throw new ConfigError("GCS output requires credentials (keyFile, token, or useDefault)");
      }
      return;
    case "azure":
      if (!connection.container && !connection.connectionString) {
        throw new ConfigError("Azure output requires container (and account) or connectionString");
      }
      if (!hasAuth && !connection.account) {
        throw new ConfigError("Azure output requires credentials or connectionString");
      }
      return;
    case "sftp":
      if (!connection.host) {
        throw new ConfigError("SFTP/SSH output requires host");
      }
      if (!connection.username) {
        throw new ConfigError("SFTP/SSH output requires username");
      }
      if (!hasAuth) {
        throw new ConfigError(
          "SFTP/SSH output requires password, privateKey, or agent/useDefault credentials",
        );
      }
      return;
    case "webdav":
      if (!connection.endpoint && !connection.url && !connection.host) {
        throw new ConfigError("WebDAV output requires endpoint/url or host");
      }
      return;
    case "drive":
      if (!hasAuth) {
        throw new ConfigError("Drive output requires credentials (keyFile, token, or OAuth secrets)");
      }
      return;
    default:
      return;
  }
}
