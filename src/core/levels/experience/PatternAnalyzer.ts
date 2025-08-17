/**
 * PatternAnalyzer - Pattern-based knowledge discovery and recommendations
 * 
 * Provides intelligent analysis of patterns to improve knowledge organization
 * and make recommendations based on detected patterns.
 */

import type { 
  Pattern, 
  GraphPattern, 
  Information, 
  Relationship,
  PatternMetrics 
} from '../../types.js';
import { generateId } from '../../utils.js';
import type { GraphFoundation } from '../../GraphFoundation.js';

export interface PatternAnalyzerConfig {
  minPatternSupport?: number;
  minRecommendationConfidence?: number;
  maxRecommendations?: number;
  enableAdaptiveLearning?: boolean;
  learningRate?: number;
}

export interface PatternRecommendation {
  id: string;
  type: 'connection' | 'organization' | 'navigation' | 'completion';
  description: string;
  confidence: number;
  sourcePatterns: string[]; // Pattern IDs that support this recommendation
  suggestedAction: {
    type: 'add_edge' | 'create_cluster' | 'suggest_path' | 'recommend_nodes';
    data: any;
  };
  metadata?: Record<string, unknown>;
}

export interface KnowledgeOrganizationSuggestion {
  id: string;
  type: 'cluster_formation' | 'hierarchy_improvement' | 'redundancy_reduction' | 'gap_identification';
  description: string;
  affectedNodes: string[];
  confidence: number;
  expectedBenefit: 'low' | 'medium' | 'high';
  implementationCost: 'low' | 'medium' | 'high';
}

export interface AdaptiveLearningMetrics {
  totalPatterns: number;
  patternQualityScore: number; // Overall quality of patterns (0-1)
  recommendationAccuracy: number; // How often recommendations are helpful (0-1)
  organizationEfficiency: number; // How well knowledge is organized (0-1)
  adaptationRate: number; // How quickly the system learns (0-1)
}

export class PatternAnalyzer {
  private config: Required<PatternAnalyzerConfig>;
  private recommendations = new Map<string, PatternRecommendation>();
  private organizationSuggestions = new Map<string, KnowledgeOrganizationSuggestion>();
  private learningMetrics: AdaptiveLearningMetrics;
  private feedbackHistory = new Map<string, { positive: number; negative: number; neutral: number }>();

  constructor(config: PatternAnalyzerConfig = {}) {
    this.config = {
      minPatternSupport: 0.1,
      minRecommendationConfidence: 0.3,
      maxRecommendations: 10,
      enableAdaptiveLearning: true,
      learningRate: 0.1,
      ...config,
    };

    this.learningMetrics = {
      totalPatterns: 0,
      patternQualityScore: 0.5,
      recommendationAccuracy: 0.5,
      organizationEfficiency: 0.5,
      adaptationRate: 0.1,
    };
  }

  /**
   * Analyze patterns and generate recommendations
   */
  analyzePatterns(
    sequentialPatterns: Pattern[], 
    graphPatterns: GraphPattern[], 
    graph: GraphFoundation
  ): PatternRecommendation[] {
    this.clearRecommendations();
    
    // Update learning metrics
    this.learningMetrics.totalPatterns = sequentialPatterns.length + graphPatterns.length;
    
    // Generate different types of recommendations
    const connectionRecommendations = this.generateConnectionRecommendations(graphPatterns, graph);
    const navigationRecommendations = this.generateNavigationRecommendations(sequentialPatterns, graph);
    const organizationRecommendations = this.generateOrganizationRecommendations(graphPatterns, graph);
    const completionRecommendations = this.generateCompletionRecommendations(graphPatterns, graph);

    const allRecommendations = [
      ...connectionRecommendations,
      ...navigationRecommendations,
      ...organizationRecommendations,
      ...completionRecommendations,
    ];

    // Filter and rank recommendations
    const filteredRecommendations = this.filterAndRankRecommendations(allRecommendations);
    
    // Store recommendations
    for (const rec of filteredRecommendations) {
      this.recommendations.set(rec.id, rec);
    }

    // Update quality score based on recommendations
    this.updatePatternQualityScore(sequentialPatterns, graphPatterns);

    return filteredRecommendations;
  }

  /**
   * Generate connection recommendations based on graph patterns
   */
  private generateConnectionRecommendations(
    graphPatterns: GraphPattern[], 
    graph: GraphFoundation
  ): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    for (const pattern of graphPatterns) {
      if (pattern.confidence < this.config.minRecommendationConfidence) continue;

      switch (pattern.type) {
        case 'star':
          recommendations.push(...this.generateStarBasedConnections(pattern, graph));
          break;
        case 'bridge':
          recommendations.push(...this.generateBridgeBasedConnections(pattern, graph));
          break;
        case 'cluster':
          recommendations.push(...this.generateClusterBasedConnections(pattern, graph));
          break;
      }
    }

