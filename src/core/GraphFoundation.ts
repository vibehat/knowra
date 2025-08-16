/**
 * GraphFoundation - Graphology-based graph wrapper for Knowra
 * 
 * This class provides a high-level interface to Graphology for the Knowledge Database,
 * implementing efficient CRUD operations, graph traversal, and analysis algorithms.
 * 
 * Key features:
 * - Type-safe node and edge operations
 * - Graph traversal and pathfinding
 * - Community detection and clustering
 * - Performance optimized for Knowledge Database use cases
 * - Import/export functionality
 */

import Graph from 'graphology';
import type { Attributes } from 'graphology-types';
import type {
  Information,
  Relationship,
  Knowledge,
  KnowledgeCluster,
  GraphData,
  NodeMetrics,
} from './types.js';
import {
  validateInformation,
  validateRelationship,
  validateGraphData,
} from './types.js';
import { generateId, isValidId, deepClone, validateConfidence } from './utils.js';

/**
 * GraphFoundation wraps Graphology with Knowledge Database specific functionality
 */
export class GraphFoundation {
  // Core Graphology instance - directed graph supporting multi-edges for different relationship types
  private graph: Graph<Information, Relationship>;

  // Index for fast edge lookup by type
  private edgeTypeIndex: Map<string, Set<string>> = new Map();

  constructor() {
    this.graph = new Graph<Information, Relationship>({
      type: 'directed',
      allowSelfLoops: true, // Allow self-referencing relationships
      multi: true, // Allow multiple edges between same nodes with different types
    });
  }

  // ============ Node Operations (CRUD) ============

  /**
   * Add a node to the graph
   * @param info Information object to add
   * @returns Node ID
   * @throws Error if node data is invalid
   */
  addNode(info: Information): string {
    if (!this.isValidNode(info)) {
      throw new Error('Invalid node data: missing required fields or invalid structure');
    }

    if (this.graph.hasNode(info.id)) {
      throw new Error(`Node with ID ${info.id} already exists`);
    }

    // Clone the data to prevent external mutations
    const nodeData = deepClone(info);
    this.graph.addNode(info.id, nodeData);

    return info.id;
  }

  /**
   * Get a node by ID
   * @param id Node ID
   * @returns Information object or null if not found
   */
  getNode(id: string): Information | null {
    if (!isValidId(id) || !this.graph.hasNode(id)) {
      return null;
    }

    const nodeData = this.graph.getNodeAttributes(id);
    return deepClone(nodeData);
  }

  /**
   * Update an existing node
   * @param id Node ID
   * @param updates Partial updates to apply
   * @returns True if updated successfully, false if node not found
   */
  updateNode(id: string, updates: Partial<Information>): boolean {
    if (!isValidId(id) || !this.graph.hasNode(id)) {
      return false;
    }

    const existing = this.graph.getNodeAttributes(id);
    const updated: Information = {
      ...existing,
      ...updates,
      id: existing.id, // Never allow ID changes
      modified: new Date(),
    };

    // Validate the updated data
    if (!this.isValidNode(updated)) {
      return false;
    }

    this.graph.replaceNodeAttributes(id, updated);
    return true;
  }

  /**
   * Delete a node and all its edges
   * @param id Node ID
   * @returns True if deleted successfully, false if node not found
   */
  deleteNode(id: string): boolean {
    if (!isValidId(id) || !this.graph.hasNode(id)) {
      return false;
    }

    // Clean up edge type index entries
    this.graph.forEachEdge(id, (edge, attributes) => {
      this.removeFromEdgeTypeIndex(attributes.type, edge);
    });

    this.graph.dropNode(id);
    return true;
  }

  /**
   * Check if a node exists
   * @param id Node ID
   * @returns True if node exists
   */
  hasNode(id: string): boolean {
    return isValidId(id) && this.graph.hasNode(id);
  }

  /**
   * Get all nodes in the graph
   * @returns Array of all Information objects
   */
  getAllNodes(): Information[] {
    return this.graph.mapNodes((node, attributes) => deepClone(attributes));
  }

