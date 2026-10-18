<?php

declare(strict_types=1);

namespace BackupKit\Drivers\Contracts;

interface DatabaseDriver
{
    public function id(): string;

    /** @param array<string, mixed> $ctx */
    public function dump(array $ctx, ?array $options = null): string;

    /** @param array<string, mixed> $ctx */
    public function restore(array $ctx, string $payload, ?array $options = null): void;
}
