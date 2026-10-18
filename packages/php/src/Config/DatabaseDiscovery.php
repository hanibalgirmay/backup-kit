<?php

declare(strict_types=1);

namespace BackupKit\Config;

use BackupKit\Errors\ConfigException;

/**
 * Discover DB sources from env and optional Laravel-style database config array.
 *
 * @param array<string, string|null> $env
 * @param array<string, mixed>|null $laravelDatabase config('database') shape
 * @return list<array<string, mixed>>
 */
final class DatabaseDiscovery
{
    public static function discover(array $env = [], ?array $laravelDatabase = null): array
    {
        $sources = [];

        foreach ([
            ['DATABASE_URL', 'primary'],
            ['DB_URL', 'primary'],
            ['MONGODB_URI', 'mongodb'],
            ['MONGO_URL', 'mongodb'],
            ['REDIS_URL', 'redis'],
        ] as [$key, $name]) {
            $value = $env[$key] ?? null;
            if (!$value) {
                continue;
            }
            $driver = self::driverFromUrl($value);
            if ($driver === null) {
                continue;
            }
            $sources[] = [
                'name' => $name,
                'driver' => $driver,
                'kind' => self::kind($driver),
                'connection' => $value,
            ];
        }

        if ($sources === [] && $laravelDatabase !== null) {
            $default = (string) ($laravelDatabase['default'] ?? 'mysql');
            $connections = is_array($laravelDatabase['connections'] ?? null)
                ? $laravelDatabase['connections']
                : [];
            $conn = is_array($connections[$default] ?? null) ? $connections[$default] : null;
            if ($conn !== null) {
                $driver = self::normalizeDriver((string) ($conn['driver'] ?? $default));
                if (!empty($conn['url'])) {
                    $sources[] = [
                        'name' => 'primary',
                        'driver' => self::driverFromUrl((string) $conn['url']) ?? $driver,
                        'kind' => self::kind($driver),
                        'connection' => $conn['url'],
                    ];
                } else {
                    $sources[] = [
                        'name' => 'primary',
                        'driver' => $driver,
                        'kind' => self::kind($driver),
                        'connection' => [
                            'host' => $conn['host'] ?? '127.0.0.1',
                            'port' => isset($conn['port']) ? (int) $conn['port'] : null,
                            'database' => $conn['database'] ?? null,
                            'username' => $conn['username'] ?? null,
                            'password' => $conn['password'] ?? null,
                        ],
                    ];
                }
            }
        }

        if ($sources === [] && (($env['DB_HOST'] ?? null) || ($env['DB_DATABASE'] ?? null))) {
            $driver = self::normalizeDriver((string) ($env['DB_CONNECTION'] ?? 'mysql'));
            $sources[] = [
                'name' => 'primary',
                'driver' => $driver,
                'kind' => self::kind($driver),
                'connection' => [
                    'host' => $env['DB_HOST'] ?? '127.0.0.1',
                    'port' => isset($env['DB_PORT']) ? (int) $env['DB_PORT'] : null,
                    'database' => $env['DB_DATABASE'] ?? null,
                    'username' => $env['DB_USERNAME'] ?? null,
                    'password' => $env['DB_PASSWORD'] ?? null,
                ],
            ];
        }

        if ($sources === []) {
            throw new ConfigException(
                'database: "auto" could not discover a database. Set DATABASE_URL or configure Laravel database.php / DB_* env vars.',
            );
        }

        return $sources;
    }

    public static function normalizeDriver(string $driver): string
    {
        return match (strtolower($driver)) {
            'pgsql', 'postgresql', 'pg' => 'postgres',
            'mariadb' => 'mysql',
            'mongo' => 'mongodb',
            default => strtolower($driver),
        };
    }

    public static function kind(string $driver): string
    {
        return match (self::normalizeDriver($driver)) {
            'mongodb' => 'document',
            'redis' => 'keyvalue',
            default => 'relational',
        };
    }

    private static function driverFromUrl(string $url): ?string
    {
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (str_starts_with($scheme, 'postgres')) {
            return 'postgres';
        }
        if (str_starts_with($scheme, 'mysql') || $scheme === 'mariadb') {
            return 'mysql';
        }
        if (str_starts_with($scheme, 'sqlite')) {
            return 'sqlite';
        }
        if (str_starts_with($scheme, 'mongodb') || $scheme === 'mongo') {
            return 'mongodb';
        }
        if (str_starts_with($scheme, 'redis')) {
            return 'redis';
        }

        return null;
    }
}
