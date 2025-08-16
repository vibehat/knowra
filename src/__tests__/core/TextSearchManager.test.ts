/**
 * Tests for TextSearchManager
 * Following TDD principles with comprehensive coverage of search functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TextSearchManager } from '../../core/TextSearchManager.js';
import type { Information, SearchOptions } from '../../core/types.js';

describe('TextSearchManager', () => {
  let searchManager: TextSearchManager;
  let sampleNodes: Information[];

  beforeEach(() => {
    searchManager = new TextSearchManager();
    
    // Create sample nodes for testing
    sampleNodes = [
      {
        id: 'node1',
        content: 'This is a test document about JavaScript programming',
        type: 'document',
        source: 'test-source',
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-01'),
        metadata: { tags: ['programming', 'javascript'], category: 'tutorial' }
      },
      {
        id: 'node2', 
        content: 'TypeScript adds static typing to JavaScript',
        type: 'note',
        created: new Date('2024-01-02'),
        modified: new Date('2024-01-02'),
        metadata: { tags: ['typescript', 'javascript'], priority: 'high' }
      },
      {
        id: 'node3',
        content: 'React is a JavaScript library for building user interfaces',
        type: 'document',
        created: new Date('2024-01-03'),
        modified: new Date('2024-01-03'),
        metadata: { tags: ['react', 'javascript', 'ui'], framework: 'frontend' }
      },
      {
        id: 'node4',
        content: 'Python is a versatile programming language',
        type: 'note', 
        created: new Date('2024-01-04'),
        modified: new Date('2024-01-04'),
        metadata: { tags: ['python', 'programming'], level: 'beginner' }
      },
      {
        id: 'node5',
        content: 'Database design patterns and best practices',
        type: 'article',
        created: new Date('2024-01-05'),
        modified: new Date('2024-01-05'),
        metadata: { tags: ['database', 'design'], complexity: 'advanced' }
      }
    ];

    // Add all sample nodes to the search manager
    sampleNodes.forEach(node => searchManager.addNode(node));
  });

  describe('Basic Search Operations', () => {
    it('should add nodes to search index', () => {
      const stats = searchManager.getStats();
      expect(stats.nodeCount).toBe(5);
      expect(stats.contentIndexSize).toBeGreaterThan(0);
    });

    it('should find nodes by content search', () => {
      const results = searchManager.search('JavaScript');
      
      expect(results.length).toBe(3);
      expect(results.map(r => r.id)).toContain('node1');
      expect(results.map(r => r.id)).toContain('node2');
      expect(results.map(r => r.id)).toContain('node3');
    });

    it('should find nodes by type search', () => {
      const results = searchManager.search('document');
      
      expect(results.length).toBe(2);
      expect(results.map(r => r.id)).toContain('node1');
      expect(results.map(r => r.id)).toContain('node3');
    });

    it('should find nodes by tag search', () => {
      const results = searchManager.search('programming');
      
      expect(results.length).toBe(2);
      expect(results.map(r => r.id)).toContain('node1');
      expect(results.map(r => r.id)).toContain('node4');
    });

    it('should return empty results for no matches', () => {
      const results = searchManager.search('nonexistent');
      expect(results.length).toBe(0);
    });

    it('should return empty results for empty query', () => {
      const results = searchManager.search('');
      expect(results.length).toBe(0);
    });
  });

  describe('Search Options', () => {
    it('should filter by type', () => {
      const results = searchManager.search('JavaScript', { type: 'note' });
      
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('node2');
    });

    it('should limit results', () => {
      const results = searchManager.search('JavaScript', { limit: 2 });
      
      expect(results.length).toBe(2);
    });

    it('should offset results', () => {
      const allResults = searchManager.search('JavaScript');
      const offsetResults = searchManager.search('JavaScript', { offset: 1 });
      
      expect(offsetResults.length).toBe(allResults.length - 1);
      expect(offsetResults[0].id).not.toBe(allResults[0].id);
    });

    it('should sort by created date ascending', () => {
      const results = searchManager.search('JavaScript', { 
        sortBy: 'created', 
        sortOrder: 'asc' 
      });
      
      expect(results.length).toBe(3);
      expect(results[0].created.getTime()).toBeLessThanOrEqual(results[1].created.getTime());
      expect(results[1].created.getTime()).toBeLessThanOrEqual(results[2].created.getTime());
    });

    it('should sort by created date descending', () => {
      const results = searchManager.search('JavaScript', { 
        sortBy: 'created', 
        sortOrder: 'desc' 
      });
      
      expect(results.length).toBe(3);
      expect(results[0].created.getTime()).toBeGreaterThanOrEqual(results[1].created.getTime());
      expect(results[1].created.getTime()).toBeGreaterThanOrEqual(results[2].created.getTime());
    });

    it('should sort by modified date', () => {
      // Update one node to have a newer modified date
      const updatedNode = { ...sampleNodes[0], modified: new Date('2024-02-01') };
      searchManager.updateNode(updatedNode);

      const results = searchManager.search('JavaScript', { 
        sortBy: 'modified', 
        sortOrder: 'desc' 
      });
      
      expect(results[0].id).toBe('node1'); // Most recently modified
    });
  });

  describe('Index Updates', () => {
    it('should update node in index', () => {
      const updatedNode: Information = {
        ...sampleNodes[0],
        content: 'Updated content about Python development',
        type: 'updated-document'
      };
      
      searchManager.updateNode(updatedNode);
      
      // Should no longer find by old content (use specific phrase from original content)
      const oldResults = searchManager.search('test document about JavaScript');
      expect(oldResults.map(r => r.id)).not.toContain('node1');
      
      // Should find by new content
      const newResults = searchManager.search('Python development');
      expect(newResults.map(r => r.id)).toContain('node1');
      
      // Should find by new type
      const typeResults = searchManager.search('updated-document');
      expect(typeResults.map(r => r.id)).toContain('node1');
    });

    it('should remove node from index', () => {
      searchManager.removeNode('node1');
      
      const results = searchManager.search('JavaScript');
      expect(results.map(r => r.id)).not.toContain('node1');
      
      const stats = searchManager.getStats();
      expect(stats.nodeCount).toBe(4);
    });
  });

  describe('Relevance Scoring', () => {
    it('should return results sorted by relevance by default', () => {
      // Add a node with multiple occurrences of the search term
      const highRelevanceNode: Information = {
        id: 'high-relevance',
        content: 'JavaScript JavaScript JavaScript is everywhere in modern web development',
        type: 'javascript-guide',
        created: new Date(),
        modified: new Date(),
        metadata: { tags: ['javascript', 'javascript', 'guide'] }
      };
      
      searchManager.addNode(highRelevanceNode);
      
      const results = searchManager.search('JavaScript');
      
      // High relevance node should appear first (default relevance sorting)
      expect(results[0].id).toBe('high-relevance');
    });
  });

  describe('Metadata Search', () => {
    it('should find nodes by metadata fields', () => {
      const results = searchManager.search('tutorial');
      expect(results.map(r => r.id)).toContain('node1');
    });

    it('should find nodes by metadata values', () => {
      const results = searchManager.search('high');
      expect(results.map(r => r.id)).toContain('node2');
    });

    it('should find nodes by complex metadata', () => {
      const results = searchManager.search('frontend');
      expect(results.map(r => r.id)).toContain('node3');
    });
  });

  describe('Search Suggestions', () => {
    it('should provide search suggestions', () => {
      const suggestions = searchManager.getSuggestions('java');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.includes('javascript'))).toBe(true);
    });

    it('should limit suggestions', () => {
      const suggestions = searchManager.getSuggestions('java', 2);
      expect(suggestions.length).toBeLessThanOrEqual(2);
    });

    it('should return empty suggestions for short query', () => {
      const suggestions = searchManager.getSuggestions('j');
      expect(suggestions.length).toBe(0);
    });

    it('should return empty suggestions for empty query', () => {
      const suggestions = searchManager.getSuggestions('');
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Case Insensitive Search', () => {
    it('should find matches regardless of case', () => {
      const lowerResults = searchManager.search('javascript');
      const upperResults = searchManager.search('JAVASCRIPT');
      const mixedResults = searchManager.search('JavaScript');
      
      expect(lowerResults.length).toBe(upperResults.length);
      expect(lowerResults.length).toBe(mixedResults.length);
      
      const lowerIds = lowerResults.map(r => r.id).sort();
      const upperIds = upperResults.map(r => r.id).sort();
      const mixedIds = mixedResults.map(r => r.id).sort();
      
      expect(lowerIds).toEqual(upperIds);
      expect(lowerIds).toEqual(mixedIds);
    });
  });

  describe('Complex Queries', () => {
    it('should handle phrase searches', () => {
      const results = searchManager.search('programming language');
      expect(results.map(r => r.id)).toContain('node4');
    });

    it('should handle partial matches', () => {
      const results = searchManager.search('program');
      
      // Should match "programming" in multiple nodes
      expect(results.length).toBeGreaterThan(0);
      expect(results.map(r => r.id)).toContain('node1');
      expect(results.map(r => r.id)).toContain('node4');
    });
  });

  describe('Index Management', () => {
    it('should clear all indexes', () => {
      searchManager.clear();
      
      const stats = searchManager.getStats();
      expect(stats.nodeCount).toBe(0);
      expect(stats.contentIndexSize).toBe(0);
      
      const results = searchManager.search('JavaScript');
      expect(results.length).toBe(0);
    });

    it('should rebuild indexes after clear and add', () => {
      searchManager.clear();
      
      const newNode: Information = {
        id: 'new-node',
        content: 'New content for testing',
        type: 'test',
        created: new Date(),
        modified: new Date()
      };
      
      searchManager.addNode(newNode);
      
      const results = searchManager.search('testing');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('new-node');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed content gracefully', () => {
      const malformedNode: Information = {
        id: 'malformed',
        content: { complex: { nested: 'object' } },
        type: 'object',
        created: new Date(),
        modified: new Date()
      };
      
      expect(() => searchManager.addNode(malformedNode)).not.toThrow();
      
      const stats = searchManager.getStats();
      expect(stats.nodeCount).toBe(6); // Original 5 + new one
    });

    it('should handle undefined metadata gracefully', () => {
      const nodeWithoutMetadata: Information = {
        id: 'no-meta',
        content: 'Content without metadata',
        type: 'simple',
        created: new Date(),
        modified: new Date()
      };
      
      expect(() => searchManager.addNode(nodeWithoutMetadata)).not.toThrow();
      
      const results = searchManager.search('without metadata');
      expect(results.map(r => r.id)).toContain('no-meta');
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of nodes efficiently', () => {
      const startTime = Date.now();
      
      // Add many nodes
      for (let i = 0; i < 100; i++) {
        const node: Information = {
          id: `perf-node-${i}`,
          content: `Performance test content ${i} with various keywords`,
          type: 'performance-test',
          created: new Date(),
          modified: new Date(),
          metadata: { index: i, category: 'test' }
        };
        searchManager.addNode(node);
      }
      
      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Search should still be fast
      const searchStartTime = Date.now();
      const results = searchManager.search('performance test', { limit: 100 });
      const searchTime = Date.now() - searchStartTime;
      
      expect(searchTime).toBeLessThan(100); // Should complete within 100ms
      expect(results.length).toBe(100);
    });
  });
});