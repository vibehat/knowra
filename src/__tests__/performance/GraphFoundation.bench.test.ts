/**
 * Performance benchmarks for GraphFoundation
 * 
 * Validates that T1.3: Graph Foundation meets the performance targets:
 * - Basic CRUD operations: <10ms
 * - Graph traversal (depth 2): <100ms
 * - Knowledge chunk creation: <1000ms
 * - Memory efficiency for large graphs
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { GraphFoundation } from '../../core/GraphFoundation.js';
import type { Information, Relationship } from '../../core/types.js';

describe('GraphFoundation Performance Benchmarks', () => {
  let graphFoundation: GraphFoundation;

  beforeEach(() => {
    graphFoundation = new GraphFoundation();
  });

  test('CRUD operations should complete within 10ms average', () => {
    const iterations = 1000;
    const operations = [];

    // Test node operations
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const node: Information = {
        id: `perf_node_${i}`,
        content: `Performance test node ${i}`,
        type: 'benchmark',
        created: new Date(),
        modified: new Date(),
      };

      // Add node
      graphFoundation.addNode(node);
      
      // Get node
      const retrieved = graphFoundation.getNode(node.id);
      expect(retrieved).not.toBeNull();
      
      // Update node
      const updateSuccess = graphFoundation.updateNode(node.id, {
        content: `Updated node ${i}`,
      });
      expect(updateSuccess).toBe(true);
      
      operations.push('add', 'get', 'update');
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / (operations.length);

    console.log(`CRUD Performance: ${averageTime.toFixed(2)}ms average per operation`);
    expect(averageTime).toBeLessThan(10); // <10ms per operation
  });

  test('Graph traversal (depth 2) should complete within 100ms', () => {
    // Create a connected graph for traversal testing
    const nodeCount = 100;
    const edgeCount = 200;

    // Add nodes
    for (let i = 0; i < nodeCount; i++) {
      const node: Information = {
        id: `traverse_node_${i}`,
        content: `Traversal test node ${i}`,
        type: 'traversal',
        created: new Date(),
        modified: new Date(),
      };
      graphFoundation.addNode(node);
    }

    // Add edges to create connections
    for (let i = 0; i < edgeCount; i++) {
      const fromIndex = Math.floor(Math.random() * nodeCount);
      const toIndex = Math.floor(Math.random() * nodeCount);
      
      const relationship: Relationship = {
        from: `traverse_node_${fromIndex}`,
        to: `traverse_node_${toIndex}`,
        type: 'connects',
        strength: Math.random(),
        created: new Date(),
      };

      try {
        graphFoundation.addEdge(relationship);
      } catch {
        // Skip if edge already exists
      }
    }

    // Test subgraph operations (depth 2)
    const testOperations = 10;
    const startTime = performance.now();

    for (let i = 0; i < testOperations; i++) {
      const nodeId = `traverse_node_${i}`;
      const subgraph = graphFoundation.getSubgraph(nodeId, 2);
      expect(Array.isArray(subgraph)).toBe(true);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / testOperations;

    console.log(`Graph Traversal Performance: ${averageTime.toFixed(2)}ms average per depth-2 traversal`);
    expect(averageTime).toBeLessThan(100); // <100ms per traversal
  });

  test('Knowledge chunk creation should complete within 1000ms', () => {
    // Create a knowledge chunk (multiple nodes with relationships)
    const chunkSize = 50;
    const startTime = performance.now();

    // Create nodes
    for (let i = 0; i < chunkSize; i++) {
      const node: Information = {
        id: `chunk_node_${i}`,
        content: `Knowledge chunk node ${i} with substantial content for realistic testing`,
        type: 'knowledge_chunk',
        created: new Date(),
        modified: new Date(),
        metadata: {
          category: 'benchmark',
          tags: ['performance', 'test', 'chunk'],
          importance: Math.random(),
        },
      };
      graphFoundation.addNode(node);
    }

    // Create relationships between nodes
    for (let i = 0; i < chunkSize - 1; i++) {
      const relationship: Relationship = {
        from: `chunk_node_${i}`,
        to: `chunk_node_${i + 1}`,
        type: 'sequence',
        strength: 0.8,
        created: new Date(),
        metadata: {
          order: i,
          relationship_type: 'sequential',
        },
      };
      graphFoundation.addEdge(relationship);

      // Add some cross-connections for complexity
      if (i % 3 === 0 && i + 3 < chunkSize) {
        const crossRelationship: Relationship = {
          from: `chunk_node_${i}`,
          to: `chunk_node_${i + 3}`,
          type: 'reference',
          strength: 0.6,
          created: new Date(),
        };
        graphFoundation.addEdge(crossRelationship);
      }
    }

    // Get the complete knowledge chunk as subgraph
    const knowledgeChunk = graphFoundation.getSubgraph('chunk_node_0', 3);

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    console.log(`Knowledge Chunk Creation: ${totalTime.toFixed(2)}ms for ${chunkSize} nodes`);
    expect(totalTime).toBeLessThan(1000); // <1000ms for chunk creation
    expect(knowledgeChunk.length).toBeGreaterThan(0);
  });

  test('Memory usage should be reasonable for large graphs', () => {
    const nodeCount = 1000;
    const edgeCount = 2000;

    // Measure initial memory usage
    const initialMemory = process.memoryUsage();

    // Create large graph
    for (let i = 0; i < nodeCount; i++) {
      const node: Information = {
        id: `memory_node_${i}`,
        content: `Memory test node ${i} with some content that takes up space`,
        type: 'memory_test',
        created: new Date(),
        modified: new Date(),
        metadata: {
          index: i,
          category: 'memory_benchmark',
        },
      };
      graphFoundation.addNode(node);
    }

    // Add edges
    for (let i = 0; i < edgeCount; i++) {
      const fromIndex = i % nodeCount;
      const toIndex = (i + 1) % nodeCount;
      
      const relationship: Relationship = {
        from: `memory_node_${fromIndex}`,
        to: `memory_node_${toIndex}`,
        type: 'memory_edge',
        strength: Math.random(),
        created: new Date(),
      };

      try {
        graphFoundation.addEdge(relationship);
      } catch {
        // Skip duplicates
      }
    }

    // Measure final memory usage
    const finalMemory = process.memoryUsage();
    const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

    console.log(`Memory Usage: ${memoryIncrease.toFixed(2)}MB for ${nodeCount} nodes and ${graphFoundation.getEdgeCount()} edges`);
    
    // Verify the graph was created correctly
    expect(graphFoundation.getNodeCount()).toBe(nodeCount);
    expect(graphFoundation.getEdgeCount()).toBeGreaterThan(0);
    
    // Memory should be reasonable (less than 100MB for 1K nodes)
    expect(memoryIncrease).toBeLessThan(100);
  });

  test('Pathfinding performance should be efficient', () => {
    // Create a chain graph for pathfinding
    const chainLength = 100;

    // Create chain of nodes
    for (let i = 0; i < chainLength; i++) {
      const node: Information = {
        id: `path_node_${i}`,
        content: `Path node ${i}`,
        type: 'path_test',
        created: new Date(),
        modified: new Date(),
      };
      graphFoundation.addNode(node);

      if (i > 0) {
        const relationship: Relationship = {
          from: `path_node_${i - 1}`,
          to: `path_node_${i}`,
          type: 'path',
          strength: 1.0,
          created: new Date(),
        };
        graphFoundation.addEdge(relationship);
      }
    }

    // Test pathfinding performance
    const pathfindingTests = 20;
    const startTime = performance.now();

    for (let i = 0; i < pathfindingTests; i++) {
      const start = Math.floor(Math.random() * (chainLength / 2));
      const end = start + Math.floor(Math.random() * (chainLength / 2)) + 1;
      
      const path = graphFoundation.findShortestPath(
        `path_node_${start}`,
        `path_node_${Math.min(end, chainLength - 1)}`
      );
      
      expect(path.length).toBeGreaterThan(0);
    }

    const endTime = performance.now();
    const averageTime = (endTime - startTime) / pathfindingTests;

    console.log(`Pathfinding Performance: ${averageTime.toFixed(2)}ms average per pathfinding operation`);
    expect(averageTime).toBeLessThan(50); // Should be fast for reasonable graph sizes
  });

  test('Clustering performance should be reasonable', () => {
    // Create multiple connected components for clustering
    const componentCount = 5;
    const nodesPerComponent = 20;

    // Create clusters
    for (let cluster = 0; cluster < componentCount; cluster++) {
      // Create nodes for this cluster
      for (let node = 0; node < nodesPerComponent; node++) {
        const nodeId = `cluster_${cluster}_node_${node}`;
        const info: Information = {
          id: nodeId,
          content: `Node ${node} in cluster ${cluster}`,
          type: 'cluster_test',
          created: new Date(),
          modified: new Date(),
        };
        graphFoundation.addNode(info);

        // Connect to previous node in cluster
        if (node > 0) {
          const relationship: Relationship = {
            from: `cluster_${cluster}_node_${node - 1}`,
            to: nodeId,
            type: 'cluster_edge',
            strength: 0.9,
            created: new Date(),
          };
          graphFoundation.addEdge(relationship);
        }

        // Create some internal connections for cluster cohesion
        if (node > 2) {
          const relationship: Relationship = {
            from: `cluster_${cluster}_node_${Math.floor(node / 2)}`,
            to: nodeId,
            type: 'internal',
            strength: 0.7,
            created: new Date(),
          };
          graphFoundation.addEdge(relationship);
        }
      }
    }

    // Test clustering performance
    const startTime = performance.now();
    const clusters = graphFoundation.clusterNodes('community');
    const endTime = performance.now();

    const clusteringTime = endTime - startTime;
    console.log(`Clustering Performance: ${clusteringTime.toFixed(2)}ms for ${componentCount * nodesPerComponent} nodes`);
    
    expect(clusteringTime).toBeLessThan(500); // Should complete within 500ms
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters.length).toBeLessThanOrEqual(componentCount);
  });
});