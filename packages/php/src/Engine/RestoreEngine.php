<?php

declare(strict_types=1);

namespace BackupKit\Engine;

use BackupKit\Drivers\OutputResolver;
use BackupKit\Errors\BackupKitException;
use BackupKit\Events\EventBus;
use BackupKit\Registry\DriverRegistry;

final class RestoreEngine
{
    public function __construct(
        private readonly array $config,
        private readonly DriverRegistry $registry,
        private readonly EventBus $events,
        private readonly OutputResolver $outputs,
    ) {
    }

    /**
     * @param array{key: string, sources?: list<string>, output?: string} $options
     * @return array<string, mixed>
     */
    public function run(array $options): array
    {
        $runId = bin2hex(random_bytes(3));
        $jobName = (string) ($this->config['name'] ?? 'backup');
        $env = [];
        foreach ($_ENV as $k => $v) {
            if (is_scalar($v) || $v === null) {
                $env[(string) $k] = $v === null ? null : (string) $v;
            }
        }

        $output = $this->config['outputs'][0] ?? null;
        if (isset($options['output'])) {
            foreach ($this->config['outputs'] as $candidate) {
                if (($candidate['name'] ?? null) === $options['output'] || ($candidate['driver'] ?? null) === $options['output']) {
                    $output = $candidate;
                    break;
                }
            }
        }
        if ($output === null) {
            throw new BackupKitException('NO_OUTPUT', 'No storage outputs configured');
        }

        $this->events->emit([
            'event' => 'restore:start',
            'timestamp' => gmdate('c'),
            'runId' => $runId,
            'jobName' => $jobName,
            'key' => $options['key'],
            'output' => $output['name'] ?? null,
        ]);

        try {
            $storage = $this->outputs->resolve($output, $env);
            $payload = $storage->get(['runId' => $runId, 'jobName' => $jobName], $options['key']);
            unset($payload, $this->registry);

            throw new BackupKitException(
                'RESTORE_NOT_IMPLEMENTED',
                'RestoreEngine packaging/extract path is stubbed; wire decompress + restore next',
            );
        } catch (\Throwable $err) {
            $this->events->emit([
                'event' => 'restore:error',
                'timestamp' => gmdate('c'),
                'runId' => $runId,
                'jobName' => $jobName,
                'error' => [
                    'code' => 'RESTORE_FAILED',
                    'message' => $err->getMessage(),
                ],
            ]);
            throw $err;
        }
    }
}