    return recommendations;
  }

  /**
   * Generate connections based on star patterns
   */
  private generateStarBasedConnections(pattern: GraphPattern, graph: GraphFoundation): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];
    const hubNode = this.identifyHubInStarPattern(pattern, graph);
    
    if (!hubNode) return recommendations;

    // Find similar nodes that could be connected to the hub
    const allNodes = graph.getAllNodes();
    const connectedNodes = new Set(pattern.nodes);
    
    for (const node of allNodes) {
      if (connectedNodes.has(node.id)) continue;
      
      // Check if this node is similar to connected nodes
      const similarity = this.calculateNodeSimilarityToPattern(node, pattern, graph);
      
      if (similarity > 0.6) {
        recommendations.push({
          id: generateId('connection-rec'),
          type: 'connection',
          description: `Connect '${node.id}' to hub '${hubNode}' based on star pattern similarity`,
          confidence: similarity * pattern.confidence,
          sourcePatterns: [pattern.id],
          suggestedAction: {
            type: 'add_edge',
            data: {
              from: hubNode,
              to: node.id,
              type: 'star_extension',
              strength: similarity,
            },
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate connections based on bridge patterns
   */
  private generateBridgeBasedConnections(pattern: GraphPattern, graph: GraphFoundation): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];
    
    // Find nodes that could benefit from bridge connections
    const bridgeNode = this.identifyBridgeInPattern(pattern);
    if (!bridgeNode) return recommendations;

    // Look for isolated clusters that could be connected through this bridge
    const allNodes = graph.getAllNodes();
    const potentialConnections = this.findPotentialBridgeConnections(bridgeNode, allNodes, graph);

    for (const connection of potentialConnections) {
      recommendations.push({
        id: generateId('bridge-rec'),
        type: 'connection',
        description: `Create bridge connection between '${connection.from}' and '${connection.to}'`,
        confidence: pattern.confidence * 0.8,
        sourcePatterns: [pattern.id],
        suggestedAction: {
          type: 'add_edge',
          data: connection,
        },
      });
    }

    return recommendations;
  }

  /**
   * Generate connections based on cluster patterns
   */
  private generateClusterBasedConnections(pattern: GraphPattern, graph: GraphFoundation): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    // Find nodes that could be added to the cluster
    const allNodes = graph.getAllNodes();
    const clusterNodes = new Set(pattern.nodes);

    for (const node of allNodes) {
      if (clusterNodes.has(node.id)) continue;

      // Check if node is similar to cluster members
      const clusterSimilarity = this.calculateNodeSimilarityToCluster(node, pattern, graph);
      
      if (clusterSimilarity > 0.7) {
        recommendations.push({
          id: generateId('cluster-rec'),
          type: 'connection',
          description: `Add '${node.id}' to cluster based on similarity`,
          confidence: clusterSimilarity * pattern.confidence,
          sourcePatterns: [pattern.id],
          suggestedAction: {
            type: 'add_edge',
            data: {
              targetNode: node.id,
              clusterNodes: pattern.nodes,
              edgeType: 'cluster_member',
            },
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate navigation recommendations based on sequential patterns
   */
  private generateNavigationRecommendations(
    sequentialPatterns: Pattern[], 
    graph: GraphFoundation
  ): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    for (const pattern of sequentialPatterns) {
      if (pattern.successRate < 0.6) continue; // Only recommend successful patterns

      // Suggest optimal paths based on successful patterns
      recommendations.push({
        id: generateId('nav-rec'),
        type: 'navigation',
        description: `Recommended path: ${pattern.nodes.join(' → ')} (${Math.round(pattern.successRate * 100)}% success rate)`,
        confidence: pattern.confidence * pattern.successRate,
        sourcePatterns: [pattern.id],
        suggestedAction: {
          type: 'suggest_path',
          data: {
            path: pattern.nodes,
            expectedTime: pattern.avgTraversalTime,
            successRate: pattern.successRate,
            contexts: pattern.contexts,
          },
        },
      });
    }

    return recommendations;
  }

  /**
   * Generate knowledge organization recommendations
   */
  private generateOrganizationRecommendations(
    graphPatterns: GraphPattern[], 
    graph: GraphFoundation
  ): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    // Analyze patterns for organizational insights
    const hubPatterns = graphPatterns.filter(p => p.type === 'hub' || p.type === 'star');
    const clusterPatterns = graphPatterns.filter(p => p.type === 'cluster');
    
    // Recommend better organization based on hubs
    if (hubPatterns.length > 0) {
      const mainHub = hubPatterns.reduce((max, current) => 
        current.nodes.length > max.nodes.length ? current : max
      );

      recommendations.push({
        id: generateId('org-rec'),
        type: 'organization',
        description: `Use '${mainHub.nodes[0]}' as main organizational hub for better knowledge structure`,
        confidence: mainHub.confidence * 0.9,
        sourcePatterns: [mainHub.id],
        suggestedAction: {
          type: 'create_cluster',
          data: {
            hubNode: mainHub.nodes[0],
            memberNodes: mainHub.nodes.slice(1),
            organizationType: 'hub_based',
          },
        },
      });
    }

    // Recommend cluster consolidation
    if (clusterPatterns.length > 1) {
      const overlappingClusters = this.findOverlappingClusters(clusterPatterns);
      
      for (const overlap of overlappingClusters) {
        recommendations.push({
          id: generateId('consolidation-rec'),
          type: 'organization',
          description: `Consolidate overlapping clusters for better organization`,
          confidence: 0.7,
          sourcePatterns: overlap.patternIds,
          suggestedAction: {
            type: 'create_cluster',
            data: {
              mergedClusters: overlap.clusters,
              consolidationType: 'overlap_based',
            },
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate completion recommendations for incomplete patterns
   */
  private generateCompletionRecommendations(
    graphPatterns: GraphPattern[], 
    graph: GraphFoundation
  ): PatternRecommendation[] {
    const recommendations: PatternRecommendation[] = [];

    for (const pattern of graphPatterns) {
      // Look for incomplete patterns that could be completed
      const missingConnections = this.findMissingConnections(pattern, graph);
      
      for (const connection of missingConnections) {
        recommendations.push({
          id: generateId('completion-rec'),
          type: 'completion',
          description: `Complete ${pattern.type} pattern by connecting '${connection.from}' to '${connection.to}'`,
          confidence: pattern.confidence * 0.6,
          sourcePatterns: [pattern.id],
          suggestedAction: {
            type: 'add_edge',
            data: connection,
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate knowledge organization suggestions
   */
  generateOrganizationSuggestions(
    graphPatterns: GraphPattern[], 
    graph: GraphFoundation
  ): KnowledgeOrganizationSuggestion[] {
    this.organizationSuggestions.clear();
    const suggestions: KnowledgeOrganizationSuggestion[] = [];

    // Cluster formation suggestions
    suggestions.push(...this.suggestClusterFormation(graphPatterns, graph));
    
    // Hierarchy improvement suggestions
    suggestions.push(...this.suggestHierarchyImprovements(graphPatterns, graph));
    
    // Redundancy reduction suggestions
    suggestions.push(...this.suggestRedundancyReduction(graphPatterns, graph));
    
    // Gap identification suggestions
    suggestions.push(...this.identifyKnowledgeGaps(graphPatterns, graph));

    // Store suggestions
    for (const suggestion of suggestions) {
      this.organizationSuggestions.set(suggestion.id, suggestion);
    }

    return suggestions;
  }

  /**
   * Process feedback on recommendations to improve future suggestions
   */
  processFeedback(recommendationId: string, feedback: 'positive' | 'negative' | 'neutral', details?: string): void {
    if (!this.recommendations.has(recommendationId)) {
      console.warn(`Recommendation ${recommendationId} not found`);
      return;
    }

    // Update feedback history
    const history = this.feedbackHistory.get(recommendationId) || { positive: 0, negative: 0, neutral: 0 };
    history[feedback]++;
    this.feedbackHistory.set(recommendationId, history);

    // Update learning metrics based on feedback
    if (this.config.enableAdaptiveLearning) {
      this.updateLearningMetrics(recommendationId, feedback, details);
    }
  }

  /**
   * Get current learning metrics
   */
  getLearningMetrics(): AdaptiveLearningMetrics {
    return { ...this.learningMetrics };
  }

  /**
   * Get recommendations with optional filtering
   */
  getRecommendations(filter?: {
    type?: PatternRecommendation['type'];
    minConfidence?: number;
    maxResults?: number;
  }): PatternRecommendation[] {
    let recommendations = Array.from(this.recommendations.values());

    if (filter?.type) {
      recommendations = recommendations.filter(rec => rec.type === filter.type);
    }

    if (filter?.minConfidence) {
      recommendations = recommendations.filter(rec => rec.confidence >= filter.minConfidence);
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);

    if (filter?.maxResults) {
      recommendations = recommendations.slice(0, filter.maxResults);
    }

    return recommendations;
  }

  /**
   * Get organization suggestions
   */
  getOrganizationSuggestions(): KnowledgeOrganizationSuggestion[] {
    return Array.from(this.organizationSuggestions.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  // ============ Helper Methods ============

  private clearRecommendations(): void {
    this.recommendations.clear();
  }

  private identifyHubInStarPattern(pattern: GraphPattern, graph: GraphFoundation): string | null {
    // The hub is typically the node with the most connections
    let maxConnections = 0;
    let hubNode: string | null = null;

    for (const nodeId of pattern.nodes) {
      const connections = graph.getNodeEdges(nodeId, 'both').length;
      if (connections > maxConnections) {
        maxConnections = connections;
        hubNode = nodeId;
      }
    }

    return hubNode;
  }

  private identifyBridgeInPattern(pattern: GraphPattern): string | null {
    // For bridge patterns, the bridge node is typically the first in the nodes array
    return pattern.nodes.length > 0 ? pattern.nodes[0] : null;
  }

  private calculateNodeSimilarityToPattern(node: Information, pattern: GraphPattern, graph: GraphFoundation): number {
    // Simple similarity calculation based on node type and connections
    const patternNodes = pattern.nodes.map(id => graph.getNode(id)).filter(n => n !== null) as Information[];
    
    // Type similarity
    const typeMatches = patternNodes.filter(pNode => pNode.type === node.type).length;
    const typeSimilarity = patternNodes.length > 0 ? typeMatches / patternNodes.length : 0;

    // Connection pattern similarity (simplified)
    const nodeConnections = graph.getNodeEdges(node.id, 'both').length;
    const avgPatternConnections = pattern.edges.length / pattern.nodes.length;
    const connectionSimilarity = nodeConnections > 0 ? Math.min(nodeConnections / avgPatternConnections, 1) : 0;

    return (typeSimilarity * 0.7) + (connectionSimilarity * 0.3);
  }

  private calculateNodeSimilarityToCluster(node: Information, pattern: GraphPattern, graph: GraphFoundation): number {
    // Calculate how well a node fits with a cluster pattern
    const clusterNodes = pattern.nodes.map(id => graph.getNode(id)).filter(n => n !== null) as Information[];
    
    let totalSimilarity = 0;
    for (const clusterNode of clusterNodes) {
      const similarity = this.calculateBasicNodeSimilarity(node, clusterNode);
      totalSimilarity += similarity;
    }

    return clusterNodes.length > 0 ? totalSimilarity / clusterNodes.length : 0;
  }

  private calculateBasicNodeSimilarity(node1: Information, node2: Information): number {
    // Simple similarity based on type and content
    let similarity = 0;

    if (node1.type === node2.type) {
      similarity += 0.5;
    }

    // Content similarity (very basic)
    if (typeof node1.content === 'string' && typeof node2.content === 'string') {
      const content1 = node1.content.toLowerCase();
      const content2 = node2.content.toLowerCase();
      const commonWords = this.findCommonWords(content1, content2);
      const totalWords = this.getTotalUniqueWords(content1, content2);
      
      if (totalWords > 0) {
        similarity += (commonWords / totalWords) * 0.5;
      }
    }

    return similarity;
  }

  private findCommonWords(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    let common = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        common++;
      }
    }
    
    return common;
  }

  private getTotalUniqueWords(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    return new Set([...words1, ...words2]).size;
  }

  private findPotentialBridgeConnections(bridgeNode: string, allNodes: Information[], graph: GraphFoundation): Array<{ from: string; to: string; type: string }> {
    // Simplified bridge connection finding
    const connections: Array<{ from: string; to: string; type: string }> = [];
    
    // This is a placeholder - in a real implementation, this would use more sophisticated algorithms
    // to identify isolated clusters that could benefit from bridge connections
    
    return connections;
  }

  private findOverlappingClusters(clusterPatterns: GraphPattern[]): Array<{ clusters: GraphPattern[]; patternIds: string[] }> {
    const overlaps: Array<{ clusters: GraphPattern[]; patternIds: string[] }> = [];
    
    for (let i = 0; i < clusterPatterns.length; i++) {
      for (let j = i + 1; j < clusterPatterns.length; j++) {
        const cluster1 = clusterPatterns[i];
        const cluster2 = clusterPatterns[j];
        
        const overlap = this.calculateClusterOverlap(cluster1, cluster2);
        if (overlap > 0.3) {
          overlaps.push({
            clusters: [cluster1, cluster2],
            patternIds: [cluster1.id, cluster2.id],
          });
        }
      }
    }
    
    return overlaps;
  }

  private calculateClusterOverlap(cluster1: GraphPattern, cluster2: GraphPattern): number {
    const set1 = new Set(cluster1.nodes);
    const set2 = new Set(cluster2.nodes);
    
    const intersection = new Set([...set1].filter(node => set2.has(node)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private findMissingConnections(pattern: GraphPattern, graph: GraphFoundation): Array<{ from: string; to: string; type: string }> {
    const missing: Array<{ from: string; to: string; type: string }> = [];
    
    // For different pattern types, suggest different missing connections
    switch (pattern.type) {
      case 'cycle':
        // Check if cycle is complete
        for (let i = 0; i < pattern.nodes.length; i++) {
          const current = pattern.nodes[i];
          const next = pattern.nodes[(i + 1) % pattern.nodes.length];
          
          const existingEdge = graph.getNodeEdges(current, 'out')
            .find(edge => edge.to === next);
          
          if (!existingEdge) {
            missing.push({
              from: current,
              to: next,
              type: 'cycle_completion',
            });
          }
        }
        break;
        
      case 'cluster':
        // Check if all cluster members are connected
        for (let i = 0; i < pattern.nodes.length; i++) {
          for (let j = i + 1; j < pattern.nodes.length; j++) {
            const node1 = pattern.nodes[i];
            const node2 = pattern.nodes[j];
            
            const edge1to2 = graph.getNodeEdges(node1, 'out').find(edge => edge.to === node2);
            const edge2to1 = graph.getNodeEdges(node2, 'out').find(edge => edge.to === node1);
            
            if (!edge1to2 && !edge2to1) {
              missing.push({
                from: node1,
                to: node2,
                type: 'cluster_connection',
              });
            }
          }
        }
        break;
    }
    
    return missing;
  }

  private filterAndRankRecommendations(recommendations: PatternRecommendation[]): PatternRecommendation[] {
    return recommendations
      .filter(rec => rec.confidence >= this.config.minRecommendationConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.config.maxRecommendations);
  }

  private updatePatternQualityScore(sequentialPatterns: Pattern[], graphPatterns: GraphPattern[]): void {
    if (sequentialPatterns.length === 0 && graphPatterns.length === 0) {
      this.learningMetrics.patternQualityScore = 0;
      return;
    }

    let totalQuality = 0;
    let totalPatterns = 0;

    // Calculate quality for sequential patterns
    for (const pattern of sequentialPatterns) {
      totalQuality += pattern.confidence * pattern.successRate;
      totalPatterns++;
    }

    // Calculate quality for graph patterns
    for (const pattern of graphPatterns) {
      totalQuality += pattern.confidence * pattern.support;
      totalPatterns++;
    }

    this.learningMetrics.patternQualityScore = totalPatterns > 0 ? totalQuality / totalPatterns : 0;
  }

  private updateLearningMetrics(recommendationId: string, feedback: string, details?: string): void {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation) return;

    const feedbackValue = feedback === 'positive' ? 1 : feedback === 'negative' ? -1 : 0;
    
    // Update recommendation accuracy with learning rate
    const currentAccuracy = this.learningMetrics.recommendationAccuracy;
    const newAccuracy = currentAccuracy + this.config.learningRate * (feedbackValue - currentAccuracy);
    this.learningMetrics.recommendationAccuracy = Math.max(0, Math.min(1, newAccuracy));

    // Update adaptation rate based on feedback frequency
    this.learningMetrics.adaptationRate = Math.min(
      this.learningMetrics.adaptationRate + this.config.learningRate * 0.1,
      1
    );
  }

  private suggestClusterFormation(graphPatterns: GraphPattern[], graph: GraphFoundation): KnowledgeOrganizationSuggestion[] {
    // Implementation for cluster formation suggestions
    return [];
  }

  private suggestHierarchyImprovements(graphPatterns: GraphPattern[], graph: GraphFoundation): KnowledgeOrganizationSuggestion[] {
    // Implementation for hierarchy improvement suggestions
    return [];
  }

  private suggestRedundancyReduction(graphPatterns: GraphPattern[], graph: GraphFoundation): KnowledgeOrganizationSuggestion[] {
    // Implementation for redundancy reduction suggestions
    return [];
  }

  private identifyKnowledgeGaps(graphPatterns: GraphPattern[], graph: GraphFoundation): KnowledgeOrganizationSuggestion[] {
    // Implementation for knowledge gap identification
    return [];
  }
}