/**
 * Comprehensive Tests for T2.4: Clustering & Analysis
 * 
 * Following TDD approach - these tests will initially fail and drive implementation
 * Testing community detection, similarity clustering, and graph metrics
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { KnowraCore } from '../../core/KnowraCore.js';
import type { 
  Information, 
  KnowledgeCluster, 
  NodeMetrics,
  GraphMetrics,
  CommunityDetectionOptions,
  SimilarityClusteringOptions 
} from '../../core/types.js';

describe('T2.4: Clustering & Analysis', () => {
  let knowra: KnowraCore;
  let nodeIds: string[];
  
  beforeEach(() => {
    knowra = new KnowraCore();
    nodeIds = [];
    
    // Create test graph with clear community structure:
    // Community 1: A-B-C (tight cluster)
    // Community 2: D-E-F (tight cluster)  
    // Bridge: C-D (connects communities)
    // Isolate: G (single node)
    
    const testNodes = [
      { content: 'React components and state management', type: 'react' },
      { content: 'React hooks and lifecycle', type: 'react' },
      { content: 'React routing with components', type: 'react' },
      { content: 'Node.js server architecture', type: 'backend' },
      { content: 'Express.js middleware patterns', type: 'backend' },
      { content: 'Node.js database connections', type: 'backend' },
      { content: 'Isolated topic about testing', type: 'testing' },
    ];
    
    // Add nodes to graph
    nodeIds = testNodes.map((node, index) => {
      return knowra.information.add(node.content, { 
        type: node.type,
        metadata: { 
          category: node.type,
          index 
        } 
      });
    });
    
    // Create tight communities with high strength connections
    // Community 1: React cluster (A-B-C)
    knowra.knowledge.connect(nodeIds[0], nodeIds[1], 'related_to', { strength: 0.9 });
    knowra.knowledge.connect(nodeIds[1], nodeIds[2], 'related_to', { strength: 0.9 });
    knowra.knowledge.connect(nodeIds[0], nodeIds[2], 'similar_to', { strength: 0.8 });
    
    // Community 2: Backend cluster (D-E-F)  
    knowra.knowledge.connect(nodeIds[3], nodeIds[4], 'related_to', { strength: 0.9 });
    knowra.knowledge.connect(nodeIds[4], nodeIds[5], 'related_to', { strength: 0.9 });
    knowra.knowledge.connect(nodeIds[3], nodeIds[5], 'similar_to', { strength: 0.8 });
    
    // Bridge between communities (weaker connection)
    knowra.knowledge.connect(nodeIds[2], nodeIds[3], 'connects_to', { strength: 0.3 });
    
    // Node G (index 6) remains isolated
  });

  describe('Louvain Community Detection', () => {
    test('should detect distinct communities with high modularity', () => {
      // Use clusterWithOptions with fixed seed for reproducible results
      const clusters = knowra.knowledge.clusterWithOptions('community', {
        randomSeed: 12345
      });
      
      // Should detect at least 3 communities: React, Backend, Isolated
      expect(clusters.length).toBeGreaterThanOrEqual(3);
      
      // Verify that React community nodes (0, 1, 2) are clustered together
      // Find which cluster contains node 0
      const node0Cluster = clusters.find(cluster => cluster.nodes.includes(nodeIds[0]));
      expect(node0Cluster).toBeDefined();
      
      // React nodes should be in same cluster OR in clusters with high internal connections
      const reactNodes = [nodeIds[0], nodeIds[1], nodeIds[2]];
      const reactClusters = clusters.filter(cluster => 
        cluster.nodes.some(node => reactNodes.includes(node))
      );
      
      // Either all React nodes are in one cluster, or they're distributed but with high coherence
      if (reactClusters.length === 1) {
        // All React nodes in one cluster - ideal case
        expect(reactClusters[0].nodes).toContain(nodeIds[0]);
        expect(reactClusters[0].nodes).toContain(nodeIds[1]);
        expect(reactClusters[0].nodes).toContain(nodeIds[2]);
      } else {
        // React nodes are distributed - each cluster should have high coherence
        reactClusters.forEach(cluster => {
          expect(cluster.coherence).toBeGreaterThan(0.3);
        });
      }
      
      // Similar check for Backend community (3, 4, 5)
      const backendNodes = [nodeIds[3], nodeIds[4], nodeIds[5]];
      const backendClusters = clusters.filter(cluster => 
        cluster.nodes.some(node => backendNodes.includes(node))
      );
      
      if (backendClusters.length === 1) {
        expect(backendClusters[0].nodes).toContain(nodeIds[3]);
        expect(backendClusters[0].nodes).toContain(nodeIds[4]);
        expect(backendClusters[0].nodes).toContain(nodeIds[5]);
      } else {
        backendClusters.forEach(cluster => {
          expect(cluster.coherence).toBeGreaterThan(0.3);
        });
      }
      
      // Isolated node should be in its own cluster
      const isolatedCluster = clusters.find(cluster => 
        cluster.nodes.includes(nodeIds[6])
      );
      expect(isolatedCluster).toBeDefined();
      expect(isolatedCluster?.nodes).toHaveLength(1);
    });
    
    test('should calculate meaningful modularity scores', () => {
      const clusters = knowra.knowledge.cluster('community');
      
      clusters.forEach(cluster => {
        // Coherence should reflect intra-cluster density
        expect(cluster.coherence).toBeGreaterThan(0);
        expect(cluster.coherence).toBeLessThanOrEqual(1);
        
        // Clusters with tight connections should have reasonable coherence
        if (cluster.nodes.length > 1) {
          expect(cluster.coherence).toBeGreaterThan(0.3);
        }
      });
    });
    
    test('should identify optimal community structure', () => {
      // Add community detection options
      const options: CommunityDetectionOptions = {
        resolution: 1.0,
        minCommunitySize: 1,
        maxIterations: 100,
        randomSeed: 12345 // Fixed seed for reproducible results
      };
      
      const clusters = knowra.knowledge.clusterWithOptions('community', options);
      
      // Should maximize modularity
      const totalModularity = clusters.reduce((sum, cluster) => 
        sum + (cluster.modularity ?? 0), 0
      );
      
      expect(totalModularity).toBeGreaterThan(0.05); // Reasonable community structure
    });
  });

  describe('Similarity-Based Clustering', () => {
    test('should group nodes by content similarity', () => {
      const clusters = knowra.knowledge.cluster('similarity');
      
      // Should group by content similarity (React nodes together, Backend nodes together)
      expect(clusters.length).toBeGreaterThanOrEqual(2);
      
      // Check that similar content is grouped
      const reactCluster = clusters.find(cluster => 
        cluster.nodes.includes(nodeIds[0])
      );
      expect(reactCluster?.nodes).toContain(nodeIds[1]);
      expect(reactCluster?.nodes).toContain(nodeIds[2]);
      
      const backendCluster = clusters.find(cluster => 
        cluster.nodes.includes(nodeIds[3])
      );
      expect(backendCluster?.nodes).toContain(nodeIds[4]);
      expect(backendCluster?.nodes).toContain(nodeIds[5]);
    });
    
    test('should respect similarity threshold', () => {
      const options: SimilarityClusteringOptions = {
        threshold: 0.8,
        method: 'jaccard',
        considerType: true
      };
      
      const clusters = knowra.knowledge.clusterWithOptions('similarity', options);
      
      // High threshold should create more, smaller clusters
      expect(clusters.length).toBeGreaterThan(2);
      
      // Verify nodes in same cluster have sufficient similarity
      clusters.forEach(cluster => {
        if (cluster.nodes.length > 1) {
          expect(cluster.avgSimilarity).toBeGreaterThanOrEqual(0.8);
        }
      });
    });
    
    test('should handle different similarity methods', () => {
      const jaccardClusters = knowra.knowledge.clusterWithOptions('similarity', {
        method: 'jaccard'
      });
      
      const cosineClusters = knowra.knowledge.clusterWithOptions('similarity', {
        method: 'cosine'
      });
      
      expect(jaccardClusters).toBeDefined();
      expect(cosineClusters).toBeDefined();
      
      // Different methods may produce different clustering
      // Both should be valid clusterings
      jaccardClusters.forEach(cluster => {
        expect(cluster.nodes.length).toBeGreaterThan(0);
        expect(cluster.algorithm).toBe('similarity');
      });
    });
  });

  describe('Enhanced Graph Metrics', () => {
    test('should calculate comprehensive node metrics', () => {
      // Test with a well-connected node (should have high centrality)
      const metrics = knowra.knowledge.getNodeMetrics(nodeIds[2]); // Bridge node C
      
      expect(metrics.degree).toBeGreaterThan(0);
      expect(metrics.betweenness).toBeGreaterThan(0);
      expect(metrics.closeness).toBeGreaterThan(0);
      expect(metrics.pageRank).toBeDefined();
      expect(metrics.eigenvectorCentrality).toBeDefined();
      expect(metrics.clusteringCoefficient).toBeDefined();
      
      // Bridge node should have high betweenness centrality
      expect(metrics.betweenness).toBeGreaterThan(0.1);
    });
    
    test('should calculate PageRank correctly', () => {
      const allNodes = nodeIds.map(id => knowra.knowledge.getNodeMetrics(id));
      
      allNodes.forEach(metrics => {
        expect(metrics.pageRank).toBeGreaterThan(0);
        expect(metrics.pageRank).toBeLessThanOrEqual(1);
      });
      
      // Sum of all PageRank values should be approximately 1
      const totalPageRank = allNodes.reduce((sum, m) => sum + (m.pageRank ?? 0), 0);
      expect(totalPageRank).toBeCloseTo(1, 1);
    });
    
    test('should identify central nodes correctly', () => {
      const centralNodes = knowra.knowledge.findCentralNodes(3);
      
      expect(centralNodes).toHaveLength(3);
      expect(centralNodes[0].id).toBeDefined();
      expect(centralNodes[0].centralityScore).toBeGreaterThan(0);
      
      // Should be sorted by centrality (highest first)
      expect(centralNodes[0].centralityScore).toBeGreaterThanOrEqual(
        centralNodes[1].centralityScore
      );
    });
  });

  describe('Graph-Level Analysis', () => {
    test('should calculate global graph metrics', () => {
      const graphMetrics = knowra.knowledge.getGraphMetrics();
      
      expect(graphMetrics.density).toBeGreaterThan(0);
      expect(graphMetrics.density).toBeLessThanOrEqual(1);
      expect(graphMetrics.averagePathLength).toBeGreaterThan(0);
      expect(graphMetrics.diameter).toBeGreaterThan(0);
      expect(graphMetrics.clusteringCoefficient).toBeGreaterThanOrEqual(0);
      expect(graphMetrics.modularity).toBeDefined();
      expect(graphMetrics.componentCount).toBeGreaterThan(0);
    });
    
    test('should detect graph structure characteristics', () => {
      const analysis = knowra.knowledge.analyzeStructure();
      
      expect(analysis.hasSmallWorldProperty).toBeDefined();
      expect(analysis.isScaleFree).toBeDefined();
      expect(analysis.communityStructureStrength).toBeGreaterThan(0);
      expect(analysis.bridgeNodes).toContain(nodeIds[2]); // Bridge between communities
    });
    
    test('should identify important structural nodes', () => {
      const structuralAnalysis = knowra.knowledge.getStructuralImportance();
      
      expect(structuralAnalysis.bridges.length).toBeGreaterThan(0);
      expect(structuralAnalysis.articulationPoints.length).toBeGreaterThan(0);
      expect(structuralAnalysis.hubs.length).toBeGreaterThan(0);
      
      // Bridge node should be identified as important
      const bridgeNodeImportance = structuralAnalysis.bridges.find(
        bridge => bridge.from === nodeIds[2] || bridge.to === nodeIds[2]
      );
      expect(bridgeNodeImportance).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    test('should cluster large graphs within performance bounds', () => {
      // Create larger test graph
      const largeNodeIds = [];
      for (let i = 0; i < 100; i++) {
        const id = knowra.information.add(`Test node ${i}`, {
          type: i < 50 ? 'type_a' : 'type_b'
        });
        largeNodeIds.push(id);
      }
      
      // Add deterministic connections to avoid duplicates
      const connectedPairs = new Set<string>();
      let connectionCount = 0;
      
      while (connectionCount < 200) {
        const fromIndex = Math.floor(Math.random() * largeNodeIds.length);
        const toIndex = Math.floor(Math.random() * largeNodeIds.length);
        
        if (fromIndex !== toIndex) {
          const from = largeNodeIds[fromIndex];
          const to = largeNodeIds[toIndex];
          const pairKey = `${from}-${to}`;
          
          if (!connectedPairs.has(pairKey)) {
            try {
              knowra.knowledge.connect(from, to, 'test_relation', { 
                strength: Math.random() 
              });
              connectedPairs.add(pairKey);
              connectionCount++;
            } catch (error) {
              // Skip if connection already exists
              continue;
            }
          }
        }
      }
      
      // Clustering should complete within performance target
      const startTime = Date.now();
      const clusters = knowra.knowledge.cluster('community');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Allow for thorough clustering on larger graphs
      expect(clusters.length).toBeGreaterThan(0);
    });
    
    test('should calculate metrics efficiently', () => {
      const startTime = Date.now();
      
      const metrics = nodeIds.map(id => knowra.knowledge.getNodeMetrics(id));
      const graphMetrics = knowra.knowledge.getGraphMetrics();
      
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(50); // <50ms target
      expect(metrics).toHaveLength(nodeIds.length);
      expect(graphMetrics).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty graph gracefully', () => {
      const emptyKnowra = new KnowraCore();
      
      const clusters = emptyKnowra.knowledge.cluster('community');
      const metrics = emptyKnowra.knowledge.getGraphMetrics();
      
      expect(clusters).toEqual([]);
      expect(metrics.density).toBe(0);
      expect(metrics.componentCount).toBe(0);
    });
    
    test('should handle single node graph', () => {
      const singleKnowra = new KnowraCore();
      const nodeId = singleKnowra.information.add('Single node', { type: 'test' });
      
      const clusters = singleKnowra.knowledge.cluster('community');
      const metrics = singleKnowra.knowledge.getNodeMetrics(nodeId);
      
      expect(clusters).toHaveLength(1);
      expect(clusters[0].nodes).toEqual([nodeId]);
      expect(metrics.degree).toBe(0);
      expect(metrics.pageRank).toBeGreaterThan(0);
    });
    
    test('should handle disconnected components correctly', () => {
      // Current graph already has disconnected component (isolated node)
      const graphMetrics = knowra.knowledge.getGraphMetrics();
      
      expect(graphMetrics.componentCount).toBeGreaterThan(1);
      
      const clusters = knowra.knowledge.cluster('community');
      
      // Should handle each component separately
      const allClusterNodes = clusters.flatMap(c => c.nodes);
      expect(allClusterNodes.sort()).toEqual(nodeIds.sort());
    });
  });

  describe('Integration with KnowraCore', () => {
    test('should emit clustering events', () => {
      let eventEmitted = false;
      let eventData: any = null;
      
      knowra.events.on('knowledge:onCluster', (data: any) => {
        eventEmitted = true;
        eventData = data;
      });
      
      const clusters = knowra.knowledge.cluster('community');
      
      expect(eventEmitted).toBe(true);
      expect(eventData).toBeDefined();
      expect(clusters).toBeDefined();
    });
    
    test('should maintain consistency with node deletions', () => {
      // Get initial clusters
      const initialClusters = knowra.knowledge.cluster('community');
      
      // Delete a node
      knowra.information.delete(nodeIds[0]);
      
      // Clusters should be updated
      const updatedClusters = knowra.knowledge.cluster('community');
      
      updatedClusters.forEach(cluster => {
        expect(cluster.nodes).not.toContain(nodeIds[0]);
      });
    });
  });
});