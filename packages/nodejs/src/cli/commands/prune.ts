import type { BackupKit } from "../../index.js";

export async function runPrune(kit: BackupKit): Promise<void> {
  const result = await kit.prune();
  console.log(JSON.stringify(result, null, 2));
}
