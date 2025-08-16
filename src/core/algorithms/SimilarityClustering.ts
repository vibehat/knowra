/**
 * Similarity-Based Clustering Algorithm
 * 
 * Implements hierarchical agglomerative clustering based on content similarity.
 * Supports multiple similarity metrics (Jaccard, Cosine, Dice) and considers
 * node types, content, and metadata for clustering decisions.
 */

import type { 
  Information, 
  KnowledgeCluster,
  SimilarityClusteringOptions 
} from '../types.js';
import { generateId, validateConfidence, contentToString } from '../utils.js';

/**
 * Similarity matrix entry
 */
interface SimilarityEntry {
  nodeA: string;
  nodeB: string;
  similarity: number;
}

/**
 * Cluster during hierarchical clustering process
 */
interface ClusterNode {
  id: string;
  nodes: Set<string>; // Node IDs in this cluster
  centroid?: string; // Representative node
  avgSimilarity: number; // Average internal similarity
}

/**
 * Token-based representation of node content
 */
interface TokenizedContent {
  nodeId: string;
  tokens: Set<string>;
  type: string;
  metadata: Record<string, unknown>;
}

/**
 * Similarity-Based Clustering Implementation
 */
export class SimilarityClustering {
  private options: Required<SimilarityClusteringOptions>;
  private tokenizedNodes: Map<string, TokenizedContent> = new Map();
  private similarityMatrix: Map<string, number> = new Map();

  constructor(options: SimilarityClusteringOptions = {}) {
    this.options = {
      threshold: options.threshold ?? 0.3,
      method: options.method ?? 'jaccard',
      considerType: options.considerType ?? true,
      weights: {
        content: options.weights?.content ?? 0.6,
        type: options.weights?.type ?? 0.3,
        metadata: options.weights?.metadata ?? 0.1,
        ...options.weights,
      },
    };
  }

  /**
   * Cluster nodes based on similarity
   * @param nodes Information nodes to cluster
   * @returns Array of similarity-based clusters
   */
  clusterBySimilarity(nodes: Information[]): KnowledgeCluster[] {
    if (nodes.length === 0) {
      return [];
    }

    if (nodes.length === 1) {
      return [{
        id: generateId('cluster'),
        nodes: [nodes[0].id],
        algorithm: 'similarity' as const,
        coherence: 1.0,
        avgSimilarity: 1.0,
      }];
    }

    // Tokenize all nodes
    this.tokenizeNodes(nodes);
    
    // Calculate similarity matrix
    this.calculateSimilarityMatrix();
    
    // Perform hierarchical clustering
    const clusters = this.performHierarchicalClustering();
    
    return clusters;
  }

  /**
   * Tokenize node content for similarity calculation
   * @param nodes Nodes to tokenize
   */
  private tokenizeNodes(nodes: Information[]): void {
    this.tokenizedNodes.clear();

    for (const node of nodes) {
      const content = contentToString(node.content);
      const tokens = this.extractTokens(content);

      this.tokenizedNodes.set(node.id, {
        nodeId: node.id,
        tokens: new Set(tokens),
        type: node.type,
        metadata: node.metadata ?? {},
      });
    }
  }

  /**
   * Extract tokens from text content
   * @param content Text content to tokenize
   * @returns Array of tokens
   */
  private extractTokens(content: string): string[] {
    // Simple tokenization - in production, would use more sophisticated NLP
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(token => token.length > 2) // Filter short tokens
      .filter(token => !this.isStopWord(token)); // Remove stop words
  }

  /**
   * Check if a token is a common stop word
   * @param token Token to check
   * @returns True if stop word
   */
  private isStopWord(token: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 
      'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 
      'will', 'would', 'could', 'should', 'may', 'might', 'can',
      'a', 'an', 'this', 'that', 'these', 'those', 'i', 'you', 'he',
      'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    ]);
    return stopWords.has(token);
  }

