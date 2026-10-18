# Node + NestJS example

```ts
import { BackupModule } from "@ryle/backup-kit/adapters/nestjs";

const backup = BackupModule.forRoot({
  schedule: "0 2 * * *",
  retention: { keepLast: 7, keepDaily: 14 },
  outputs: [{ driver: "local", path: "./storage/backups" }],
});

// Register backup.service / backup.kit in your Nest module providers.
// Cron auto-starts; DATABASE_URL is discovered automatically.
```

See [docs/frameworks/nodejs.md](../../docs/frameworks/nodejs.md).
