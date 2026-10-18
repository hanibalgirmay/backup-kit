<?php

declare(strict_types=1);

namespace BackupKit\Errors;

final class DriverException extends BackupKitException
{
    public function __construct(
        string $message,
        public readonly ?string $driver = null,
        ?\Throwable $previous = null,
    ) {
        parent::__construct('DRIVER_ERROR', $message, $previous);
    }
}
