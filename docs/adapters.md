# Adapters

Adapters are optional framework glue. They are tree-shakeable entry points and never required for core backup/restore.

## Node.js

| Adapter | Import | Purpose |
| --- | --- | --- |
| Express | `backup-kit/adapters/express` | HTTP routes for backup/restore/list |
| Fastify | `backup-kit/adapters/fastify` | Fastify plugin |
| NestJS | `backup-kit/adapters/nestjs` | Module / service / controller |
| Koa | `backup-kit/adapters/koa` | Middleware + routes |
| Hono | `backup-kit/adapters/hono` | Hono app routes |

## Other languages

Framework adapters for PHP/Python/Go live in their respective packages and are documented under [`languages/`](./languages/).

## Design rules

- Adapters depend on the core kit API only (`createBackupKit`)
- No adapter may change artifact or config semantics
- Heavy framework deps are peer dependencies
