import type { BackupKit } from "../index.js";

export function createHonoRoutes(kit: BackupKit, basePath = "/backup-kit") {
  return {
    basePath,
    handlers: {
      backup: async () => kit.backup(),
      list: async () => kit.list(),
      prune: async () => kit.prune(),
    },
  };
}
