import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArtifactManifest } from "./manifest.js";
import { ArtifactError } from "../errors/index.js";

/**
 * Reads a staged (or extracted) .bk layout.
 */
export class ArtifactReader {
  async readManifest(stagingDir: string): Promise<ArtifactManifest> {
    const raw = await readFile(join(stagingDir, "manifest.json"), "utf8");
    const manifest = JSON.parse(raw) as ArtifactManifest;
    if (manifest.formatVersion !== 1) {
      throw new ArtifactError(`Unsupported artifact formatVersion: ${manifest.formatVersion}`);
    }
    return manifest;
  }

  async readChecksums(stagingDir: string): Promise<string[]> {
    const raw = await readFile(join(stagingDir, "checksums.sha256"), "utf8");
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }
}
