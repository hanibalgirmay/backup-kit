<?php

declare(strict_types=1);

namespace BackupKit\Drivers;

use BackupKit\Config\Credentials;
use BackupKit\Config\Outputs;
use BackupKit\Drivers\Contracts\StorageDriver;
use BackupKit\Drivers\Storage\ConfigurableStubStorageDriver;
use BackupKit\Drivers\Storage\LocalStorageDriver;
use BackupKit\Registry\DriverRegistry;

final class OutputResolver
{
    /** @var array<string, StorageDriver> */
    private array $cache = [];

    public function __construct(private readonly DriverRegistry $registry)
    {
    }

    /**
     * @param array<string, mixed> $output
     * @param array<string, string|null> $env
     */
    public function resolve(array $output, array $env): StorageDriver
    {
        $driverId = Outputs::normalizeDriver((string) $output['driver']);
        $connection = Credentials::resolveOutputConnection($output, $env);
        Credentials::assertOutputConnection((string) $output['driver'], $connection);

        $cacheKey = json_encode([
            'name' => $output['name'] ?? null,
            'driver' => $driverId,
            'host' => $connection['host'] ?? null,
            'port' => $connection['port'] ?? null,
            'endpoint' => $connection['endpoint'] ?? null,
            'bucket' => $connection['bucket'] ?? null,
            'path' => $connection['path'] ?? null,
            'prefix' => $connection['prefix'] ?? null,
            'username' => $connection['username'] ?? null,
            'hasPassword' => isset($connection['password']),
            'hasPrivateKey' => isset($connection['privateKey']),
            'hasToken' => isset($connection['token']),
            'useDefault' => (bool) ($connection['useDefaultCredentials'] ?? false),
        ], JSON_THROW_ON_ERROR);

        if (isset($this->cache[$cacheKey])) {
            return $this->cache[$cacheKey];
        }

        $driver = match ($driverId) {
            'local' => new LocalStorageDriver((string) ($connection['path'] ?? './backups')),
            's3', 'gcs', 'azure', 'sftp', 'webdav', 'drive' => new ConfigurableStubStorageDriver(
                $driverId,
                $connection,
                $driverId,
            ),
            default => $this->registry->getStorage($driverId),
        };

        $this->cache[$cacheKey] = $driver;

        return $driver;
    }
}
