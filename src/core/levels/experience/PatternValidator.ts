/**
 * PatternValidator - Pattern validation, refinement, and quality assessment
 * 
 * Validates patterns based on various criteria and refines them based on user feedback.
 * Provides quality metrics and validation reports for patterns.
 */

import type { 
  Pattern, 
  GraphPattern, 
  Information, 
  PatternMetrics 
} from '../../types.js';
import { generateId } from '../../utils.js';
import type { GraphFoundation } from '../../GraphFoundation.js';

export interface PatternValidatorConfig {
  minValidationScore?: number;
  enableAutoRefinement?: boolean;
  maxRefinementIterations?: number;
  feedbackWeightingEnabled?: boolean;
  validationCriteria?: ValidationCriteria;
}

export interface ValidationCriteria {
  minSupport?: number;
  minConfidence?: number;
  minFrequency?: number;
  maxPatternAge?: number; // in days
  minSuccessRate?: number; // for sequential patterns
  structuralValidityRequired?: boolean;
}

export interface PatternFeedback {
  id: string;
  patternId: string;
  patternType: 'sequential' | 'graph';
  feedbackType: 'positive' | 'negative' | 'neutral' | 'correction';
  rating: number; // 1-5 scale
  comments?: string;
  suggestedChanges?: {
    addNodes?: string[];
    removeNodes?: string[];
    modifyEdges?: Array<{ from: string; to: string; action: 'add' | 'remove' | 'modify' }>;
    adjustConfidence?: number;
  };
  timestamp: Date;
  userId?: string;
  context?: string;
}

export interface ValidationReport {
  patternId: string;
  patternType: 'sequential' | 'graph';
  overallScore: number; // 0-1
  validationResults: {
    structural: { valid: boolean; score: number; issues: string[] };
    statistical: { valid: boolean; score: number; issues: string[] };
    semantic: { valid: boolean; score: number; issues: string[] };
    temporal: { valid: boolean; score: number; issues: string[] };
  };
  recommendations: string[];
  needsRefinement: boolean;
  confidence: number;
  timestamp: Date;
}

export interface PatternRefinement {
  id: string;
  originalPatternId: string;
  refinementType: 'merge' | 'split' | 'adjust' | 'remove' | 'enhance';
  changes: {
    beforePattern: Pattern | GraphPattern;
    afterPattern: Pattern | GraphPattern;
    modifications: string[];
  };
  reason: string;
  confidence: number;
  timestamp: Date;
}

export class PatternValidator {
  private config: Required<PatternValidatorConfig>;
  private feedbackHistory = new Map<string, PatternFeedback[]>();
  private validationReports = new Map<string, ValidationReport>();
  private refinements = new Map<string, PatternRefinement[]>();
  private patternQualityScores = new Map<string, number>();

  constructor(config: PatternValidatorConfig = {}) {
    this.config = {
      minValidationScore: 0.6,
      enableAutoRefinement: true,
      maxRefinementIterations: 3,
      feedbackWeightingEnabled: true,
      validationCriteria: {
        minSupport: 0.1,
        minConfidence: 0.3,
        minFrequency: 2,
        maxPatternAge: 90,
        minSuccessRate: 0.4,
        structuralValidityRequired: true,
      },
      ...config,
    };

    // Override nested config
    if (config.validationCriteria) {
      this.config.validationCriteria = { ...this.config.validationCriteria, ...config.validationCriteria };
    }
  }

  /**
   * Validate a sequential pattern
   */
  validateSequentialPattern(pattern: Pattern): ValidationReport {
    const report: ValidationReport = {
      patternId: pattern.id,
      patternType: 'sequential',
      overallScore: 0,
      validationResults: {
        structural: this.validateSequentialStructure(pattern),
        statistical: this.validateSequentialStatistics(pattern),
        semantic: this.validateSequentialSemantic(pattern),
        temporal: this.validateSequentialTemporal(pattern),
      },
      recommendations: [],
      needsRefinement: false,
      confidence: pattern.confidence,
      timestamp: new Date(),
    };

    // Calculate overall score
    report.overallScore = this.calculateOverallScore(report.validationResults);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.validationResults);
    
    // Determine if refinement is needed
    report.needsRefinement = report.overallScore < this.config.minValidationScore;

    // Store report
    this.validationReports.set(pattern.id, report);
    this.patternQualityScores.set(pattern.id, report.overallScore);

