/**
 * PatternDetector - Advanced pattern detection and creation service
 * 
 * Extracts patterns from path traversals and manages pattern lifecycle.
 * Now enhanced with graph pattern mining capabilities.
 */

import type { Pattern, GraphPattern, PatternMiningOptions, PatternMetrics } from '../../types.js';
import { generateId } from '../../utils.js';
import type { GraphFoundation } from '../../GraphFoundation.js';
import { GraphPatternMining } from '../../algorithms/GraphPatternMining.js';

export interface PatternDetectorConfig {
  // Sequential pattern detection options
  minPathLength?: number;
  similarityThreshold?: number;
  maxPatternsPerDetection?: number;
  
  // Graph pattern mining options
  enableGraphPatterns?: boolean;
  graphPatternOptions?: PatternMiningOptions;
}

export class PatternDetector {
  private patterns = new Map<string, Pattern>();
  private graphPatterns = new Map<string, GraphPattern>();
  private statsCounters = new Map<string, number>(); // Track stats update counts
  private config: Required<PatternDetectorConfig>;
  private graphPatternMiner?: GraphPatternMining;

  constructor(config: PatternDetectorConfig = {}, graphFoundation?: GraphFoundation) {
    this.config = {
      minPathLength: 3,
      similarityThreshold: 0.5, // Lower threshold to catch similar patterns
      maxPatternsPerDetection: 5,
      enableGraphPatterns: false,
      graphPatternOptions: {
        minSupport: 0.1,
        minConfidence: 0.3,
        maxPatternSize: 5,
        patternTypes: ['star', 'chain', 'cycle', 'tree', 'bridge', 'cluster', 'hub'],
        includeMetadata: false,
      },
      ...config,
    };
    
    // Initialize graph pattern mining if enabled and graph foundation provided
    if (this.config.enableGraphPatterns && graphFoundation) {
      this.graphPatternMiner = new GraphPatternMining(graphFoundation, {
        minSupport: this.config.graphPatternOptions!.minSupport,
        minConfidence: this.config.graphPatternOptions!.minConfidence,
        maxPatternSize: this.config.graphPatternOptions!.maxPatternSize,
        enabledPatternTypes: this.config.graphPatternOptions!.patternTypes as Array<'star' | 'chain' | 'cycle' | 'tree' | 'bridge' | 'cluster' | 'hub'>,
      });
    }
  }

  /**
   * Detect patterns in a path given the context
   */
  detectPatterns(path: string[], context: string): Pattern[] {
    const detectedPatterns: Pattern[] = [];

    // Look for existing patterns that match this path
    let bestMatch: Pattern | null = null;
    let bestSimilarity = 0;

    for (const pattern of this.patterns.values()) {
      const similarity = this.calculatePathSimilarity(path, pattern.nodes);
      
      if (similarity > this.config.similarityThreshold && similarity > bestSimilarity) {
        bestMatch = pattern;
        bestSimilarity = similarity;
      }
    }

    if (bestMatch) {
      // Update existing pattern
      bestMatch.frequency++;
      bestMatch.lastSeen = new Date();
      
      // Add context if not already present
      if (!bestMatch.contexts.includes(context)) {
        bestMatch.contexts.push(context);
      }
      
      detectedPatterns.push({ ...bestMatch });
    } else if (path.length >= this.config.minPathLength) {
      // Create new pattern if path is long enough and no matches found
      const newPattern = this.createPattern(path, context);
      detectedPatterns.push(newPattern);
    }

    return detectedPatterns.slice(0, this.config.maxPatternsPerDetection);
  }

  /**
   * Create a new pattern from path and context
   */
  private createPattern(path: string[], context: string): Pattern {
    const pattern: Pattern = {
      id: generateId('pattern'),
      description: `Pattern from ${context}`,
      frequency: 1,
      confidence: 0.6,
      nodes: [...path],
      contexts: [context],
      successRate: 1.0, // Will be updated as more experiences come in
      avgTraversalTime: 0, // Will be calculated from experiences
      lastSeen: new Date(),
    };
    
    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  /**
   * Calculate similarity between two paths using LCS
   */
  private calculatePathSimilarity(path1: string[], path2: string[]): number {
    if (path1.length === 0 || path2.length === 0) return 0;

    // Calculate overlap ratio
    const set1 = new Set(path1);
    const set2 = new Set(path2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    const overlapRatio = intersection.size / union.size;

    // Calculate sequence similarity (Longest Common Subsequence)
    const lcs = this.longestCommonSubsequence(path1, path2);
    const sequenceSimilarity = (2 * lcs) / (path1.length + path2.length);

    // Weighted combination
    return 0.6 * overlapRatio + 0.4 * sequenceSimilarity;
  }

  /**
   * Calculate longest common subsequence length
   */
  private longestCommonSubsequence(arr1: string[], arr2: string[]): number {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Update pattern statistics based on new experience data
   */
  updatePatternStats(patternId: string, traversalTime: number, successful: boolean): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    // Track statistics counts separately for proper averaging
    const currentCount = this.statsCounters.get(patternId) ?? 0;
    const newCount = currentCount + 1;
    this.statsCounters.set(patternId, newCount);

    // Update success rate using running average
    const currentSuccesses = pattern.successRate * currentCount;
    const newSuccesses = currentSuccesses + (successful ? 1 : 0);
    pattern.successRate = newSuccesses / newCount;

    // Update average traversal time using running average
    const currentTotal = pattern.avgTraversalTime * currentCount;
    pattern.avgTraversalTime = (currentTotal + traversalTime) / newCount;
  }

  /**
   * Get all detected patterns
   */
  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values()).map(pattern => ({ ...pattern }));
  }

