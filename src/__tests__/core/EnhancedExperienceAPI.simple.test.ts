/**
 * Focused tests for Enhanced Experience API core functionality
 * Tests key features of the enhanced Experience API implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowraCore } from '../../core/KnowraCore.js';

describe('Enhanced Experience API - Core Features', () => {
  let core: KnowraCore;
  let nodeIds: string[];

  beforeEach(() => {
    core = new KnowraCore();
    
    // Create test nodes and store their IDs
    nodeIds = [];
    for (let i = 1; i <= 5; i++) {
      const id = core.information.add(`Test node ${i}`, { type: 'test' });
      nodeIds.push(id);
    }
  });

  describe('Enhanced recordPath', () => {
    it('should record experience with enhanced features', () => {
      const path = [nodeIds[0], nodeIds[1], nodeIds[2]];
      const expId = core.experience.recordPath(
        path,
        'test exploration',
        'success',
        'Task completed successfully'
      );

      expect(expId).toMatch(/^exp_/);

      const experience = core.experience.getExperience(expId);
      expect(experience).toBeTruthy();
      expect(experience!.path).toEqual(path);
      expect(experience!.context).toBe('test exploration');
      expect(experience!.outcome).toBe('success');
      expect(experience!.feedback).toBe('Task completed successfully');
      expect(experience!.reinforcement).toBeGreaterThan(0.5);
      expect(experience!.patterns).toBeDefined();
      expect(experience!.insights).toBeDefined();
      expect(experience!.relatedExperiences).toBeDefined();
      expect(experience!.confidence).toBeGreaterThan(0);
    });

    it('should validate input parameters', () => {
      expect(() => core.experience.recordPath([], 'test', 'success')).toThrow(
        'Path must contain at least one node'
      );

      expect(() => core.experience.recordPath([nodeIds[0]], '', 'success')).toThrow(
        'Context must be a non-empty string'
      );

      expect(() => core.experience.recordPath([nodeIds[0]], 'test', 'invalid' as any)).toThrow(
        'Outcome must be success, failure, or neutral'
      );
    });

    it('should create patterns for longer paths', () => {
      const path = [nodeIds[0], nodeIds[1], nodeIds[2], nodeIds[3]];
      const expId = core.experience.recordPath(path, 'pattern test', 'success');

      const experience = core.experience.getExperience(expId);
      expect(experience!.patterns).toBeDefined();
      expect(experience!.patterns!.length).toBeGreaterThan(0);
    });
  });

  describe('Enhanced getExperiences with filtering', () => {
    beforeEach(() => {
      // Create diverse test experiences
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'shopping', 'success');
      core.experience.recordPath([nodeIds[1], nodeIds[2]], 'research', 'failure');
      core.experience.recordPath([nodeIds[0], nodeIds[2]], 'shopping', 'neutral');
    });

    it('should filter experiences by context', () => {
      const shoppingExperiences = core.experience.getExperiences({ context: 'shopping' });
      expect(shoppingExperiences.length).toBe(2);
      expect(shoppingExperiences.every(exp => exp.context === 'shopping')).toBe(true);
    });

    it('should filter experiences by outcome', () => {
      const successExperiences = core.experience.getExperiences({ outcome: 'success' });
      expect(successExperiences.length).toBe(1);
      expect(successExperiences[0].outcome).toBe('success');
    });

    it('should limit results', () => {
      const limitedExperiences = core.experience.getExperiences({ limit: 2 });
      expect(limitedExperiences.length).toBe(2);
    });

    it('should filter by node ID', () => {
      const nodeExperiences = core.experience.getExperiences({ nodeId: nodeIds[0] });
      expect(nodeExperiences.length).toBe(2);
      expect(nodeExperiences.every(exp => exp.path.includes(nodeIds[0]))).toBe(true);
    });
  });

  describe('Enhanced learnFrom', () => {
    let experienceId: string;

    beforeEach(() => {
      experienceId = core.experience.recordPath([nodeIds[0], nodeIds[1]], 'learning test', 'success');
    });

    it('should update experience with feedback', () => {
      core.experience.learnFrom(experienceId, 'This was an excellent path!');

      const experience = core.experience.getExperience(experienceId);
      expect(experience!.feedback).toBe('This was an excellent path!');
    });

    it('should adjust reinforcement based on feedback', () => {
      const initialReinforcement = core.experience.getExperience(experienceId)!.reinforcement;
      
      core.experience.learnFrom(experienceId, 'This was excellent and perfect!');
      
      const newReinforcement = core.experience.getExperience(experienceId)!.reinforcement;
      expect(newReinforcement).toBeGreaterThan(initialReinforcement);
    });

    it('should extract insights from feedback', () => {
      const initialInsights = core.experience.getExperience(experienceId)!.insights?.length ?? 0;
      
      core.experience.learnFrom(experienceId, 'This path had an error and failed');
      
      const experience = core.experience.getExperience(experienceId);
      const currentInsights = experience!.insights?.length ?? 0;
      expect(currentInsights).toBeGreaterThan(initialInsights);
    });

    it('should reject invalid input', () => {
      expect(() => core.experience.learnFrom(experienceId, '')).toThrow(
        'Feedback must be a non-empty string'
      );

      expect(() => core.experience.learnFrom('nonexistent', 'feedback')).toThrow(
        "Experience 'nonexistent' not found"
      );
    });
  });

  describe('reinforcePath', () => {
    beforeEach(() => {
      // Create some experiences to reinforce
      core.experience.recordPath([nodeIds[0], nodeIds[1], nodeIds[2]], 'test1', 'success');
      core.experience.recordPath([nodeIds[0], nodeIds[1], nodeIds[3]], 'test2', 'success');
    });

    it('should reinforce similar paths', () => {
      const path = [nodeIds[0], nodeIds[1], nodeIds[2]];
      core.experience.reinforcePath(path, 0.8);

      // Should complete without errors
    });

    it('should accept reinforcement options', () => {
      const path = [nodeIds[0], nodeIds[1]];
      
      core.experience.reinforcePath(path, 0.8, {
        updateGraphWeights: true,
        decayOldReinforcements: false,
        contextualMatching: true,
      });

      // Should complete without errors
    });
  });

  describe('getSuggestions', () => {
    beforeEach(() => {
      // Create experiences for suggestions
      core.experience.recordPath([nodeIds[0], nodeIds[1], nodeIds[2]], 'test1', 'success');
      core.experience.recordPath([nodeIds[0], nodeIds[1], nodeIds[3]], 'test2', 'success');
      core.experience.recordPath([nodeIds[0], nodeIds[4]], 'test3', 'failure');
    });

    it('should provide suggestions based on successful experiences', () => {
      const suggestions = core.experience.getSuggestions(nodeIds[0]);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.every(s => s.nodeId && typeof s.confidence === 'number')).toBe(true);
    });

    it('should respect suggestion options', () => {
      const suggestions = core.experience.getSuggestions(nodeIds[0], {
        limit: 2,
        minConfidence: 0.1,
        includeReasoningPath: true,
      });
      
      expect(suggestions.length).toBeLessThanOrEqual(2);
      if (suggestions.length > 0) {
        expect(suggestions[0].confidence).toBeGreaterThanOrEqual(0.1);
        expect(suggestions[0].reasoning).toBeDefined();
      }
    });

    it('should return empty array for non-existent node', () => {
      const suggestions = core.experience.getSuggestions('nonexistent');
      expect(suggestions).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Create diverse experiences for metrics
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'shopping', 'success');
      core.experience.recordPath([nodeIds[1], nodeIds[2]], 'research', 'failure');
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'shopping', 'success'); // Duplicate path
    });

    it('should provide comprehensive metrics', () => {
      const metrics = core.experience.getMetrics();
      
      expect(metrics.totalExperiences).toBe(3);
      expect(metrics.successRate).toBeCloseTo(2/3, 2); // 2 successes out of 3
      expect(metrics.avgTraversalTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(metrics.mostCommonPaths)).toBe(true);
      expect(Array.isArray(metrics.topPatterns)).toBe(true);
      expect(Array.isArray(metrics.recentTrends)).toBe(true);
      expect(typeof metrics.contextDistribution).toBe('object');
    });

    it('should identify most common paths', () => {
      const metrics = core.experience.getMetrics();
      
      expect(metrics.mostCommonPaths.length).toBeGreaterThan(0);
      // The duplicate path should be the most common
      expect(metrics.mostCommonPaths[0].frequency).toBe(2);
    });

    it('should show context distribution', () => {
      const metrics = core.experience.getMetrics();
      
      expect(metrics.contextDistribution.shopping).toBe(2);
      expect(metrics.contextDistribution.research).toBe(1);
    });
  });

  describe('Path Tracking Integration', () => {
    it('should integrate with PathTracker', () => {
      const pathId = core.experience.startPathTracking('test exploration', nodeIds[0]);
      expect(pathId).toMatch(/^path_/);

      core.experience.addToPath(pathId, nodeIds[1]);
      core.experience.addToPath(pathId, nodeIds[2]);

      const expId = core.experience.completePathTracking(pathId, 'success', 'Completed successfully');
      expect(expId).toMatch(/^exp_/);

      const experience = core.experience.getExperience(expId);
      expect(experience).toBeTruthy();
      expect(experience!.path).toEqual([nodeIds[0], nodeIds[1], nodeIds[2]]);
      expect(experience!.outcome).toBe('success');
    });

    it('should provide path tracking statistics', () => {
      const stats = core.experience.getPathTrackingStats();
      
      expect(stats).toHaveProperty('activePaths');
      expect(stats).toHaveProperty('completedPaths');
      expect(stats).toHaveProperty('totalPathsTracked');
      expect(stats).toHaveProperty('avgTraversalTime');
      expect(stats).toHaveProperty('successRate');
    });
  });

  describe('forgetOld - Experience Management', () => {
    beforeEach(() => {
      // Create experiences with different outcomes
      core.experience.recordPath([nodeIds[0]], 'test1', 'success');
      core.experience.recordPath([nodeIds[1]], 'test2', 'failure');
      core.experience.recordPath([nodeIds[2]], 'test3', 'neutral');
    });

    it('should forget experiences by outcome', () => {
      const beforeCount = core.experience.getExperiences().length;
      
      const removed = core.experience.forgetOld({ outcome: 'failure' });
      
      expect(removed).toBe(1);
      expect(core.experience.getExperiences().length).toBe(beforeCount - 1);
      
      const remainingFailures = core.experience.getExperiences({ outcome: 'failure' });
      expect(remainingFailures.length).toBe(0);
    });

    it('should limit removal count', () => {
      // Add more success experiences
      core.experience.recordPath([nodeIds[3]], 'extra1', 'success');
      core.experience.recordPath([nodeIds[4]], 'extra2', 'success');
      
      const removed = core.experience.forgetOld({ 
        outcome: 'success',
        maxToRemove: 1 
      });
      
      expect(removed).toBe(1);
      
      // Should still have some success experiences
      const remaining = core.experience.getExperiences({ outcome: 'success' });
      expect(remaining.length).toBeGreaterThan(0);
    });
  });
});