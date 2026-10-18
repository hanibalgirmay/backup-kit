<?php

declare(strict_types=1);

namespace BackupKit\Drivers\Storage;

use BackupKit\Drivers\Contracts\StorageDriver;
use BackupKit\Errors\DriverException;

final class LocalStorageDriver implements StorageDriver
{
    public function __construct(private readonly string $root = './backups')
    {
    }

    public function id(): string
    {
        return 'local';
    }

    public function put(array $ctx, string $key, string $payload): void
    {
        if (!is_dir($this->root) && !mkdir($this->root, 0775, true) && !is_dir($this->root)) {
            throw new DriverException("Unable to create local backup dir: {$this->root}", 'local');
        }
        $target = $this->root . DIRECTORY_SEPARATOR . $key;
        if (file_put_contents($target, $payload) === false) {
            throw new DriverException("Unable to write artifact: {$target}", 'local');
        }
    }

    public function get(array $ctx, string $key): string
    {
        $target = $this->root . DIRECTORY_SEPARATOR . $key;
        if (!is_file($target)) {
            throw new DriverException("Artifact not found: {$key}", 'local');
        }
        $data = file_get_contents($target);
        if ($data === false) {
            throw new DriverException("Unable to read artifact: {$key}", 'local');
        }

        return $data;
    }

    public function list(array $ctx, string $prefix = ''): array
    {
        if (!is_dir($this->root)) {
            return [];
        }
        $out = [];
        foreach (scandir($this->root) ?: [] as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }
            if ($prefix !== '' && !str_starts_with($file, $prefix)) {
                continue;
            }
            $path = $this->root . DIRECTORY_SEPARATOR . $file;
            if (!is_file($path)) {
                continue;
            }
            $out[] = [
                'key' => $file,
                'bytes' => (int) filesize($path),
                'createdAt' => gmdate('c', (int) filemtime($path)),
            ];
        }
        usort($out, static fn (array $a, array $b): int => strcmp($b['createdAt'], $a['createdAt']));

        return $out;
    }

    public function delete(array $ctx, string $key): void
    {
        $target = $this->root . DIRECTORY_SEPARATOR . $key;
        if (is_file($target)) {
            unlink($target);
        }
    }

    public function exists(array $ctx, string $key): bool
    {
        return is_file($this->root . DIRECTORY_SEPARATOR . $key);
    }
}
