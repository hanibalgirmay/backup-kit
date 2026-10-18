# Node.js frameworks (NestJS / Express)

Package: `@ryle/backup-kit`

```bash
pnpm add @ryle/backup-kit
```

## NestJS

```ts
import { Module } from "@nestjs/common";
import { BackupModule } from "@ryle/backup-kit/adapters/nestjs";

@Module({
  imports: [
    // forRoot returns { kit, service, controller, ... } — wire into Nest as you prefer
  ],
})
export class AppModule {}

// app.module bootstrap / provider:
import { BackupModule } from "@ryle/backup-kit/adapters/nestjs";

const backup = BackupModule.forRoot({
  // database auto-discovered from DATABASE_URL / TypeORM / Prisma env
  schedule: "0 2 * * *",
  retention: { keepLast: 7, keepDaily: 14 },
  outputs: [
    { driver: "local", path: "./storage/backups" },
    // {
    //   driver: "s3",
    //   connection: { bucket: "my-backups", region: "us-east-1" },
    //   credentials: { useDefault: true },
    // },
  ],
});

// Use backup.kit / backup.service in your Nest providers
```

Inject `backup.service` and call `backup()` / `list()` / `prune()`, or rely on the cron schedule (auto-started).

## Express

```ts
import express from "express";
import { setupBackupKit } from "@ryle/backup-kit/adapters/express";

const app = express();

const kit = setupBackupKit(app, {
  schedule: { cron: "0 2 * * *", timezone: "UTC", pruneAfterBackup: true },
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./backups" }],
});

// HTTP: POST /backup-kit/backup, GET /backup-kit/list, POST /backup-kit/prune
// Cron already running via kit.start()
```

## Plain Node / CLI

```bash
npx backup-kit init
# edit backup-kit.config.json
npx backup-kit schedule   # long-running cron worker
npx backup-kit backup     # one-shot
```

```ts
import { createBackupKit } from "@ryle/backup-kit";

const kit = createBackupKit({
  database: "auto",
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
});
// cron auto-starts; or kit.start()
```

## Multi-database (SQL + Mongo)

```ts
createBackupKit({
  database: [
    { name: "sql", driver: "postgres", connection: process.env.DATABASE_URL! },
    { name: "docs", driver: "mongodb", connection: process.env.MONGODB_URI! },
  ],
  schedule: "0 3 * * *",
  outputs: [{ driver: "local", path: "./backups" }],
});
```