    return report;
  }

  /**
   * Validate a graph pattern
   */
  validateGraphPattern(pattern: GraphPattern, graph: GraphFoundation): ValidationReport {
    const report: ValidationReport = {
      patternId: pattern.id,
      patternType: 'graph',
      overallScore: 0,
      validationResults: {
        structural: this.validateGraphStructure(pattern, graph),
        statistical: this.validateGraphStatistics(pattern),
        semantic: this.validateGraphSemantic(pattern, graph),
        temporal: this.validateGraphTemporal(pattern),
      },
      recommendations: [],
      needsRefinement: false,
      confidence: pattern.confidence,
      timestamp: new Date(),
    };

    // Calculate overall score
    report.overallScore = this.calculateOverallScore(report.validationResults);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.validationResults);
    
    // Determine if refinement is needed
    report.needsRefinement = report.overallScore < this.config.minValidationScore;

    // Store report
    this.validationReports.set(pattern.id, report);
    this.patternQualityScores.set(pattern.id, report.overallScore);

    return report;
  }

  /**
   * Submit feedback for a pattern
   */
  submitFeedback(feedback: Omit<PatternFeedback, 'id' | 'timestamp'>): string {
    const feedbackRecord: PatternFeedback = {
      id: generateId('feedback'),
      timestamp: new Date(),
      ...feedback,
    };

    // Store feedback
    const existingFeedback = this.feedbackHistory.get(feedback.patternId) || [];
    existingFeedback.push(feedbackRecord);
    this.feedbackHistory.set(feedback.patternId, existingFeedback);

    // If auto-refinement is enabled, process the feedback
    if (this.config.enableAutoRefinement) {
      this.processFeedbackForRefinement(feedbackRecord);
    }

    return feedbackRecord.id;
  }

  /**
   * Refine patterns based on accumulated feedback
   */
  refinePatterns(
    sequentialPatterns: Pattern[], 
    graphPatterns: GraphPattern[], 
    graph: GraphFoundation
  ): {
    refinedSequential: Pattern[];
    refinedGraph: GraphPattern[];
    refinements: PatternRefinement[];
  } {
    const refinedSequential: Pattern[] = [];
    const refinedGraph: GraphPattern[] = [];
    const allRefinements: PatternRefinement[] = [];

    // Refine sequential patterns
    for (const pattern of sequentialPatterns) {
      const refinement = this.refineSequentialPattern(pattern);
      if (refinement) {
        refinedSequential.push(refinement.changes.afterPattern as Pattern);
        allRefinements.push(refinement);
        
        // Store refinement
        const patternRefinements = this.refinements.get(pattern.id) || [];
        patternRefinements.push(refinement);
        this.refinements.set(pattern.id, patternRefinements);
      } else {
        refinedSequential.push(pattern);
      }
    }

    // Refine graph patterns
    for (const pattern of graphPatterns) {
      const refinement = this.refineGraphPattern(pattern, graph);
      if (refinement) {
        refinedGraph.push(refinement.changes.afterPattern as GraphPattern);
        allRefinements.push(refinement);
        
        // Store refinement
        const patternRefinements = this.refinements.get(pattern.id) || [];
        patternRefinements.push(refinement);
        this.refinements.set(pattern.id, patternRefinements);
      } else {
        refinedGraph.push(pattern);
      }
    }

    return {
      refinedSequential,
      refinedGraph,
      refinements: allRefinements,
    };
  }

  /**
   * Get validation report for a pattern
   */
  getValidationReport(patternId: string): ValidationReport | null {
    return this.validationReports.get(patternId) || null;
  }

  /**
   * Get all feedback for a pattern
   */
  getPatternFeedback(patternId: string): PatternFeedback[] {
    return this.feedbackHistory.get(patternId) || [];
  }

  /**
   * Get refinement history for a pattern
   */
  getPatternRefinements(patternId: string): PatternRefinement[] {
    return this.refinements.get(patternId) || [];
  }

  /**
   * Get quality scores for all patterns
   */
  getPatternQualityScores(): Map<string, number> {
    return new Map(this.patternQualityScores);
  }

  /**
   * Generate visualization data for patterns and their validation status
   */
  generateVisualizationData(): {
    patterns: Array<{
      id: string;
      type: 'sequential' | 'graph';
      qualityScore: number;
      validationStatus: 'valid' | 'needs_refinement' | 'invalid';
      feedbackCount: number;
      refinementCount: number;
    }>;
    qualityDistribution: { high: number; medium: number; low: number };
    feedbackSummary: { positive: number; negative: number; neutral: number; corrections: number };
  } {
    const patterns: Array<{
      id: string;
      type: 'sequential' | 'graph';
      qualityScore: number;
      validationStatus: 'valid' | 'needs_refinement' | 'invalid';
      feedbackCount: number;
      refinementCount: number;
    }> = [];

    let qualityDistribution = { high: 0, medium: 0, low: 0 };
    let feedbackSummary = { positive: 0, negative: 0, neutral: 0, corrections: 0 };

    // Process each pattern
    for (const [patternId, qualityScore] of this.patternQualityScores) {
      const report = this.validationReports.get(patternId);
      const feedback = this.feedbackHistory.get(patternId) || [];
      const refinements = this.refinements.get(patternId) || [];

      // Determine validation status
      let validationStatus: 'valid' | 'needs_refinement' | 'invalid' = 'valid';
      if (qualityScore < 0.3) {
        validationStatus = 'invalid';
      } else if (qualityScore < this.config.minValidationScore) {
        validationStatus = 'needs_refinement';
      }

      patterns.push({
        id: patternId,
        type: report?.patternType || 'sequential',
        qualityScore,
        validationStatus,
        feedbackCount: feedback.length,
        refinementCount: refinements.length,
      });

      // Update quality distribution
      if (qualityScore >= 0.7) {
        qualityDistribution.high++;
      } else if (qualityScore >= 0.4) {
        qualityDistribution.medium++;
      } else {
        qualityDistribution.low++;
      }

      // Update feedback summary
      for (const fb of feedback) {
        switch (fb.feedbackType) {
          case 'positive':
            feedbackSummary.positive++;
            break;
          case 'negative':
            feedbackSummary.negative++;
            break;
          case 'neutral':
            feedbackSummary.neutral++;
            break;
          case 'correction':
            feedbackSummary.corrections++;
            break;
        }
      }
    }

    return {
      patterns,
      qualityDistribution,
      feedbackSummary,
    };
  }

  // ============ Private Helper Methods ============

  private validateSequentialStructure(pattern: Pattern): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check minimum path length
    if (pattern.nodes.length < 2) {
      issues.push('Pattern must have at least 2 nodes');
      score -= 0.3;
    }

    // Check for duplicate nodes in sequence
    const uniqueNodes = new Set(pattern.nodes);
    if (uniqueNodes.size < pattern.nodes.length) {
      issues.push('Pattern contains duplicate nodes in sequence');
      score -= 0.2;
    }

    // Check for reasonable path length (not too long)
    if (pattern.nodes.length > 20) {
      issues.push('Pattern is unusually long and may be too specific');
      score -= 0.1;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateSequentialStatistics(pattern: Pattern): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check frequency
    if (pattern.frequency < this.config.validationCriteria.minFrequency!) {
      issues.push(`Pattern frequency (${pattern.frequency}) below minimum (${this.config.validationCriteria.minFrequency})`);
      score -= 0.3;
    }

    // Check confidence
    if (pattern.confidence < this.config.validationCriteria.minConfidence!) {
      issues.push(`Pattern confidence (${pattern.confidence.toFixed(2)}) below minimum (${this.config.validationCriteria.minConfidence})`);
      score -= 0.3;
    }

    // Check success rate
    if (pattern.successRate < this.config.validationCriteria.minSuccessRate!) {
      issues.push(`Pattern success rate (${pattern.successRate.toFixed(2)}) below minimum (${this.config.validationCriteria.minSuccessRate})`);
      score -= 0.4;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateSequentialSemantic(pattern: Pattern): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check if contexts are meaningful
    if (!pattern.contexts || pattern.contexts.length === 0) {
      issues.push('Pattern has no associated contexts');
      score -= 0.2;
    }

    // Check for overly generic patterns
    const genericTerms = ['node', 'item', 'element', 'thing'];
    const genericNodeCount = pattern.nodes.filter(node => 
      genericTerms.some(term => node.toLowerCase().includes(term))
    ).length;
    
    if (genericNodeCount / pattern.nodes.length > 0.5) {
      issues.push('Pattern contains too many generic node names');
      score -= 0.2;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateSequentialTemporal(pattern: Pattern): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check pattern age
    const now = new Date();
    const ageInDays = (now.getTime() - pattern.lastSeen.getTime()) / (24 * 60 * 60 * 1000);
    
    if (ageInDays > this.config.validationCriteria.maxPatternAge!) {
      issues.push(`Pattern is ${Math.round(ageInDays)} days old, exceeding maximum age of ${this.config.validationCriteria.maxPatternAge} days`);
      score -= 0.3;
    }

    // Check traversal time reasonableness
    if (pattern.avgTraversalTime > 0 && pattern.avgTraversalTime > 3600) { // > 1 hour
      issues.push('Pattern has unusually long average traversal time');
      score -= 0.1;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateGraphStructure(pattern: GraphPattern, graph: GraphFoundation): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Validate that all nodes exist in the graph
    for (const nodeId of pattern.nodes) {
      if (!graph.getNode(nodeId)) {
        issues.push(`Pattern references non-existent node: ${nodeId}`);
        score -= 0.2;
      }
    }

    // Validate edges correspond to actual graph connections
    for (const edge of pattern.edges) {
      const actualEdges = graph.getNodeEdges(edge.from, 'out');
      const edgeExists = actualEdges.some(e => e.to === edge.to && e.type === edge.type);
      
      if (!edgeExists) {
        issues.push(`Pattern references non-existent edge: ${edge.from} -> ${edge.to} (${edge.type})`);
        score -= 0.3;
      }
    }

    // Check pattern type consistency
    if (!this.isPatternTypeConsistent(pattern)) {
      issues.push('Pattern structure does not match its declared type');
      score -= 0.4;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateGraphStatistics(pattern: GraphPattern): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check support
    if (pattern.support < this.config.validationCriteria.minSupport!) {
      issues.push(`Pattern support (${pattern.support.toFixed(2)}) below minimum (${this.config.validationCriteria.minSupport})`);
      score -= 0.3;
    }

    // Check confidence
    if (pattern.confidence < this.config.validationCriteria.minConfidence!) {
      issues.push(`Pattern confidence (${pattern.confidence.toFixed(2)}) below minimum (${this.config.validationCriteria.minConfidence})`);
      score -= 0.3;
    }

    // Check frequency
    if (pattern.frequency < this.config.validationCriteria.minFrequency!) {
      issues.push(`Pattern frequency (${pattern.frequency}) below minimum (${this.config.validationCriteria.minFrequency})`);
      score -= 0.2;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateGraphSemantic(pattern: GraphPattern, graph: GraphFoundation): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check if pattern makes semantic sense
    // This is a simplified check - could be much more sophisticated
    const nodeTypes = pattern.nodes.map(id => graph.getNode(id)?.type).filter(Boolean);
    const uniqueTypes = new Set(nodeTypes);
    
    // For certain pattern types, expect some consistency in node types
    switch (pattern.type) {
      case 'cluster':
        if (uniqueTypes.size === 1) {
          // All same type - good for clustering
          score += 0.1;
        } else if (uniqueTypes.size > pattern.nodes.length * 0.7) {
          // Too many different types for a cluster
          issues.push('Cluster pattern has too many different node types');
          score -= 0.2;
        }
        break;
      
      case 'star':
        // Central hub should ideally be a different type than leaves
        if (pattern.nodes.length > 1) {
          const hubNode = graph.getNode(pattern.nodes[0]);
          const leafTypes = pattern.nodes.slice(1).map(id => graph.getNode(id)?.type);
          const leafTypeSet = new Set(leafTypes);
          
          if (hubNode && leafTypeSet.has(hubNode.type) && leafTypeSet.size === 1) {
            issues.push('Star pattern hub has same type as all leaves - may not be semantically meaningful');
            score -= 0.1;
          }
        }
        break;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private validateGraphTemporal(pattern: GraphPattern): { valid: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 1.0;

    // Check pattern age
    const now = new Date();
    const ageInDays = (now.getTime() - pattern.lastSeen.getTime()) / (24 * 60 * 60 * 1000);
    
    if (ageInDays > this.config.validationCriteria.maxPatternAge!) {
      issues.push(`Pattern is ${Math.round(ageInDays)} days old, exceeding maximum age of ${this.config.validationCriteria.maxPatternAge} days`);
      score -= 0.3;
    }

    return {
      valid: issues.length === 0,
      score: Math.max(0, score),
      issues,
    };
  }

  private calculateOverallScore(validationResults: ValidationReport['validationResults']): number {
    const weights = {
      structural: 0.4,
      statistical: 0.3,
      semantic: 0.2,
      temporal: 0.1,
    };

    return (
      validationResults.structural.score * weights.structural +
      validationResults.statistical.score * weights.statistical +
      validationResults.semantic.score * weights.semantic +
      validationResults.temporal.score * weights.temporal
    );
  }

  private generateRecommendations(validationResults: ValidationReport['validationResults']): string[] {
    const recommendations: string[] = [];

    // Generate recommendations based on validation results
    for (const [category, result] of Object.entries(validationResults)) {
      if (!result.valid) {
        switch (category) {
          case 'structural':
            recommendations.push('Review pattern structure and fix structural issues');
            break;
          case 'statistical':
            recommendations.push('Improve pattern statistics through more observations');
            break;
          case 'semantic':
            recommendations.push('Enhance pattern semantic meaning and context');
            break;
          case 'temporal':
            recommendations.push('Update pattern or remove if too outdated');
            break;
        }
      }
    }

    return recommendations;
  }

  private isPatternTypeConsistent(pattern: GraphPattern): boolean {
    // Check if the pattern structure matches its declared type
    switch (pattern.type) {
      case 'star':
        // Should have one central node connected to others
        return this.validateStarStructure(pattern);
      case 'chain':
        // Should be a linear sequence
        return this.validateChainStructure(pattern);
      case 'cycle':
        // Should form a cycle
        return this.validateCycleStructure(pattern);
      case 'cluster':
        // Should be densely connected
        return this.validateClusterStructure(pattern);
      default:
        return true; // Unknown types pass by default
    }
  }

  private validateStarStructure(pattern: GraphPattern): boolean {
    // Very basic star validation - could be more sophisticated
    return pattern.edges.length >= 2 && pattern.nodes.length >= 3;
  }

  private validateChainStructure(pattern: GraphPattern): boolean {
    // Basic chain validation
    return pattern.edges.length === pattern.nodes.length - 1;
  }

  private validateCycleStructure(pattern: GraphPattern): boolean {
    // Basic cycle validation
    return pattern.edges.length === pattern.nodes.length && pattern.nodes.length >= 3;
  }

  private validateClusterStructure(pattern: GraphPattern): boolean {
    // Basic cluster validation - should have multiple interconnections
    const minExpectedEdges = Math.max(pattern.nodes.length - 1, 3);
    return pattern.edges.length >= minExpectedEdges;
  }

  private processFeedbackForRefinement(feedback: PatternFeedback): void {
    // Process feedback to determine if immediate refinement is needed
    // This is a simplified implementation
    if (feedback.feedbackType === 'negative' && feedback.rating <= 2) {
      // Mark pattern for refinement
      console.log(`Pattern ${feedback.patternId} marked for refinement due to negative feedback`);
    }
  }

  private refineSequentialPattern(pattern: Pattern): PatternRefinement | null {
    const feedback = this.feedbackHistory.get(pattern.id) || [];
    
    if (feedback.length === 0) {
      return null; // No feedback to base refinement on
    }

    // Analyze feedback to determine refinement needed
    const negativeCount = feedback.filter(f => f.feedbackType === 'negative').length;
    const totalCount = feedback.length;
    
    if (negativeCount / totalCount > 0.5) {
      // Pattern needs adjustment
      const refinedPattern = { ...pattern };
      refinedPattern.confidence = Math.max(0.1, pattern.confidence - 0.2);
      
      return {
        id: generateId('refinement'),
        originalPatternId: pattern.id,
        refinementType: 'adjust',
        changes: {
          beforePattern: pattern,
          afterPattern: refinedPattern,
          modifications: ['Reduced confidence due to negative feedback'],
        },
        reason: 'High proportion of negative feedback received',
        confidence: 0.7,
        timestamp: new Date(),
      };
    }

    return null;
  }

  private refineGraphPattern(pattern: GraphPattern, graph: GraphFoundation): PatternRefinement | null {
    const feedback = this.feedbackHistory.get(pattern.id) || [];
    
    if (feedback.length === 0) {
      return null;
    }

    // Similar refinement logic for graph patterns
    const negativeCount = feedback.filter(f => f.feedbackType === 'negative').length;
    const totalCount = feedback.length;
    
    if (negativeCount / totalCount > 0.5) {
      const refinedPattern = { ...pattern };
      refinedPattern.confidence = Math.max(0.1, pattern.confidence - 0.2);
      
      return {
        id: generateId('refinement'),
        originalPatternId: pattern.id,
        refinementType: 'adjust',
        changes: {
          beforePattern: pattern,
          afterPattern: refinedPattern,
          modifications: ['Reduced confidence due to negative feedback'],
        },
        reason: 'High proportion of negative feedback received',
        confidence: 0.7,
        timestamp: new Date(),
      };
    }

    return null;
  }
}