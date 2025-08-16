/**
 * InsightExtractor - Intelligent insight extraction and analysis service
 * 
 * Analyzes experiences and feedback to extract actionable insights
 */

import type { Experience, Insight } from '../../types.js';
import { generateId } from '../../utils.js';

export interface InsightExtractorConfig {
  fastPathThreshold?: number;
  popularityThreshold?: number;
  enableFeedbackAnalysis?: boolean;
  maxInsightsPerExtraction?: number;
  minConfidenceThreshold?: number;
  sentimentAnalysisEnabled?: boolean;
  patternDetectionEnabled?: boolean;
}

export class InsightExtractor {
  private insights = new Map<string, Insight>();
  private config: Required<InsightExtractorConfig>;

  constructor(config: InsightExtractorConfig = {}) {
    this.config = {
      fastPathThreshold: 1000,
      popularityThreshold: 5,
      enableFeedbackAnalysis: true,
      maxInsightsPerExtraction: 3,
      minConfidenceThreshold: 0.3,
      sentimentAnalysisEnabled: true,
      patternDetectionEnabled: true,
      ...config,
    };
  }

  /**
   * Extract insights from an experience
   */
  extractInsights(experience: Experience, allExperiences?: Map<string, Experience>): Insight[] {
    const insights: Insight[] = [];

    // Performance insight for unusually fast successful paths
    if (this.shouldExtractPerformanceInsight(experience)) {
      insights.push(this.createPerformanceInsight(experience));
    }

    // Pattern insight for frequently used paths
    if (allExperiences && this.shouldExtractPopularityInsight(experience, allExperiences)) {
      insights.push(this.createPopularityInsight(experience, allExperiences));
    }

    // Success pattern insights
    if (this.shouldExtractSuccessPatternInsight(experience)) {
      insights.push(this.createSuccessPatternInsight(experience));
    }

    // Failure pattern insights
    if (this.shouldExtractFailurePatternInsight(experience)) {
      insights.push(this.createFailurePatternInsight(experience));
    }

    // Store insights for future reference
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    return insights.slice(0, this.config.maxInsightsPerExtraction);
  }

  /**
   * Extract insights from feedback text
   */
  extractInsightsFromFeedback(experience: Experience, feedback: string): Insight[] {
    if (!this.config.enableFeedbackAnalysis || !feedback.trim()) {
      return [];
    }

    const insights: Insight[] = [];
    const feedbackLower = feedback.toLowerCase();
    const sentiment = this.config.sentimentAnalysisEnabled ? this.analyzeFeedbackSentiment(feedback) : undefined;

    // Always create a feedback insight, categorized by content
    let insightType: 'feedback_insight' = 'feedback_insight';
    let description = '';
    let confidence = 0.6;
    let impact: 'low' | 'medium' | 'high' = 'medium';

    // Detect optimization opportunities
    if (this.containsOptimizationKeywords(feedbackLower)) {
      description = `Performance concern identified: ${feedback}`;
      confidence = 0.7;
      impact = 'medium';
    }
    // Detect warnings
    else if (this.containsWarningKeywords(feedbackLower)) {
      description = `Issue detected in path: ${feedback}`;
      confidence = 0.8;
      impact = 'high';
    }
    // Detect discovery insights
    else if (this.containsDiscoveryKeywords(feedbackLower)) {
      description = `New pattern discovered: ${feedback}`;
      confidence = 0.75;
      impact = 'medium';
    }
    // General feedback insight
    else {
      description = `Feedback received: ${feedback}`;
      confidence = Math.min(0.8, Math.abs(sentiment || 0) + 0.4);
      impact = Math.abs(sentiment || 0) > 0.5 ? 'medium' : 'low';
    }

    const insight: Insight = {
      id: generateId('insight'),
      type: insightType,
      description,
      confidence,
      evidence: [experience.id],
      impact,
      actionable: true,
      timestamp: new Date(),
      ...(this.config.sentimentAnalysisEnabled && typeof sentiment === 'number' ? { sentiment } : {}),
    } as any;

    insights.push(insight);

    // Store insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    return insights;
  }

