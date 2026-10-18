import { createStubDatabaseDriver } from "../_stub.js";

export const mongodbDriver = createStubDatabaseDriver("mongodb", "MongoDB");
export default mongodbDriver;
