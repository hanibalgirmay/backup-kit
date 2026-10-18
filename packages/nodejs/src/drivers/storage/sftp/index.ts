import type { ResolvedConnection } from "../../../core/types/storage.js";
import { createConfigurableStubDriver } from "../remoteBase.js";

export function createSftpDriver(connection: ResolvedConnection = {}) {
  return createConfigurableStubDriver("sftp", "SFTP / SSH", {
    port: 22,
    ...connection,
  });
}

/** Generic SSH remote host (same protocol as SFTP). */
export function createSshDriver(connection: ResolvedConnection = {}) {
  return createSftpDriver(connection);
}

/** @deprecated Use createSshDriver / driver: "ssh" */
export function createVpsDriver(connection: ResolvedConnection = {}) {
  return createSftpDriver(connection);
}

export const sftpDriver = createSftpDriver();
export default sftpDriver;
