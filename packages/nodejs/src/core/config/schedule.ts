import type { ResolvedSchedule, ScheduleConfig } from "../types/config.js";

export const DEFAULT_RETENTION = { keepLast: 7 } as const;

export function resolveSchedule(schedule?: ScheduleConfig): ResolvedSchedule | undefined {
  if (schedule === undefined) return undefined;
  if (typeof schedule === "string") {
    return {
      cron: schedule,
      enabled: true,
      pruneAfterBackup: true,
    };
  }
  return {
    cron: schedule.cron,
    timezone: schedule.timezone,
    enabled: schedule.enabled !== false,
    pruneAfterBackup: schedule.pruneAfterBackup !== false,
  };
}
