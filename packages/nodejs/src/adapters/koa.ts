import type { BackupKit } from "../index.js";

export function createKoaRouter(kit: BackupKit, basePath = "/backup-kit") {
  return async function middleware(ctx: any, next: () => Promise<void>) {
    if (ctx.method === "POST" && ctx.path === `${basePath}/backup`) {
      ctx.body = await kit.backup();
      return;
    }
    if (ctx.method === "GET" && ctx.path === `${basePath}/list`) {
      ctx.body = await kit.list();
      return;
    }
    await next();
  };
}
