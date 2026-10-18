<?php

declare(strict_types=1);

namespace BackupKit\Drivers\Storage;

use BackupKit\Drivers\Contracts\StorageDriver;
use BackupKit\Errors\DriverException;

/** In-memory remote storage scaffold that retains resolved connection settings. */
final class ConfigurableStubStorageDriver implements StorageDriver
{
    /** @var array<string, array{bytes: string, createdAt: string}> */
    private array $mem = [];

    /** @param array<string, mixed> $connection */
    public function __construct(
        private readonly string $driverId,
        private readonly array $connection = [],
        private readonly string $displayName = '',
    ) {
    }

    public function id(): string
    {
        return $this->driverId;
    }

    /** @return array<string, mixed> */
    public function connection(): array
    {
        return $this->connection;
    }

    public function put(array $ctx, string $key, string $payload): void
    {
        $this->mem[$this->fullKey($key)] = [
            'bytes' => $payload,
            'createdAt' => gmdate('c'),
        ];
    }

    public function get(array $ctx, string $key): string
    {
        $hit = $this->mem[$this->fullKey($key)] ?? null;
        if ($hit === null) {
            throw new DriverException("Artifact not found: {$key}", $this->driverId);
        }

        return $hit['bytes'];
    }

    public function list(array $ctx, string $prefix = ''): array
    {
        $needle = $this->fullKey($prefix);
        $prefixRoot = (string) ($this->connection['prefix'] ?? '');
        $out = [];
        foreach ($this->mem as $key => $v) {
            if ($needle !== '' && !str_starts_with($key, $needle)) {
                continue;
            }
            $publicKey = $key;
            if ($prefixRoot !== '' && str_starts_with($key, rtrim($prefixRoot, '/') . '/')) {
                $publicKey = substr($key, strlen(rtrim($prefixRoot, '/')) + 1);
            }
            $out[] = [
                'key' => $publicKey,
                'bytes' => strlen($v['bytes']),
                'createdAt' => $v['createdAt'],
            ];
        }

        return $out;
    }

    public function delete(array $ctx, string $key): void
    {
        unset($this->mem[$this->fullKey($key)]);
    }

    public function exists(array $ctx, string $key): bool
    {
        return isset($this->mem[$this->fullKey($key)]);
    }

    private function fullKey(string $key): string
    {
        $prefix = (string) ($this->connection['prefix'] ?? '');
        if ($prefix === '') {
            return $key;
        }

        return str_ends_with($prefix, '/') ? $prefix . $key : $prefix . '/' . $key;
    }
}
