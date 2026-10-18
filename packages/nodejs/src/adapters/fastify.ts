import type { BackupKit } from "../index.js";

export interface FastifyAdapterOptions {
  prefix?: string;
}

export function createFastifyPlugin(kit: BackupKit, options: FastifyAdapterOptions = {}) {
  const prefix = options.prefix ?? "/backup-kit";

  return async function backupKitPlugin(app: {
    post: (path: string, handler: (req: unknown, reply: any) => unknown) => unknown;
    get: (path: string, handler: (req: unknown, reply: any) => unknown) => unknown;
  }) {
    app.post(`${prefix}/backup`, async (_req, reply) => reply.send(await kit.backup()));
    app.get(`${prefix}/list`, async (_req, reply) => reply.send(await kit.list()));
  };
}
