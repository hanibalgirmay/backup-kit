import type { BackupKit } from "../../index.js";

export async function runSchedule(kit: BackupKit, intervalMs?: number): Promise<void> {
  if (intervalMs !== undefined) {
    console.log(`Scheduling backup every ${intervalMs}ms (Ctrl+C to stop)`);
    kit.start(intervalMs);
  } else if (kit.config.schedule) {
    console.log(
      `Cron schedule active: ${kit.config.schedule.cron}` +
        (kit.config.schedule.timezone ? ` (${kit.config.schedule.timezone})` : "") +
        " — Ctrl+C to stop",
    );
    // createBackupKit already auto-starts cron; ensure started
    kit.start();
  } else {
    console.log("No schedule in config — starting hourly interval");
    kit.start(60 * 60 * 1000);
  }

  await new Promise(() => {
    /* keep process alive */
  });
}
