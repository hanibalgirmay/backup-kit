<?php

declare(strict_types=1);

namespace BackupKit\Config;

use BackupKit\Errors\ConfigException;

final class Outputs
{
    public const DEFAULT_OUTPUT = [
        'name' => 'local',
        'driver' => 'local',
        'path' => './backups',
    ];

    public static function normalizeDriver(string $driver): string
    {
        return match ($driver) {
            'ssh' => 'sftp',
            'gdrive', 'google-drive' => 'drive',
            default => $driver,
        };
    }

    /**
     * @param mixed $outputs
     * @param mixed $destination
     * @return list<array<string, mixed>>
     */
    public static function normalize(mixed $outputs = null, mixed $destination = null): array
    {
        $raw = $outputs ?? $destination;
        if ($raw === null) {
            return [self::DEFAULT_OUTPUT];
        }

        if (is_array($raw) && isset($raw['driver']) && !array_is_list($raw)) {
            $list = [$raw];
        } elseif (is_array($raw) && array_is_list($raw)) {
            $list = $raw;
        } else {
            throw new ConfigException('outputs must be an object or an array of objects');
        }

        if ($list === []) {
            return [self::DEFAULT_OUTPUT];
        }

        $normalized = [];
        foreach ($list as $index => $output) {
            if (!is_array($output) || empty($output['driver'])) {
                throw new ConfigException('Each output must be an object with a driver');
            }
            $driver = self::normalizeDriver((string) $output['driver']);
            $name = $output['name'] ?? ($driver === 'local' && count($list) === 1 ? 'local' : "{$driver}-{$index}");
            $path = array_key_exists('path', $output)
                ? $output['path']
                : ($driver === 'local' ? self::DEFAULT_OUTPUT['path'] : null);

            $normalized[] = array_merge($output, [
                'name' => $name,
                'driver' => $driver,
                'path' => $path,
            ]);
        }

        return $normalized;
    }
}
