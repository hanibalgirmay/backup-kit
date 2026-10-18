import { createStubDatabaseDriver } from "../_stub.js";

export const sqliteDriver = createStubDatabaseDriver("sqlite", "SQLite");
export default sqliteDriver;
