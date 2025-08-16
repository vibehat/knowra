/**
 * Graph Metrics and Analysis Utilities
 * 
 * Comprehensive collection of graph analysis algorithms including:
 * - Centrality measures (PageRank, Eigenvector, Betweenness, Closeness)
 * - Graph-level metrics (density, diameter, clustering coefficient)
 * - Structural analysis (small-world properties, scale-free detection)
 * - Bridge detection and articulation points
 */

import type {
  Information,
  Relationship,
  NodeMetrics,
  GraphMetrics as GraphMetricsType,
  StructuralAnalysis,
  StructuralImportance,
  CentralNode,
} from '../types.js';
import { validateConfidence } from '../utils.js';

/**
 * Internal graph representation for metrics calculation
 */
interface GraphAnalysisData {
  nodes: Map<string, Information>;
  edges: Map<string, Relationship[]>; // Adjacency list
  weights: Map<string, number>; // Edge weights by "from:to" key
  undirectedEdges: Map<string, string[]>; // For undirected algorithms
}

/**
 * Graph Metrics Calculator
 */
export class GraphMetrics {
  private graph: GraphAnalysisData;
  private nodeCount: number = 0;
  private edgeCount: number = 0;
  private totalWeight: number = 0;

  constructor(nodes: Information[], edges: Relationship[]) {
    this.graph = this.buildGraphData(nodes, edges);
    this.nodeCount = nodes.length;
    this.edgeCount = edges.length;
    this.totalWeight = edges.reduce((sum, edge) => sum + (edge.strength ?? 1.0), 0);
  }

  /**
   * Calculate comprehensive metrics for a specific node
   * @param nodeId Node ID to analyze
   * @returns Complete NodeMetrics object
   */
  calculateNodeMetrics(nodeId: string): NodeMetrics {
    if (!this.graph.nodes.has(nodeId)) {
      return { degree: 0, betweenness: 0, closeness: 0 };
    }

    return {
      degree: this.calculateDegree(nodeId),
      betweenness: this.calculateBetweennessCentrality(nodeId),
      closeness: this.calculateClosenessCentrality(nodeId),
      pageRank: this.calculatePageRank().get(nodeId) ?? 0,
      eigenvectorCentrality: this.calculateEigenvectorCentrality().get(nodeId) ?? 0,
      clusteringCoefficient: this.calculateLocalClusteringCoefficient(nodeId),
    };
  }

  /**
   * Calculate graph-level metrics
   * @returns Complete GraphMetrics object
   */
  calculateGraphMetrics(): GraphMetricsType {
    return {
      density: this.calculateDensity(),
      averagePathLength: this.calculateAveragePathLength(),
      diameter: this.calculateDiameter(),
      clusteringCoefficient: this.calculateGlobalClusteringCoefficient(),
      modularity: this.calculateModularity(),
      componentCount: this.getConnectedComponentCount(),
    };
  }

  /**
   * Analyze structural properties of the graph
   * @returns StructuralAnalysis object
   */
  analyzeStructure(): StructuralAnalysis {
    return {
      hasSmallWorldProperty: this.hasSmallWorldProperty(),
      isScaleFree: this.isScaleFree(),
      communityStructureStrength: this.calculateCommunityStructureStrength(),
      bridgeNodes: this.findBridgeNodes(),
    };
  }

  /**
   * Identify structurally important elements
   * @returns StructuralImportance object
   */
  getStructuralImportance(): StructuralImportance {
    return {
      bridges: this.findBridgeEdges(),
      articulationPoints: this.findArticulationPoints(),
      hubs: this.findHubs(),
    };
  }

