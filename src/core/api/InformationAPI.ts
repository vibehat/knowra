/**
 * InformationAPI - Level 1: Information Management
 * 
 * Public API class for information operations. Provides clean interface
 * while delegating implementation to InformationManager.
 */

import type { 
  Information, 
  SearchOptions, 
  InfoOperation, 
  BatchResult 
} from '../types.js';
import type { InformationManager } from '../levels/information/InformationManager.js';

export class InformationAPI {
  constructor(private manager: InformationManager) {}

  /**
   * Add new information to the knowledge database
   * @param content The content to store
   * @param metadata Optional metadata for the information
   * @returns The ID of the created information node
   */
  add(content: unknown, metadata?: Partial<Information>): string {
    return this.manager.add(content, metadata);
  }

  /**
   * Get information by ID
   * @param id Information ID
   * @returns Information object or null if not found
   */
  get(id: string): Information | null {
    return this.manager.get(id);
  }

  /**
   * Update existing information
   * @param id Information ID
   * @param updates Partial updates to apply
   * @returns True if update was successful
   */
  update(id: string, updates: Partial<Information>): boolean {
    return this.manager.update(id, updates);
  }

  /**
   * Delete information by ID
   * @param id Information ID
   * @returns True if deletion was successful
   */
  delete(id: string): boolean {
    return this.manager.delete(id);
  }

  /**
   * Search information by query
   * @param query Search query
   * @param options Search options
   * @returns Array of matching information objects
   */
  search(query: string, options?: SearchOptions): Information[] {
    return this.manager.search(query, options);
  }

  /**
   * Perform batch operations on information
   * @param operations Array of operations to perform
   * @returns Batch operation result
   */
  batch(operations: InfoOperation[]): BatchResult {
    return this.manager.batch(operations);
  }
}