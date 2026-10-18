import type { SourceConfig } from "../types/config.js";
import { ConfigError } from "../errors/index.js";

const RELATIONAL = new Set(["postgres", "postgresql", "mysql", "mariadb", "sqlite"]);
const DOCUMENT = new Set(["mongodb", "mongo"]);
const KEYVALUE = new Set(["redis"]);

export function inferDriverKind(driver: string): "relational" | "document" | "keyvalue" {
  const id = driver.toLowerCase();
  if (RELATIONAL.has(id) || id === "postgresql") return "relational";
  if (DOCUMENT.has(id)) return "document";
  if (KEYVALUE.has(id)) return "keyvalue";
  return "relational";
}

function normalizeDriverId(driver: string): string {
  switch (driver.toLowerCase()) {
    case "postgresql":
    case "pg":
      return "postgres";
    case "mariadb":
      return "mysql";
    case "mongo":
      return "mongodb";
    default:
      return driver.toLowerCase();
  }
}

function driverFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (lower.startsWith("postgres")) return "postgres";
  if (lower.startsWith("mysql") || lower.startsWith("mariadb")) return "mysql";
  if (lower.startsWith("sqlite")) return "sqlite";
  if (lower.startsWith("mongodb") || lower.startsWith("mongo")) return "mongodb";
  if (lower.startsWith("redis")) return "redis";
  try {
    const u = new URL(url);
    const proto = u.protocol.replace(":", "").toLowerCase();
    if (proto.startsWith("postgres")) return "postgres";
    if (proto.startsWith("mysql") || proto === "mariadb") return "mysql";
    if (proto.startsWith("sqlite")) return "sqlite";
    if (proto.startsWith("mongodb") || proto === "mongo") return "mongodb";
    if (proto.startsWith("redis")) return "redis";
    return null;
  } catch {
    return null;
  }
}

/**
 * Discover database sources from environment / common framework variables.
 * Order: explicit URL envs → SQLite file → Mongo → Redis.
 */
export function discoverDatabaseSources(env: NodeJS.ProcessEnv = process.env): SourceConfig[] {
  const sources: SourceConfig[] = [];

  const urlCandidates: Array<{ env: string; name: string }> = [
    { env: "DATABASE_URL", name: "primary" },
    { env: "DB_URL", name: "primary" },
    { env: "TYPEORM_URL", name: "typeorm" },
    { env: "PRISMA_DATABASE_URL", name: "prisma" },
    { env: "MONGODB_URI", name: "mongodb" },
    { env: "MONGO_URL", name: "mongodb" },
    { env: "REDIS_URL", name: "redis" },
  ];

  const seen = new Set<string>();

  for (const candidate of urlCandidates) {
    const value = env[candidate.env];
    if (!value) continue;
    const driver = driverFromUrl(value);
    if (!driver) continue;
    const key = `${driver}:${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      name: candidate.name,
      driver: normalizeDriverId(driver),
      kind: inferDriverKind(driver),
      connection: value,
    });
  }

  // Discrete DB_* vars (Laravel / classic Node)
  if (sources.length === 0 && (env.DB_HOST || env.DB_DATABASE)) {
    const driver = normalizeDriverId(env.DB_CONNECTION || env.DB_DRIVER || "mysql");
    sources.push({
      name: "primary",
      driver,
      kind: inferDriverKind(driver),
      connection: {
        host: env.DB_HOST ?? "127.0.0.1",
        port: env.DB_PORT ? Number(env.DB_PORT) : undefined,
        database: env.DB_DATABASE ?? env.DB_NAME,
        username: env.DB_USERNAME ?? env.DB_USER,
        password: env.DB_PASSWORD,
      },
    });
  }

  if (sources.length === 0 && env.SQLITE_PATH) {
    sources.push({
      name: "sqlite",
      driver: "sqlite",
      kind: "relational",
      connection: { path: env.SQLITE_PATH },
    });
  }

  if (sources.length === 0) {
    throw new ConfigError(
      'database: "auto" could not discover a database. Set DATABASE_URL (or MONGODB_URI / REDIS_URL / DB_*), or pass explicit sources.',
    );
  }

  return sources;
}

export function resolveSources(input: {
  database?: "auto" | SourceConfig | SourceConfig[];
  sources?: SourceConfig[];
  env?: NodeJS.ProcessEnv;
}): SourceConfig[] {
  if (input.sources?.length) {
    return input.sources.map((s) => ({
      ...s,
      driver: normalizeDriverId(s.driver),
      kind: s.kind ?? inferDriverKind(s.driver),
    }));
  }

  const db = input.database ?? "auto";
  if (db === "auto") {
    return discoverDatabaseSources(input.env ?? process.env);
  }
  const list = Array.isArray(db) ? db : [db];
  return list.map((s) => ({
    ...s,
    driver: normalizeDriverId(s.driver),
    kind: s.kind ?? inferDriverKind(s.driver),
  }));
}
