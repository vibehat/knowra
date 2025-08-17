/**
 * GraphPatternMining - Advanced graph pattern detection algorithms
 * 
 * Implements various algorithms to detect structural patterns in knowledge graphs
 * including stars, chains, cycles, trees, bridges, clusters, and hubs
 */

import type { GraphPattern, PatternMiningOptions, PatternMetrics } from '../types.js';
import { generateId } from '../utils.js';
import type { GraphFoundation } from '../GraphFoundation.js';

export interface GraphPatternMiningConfig {
  minSupport?: number;
  minConfidence?: number;
  maxPatternSize?: number;
  enabledPatternTypes?: Array<'star' | 'chain' | 'cycle' | 'tree' | 'bridge' | 'cluster' | 'hub'>;
}

export class GraphPatternMining {
  private graph: GraphFoundation;
  private config: Required<GraphPatternMiningConfig>;
  private patterns: Map<string, GraphPattern> = new Map();

  constructor(graph: GraphFoundation, config: GraphPatternMiningConfig = {}) {
    this.graph = graph;
    this.config = {
      minSupport: 0.1,
      minConfidence: 0.3,
      maxPatternSize: 5,
      enabledPatternTypes: ['star', 'chain', 'cycle', 'tree', 'bridge', 'cluster', 'hub'],
      ...config,
    };
  }

  /**
   * Mine all enabled pattern types from the graph
   */
  minePatterns(options?: PatternMiningOptions): GraphPattern[] {
    const opts: Required<PatternMiningOptions> = {
      minSupport: this.config.minSupport,
      minConfidence: this.config.minConfidence,
      maxPatternSize: this.config.maxPatternSize,
      patternTypes: this.config.enabledPatternTypes,
      includeMetadata: false,
      ...options,
    };

    this.patterns.clear();

    // Mine each type of pattern
    for (const patternType of opts.patternTypes) {
      switch (patternType) {
        case 'star':
          this.mineStarPatterns(opts);
          break;
        case 'chain':
          this.mineChainPatterns(opts);
          break;
        case 'cycle':
          this.mineCyclePatterns(opts);
          break;
        case 'tree':
          this.mineTreePatterns(opts);
          break;
        case 'bridge':
          this.mineBridgePatterns(opts);
          break;
        case 'cluster':
          this.mineClusterPatterns(opts);
          break;
        case 'hub':
          this.mineHubPatterns(opts);
          break;
      }
    }

    // Filter patterns by support and confidence
    const filteredPatterns = Array.from(this.patterns.values())
      .filter(pattern => 
        pattern.support >= opts.minSupport && 
        pattern.confidence >= opts.minConfidence
      );

    // Calculate additional metrics
    for (const pattern of filteredPatterns) {
      this.calculatePatternMetrics(pattern);
    }

    return filteredPatterns;
  }

  /**
   * Mine star patterns (central node with multiple connections)
   */
  private mineStarPatterns(options: Required<PatternMiningOptions>): void {
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    
    for (const centerId of nodeIds) {
      const outgoingEdges = this.graph.getNodeEdges(centerId, 'out');
      const incomingEdges = this.graph.getNodeEdges(centerId, 'in');
      
      // Star pattern: center node with 3+ connections (outgoing or incoming)
      if (outgoingEdges.length >= 3) {
        this.createStarPattern(centerId, outgoingEdges, 'outgoing', options);
      }
      
      if (incomingEdges.length >= 3) {
        this.createStarPattern(centerId, incomingEdges, 'incoming', options);
      }
    }
  }

