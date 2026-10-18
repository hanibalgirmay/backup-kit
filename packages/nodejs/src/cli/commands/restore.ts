import type { BackupKit } from "../../index.js";

export async function runRestore(kit: BackupKit, key: string): Promise<void> {
  const result = await kit.restore({ key });
  console.log(JSON.stringify(result, null, 2));
}
