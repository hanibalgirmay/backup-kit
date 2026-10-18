<?php

declare(strict_types=1);

namespace BackupKit\Config;

use BackupKit\Compression\Compressor;
use BackupKit\Errors\ConfigException;

final class ConfigValidator
{
    /**
     * @param array<string, mixed> $input
     * @param array<string, string|null> $env
     * @param array<string, mixed>|null $laravelDatabase
     * @return array<string, mixed>
     */
    public function validate(array $input, array $env = [], ?array $laravelDatabase = null): array
    {
        $compression = $input['compression'] ?? Compressor::DEFAULT;
        if (!in_array($compression, ['none', 'gzip', 'zstd'], true)) {
            throw new ConfigException("Unsupported compression: {$compression}");
        }

        $sources = $input['sources'] ?? null;
        $database = $input['database'] ?? (empty($sources) ? 'auto' : null);

        if (is_array($sources) && $sources !== []) {
            $resolvedSources = array_values($sources);
        } elseif ($database === 'auto' || $database === null) {
            $resolvedSources = DatabaseDiscovery::discover($env, $laravelDatabase);
        } elseif (is_array($database)) {
            $resolvedSources = array_is_list($database) ? $database : [$database];
        } else {
            throw new ConfigException('Invalid database config');
        }

        if ($resolvedSources === []) {
            throw new ConfigException('Config requires at least one database source');
        }

        $outputs = Outputs::normalize($input['outputs'] ?? null, $input['destination'] ?? null);
        $retention = is_array($input['retention'] ?? null)
            ? $input['retention']
            : ['keepLast' => 7];

        $schedule = null;
        if (isset($input['schedule'])) {
            if (is_string($input['schedule'])) {
                $schedule = [
                    'cron' => $input['schedule'],
                    'enabled' => true,
                    'pruneAfterBackup' => true,
                ];
            } elseif (is_array($input['schedule']) && isset($input['schedule']['cron'])) {
                $schedule = [
                    'cron' => (string) $input['schedule']['cron'],
                    'timezone' => $input['schedule']['timezone'] ?? null,
                    'enabled' => ($input['schedule']['enabled'] ?? true) !== false,
                    'pruneAfterBackup' => ($input['schedule']['pruneAfterBackup'] ?? true) !== false,
                ];
            }
        }

        return array_merge($input, [
            'version' => $input['version'] ?? 1,
            'framework' => $input['framework'] ?? 'auto',
            'database' => $database ?? 'auto',
            'compression' => $compression,
            'sources' => $resolvedSources,
            'outputs' => $outputs,
            'destination' => $outputs[0],
            'retention' => $retention,
            'schedule' => $schedule,
        ]);
    }
}
