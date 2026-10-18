"""backup-kit — framework-first database backups for Python."""

from __future__ import annotations

import os
from typing import Any, Mapping
from urllib.parse import urlparse


DEFAULT_RETENTION = {"keepLast": 7}
DEFAULT_OUTPUT = {"name": "local", "driver": "local", "path": "./backups"}


def _driver_from_url(url: str) -> str | None:
    scheme = urlparse(url).scheme.lower()
    if scheme.startswith("postgres"):
        return "postgres"
    if scheme.startswith("mysql") or scheme == "mariadb":
        return "mysql"
    if scheme.startswith("sqlite"):
        return "sqlite"
    if scheme.startswith("mongo"):
        return "mongodb"
    if scheme.startswith("redis"):
        return "redis"
    return None


def discover_database(env: Mapping[str, str] | None = None) -> list[dict[str, Any]]:
    """Discover DB sources from environment (Django/FastAPI friendly)."""
    env = env or os.environ
    sources: list[dict[str, Any]] = []
    for key, name in (
        ("DATABASE_URL", "primary"),
        ("DJANGO_DATABASE_URL", "primary"),
        ("MONGODB_URI", "mongodb"),
        ("REDIS_URL", "redis"),
    ):
        value = env.get(key)
        if not value:
            continue
        driver = _driver_from_url(value)
        if not driver:
            continue
        sources.append(
            {
                "name": name,
                "driver": driver,
                "connection": value,
            }
        )

    if not sources and env.get("DB_HOST"):
        driver = (env.get("DB_CONNECTION") or "postgres").lower()
        if driver in ("postgresql", "pgsql"):
            driver = "postgres"
        sources.append(
            {
                "name": "primary",
                "driver": driver,
                "connection": {
                    "host": env.get("DB_HOST", "127.0.0.1"),
                    "port": int(env["DB_PORT"]) if env.get("DB_PORT") else None,
                    "database": env.get("DB_DATABASE") or env.get("POSTGRES_DB"),
                    "username": env.get("DB_USERNAME") or env.get("POSTGRES_USER"),
                    "password": env.get("DB_PASSWORD") or env.get("POSTGRES_PASSWORD"),
                },
            }
        )

    if not sources:
        raise ValueError(
            'database="auto" could not discover a database. '
            "Set DATABASE_URL (or MONGODB_URI / REDIS_URL / DB_*)."
        )
    return sources


def define_config(config: dict[str, Any] | None = None) -> dict[str, Any]:
    """Normalize framework-first config (auto DB, defaults, schedule)."""
    cfg = dict(config or {})
    sources = cfg.get("sources")
    database = cfg.get("database", "auto" if not sources else None)

    if sources:
        resolved_sources = list(sources)
    elif database == "auto" or database is None:
        resolved_sources = discover_database()
    elif isinstance(database, list):
        resolved_sources = database
    elif isinstance(database, dict):
        resolved_sources = [database]
    else:
        raise ValueError("Invalid database config")

    outputs = cfg.get("outputs") or cfg.get("destination") or [DEFAULT_OUTPUT]
    if isinstance(outputs, dict):
        outputs = [outputs]

    schedule = cfg.get("schedule")
    if isinstance(schedule, str):
        schedule = {"cron": schedule, "enabled": True, "pruneAfterBackup": True}
    elif isinstance(schedule, dict) and "cron" in schedule:
        schedule = {
            "cron": schedule["cron"],
            "timezone": schedule.get("timezone"),
            "enabled": schedule.get("enabled", True) is not False,
            "pruneAfterBackup": schedule.get("pruneAfterBackup", True) is not False,
        }

    return {
        **cfg,
        "version": cfg.get("version", 1),
        "framework": cfg.get("framework", "auto"),
        "database": database or "auto",
        "sources": resolved_sources,
        "outputs": outputs,
        "destination": outputs[0],
        "retention": cfg.get("retention") or dict(DEFAULT_RETENTION),
        "schedule": schedule,
        "compression": cfg.get("compression", "gzip"),
    }


class BackupKit:
    """Python runtime scaffold — mirrors Node/PHP public API."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = define_config(config)

    def backup(self) -> dict[str, Any]:
        raise NotImplementedError(
            "Python dump/restore engines are scaffolded; use Node/PHP runtimes for production today."
        )

    def run_scheduled(self) -> dict[str, Any]:
        result = self.backup()
        schedule = self.config.get("schedule") or {}
        if schedule.get("pruneAfterBackup", True):
            self.prune()
        return result

    def list(self) -> dict[str, Any]:
        return {"artifacts": []}

    def prune(self) -> dict[str, Any]:
        return {"deleted": [], "kept": []}


def create_backup_kit(config: dict[str, Any] | None = None) -> BackupKit:
    return BackupKit(config or {"database": "auto"})


def from_django(settings_module: Any | None = None, **overrides: Any) -> BackupKit:
    """Build kit from Django DATABASES / DATABASE_URL."""
    cfg: dict[str, Any] = {
        "framework": "django",
        "database": "auto",
        "schedule": overrides.pop("schedule", "0 2 * * *"),
        "retention": overrides.pop("retention", dict(DEFAULT_RETENTION)),
        "outputs": overrides.pop(
            "outputs",
            [{"driver": "local", "path": "./backups"}],
        ),
        **overrides,
    }
    return create_backup_kit(cfg)


def from_fastapi(**overrides: Any) -> BackupKit:
    """Build kit for FastAPI apps (reads DATABASE_URL etc.)."""
    cfg: dict[str, Any] = {
        "framework": "fastapi",
        "database": "auto",
        "schedule": overrides.pop("schedule", "0 2 * * *"),
        "retention": overrides.pop("retention", dict(DEFAULT_RETENTION)),
        "outputs": overrides.pop(
            "outputs",
            [{"driver": "local", "path": "./backups"}],
        ),
        **overrides,
    }
    return create_backup_kit(cfg)
