/**
 * KnowledgeManager - Level 2: Knowledge API
 * 
 * Manages relationships, connections, and graph-level operations
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
} from '../../types.js';
import { isValidId, deepClone, validateConfidence } from '../../utils.js';
import type { GraphFoundation } from '../../GraphFoundation.js';
import type { EventBus } from '../../orchestration/EventBus.js';

export interface KnowledgeManagerDependencies {
  graphFoundation: GraphFoundation;
  eventBus: EventBus;
}

export class KnowledgeManager {
  private dependencies: KnowledgeManagerDependencies;

  constructor(dependencies: KnowledgeManagerDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Create a relationship between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param type Relationship type (e.g., 'leads_to', 'related_to')
   * @param metadata Optional metadata including strength and custom properties
   * @returns Created Relationship object
   * @throws Error if validation fails or nodes don't exist
   */
  connect(from: string, to: string, type: string, metadata?: unknown): Relationship {
    // Validate relationship type
    if (!type || typeof type !== 'string' || type.trim() === '') {
      throw new Error('Relationship type must not be empty');
    }

    // Check for invalid node IDs first (validation logic before existence check)
    if (!isValidId(from) || !isValidId(to)) {
      throw new Error('Invalid node IDs');
    }

    // Then check if nodes exist (existence check after validation)
    if (!this.dependencies.graphFoundation.hasNode(from) || !this.dependencies.graphFoundation.hasNode(to)) {
      throw new Error('One or both nodes do not exist');
    }

    // Handle metadata and extract strength
    let strength = 1.0;
    let processedMetadata = metadata;

    if (metadata && typeof metadata === 'object' && metadata !== null) {
      const metaObj = metadata as Record<string, unknown>;
      if (typeof metaObj.strength === 'number') {
        strength = validateConfidence(metaObj.strength);
        // Remove strength from metadata since it's handled separately
        const { strength: _, ...restMetadata } = metaObj;
        processedMetadata = Object.keys(restMetadata).length > 0 ? restMetadata : undefined;
      } else {
        processedMetadata = metadata;
      }
    } else if (metadata === null) {
      processedMetadata = null;
    } else if (metadata === undefined) {
      processedMetadata = undefined;
    }

    const relationship: Relationship = {
      from,
      to,
      type: type.trim(),
      strength,
      created: new Date(),
      metadata: processedMetadata as Record<string, unknown> | null | undefined,
    };

    this.dependencies.graphFoundation.addEdge(relationship);
    this.dependencies.eventBus.emit('knowledge:afterConnect', relationship);

    return deepClone(relationship);
  }

  /**
   * Remove relationship(s) between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param type Optional relationship type to remove (if not specified, removes all)
   * @returns True if relationship(s) were removed, false otherwise
   */
  disconnect(from: string, to: string, type?: string): boolean {
    if (!isValidId(from) || !isValidId(to)) {
      return false;
    }

    if (!this.dependencies.graphFoundation.hasNode(from) || !this.dependencies.graphFoundation.hasNode(to)) {
      return false;
    }

    const removed = this.dependencies.graphFoundation.deleteEdge(from, to, type);

    if (removed) {
      this.dependencies.eventBus.emit('knowledge:afterDisconnect', from, to);
    }

    return removed;
  }

  /**
   * Get all relationships for a node in specified direction
   * @param nodeId Node ID to query relationships for
   * @param direction Direction of relationships ('in', 'out', or 'both', default: 'out')
   * @returns Array of Relationship objects
   */
  getRelationships(nodeId: string, direction?: 'in' | 'out' | 'both'): Relationship[] {
    const dir = direction ?? 'out'; // Default to outgoing relationships
    if (!isValidId(nodeId)) return [];

    return this.dependencies.graphFoundation.getNodeEdges(nodeId, dir);
  }

  /**
   * Find all paths between two nodes with enhanced validation and options
   * @param from Source node ID
   * @param to Target node ID  
   * @param maxDepth Maximum path depth (default: 5)
   * @returns Array of paths (arrays of node IDs), sorted by path length and strength
   */
  findPaths(from: string, to: string, maxDepth = 5): string[][] {
    // Enhanced input validation
    if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
      return [];
    }
    
    if (!isValidId(from) || !isValidId(to)) {
      return [];
    }
    
    // Validate maxDepth parameter
    if (typeof maxDepth !== 'number' || maxDepth < 1 || maxDepth > 20) {
      maxDepth = 5; // Use safe default
    }
    
    const paths = this.dependencies.graphFoundation.findPaths(from, to, maxDepth);
    
    // Sort paths by length (shortest first) and then by relationship strength
    return paths.sort((pathA, pathB) => {
      // Primary sort: path length (shorter paths first)
      if (pathA.length !== pathB.length) {
        return pathA.length - pathB.length;
      }
      
      // Secondary sort: path strength (stronger paths first)
      const strengthA = this.calculatePathStrength(pathA);
      const strengthB = this.calculatePathStrength(pathB);
      return strengthB - strengthA;
    });
  }

  /**
   * Extract a subgraph around a node with enhanced Knowledge objects
   * @param nodeId Central node ID to build subgraph around
   * @param depth Maximum traversal depth (default: 2)
   * @returns Array of Knowledge objects with nodes and their relationships
   */
  getSubgraph(nodeId: string, depth = 2): Knowledge[] {
    // Input validation
    if (!nodeId || typeof nodeId !== 'string' || !isValidId(nodeId)) {
      return [];
    }
    
    // Validate depth parameter
    if (typeof depth !== 'number' || depth < 1 || depth > 10) {
      depth = 2; // Use safe default
    }
    
    const subgraph = this.dependencies.graphFoundation.getSubgraph(nodeId, depth);
    
    // Enhance Knowledge objects with contextual information
    return subgraph.map(knowledge => ({
      ...knowledge,
      context: this.buildKnowledgeContext(knowledge),
    }));
  }

  /**
   * Perform graph clustering to identify knowledge communities
   * @param algorithm Clustering algorithm ('community' or 'similarity')
   * @returns Array of KnowledgeCluster objects with coherence scores
   */
  cluster(algorithm = 'community' as const): KnowledgeCluster[] {
    // Validate algorithm parameter
    const validAlgorithms = ['community', 'similarity'] as const;
    if (!validAlgorithms.includes(algorithm)) {
      algorithm = 'community'; // Use safe default
    }
    
    const clusters = this.dependencies.graphFoundation.clusterNodes(algorithm);
    
    // Emit clustering event for plugins
    this.dependencies.eventBus.emit('knowledge:onCluster', clusters, algorithm);
    
    return clusters;
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
    const validAlgorithms = ['community', 'similarity'] as const;
    if (!validAlgorithms.includes(algorithm)) {
      algorithm = 'community'; // Use safe default
    }
    
    const clusters = this.dependencies.graphFoundation.clusterWithOptions(algorithm, options);
    
    // Emit clustering event for plugins
    this.dependencies.eventBus.emit('knowledge:onCluster', clusters, algorithm);
    
    return clusters;
  }

  /**
   * Get comprehensive metrics for a node
   * @param nodeId Node ID to analyze
   * @returns Enhanced NodeMetrics object
   */
  getNodeMetrics(nodeId: string): NodeMetrics {
    return this.dependencies.graphFoundation.calculateNodeMetrics(nodeId);
  }

  /**
   * Get graph-level metrics
   * @returns GraphMetrics object
   */
  getGraphMetrics(): GraphMetrics {
    return this.dependencies.graphFoundation.getGraphMetrics();
  }

  /**
   * Analyze structural properties of the graph
   * @returns StructuralAnalysis object
   */
  analyzeStructure(): StructuralAnalysis {
    return this.dependencies.graphFoundation.analyzeStructure();
  }

  /**
   * Get structural importance analysis
   * @returns StructuralImportance object
   */
  getStructuralImportance(): StructuralImportance {
    return this.dependencies.graphFoundation.getStructuralImportance();
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
    return this.dependencies.graphFoundation.findCentralNodes(count, centralityType);
  }

  /**
   * Build contextual description for a Knowledge object
   * @param knowledge Knowledge object to analyze
   * @returns Contextual description string
   */
  private buildKnowledgeContext(knowledge: Knowledge): string {
    const { node, edges } = knowledge;
    
    if (edges.length === 0) {
      return `Isolated node: ${node.type}`;
    }
    
    const incomingCount = edges.filter(e => e.to === node.id).length;
    const outgoingCount = edges.filter(e => e.from === node.id).length;
    const relationshipTypes = [...new Set(edges.map(e => e.type))];
    
    let contextParts: string[] = [];
    
    // Add node type information
    contextParts.push(`${node.type} node`);
    
    // Add relationship information
    if (outgoingCount > 0) {
      contextParts.push(`${outgoingCount} outgoing connection${outgoingCount > 1 ? 's' : ''}`);
    }
    
    if (incomingCount > 0) {
      contextParts.push(`${incomingCount} incoming connection${incomingCount > 1 ? 's' : ''}`);
    }
    
    // Add relationship types if not too many
    if (relationshipTypes.length <= 3) {
      contextParts.push(`types: ${relationshipTypes.join(', ')}`);
    } else {
      contextParts.push(`${relationshipTypes.length} different relationship types`);
    }
    
    // Add strength information
    const avgStrength = edges.reduce((sum, e) => sum + (e.strength ?? 1.0), 0) / edges.length;
    const strengthDesc = avgStrength > 0.8 ? 'strong' : avgStrength > 0.5 ? 'moderate' : 'weak';
    contextParts.push(`${strengthDesc} connections`);
    
    return contextParts.join(', ');
  }

  /**
   * Calculate the overall strength of a path based on relationship strengths
   * @param path Array of node IDs representing the path
   * @returns Combined strength score (0-1)
   */
  private calculatePathStrength(path: string[]): number {
    if (path.length < 2) return 1.0; // Single node path has maximum strength

    let totalStrength = 0;
    let edgeCount = 0;

    // Calculate strength based on edges in the path
    for (let i = 0; i < path.length - 1; i++) {
      const fromNode = path[i];
      const toNode = path[i + 1];
      
      // Get relationship between consecutive nodes
      const relationships = this.getRelationships(fromNode, 'out')
        .filter(rel => rel.to === toNode);
      
      if (relationships.length > 0) {
        // Use the strongest relationship if multiple exist
        const maxStrength = Math.max(...relationships.map(rel => rel.strength ?? 1.0));
        totalStrength += maxStrength;
        edgeCount++;
      } else {
        // If no direct relationship found, use minimum strength
        totalStrength += 0.1;
        edgeCount++;
      }
    }

    // Return average strength of all edges in the path
    return edgeCount > 0 ? totalStrength / edgeCount : 0;
  }
}