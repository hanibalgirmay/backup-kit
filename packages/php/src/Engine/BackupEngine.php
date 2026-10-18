<?php

declare(strict_types=1);

namespace BackupKit\Engine;

use BackupKit\Compression\Compressor;
use BackupKit\Drivers\OutputResolver;
use BackupKit\Events\EventBus;
use BackupKit\Registry\DriverRegistry;

final class BackupEngine
{
    private const KIT_VERSION = '0.1.0';

    public function __construct(
        private readonly array $config,
        private readonly DriverRegistry $registry,
        private readonly EventBus $events,
        private readonly OutputResolver $outputs,
    ) {
    }

    /** @return array<string, mixed> */
    public function run(): array
    {
        $runId = bin2hex(random_bytes(3));
        $started = (int) round(microtime(true) * 1000);
        $jobName = (string) ($this->config['name'] ?? 'backup');
        $compression = Compressor::resolve($this->config['compression'] ?? null);
        $env = $this->envMap();

        $this->events->emit([
            'event' => 'backup:start',
            'timestamp' => gmdate('c'),
            'runId' => $runId,
            'jobName' => $jobName,
        ]);

        try {
            $sourceFiles = [];
            foreach (array_values($this->config['sources']) as $index => $source) {
                $sourceName = (string) ($source['name'] ?? ($source['driver'] . '-' . $index));
                $this->events->emit([
                    'event' => 'backup:source:start',
                    'timestamp' => gmdate('c'),
                    'runId' => $runId,
                    'jobName' => $jobName,
                    'sourceName' => $sourceName,
                    'driver' => $source['driver'],
                ]);

                $db = $this->registry->getDatabase((string) $source['driver']);
                $payload = $db->dump([
                    'runId' => $runId,
                    'jobName' => $jobName,
                    'sourceName' => $sourceName,
                ], is_array($source['options'] ?? null) ? $source['options'] : null);

                $bytes = strlen($payload);
                $sourceFiles[] = [
                    'name' => $sourceName,
                    'driver' => (string) $source['driver'],
                    'bytes' => $bytes,
                    'payload' => $payload,
                    'checksum' => 'sha256:' . hash('sha256', $payload),
                ];

                $this->events->emit([
                    'event' => 'backup:source:complete',
                    'timestamp' => gmdate('c'),
                    'runId' => $runId,
                    'jobName' => $jobName,
                    'sourceName' => $sourceName,
                    'driver' => $source['driver'],
                    'bytes' => $bytes,
                ]);
            }

            $stamp = gmdate('Ymd\THis\Z');
            $key = "{$jobName}_{$stamp}_{$runId}.bk";

            $destinations = [];
            foreach ($this->config['outputs'] as $output) {
                $destinations[] = [
                    'name' => $output['name'] ?? null,
                    'driver' => $output['driver'],
                    'key' => $key,
                    'path' => $output['path'] ?? null,
                ];
            }

            $manifest = [
                'formatVersion' => 1,
                'createdAt' => gmdate('c'),
                'kitVersion' => self::KIT_VERSION,
                'jobName' => $jobName,
                'compression' => $compression,
                'encryption' => [
                    'algorithm' => $this->config['encryption']['algorithm'] ?? 'none',
                ],
                'sources' => array_map(static fn (array $s): array => [
                    'name' => $s['name'],
                    'driver' => $s['driver'],
                    'path' => 'payload/sources/' . $s['name'] . '/dump.bin',
                    'bytes' => $s['bytes'],
                    'checksum' => $s['checksum'],
                ], $sourceFiles),
                'destination' => $destinations[0],
                'destinations' => $destinations,
                'metadata' => $this->config['metadata'] ?? [],
            ];

            $rawPayload = json_encode([
                'manifest' => $manifest,
                'sources' => array_map(static fn (array $s): array => [
                    'name' => $s['name'],
                    'bytes' => base64_encode($s['payload']),
                ], $sourceFiles),
            ], JSON_THROW_ON_ERROR);

            $payload = Compressor::compress($rawPayload, $compression);
            $checksum = 'sha256:' . hash('sha256', $payload);
            $createdAt = $manifest['createdAt'];

            $artifacts = [];
            foreach ($this->config['outputs'] as $output) {
                $storage = $this->outputs->resolve($output, $env);
                $storage->put(['runId' => $runId, 'jobName' => $jobName], $key, $payload);
                $artifacts[] = [
                    'output' => $output['name'] ?? $output['driver'],
                    'driver' => $output['driver'],
                    'key' => $key,
                    'bytes' => strlen($payload),
                    'checksum' => $checksum,
                    'createdAt' => $createdAt,
                ];
            }

            $result = [
                'runId' => $runId,
                'jobName' => $jobName,
                'artifact' => [
                    'key' => $key,
                    'bytes' => strlen($payload),
                    'checksum' => $checksum,
                    'createdAt' => $createdAt,
                ],
                'artifacts' => $artifacts,
                'compression' => $compression,
                'durationMs' => ((int) round(microtime(true) * 1000)) - $started,
                'sources' => array_map(static fn (array $s): array => [
                    'name' => $s['name'],
                    'driver' => $s['driver'],
                    'bytes' => $s['bytes'],
                ], $sourceFiles),
            ];

            $this->events->emit([
                'event' => 'backup:complete',
                'timestamp' => gmdate('c'),
                'runId' => $runId,
                'jobName' => $jobName,
                'artifact' => $result['artifact'],
                'artifacts' => $artifacts,
                'compression' => $compression,
                'durationMs' => $result['durationMs'],
            ]);

            return $result;
        } catch (\Throwable $err) {
            $this->events->emit([
                'event' => 'backup:error',
                'timestamp' => gmdate('c'),
                'runId' => $runId,
                'jobName' => $jobName,
                'error' => [
                    'code' => 'BACKUP_FAILED',
                    'message' => $err->getMessage(),
                ],
            ]);
            throw $err;
        }
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
