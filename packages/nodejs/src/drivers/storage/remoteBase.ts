import type {
  StorageDriver,
  ArtifactMeta,
} from "../../core/types/driver.js";
import type { ResolvedConnection } from "../../core/types/storage.js";
import { DriverError } from "../../core/errors/index.js";
import { Readable } from "node:stream";

export interface ConfigurableStorageDriver extends StorageDriver {
  readonly connection: ResolvedConnection;
}

/**
 * In-memory scaffold storage that retains the resolved connection.
 * Real network I/O is added per-driver later; connection/auth wiring is ready now.
 */
export function createConfigurableStubDriver(
  id: string,
  displayName: string,
  connection: ResolvedConnection,
): ConfigurableStorageDriver {
  const mem = new Map<string, { bytes: Buffer; createdAt: string }>();
  const prefix = typeof connection.prefix === "string" ? connection.prefix : "";

  function fullKey(key: string): string {
    if (!prefix) return key;
    return prefix.endsWith("/") ? `${prefix}${key}` : `${prefix}/${key}`;
  }

  return {
    id,
    kind: "storage",
    version: "0.1.0",
    displayName,
    capabilities: ["list", "delete", "exists", "stream"],
    connection,
    async put(_ctx, key, input) {
      const chunks: Buffer[] = [];
      for await (const chunk of input.stream as AsyncIterable<Buffer | string>) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      mem.set(fullKey(key), { bytes: Buffer.concat(chunks), createdAt: new Date().toISOString() });
    },
    async get(_ctx, key) {
      const hit = mem.get(fullKey(key));
      if (!hit) throw new DriverError(`Artifact not found: ${key}`, id);
      return { stream: Readable.from(hit.bytes), bytes: hit.bytes.length };
    },
    async list(_ctx, listPrefix = ""): Promise<ArtifactMeta[]> {
      const needle = fullKey(listPrefix);
      return [...mem.entries()]
        .filter(([k]) => k.startsWith(needle))
        .map(([key, v]) => ({
          key: prefix && key.startsWith(prefix) ? key.slice(prefix.length).replace(/^\//, "") : key,
          bytes: v.bytes.length,
          createdAt: v.createdAt,
        }));
    },
    async delete(_ctx, key) {
      mem.delete(fullKey(key));
    },
    async exists(_ctx, key) {
      return mem.has(fullKey(key));
    },
  };
}

/** @deprecated use createConfigurableStubDriver */
export function createStubStorageDriver(id: string, displayName: string): StorageDriver {
  return createConfigurableStubDriver(id, displayName, {});
}
