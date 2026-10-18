import type { ResolvedConnection } from "../../../core/types/storage.js";
import { createConfigurableStubDriver } from "../remoteBase.js";

export function createWebdavDriver(connection: ResolvedConnection = {}) {
  return createConfigurableStubDriver("webdav", "WebDAV", connection);
}

export const webdavDriver = createWebdavDriver();
export default webdavDriver;
