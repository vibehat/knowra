/**
 * SuggestionEngine - ML-enhanced suggestion system for path recommendations
 * 
 * Provides intelligent suggestions based on successful experiences and graph structure
 */

import type { Experience } from '../../types.js';
import type { GraphFoundationAPI } from '../../types.js';

export interface SuggestionEngineConfig {
  defaultLimit?: number;
  minConfidence?: number;
  recencyWeightFactor?: number;
  contextMatchBonus?: number;
  maxDaysForRecency?: number;
}

export interface SuggestionOptions {
  context?: string;
  limit?: number;
  minConfidence?: number;
  includeReasoningPath?: boolean;
}

export interface Suggestion {
  nodeId: string;
  confidence: number;
  reasoning?: string;
}

export class SuggestionEngine {
  private experiences: Map<string, Experience>;
  private graph: GraphFoundationAPI;
  private config: Required<SuggestionEngineConfig>;

  constructor(
    experiences: Map<string, Experience>, 
    graph: GraphFoundationAPI,
    config: SuggestionEngineConfig = {}
  ) {
    this.experiences = experiences;
    this.graph = graph;
    this.config = {
      defaultLimit: 5,
      minConfidence: 0.1,
      recencyWeightFactor: 0.2,
      contextMatchBonus: 0.3,
      maxDaysForRecency: 30,
      ...config,
    };
  }

  /**
   * Get suggestions for next nodes based on current position
   */
  getSuggestions(currentNode: string, options?: SuggestionOptions): Suggestion[] {
    if (!this.graph.hasNode(currentNode)) {
      return [];
    }

    const opts = {
      limit: this.config.defaultLimit,
      minConfidence: this.config.minConfidence,
      includeReasoningPath: false,
      ...options,
    };

    const suggestions = new Map<string, { score: number; reasons: string[] }>();

    // Analyze successful experiences
    for (const experience of this.experiences.values()) {
      if (experience.outcome !== 'success') continue;

      const nodeIndex = experience.path.indexOf(currentNode);
      if (nodeIndex === -1 || nodeIndex === experience.path.length - 1) continue;

      // Context matching
      if (opts.context) {
        const contextSimilarity = this.calculateContextSimilarity(
          opts.context, 
          experience.context
        );
        if (contextSimilarity < 0.3) continue;
      }

      const nextNode = experience.path[nodeIndex + 1];
      if (!nextNode || !this.graph.hasNode(nextNode)) continue;

      const existing = suggestions.get(nextNode) ?? { score: 0, reasons: [] };
      
      // Calculate suggestion score
      let score = experience.reinforcement * (experience.confidence ?? 0.5);
      
      // Apply recency bonus
      score *= this.calculateRecencyMultiplier(experience.timestamp);
      
      // Apply context bonus
      if (opts.context) {
        const contextSimilarity = this.calculateContextSimilarity(opts.context, experience.context);
        score *= (1 + contextSimilarity * this.config.contextMatchBonus);
      }

      existing.score += score;
      existing.reasons.push(
        `Path from ${experience.context} (confidence: ${(experience.confidence ?? 0.5).toFixed(2)})`
      );

      suggestions.set(nextNode, existing);
    }

    // Convert to result format and sort
    const results = Array.from(suggestions.entries())
      .map(([nodeId, { score, reasons }]) => ({
        nodeId,
        confidence: Math.min(1, score / 2), // Normalize confidence
        reasoning: opts.includeReasoningPath ? reasons.join('; ') : undefined,
      }))
      .filter(result => result.confidence >= opts.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, opts.limit);

    return results;
  }

  /**
   * Get suggestions based on context patterns
   */
  getContextualSuggestions(context: string, options?: Omit<SuggestionOptions, 'context'>): Suggestion[] {
    const opts = {
      limit: this.config.defaultLimit,
      minConfidence: this.config.minConfidence,
      includeReasoningPath: false,
      ...options,
    };

    const suggestions = new Map<string, { score: number; reasons: string[] }>();

    // Find experiences with similar contexts
    for (const experience of this.experiences.values()) {
      if (experience.outcome !== 'success') continue;

      const contextSimilarity = this.calculateContextSimilarity(context, experience.context);
      if (contextSimilarity < 0.5) continue;

      // Suggest starting nodes from similar contexts
      const startNode = experience.path[0];
      if (!startNode || !this.graph.hasNode(startNode)) continue;

      const existing = suggestions.get(startNode) ?? { score: 0, reasons: [] };
      
      let score = experience.reinforcement * contextSimilarity * (experience.confidence ?? 0.5);
      score *= this.calculateRecencyMultiplier(experience.timestamp);

      existing.score += score;
      existing.reasons.push(
        `Similar context: ${experience.context} (similarity: ${contextSimilarity.toFixed(2)})`
      );

      suggestions.set(startNode, existing);
    }

    // Convert and sort results
    const results = Array.from(suggestions.entries())
      .map(([nodeId, { score, reasons }]) => ({
        nodeId,
        confidence: Math.min(1, score),
        reasoning: opts.includeReasoningPath ? reasons.join('; ') : undefined,
      }))
      .filter(result => result.confidence >= opts.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, opts.limit);

    return results;
  }

