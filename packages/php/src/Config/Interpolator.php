<?php

declare(strict_types=1);

namespace BackupKit\Config;

final class Interpolator
{
    /** @param array<string, string|null> $env */
    public static function interpolate(string $value, array $env): string
    {
        return (string) preg_replace_callback(
            '/\$\{([^}:]+)(?::-([^}]*))?\}/',
            static function (array $m) use ($env): string {
                $name = $m[1];
                if (array_key_exists($name, $env) && $env[$name] !== null) {
                    return (string) $env[$name];
                }
                return $m[2] ?? '';
            },
            $value,
        );
    }

    /**
     * @param mixed $input
     * @param array<string, string|null> $env
     * @return mixed
     */
    public static function deep(mixed $input, array $env): mixed
    {
        if (is_string($input)) {
            return self::interpolate($input, $env);
        }
        if (is_array($input)) {
            $out = [];
            foreach ($input as $k => $v) {
                $out[$k] = self::deep($v, $env);
            }
            return $out;
        }
        return $input;
    }
}
