# Python FastAPI example

```python
from backup_kit import from_fastapi

kit = from_fastapi(
    schedule="0 2 * * *",
    retention={"keepLast": 7},
    outputs=[{"driver": "local", "path": "./backups"}],
)

# Run from a worker / cron:
# kit.run_scheduled()
```

See [docs/frameworks/python.md](../../docs/frameworks/python.md).
