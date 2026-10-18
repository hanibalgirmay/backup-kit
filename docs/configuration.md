# Configuration

Shared contract: [`spec/config.schema.json`](../spec/config.schema.json).

## Framework-first fields

| Field | Default | Description |
| --- | --- | --- |
| `framework` | `auto` | nestjs / express / laravel / django / fastapi / plain |
| `database` | `auto` | Auto-discover DB, or pass source object/array |
| `sources` | — | Explicit sources (optional if `database` set) |
| `schedule` | — | Cron string or `{ cron, timezone, pruneAfterBackup }` |
| `retention` | `{ keepLast: 7 }` | Prune policy |
| `outputs` | local `./backups` | One or more storage targets |
| `compression` | `gzip` | `gzip` \| `zstd` \| `none` |

## Auto database discovery

Looks for (in order):

- `DATABASE_URL` / `DB_URL` / `TYPEORM_URL` / `PRISMA_DATABASE_URL`
- `MONGODB_URI` / `MONGO_URL`
- `REDIS_URL`
- `DB_HOST` + `DB_DATABASE` (+ `DB_CONNECTION`)
- Laravel `config/database.php` (PHP)
- `SQLITE_PATH`

## Schedule

```json
{
  "schedule": {
    "cron": "0 2 * * *",
    "timezone": "Africa/Cairo",
    "enabled": true,
    "pruneAfterBackup": true
  }
}
```

Or shorthand: `"schedule": "0 2 * * *"`.

## Outputs (local + remote)

```json
{
  "outputs": [
    { "driver": "local", "path": "./backups" },
    {
      "driver": "s3",
      "connection": { "bucket": "backups", "region": "us-east-1" },
      "credentials": { "useDefault": true }
    },
    {
      "driver": "ssh",
      "host": "1.2.3.4",
      "port": 22,
      "connection": { "username": "backup", "remotePath": "/var/backups" },
      "credentials": { "privateKey": { "file": "./id_ed25519" } }
    }
  ]
}
```

See [drivers.md](./drivers.md) for credential shapes.
