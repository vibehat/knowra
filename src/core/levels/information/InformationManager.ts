/**
 * InformationManager - Level 1: Information API
 * 
 * Manages the foundational layer of information storage and retrieval
 */

import type { 
  Information, 
  SearchOptions, 
  InfoOperation, 
  BatchResult 
} from '../../types.js';
import { generateId, isValidId } from '../../utils.js';
import type { GraphFoundation } from '../../GraphFoundation.js';
import type { TextSearchManager } from '../../TextSearchManager.js';
import type { EventBus } from '../../orchestration/EventBus.js';

export interface InformationManagerDependencies {
  graphFoundation: GraphFoundation;
  textSearchManager: TextSearchManager;
  eventBus: EventBus;
  cleanupRelatedData: (nodeId: string) => void;
}

export class InformationManager {
  private dependencies: InformationManagerDependencies;

  constructor(dependencies: InformationManagerDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Add new information to the knowledge database
   * @param content The content to store
   * @param metadata Optional metadata for the information
   * @returns The ID of the created information node
   */
  add(content: unknown, metadata?: Partial<Information>): string {
    const id = generateId('info');
    const now = new Date();

    const info: Information = {
      id,
      content,
      type: metadata?.type ?? 'unknown',
      source: metadata?.source ?? undefined,
      created: now,
      modified: now,
      metadata: metadata?.metadata,
      ...metadata,
    };

    this.dependencies.graphFoundation.addNode(info);
    this.dependencies.textSearchManager.addNode(info);
    this.dependencies.eventBus.emit('information:afterAdd', info);

    return id;
  }

  /**
   * Get information by ID
   * @param id Information ID
   * @returns Information object or null if not found
   */
  get(id: string): Information | null {
    if (!isValidId(id)) return null;
    return this.dependencies.graphFoundation.getNode(id);
  }

  /**
   * Update existing information
   * @param id Information ID
   * @param updates Partial updates to apply
   * @returns True if update was successful
   */
  update(id: string, updates: Partial<Information>): boolean {
    if (!isValidId(id)) return false;

    const success = this.dependencies.graphFoundation.updateNode(id, updates);
    if (success) {
      const updated = this.dependencies.graphFoundation.getNode(id);
      if (updated) {
        this.dependencies.textSearchManager.updateNode(updated);
        this.dependencies.eventBus.emit('information:afterUpdate', updated);
      }
    }

    return success;
  }

  /**
   * Delete information by ID
   * @param id Information ID
   * @returns True if deletion was successful
   */
  delete(id: string): boolean {
    if (!isValidId(id)) return false;

    const deleted = this.dependencies.graphFoundation.deleteNode(id);
    if (deleted) {
      // Clean up related data
      this.dependencies.textSearchManager.removeNode(id);
      this.dependencies.cleanupRelatedData(id);
      this.dependencies.eventBus.emit('information:afterDelete', id);
    }

    return deleted;
  }

  /**
   * Search information by query
   * @param query Search query
   * @param options Search options
   * @returns Array of matching information objects
   */
  search(query: string, options?: SearchOptions): Information[] {
    if (!query.trim()) return [];

    // Use FlexSearch for better search performance and accuracy
    return this.dependencies.textSearchManager.search(query, options);
  }

  /**
   * Perform batch operations on information
   * @param operations Array of operations to perform
   * @returns Batch operation result
   */
  batch(operations: InfoOperation[]): BatchResult {
    const result: BatchResult = {
      success: true,
      processed: 0,
      errors: [],
      results: [],
    };

    for (const op of operations) {
      try {
        switch (op.operation) {
          case 'add':
            if (!op.data) throw new Error('Add operation requires data');
            const id = this.add(op.data.content, op.data);
            result.results.push(id);
            break;

          case 'update':
            if (!op.id || !op.data) throw new Error('Update operation requires id and data');
            const updated = this.update(op.id, op.data);
            if (!updated) throw new Error('Update failed');
            result.results.push(op.id);
            break;

          case 'delete':
            if (!op.id) throw new Error('Delete operation requires id');
            const deleted = this.delete(op.id);
            if (!deleted) throw new Error('Delete failed');
            result.results.push(op.id);
            break;
        }
        result.processed++;
      } catch (error) {
        result.success = false;
        result.errors.push({
          operation: op,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }
}