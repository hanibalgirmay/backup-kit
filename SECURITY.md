# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| Latest release on each registry | Yes |
| Unreleased `main` | Best effort |

## Reporting a vulnerability

Do **not** open a public GitHub issue for security problems.

Please email **Hanibal Girmay** with details:

- **Email:** open a private channel via your GitHub profile contact, or create a [GitHub Security Advisory](https://docs.github.com/en/code-security/security-advisories) on this repository once it is public
- Include: affected package (`@ryle/backup-kit`, PHP, Python, or Go), version, impact, and steps to reproduce

You should receive an acknowledgement within a few days. If the report is confirmed, we will work on a fix and credit you (unless you prefer to remain anonymous).

## Scope

In scope:

- Credential handling / secret leakage in logs or artifacts
- Path traversal when writing backups
- Unsafe deserialization of backup manifests
- Privilege issues in adapters or CLI

Out of scope:

- Denial of service via oversized databases (operational concern)
- Misconfiguration of remote storage credentials by end users
- Vulnerabilities only in third-party dump tools (`pg_dump`, etc.) when used as documented

## Safe defaults

- Prefer env / file-based credentials — never commit secrets
- Keep backup destinations private (S3 buckets, SSH hosts)
- Rotate keys used by backup jobs regularly
