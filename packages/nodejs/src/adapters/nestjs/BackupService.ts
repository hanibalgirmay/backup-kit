import type { BackupKit } from "../../index.js";

export class BackupService {
  constructor(private readonly kit: BackupKit) {}

  backup() {
    return this.kit.backup();
  }

  list() {
    return this.kit.list();
  }

  prune() {
    return this.kit.prune();
  }

  restore(key: string) {
    return this.kit.restore({ key });
  }
}
