# backup-kit (Python)

Framework-first database backups for Django / FastAPI.

## Install

```bash
pip install backup-kit
```

## Usage

```python
from backup_kit import from_fastapi, from_django

kit = from_fastapi(
    schedule="0 2 * * *",
    retention={"keepLast": 7},
    outputs=[{"driver": "local", "path": "./backups"}],
)
```

Use `driver: "ssh"` for any SSH/SFTP remote (alias of `sftp`).

## Develop

```bash
pip install -e ".[dev]"
pytest
```

**Author:** Hanibal Girmay · **License:** MIT

> Dump/restore engines are scaffolded; config + discovery API matches Node/PHP.
