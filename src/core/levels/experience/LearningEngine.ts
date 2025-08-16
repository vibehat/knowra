/**
 * LearningEngine - Advanced learning algorithms and reinforcement mechanisms
 * 
 * Handles experience reinforcement, similarity calculations, and decay functions
 */

import type { Experience } from '../../types.js';
import { validateConfidence } from '../../utils.js';

export interface LearningEngineConfig {
  decayPeriod?: number; // Days after which decay starts
  maxReinforcement?: number;
  minReinforcement?: number;
  similarityThreshold?: number;
  reinforcementDecayRate?: number;
}

export class LearningEngine {
  private experiences: Map<string, Experience>;
  private config: Required<LearningEngineConfig>;

  constructor(experiences: Map<string, Experience>, config: LearningEngineConfig = {}) {
    this.experiences = experiences;
    this.config = {
      decayPeriod: 30,
      maxReinforcement: 1.0,
      minReinforcement: 0.0,
      similarityThreshold: 0.3,
      reinforcementDecayRate: 0.1,
      ...config,
    };
  }

  /**
   * Calculate initial reinforcement for a new experience
   */
  calculateInitialReinforcement(outcome: 'success' | 'failure' | 'neutral', pathLength: number): number {
    let base: number;
    
    // Base reinforcement by outcome
    switch (outcome) {
      case 'success':
        base = 0.7;
        break;
      case 'failure':
        base = 0.3;
        break;
      case 'neutral':
        base = 0.5;
        break;
    }

    // Adjust for path length (shorter paths get slight bonus)
    const lengthAdjustment = Math.max(0, 0.1 * (1 - Math.min(pathLength / 5, 1)));
    
    return validateConfidence(base + lengthAdjustment);
  }

  /**
   * Calculate experience confidence based on various factors
   */
  calculateExperienceConfidence(experience: Experience): number {
    let confidence = 0.6; // Base confidence

    // Higher confidence for longer paths (more data)
    confidence += Math.min(0.2, experience.path.length * 0.02);

    // Higher confidence for experiences with feedback
    if (experience.feedback) {
      confidence += 0.1;
    }

    // Higher confidence for experiences with patterns
    if (experience.patterns && experience.patterns.length > 0) {
      confidence += 0.1;
    }

    return validateConfidence(confidence);
  }

  /**
   * Find experiences related to the given experience
   */
  findRelatedExperiences(experience: Experience): string[] {
    const related: string[] = [];

    for (const [id, otherExp] of this.experiences.entries()) {
      if (id === experience.id) continue;

      // Check path similarity
      const pathSimilarity = this.calculatePathSimilarity(experience.path, otherExp.path);
      
      // Check context similarity
      const contextSimilarity = this.calculateContextSimilarity(experience.context, otherExp.context);

      // Consider related if either path or context similarity is high
      if (pathSimilarity > 0.5 || contextSimilarity > 0.7) {
        related.push(id);
      }
    }

    return related.slice(0, 10); // Limit to top 10 related experiences
  }

