import type { ResolvedConnection } from "../../../core/types/storage.js";
import { createConfigurableStubDriver } from "../remoteBase.js";

export function createS3Driver(connection: ResolvedConnection = {}) {
  return createConfigurableStubDriver("s3", "Amazon S3", connection);
}

export const s3Driver = createS3Driver();
export default s3Driver;
