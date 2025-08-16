/**
 * Comprehensive tests for PathTracker
 * Tests path recording lifecycle, timing accuracy, concurrent tracking, and outcome detection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PathTracker } from '../../core/experience/PathTracker.js';
import type { ActivePath, PathTrackingOptions } from '../../core/experience/PathTracker.js';

describe('PathTracker', () => {
  let pathTracker: PathTracker;
  let mockNodeValidator: (nodeId: string) => boolean;

  beforeEach(() => {
    // Mock performance.now for consistent timing tests
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    
    // Mock node validator
    mockNodeValidator = vi.fn((nodeId: string) => {
      return ['node1', 'node2', 'node3', 'start', 'middle', 'end', 'goal', 'task_complete'].includes(nodeId) || 
             nodeId.startsWith('node') || // Allow node1, node2, etc.
             nodeId.includes('complete'); // Allow completion-related nodes
    });

    pathTracker = new PathTracker({}, mockNodeValidator);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Path Lifecycle Management', () => {
    it('should start a new path with context', () => {
      const pathId = pathTracker.startPath('test exploration');
      
      expect(pathId).toMatch(/^path_/);
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath).toBeTruthy();
      expect(activePath?.context).toBe('test exploration');
      expect(activePath?.nodes).toEqual([]);
      expect(activePath?.paused).toBe(false);
    });

    it('should start path with initial node', () => {
      const pathId = pathTracker.startPath('test exploration', 'start');
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.nodes).toEqual(['start']);
    });

    it('should start path with metadata', () => {
      const metadata = { userId: 'user123', sessionId: 'session456' };
      const pathId = pathTracker.startPath('test exploration', 'start', metadata);
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.metadata).toEqual(metadata);
    });

    it('should reject invalid context', () => {
      expect(() => pathTracker.startPath('')).toThrow('Context must be a non-empty string');
      expect(() => pathTracker.startPath('   ')).toThrow('Context must be a non-empty string');
    });

    it('should reject invalid initial node when validation enabled', () => {
      expect(() => pathTracker.startPath('test', 'invalid_node')).toThrow(
        "Initial node 'invalid_node' does not exist"
      );
    });

    it('should allow invalid initial node when validation disabled', () => {
      const tracker = new PathTracker({ validateNodes: false }, mockNodeValidator);
      const pathId = tracker.startPath('test', 'invalid_node');
      
      const activePath = tracker.getActivePath(pathId);
      expect(activePath?.nodes).toEqual(['invalid_node']);
    });

    it('should enforce concurrent path limit', () => {
      const tracker = new PathTracker({ maxConcurrentPaths: 2 });
      
      tracker.startPath('path 1');
      tracker.startPath('path 2');
      
      expect(() => tracker.startPath('path 3')).toThrow(
        'Maximum concurrent paths (2) exceeded'
      );
    });
  });

  describe('Node Addition', () => {
    let pathId: string;

    beforeEach(() => {
      pathId = pathTracker.startPath('test exploration', 'start');
    });

    it('should add nodes to active path', () => {
      pathTracker.addNode(pathId, 'middle');
      pathTracker.addNode(pathId, 'end');
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.nodes).toEqual(['start', 'middle', 'end']);
    });

    it('should add node with metadata', () => {
      const stepMetadata = { action: 'search', query: 'test' };
      pathTracker.addNode(pathId, 'middle', stepMetadata);
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.metadata?.step_1).toEqual(stepMetadata);
    });

    it('should reject adding node to non-existent path', () => {
      expect(() => pathTracker.addNode('invalid_path', 'node1')).toThrow(
        "Active path 'invalid_path' not found"
      );
    });

    it('should reject adding node to paused path', () => {
      pathTracker.pausePath(pathId);
      
      expect(() => pathTracker.addNode(pathId, 'middle')).toThrow(
        `Cannot add node to paused path '${pathId}'`
      );
    });

    it('should reject invalid node when validation enabled', () => {
      expect(() => pathTracker.addNode(pathId, 'invalid_node')).toThrow(
        "Node 'invalid_node' does not exist"
      );
    });

    it('should reject empty node ID', () => {
      expect(() => pathTracker.addNode(pathId, '')).toThrow(
        'Node ID must be a non-empty string'
      );
      expect(() => pathTracker.addNode(pathId, '   ')).toThrow(
        'Node ID must be a non-empty string'
      );
    });

    it('should trim node IDs', () => {
      pathTracker.addNode(pathId, '  middle  ');
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.nodes).toEqual(['start', 'middle']);
    });
  });

  describe('Path Pause and Resume', () => {
    let pathId: string;

    beforeEach(() => {
      pathId = pathTracker.startPath('test exploration', 'start');
    });

    it('should pause and resume path', () => {
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.paused).toBe(false);
      
      pathTracker.pausePath(pathId);
      const pausedPath = pathTracker.getActivePath(pathId);
      expect(pausedPath?.paused).toBe(true);
      
      pathTracker.resumePath(pathId);
      const resumedPath = pathTracker.getActivePath(pathId);
      expect(resumedPath?.paused).toBe(false);
    });

    it('should handle double pause gracefully', () => {
      pathTracker.pausePath(pathId);
      pathTracker.pausePath(pathId); // Should not throw
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.paused).toBe(true);
    });

    it('should handle double resume gracefully', () => {
      pathTracker.resumePath(pathId); // Already not paused
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.paused).toBe(false);
    });

    it('should reject pause/resume of non-existent path', () => {
      expect(() => pathTracker.pausePath('invalid_path')).toThrow(
        "Active path 'invalid_path' not found"
      );
      expect(() => pathTracker.resumePath('invalid_path')).toThrow(
        "Active path 'invalid_path' not found"
      );
    });
  });

  describe('Path Completion', () => {
    let pathId: string;

    beforeEach(() => {
      pathId = pathTracker.startPath('test exploration', 'start');
      pathTracker.addNode(pathId, 'middle');
      pathTracker.addNode(pathId, 'end');
    });

    it('should complete path and create experience', () => {
      vi.spyOn(performance, 'now').mockReturnValue(3500); // 2500ms elapsed
      
      const experience = pathTracker.completePath(pathId, 'success', 'Task completed successfully');
      
      expect(experience.id).toMatch(/^exp_/);
      expect(experience.path).toEqual(['start', 'middle', 'end']);
      expect(experience.context).toBe('test exploration');
      expect(experience.outcome).toBe('success');
      expect(experience.feedback).toBe('Task completed successfully');
      expect(experience.traversalTime).toBe(2500);
      expect(experience.reinforcement).toBeGreaterThan(0.5); // Success should have higher reinforcement
      expect(experience.confidence).toBeGreaterThan(0);
      
      // Path should be removed from active paths
      expect(pathTracker.getActivePath(pathId)).toBeNull();
    });

    it('should complete path without feedback', () => {
      const experience = pathTracker.completePath(pathId, 'neutral');
      
      expect(experience.outcome).toBe('neutral');
      expect(experience.feedback).toBeUndefined();
    });

    it('should calculate different reinforcement for different outcomes', () => {
      const pathId2 = pathTracker.startPath('test 2', 'start');
      pathTracker.addNode(pathId2, 'end');
      
      const pathId3 = pathTracker.startPath('test 3', 'start');
      pathTracker.addNode(pathId3, 'end');

      const successExp = pathTracker.completePath(pathId, 'success');
      const failureExp = pathTracker.completePath(pathId2, 'failure');
      const neutralExp = pathTracker.completePath(pathId3, 'neutral');
      
      expect(successExp.reinforcement).toBeGreaterThan(failureExp.reinforcement);
      expect(successExp.reinforcement).toBeGreaterThan(neutralExp.reinforcement);
      expect(neutralExp.reinforcement).toBeGreaterThan(failureExp.reinforcement);
    });

    it('should reject completion of path with no nodes', () => {
      const emptyPathId = pathTracker.startPath('empty path');
      
      expect(() => pathTracker.completePath(emptyPathId, 'success')).toThrow(
        `Cannot complete path '${emptyPathId}' with no nodes`
      );
    });

    it('should reject completion of non-existent path', () => {
      expect(() => pathTracker.completePath('invalid_path', 'success')).toThrow(
        "Active path 'invalid_path' not found"
      );
    });

    it('should handle paused time correctly', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // start
        .mockReturnValueOnce(2000) // pause
        .mockReturnValueOnce(4000) // resume (2000ms paused)
        .mockReturnValueOnce(5000); // complete (1000ms active after resume)
      
      const newPathId = pathTracker.startPath('pause test', 'start');
      pathTracker.addNode(newPathId, 'middle');
      
      // Simulate pause
      performance.now(); // 2000 - trigger pause timing
      pathTracker.pausePath(newPathId);
      
      // Simulate resume
      performance.now(); // 4000 - trigger resume timing
      pathTracker.resumePath(newPathId);
      
      pathTracker.addNode(newPathId, 'end');
      
      // Complete path
      const experience = pathTracker.completePath(newPathId, 'success');
      
      // Total active time should be 4000ms (5000 - 1000), not including pause
      expect(experience.traversalTime).toBe(4000);
    });
  });

  describe('Path Cancellation', () => {
    it('should cancel active path', () => {
      const pathId = pathTracker.startPath('test exploration', 'start');
      
      expect(pathTracker.getActivePath(pathId)).toBeTruthy();
      
      pathTracker.cancelPath(pathId);
      
      expect(pathTracker.getActivePath(pathId)).toBeNull();
    });

    it('should reject cancellation of non-existent path', () => {
      expect(() => pathTracker.cancelPath('invalid_path')).toThrow(
        "Active path 'invalid_path' not found"
      );
    });
  });

  describe('Goal Setting and Auto-Detection', () => {
    let pathId: string;

    beforeEach(() => {
      pathId = pathTracker.startPath('goal-oriented exploration', 'start');
    });

    it('should set and track path goals', () => {
      pathTracker.setPathGoal(pathId, 'reach the goal node');
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.goal).toBe('reach the goal node');
    });

    it('should auto-detect goal achievement', () => {
      pathTracker.setPathGoal(pathId, 'find goal');
      pathTracker.addNode(pathId, 'goal'); // Should trigger expectedOutcome
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.expectedOutcome).toBe('success');
    });

    it('should detect completion keywords', () => {
      pathTracker.setPathGoal(pathId, 'complete the task');
      pathTracker.addNode(pathId, 'task_complete'); // Should trigger expectedOutcome
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.expectedOutcome).toBe('success');
    });

    it('should reject goal setting for non-existent path', () => {
      expect(() => pathTracker.setPathGoal('invalid_path', 'goal')).toThrow(
        "Active path 'invalid_path' not found"
      );
    });
  });

  describe('Concurrent Path Tracking', () => {
    it('should track multiple paths simultaneously', () => {
      const path1 = pathTracker.startPath('exploration 1', 'start');
      const path2 = pathTracker.startPath('exploration 2', 'node1');
      const path3 = pathTracker.startPath('exploration 3', 'node2');
      
      pathTracker.addNode(path1, 'middle');
      pathTracker.addNode(path2, 'node2');
      pathTracker.addNode(path3, 'node3');
      
      const activePaths = pathTracker.getActivePaths();
      expect(activePaths).toHaveLength(3);
      
      // Verify each path maintains its own state
      expect(activePaths.find(p => p.id === path1)?.nodes).toEqual(['start', 'middle']);
      expect(activePaths.find(p => p.id === path2)?.nodes).toEqual(['node1', 'node2']);
      expect(activePaths.find(p => p.id === path3)?.nodes).toEqual(['node2', 'node3']);
    });

    it('should complete paths independently', () => {
      const path1 = pathTracker.startPath('exploration 1', 'start');
      const path2 = pathTracker.startPath('exploration 2', 'node1');
      
      pathTracker.addNode(path1, 'end');
      pathTracker.addNode(path2, 'node2');
      
      // Complete first path
      const exp1 = pathTracker.completePath(path1, 'success');
      
      // Second path should still be active
      expect(pathTracker.getActivePath(path2)).toBeTruthy();
      expect(pathTracker.getActivePaths()).toHaveLength(1);
      
      // Complete second path
      const exp2 = pathTracker.completePath(path2, 'failure');
      
      expect(pathTracker.getActivePaths()).toHaveLength(0);
      expect(pathTracker.getCompletedExperiences()).toHaveLength(2);
    });
  });

  describe('Cleanup and Maintenance', () => {
    beforeEach(() => {
      // Mock Date.now for consistent timestamps
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clean up inactive paths', () => {
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // start time
        .mockReturnValueOnce(1000) // lastNodeTime set to start
        .mockReturnValueOnce(400000); // cleanup time (300+ seconds later)
      
      const pathId = pathTracker.startPath('test', 'start');
      performance.now(); // Set lastNodeTime
      
      // Fast forward time for cleanup
      const cleaned = pathTracker.cleanupInactivePaths();
      
      expect(cleaned).toBe(1);
      expect(pathTracker.getActivePath(pathId)).toBeNull();
      expect(pathTracker.getCompletedExperiences()).toHaveLength(1);
    });

    it('should not clean up recently active paths', () => {
      const pathId = pathTracker.startPath('test', 'start');
      
      const cleaned = pathTracker.cleanupInactivePaths();
      
      expect(cleaned).toBe(0);
      expect(pathTracker.getActivePath(pathId)).toBeTruthy();
    });

    it('should clear completed experiences', () => {
      const pathId = pathTracker.startPath('test', 'start');
      pathTracker.addNode(pathId, 'end');
      pathTracker.completePath(pathId, 'success');
      
      expect(pathTracker.getCompletedExperiences()).toHaveLength(1);
      
      pathTracker.clearCompleted();
      
      expect(pathTracker.getCompletedExperiences()).toHaveLength(0);
    });
  });

  describe('Statistics and Reporting', () => {
    it('should provide accurate statistics', () => {
      // Create some paths and experiences
      const path1 = pathTracker.startPath('test 1', 'start');
      const path2 = pathTracker.startPath('test 2', 'start');
      
      pathTracker.addNode(path1, 'end');
      pathTracker.addNode(path2, 'middle');
      
      // Complete one path
      vi.spyOn(performance, 'now').mockReturnValue(3000); // 2000ms elapsed
      pathTracker.completePath(path1, 'success');
      
      const stats = pathTracker.getStatistics();
      
      expect(stats.activePaths).toBe(1);
      expect(stats.completedPaths).toBe(1);
      expect(stats.totalPathsTracked).toBe(2);
      expect(stats.avgTraversalTime).toBe(2000);
      expect(stats.successRate).toBe(1.0);
    });

    it('should handle empty statistics', () => {
      const stats = pathTracker.getStatistics();
      
      expect(stats.activePaths).toBe(0);
      expect(stats.completedPaths).toBe(0);
      expect(stats.totalPathsTracked).toBe(0);
      expect(stats.avgTraversalTime).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      // Create multiple experiences with different outcomes
      const paths = Array.from({ length: 4 }, (_, i) => {
        const pathId = pathTracker.startPath(`test ${i}`, 'start');
        pathTracker.addNode(pathId, 'end');
        return pathId;
      });
      
      pathTracker.completePath(paths[0], 'success');
      pathTracker.completePath(paths[1], 'success');
      pathTracker.completePath(paths[2], 'failure');
      pathTracker.completePath(paths[3], 'neutral');
      
      const stats = pathTracker.getStatistics();
      expect(stats.successRate).toBe(0.5); // 2 successes out of 4
    });
  });

  describe('Configuration Options', () => {
    it('should respect maxConcurrentPaths option', () => {
      const tracker = new PathTracker({ maxConcurrentPaths: 1 });
      
      tracker.startPath('path 1');
      expect(() => tracker.startPath('path 2')).toThrow('Maximum concurrent paths (1) exceeded');
    });

    it('should respect validateNodes option', () => {
      const tracker = new PathTracker({ validateNodes: false }, mockNodeValidator);
      
      // Should not validate nodes when disabled
      const pathId = tracker.startPath('test', 'invalid_node');
      tracker.addNode(pathId, 'another_invalid_node');
      
      const activePath = tracker.getActivePath(pathId);
      expect(activePath?.nodes).toEqual(['invalid_node', 'another_invalid_node']);
    });

    it('should work without node validator', () => {
      const tracker = new PathTracker();
      
      const pathId = tracker.startPath('test', 'any_node');
      tracker.addNode(pathId, 'any_other_node');
      
      const activePath = tracker.getActivePath(pathId);
      expect(activePath?.nodes).toEqual(['any_node', 'any_other_node']);
    });
  });

  describe('Data Integrity and Edge Cases', () => {
    it('should return deep copies of active paths', () => {
      const pathId = pathTracker.startPath('test', 'start', { key: 'value' });
      
      const activePath1 = pathTracker.getActivePath(pathId);
      const activePath2 = pathTracker.getActivePath(pathId);
      
      // Should be different objects
      expect(activePath1).not.toBe(activePath2);
      expect(activePath1?.metadata).not.toBe(activePath2?.metadata);
      
      // But with same content
      expect(activePath1).toEqual(activePath2);
    });

    it('should handle timing edge cases', () => {
      vi.spyOn(performance, 'now').mockReturnValue(0); // Start at 0
      
      const pathId = pathTracker.startPath('test', 'start');
      pathTracker.addNode(pathId, 'end');
      
      // Complete immediately (0ms elapsed)
      const experience = pathTracker.completePath(pathId, 'success');
      
      expect(experience.traversalTime).toBe(0);
      expect(experience.reinforcement).toBeGreaterThan(0);
    });

    it('should trim context strings', () => {
      const pathId = pathTracker.startPath('  test context  ');
      
      const activePath = pathTracker.getActivePath(pathId);
      expect(activePath?.context).toBe('test context');
    });

    it('should handle very long paths', () => {
      const pathId = pathTracker.startPath('long path test', 'start');
      
      // Add many nodes
      for (let i = 1; i <= 25; i++) {
        pathTracker.addNode(pathId, `node${i}`);
      }
      
      const experience = pathTracker.completePath(pathId, 'success');
      
      expect(experience.path).toHaveLength(26); // start + 25 nodes
      expect(experience.confidence).toBeLessThan(1); // Should have lower confidence for very long paths
    });
  });
});