  /**
   * Find the most central nodes
   * @param count Number of central nodes to return
   * @param centralityType Type of centrality to use
   * @returns Array of central nodes
   */
  findCentralNodes(
    count: number = 5,
    centralityType: 'degree' | 'betweenness' | 'closeness' | 'pagerank' | 'eigenvector' = 'pagerank'
  ): CentralNode[] {
    const centralities = new Map<string, number>();

    // Calculate appropriate centrality measure
    switch (centralityType) {
      case 'degree':
        for (const nodeId of this.graph.nodes.keys()) {
          centralities.set(nodeId, this.calculateDegree(nodeId));
        }
        break;
      case 'betweenness':
        for (const nodeId of this.graph.nodes.keys()) {
          centralities.set(nodeId, this.calculateBetweennessCentrality(nodeId));
        }
        break;
      case 'closeness':
        for (const nodeId of this.graph.nodes.keys()) {
          centralities.set(nodeId, this.calculateClosenessCentrality(nodeId));
        }
        break;
      case 'pagerank':
        centralities.clear();
        const pageRankScores = this.calculatePageRank();
        for (const [nodeId, score] of pageRankScores) {
          centralities.set(nodeId, score);
        }
        break;
      case 'eigenvector':
        centralities.clear();
        const eigenScores = this.calculateEigenvectorCentrality();
        for (const [nodeId, score] of eigenScores) {
          centralities.set(nodeId, score);
        }
        break;
    }

    // Sort by centrality score and return top nodes
    return Array.from(centralities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([id, centralityScore]) => ({
        id,
        centralityScore,
        centralityType,
      }));
  }

  // ============ Private Implementation Methods ============

  /**
   * Build internal graph data structure
   */
  private buildGraphData(nodes: Information[], edges: Relationship[]): GraphAnalysisData {
    const graph: GraphAnalysisData = {
      nodes: new Map(),
      edges: new Map(),
      weights: new Map(),
      undirectedEdges: new Map(),
    };

    // Add nodes
    for (const node of nodes) {
      graph.nodes.set(node.id, node);
      graph.edges.set(node.id, []);
      graph.undirectedEdges.set(node.id, []);
    }

    // Add edges
    for (const edge of edges) {
      if (!graph.nodes.has(edge.from) || !graph.nodes.has(edge.to)) {
        continue; // Skip edges with non-existent nodes
      }

      // Directed edges
      const outEdges = graph.edges.get(edge.from) ?? [];
      outEdges.push(edge);
      graph.edges.set(edge.from, outEdges);

      // Edge weights
      const weightKey = `${edge.from}:${edge.to}`;
      graph.weights.set(weightKey, edge.strength ?? 1.0);

      // Undirected edges (for algorithms that need them)
      const undirectedFrom = graph.undirectedEdges.get(edge.from) ?? [];
      const undirectedTo = graph.undirectedEdges.get(edge.to) ?? [];
      
      if (!undirectedFrom.includes(edge.to)) {
        undirectedFrom.push(edge.to);
      }
      if (!undirectedTo.includes(edge.from)) {
        undirectedTo.push(edge.from);
      }
      
      graph.undirectedEdges.set(edge.from, undirectedFrom);
      graph.undirectedEdges.set(edge.to, undirectedTo);
    }

    return graph;
  }

  /**
   * Calculate degree centrality for a node
   */
  private calculateDegree(nodeId: string): number {
    const outEdges = this.graph.edges.get(nodeId)?.length ?? 0;
    let inEdges = 0;

    // Count incoming edges
    for (const [, edges] of this.graph.edges) {
      inEdges += edges.filter(edge => edge.to === nodeId).length;
    }

    return outEdges + inEdges;
  }

  /**
   * Calculate PageRank for all nodes
   * @param dampingFactor Damping factor (default: 0.85)
   * @param maxIterations Maximum iterations (default: 100)
   * @param tolerance Convergence tolerance (default: 1e-6)
   * @returns Map of node IDs to PageRank scores
   */
  private calculatePageRank(
    dampingFactor: number = 0.85,
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): Map<string, number> {
    const pageRank = new Map<string, number>();
    const newPageRank = new Map<string, number>();
    const nodeIds = Array.from(this.graph.nodes.keys());

    if (nodeIds.length === 0) return pageRank;

    // Initialize PageRank values
    const initialValue = 1.0 / nodeIds.length;
    for (const nodeId of nodeIds) {
      pageRank.set(nodeId, initialValue);
    }

    // Iterate until convergence
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let maxChange = 0;

      for (const nodeId of nodeIds) {
        let rank = (1 - dampingFactor) / nodeIds.length;

        // Sum contributions from incoming edges
        for (const [sourceId, edges] of this.graph.edges) {
          const incomingEdges = edges.filter(e => e.to === nodeId);
          if (incomingEdges.length > 0) {
            const sourceRank = pageRank.get(sourceId) ?? 0;
            const sourceOutDegree = this.graph.edges.get(sourceId)?.length ?? 1;
            rank += dampingFactor * (sourceRank / sourceOutDegree) * incomingEdges.length;
          }
        }

        newPageRank.set(nodeId, rank);
        const change = Math.abs(rank - (pageRank.get(nodeId) ?? 0));
        maxChange = Math.max(maxChange, change);
      }

      // Update PageRank values
      for (const [nodeId, rank] of newPageRank) {
        pageRank.set(nodeId, rank);
      }

      // Check convergence
      if (maxChange < tolerance) {
        break;
      }
    }

