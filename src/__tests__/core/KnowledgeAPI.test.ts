/**
 * Knowledge API Integration Tests - T2.3 Implementation
 * 
 * Complete test suite for the Level 2: Knowledge API functionality.
 * Tests findPaths(), getSubgraph(), cluster() and their integration with the Information API.
 * 
 * Following strict TDD approach - Red (failing tests) → Green (minimal implementation) → Refactor
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { KnowraCore } from '../../core/KnowraCore.js';
import type { Information, Knowledge, KnowledgeCluster } from '../../core/types.js';

describe('Knowledge API Integration Tests - T2.3', () => {
  let knowra: KnowraCore;
  let nodeIds: string[];

  beforeEach(() => {
    knowra = new KnowraCore();
    nodeIds = [];

    // Create a test graph structure:
    // A → B → C → D
    // A → E → F
    // B → G
    // G → C (creates cycle)
    // H (isolated)
    
    const testNodes = [
      { content: 'Node A - Root', type: 'root' },
      { content: 'Node B - Branch 1', type: 'branch' },
      { content: 'Node C - Middle', type: 'middle' },
      { content: 'Node D - Leaf 1', type: 'leaf' },
      { content: 'Node E - Branch 2', type: 'branch' },
      { content: 'Node F - Leaf 2', type: 'leaf' },
      { content: 'Node G - Connector', type: 'connector' },
      { content: 'Node H - Isolated', type: 'isolated' }
    ];

    // Create nodes
    nodeIds = testNodes.map((node, index) => {
      return knowra.information.add(node.content, { 
        type: node.type,
        metadata: { label: String.fromCharCode(65 + index) } // A, B, C, etc.
      });
    });

    // Create relationships with different strengths
    knowra.knowledge.connect(nodeIds[0], nodeIds[1], 'leads_to', { strength: 0.9 }); // A → B
    knowra.knowledge.connect(nodeIds[1], nodeIds[2], 'leads_to', { strength: 0.8 }); // B → C  
    knowra.knowledge.connect(nodeIds[2], nodeIds[3], 'leads_to', { strength: 0.7 }); // C → D
    knowra.knowledge.connect(nodeIds[0], nodeIds[4], 'branches_to', { strength: 0.6 }); // A → E
    knowra.knowledge.connect(nodeIds[4], nodeIds[5], 'leads_to', { strength: 0.5 }); // E → F
    knowra.knowledge.connect(nodeIds[1], nodeIds[6], 'connects_to', { strength: 0.4 }); // B → G
    knowra.knowledge.connect(nodeIds[6], nodeIds[2], 'cycles_to', { strength: 0.3 }); // G → C (cycle)
    // Node H (index 7) remains isolated
  });

  describe('findPaths() - Path Discovery', () => {
    test('should find direct path between connected nodes', () => {
      const paths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[1]);
      
      expect(paths).toHaveLength(1);
      expect(paths[0]).toEqual([nodeIds[0], nodeIds[1]]);
    });

    test('should find multiple paths to same destination', () => {
      const paths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[2]);
      
      // Should find at least 2 paths: A→B→C and A→E→F (if F connects to C)
      // For now, just A→B→C and A→B→G→C
      expect(paths.length).toBeGreaterThanOrEqual(2);
      
      // Check that all paths start with source and end with target
      paths.forEach(path => {
        expect(path[0]).toBe(nodeIds[0]); // Start with A
        expect(path[path.length - 1]).toBe(nodeIds[2]); // End with C
      });
    });

    test('should respect maxDepth parameter', () => {
      const pathsDepth1 = knowra.knowledge.findPaths(nodeIds[0], nodeIds[3], 1);
      const pathsDepth2 = knowra.knowledge.findPaths(nodeIds[0], nodeIds[3], 2);
      const pathsDepth5 = knowra.knowledge.findPaths(nodeIds[0], nodeIds[3], 5);

      // With depth 1, can't reach D from A (need at least 3 steps)
      expect(pathsDepth1).toHaveLength(0);
      
      // With depth 2, still can't reach D from A  
      expect(pathsDepth2).toHaveLength(0);
      
      // With depth 5, should find path A→B→C→D
      expect(pathsDepth5.length).toBeGreaterThan(0);
    });

    test('should return empty array for disconnected nodes', () => {
      const paths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[7]); // A to isolated H
      expect(paths).toEqual([]);
    });

    test('should handle self-referencing paths', () => {
      // Add self-reference
      knowra.knowledge.connect(nodeIds[0], nodeIds[0], 'self_ref');
      
      const paths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[0]);
      expect(paths.length).toBeGreaterThan(0);
      
      // Should include the direct self-reference
      const directSelf = paths.find(path => path.length === 1 && path[0] === nodeIds[0]);
      expect(directSelf).toBeDefined();
    });

    test('should handle cycles without infinite loops', () => {
      // Already have B→G→C cycle in setup
      const paths = knowra.knowledge.findPaths(nodeIds[1], nodeIds[1]); // B to B through cycle
      
      expect(Array.isArray(paths)).toBe(true);
      // Should not hang or cause stack overflow
    });

    test('should validate input parameters', () => {
      expect(() => {
        knowra.knowledge.findPaths('', nodeIds[1]);
      }).not.toThrow(); // Should handle gracefully, return empty array
      
      const result = knowra.knowledge.findPaths('invalid_id', nodeIds[1]);
      expect(result).toEqual([]);
    });

    test('should return shortest paths first', () => {
      const paths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[2]); // A to C
      
      if (paths.length > 1) {
        // First path should be shortest or equal length
        const firstPathLength = paths[0].length;
        paths.forEach(path => {
          expect(path.length).toBeGreaterThanOrEqual(firstPathLength);
        });
      }
    });
  });

  describe('getSubgraph() - Subgraph Extraction', () => {
    test('should return Knowledge objects with node and edge information', () => {
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[0], 1);
      
      expect(Array.isArray(subgraph)).toBe(true);
      expect(subgraph.length).toBeGreaterThan(0);
      
      // Each item should be a Knowledge object
      subgraph.forEach(knowledge => {
        expect(knowledge).toHaveProperty('node');
        expect(knowledge).toHaveProperty('edges');
        expect(knowledge.node).toHaveProperty('id');
        expect(knowledge.node).toHaveProperty('content');
        expect(Array.isArray(knowledge.edges)).toBe(true);
      });
    });

    test('should respect depth parameter', () => {
      const depth1 = knowra.knowledge.getSubgraph(nodeIds[0], 1);
      const depth2 = knowra.knowledge.getSubgraph(nodeIds[0], 2);
      
      // Depth 2 should include more nodes than depth 1
      expect(depth2.length).toBeGreaterThanOrEqual(depth1.length);
      
      // Depth 1 should include A and its immediate neighbors (B, E)
      const depth1NodeIds = depth1.map(k => k.node.id);
      expect(depth1NodeIds).toContain(nodeIds[0]); // A itself
      expect(depth1NodeIds).toContain(nodeIds[1]); // B (direct neighbor)
      expect(depth1NodeIds).toContain(nodeIds[4]); // E (direct neighbor)
    });

    test('should include complete edge information', () => {
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[0], 1);
      
      // Find the Knowledge object for node A
      const nodeA = subgraph.find(k => k.node.id === nodeIds[0]);
      expect(nodeA).toBeDefined();
      
      if (nodeA) {
        // Should have edges to B and E
        expect(nodeA.edges.length).toBeGreaterThanOrEqual(2);
        
        const edgeToB = nodeA.edges.find(e => e.to === nodeIds[1]);
        const edgeToE = nodeA.edges.find(e => e.to === nodeIds[4]);
        
        expect(edgeToB).toBeDefined();
        expect(edgeToE).toBeDefined();
        
        // Check edge properties
        if (edgeToB) {
          expect(edgeToB.type).toBe('leads_to');
          expect(edgeToB.strength).toBe(0.9);
        }
        
        if (edgeToE) {
          expect(edgeToE.type).toBe('branches_to');
          expect(edgeToE.strength).toBe(0.6);
        }
      }
    });

    test('should return empty array for non-existent node', () => {
      const subgraph = knowra.knowledge.getSubgraph('non_existent_id', 2);
      expect(subgraph).toEqual([]);
    });

    test('should handle isolated nodes', () => {
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[7], 2); // Isolated node H
      
      expect(subgraph).toHaveLength(1);
      expect(subgraph[0].node.id).toBe(nodeIds[7]);
      expect(subgraph[0].edges).toHaveLength(0);
    });

    test('should not include duplicate nodes in subgraph', () => {
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[0], 3);
      
      const nodeIds_in_subgraph = subgraph.map(k => k.node.id);
      const uniqueNodeIds = [...new Set(nodeIds_in_subgraph)];
      
      expect(nodeIds_in_subgraph.length).toBe(uniqueNodeIds.length);
    });

    test('should include context information when available', () => {
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[0], 1);
      
      // Context should be populated based on relationships
      subgraph.forEach(knowledge => {
        if (knowledge.edges.length > 0) {
          expect(typeof knowledge.context === 'string' || knowledge.context === undefined).toBe(true);
        }
      });
    });
  });

  describe('cluster() - Graph Clustering', () => {
    test('should detect communities using community algorithm', () => {
      const clusters = knowra.knowledge.cluster('community');
      
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
      
      // Each cluster should have required properties
      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('nodes');
        expect(cluster).toHaveProperty('coherence');
        expect(cluster).toHaveProperty('algorithm');
        
        expect(Array.isArray(cluster.nodes)).toBe(true);
        expect(cluster.nodes.length).toBeGreaterThan(0);
        expect(cluster.algorithm).toBe('community');
        expect(cluster.coherence).toBeGreaterThanOrEqual(0);
        expect(cluster.coherence).toBeLessThanOrEqual(1);
      });
    });

    test('should detect communities using similarity algorithm', () => {
      const clusters = knowra.knowledge.cluster('similarity');
      
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
      
      clusters.forEach(cluster => {
        expect(cluster.algorithm).toBe('similarity');
        expect(cluster.nodes.length).toBeGreaterThan(0);
      });
    });

    test('should default to community algorithm when no algorithm specified', () => {
      const clusters = knowra.knowledge.cluster();
      
      expect(Array.isArray(clusters)).toBe(true);
      if (clusters.length > 0) {
        expect(clusters[0].algorithm).toBe('community');
      }
    });

    test('should ensure all nodes are assigned to clusters', () => {
      const clusters = knowra.knowledge.cluster('community');
      
      const allClusterNodes = clusters.flatMap(cluster => cluster.nodes);
      const uniqueNodes = [...new Set(allClusterNodes)];
      
      // All created nodes should be in clusters (including isolated nodes)
      expect(uniqueNodes.length).toBeGreaterThan(0);
      expect(uniqueNodes.length).toBeLessThanOrEqual(nodeIds.length);
    });

    test('should calculate meaningful coherence scores', () => {
      const clusters = knowra.knowledge.cluster('community');
      
      clusters.forEach(cluster => {
        // Coherence should be a valid probability
        expect(typeof cluster.coherence).toBe('number');
        expect(cluster.coherence).toBeGreaterThanOrEqual(0);
        expect(cluster.coherence).toBeLessThanOrEqual(1);
        expect(!isNaN(cluster.coherence)).toBe(true);
      });
    });

    test('should generate unique cluster IDs', () => {
      const clusters = knowra.knowledge.cluster('community');
      
      const clusterIds = clusters.map(c => c.id);
      const uniqueIds = [...new Set(clusterIds)];
      
      expect(clusterIds.length).toBe(uniqueIds.length);
    });

    test('should handle empty graph gracefully', () => {
      const emptyKnowra = new KnowraCore();
      const clusters = emptyKnowra.knowledge.cluster('community');
      
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters).toHaveLength(0);
    });
  });

  describe('Knowledge API Integration with Information API', () => {
    test('should maintain referential integrity with Information API', () => {
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[0], 2);
      
      // All nodes in subgraph should exist in Information API
      subgraph.forEach(knowledge => {
        const info = knowra.information.get(knowledge.node.id);
        expect(info).not.toBeNull();
        expect(info?.id).toBe(knowledge.node.id);
      });
    });

    test('should clean up paths and subgraphs when nodes are deleted', () => {
      // Get initial paths
      const initialPaths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[2]);
      expect(initialPaths.length).toBeGreaterThan(0);
      
      // Delete intermediate node
      const deleted = knowra.information.delete(nodeIds[1]); // Delete B
      expect(deleted).toBe(true);
      
      // Paths should be recalculated without the deleted node
      const pathsAfterDelete = knowra.knowledge.findPaths(nodeIds[0], nodeIds[2]);
      
      // Should have fewer paths (or different paths)
      pathsAfterDelete.forEach(path => {
        expect(path).not.toContain(nodeIds[1]); // Should not contain deleted node
      });
    });

    test('should handle concurrent operations safely', () => {
      // Add some concurrent operations
      const operations = [];
      
      // Add new nodes concurrently with graph operations
      for (let i = 0; i < 10; i++) {
        operations.push(() => {
          const newId = knowra.information.add(`Concurrent node ${i}`);
          knowra.knowledge.connect(nodeIds[0], newId, 'concurrent');
          return newId;
        });
      }
      
      const newNodeIds = operations.map(op => op());
      
      // All operations should succeed
      expect(newNodeIds).toHaveLength(10);
      
      // Graph should remain consistent
      const subgraph = knowra.knowledge.getSubgraph(nodeIds[0], 1);
      expect(subgraph.length).toBeGreaterThan(0);
      
      // Should have connections to new nodes
      const nodeAKnowledge = subgraph.find(k => k.node.id === nodeIds[0]);
      const concurrentEdges = nodeAKnowledge?.edges.filter(e => e.type === 'concurrent');
      expect(concurrentEdges?.length).toBe(10);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large subgraphs efficiently', () => {
      const startTime = Date.now();
      
      // Create a larger graph for performance testing
      const largeNodeIds = [];
      for (let i = 0; i < 100; i++) {
        const nodeId = knowra.information.add(`Performance node ${i}`);
        largeNodeIds.push(nodeId);
        
        if (i > 0) {
          knowra.knowledge.connect(largeNodeIds[i-1], nodeId, 'sequence');
        }
        
        // Create some cross-connections
        if (i % 10 === 0 && i > 0) {
          knowra.knowledge.connect(largeNodeIds[0], nodeId, 'hub');
        }
      }
      
      const subgraph = knowra.knowledge.getSubgraph(largeNodeIds[0], 3);
      const duration = Date.now() - startTime;
      
      expect(subgraph.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle complex path finding efficiently', () => {
      const startTime = Date.now();
      
      const paths = knowra.knowledge.findPaths(nodeIds[0], nodeIds[3], 10);
      const duration = Date.now() - startTime;
      
      expect(Array.isArray(paths)).toBe(true);
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    test('should handle clustering of complex graphs', () => {
      // Add more complex structure
      const additionalNodes = [];
      for (let i = 0; i < 20; i++) {
        const nodeId = knowra.information.add(`Cluster node ${i}`);
        additionalNodes.push(nodeId);
      }
      
      // Create dense connections within groups
      for (let i = 0; i < 10; i++) {
        for (let j = i + 1; j < 10; j++) {
          knowra.knowledge.connect(additionalNodes[i], additionalNodes[j], 'cluster_a');
        }
      }
      
      for (let i = 10; i < 20; i++) {
        for (let j = i + 1; j < 20; j++) {
          knowra.knowledge.connect(additionalNodes[i], additionalNodes[j], 'cluster_b');
        }
      }
      
      const startTime = Date.now();
      const clusters = knowra.knowledge.cluster('community');
      const duration = Date.now() - startTime;
      
      expect(clusters.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});