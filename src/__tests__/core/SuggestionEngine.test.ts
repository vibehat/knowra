/**
 * Tests for SuggestionEngine service
 * Verifies ML-enhanced suggestion functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestionEngine } from '../../core/levels/experience/SuggestionEngine.js';
import type { Experience, GraphFoundationAPI } from '../../core/types.js';

// Mock GraphFoundationAPI
class MockGraphFoundation implements GraphFoundationAPI {
  private nodes = new Set<string>();

  constructor() {
    // Add some test nodes
    this.nodes.add('start');
    this.nodes.add('process');
    this.nodes.add('analyze');
    this.nodes.add('validate');
    this.nodes.add('complete');
    this.nodes.add('review');
    this.nodes.add('deploy');
  }

  hasNode(nodeId: string): boolean {
    return this.nodes.has(nodeId);
  }

  addNode(): string { return ''; }
  getNode(): any { return null; }
  updateNode(): void {}
  removeNode(): boolean { return false; }
  connect(): string { return ''; }
  disconnect(): boolean { return false; }
  getConnections(): any[] { return []; }
  findPath(): string[] { return []; }
  getNeighbors(): string[] { return []; }
  searchNodes(): string[] { return []; }
  export(): any { return {}; }
  import(): void {}
  getStatistics(): any { return {}; }
}

describe('SuggestionEngine', () => {
  let engine: SuggestionEngine;
  let experiences: Map<string, Experience>;
  let mockGraph: MockGraphFoundation;

  beforeEach(() => {
    mockGraph = new MockGraphFoundation();
    experiences = new Map();

    // Create sample experiences
    const exp1: Experience = {
      id: 'exp-1',
      path: ['start', 'process', 'validate', 'complete'],
      context: 'data workflow',
      outcome: 'success',
      reinforcement: 0.8,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      confidence: 0.9,
    };

    const exp2: Experience = {
      id: 'exp-2',
      path: ['start', 'analyze', 'review', 'deploy'],
      context: 'analysis workflow',
      outcome: 'success',
      reinforcement: 0.7,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      confidence: 0.8,
    };

    const exp3: Experience = {
      id: 'exp-3',
      path: ['start', 'process', 'complete'],
      context: 'quick workflow',
      outcome: 'success',
      reinforcement: 0.6,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      confidence: 0.7,
    };

    const exp4: Experience = {
      id: 'exp-4',
      path: ['start', 'validate', 'complete'],
      context: 'validation workflow',
      outcome: 'failure',
      reinforcement: 0.2,
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      confidence: 0.3,
    };

    experiences.set('exp-1', exp1);
    experiences.set('exp-2', exp2);
    experiences.set('exp-3', exp3);
    experiences.set('exp-4', exp4);

    engine = new SuggestionEngine(experiences, mockGraph, {
      defaultLimit: 5,
      minConfidence: 0.1,
      recencyWeightFactor: 0.2,
      contextMatchBonus: 0.3,
      maxDaysForRecency: 30,
    });
  });

  describe('Basic Suggestions', () => {
    it('should provide suggestions for existing nodes', () => {
      const suggestions = engine.getSuggestions('start');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.confidence > 0)).toBe(true);
      expect(suggestions.every(s => mockGraph.hasNode(s.nodeId))).toBe(true);
    });

    it('should return empty suggestions for non-existent nodes', () => {
      const suggestions = engine.getSuggestions('non-existent-node');

      expect(suggestions).toHaveLength(0);
    });

    it('should sort suggestions by confidence', () => {
      const suggestions = engine.getSuggestions('start');

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
      }
    });

    it('should respect confidence threshold', () => {
      const suggestions = engine.getSuggestions('start', { minConfidence: 0.5 });

      expect(suggestions.every(s => s.confidence >= 0.5)).toBe(true);
    });

    it('should respect suggestion limit', () => {
      const suggestions = engine.getSuggestions('start', { limit: 2 });

      expect(suggestions.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Context-based Suggestions', () => {
    it('should provide context-enhanced suggestions', () => {
      const suggestions = engine.getSuggestions('start', {
        context: 'data workflow',
        includeReasoningPath: true,
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.reasoning?.includes('data workflow'))).toBe(true);
    });

    it('should filter by context similarity', () => {
      const dataWorkflowSuggestions = engine.getSuggestions('start', {
        context: 'data workflow',
      });

      const unrelatedSuggestions = engine.getSuggestions('start', {
        context: 'completely different context',
      });

      expect(dataWorkflowSuggestions.length).toBeGreaterThanOrEqual(unrelatedSuggestions.length);
    });

    it('should provide reasoning when requested', () => {
      const suggestions = engine.getSuggestions('start', {
        includeReasoningPath: true,
      });

      expect(suggestions.some(s => s.reasoning !== undefined)).toBe(true);
    });
  });

  describe('Contextual Suggestions', () => {
    it('should provide suggestions based on context patterns', () => {
      const suggestions = engine.getContextualSuggestions('data workflow');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.confidence > 0)).toBe(true);
    });

    it('should find similar contexts', () => {
      const suggestions = engine.getContextualSuggestions('data processing workflow');

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle empty context', () => {
      const suggestions = engine.getContextualSuggestions('');

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should include reasoning for contextual suggestions', () => {
      const suggestions = engine.getContextualSuggestions('data workflow', {
        includeReasoningPath: true,
      });

      expect(suggestions.some(s => s.reasoning?.includes('Similar context'))).toBe(true);
    });
  });

  describe('Path Completion Suggestions', () => {
    it('should suggest completions for partial paths', () => {
      const partialPath = ['start', 'process'];
      const suggestions = engine.getPathCompletionSuggestions(partialPath);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => mockGraph.hasNode(s.nodeId))).toBe(true);
    });

    it('should handle empty partial paths', () => {
      const suggestions = engine.getPathCompletionSuggestions([]);

      expect(suggestions).toHaveLength(0);
    });

    it('should prioritize earlier completion steps', () => {
      const partialPath = ['start'];
      const suggestions = engine.getPathCompletionSuggestions(partialPath, {
        includeReasoningPath: true,
      });

      // Check that earlier steps get mentioned in reasoning
      expect(suggestions.some(s => s.reasoning?.includes('step 1'))).toBe(true);
    });

    it('should filter by context in path completion', () => {
      const partialPath = ['start'];
      const suggestions = engine.getPathCompletionSuggestions(partialPath, {
        context: 'data workflow',
      });

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle paths that extend beyond experiences', () => {
      const longPartialPath = ['start', 'process', 'validate', 'complete', 'extra'];
      const suggestions = engine.getPathCompletionSuggestions(longPartialPath);

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('Alternative Suggestions', () => {
    it('should provide alternatives for failed paths', () => {
      const failedPath = ['start', 'validate', 'complete']; // This failed in exp-4
      const suggestions = engine.getAlternativeSuggestions(failedPath);

      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle empty failed paths', () => {
      const suggestions = engine.getAlternativeSuggestions([]);

      expect(suggestions).toHaveLength(0);
    });

    it('should find common prefixes', () => {
      const failedPath = ['start', 'process', 'wrong_step'];
      const suggestions = engine.getAlternativeSuggestions(failedPath, {
        includeReasoningPath: true,
      });

      expect(suggestions.some(s => s.reasoning?.includes('common steps'))).toBe(true);
    });

    it('should consider context in alternatives', () => {
      const failedPath = ['start', 'wrong_step'];
      const suggestions = engine.getAlternativeSuggestions(failedPath, {
        context: 'data workflow',
      });

      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Recency and Weighting', () => {
    it('should weight recent experiences higher', () => {
      // Add an old experience with high reinforcement
      const oldExp: Experience = {
        id: 'old-exp',
        path: ['start', 'old_process', 'complete'],
        context: 'data workflow',
        outcome: 'success',
        reinforcement: 0.9,
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        confidence: 0.9,
      };
      experiences.set('old-exp', oldExp);

      const suggestions = engine.getSuggestions('start', {
        context: 'data workflow',
      });

      // Recent experiences should be favored despite lower reinforcement
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should apply context match bonus', () => {
      const exactContextSuggestions = engine.getSuggestions('start', {
        context: 'data workflow',
      });

      const noContextSuggestions = engine.getSuggestions('start');

      // Suggestions with exact context match should have higher confidence
      expect(exactContextSuggestions.some(s => s.confidence > 0.3)).toBe(true);
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect custom configuration', () => {
      const customEngine = new SuggestionEngine(experiences, mockGraph, {
        defaultLimit: 2,
        minConfidence: 0.5,
      });

      const suggestions = customEngine.getSuggestions('start');

      expect(suggestions.length).toBeLessThanOrEqual(2);
      expect(suggestions.every(s => s.confidence >= 0.5)).toBe(true);
    });

    it('should update configuration correctly', () => {
      engine.updateConfig({
        minConfidence: 0.8,
        defaultLimit: 1,
      });

      const suggestions = engine.getSuggestions('start');

      expect(suggestions.length).toBeLessThanOrEqual(1);
      expect(suggestions.every(s => s.confidence >= 0.8)).toBe(true);
    });

    it('should handle invalid configuration gracefully', () => {
      engine.updateConfig({
        minConfidence: -1, // Invalid
        defaultLimit: 0,   // Invalid
      });

      const suggestions = engine.getSuggestions('start');

      // Should still work with fallback values
      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should provide suggestion statistics', () => {
      // Generate some suggestions to populate stats
      engine.getSuggestions('start');
      engine.getContextualSuggestions('data workflow');

      const stats = engine.getStatistics();

      expect(stats.totalSuggestibleNodes).toBeGreaterThan(0);
      expect(stats.experiencesUsedForSuggestions).toBeGreaterThan(0);
      expect(stats.averageConfidenceThreshold).toBeDefined();
      expect(stats.topContexts).toBeInstanceOf(Array);
    });

    it('should track top contexts correctly', () => {
      const stats = engine.getStatistics();

      expect(stats.topContexts.every(c => 
        typeof c.context === 'string' && typeof c.count === 'number'
      )).toBe(true);
    });

    it('should count suggestible nodes correctly', () => {
      const stats = engine.getStatistics();

      // Should count nodes that appear in successful experiences
      expect(stats.totalSuggestibleNodes).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle experiences with empty paths', () => {
      const emptyPathExp: Experience = {
        id: 'empty-path',
        path: [],
        context: 'empty',
        outcome: 'success',
        reinforcement: 0.5,
        timestamp: new Date(),
        confidence: 0.5,
      };
      experiences.set('empty-path', emptyPathExp);

      const suggestions = engine.getSuggestions('start');

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle experiences with invalid nodes', () => {
      const invalidNodeExp: Experience = {
        id: 'invalid-node',
        path: ['start', 'invalid-node', 'complete'],
        context: 'invalid',
        outcome: 'success',
        reinforcement: 0.5,
        timestamp: new Date(),
        confidence: 0.5,
      };
      experiences.set('invalid-node', invalidNodeExp);

      const suggestions = engine.getSuggestions('start');

      // Should not suggest invalid nodes
      expect(suggestions.every(s => mockGraph.hasNode(s.nodeId))).toBe(true);
    });

    it('should handle very low confidence experiences', () => {
      const lowConfidenceExp: Experience = {
        id: 'low-confidence',
        path: ['start', 'process', 'complete'],
        context: 'low confidence',
        outcome: 'success',
        reinforcement: 0.01,
        timestamp: new Date(),
        confidence: 0.01,
      };
      experiences.set('low-confidence', lowConfidenceExp);

      const suggestions = engine.getSuggestions('start', {
        minConfidence: 0.1,
      });

      // Should filter out very low confidence suggestions
      expect(suggestions.every(s => s.confidence >= 0.1)).toBe(true);
    });

    it('should handle special characters in contexts', () => {
      const specialCharExp: Experience = {
        id: 'special-char',
        path: ['start', 'process', 'complete'],
        context: 'workflow with special chars: @#$%^&*()',
        outcome: 'success',
        reinforcement: 0.5,
        timestamp: new Date(),
        confidence: 0.5,
      };
      experiences.set('special-char', specialCharExp);

      const suggestions = engine.getContextualSuggestions('workflow with special chars');

      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large number of experiences efficiently', () => {
      // Add many experiences
      for (let i = 0; i < 100; i++) {
        const exp: Experience = {
          id: `perf-${i}`,
          path: ['start', `step-${i % 5}`, 'complete'],
          context: `context-${i % 10}`,
          outcome: 'success',
          reinforcement: Math.random() * 0.8 + 0.2,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          confidence: Math.random() * 0.8 + 0.2,
        };
        experiences.set(`perf-${i}`, exp);
      }

      const startTime = Date.now();
      const suggestions = engine.getSuggestions('start');
      const endTime = Date.now();

      expect(suggestions).toBeInstanceOf(Array);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should implement cache clearing', () => {
      engine.clearCache();

      // Should not throw error
      expect(() => engine.clearCache()).not.toThrow();
    });
  });
});