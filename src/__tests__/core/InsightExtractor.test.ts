/**
 * Tests for InsightExtractor service
 * Verifies insight extraction functionality from experiences
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InsightExtractor } from '../../core/levels/experience/InsightExtractor.js';
import type { Experience } from '../../core/types.js';

describe('InsightExtractor', () => {
  let extractor: InsightExtractor;
  let sampleExperience: Experience;
  let allExperiences: Map<string, Experience>;

  beforeEach(() => {
    extractor = new InsightExtractor({
      minConfidenceThreshold: 0.3,
      sentimentAnalysisEnabled: true,
      patternDetectionEnabled: true,
    });

    sampleExperience = {
      id: 'exp-1',
      path: ['start', 'process', 'complete'],
      context: 'workflow testing',
      outcome: 'success',
      reinforcement: 0.8,
      timestamp: new Date(),
      confidence: 0.7,
      feedback: 'Great workflow, very efficient process',
    };

    allExperiences = new Map();
    allExperiences.set('exp-1', sampleExperience);
    allExperiences.set('exp-2', {
      id: 'exp-2',
      path: ['start', 'analyze', 'complete'],
      context: 'data analysis',
      outcome: 'success',
      reinforcement: 0.6,
      timestamp: new Date(),
      confidence: 0.5,
    });
  });

  describe('Basic Insight Extraction', () => {
    it('should extract insights from experience', () => {
      const insights = extractor.extractInsights(sampleExperience);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('success_pattern');
      expect(insights[0].confidence).toBeGreaterThan(0);
      expect(insights[0].description).toContain('Successful');
    });

    it('should extract insights from experience with related experiences', () => {
      const insights = extractor.extractInsights(sampleExperience, allExperiences);

      expect(insights.length).toBeGreaterThanOrEqual(1);
      expect(insights.some(insight => insight.type === 'success_pattern')).toBe(true);
    });

    it('should handle experience without feedback', () => {
      const expWithoutFeedback = { ...sampleExperience, feedback: undefined };
      const insights = extractor.extractInsights(expWithoutFeedback);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('success_pattern');
    });

    it('should handle failed experiences', () => {
      const failedExperience = {
        ...sampleExperience,
        outcome: 'failure' as const,
        reinforcement: 0.2,
        feedback: 'This approach did not work well',
      };

      const insights = extractor.extractInsights(failedExperience);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('failure_pattern');
      expect(insights[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('Feedback-based Insights', () => {
    it('should extract insights from positive feedback', () => {
      const insights = extractor.extractInsightsFromFeedback(
        sampleExperience,
        'Excellent workflow, very smooth and efficient'
      );

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('feedback_insight');
      expect(insights[0].confidence).toBeGreaterThan(0.5);
      expect(insights[0].sentiment).toBeGreaterThan(0);
    });

    it('should extract insights from negative feedback', () => {
      const insights = extractor.extractInsightsFromFeedback(
        sampleExperience,
        'This process was confusing and took too long'
      );

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('feedback_insight');
      expect(insights[0].confidence).toBeGreaterThan(0);
      expect(insights[0].sentiment).toBeLessThan(0);
    });

    it('should handle neutral feedback', () => {
      const insights = extractor.extractInsightsFromFeedback(
        sampleExperience,
        'The process was okay, nothing special'
      );

      expect(insights).toHaveLength(1);
      expect(insights[0].sentiment).toBeCloseTo(0, 1);
    });

    it('should handle empty feedback', () => {
      const insights = extractor.extractInsightsFromFeedback(sampleExperience, '');

      expect(insights).toHaveLength(0);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should analyze positive sentiment correctly', () => {
      const sentiment = extractor.analyzeFeedbackSentiment(
        'Amazing work! This was perfect and exceeded expectations.'
      );

      expect(sentiment).toBeGreaterThan(0.5);
    });

    it('should analyze negative sentiment correctly', () => {
      const sentiment = extractor.analyzeFeedbackSentiment(
        'Terrible experience, failed completely and wasted time.'
      );

      expect(sentiment).toBeLessThan(-0.5);
    });

    it('should handle neutral sentiment', () => {
      const sentiment = extractor.analyzeFeedbackSentiment(
        'The process completed successfully.'
      );

      expect(sentiment).toBeCloseTo(0, 1);
    });

    it('should handle empty or short text', () => {
      expect(extractor.analyzeFeedbackSentiment('')).toBe(0);
      expect(extractor.analyzeFeedbackSentiment('ok')).toBeCloseTo(0, 1);
    });
  });

  describe('Pattern Detection', () => {
    it('should detect success patterns from multiple experiences', () => {
      const successExp1 = {
        ...sampleExperience,
        id: 'success-1',
        path: ['init', 'process', 'validate', 'complete'],
        reinforcement: 0.9,
      };

      const successExp2 = {
        ...sampleExperience,
        id: 'success-2',
        path: ['init', 'analyze', 'validate', 'complete'],
        reinforcement: 0.8,
      };

      const experiences = new Map([
        ['success-1', successExp1],
        ['success-2', successExp2],
      ]);

      const insights = extractor.extractInsights(successExp1, experiences);

      expect(insights.some(insight => 
        insight.type === 'success_pattern' && 
        insight.description.includes('pattern')
      )).toBe(true);
    });

    it('should detect failure patterns', () => {
      const failureExp = {
        ...sampleExperience,
        outcome: 'failure' as const,
        reinforcement: 0.1,
        path: ['start', 'skip_validation', 'complete'],
      };

      const insights = extractor.extractInsights(failureExp);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('failure_pattern');
    });
  });

  describe('Configuration', () => {
    it('should respect confidence threshold', () => {
      const strictExtractor = new InsightExtractor({
        minConfidenceThreshold: 0.9,
      });

      const lowConfidenceExp = {
        ...sampleExperience,
        confidence: 0.3,
        reinforcement: 0.3,
      };

      const insights = strictExtractor.extractInsights(lowConfidenceExp);

      // Should have fewer insights due to high threshold
      expect(insights.length).toBeLessThanOrEqual(1);
    });

    it('should handle disabled sentiment analysis', () => {
      const basicExtractor = new InsightExtractor({
        sentimentAnalysisEnabled: false,
      });

      const insights = basicExtractor.extractInsightsFromFeedback(
        sampleExperience,
        'Great feedback here'
      );

      expect(insights.every(insight => insight.sentiment === undefined)).toBe(true);
    });

    it('should handle disabled pattern detection', () => {
      const basicExtractor = new InsightExtractor({
        patternDetectionEnabled: false,
      });

      const insights = basicExtractor.extractInsights(sampleExperience, allExperiences);

      // Should still extract basic insights but no pattern-based ones
      expect(insights.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle experience with empty path', () => {
      const emptyPathExp = {
        ...sampleExperience,
        path: [],
      };

      const insights = extractor.extractInsights(emptyPathExp);

      expect(insights).toHaveLength(1);
      expect(insights[0].confidence).toBeGreaterThan(0);
    });

    it('should handle experience with very low reinforcement', () => {
      const lowReinforcementExp = {
        ...sampleExperience,
        reinforcement: 0.01,
        outcome: 'failure' as const,
      };

      const insights = extractor.extractInsights(lowReinforcementExp);

      expect(insights).toHaveLength(1);
      expect(insights[0].type).toBe('failure_pattern');
    });

    it('should handle special characters in feedback', () => {
      const specialFeedback = 'Great work! 🎉 This is 100% perfect & amazing!!!';
      
      const insights = extractor.extractInsightsFromFeedback(sampleExperience, specialFeedback);

      expect(insights).toHaveLength(1);
      expect(insights[0].sentiment).toBeGreaterThan(0);
    });

    it('should handle very long feedback', () => {
      const longFeedback = 'This is a very long feedback '.repeat(100);
      
      const insights = extractor.extractInsightsFromFeedback(sampleExperience, longFeedback);

      expect(insights).toHaveLength(1);
      expect(insights[0].confidence).toBeGreaterThan(0);
    });
  });

  describe('Statistics and Metrics', () => {
    it('should provide statistics about extraction', () => {
      // Extract insights from multiple experiences
      extractor.extractInsights(sampleExperience, allExperiences);
      extractor.extractInsightsFromFeedback(sampleExperience, 'Good feedback');

      const stats = extractor.getStatistics();

      expect(stats.totalInsightsExtracted).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.sentimentDistribution).toBeDefined();
    });

    it('should update configuration successfully', () => {
      extractor.updateConfig({
        minConfidenceThreshold: 0.5,
        sentimentAnalysisEnabled: false,
      });

      const insights = extractor.extractInsightsFromFeedback(
        sampleExperience,
        'Test feedback'
      );

      expect(insights.every(insight => insight.sentiment === undefined)).toBe(true);
    });
  });
});