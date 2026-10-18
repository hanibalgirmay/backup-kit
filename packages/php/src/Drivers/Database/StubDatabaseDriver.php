<?php

declare(strict_types=1);

namespace BackupKit\Drivers\Database;

use BackupKit\Drivers\Contracts\DatabaseDriver;
use BackupKit\Errors\DriverException;

final class StubDatabaseDriver implements DatabaseDriver
{
    public function __construct(
        private readonly string $driverId,
        private readonly string $displayName = '',
    ) {
    }

    public function id(): string
    {
        return $this->driverId;
    }

    public function dump(array $ctx, ?array $options = null): string
    {
        return json_encode([
            'driver' => $this->driverId,
            'sourceName' => $ctx['sourceName'] ?? 'source',
            'stub' => true,
            'displayName' => $this->displayName,
        ], JSON_THROW_ON_ERROR) . "\n";
    }

    public function restore(array $ctx, string $payload, ?array $options = null): void
    {
        throw new DriverException("{$this->driverId} restore is not implemented yet", $this->driverId);
    }
}
