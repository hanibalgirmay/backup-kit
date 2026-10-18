import type { BackupKit } from "../../index.js";

export async function runBackup(kit: BackupKit): Promise<void> {
  const result = await kit.backup();
  console.log(JSON.stringify(result, null, 2));
}
