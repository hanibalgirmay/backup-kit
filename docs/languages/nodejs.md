# Node.js

Package: [`packages/nodejs`](../../packages/nodejs) — published as **`backup-kit`**.

## Install

```bash
npm install backup-kit
# or
pnpm add backup-kit
```

## Programmatic API

```ts
import { createBackupKit, defineConfig } from "backup-kit";

const config = defineConfig({
  name: "app",
  sources: [{ driver: "sqlite", connection: { path: "./data.db" } }],
  destination: { driver: "local", path: "./backups" },
});

const kit = createBackupKit(config);
await kit.backup();
await kit.list();
await kit.restore({ key: "..." });
await kit.prune();
```

## CLI

```bash
npx backup-kit init
npx backup-kit backup
npx backup-kit list
npx backup-kit restore <key>
npx backup-kit prune
npx backup-kit schedule
```

## Subpath exports

| Path | Contents |
| --- | --- |
| `backup-kit` | Core API |
| `backup-kit/adapters/express` | Express adapter |
| `backup-kit/adapters/fastify` | Fastify adapter |
| `backup-kit/adapters/nestjs` | NestJS module |
| `backup-kit/adapters/koa` | Koa adapter |
| `backup-kit/adapters/hono` | Hono adapter |
| `backup-kit/cli` | CLI program |

## Examples

See [`examples/node-*`](../../examples/).
