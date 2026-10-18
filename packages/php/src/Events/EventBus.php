<?php

declare(strict_types=1);

namespace BackupKit\Events;

final class EventBus
{
    /** @var array<string, list<callable(array<string, mixed>): void>> */
    private array $handlers = [];

    /** @param callable(array<string, mixed>): void $handler */
    public function on(string $event, callable $handler): callable
    {
        $this->handlers[$event] ??= [];
        $this->handlers[$event][] = $handler;

        return function () use ($event, $handler): void {
            $this->handlers[$event] = array_values(array_filter(
                $this->handlers[$event] ?? [],
                static fn (callable $h): bool => $h !== $handler,
            ));
        };
    }

    /** @param array<string, mixed> $event */
    public function emit(array $event): void
    {
        $name = (string) ($event['event'] ?? '*');
        foreach ([...($this->handlers[$name] ?? []), ...($this->handlers['*'] ?? [])] as $handler) {
            $handler($event);
        }
    }
}
