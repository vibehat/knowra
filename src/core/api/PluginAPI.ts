/**
 * PluginAPI - Plugin System Management
 * 
 * Public API class for plugin operations. Provides clean interface
 * for managing the plugin system.
 */

import type { 
  Plugin, 
  PluginInfo 
} from '../types.js';

export class PluginAPI {
  constructor(
    private pluginRegistry: Map<string, Plugin>,
    private eventHandlers: Map<string, Array<(...args: unknown[]) => void>>,
    private initCallback: (plugin: Plugin) => void
  ) {}

  /**
   * Register a new plugin
   * @param plugin Plugin to register
   */
  register(plugin: Plugin): void {
    this.pluginRegistry.set(plugin.name, plugin);
    if (plugin.init) {
      this.initCallback(plugin);
    }
  }

  /**
   * Enable a registered plugin
   * @param name Plugin name
   * @param config Optional configuration
   */
  enable(name: string, config?: unknown): void {
    const plugin = this.pluginRegistry.get(name);
    if (plugin?.enable) {
      plugin.enable();
    }
  }

  /**
   * Disable a plugin
   * @param name Plugin name
   */
  disable(name: string): void {
    const plugin = this.pluginRegistry.get(name);
    if (plugin?.disable) {
      plugin.disable();
    }
  }

  /**
   * List all registered plugins
   * @returns Array of plugin information
   */
  list(): PluginInfo[] {
    return Array.from(this.pluginRegistry.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      enabled: true, // Simplified - would track actual state
      enhances: plugin.enhances,
      dependencies: plugin.dependencies ?? [],
    }));
  }

  /**
   * Get a specific plugin by name
   * @param name Plugin name
   * @returns Plugin or undefined if not found
   */
  get(name: string): Plugin | undefined {
    return this.pluginRegistry.get(name);
  }

  /**
   * Check if a plugin is registered
   * @param name Plugin name
   * @returns True if plugin is registered
   */
  has(name: string): boolean {
    return this.pluginRegistry.has(name);
  }

  /**
   * Unregister a plugin
   * @param name Plugin name
   * @returns True if plugin was removed
   */
  unregister(name: string): boolean {
    const plugin = this.pluginRegistry.get(name);
    if (plugin?.cleanup) {
      plugin.cleanup();
    }
    return this.pluginRegistry.delete(name);
  }

  /**
   * Get plugins that enhance a specific level
   * @param level Knowledge level ('information', 'knowledge', 'experience', 'strategy', 'intuition')
   * @returns Array of plugins
   */
  getPluginsForLevel(level: string): Plugin[] {
    return Array.from(this.pluginRegistry.values())
      .filter(plugin => plugin.enhances?.includes(level));
  }

  /**
   * Register event handler for plugin system
   * @param event Event name
   * @param handler Event handler function
   */
  on(event: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Remove event handler
   * @param event Event name
   * @param handler Event handler function
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
   * Emit event to all registered handlers
   * @param event Event name
   * @param args Event arguments
   */
  emit(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }
}