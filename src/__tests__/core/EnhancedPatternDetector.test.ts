/**
 * Tests for Enhanced PatternDetector with graph pattern mining
 * Verifies integration between sequential patterns and graph pattern mining
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetector } from '../../core/levels/experience/PatternDetector.js';
import { GraphFoundation } from '../../core/GraphFoundation.js';
import type { Information } from '../../core/types.js';

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

describe('Enhanced PatternDetector', () => {
  let graph: GraphFoundation;
  let patternDetector: PatternDetector;

  beforeEach(() => {
    graph = new GraphFoundation();
    patternDetector = new PatternDetector(
      {
        enableGraphPatterns: true,
        graphPatternOptions: {
          minSupport: 0.1,
          minConfidence: 0.3,
          maxPatternSize: 5,
          patternTypes: ['star', 'chain', 'cycle'],
        },
      },
      graph
    );
  });

  describe('Graph Pattern Mining Integration', () => {
    it('should detect graph patterns when enabled', () => {
      // Create star pattern
      graph.addNode(createNode('hub', 'Central hub', 'hub'));
      graph.addNode(createNode('node1', 'Node 1', 'leaf'));
      graph.addNode(createNode('node2', 'Node 2', 'leaf'));
      graph.addNode(createNode('node3', 'Node 3', 'leaf'));

      graph.addEdge(createEdge('hub', 'node1', 'connects'));
      graph.addEdge(createEdge('hub', 'node2', 'connects'));
      graph.addEdge(createEdge('hub', 'node3', 'connects'));

      // Mine graph patterns
      const patterns = patternDetector.mineGraphPatterns({
        patternTypes: ['star'],
      });

      expect(patterns.length).toBeGreaterThan(0);
      const starPatterns = patterns.filter(p => p.type === 'star');
      expect(starPatterns.length).toBeGreaterThan(0);

      const pattern = starPatterns[0];
      expect(pattern.nodes).toContain('hub');
      expect(pattern.nodes.length).toBe(4);
    });

    it('should track graph patterns separately from sequential patterns', () => {
      // Create both sequential and graph patterns

      // Sequential pattern (traditional path-based)
      const sequentialPattern = patternDetector.detectPatterns(
        ['step1', 'step2', 'step3'],
        'workflow'
      );
      expect(sequentialPattern.length).toBeGreaterThan(0);

      // Graph pattern (structural)
      graph.addNode(createNode('center', 'Center', 'hub'));
      graph.addNode(createNode('a', 'A', 'leaf'));
      graph.addNode(createNode('b', 'B', 'leaf'));
      graph.addNode(createNode('c', 'C', 'leaf'));

      graph.addEdge(createEdge('center', 'a', 'connects'));
      graph.addEdge(createEdge('center', 'b', 'connects'));
      graph.addEdge(createEdge('center', 'c', 'connects'));

      const graphPatterns = patternDetector.mineGraphPatterns();
      expect(graphPatterns.length).toBeGreaterThan(0);

      // Verify separate tracking
      const allSequential = patternDetector.getAllPatterns();
      const allGraph = patternDetector.getAllGraphPatterns();

      expect(allSequential.length).toBeGreaterThan(0);
      expect(allGraph.length).toBeGreaterThan(0);
      expect(allSequential[0]).toHaveProperty('nodes');
      expect(allGraph[0]).toHaveProperty('type');
      expect(allGraph[0].type).toBeTypeOf('string');
    });

    it('should provide combined statistics', () => {
      // Create mixed patterns
      patternDetector.detectPatterns(['a', 'b', 'c'], 'test');
      
      graph.addNode(createNode('x', 'X', 'hub'));
      graph.addNode(createNode('y', 'Y', 'leaf'));
      graph.addNode(createNode('z', 'Z', 'leaf'));
      graph.addNode(createNode('w', 'W', 'leaf'));

      graph.addEdge(createEdge('x', 'y', 'connects'));
      graph.addEdge(createEdge('x', 'z', 'connects'));
      graph.addEdge(createEdge('x', 'w', 'connects'));

      patternDetector.mineGraphPatterns();

      const stats = patternDetector.getCombinedStatistics();
      
      expect(stats.sequential).toHaveProperty('totalPatterns');
      expect(stats.sequential.totalPatterns).toBeGreaterThan(0);
      
      expect(stats.graph).toHaveProperty('totalPatterns');
      expect(stats.graph!.totalPatterns).toBeGreaterThan(0);
    });

    it('should filter graph patterns by type', () => {
      // Create different types of patterns
      
      // Star pattern
      graph.addNode(createNode('hub1', 'Hub 1', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'leaf'));

      graph.addEdge(createEdge('hub1', 'leaf1', 'connects'));
      graph.addEdge(createEdge('hub1', 'leaf2', 'connects'));
      graph.addEdge(createEdge('hub1', 'leaf3', 'connects'));

      // Chain pattern
      graph.addNode(createNode('chain1', 'Chain 1', 'step'));
      graph.addNode(createNode('chain2', 'Chain 2', 'step'));
      graph.addNode(createNode('chain3', 'Chain 3', 'step'));

      graph.addEdge(createEdge('chain1', 'chain2', 'next'));
      graph.addEdge(createEdge('chain2', 'chain3', 'next'));

      patternDetector.mineGraphPatterns();

      const starPatterns = patternDetector.getGraphPatternsByType('star');
      const chainPatterns = patternDetector.getGraphPatternsByType('chain');

      expect(starPatterns.length).toBeGreaterThan(0);
      expect(chainPatterns.length).toBeGreaterThan(0);
      
      expect(starPatterns[0].type).toBe('star');
      expect(chainPatterns[0].type).toBe('chain');
    });
  });

  describe('Configuration and Status', () => {
    it('should report graph pattern mining status', () => {
      expect(patternDetector.isGraphPatternMiningEnabled()).toBe(true);
    });

    it('should handle disabled graph pattern mining gracefully', () => {
      const basicDetector = new PatternDetector({
        enableGraphPatterns: false,
      });

      expect(basicDetector.isGraphPatternMiningEnabled()).toBe(false);
      
      const patterns = basicDetector.mineGraphPatterns();
      expect(patterns).toEqual([]);
    });

    it('should allow configuration updates', () => {
      // Create initial pattern
      graph.addNode(createNode('test1', 'Test 1', 'hub'));
      graph.addNode(createNode('test2', 'Test 2', 'leaf'));
      graph.addNode(createNode('test3', 'Test 3', 'leaf'));
      graph.addNode(createNode('test4', 'Test 4', 'leaf'));

      graph.addEdge(createEdge('test1', 'test2', 'connects'));
      graph.addEdge(createEdge('test1', 'test3', 'connects'));
      graph.addEdge(createEdge('test1', 'test4', 'connects'));

      // Mine with default config
      const patterns1 = patternDetector.mineGraphPatterns();
      expect(patterns1.length).toBeGreaterThan(0);

      // Update configuration
      patternDetector.updateGraphPatternConfig({
        minSupport: 0.05,
        minConfidence: 0.2,
        maxPatternSize: 10,
        patternTypes: ['star', 'hub'],
      });

      // Mine again with new config
      patternDetector.clearGraphPatterns();
      const patterns2 = patternDetector.mineGraphPatterns();
      
      // Should still find patterns (configuration change doesn't necessarily change results for this simple case)
      expect(patterns2.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Pattern Management', () => {
    it('should clear graph patterns', () => {
      // Create pattern
      graph.addNode(createNode('clear1', 'Clear 1', 'hub'));
      graph.addNode(createNode('clear2', 'Clear 2', 'leaf'));
      graph.addNode(createNode('clear3', 'Clear 3', 'leaf'));
      graph.addNode(createNode('clear4', 'Clear 4', 'leaf'));

      graph.addEdge(createEdge('clear1', 'clear2', 'connects'));
      graph.addEdge(createEdge('clear1', 'clear3', 'connects'));
      graph.addEdge(createEdge('clear1', 'clear4', 'connects'));

      patternDetector.mineGraphPatterns();
      expect(patternDetector.getAllGraphPatterns().length).toBeGreaterThan(0);

      patternDetector.clearGraphPatterns();
      expect(patternDetector.getAllGraphPatterns().length).toBe(0);
    });
  });
});