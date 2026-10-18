<?php

declare(strict_types=1);

namespace BackupKit\Engine;

use BackupKit\Events\EventBus;

final class Scheduler
{
    private mixed $timer = null;

    public function __construct(private readonly EventBus $events)
    {
    }

    /** Simple interval scheduler for CLI long-running processes. */
    public function start(int $intervalMs, callable $handler, ?string $jobName = null): void
    {
        $this->stop();
        // PHP has no native setInterval; run a blocking loop when invoked from CLI schedule command.
        $this->timer = true;
        while ($this->timer) {
            $this->events->emit([
                'event' => 'schedule:tick',
                'timestamp' => gmdate('c'),
                'runId' => 'schedule',
                'jobName' => $jobName,
            ]);
            try {
                $handler();
            } catch (\Throwable) {
                // logged by caller / events
            }
            usleep($intervalMs * 1000);
        }
    }

    public function stop(): void
    {
        $this->timer = null;
    }
}
