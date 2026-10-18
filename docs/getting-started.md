# Getting started

backup-kit is a **framework-first database backup** tool. Install it in your app, point it at cron + retention + storage, and it discovers your database automatically.

## Pick your stack

| Framework | Guide |
| --- | --- |
| NestJS / Express / Fastify | [frameworks/nodejs.md](./frameworks/nodejs.md) |
| Laravel | [frameworks/laravel.md](./frameworks/laravel.md) |
| Django / FastAPI | [frameworks/python.md](./frameworks/python.md) |

## Core ideas

1. **`database: "auto"`** — reads `DATABASE_URL`, ORM envs, or framework DB config (relational + Mongo/Redis)
2. **`schedule`** — cron job (`0 2 * * *`) runs backup (+ prune) automatically
3. **`retention`** — keepLast / daily / weekly / monthly / maxAgeDays
4. **`outputs`** — local by default; add S3, SSH/SFTP, Drive, etc.

## Minimal config

```json
{
  "database": "auto",
  "schedule": "0 2 * * *",
  "retention": { "keepLast": 7, "keepDaily": 14 },
  "outputs": [{ "driver": "local", "path": "./backups" }]
}
```

## Databases

| Kind | Drivers |
| --- | --- |
| Relational | `postgres`, `mysql`, `sqlite` |
| Document | `mongodb` |
| Key/value | `redis` |

## Next

- [Configuration](./configuration.md)
- [Drivers](./drivers.md)
- [Retention](./retention.md)
