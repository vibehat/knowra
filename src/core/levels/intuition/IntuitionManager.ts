/**
 * IntuitionManager - Level 5: Intuition API
 * 
 * Manages intuitive shortcuts, pattern recognition, and intelligent predictions
 */

import type { 
  Intuition,
  Experience,
  Strategy
} from '../../types.js';
import { generateId, deepClone, validateConfidence } from '../../utils.js';
import type { EventBus } from '../../orchestration/EventBus.js';

export interface IntuitionManagerDependencies {
  eventBus: EventBus;
  intuitions: Map<string, Intuition>;
}

export class IntuitionManager {
  private dependencies: IntuitionManagerDependencies;

  constructor(dependencies: IntuitionManagerDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Recognize patterns and return matching intuition
   * @param pattern Pattern string to match against existing intuitions
   * @returns Matching intuition or null if not found
   */
  recognize(pattern: string): Intuition | null {
    if (!pattern || typeof pattern !== 'string' || pattern.trim() === '') {
      return null;
    }

    const normalizedPattern = pattern.toLowerCase().trim();

    for (const intuition of this.dependencies.intuitions.values()) {
      const intuitionPattern = intuition.pattern.toLowerCase();
      
      if (intuitionPattern.includes(normalizedPattern) || normalizedPattern.includes(intuitionPattern)) {
        // Increment usage count when pattern is recognized
        intuition.usageCount++;
        
        this.dependencies.eventBus.emit('intuition:afterRecognize', intuition, pattern);
        
        return deepClone(intuition);
      }
    }

    return null;
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
    if (!experiences || experiences.length === 0) {
      throw new Error('Experiences array cannot be empty');
    }

    // Validate experience IDs
    for (const expId of experiences) {
      if (!expId || typeof expId !== 'string') {
        throw new Error('All experience IDs must be valid strings');
      }
    }

    const id = generateId('intuition');
    
    // Generate pattern and trigger from experiences if not provided
    const generatedPattern = pattern ?? this.generatePatternFromExperiences(experiences);
    const generatedTrigger = trigger ?? this.generateTriggersFromExperiences(experiences);

    const intuition: Intuition = {
      id,
      pattern: generatedPattern,
      trigger: generatedTrigger,
      shortcut: experiences.slice(0, 3), // Take first 3 as shortcut path
      confidence: 0.7, // Initial confidence
      usageCount: 0,
      successRate: 0.8, // Initial success rate
    };

    this.dependencies.intuitions.set(id, intuition);
    this.dependencies.eventBus.emit('intuition:afterBuild', intuition);

    return deepClone(intuition);
  }

  /**
   * Get shortcut path for given trigger
   * @param trigger Trigger string to match
   * @returns Shortcut path array or null if no match
   */
  getShortcut(trigger: string): string[] | null {
    if (!trigger || typeof trigger !== 'string' || trigger.trim() === '') {
      return null;
    }

    const normalizedTrigger = trigger.toLowerCase().trim();

    for (const intuition of this.dependencies.intuitions.values()) {
      const matchesTrigger = intuition.trigger.some(t => {
        const normalizedT = t.toLowerCase();
        return normalizedT.includes(normalizedTrigger) || normalizedTrigger.includes(normalizedT);
      });

      if (matchesTrigger) {
        // Increment usage when shortcut is accessed
        intuition.usageCount++;
        
        this.dependencies.eventBus.emit('intuition:afterGetShortcut', intuition, trigger);
        
        return [...intuition.shortcut];
      }
    }

    return null;
  }

  /**
   * Strengthen an existing intuition based on positive feedback
   * @param intuitionId ID of the intuition to strengthen
   * @param strengthAmount Optional amount to strengthen (default: 0.05)
   */
  strengthenIntuition(intuitionId: string, strengthAmount = 0.05): void {
    if (!intuitionId || typeof intuitionId !== 'string') {
      throw new Error('Intuition ID must be a valid string');
    }

    if (typeof strengthAmount !== 'number' || strengthAmount <= 0 || strengthAmount > 0.5) {
      throw new Error('Strength amount must be a positive number <= 0.5');
    }

    const intuition = this.dependencies.intuitions.get(intuitionId);
    if (!intuition) {
      throw new Error(`Intuition '${intuitionId}' not found`);
    }

    const oldConfidence = intuition.confidence;
    const oldSuccessRate = intuition.successRate;

    intuition.confidence = validateConfidence(intuition.confidence + strengthAmount);
    intuition.successRate = validateConfidence(intuition.successRate + (strengthAmount * 0.4));

    this.dependencies.eventBus.emit('intuition:afterStrengthen', {
      intuitionId,
      oldConfidence,
      newConfidence: intuition.confidence,
      oldSuccessRate,
      newSuccessRate: intuition.successRate,
    });
  }

  /**
   * Weaken an intuition based on negative feedback
   * @param intuitionId ID of the intuition to weaken
   * @param weakenAmount Optional amount to weaken (default: 0.1)
   */
  weakenIntuition(intuitionId: string, weakenAmount = 0.1): void {
    if (!intuitionId || typeof intuitionId !== 'string') {
      throw new Error('Intuition ID must be a valid string');
    }

    if (typeof weakenAmount !== 'number' || weakenAmount <= 0 || weakenAmount > 0.5) {
      throw new Error('Weaken amount must be a positive number <= 0.5');
    }

    const intuition = this.dependencies.intuitions.get(intuitionId);
    if (!intuition) {
      throw new Error(`Intuition '${intuitionId}' not found`);
    }

    const oldConfidence = intuition.confidence;
    const oldSuccessRate = intuition.successRate;

    intuition.confidence = validateConfidence(intuition.confidence - weakenAmount);
    intuition.successRate = validateConfidence(intuition.successRate - (weakenAmount * 0.6));

    this.dependencies.eventBus.emit('intuition:afterWeaken', {
      intuitionId,
      oldConfidence,
      newConfidence: intuition.confidence,
      oldSuccessRate,
      newSuccessRate: intuition.successRate,
    });
  }

  /**
   * Get confidence level for a specific intuition
   * @param intuitionId ID of the intuition
   * @returns Confidence value (0-1) or 0 if not found
   */
  getConfidence(intuitionId: string): number {
    if (!intuitionId || typeof intuitionId !== 'string') {
      return 0;
    }

    return this.dependencies.intuitions.get(intuitionId)?.confidence ?? 0;
  }

  /**
   * Get success rate for a specific intuition
   * @param intuitionId ID of the intuition
   * @returns Success rate (0-1) or 0 if not found
   */
  getSuccessRate(intuitionId: string): number {
    if (!intuitionId || typeof intuitionId !== 'string') {
      return 0;
    }

    return this.dependencies.intuitions.get(intuitionId)?.successRate ?? 0;
  }

  /**
   * Prune unreliable intuitions below confidence threshold
   * @param threshold Minimum confidence threshold (default: 0.3)
   * @returns Number of intuitions removed
   */
  pruneUnreliable(threshold = 0.3): number {
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      threshold = 0.3; // Use safe default
    }

    let removed = 0;
    const toRemove: string[] = [];

    for (const [id, intuition] of this.dependencies.intuitions.entries()) {
      if (intuition.confidence < threshold) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      if (this.dependencies.intuitions.delete(id)) {
        removed++;
        this.dependencies.eventBus.emit('intuition:afterPrune', id);
      }
    }

    return removed;
  }

