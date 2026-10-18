import { Readable } from "node:stream";
import type { DatabaseDriver, DumpContext, RestoreContext, ArtifactStream, SourceInfo } from "../../core/types/driver.js";
import { DriverError } from "../../core/errors/index.js";

export function createStubDatabaseDriver(
  id: string,
  displayName: string,
): DatabaseDriver {
  return {
    id,
    kind: "database",
    version: "0.1.0",
    displayName,
    capabilities: ["dump", "restore", "stream"],
    async dump(ctx: DumpContext): Promise<ArtifactStream> {
      const payload = Buffer.from(
        JSON.stringify({ driver: id, sourceName: ctx.sourceName, stub: true }) + "\n",
      );
      return { stream: Readable.from(payload), bytes: payload.length, contentType: "application/octet-stream" };
    },
    async restore(_ctx: RestoreContext, _input: ArtifactStream): Promise<void> {
      throw new DriverError(`${id} restore is not implemented yet`, id);
    },
    async inspect(ctx: DumpContext): Promise<SourceInfo> {
      return { driver: id, label: `${displayName}:${ctx.sourceName}` };
    },
  };
}
