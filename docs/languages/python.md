# Python

Package: [`packages/python`](../../packages/python) — PyPI package **`backup-kit`** (import `backup_kit`).

## Install

```bash
pip install backup-kit
```

## Usage

```python
from backup_kit import from_fastapi, define_config, create_backup_kit

kit = from_fastapi(
    schedule="0 2 * * *",
    retention={"keepLast": 7},
    outputs=[{"driver": "local", "path": "./backups"}],
)

# or
config = define_config({
    "name": "app",
    "database": "auto",
    "outputs": [{"driver": "local", "path": "./backups"}],
})
kit = create_backup_kit(config)
```

## Publish

See [publishing.md](../publishing.md#3-python--pypi).

## Examples

See [`examples/python-*`](../../examples/).
