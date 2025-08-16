/**
 * Comprehensive tests for Experience Data Model
 * Tests Experience, Pattern, Insight, and ExperienceMetrics types and schemas
 */

import { describe, it, expect } from 'vitest';
import {
  Experience,
  Pattern,
  Insight,
  ExperienceMetrics,
  ExperienceSchema,
  PatternSchema,
  InsightSchema,
  ExperienceMetricsSchema,
  validateExperience,
  validatePattern,
  validateInsight,
  validateExperienceMetrics,
} from '../../core/types.js';

describe('Experience Data Model', () => {
  describe('Pattern Type and Schema', () => {
    it('should validate a complete valid Pattern', () => {
      const validPattern: Pattern = {
        id: 'pattern_123',
        description: 'User tends to search then browse related items',
        frequency: 15,
        confidence: 0.85,
        nodes: ['search_node', 'results_node', 'item_node'],
        contexts: ['shopping', 'research'],
        successRate: 0.72,
        avgTraversalTime: 2500,
        lastSeen: new Date('2024-01-15T10:00:00Z'),
      };

      expect(() => PatternSchema.parse(validPattern)).not.toThrow();
      expect(validatePattern(validPattern)).toBe(true);
    });

    it('should validate Pattern with minimal data', () => {
      const minimalPattern: Pattern = {
        id: 'pattern_min',
        description: 'Simple pattern',
        frequency: 1,
        confidence: 0.5,
        nodes: ['node1'],
        contexts: [],
        successRate: 0.0,
        avgTraversalTime: 0,
        lastSeen: new Date(),
      };

      expect(() => PatternSchema.parse(minimalPattern)).not.toThrow();
      expect(validatePattern(minimalPattern)).toBe(true);
    });

    it('should reject Pattern with invalid confidence range', () => {
      const invalidPattern = {
        id: 'pattern_invalid',
        description: 'Invalid pattern',
        frequency: 1,
        confidence: 1.5, // Invalid: > 1
        nodes: ['node1'],
        contexts: [],
        successRate: 0.5,
        avgTraversalTime: 100,
        lastSeen: new Date(),
      };

      expect(() => PatternSchema.parse(invalidPattern)).toThrow();
      expect(validatePattern(invalidPattern)).toBe(false);
    });

    it('should reject Pattern with empty nodes array', () => {
      const invalidPattern = {
        id: 'pattern_empty_nodes',
        description: 'Pattern with no nodes',
        frequency: 1,
        confidence: 0.5,
        nodes: [], // Invalid: empty array
        contexts: ['test'],
        successRate: 0.5,
        avgTraversalTime: 100,
        lastSeen: new Date(),
      };

      expect(() => PatternSchema.parse(invalidPattern)).toThrow();
      expect(validatePattern(invalidPattern)).toBe(false);
    });

    it('should reject Pattern with negative frequency', () => {
      const invalidPattern = {
        id: 'pattern_negative_freq',
        description: 'Pattern with negative frequency',
        frequency: -1, // Invalid: negative
        confidence: 0.5,
        nodes: ['node1'],
        contexts: ['test'],
        successRate: 0.5,
        avgTraversalTime: 100,
        lastSeen: new Date(),
      };

      expect(() => PatternSchema.parse(invalidPattern)).toThrow();
      expect(validatePattern(invalidPattern)).toBe(false);
    });
  });

  describe('Insight Type and Schema', () => {
    it('should validate a complete valid Insight', () => {
      const validInsight: Insight = {
        id: 'insight_123',
        type: 'optimization',
        description: 'Users who start with search have 85% higher success rate',
        confidence: 0.92,
        evidence: ['exp_001', 'exp_002', 'exp_003'],
        impact: 'high',
        actionable: true,
        timestamp: new Date('2024-01-15T10:00:00Z'),
      };

      expect(() => InsightSchema.parse(validInsight)).not.toThrow();
      expect(validateInsight(validInsight)).toBe(true);
    });

    it('should validate all insight types', () => {
      const types: Array<Insight['type']> = ['optimization', 'warning', 'discovery', 'trend'];
      
      for (const type of types) {
        const insight: Insight = {
          id: `insight_${type}`,
          type,
          description: `Test ${type} insight`,
          confidence: 0.75,
          evidence: ['exp_001'],
          impact: 'medium',
          actionable: false,
          timestamp: new Date(),
        };

        expect(() => InsightSchema.parse(insight)).not.toThrow();
        expect(validateInsight(insight)).toBe(true);
      }
    });

    it('should validate all impact levels', () => {
      const impacts: Array<Insight['impact']> = ['low', 'medium', 'high'];
      
      for (const impact of impacts) {
        const insight: Insight = {
          id: `insight_${impact}`,
          type: 'discovery',
          description: `Test ${impact} impact insight`,
          confidence: 0.75,
          evidence: ['exp_001'],
          impact,
          actionable: true,
          timestamp: new Date(),
        };

        expect(() => InsightSchema.parse(insight)).not.toThrow();
        expect(validateInsight(insight)).toBe(true);
      }
    });

    it('should reject Insight with invalid type', () => {
      const invalidInsight = {
        id: 'insight_invalid',
        type: 'invalid_type', // Invalid type
        description: 'Invalid insight',
        confidence: 0.5,
        evidence: ['exp_001'],
        impact: 'medium',
        actionable: true,
        timestamp: new Date(),
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
      expect(validateInsight(invalidInsight)).toBe(false);
    });

    it('should reject Insight with confidence out of range', () => {
      const invalidInsight = {
        id: 'insight_invalid_conf',
        type: 'optimization',
        description: 'Invalid confidence insight',
        confidence: -0.1, // Invalid: < 0
        evidence: ['exp_001'],
        impact: 'medium',
        actionable: true,
        timestamp: new Date(),
      };

      expect(() => InsightSchema.parse(invalidInsight)).toThrow();
      expect(validateInsight(invalidInsight)).toBe(false);
    });
  });

  describe('ExperienceMetrics Type and Schema', () => {
    it('should validate complete valid ExperienceMetrics', () => {
      const validMetrics: ExperienceMetrics = {
        totalExperiences: 150,
        successRate: 0.68,
        avgTraversalTime: 1850,
        mostCommonPaths: [
          { path: ['start', 'search', 'results'], frequency: 45 },
          { path: ['start', 'browse', 'item'], frequency: 32 },
        ],
        topPatterns: [
          {
            id: 'pattern_1',
            description: 'Search then browse pattern',
            frequency: 25,
            confidence: 0.85,
            nodes: ['search', 'browse'],
            contexts: ['shopping'],
            successRate: 0.9,
            avgTraversalTime: 2000,
            lastSeen: new Date(),
          },
        ],
        recentTrends: [
          { metric: 'success_rate', change: 0.05, timeframe: '7d' },
          { metric: 'avg_time', change: -150, timeframe: '7d' },
        ],
        contextDistribution: {
          shopping: 85,
          research: 45,
          browsing: 20,
        },
      };

      expect(() => ExperienceMetricsSchema.parse(validMetrics)).not.toThrow();
      expect(validateExperienceMetrics(validMetrics)).toBe(true);
    });

    it('should validate metrics with empty arrays', () => {
      const emptyMetrics: ExperienceMetrics = {
        totalExperiences: 0,
        successRate: 0.0,
        avgTraversalTime: 0,
        mostCommonPaths: [],
        topPatterns: [],
        recentTrends: [],
        contextDistribution: {},
      };

      expect(() => ExperienceMetricsSchema.parse(emptyMetrics)).not.toThrow();
      expect(validateExperienceMetrics(emptyMetrics)).toBe(true);
    });

    it('should reject metrics with negative totalExperiences', () => {
      const invalidMetrics = {
        totalExperiences: -1, // Invalid: negative
        successRate: 0.5,
        avgTraversalTime: 1000,
        mostCommonPaths: [],
        topPatterns: [],
        recentTrends: [],
        contextDistribution: {},
      };

      expect(() => ExperienceMetricsSchema.parse(invalidMetrics)).toThrow();
      expect(validateExperienceMetrics(invalidMetrics)).toBe(false);
    });

    it('should reject metrics with invalid path frequency', () => {
      const invalidMetrics = {
        totalExperiences: 10,
        successRate: 0.5,
        avgTraversalTime: 1000,
        mostCommonPaths: [
          { path: ['node1'], frequency: 0 }, // Invalid: frequency must be positive
        ],
        topPatterns: [],
        recentTrends: [],
        contextDistribution: {},
      };

      expect(() => ExperienceMetricsSchema.parse(invalidMetrics)).toThrow();
      expect(validateExperienceMetrics(invalidMetrics)).toBe(false);
    });
  });

  describe('Enhanced Experience Type and Schema', () => {
    it('should validate enhanced Experience with all fields', () => {
      const enhancedExperience: Experience = {
        id: 'exp_enhanced_123',
        path: ['start', 'search', 'results', 'item', 'purchase'],
        context: 'online shopping session',
        outcome: 'success',
        feedback: 'User found desired item quickly',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        traversalTime: 2500,
        reinforcement: 0.85,
        patterns: [
          {
            id: 'pattern_search',
            description: 'Search-first pattern',
            frequency: 10,
            confidence: 0.8,
            nodes: ['search', 'results'],
            contexts: ['shopping'],
            successRate: 0.9,
            avgTraversalTime: 1500,
            lastSeen: new Date(),
          },
        ],
        insights: [
          {
            id: 'insight_efficiency',
            type: 'optimization',
            description: 'Search improves efficiency',
            confidence: 0.88,
            evidence: ['exp_001', 'exp_002'],
            impact: 'medium',
            actionable: true,
            timestamp: new Date(),
          },
        ],
        relatedExperiences: ['exp_001', 'exp_002'],
        confidence: 0.92,
        metadata: {
          userAgent: 'Mozilla/5.0...',
          sessionId: 'session_123',
          device: 'mobile',
        },
      };

      expect(() => ExperienceSchema.parse(enhancedExperience)).not.toThrow();
      expect(validateExperience(enhancedExperience)).toBe(true);
    });

    it('should validate Experience with minimal required fields only', () => {
      const minimalExperience: Experience = {
        id: 'exp_minimal',
        path: ['node1', 'node2'],
        context: 'test context',
        outcome: 'neutral',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
      };

      expect(() => ExperienceSchema.parse(minimalExperience)).not.toThrow();
      expect(validateExperience(minimalExperience)).toBe(true);
    });

    it('should validate all outcome types', () => {
      const outcomes: Array<Experience['outcome']> = ['success', 'failure', 'neutral'];
      
      for (const outcome of outcomes) {
        const experience: Experience = {
          id: `exp_${outcome}`,
          path: ['node1', 'node2'],
          context: `test ${outcome}`,
          outcome,
          timestamp: new Date(),
          traversalTime: 100,
          reinforcement: 0.5,
        };

        expect(() => ExperienceSchema.parse(experience)).not.toThrow();
        expect(validateExperience(experience)).toBe(true);
      }
    });

    it('should reject Experience with invalid confidence range', () => {
      const invalidExperience = {
        id: 'exp_invalid_conf',
        path: ['node1', 'node2'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
        confidence: 1.5, // Invalid: > 1
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience)).toBe(false);
    });

    it('should reject Experience with empty path', () => {
      const invalidExperience = {
        id: 'exp_empty_path',
        path: [], // Invalid: empty path
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience)).toBe(false);
    });

    it('should reject Experience with negative traversalTime', () => {
      const invalidExperience = {
        id: 'exp_negative_time',
        path: ['node1', 'node2'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: -100, // Invalid: negative
        reinforcement: 0.5,
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience)).toBe(false);
    });

    it('should reject Experience with invalid reinforcement range', () => {
      const invalidExperience = {
        id: 'exp_invalid_reinforcement',
        path: ['node1', 'node2'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 2.0, // Invalid: > 1
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience)).toBe(false);
    });

    it('should handle complex metadata validation', () => {
      const experienceWithComplexMetadata: Experience = {
        id: 'exp_complex_meta',
        path: ['start', 'end'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
        metadata: {
          nested: {
            data: {
              value: 42,
              array: [1, 2, 3],
            },
          },
          nullValue: null,
          booleanValue: true,
          stringValue: 'test',
        },
      };

      expect(() => ExperienceSchema.parse(experienceWithComplexMetadata)).not.toThrow();
      expect(validateExperience(experienceWithComplexMetadata)).toBe(true);
    });
  });

  describe('Cross-Type Validation', () => {
    it('should validate Experience containing valid Pattern and Insight arrays', () => {
      const pattern: Pattern = {
        id: 'pattern_test',
        description: 'Test pattern',
        frequency: 5,
        confidence: 0.7,
        nodes: ['node1', 'node2'],
        contexts: ['test'],
        successRate: 0.8,
        avgTraversalTime: 1000,
        lastSeen: new Date(),
      };

      const insight: Insight = {
        id: 'insight_test',
        type: 'discovery',
        description: 'Test insight',
        confidence: 0.75,
        evidence: ['exp_001'],
        impact: 'low',
        actionable: false,
        timestamp: new Date(),
      };

      const experience: Experience = {
        id: 'exp_cross_validation',
        path: ['node1', 'node2'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
        patterns: [pattern],
        insights: [insight],
      };

      expect(() => ExperienceSchema.parse(experience)).not.toThrow();
      expect(validateExperience(experience)).toBe(true);
    });

    it('should reject Experience with invalid nested Pattern', () => {
      const invalidPattern = {
        id: 'pattern_invalid',
        description: 'Invalid pattern',
        frequency: -1, // Invalid
        confidence: 0.7,
        nodes: ['node1'],
        contexts: ['test'],
        successRate: 0.8,
        avgTraversalTime: 1000,
        lastSeen: new Date(),
      };

      const experience = {
        id: 'exp_invalid_pattern',
        path: ['node1', 'node2'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
        patterns: [invalidPattern], // Invalid pattern in array
      };

      expect(() => ExperienceSchema.parse(experience)).toThrow();
      expect(validateExperience(experience)).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined and null values correctly', () => {
      expect(validateExperience(undefined)).toBe(false);
      expect(validateExperience(null)).toBe(false);
      expect(validatePattern(undefined)).toBe(false);
      expect(validatePattern(null)).toBe(false);
      expect(validateInsight(undefined)).toBe(false);
      expect(validateInsight(null)).toBe(false);
      expect(validateExperienceMetrics(undefined)).toBe(false);
      expect(validateExperienceMetrics(null)).toBe(false);
    });

    it('should handle non-object values', () => {
      expect(validateExperience('string')).toBe(false);
      expect(validateExperience(123)).toBe(false);
      expect(validateExperience([])).toBe(false);
      expect(validatePattern(true)).toBe(false);
      expect(validateInsight(false)).toBe(false);
      expect(validateExperienceMetrics({})).toBe(false);
    });

    it('should validate empty optional arrays', () => {
      const experience: Experience = {
        id: 'exp_empty_arrays',
        path: ['node1', 'node2'],
        context: 'test',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
        patterns: [], // Empty array should be valid
        insights: [], // Empty array should be valid
        relatedExperiences: [], // Empty array should be valid
      };

      expect(() => ExperienceSchema.parse(experience)).not.toThrow();
      expect(validateExperience(experience)).toBe(true);
    });
  });
});