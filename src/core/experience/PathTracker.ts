/**
 * PathTracker - Advanced path tracking system for experience recording
 * 
 * Tracks active paths being traversed, measures timing accurately,
 * supports concurrent path tracking, and records context/metadata during traversal.
 */

import type { Experience } from '../types.js';
import { generateId, validateConfidence } from '../utils.js';

/**
 * Represents an active path being tracked
 */
export interface ActivePath {
  id: string;
  nodes: string[];
  context: string;
  startTime: number; // High-resolution timestamp
  lastNodeTime: number; // Time when last node was added
  paused: boolean;
  pausedDuration: number; // Total time spent paused (ms)
  pauseStartTime?: number; // When current pause started
  metadata?: Record<string, unknown>;
  expectedOutcome?: 'success' | 'failure' | 'neutral';
  goal?: string; // What the path is trying to achieve
}

/**
 * Configuration options for path tracking
 */
export interface PathTrackingOptions {
  maxConcurrentPaths?: number; // Maximum number of paths to track simultaneously
  autoCompleteTimeout?: number; // Auto-complete paths after this many ms of inactivity
  enableDetailedTiming?: boolean; // Track timing for each node transition
  validateNodes?: boolean; // Validate that nodes exist in the graph
  recordIntermediary?: boolean; // Record intermediate states during traversal
}

/**
 * PathTracker manages active path tracking with precise timing and context
 */
export class PathTracker {
  private activePaths = new Map<string, ActivePath>();
  private completedPaths = new Map<string, Experience>();
  private options: Required<PathTrackingOptions>;
  private nodeValidator?: (nodeId: string) => boolean;

  constructor(
    options: PathTrackingOptions = {},
    nodeValidator?: (nodeId: string) => boolean
  ) {
    this.options = {
      maxConcurrentPaths: 10,
      autoCompleteTimeout: 300000, // 5 minutes
      enableDetailedTiming: true,
      validateNodes: true,
      recordIntermediary: false,
      ...options,
    };
    this.nodeValidator = nodeValidator;
  }

  /**
   * Start tracking a new path
   * @param context Description of what's being explored
   * @param initialNode Optional starting node
   * @param metadata Optional metadata for the path
   * @returns Path ID for tracking
   */
  startPath(
    context: string,
    initialNode?: string,
    metadata?: Record<string, unknown>
  ): string {
    // Check concurrent path limit
    if (this.activePaths.size >= this.options.maxConcurrentPaths) {
      throw new Error(
        `Maximum concurrent paths (${this.options.maxConcurrentPaths}) exceeded`
      );
    }

    // Validate context
    if (!context || typeof context !== 'string' || context.trim() === '') {
      throw new Error('Context must be a non-empty string');
    }

    // Validate initial node if provided
    if (initialNode && this.options.validateNodes && this.nodeValidator) {
      if (!this.nodeValidator(initialNode)) {
        throw new Error(`Initial node '${initialNode}' does not exist`);
      }
    }

    const pathId = generateId('path');
    const now = performance.now();

    const activePath: ActivePath = {
      id: pathId,
      nodes: initialNode ? [initialNode] : [],
      context: context.trim(),
      startTime: now,
      lastNodeTime: now,
      paused: false,
      pausedDuration: 0,
      metadata: metadata ? { ...metadata } : undefined,
    };

    this.activePaths.set(pathId, activePath);

    return pathId;
  }

  /**
   * Add a node to an active path
   * @param pathId Path ID to add node to
   * @param nodeId Node to add to the path
   * @param metadata Optional metadata for this step
   */
  addNode(
    pathId: string,
    nodeId: string,
    metadata?: Record<string, unknown>
  ): void {
    const path = this.activePaths.get(pathId);
    if (!path) {
      throw new Error(`Active path '${pathId}' not found`);
    }

    if (path.paused) {
      throw new Error(`Cannot add node to paused path '${pathId}'`);
    }

    // Validate node ID first
    if (!nodeId || typeof nodeId !== 'string' || nodeId.trim() === '') {
      throw new Error('Node ID must be a non-empty string');
    }

    const trimmedNodeId = nodeId.trim();

    // Validate node if enabled
    if (this.options.validateNodes && this.nodeValidator) {
      if (!this.nodeValidator(trimmedNodeId)) {
        throw new Error(`Node '${trimmedNodeId}' does not exist`);
      }
    }

    const now = performance.now();
    
    // Add node to path
    path.nodes.push(trimmedNodeId);
    path.lastNodeTime = now;

    // Ensure metadata object exists and add step metadata if provided
    if (metadata) {
      if (!path.metadata) {
        path.metadata = {};
      }
      const stepKey = `step_${path.nodes.length - 1}`;
      path.metadata[stepKey] = metadata;
    }

    // Auto-detect success based on goal achievement
    if (path.goal && this.isGoalAchieved(path, trimmedNodeId)) {
      path.expectedOutcome = 'success';
    }
  }