  /**
   * Create a star pattern from center node and edges
   */
  private createStarPattern(
    centerId: string,
    edges: Array<{ from: string; to: string; type: string }>,
    direction: 'outgoing' | 'incoming',
    options: Required<PatternMiningOptions>
  ): void {
    // maxPatternSize limits total number of nodes (center + leaves)
    // So we need maxPatternSize - 1 edges to stay within the limit
    const maxEdges = options.maxPatternSize - 1;
    if (edges.length > maxEdges) {
      edges = edges.slice(0, maxEdges);
    }

    const nodes = [centerId];
    const patternEdges = [];

    for (const edge of edges) {
      const leafNode = direction === 'outgoing' ? edge.to : edge.from;
      nodes.push(leafNode);
      patternEdges.push({
        from: edge.from,
        to: edge.to,
        type: edge.type,
      });
    }

    const support = this.calculateSupport(nodes);
    const confidence = this.calculateConfidence(patternEdges);

    const pattern: GraphPattern = {
      id: generateId('star-pattern'),
      type: 'star',
      description: `Star pattern with center ${centerId} and ${edges.length} ${direction} connections`,
      nodes,
      edges: patternEdges,
      frequency: 1, // Will be updated by pattern consolidation
      confidence,
      support,
      contexts: [], // Will be populated based on usage
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Mine chain patterns (sequential connections)
   */
  private mineChainPatterns(options: Required<PatternMiningOptions>): void {
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    const visited = new Set<string>();

    for (const startId of nodeIds) {
      if (visited.has(startId)) continue;

      const chains = this.findChains(startId, options.maxPatternSize);
      
      for (const chain of chains) {
        if (chain.length >= 3) { // Minimum chain length
          this.createChainPattern(chain, options);
          
          // Mark nodes as visited to avoid duplicate chains
          for (const nodeId of chain) {
            visited.add(nodeId);
          }
        }
      }
    }
  }

  /**
   * Find chain patterns starting from a node
   */
  private findChains(startId: string, maxLength: number): string[][] {
    const chains: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentId: string, path: string[]): void => {
      if (path.length >= maxLength || visited.has(currentId)) {
        if (path.length >= 3) {
          chains.push([...path]);
        }
        return;
      }

      visited.add(currentId);
      const outgoingEdges = this.graph.getNodeEdges(currentId, 'out');
      
      // Continue chain if there's exactly one outgoing edge (linear chain)
      if (outgoingEdges.length === 1) {
        const nextId = outgoingEdges[0].to;
        dfs(nextId, [...path, nextId]);
      } else if (path.length >= 3) {
        chains.push([...path]);
      }
      
      visited.delete(currentId);
    };

    dfs(startId, [startId]);
    return chains;
  }

  /**
   * Create a chain pattern
   */
  private createChainPattern(nodes: string[], options: Required<PatternMiningOptions>): void {
    const edges = [];
    
    for (let i = 0; i < nodes.length - 1; i++) {
      const edgeData = this.graph.getNodeEdges(nodes[i], 'out')
        .find(edge => edge.to === nodes[i + 1]);
      
      if (edgeData) {
        edges.push({
          from: edgeData.from,
          to: edgeData.to,
          type: edgeData.type,
        });
      }
    }

    const support = this.calculateSupport(nodes);
    const confidence = this.calculateConfidence(edges);

    const pattern: GraphPattern = {
      id: generateId('chain-pattern'),
      type: 'chain',
      description: `Chain pattern with ${nodes.length} nodes`,
      nodes,
      edges,
      frequency: 1,
      confidence,
      support,
      contexts: [],
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Mine cycle patterns (circular connections)
   */
  private mineCyclePatterns(options: Required<PatternMiningOptions>): void {
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    const visited = new Set<string>();

    for (const startId of nodeIds) {
      if (visited.has(startId)) continue;

      const cycles = this.findCycles(startId, options.maxPatternSize);
      
      for (const cycle of cycles) {
        if (cycle.length >= 3) {
          this.createCyclePattern(cycle, options);
          
          // Mark cycle nodes as visited
          for (const nodeId of cycle) {
            visited.add(nodeId);
          }
        }
      }
    }
  }

  /**
   * Find cycle patterns using DFS
   */
  private findCycles(startId: string, maxLength: number): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string): void => {
      if (path.length >= maxLength) return;

      if (path.includes(currentId)) {
        // Found a cycle
        const cycleStart = path.indexOf(currentId);
        const cycle = path.slice(cycleStart);
        if (cycle.length >= 3) {
          cycles.push([...cycle, currentId]); // Complete the cycle
        }
        return;
      }

      path.push(currentId);
      visited.add(currentId);

      const outgoingEdges = this.graph.getNodeEdges(currentId, 'out');
      
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.to) || path.includes(edge.to)) {
          dfs(edge.to);
        }
      }