  /**
   * Calculate similarity between two paths
   */
  calculatePathSimilarity(path1: string[], path2: string[]): number {
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
   * Calculate similarity between two contexts
   */
  calculateContextSimilarity(context1: string, context2: string): number {
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
   * Apply reinforcement to similar experiences
   */
  reinforceSimilarExperiences(
    targetPath: string[], 
    weight: number,
    options?: {
      contextualMatching?: boolean;
      maxSimilarExperiences?: number;
    }
  ): number {
    const normalizedWeight = validateConfidence(weight);
    const opts = {
      contextualMatching: true,
      maxSimilarExperiences: 20,
      ...options,
    };

    let reinforced = 0;

    // Find and update related experiences
    for (const experience of this.experiences.values()) {
      const similarity = this.calculatePathSimilarity(targetPath, experience.path);
      
      if (similarity > this.config.similarityThreshold) {
        const adjustment = normalizedWeight * similarity * 0.2;
        experience.reinforcement = validateConfidence(
          experience.reinforcement + adjustment
        );
        reinforced++;

        if (reinforced >= opts.maxSimilarExperiences) break;
      }
    }

    return reinforced;
  }

  /**
   * Apply decay to old reinforcements
   */
  applyReinforcementDecay(): number {
    const now = Date.now();
    const decayPeriod = this.config.decayPeriod * 24 * 60 * 60 * 1000; // Convert days to ms
    let decayed = 0;

    for (const experience of this.experiences.values()) {
      const age = now - experience.timestamp.getTime();
      if (age > decayPeriod) {
        const decayFactor = Math.max(
          this.config.reinforcementDecayRate, 
          1 - (age - decayPeriod) / decayPeriod
        );
        
        const oldReinforcement = experience.reinforcement;
        experience.reinforcement = validateConfidence(
          Math.max(this.config.minReinforcement, experience.reinforcement * decayFactor)
        );
        
        if (experience.reinforcement < oldReinforcement) {
          decayed++;
        }
      }
    }

    return decayed;
  }

  /**
   * Update reinforcements for related experiences
   */
  updateRelatedReinforcements(targetExperience: Experience): void {
    const relatedIds = targetExperience.relatedExperiences ?? [];
    
    for (const relatedId of relatedIds) {
      const relatedExp = this.experiences.get(relatedId);
      if (relatedExp && relatedExp.outcome === 'success') {
        // Slightly boost reinforcement of related successful experiences
        relatedExp.reinforcement = validateConfidence(relatedExp.reinforcement + 0.02);
      }
    }
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
   * Get learning statistics
   */
  getStatistics(): {
    totalExperiences: number;
    averageReinforcement: number;
    reinforcementDistribution: {
      high: number; // > 0.7
      medium: number; // 0.3-0.7
      low: number; // < 0.3
    };
    successRate: number;
    averagePathLength: number;
    oldExperiencesCount: number;
  } {
    const experiences = Array.from(this.experiences.values());
    
    if (experiences.length === 0) {
      return {
        totalExperiences: 0,
        averageReinforcement: 0,
        reinforcementDistribution: { high: 0, medium: 0, low: 0 },
        successRate: 0,
        averagePathLength: 0,
        oldExperiencesCount: 0,
      };
    }

    const totalReinforcement = experiences.reduce((sum, exp) => sum + exp.reinforcement, 0);
    const successCount = experiences.filter(exp => exp.outcome === 'success').length;
    const totalPathLength = experiences.reduce((sum, exp) => sum + exp.path.length, 0);
    
    const now = Date.now();
    const decayPeriod = this.config.decayPeriod * 24 * 60 * 60 * 1000;
    const oldExperiencesCount = experiences.filter(exp => 
      now - exp.timestamp.getTime() > decayPeriod
    ).length;

    const reinforcementDistribution = {
      high: experiences.filter(exp => exp.reinforcement > 0.7).length,
      medium: experiences.filter(exp => exp.reinforcement >= 0.3 && exp.reinforcement <= 0.7).length,
      low: experiences.filter(exp => exp.reinforcement < 0.3).length,
    };

    return {
      totalExperiences: experiences.length,
      averageReinforcement: totalReinforcement / experiences.length,
      reinforcementDistribution,
      successRate: successCount / experiences.length,
      averagePathLength: totalPathLength / experiences.length,
      oldExperiencesCount,
    };
  }

  /**
   * Optimize learning parameters based on current performance
   */
  optimizeParameters(): {
    recommended: LearningEngineConfig;
    reasoning: string[];
  } {
    const stats = this.getStatistics();
    const recommended: LearningEngineConfig = { ...this.config };
    const reasoning: string[] = [];

    // Adjust decay period based on old experiences ratio
    const oldRatio = stats.oldExperiencesCount / stats.totalExperiences;
    if (oldRatio > 0.3) {
      recommended.decayPeriod = Math.max(7, this.config.decayPeriod * 0.8);
      reasoning.push('Reduced decay period due to high ratio of old experiences');
    } else if (oldRatio < 0.1) {
      recommended.decayPeriod = Math.min(60, this.config.decayPeriod * 1.2);
      reasoning.push('Increased decay period due to low ratio of old experiences');
    }

    // Adjust similarity threshold based on reinforcement distribution
    if (stats.reinforcementDistribution.high > stats.totalExperiences * 0.7) {
      recommended.similarityThreshold = Math.min(0.5, this.config.similarityThreshold + 0.1);
      reasoning.push('Increased similarity threshold due to high reinforcement distribution');
    } else if (stats.reinforcementDistribution.low > stats.totalExperiences * 0.5) {
      recommended.similarityThreshold = Math.max(0.1, this.config.similarityThreshold - 0.1);
      reasoning.push('Decreased similarity threshold due to low reinforcement distribution');
    }

    return { recommended, reasoning };
  }

  /**
   * Reset learning parameters to defaults
   */
  resetToDefaults(): void {
    this.config = {
      decayPeriod: 30,
      maxReinforcement: 1.0,
      minReinforcement: 0.0,
      similarityThreshold: 0.3,
      reinforcementDecayRate: 0.1,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LearningEngineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}