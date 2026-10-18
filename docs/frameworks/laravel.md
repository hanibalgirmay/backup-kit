# Laravel (PHP)

Package: `backup-kit/backup-kit`

```bash
composer require backup-kit/backup-kit
```

## Config

`config/backup-kit.php`:

```php
<?php

return [
    'framework' => 'laravel',
    'database' => 'auto', // uses config('database') + env
    'schedule' => [
        'cron' => '0 2 * * *',
        'pruneAfterBackup' => true,
    ],
    'retention' => [
        'keepLast' => 7,
        'keepDaily' => 14,
    ],
    'outputs' => [
        [
            'driver' => 'local',
            'path' => storage_path('app/backups'),
        ],
        // Remote example:
        // [
        //   'driver' => 'ssh',
        //   'host' => env('BACKUP_SSH_HOST'),
        //   'port' => 22,
        //   'connection' => ['username' => 'backup', 'remotePath' => '/backups'],
        //   'credentials' => ['privateKey' => ['file' => env('BACKUP_SSH_KEY')]],
        // ],
    ],
    'compression' => 'gzip',
];
```

## Register

```php
use BackupKit\Adapters\Laravel\BackupKitBridge;
use BackupKit\BackupKit;

public function register(): void
{
    $this->app->singleton(BackupKit::class, fn () =>
        BackupKitBridge::make(config('backup-kit', []), config('database'))
    );
}
```

## Cron (Laravel scheduler)

`routes/console.php` or `app/Console/Kernel.php`:

```php
use BackupKit\BackupKit;
use Illuminate\Support\Facades\Schedule;

Schedule::call(fn () => app(BackupKit::class)->runScheduled())
    ->cron(config('backup-kit.schedule.cron', '0 2 * * *'))
    ->name('backup-kit')
    ->withoutOverlapping();
```

Ensure system crontab runs `php artisan schedule:run` every minute.

## Manual

```php
app(BackupKit::class)->backup();
app(BackupKit::class)->list();
app(BackupKit::class)->prune();
```

Supports MySQL/Postgres/SQLite from Laravel `database.php`, plus Mongo/Redis via URL env vars.
