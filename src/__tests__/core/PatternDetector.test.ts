/**
 * Tests for PatternDetector service
 * Verifies pattern detection, creation, and management functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetector } from '../../core/levels/experience/PatternDetector.js';

describe('PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector({
      minPathLength: 3,
      similarityThreshold: 0.5, // Lower threshold to detect similar patterns
      maxPatternsPerDetection: 5,
    });
  });

  describe('Pattern Detection', () => {
    it('should detect patterns from paths', () => {
      const path = ['start', 'middle', 'end', 'finish'];
      const context = 'test workflow';

      const patterns = detector.detectPatterns(path, context);

      expect(patterns).toHaveLength(1);
      expect(patterns[0].nodes).toEqual(path);
      expect(patterns[0].contexts).toContain(context);
      expect(patterns[0].frequency).toBe(1);
    });

    it('should not create patterns for short paths', () => {
      const shortPath = ['start', 'end'];
      const context = 'short workflow';

      const patterns = detector.detectPatterns(shortPath, context);

      expect(patterns).toHaveLength(0);
    });

    it('should update frequency for similar paths', () => {
      const path1 = ['start', 'middle', 'end'];
      const path2 = ['start', 'middle', 'finish'];
      const context = 'similar workflow';

      // First detection creates pattern
      const patterns1 = detector.detectPatterns(path1, context);
      expect(patterns1).toHaveLength(1);
      expect(patterns1[0].frequency).toBe(1);

      // Second detection with similar path should update frequency
      const patterns2 = detector.detectPatterns(path2, context);
      expect(patterns2).toHaveLength(1);
      expect(patterns2[0].frequency).toBe(2);
    });

    it('should handle different contexts', () => {
      const path = ['start', 'process', 'complete'];
      
      detector.detectPatterns(path, 'context1');
      detector.detectPatterns(path, 'context2');

      const allPatterns = detector.getAllPatterns();
      expect(allPatterns).toHaveLength(1);
      expect(allPatterns[0].contexts).toEqual(['context1', 'context2']);
    });
  });

  describe('Path Similarity Calculation', () => {
    it('should calculate similarity correctly', () => {
      // Create initial pattern
      detector.detectPatterns(['a', 'b', 'c'], 'test');
      
      // Test with identical path
      const identical = detector.detectPatterns(['a', 'b', 'c'], 'test');
      expect(identical).toHaveLength(1);
      expect(identical[0].frequency).toBe(2);

      // Test with similar path
      const similar = detector.detectPatterns(['a', 'b', 'd'], 'test');
      expect(similar).toHaveLength(1);
      expect(similar[0].frequency).toBe(3);
    });

    it('should handle completely different paths', () => {
      detector.detectPatterns(['a', 'b', 'c'], 'test1');
      const different = detector.detectPatterns(['x', 'y', 'z'], 'test2');

      const allPatterns = detector.getAllPatterns();
      expect(allPatterns).toHaveLength(2);
    });
  });

  describe('Pattern Management', () => {
    beforeEach(() => {
      // Create some test patterns
      detector.detectPatterns(['path1', 'step1', 'step2'], 'workflow1');
      detector.detectPatterns(['path2', 'step1', 'step3'], 'workflow2');
      detector.detectPatterns(['path3', 'step4', 'step5'], 'workflow1');
    });

    it('should get patterns by context', () => {
      const workflow1Patterns = detector.getPatternsByContext('workflow1');
      expect(workflow1Patterns).toHaveLength(2);

      const workflow2Patterns = detector.getPatternsByContext('workflow2');
      expect(workflow2Patterns).toHaveLength(1);
    });

    it('should update pattern statistics', () => {
      const patterns = detector.getAllPatterns();
      const patternId = patterns[0].id;

      detector.updatePatternStats(patternId, 2000, true);
      
      const updatedPattern = detector.getPattern(patternId);
      expect(updatedPattern?.avgTraversalTime).toBe(2000);
      expect(updatedPattern?.successRate).toBe(1.0);

      // Update again with failure
      detector.updatePatternStats(patternId, 3000, false);
      
      const finalPattern = detector.getPattern(patternId);
      expect(finalPattern?.avgTraversalTime).toBe(2500); // Average of 2000 and 3000
      expect(finalPattern?.successRate).toBe(0.5); // 1 success out of 2 total
    });

    it('should prune old patterns', () => {
      const initialCount = detector.getAllPatterns().length;
      expect(initialCount).toBe(3);

      // Prune with very high confidence threshold
      const removed = detector.prunePatterns(0.9);
      expect(removed).toBeGreaterThan(0);
      expect(detector.getAllPatterns().length).toBeLessThan(initialCount);
    });

    it('should provide statistics', () => {
      const stats = detector.getStatistics();

      expect(stats.totalPatterns).toBe(3);
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.avgFrequency).toBeGreaterThan(0);
      expect(stats.mostCommonContext).toBe('workflow1');
    });

    it('should clear all patterns', () => {
      expect(detector.getAllPatterns().length).toBe(3);
      
      detector.clear();
      
      expect(detector.getAllPatterns().length).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should respect custom configuration', () => {
      const customDetector = new PatternDetector({
        minPathLength: 2,
        similarityThreshold: 0.8,
        maxPatternsPerDetection: 2,
      });

      // Should create pattern with length 2
      const patterns = customDetector.detectPatterns(['a', 'b'], 'test');
      expect(patterns).toHaveLength(1);
    });

    it('should limit number of patterns returned', () => {
      const limitedDetector = new PatternDetector({
        maxPatternsPerDetection: 1,
      });

      // Create multiple patterns that could be detected
      limitedDetector.detectPatterns(['a', 'b', 'c'], 'test1');
      limitedDetector.detectPatterns(['a', 'b', 'd'], 'test2');
      
      // Should only return 1 pattern due to limit
      const patterns = limitedDetector.detectPatterns(['a', 'b', 'e'], 'test3');
      expect(patterns.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty paths', () => {
      const patterns = detector.detectPatterns([], 'empty');
      expect(patterns).toHaveLength(0);
    });

    it('should handle single node paths', () => {
      const patterns = detector.detectPatterns(['single'], 'single');
      expect(patterns).toHaveLength(0);
    });

    it('should handle empty context', () => {
      const patterns = detector.detectPatterns(['a', 'b', 'c'], '');
      expect(patterns).toHaveLength(1);
      expect(patterns[0].contexts).toContain('');
    });

    it('should handle very long paths', () => {
      const longPath = Array.from({ length: 50 }, (_, i) => `node${i}`);
      const patterns = detector.detectPatterns(longPath, 'long');
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].nodes).toEqual(longPath);
    });

    it('should handle duplicate nodes in path', () => {
      const pathWithDuplicates = ['a', 'b', 'a', 'c'];
      const patterns = detector.detectPatterns(pathWithDuplicates, 'duplicates');
      
      expect(patterns).toHaveLength(1);
      expect(patterns[0].nodes).toEqual(pathWithDuplicates);
    });
  });
});