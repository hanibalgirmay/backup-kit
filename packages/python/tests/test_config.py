import pytest

from backup_kit import (
    BackupKit,
    define_config,
    discover_database,
    from_fastapi,
    normalize_output_driver,
)


def test_normalize_ssh_alias():
    assert normalize_output_driver("ssh") == "sftp"
    assert normalize_output_driver("sftp") == "sftp"


def test_discover_database_url(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/app")
    sources = discover_database()
    assert sources[0]["driver"] == "postgres"


def test_define_config_auto_and_defaults(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "mysql://user:pass@localhost/app")
    cfg = define_config({"schedule": "0 2 * * *"})
    assert cfg["compression"] == "gzip"
    assert cfg["retention"]["keepLast"] == 7
    assert cfg["sources"][0]["driver"] == "mysql"
    assert cfg["outputs"][0]["driver"] == "local"
    assert cfg["schedule"]["cron"] == "0 2 * * *"


def test_define_config_ssh_output(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./app.db")
    cfg = define_config(
        {
            "outputs": [
                {
                    "driver": "ssh",
                    "host": "1.2.3.4",
                    "connection": {"username": "backup"},
                }
            ]
        }
    )
    assert cfg["outputs"][0]["driver"] == "sftp"


def test_from_fastapi(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgres://localhost/db")
    kit = from_fastapi(schedule="0 3 * * *")
    assert isinstance(kit, BackupKit)
    assert kit.config["framework"] == "fastapi"
    assert kit.config["schedule"]["cron"] == "0 3 * * *"


def test_discover_missing_raises():
    with pytest.raises(ValueError, match="could not discover"):
        discover_database({})
