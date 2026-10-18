export class BackupKitError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(code: string, message: string, cause?: unknown) {
    super(message);
    this.name = "BackupKitError";
    this.code = code;
    this.cause = cause;
  }
}

export class ConfigError extends BackupKitError {
  constructor(message: string, cause?: unknown) {
    super("CONFIG_INVALID", message, cause);
    this.name = "ConfigError";
  }
}

export class DriverError extends BackupKitError {
  readonly driver?: string;

  constructor(message: string, driver?: string, cause?: unknown) {
    super("DRIVER_ERROR", message, cause);
    this.name = "DriverError";
    this.driver = driver;
  }
}

export class ArtifactError extends BackupKitError {
  constructor(message: string, cause?: unknown) {
    super("ARTIFACT_ERROR", message, cause);
    this.name = "ArtifactError";
  }
}
