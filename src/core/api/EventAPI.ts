/**
 * EventAPI - External Event System Management
 * 
 * Public API class for external event operations. Provides clean interface
 * for the event system used by plugins and external components.
 * 
 * Note: This is separate from the internal EventBus which is used for 
 * system-level events within the core components.
 */

export class EventAPI {
  constructor(
    private eventHandlers: Map<string, Array<(...args: unknown[]) => void>>
  ) {}

  /**
   * Register an event handler
   * @param event Event name to listen for
   * @param handler Function to execute when event is emitted
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove an event handler
   * @param event Event name
   * @param handler Function to remove
   */
  off(event: string, handler: (...args: unknown[]) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   * @param event Event name to emit
   * @param args Arguments to pass to handlers
   */
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      }
    }
  }

  /**
   * Get all registered event names
   * @returns Array of event names
   */
  getEventNames(): string[] {
    return Array.from(this.eventHandlers.keys());
  }

  /**
   * Get number of handlers for a specific event
   * @param event Event name
   * @returns Number of registered handlers
   */
  getHandlerCount(event: string): number {
    return this.eventHandlers.get(event)?.length ?? 0;
  }

  /**
   * Remove all handlers for a specific event
   * @param event Event name
   */
  removeAllHandlers(event: string): void {
    this.eventHandlers.delete(event);
  }

  /**
   * Clear all event handlers
   */
  clear(): void {
    this.eventHandlers.clear();
  }

  /**
   * Check if an event has any handlers
   * @param event Event name
   * @returns True if event has handlers
   */
  hasHandlers(event: string): boolean {
    const handlers = this.eventHandlers.get(event);
    return handlers ? handlers.length > 0 : false;
  }
}