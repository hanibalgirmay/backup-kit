import { Command } from "commander";
import { createBackupKit } from "../index.js";
import { ConfigLoader } from "../core/config/ConfigLoader.js";
import { runBackup } from "./commands/backup.js";
import { runRestore } from "./commands/restore.js";
import { runList } from "./commands/list.js";
import { runPrune } from "./commands/prune.js";
import { runSchedule } from "./commands/schedule.js";
import { runInit } from "./commands/init.js";

async function loadKit(configPath?: string, autoStart = false) {
  const loader = new ConfigLoader();
  const path = configPath ?? process.env.BACKUP_KIT_CONFIG ?? "backup-kit.config.json";
  const config = await loader.load(path);
  return createBackupKit(config, { autoStart });
}

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program.name("backup-kit").description("Framework-first database backup CLI").version("1.0.0");

  program
    .command("init")
    .description("Write a sample backup-kit.config.json")
    .action(async () => {
      await runInit();
    });

  program
    .command("backup")
    .option("-c, --config <path>", "Config file path")
    .action(async (opts: { config?: string }) => {
      const kit = await loadKit(opts.config, false);
      await runBackup(kit);
    });

  program
    .command("restore")
    .argument("<key>", "Artifact key")
    .option("-c, --config <path>", "Config file path")
    .action(async (key: string, opts: { config?: string }) => {
      const kit = await loadKit(opts.config, false);
      await runRestore(kit, key);
    });

  program
    .command("list")
    .option("-c, --config <path>", "Config file path")
    .action(async (opts: { config?: string }) => {
      const kit = await loadKit(opts.config, false);
      await runList(kit);
    });

  program
    .command("prune")
    .option("-c, --config <path>", "Config file path")
    .action(async (opts: { config?: string }) => {
      const kit = await loadKit(opts.config, false);
      await runPrune(kit);
    });

  program
    .command("schedule")
    .description("Run cron/interval scheduler from config (keeps process alive)")
    .option("-c, --config <path>", "Config file path")
    .option("-i, --interval <ms>", "Override with interval milliseconds instead of cron")
    .action(async (opts: { config?: string; interval?: string }) => {
      const kit = await loadKit(opts.config, false);
      await runSchedule(kit, opts.interval ? Number(opts.interval) : undefined);
    });

  await program.parseAsync(argv);
}
