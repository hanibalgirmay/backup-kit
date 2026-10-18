<?php

declare(strict_types=1);

namespace BackupKit\Errors;

final class ArtifactException extends BackupKitException
{
    public function __construct(string $message, ?\Throwable $previous = null)
    {
        parent::__construct('ARTIFACT_ERROR', $message, $previous);
    }
}
