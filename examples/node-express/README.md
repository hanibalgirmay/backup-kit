# Node + Express example

```ts
import express from "express";
import { setupBackupKit } from "@ryle/backup-kit/adapters/express";

const app = express();
setupBackupKit(app, {
  schedule: "0 2 * * *",
  retention: { keepLast: 7 },
  outputs: [{ driver: "local", path: "./backups" }],
});

app.listen(3000);
```

Routes: `POST /backup-kit/backup`, `GET /backup-kit/list`, `POST /backup-kit/prune`.

See [docs/frameworks/nodejs.md](../../docs/frameworks/nodejs.md).
