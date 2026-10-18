<?php

declare(strict_types=1);

namespace BackupKit\Config;

use BackupKit\Errors\ConfigException;

final class Credentials
{
    /**
     * @param mixed $input string|{env}|{file}|{value}
     * @param array<string, string|null> $env
     */
    public static function resolveSecret(mixed $input, array $env, string $label = 'secret'): ?string
    {
        if ($input === null) {
            return null;
        }
        if (is_string($input)) {
            return Interpolator::interpolate($input, $env);
        }
        if (!is_array($input)) {
            return (string) $input;
        }

        if (isset($input['env'])) {
            $name = (string) $input['env'];
            if (array_key_exists($name, $env) && $env[$name] !== null && $env[$name] !== '') {
                return (string) $env[$name];
            }
            if (array_key_exists('fallback', $input)) {
                return (string) $input['fallback'];
            }
            throw new ConfigException("Missing environment variable for {$label}: {$name}");
        }

        if (isset($input['file'])) {
            $path = Interpolator::interpolate((string) $input['file'], $env);
            $contents = @file_get_contents($path);
            if ($contents === false) {
                throw new ConfigException("Unable to read {$label} file: {$path}");
            }

            return $contents;
        }

        if (isset($input['value'])) {
            return (string) $input['value'];
        }

        return null;
    }

    /**
     * @param array<string, mixed> $output
     * @param array<string, string|null> $env
     * @return array<string, mixed>
     */
    public static function resolveOutputConnection(array $output, array $env): array
    {
        $driver = Outputs::normalizeDriver((string) $output['driver']);
        $connection = is_array($output['connection'] ?? null) ? $output['connection'] : [];
        $options = is_array($output['options'] ?? null) ? $output['options'] : [];

        $credentials = [];
        if (is_array($connection['credentials'] ?? null)) {
            $credentials = array_merge($credentials, $connection['credentials']);
        }
        if (is_array($output['credentials'] ?? null)) {
            $credentials = array_merge($credentials, $output['credentials']);
        }
        if (is_array($options['credentials'] ?? null)) {
            $credentials = array_merge($credentials, $options['credentials']);
        }

        $merged = array_merge($options, $connection);
        unset($merged['credentials']);

        foreach (['path', 'host', 'port', 'endpoint'] as $field) {
            if (array_key_exists($field, $output)) {
                $merged[$field] = $output[$field];
            }
        }

        $resolved = [];
        foreach ($merged as $key => $value) {
            $resolved[$key] = is_string($value) ? Interpolator::interpolate($value, $env) : $value;
        }

        if (isset($resolved['port']) && is_string($resolved['port']) && is_numeric($resolved['port'])) {
            $resolved['port'] = (int) $resolved['port'];
        }

        if ($driver === 'local' && empty($resolved['path'])) {
            $resolved['path'] = './backups';
        }
        if ($driver === 'sftp' && !isset($resolved['port'])) {
            $resolved['port'] = 22;
        }

        $username = $credentials['username'] ?? $resolved['username'] ?? null;
        if ($username !== null) {
            $resolved['username'] = Interpolator::interpolate((string) $username, $env);
        }

        foreach ([
            'password',
            'privateKey',
            'passphrase',
            'accessKeyId',
            'secretAccessKey',
            'sessionToken',
            'token',
            'keyFile',
            'connectionString',
        ] as $key) {
            $raw = $credentials[$key] ?? $resolved[$key] ?? null;
            $resolved[$key] = self::resolveSecret($raw, $env, $key);
        }

        if (($credentials['useDefault'] ?? false) === true || ($resolved['useDefault'] ?? false) === true) {
            $resolved['useDefaultCredentials'] = true;
        }
        if (($credentials['agent'] ?? false) === true || ($resolved['agent'] ?? false) === true) {
            $resolved['agent'] = true;
        }

        if (empty($resolved['endpoint']) && isset($resolved['url'])) {
            $resolved['endpoint'] = $resolved['url'];
        }
        if (empty($resolved['remotePath']) && isset($resolved['path']) && $driver !== 'local') {
            $resolved['remotePath'] = $resolved['path'];
        }
        if (
            empty($resolved['prefix'])
            && isset($resolved['remotePath'])
            && in_array($driver, ['s3', 'gcs', 'azure'], true)
        ) {
            $resolved['prefix'] = $resolved['remotePath'];
        }

        return $resolved;
    }

    /** @param array<string, mixed> $connection */
    public static function assertOutputConnection(string $driver, array $connection): void
    {
        $id = Outputs::normalizeDriver($driver);
        $hasAuth = (bool) (
            ($connection['useDefaultCredentials'] ?? false)
            || ($connection['agent'] ?? false)
            || ($connection['password'] ?? null)
            || ($connection['privateKey'] ?? null)
            || ($connection['accessKeyId'] ?? null)
            || ($connection['secretAccessKey'] ?? null)
            || ($connection['token'] ?? null)
            || ($connection['keyFile'] ?? null)
            || ($connection['connectionString'] ?? null)
        );

        switch ($id) {
            case 'local':
                return;
            case 's3':
                self::requireField($connection, 'bucket', 'S3');
                if (!$hasAuth) {
                    throw new ConfigException(
                        'S3 output requires credentials (keys, connectionString, keyFile, or useDefault)',
                    );
                }
                return;
            case 'gcs':
                self::requireField($connection, 'bucket', 'GCS');
                if (!$hasAuth) {
                    throw new ConfigException('GCS output requires credentials (keyFile, token, or useDefault)');
                }
                return;
            case 'azure':
                if (empty($connection['container']) && empty($connection['connectionString'])) {
                    throw new ConfigException('Azure output requires container (and account) or connectionString');
                }
                return;
            case 'sftp':
                self::requireField($connection, 'host', 'SFTP/SSH');
                self::requireField($connection, 'username', 'SFTP/SSH');
                if (!$hasAuth) {
                    throw new ConfigException(
                        'SFTP/SSH output requires password, privateKey, or agent/useDefault',
                    );
                }
                return;
            case 'webdav':
                if (empty($connection['endpoint']) && empty($connection['url']) && empty($connection['host'])) {
                    throw new ConfigException('WebDAV output requires endpoint/url or host');
                }
                return;
            case 'drive':
                if (!$hasAuth) {
                    throw new ConfigException('Drive output requires credentials (keyFile, token, or OAuth secrets)');
                }
                return;
        }
    }

    /** @param array<string, mixed> $connection */
    private static function requireField(array $connection, string $field, string $label): void
    {
        if (empty($connection[$field])) {
            throw new ConfigException("{$label} output requires {$field}");
        }
    }
}