  /**
   * Pause path tracking (excludes paused time from total)
   * @param pathId Path ID to pause
   */
  pausePath(pathId: string): void {
    const path = this.activePaths.get(pathId);
    if (!path) {
      throw new Error(`Active path '${pathId}' not found`);
    }

    if (path.paused) {
      return; // Already paused
    }

    path.paused = true;
    path.pauseStartTime = performance.now();
  }

  /**
   * Resume paused path tracking
   * @param pathId Path ID to resume
   */
  resumePath(pathId: string): void {
    const path = this.activePaths.get(pathId);
    if (!path) {
      throw new Error(`Active path '${pathId}' not found`);
    }

    if (!path.paused) {
      return; // Not paused
    }

    // Add paused time to total paused duration
    if (path.pauseStartTime !== undefined) {
      const pauseDuration = performance.now() - path.pauseStartTime;
      path.pausedDuration += pauseDuration;
    }

    path.paused = false;
    path.pauseStartTime = undefined;
    path.lastNodeTime = performance.now();
  }

  /**
   * Complete path tracking and create Experience record
   * @param pathId Path ID to complete
   * @param outcome Final outcome of the path
   * @param feedback Optional feedback about the experience
   * @returns Created Experience object
   */
  completePath(
    pathId: string,
    outcome: 'success' | 'failure' | 'neutral',
    feedback?: string
  ): Experience {
    const path = this.activePaths.get(pathId);
    if (!path) {
      throw new Error(`Active path '${pathId}' not found`);
    }

    // Validate path has at least one node
    if (path.nodes.length === 0) {
      throw new Error(`Cannot complete path '${pathId}' with no nodes`);
    }

    const now = performance.now();
    const totalTime = now - path.startTime - path.pausedDuration;

    // Create Experience object
    const experience: Experience = {
      id: generateId('exp'),
      path: [...path.nodes],
      context: path.context,
      outcome,
      feedback,
      timestamp: new Date(),
      traversalTime: Math.max(0, Math.round(totalTime)),
      reinforcement: this.calculateReinforcement(outcome, totalTime, path.nodes.length),
      confidence: this.calculateConfidence(path, outcome),
      metadata: path.metadata ? { ...path.metadata } : undefined,
    };

    // Store completed experience
    this.completedPaths.set(experience.id, experience);

    // Remove from active paths
    this.activePaths.delete(pathId);

    return experience;
  }

  /**
   * Cancel path tracking without creating Experience
   * @param pathId Path ID to cancel
   */
  cancelPath(pathId: string): void {
    if (!this.activePaths.has(pathId)) {
      throw new Error(`Active path '${pathId}' not found`);
    }

    this.activePaths.delete(pathId);
  }

  /**
   * Get current state of an active path
   * @param pathId Path ID to query
   * @returns ActivePath object or null if not found
   */
  getActivePath(pathId: string): ActivePath | null {
    const path = this.activePaths.get(pathId);
    return path ? { ...path, metadata: path.metadata ? { ...path.metadata } : undefined } : null;
  }

  /**
   * Get all active paths
   * @returns Array of ActivePath objects
   */
  getActivePaths(): ActivePath[] {
    return Array.from(this.activePaths.values()).map(path => ({
      ...path,
      metadata: path.metadata ? { ...path.metadata } : undefined,
    }));
  }

