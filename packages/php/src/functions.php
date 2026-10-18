<?php

declare(strict_types=1);

namespace BackupKit;

use BackupKit\Config\ConfigLoader;

/**
 * @param array<string, mixed> $config
 * @param array<string, mixed>|null $laravelDatabase
 * @return array<string, mixed>
 */
function defineConfig(array $config = [], ?array $laravelDatabase = null): array
{
    return (new ConfigLoader())->fromArray($config, $laravelDatabase);
}

/**
 * @param array<string, mixed> $config
 * @param array<string, mixed>|null $laravelDatabase
 */
function createBackupKit(array $config = [], ?array $laravelDatabase = null): BackupKit
{
    return BackupKit::fromConfig($config, $laravelDatabase);
}