  /**
   * Calculate similarity matrix for all node pairs
   */
  private calculateSimilarityMatrix(): void {
    this.similarityMatrix.clear();
    const nodeIds = Array.from(this.tokenizedNodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const nodeA = nodeIds[i];
        const nodeB = nodeIds[j];
        
        const similarity = this.calculatePairwiseSimilarity(nodeA, nodeB);
        const key = this.getSimilarityKey(nodeA, nodeB);
        
        this.similarityMatrix.set(key, similarity);
      }
    }
  }

  /**
   * Calculate similarity between two nodes
   * @param nodeAId First node ID
   * @param nodeBId Second node ID
   * @returns Weighted similarity score (0-1)
   */
  private calculatePairwiseSimilarity(nodeAId: string, nodeBId: string): number {
    const nodeA = this.tokenizedNodes.get(nodeAId);
    const nodeB = this.tokenizedNodes.get(nodeBId);
    
    if (!nodeA || !nodeB) return 0;

    let totalSimilarity = 0;

    // Content similarity
    const contentSim = this.calculateContentSimilarity(nodeA.tokens, nodeB.tokens);
    totalSimilarity += contentSim * this.options.weights.content;

    // Type similarity
    const typeSim = this.options.considerType ? 
      (nodeA.type === nodeB.type ? 1.0 : 0.0) : 0.0;
    totalSimilarity += typeSim * this.options.weights.type;

    // Metadata similarity (simplified)
    const metadataSim = this.calculateMetadataSimilarity(nodeA.metadata, nodeB.metadata);
    totalSimilarity += metadataSim * this.options.weights.metadata;

    return validateConfidence(totalSimilarity);
  }

  /**
   * Calculate content similarity using specified method
   * @param tokensA Tokens from first node
   * @param tokensB Tokens from second node
   * @returns Content similarity score (0-1)
   */
  private calculateContentSimilarity(tokensA: Set<string>, tokensB: Set<string>): number {
    if (tokensA.size === 0 && tokensB.size === 0) return 1.0;
    if (tokensA.size === 0 || tokensB.size === 0) return 0.0;

    switch (this.options.method) {
      case 'jaccard':
        return this.calculateJaccardSimilarity(tokensA, tokensB);
      case 'cosine':
        return this.calculateCosineSimilarity(tokensA, tokensB);
      case 'dice':
        return this.calculateDiceSimilarity(tokensA, tokensB);
      default:
        return this.calculateJaccardSimilarity(tokensA, tokensB);
    }
  }

  /**
   * Calculate Jaccard similarity coefficient
   * @param setA First token set
   * @param setB Second token set
   * @returns Jaccard similarity (0-1)
   */
  private calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate Cosine similarity (simplified for binary features)
   * @param setA First token set
   * @param setB Second token set
   * @returns Cosine similarity (0-1)
   */
  private calculateCosineSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const denominator = Math.sqrt(setA.size * setB.size);
    
    return denominator === 0 ? 0 : intersection.size / denominator;
  }

  /**
   * Calculate Dice similarity coefficient
   * @param setA First token set
   * @param setB Second token set
   * @returns Dice similarity (0-1)
   */
  private calculateDiceSimilarity(setA: Set<string>, setB: Set<string>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const denominator = setA.size + setB.size;
    
    return denominator === 0 ? 0 : (2 * intersection.size) / denominator;
  }

  /**
   * Calculate metadata similarity (simplified)
   * @param metaA First node metadata
   * @param metaB Second node metadata
   * @returns Metadata similarity (0-1)
   */
  private calculateMetadataSimilarity(
    metaA: Record<string, unknown>, 
    metaB: Record<string, unknown>
  ): number {
    const keysA = new Set(Object.keys(metaA));
    const keysB = new Set(Object.keys(metaB));
    const allKeys = new Set([...keysA, ...keysB]);
    
    if (allKeys.size === 0) return 1.0;

    let matches = 0;
    for (const key of allKeys) {
      if (metaA[key] === metaB[key]) {
        matches++;
      }
    }

    return matches / allKeys.size;
  }

  /**
   * Perform hierarchical agglomerative clustering
   * @returns Array of final clusters
   */
  private performHierarchicalClustering(): KnowledgeCluster[] {
    // Initialize: each node is its own cluster
    const clusters: Map<string, ClusterNode> = new Map();
    
    for (const [nodeId] of this.tokenizedNodes) {
      clusters.set(nodeId, {
        id: nodeId,
        nodes: new Set([nodeId]),
        centroid: nodeId,
        avgSimilarity: 1.0,
      });
    }

    // Keep merging until no more merges possible above threshold
    let merged = true;
    while (merged && clusters.size > 1) {
      merged = false;
      
      const bestMerge = this.findBestMerge(clusters);
      if (bestMerge && bestMerge.similarity >= this.options.threshold) {
        this.mergeClusters(clusters, bestMerge.clusterA, bestMerge.clusterB);
        merged = true;
      }
    }

    // Convert to KnowledgeCluster format
    return this.convertToKnowledgeClusters(clusters);
  }

  /**
   * Find the best pair of clusters to merge
   * @param clusters Current clusters
   * @returns Best merge candidate or null
   */
  private findBestMerge(clusters: Map<string, ClusterNode>): {
    clusterA: string;
    clusterB: string;
    similarity: number;
  } | null {
    let bestSimilarity = 0;
    let bestMerge: { clusterA: string; clusterB: string; similarity: number } | null = null;

    const clusterIds = Array.from(clusters.keys());
    
    for (let i = 0; i < clusterIds.length; i++) {
      for (let j = i + 1; j < clusterIds.length; j++) {
        const clusterA = clusterIds[i];
        const clusterB = clusterIds[j];
        
        const similarity = this.calculateClusterSimilarity(
          clusters.get(clusterA)!,
          clusters.get(clusterB)!
        );

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMerge = { clusterA, clusterB, similarity };
        }
      }
    }

    return bestMerge;
  }

  /**
   * Calculate average similarity between two clusters
   * @param clusterA First cluster
   * @param clusterB Second cluster
   * @returns Average inter-cluster similarity
   */
  private calculateClusterSimilarity(clusterA: ClusterNode, clusterB: ClusterNode): number {
    let totalSimilarity = 0;
    let count = 0;

    for (const nodeA of clusterA.nodes) {
      for (const nodeB of clusterB.nodes) {
        const key = this.getSimilarityKey(nodeA, nodeB);
        const similarity = this.similarityMatrix.get(key) ?? 0;
        totalSimilarity += similarity;
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Merge two clusters into one
   * @param clusters Map of all clusters
   * @param clusterAId First cluster ID
   * @param clusterBId Second cluster ID
   */
  private mergeClusters(
    clusters: Map<string, ClusterNode>, 
    clusterAId: string, 
    clusterBId: string
  ): void {
    const clusterA = clusters.get(clusterAId);
    const clusterB = clusters.get(clusterBId);
    
    if (!clusterA || !clusterB) return;

    // Create merged cluster
    const mergedNodes = new Set([...clusterA.nodes, ...clusterB.nodes]);
    const avgSimilarity = this.calculateInternalSimilarity(mergedNodes);
    
    const mergedCluster: ClusterNode = {
      id: generateId('merged'),
      nodes: mergedNodes,
      centroid: this.findCentroid(mergedNodes),
      avgSimilarity,
    };

    // Remove old clusters and add merged cluster
    clusters.delete(clusterAId);
    clusters.delete(clusterBId);
    clusters.set(mergedCluster.id, mergedCluster);
  }

  /**
   * Calculate average internal similarity for a set of nodes
   * @param nodeIds Set of node IDs
   * @returns Average internal similarity
   */
  private calculateInternalSimilarity(nodeIds: Set<string>): number {
    if (nodeIds.size <= 1) return 1.0;

    const nodeArray = Array.from(nodeIds);
    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const key = this.getSimilarityKey(nodeArray[i], nodeArray[j]);
        const similarity = this.similarityMatrix.get(key) ?? 0;
        totalSimilarity += similarity;
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Find the centroid (most representative) node in a cluster
   * @param nodeIds Set of node IDs in cluster
   * @returns ID of centroid node
   */
  private findCentroid(nodeIds: Set<string>): string {
    if (nodeIds.size === 1) return Array.from(nodeIds)[0];

    const nodeArray = Array.from(nodeIds);
    let bestCentroid = nodeArray[0];
    let bestAvgSimilarity = 0;

    for (const candidateNode of nodeArray) {
      let totalSimilarity = 0;
      let count = 0;

      for (const otherNode of nodeArray) {
        if (candidateNode !== otherNode) {
          const key = this.getSimilarityKey(candidateNode, otherNode);
          const similarity = this.similarityMatrix.get(key) ?? 0;
          totalSimilarity += similarity;
          count++;
        }
      }

      const avgSimilarity = count > 0 ? totalSimilarity / count : 0;
      if (avgSimilarity > bestAvgSimilarity) {
        bestAvgSimilarity = avgSimilarity;
        bestCentroid = candidateNode;
      }
    }

    return bestCentroid;
  }

  /**
   * Convert internal clusters to KnowledgeCluster format
   * @param clusters Map of internal clusters
   * @returns Array of KnowledgeCluster objects
   */
  private convertToKnowledgeClusters(clusters: Map<string, ClusterNode>): KnowledgeCluster[] {
    const result: KnowledgeCluster[] = [];

    for (const cluster of clusters.values()) {
      result.push({
        id: generateId('cluster'),
        nodes: Array.from(cluster.nodes),
        centroid: cluster.centroid,
        algorithm: 'similarity' as const,
        coherence: validateConfidence(cluster.avgSimilarity),
        avgSimilarity: validateConfidence(cluster.avgSimilarity),
      });
    }

    return result;
  }

  /**
   * Get consistent similarity matrix key for node pair
   * @param nodeA First node ID
   * @param nodeB Second node ID
   * @returns Similarity matrix key
   */
  private getSimilarityKey(nodeA: string, nodeB: string): string {
    return nodeA < nodeB ? `${nodeA}:${nodeB}` : `${nodeB}:${nodeA}`;
  }
}