  /**
   * Get completed experiences
   * @param limit Maximum number of experiences to return
   * @returns Array of Experience objects, most recent first
   */
  getCompletedExperiences(limit?: number): Experience[] {
    const experiences = Array.from(this.completedPaths.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? experiences.slice(0, limit) : experiences;
  }

  /**
   * Clean up old inactive paths
   * @param maxAge Maximum age in milliseconds
   * @returns Number of paths cleaned up
   */
  cleanupInactivePaths(maxAge?: number): number {
    const cutoff = performance.now() - (maxAge ?? this.options.autoCompleteTimeout);
    let cleaned = 0;

    for (const [pathId, path] of this.activePaths.entries()) {
      if (path.lastNodeTime < cutoff) {
        // Auto-complete with neutral outcome
        try {
          this.completePath(pathId, 'neutral', 'Auto-completed due to inactivity');
        } catch {
          // If completion fails, just remove the path
          this.activePaths.delete(pathId);
        }
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get path tracking statistics
   * @returns Statistics about path tracking
   */
  getStatistics(): {
    activePaths: number;
    completedPaths: number;
    totalPathsTracked: number;
    avgTraversalTime: number;
    successRate: number;
  } {
    const completed = Array.from(this.completedPaths.values());
    const totalTraversalTime = completed.reduce((sum, exp) => sum + exp.traversalTime, 0);
    const successCount = completed.filter(exp => exp.outcome === 'success').length;

    return {
      activePaths: this.activePaths.size,
      completedPaths: completed.length,
      totalPathsTracked: this.activePaths.size + completed.length,
      avgTraversalTime: completed.length > 0 ? totalTraversalTime / completed.length : 0,
      successRate: completed.length > 0 ? successCount / completed.length : 0,
    };
  }

  /**
   * Clear all completed experiences (keeps active paths)
   */
  clearCompleted(): void {
    this.completedPaths.clear();
  }

  /**
   * Set goal for active path (used for auto-outcome detection)
   * @param pathId Path ID to set goal for
   * @param goal Description of the goal
   */
  setPathGoal(pathId: string, goal: string): void {
    const path = this.activePaths.get(pathId);
    if (!path) {
      throw new Error(`Active path '${pathId}' not found`);
    }

    path.goal = goal.trim();
  }

  /**
   * Check if path goal has been achieved
   * @param path Active path to check
   * @param nodeId Current node being added
   * @returns True if goal appears to be achieved
   */
  private isGoalAchieved(path: ActivePath, nodeId: string): boolean {
    if (!path.goal) return false;

    // Simple goal detection based on keywords
    const goalLower = path.goal.toLowerCase();
    const nodeLower = nodeId.toLowerCase();

    // Check if node name suggests completion
    const completionKeywords = ['complete', 'finish', 'success', 'done', 'end', 'achieve'];
    const hasCompletionKeyword = completionKeywords.some(keyword => 
      nodeLower.includes(keyword) || goalLower.includes(keyword)
    );

    // Check if node name matches goal keywords
    const goalWords = goalLower.split(/\s+/);
    const nodeWords = nodeLower.split(/[_\-\s]+/);
    const wordMatch = goalWords.some(word => 
      word.length > 2 && nodeWords.some(nodeWord => nodeWord.includes(word))
    );

    return hasCompletionKeyword || wordMatch;
  }

  /**
   * Calculate reinforcement value based on outcome and path characteristics
   * @param outcome Path outcome
   * @param time Traversal time in ms
   * @param pathLength Number of nodes in path
   * @returns Reinforcement value (0-1)
   */
  private calculateReinforcement(
    outcome: 'success' | 'failure' | 'neutral',
    time: number,
    pathLength: number
  ): number {
    let base: number;
    
    // Base reinforcement by outcome
    switch (outcome) {
      case 'success':
        base = 0.8;
        break;
      case 'failure':
        base = 0.2;
        break;
      case 'neutral':
        base = 0.5;
        break;
    }

    // Adjust for efficiency (shorter time and path length = higher reinforcement)
    const efficiencyBonus = outcome === 'success' 
      ? Math.max(0, 0.2 * (1 - Math.min(time / 10000, 1))) // Bonus for completing quickly
      : 0;

    const lengthPenalty = Math.max(0, 0.1 * Math.min(pathLength / 10, 1)); // Penalty for very long paths

    const final = base + efficiencyBonus - lengthPenalty;
    return validateConfidence(final);
  }

  /**
   * Calculate confidence in path data quality
   * @param path Active path being completed
   * @param outcome Final outcome
   * @returns Confidence value (0-1)
   */
  private calculateConfidence(path: ActivePath, outcome: 'success' | 'failure' | 'neutral'): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for paths with more nodes (more data)
    confidence += Math.min(0.2, path.nodes.length * 0.02);

    // Higher confidence for completed goals
    if (path.expectedOutcome === outcome) {
      confidence += 0.1;
    }

    // Lower confidence for very short or very long paths
    if (path.nodes.length < 2) {
      confidence -= 0.2;
    } else if (path.nodes.length > 20) {
      confidence -= 0.1;
    }

    // Lower confidence if path was paused (might indicate interruption)
    if (path.pausedDuration > 0) {
      confidence -= 0.05;
    }

    return validateConfidence(confidence);
  }
}