# backup-kit (Node.js)

Node.js runtime for the backup-kit contract. One npm package with tree-shakeable adapters and a CLI.

## Install

```bash
pnpm add backup-kit
```

## Usage

```ts
import { createBackupKit, defineConfig } from "backup-kit";

const kit = createBackupKit(
  defineConfig({
    name: "app-db",
    sources: [{ driver: "postgres", connection: process.env.DATABASE_URL! }],
    destination: { driver: "local", path: "./backups" },
    retention: { keepLast: 7 },
  }),
);

await kit.backup();
```

## CLI

```bash
npx backup-kit backup
npx backup-kit restore <key>
npx backup-kit list
npx backup-kit prune
```

## Develop

```bash
pnpm install
pnpm build
pnpm test
```

See monorepo docs under [`../../docs`](../../docs).
