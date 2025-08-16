/**
 * Tests for LearningEngine service
 * Verifies learning algorithms and reinforcement mechanisms
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningEngine } from '../../core/levels/experience/LearningEngine.js';
import type { Experience } from '../../core/types.js';

describe('LearningEngine', () => {
  let engine: LearningEngine;
  let experiences: Map<string, Experience>;

  beforeEach(() => {
    experiences = new Map();
    
    // Create sample experiences
    const exp1: Experience = {
      id: 'exp-1',
      path: ['start', 'process', 'validate', 'complete'],
      context: 'data processing',
      outcome: 'success',
      reinforcement: 0.7,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      confidence: 0.8,
    };

    const exp2: Experience = {
      id: 'exp-2',
      path: ['start', 'analyze', 'validate', 'complete'],
      context: 'data analysis',
      outcome: 'success',
      reinforcement: 0.6,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      confidence: 0.7,
    };

    const exp3: Experience = {
      id: 'exp-3',
      path: ['start', 'skip', 'complete'],
      context: 'quick process',
      outcome: 'failure',
      reinforcement: 0.2,
      timestamp: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      confidence: 0.3,
    };

    experiences.set('exp-1', exp1);
    experiences.set('exp-2', exp2);
    experiences.set('exp-3', exp3);

    engine = new LearningEngine(experiences, {
      decayPeriod: 30,
      maxReinforcement: 1.0,
      minReinforcement: 0.0,
      similarityThreshold: 0.3,
      reinforcementDecayRate: 0.1,
    });
  });

  describe('Initial Reinforcement Calculation', () => {
    it('should calculate correct reinforcement for successful outcomes', () => {
      const reinforcement = engine.calculateInitialReinforcement('success', 4);
      
      expect(reinforcement).toBeGreaterThan(0.7);
      expect(reinforcement).toBeLessThanOrEqual(1.0);
    });

    it('should calculate correct reinforcement for failed outcomes', () => {
      const reinforcement = engine.calculateInitialReinforcement('failure', 4);
      
      expect(reinforcement).toBeLessThan(0.4);
      expect(reinforcement).toBeGreaterThanOrEqual(0.0);
    });

    it('should calculate correct reinforcement for neutral outcomes', () => {
      const reinforcement = engine.calculateInitialReinforcement('neutral', 4);
      
      expect(reinforcement).toBeCloseTo(0.5, 1);
    });

    it('should give bonus for shorter paths', () => {
      const shortPath = engine.calculateInitialReinforcement('success', 2);
      const longPath = engine.calculateInitialReinforcement('success', 8);
      
      expect(shortPath).toBeGreaterThan(longPath);
    });
  });

  describe('Experience Confidence Calculation', () => {
    it('should calculate confidence based on path length', () => {
      const shortExp = experiences.get('exp-3')!; // 3-step path
      const longExp = experiences.get('exp-1')!; // 4-step path
      
      const shortConfidence = engine.calculateExperienceConfidence(shortExp);
      const longConfidence = engine.calculateExperienceConfidence(longExp);
      
      expect(longConfidence).toBeGreaterThan(shortConfidence);
    });

    it('should increase confidence for experiences with feedback', () => {
      const exp = experiences.get('exp-1')!;
      const baseConfidence = engine.calculateExperienceConfidence(exp);
      
      exp.feedback = 'Great experience!';
      const withFeedbackConfidence = engine.calculateExperienceConfidence(exp);
      
      expect(withFeedbackConfidence).toBeGreaterThan(baseConfidence);
    });

    it('should increase confidence for experiences with patterns', () => {
      const exp = experiences.get('exp-1')!;
      const baseConfidence = engine.calculateExperienceConfidence(exp);
      
      exp.patterns = ['pattern-1', 'pattern-2'];
      const withPatternsConfidence = engine.calculateExperienceConfidence(exp);
      
      expect(withPatternsConfidence).toBeGreaterThan(baseConfidence);
    });
  });

  describe('Related Experience Detection', () => {
    it('should find experiences with similar paths', () => {
      const exp1 = experiences.get('exp-1')!;
      const related = engine.findRelatedExperiences(exp1);
      
      expect(related).toContain('exp-2'); // Similar path structure
      expect(related.length).toBeGreaterThanOrEqual(1);
    });

    it('should find experiences with similar contexts', () => {
      const exp1 = experiences.get('exp-1')!;
      const exp2 = experiences.get('exp-2')!;
      
      // Make contexts more similar
      exp2.context = 'data processing workflow';
      
      const related = engine.findRelatedExperiences(exp1);
      
      expect(related).toContain('exp-2');
    });

    it('should not return the same experience as related', () => {
      const exp1 = experiences.get('exp-1')!;
      const related = engine.findRelatedExperiences(exp1);
      
      expect(related).not.toContain('exp-1');
    });

    it('should limit the number of related experiences', () => {
      // Add many similar experiences
      for (let i = 0; i < 15; i++) {
        const exp: Experience = {
          id: `similar-${i}`,
          path: ['start', 'process', 'validate', 'end'],
          context: 'data processing',
          outcome: 'success',
          reinforcement: 0.6,
          timestamp: new Date(),
          confidence: 0.6,
        };
        experiences.set(`similar-${i}`, exp);
      }

      const exp1 = experiences.get('exp-1')!;
      const related = engine.findRelatedExperiences(exp1);
      
      expect(related.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Path Similarity Calculation', () => {
    it('should calculate high similarity for identical paths', () => {
      const path1 = ['a', 'b', 'c'];
      const path2 = ['a', 'b', 'c'];
      
      const similarity = engine.calculatePathSimilarity(path1, path2);
      
      expect(similarity).toBe(1.0);
    });

    it('should calculate medium similarity for overlapping paths', () => {
      const path1 = ['a', 'b', 'c', 'd'];
      const path2 = ['a', 'b', 'x', 'd'];
      
      const similarity = engine.calculatePathSimilarity(path1, path2);
      
      expect(similarity).toBeGreaterThan(0.3);
      expect(similarity).toBeLessThan(0.9);
    });

    it('should calculate low similarity for different paths', () => {
      const path1 = ['a', 'b', 'c'];
      const path2 = ['x', 'y', 'z'];
      
      const similarity = engine.calculatePathSimilarity(path1, path2);
      
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle empty paths', () => {
      const path1: string[] = [];
      const path2 = ['a', 'b'];
      
      const similarity = engine.calculatePathSimilarity(path1, path2);
      
      expect(similarity).toBe(0);
    });

    it('should consider sequence order in similarity', () => {
      const path1 = ['a', 'b', 'c', 'd'];
      const path2 = ['a', 'c', 'b', 'd']; // Same nodes, different order
      
      const similarity = engine.calculatePathSimilarity(path1, path2);
      
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1.0);
    });
  });

  describe('Context Similarity Calculation', () => {
    it('should calculate high similarity for identical contexts', () => {
      const context1 = 'data processing workflow';
      const context2 = 'data processing workflow';
      
      const similarity = engine.calculateContextSimilarity(context1, context2);
      
      expect(similarity).toBe(1.0);
    });

    it('should calculate similarity based on word overlap', () => {
      const context1 = 'data processing workflow';
      const context2 = 'data analysis workflow';
      
      const similarity = engine.calculateContextSimilarity(context1, context2);
      
      expect(similarity).toBeGreaterThanOrEqual(0.5);
    });

    it('should handle case insensitive comparison', () => {
      const context1 = 'Data Processing Workflow';
      const context2 = 'data processing workflow';
      
      const similarity = engine.calculateContextSimilarity(context1, context2);
      
      expect(similarity).toBe(1.0);
    });

    it('should calculate low similarity for different contexts', () => {
      const context1 = 'data processing';
      const context2 = 'user interface design';
      
      const similarity = engine.calculateContextSimilarity(context1, context2);
      
      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('Reinforcement of Similar Experiences', () => {
    it('should reinforce similar experiences', () => {
      const targetPath = ['start', 'process', 'validate', 'complete'];
      const initialReinforcement = experiences.get('exp-2')!.reinforcement;
      
      const reinforced = engine.reinforceSimilarExperiences(targetPath, 0.5);
      
      expect(reinforced).toBeGreaterThan(0);
      expect(experiences.get('exp-2')!.reinforcement).toBeGreaterThan(initialReinforcement);
    });

    it('should respect similarity threshold', () => {
      const targetPath = ['completely', 'different', 'path'];
      
      const reinforced = engine.reinforceSimilarExperiences(targetPath, 0.5);
      
      expect(reinforced).toBe(0);
    });

    it('should limit number of reinforced experiences', () => {
      // Add many similar experiences
      for (let i = 0; i < 25; i++) {
        const exp: Experience = {
          id: `similar-${i}`,
          path: ['start', 'process', 'complete'],
          context: 'workflow',
          outcome: 'success',
          reinforcement: 0.5,
          timestamp: new Date(),
          confidence: 0.5,
        };
        experiences.set(`similar-${i}`, exp);
      }

      const targetPath = ['start', 'process', 'complete'];
      const reinforced = engine.reinforceSimilarExperiences(targetPath, 0.3);
      
      expect(reinforced).toBeLessThanOrEqual(20);
    });

    it('should normalize reinforcement weight', () => {
      const targetPath = ['start', 'process', 'validate', 'complete'];
      
      // Test with weight > 1 (should be normalized)
      const reinforced = engine.reinforceSimilarExperiences(targetPath, 2.0);
      
      expect(reinforced).toBeGreaterThan(0);
      
      // Check that reinforcement values are still within bounds
      for (const exp of experiences.values()) {
        expect(exp.reinforcement).toBeLessThanOrEqual(1.0);
        expect(exp.reinforcement).toBeGreaterThanOrEqual(0.0);
      }
    });
  });

  describe('Reinforcement Decay', () => {
    it('should apply decay to old experiences', () => {
      const oldExp = experiences.get('exp-3')!; // 35 days old
      const initialReinforcement = oldExp.reinforcement;
      
      const decayed = engine.applyReinforcementDecay();
      
      expect(decayed).toBeGreaterThan(0);
      expect(oldExp.reinforcement).toBeLessThan(initialReinforcement);
    });

    it('should not decay recent experiences', () => {
      const recentExp = experiences.get('exp-2')!; // 2 days old
      const initialReinforcement = recentExp.reinforcement;
      
      engine.applyReinforcementDecay();
      
      expect(recentExp.reinforcement).toBe(initialReinforcement);
    });

    it('should respect minimum reinforcement threshold', () => {
      const oldExp = experiences.get('exp-3')!;
      oldExp.reinforcement = 0.05; // Set very low
      
      engine.applyReinforcementDecay();
      
      expect(oldExp.reinforcement).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('Related Reinforcement Updates', () => {
    it('should update reinforcement of related successful experiences', () => {
      const targetExp = experiences.get('exp-1')!;
      const relatedExp = experiences.get('exp-2')!;
      
      targetExp.relatedExperiences = ['exp-2'];
      const initialReinforcement = relatedExp.reinforcement;
      
      engine.updateRelatedReinforcements(targetExp);
      
      expect(relatedExp.reinforcement).toBeGreaterThan(initialReinforcement);
    });

    it('should not update failed related experiences', () => {
      const targetExp = experiences.get('exp-1')!;
      const failedExp = experiences.get('exp-3')!;
      
      targetExp.relatedExperiences = ['exp-3'];
      const initialReinforcement = failedExp.reinforcement;
      
      engine.updateRelatedReinforcements(targetExp);
      
      expect(failedExp.reinforcement).toBe(initialReinforcement);
    });

    it('should handle missing related experiences', () => {
      const targetExp = experiences.get('exp-1')!;
      targetExp.relatedExperiences = ['non-existent'];
      
      // Should not throw error
      expect(() => engine.updateRelatedReinforcements(targetExp)).not.toThrow();
    });
  });

  describe('Statistics and Metrics', () => {
    it('should provide comprehensive learning statistics', () => {
      const stats = engine.getStatistics();
      
      expect(stats.totalExperiences).toBe(3);
      expect(stats.averageReinforcement).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.averagePathLength).toBeGreaterThan(0);
      expect(stats.reinforcementDistribution).toBeDefined();
    });

    it('should handle empty experience set', () => {
      const emptyEngine = new LearningEngine(new Map());
      const stats = emptyEngine.getStatistics();
      
      expect(stats.totalExperiences).toBe(0);
      expect(stats.averageReinforcement).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should categorize reinforcement distribution correctly', () => {
      const stats = engine.getStatistics();
      
      const total = stats.reinforcementDistribution.high + 
                   stats.reinforcementDistribution.medium + 
                   stats.reinforcementDistribution.low;
      
      expect(total).toBe(stats.totalExperiences);
    });
  });

  describe('Parameter Optimization', () => {
    it('should recommend optimized parameters', () => {
      const optimization = engine.optimizeParameters();
      
      expect(optimization.recommended).toBeDefined();
      expect(optimization.reasoning).toBeInstanceOf(Array);
      expect(optimization.reasoning.length).toBeGreaterThan(0);
    });

    it('should adjust decay period based on old experience ratio', () => {
      // Add many old experiences
      for (let i = 0; i < 10; i++) {
        const oldExp: Experience = {
          id: `old-${i}`,
          path: ['old', 'path'],
          context: 'old context',
          outcome: 'success',
          reinforcement: 0.5,
          timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
          confidence: 0.5,
        };
        experiences.set(`old-${i}`, oldExp);
      }

      const optimization = engine.optimizeParameters();
      
      expect(optimization.recommended.decayPeriod).toBeLessThan(30);
      expect(optimization.reasoning.some(r => r.includes('decay period'))).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      engine.updateConfig({
        similarityThreshold: 0.8,
        maxReinforcement: 0.9,
      });

      const targetPath = ['start', 'process', 'validate', 'complete'];
      const reinforced = engine.reinforceSimilarExperiences(targetPath, 0.5);
      
      // With higher threshold, fewer experiences should be reinforced
      expect(reinforced).toBeLessThanOrEqual(1);
    });

    it('should reset to defaults correctly', () => {
      engine.updateConfig({ similarityThreshold: 0.9 });
      engine.resetToDefaults();
      
      const targetPath = ['start', 'process', 'validate', 'complete'];
      const reinforced = engine.reinforceSimilarExperiences(targetPath, 0.5);
      
      // Should work with default threshold again
      expect(reinforced).toBeGreaterThan(0);
    });
  });
});