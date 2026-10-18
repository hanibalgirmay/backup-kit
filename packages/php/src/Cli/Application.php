<?php

declare(strict_types=1);

namespace BackupKit\Cli;

use BackupKit\BackupKit;
use BackupKit\Config\ConfigLoader;

final class Application
{
    /** @param list<string> $argv */
    public static function run(array $argv): int
    {
        $command = $argv[1] ?? 'help';
        $configPath = self::option($argv, '--config') ?? self::option($argv, '-c') ?? (getenv('BACKUP_KIT_CONFIG') ?: 'backup-kit.config.json');

        try {
            return match ($command) {
                'init' => self::init(),
                'backup' => self::printJson(self::kit($configPath)->backup()),
                'list' => self::printJson(self::kit($configPath)->list()),
                'prune' => self::printJson(self::kit($configPath)->prune()),
                'restore' => self::restore($argv, $configPath),
                'help', '--help', '-h' => self::help(),
                default => self::fail("Unknown command: {$command}"),
            };
        } catch (\Throwable $e) {
            fwrite(STDERR, $e->getMessage() . PHP_EOL);

            return 1;
        }
    }

    private static function kit(string $configPath): BackupKit
    {
        $config = (new ConfigLoader())->load($configPath);

        return BackupKit::fromConfig($config);
    }

    /** @param list<string> $argv */
    private static function restore(array $argv, string $configPath): int
    {
        $key = $argv[2] ?? null;
        if ($key === null || str_starts_with($key, '-')) {
            return self::fail('Usage: backup-kit restore <key>');
        }

        return self::printJson(self::kit($configPath)->restore(['key' => $key]));
    }

    private static function init(): int
    {
        $sample = [
            'version' => 1,
            'name' => 'app',
            'sources' => [
                [
                    'name' => 'primary',
                    'driver' => 'mysql',
                    'connection' => '${DATABASE_URL}',
                ],
            ],
            'outputs' => [
                [
                    'name' => 'local',
                    'driver' => 'local',
                    'path' => './backups',
                ],
            ],
            'retention' => ['keepLast' => 7],
            'compression' => 'gzip',
        ];
        $path = 'backup-kit.config.json';
        file_put_contents($path, json_encode($sample, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
        fwrite(STDOUT, "Wrote {$path}" . PHP_EOL);

        return 0;
    }

    private static function help(): int
    {
        fwrite(STDOUT, <<<TXT
backup-kit (PHP)

Commands:
  init                 Write sample backup-kit.config.json
  backup [-c config]   Run a backup
  list [-c config]     List artifacts
  prune [-c config]    Apply retention
  restore <key>        Restore (stub)

TXT);

        return 0;
    }

    /** @param array<string, mixed> $data */
    private static function printJson(array $data): int
    {
        fwrite(STDOUT, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);

        return 0;
    }

    private static function fail(string $message): int
    {
        fwrite(STDERR, $message . PHP_EOL);

        return 1;
    }

    /** @param list<string> $argv */
    private static function option(array $argv, string $name): ?string
    {
        foreach ($argv as $i => $arg) {
            if ($arg === $name) {
                return $argv[$i + 1] ?? null;
            }
            if (str_starts_with($arg, $name . '=')) {
                return substr($arg, strlen($name) + 1);
            }
        }

        return null;
    }
}