  /**
   * Get the total number of nodes
   * @returns Node count
   */
  getNodeCount(): number {
    return this.graph.order;
  }

  // ============ Edge Operations ============

  /**
   * Add an edge between two nodes
   * @param relationship Relationship object
   * @returns Edge ID
   * @throws Error if nodes don't exist or relationship is invalid
   */
  addEdge(relationship: Relationship): string {
    if (!this.isValidRelationship(relationship)) {
      throw new Error('Invalid relationship data: missing required fields or invalid structure');
    }

    if (!this.graph.hasNode(relationship.from)) {
      throw new Error(`Node does not exist: ${relationship.from}`);
    }

    if (!this.graph.hasNode(relationship.to)) {
      throw new Error(`Node does not exist: ${relationship.to}`);
    }

    // Generate edge ID for multi-edge support
    const edgeId = `${relationship.from}->${relationship.to}:${relationship.type}:${Date.now()}`;
    
    // Clone the data to prevent external mutations
    const edgeData = deepClone(relationship);
    this.graph.addEdgeWithKey(edgeId, relationship.from, relationship.to, edgeData);

    // Update edge type index
    this.addToEdgeTypeIndex(relationship.type, edgeId);

    return edgeId;
  }

  /**
   * Get a specific edge
   * @param from Source node ID
   * @param to Target node ID
   * @param type Optional relationship type
   * @returns Relationship object or null if not found
   */
  getEdge(from: string, to: string, type?: string): Relationship | null {
    if (!isValidId(from) || !isValidId(to)) {
      return null;
    }

    if (!this.graph.hasNode(from) || !this.graph.hasNode(to)) {
      return null;
    }

    // Find matching edge
    try {
      const edgeKey = this.graph.findEdge(from, to, (edge, attributes) => {
        return !type || attributes.type === type;
      });

      if (edgeKey) {
        const attributes = this.graph.getEdgeAttributes(edgeKey);
        return deepClone(attributes);
      }
    } catch (error) {
      // No edge found
    }

    return null;
  }

  /**
   * Delete an edge
   * @param from Source node ID
   * @param to Target node ID
   * @param type Optional relationship type
   * @returns True if edge was deleted, false if not found
   */
  deleteEdge(from: string, to: string, type?: string): boolean {
    if (!isValidId(from) || !isValidId(to)) {
      return false;
    }

    let deletedAny = false;

    try {
      const edgesToDelete: string[] = [];

      this.graph.forEachEdge(from, to, (edge, attributes) => {
        if (!type || attributes.type === type) {
          edgesToDelete.push(edge);
          this.removeFromEdgeTypeIndex(attributes.type, edge);
        }
      });

      edgesToDelete.forEach(edge => {
        this.graph.dropEdge(edge);
        deletedAny = true;
      });
    } catch (error) {
      // No edges found
    }

    return deletedAny;
  }

  /**
   * Check if an edge exists
   * @param from Source node ID
   * @param to Target node ID
   * @param type Optional relationship type
   * @returns True if edge exists
   */
  hasEdge(from: string, to: string, type?: string): boolean {
    return this.getEdge(from, to, type) !== null;
  }

  /**
   * Get all edges for a node
   * @param nodeId Node ID
   * @param direction Edge direction ('in', 'out', 'both')
   * @returns Array of Relationship objects
   */
  getNodeEdges(nodeId: string, direction: 'in' | 'out' | 'both' = 'both'): Relationship[] {
    if (!isValidId(nodeId) || !this.graph.hasNode(nodeId)) {
      return [];
    }

    const edges: Relationship[] = [];

    try {
      if (direction === 'out' || direction === 'both') {
        this.graph.forEachOutEdge(nodeId, (edge, attributes) => {
          edges.push(deepClone(attributes));
        });
      }

      if (direction === 'in' || direction === 'both') {
        this.graph.forEachInEdge(nodeId, (edge, attributes) => {
          edges.push(deepClone(attributes));
        });
      }
    } catch (error) {
      // Handle errors gracefully
    }

    return edges;
  }

