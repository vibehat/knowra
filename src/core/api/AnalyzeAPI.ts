/**
 * AnalyzeAPI - Cross-Level Analysis
 * 
 * Public API class for cross-level analysis operations. Provides clean interface
 * for analyzing relationships across different knowledge levels.
 */

import type { 
  Knowledge, 
  Experience, 
  Strategy, 
  Information 
} from '../types.js';
import { generateId, deepClone } from '../utils.js';
import type { GraphFoundation } from '../GraphFoundation.js';
import type { KnowledgeAPI } from './KnowledgeAPI.js';

export class AnalyzeAPI {
  constructor(
    private graphFoundation: GraphFoundation,
    private knowledgeAPI: KnowledgeAPI
  ) {}

  /**
   * Extract knowledge objects from information IDs
   * @param informationIds Array of information IDs
   * @returns Array of Knowledge objects
   */
  extractKnowledge(informationIds: string[]): Knowledge[] {
    return informationIds
      .map(id => this.graphFoundation.getNode(id))
      .filter((node): node is Information => node !== undefined)
      .map(node => ({
        node: deepClone(node),
        edges: this.knowledgeAPI.getRelationships(node.id),
      }));
  }

  /**
   * Track exploration across knowledge levels
   * @param knowledgePath Array of Knowledge objects representing path
   * @returns Experience object tracking the exploration
   */
  trackExploration(knowledgePath: Knowledge[]): Experience {
    const path = knowledgePath.map(k => k.node.id);
    return {
      id: generateId('exploration'),
      path,
      context: 'Cross-level exploration',
      outcome: 'neutral',
      timestamp: new Date(),
      traversalTime: 0,
      reinforcement: 0,
    };
  }

  /**
   * Synthesize strategy from successful experiences
   * @param experiences Array of experiences to analyze
   * @returns Synthesized strategy
   */
  synthesizeStrategy(experiences: Experience[]): Strategy {
    const successfulPaths = experiences
      .filter(exp => exp.outcome === 'success')
      .map(exp => exp.path);
    
    const mostCommonPath = successfulPaths[0] ?? [];
    const startNode = mostCommonPath[0];
    
    if (!startNode) {
      throw new Error('No successful experiences to synthesize strategy from');
    }

    return {
      id: generateId('synthesized'),
      goal: 'Synthesized from experience',
      startNode,
      route: mostCommonPath,
      algorithm: 'experience_synthesis',
      cost: 0,
      confidence: 0.8,
    };
  }

  /**
   * Analyze information flow across levels
   * @param nodeId Starting node ID
   * @param depth Analysis depth
   * @returns Analysis result
   */
  analyzeInformationFlow(nodeId: string, depth = 2) {
    const subgraph = this.knowledgeAPI.getSubgraph(nodeId, depth);
    const nodeMetrics = this.knowledgeAPI.getNodeMetrics(nodeId);
    
    return {
      centralNode: nodeId,
      subgraph,
      metrics: nodeMetrics,
      flowPatterns: this.identifyFlowPatterns(subgraph),
    };
  }

  /**
   * Find knowledge gaps in the graph
   * @param context Context to analyze gaps for
   * @returns Array of potential knowledge gaps
   */
  findKnowledgeGaps(context: string) {
    // Simplified implementation - could be enhanced with AI analysis
    const graphMetrics = this.knowledgeAPI.getGraphMetrics();
    
    return {
      context,
      potentialGaps: [],
      suggestions: [
        'Consider adding more connections between isolated nodes',
        'Expand knowledge in areas with low connectivity',
      ],
      metrics: graphMetrics,
    };
  }

  /**
   * Identify flow patterns in a subgraph
   * @param subgraph Knowledge subgraph to analyze
   * @returns Flow pattern analysis
   */
  private identifyFlowPatterns(subgraph: Knowledge[]) {
    const patterns = {
      centralHubs: [] as string[],
      deadEnds: [] as string[],
      bridges: [] as string[],
    };

    for (const knowledge of subgraph) {
      const inCount = knowledge.edges.filter(e => e.to === knowledge.node.id).length;
      const outCount = knowledge.edges.filter(e => e.from === knowledge.node.id).length;

      if (inCount > 3 && outCount > 3) {
        patterns.centralHubs.push(knowledge.node.id);
      } else if (outCount === 0 && inCount > 0) {
        patterns.deadEnds.push(knowledge.node.id);
      } else if (inCount === 1 && outCount === 1) {
        patterns.bridges.push(knowledge.node.id);
      }
    }

    return patterns;
  }
}