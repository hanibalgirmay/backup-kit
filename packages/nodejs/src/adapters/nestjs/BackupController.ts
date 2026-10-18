import type { BackupService } from "./BackupService.js";

export class BackupController {
  constructor(private readonly service: BackupService) {}

  backup() {
    return this.service.backup();
  }

  list() {
    return this.service.list();
  }

  prune() {
    return this.service.prune();
  }

  restore(key: string) {
    return this.service.restore(key);
  }
}
