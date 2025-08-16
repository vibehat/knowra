/**
 * Relationship Management Tests - T2.1 Implementation
 * 
 * Test suite for the Level 2: Knowledge API relationship management functionality.
 * Tests edge creation/deletion, relationship types/metadata, and bidirectional queries.
 * 
 * Following strict TDD approach - Red (failing tests) → Green (minimal implementation) → Refactor
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { KnowraCore } from '../../core/KnowraCore.js';
import type { Information, Relationship } from '../../core/types.js';

describe('Relationship Management - Level 2: Knowledge API', () => {
  let knowra: KnowraCore;
  let nodeId1: string;
  let nodeId2: string;
  let nodeId3: string;

  beforeEach(() => {
    knowra = new KnowraCore();

    // Create test nodes for relationship testing
    nodeId1 = knowra.information.add('First node content', { 
      type: 'concept',
      metadata: { category: 'test' }
    });

    nodeId2 = knowra.information.add('Second node content', { 
      type: 'concept',
      metadata: { category: 'test' }
    });

    nodeId3 = knowra.information.add('Third node content', { 
      type: 'concept',
      metadata: { category: 'test' }
    });
  });

  describe('Edge Creation - connect()', () => {
    test('should create a relationship between two existing nodes', () => {
      const relationship = knowra.knowledge.connect(nodeId1, nodeId2, 'related_to');

      expect(relationship).toBeDefined();
      expect(relationship.from).toBe(nodeId1);
      expect(relationship.to).toBe(nodeId2);
      expect(relationship.type).toBe('related_to');
      expect(relationship.strength).toBe(1.0); // Default strength
      expect(relationship.created).toBeInstanceOf(Date);
    });

    test('should set custom relationship strength', () => {
      const customMetadata = { strength: 0.7 };
      const relationship = knowra.knowledge.connect(nodeId1, nodeId2, 'weakly_related', customMetadata);

      expect(relationship.strength).toBe(0.7);
    });

    test('should store relationship metadata', () => {
      const metadata = {
        source: 'test_system',
        confidence: 0.9,
        tags: ['important', 'verified'],
        customField: 'custom_value'
      };

      const relationship = knowra.knowledge.connect(nodeId1, nodeId2, 'tagged_as', metadata);

      expect(relationship.metadata).toEqual(metadata);
    });

    test('should allow multiple relationships between the same nodes', () => {
      const rel1 = knowra.knowledge.connect(nodeId1, nodeId2, 'similar_to');
      const rel2 = knowra.knowledge.connect(nodeId1, nodeId2, 'related_to');

      expect(rel1.type).toBe('similar_to');
      expect(rel2.type).toBe('related_to');

      // Both relationships should exist
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      expect(relationships).toHaveLength(2);
    });

    test('should allow self-referencing relationships', () => {
      const relationship = knowra.knowledge.connect(nodeId1, nodeId1, 'self_reference');

      expect(relationship.from).toBe(nodeId1);
      expect(relationship.to).toBe(nodeId1);
      expect(relationship.type).toBe('self_reference');
    });

    test('should throw error for invalid node IDs', () => {
      expect(() => {
        knowra.knowledge.connect(nodeId1, '', 'test');
      }).toThrow('Invalid node IDs');

      expect(() => {
        knowra.knowledge.connect('  ', nodeId2, 'test');
      }).toThrow('Invalid node IDs');
    });

    test('should throw error when nodes do not exist', () => {
      const nonExistentId = 'info_999999';

      expect(() => {
        knowra.knowledge.connect(nonExistentId, nodeId2, 'test');
      }).toThrow('One or both nodes do not exist');

      expect(() => {
        knowra.knowledge.connect(nodeId1, nonExistentId, 'test');
      }).toThrow('One or both nodes do not exist');
    });

    test('should emit afterConnect event', () => {
      const eventHandler = vi.fn();
      knowra.events.on('knowledge:afterConnect', eventHandler);

      const relationship = knowra.knowledge.connect(nodeId1, nodeId2, 'test_event');

      expect(eventHandler).toHaveBeenCalledWith(relationship);
    });

    test('should validate relationship type is not empty', () => {
      expect(() => {
        knowra.knowledge.connect(nodeId1, nodeId2, '');
      }).toThrow('Relationship type must not be empty');

      expect(() => {
        knowra.knowledge.connect(nodeId1, nodeId2, '   ');
      }).toThrow('Relationship type must not be empty');
    });

    test('should normalize relationship strength to 0-1 range', () => {
      // Test strength > 1
      const rel1 = knowra.knowledge.connect(nodeId1, nodeId2, 'test', { strength: 2.5 });
      expect(rel1.strength).toBe(1.0);

      // Test strength < 0
      const rel2 = knowra.knowledge.connect(nodeId1, nodeId3, 'test', { strength: -0.5 });
      expect(rel2.strength).toBe(0.0);

      // Test valid strength
      const rel3 = knowra.knowledge.connect(nodeId2, nodeId3, 'test', { strength: 0.7 });
      expect(rel3.strength).toBe(0.7);
    });
  });

  describe('Edge Deletion - disconnect()', () => {
    beforeEach(() => {
      // Create some test relationships
      knowra.knowledge.connect(nodeId1, nodeId2, 'related_to');
      knowra.knowledge.connect(nodeId1, nodeId2, 'similar_to');
      knowra.knowledge.connect(nodeId1, nodeId3, 'connected_to');
      knowra.knowledge.connect(nodeId2, nodeId3, 'linked_to');
    });

    test('should disconnect specific relationship by type', () => {
      const success = knowra.knowledge.disconnect(nodeId1, nodeId2, 'related_to');
      expect(success).toBe(true);

      // Should remove only the specific relationship
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      const relatedTo = relationships.find(r => r.type === 'related_to' && r.to === nodeId2);
      const similarTo = relationships.find(r => r.type === 'similar_to' && r.to === nodeId2);

      expect(relatedTo).toBeUndefined();
      expect(similarTo).toBeDefined(); // Other relationship should remain
    });

    test('should disconnect all relationships between nodes if no type specified', () => {
      const success = knowra.knowledge.disconnect(nodeId1, nodeId2);
      expect(success).toBe(true);

      // Should remove all relationships between nodeId1 and nodeId2
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      const toNode2 = relationships.filter(r => r.to === nodeId2);
      
      expect(toNode2).toHaveLength(0);

      // Relationships to other nodes should remain
      const toNode3 = relationships.filter(r => r.to === nodeId3);
      expect(toNode3.length).toBeGreaterThan(0);
    });

    test('should return false when trying to disconnect non-existent relationship', () => {
      const success = knowra.knowledge.disconnect(nodeId1, nodeId2, 'non_existent_type');
      expect(success).toBe(false);
    });

    test('should return false for invalid node IDs', () => {
      const success1 = knowra.knowledge.disconnect('invalid_id', nodeId2);
      const success2 = knowra.knowledge.disconnect(nodeId1, 'invalid_id');
      const success3 = knowra.knowledge.disconnect('', '');

      expect(success1).toBe(false);
      expect(success2).toBe(false);
      expect(success3).toBe(false);
    });

    test('should emit afterDisconnect event', () => {
      const eventHandler = vi.fn();
      knowra.events.on('knowledge:afterDisconnect', eventHandler);

      knowra.knowledge.disconnect(nodeId1, nodeId2);

      expect(eventHandler).toHaveBeenCalledWith(nodeId1, nodeId2);
    });

    test('should handle disconnect with non-existent nodes gracefully', () => {
      const nonExistentId = 'info_999999';
      
      const success1 = knowra.knowledge.disconnect(nonExistentId, nodeId2);
      const success2 = knowra.knowledge.disconnect(nodeId1, nonExistentId);

      expect(success1).toBe(false);
      expect(success2).toBe(false);
    });
  });

  describe('Bidirectional Edge Queries - getRelationships()', () => {
    beforeEach(() => {
      // Create a more complex relationship network
      // nodeId1 -> nodeId2 (outgoing)
      knowra.knowledge.connect(nodeId1, nodeId2, 'leads_to', { strength: 0.9 });
      knowra.knowledge.connect(nodeId1, nodeId2, 'related_to', { strength: 0.7 });
      
      // nodeId2 -> nodeId1 (incoming to nodeId1, outgoing from nodeId2)
      knowra.knowledge.connect(nodeId2, nodeId1, 'follows_from', { strength: 0.8 });
      
      // nodeId3 -> nodeId1 (incoming to nodeId1)
      knowra.knowledge.connect(nodeId3, nodeId1, 'connects_to', { strength: 0.6 });
      
      // nodeId1 -> nodeId3 (outgoing from nodeId1)
      knowra.knowledge.connect(nodeId1, nodeId3, 'influences', { strength: 0.5 });
    });

    test('should return outgoing relationships by default', () => {
      const relationships = knowra.knowledge.getRelationships(nodeId1);
      
      // Should return outgoing relationships (from nodeId1)
      expect(relationships).toHaveLength(3);
      
      const outgoingTypes = relationships.map(r => r.type).sort();
      expect(outgoingTypes).toEqual(['influences', 'leads_to', 'related_to']);
      
      // All should have nodeId1 as source
      relationships.forEach(rel => {
        expect(rel.from).toBe(nodeId1);
      });
    });

    test('should return outgoing relationships when direction is "out"', () => {
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      
      expect(relationships).toHaveLength(3);
      relationships.forEach(rel => {
        expect(rel.from).toBe(nodeId1);
      });
    });

    test('should return incoming relationships when direction is "in"', () => {
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'in');
      
      expect(relationships).toHaveLength(2);
      
      const incomingTypes = relationships.map(r => r.type).sort();
      expect(incomingTypes).toEqual(['connects_to', 'follows_from']);
      
      // All should have nodeId1 as target
      relationships.forEach(rel => {
        expect(rel.to).toBe(nodeId1);
      });
    });

    test('should return all relationships when direction is "both"', () => {
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'both');
      
      expect(relationships).toHaveLength(5);
      
      // Check that we have both incoming and outgoing
      const outgoing = relationships.filter(r => r.from === nodeId1);
      const incoming = relationships.filter(r => r.to === nodeId1);
      
      expect(outgoing).toHaveLength(3);
      expect(incoming).toHaveLength(2);
    });

    test('should return empty array for non-existent node', () => {
      const relationships = knowra.knowledge.getRelationships('non_existent_id');
      expect(relationships).toEqual([]);
    });

    test('should return empty array for node with no relationships', () => {
      const isolatedNodeId = knowra.information.add('Isolated node', { type: 'isolated' });
      const relationships = knowra.knowledge.getRelationships(isolatedNodeId);
      expect(relationships).toEqual([]);
    });

    test('should return empty array for invalid node ID', () => {
      const relationships1 = knowra.knowledge.getRelationships('');
      const relationships2 = knowra.knowledge.getRelationships('   ');
      
      expect(relationships1).toEqual([]);
      expect(relationships2).toEqual([]);
    });

    test('should preserve relationship metadata in queries', () => {
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      
      // Check that strength values are preserved
      const leadsTo = relationships.find(r => r.type === 'leads_to');
      const relatedTo = relationships.find(r => r.type === 'related_to');
      const influences = relationships.find(r => r.type === 'influences');
      
      expect(leadsTo?.strength).toBe(0.9);
      expect(relatedTo?.strength).toBe(0.7);
      expect(influences?.strength).toBe(0.5);
    });

    test('should return deep clones of relationships (no mutation)', () => {
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      const original = relationships[0];
      
      // Mutate the returned relationship
      if (original) {
        original.strength = 0.1;
        original.type = 'mutated';
      }
      
      // Query again and verify original data is unchanged
      const relationships2 = knowra.knowledge.getRelationships(nodeId1, 'out');
      const sameRelationship = relationships2.find(r => 
        r.from === original?.from && r.to === original?.to
      );
      
      expect(sameRelationship?.strength).not.toBe(0.1);
      expect(sameRelationship?.type).not.toBe('mutated');
    });

    test('should handle self-referencing relationships correctly', () => {
      knowra.knowledge.connect(nodeId1, nodeId1, 'self_ref');
      
      const outgoing = knowra.knowledge.getRelationships(nodeId1, 'out');
      const incoming = knowra.knowledge.getRelationships(nodeId1, 'in');
      const both = knowra.knowledge.getRelationships(nodeId1, 'both');
      
      // Self-referencing relationship should appear in both directions
      const selfRefOut = outgoing.find(r => r.type === 'self_ref');
      const selfRefIn = incoming.find(r => r.type === 'self_ref');
      
      expect(selfRefOut).toBeDefined();
      expect(selfRefIn).toBeDefined();
      
      // But should only be counted once in 'both'
      const selfRefs = both.filter(r => r.type === 'self_ref');
      expect(selfRefs).toHaveLength(1);
    });
  });

  describe('Relationship Types and Metadata Support', () => {
    test('should support different relationship types', () => {
      const types = [
        'is_a',
        'part_of', 
        'related_to',
        'causes',
        'enables',
        'prerequisite_for',
        'similar_to',
        'opposite_of'
      ];

      types.forEach(type => {
        const rel = knowra.knowledge.connect(nodeId1, nodeId2, type);
        expect(rel.type).toBe(type);
      });

      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      const foundTypes = relationships.map(r => r.type).sort();
      
      expect(foundTypes).toEqual(types.sort());
    });

    test('should support complex metadata structures', () => {
      const complexMetadata = {
        source: 'automated_extraction',
        confidence: 0.85,
        algorithm: 'semantic_similarity',
        features: {
          embedding_distance: 0.23,
          text_overlap: 0.67,
          semantic_score: 0.91
        },
        tags: ['verified', 'high_quality', 'domain_specific'],
        created_by: 'system',
        review_status: 'pending',
        nested: {
          deep: {
            value: 'deeply_nested_data'
          }
        }
      };

      const relationship = knowra.knowledge.connect(
        nodeId1, 
        nodeId2, 
        'semantic_similarity', 
        complexMetadata
      );

      expect(relationship.metadata).toEqual(complexMetadata);

      // Verify metadata persists in queries
      const retrieved = knowra.knowledge.getRelationships(nodeId1, 'out');
      const semanticRel = retrieved.find(r => r.type === 'semantic_similarity');
      
      expect(semanticRel?.metadata).toEqual(complexMetadata);
    });

    test('should handle null and undefined metadata gracefully', () => {
      const rel1 = knowra.knowledge.connect(nodeId1, nodeId2, 'no_metadata');
      const rel2 = knowra.knowledge.connect(nodeId1, nodeId3, 'null_metadata', null);
      const rel3 = knowra.knowledge.connect(nodeId2, nodeId3, 'undefined_metadata', undefined);

      expect(rel1.metadata).toBeUndefined();
      expect(rel2.metadata).toBeNull();
      expect(rel3.metadata).toBeUndefined();
    });

    test('should preserve metadata types correctly', () => {
      const metadata = {
        stringField: 'text_value',
        numberField: 42,
        booleanField: true,
        dateField: new Date('2024-01-01'),
        arrayField: [1, 2, 3, 'mixed'],
        objectField: { nested: 'value' },
        nullField: null,
        undefinedField: undefined
      };

      const relationship = knowra.knowledge.connect(nodeId1, nodeId2, 'typed_metadata', metadata);

      expect(typeof relationship.metadata?.stringField).toBe('string');
      expect(typeof relationship.metadata?.numberField).toBe('number');
      expect(typeof relationship.metadata?.booleanField).toBe('boolean');
      expect(relationship.metadata?.dateField).toBeInstanceOf(Date);
      expect(Array.isArray(relationship.metadata?.arrayField)).toBe(true);
      expect(typeof relationship.metadata?.objectField).toBe('object');
      expect(relationship.metadata?.nullField).toBe(null);
      expect(relationship.metadata?.undefinedField).toBeUndefined();
    });
  });

  describe('Integration with Information API', () => {
    test('should clean up relationships when nodes are deleted', () => {
      // Create relationships
      knowra.knowledge.connect(nodeId1, nodeId2, 'test_cleanup');
      knowra.knowledge.connect(nodeId2, nodeId1, 'test_cleanup_reverse');
      knowra.knowledge.connect(nodeId1, nodeId3, 'test_other');

      // Verify relationships exist
      expect(knowra.knowledge.getRelationships(nodeId1, 'both')).toHaveLength(3);
      expect(knowra.knowledge.getRelationships(nodeId2, 'both')).toHaveLength(2);

      // Delete nodeId2
      const deleted = knowra.information.delete(nodeId2);
      expect(deleted).toBe(true);

      // Relationships involving nodeId2 should be cleaned up
      const node1Rels = knowra.knowledge.getRelationships(nodeId1, 'both');
      expect(node1Rels).toHaveLength(1); // Only relationship to nodeId3 should remain
      expect(node1Rels[0].to).toBe(nodeId3);

      // nodeId2 should not exist for queries
      expect(knowra.knowledge.getRelationships(nodeId2, 'both')).toEqual([]);
    });

    test('should maintain referential integrity', () => {
      // Try to create relationship with non-existent node
      expect(() => {
        knowra.knowledge.connect(nodeId1, 'non_existent_node', 'test');
      }).toThrow('One or both nodes do not exist');

      // Verify no partial relationships are created
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      expect(relationships.every(r => 
        knowra.information.get(r.from) !== null && 
        knowra.information.get(r.to) !== null
      )).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large numbers of relationships efficiently', () => {
      const startTime = Date.now();
      
      // Create 1000 relationships
      for (let i = 0; i < 1000; i++) {
        const targetId = i % 2 === 0 ? nodeId2 : nodeId3;
        knowra.knowledge.connect(nodeId1, targetId, `type_${i}`, { index: i });
      }
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Query should also be fast
      const queryStart = Date.now();
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'out');
      const queryTime = Date.now() - queryStart;
      
      expect(relationships).toHaveLength(1000);
      expect(queryTime).toBeLessThan(100); // Should query within 100ms
    });

    test('should handle concurrent relationship operations', () => {
      // Simulate concurrent operations
      const operations = [];
      
      for (let i = 0; i < 100; i++) {
        operations.push(() => 
          knowra.knowledge.connect(nodeId1, nodeId2, `concurrent_${i}`)
        );
        
        if (i % 2 === 0) {
          operations.push(() => 
            knowra.knowledge.disconnect(nodeId1, nodeId2, `concurrent_${i - 1}`)
          );
        }
      }
      
      // Execute operations
      operations.forEach(op => {
        try {
          op();
        } catch (error) {
          // Some operations may fail due to race conditions, that's expected
        }
      });
      
      // System should remain consistent
      const relationships = knowra.knowledge.getRelationships(nodeId1, 'both');
      expect(Array.isArray(relationships)).toBe(true);
      
      // All returned relationships should be valid
      relationships.forEach(rel => {
        expect(rel.from).toBeDefined();
        expect(rel.to).toBeDefined();
        expect(rel.type).toBeDefined();
        expect(rel.created).toBeInstanceOf(Date);
      });
    });
  });
});