<?php

declare(strict_types=1);

namespace BackupKit\Compression;

use BackupKit\Errors\BackupKitException;

final class Compressor
{
    public const DEFAULT = 'gzip';

    public static function resolve(?string $algorithm): string
    {
        return $algorithm ?? self::DEFAULT;
    }

    public static function compress(string $data, ?string $algorithm = null): string
    {
        $resolved = self::resolve($algorithm);

        return match ($resolved) {
            'none' => $data,
            'gzip' => self::gzip($data),
            'zstd' => self::zstdCompress($data),
            default => throw new BackupKitException('COMPRESS_UNSUPPORTED', "Unknown compression: {$resolved}"),
        };
    }

    public static function decompress(string $data, ?string $algorithm = null): string
    {
        $resolved = self::resolve($algorithm);

        return match ($resolved) {
            'none' => $data,
            'gzip' => self::gunzip($data),
            'zstd' => self::zstdDecompress($data),
            default => throw new BackupKitException('COMPRESS_UNSUPPORTED', "Unknown compression: {$resolved}"),
        };
    }

    private static function gzip(string $data): string
    {
        $out = gzencode($data, 6);
        if ($out === false) {
            throw new BackupKitException('COMPRESS_FAILED', 'gzip compression failed');
        }

        return $out;
    }

    private static function gunzip(string $data): string
    {
        $out = gzdecode($data);
        if ($out === false) {
            throw new BackupKitException('COMPRESS_FAILED', 'gzip decompression failed');
        }

        return $out;
    }

    private static function zstdCompress(string $data): string
    {
        if (!function_exists('zstd_compress')) {
            throw new BackupKitException(
                'COMPRESS_UNSUPPORTED',
                'zstd compression requires the ext-zstd PHP extension',
            );
        }
        $out = zstd_compress($data);
        if ($out === false) {
            throw new BackupKitException('COMPRESS_FAILED', 'zstd compression failed');
        }

        return $out;
    }

    private static function zstdDecompress(string $data): string
    {
        if (!function_exists('zstd_uncompress')) {
            throw new BackupKitException(
                'COMPRESS_UNSUPPORTED',
                'zstd decompression requires the ext-zstd PHP extension',
            );
        }
        $out = zstd_uncompress($data);
        if ($out === false) {
            throw new BackupKitException('COMPRESS_FAILED', 'zstd decompression failed');
        }

        return $out;
    }
}
