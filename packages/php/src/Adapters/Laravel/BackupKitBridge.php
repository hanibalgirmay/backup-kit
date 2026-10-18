<?php

declare(strict_types=1);

namespace BackupKit\Adapters\Laravel;

use BackupKit\BackupKit;

/**
 * Laravel integration — auto-reads config/database.php when database => auto.
 *
 * Wire in AppServiceProvider:
 *
 *   $this->app->singleton(BackupKit::class, fn () =>
 *       BackupKitBridge::make(config('backup-kit', []), config('database'))
 *   );
 *
 * Schedule in routes/console.php or Kernel:
 *
 *   Schedule::call(fn () => app(BackupKit::class)->runScheduled())
 *       ->cron(config('backup-kit.schedule.cron', '0 2 * * *'));
 */
final class BackupKitBridge
{
    /**
     * @param array<string, mixed> $config backup-kit config
     * @param array<string, mixed>|null $laravelDatabase config('database')
     */
    public static function make(array $config = [], ?array $laravelDatabase = null): BackupKit
    {
        if ($config === []) {
            $path = function_exists('storage_path') ? storage_path('app/backups') : './backups';
            $config = [
                'framework' => 'laravel',
                'database' => 'auto',
                'schedule' => [
                    'cron' => '0 2 * * *',
                    'pruneAfterBackup' => true,
                ],
                'retention' => [
                    'keepLast' => 7,
                    'keepDaily' => 14,
                ],
                'outputs' => [
                    ['driver' => 'local', 'path' => $path],
                ],
            ];
        }

        $config['framework'] = $config['framework'] ?? 'laravel';
        $config['database'] = $config['database'] ?? 'auto';

        return BackupKit::fromConfig($config, $laravelDatabase);
    }
}