  /**
   * Get the total number of edges
   * @returns Edge count
   */
  getEdgeCount(): number {
    return this.graph.size;
  }

  // ============ Graph Traversal ============

  /**
   * Find all paths between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param maxDepth Maximum path depth (default: 5)
   * @returns Array of paths (arrays of node IDs)
   */
  findPaths(from: string, to: string, maxDepth: number = 5): string[][] {
    if (!isValidId(from) || !isValidId(to)) {
      return [];
    }

    if (!this.graph.hasNode(from) || !this.graph.hasNode(to)) {
      return [];
    }

    if (from === to) {
      return [[from]];
    }

    const paths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, target: string, path: string[], depth: number): void => {
      if (depth >= maxDepth) return; // Changed from > to >= to respect max depth properly
      if (visited.has(current)) return;

      visited.add(current);
      path.push(current);

      if (current === target) {
        paths.push([...path]);
      } else {
        // Explore outgoing edges
        this.graph.forEachOutNeighbor(current, (neighbor) => {
          dfs(neighbor, target, path, depth + 1);
        });
      }

      path.pop();
      visited.delete(current);
    };

    dfs(from, to, [], 0);
    return paths;
  }

  /**
   * Find the shortest path between two nodes (BFS)
   * @param from Source node ID
   * @param to Target node ID
   * @returns Shortest path or empty array if no path exists
   */
  findShortestPath(from: string, to: string): string[] {
    if (!isValidId(from) || !isValidId(to)) {
      return [];
    }

    if (!this.graph.hasNode(from) || !this.graph.hasNode(to)) {
      return [];
    }

    if (from === to) {
      return [from];
    }

    const queue: Array<{ node: string; path: string[] }> = [{ node: from, path: [from] }];
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      // Check all neighbors
      try {
        this.graph.forEachOutNeighbor(node, (neighbor) => {
          if (neighbor === to) {
            // Found the target, return the complete path
            throw [...path, neighbor]; // Use exception to break out early with result
          }

          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push({ node: neighbor, path: [...path, neighbor] });
          }
        });
      } catch (result) {
        // If it's an array, it's our path result
        if (Array.isArray(result)) {
          return result;
        }
        // Otherwise, it's a real error, rethrow
        throw result;
      }
    }

    return []; // No path found
  }

  /**
   * Get neighboring nodes
   * @param nodeId Node ID
   * @returns Array of neighbor node IDs
   */
  getNeighbors(nodeId: string): string[] {
    if (!isValidId(nodeId) || !this.graph.hasNode(nodeId)) {
      return [];
    }

    const neighbors = new Set<string>();

    try {
      this.graph.forEachNeighbor(nodeId, (neighbor) => {
        neighbors.add(neighbor);
      });
    } catch (error) {
      // Handle errors gracefully
    }

    return Array.from(neighbors);
  }

  /**
   * Check if two nodes are connected by any path
   * @param from Source node ID
   * @param to Target node ID
   * @returns True if nodes are connected
   */
  isConnected(from: string, to: string): boolean {
    if (!isValidId(from) || !isValidId(to)) {
      return false;
    }

    const path = this.findShortestPath(from, to);
    return path.length > 0;
  }

  // ============ Subgraph Operations ============

  /**
   * Get a subgraph starting from a node
   * @param nodeId Starting node ID
   * @param depth Maximum depth to explore
   * @returns Array of Knowledge objects
   */
  getSubgraph(nodeId: string, depth: number = 2): Knowledge[] {
    if (!isValidId(nodeId) || !this.graph.hasNode(nodeId)) {
      return [];
    }

    const visited = new Set<string>();
    const result: Knowledge[] = [];

    const explore = (currentId: string, currentDepth: number): void => {
      if (currentDepth < 0 || visited.has(currentId)) return;

      visited.add(currentId);
      const node = this.getNode(currentId);
      if (!node) return;

      const edges = this.getNodeEdges(currentId);
      result.push({
        node,
        edges,
        context: `Subgraph from ${nodeId}, depth ${depth - currentDepth}`,
      });

      // Explore connected nodes
      if (currentDepth > 0) {
        this.graph.forEachNeighbor(currentId, (neighbor) => {
          explore(neighbor, currentDepth - 1);
        });
      }
    };

    explore(nodeId, depth);
    return result;
  }

  // ============ Graph Analysis and Clustering ============

  /**
   * Detect communities/clusters in the graph
   * @param algorithm Clustering algorithm ('community' or 'similarity')
   * @returns Array of KnowledgeCluster objects
   */
  clusterNodes(algorithm: 'community' | 'similarity'): KnowledgeCluster[] {
    if (this.graph.order === 0) {
      return [];
    }

    switch (algorithm) {
      case 'community':
        return this.detectCommunities();
      case 'similarity':
        return this.clusterBySimilarity();
      default:
        throw new Error(`Unsupported clustering algorithm: ${algorithm}`);
    }
  }

  /**
   * Get connected components in the graph
   * @returns Array of component node arrays
   */
  getConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    this.graph.forEachNode((nodeId) => {
      if (visited.has(nodeId)) return;

      const component: string[] = [];
      const stack = [nodeId];

      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;

        visited.add(current);
        component.push(current);

        // Add all neighbors to stack (both directions)
        this.graph.forEachNeighbor(current, (neighbor) => {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        });
      }

      if (component.length > 0) {
        components.push(component);
      }
    });

    return components;
  }

  /**
   * Calculate metrics for a specific node
   * @param nodeId Node ID
   * @returns NodeMetrics object
   */
  calculateNodeMetrics(nodeId: string): NodeMetrics {
    if (!isValidId(nodeId) || !this.graph.hasNode(nodeId)) {
      return { degree: 0, betweenness: 0, closeness: 0 };
    }

    const degree = this.graph.degree(nodeId);
    const betweenness = this.calculateBetweennessCentrality(nodeId);
    const closeness = this.calculateClosenessCentrality(nodeId);

    return { degree, betweenness, closeness };
  }

  // ============ Data Import/Export ============

  /**
   * Export the entire graph as GraphData
   * @returns GraphData object
   */
  export(): GraphData {
    const nodes: Information[] = [];
    const edges: Relationship[] = [];

    // Export all nodes
    this.graph.forEachNode((nodeId, attributes) => {
      nodes.push(deepClone(attributes));
    });

    // Export all edges
    this.graph.forEachEdge((edge, attributes) => {
      edges.push(deepClone(attributes));
    });

    return {
      nodes,
      edges,
      metadata: {
        version: '1.0.0',
        created: new Date(),
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    };
  }

  /**
   * Import graph data, replacing current data
   * @param data GraphData to import
   * @throws Error if data is invalid
   */
  import(data: GraphData): void {
    if (!validateGraphData(data)) {
      throw new Error('Invalid graph data structure');
    }

    // Clear existing graph
    this.clear();

    // Import nodes
    for (const node of data.nodes) {
      try {
        this.addNode(node);
      } catch (error) {
        console.warn(`Failed to import node ${node.id}:`, error);
      }
    }

    // Import edges
    for (const edge of data.edges) {
      try {
        this.addEdge(edge);
      } catch (error) {
        console.warn(`Failed to import edge ${edge.from}->${edge.to}:`, error);
      }
    }
  }

  /**
   * Clear all data from the graph
   */
  clear(): void {
    this.graph.clear();
    this.edgeTypeIndex.clear();
  }

  // ============ Private Helper Methods ============

  /**
   * Validate node data
   */
  private isValidNode(info: Information): boolean {
    return (
      typeof info === 'object' &&
      info !== null &&
      typeof info.id === 'string' &&
      info.id.length > 0 &&
      info.content !== undefined &&
      typeof info.type === 'string' &&
      info.type.length > 0 &&
      info.created instanceof Date &&
      info.modified instanceof Date
    );
  }

  /**
   * Validate relationship data
   */
  private isValidRelationship(rel: Relationship): boolean {
    return (
      typeof rel === 'object' &&
      rel !== null &&
      typeof rel.from === 'string' &&
      rel.from.length > 0 &&
      typeof rel.to === 'string' &&
      rel.to.length > 0 &&
      typeof rel.type === 'string' &&
      rel.type.length > 0 &&
      rel.created instanceof Date &&
      (rel.strength === undefined || (typeof rel.strength === 'number' && rel.strength >= 0 && rel.strength <= 1))
    );
  }

  /**
   * Add edge to type index for fast lookups
   */
  private addToEdgeTypeIndex(type: string, edgeId: string): void {
    if (!this.edgeTypeIndex.has(type)) {
      this.edgeTypeIndex.set(type, new Set());
    }
    this.edgeTypeIndex.get(type)!.add(edgeId);
  }

  /**
   * Remove edge from type index
   */
  private removeFromEdgeTypeIndex(type: string, edgeId: string): void {
    const edges = this.edgeTypeIndex.get(type);
    if (edges) {
      edges.delete(edgeId);
      if (edges.size === 0) {
        this.edgeTypeIndex.delete(type);
      }
    }
  }

  /**
   * Detect communities using a simple connected components approach
   * In a full implementation, this would use more sophisticated algorithms like Louvain
   */
  private detectCommunities(): KnowledgeCluster[] {
    const components = this.getConnectedComponents();
    return components.map((component, index) => {
      const coherence = this.calculateComponentCoherence(component);
      return {
        id: generateId('cluster'),
        nodes: component,
        algorithm: 'community' as const,
        coherence,
      };
    });
  }

  /**
   * Cluster by similarity (simplified implementation)
   * In a full implementation, this would use advanced similarity metrics
   */
  private clusterBySimilarity(): KnowledgeCluster[] {
    // For now, use the same logic as community detection
    // A full implementation would analyze node content similarity
    return this.detectCommunities().map(cluster => ({
      ...cluster,
      algorithm: 'similarity' as const,
    }));
  }

  /**
   * Calculate coherence score for a component
   */
  private calculateComponentCoherence(nodes: string[]): number {
    if (nodes.length <= 1) return 1.0;

    let totalEdges = 0;
    let actualEdges = 0;

    // Count edges within the component
    for (const nodeId of nodes) {
      this.graph.forEachOutEdge(nodeId, (edge, attributes, source, target) => {
        totalEdges++;
        if (nodes.includes(target)) {
          actualEdges++;
        }
      });
    }

    return totalEdges > 0 ? actualEdges / totalEdges : 0;
  }

  /**
   * Calculate betweenness centrality for a node (simplified)
   */
  private calculateBetweennessCentrality(nodeId: string): number {
    // Simplified implementation - in practice, would use proper shortest-path algorithms
    let betweenness = 0;
    const nodes = Array.from(this.graph.nodes());
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const source = nodes[i];
        const target = nodes[j];
        
        if (source === nodeId || target === nodeId) continue;
        
        const paths = this.findPaths(source, target, 4); // Limited depth for performance
        const pathsThroughNode = paths.filter(path => path.includes(nodeId));
        
        if (paths.length > 0) {
          betweenness += pathsThroughNode.length / paths.length;
        }
      }
    }
    
    return betweenness;
  }

  /**
   * Calculate closeness centrality for a node (simplified)
   */
  private calculateClosenessCentrality(nodeId: string): number {
    const nodes = Array.from(this.graph.nodes());
    let totalDistance = 0;
    let reachableNodes = 0;

    for (const targetNode of nodes) {
      if (targetNode === nodeId) continue;

      const path = this.findShortestPath(nodeId, targetNode);
      if (path.length > 1) {
        totalDistance += path.length - 1;
        reachableNodes++;
      }
    }

    return reachableNodes > 0 ? reachableNodes / totalDistance : 0;
  }
}