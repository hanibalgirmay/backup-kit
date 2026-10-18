import type { ResolvedConnection } from "../../../core/types/storage.js";
import { createConfigurableStubDriver } from "../remoteBase.js";

export function createGcsDriver(connection: ResolvedConnection = {}) {
  return createConfigurableStubDriver("gcs", "Google Cloud Storage", connection);
}

export const gcsDriver = createGcsDriver();
export default gcsDriver;
