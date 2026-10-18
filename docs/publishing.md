# Install & publish (one package per language)

This repo is a **monorepo**. Each language runtime is published **separately**.  
Installing Node does **not** install PHP or Python (and vice versa).

| Language | Registry | Package name | Source folder |
| --- | --- | --- | --- |
| Node.js | npm | `@ryle/backup-kit` | `packages/nodejs` |
| PHP | Packagist / Composer | `backup-kit/backup-kit` | `packages/php` |
| Python | PyPI | `backup-kit` | `packages/python` |
| Go | Go modules | `github.com/backup-kit/backup-kit` | `packages/go` |

The root `package.json` is `"private": true` — the monorepo itself is never published to npm.

---

## 1) Node.js (npm only)

### Install (end users)

```bash
# NestJS / Express / plain Node
npm install @ryle/backup-kit
# or
pnpm add @ryle/backup-kit
# or
yarn add @ryle/backup-kit
```

What you get: **only** the Node runtime (+ its npm dependencies like `zod`, `croner`).  
You do **not** get PHP, Python, or Go code.

### NestJS

```bash
pnpm add @ryle/backup-kit
```

```ts
import { BackupModule } from "@ryle/backup-kit/adapters/nestjs";

const backup = BackupModule.forRoot({
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./storage/backups" }],
});
```

### Express

```bash
pnpm add @ryle/backup-kit express
```

```ts
import { setupBackupKit } from "@ryle/backup-kit/adapters/express";

setupBackupKit(app, {
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./backups" }],
});
```

### Publish Node to npm (maintainers)

```bash
cd packages/nodejs
pnpm install
pnpm build
pnpm publish --access public
# publishes ONLY packages/nodejs → @ryle/backup-kit
```

---

## 2) PHP (Composer only)

### Install (end users)

```bash
composer require backup-kit/backup-kit
```

What you get: **only** the PHP package under `vendor/backup-kit/backup-kit`.  
No Node `node_modules`, no Python package.

### Laravel

```bash
composer require backup-kit/backup-kit
```

```php
use BackupKit\Adapters\Laravel\BackupKitBridge;
use BackupKit\BackupKit;

$this->app->singleton(BackupKit::class, fn () =>
    BackupKitBridge::make(config('backup-kit', []), config('database'))
);
```

### Publish PHP to Packagist (maintainers)

1. Push `packages/php` (or the repo with Packagist path pointing at it)
2. Submit / sync on [packagist.org](https://packagist.org) as `backup-kit/backup-kit`
3. Users only run `composer require backup-kit/backup-kit`

---

## 3) Python (PyPI only)

### Install (end users)

```bash
pip install backup-kit
# or
uv add backup-kit
```

What you get: **only** the `backup_kit` Python package.  
No npm, no Composer vendor tree.

### FastAPI / Django

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

### Publish Python to PyPI (maintainers)

```bash
cd packages/python
python -m build
python -m twine upload dist/*
# publishes ONLY packages/python → backup-kit
```

---

## 4) Go (modules only)

### Install (end users)

```bash
go get github.com/backup-kit/backup-kit/backupkit
```

What you get: **only** the Go module (`backupkit` + optional Gin adapter).  
No npm, Composer, or PyPI packages.

### Gin

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

### Publish Go module (maintainers)

1. Tag a release from `packages/go` (module path `github.com/backup-kit/backup-kit`)
2. Push the tag so `proxy.golang.org` can fetch it
3. Users only run `go get github.com/backup-kit/backup-kit/backupkit`

---

## Mental model

```
User app (NestJS)
  └── npm i @ryle/backup-kit     ← Node only

User app (Laravel)
  └── composer require backup-kit/backup-kit   ← PHP only

User app (FastAPI)
  └── pip install backup-kit     ← Python only

User app (Gin)
  └── go get github.com/backup-kit/backup-kit/backupkit   ← Go only
```

Shared docs/spec live in the monorepo for maintainers. End users never install the whole monorepo unless they clone it for development.
