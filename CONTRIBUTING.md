# Contributing

Thanks for your interest in **backup-kit**. Author: **Hanibal Girmay**.

## Ground rules

- One concern per PR (docs, Node, PHP, Python, or Go)
- Match the style of the package you touch
- Add or update tests when changing behavior
- Do not commit secrets, `.env`, or real backup files (`.bk`)

## Setup

```bash
git clone <this-repo>
cd backup-kit
```

### Node

```bash
pnpm install
pnpm test
pnpm build
```

### PHP

```bash
cd packages/php
composer install
composer test
```

### Python

```bash
cd packages/python
pip install -e ".[dev]"
pytest
```

### Go

```bash
cd packages/go
go test ./...
```

Or from the root:

```bash
pnpm test:all
```

## Shared contract

Behavior that must stay aligned across languages lives in [`spec/`](./spec) and [`docs/`](./docs).  
If you change config shape or driver names, update the spec and every runtime that implements it.

## Pull requests

1. Fork and create a branch: `feat/…`, `fix/…`, or `docs/…`
2. Run the tests for the language(s) you changed
3. Open a PR with a short description of **why**
4. Link related issues

## Code of conduct

By participating, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](./SECURITY.md) — do not file public issues for vulnerabilities.
