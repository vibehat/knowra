/**
 * ExperienceAPI - Level 3: Experience Tracking
 * 
 * Public API class for experience operations. Provides clean interface
 * while delegating implementation to ExperienceManager.
 */

import type { 
  Experience, 
  ExperienceMetrics, 
  ReinforcementOptions, 
  SuggestionOptions, 
  Suggestion 
} from '../types.js';
import type { ExperienceManager } from '../levels/experience/ExperienceManager.js';

export class ExperienceAPI {
  constructor(private manager: ExperienceManager) {}

  /**
   * Record a path with enhanced validation and auto-detection
   * @param path Array of node IDs representing the traversed path
   * @param context Description of what was being explored
   * @param outcome Final outcome of the traversal
   * @param feedback Optional feedback about the experience
   * @param metadata Optional metadata for the experience
   * @returns Experience ID
   */
  recordPath(
    path: string[],
    context: string,
    outcome: 'success' | 'failure' | 'neutral',
    feedback?: string,
    metadata?: Record<string, unknown>
  ): string {
    return this.manager.recordPath(path, context, outcome, feedback, metadata);
  }

  /**
   * Get a single experience by ID
   * @param id Experience ID
   * @returns Experience object or null if not found
   */
  getExperience(id: string): Experience | null {
    return this.manager.getExperience(id);
  }

  /**
   * Get experiences with enhanced filtering and pagination
   * @param options Filtering and pagination options
   * @returns Array of matching experiences
   */
  getExperiences(options?: {
    nodeId?: string;
    context?: string;
    outcome?: 'success' | 'failure' | 'neutral';
    timeRange?: { start: Date; end: Date };
    minConfidence?: number;
    limit?: number;
    offset?: number;
  }): Experience[] {
    return this.manager.getExperiences(options);
  }

  /**
   * Learn from feedback on an experience
   * @param experienceId Experience ID to update
   * @param feedback Learning feedback
   */
  learnFrom(experienceId: string, feedback: string): void {
    return this.manager.learnFrom(experienceId, feedback);
  }

  /**
   * Reinforce path with sophisticated algorithms
   * @param path Path to reinforce
   * @param weight Reinforcement weight
   * @param options Reinforcement options
   */
  reinforcePath(
    path: string[],
    weight: number,
    options?: ReinforcementOptions
  ): void {
    return this.manager.reinforcePath(path, weight, options);
  }

  /**
   * Get intelligent suggestions based on context and history
   * @param currentNode Current node ID
   * @param options Suggestion options
   * @returns Array of suggestions
   */
  getSuggestions(currentNode: string, options?: SuggestionOptions): Suggestion[] {
    return this.manager.getSuggestions(currentNode, options);
  }

  /**
   * Get suggestions based on context
   * @param context Context description
   * @param options Suggestion options
   * @returns Array of suggestions
   */
  getContextualSuggestions(context: string, options?: Omit<SuggestionOptions, 'context'>): Suggestion[] {
    return this.manager.getContextualSuggestions(context, options);
  }

  /**
   * Get path completion suggestions
   * @param partialPath Partial path to complete
   * @param options Suggestion options
   * @returns Array of suggestions for completion
   */
  getPathCompletionSuggestions(partialPath: string[], options?: SuggestionOptions): Suggestion[] {
    return this.manager.getPathCompletionSuggestions(partialPath, options);
  }

  /**
   * Get comprehensive experience metrics
   * @returns Experience metrics object
   */
  getMetrics(): ExperienceMetrics {
    return this.manager.getMetrics();
  }

  /**
   * Forget old experiences to manage memory
   * @param criteria Criteria for forgetting experiences
   * @returns Number of experiences removed
   */
  forgetOld(criteria: {
    olderThan?: Date;
    outcome?: 'success' | 'failure' | 'neutral';
    maxToRemove?: number;
  }): number {
    return this.manager.forgetOld(criteria);
  }

  /**
   * Get PathTracker statistics
   * @returns PathTracker statistics
   */
  getPathTrackingStats() {
    return this.manager.getPathTrackingStats();
  }

  /**
   * Start a new path in PathTracker
   * @param context Path context
   * @param initialNode Optional initial node
   * @param metadata Optional metadata
   * @returns Path ID
   */
  startPath(context: string, initialNode?: string, metadata?: Record<string, unknown>): string {
    return this.manager.startPath(context, initialNode, metadata);
  }

  /**
   * Add node to active path
   * @param pathId Path ID
   * @param nodeId Node to add
   * @param metadata Optional metadata
   */
  addToPath(pathId: string, nodeId: string, metadata?: Record<string, unknown>): void {
    return this.manager.addToPath(pathId, nodeId, metadata);
  }

  /**
   * Complete a path in PathTracker
   * @param pathId Path ID
   * @param outcome Path outcome
   * @param feedback Optional feedback
   * @returns Experience ID
   */
  completePath(pathId: string, outcome: 'success' | 'failure' | 'neutral', feedback?: string): string {
    return this.manager.completePath(pathId, outcome, feedback);
  }

  // Aliases for backward compatibility with old object literal API
  startPathTracking(context: string, initialNode?: string, metadata?: Record<string, unknown>): string {
    return this.startPath(context, initialNode, metadata);
  }

  completePathTracking(pathId: string, outcome: 'success' | 'failure' | 'neutral', feedback?: string): string {
    return this.completePath(pathId, outcome, feedback);
  }
}