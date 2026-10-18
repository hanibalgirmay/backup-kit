<?php

declare(strict_types=1);

namespace BackupKit\Registry;

use BackupKit\Drivers\Contracts\DatabaseDriver;
use BackupKit\Drivers\Contracts\StorageDriver;
use BackupKit\Errors\DriverException;

final class DriverRegistry
{
    /** @var array<string, DatabaseDriver|StorageDriver> */
    private array $drivers = [];

    public function register(DatabaseDriver|StorageDriver $driver): void
    {
        $this->drivers[$driver->id()] = $driver;
    }

    public function getDatabase(string $id): DatabaseDriver
    {
        $driver = $this->drivers[$id] ?? null;
        if (!$driver instanceof DatabaseDriver) {
            throw new DriverException("Database driver not registered: {$id}", $id);
        }

        return $driver;
    }

    public function getStorage(string $id): StorageDriver
    {
        $driver = $this->drivers[$id] ?? null;
        if (!$driver instanceof StorageDriver) {
            throw new DriverException("Storage driver not registered: {$id}", $id);
        }

        return $driver;
    }
}
