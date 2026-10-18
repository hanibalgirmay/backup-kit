import type { ResolvedConnection } from "../../../core/types/storage.js";
import { createConfigurableStubDriver } from "../remoteBase.js";

export function createDriveDriver(connection: ResolvedConnection = {}) {
  return createConfigurableStubDriver("drive", "Google Drive", connection);
}

export const driveDriver = createDriveDriver();
export default driveDriver;
