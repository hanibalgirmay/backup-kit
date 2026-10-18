<?php

declare(strict_types=1);

namespace BackupKit;

use BackupKit\Config\ConfigLoader;
use BackupKit\Drivers\Database\StubDatabaseDriver;
use BackupKit\Drivers\OutputResolver;
use BackupKit\Drivers\Storage\LocalStorageDriver;
use BackupKit\Engine\BackupEngine;
use BackupKit\Engine\RestoreEngine;
use BackupKit\Engine\RetentionManager;
use BackupKit\Events\EventBus;
use BackupKit\Registry\DriverRegistry;

final class BackupKit
{
    private DriverRegistry $registry;
    private EventBus $events;
    private OutputResolver $outputs;
    private BackupEngine $backupEngine;
    private RestoreEngine $restoreEngine;
    private RetentionManager $retention;

    /** @param array<string, mixed> $config resolved config */
    private function __construct(private array $config)
    {
        $this->registry = new DriverRegistry();
        $this->events = new EventBus();
        $this->outputs = new OutputResolver($this->registry);
        $this->retention = new RetentionManager();
        $this->registerBuiltins();
        $this->backupEngine = new BackupEngine($this->config, $this->registry, $this->events, $this->outputs);
        $this->restoreEngine = new RestoreEngine($this->config, $this->registry, $this->events, $this->outputs);
    }

    /** @param array<string, mixed> $config */
    public static function fromConfig(array $config, ?array $laravelDatabase = null): self
    {
        return new self((new ConfigLoader())->fromArray($config, $laravelDatabase));
    }

    /** @return array<string, mixed> */
    public function config(): array
    {
        return $this->config;
    }

    /** @return array<string, mixed> */
    public function backup(): array
    {
        return $this->backupEngine->run();
    }

    /**
     * Scheduled run: backup then prune when schedule.pruneAfterBackup is true.
     *
     * @return array<string, mixed>
     */
    public function runScheduled(): array
    {
        $result = $this->backup();
        $schedule = is_array($this->config['schedule'] ?? null) ? $this->config['schedule'] : null;
        if (($schedule['pruneAfterBackup'] ?? true) !== false) {
            $this->prune();
        }

        return $result;
    }

    /**
     * @param array{key: string, sources?: list<string>, output?: string} $options
     * @return array<string, mixed>
     */
    public function restore(array $options): array
    {
        return $this->restoreEngine->run($options);
    }

    /** @return array{artifacts: list<array<string, mixed>>} */
    public function list(?string $output = null): array
    {
        $artifacts = [];
        foreach ($this->selectOutputs($output) as $out) {
            $storage = $this->outputs->resolve($out, $this->envMap());
            foreach ($storage->list(['runId' => 'list', 'jobName' => $this->config['name'] ?? null]) as $item) {
                $artifacts[] = array_merge($item, [
                    'output' => $out['name'] ?? $out['driver'],
                    'driver' => $out['driver'],
                    'checksum' => $item['checksum'] ?? '',
                ]);
            }
        }

        return ['artifacts' => $artifacts];
    }

    /** @return array{deleted: list<string>, kept: list<string>, byOutput: array<string, array{deleted: list<string>, kept: list<string>}>} */
    public function prune(?string $output = null): array
    {
        $this->events->emit([
            'event' => 'prune:start',
            'timestamp' => gmdate('c'),
            'runId' => 'prune',
            'jobName' => $this->config['name'] ?? null,
        ]);

        $deleted = [];
        $kept = [];
        $byOutput = [];
        $retention = is_array($this->config['retention'] ?? null) ? $this->config['retention'] : null;

        foreach ($this->selectOutputs($output) as $out) {
            $storage = $this->outputs->resolve($out, $this->envMap());
            $listed = $storage->list(['runId' => 'prune', 'jobName' => $this->config['name'] ?? null]);
            $result = $this->retention->selectDeletions($listed, $retention);
            foreach ($result['deleted'] as $key) {
                $storage->delete(['runId' => 'prune', 'jobName' => $this->config['name'] ?? null], $key);
            }
            $label = (string) ($out['name'] ?? $out['driver']);
            $byOutput[$label] = $result;
            foreach ($result['deleted'] as $key) {
                $deleted[] = "{$label}:{$key}";
            }
            foreach ($result['kept'] as $key) {
                $kept[] = "{$label}:{$key}";
            }
        }

        $this->events->emit([
            'event' => 'prune:complete',
            'timestamp' => gmdate('c'),
            'runId' => 'prune',
            'jobName' => $this->config['name'] ?? null,
            'deleted' => $deleted,
            'kept' => $kept,
            'byOutput' => $byOutput,
        ]);

        return compact('deleted', 'kept', 'byOutput');
    }

    /** @param callable(array<string, mixed>): void $handler */
    public function on(string $event, callable $handler): callable
    {
        return $this->events->on($event, $handler);
    }

    /** @return list<array<string, mixed>> */
    private function selectOutputs(?string $output): array
    {
        if ($output === null) {
            return $this->config['outputs'];
        }
        $matched = array_values(array_filter(
            $this->config['outputs'],
            static fn (array $o): bool => ($o['name'] ?? null) === $output || ($o['driver'] ?? null) === $output,
        ));
        if ($matched === []) {
            throw new Errors\ConfigException("Unknown output: {$output}");
        }

        return $matched;
    }

    private function registerBuiltins(): void
    {
        foreach (['postgres', 'mysql', 'mongodb', 'sqlite', 'redis'] as $id) {
            $this->registry->register(new StubDatabaseDriver($id, ucfirst($id)));
        }
        $local = null;
        foreach ($this->config['outputs'] as $out) {
            if (($out['driver'] ?? null) === 'local') {
                $local = $out;
                break;
            }
        }
        $this->registry->register(new LocalStorageDriver((string) ($local['path'] ?? './backups')));
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
