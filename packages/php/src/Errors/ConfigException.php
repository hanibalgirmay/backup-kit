<?php

declare(strict_types=1);

namespace BackupKit\Errors;

final class ConfigException extends BackupKitException
{
    public function __construct(string $message, ?\Throwable $previous = null)
    {
        parent::__construct('CONFIG_INVALID', $message, $previous);
    }
}
