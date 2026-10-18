import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export function sha256Buffer(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(path);
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

export function formatChecksum(hex: string): string {
  return `sha256:${hex}`;
}
