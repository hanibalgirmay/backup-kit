import {
  createGzip,
  createGunzip,
  gzip as zlibGzip,
  gunzip as zlibGunzip,
} from "node:zlib";
import { promisify } from "node:util";
import { Transform, Readable, PassThrough, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Compression } from "../types/config.js";
import { BackupKitError } from "../errors/index.js";

/** Default when config omits `compression`. */
export const DEFAULT_COMPRESSION: Compression = "gzip";

export function resolveCompression(value?: Compression): Compression {
  return value ?? DEFAULT_COMPRESSION;
}

const gzipAsync = promisify(zlibGzip);
const gunzipAsync = promisify(zlibGunzip);

class CollectTransform extends Transform {
  protected chunks: Buffer[] = [];

  override _transform(chunk: Buffer, _enc: BufferEncoding, cb: TransformCallback): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    cb();
  }

  protected collect(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

class ZstdCompressTransform extends CollectTransform {
  override async _flush(cb: TransformCallback): Promise<void> {
    try {
      const { compress } = await import("@mongodb-js/zstd");
      this.push(Buffer.from(await compress(this.collect())));
      cb();
    } catch (err) {
      cb(err as Error);
    }
  }
}

class ZstdDecompressTransform extends CollectTransform {
  override async _flush(cb: TransformCallback): Promise<void> {
    try {
      const { decompress } = await import("@mongodb-js/zstd");
      this.push(Buffer.from(await decompress(this.collect())));
      cb();
    } catch (err) {
      cb(err as Error);
    }
  }
}

export function compressStream(algorithm: Compression): NodeJS.ReadWriteStream | null {
  switch (algorithm) {
    case "none":
      return null;
    case "gzip":
      return createGzip();
    case "zstd":
      return new ZstdCompressTransform();
    default:
      throw new BackupKitError("COMPRESS_UNSUPPORTED", `Unknown compression: ${algorithm}`);
  }
}

export function decompressStream(algorithm: Compression): NodeJS.ReadWriteStream | null {
  switch (algorithm) {
    case "none":
      return null;
    case "gzip":
      return createGunzip();
    case "zstd":
      return new ZstdDecompressTransform();
    default:
      throw new BackupKitError("COMPRESS_UNSUPPORTED", `Unknown compression: ${algorithm}`);
  }
}

export async function compressBuffer(data: Buffer, algorithm?: Compression): Promise<Buffer> {
  const resolved = resolveCompression(algorithm);
  switch (resolved) {
    case "none":
      return data;
    case "gzip":
      return gzipAsync(data);
    case "zstd": {
      const { compress } = await import("@mongodb-js/zstd");
      return Buffer.from(await compress(data));
    }
    default:
      throw new BackupKitError("COMPRESS_UNSUPPORTED", `Unknown compression: ${resolved}`);
  }
}

export async function decompressBuffer(data: Buffer, algorithm?: Compression): Promise<Buffer> {
  const resolved = resolveCompression(algorithm);
  switch (resolved) {
    case "none":
      return data;
    case "gzip":
      return gunzipAsync(data);
    case "zstd": {
      const { decompress } = await import("@mongodb-js/zstd");
      return Buffer.from(await decompress(data));
    }
    default:
      throw new BackupKitError("COMPRESS_UNSUPPORTED", `Unknown compression: ${resolved}`);
  }
}

/** Pipe readable through compression into a new readable (pass-through when none). */
export function pipeCompressed(
  input: NodeJS.ReadableStream,
  algorithm?: Compression,
): NodeJS.ReadableStream {
  const resolved = resolveCompression(algorithm);
  const transform = compressStream(resolved);
  if (!transform) return input;

  const out = new PassThrough();
  pipeline(input as Readable, transform, out).catch((err) => out.destroy(err));
  return out;
}
