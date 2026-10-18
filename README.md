# backup-kit

Framework-first **database backup** toolkit. Install into NestJS, Express, Laravel, Django, or FastAPI — it discovers your DB, runs on a cron schedule, applies retention, and stores backups locally or to remote storage.

Supports **relational** (Postgres, MySQL, SQLite) and **non-relational** (MongoDB, Redis) sources.

## Install by language (separate packages)

Each runtime is published **on its own registry**. Installing one never pulls the others.

| You use | Install command | Registry |
| --- | --- | --- |
| NestJS / Express / Node | `npm install @ryle/backup-kit` | npm |
| Laravel / PHP | `composer require backup-kit/backup-kit` | Packagist |
| Django / FastAPI / Python | `pip install backup-kit` | PyPI |
| Gin / Go | `go get github.com/backup-kit/backup-kit/backupkit` | Go modules |

Full publish + install walkthrough: [docs/publishing.md](./docs/publishing.md)

### NestJS

```bash
npm install @ryle/backup-kit
```

```ts
import { BackupModule } from "@ryle/backup-kit/adapters/nestjs";

const backup = BackupModule.forRoot({
  // database: "auto" is the default — reads DATABASE_URL / ORM env
  schedule: "0 2 * * *",          // every day at 02:00
  retention: { keepLast: 7, keepDaily: 14 },
  outputs: [{ driver: "local", path: "./storage/backups" }],
});
```

### Express

```bash
npm install @ryle/backup-kit
```

```ts
import express from "express";
import { setupBackupKit } from "@ryle/backup-kit/adapters/express";

const app = express();
const kit = setupBackupKit(app, {
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./backups" }],
});
// kit.start() is called for you when schedule is set
```

### Laravel

```bash
composer require backup-kit/backup-kit
```

```php
// config/backup-kit.php
return [
    'database' => 'auto', // uses config('database.default')
    'schedule' => '0 2 * * *',
    'retention' => ['keepLast' => 7, 'keepDaily' => 14],
    'outputs' => [
        ['driver' => 'local', 'path' => storage_path('app/backups')],
        // ['driver' => 's3', 'connection' => ['bucket' => 'backups'], 'credentials' => ['useDefault' => true]],
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
go get github.com/backup-kit/backup-kit/backupkit
```

```go
import (
  "github.com/backup-kit/backup-kit/backupkit"
  ginadapter "github.com/backup-kit/backup-kit/backupkit/adapters/gin"
)

h, err := ginadapter.Setup(backupkit.Config{
  Schedule: "0 2 * * *",
  Retention: &backupkit.Retention{KeepLast: backupkit.Int(7)},
  Outputs: []backupkit.Output{{Driver: "local", Path: "./backups"}},
})
```

## What you get

1. **Auto database source** — `database: "auto"` from env / framework config  
2. **Cron jobs** — in-process schedule or framework scheduler hooks  
3. **Retention** — keepLast / daily / weekly / monthly / maxAgeDays  
4. **Flexible outputs** — local, S3, GCS, Azure, SSH/SFTP, WebDAV, Drive  
5. **Relational + document/KV** — postgres, mysql, sqlite, mongodb, redis  

## Layout

```
backup-kit/
├── spec/          # shared contract (source of truth)
├── docs/          # guides + framework install docs
├── examples/      # Nest, Express, Laravel, FastAPI, …
└── packages/
    ├── nodejs/    # @ryle/backup-kit
    ├── php/       # backup-kit/backup-kit
    ├── python/    # backup-kit
    └── go/        # github.com/backup-kit/backup-kit
```

## License

MIT
