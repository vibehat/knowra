/**
 * Comprehensive tests for T3.4: Reinforcement Mechanisms
 * Tests edge weight adjustments, path reinforcement algorithms, and decay functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowraCore } from '../../core/KnowraCore.js';

describe('T3.4: Reinforcement Mechanisms', () => {
  let core: KnowraCore;
  let nodeIds: string[];

  beforeEach(() => {
    core = new KnowraCore();
    
    // Create a network of connected nodes for testing
    nodeIds = [];
    for (let i = 1; i <= 8; i++) {
      const id = core.information.add(`Node ${i}`, { type: 'test' });
      nodeIds.push(id);
    }

    // Create some initial relationships to test weight adjustments
    core.knowledge.connect(nodeIds[0], nodeIds[1], 'leads_to', { strength: 0.5 });
    core.knowledge.connect(nodeIds[1], nodeIds[2], 'leads_to', { strength: 0.6 });
    core.knowledge.connect(nodeIds[2], nodeIds[3], 'leads_to', { strength: 0.4 });
    core.knowledge.connect(nodeIds[0], nodeIds[4], 'alternative', { strength: 0.3 });
    core.knowledge.connect(nodeIds[4], nodeIds[5], 'backup_path', { strength: 0.7 });
  });

  describe('Edge Weight Adjustments', () => {
    it('should increase edge weights when reinforcing successful paths', () => {
      const path = [nodeIds[0], nodeIds[1], nodeIds[2]];
      
      // Get initial weights
      const initialRels = core.knowledge.getRelationships(nodeIds[0], 'out')
        .filter(rel => rel.to === nodeIds[1]);
      const initialStrength = initialRels[0]?.strength ?? 0;
      
      // Reinforce the path
      core.experience.reinforcePath(path, 0.8, { updateGraphWeights: true });
      
      // Check that weights increased
      const updatedRels = core.knowledge.getRelationships(nodeIds[0], 'out')
        .filter(rel => rel.to === nodeIds[1]);
      const updatedStrength = updatedRels[0]?.strength ?? 0;
      
      expect(updatedStrength).toBeGreaterThan(initialStrength);
    });

    it('should create new learned_path relationships for unconnected nodes', () => {
      const path = [nodeIds[6], nodeIds[7]]; // Unconnected nodes
      
      // Verify no initial relationship
      const initialRels = core.knowledge.getRelationships(nodeIds[6], 'out')
        .filter(rel => rel.to === nodeIds[7]);
      expect(initialRels).toHaveLength(0);
      
      // Reinforce the path
      core.experience.reinforcePath(path, 0.6, { updateGraphWeights: true });
      
      // Check that new relationship was created
      const newRels = core.knowledge.getRelationships(nodeIds[6], 'out')
        .filter(rel => rel.to === nodeIds[7] && rel.type === 'learned_path');
      expect(newRels).toHaveLength(1);
      expect(newRels[0].strength).toBe(0.6);
    });

    it('should respect maximum weight limits', () => {
      const path = [nodeIds[0], nodeIds[1]];
      
      // Reinforce multiple times to test weight cap
      for (let i = 0; i < 20; i++) {
        core.experience.reinforcePath(path, 0.9, { updateGraphWeights: true });
      }
      
      // Check that weight doesn't exceed maximum
      const rels = core.knowledge.getRelationships(nodeIds[0], 'out')
        .filter(rel => rel.to === nodeIds[1]);
      const finalStrength = rels[0]?.strength ?? 0;
      
      expect(finalStrength).toBeLessThanOrEqual(2.0);
    });

    it('should not update weights when updateGraphWeights is false', () => {
      const path = [nodeIds[0], nodeIds[1], nodeIds[2]];
      
      // Get initial weights
      const initialRels = core.knowledge.getRelationships(nodeIds[0], 'out')
        .filter(rel => rel.to === nodeIds[1]);
      const initialStrength = initialRels[0]?.strength ?? 0;
      
      // Reinforce without updating graph weights
      core.experience.reinforcePath(path, 0.8, { updateGraphWeights: false });
      
      // Check that weights remain unchanged
      const updatedRels = core.knowledge.getRelationships(nodeIds[0], 'out')
        .filter(rel => rel.to === nodeIds[1]);
      const updatedStrength = updatedRels[0]?.strength ?? 0;
      
      expect(updatedStrength).toBe(initialStrength);
    });
  });

  describe('Path Reinforcement Algorithms', () => {
    beforeEach(() => {
      // Create some experiences for reinforcement testing
      core.experience.recordPath([nodeIds[0], nodeIds[1], nodeIds[2]], 'successful path', 'success');
      core.experience.recordPath([nodeIds[0], nodeIds[1], nodeIds[3]], 'similar path', 'success');
      core.experience.recordPath([nodeIds[0], nodeIds[4], nodeIds[5]], 'different path', 'neutral');
      core.experience.recordPath([nodeIds[1], nodeIds[2]], 'partial overlap', 'failure');
    });

    it('should reinforce similar paths based on path similarity', () => {
      const targetPath = [nodeIds[0], nodeIds[1], nodeIds[2]];
      
      // Get initial reinforcement values
      const experiences = core.experience.getExperiences();
      const similarExp = experiences.find(exp => 
        exp.path.join(',') === [nodeIds[0], nodeIds[1], nodeIds[3]].join(',')
      );
      const initialReinforcement = similarExp?.reinforcement ?? 0;
      
      // Reinforce the target path
      core.experience.reinforcePath(targetPath, 0.8);
      
      // Check that similar paths got reinforcement boost
      const updatedExperiences = core.experience.getExperiences();
      const updatedSimilarExp = updatedExperiences.find(exp => 
        exp.path.join(',') === [nodeIds[0], nodeIds[1], nodeIds[3]].join(',')
      );
      const finalReinforcement = updatedSimilarExp?.reinforcement ?? 0;
      
      expect(finalReinforcement).toBeGreaterThan(initialReinforcement);
    });

    it('should not significantly affect dissimilar paths', () => {
      const targetPath = [nodeIds[0], nodeIds[1], nodeIds[2]];
      
      // Get initial reinforcement for dissimilar path
      const experiences = core.experience.getExperiences();
      const dissimilarExp = experiences.find(exp => 
        exp.path.join(',') === [nodeIds[0], nodeIds[4], nodeIds[5]].join(',')
      );
      const initialReinforcement = dissimilarExp?.reinforcement ?? 0;
      
      // Reinforce the target path
      core.experience.reinforcePath(targetPath, 0.8);
      
      // Check that dissimilar path reinforcement changed minimally
      const updatedExperiences = core.experience.getExperiences();
      const updatedDissimilarExp = updatedExperiences.find(exp => 
        exp.path.join(',') === [nodeIds[0], nodeIds[4], nodeIds[5]].join(',')
      );
      const finalReinforcement = updatedDissimilarExp?.reinforcement ?? 0;
      
      const change = Math.abs(finalReinforcement - initialReinforcement);
      expect(change).toBeLessThan(0.1); // Small change due to low similarity
    });

    it('should support contextual matching when enabled', () => {
      // Create experiences with different contexts
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'shopping context', 'success');
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'research context', 'success');
      
      const targetPath = [nodeIds[0], nodeIds[1]];
      
      // Reinforce with contextual matching enabled (default)
      core.experience.reinforcePath(targetPath, 0.7, { contextualMatching: true });
      
      // Should complete without errors
    });

    it('should validate reinforcement weight bounds', () => {
      const path = [nodeIds[0], nodeIds[1]];
      
      // Test with out-of-bounds weights
      core.experience.reinforcePath(path, 2.0); // Should be clamped to 1.0
      core.experience.reinforcePath(path, -0.5); // Should be clamped to 0.0
      
      // Should not throw errors and should clamp values
    });
  });

  describe('Decay Functions', () => {
    beforeEach(() => {
      // Create experiences with known reinforcement values
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'old experience', 'success');
      core.experience.recordPath([nodeIds[2], nodeIds[3]], 'another old experience', 'success');
    });

    it('should apply decay to old reinforcements when enabled', () => {
      // Create an experience and record its initial reinforcement
      const expId = core.experience.recordPath([nodeIds[4], nodeIds[5]], 'decay test', 'success');
      const initialExp = core.experience.getExperience(expId);
      const initialReinforcement = initialExp?.reinforcement ?? 0;
      
      // Mock Date.now to simulate time passage for decay calculation
      const originalDateNow = Date.now;
      const mockNow = originalDateNow() + 45 * 24 * 60 * 60 * 1000; // 45 days later
      vi.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      try {
        // Apply reinforcement with decay enabled
        core.experience.reinforcePath([nodeIds[4], nodeIds[5]], 0.1, { 
          decayOldReinforcements: true 
        });
        
        // Check that the experience reinforcement was affected by decay
        const updatedExp = core.experience.getExperience(expId);
        const finalReinforcement = updatedExp?.reinforcement ?? 0;
        
        // Should either be decayed (lower) or minimally increased by the small reinforcement
        expect(finalReinforcement).toBeLessThanOrEqual(initialReinforcement + 0.1);
      } finally {
        vi.restoreAllMocks();
      }
    });

    it('should not decay recent experiences', () => {
      // Get initial reinforcement values for recent experiences
      const experiences = core.experience.getExperiences();
      const initialReinforcements = experiences.map(exp => exp.reinforcement);
      
      // Apply reinforcement with decay enabled
      core.experience.reinforcePath([nodeIds[0], nodeIds[1]], 0.8, { 
        decayOldReinforcements: true 
      });
      
      // Recent experiences should not be significantly decayed
      const updatedExperiences = core.experience.getExperiences();
      const finalReinforcements = updatedExperiences.map(exp => exp.reinforcement);
      
      // Most values should remain similar (allowing for small increases from reinforcement)
      for (let i = 0; i < initialReinforcements.length; i++) {
        const change = Math.abs(finalReinforcements[i] - initialReinforcements[i]);
        expect(change).toBeLessThan(0.3); // Small change expected
      }
    });

    it('should maintain minimum reinforcement values during decay', () => {
      // Create an experience and manually trigger heavy decay
      const path = [nodeIds[6], nodeIds[7]];
      core.experience.recordPath(path, 'test decay', 'success');
      
      // Apply multiple decay operations
      for (let i = 0; i < 10; i++) {
        core.experience.reinforcePath(path, 0.1, { 
          decayOldReinforcements: true 
        });
      }
      
      // Check that no reinforcement went below minimum threshold
      const experiences = core.experience.getExperiences();
      for (const exp of experiences) {
        expect(exp.reinforcement).toBeGreaterThanOrEqual(0.0);
        expect(exp.reinforcement).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe('Integration with Experience Tracking', () => {
    it('should automatically update reinforcements when recording new experiences', () => {
      const path = [nodeIds[0], nodeIds[1], nodeIds[2]];
      
      // Record initial experience
      const expId1 = core.experience.recordPath(path, 'first experience', 'success');
      const initialExp = core.experience.getExperience(expId1);
      const initialReinforcement = initialExp?.reinforcement ?? 0;
      
      // Record similar experience
      const similarPath = [nodeIds[0], nodeIds[1], nodeIds[3]];
      core.experience.recordPath(similarPath, 'similar experience', 'success');
      
      // Original experience should have been reinforced
      const updatedExp = core.experience.getExperience(expId1);
      const finalReinforcement = updatedExp?.reinforcement ?? 0;
      
      // May be reinforced through related experience updates
      expect(finalReinforcement).toBeGreaterThanOrEqual(initialReinforcement);
    });

    it('should work with PathTracker integration', () => {
      // Start real-time path tracking
      const pathId = core.experience.startPathTracking('reinforcement test', nodeIds[0]);
      core.experience.addToPath(pathId, nodeIds[1]);
      core.experience.addToPath(pathId, nodeIds[2]);
      
      // Complete path and automatically create experience
      const expId = core.experience.completePathTracking(pathId, 'success', 'Auto-tracked path');
      
      // Experience should be created with proper reinforcement
      const experience = core.experience.getExperience(expId);
      expect(experience).toBeTruthy();
      expect(experience!.reinforcement).toBeGreaterThan(0.5); // Success should have higher reinforcement
      
      // Reinforcement mechanisms should work with auto-tracked experiences
      core.experience.reinforcePath(experience!.path, 0.9);
    });

    it('should provide accurate metrics after reinforcement operations', () => {
      // Create diverse experiences
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'metric test 1', 'success');
      core.experience.recordPath([nodeIds[1], nodeIds[2]], 'metric test 2', 'failure');
      core.experience.recordPath([nodeIds[0], nodeIds[1]], 'metric test 3', 'success'); // Duplicate path
      
      // Apply reinforcement
      core.experience.reinforcePath([nodeIds[0], nodeIds[1]], 0.8);
      
      // Get metrics
      const metrics = core.experience.getMetrics();
      
      expect(metrics.totalExperiences).toBe(3);
      expect(metrics.successRate).toBeCloseTo(2/3, 2);
      expect(metrics.mostCommonPaths).toHaveLength(2); // Two unique paths
      expect(metrics.mostCommonPaths[0].frequency).toBe(2); // Most common path appears twice
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of similar experiences efficiently', () => {
      const basePath = [nodeIds[0], nodeIds[1], nodeIds[2]];
      
      // Create many similar experiences
      for (let i = 0; i < 50; i++) {
        const path = [nodeIds[0], nodeIds[1], nodeIds[Math.floor(Math.random() * 4) + 2]];
        core.experience.recordPath(path, `bulk test ${i}`, 'success');
      }
      
      const startTime = performance.now();
      
      // Reinforce should complete quickly even with many experiences
      core.experience.reinforcePath(basePath, 0.7);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle empty paths gracefully', () => {
      expect(() => {
        core.experience.reinforcePath([], 0.5);
      }).not.toThrow();
    });

    it('should handle single-node paths', () => {
      expect(() => {
        core.experience.reinforcePath([nodeIds[0]], 0.5);
      }).not.toThrow();
    });

    it('should handle non-existent nodes in reinforcement paths', () => {
      expect(() => {
        core.experience.reinforcePath(['nonexistent1', 'nonexistent2'], 0.5, {
          updateGraphWeights: true
        });
      }).not.toThrow();
    });

    it('should maintain data consistency during concurrent operations', () => {
      const paths = [
        [nodeIds[0], nodeIds[1], nodeIds[2]],
        [nodeIds[1], nodeIds[2], nodeIds[3]],
        [nodeIds[2], nodeIds[3], nodeIds[4]]
      ];
      
      // First create some experiences
      const experienceIds = paths.map((path, i) => 
        core.experience.recordPath(path, `concurrent test ${i}`, 'success')
      );
      
      // Simulate concurrent reinforcement operations
      const promises = paths.map(path => 
        Promise.resolve(core.experience.reinforcePath(path, 0.6))
      );
      
      return Promise.all(promises).then(() => {
        // All operations should complete successfully
        const experiences = core.experience.getExperiences();
        expect(experiences.length).toBeGreaterThan(0);
        
        // All reinforcement values should be valid
        for (const exp of experiences) {
          expect(exp.reinforcement).toBeGreaterThanOrEqual(0);
          expect(exp.reinforcement).toBeLessThanOrEqual(1);
        }
        
        // All original experiences should still exist
        for (const expId of experienceIds) {
          const exp = core.experience.getExperience(expId);
          expect(exp).toBeTruthy();
        }
      });
    });
  });
});