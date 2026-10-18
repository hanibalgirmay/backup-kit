import { mkdir, rm, writeFile, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function createTempDir(prefix = "backup-kit-"): Promise<string> {
  const dir = join(tmpdir(), `${prefix}${randomBytes(6).toString("hex")}`);
  await ensureDir(dir);
  return dir;
}

export async function removePath(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

export { writeFile, readFile, readdir, stat, join };
