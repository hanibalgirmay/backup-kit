import { createLocalStorageDriver } from "../_stub.js";
import type { ResolvedConnection } from "../../../core/types/storage.js";
import type { StorageDriver } from "../../../core/types/driver.js";

export function createLocalDriver(pathOrConnection: string | ResolvedConnection = "./backups"): StorageDriver {
  if (typeof pathOrConnection === "string") {
    return createLocalStorageDriver(pathOrConnection);
  }
  return createLocalStorageDriver(
    typeof pathOrConnection.path === "string" ? pathOrConnection.path : "./backups",
  );
}

export const localDriver = createLocalStorageDriver("./backups");
export default localDriver;
