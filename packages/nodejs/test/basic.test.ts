import { describe, it, expect, afterEach } from "vitest";
import {
  createBackupKit,
  defineConfig,
  DEFAULT_OUTPUT,
  DEFAULT_RETENTION,
  compressBuffer,
  decompressBuffer,
  discoverDatabaseSources,
  resolveOutputConnection,
  assertOutputConnection,
  ConfigError,
} from "../src/index.js";
import { RetentionManager } from "../src/core/engine/RetentionManager.js";
import { rm } from "node:fs/promises";

afterEach(async () => {
  for (const dir of ["./.tmp-backups-test", "./.tmp-backups-multi"]) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("defineConfig (framework-first)", () => {
  it("defaults retention and discovers database from DATABASE_URL", () => {
    process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/app";
    const config = defineConfig({
      schedule: "0 2 * * *",
    });
    expect(config.compression).toBe("gzip");
    expect(config.retention).toEqual(DEFAULT_RETENTION);
    expect(config.sources[0]?.driver).toBe("postgres");
    expect(config.outputs[0]?.driver).toBe("local");
    expect(config.outputs[0]?.path).toBe(DEFAULT_OUTPUT.path);
    expect(config.schedule?.cron).toBe("0 2 * * *");
    expect(config.schedule?.pruneAfterBackup).toBe(true);
  });

  it("accepts explicit multi-db (relational + document)", () => {
    const config = defineConfig({
      database: [
        { name: "sql", driver: "mysql", connection: "mysql://localhost/app" },
        { name: "docs", driver: "mongodb", connection: "mongodb://localhost/app" },
      ],
      retention: { keepLast: 3 },
    });
    expect(config.sources.map((s) => s.driver)).toEqual(["mysql", "mongodb"]);
    expect(config.sources[0]?.kind).toBe("relational");
    expect(config.sources[1]?.kind).toBe("document");
  });
});

describe("discoverDatabaseSources", () => {
  it("reads MONGODB_URI", () => {
    const sources = discoverDatabaseSources({ MONGODB_URI: "mongodb://localhost/db" } as NodeJS.ProcessEnv);
    expect(sources[0]?.driver).toBe("mongodb");
  });
});

describe("remote connection resolution", () => {
  it("merges host/port and resolves env credentials for sftp", async () => {
    process.env.BK_TEST_SSH_PASS = "s3cret";
    const connection = await resolveOutputConnection({
      driver: "ssh",
      host: "backup.example.com",
      port: 2222,
      connection: { username: "deploy", remotePath: "/var/backups" },
      credentials: { password: { env: "BK_TEST_SSH_PASS" } },
    });
    expect(connection.port).toBe(2222);
    expect(connection.password).toBe("s3cret");
    assertOutputConnection("ssh", connection);
  });

  it("rejects sftp without credentials", async () => {
    const connection = await resolveOutputConnection({
      driver: "sftp",
      host: "1.2.3.4",
      connection: { username: "root" },
    });
    expect(() => assertOutputConnection("sftp", connection)).toThrow(ConfigError);
  });
});

describe("compression", () => {
  it("round-trips gzip and zstd", async () => {
    const input = Buffer.from("backup-kit compression fixture " + "x".repeat(2000));
    for (const algorithm of ["gzip", "zstd"] as const) {
      const compressed = await compressBuffer(input, algorithm);
      const roundTrip = await decompressBuffer(compressed, algorithm);
      expect(roundTrip.equals(input)).toBe(true);
    }
  });
});

describe("RetentionManager", () => {
  it("keeps last N", () => {
    const mgr = new RetentionManager();
    const result = mgr.selectDeletions(
      [
        { key: "a.bk", bytes: 1, createdAt: "2026-01-03T00:00:00.000Z" },
        { key: "b.bk", bytes: 1, createdAt: "2026-01-02T00:00:00.000Z" },
        { key: "c.bk", bytes: 1, createdAt: "2026-01-01T00:00:00.000Z" },
      ],
      { keepLast: 2 },
    );
    expect(result.kept).toEqual(["a.bk", "b.bk"]);
    expect(result.deleted).toEqual(["c.bk"]);
  });
});

describe("createBackupKit", () => {
  it("backs up with auto DB + local output without auto-starting cron", async () => {
    process.env.DATABASE_URL = "sqlite://./data.db";
    const dir = "./.tmp-backups-test";
    const kit = createBackupKit(
      {
        name: "test",
        database: "auto",
        outputs: [{ driver: "local", path: dir }],
        schedule: "0 2 * * *",
      },
      { autoStart: false },
    );
    expect(kit.config.sources[0]?.driver).toBe("sqlite");
    const result = await kit.backup();
    expect(result.compression).toBe("gzip");
    expect(result.artifact.key).toContain("test_");
    const listed = await kit.list();
    expect(listed.artifacts.some((a) => a.key === result.artifact.key)).toBe(true);
  });

  it("writes to multiple outputs", async () => {
    const dir = "./.tmp-backups-multi";
    const kit = createBackupKit(
      {
        name: "multi",
        sources: [{ driver: "sqlite", connection: { path: ":memory:" } }],
        outputs: [
          { name: "disk", driver: "local", path: dir },
          {
            name: "cloud",
            driver: "drive",
            connection: { folderId: "folder-1" },
            credentials: { token: { value: "test-token" } },
          },
        ],
        compression: "zstd",
      },
      { autoStart: false },
    );
    const result = await kit.backup();
    expect(result.artifacts).toHaveLength(2);
  });
});
