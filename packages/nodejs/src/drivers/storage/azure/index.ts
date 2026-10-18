import type { ResolvedConnection } from "../../../core/types/storage.js";
import { createConfigurableStubDriver } from "../remoteBase.js";

export function createAzureDriver(connection: ResolvedConnection = {}) {
  return createConfigurableStubDriver("azure", "Azure Blob Storage", connection);
}

export const azureDriver = createAzureDriver();
export default azureDriver;
