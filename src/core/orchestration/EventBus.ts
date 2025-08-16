/**
 * EventBus - Event-driven communication system for loose coupling between components
 * 
 * Provides publish-subscribe pattern for cross-component communication
 */

export type EventHandler = (...args: unknown[]) => void;

export interface EventBusConfig {
  maxListeners?: number;
  enableLogging?: boolean;
  errorHandler?: (error: Error, event: string, handler: EventHandler) => void;
}

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private config: Required<EventBusConfig>;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      maxListeners: 50,
      enableLogging: false,
      errorHandler: (error, event) => {
        console.error(`Error in event handler for ${event}:`, error);
      },
      ...config,
    };
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const eventHandlers = this.handlers.get(event)!;
    
    // Check max listeners limit
    if (eventHandlers.size >= this.config.maxListeners) {
      throw new Error(`Maximum listeners (${this.config.maxListeners}) exceeded for event: ${event}`);
    }

    eventHandlers.add(handler);

    if (this.config.enableLogging) {
      console.log(`Event handler registered for: ${event}`);
    }
  }

  /**
   * Register a one-time event handler
   */
  once(event: string, handler: EventHandler): void {
    const wrappedHandler = (...args: unknown[]) => {
      this.off(event, wrappedHandler);
      handler(...args);
    };
    
    this.on(event, wrappedHandler);
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: EventHandler): boolean {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) return false;

    const removed = eventHandlers.delete(handler);
    
    // Clean up empty event handler sets
    if (eventHandlers.size === 0) {
      this.handlers.delete(event);
    }

    if (this.config.enableLogging && removed) {
      console.log(`Event handler removed for: ${event}`);
    }

    return removed;
  }

  /**
   * Remove all handlers for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      if (this.config.enableLogging) {
        console.log(`All handlers removed for: ${event}`);
      }
    } else {
      this.handlers.clear();
      if (this.config.enableLogging) {
        console.log('All event handlers removed');
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   */
  emit(event: string, ...args: unknown[]): boolean {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers || eventHandlers.size === 0) {
      return false;
    }

    if (this.config.enableLogging) {
      console.log(`Emitting event: ${event} with ${args.length} arguments`);
    }

    let hasErrors = false;

    for (const handler of eventHandlers) {
      try {
        handler(...args);
      } catch (error) {
        hasErrors = true;
        this.config.errorHandler(error as Error, event, handler);
      }
    }

    return !hasErrors;
  }

  /**
   * Emit an event asynchronously
   */
  async emitAsync(event: string, ...args: unknown[]): Promise<boolean> {
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers || eventHandlers.size === 0) {
      return false;
    }

    if (this.config.enableLogging) {
      console.log(`Emitting async event: ${event} with ${args.length} arguments`);
    }

    const promises: Promise<void>[] = [];
    let hasErrors = false;

    for (const handler of eventHandlers) {
      const promise = Promise.resolve().then(() => handler(...args)).catch(error => {
        hasErrors = true;
        this.config.errorHandler(error as Error, event, handler);
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    return !hasErrors;
  }

  /**
   * Get list of events with handlers
   */
  eventNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount(event: string): number {
    const eventHandlers = this.handlers.get(event);
    return eventHandlers ? eventHandlers.size : 0;
  }

  /**
   * Get all listeners for an event
   */
  listeners(event: string): EventHandler[] {
    const eventHandlers = this.handlers.get(event);
    return eventHandlers ? Array.from(eventHandlers) : [];
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get event bus statistics
   */
  getStatistics(): {
    totalEvents: number;
    totalHandlers: number;
    eventCounts: Record<string, number>;
    averageHandlersPerEvent: number;
  } {
    const events = Array.from(this.handlers.keys());
    const totalHandlers = Array.from(this.handlers.values())
      .reduce((sum, handlers) => sum + handlers.size, 0);

    const eventCounts: Record<string, number> = {};
    for (const [event, handlers] of this.handlers.entries()) {
      eventCounts[event] = handlers.size;
    }

    return {
      totalEvents: events.length,
      totalHandlers,
      eventCounts,
      averageHandlersPerEvent: events.length > 0 ? totalHandlers / events.length : 0,
    };
  }

  /**
   * Create a scoped event bus for namespaced events
   */
  createNamespace(namespace: string): NamespacedEventBus {
    return new NamespacedEventBus(this, namespace);
  }

  /**
   * Wait for an event to be emitted
   */
  waitFor(event: string, timeout?: number): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;

      const handler = (...args: unknown[]) => {
        if (timeoutId) clearTimeout(timeoutId);
        this.off(event, handler);
        resolve(args);
      };

      this.once(event, handler);

      if (timeout) {
        timeoutId = setTimeout(() => {
          this.off(event, handler);
          reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);
      }
    });
  }

  /**
   * Create an event filter that only emits events matching a condition
   */
  filter(event: string, predicate: (...args: unknown[]) => boolean): EventBus {
    const filteredBus = new EventBus(this.config);
    
    this.on(event, (...args) => {
      if (predicate(...args)) {
        filteredBus.emit(event, ...args);
      }
    });

    return filteredBus;
  }

  /**
   * Dispose of the event bus and clean up resources
   */
  dispose(): void {
    this.removeAllListeners();
  }
}

/**
 * Namespaced event bus for scoped events
 */
export class NamespacedEventBus {
  constructor(
    private parentBus: EventBus,
    private namespace: string
  ) {}

  private namespacedEvent(event: string): string {
    return `${this.namespace}:${event}`;
  }

  on(event: string, handler: EventHandler): void {
    this.parentBus.on(this.namespacedEvent(event), handler);
  }

  once(event: string, handler: EventHandler): void {
    this.parentBus.once(this.namespacedEvent(event), handler);
  }

  off(event: string, handler: EventHandler): boolean {
    return this.parentBus.off(this.namespacedEvent(event), handler);
  }

  emit(event: string, ...args: unknown[]): boolean {
    return this.parentBus.emit(this.namespacedEvent(event), ...args);
  }

  async emitAsync(event: string, ...args: unknown[]): Promise<boolean> {
    return this.parentBus.emitAsync(this.namespacedEvent(event), ...args);
  }

  listenerCount(event: string): number {
    return this.parentBus.listenerCount(this.namespacedEvent(event));
  }

  hasListeners(event: string): boolean {
    return this.parentBus.hasListeners(this.namespacedEvent(event));
  }

  waitFor(event: string, timeout?: number): Promise<unknown[]> {
    return this.parentBus.waitFor(this.namespacedEvent(event), timeout);
  }
}