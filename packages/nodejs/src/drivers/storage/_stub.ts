import { Readable } from "node:stream";
import { createWriteStream, createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, stat, unlink, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type {
  StorageDriver,
  StorageContext,
  ArtifactStream,
  ArtifactMeta,
} from "../../core/types/driver.js";
import { DriverError } from "../../core/errors/index.js";

export function createLocalStorageDriver(basePath = "./backups"): StorageDriver {
  const root = basePath;

  async function ensure(): Promise<void> {
    await mkdir(root, { recursive: true });
  }

  return {
    id: "local",
    kind: "storage",
    version: "0.1.0",
    displayName: "Local filesystem",
    capabilities: ["list", "delete", "exists", "stream"],
    async put(_ctx: StorageContext, key: string, input: ArtifactStream): Promise<void> {
      await ensure();
      const target = join(root, key);
      await pipeline(input.stream as NodeJS.ReadableStream, createWriteStream(target));
    },
    async get(_ctx: StorageContext, key: string): Promise<ArtifactStream> {
      const target = join(root, key);
      if (!existsSync(target)) throw new DriverError(`Artifact not found: ${key}`, "local");
      const s = await stat(target);
      return { stream: createReadStream(target), bytes: s.size };
    },
    async list(_ctx: StorageContext, prefix = ""): Promise<ArtifactMeta[]> {
      await ensure();
      const files = await readdir(root);
      const out: ArtifactMeta[] = [];
      for (const file of files) {
        if (prefix && !file.startsWith(prefix)) continue;
        if (!file.endsWith(".bk") && !file.includes(".")) continue;
        const s = await stat(join(root, file));
        out.push({
          key: file,
          bytes: s.size,
          createdAt: s.mtime.toISOString(),
        });
      }
      return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async delete(_ctx: StorageContext, key: string): Promise<void> {
      await unlink(join(root, key));
    },
    async exists(_ctx: StorageContext, key: string): Promise<boolean> {
      return existsSync(join(root, key));
    },
  };
}

export function createStubStorageDriver(id: string, displayName: string): StorageDriver {
  const mem = new Map<string, { bytes: Buffer; createdAt: string }>();

  return {
    id,
    kind: "storage",
    version: "0.1.0",
    displayName,
    capabilities: ["list", "delete", "exists", "stream"],
    async put(_ctx, key, input) {
      const chunks: Buffer[] = [];
      for await (const chunk of input.stream as AsyncIterable<Buffer | string>) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      mem.set(key, { bytes: Buffer.concat(chunks), createdAt: new Date().toISOString() });
    },
    async get(_ctx, key) {
      const hit = mem.get(key);
      if (!hit) throw new DriverError(`Artifact not found: ${key}`, id);
      return { stream: Readable.from(hit.bytes), bytes: hit.bytes.length };
    },
    async list() {
      return [...mem.entries()].map(([key, v]) => ({
        key,
        bytes: v.bytes.length,
        createdAt: v.createdAt,
      }));
    },
    async delete(_ctx, key) {
      mem.delete(key);
    },
    async exists(_ctx, key) {
      return mem.has(key);
    },
  };
}

// silence unused in stub helper modules that may import fs write helpers later
void writeFile;
void readFile;
