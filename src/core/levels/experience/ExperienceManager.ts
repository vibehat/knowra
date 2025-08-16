/**
 * ExperienceManager - Level 3: Experience API
 * 
 * Manages experience recording, learning, and intelligent suggestions
 */

import type { 
  Experience, 
  ExperienceMetrics,
  ReinforcementOptions,
  SuggestionOptions,
  Suggestion
} from '../../types.js';
import { generateId, deepClone } from '../../utils.js';
import type { GraphFoundation } from '../../GraphFoundation.js';
import type { EventBus } from '../../orchestration/EventBus.js';
import type { PathTracker } from '../experience/PathTracker.js';
import type { PatternDetector } from './PatternDetector.js';
import type { InsightExtractor } from './InsightExtractor.js';
import type { LearningEngine } from './LearningEngine.js';
import type { SuggestionEngine } from './SuggestionEngine.js';

export interface ExperienceManagerDependencies {
  graphFoundation: GraphFoundation;
  eventBus: EventBus;
  pathTracker: PathTracker;
  patternDetector: PatternDetector;
  insightExtractor: InsightExtractor;
  learningEngine: LearningEngine;
  suggestionEngine: SuggestionEngine;
  experiences: Map<string, Experience>;
}

export class ExperienceManager {
  private dependencies: ExperienceManagerDependencies;

  constructor(dependencies: ExperienceManagerDependencies) {
    this.dependencies = dependencies;
  }

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
    // Enhanced validation
    if (!path || path.length === 0) {
      throw new Error('Path must contain at least one node');
    }

    if (!context || typeof context !== 'string' || context.trim() === '') {
      throw new Error('Context must be a non-empty string');
    }

    // Validate outcome
    if (!['success', 'failure', 'neutral'].includes(outcome)) {
      throw new Error('Outcome must be success, failure, or neutral');
    }

    // Validate all nodes exist
    for (const nodeId of path) {
      if (!this.dependencies.graphFoundation.hasNode(nodeId)) {
        throw new Error(`Node '${nodeId}' does not exist in graph`);
      }
    }

    const id = generateId('exp');
    const now = new Date();

    // Create enhanced experience
    const experience: Experience = {
      id,
      path: [...path],
      context: context.trim(),
      outcome,
      feedback: feedback ? feedback.trim() : undefined,
      timestamp: now,
      traversalTime: 0, // Default for manual recording
      reinforcement: this.dependencies.learningEngine.calculateInitialReinforcement(outcome, path.length),
      patterns: this.dependencies.patternDetector.detectPatterns(path, context),
      relatedExperiences: [],
      confidence: 0.6, // Will be calculated after creation
      metadata: metadata ? { ...metadata } : undefined,
    };

    // Calculate confidence after experience is fully created
    experience.confidence = this.dependencies.learningEngine.calculateExperienceConfidence(experience);
    
    // Find related experiences after creation
    experience.relatedExperiences = this.dependencies.learningEngine.findRelatedExperiences(experience);

    // Extract insights if enabled
    experience.insights = this.dependencies.insightExtractor.extractInsights(experience);

    this.dependencies.experiences.set(id, experience);
    this.dependencies.eventBus.emit('experience:afterRecord', experience);

    // Update reinforcement for related experiences
    this.dependencies.learningEngine.updateRelatedReinforcements(experience);

