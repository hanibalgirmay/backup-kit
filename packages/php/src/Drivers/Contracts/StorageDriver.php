<?php

declare(strict_types=1);

namespace BackupKit\Drivers\Contracts;

interface StorageDriver
{
    public function id(): string;

    /** @param array<string, mixed> $ctx */
    public function put(array $ctx, string $key, string $payload): void;

    /** @param array<string, mixed> $ctx */
    public function get(array $ctx, string $key): string;

    /**
     * @param array<string, mixed> $ctx
     * @return list<array{key: string, bytes: int, createdAt: string, checksum?: string}>
     */
    public function list(array $ctx, string $prefix = ''): array;

    /** @param array<string, mixed> $ctx */
    public function delete(array $ctx, string $key): void;

    /** @param array<string, mixed> $ctx */
    public function exists(array $ctx, string $key): bool;
}
