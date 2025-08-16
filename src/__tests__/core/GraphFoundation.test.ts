/**
 * GraphFoundation Tests
 * 
 * Test suite for the GraphFoundation class that wraps Graphology
 * for the Knowra Knowledge Database.
 * 
 * Following TDD approach - these tests should fail initially.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GraphFoundation } from '../../core/GraphFoundation.js';
import type { Information, Relationship, Knowledge, KnowledgeCluster, GraphData } from '../../core/types.js';

describe('GraphFoundation', () => {
  let graphFoundation: GraphFoundation;

  beforeEach(() => {
    graphFoundation = new GraphFoundation();
  });

  describe('Node Operations (CRUD)', () => {
    const sampleInfo: Information = {
      id: 'test_123',
      content: 'Sample content',
      type: 'text',
      created: new Date(),
      modified: new Date(),
    };

    test('addNode should add a node and return its ID', () => {
      const nodeId = graphFoundation.addNode(sampleInfo);
      expect(nodeId).toBe(sampleInfo.id);
      expect(graphFoundation.hasNode(nodeId)).toBe(true);
    });

    test('addNode should validate node data', () => {
      const invalidInfo = {} as Information;
      expect(() => graphFoundation.addNode(invalidInfo)).toThrow('Invalid node data');
    });

    test('getNode should return node by ID', () => {
      graphFoundation.addNode(sampleInfo);
      const retrieved = graphFoundation.getNode(sampleInfo.id);
      expect(retrieved).toEqual(sampleInfo);
    });

    test('getNode should return null for non-existent node', () => {
      const result = graphFoundation.getNode('non_existent');
      expect(result).toBeNull();
    });

    test('updateNode should update existing node', () => {
      graphFoundation.addNode(sampleInfo);
      
      const updates: Partial<Information> = {
        content: 'Updated content',
        type: 'updated',
      };

      const success = graphFoundation.updateNode(sampleInfo.id, updates);
      expect(success).toBe(true);

      const updated = graphFoundation.getNode(sampleInfo.id);
      expect(updated?.content).toBe('Updated content');
      expect(updated?.type).toBe('updated');
      expect(updated?.modified).toBeInstanceOf(Date);
    });

    test('updateNode should return false for non-existent node', () => {
      const success = graphFoundation.updateNode('non_existent', { content: 'test' });
      expect(success).toBe(false);
    });

    test('deleteNode should remove node and return true', () => {
      graphFoundation.addNode(sampleInfo);
      
      const success = graphFoundation.deleteNode(sampleInfo.id);
      expect(success).toBe(true);
      expect(graphFoundation.hasNode(sampleInfo.id)).toBe(false);
    });

    test('deleteNode should return false for non-existent node', () => {
      const success = graphFoundation.deleteNode('non_existent');
      expect(success).toBe(false);
    });

    test('getAllNodes should return all nodes', () => {
      const node1: Information = { ...sampleInfo, id: 'node1' };
      const node2: Information = { ...sampleInfo, id: 'node2' };

      graphFoundation.addNode(node1);
      graphFoundation.addNode(node2);

      const allNodes = graphFoundation.getAllNodes();
      expect(allNodes).toHaveLength(2);
      expect(allNodes.map(n => n.id)).toContain('node1');
      expect(allNodes.map(n => n.id)).toContain('node2');
    });

    test('getNodeCount should return correct count', () => {
      expect(graphFoundation.getNodeCount()).toBe(0);
      
      graphFoundation.addNode({ ...sampleInfo, id: 'node1' });
      expect(graphFoundation.getNodeCount()).toBe(1);
      
      graphFoundation.addNode({ ...sampleInfo, id: 'node2' });
      expect(graphFoundation.getNodeCount()).toBe(2);
    });
  });

  describe('Edge Operations', () => {
    const node1: Information = {
      id: 'node1',
      content: 'First node',
      type: 'text',
      created: new Date(),
      modified: new Date(),
    };

    const node2: Information = {
      id: 'node2',
      content: 'Second node',
      type: 'text',
      created: new Date(),
      modified: new Date(),
    };

    const sampleRelationship: Relationship = {
      from: 'node1',
      to: 'node2',
      type: 'relates_to',
      strength: 0.8,
      created: new Date(),
    };

    beforeEach(() => {
      graphFoundation.addNode(node1);
      graphFoundation.addNode(node2);
    });

    test('addEdge should create relationship between nodes', () => {
      const edgeId = graphFoundation.addEdge(sampleRelationship);
      expect(edgeId).toBeDefined();
      expect(graphFoundation.hasEdge('node1', 'node2', 'relates_to')).toBe(true);
    });

    test('addEdge should validate nodes exist', () => {
      const invalidRelationship: Relationship = {
        from: 'non_existent',
        to: 'node2',
        type: 'test',
        strength: 1.0,
        created: new Date(),
      };

      expect(() => graphFoundation.addEdge(invalidRelationship)).toThrow('Node does not exist');
    });

    test('addEdge should validate relationship data', () => {
      const invalidRelationship = {} as Relationship;
      expect(() => graphFoundation.addEdge(invalidRelationship)).toThrow('Invalid relationship data');
    });

    test('getEdge should return specific edge', () => {
      graphFoundation.addEdge(sampleRelationship);
      
      const retrieved = graphFoundation.getEdge('node1', 'node2', 'relates_to');
      expect(retrieved).toEqual(sampleRelationship);
    });

    test('getEdge should return null for non-existent edge', () => {
      const result = graphFoundation.getEdge('node1', 'node2', 'non_existent');
      expect(result).toBeNull();
    });

    test('deleteEdge should remove edge and return true', () => {
      graphFoundation.addEdge(sampleRelationship);
      
      const success = graphFoundation.deleteEdge('node1', 'node2', 'relates_to');
      expect(success).toBe(true);
      expect(graphFoundation.hasEdge('node1', 'node2', 'relates_to')).toBe(false);
    });

    test('deleteEdge should return false for non-existent edge', () => {
      const success = graphFoundation.deleteEdge('node1', 'node2', 'non_existent');
      expect(success).toBe(false);
    });

    test('getNodeEdges should return edges for node', () => {
      graphFoundation.addEdge(sampleRelationship);
      graphFoundation.addEdge({
        from: 'node2',
        to: 'node1',
        type: 'reverse',
        strength: 0.5,
        created: new Date(),
      });

      const outgoing = graphFoundation.getNodeEdges('node1', 'out');
      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].type).toBe('relates_to');

      const incoming = graphFoundation.getNodeEdges('node1', 'in');
      expect(incoming).toHaveLength(1);
      expect(incoming[0].type).toBe('reverse');

      const all = graphFoundation.getNodeEdges('node1', 'both');
      expect(all).toHaveLength(2);
    });

    test('getEdgeCount should return correct count', () => {
      expect(graphFoundation.getEdgeCount()).toBe(0);
      
      graphFoundation.addEdge(sampleRelationship);
      expect(graphFoundation.getEdgeCount()).toBe(1);
    });
  });

  describe('Graph Traversal', () => {
    beforeEach(() => {
      // Create a simple graph: A -> B -> C, A -> D -> C
      const nodeA: Information = { id: 'A', content: 'Node A', type: 'text', created: new Date(), modified: new Date() };
      const nodeB: Information = { id: 'B', content: 'Node B', type: 'text', created: new Date(), modified: new Date() };
      const nodeC: Information = { id: 'C', content: 'Node C', type: 'text', created: new Date(), modified: new Date() };
      const nodeD: Information = { id: 'D', content: 'Node D', type: 'text', created: new Date(), modified: new Date() };

      graphFoundation.addNode(nodeA);
      graphFoundation.addNode(nodeB);
      graphFoundation.addNode(nodeC);
      graphFoundation.addNode(nodeD);

      graphFoundation.addEdge({ from: 'A', to: 'B', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'B', to: 'C', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'A', to: 'D', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'D', to: 'C', type: 'connects', strength: 1.0, created: new Date() });
    });

    test('findPaths should find all paths between nodes', () => {
      const paths = graphFoundation.findPaths('A', 'C');
      expect(paths).toHaveLength(2);
      
      const pathLengths = paths.map(p => p.length);
      expect(pathLengths).toContain(3); // A -> B -> C
      expect(pathLengths).toContain(3); // A -> D -> C
    });

    test('findPaths should respect maxDepth parameter', () => {
      const paths = graphFoundation.findPaths('A', 'C', 2);
      expect(paths).toHaveLength(0); // No paths within depth 2
      
      const pathsDepth3 = graphFoundation.findPaths('A', 'C', 3);
      expect(pathsDepth3.length).toBeGreaterThan(0);
    });

    test('findPaths should return empty array for disconnected nodes', () => {
      const isolatedNode: Information = { id: 'isolated', content: 'Isolated', type: 'text', created: new Date(), modified: new Date() };
      graphFoundation.addNode(isolatedNode);
      
      const paths = graphFoundation.findPaths('A', 'isolated');
      expect(paths).toHaveLength(0);
    });

    test('findPaths should handle self-loops', () => {
      const paths = graphFoundation.findPaths('A', 'A');
      expect(paths).toEqual([['A']]);
    });

    test('findShortestPath should return the shortest path', () => {
      const shortestPath = graphFoundation.findShortestPath('A', 'C');
      expect(shortestPath).toHaveLength(3); // Should be one of: A->B->C or A->D->C
      expect(shortestPath[0]).toBe('A');
      expect(shortestPath[2]).toBe('C');
    });

    test('getNeighbors should return adjacent nodes', () => {
      const neighbors = graphFoundation.getNeighbors('A');
      expect(neighbors).toHaveLength(2);
      expect(neighbors).toContain('B');
      expect(neighbors).toContain('D');
    });

    test('isConnected should check if nodes are connected', () => {
      expect(graphFoundation.isConnected('A', 'C')).toBe(true);
      
      const isolatedNode: Information = { id: 'isolated', content: 'Isolated', type: 'text', created: new Date(), modified: new Date() };
      graphFoundation.addNode(isolatedNode);
      expect(graphFoundation.isConnected('A', 'isolated')).toBe(false);
    });
  });

  describe('Subgraph Operations', () => {
    beforeEach(() => {
      // Create a larger graph for subgraph testing
      for (let i = 1; i <= 5; i++) {
        const node: Information = {
          id: `node${i}`,
          content: `Node ${i}`,
          type: 'text',
          created: new Date(),
          modified: new Date(),
        };
        graphFoundation.addNode(node);
      }

      // Create connections: 1->2->3->4->5, 1->3, 2->4
      graphFoundation.addEdge({ from: 'node1', to: 'node2', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'node2', to: 'node3', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'node3', to: 'node4', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'node4', to: 'node5', type: 'connects', strength: 1.0, created: new Date() });
      graphFoundation.addEdge({ from: 'node1', to: 'node3', type: 'shortcut', strength: 0.8, created: new Date() });
      graphFoundation.addEdge({ from: 'node2', to: 'node4', type: 'shortcut', strength: 0.6, created: new Date() });
    });

    test('getSubgraph should return subgraph from starting node', () => {
      const subgraph = graphFoundation.getSubgraph('node1', 2);
      
      expect(subgraph.length).toBeGreaterThan(0);
      expect(subgraph.find(k => k.node.id === 'node1')).toBeDefined();
      expect(subgraph.find(k => k.node.id === 'node2')).toBeDefined();
      expect(subgraph.find(k => k.node.id === 'node3')).toBeDefined();
    });

    test('getSubgraph should respect depth parameter', () => {
      const depth1 = graphFoundation.getSubgraph('node1', 1);
      const depth2 = graphFoundation.getSubgraph('node1', 2);
      
      expect(depth1.length).toBeLessThanOrEqual(depth2.length);
    });

    test('getSubgraph should return empty array for non-existent node', () => {
      const subgraph = graphFoundation.getSubgraph('non_existent', 2);
      expect(subgraph).toHaveLength(0);
    });

    test('getSubgraph should include edge information', () => {
      const subgraph = graphFoundation.getSubgraph('node1', 1);
      const node1Knowledge = subgraph.find(k => k.node.id === 'node1');
      
      expect(node1Knowledge).toBeDefined();
      expect(node1Knowledge?.edges.length).toBeGreaterThan(0);
    });
  });

  describe('Graph Analysis and Clustering', () => {
    beforeEach(() => {
      // Create two clusters: A-B-C and D-E-F
      const nodes = ['A', 'B', 'C', 'D', 'E', 'F'].map(id => ({
        id,
        content: `Node ${id}`,
        type: 'text',
        created: new Date(),
        modified: new Date(),
      }));

      nodes.forEach(node => graphFoundation.addNode(node));

      // Cluster 1: A-B-C (strongly connected)
      graphFoundation.addEdge({ from: 'A', to: 'B', type: 'strong', strength: 0.9, created: new Date() });
      graphFoundation.addEdge({ from: 'B', to: 'C', type: 'strong', strength: 0.9, created: new Date() });
      graphFoundation.addEdge({ from: 'C', to: 'A', type: 'strong', strength: 0.9, created: new Date() });

      // Cluster 2: D-E-F (strongly connected)
      graphFoundation.addEdge({ from: 'D', to: 'E', type: 'strong', strength: 0.8, created: new Date() });
      graphFoundation.addEdge({ from: 'E', to: 'F', type: 'strong', strength: 0.8, created: new Date() });
      graphFoundation.addEdge({ from: 'F', to: 'D', type: 'strong', strength: 0.8, created: new Date() });

      // Weak connection between clusters
      graphFoundation.addEdge({ from: 'A', to: 'D', type: 'weak', strength: 0.2, created: new Date() });
    });

    test('clusterNodes should detect communities', () => {
      const clusters = graphFoundation.clusterNodes('community');
      
      expect(clusters.length).toBeGreaterThanOrEqual(1);
      
      const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.nodes.length, 0);
      expect(totalNodes).toBe(6); // All nodes should be in clusters
    });

    test('clusterNodes should calculate coherence scores', () => {
      const clusters = graphFoundation.clusterNodes('community');
      
      clusters.forEach(cluster => {
        expect(cluster.coherence).toBeGreaterThanOrEqual(0);
        expect(cluster.coherence).toBeLessThanOrEqual(1);
        expect(cluster.id).toBeDefined();
        expect(cluster.algorithm).toBe('community');
      });
    });

    test('clusterNodes should support similarity algorithm', () => {
      const clusters = graphFoundation.clusterNodes('similarity');
      
      expect(clusters.length).toBeGreaterThanOrEqual(1);
      clusters.forEach(cluster => {
        expect(cluster.algorithm).toBe('similarity');
      });
    });

    test('getConnectedComponents should return strongly connected components', () => {
      const components = graphFoundation.getConnectedComponents();
      
      expect(components.length).toBeGreaterThanOrEqual(1);
      const totalNodes = components.reduce((sum, comp) => sum + comp.length, 0);
      expect(totalNodes).toBe(6);
    });

    test('calculateNodeMetrics should return centrality measures', () => {
      const metrics = graphFoundation.calculateNodeMetrics('A');
      
      expect(metrics).toHaveProperty('degree');
      expect(metrics).toHaveProperty('betweenness');
      expect(metrics).toHaveProperty('closeness');
      expect(metrics.degree).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Requirements', () => {
    test('CRUD operations should complete within 10ms', async () => {
      const startTime = performance.now();
      
      // Perform multiple CRUD operations
      for (let i = 0; i < 100; i++) {
        const node: Information = {
          id: `perf_node_${i}`,
          content: `Performance test node ${i}`,
          type: 'test',
          created: new Date(),
          modified: new Date(),
        };
        graphFoundation.addNode(node);
        graphFoundation.getNode(node.id);
        graphFoundation.updateNode(node.id, { content: `Updated ${i}` });
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / 100;
      
      expect(avgTime).toBeLessThan(10); // <10ms per operation
    });

    test('Graph traversal should complete within 100ms for depth 2', async () => {
      // Create a larger graph for traversal testing
      for (let i = 0; i < 50; i++) {
        const node: Information = {
          id: `traverse_${i}`,
          content: `Traverse node ${i}`,
          type: 'test',
          created: new Date(),
          modified: new Date(),
        };
        graphFoundation.addNode(node);
        
        if (i > 0) {
          graphFoundation.addEdge({
            from: `traverse_${i - 1}`,
            to: `traverse_${i}`,
            type: 'chain',
            strength: 1.0,
            created: new Date(),
          });
        }
      }

      const startTime = performance.now();
      const subgraph = graphFoundation.getSubgraph('traverse_0', 2);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // <100ms
      expect(subgraph.length).toBeGreaterThan(0);
    });
  });

  describe('Data Export and Import', () => {
    test('export should return complete graph data', () => {
      const node: Information = {
        id: 'export_test',
        content: 'Export test node',
        type: 'test',
        created: new Date(),
        modified: new Date(),
      };
      
      graphFoundation.addNode(node);
      
      const exported = graphFoundation.export();
      
      expect(exported).toHaveProperty('nodes');
      expect(exported).toHaveProperty('edges');
      expect(exported.nodes).toHaveLength(1);
      expect(exported.nodes[0].id).toBe('export_test');
    });

    test('import should restore graph from data', () => {
      const graphData: GraphData = {
        nodes: [
          {
            id: 'import_test',
            content: 'Import test node',
            type: 'test',
            created: new Date(),
            modified: new Date(),
          },
        ],
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 1,
          edgeCount: 0,
        },
      };
      
      graphFoundation.import(graphData);
      
      expect(graphFoundation.hasNode('import_test')).toBe(true);
      const node = graphFoundation.getNode('import_test');
      expect(node?.content).toBe('Import test node');
    });

    test('import should validate data structure', () => {
      const invalidData = { invalid: 'data' } as unknown as GraphData;
      
      expect(() => graphFoundation.import(invalidData)).toThrow('Invalid graph data');
    });

    test('clear should remove all data', () => {
      const node: Information = {
        id: 'clear_test',
        content: 'Test',
        type: 'test',
        created: new Date(),
        modified: new Date(),
      };
      
      graphFoundation.addNode(node);
      expect(graphFoundation.getNodeCount()).toBe(1);
      
      graphFoundation.clear();
      expect(graphFoundation.getNodeCount()).toBe(0);
      expect(graphFoundation.getEdgeCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid node IDs gracefully', () => {
      expect(graphFoundation.getNode('')).toBeNull();
      expect(graphFoundation.getNode('   ')).toBeNull();
      expect(graphFoundation.updateNode('', { content: 'test' })).toBe(false);
      expect(graphFoundation.deleteNode('')).toBe(false);
    });

    test('should handle concurrent modifications', () => {
      const node: Information = {
        id: 'concurrent_test',
        content: 'Test',
        type: 'test',
        created: new Date(),
        modified: new Date(),
      };
      
      graphFoundation.addNode(node);
      
      // Simulate concurrent updates
      const results = [
        graphFoundation.updateNode('concurrent_test', { content: 'Update 1' }),
        graphFoundation.updateNode('concurrent_test', { content: 'Update 2' }),
        graphFoundation.updateNode('concurrent_test', { content: 'Update 3' }),
      ];
      
      expect(results.every(r => r === true)).toBe(true);
      expect(graphFoundation.getNode('concurrent_test')).toBeDefined();
    });

    test('should handle memory pressure gracefully', () => {
      // Create a large number of nodes to test memory handling
      const nodeCount = 1000;
      
      for (let i = 0; i < nodeCount; i++) {
        const node: Information = {
          id: `memory_test_${i}`,
          content: `Large content string to simulate memory usage - ${i}`.repeat(10),
          type: 'memory_test',
          created: new Date(),
          modified: new Date(),
        };
        
        expect(() => graphFoundation.addNode(node)).not.toThrow();
      }
      
      expect(graphFoundation.getNodeCount()).toBe(nodeCount);
    });
  });
});