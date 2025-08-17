/**
 * Tests for GraphPatternMining algorithms
 * Verifies pattern detection for different graph structures
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GraphPatternMining } from '../../core/algorithms/GraphPatternMining.js';
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

describe('GraphPatternMining', () => {
  let graph: GraphFoundation;
  let patternMiner: GraphPatternMining;

  beforeEach(() => {
    graph = new GraphFoundation();
    patternMiner = new GraphPatternMining(graph, {
      minSupport: 0.1,
      minConfidence: 0.3,
      maxPatternSize: 5,
    });
  });

  describe('Star Pattern Detection', () => {
    it('should detect star patterns with central hub', () => {
      // Create star pattern: center connected to multiple nodes
      graph.addNode(createNode('center', 'Hub node', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'leaf'));
      graph.addNode(createNode('leaf4', 'Leaf 4', 'leaf'));

      graph.addEdge(createEdge('center', 'leaf1', 'connects'));
      graph.addEdge(createEdge('center', 'leaf2', 'connects'));
      graph.addEdge(createEdge('center', 'leaf3', 'connects'));
      graph.addEdge(createEdge('center', 'leaf4', 'connects'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['star'] });
      const starPatterns = patterns.filter(p => p.type === 'star');

      expect(starPatterns.length).toBeGreaterThan(0);
      const pattern = starPatterns[0];
      expect(pattern.nodes).toContain('center');
      expect(pattern.nodes.length).toBe(5); // center + 4 leaves
      expect(pattern.edges.length).toBe(4);
    });

    it('should not detect star patterns with insufficient connections', () => {
      // Create insufficient star: center with only 2 connections
      graph.addNode(createNode('center', 'Hub node', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));

      graph.addEdge(createEdge('center', 'leaf1', 'connects'));
      graph.addEdge(createEdge('center', 'leaf2', 'connects'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['star'] });
      const starPatterns = patterns.filter(p => p.type === 'star');

      expect(starPatterns.length).toBe(0);
    });
  });

  describe('Chain Pattern Detection', () => {
    it('should detect linear chain patterns', () => {
      // Create chain: A -> B -> C -> D
      graph.addNode(createNode('A', 'Node A', 'step'));
      graph.addNode(createNode('B', 'Node B', 'step'));
      graph.addNode(createNode('C', 'Node C', 'step'));
      graph.addNode(createNode('D', 'Node D', 'step'));

      graph.addEdge(createEdge('A', 'B', 'next'));
      graph.addEdge(createEdge('B', 'C', 'next'));
      graph.addEdge(createEdge('C', 'D', 'next'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['chain'] });
      const chainPatterns = patterns.filter(p => p.type === 'chain');

      expect(chainPatterns.length).toBeGreaterThan(0);
      const pattern = chainPatterns[0];
      expect(pattern.nodes).toEqual(['A', 'B', 'C', 'D']);
      expect(pattern.edges.length).toBe(3);
    });

    it('should not detect chains shorter than minimum length', () => {
      // Create short chain: A -> B (only 2 nodes)
      graph.addNode(createNode('A', 'Node A', 'step'));
      graph.addNode(createNode('B', 'Node B', 'step'));

      graph.addEdge(createEdge('A', 'B', 'next'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['chain'] });
      const chainPatterns = patterns.filter(p => p.type === 'chain');

      expect(chainPatterns.length).toBe(0);
    });
  });

  describe('Cycle Pattern Detection', () => {
    it('should detect simple cycle patterns', () => {
      // Create cycle: A -> B -> C -> A
      graph.addNode(createNode('A', 'Node A', 'cycle'));
      graph.addNode(createNode('B', 'Node B', 'cycle'));
      graph.addNode(createNode('C', 'Node C', 'cycle'));

      graph.addEdge(createEdge('A', 'B', 'cycles'));
      graph.addEdge(createEdge('B', 'C', 'cycles'));
      graph.addEdge(createEdge('C', 'A', 'cycles'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['cycle'] });
      const cyclePatterns = patterns.filter(p => p.type === 'cycle');

      expect(cyclePatterns.length).toBeGreaterThan(0);
      const pattern = cyclePatterns[0];
      expect(pattern.nodes.length).toBe(4); // A, B, C, and back to A
      expect(pattern.edges.length).toBe(3);
    });
  });

  describe('Tree Pattern Detection', () => {
    it('should detect hierarchical tree patterns', () => {
      // Create tree: root -> [child1, child2] -> [grandchild1, grandchild2]
      graph.addNode(createNode('root', 'Root', 'root'));
      graph.addNode(createNode('child1', 'Child 1', 'child'));
      graph.addNode(createNode('child2', 'Child 2', 'child'));
      graph.addNode(createNode('grandchild1', 'Grandchild 1', 'grandchild'));
      graph.addNode(createNode('grandchild2', 'Grandchild 2', 'grandchild'));

      graph.addEdge(createEdge('root', 'child1', 'parent-child'));
      graph.addEdge(createEdge('root', 'child2', 'parent-child'));
      graph.addEdge(createEdge('child1', 'grandchild1', 'parent-child'));
      graph.addEdge(createEdge('child2', 'grandchild2', 'parent-child'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['tree'] });
      const treePatterns = patterns.filter(p => p.type === 'tree');

      expect(treePatterns.length).toBeGreaterThan(0);
      const pattern = treePatterns[0];
      expect(pattern.nodes).toContain('root');
      expect(pattern.nodes.length).toBeGreaterThan(2);
    });
  });

  describe('Hub Pattern Detection', () => {
    it('should detect nodes with high connectivity', () => {
      // Create hub with many connections
      graph.addNode(createNode('hub', 'High connectivity hub', 'hub'));
      
      // Add many connected nodes
      for (let i = 1; i <= 6; i++) {
        graph.addNode(createNode(`node${i}`, `Node ${i}`, 'regular'));
        graph.addEdge(createEdge('hub', `node${i}`, 'connects'));
      }

      const patterns = patternMiner.minePatterns({ patternTypes: ['hub'] });
      const hubPatterns = patterns.filter(p => p.type === 'hub');

      expect(hubPatterns.length).toBeGreaterThan(0);
      const pattern = hubPatterns[0];
      expect(pattern.nodes).toContain('hub');
      expect(pattern.nodes.length).toBeGreaterThan(3); // Hub + connected nodes
    });
  });

  describe('Cluster Pattern Detection', () => {
    it('should detect densely connected node clusters', () => {
      // Create dense cluster: all nodes connected to each other
      const clusterNodes = ['c1', 'c2', 'c3', 'c4'];
      
      for (const nodeId of clusterNodes) {
        graph.addNode(createNode(nodeId, `Cluster node ${nodeId}`, 'cluster'));
      }

      // Connect all nodes to each other (dense cluster)
      for (let i = 0; i < clusterNodes.length; i++) {
        for (let j = i + 1; j < clusterNodes.length; j++) {
          graph.addEdge(createEdge(
            clusterNodes[i], 
            clusterNodes[j], 
            'cluster-connection'
          ));
        }
      }

      const patterns = patternMiner.minePatterns({ patternTypes: ['cluster'] });
      const clusterPatterns = patterns.filter(p => p.type === 'cluster');

      expect(clusterPatterns.length).toBeGreaterThan(0);
      const pattern = clusterPatterns[0];
      expect(pattern.nodes.length).toBeGreaterThan(2);
      expect(pattern.edges.length).toBeGreaterThan(1);
    });
  });

  describe('Bridge Pattern Detection', () => {
    it('should detect bridge nodes connecting separate clusters', () => {
      // Create two clusters connected by a bridge
      
      // Cluster 1
      graph.addNode(createNode('c1_1', 'Cluster 1 Node 1', 'cluster1'));
      graph.addNode(createNode('c1_2', 'Cluster 1 Node 2', 'cluster1'));
      graph.addEdge(createEdge('c1_1', 'c1_2', 'cluster'));

      // Bridge
      graph.addNode(createNode('bridge', 'Bridge Node', 'bridge'));

      // Cluster 2
      graph.addNode(createNode('c2_1', 'Cluster 2 Node 1', 'cluster2'));
      graph.addNode(createNode('c2_2', 'Cluster 2 Node 2', 'cluster2'));
      graph.addEdge(createEdge('c2_1', 'c2_2', 'cluster'));

      // Connect bridge to both clusters
      graph.addEdge(createEdge('c1_1', 'bridge', 'bridge-connection'));
      graph.addEdge(createEdge('bridge', 'c2_1', 'bridge-connection'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['bridge'] });
      const bridgePatterns = patterns.filter(p => p.type === 'bridge');

      expect(bridgePatterns.length).toBeGreaterThan(0);
      const pattern = bridgePatterns[0];
      expect(pattern.nodes).toContain('bridge');
    });
  });

  describe('Pattern Metrics', () => {
    it('should calculate support correctly', () => {
      // Create simple star pattern
      graph.addNode(createNode('center', 'Hub', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'leaf'));

      graph.addEdge(createEdge('center', 'leaf1', 'connects'));
      graph.addEdge(createEdge('center', 'leaf2', 'connects'));
      graph.addEdge(createEdge('center', 'leaf3', 'connects'));

      const patterns = patternMiner.minePatterns({ patternTypes: ['star'] });
      
      expect(patterns.length).toBeGreaterThan(0);
      const pattern = patterns[0];
      
      // Support should be pattern nodes / total nodes
      expect(pattern.support).toBeGreaterThan(0);
      expect(pattern.support).toBeLessThanOrEqual(1);
    });

    it('should provide comprehensive pattern metrics', () => {
      // Create mixed patterns
      graph.addNode(createNode('hub', 'Hub', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'leaf'));

      graph.addEdge(createEdge('hub', 'leaf1', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf2', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf3', 'connects'));

      patternMiner.minePatterns();
      const metrics = patternMiner.getPatternMetrics();

      expect(metrics.totalPatterns).toBeGreaterThan(0);
      expect(metrics.avgSupport).toBeGreaterThan(0);
      expect(metrics.avgConfidence).toBeGreaterThan(0);
      expect(metrics.coveragePercentage).toBeGreaterThan(0);
      expect(typeof metrics.patternTypeDistribution).toBe('object');
    });
  });

  describe('Configuration', () => {
    it('should respect minimum support threshold', () => {
      // Create a graph with 10 nodes, but only create a small star pattern
      // This way the star pattern will have low support (4/10 = 0.4)
      
      // Add the star pattern (4 nodes)
      graph.addNode(createNode('A', 'Node A', 'test'));
      graph.addNode(createNode('B', 'Node B', 'test'));
      graph.addNode(createNode('C', 'Node C', 'test'));
      graph.addNode(createNode('D', 'Node D', 'test'));

      graph.addEdge(createEdge('A', 'B', 'test'));
      graph.addEdge(createEdge('A', 'C', 'test'));
      graph.addEdge(createEdge('A', 'D', 'test'));

      // Add 6 additional isolated nodes to lower the support
      for (let i = 1; i <= 6; i++) {
        graph.addNode(createNode(`extra${i}`, `Extra Node ${i}`, 'test'));
      }

      // High min support (0.8) should filter out the star pattern (support = 4/10 = 0.4)
      const patternsHighSupport = patternMiner.minePatterns({ 
        minSupport: 0.8,
        patternTypes: ['star'] 
      });

      // Low min support (0.2) should allow the star pattern
      const patternsLowSupport = patternMiner.minePatterns({ 
        minSupport: 0.2,
        patternTypes: ['star'] 
      });

      expect(patternsHighSupport.length).toBe(0); // Should be filtered out
      expect(patternsLowSupport.length).toBe(1);  // Should be included
    });

    it('should respect maximum pattern size limit', () => {
      // Create large star pattern
      graph.addNode(createNode('center', 'Hub', 'hub'));
      
      for (let i = 1; i <= 10; i++) {
        graph.addNode(createNode(`leaf${i}`, `Leaf ${i}`, 'leaf'));
        graph.addEdge(createEdge('center', `leaf${i}`, 'connects'));
      }

      const patterns = patternMiner.minePatterns({ 
        maxPatternSize: 5,
        patternTypes: ['star'] 
      });

      if (patterns.length > 0) {
        const pattern = patterns[0];
        expect(pattern.nodes.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Pattern Types Filtering', () => {
    it('should only detect specified pattern types', () => {
      // Create both star and chain patterns
      
      // Star pattern
      graph.addNode(createNode('hub', 'Hub', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'leaf'));

      graph.addEdge(createEdge('hub', 'leaf1', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf2', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf3', 'connects'));

      // Chain pattern
      graph.addNode(createNode('A', 'Node A', 'step'));
      graph.addNode(createNode('B', 'Node B', 'step'));
      graph.addNode(createNode('C', 'Node C', 'step'));

      graph.addEdge(createEdge('A', 'B', 'next'));
      graph.addEdge(createEdge('B', 'C', 'next'));

      // Only mine star patterns
      const starOnlyPatterns = patternMiner.minePatterns({ 
        patternTypes: ['star'] 
      });

      const starPatterns = starOnlyPatterns.filter(p => p.type === 'star');
      const chainPatterns = starOnlyPatterns.filter(p => p.type === 'chain');

      expect(starPatterns.length).toBeGreaterThan(0);
      expect(chainPatterns.length).toBe(0);
    });
  });
});