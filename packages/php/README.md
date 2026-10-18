# backup-kit (PHP)

PHP runtime for the backup-kit contract. Implements the shared [`spec/`](../../spec).

## Install

```bash
composer require backup-kit/backup-kit
```

## Usage

```php
<?php

use function BackupKit\createBackupKit;
use function BackupKit\defineConfig;

$kit = createBackupKit(defineConfig([
    'name' => 'app-db',
    'sources' => [
        ['driver' => 'mysql', 'connection' => getenv('DATABASE_URL')],
    ],
    // optional — defaults to local ./backups
    'outputs' => [
        ['driver' => 'local', 'path' => './backups'],
        [
            'driver' => 'ssh',
            'host' => 'backup.example.com',
            'port' => 22,
            'connection' => ['username' => 'backup', 'remotePath' => '/var/backups'],
            'credentials' => [
                'privateKey' => ['file' => './secrets/id_ed25519'],
            ],
        ],
    ],
    'compression' => 'gzip', // default; zstd needs ext-zstd
    'retention' => ['keepLast' => 7],
]));

$result = $kit->backup();
$kit->list();
$kit->prune();
```

## CLI

```bash
vendor/bin/backup-kit init
vendor/bin/backup-kit backup -c backup-kit.config.json
vendor/bin/backup-kit list
vendor/bin/backup-kit prune
```

## Develop

```bash
composer install
composer test
```

## Notes

- Default compression: **gzip** (`ext-zlib`)
- **zstd** requires `ext-zstd`
- Remote outputs need connection + credentials (same contract as Node)
- Database / cloud drivers are scaffolded; local storage works end-to-end
