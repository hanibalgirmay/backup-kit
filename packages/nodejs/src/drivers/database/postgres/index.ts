import { createStubDatabaseDriver } from "../_stub.js";

export const postgresDriver = createStubDatabaseDriver("postgres", "PostgreSQL");
export default postgresDriver;
