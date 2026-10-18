# PHP

Package: [`packages/php`](../../packages/php) — Composer package **`backup-kit/backup-kit`**.

## Install

```bash
composer require backup-kit/backup-kit
```

## Programmatic API

```php
<?php

use BackupKit\BackupKit;
use function BackupKit\defineConfig;

$kit = BackupKit::fromConfig(defineConfig([
    'name' => 'app',
    'sources' => [
        ['driver' => 'mysql', 'connection' => getenv('DATABASE_URL')],
    ],
    'outputs' => [
        ['driver' => 'local', 'path' => './backups'],
    ],
    'compression' => 'gzip',
    'retention' => ['keepLast' => 7],
]));

$kit->backup();
$kit->list();
$kit->prune();
```

Helpers: `BackupKit\defineConfig()`, `BackupKit\createBackupKit()`.

## CLI

```bash
vendor/bin/backup-kit init
vendor/bin/backup-kit backup
vendor/bin/backup-kit list
vendor/bin/backup-kit prune
```

## Laravel

No hard Laravel dependency. Wire the kit yourself:

```php
use BackupKit\Adapters\Laravel\BackupKitBridge;

$this->app->singleton(\BackupKit\BackupKit::class, fn () =>
    BackupKitBridge::make(config('backup-kit'))
);
```

## Compression

| Algorithm | Requirement |
| --- | --- |
| `gzip` (default) | `ext-zlib` |
| `zstd` | `ext-zstd` |
| `none` | — |

## Examples

See [`examples/php-plain`](../../examples/php-plain) and [`examples/php-laravel`](../../examples/php-laravel).
