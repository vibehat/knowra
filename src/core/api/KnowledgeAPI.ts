/**
 * KnowledgeAPI - Level 2: Knowledge Building
 * 
 * Public API class for knowledge operations. Provides clean interface
 * while delegating implementation to KnowledgeManager.
 */

import type { 
  Relationship, 
  Knowledge, 
  KnowledgeCluster, 
  NodeMetrics, 
  GraphMetrics, 
  StructuralAnalysis, 
  StructuralImportance, 
  CentralNode 
} from '../types.js';
import type { KnowledgeManager } from '../levels/knowledge/KnowledgeManager.js';

export class KnowledgeAPI {
  constructor(private manager: KnowledgeManager) {}

  /**
   * Create a relationship between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param type Relationship type (e.g., 'leads_to', 'related_to')
   * @param metadata Optional metadata including strength and custom properties
   * @returns Created Relationship object
   */
  connect(from: string, to: string, type: string, metadata?: unknown): Relationship {
    return this.manager.connect(from, to, type, metadata);
  }

  /**
   * Remove relationship(s) between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param type Optional relationship type to remove (if not specified, removes all)
   * @returns True if relationship(s) were removed, false otherwise
   */
  disconnect(from: string, to: string, type?: string): boolean {
    return this.manager.disconnect(from, to, type);
  }

  /**
   * Get all relationships for a node in specified direction
   * @param nodeId Node ID to query relationships for
   * @param direction Direction of relationships ('in', 'out', or 'both', default: 'out')
   * @returns Array of Relationship objects
   */
  getRelationships(nodeId: string, direction?: 'in' | 'out' | 'both'): Relationship[] {
    return this.manager.getRelationships(nodeId, direction);
  }

  /**
   * Find all paths between two nodes
   * @param from Source node ID
   * @param to Target node ID  
   * @param maxDepth Maximum path depth (default: 5)
   * @returns Array of paths (arrays of node IDs), sorted by path length and strength
   */
  findPaths(from: string, to: string, maxDepth = 5): string[][] {
    return this.manager.findPaths(from, to, maxDepth);
  }

  /**
   * Extract a subgraph around a node with enhanced Knowledge objects
   * @param nodeId Central node ID to build subgraph around
   * @param depth Maximum traversal depth (default: 2)
   * @returns Array of Knowledge objects with nodes and their relationships
   */
  getSubgraph(nodeId: string, depth = 2): Knowledge[] {
    return this.manager.getSubgraph(nodeId, depth);
  }

  /**
   * Perform graph clustering to identify knowledge communities
   * @param algorithm Clustering algorithm ('community' or 'similarity')
   * @returns Array of KnowledgeCluster objects with coherence scores
   */
  cluster(algorithm = 'community' as const): KnowledgeCluster[] {
    return this.manager.cluster(algorithm);
  }

  /**
   * Perform clustering with algorithm-specific options
   * @param algorithm Clustering algorithm ('community' or 'similarity')
   * @param options Algorithm-specific options
   * @returns Array of KnowledgeCluster objects
   */
  clusterWithOptions(
    algorithm: 'community' | 'similarity',
    options?: any
  ): KnowledgeCluster[] {
    return this.manager.clusterWithOptions(algorithm, options);
  }

  /**
   * Get comprehensive metrics for a node
   * @param nodeId Node ID to analyze
   * @returns Enhanced NodeMetrics object
   */
  getNodeMetrics(nodeId: string): NodeMetrics {
    return this.manager.getNodeMetrics(nodeId);
  }

  /**
   * Get graph-level metrics
   * @returns GraphMetrics object
   */
  getGraphMetrics(): GraphMetrics {
    return this.manager.getGraphMetrics();
  }

  /**
   * Analyze structural properties of the graph
   * @returns StructuralAnalysis object
   */
  analyzeStructure(): StructuralAnalysis {
    return this.manager.analyzeStructure();
  }

  /**
   * Get structural importance analysis
   * @returns StructuralImportance object
   */
  getStructuralImportance(): StructuralImportance {
    return this.manager.getStructuralImportance();
  }

  /**
   * Find most central nodes
   * @param count Number of nodes to return
   * @param centralityType Type of centrality measure
   * @returns Array of central nodes
   */
  findCentralNodes(
    count: number = 5,
    centralityType: 'degree' | 'betweenness' | 'closeness' | 'pagerank' | 'eigenvector' = 'pagerank'
  ): CentralNode[] {
    return this.manager.findCentralNodes(count, centralityType);
  }
}