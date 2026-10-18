# Python frameworks (Django / FastAPI)

Package: `backup-kit` (scaffold — API ready; dump engines catching up to Node/PHP)

```bash
pip install backup-kit
```

## FastAPI

```python
from backup_kit import from_fastapi

kit = from_fastapi(
    schedule="0 2 * * *",
    retention={"keepLast": 7, "keepDaily": 14},
    outputs=[{"driver": "local", "path": "./backups"}],
)

# In a background worker / cron entrypoint:
# kit.run_scheduled()
```

Reads `DATABASE_URL`, `MONGODB_URI`, `REDIS_URL`, or `DB_*`.

## Django

```python
from backup_kit import from_django

kit = from_django(
    schedule="0 2 * * *",
    retention={"keepLast": 7},
    outputs=[{"driver": "local", "path": "backups"}],
)
```

Hook into Celery beat, django-crontab, or system cron:

```bash
# crontab
0 2 * * * cd /app && python manage.py shell -c "from backup_kit import from_django; from_django().run_scheduled()"
```

## Explicit multi-source

```python
from backup_kit import create_backup_kit

kit = create_backup_kit({
    "framework": "fastapi",
    "database": [
        {"name": "sql", "driver": "postgres", "connection": os.environ["DATABASE_URL"]},
        {"name": "cache", "driver": "redis", "connection": os.environ["REDIS_URL"]},
    ],
    "schedule": "0 2 * * *",
    "outputs": [{"driver": "local", "path": "./backups"}],
})
```
