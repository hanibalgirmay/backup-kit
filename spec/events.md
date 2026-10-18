# Events

Lifecycle events emitted by every language runtime. Payloads are JSON-serializable.

## Event names

| Event | When |
| --- | --- |
| `backup:start` | Backup run begins |
| `backup:source:start` | A source dump starts |
| `backup:source:complete` | A source dump finishes |
| `backup:source:error` | A source dump fails |
| `backup:complete` | Entire backup succeeds |
| `backup:error` | Backup fails |
| `restore:start` | Restore begins |
| `restore:source:start` | Restoring one source |
| `restore:source:complete` | Source restore done |
| `restore:complete` | Entire restore succeeds |
| `restore:error` | Restore fails |
| `prune:start` | Retention prune begins |
| `prune:complete` | Prune finished |
| `schedule:tick` | Scheduler fires a job |

## Common payload fields

```ts
interface EventBase {
  event: string;
  timestamp: string; // ISO-8601
  jobName?: string;
  runId: string;
}
```

### `backup:complete`

```json
{
  "event": "backup:complete",
  "timestamp": "2026-10-02T11:30:45.000Z",
  "runId": "a1b2c3",
  "jobName": "prod-db",
  "artifact": {
    "key": "prod-db_20261002T113045Z_a1b2c3.bk",
    "bytes": 1048576,
    "checksum": "sha256:..."
  },
  "durationMs": 4200
}
```

### Error events

```json
{
  "event": "backup:error",
  "timestamp": "2026-10-02T11:30:45.000Z",
  "runId": "a1b2c3",
  "jobName": "prod-db",
  "error": {
    "code": "DRIVER_DUMP_FAILED",
    "message": "pg_dump exited with code 1",
    "driver": "postgres"
  }
}
```

## Hooks

Config `hooks.*` arrays map to shell commands (or language-native callables) invoked around the matching events. Failures in `onError` MUST NOT mask the original error.
