export type BackupKitEventName =
  | "backup:start"
  | "backup:source:start"
  | "backup:source:complete"
  | "backup:source:error"
  | "backup:complete"
  | "backup:error"
  | "restore:start"
  | "restore:source:start"
  | "restore:source:complete"
  | "restore:complete"
  | "restore:error"
  | "prune:start"
  | "prune:complete"
  | "schedule:tick";

export interface EventBase {
  event: BackupKitEventName;
  timestamp: string;
  runId: string;
  jobName?: string;
}

export type BackupKitEvent = EventBase & Record<string, unknown>;

export type EventHandler = (event: BackupKitEvent) => void | Promise<void>;
