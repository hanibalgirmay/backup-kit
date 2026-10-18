import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { ArtifactManifest } from "./manifest.js";
import { ensureDir } from "../utils/fs.js";
import { sha256File, formatChecksum } from "../utils/checksum.js";

export interface WriteArtifactInput {
  workDir: string;
  manifest: ArtifactManifest;
  sourceFiles: Array<{ name: string; filePath: string }>;
}

/**
 * Assembles a staging directory for a .bk artifact.
 * Full tar+gzip packaging will be layered on top of this staging layout.
 */
export class ArtifactWriter {
  async stage(input: WriteArtifactInput): Promise<{ stagingDir: string; checksumLines: string[] }> {
    const stagingDir = join(input.workDir, "artifact");
    const sourcesDir = join(stagingDir, "payload", "sources");
    await ensureDir(sourcesDir);

    const checksumLines: string[] = [];

    for (const source of input.sourceFiles) {
      const targetDir = join(sourcesDir, source.name);
      await ensureDir(targetDir);
      const target = join(targetDir, "dump.bin");
      await pipeline(await import("node:fs").then((fs) => fs.createReadStream(source.filePath)), createWriteStream(target));
      const hex = await sha256File(target);
      checksumLines.push(`${hex}  payload/sources/${source.name}/dump.bin`);
    }

    const manifestPath = join(stagingDir, "manifest.json");
    await writeFile(manifestPath, JSON.stringify(input.manifest, null, 2), "utf8");
    const manifestHex = await sha256File(manifestPath);
    checksumLines.push(`${manifestHex}  manifest.json`);

    await writeFile(join(stagingDir, "checksums.sha256"), checksumLines.join("\n") + "\n", "utf8");

    return { stagingDir, checksumLines };
  }
}

export { formatChecksum };
