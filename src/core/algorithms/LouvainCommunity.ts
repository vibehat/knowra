/**
 * Louvain Community Detection Algorithm
 * 
 * Implements the Louvain method for community detection in weighted graphs.
 * Optimizes modularity through iterative local moves and graph coarsening.
 * 
 * Reference: Blondel et al. "Fast unfolding of communities in large networks" (2008)
 */

import type { 
  Information, 
  Relationship, 
  KnowledgeCluster,
  CommunityDetectionOptions 
} from '../types.js';
import { generateId, validateConfidence } from '../utils.js';

/**
 * Internal representation of a node in the Louvain algorithm
 */
interface LouvainNode {
  id: string;
  community: number;
  weight: number; // Sum of weights of edges connecting to this node
}

/**
 * Internal representation of an edge in the Louvain algorithm
 */
interface LouvainEdge {
  source: string;
  target: string;
  weight: number;
}

/**
 * Community information during algorithm execution
 */
interface Community {
  id: number;
  nodes: Set<string>;
  totalWeight: number; // Sum of weights of all edges in community
  internalWeight: number; // Sum of weights of edges within community
}

/**
 * Louvain Community Detection Implementation
 */
export class LouvainCommunity {
  private nodes: Map<string, LouvainNode> = new Map();
  private edges: LouvainEdge[] = [];
  private communities: Map<number, Community> = new Map();
  private totalGraphWeight: number = 0;
  private options: Required<CommunityDetectionOptions>;

  // Performance optimization: adjacency maps for faster lookup
  private nodeToEdges: Map<string, LouvainEdge[]> = new Map();
  private nodeNeighbors: Map<string, Set<string>> = new Map();

  constructor(options: CommunityDetectionOptions = {}) {
    this.options = {
      resolution: options.resolution ?? 1.0,
      minCommunitySize: options.minCommunitySize ?? 1,
      maxIterations: options.maxIterations ?? 200,
      randomSeed: options.randomSeed ?? Date.now(),
    };
  }

  /**
   * Detect communities in the given graph
   * @param graphNodes Information nodes
   * @param graphEdges Relationship edges  
   * @returns Array of detected communities
   */
  detectCommunities(
    graphNodes: Information[], 
    graphEdges: Relationship[]
  ): KnowledgeCluster[] {
    if (graphNodes.length === 0) {
      return [];
    }

    // Initialize internal data structures
    this.initializeGraph(graphNodes, graphEdges);
    
    // Phase 1: Local optimization
    let improved = true;
    let iteration = 0;
    
    while (improved && iteration < this.options.maxIterations) {
      improved = this.optimizeLocally();
      iteration++;
    }
    
    // Phase 2: Community aggregation (simplified for first implementation)
    // In full implementation, this would create a new coarsened graph
    
    return this.extractCommunities();
  }

  /**
   * Initialize the internal graph representation
   */
  private initializeGraph(graphNodes: Information[], graphEdges: Relationship[]): void {
    this.nodes.clear();
    this.edges = [];
    this.communities.clear();
    this.totalGraphWeight = 0;
    this.nodeToEdges.clear();
    this.nodeNeighbors.clear();

    // Initialize nodes - each node starts in its own community
    graphNodes.forEach((node, index) => {
      this.nodes.set(node.id, {
        id: node.id,
        community: index,
        weight: 0,
      });
      
      // Initialize community for this node
      this.communities.set(index, {
        id: index,
        nodes: new Set([node.id]),
        totalWeight: 0,
        internalWeight: 0,
      });

      // Initialize adjacency structures
      this.nodeToEdges.set(node.id, []);
      this.nodeNeighbors.set(node.id, new Set());
    });

    // Process edges
    graphEdges.forEach(edge => {
      const weight = edge.strength ?? 1.0;
      
      const edgeObj: LouvainEdge = {
        source: edge.from,
        target: edge.to,
        weight,
      };
      
      this.edges.push(edgeObj);

      // Build adjacency maps for performance
      const sourceEdges = this.nodeToEdges.get(edge.from);
      const targetEdges = this.nodeToEdges.get(edge.to);
      const sourceNeighbors = this.nodeNeighbors.get(edge.from);
      const targetNeighbors = this.nodeNeighbors.get(edge.to);

      if (sourceEdges) sourceEdges.push(edgeObj);
      if (targetEdges && edge.from !== edge.to) targetEdges.push(edgeObj);
      if (sourceNeighbors) sourceNeighbors.add(edge.to);
      if (targetNeighbors && edge.from !== edge.to) targetNeighbors.add(edge.from);

      // Update node weights (degree)
      const sourceNode = this.nodes.get(edge.from);
      const targetNode = this.nodes.get(edge.to);
      
      if (sourceNode) {
        sourceNode.weight += weight;
      }
      if (targetNode && edge.from !== edge.to) {
        targetNode.weight += weight;
      }

      this.totalGraphWeight += weight;
    });

    // Update community weights
    this.updateCommunityWeights();
  }

