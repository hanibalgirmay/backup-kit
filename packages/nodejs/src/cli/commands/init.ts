import { writeFile } from "node:fs/promises";

const sample = {
  version: 1,
  name: "app-db",
  framework: "auto",
  database: "auto",
  schedule: {
    cron: "0 2 * * *",
    timezone: "UTC",
    pruneAfterBackup: true,
  },
  retention: {
    keepLast: 7,
    keepDaily: 14,
  },
  outputs: [
    {
      name: "local",
      driver: "local",
      path: "./backups",
    },
  ],
  compression: "gzip",
};

export async function runInit(): Promise<void> {
  const path = "backup-kit.config.json";
  await writeFile(path, JSON.stringify(sample, null, 2) + "\n", "utf8");
  console.log(`Wrote ${path}`);
}
