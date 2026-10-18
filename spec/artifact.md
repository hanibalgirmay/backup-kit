# Artifact format (`.bk`)

Language-agnostic on-disk backup artifact. All runtimes must read and write this layout.

## File naming

```
{job-name}_{YYYYMMDDTHHMMSSZ}_{short-id}.bk
```

Example: `prod-db_20261002T113045Z_a1b2c3.bk`

## Container

A `.bk` file is a **gzip-compressed tar** archive (or `zstd` when configured) with this internal layout:

```
manifest.json          # required — artifact metadata
checksums.sha256       # required — content hashes
payload/
  sources/
    {source-name}/
      dump.bin         # driver-specific dump bytes
      meta.json        # optional per-source metadata
  metadata/
    config.snapshot.json   # resolved config used for this run
```

When encryption is enabled, the entire archive (after compression) is wrapped with AES-256-GCM. Encrypted artifacts use the same `.bk` extension; encryption is recorded in `manifest.json`.

## `manifest.json`

```json
{
  "formatVersion": 1,
  "createdAt": "2026-10-02T11:30:45.000Z",
  "kitVersion": "0.1.0",
  "jobName": "prod-db",
  "compression": "gzip",
  "encryption": {
    "algorithm": "none"
  },
  "sources": [
    {
      "name": "primary",
      "driver": "postgres",
      "path": "payload/sources/primary/dump.bin",
      "bytes": 1048576,
      "checksum": "sha256:..."
    }
  ],
  "destination": {
    "driver": "local",
    "key": "prod-db_20261002T113045Z_a1b2c3.bk"
  },
  "destinations": [
    {
      "name": "local",
      "driver": "local",
      "key": "prod-db_20261002T113045Z_a1b2c3.bk",
      "path": "./backups"
    }
  ],
  "metadata": {}
}
```

## `checksums.sha256`

One line per file, GNU `sha256sum` style:

```
<hex>  payload/sources/primary/dump.bin
<hex>  manifest.json
```

## Compatibility

- Readers MUST reject `formatVersion` they do not support.
- Writers MUST emit `formatVersion: 1` until a breaking revision is published in [`versioning.md`](./versioning.md).
