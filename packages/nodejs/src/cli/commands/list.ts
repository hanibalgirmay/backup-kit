import type { BackupKit } from "../../index.js";

export async function runList(kit: BackupKit): Promise<void> {
  const result = await kit.list();
  console.log(JSON.stringify(result, null, 2));
}
