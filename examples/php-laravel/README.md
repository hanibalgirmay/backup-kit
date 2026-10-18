# PHP Laravel example

1. `composer require backup-kit/backup-kit`
2. Publish `config/backup-kit.php` (see [docs/frameworks/laravel.md](../../docs/frameworks/laravel.md))
3. Register `BackupKitBridge::make(config('backup-kit'), config('database'))`
4. Schedule: `Schedule::call(fn () => app(BackupKit::class)->runScheduled())->cron('0 2 * * *')`

Auto-discovers the default Laravel database connection. Add remote `outputs` as needed.
