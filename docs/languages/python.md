# Python

Package: [`packages/python`](../../packages/python) — PyPI package **`backup-kit`** (planned).

## Install

```bash
pip install backup-kit
```

## Usage (planned)

```python
from backup_kit import create_backup_kit, define_config

config = define_config({
    "name": "app",
    "sources": [{"driver": "postgres", "connection": os.environ["DATABASE_URL"]}],
    "destination": {"driver": "local", "path": "./backups"},
})

kit = create_backup_kit(config)
kit.backup()
```

## Examples

See [`examples/python-*`](../../examples/).
