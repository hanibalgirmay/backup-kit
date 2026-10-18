<?php

declare(strict_types=1);

require dirname(__DIR__, 2) . '/packages/php/vendor/autoload.php';

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
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
