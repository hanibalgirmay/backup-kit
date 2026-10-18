<?php

declare(strict_types=1);

namespace BackupKit\Tests;

use BackupKit\BackupKit;
use BackupKit\Compression\Compressor;
use BackupKit\Config\Credentials;
use BackupKit\Config\DatabaseDiscovery;
use BackupKit\Config\Outputs;
use BackupKit\Engine\RetentionManager;
use BackupKit\Errors\ConfigException;
use PHPUnit\Framework\TestCase;
use function BackupKit\createBackupKit;
use function BackupKit\defineConfig;

final class BackupKitTest extends TestCase
{
    protected function tearDown(): void
    {
        foreach (['.tmp-php-backups', '.tmp-php-multi'] as $dir) {
            if (!is_dir($dir)) {
                continue;
            }
            foreach (scandir($dir) ?: [] as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }
                @unlink($dir . DIRECTORY_SEPARATOR . $file);
            }
            @rmdir($dir);
        }
    }

    public function testDefineConfigAutoDatabaseAndDefaults(): void
    {
        $_ENV['DATABASE_URL'] = 'mysql://user:pass@localhost/app';
        $_SERVER['DATABASE_URL'] = 'mysql://user:pass@localhost/app';

        $config = defineConfig([
            'schedule' => '0 2 * * *',
        ]);

        self::assertSame('gzip', $config['compression']);
        self::assertSame(7, $config['retention']['keepLast']);
        self::assertSame('mysql', $config['sources'][0]['driver']);
        self::assertSame(Outputs::DEFAULT_OUTPUT['path'], $config['outputs'][0]['path']);
        self::assertSame('0 2 * * *', $config['schedule']['cron']);
    }

    public function testDiscoverFromLaravelDatabaseConfig(): void
    {
        $sources = DatabaseDiscovery::discover([], [
            'default' => 'pgsql',
            'connections' => [
                'pgsql' => [
                    'driver' => 'pgsql',
                    'host' => '127.0.0.1',
                    'port' => 5432,
                    'database' => 'laravel',
                    'username' => 'forge',
                    'password' => 'secret',
                ],
            ],
        ]);

        self::assertSame('postgres', $sources[0]['driver']);
        self::assertSame('relational', $sources[0]['kind']);
    }

    public function testGzipRoundTrip(): void
    {
        $input = 'backup-kit compression fixture ' . str_repeat('x', 2000);
        $compressed = Compressor::compress($input, 'gzip');
        self::assertSame($input, Compressor::decompress($compressed, 'gzip'));
    }

    public function testRetentionKeepLast(): void
    {
        $mgr = new RetentionManager();
        $result = $mgr->selectDeletions([
            ['key' => 'a.bk', 'bytes' => 1, 'createdAt' => '2026-01-03T00:00:00+00:00'],
            ['key' => 'b.bk', 'bytes' => 1, 'createdAt' => '2026-01-02T00:00:00+00:00'],
            ['key' => 'c.bk', 'bytes' => 1, 'createdAt' => '2026-01-01T00:00:00+00:00'],
        ], ['keepLast' => 2]);

        self::assertSame(['a.bk', 'b.bk'], $result['kept']);
        self::assertSame(['c.bk'], $result['deleted']);
    }

    public function testSftpRequiresCredentials(): void
    {
        $connection = Credentials::resolveOutputConnection([
            'driver' => 'sftp',
            'host' => '1.2.3.4',
            'connection' => ['username' => 'root'],
        ], []);

        $this->expectException(ConfigException::class);
        Credentials::assertOutputConnection('sftp', $connection);
    }

    public function testLocalBackupAndList(): void
    {
        $dir = '.tmp-php-backups';
        $kit = createBackupKit([
            'name' => 'test',
            'sources' => [['driver' => 'sqlite']],
            'outputs' => [['driver' => 'local', 'path' => $dir]],
        ]);

        $result = $kit->backup();
        self::assertSame('gzip', $result['compression']);
        self::assertStringContainsString('test_', $result['artifact']['key']);

        $listed = $kit->list();
        $keys = array_column($listed['artifacts'], 'key');
        self::assertContains($result['artifact']['key'], $keys);
    }

    public function testRunScheduledPrunes(): void
    {
        $dir = '.tmp-php-multi';
        $kit = BackupKit::fromConfig([
            'name' => 'sched',
            'sources' => [['driver' => 'mysql']],
            'outputs' => [['name' => 'disk', 'driver' => 'local', 'path' => $dir]],
            'schedule' => ['cron' => '0 2 * * *', 'pruneAfterBackup' => true],
            'retention' => ['keepLast' => 50],
        ]);

        $result = $kit->runScheduled();
        self::assertArrayHasKey('artifact', $result);
    }
}