  /**
   * Get patterns by context
   */
  getPatternsByContext(context: string): Pattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.contexts.includes(context))
      .map(pattern => ({ ...pattern }));
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): Pattern | null {
    const pattern = this.patterns.get(id);
    return pattern ? { ...pattern } : null;
  }

  /**
   * Remove old or low-confidence patterns
   */
  prunePatterns(minConfidence = 0.3, maxAge = 30): number {
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, pattern] of this.patterns.entries()) {
      if (pattern.confidence < minConfidence || pattern.lastSeen < cutoffDate) {
        this.patterns.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear all patterns
   */
  clear(): void {
    this.patterns.clear();
    this.statsCounters.clear();
  }

  /**
   * Get statistics about pattern detection
   */
  getStatistics(): {
    totalPatterns: number;
    avgConfidence: number;
    avgFrequency: number;
    mostCommonContext: string | null;
  } {
    const patterns = Array.from(this.patterns.values());
    
    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        avgConfidence: 0,
        avgFrequency: 0,
        mostCommonContext: null,
      };
    }

    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    
    // Find most common context
    const contextCounts = new Map<string, number>();
    for (const pattern of patterns) {
      for (const context of pattern.contexts) {
        contextCounts.set(context, (contextCounts.get(context) ?? 0) + 1);
      }
    }
    
    const mostCommonContext = Array.from(contextCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      totalPatterns: patterns.length,
      avgConfidence: totalConfidence / patterns.length,
      avgFrequency: totalFrequency / patterns.length,
      mostCommonContext,
    };
  }

  // ============ Graph Pattern Mining Methods ============

  /**
   * Mine structural patterns from the graph
   */
  mineGraphPatterns(options?: PatternMiningOptions): GraphPattern[] {
    if (!this.graphPatternMiner) {
      console.warn('Graph pattern mining not enabled or graph foundation not provided');
      return [];
    }

    const patterns = this.graphPatternMiner.minePatterns(options);
    
    // Store mined patterns
    for (const pattern of patterns) {
      this.graphPatterns.set(pattern.id, pattern);
    }

    return patterns;
  }

  /**
   * Get all graph patterns
   */
  getAllGraphPatterns(): GraphPattern[] {
    return Array.from(this.graphPatterns.values());
  }

  /**
   * Get graph patterns by type
   */
  getGraphPatternsByType(type: 'star' | 'chain' | 'cycle' | 'tree' | 'bridge' | 'cluster' | 'hub'): GraphPattern[] {
    return Array.from(this.graphPatterns.values())
      .filter(pattern => pattern.type === type);
  }

  /**
   * Get pattern metrics including graph patterns
   */
  getGraphPatternMetrics(): PatternMetrics | null {
    if (!this.graphPatternMiner) {
      return null;
    }

    return this.graphPatternMiner.getPatternMetrics();
  }

  /**
   * Clear all graph patterns
   */
  clearGraphPatterns(): void {
    this.graphPatterns.clear();
    if (this.graphPatternMiner) {
      this.graphPatternMiner.clearPatterns();
    }
  }

  /**
   * Update graph pattern mining configuration
   */
  updateGraphPatternConfig(config: PatternMiningOptions): void {
    if (this.graphPatternMiner) {
      this.graphPatternMiner.updateConfig({
        minSupport: config.minSupport,
        minConfidence: config.minConfidence,
        maxPatternSize: config.maxPatternSize,
        enabledPatternTypes: config.patternTypes as Array<'star' | 'chain' | 'cycle' | 'tree' | 'bridge' | 'cluster' | 'hub'>,
      });
    }
  }

  /**
   * Check if graph pattern mining is enabled
   */
  isGraphPatternMiningEnabled(): boolean {
    return this.graphPatternMiner !== undefined;
  }

  /**
   * Get combined statistics for both sequential and graph patterns
   */
  getCombinedStatistics(): {
    sequential: ReturnType<PatternDetector['getStatistics']>;
    graph: PatternMetrics | null;
  } {
    return {
      sequential: this.getStatistics(),
      graph: this.getGraphPatternMetrics(),
    };
  }
}