      path.pop();
      visited.delete(currentId);
    };

    dfs(startId);
    return cycles;
  }

  /**
   * Create a cycle pattern
   */
  private createCyclePattern(nodes: string[], options: Required<PatternMiningOptions>): void {
    const edges = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const nextIndex = (i + 1) % nodes.length;
      const edgeData = this.graph.getNodeEdges(nodes[i], 'out')
        .find(edge => edge.to === nodes[nextIndex]);
      
      if (edgeData) {
        edges.push({
          from: edgeData.from,
          to: edgeData.to,
          type: edgeData.type,
        });
      }
    }

    const support = this.calculateSupport(nodes);
    const confidence = this.calculateConfidence(edges);

    const pattern: GraphPattern = {
      id: generateId('cycle-pattern'),
      type: 'cycle',
      description: `Cycle pattern with ${nodes.length} nodes`,
      nodes,
      edges,
      frequency: 1,
      confidence,
      support,
      contexts: [],
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Mine tree patterns (hierarchical structures)
   */
  private mineTreePatterns(options: Required<PatternMiningOptions>): void {
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    
    for (const rootId of nodeIds) {
      const tree = this.extractTree(rootId, options.maxPatternSize);
      
      if (tree.nodes.length >= 3) {
        this.createTreePattern(tree, options);
      }
    }
  }

  /**
   * Extract tree structure from a root node
   */
  private extractTree(rootId: string, maxSize: number): { nodes: string[]; edges: Array<{ from: string; to: string; type: string }> } {
    const nodes = [rootId];
    const edges = [];
    const visited = new Set([rootId]);
    const queue = [rootId];

    while (queue.length > 0 && nodes.length < maxSize) {
      const currentId = queue.shift()!;
      const outgoingEdges = this.graph.getNodeEdges(currentId, 'out');

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.to) && nodes.length < maxSize) {
          nodes.push(edge.to);
          edges.push({
            from: edge.from,
            to: edge.to,
            type: edge.type,
          });
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Create a tree pattern
   */
  private createTreePattern(
    tree: { nodes: string[]; edges: Array<{ from: string; to: string; type: string }> },
    options: Required<PatternMiningOptions>
  ): void {
    const support = this.calculateSupport(tree.nodes);
    const confidence = this.calculateConfidence(tree.edges);

    const pattern: GraphPattern = {
      id: generateId('tree-pattern'),
      type: 'tree',
      description: `Tree pattern with ${tree.nodes.length} nodes`,
      nodes: tree.nodes,
      edges: tree.edges,
      frequency: 1,
      confidence,
      support,
      contexts: [],
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Mine bridge patterns (nodes connecting different clusters)
   */
  private mineBridgePatterns(options: Required<PatternMiningOptions>): void {
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    
    for (const nodeId of nodeIds) {
      if (this.isBridgeNode(nodeId)) {
        this.createBridgePattern(nodeId, options);
      }
    }
  }

  /**
   * Check if a node is a bridge between different clusters
   */
  private isBridgeNode(nodeId: string): boolean {
    const neighbors = new Set<string>();
    
    // Get all neighbors
    const outgoing = this.graph.getNodeEdges(nodeId, 'out');
    const incoming = this.graph.getNodeEdges(nodeId, 'in');
    
    for (const edge of outgoing) {
      neighbors.add(edge.to);
    }
    for (const edge of incoming) {
      neighbors.add(edge.from);
    }

    // Check if neighbors are not connected to each other (indicating bridge)
    const neighborArray = Array.from(neighbors);
    let interconnections = 0;
    
    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        const connections = this.graph.getNodeEdges(neighborArray[i], 'out')
          .filter(edge => edge.to === neighborArray[j]);
        
        if (connections.length > 0) {
          interconnections++;
        }
      }
    }

    // Bridge if less than 25% of possible connections exist between neighbors
    const maxConnections = (neighborArray.length * (neighborArray.length - 1)) / 2;
    return maxConnections > 0 && (interconnections / maxConnections) < 0.25;
  }

  /**
   * Create a bridge pattern
   */
  private createBridgePattern(bridgeNodeId: string, options: Required<PatternMiningOptions>): void {
    const outgoing = this.graph.getNodeEdges(bridgeNodeId, 'out');
    const incoming = this.graph.getNodeEdges(bridgeNodeId, 'in');
    
    const nodes = [bridgeNodeId];
    const edges = [];

    // Add connected nodes up to pattern size limit
    const allEdges = [...outgoing, ...incoming];
    for (const edge of allEdges.slice(0, options.maxPatternSize - 1)) {
      const connectedNode = edge.from === bridgeNodeId ? edge.to : edge.from;
      if (!nodes.includes(connectedNode)) {
        nodes.push(connectedNode);
        edges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type,
        });
      }
    }

    const support = this.calculateSupport(nodes);
    const confidence = this.calculateConfidence(edges);

    const pattern: GraphPattern = {
      id: generateId('bridge-pattern'),
      type: 'bridge',
      description: `Bridge pattern with node ${bridgeNodeId} connecting ${nodes.length - 1} clusters`,
      nodes,
      edges,
      frequency: 1,
      confidence,
      support,
      contexts: [],
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Mine cluster patterns (densely connected subgraphs)
   */
  private mineClusterPatterns(options: Required<PatternMiningOptions>): void {
    // Use simple clustering based on edge density
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    const visited = new Set<string>();

    for (const nodeId of nodeIds) {
      if (visited.has(nodeId)) continue;

      const cluster = this.findDenseCluster(nodeId, options.maxPatternSize);
      
      if (cluster.nodes.length >= 3) {
        this.createClusterPattern(cluster, options);
        
        // Mark cluster nodes as visited
        for (const clusterNodeId of cluster.nodes) {
          visited.add(clusterNodeId);
        }
      }
    }
  }

  /**
   * Find dense cluster starting from a node
   */
  private findDenseCluster(startId: string, maxSize: number): { nodes: string[]; edges: Array<{ from: string; to: string; type: string }> } {
    const cluster = [startId];
    const visited = new Set([startId]);
    const edges = [];

    while (cluster.length < maxSize) {
      let bestNode = '';
      let bestDensity = 0;

      // Find node with highest connection density to current cluster
      for (const nodeId of cluster) {
        const nodeEdges = this.graph.getNodeEdges(nodeId, 'both');
        
        for (const edge of nodeEdges) {
          const candidateId = edge.from === nodeId ? edge.to : edge.from;
          
          if (!visited.has(candidateId)) {
            const density = this.calculateClusterDensity(candidateId, cluster);
            
            if (density > bestDensity) {
              bestDensity = density;
              bestNode = candidateId;
            }
          }
        }
      }

      // Add best node if density threshold is met
      if (bestNode && bestDensity > 0.3) {
        cluster.push(bestNode);
        visited.add(bestNode);

        // Add edges to cluster
        const newNodeEdges = this.graph.getNodeEdges(bestNode, 'both');
        for (const edge of newNodeEdges) {
          const otherId = edge.from === bestNode ? edge.to : edge.from;
          if (cluster.includes(otherId)) {
            edges.push({
              from: edge.from,
              to: edge.to,
              type: edge.type,
            });
          }
        }
      } else {
        break;
      }
    }

    return { nodes: cluster, edges };
  }

  /**
   * Calculate density of connections between a candidate node and cluster
   */
  private calculateClusterDensity(candidateId: string, cluster: string[]): number {
    const candidateEdges = this.graph.getNodeEdges(candidateId, 'both');
    let connections = 0;

    for (const edge of candidateEdges) {
      const otherId = edge.from === candidateId ? edge.to : edge.from;
      if (cluster.includes(otherId)) {
        connections++;
      }
    }

    return cluster.length > 0 ? connections / cluster.length : 0;
  }

  /**
   * Create a cluster pattern
   */
  private createClusterPattern(
    cluster: { nodes: string[]; edges: Array<{ from: string; to: string; type: string }> },
    options: Required<PatternMiningOptions>
  ): void {
    const support = this.calculateSupport(cluster.nodes);
    const confidence = this.calculateConfidence(cluster.edges);

    const pattern: GraphPattern = {
      id: generateId('cluster-pattern'),
      type: 'cluster',
      description: `Dense cluster with ${cluster.nodes.length} nodes and ${cluster.edges.length} edges`,
      nodes: cluster.nodes,
      edges: cluster.edges,
      frequency: 1,
      confidence,
      support,
      contexts: [],
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Mine hub patterns (nodes with high connectivity)
   */
  private mineHubPatterns(options: Required<PatternMiningOptions>): void {
    const nodes = this.graph.getAllNodes();
    const nodeIds = nodes.map(node => node.id);
    const connectivityThreshold = Math.max(3, Math.floor(nodeIds.length * 0.05)); // 5% of total nodes or minimum 3

    for (const nodeId of nodeIds) {
      const totalConnections = this.graph.getNodeEdges(nodeId, 'both').length;
      
      if (totalConnections >= connectivityThreshold) {
        this.createHubPattern(nodeId, options);
      }
    }
  }

  /**
   * Create a hub pattern
   */
  private createHubPattern(hubNodeId: string, options: Required<PatternMiningOptions>): void {
    const allEdges = this.graph.getNodeEdges(hubNodeId, 'both');
    const nodes = [hubNodeId];
    const edges = [];

    // Add connected nodes up to pattern size limit
    const limitedEdges = allEdges.slice(0, options.maxPatternSize - 1);
    
    for (const edge of limitedEdges) {
      const connectedNode = edge.from === hubNodeId ? edge.to : edge.from;
      if (!nodes.includes(connectedNode)) {
        nodes.push(connectedNode);
        edges.push({
          from: edge.from,
          to: edge.to,
          type: edge.type,
        });
      }
    }

    const support = this.calculateSupport(nodes);
    const confidence = this.calculateConfidence(edges);

    const pattern: GraphPattern = {
      id: generateId('hub-pattern'),
      type: 'hub',
      description: `Hub pattern with node ${hubNodeId} having ${allEdges.length} connections`,
      nodes,
      edges,
      frequency: 1,
      confidence,
      support,
      contexts: [],
      lastSeen: new Date(),
    };

    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Calculate support metric for a pattern (relative frequency)
   */
  private calculateSupport(nodes: string[]): number {
    const totalNodes = this.graph.getAllNodes().length;
    return totalNodes > 0 ? nodes.length / totalNodes : 0;
  }

  /**
   * Calculate confidence metric for pattern edges
   */
  private calculateConfidence(edges: Array<{ from: string; to: string; type: string }>): number {
    if (edges.length === 0) return 0;

    let totalConfidence = 0;
    
    for (const edge of edges) {
      // Calculate confidence based on edge strength or default to 0.7
      const edgeData = this.graph.getNodeEdges(edge.from, 'out')
        .find(e => e.to === edge.to && e.type === edge.type);
      
      const edgeConfidence = edgeData?.strength ?? 0.7;
      totalConfidence += edgeConfidence;
    }

    return totalConfidence / edges.length;
  }

  /**
   * Calculate additional metrics for patterns
   */
  private calculatePatternMetrics(pattern: GraphPattern): void {
    // Calculate lift metric (how much more likely pattern occurs than random)
    const expectedFrequency = pattern.support * pattern.confidence;
    pattern.lift = expectedFrequency > 0 ? pattern.frequency / expectedFrequency : 1;

    // Calculate conviction metric (confidence without antecedent)
    const notConfidence = 1 - pattern.confidence;
    pattern.conviction = notConfidence > 0 ? (1 - pattern.support) / notConfidence : 1;
  }

  /**
   * Get pattern analysis metrics
   */
  getPatternMetrics(): PatternMetrics {
    const patterns = Array.from(this.patterns.values());
    
    if (patterns.length === 0) {
      return {
        totalPatterns: 0,
        patternTypeDistribution: {},
        avgSupport: 0,
        avgConfidence: 0,
        mostFrequentPatterns: [],
        highestQualityPatterns: [],
        coveragePercentage: 0,
      };
    }

    // Calculate type distribution
    const patternTypeDistribution: Record<string, number> = {};
    for (const pattern of patterns) {
      patternTypeDistribution[pattern.type] = (patternTypeDistribution[pattern.type] ?? 0) + 1;
    }

    // Calculate averages
    const totalSupport = patterns.reduce((sum, p) => sum + p.support, 0);
    const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);

    // Get top patterns
    const mostFrequentPatterns = patterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);

    const highestQualityPatterns = patterns
      .sort((a, b) => (b.confidence * b.support) - (a.confidence * a.support))
      .slice(0, 5);

    // Calculate coverage percentage
    const coveredNodes = new Set<string>();
    for (const pattern of patterns) {
      for (const nodeId of pattern.nodes) {
        coveredNodes.add(nodeId);
      }
    }
    const totalNodes = this.graph.getAllNodes().length;
    const coveragePercentage = totalNodes > 0 ? (coveredNodes.size / totalNodes) * 100 : 0;

    return {
      totalPatterns: patterns.length,
      patternTypeDistribution,
      avgSupport: totalSupport / patterns.length,
      avgConfidence: totalConfidence / patterns.length,
      mostFrequentPatterns,
      highestQualityPatterns,
      coveragePercentage,
    };
  }

  /**
   * Clear all detected patterns
   */
  clearPatterns(): void {
    this.patterns.clear();
  }

  /**
   * Get all detected patterns
   */
  getAllPatterns(): GraphPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: 'star' | 'chain' | 'cycle' | 'tree' | 'bridge' | 'cluster' | 'hub'): GraphPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.type === type);
  }

  /**
   * Update pattern configuration
   */
  updateConfig(config: Partial<GraphPatternMiningConfig>): void {
    this.config = { ...this.config, ...config };
  }
}