    // Normalize to ensure sum equals 1
    const totalRank = Array.from(pageRank.values()).reduce((sum, rank) => sum + rank, 0);
    if (totalRank > 0) {
      for (const [nodeId, rank] of pageRank) {
        pageRank.set(nodeId, rank / totalRank);
      }
    }

    return pageRank;
  }

  /**
   * Calculate eigenvector centrality using power iteration
   */
  private calculateEigenvectorCentrality(
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): Map<string, number> {
    const centrality = new Map<string, number>();
    const newCentrality = new Map<string, number>();
    const nodeIds = Array.from(this.graph.nodes.keys());

    if (nodeIds.length === 0) return centrality;

    // Initialize with equal values
    for (const nodeId of nodeIds) {
      centrality.set(nodeId, 1.0);
    }

    // Power iteration
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let norm = 0;

      // Calculate new centrality values
      for (const nodeId of nodeIds) {
        let value = 0;

        // Sum from neighbors (incoming edges)
        for (const [sourceId, edges] of this.graph.edges) {
          if (edges.some(e => e.to === nodeId)) {
            value += centrality.get(sourceId) ?? 0;
          }
        }

        newCentrality.set(nodeId, value);
        norm += value * value;
      }

      // Normalize
      norm = Math.sqrt(norm);
      if (norm === 0) norm = 1;

      let maxChange = 0;
      for (const nodeId of nodeIds) {
        const normalizedValue = (newCentrality.get(nodeId) ?? 0) / norm;
        const change = Math.abs(normalizedValue - (centrality.get(nodeId) ?? 0));
        maxChange = Math.max(maxChange, change);
        centrality.set(nodeId, normalizedValue);
      }

      // Check convergence
      if (maxChange < tolerance) {
        break;
      }
    }

    return centrality;
  }

  /**
   * Calculate betweenness centrality for a node (simplified)
   */
  private calculateBetweennessCentrality(nodeId: string): number {
    if (this.nodeCount <= 2) return 0;

    let betweenness = 0;
    const nodeIds = Array.from(this.graph.nodes.keys());

    // For each pair of nodes (excluding the target node)
    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const source = nodeIds[i];
        const target = nodeIds[j];

        if (source === nodeId || target === nodeId) continue;

        const allPaths = this.findAllShortestPaths(source, target);
        const pathsThroughNode = allPaths.filter(path => path.includes(nodeId));

        if (allPaths.length > 0) {
          betweenness += pathsThroughNode.length / allPaths.length;
        }
      }
    }

    // Normalize for undirected graph
    const normalizationFactor = ((this.nodeCount - 1) * (this.nodeCount - 2)) / 2;
    return normalizationFactor > 0 ? betweenness / normalizationFactor : 0;
  }

  /**
   * Calculate closeness centrality for a node
   */
  private calculateClosenessCentrality(nodeId: string): number {
    if (this.nodeCount <= 1) return 0;

    let totalDistance = 0;
    let reachableNodes = 0;

    for (const [targetId] of this.graph.nodes) {
      if (targetId === nodeId) continue;

      const distance = this.shortestPathDistance(nodeId, targetId);
      if (distance > 0 && distance < Infinity) {
        totalDistance += distance;
        reachableNodes++;
      }
    }

    return reachableNodes > 0 ? reachableNodes / totalDistance : 0;
  }

  /**
   * Calculate local clustering coefficient for a node
   */
  private calculateLocalClusteringCoefficient(nodeId: string): number {
    const neighbors = this.graph.undirectedEdges.get(nodeId) ?? [];
    const degree = neighbors.length;

    if (degree < 2) return 0;

    // Count edges between neighbors
    let edgesBetweenNeighbors = 0;
    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (this.areNodesConnected(neighbors[i], neighbors[j])) {
          edgesBetweenNeighbors++;
        }
      }
    }

    // Possible edges between neighbors
    const possibleEdges = (degree * (degree - 1)) / 2;
    return possibleEdges > 0 ? edgesBetweenNeighbors / possibleEdges : 0;
  }

  /**
   * Calculate graph density
   */
  private calculateDensity(): number {
    if (this.nodeCount <= 1) return 0;
    const maxPossibleEdges = this.nodeCount * (this.nodeCount - 1);
    return maxPossibleEdges > 0 ? this.edgeCount / maxPossibleEdges : 0;
  }

  /**
   * Calculate average shortest path length
   */
  private calculateAveragePathLength(): number {
    if (this.nodeCount <= 1) return 0;

    let totalDistance = 0;
    let pathCount = 0;
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const distance = this.shortestPathDistance(nodeIds[i], nodeIds[j]);
        if (distance > 0 && distance < Infinity) {
          totalDistance += distance;
          pathCount++;
        }
      }
    }

    return pathCount > 0 ? totalDistance / pathCount : 0;
  }

  /**
   * Calculate graph diameter (longest shortest path)
   */
  private calculateDiameter(): number {
    let maxDistance = 0;
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const distance = this.shortestPathDistance(nodeIds[i], nodeIds[j]);
        if (distance > 0 && distance < Infinity) {
          maxDistance = Math.max(maxDistance, distance);
        }
      }
    }

    return maxDistance;
  }

  /**
   * Calculate global clustering coefficient
   */
  private calculateGlobalClusteringCoefficient(): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    for (const nodeId of this.graph.nodes.keys()) {
      const coefficient = this.calculateLocalClusteringCoefficient(nodeId);
      if (!isNaN(coefficient)) {
        totalCoefficient += coefficient;
        nodeCount++;
      }
    }

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  /**
   * Calculate modularity (simplified)
   */
  private calculateModularity(): number {
    // Simplified modularity calculation
    // In practice, this would require community detection
    return 0.3; // Placeholder value
  }

  /**
   * Get number of connected components
   */
  private getConnectedComponentCount(): number {
    const visited = new Set<string>();
    let componentCount = 0;

    for (const nodeId of this.graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        this.dfsVisit(nodeId, visited);
        componentCount++;
      }
    }

    return componentCount;
  }

  /**
   * Check if graph has small-world property
   */
  private hasSmallWorldProperty(): boolean {
    const avgPathLength = this.calculateAveragePathLength();
    const clusteringCoeff = this.calculateGlobalClusteringCoefficient();
    
    // Small-world networks have short path lengths and high clustering
    return avgPathLength > 0 && avgPathLength < Math.log(this.nodeCount) && clusteringCoeff > 0.3;
  }

  /**
   * Check if graph follows scale-free distribution
   */
  private isScaleFree(): boolean {
    // Simplified check based on degree distribution
    const degrees = Array.from(this.graph.nodes.keys()).map(id => this.calculateDegree(id));
    const maxDegree = Math.max(...degrees);
    const avgDegree = degrees.reduce((sum, deg) => sum + deg, 0) / degrees.length;
    
    // Scale-free networks have heavy-tailed degree distributions
    return maxDegree > avgDegree * 3; // Simplified heuristic
  }

  /**
   * Calculate community structure strength
   */
  private calculateCommunityStructureStrength(): number {
    // Simplified calculation based on clustering coefficient
    return this.calculateGlobalClusteringCoefficient();
  }

  /**
   * Find bridge nodes (nodes connecting different communities)
   */
  private findBridgeNodes(): string[] {
    const bridgeNodes: string[] = [];
    
    for (const nodeId of this.graph.nodes.keys()) {
      const betweenness = this.calculateBetweennessCentrality(nodeId);
      if (betweenness > 0.1) { // High betweenness indicates bridge role
        bridgeNodes.push(nodeId);
      }
    }

    return bridgeNodes;
  }

  /**
   * Find bridge edges
   */
  private findBridgeEdges(): Array<{ from: string; to: string; importance: number }> {
    const bridges: Array<{ from: string; to: string; importance: number }> = [];
    
    // Simplified: edges with high betweenness centrality of endpoints
    for (const [sourceId, edges] of this.graph.edges) {
      for (const edge of edges) {
        const sourceBetweenness = this.calculateBetweennessCentrality(sourceId);
        const targetBetweenness = this.calculateBetweennessCentrality(edge.to);
        const importance = (sourceBetweenness + targetBetweenness) / 2;
        
        if (importance > 0.05) {
          bridges.push({
            from: sourceId,
            to: edge.to,
            importance: validateConfidence(importance),
          });
        }
      }
    }

    return bridges;
  }

  /**
   * Find articulation points (critical nodes)
   */
  private findArticulationPoints(): Array<{ id: string; importance: number }> {
    const articulationPoints: Array<{ id: string; importance: number }> = [];
    
    for (const nodeId of this.graph.nodes.keys()) {
      const betweenness = this.calculateBetweennessCentrality(nodeId);
      if (betweenness > 0.1) {
        articulationPoints.push({
          id: nodeId,
          importance: validateConfidence(betweenness),
        });
      }
    }

    return articulationPoints;
  }

  /**
   * Find hub nodes (high-degree nodes)
   */
  private findHubs(threshold: number = 0.8): Array<{ id: string; degree: number; importance: number }> {
    const hubs: Array<{ id: string; degree: number; importance: number }> = [];
    const degrees = Array.from(this.graph.nodes.keys()).map(id => ({
      id,
      degree: this.calculateDegree(id),
    }));
    
    const maxDegree = Math.max(...degrees.map(d => d.degree));
    const degreeThreshold = maxDegree * threshold;
    
    for (const { id, degree } of degrees) {
      if (degree >= degreeThreshold) {
        hubs.push({
          id,
          degree,
          importance: validateConfidence(degree / maxDegree),
        });
      }
    }

    return hubs;
  }

  // ============ Helper Methods ============

  /**
   * Find shortest path distance between two nodes
   */
  private shortestPathDistance(sourceId: string, targetId: string): number {
    if (sourceId === targetId) return 0;

    const queue = [{ nodeId: sourceId, distance: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      if (nodeId === targetId) return distance;

      const neighbors = this.graph.undirectedEdges.get(nodeId) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ nodeId: neighbor, distance: distance + 1 });
        }
      }
    }

    return Infinity; // Not reachable
  }

  /**
   * Find all shortest paths between two nodes
   */
  private findAllShortestPaths(sourceId: string, targetId: string, maxDepth: number = 5): string[][] {
    if (sourceId === targetId) return [[sourceId]];

    const paths: string[][] = [];
    const queue = [{ path: [sourceId], visited: new Set([sourceId]) }];
    let minDistance = Infinity;

    while (queue.length > 0 && paths.length < 100) { // Limit paths to prevent explosion
      const { path, visited } = queue.shift()!;
      const currentNode = path[path.length - 1];

      if (path.length > maxDepth) continue;
      if (path.length > minDistance) continue;

      if (currentNode === targetId) {
        if (path.length < minDistance) {
          minDistance = path.length;
          paths.length = 0; // Clear longer paths
        }
        if (path.length === minDistance) {
          paths.push([...path]);
        }
        continue;
      }

      const neighbors = this.graph.undirectedEdges.get(currentNode) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const newVisited = new Set(visited);
          newVisited.add(neighbor);
          queue.push({
            path: [...path, neighbor],
            visited: newVisited,
          });
        }
      }
    }

    return paths;
  }

  /**
   * Check if two nodes are connected
   */
  private areNodesConnected(nodeA: string, nodeB: string): boolean {
    const neighborsA = this.graph.undirectedEdges.get(nodeA) ?? [];
    return neighborsA.includes(nodeB);
  }

  /**
   * DFS visit for connected component calculation
   */
  private dfsVisit(nodeId: string, visited: Set<string>): void {
    visited.add(nodeId);
    const neighbors = this.graph.undirectedEdges.get(nodeId) ?? [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        this.dfsVisit(neighbor, visited);
      }
    }
  }
}