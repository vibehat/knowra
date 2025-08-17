/**
 * Tests for PatternValidator - Pattern validation, refinement, and quality assessment
 * Verifies validation logic, feedback processing, and pattern refinement capabilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternValidator } from '../../core/levels/experience/PatternValidator.js';
import { GraphFoundation } from '../../core/GraphFoundation.js';
import type { Information, Pattern, GraphPattern } from '../../core/types.js';

// Helper function to create valid Information nodes
function createNode(id: string, content: string, type: string): Information {
  const now = new Date();
  return {
    id,
    content,
    type,
    created: now,
    modified: now,
  };
}

// Helper function to create valid Relationship edges
function createEdge(from: string, to: string, type: string, strength?: number) {
  return {
    from,
    to,
    type,
    created: new Date(),
    strength,
  };
}

// Helper to create test sequential pattern
function createSequentialPattern(
  id: string,
  nodes: string[],
  confidence: number,
  frequency: number,
  successRate = 0.8
): Pattern {
  return {
    id,
    description: `Test pattern ${id}`,
    frequency,
    confidence,
    nodes,
    contexts: ['test'],
    successRate,
    avgTraversalTime: 100,
    lastSeen: new Date(),
  };
}

// Helper to create test graph pattern
function createGraphPattern(
  id: string,
  type: 'star' | 'chain' | 'cycle' | 'cluster' | 'hub',
  nodes: string[],
  edges: Array<{ from: string; to: string; type: string }>,
  confidence: number,
  support: number
): GraphPattern {
  return {
    id,
    type,
    description: `Test ${type} pattern`,
    nodes,
    edges,
    frequency: 1,
    confidence,
    support,
    contexts: ['test'],
    lastSeen: new Date(),
  };
}

describe('PatternValidator', () => {
  let validator: PatternValidator;
  let graph: GraphFoundation;

  beforeEach(() => {
    validator = new PatternValidator({
      minValidationScore: 0.6,
      enableAutoRefinement: true,
      maxRefinementIterations: 3,
      feedbackWeightingEnabled: true,
      validationCriteria: {
        minSupport: 0.1,
        minConfidence: 0.3,
        minFrequency: 2,
        maxPatternAge: 90,
        minSuccessRate: 0.4,
        structuralValidityRequired: true,
      },
    });

    graph = new GraphFoundation();
  });

  describe('Sequential Pattern Validation', () => {
    it('should validate a good sequential pattern', () => {
      const pattern = createSequentialPattern(
        'good-seq',
        ['step1', 'step2', 'step3'],
        0.8,
        5,
        0.9
      );

      const report = validator.validateSequentialPattern(pattern);

      expect(report.patternId).toBe('good-seq');
      expect(report.patternType).toBe('sequential');
      expect(report.overallScore).toBeGreaterThan(0.6);
      expect(report.needsRefinement).toBe(false);
      expect(report.validationResults.structural.valid).toBe(true);
      expect(report.validationResults.statistical.valid).toBe(true);
    });

    it('should identify issues in a bad sequential pattern', () => {
      const pattern = createSequentialPattern(
        'bad-seq',
        ['a'], // Too short
        0.1,    // Low confidence
        1,      // Low frequency
        0.2     // Low success rate
      );

      const report = validator.validateSequentialPattern(pattern);

      expect(report.overallScore).toBeLessThan(0.6);
      expect(report.needsRefinement).toBe(true);
      expect(report.validationResults.structural.valid).toBe(false);
      expect(report.validationResults.statistical.valid).toBe(false);
      expect(report.validationResults.structural.issues.length).toBeGreaterThan(0);
    });

    it('should detect duplicate nodes in sequential patterns', () => {
      const pattern = createSequentialPattern(
        'duplicate-seq',
        ['step1', 'step2', 'step1'], // Duplicate
        0.5,
        3
      );

      const report = validator.validateSequentialPattern(pattern);

      expect(report.validationResults.structural.valid).toBe(false);
      expect(report.validationResults.structural.issues).toContain(
        'Pattern contains duplicate nodes in sequence'
      );
    });

    it('should flag overly long patterns', () => {
      const longNodes = Array.from({ length: 25 }, (_, i) => `node${i}`);
      const pattern = createSequentialPattern(
        'long-seq',
        longNodes,
        0.7,
        2
      );

      const report = validator.validateSequentialPattern(pattern);

      expect(report.validationResults.structural.issues).toContain(
        'Pattern is unusually long and may be too specific'
      );
    });

    it('should validate temporal aspects of patterns', () => {
      const oldPattern = createSequentialPattern(
        'old-seq',
        ['step1', 'step2', 'step3'],
        0.8,
        5
      );
      
      // Make pattern very old
      oldPattern.lastSeen = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);

      const report = validator.validateSequentialPattern(oldPattern);

      expect(report.validationResults.temporal.valid).toBe(false);
      expect(report.validationResults.temporal.issues.length).toBeGreaterThan(0);
      expect(report.validationResults.temporal.issues[0]).toMatch(/Pattern is \d+ days old/);
    });
  });

  describe('Graph Pattern Validation', () => {
    beforeEach(() => {
      // Set up test graph
      graph.addNode(createNode('hub', 'Hub Node', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'leaf'));

      graph.addEdge(createEdge('hub', 'leaf1', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf2', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf3', 'connects'));
    });

    it('should validate a good star graph pattern', () => {
      const pattern = createGraphPattern(
        'good-star',
        'star',
        ['hub', 'leaf1', 'leaf2', 'leaf3'],
        [
          { from: 'hub', to: 'leaf1', type: 'connects' },
          { from: 'hub', to: 'leaf2', type: 'connects' },
          { from: 'hub', to: 'leaf3', type: 'connects' },
        ],
        0.8,
        0.5
      );

      const report = validator.validateGraphPattern(pattern, graph);

      expect(report.patternType).toBe('graph');
      expect(report.overallScore).toBeGreaterThan(0.6);
      expect(report.needsRefinement).toBe(false);
      expect(report.validationResults.structural.valid).toBe(true);
    });

    it('should detect non-existent nodes in graph patterns', () => {
      const pattern = createGraphPattern(
        'invalid-nodes',
        'star',
        ['nonexistent', 'hub', 'leaf1'],
        [
          { from: 'nonexistent', to: 'hub', type: 'connects' },
          { from: 'hub', to: 'leaf1', type: 'connects' },
        ],
        0.7,
        0.4
      );

      const report = validator.validateGraphPattern(pattern, graph);

      expect(report.validationResults.structural.valid).toBe(false);
      expect(report.validationResults.structural.issues).toContain(
        'Pattern references non-existent node: nonexistent'
      );
    });

    it('should detect non-existent edges in graph patterns', () => {
      const pattern = createGraphPattern(
        'invalid-edges',
        'star',
        ['hub', 'leaf1', 'leaf2'],
        [
          { from: 'hub', to: 'leaf1', type: 'connects' },
          { from: 'leaf1', to: 'leaf2', type: 'nonexistent_type' }, // Invalid edge type
        ],
        0.7,
        0.4
      );

      const report = validator.validateGraphPattern(pattern, graph);

      expect(report.validationResults.structural.valid).toBe(false);
      expect(report.validationResults.structural.issues).toContain(
        'Pattern references non-existent edge: leaf1 -> leaf2 (nonexistent_type)'
      );
    });

    it('should validate statistical aspects of graph patterns', () => {
      const pattern = createGraphPattern(
        'low-stats',
        'star',
        ['hub', 'leaf1'],
        [{ from: 'hub', to: 'leaf1', type: 'connects' }],
        0.1, // Low confidence
        0.05 // Low support
      );

      const report = validator.validateGraphPattern(pattern, graph);

      expect(report.validationResults.statistical.valid).toBe(false);
      expect(report.validationResults.statistical.issues.length).toBeGreaterThan(0);
    });

    it('should validate semantic consistency', () => {
      // Add nodes with same type for cluster validation
      graph.addNode(createNode('cluster1', 'Cluster Node 1', 'same_type'));
      graph.addNode(createNode('cluster2', 'Cluster Node 2', 'same_type'));
      graph.addNode(createNode('cluster3', 'Cluster Node 3', 'same_type'));

      graph.addEdge(createEdge('cluster1', 'cluster2', 'related'));
      graph.addEdge(createEdge('cluster2', 'cluster3', 'related'));

      const clusterPattern = createGraphPattern(
        'good-cluster',
        'cluster',
        ['cluster1', 'cluster2', 'cluster3'],
        [
          { from: 'cluster1', to: 'cluster2', type: 'related' },
          { from: 'cluster2', to: 'cluster3', type: 'related' },
        ],
        0.7,
        0.4
      );

      const report = validator.validateGraphPattern(clusterPattern, graph);

      expect(report.validationResults.semantic.valid).toBe(true);
    });
  });

  describe('Feedback Processing', () => {
    it('should submit and store feedback', () => {
      const pattern = createSequentialPattern('feedback-test', ['a', 'b', 'c'], 0.7, 3);
      validator.validateSequentialPattern(pattern);

      const feedbackId = validator.submitFeedback({
        patternId: 'feedback-test',
        patternType: 'sequential',
        feedbackType: 'positive',
        rating: 4,
        comments: 'This pattern is helpful',
      });

      expect(feedbackId).toBeDefined();
      expect(typeof feedbackId).toBe('string');
      expect(feedbackId.length).toBeGreaterThan(0);

      const feedback = validator.getPatternFeedback('feedback-test');
      expect(feedback.length).toBe(1);
      expect(feedback[0].rating).toBe(4);
      expect(feedback[0].comments).toBe('This pattern is helpful');
    });

    it('should accumulate multiple feedback entries', () => {
      const pattern = createSequentialPattern('multi-feedback', ['x', 'y', 'z'], 0.6, 2);
      validator.validateSequentialPattern(pattern);

      validator.submitFeedback({
        patternId: 'multi-feedback',
        patternType: 'sequential',
        feedbackType: 'positive',
        rating: 5,
      });

      validator.submitFeedback({
        patternId: 'multi-feedback',
        patternType: 'sequential',
        feedbackType: 'negative',
        rating: 2,
        comments: 'Not very useful',
      });

      const feedback = validator.getPatternFeedback('multi-feedback');
      expect(feedback.length).toBe(2);
      expect(feedback[0].feedbackType).toBe('positive');
      expect(feedback[1].feedbackType).toBe('negative');
    });

    it('should process feedback with suggested changes', () => {
      const pattern = createGraphPattern(
        'change-suggestion',
        'star',
        ['hub', 'leaf1', 'leaf2'],
        [
          { from: 'hub', to: 'leaf1', type: 'connects' },
          { from: 'hub', to: 'leaf2', type: 'connects' },
        ],
        0.5,
        0.3
      );

      validator.validateGraphPattern(pattern, graph);

      const feedbackId = validator.submitFeedback({
        patternId: 'change-suggestion',
        patternType: 'graph',
        feedbackType: 'correction',
        rating: 3,
        suggestedChanges: {
          addNodes: ['leaf3'],
          modifyEdges: [{ from: 'hub', to: 'leaf3', action: 'add' }],
        },
      });

      expect(feedbackId).toBeDefined();

      const feedback = validator.getPatternFeedback('change-suggestion');
      expect(feedback[0].suggestedChanges?.addNodes).toContain('leaf3');
    });
  });

  describe('Pattern Refinement', () => {
    it('should refine patterns based on negative feedback', () => {
      const sequentialPattern = createSequentialPattern('refine-seq', ['a', 'b', 'c'], 0.8, 5);
      const graphPattern = createGraphPattern(
        'refine-graph',
        'cluster',
        ['n1', 'n2', 'n3'],
        [
          { from: 'n1', to: 'n2', type: 'related' },
          { from: 'n2', to: 'n3', type: 'related' },
        ],
        0.7,
        0.4
      );

      // Add negative feedback
      validator.submitFeedback({
        patternId: 'refine-seq',
        patternType: 'sequential',
        feedbackType: 'negative',
        rating: 1,
      });

      validator.submitFeedback({
        patternId: 'refine-seq',
        patternType: 'sequential',
        feedbackType: 'negative',
        rating: 2,
      });

      validator.submitFeedback({
        patternId: 'refine-graph',
        patternType: 'graph',
        feedbackType: 'negative',
        rating: 1,
      });

      validator.submitFeedback({
        patternId: 'refine-graph',
        patternType: 'graph',
        feedbackType: 'negative',
        rating: 2,
      });

      const result = validator.refinePatterns([sequentialPattern], [graphPattern], graph);

      expect(result.refinements.length).toBeGreaterThan(0);
      expect(result.refinedSequential.length).toBe(1);
      expect(result.refinedGraph.length).toBe(1);

      // Refined patterns should have adjusted confidence
      expect(result.refinedSequential[0].confidence).toBeLessThan(sequentialPattern.confidence);
      expect(result.refinedGraph[0].confidence).toBeLessThan(graphPattern.confidence);
    });

    it('should not refine patterns without sufficient feedback', () => {
      const pattern = createSequentialPattern('no-feedback', ['x', 'y'], 0.6, 3);
      
      const result = validator.refinePatterns([pattern], [], graph);

      expect(result.refinements.length).toBe(0);
      expect(result.refinedSequential[0]).toEqual(pattern); // Unchanged
    });

    it('should track refinement history', () => {
      const pattern = createSequentialPattern('history-test', ['a', 'b'], 0.7, 4);

      // Add negative feedback
      validator.submitFeedback({
        patternId: 'history-test',
        patternType: 'sequential',
        feedbackType: 'negative',
        rating: 1,
      });

      validator.submitFeedback({
        patternId: 'history-test',
        patternType: 'sequential',
        feedbackType: 'negative',
        rating: 2,
      });

      validator.refinePatterns([pattern], [], graph);

      const refinements = validator.getPatternRefinements('history-test');
      expect(refinements.length).toBe(1);
      expect(refinements[0].refinementType).toBe('adjust');
      expect(refinements[0].reason).toContain('negative feedback');
    });
  });

  describe('Validation Reports', () => {
    it('should generate comprehensive validation reports', () => {
      const pattern = createSequentialPattern('report-test', ['step1', 'step2', 'step3'], 0.7, 4);
      
      const report = validator.validateSequentialPattern(pattern);

      expect(report).toHaveProperty('patternId', 'report-test');
      expect(report).toHaveProperty('patternType', 'sequential');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('validationResults');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('needsRefinement');
      expect(report).toHaveProperty('confidence');
      expect(report).toHaveProperty('timestamp');

      expect(report.validationResults).toHaveProperty('structural');
      expect(report.validationResults).toHaveProperty('statistical');
      expect(report.validationResults).toHaveProperty('semantic');
      expect(report.validationResults).toHaveProperty('temporal');
    });

    it('should generate appropriate recommendations', () => {
      const badPattern = createSequentialPattern(
        'bad-recommendations',
        ['a'], // Too short
        0.1,   // Low confidence
        1      // Low frequency
      );

      const report = validator.validateSequentialPattern(badPattern);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations).toContain('Review pattern structure and fix structural issues');
      expect(report.recommendations).toContain('Improve pattern statistics through more observations');
    });

    it('should retrieve stored validation reports', () => {
      const pattern = createSequentialPattern('retrieve-test', ['a', 'b', 'c'], 0.8, 5);
      
      const originalReport = validator.validateSequentialPattern(pattern);
      const retrievedReport = validator.getValidationReport('retrieve-test');

      expect(retrievedReport).toEqual(originalReport);
    });

    it('should return null for non-existent reports', () => {
      const report = validator.getValidationReport('nonexistent');
      expect(report).toBeNull();
    });
  });

  describe('Quality Scores and Visualization', () => {
    it('should track pattern quality scores', () => {
      const goodPattern = createSequentialPattern('good-quality', ['a', 'b', 'c'], 0.9, 10, 0.95);
      const badPattern = createSequentialPattern('bad-quality', ['x'], 0.2, 1, 0.3);

      validator.validateSequentialPattern(goodPattern);
      validator.validateSequentialPattern(badPattern);

      const qualityScores = validator.getPatternQualityScores();

      expect(qualityScores.has('good-quality')).toBe(true);
      expect(qualityScores.has('bad-quality')).toBe(true);
      expect(qualityScores.get('good-quality')!).toBeGreaterThan(qualityScores.get('bad-quality')!);
    });

    it('should generate visualization data', () => {
      // Create patterns with different quality levels
      const highQuality = createSequentialPattern('high-qual', ['a', 'b', 'c'], 0.9, 10, 0.9);
      const mediumQuality = createSequentialPattern('med-qual', ['x', 'y', 'z'], 0.6, 5, 0.7);
      const lowQuality = createSequentialPattern('low-qual', ['p'], 0.2, 1, 0.3);

      validator.validateSequentialPattern(highQuality);
      validator.validateSequentialPattern(mediumQuality);
      validator.validateSequentialPattern(lowQuality);

      // Add some feedback
      validator.submitFeedback({
        patternId: 'high-qual',
        patternType: 'sequential',
        feedbackType: 'positive',
        rating: 5,
      });

      validator.submitFeedback({
        patternId: 'med-qual',
        patternType: 'sequential',
        feedbackType: 'negative',
        rating: 2,
      });

      const vizData = validator.generateVisualizationData();

      expect(vizData.patterns.length).toBe(3);
      expect(vizData.qualityDistribution).toHaveProperty('high');
      expect(vizData.qualityDistribution).toHaveProperty('medium');
      expect(vizData.qualityDistribution).toHaveProperty('low');
      expect(vizData.feedbackSummary).toHaveProperty('positive');
      expect(vizData.feedbackSummary).toHaveProperty('negative');

      // Verify quality distribution
      expect(vizData.qualityDistribution.high).toBeGreaterThanOrEqual(0);
      expect(vizData.qualityDistribution.medium).toBeGreaterThanOrEqual(0);
      expect(vizData.qualityDistribution.low).toBeGreaterThanOrEqual(0);
      
      // At least one should be greater than 0
      const totalDistribution = vizData.qualityDistribution.high + vizData.qualityDistribution.medium + vizData.qualityDistribution.low;
      expect(totalDistribution).toBeGreaterThan(0);

      // Verify feedback summary
      expect(vizData.feedbackSummary.positive).toBe(1);
      expect(vizData.feedbackSummary.negative).toBe(1);

      // Check individual pattern data
      const highQualPattern = vizData.patterns.find(p => p.id === 'high-qual');
      expect(highQualPattern?.validationStatus).toBe('valid');
      expect(highQualPattern?.feedbackCount).toBe(1);

      const lowQualPattern = vizData.patterns.find(p => p.id === 'low-qual');
      expect(lowQualPattern?.validationStatus).toBe('needs_refinement'); // Low quality patterns need refinement
    });
  });

  describe('Configuration and Edge Cases', () => {
    it('should use custom validation criteria', () => {
      const customValidator = new PatternValidator({
        validationCriteria: {
          minConfidence: 0.8, // High threshold
          minFrequency: 10,   // High threshold
        },
      });

      const pattern = createSequentialPattern('custom-criteria', ['a', 'b'], 0.7, 5); // Below thresholds

      const report = customValidator.validateSequentialPattern(pattern);

      expect(report.validationResults.statistical.valid).toBe(false);
      // The overall score might still be high due to other validation aspects
      // so let's check that at least the statistical validation failed
      expect(report.validationResults.statistical.score).toBeLessThan(1.0);
    });

    it('should handle patterns with missing contexts', () => {
      const pattern = createSequentialPattern('no-context', ['a', 'b', 'c'], 0.7, 3);
      pattern.contexts = []; // Remove contexts

      const report = validator.validateSequentialPattern(pattern);

      expect(report.validationResults.semantic.valid).toBe(false);
      expect(report.validationResults.semantic.issues).toContain('Pattern has no associated contexts');
    });

    it('should handle empty feedback gracefully', () => {
      const feedback = validator.getPatternFeedback('nonexistent-pattern');
      expect(feedback).toEqual([]);

      const refinements = validator.getPatternRefinements('nonexistent-pattern');
      expect(refinements).toEqual([]);
    });

    it('should handle invalid feedback submission gracefully', () => {
      // The submitFeedback method expects a pattern to exist, but handles missing patterns
      const feedbackId = validator.submitFeedback({
        patternId: 'nonexistent',
        patternType: 'sequential',
        feedbackType: 'positive',
        rating: 5,
      });

      // Should still return a feedback ID even for non-existent patterns
      expect(feedbackId).toBeDefined();
      expect(typeof feedbackId).toBe('string');
    });
  });
});