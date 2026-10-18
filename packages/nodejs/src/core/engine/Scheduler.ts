import { Cron } from "croner";
import type { EventBus } from "../events/EventBus.js";
import type { ResolvedSchedule } from "../types/config.js";
import { createLogger, type Logger } from "../utils/logger.js";

export type ScheduleHandler = () => Promise<void> | void;

export class Scheduler {
  private cronJob?: Cron;
  private intervalTimer?: NodeJS.Timeout;
  private readonly log: Logger;

  constructor(
    private readonly events: EventBus,
    logger?: Logger,
  ) {
    this.log = logger ?? createLogger();
  }

  /** Interval-based (tests / simple loops). */
  startInterval(intervalMs: number, handler: ScheduleHandler, jobName?: string): void {
    this.stop();
    this.intervalTimer = setInterval(() => {
      void this.tick(handler, jobName);
    }, intervalMs);
    this.intervalTimer.unref?.();
  }

  /** Cron-based automatic backups. */
  startCron(schedule: ResolvedSchedule, handler: ScheduleHandler, jobName?: string): void {
    this.stop();
    if (!schedule.enabled) {
      this.log.info("schedule disabled", { cron: schedule.cron });
      return;
    }

    this.cronJob = new Cron(
      schedule.cron,
      {
        timezone: schedule.timezone,
        protect: true,
      },
      () => {
        void this.tick(handler, jobName);
      },
    );

    this.log.info("cron schedule started", {
      cron: schedule.cron,
      timezone: schedule.timezone,
      next: this.cronJob.nextRun()?.toISOString(),
    });
  }

  stop(): void {
    this.cronJob?.stop();
    this.cronJob = undefined;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = undefined;
    }
  }

  private async tick(handler: ScheduleHandler, jobName?: string): Promise<void> {
    await this.events.emit({
      event: "schedule:tick",
      timestamp: new Date().toISOString(),
      runId: "schedule",
      jobName,
    });
    try {
      await handler();
    } catch (err) {
      this.log.error("scheduled job failed", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
