import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import type { EncryptionConfig } from "../types/config.js";
import { BackupKitError } from "../errors/index.js";

export function resolveKey(encryption?: EncryptionConfig): Buffer | null {
  if (!encryption || encryption.algorithm === "none") return null;
  const envName = encryption.keyEnv ?? "BACKUP_KIT_KEY";
  const raw = process.env[envName];
  if (!raw) {
    throw new BackupKitError("ENCRYPTION_KEY_MISSING", `Missing encryption key env: ${envName}`);
  }
  return scryptSync(raw, "backup-kit", 32);
}

export function encryptBuffer(data: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptBuffer(payload: Buffer, key: Buffer): Buffer {
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const data = payload.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
