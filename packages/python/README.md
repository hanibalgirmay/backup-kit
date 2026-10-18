# backup-kit (Python)

Framework-first database backups for Django / FastAPI.

```bash
pip install backup-kit
```

```python
from backup_kit import from_fastapi, from_django

kit = from_fastapi(
    schedule="0 2 * * *",
    retention={"keepLast": 7},
    outputs=[{"driver": "local", "path": "./backups"}],
)
```

See [docs/frameworks/python.md](../../docs/frameworks/python.md).

> Dump/restore engines are scaffolded; config + discovery API matches Node/PHP.