  /**
   * Check if performance insight should be extracted
   */
  private shouldExtractPerformanceInsight(experience: Experience): boolean {
    return experience.outcome === 'success' && 
           experience.traversalTime < this.config.fastPathThreshold && 
           experience.path.length >= 3;
  }

  /**
   * Check if popularity insight should be extracted
   */
  private shouldExtractPopularityInsight(experience: Experience, allExperiences: Map<string, Experience>): boolean {
    const pathKey = experience.path.join('→');
    const pathUsageCount = Array.from(allExperiences.values())
      .filter(exp => exp.path.join('→') === pathKey).length;
    
    return pathUsageCount >= this.config.popularityThreshold;
  }

  /**
   * Check if success pattern insight should be extracted
   */
  private shouldExtractSuccessPatternInsight(experience: Experience): boolean {
    // Extract success pattern insights for successful experiences
    return experience.outcome === 'success' && 
           (experience.patterns?.length > 0 || experience.reinforcement > 0.5);
  }

  /**
   * Check if failure pattern insight should be extracted
   */
  private shouldExtractFailurePatternInsight(experience: Experience): boolean {
    // Extract failure pattern insights for failed experiences
    return experience.outcome === 'failure';
  }

  /**
   * Create performance insight
   */
  private createPerformanceInsight(experience: Experience): Insight {
    return {
      id: generateId('insight'),
      type: 'optimization',
      description: `Fast successful path: ${experience.path.join(' → ')} completed in ${experience.traversalTime}ms`,
      confidence: Math.min(0.9, 0.7 + (this.config.fastPathThreshold - experience.traversalTime) / this.config.fastPathThreshold * 0.2),
      evidence: [experience.id],
      impact: experience.path.length > 5 ? 'high' : 'medium',
      actionable: true,
      timestamp: new Date(),
    };
  }

  /**
   * Create popularity insight
   */
  private createPopularityInsight(experience: Experience, allExperiences: Map<string, Experience>): Insight {
    const pathKey = experience.path.join('→');
    const usageCount = Array.from(allExperiences.values())
      .filter(exp => exp.path.join('→') === pathKey).length;

    return {
      id: generateId('insight'),
      type: 'trend',
      description: `Popular path detected: ${experience.path.join(' → ')} used ${usageCount} times`,
      confidence: Math.min(0.95, 0.6 + usageCount / 20),
      evidence: [experience.id],
      impact: usageCount > 10 ? 'high' : 'medium',
      actionable: true,
      timestamp: new Date(),
    };
  }