  /**
   * Perform local optimization phase
   * @returns True if any improvement was made
   */
  private optimizeLocally(): boolean {
    let improved = false;
    
    // Shuffle nodes for better optimization
    const nodeIds = Array.from(this.nodes.keys());
    this.shuffleArray(nodeIds);

    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      const currentCommunity = node.community;
      const bestCommunity = this.findBestCommunity(nodeId);

      if (bestCommunity !== currentCommunity) {
        this.moveNodeToCommunity(nodeId, bestCommunity);
        improved = true;
      }
    }

    return improved;
  }

  /**
   * Find the best community for a node based on modularity gain
   * @param nodeId Node to find best community for
   * @returns Best community ID
   */
  private findBestCommunity(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;

    let bestCommunity = node.community;
    let bestModularityGain = 0;

    // Get neighboring communities
    const neighborCommunities = this.getNeighborCommunities(nodeId);
    neighborCommunities.add(node.community); // Include current community

    for (const communityId of neighborCommunities) {
      const modularityGain = this.calculateModularityGain(nodeId, communityId);
      
      if (modularityGain > bestModularityGain) {
        bestModularityGain = modularityGain;
        bestCommunity = communityId;
      }
    }

    return bestCommunity;
  }

  /**
   * Calculate modularity gain from moving a node to a community
   * @param nodeId Node to move
   * @param targetCommunity Target community
   * @returns Modularity gain (can be negative)
   */
  private calculateModularityGain(nodeId: string, targetCommunity: number): number {
    const node = this.nodes.get(nodeId);
    if (!node) return 0;

    const currentCommunity = node.community;
    if (currentCommunity === targetCommunity) {
      return 0; // No change
    }

    // Weight of edges from this node to target community
    const edgeWeightToTarget = this.getEdgeWeightToCommunity(nodeId, targetCommunity);
    
    // Weight of edges from this node to current community (should be 0 for single-node communities)
    const edgeWeightToCurrent = this.getEdgeWeightToCommunity(nodeId, currentCommunity);
    
    const targetCommunityData = this.communities.get(targetCommunity);
    const currentCommunityData = this.communities.get(currentCommunity);
    
    if (!targetCommunityData || !currentCommunityData) return 0;

    const nodeWeight = node.weight;
    const m = this.totalGraphWeight;
    
    if (m === 0) return 0; // Avoid division by zero

    // Corrected modularity gain calculation based on Newman's formula
    // ΔQ = (kin - ktot*ki/(2m)) / (2m) 
    // where kin = weight to target community, ktot = total weight of target community, ki = node degree
    const deltaQ = edgeWeightToTarget / m - 
                   (targetCommunityData.totalWeight * nodeWeight) / (2 * m * m);

    return deltaQ;
  }

  /**
   * Get the total weight of edges from a node to a community
   * @param nodeId Source node
   * @param communityId Target community
   * @returns Total edge weight
   */
  private getEdgeWeightToCommunity(nodeId: string, communityId: number): number {
    const community = this.communities.get(communityId);
    if (!community) return 0;

    const nodeEdges = this.nodeToEdges.get(nodeId);
    if (!nodeEdges) return 0;

    let totalWeight = 0;
    
    for (const edge of nodeEdges) {
      const targetNodeId = edge.source === nodeId ? edge.target : edge.source;
      if (community.nodes.has(targetNodeId)) {
        totalWeight += edge.weight;
      }
    }

    return totalWeight;
  }

  /**
   * Get communities that are neighbors to the given node
   * @param nodeId Node to check neighbors for
   * @returns Set of neighboring community IDs
   */
  private getNeighborCommunities(nodeId: string): Set<number> {
    const neighborCommunities = new Set<number>();
    const neighbors = this.nodeNeighbors.get(nodeId);
    
    if (!neighbors) return neighborCommunities;

    for (const neighborId of neighbors) {
      const neighborNode = this.nodes.get(neighborId);
      if (neighborNode) {
        neighborCommunities.add(neighborNode.community);
      }
    }

    return neighborCommunities;
  }

  /**
   * Move a node to a different community
   * @param nodeId Node to move
   * @param targetCommunity Target community ID
   */
  private moveNodeToCommunity(nodeId: string, targetCommunity: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const currentCommunity = node.community;
    if (currentCommunity === targetCommunity) return;

    // Remove from current community
    const currentCommunityData = this.communities.get(currentCommunity);
    if (currentCommunityData) {
      currentCommunityData.nodes.delete(nodeId);
      
      // If community becomes empty, remove it
      if (currentCommunityData.nodes.size === 0) {
        this.communities.delete(currentCommunity);
      }
    }

    // Add to target community (create if doesn't exist)
    let targetCommunityData = this.communities.get(targetCommunity);
    if (!targetCommunityData) {
      targetCommunityData = {
        id: targetCommunity,
        nodes: new Set(),
        totalWeight: 0,
        internalWeight: 0,
      };
      this.communities.set(targetCommunity, targetCommunityData);
    }
    
    targetCommunityData.nodes.add(nodeId);
    node.community = targetCommunity;

    // Update community weights
    this.updateCommunityWeights();
  }

  /**
   * Update weights for all communities
   */
  private updateCommunityWeights(): void {
    // Reset weights
    for (const community of this.communities.values()) {
      community.totalWeight = 0;
      community.internalWeight = 0;
    }

    // Calculate weights from nodes (total degree of community)
    for (const node of this.nodes.values()) {
      const community = this.communities.get(node.community);
      if (community) {
        community.totalWeight += node.weight;
      }
    }

    // Calculate internal weights from edges
    for (const edge of this.edges) {
      const sourceNode = this.nodes.get(edge.source);
      const targetNode = this.nodes.get(edge.target);
      
      if (sourceNode && targetNode && sourceNode.community === targetNode.community) {
        const community = this.communities.get(sourceNode.community);
        if (community) {
          community.internalWeight += edge.weight;
        }
      }
    }
  }

  /**
   * Extract final communities as KnowledgeCluster objects
   * @returns Array of knowledge clusters
   */
  private extractCommunities(): KnowledgeCluster[] {
    const clusters: KnowledgeCluster[] = [];

    for (const community of this.communities.values()) {
      // Filter out small communities if required
      if (community.nodes.size < this.options.minCommunitySize) {
        continue;
      }

      const nodeArray = Array.from(community.nodes);
      const coherence = this.calculateCommunityCoherence(community);
      const modularity = this.calculateCommunityModularity(community);

      clusters.push({
        id: generateId('cluster'),
        nodes: nodeArray,
        algorithm: 'community' as const,
        coherence: validateConfidence(coherence),
        modularity: validateConfidence(modularity),
      });
    }

    return clusters;
  }

  /**
   * Calculate coherence score for a community
   * @param community Community to analyze
   * @returns Coherence score (0-1)
   */
  private calculateCommunityCoherence(community: Community): number {
    if (community.nodes.size <= 1) return 1.0;
    if (community.totalWeight === 0) return 0;

    // Enhanced coherence calculation
    // For directed graphs, we count internal edges twice (as they contribute to both nodes' degrees)
    const adjustedInternal = community.internalWeight * 2;
    const coherence = Math.min(1.0, adjustedInternal / community.totalWeight);
    
    return coherence;
  }

  /**
   * Calculate modularity contribution of a community
   * @param community Community to analyze
   * @returns Modularity contribution
   */
  private calculateCommunityModularity(community: Community): number {
    if (this.totalGraphWeight === 0) return 0;

    const m = this.totalGraphWeight;
    const internalEdges = community.internalWeight;
    const totalDegree = community.totalWeight;
    
    // Newman's modularity formula: (e_in - (d_in/2m)^2) 
    // where e_in is fraction of internal edges, d_in is total degree of community
    const fractionInternal = internalEdges / m;
    const expectedInternal = (totalDegree * totalDegree) / (4 * m * m);
    
    return fractionInternal - expectedInternal;
  }

  /**
   * Shuffle array in place using Fisher-Yates algorithm
   * @param array Array to shuffle
   */
  private shuffleArray<T>(array: T[]): void {
    // Use seeded random for reproducibility
    let seed = this.options.randomSeed;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [array[i], array[j]] = [array[j]!, array[i]!];
    }
  }
}