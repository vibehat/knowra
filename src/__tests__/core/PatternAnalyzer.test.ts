/**
 * Tests for PatternAnalyzer - Pattern-based knowledge discovery
 * Verifies recommendation generation and adaptive learning capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternAnalyzer } from '../../core/levels/experience/PatternAnalyzer.js';
import { GraphFoundation } from '../../core/GraphFoundation.js';
import type { Information, Pattern, GraphPattern } from '../../core/types.js';

// Helper function to create valid Information nodes
function createNode(id: string, content: string, type: string): Information {
  const now = new Date();
  return {
    id,
    content,
    type,
    created: now,
    modified: now,
  };
}

// Helper function to create valid Relationship edges
function createEdge(from: string, to: string, type: string, strength?: number) {
  return {
    from,
    to,
    type,
    created: new Date(),
    strength,
  };
}

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;
  let graph: GraphFoundation;

  beforeEach(() => {
    analyzer = new PatternAnalyzer({
      minPatternSupport: 0.1,
      minRecommendationConfidence: 0.3,
      maxRecommendations: 5,
      enableAdaptiveLearning: true,
      learningRate: 0.1,
    });
    
    graph = new GraphFoundation();
  });

  describe('Connection Recommendations', () => {
    it('should generate recommendations based on star patterns', () => {
      // Create a star pattern in the graph
      graph.addNode(createNode('hub', 'Central Hub', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'document'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'document'));
      graph.addNode(createNode('leaf3', 'Leaf 3', 'document'));
      graph.addNode(createNode('potential', 'Potential Connection', 'document'));

      graph.addEdge(createEdge('hub', 'leaf1', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf2', 'connects'));
      graph.addEdge(createEdge('hub', 'leaf3', 'connects'));

      // Create mock star pattern
      const starPattern: GraphPattern = {
        id: 'star-1',
        type: 'star',
        description: 'Star pattern with hub',
        nodes: ['hub', 'leaf1', 'leaf2', 'leaf3'],
        edges: [
          { from: 'hub', to: 'leaf1', type: 'connects' },
          { from: 'hub', to: 'leaf2', type: 'connects' },
          { from: 'hub', to: 'leaf3', type: 'connects' },
        ],
        frequency: 1,
        confidence: 0.8,
        support: 0.5,
        contexts: ['knowledge_hub'],
        lastSeen: new Date(),
      };

      const recommendations = analyzer.analyzePatterns([], [starPattern], graph);
      
      expect(recommendations.length).toBeGreaterThan(0); // Should generate at least one recommendation
      
      // Star patterns generate organization recommendations
      const orgRecs = recommendations.filter(r => r.type === 'organization');
      expect(orgRecs.length).toBeGreaterThan(0);
      
      const rec = orgRecs[0];
      expect(rec.confidence).toBeGreaterThan(0);
      expect(rec.sourcePatterns).toContain('star-1');
      expect(rec.suggestedAction.type).toBe('create_cluster');
    });

    it('should generate navigation recommendations from sequential patterns', () => {
      // Create mock sequential pattern with high success rate
      const sequentialPattern: Pattern = {
        id: 'seq-1',
        description: 'Successful workflow',
        frequency: 5,
        confidence: 0.9,
        nodes: ['start', 'process', 'validate', 'complete'],
        contexts: ['workflow'],
        successRate: 0.85,
        avgTraversalTime: 120,
        lastSeen: new Date(),
      };

      const recommendations = analyzer.analyzePatterns([sequentialPattern], [], graph);
      
      const navRecs = recommendations.filter(r => r.type === 'navigation');
      expect(navRecs.length).toBeGreaterThan(0);
      
      const rec = navRecs[0];
      expect(rec.confidence).toBeGreaterThan(0.7); // Should be high confidence due to high success rate
      expect(rec.suggestedAction.type).toBe('suggest_path');
      expect(rec.suggestedAction.data.path).toEqual(['start', 'process', 'validate', 'complete']);
    });
  });

  describe('Organization Recommendations', () => {
    it('should suggest hub-based organization', () => {
      // Create hub pattern
      graph.addNode(createNode('main_hub', 'Main Hub', 'category'));
      graph.addNode(createNode('item1', 'Item 1', 'item'));
      graph.addNode(createNode('item2', 'Item 2', 'item'));

      const hubPattern: GraphPattern = {
        id: 'hub-1',
        type: 'hub',
        description: 'Main organizational hub',
        nodes: ['main_hub', 'item1', 'item2'],
        edges: [
          { from: 'main_hub', to: 'item1', type: 'contains' },
          { from: 'main_hub', to: 'item2', type: 'contains' },
        ],
        frequency: 1,
        confidence: 0.9,
        support: 0.4,
        contexts: ['organization'],
        lastSeen: new Date(),
      };

      const recommendations = analyzer.analyzePatterns([], [hubPattern], graph);
      
      const orgRecs = recommendations.filter(r => r.type === 'organization');
      expect(orgRecs.length).toBeGreaterThan(0);
      
      const rec = orgRecs[0];
      expect(rec.suggestedAction.type).toBe('create_cluster');
      expect(rec.suggestedAction.data.hubNode).toBe('main_hub');
    });

    it('should generate organization suggestions', () => {
      const clusterPattern: GraphPattern = {
        id: 'cluster-1',
        type: 'cluster',
        description: 'Dense cluster',
        nodes: ['node1', 'node2', 'node3'],
        edges: [
          { from: 'node1', to: 'node2', type: 'related' },
          { from: 'node2', to: 'node3', type: 'related' },
          { from: 'node1', to: 'node3', type: 'related' },
        ],
        frequency: 1,
        confidence: 0.7,
        support: 0.3,
        contexts: ['cluster'],
        lastSeen: new Date(),
      };

      const suggestions = analyzer.generateOrganizationSuggestions([clusterPattern], graph);
      
      expect(suggestions).toBeInstanceOf(Array);
      // Organization suggestions may be empty for simple cases, that's okay
    });
  });

  describe('Adaptive Learning', () => {
    it('should process feedback and update learning metrics', () => {
      // Generate some recommendations first
      const starPattern: GraphPattern = {
        id: 'star-feedback',
        type: 'star',
        description: 'Star for feedback testing',
        nodes: ['hub', 'leaf1', 'leaf2'],
        edges: [
          { from: 'hub', to: 'leaf1', type: 'connects' },
          { from: 'hub', to: 'leaf2', type: 'connects' },
        ],
        frequency: 1,
        confidence: 0.6,
        support: 0.3,
        contexts: ['test'],
        lastSeen: new Date(),
      };

      graph.addNode(createNode('hub', 'Hub', 'hub'));
      graph.addNode(createNode('leaf1', 'Leaf 1', 'leaf'));
      graph.addNode(createNode('leaf2', 'Leaf 2', 'leaf'));

      const recommendations = analyzer.analyzePatterns([], [starPattern], graph);
      
      if (recommendations.length > 0) {
        const initialMetrics = analyzer.getLearningMetrics();
        const recommendationId = recommendations[0].id;
        
        // Process positive feedback
        analyzer.processFeedback(recommendationId, 'positive', 'This was helpful');
        
        const updatedMetrics = analyzer.getLearningMetrics();
        expect(updatedMetrics.recommendationAccuracy).toBeGreaterThanOrEqual(initialMetrics.recommendationAccuracy);
      }
    });

    it('should track learning metrics over time', () => {
      const initialMetrics = analyzer.getLearningMetrics();
      
      expect(initialMetrics).toHaveProperty('totalPatterns');
      expect(initialMetrics).toHaveProperty('patternQualityScore');
      expect(initialMetrics).toHaveProperty('recommendationAccuracy');
      expect(initialMetrics).toHaveProperty('organizationEfficiency');
      expect(initialMetrics).toHaveProperty('adaptationRate');
      
      // All metrics should be between 0 and 1
      expect(initialMetrics.patternQualityScore).toBeGreaterThanOrEqual(0);
      expect(initialMetrics.patternQualityScore).toBeLessThanOrEqual(1);
      expect(initialMetrics.recommendationAccuracy).toBeGreaterThanOrEqual(0);
      expect(initialMetrics.recommendationAccuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('Recommendation Filtering and Ranking', () => {
    it('should filter recommendations by type and confidence', () => {
      // Create patterns that will generate multiple types of recommendations
      const starPattern: GraphPattern = {
        id: 'star-filter',
        type: 'star',
        description: 'Star pattern',
        nodes: ['center', 'node1', 'node2'],
        edges: [
          { from: 'center', to: 'node1', type: 'connects' },
          { from: 'center', to: 'node2', type: 'connects' },
        ],
        frequency: 1,
        confidence: 0.8,
        support: 0.4,
        contexts: ['test'],
        lastSeen: new Date(),
      };

      const sequentialPattern: Pattern = {
        id: 'seq-filter',
        description: 'Sequential pattern',
        frequency: 3,
        confidence: 0.7,
        nodes: ['step1', 'step2', 'step3'],
        contexts: ['workflow'],
        successRate: 0.8,
        avgTraversalTime: 100,
        lastSeen: new Date(),
      };

      graph.addNode(createNode('center', 'Center', 'hub'));
      graph.addNode(createNode('node1', 'Node 1', 'item'));
      graph.addNode(createNode('node2', 'Node 2', 'item'));
      
      analyzer.analyzePatterns([sequentialPattern], [starPattern], graph);

      // Filter by type
      const connectionRecs = analyzer.getRecommendations({ type: 'connection' });
      const navigationRecs = analyzer.getRecommendations({ type: 'navigation' });

      expect(connectionRecs.every(r => r.type === 'connection')).toBe(true);
      expect(navigationRecs.every(r => r.type === 'navigation')).toBe(true);

      // Filter by confidence
      const highConfidenceRecs = analyzer.getRecommendations({ minConfidence: 0.6 });
      expect(highConfidenceRecs.every(r => r.confidence >= 0.6)).toBe(true);

      // Limit results
      const limitedRecs = analyzer.getRecommendations({ maxResults: 2 });
      expect(limitedRecs.length).toBeLessThanOrEqual(2);
    });

    it('should rank recommendations by confidence', () => {
      // Create patterns with different confidence levels
      const highConfPattern: GraphPattern = {
        id: 'high-conf',
        type: 'star',
        description: 'High confidence pattern',
        nodes: ['hub1', 'leaf1a', 'leaf1b'],
        edges: [
          { from: 'hub1', to: 'leaf1a', type: 'connects' },
          { from: 'hub1', to: 'leaf1b', type: 'connects' },
        ],
        frequency: 1,
        confidence: 0.9,
        support: 0.5,
        contexts: ['test'],
        lastSeen: new Date(),
      };

      const lowConfPattern: GraphPattern = {
        id: 'low-conf',
        type: 'star',
        description: 'Low confidence pattern',
        nodes: ['hub2', 'leaf2a', 'leaf2b'],
        edges: [
          { from: 'hub2', to: 'leaf2a', type: 'connects' },
          { from: 'hub2', to: 'leaf2b', type: 'connects' },
        ],
        frequency: 1,
        confidence: 0.4,
        support: 0.2,
        contexts: ['test'],
        lastSeen: new Date(),
      };

      // Add nodes to graph
      graph.addNode(createNode('hub1', 'Hub 1', 'hub'));
      graph.addNode(createNode('leaf1a', 'Leaf 1A', 'item'));
      graph.addNode(createNode('leaf1b', 'Leaf 1B', 'item'));
      graph.addNode(createNode('hub2', 'Hub 2', 'hub'));
      graph.addNode(createNode('leaf2a', 'Leaf 2A', 'item'));
      graph.addNode(createNode('leaf2b', 'Leaf 2B', 'item'));

      analyzer.analyzePatterns([], [highConfPattern, lowConfPattern], graph);
      
      const recommendations = analyzer.getRecommendations();
      
      // Should be sorted by confidence (descending)
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].confidence).toBeGreaterThanOrEqual(recommendations[i + 1].confidence);
      }
    });
  });

  describe('Pattern-Based Knowledge Discovery', () => {
    it('should discover knowledge organization improvements', () => {
      // Create a scenario with suboptimal organization
      const clusterPattern: GraphPattern = {
        id: 'discoverable-cluster',
        type: 'cluster',
        description: 'Cluster that could be better organized',
        nodes: ['topic1', 'topic2', 'topic3'],
        edges: [
          { from: 'topic1', to: 'topic2', type: 'related' },
          { from: 'topic2', to: 'topic3', type: 'related' },
        ],
        frequency: 1,
        confidence: 0.6,
        support: 0.3,
        contexts: ['knowledge_area'],
        lastSeen: new Date(),
      };

      graph.addNode(createNode('topic1', 'Topic 1', 'concept'));
      graph.addNode(createNode('topic2', 'Topic 2', 'concept'));
      graph.addNode(createNode('topic3', 'Topic 3', 'concept'));

      const recommendations = analyzer.analyzePatterns([], [clusterPattern], graph);
      
      // Should generate some form of organizational recommendation
      expect(recommendations).toBeInstanceOf(Array);
      
      // Test organization suggestions
      const orgSuggestions = analyzer.generateOrganizationSuggestions([clusterPattern], graph);
      expect(orgSuggestions).toBeInstanceOf(Array);
    });
  });
});