  /**
   * Get intuition by ID
   * @param id Intuition ID
   * @returns Intuition object or null if not found
   */
  getIntuition(id: string): Intuition | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    const intuition = this.dependencies.intuitions.get(id);
    return intuition ? deepClone(intuition) : null;
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
    let intuitions = Array.from(this.dependencies.intuitions.values());

    // Apply filters
    if (options?.minConfidence !== undefined) {
      intuitions = intuitions.filter(i => i.confidence >= options.minConfidence!);
    }

    if (options?.minSuccessRate !== undefined) {
      intuitions = intuitions.filter(i => i.successRate >= options.minSuccessRate!);
    }

    if (options?.pattern) {
      const searchPattern = options.pattern.toLowerCase();
      intuitions = intuitions.filter(i => 
        i.pattern.toLowerCase().includes(searchPattern) ||
        i.trigger.some(t => t.toLowerCase().includes(searchPattern))
      );
    }

    // Sort
    if (options?.sortBy) {
      switch (options.sortBy) {
        case 'confidence':
          intuitions.sort((a, b) => b.confidence - a.confidence);
          break;
        case 'successRate':
          intuitions.sort((a, b) => b.successRate - a.successRate);
          break;
        case 'usageCount':
          intuitions.sort((a, b) => b.usageCount - a.usageCount);
          break;
      }
    }

