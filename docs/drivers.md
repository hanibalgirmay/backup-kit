# Drivers

Drivers implement the contract in [`spec/driver.schema.json`](../spec/driver.schema.json).

## Database drivers

| Id | Status | Notes |
| --- | --- | --- |
| `postgres` | planned | `pg_dump` / `pg_restore` |
| `mysql` | planned | `mysqldump` / `mysql` |
| `mongodb` | planned | `mongodump` / `mongorestore` |
| `sqlite` | planned | file copy / SQL dump |
| `redis` | planned | `BGSAVE` / RDB |

## Storage drivers (outputs)

Configure one or more via `outputs` (default: `local`). Remotes require connection + credentials — see [configuration.md](./configuration.md).

| Id | Status | Connection highlights |
| --- | --- | --- |
| `local` | available | `path` only |
| `s3` | scaffold | `bucket`, `region`, `endpoint`, keys / default AWS chain |
| `gcs` | scaffold | `bucket`, `projectId`, service account `keyFile` |
| `azure` | scaffold | `account` + `container` or `connectionString` |
| `sftp` / `ssh` | scaffold | any SSH host — `host`, `port` (22), `username`, password or key |
| `webdav` | scaffold | `endpoint`/`url`, optional basic/token auth |
| `drive` | scaffold | `folderId`, service account / OAuth |

`ssh` is a friendly alias of `sftp` for any remote SSH host.

### Flexible credentials

```ts
credentials: {
  password: { env: "SSH_PASSWORD" },
  privateKey: { file: "~/.ssh/id_ed25519" },
  accessKeyId: { env: "AWS_ACCESS_KEY_ID" },
  secretAccessKey: { env: "AWS_SECRET_ACCESS_KEY" },
  token: { env: "BEARER_TOKEN" },
  keyFile: { env: "GOOGLE_APPLICATION_CREDENTIALS" },
  connectionString: { env: "AZURE_STORAGE_CONNECTION_STRING" },
  useDefault: true, // cloud default credential chain
  agent: true,      // SSH agent
}
```

## Multiple outputs

```ts
outputs: [
  { driver: "local", path: "./backups" },
  {
    driver: "ssh",
    host: "1.2.3.4",
    port: 22,
    connection: { username: "deploy", remotePath: "/backups" },
    credentials: { privateKey: { file: "./id_ed25519" } },
  },
]
```
