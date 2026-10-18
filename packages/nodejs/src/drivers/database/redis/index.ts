import { createStubDatabaseDriver } from "../_stub.js";

export const redisDriver = createStubDatabaseDriver("redis", "Redis");
export default redisDriver;
