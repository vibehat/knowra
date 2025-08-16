/**
 * Tests for EventBus service
 * Verifies event-driven communication infrastructure
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus, NamespacedEventBus } from '../../core/orchestration/EventBus.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('Basic Event Handling', () => {
    it('should register and emit events', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);

      const result = eventBus.emit('test-event', 'arg1', 'arg2');

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('arg1', 'arg2');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      eventBus.emit('test-event', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should return false when emitting non-existent event', () => {
      const result = eventBus.emit('non-existent-event');

      expect(result).toBe(false);
    });

    it('should handle events with no arguments', () => {
      const handler = vi.fn();
      eventBus.on('no-args-event', handler);

      eventBus.emit('no-args-event');

      expect(handler).toHaveBeenCalledWith();
    });

    it('should handle events with multiple arguments', () => {
      const handler = vi.fn();
      eventBus.on('multi-args-event', handler);

      eventBus.emit('multi-args-event', 1, 'string', { obj: true }, [1, 2, 3]);

      expect(handler).toHaveBeenCalledWith(1, 'string', { obj: true }, [1, 2, 3]);
    });
  });

  describe('Event Handler Management', () => {
    it('should remove event handlers', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);

      const removed = eventBus.off('test-event', handler);

      expect(removed).toBe(true);
      eventBus.emit('test-event');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should return false when removing non-existent handler', () => {
      const handler = vi.fn();
      const removed = eventBus.off('test-event', handler);

      expect(removed).toBe(false);
    });

    it('should clean up empty event handler sets', () => {
      const handler = vi.fn();
      eventBus.on('test-event', handler);
      eventBus.off('test-event', handler);

      expect(eventBus.eventNames()).not.toContain('test-event');
    });

    it('should handle removing handlers for different events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('event1', handler1);
      eventBus.on('event2', handler2);

      eventBus.off('event1', handler1);

      eventBus.emit('event1');
      eventBus.emit('event2');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('One-time Event Handlers', () => {
    it('should register and auto-remove one-time handlers', () => {
      const handler = vi.fn();
      eventBus.once('test-event', handler);

      eventBus.emit('test-event', 'first');
      eventBus.emit('test-event', 'second');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should handle multiple once handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.once('test-event', handler1);
      eventBus.once('test-event', handler2);

      eventBus.emit('test-event');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);

      eventBus.emit('test-event');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Removal', () => {
    it('should remove all listeners for specific event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);
      eventBus.on('other-event', handler1);

      eventBus.removeAllListeners('test-event');

      eventBus.emit('test-event');
      eventBus.emit('other-event');

      expect(handler1).toHaveBeenCalledTimes(1); // Only from other-event
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should remove all listeners when no event specified', () => {
      const handler = vi.fn();

      eventBus.on('event1', handler);
      eventBus.on('event2', handler);

      eventBus.removeAllListeners();

      eventBus.emit('event1');
      eventBus.emit('event2');

      expect(handler).not.toHaveBeenCalled();
      expect(eventBus.eventNames()).toHaveLength(0);
    });
  });

  describe('Async Event Handling', () => {
    it('should handle async events', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      eventBus.on('async-event', handler);

      const result = await eventBus.emitAsync('async-event', 'data');

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('data');
    });

    it('should handle async events with multiple handlers', async () => {
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);

      eventBus.on('async-event', handler1);
      eventBus.on('async-event', handler2);

      const result = await eventBus.emitAsync('async-event', 'data');

      expect(result).toBe(true);
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });

    it('should handle errors in async handlers', async () => {
      const errorHandler = vi.fn();
      const eventBusWithErrorHandler = new EventBus({
        errorHandler,
      });

      const failingHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      eventBusWithErrorHandler.on('async-event', failingHandler);

      const result = await eventBusWithErrorHandler.emitAsync('async-event');

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'async-event',
        failingHandler
      );
    });

    it('should return false for async events with no handlers', async () => {
      const result = await eventBus.emitAsync('non-existent-event');

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle synchronous errors in handlers', () => {
      const errorHandler = vi.fn();
      const eventBusWithErrorHandler = new EventBus({
        errorHandler,
      });

      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });

      eventBusWithErrorHandler.on('test-event', failingHandler);

      const result = eventBusWithErrorHandler.emit('test-event');

      expect(result).toBe(false);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'test-event',
        failingHandler
      );
    });

    it('should continue executing other handlers when one fails', () => {
      const errorHandler = vi.fn();
      const eventBusWithErrorHandler = new EventBus({
        errorHandler,
      });

      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });
      const successHandler = vi.fn();

      eventBusWithErrorHandler.on('test-event', failingHandler);
      eventBusWithErrorHandler.on('test-event', successHandler);

      eventBusWithErrorHandler.emit('test-event', 'data');

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalledWith('data');
    });

    it('should use default error handler when none provided', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler failed');
      });

      eventBus.on('test-event', failingHandler);
      eventBus.emit('test-event');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in event handler for test-event:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Options', () => {
    it('should respect max listeners limit', () => {
      const limitedEventBus = new EventBus({ maxListeners: 2 });

      limitedEventBus.on('test-event', vi.fn());
      limitedEventBus.on('test-event', vi.fn());

      expect(() => limitedEventBus.on('test-event', vi.fn())).toThrow(
        'Maximum listeners (2) exceeded for event: test-event'
      );
    });

    it('should log events when logging is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const loggingEventBus = new EventBus({ enableLogging: true });

      const handler = vi.fn();
      loggingEventBus.on('test-event', handler);
      loggingEventBus.emit('test-event', 'arg1', 'arg2');

      expect(consoleSpy).toHaveBeenCalledWith('Event handler registered for: test-event');
      expect(consoleSpy).toHaveBeenCalledWith('Emitting event: test-event with 2 arguments');

      consoleSpy.mockRestore();
    });

    it('should use custom error handler', () => {
      const customErrorHandler = vi.fn();
      const customEventBus = new EventBus({
        errorHandler: customErrorHandler,
      });

      const failingHandler = vi.fn().mockImplementation(() => {
        throw new Error('Custom error');
      });

      customEventBus.on('test-event', failingHandler);
      customEventBus.emit('test-event');

      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'test-event',
        failingHandler
      );
    });
  });

  describe('Event Information', () => {
    it('should return list of event names', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());

      const eventNames = eventBus.eventNames();

      expect(eventNames).toContain('event1');
      expect(eventNames).toContain('event2');
      expect(eventNames).toHaveLength(2);
    });

    it('should return listener count for events', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      expect(eventBus.listenerCount('test-event')).toBe(2);
      expect(eventBus.listenerCount('non-existent')).toBe(0);
    });

    it('should return listeners for an event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test-event', handler1);
      eventBus.on('test-event', handler2);

      const listeners = eventBus.listeners('test-event');

      expect(listeners).toContain(handler1);
      expect(listeners).toContain(handler2);
      expect(listeners).toHaveLength(2);
    });

    it('should check if event has listeners', () => {
      expect(eventBus.hasListeners('test-event')).toBe(false);

      eventBus.on('test-event', vi.fn());

      expect(eventBus.hasListeners('test-event')).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive statistics', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());

      const stats = eventBus.getStatistics();

      expect(stats.totalEvents).toBe(2);
      expect(stats.totalHandlers).toBe(3);
      expect(stats.eventCounts['event1']).toBe(2);
      expect(stats.eventCounts['event2']).toBe(1);
      expect(stats.averageHandlersPerEvent).toBe(1.5);
    });

    it('should handle empty event bus statistics', () => {
      const stats = eventBus.getStatistics();

      expect(stats.totalEvents).toBe(0);
      expect(stats.totalHandlers).toBe(0);
      expect(stats.averageHandlersPerEvent).toBe(0);
    });
  });

  describe('Advanced Features', () => {
    it('should wait for events', async () => {
      const promise = eventBus.waitFor('async-wait-event');

      setTimeout(() => {
        eventBus.emit('async-wait-event', 'result1', 'result2');
      }, 10);

      const result = await promise;

      expect(result).toEqual(['result1', 'result2']);
    });

    it('should timeout when waiting for events', async () => {
      const promise = eventBus.waitFor('never-emitted-event', 50);

      await expect(promise).rejects.toThrow('Timeout waiting for event: never-emitted-event');
    });

    it('should create filtered event buses', () => {
      const handler = vi.fn();
      const filteredBus = eventBus.filter('test-event', (data) => data === 'allowed');

      filteredBus.on('test-event', handler);

      eventBus.emit('test-event', 'not-allowed');
      eventBus.emit('test-event', 'allowed');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('allowed');
    });

    it('should dispose properly', () => {
      eventBus.on('event1', vi.fn());
      eventBus.on('event2', vi.fn());

      eventBus.dispose();

      expect(eventBus.eventNames()).toHaveLength(0);
    });
  });

  describe('Namespaced Event Bus', () => {
    let namespacedBus: NamespacedEventBus;

    beforeEach(() => {
      namespacedBus = eventBus.createNamespace('test-namespace');
    });

    it('should create namespaced events', () => {
      const handler = vi.fn();
      namespacedBus.on('local-event', handler);

      // Should work through namespaced bus
      namespacedBus.emit('local-event', 'data');
      expect(handler).toHaveBeenCalledWith('data');

      // Should also work through parent bus with full name
      eventBus.emit('test-namespace:local-event', 'data2');
      expect(handler).toHaveBeenCalledWith('data2');
    });

    it('should handle once events in namespace', () => {
      const handler = vi.fn();
      namespacedBus.once('once-event', handler);

      namespacedBus.emit('once-event');
      namespacedBus.emit('once-event');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should remove namespaced handlers', () => {
      const handler = vi.fn();
      namespacedBus.on('remove-event', handler);

      const removed = namespacedBus.off('remove-event', handler);

      expect(removed).toBe(true);
      namespacedBus.emit('remove-event');
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle async namespaced events', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      namespacedBus.on('async-namespace-event', handler);

      const result = await namespacedBus.emitAsync('async-namespace-event', 'data');

      expect(result).toBe(true);
      expect(handler).toHaveBeenCalledWith('data');
    });

    it('should provide correct listener count', () => {
      namespacedBus.on('count-event', vi.fn());
      namespacedBus.on('count-event', vi.fn());

      expect(namespacedBus.listenerCount('count-event')).toBe(2);
    });

    it('should check for listeners correctly', () => {
      expect(namespacedBus.hasListeners('check-event')).toBe(false);

      namespacedBus.on('check-event', vi.fn());

      expect(namespacedBus.hasListeners('check-event')).toBe(true);
    });

    it('should wait for namespaced events', async () => {
      const promise = namespacedBus.waitFor('namespace-wait-event');

      setTimeout(() => {
        namespacedBus.emit('namespace-wait-event', 'namespace-result');
      }, 10);

      const result = await promise;

      expect(result).toEqual(['namespace-result']);
    });
  });
});