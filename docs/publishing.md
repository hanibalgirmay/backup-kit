# Install & publish (one package per language)

This repo is a **monorepo**. Each language runtime is published **separately** to its own registry.  
Installing Node never pulls PHP, Python, or Go (and vice versa).

## Naming plan (same product everywhere)

Product name: **backup-kit**. Org / vendor: **ryle** (only where the registry requires it).

| Language | Registry | Package name | End-user install |
| --- | --- | --- | --- |
| Node.js | [npm](https://www.npmjs.com) | `backup-kit` | `npm i backup-kit` |
| PHP | [Packagist](https://packagist.org) | `ryle/backup-kit` | `composer require ryle/backup-kit` |
| Python | [PyPI](https://pypi.org) | `backup-kit` | `pip install backup-kit` |
| Go | Go modules | `github.com/ryle/backup-kit` | `go get github.com/ryle/backup-kit` |

| Language | Source folder |
| --- | --- |
| Node.js | `packages/nodejs` |
| PHP | `packages/php` |
| Python | `packages/python` |
| Go | `packages/go` |

Composer always needs `vendor/package` — use `ryle/backup-kit`, never `backup-kit/backup-kit`.  
Go module path is `github.com/ryle/backup-kit` (import the same; package id stays `backupkit`).

The root `package.json` is **`private: true`** — never publish the monorepo root to npm.

---

## Preflight (every language)

Before any publish:

1. Bump the version in that package only (Node `package.json`, PHP `composer.json`, Python `pyproject.toml`, Go git tag).
2. Run that package’s tests (see below).
3. Confirm secrets (`.env`, keys) are not in the tarball / release.
4. Publish from the **package folder**, not the monorepo root.

### Test everything from the repo root

```bash
# Node
pnpm test

# PHP
cd packages/php && composer install && composer test && cd ../..

# Python
cd packages/python && python -m pip install -e ".[dev]" && python -m pytest && cd ../..

# Go
cd packages/go && go test ./... && cd ../..
```

Or use the root helpers:

```bash
pnpm test                 # Node
pnpm test:php
pnpm test:python
pnpm test:go
pnpm test:all             # all four
```

---

## 1) Node.js → npm

### Install (end users)

```bash
npm install backup-kit
# or
pnpm add backup-kit
# or
yarn add backup-kit
```

You get **only** the Node runtime (`zod`, `croner`, adapters, CLI). No PHP/Python/Go.

### Maintainer publish

```bash
cd packages/nodejs
pnpm install
pnpm test
pnpm build
pnpm pack --dry-run          # review files: dist/, bin/, README.md
npm login                    # once
pnpm publish --access public
```

From monorepo root:

```bash
pnpm publish:nodejs
```

**Checklist**

- [ ] `version` bumped in `packages/nodejs/package.json`
- [ ] `pnpm test` + `pnpm build` pass
- [ ] `files` field only ships `dist`, `bin`, `README.md`
- [ ] Scoped package uses `--access public` (or `publishConfig.access`)
- [ ] Tag/release notes mention `backup-kit@x.y.z`

---

## 2) PHP → Packagist (Composer)

### Install (end users)

```bash
composer require ryle/backup-kit
```

You get **only** `vendor/ryle/backup-kit`. No `node_modules`.

### Maintainer publish

Packagist does **not** upload a zip from your laptop. It mirrors a **git** tag.

1. Ensure `packages/php/composer.json` has correct `name`, `description`, `license`, `autoload` (do **not** set `version` — Packagist uses git tags).
2. Push the monorepo (or a subtree) to GitHub/GitLab.
3. Create a SemVer tag, e.g. `v0.1.0` on the PHP package repo.
4. On [packagist.org](https://packagist.org): **Submit** the repository once, then enable GitHub sync / webhook.
5. If the Composer package lives in a subdirectory of a monorepo, set Packagist **“Git repository”** + path, **or** publish via `git subtree split` so `packages/php` is the repo root (recommended for clean installs).

**Subtree split (recommended for Packagist):**

```bash
git subtree split --prefix=packages/php -b php-publish
git push git@github.com:backup-kit/php-backup-kit.git php-publish:main
git tag -a v0.1.0 php-publish -m "php v0.1.0"
git push git@github.com:backup-kit/php-backup-kit.git v0.1.0
```

**Checklist**

- [ ] `composer validate` in `packages/php`
- [ ] `composer test` passes
- [ ] Tag pushed; Packagist shows the new version
- [ ] `composer require ryle/backup-kit:^x.y` works in a clean folder

### Local test before Packagist

```bash
cd packages/php
composer install
composer test
composer validate --strict
```

---

## 3) Python → PyPI

### Install (end users)

```bash
pip install backup-kit
# or
uv add backup-kit
```

You get **only** the `backup_kit` import. No npm/Composer.

### Maintainer publish

```bash
cd packages/python
python -m pip install -U build twine
python -m pip install -e ".[dev]"
python -m pytest
python -m build
twine check dist/*
# TestPyPI first (recommended)
twine upload --repository testpypi dist/*
# Production
twine upload dist/*
```

**Checklist**

- [ ] `version` bumped in `pyproject.toml`
- [ ] `pytest` passes
- [ ] `twine check` clean
- [ ] Package name `backup-kit` installs as import `backup_kit`

---

## 4) Go → modules proxy

### Install (end users)

```bash
go get github.com/ryle/backup-kit@v0.1.0
```

You get **only** the Go module (core + Gin adapter path).

### Why a split repo / subtree?

`go.mod` lives in `packages/go` but the module path is `github.com/ryle/backup-kit`.  
`proxy.golang.org` expects **`go.mod` at the repository root** for that path. Use a dedicated Go repo (or subtree) whose root **is** `packages/go`.

```bash
git subtree split --prefix=packages/go -b go-publish
git push git@github.com:ryle/backup-kit.git go-publish:main
git tag -a v0.1.0 go-publish -m "go v0.1.0"
git push git@github.com:ryle/backup-kit.git v0.1.0
```

Then:

```bash
GOPROXY=proxy.golang.org go list -m github.com/ryle/backup-kit@v0.1.0
```

**Checklist**

- [ ] `go test ./...` in `packages/go`
- [ ] SemVer tag `vX.Y.Z` on the Go module repo
- [ ] Import path `github.com/ryle/backup-kit` resolves

### Local test

```bash
cd packages/go
go test ./...
```

---

## Versioning policy

| Package | Where version lives |
| --- | --- |
| Node | `packages/nodejs/package.json` → npm |
| PHP | git tag (+ optional `version` in `composer.json`) → Packagist |
| Python | `packages/python/pyproject.toml` → PyPI |
| Go | git tag `vX.Y.Z` on Go module repo → proxy |

Keep SemVer aligned when possible (`1.0.0` across languages), but registries are independent — you may ship Node first.

---

## Mental model

```
User app (NestJS)   →  npm i backup-kit
User app (Laravel)  →  composer require ryle/backup-kit
User app (FastAPI)  →  pip install backup-kit
User app (Gin)      →  go get github.com/ryle/backup-kit
```

Shared `spec/` + `docs/` stay in the monorepo for maintainers. End users install **one** language package.
