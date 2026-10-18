<?php

declare(strict_types=1);

namespace BackupKit\Config;

use BackupKit\Errors\ConfigException;

final class ConfigLoader
{
    public function __construct(private readonly ConfigValidator $validator = new ConfigValidator())
    {
    }

    /**
     * @param array<string, mixed> $config
     * @param array<string, mixed>|null $laravelDatabase
     * @return array<string, mixed>
     */
    public function fromArray(array $config, ?array $laravelDatabase = null): array
    {
        $env = $this->envMap();
        /** @var array<string, mixed> $interpolated */
        $interpolated = Interpolator::deep($config, $env);

        return $this->validator->validate($interpolated, $env, $laravelDatabase);
    }

    /** @return array<string, mixed> */
    public function load(string $path): array
    {
        if (!is_file($path)) {
            throw new ConfigException("Config file not found: {$path}");
        }

        if (str_ends_with($path, '.json')) {
            $raw = json_decode((string) file_get_contents($path), true);
            if (!is_array($raw)) {
                throw new ConfigException("Invalid JSON config: {$path}");
            }

            return $this->fromArray($raw);
        }

        if (str_ends_with($path, '.php')) {
            $raw = require $path;
            if (!is_array($raw)) {
                throw new ConfigException("PHP config must return an array: {$path}");
            }

            return $this->fromArray($raw);
        }

        throw new ConfigException("Unsupported config file: {$path}");
    }

    /** @return array<string, string|null> */
    private function envMap(): array
    {
        $env = [];
        foreach ($_ENV as $k => $v) {
            if (is_scalar($v) || $v === null) {
                $env[(string) $k] = $v === null ? null : (string) $v;
            }
        }
        foreach ($_SERVER as $k => $v) {
            if (is_string($k) && is_scalar($v)) {
                $env[$k] = (string) $v;
            }
        }

        return $env;
    }
}
