# PHP plain example

```php
<?php

require __DIR__ . '/../../packages/php/vendor/autoload.php';

use function BackupKit\createBackupKit;

$kit = createBackupKit([
    'name' => 'plain-app',
    'sources' => [
        ['driver' => 'mysql', 'connection' => getenv('DATABASE_URL') ?: 'mysql://localhost/app'],
    ],
    'outputs' => [
        ['driver' => 'local', 'path' => __DIR__ . '/backups'],
    ],
    'compression' => 'gzip',
    'retention' => ['keepLast' => 5],
]);

$result = $kit->backup();
echo json_encode($result, JSON_PRETTY_PRINT), PHP_EOL;
```

From `packages/php`:

```bash
composer install
php ../../examples/php-plain/backup.php
```