  /**
   * Create success pattern insight
   */
  private createSuccessPatternInsight(experience: Experience): Insight {
    if (experience.patterns && experience.patterns.length > 0) {
      const bestPattern = experience.patterns.reduce((best, current) => 
        (current.successRate || 0) > (best.successRate || 0) ? current : best
      );

      return {
        id: generateId('insight'),
        type: 'success_pattern',
        description: `High-success pattern identified: ${bestPattern.description} (${((bestPattern.successRate || 0) * 100).toFixed(1)}% success rate)`,
        confidence: bestPattern.confidence || 0.7,
        evidence: [experience.id],
        impact: (bestPattern.successRate || 0) > 0.9 ? 'high' : 'medium',
        actionable: true,
        timestamp: new Date(),
      };
    } else {
      // Create general success insight for experiences with high reinforcement
      return {
        id: generateId('insight'),
        type: 'success_pattern',
        description: `Successful pattern identified: ${experience.path.join(' → ')} with ${experience.context}`,
        confidence: Math.min(0.9, experience.reinforcement + 0.1),
        evidence: [experience.id],
        impact: experience.reinforcement > 0.7 ? 'high' : 'medium',
        actionable: true,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Create failure pattern insight
   */
  private createFailurePatternInsight(experience: Experience): Insight {
    return {
      id: generateId('insight'),
      type: 'failure_pattern',
      description: `Failed path identified: ${experience.path.join(' → ')} in ${experience.context}`,
      confidence: Math.min(0.8, (1 - experience.reinforcement) + 0.3),
      evidence: [experience.id],
      impact: experience.reinforcement < 0.3 ? 'high' : 'medium',
      actionable: true,
      timestamp: new Date(),
    };
  }

  /**
   * Create optimization insight from feedback
   */
  private createOptimizationInsight(experience: Experience, feedback: string): Insight {
    const sentiment = this.analyzeFeedbackSentiment(feedback);
    return {
      id: generateId('insight'),
      type: 'feedback_insight',
      description: `Performance concern identified: ${feedback}`,
      confidence: 0.7,
      evidence: [experience.id],
      impact: 'medium',
      actionable: true,
      timestamp: new Date(),
      sentiment,
    } as any; // Type assertion because Insight interface may not have sentiment yet
  }

  /**
   * Create warning insight from feedback
   */
  private createWarningInsight(experience: Experience, feedback: string): Insight {
    const sentiment = this.analyzeFeedbackSentiment(feedback);
    return {
      id: generateId('insight'),
      type: 'feedback_insight',
      description: `Issue detected in path: ${feedback}`,
      confidence: 0.8,
      evidence: [experience.id],
      impact: 'high',
      actionable: true,
      timestamp: new Date(),
      sentiment,
    } as any;
  }

  /**
   * Create discovery insight from feedback
   */
  private createDiscoveryInsight(experience: Experience, feedback: string): Insight {
    const sentiment = this.analyzeFeedbackSentiment(feedback);
    return {
      id: generateId('insight'),
      type: 'feedback_insight',
      description: `New pattern discovered: ${feedback}`,
      confidence: 0.75,
      evidence: [experience.id],
      impact: 'medium',
      actionable: false,
      timestamp: new Date(),
      sentiment,
    } as any;
  }

  /**
   * Check for optimization keywords in feedback
   */
  private containsOptimizationKeywords(feedback: string): boolean {
    const keywords = ['slow', 'inefficient', 'optimize', 'improve', 'faster', 'better', 'took too long', 'could be faster'];
    return keywords.some(keyword => feedback.includes(keyword));
  }

  /**
   * Check for warning keywords in feedback
   */
  private containsWarningKeywords(feedback: string): boolean {
    const keywords = ['error', 'failed', 'problem', 'issue', 'wrong', 'broken', 'confusing', 'difficult'];
    return keywords.some(keyword => feedback.includes(keyword));
  }

  /**
   * Check for discovery keywords in feedback
   */
  private containsDiscoveryKeywords(feedback: string): boolean {
    const keywords = ['found', 'discovered', 'new', 'interesting', 'unexpected', 'pattern', 'excellent', 'amazing', 'perfect', 'great'];
    return keywords.some(keyword => feedback.includes(keyword));
  }

  /**
   * Analyze sentiment of feedback text
   */
  analyzeFeedbackSentiment(feedback: string): number {
    if (!feedback.trim()) {
      return 0;
    }

    const feedbackLower = feedback.toLowerCase();
    let sentiment = 0;

    // Positive indicators with stronger weights
    const positiveWords = [
      { words: ['amazing', 'perfect', 'excellent', 'outstanding', 'exceeded'], weight: 0.4 },
      { words: ['great', 'good', 'efficient', 'smooth', 'successful'], weight: 0.3 },
      { words: ['fast', 'quick', 'easy'], weight: 0.2 }
    ];

    // Negative indicators with stronger weights
    const negativeWords = [
      { words: ['terrible', 'failed', 'completely', 'wasted', 'awful'], weight: -0.4 },
      { words: ['bad', 'poor', 'slow', 'confusing', 'problem'], weight: -0.3 },
      { words: ['error', 'issue', 'inefficient'], weight: -0.2 }
    ];

    // Neutral indicators that should reduce sentiment towards 0  
    const neutralWords = ['okay', 'fine', 'completed', 'successfully', 'nothing special', 'average'];
    let hasNeutralWords = false;

    // Check for neutral words
    for (const word of neutralWords) {
      if (feedbackLower.includes(word)) {
        hasNeutralWords = true;
        break;
      }
    }

    // Special case: if text is very simple and contains neutral completion words, treat as neutral
    const isSimpleCompletion = feedbackLower.match(/^(the\s+)?\w+\s+(completed|finished)\s+(successfully|fine|okay)\.?$/);
    if (isSimpleCompletion) {
      return 0;
    }

    // Apply positive sentiment
    for (const group of positiveWords) {
      for (const word of group.words) {
        if (feedbackLower.includes(word)) sentiment += group.weight;
      }
    }

    // Apply negative sentiment
    for (const group of negativeWords) {
      for (const word of group.words) {
        if (feedbackLower.includes(word)) sentiment += group.weight; // weight is already negative
      }
    }

    // If has neutral words but no strong sentiment, pull towards 0
    if (hasNeutralWords && Math.abs(sentiment) < 0.3) {
      sentiment *= 0.3; // Reduce sentiment towards 0
    }

    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Get all extracted insights
   */
  getAllInsights(): Insight[] {
    return Array.from(this.insights.values()).map(insight => ({ ...insight }));
  }

  /**
   * Get insights by type
   */
  getInsightsByType(type: Insight['type']): Insight[] {
    return Array.from(this.insights.values())
      .filter(insight => insight.type === type)
      .map(insight => ({ ...insight }));
  }

  /**
   * Get actionable insights
   */
  getActionableInsights(): Insight[] {
    return Array.from(this.insights.values())
      .filter(insight => insight.actionable)
      .sort((a, b) => b.confidence - a.confidence)
      .map(insight => ({ ...insight }));
  }

  /**
   * Get insights by impact level
   */
  getInsightsByImpact(impact: Insight['impact']): Insight[] {
    return Array.from(this.insights.values())
      .filter(insight => insight.impact === impact)
      .map(insight => ({ ...insight }));
  }

  /**
   * Prune old or low-confidence insights
   */
  pruneInsights(minConfidence = 0.5, maxAge = 7): number {
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, insight] of this.insights.entries()) {
      if (insight.confidence < minConfidence || insight.timestamp < cutoffDate) {
        this.insights.delete(id);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Clear all insights
   */
  clear(): void {
    this.insights.clear();
  }

  /**
   * Get insight statistics
   */
  getStatistics(): {
    totalInsights: number;
    totalInsightsExtracted: number;
    byType: Record<string, number>;
    byImpact: Record<string, number>;
    avgConfidence: number;
    averageConfidence: number;
    actionableCount: number;
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
  } {
    const insights = Array.from(this.insights.values());
    
    if (insights.length === 0) {
      return {
        totalInsights: 0,
        totalInsightsExtracted: 0,
        byType: {},
        byImpact: {},
        avgConfidence: 0,
        averageConfidence: 0,
        actionableCount: 0,
        sentimentDistribution: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
      };
    }

    const byType: Record<string, number> = {};
    const byImpact: Record<string, number> = {};
    let totalConfidence = 0;
    let actionableCount = 0;
    let positive = 0, negative = 0, neutral = 0;

    for (const insight of insights) {
      byType[insight.type] = (byType[insight.type] ?? 0) + 1;
      byImpact[insight.impact] = (byImpact[insight.impact] ?? 0) + 1;
      totalConfidence += insight.confidence;
      if (insight.actionable) actionableCount++;
      
      // Count sentiment distribution
      const sentiment = (insight as any).sentiment;
      if (typeof sentiment === 'number') {
        if (sentiment > 0.1) positive++;
        else if (sentiment < -0.1) negative++;
        else neutral++;
      }
    }

    const avgConfidence = totalConfidence / insights.length;

    return {
      totalInsights: insights.length,
      totalInsightsExtracted: insights.length,
      byType,
      byImpact,
      avgConfidence,
      averageConfidence: avgConfidence,
      actionableCount,
      sentimentDistribution: {
        positive,
        negative,
        neutral,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<InsightExtractorConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
  }
}