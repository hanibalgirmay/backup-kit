import type { AnyDriver, DatabaseDriver, StorageDriver } from "../types/driver.js";
import { DriverError } from "../errors/index.js";

export class DriverRegistry {
  private readonly drivers = new Map<string, AnyDriver>();

  register(driver: AnyDriver): void {
    this.drivers.set(driver.id, driver);
  }

  get(id: string): AnyDriver {
    const driver = this.drivers.get(id);
    if (!driver) throw new DriverError(`Driver not registered: ${id}`, id);
    return driver;
  }

  getDatabase(id: string): DatabaseDriver {
    const driver = this.get(id);
    if (driver.kind !== "database") {
      throw new DriverError(`Driver is not a database driver: ${id}`, id);
    }
    return driver;
  }

  getStorage(id: string): StorageDriver {
    const driver = this.get(id);
    if (driver.kind !== "storage") {
      throw new DriverError(`Driver is not a storage driver: ${id}`, id);
    }
    return driver;
  }

  list(): AnyDriver[] {
    return [...this.drivers.values()];
  }
}
