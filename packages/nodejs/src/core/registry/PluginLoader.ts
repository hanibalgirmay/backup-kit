import type { AnyDriver } from "../types/driver.js";
import type { DriverRegistry } from "./DriverRegistry.js";
import { DriverError } from "../errors/index.js";

/**
 * Loads external driver plugins. Built-in drivers are registered separately.
 */
export class PluginLoader {
  constructor(private readonly registry: DriverRegistry) {}

  async load(modulePath: string): Promise<AnyDriver> {
    try {
      const mod = (await import(modulePath)) as { default?: AnyDriver; driver?: AnyDriver };
      const driver = mod.default ?? mod.driver;
      if (!driver?.id || !driver.kind) {
        throw new DriverError(`Invalid driver plugin exports: ${modulePath}`);
      }
      this.registry.register(driver);
      return driver;
    } catch (err) {
      throw new DriverError(`Failed to load driver plugin: ${modulePath}`, undefined, err);
    }
  }
}
