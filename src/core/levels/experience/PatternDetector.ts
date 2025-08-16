/**
 * PatternDetector - Advanced pattern detection and creation service
 * 
 * Extracts patterns from path traversals and manages pattern lifecycle
 */

import type { Pattern } from '../../types.js';
import { generateId } from '../../utils.js';

export interface PatternDetectorConfig {
  minPathLength?: number;
  similarityThreshold?: number;
  maxPatternsPerDetection?: number;
}

export class PatternDetector {
  private patterns = new Map<string, Pattern>();
  private statsCounters = new Map<string, number>(); // Track stats update counts
  private config: Required<PatternDetectorConfig>;

  constructor(config: PatternDetectorConfig = {}) {
    this.config = {
      minPathLength: 3,
      similarityThreshold: 0.5, // Lower threshold to catch similar patterns
      maxPatternsPerDetection: 5,
      ...config,
    };
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
}