    // Apply limit
    if (options?.limit && options.limit > 0) {
      intuitions = intuitions.slice(0, options.limit);
    }

    return intuitions.map(i => deepClone(i));
  }

  /**
   * Update an existing intuition
   * @param id Intuition ID
   * @param updates Partial updates to apply
   * @returns True if update was successful
   */
  updateIntuition(id: string, updates: Partial<Intuition>): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const intuition = this.dependencies.intuitions.get(id);
    if (!intuition) {
      return false;
    }

    const oldIntuition = deepClone(intuition);

    // Apply updates with validation
    if (updates.pattern !== undefined) {
      intuition.pattern = updates.pattern;
    }

    if (updates.trigger !== undefined) {
      intuition.trigger = updates.trigger;
    }

    if (updates.shortcut !== undefined) {
      intuition.shortcut = updates.shortcut;
    }

    if (updates.confidence !== undefined) {
      intuition.confidence = validateConfidence(updates.confidence);
    }

    if (updates.successRate !== undefined) {
      intuition.successRate = validateConfidence(updates.successRate);
    }

    if (updates.usageCount !== undefined) {
      intuition.usageCount = Math.max(0, updates.usageCount);
    }

    this.dependencies.eventBus.emit('intuition:afterUpdate', oldIntuition, intuition);

    return true;
  }

  /**
   * Delete an intuition
   * @param id Intuition ID
   * @returns True if deletion was successful
   */
  deleteIntuition(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const deleted = this.dependencies.intuitions.delete(id);
    if (deleted) {
      this.dependencies.eventBus.emit('intuition:afterDelete', id);
    }

    return deleted;
  }

  /**
   * Get intuition metrics
   * @returns Intuition metrics object
   */
  getMetrics() {
    const intuitions = Array.from(this.dependencies.intuitions.values());

    if (intuitions.length === 0) {
      return {
        totalIntuitions: 0,
        averageConfidence: 0,
        averageSuccessRate: 0,
        totalUsage: 0,
        mostUsedPatterns: [],
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
      };
    }

    const totalIntuitions = intuitions.length;
    const totalConfidence = intuitions.reduce((sum, i) => sum + i.confidence, 0);
    const totalSuccessRate = intuitions.reduce((sum, i) => sum + i.successRate, 0);
    const totalUsage = intuitions.reduce((sum, i) => sum + i.usageCount, 0);

    // Confidence distribution
    const confidenceDistribution = {
      high: intuitions.filter(i => i.confidence >= 0.7).length,
      medium: intuitions.filter(i => i.confidence >= 0.4 && i.confidence < 0.7).length,
      low: intuitions.filter(i => i.confidence < 0.4).length,
    };

    // Most used patterns
    const mostUsedPatterns = intuitions
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(i => ({
        pattern: i.pattern,
        usageCount: i.usageCount,
        confidence: i.confidence,
      }));

    return {
      totalIntuitions,
      averageConfidence: totalConfidence / totalIntuitions,
      averageSuccessRate: totalSuccessRate / totalIntuitions,
      totalUsage,
      mostUsedPatterns,
      confidenceDistribution,
    };
  }

  /**
   * Generate pattern description from experiences
   * @param experiences Array of experience IDs
   * @returns Generated pattern string
   */
  private generatePatternFromExperiences(experiences: string[]): string {
    // Simplified pattern generation
    if (experiences.length === 1) {
      return 'Single experience pattern';
    } else if (experiences.length <= 3) {
      return 'Short sequence pattern';
    } else {
      return 'Complex multi-step pattern';
    }
  }

  /**
   * Generate trigger conditions from experiences
   * @param experiences Array of experience IDs
   * @returns Generated trigger array
   */
  private generateTriggersFromExperiences(experiences: string[]): string[] {
    // Simplified trigger generation
    const triggers = ['common', 'pattern'];
    
    if (experiences.length > 3) {
      triggers.push('complex');
    }
    
    if (experiences.length > 5) {
      triggers.push('advanced');
    }

    return triggers;
  }
}