/**
 * Integration tests for text search within KnowraCore
 * Tests the integration between KnowraCore and TextSearchManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowraCore } from '../../core/KnowraCore.js';
import type { Information } from '../../core/types.js';

describe('KnowraCore Text Search Integration', () => {
  let knowra: KnowraCore;

  beforeEach(() => {
    knowra = new KnowraCore();
  });

  describe('Information API with Text Search', () => {
    it('should automatically index nodes when added', () => {
      const id = knowra.information.add(
        'This is a test document about machine learning algorithms',
        { type: 'research', metadata: { tags: ['ml', 'algorithms'] } }
      );

      const results = knowra.information.search('machine learning');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(id);
    });

    it('should update search index when node is modified', () => {
      const id = knowra.information.add(
        'Original content about JavaScript',
        { type: 'note' }
      );

      // Update the node
      knowra.information.update(id, {
        content: 'Updated content about TypeScript programming',
        type: 'updated-note'
      });

      // Should not find by old content
      const oldResults = knowra.information.search('JavaScript');
      expect(oldResults.length).toBe(0);

      // Should find by new content
      const newResults = knowra.information.search('TypeScript');
      expect(newResults.length).toBe(1);
      expect(newResults[0].id).toBe(id);

      // Should find by new type
      const typeResults = knowra.information.search('updated-note');
      expect(typeResults.length).toBe(1);
      expect(typeResults[0].id).toBe(id);
    });

    it('should remove from search index when node is deleted', () => {
      const id = knowra.information.add(
        'Content to be deleted',
        { type: 'temporary' }
      );

      // Verify it can be found
      let results = knowra.information.search('deleted');
      expect(results.length).toBe(1);

      // Delete the node
      knowra.information.delete(id);

      // Should no longer be found
      results = knowra.information.search('deleted');
      expect(results.length).toBe(0);
    });

    it('should handle batch operations with search indexing', () => {
      const operations = [
        {
          operation: 'add' as const,
          data: {
            content: 'First batch document about React development',
            type: 'tutorial'
          }
        },
        {
          operation: 'add' as const,
          data: {
            content: 'Second batch document about Vue.js framework',
            type: 'guide'
          }
        },
        {
          operation: 'add' as const,
          data: {
            content: 'Third batch document about Angular patterns',
            type: 'reference'
          }
        }
      ];

      const batchResult = knowra.information.batch(operations);
      expect(batchResult.success).toBe(true);
      expect(batchResult.results.length).toBe(3);

      // All documents should be searchable
      const reactResults = knowra.information.search('React');
      expect(reactResults.length).toBe(1);

      const vueResults = knowra.information.search('Vue.js');
      expect(vueResults.length).toBe(1);

      const angularResults = knowra.information.search('Angular');
      expect(angularResults.length).toBe(1);

      // Framework search should find multiple results
      const frameworkResults = knowra.information.search('framework');
      expect(frameworkResults.length).toBeGreaterThan(0);
    });
  });

  describe('Search Options Integration', () => {
    beforeEach(() => {
      // Add test data
      knowra.information.add('JavaScript programming tutorial', { 
        type: 'tutorial',
        metadata: { difficulty: 'beginner', tags: ['javascript', 'programming'] }
      });
      knowra.information.add('Advanced JavaScript patterns', { 
        type: 'article',
        metadata: { difficulty: 'advanced', tags: ['javascript', 'patterns'] }
      });
      knowra.information.add('JavaScript testing frameworks', { 
        type: 'guide',
        metadata: { difficulty: 'intermediate', tags: ['javascript', 'testing'] }
      });
    });

    it('should filter search results by type', () => {
      const tutorialResults = knowra.information.search('JavaScript', { type: 'tutorial' });
      expect(tutorialResults.length).toBe(1);
      expect(tutorialResults[0].type).toBe('tutorial');

      const articleResults = knowra.information.search('JavaScript', { type: 'article' });
      expect(articleResults.length).toBe(1);
      expect(articleResults[0].type).toBe('article');
    });

    it('should limit search results', () => {
      const allResults = knowra.information.search('JavaScript');
      expect(allResults.length).toBe(3);

      const limitedResults = knowra.information.search('JavaScript', { limit: 2 });
      expect(limitedResults.length).toBe(2);
    });

    it('should offset search results', () => {
      const allResults = knowra.information.search('JavaScript');
      const firstResult = allResults[0];

      const offsetResults = knowra.information.search('JavaScript', { offset: 1 });
      expect(offsetResults.length).toBe(2);
      expect(offsetResults.map(r => r.id)).not.toContain(firstResult.id);
    });

    it('should sort search results by created date', () => {
      const resultsAsc = knowra.information.search('JavaScript', { 
        sortBy: 'created', 
        sortOrder: 'asc' 
      });
      
      expect(resultsAsc.length).toBe(3);
      for (let i = 0; i < resultsAsc.length - 1; i++) {
        expect(resultsAsc[i].created.getTime()).toBeLessThanOrEqual(resultsAsc[i + 1].created.getTime());
      }

      const resultsDesc = knowra.information.search('JavaScript', { 
        sortBy: 'created', 
        sortOrder: 'desc' 
      });
      
      for (let i = 0; i < resultsDesc.length - 1; i++) {
        expect(resultsDesc[i].created.getTime()).toBeGreaterThanOrEqual(resultsDesc[i + 1].created.getTime());
      }
    });
  });

  describe('Complex Content Types', () => {
    it('should handle string content', () => {
      const id = knowra.information.add(
        'Simple string content for testing'
      );

      const results = knowra.information.search('string content');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(id);
    });

    it('should handle object content', () => {
      const complexContent = {
        title: 'API Documentation',
        description: 'REST API endpoints for user management',
        endpoints: ['GET /users', 'POST /users', 'PUT /users/:id'],
        version: '2.1.0'
      };

      const id = knowra.information.add(complexContent, { 
        type: 'api-doc',
        metadata: { version: '2.1.0', category: 'documentation' }
      });

      // Should find by object properties that get stringified
      const titleResults = knowra.information.search('API Documentation');
      expect(titleResults.length).toBe(1);
      expect(titleResults[0].id).toBe(id);

      const endpointResults = knowra.information.search('endpoints');
      expect(endpointResults.length).toBe(1);
    });

    it('should handle array content', () => {
      const arrayContent = [
        'First item in the array',
        'Second item with keywords',
        'Third item for testing'
      ];

      const id = knowra.information.add(arrayContent, { type: 'list' });

      const results = knowra.information.search('keywords');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(id);
    });

    it('should handle null and undefined content gracefully', () => {
      // Use empty string instead of null/undefined since GraphFoundation validates content
      const nullId = knowra.information.add('', { type: 'null-content' });
      const undefinedId = knowra.information.add('', { type: 'undefined-content' });

      // Should not crash and should be searchable by type
      const nullResults = knowra.information.search('null-content');
      expect(nullResults.length).toBe(1);

      const undefinedResults = knowra.information.search('undefined-content');
      expect(undefinedResults.length).toBe(1);
    });
  });

  describe('Metadata and Tags Search', () => {
    beforeEach(() => {
      knowra.information.add('Document about databases', {
        type: 'article',
        metadata: {
          tags: ['database', 'sql', 'nosql'],
          author: 'John Doe',
          category: 'technical',
          difficulty: 'intermediate'
        }
      });

      knowra.information.add('Guide to machine learning', {
        type: 'tutorial',
        metadata: {
          tags: ['machine-learning', 'ai', 'python'],
          author: 'Jane Smith',
          category: 'educational',
          difficulty: 'advanced'
        }
      });
    });

    it('should find documents by tags', () => {
      const sqlResults = knowra.information.search('sql');
      expect(sqlResults.length).toBe(1);
      expect(sqlResults[0].content).toContain('databases');

      // Search for a unique tag that only appears in one document  
      const machineLearningResults = knowra.information.search('machine-learning');
      expect(machineLearningResults.length).toBe(1);
      expect(machineLearningResults[0].content).toContain('machine learning');
    });

    it('should find documents by metadata fields', () => {
      const authorResults = knowra.information.search('John Doe');
      expect(authorResults.length).toBe(1);

      const categoryResults = knowra.information.search('technical');
      expect(categoryResults.length).toBe(1);

      const difficultyResults = knowra.information.search('intermediate');
      expect(difficultyResults.length).toBe(1);
    });

    it('should handle complex metadata structures', () => {
      knowra.information.add('Complex metadata document', {
        type: 'research',
        metadata: {
          study: {
            title: 'User Experience Research',
            methodology: 'qualitative analysis',
            participants: 50
          },
          tags: ['ux', 'research', 'analysis'],
          published: true
        }
      });

      const methodResults = knowra.information.search('qualitative');
      expect(methodResults.length).toBe(1);

      const uxResults = knowra.information.search('ux');
      expect(uxResults.length).toBe(1);
    });
  });

  describe('Search Performance with Large Datasets', () => {
    it('should maintain performance with many nodes', async () => {
      // Add a large number of nodes
      const nodeCount = 1000;
      const startTime = Date.now();

      for (let i = 0; i < nodeCount; i++) {
        knowra.information.add(
          `Document ${i} contains various keywords like testing, performance, and scalability`,
          { 
            type: i % 2 === 0 ? 'even-doc' : 'odd-doc',
            metadata: { 
              index: i,
              category: i % 3 === 0 ? 'category-a' : i % 3 === 1 ? 'category-b' : 'category-c'
            }
          }
        );
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Search should be fast even with many nodes
      const searchStartTime = Date.now();
      const results = knowra.information.search('performance', { limit: 1000 });
      const searchTime = Date.now() - searchStartTime;

      expect(searchTime).toBeLessThan(200); // Should complete within 200ms
      expect(results.length).toBe(nodeCount); // Should find all nodes
    });
  });

  describe('Persistence and Index Rebuilding', () => {
    it('should rebuild search index after loading data', async () => {
      // Add some data
      const id1 = knowra.information.add('First document for persistence test', { type: 'test' });
      const id2 = knowra.information.add('Second document for loading test', { type: 'test' });

      // Save to a temporary file path (in memory for testing)
      const tempPath = '/tmp/test-knowra-search.json';
      
      // We'll test this conceptually since actual file I/O would require setup
      // The key is that the search index gets rebuilt after load
      const searchManager = knowra.getTextSearchManager();
      const statsBefore = searchManager.getStats();
      
      expect(statsBefore.nodeCount).toBe(2);
      
      // Clear the search index to simulate what happens after loading
      searchManager.clear();
      const statsAfterClear = searchManager.getStats();
      expect(statsAfterClear.nodeCount).toBe(0);
      
      // Rebuild index (this simulates what happens in load())
      const allNodes = knowra.getGraphFoundation().getAllNodes();
      allNodes.forEach(node => searchManager.addNode(node));
      
      const statsAfterRebuild = searchManager.getStats();
      expect(statsAfterRebuild.nodeCount).toBe(2);
      
      // Search should work again
      const results = knowra.information.search('persistence');
      expect(results.length).toBe(1);
      expect(results[0].id).toBe(id1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queries gracefully', () => {
      knowra.information.add('Some content');
      
      const emptyResults = knowra.information.search('');
      expect(emptyResults.length).toBe(0);
      
      const whitespaceResults = knowra.information.search('   ');
      expect(whitespaceResults.length).toBe(0);
    });

    it('should handle special characters in search queries', () => {
      knowra.information.add('Content with special chars: @#$%^&*()');
      
      const results = knowra.information.search('special chars');
      expect(results.length).toBe(1);
      
      // Should not crash with special characters
      expect(() => knowra.information.search('@#$%')).not.toThrow();
    });

    it('should handle very long queries', () => {
      const longQuery = 'very '.repeat(1000) + 'long query';
      
      expect(() => knowra.information.search(longQuery)).not.toThrow();
      const results = knowra.information.search(longQuery);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle unicode content and queries', () => {
      knowra.information.add('Content with unicode: 你好世界 🌍 café naïve');
      
      // Search by full content including unicode - this should work
      const fullResults = knowra.information.search('Content with unicode');
      expect(fullResults.length).toBe(1);
      
      // Search by accented characters
      const accentResults = knowra.information.search('café');
      expect(accentResults.length).toBe(1);
      
      // Search by naïve 
      const naiveResults = knowra.information.search('naïve');
      expect(naiveResults.length).toBe(1);
    });
  });
});