    return id;
  }

  /**
   * Get a single experience by ID
   * @param id Experience ID
   * @returns Experience object or null if not found
   */
  getExperience(id: string): Experience | null {
    const experience = this.dependencies.experiences.get(id);
    return experience ? deepClone(experience) : null;
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
    let filtered = Array.from(this.dependencies.experiences.values());

    if (options?.nodeId) {
      filtered = filtered.filter(exp => exp.path.includes(options.nodeId!));
    }

    if (options?.context) {
      filtered = filtered.filter(exp => 
        exp.context.toLowerCase().includes(options.context!.toLowerCase())
      );
    }

    if (options?.outcome) {
      filtered = filtered.filter(exp => exp.outcome === options.outcome);
    }

    if (options?.timeRange) {
      filtered = filtered.filter(exp => 
        exp.timestamp >= options.timeRange!.start && 
        exp.timestamp <= options.timeRange!.end
      );
    }

    if (options?.minConfidence) {
      filtered = filtered.filter(exp => 
        (exp.confidence ?? 0) >= options.minConfidence!
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? filtered.length;
    
    return filtered.slice(offset, offset + limit).map(exp => deepClone(exp));
  }

  /**
   * Learn from feedback on an experience
   * @param experienceId Experience ID to update
   * @param feedback Learning feedback
   */
  learnFrom(experienceId: string, feedback: string): void {
    if (!experienceId || typeof experienceId !== 'string') {
      throw new Error('Experience ID must be a valid string');
    }

    if (!feedback || typeof feedback !== 'string' || feedback.trim() === '') {
      throw new Error('Feedback must be a non-empty string');
    }

    const experience = this.dependencies.experiences.get(experienceId);
    if (!experience) {
      throw new Error(`Experience '${experienceId}' not found`);
    }

    this.dependencies.eventBus.emit('experience:beforeLearn', experienceId, feedback);

    // Update feedback
    experience.feedback = feedback.trim();

    // Extract insights from feedback
    const newInsights = this.dependencies.insightExtractor.extractInsightsFromFeedback(experience, feedback);
    if (newInsights.length > 0) {
      experience.insights = [...(experience.insights ?? []), ...newInsights];
    }

    // Adjust reinforcement based on feedback sentiment
    const sentimentAdjustment = this.dependencies.insightExtractor.analyzeFeedbackSentiment(feedback);
    experience.reinforcement = Math.max(0, Math.min(1, 
      experience.reinforcement + sentimentAdjustment
    ));

    // Update confidence based on feedback quality
    experience.confidence = Math.max(0, Math.min(1, 
      (experience.confidence ?? 0.6) + (feedback.length > 50 ? 0.1 : 0.05)
    ));

    this.dependencies.eventBus.emit('experience:onLearn', experienceId, feedback);

    // Update related experiences
    this.dependencies.learningEngine.updateRelatedReinforcements(experience);
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
    if (!path || path.length === 0) {
      return; // Handle empty paths gracefully
    }

    if (typeof weight !== 'number') {
      throw new Error('Weight must be a number');
    }

    const normalizedWeight = Math.max(0, Math.min(1, weight));
    const opts: Required<ReinforcementOptions> = {
      updateGraphWeights: true,
      contextualMatching: true,
      ...options,
    };

    // Apply reinforcement to similar experiences
    this.dependencies.learningEngine.reinforceSimilarExperiences(path, normalizedWeight, {
      contextualMatching: opts.contextualMatching,
      maxSimilarExperiences: 20,
    });

    // Update graph weights if requested
    if (opts.updateGraphWeights) {
      this.updateGraphWeights(path, normalizedWeight);
    }

    this.dependencies.eventBus.emit('experience:afterReinforce', path, normalizedWeight);
  }

  /**
   * Update graph weights based on reinforcement path
   */
  private updateGraphWeights(path: string[], weight: number): void {
    const graphFoundation = this.dependencies.graphFoundation;
    
    for (let i = 0; i < path.length - 1; i++) {
      const source = path[i];
      const target = path[i + 1];
      
      // Skip if either node doesn't exist
      if (!graphFoundation.hasNode(source) || !graphFoundation.hasNode(target)) {
        continue;
      }
      
      // Check if relationship exists by looking at outgoing edges
      const edges = graphFoundation.getNodeEdges(source, 'out');
      const existingConnection = edges.find(edge => edge.to === target);
      
      if (existingConnection) {
        // Update existing relationship strength
        const newStrength = Math.max(0, Math.min(1, (existingConnection.strength || 0) + weight * 0.1));
        // Remove old edge and add updated one
        graphFoundation.deleteEdge(source, target, existingConnection.type);
        graphFoundation.addEdge({
          ...existingConnection,
          strength: newStrength
        });
      } else {
        // Create new learned_path relationship
        const relationship = {
          from: source,
          to: target,
          type: 'learned_path',
          strength: weight,
          created: new Date(),
        };
        graphFoundation.addEdge(relationship);
      }
    }
  }

  /**
   * Get intelligent suggestions based on context and history
   * @param currentNode Current node ID
   * @param options Suggestion options
   * @returns Array of suggestions
   */
  getSuggestions(currentNode: string, options?: SuggestionOptions): Suggestion[] {
    if (!currentNode || typeof currentNode !== 'string') {
      return [];
    }

    return this.dependencies.suggestionEngine.getSuggestions(currentNode, options);
  }

  /**
   * Get suggestions based on context
   * @param context Context description
   * @param options Suggestion options
   * @returns Array of suggestions
   */
  getContextualSuggestions(context: string, options?: Omit<SuggestionOptions, 'context'>): Suggestion[] {
    if (!context || typeof context !== 'string') {
      return [];
    }

    return this.dependencies.suggestionEngine.getContextualSuggestions(context, options);
  }

  /**
   * Get path completion suggestions
   * @param partialPath Partial path to complete
   * @param options Suggestion options
   * @returns Array of suggestions for completion
   */
  getPathCompletionSuggestions(partialPath: string[], options?: SuggestionOptions): Suggestion[] {
    if (!partialPath || partialPath.length === 0) {
      return [];
    }

    return this.dependencies.suggestionEngine.getPathCompletionSuggestions(partialPath, options);
  }

  /**
   * Get comprehensive experience metrics
   * @returns Experience metrics object
   */
  getMetrics(): ExperienceMetrics {
    const experiences = Array.from(this.dependencies.experiences.values());
    
    if (experiences.length === 0) {
      return {
        totalExperiences: 0,
        successRate: 0,
        avgTraversalTime: 0,
        mostCommonPaths: [],
        topPatterns: [],
        recentTrends: [],
        contextDistribution: {},
      };
    }

    const totalExperiences = experiences.length;
    const successCount = experiences.filter(exp => exp.outcome === 'success').length;
    const totalTraversalTime = experiences.reduce((sum, exp) => sum + (exp.traversalTime || 0), 0);

    // Count path frequencies
    const pathCounts = new Map<string, number>();
    experiences.forEach(exp => {
      const pathKey = exp.path.join('->');
      pathCounts.set(pathKey, (pathCounts.get(pathKey) ?? 0) + 1);
    });

    // Get most common paths
    const mostCommonPaths = Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pathStr, frequency]) => ({
        path: pathStr.split('->'),
        frequency
      }));

    // Count contexts as object (not array)
    const contextDistribution: Record<string, number> = {};
    experiences.forEach(exp => {
      contextDistribution[exp.context] = (contextDistribution[exp.context] ?? 0) + 1;
    });

    // Collect all patterns from experiences
    const allPatterns = experiences.flatMap(exp => exp.patterns ?? []);
    const patternCounts = new Map<string, { pattern: any; count: number }>();
    
    allPatterns.forEach(pattern => {
      const key = `${pattern.type}-${JSON.stringify(pattern.data)}`;
      const existing = patternCounts.get(key);
      if (existing) {
        existing.count++;
      } else {
        patternCounts.set(key, { pattern, count: 1 });
      }
    });

    const topPatterns = Array.from(patternCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.pattern);

    // Calculate recent trends (simplified)
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentExperiences = experiences.filter(exp => exp.timestamp > lastWeek);
    const recentSuccessRate = recentExperiences.length > 0 
      ? recentExperiences.filter(exp => exp.outcome === 'success').length / recentExperiences.length
      : 0;
    const overallSuccessRate = successCount / totalExperiences;

    const recentTrends = [
      {
        metric: 'success_rate',
        change: recentSuccessRate - overallSuccessRate,
        timeframe: '7d'
      },
      {
        metric: 'activity_level',
        change: recentExperiences.length - totalExperiences / 4, // Compare to quarterly average
        timeframe: '7d'
      }
    ];

    return {
      totalExperiences,
      successRate: successCount / totalExperiences,
      avgTraversalTime: totalTraversalTime / totalExperiences,
      mostCommonPaths,
      topPatterns,
      recentTrends,
      contextDistribution,
    };
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
    let toRemove: string[] = [];
    
    for (const [id, experience] of this.dependencies.experiences.entries()) {
      let shouldRemove = false;

      if (criteria.olderThan && experience.timestamp < criteria.olderThan) {
        shouldRemove = true;
      }

      if (criteria.outcome && experience.outcome === criteria.outcome) {
        shouldRemove = true;
      }

      if (shouldRemove) {
        toRemove.push(id);
      }
    }

    // Limit removal count if specified
    if (criteria.maxToRemove && toRemove.length > criteria.maxToRemove) {
      toRemove = toRemove.slice(0, criteria.maxToRemove);
    }

    // Remove experiences
    let removed = 0;
    for (const id of toRemove) {
      if (this.dependencies.experiences.delete(id)) {
        removed++;
        this.dependencies.eventBus.emit('experience:afterForget', id);
      }
    }

    return removed;
  }

  /**
   * Get PathTracker statistics
   * @returns PathTracker statistics
   */
  getPathTrackingStats() {
    return this.dependencies.pathTracker.getStatistics();
  }

  /**
   * Start a new path in PathTracker
   * @param context Path context
   * @param initialNode Optional initial node
   * @param metadata Optional metadata
   * @returns Path ID
   */
  startPath(context: string, initialNode?: string, metadata?: Record<string, unknown>): string {
    return this.dependencies.pathTracker.startPath(context, initialNode, metadata);
  }

  /**
   * Add node to active path
   * @param pathId Path ID
   * @param nodeId Node to add
   * @param metadata Optional metadata
   */
  addToPath(pathId: string, nodeId: string, metadata?: Record<string, unknown>): void {
    this.dependencies.pathTracker.addNode(pathId, nodeId, metadata);
  }

  /**
   * Complete a path in PathTracker
   * @param pathId Path ID
   * @param outcome Path outcome
   * @param feedback Optional feedback
   * @returns Experience ID
   */
  completePath(pathId: string, outcome: 'success' | 'failure' | 'neutral', feedback?: string): string {
    const experience = this.dependencies.pathTracker.completePath(pathId, outcome, feedback);
    
    // Store in experiences map
    this.dependencies.experiences.set(experience.id, experience);
    
    // Emit event
    this.dependencies.eventBus.emit('experience:afterRecord', experience);
    
    return experience.id;
  }
}