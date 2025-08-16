/**
 * IntuitionAPI - Level 5: Intuition Access
 * 
 * Public API class for intuition operations. Provides clean interface
 * while delegating implementation to IntuitionManager.
 */

import type { 
  Intuition 
} from '../types.js';
import type { IntuitionManager } from '../levels/intuition/IntuitionManager.js';

export class IntuitionAPI {
  constructor(private manager: IntuitionManager) {}

  /**
   * Recognize patterns and return matching intuition
   * @param pattern Pattern string to match against existing intuitions
   * @returns Matching intuition or null if not found
   */
  recognize(pattern: string): Intuition | null {
    return this.manager.recognize(pattern);
  }

  /**
   * Build new intuition from successful experiences
   * @param experiences Array of experience IDs to analyze
   * @param pattern Optional pattern description
   * @param trigger Optional trigger conditions
   * @returns Created intuition
   */
  buildIntuition(
    experiences: string[], 
    pattern?: string, 
    trigger?: string[]
  ): Intuition {
    return this.manager.buildIntuition(experiences, pattern, trigger);
  }

  /**
   * Get shortcut path for given trigger
   * @param trigger Trigger string to match
   * @returns Shortcut path array or null if no match
   */
  getShortcut(trigger: string): string[] | null {
    return this.manager.getShortcut(trigger);
  }

  /**
   * Strengthen an existing intuition based on positive feedback
   * @param intuitionId ID of the intuition to strengthen
   * @param strengthAmount Optional amount to strengthen (default: 0.05)
   */
  strengthenIntuition(intuitionId: string, strengthAmount = 0.05): void {
    return this.manager.strengthenIntuition(intuitionId, strengthAmount);
  }

  /**
   * Weaken an intuition based on negative feedback
   * @param intuitionId ID of the intuition to weaken
   * @param weakenAmount Optional amount to weaken (default: 0.1)
   */
  weakenIntuition(intuitionId: string, weakenAmount = 0.1): void {
    return this.manager.weakenIntuition(intuitionId, weakenAmount);
  }

  /**
   * Get confidence level for a specific intuition
   * @param intuitionId ID of the intuition
   * @returns Confidence value (0-1) or 0 if not found
   */
  getConfidence(intuitionId: string): number {
    return this.manager.getConfidence(intuitionId);
  }

  /**
   * Get success rate for a specific intuition
   * @param intuitionId ID of the intuition
   * @returns Success rate (0-1) or 0 if not found
   */
  getSuccessRate(intuitionId: string): number {
    return this.manager.getSuccessRate(intuitionId);
  }

  /**
   * Prune unreliable intuitions below confidence threshold
   * @param threshold Minimum confidence threshold (default: 0.3)
   * @returns Number of intuitions removed
   */
  pruneUnreliable(threshold = 0.3): number {
    return this.manager.pruneUnreliable(threshold);
  }

  /**
   * Get intuition by ID
   * @param id Intuition ID
   * @returns Intuition object or null if not found
   */
  getIntuition(id: string): Intuition | null {
    return this.manager.getIntuition(id);
  }

  /**
   * Get all intuitions with optional filtering
   * @param options Filtering options
   * @returns Array of intuitions
   */
  getAllIntuitions(options?: {
    minConfidence?: number;
    minSuccessRate?: number;
    pattern?: string;
    sortBy?: 'confidence' | 'successRate' | 'usageCount' | 'created';
    limit?: number;
  }): Intuition[] {
    return this.manager.getAllIntuitions(options);
  }

  /**
   * Update an existing intuition
   * @param id Intuition ID
   * @param updates Partial updates to apply
   * @returns True if update was successful
   */
  updateIntuition(id: string, updates: Partial<Intuition>): boolean {
    return this.manager.updateIntuition(id, updates);
  }

  /**
   * Delete an intuition
   * @param id Intuition ID
   * @returns True if deletion was successful
   */
  deleteIntuition(id: string): boolean {
    return this.manager.deleteIntuition(id);
  }

  /**
   * Get intuition metrics
   * @returns Intuition metrics object
   */
  getMetrics() {
    return this.manager.getMetrics();
  }
}