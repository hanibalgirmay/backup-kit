# @ryle/backup-kit

Framework-first database backups for NestJS, Express, Fastify, Koa, Hono, and plain Node.

## Install

```bash
npm install @ryle/backup-kit
# or
pnpm add @ryle/backup-kit
```

## Usage

```ts
import { createBackupKit, defineConfig } from "@ryle/backup-kit";

const kit = createBackupKit(
  defineConfig({
    name: "app-db",
    database: "auto",
    schedule: "0 2 * * *",
    retention: { keepLast: 7 },
    outputs: [{ driver: "local", path: "./backups" }],
  }),
);

await kit.backup();
```

## NestJS

```ts
import { BackupModule } from "@ryle/backup-kit/adapters/nestjs";

BackupModule.forRoot({
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./storage/backups" }],
});
```

## CLI

```bash
npx backup-kit init
npx backup-kit backup
npx backup-kit list
npx backup-kit prune
```

## Develop / publish

```bash
pnpm install
pnpm test
pnpm build
pnpm publish --access public
```

**Author:** Hanibal Girmay · **License:** MIT

See [docs/publishing.md](../../docs/publishing.md).