  /**
   * Get suggestions for completing a partial path
   */
  getPathCompletionSuggestions(
    partialPath: string[], 
    options?: SuggestionOptions
  ): Suggestion[] {
    if (partialPath.length === 0) return [];

    const opts = {
      limit: this.config.defaultLimit,
      minConfidence: this.config.minConfidence,
      includeReasoningPath: false,
      ...options,
    };

    const suggestions = new Map<string, { score: number; reasons: string[] }>();

    // Find experiences that start with this partial path
    for (const experience of this.experiences.values()) {
      if (experience.outcome !== 'success') continue;
      if (experience.path.length <= partialPath.length) continue;

      // Check if experience path starts with partial path
      const pathMatches = partialPath.every((node, index) => 
        experience.path[index] === node
      );
      if (!pathMatches) continue;

      // Context matching
      if (opts.context) {
        const contextSimilarity = this.calculateContextSimilarity(
          opts.context, 
          experience.context
        );
        if (contextSimilarity < 0.3) continue;
      }

      // Suggest the next node(s) after the partial path
      for (let i = partialPath.length; i < experience.path.length; i++) {
        const nextNode = experience.path[i];
        if (!this.graph.hasNode(nextNode)) continue;

        const existing = suggestions.get(nextNode) ?? { score: 0, reasons: [] };
        
        // Score based on position (earlier suggestions get higher scores)
        const positionWeight = 1 / (i - partialPath.length + 1);
        let score = experience.reinforcement * positionWeight * (experience.confidence ?? 0.5);
        
        score *= this.calculateRecencyMultiplier(experience.timestamp);

        existing.score += score;
        existing.reasons.push(
          `Completion from ${experience.context} (step ${i - partialPath.length + 1})`
        );

        suggestions.set(nextNode, existing);
      }
    }

    // Convert and sort results
    const results = Array.from(suggestions.entries())
      .map(([nodeId, { score, reasons }]) => ({
        nodeId,
        confidence: Math.min(1, score),
        reasoning: opts.includeReasoningPath ? reasons.join('; ') : undefined,
      }))
      .filter(result => result.confidence >= opts.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, opts.limit);

    return results;
  }

  /**
   * Get alternative suggestions when current path fails
   */
  getAlternativeSuggestions(
    failedPath: string[], 
    options?: SuggestionOptions
  ): Suggestion[] {
    if (failedPath.length === 0) return [];

    const opts = {
      limit: this.config.defaultLimit,
      minConfidence: this.config.minConfidence,
      includeReasoningPath: false,
      ...options,
    };

    const suggestions = new Map<string, { score: number; reasons: string[] }>();

    // Find successful experiences that start similarly but diverge
    for (const experience of this.experiences.values()) {
      if (experience.outcome !== 'success') continue;

      // Find common prefix with failed path
      let commonLength = 0;
      const maxLength = Math.min(failedPath.length, experience.path.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (failedPath[i] === experience.path[i]) {
          commonLength++;
        } else {
          break;
        }
      }

      // Need at least some common prefix (minimum 1 node)
      if (commonLength < Math.min(1, failedPath.length)) continue;

      // Context matching
      if (opts.context) {
        const contextSimilarity = this.calculateContextSimilarity(
          opts.context, 
          experience.context
        );
        if (contextSimilarity < 0.3) continue;
      }

      // Suggest the divergent path
      if (commonLength < experience.path.length) {
        const alternativeNode = experience.path[commonLength];
        if (!this.graph.hasNode(alternativeNode)) continue;

        const existing = suggestions.get(alternativeNode) ?? { score: 0, reasons: [] };
        
        // Score based on how much common prefix we have
        const prefixRatio = commonLength / Math.max(failedPath.length, experience.path.length);
        let score = experience.reinforcement * prefixRatio * (experience.confidence ?? 0.5);
        
        score *= this.calculateRecencyMultiplier(experience.timestamp);

        existing.score += score;
        existing.reasons.push(
          `Alternative after ${commonLength} common steps from ${experience.context}`
        );

        suggestions.set(alternativeNode, existing);
      }
    }

    // Convert and sort results
    const results = Array.from(suggestions.entries())
      .map(([nodeId, { score, reasons }]) => ({
        nodeId,
        confidence: Math.min(1, score),
        reasoning: opts.includeReasoningPath ? reasons.join('; ') : undefined,
      }))
      .filter(result => result.confidence >= opts.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, opts.limit);

    return results;
  }

  /**
   * Calculate context similarity
   */
  private calculateContextSimilarity(context1: string, context2: string): number {
    if (context1 === context2) return 1.0;

    const words1 = context1.toLowerCase().split(/\s+/);
    const words2 = context2.toLowerCase().split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate recency multiplier for experience timestamp
   */
  private calculateRecencyMultiplier(timestamp: Date): number {
    const daysSinceExperience = (Date.now() - timestamp.getTime()) / (24 * 60 * 60 * 1000);
    const recencyBonus = Math.max(0, 1 - daysSinceExperience / this.config.maxDaysForRecency);
    return 1 + recencyBonus * this.config.recencyWeightFactor;
  }

  /**
   * Get suggestion statistics
   */
  getStatistics(): {
    totalSuggestibleNodes: number;
    experiencesUsedForSuggestions: number;
    averageConfidenceThreshold: number;
    topContexts: Array<{ context: string; count: number }>;
  } {
    const successfulExperiences = Array.from(this.experiences.values())
      .filter(exp => exp.outcome === 'success');

    const contexts = new Map<string, number>();
    const suggestibleNodes = new Set<string>();

    for (const experience of successfulExperiences) {
      contexts.set(experience.context, (contexts.get(experience.context) ?? 0) + 1);
      
      for (const node of experience.path) {
        if (this.graph.hasNode(node)) {
          suggestibleNodes.add(node);
        }
      }
    }

    const topContexts = Array.from(contexts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([context, count]) => ({ context, count }));

    return {
      totalSuggestibleNodes: suggestibleNodes.size,
      experiencesUsedForSuggestions: successfulExperiences.length,
      averageConfidenceThreshold: this.config.minConfidence,
      topContexts,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SuggestionEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear suggestion cache (if any caching is implemented)
   */
  clearCache(): void {
    // Currently no caching implemented, but method available for future use
  }
}