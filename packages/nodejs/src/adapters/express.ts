import type { BackupKit, BackupKitConfig } from "../index.js";
import { createBackupKit } from "../index.js";

export interface ExpressBackupOptions extends BackupKitConfig {
  /** HTTP route prefix (default /backup-kit) */
  basePath?: string;
  /** Attach HTTP routes (default true) */
  routes?: boolean;
  /** Auto-start cron when schedule is set (default true) */
  autoStart?: boolean;
}

type ExpressLike = {
  post: (path: string, handler: (req: unknown, res: any) => unknown) => unknown;
  get: (path: string, handler: (req: unknown, res: any) => unknown) => unknown;
};

/**
 * Drop into an Express app: auto DB discovery, cron schedule, retention, HTTP routes.
 *
 * @example
 * ```ts
 * const kit = setupBackupKit(app, {
 *   schedule: "0 2 * * *",
 *   retention: { keepLast: 7 },
 *   outputs: [{ driver: "local", path: "./backups" }],
 * });
 * ```
 */
export function setupBackupKit(app: ExpressLike, options: ExpressBackupOptions = {}): BackupKit {
  const { basePath = "/backup-kit", routes = true, autoStart, ...config } = options;

  const kit = createBackupKit(
    {
      framework: "express",
      database: config.database ?? (config.sources ? undefined : "auto"),
      ...config,
    },
    { autoStart: autoStart !== false },
  );

  if (routes) {
    createExpressAdapter(kit, { basePath })(app);
  }

  return kit;
}

export interface ExpressAdapterOptions {
  basePath?: string;
}

export function createExpressAdapter(kit: BackupKit, options: ExpressAdapterOptions = {}) {
  const base = options.basePath ?? "/backup-kit";

  return function attach(app: ExpressLike) {
    app.post(`${base}/backup`, async (_req, res) => {
      try {
        res.status(200).json(await kit.backup());
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    app.get(`${base}/list`, async (_req, res) => {
      try {
        res.status(200).json(await kit.list());
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    app.post(`${base}/prune`, async (_req, res) => {
      try {
        res.status(200).json(await kit.prune());
      } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    });

    return app;
  };
}

export default setupBackupKit;
