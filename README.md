# backup-kit

<p align="center">
  <strong>Framework-first database backups</strong><br/>
  NestJS · Express · Laravel · Django · FastAPI · Gin
</p>

<p align="center">
  Discover your DB · schedule cron · apply retention · store locally or remotely
</p>

<p align="center">
  <a href="./docs/getting-started.md">Getting started</a> ·
  <a href="./docs/configuration.md">Configuration</a> ·
  <a href="./docs/drivers.md">Drivers</a> ·
  <a href="./SECURITY.md">Security</a>
</p>

---

**Author:** Hanibal Girmay  
**License:** [MIT](./LICENSE)

backup-kit is a multi-language toolkit you drop into your app. It discovers the database from env / framework config, runs on a cron schedule, keeps retention rules, and writes backups to local disk or remotes (S3, SSH/SFTP, GCS, Azure, WebDAV, Drive).

| Kind | Drivers |
| --- | --- |
| Relational | Postgres, MySQL, SQLite |
| Document / KV | MongoDB, Redis |

> **Status:** Node & PHP local backup paths are furthest along. Python and some remote/DB dump drivers are scaffolded — see [CHANGELOG](./CHANGELOG.md).

---

## Quick install

Each language is a **separate** package. Installing one never pulls the others.

| You use | Install | Registry |
| --- | --- | --- |
| NestJS / Express / Node | `npm install backup-kit` | npm |
| Laravel / PHP | `composer require hanibalgirmay/backup-kit` | Packagist |
| Django / FastAPI / Python | `pip install backup-kit` | PyPI |
| Gin / Go | `go get github.com/hanibalgirmay/backup-kit` | Go modules |

Source: [github.com/hanibalgirmay/backup-kit](https://github.com/hanibalgirmay/backup-kit)

---

## Features

1. **`database: "auto"`** — reads `DATABASE_URL`, ORM env, or framework DB config  
2. **Cron schedule** — in-process or framework scheduler hooks  
3. **Retention** — `keepLast` / daily / weekly / monthly / `maxAgeDays`  
4. **Flexible outputs** — `local`, `s3`, `gcs`, `azure`, `ssh`/`sftp`, `webdav`, `drive`  
5. **One contract** — shared [`spec/`](./spec) across Node, PHP, Python, and Go  

---

## Usage by stack

### NestJS

```bash
npm install backup-kit
```

```ts
import { BackupModule } from "backup-kit/adapters/nestjs";

BackupModule.forRoot({
  // database: "auto" by default — DATABASE_URL / ORM env
  schedule: "0 2 * * *",
  retention: { keepLast: 7, keepDaily: 14 },
  outputs: [{ driver: "local", path: "./storage/backups" }],
});
```

### Express

```bash
npm install backup-kit
```

```ts
import express from "express";
import { setupBackupKit } from "backup-kit/adapters/express";

const app = express();
setupBackupKit(app, {
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./backups" }],
});
```

### Laravel

```bash
composer require hanibalgirmay/backup-kit
```

```php
// config/backup-kit.php
return [
    'database' => 'auto',
    'schedule' => '0 2 * * *',
    'retention' => ['keepLast' => 7, 'keepDaily' => 14],
    'outputs' => [
        ['driver' => 'local', 'path' => storage_path('app/backups')],
    ],
];
```

### Python (FastAPI / Django)

```bash
pip install backup-kit
```

```python
from backup_kit import from_fastapi

kit = from_fastapi(
    schedule="0 2 * * *",
    retention={"keepLast": 7},
    outputs=[{"driver": "local", "path": "./backups"}],
)
```

### Go (Gin)

```bash
go get github.com/hanibalgirmay/backup-kit
```

```go
import (
  "github.com/hanibalgirmay/backup-kit"
  ginadapter "github.com/hanibalgirmay/backup-kit/adapters/gin"
)

h, err := ginadapter.Setup(backupkit.Config{
  Schedule:  "0 2 * * *",
  Retention: &backupkit.Retention{KeepLast: backupkit.Int(7)},
  Outputs:   []backupkit.Output{{Driver: "local", Path: "./backups"}},
})
```

Framework guides: [Node](./docs/frameworks/nodejs.md) · [Laravel](./docs/frameworks/laravel.md) · [Python](./docs/frameworks/python.md) · [Go](./docs/frameworks/go.md)

---

## Minimal config

```json
{
  "database": "auto",
  "schedule": "0 2 * * *",
  "retention": { "keepLast": 7, "keepDaily": 14 },
  "outputs": [
    { "driver": "local", "path": "./backups" },
    {
      "driver": "ssh",
      "host": "backup.example.com",
      "connection": { "username": "backup", "remotePath": "/var/backups" },
      "credentials": { "privateKey": { "file": "./id_ed25519" } }
    }
  ]
}
```

`ssh` is a friendly alias of `sftp` for any SSH host. More: [configuration](./docs/configuration.md) · [drivers](./docs/drivers.md) · [retention](./docs/retention.md)

---

## Documentation

| Doc | Description |
| --- | --- |
| [Getting started](./docs/getting-started.md) | First backup in minutes |
| [Configuration](./docs/configuration.md) | Config shape & credentials |
| [Drivers](./docs/drivers.md) | DB + storage drivers |
| [Security](./SECURITY.md) | Vulnerability reporting |
| [Contributing](./CONTRIBUTING.md) | Dev setup & PR guide |
| [Changelog](./CHANGELOG.md) | Release notes |

---

## Author & license

Created and maintained by **Hanibal Girmay**.

MIT © Hanibal Girmay — see [LICENSE](./LICENSE).  
By participating, you agree to our [Code of Conduct](./CODE_OF_CONDUCT.md).
