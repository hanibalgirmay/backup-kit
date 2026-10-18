import type { EventHandler, BackupKitEvent, BackupKitEventName } from "../types/events.js";

export class EventBus {
  private readonly handlers = new Map<BackupKitEventName | "*", Set<EventHandler>>();

  on(event: BackupKitEventName | "*", handler: EventHandler): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return () => set.delete(handler);
  }

  async emit(event: BackupKitEvent): Promise<void> {
    const specific = this.handlers.get(event.event);
    const wildcard = this.handlers.get("*");
    const list = [...(specific ?? []), ...(wildcard ?? [])];
    for (const handler of list) {
      await handler(event);
    }
  }
}
