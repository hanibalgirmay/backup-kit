/**
 * Flexible secret input — prefer env/file over inline values in committed configs.
 */
export type SecretInput =
  | string
  | { env: string; fallback?: string }
  | { file: string }
  | { value: string };

export interface CredentialsConfig {
  /** Generic username / access key id */
  username?: string;
  accessKeyId?: SecretInput;
  secretAccessKey?: SecretInput;
  sessionToken?: SecretInput;
  password?: SecretInput;
  /** SSH / PEM private key (path, env, or inline) */
  privateKey?: SecretInput;
  passphrase?: SecretInput;
  /** OAuth / bearer / SAS / API token */
  token?: SecretInput;
  /** Path or env pointing at a JSON key / service-account file */
  keyFile?: SecretInput;
  /** Azure-style connection string */
  connectionString?: SecretInput;
  /** Use local credential chain / SSH agent / ADC when true */
  useDefault?: boolean;
  /** Escape hatch for provider-specific auth fields */
  [key: string]: unknown;
}

/** Shared optional knobs for any remote output. */
export interface RemoteConnectionBase {
  /** Host or hostname (sftp/ssh/webdav custom) */
  host?: string;
  /** TCP port (e.g. 22 for SSH, 443 for HTTPS APIs) */
  port?: number;
  /** Full endpoint URL (S3-compatible, WebDAV, custom API) */
  endpoint?: string;
  /** URL alias of endpoint */
  url?: string;
  /** Remote directory / object key prefix */
  prefix?: string;
  remotePath?: string;
  path?: string;
  /** Request / socket timeout */
  timeoutMs?: number;
  /** TLS / SSL */
  secure?: boolean;
  rejectUnauthorized?: boolean;
  /** Region (cloud) */
  region?: string;
  /** Arbitrary extra fields — drivers ignore unknown keys */
  [key: string]: unknown;
}

export interface LocalConnection {
  path?: string;
  [key: string]: unknown;
}

export interface S3Connection extends RemoteConnectionBase {
  bucket?: string;
  forcePathStyle?: boolean;
  credentials?: CredentialsConfig;
}

export interface GcsConnection extends RemoteConnectionBase {
  bucket?: string;
  projectId?: string;
  credentials?: CredentialsConfig;
}

export interface AzureConnection extends RemoteConnectionBase {
  account?: string;
  container?: string;
  credentials?: CredentialsConfig;
}

export interface SftpConnection extends RemoteConnectionBase {
  username?: string;
  /** Ready timeout for SSH handshake */
  readyTimeoutMs?: number;
  strictHostKeyChecking?: boolean;
  /** Known hosts file path */
  knownHostsFile?: string;
  agent?: boolean;
  credentials?: CredentialsConfig;
}

export interface WebdavConnection extends RemoteConnectionBase {
  username?: string;
  credentials?: CredentialsConfig;
}

export interface DriveConnection extends RemoteConnectionBase {
  folderId?: string;
  supportsAllDrives?: boolean;
  credentials?: CredentialsConfig;
}

export type StorageConnection =
  | LocalConnection
  | S3Connection
  | GcsConnection
  | AzureConnection
  | SftpConnection
  | WebdavConnection
  | DriveConnection
  | RemoteConnectionBase;

/**
 * Resolved, ready-to-use connection after secrets are loaded from env/files.
 * Still a flexible bag — drivers read what they need.
 */
export type ResolvedConnection = Record<string, unknown> & {
  host?: string;
  port?: number;
  endpoint?: string;
  url?: string;
  path?: string;
  prefix?: string;
  remotePath?: string;
  bucket?: string;
  region?: string;
  container?: string;
  account?: string;
  projectId?: string;
  folderId?: string;
  username?: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  token?: string;
  keyFile?: string;
  connectionString?: string;
  timeoutMs?: number;
  readyTimeoutMs?: number;
  secure?: boolean;
  rejectUnauthorized?: boolean;
  forcePathStyle?: boolean;
  useDefaultCredentials?: boolean;
  agent?: boolean;
};
