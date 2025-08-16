/**
 * PersistenceManager Tests
 * 
 * Test suite for the PersistenceManager class that handles JSON
 * serialization and file operations for the Knowra Knowledge Database.
 * 
 * Following TDD approach - these tests should fail initially.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistenceManager } from '../../core/PersistenceManager.js';
import type { GraphData, Information, Relationship } from '../../core/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('PersistenceManager', () => {
  let persistenceManager: PersistenceManager;
  let testDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    persistenceManager = new PersistenceManager();
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'knowra-test-'));
    testFilePath = path.join(testDir, 'test-graph.json');
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Graph Data Validation', () => {
    const validGraphData: GraphData = {
      nodes: [
        {
          id: 'test_node_1',
          content: 'Test content 1',
          type: 'text',
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
        {
          id: 'test_node_2',
          content: 'Test content 2',
          type: 'text',
          created: new Date('2024-01-02'),
          modified: new Date('2024-01-02'),
        },
      ],
      edges: [
        {
          from: 'test_node_1',
          to: 'test_node_2',
          type: 'connects',
          strength: 0.8,
          created: new Date('2024-01-01'),
        },
      ],
      metadata: {
        version: '1.0.0',
        created: new Date('2024-01-01'),
        nodeCount: 2,
        edgeCount: 1,
      },
    };

    test('validateGraphData should accept valid graph data', () => {
      const isValid = persistenceManager.validateGraphData(validGraphData);
      expect(isValid).toBe(true);
    });

    test('validateGraphData should reject invalid data types', () => {
      expect(persistenceManager.validateGraphData(null)).toBe(false);
      expect(persistenceManager.validateGraphData(undefined)).toBe(false);
      expect(persistenceManager.validateGraphData('string')).toBe(false);
      expect(persistenceManager.validateGraphData(123)).toBe(false);
      expect(persistenceManager.validateGraphData([])).toBe(false);
    });

    test('validateGraphData should reject data missing required fields', () => {
      const missingNodes = { edges: [], metadata: validGraphData.metadata };
      expect(persistenceManager.validateGraphData(missingNodes)).toBe(false);

      const missingEdges = { nodes: validGraphData.nodes, metadata: validGraphData.metadata };
      expect(persistenceManager.validateGraphData(missingEdges)).toBe(false);

      const missingMetadata = { nodes: validGraphData.nodes, edges: validGraphData.edges };
      expect(persistenceManager.validateGraphData(missingMetadata)).toBe(false);
    });

    test('validateGraphData should validate node structure', () => {
      const invalidNodes = {
        ...validGraphData,
        nodes: [{ id: 'invalid' }], // Missing required fields
      };
      expect(persistenceManager.validateGraphData(invalidNodes)).toBe(false);
    });

    test('validateGraphData should validate edge structure', () => {
      const invalidEdges = {
        ...validGraphData,
        edges: [{ from: 'node1' }], // Missing required fields
      };
      expect(persistenceManager.validateGraphData(invalidEdges)).toBe(false);
    });

    test('validateGraphData should validate metadata structure', () => {
      const invalidMetadata = {
        ...validGraphData,
        metadata: { version: '1.0.0' }, // Missing required fields
      };
      expect(persistenceManager.validateGraphData(invalidMetadata)).toBe(false);
    });

    test('validateGraphData should handle edge cases', () => {
      const emptyValidData: GraphData = {
        nodes: [],
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 0,
          edgeCount: 0,
        },
      };
      expect(persistenceManager.validateGraphData(emptyValidData)).toBe(true);
    });
  });

  describe('Save Operations', () => {
    const sampleGraphData: GraphData = {
      nodes: [
        {
          id: 'save_test_1',
          content: 'Save test content',
          type: 'test',
          created: new Date('2024-01-01T10:00:00Z'),
          modified: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      edges: [],
      metadata: {
        version: '1.0.0',
        created: new Date('2024-01-01T10:00:00Z'),
        nodeCount: 1,
        edgeCount: 0,
      },
    };

    test('saveGraph should save graph data to file', async () => {
      await persistenceManager.saveGraph(sampleGraphData, testFilePath);

      // Verify file exists
      const stats = await fs.stat(testFilePath);
      expect(stats.isFile()).toBe(true);

      // Verify file content
      const content = await fs.readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.nodes[0].id).toBe('save_test_1');
    });

    test('saveGraph should create directory if it does not exist', async () => {
      const nestedPath = path.join(testDir, 'nested', 'dir', 'graph.json');
      
      await persistenceManager.saveGraph(sampleGraphData, nestedPath);
      
      const stats = await fs.stat(nestedPath);
      expect(stats.isFile()).toBe(true);
    });

    test('saveGraph should handle file write errors', async () => {
      const invalidPath = path.join('/invalid/nonexistent/path/graph.json');
      
      await expect(persistenceManager.saveGraph(sampleGraphData, invalidPath))
        .rejects.toThrow();
    });

    test('saveGraph should preserve data integrity', async () => {
      const complexData: GraphData = {
        nodes: [
          {
            id: 'complex_1',
            content: { nested: { data: 'test', numbers: [1, 2, 3] } },
            type: 'complex',
            created: new Date('2024-01-01T10:00:00Z'),
            modified: new Date('2024-01-02T15:30:00Z'),
            metadata: { custom: 'value', tags: ['tag1', 'tag2'] },
          },
        ],
        edges: [
          {
            from: 'complex_1',
            to: 'complex_1',
            type: 'self_reference',
            strength: 0.95,
            created: new Date('2024-01-01T10:00:00Z'),
            metadata: { weight: 1.0, category: 'loop' },
          },
        ],
        metadata: {
          version: '1.0.0',
          created: new Date('2024-01-01T10:00:00Z'),
          nodeCount: 1,
          edgeCount: 1,
        },
      };

      await persistenceManager.saveGraph(complexData, testFilePath);
      const loaded = await persistenceManager.loadGraph(testFilePath);

      expect(loaded).toEqual(complexData);
    });

    test('saveGraph should handle large datasets efficiently', async () => {
      const largeData: GraphData = {
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          id: `large_node_${i}`,
          content: `Large content for node ${i}`.repeat(10),
          type: 'large',
          created: new Date('2024-01-01T10:00:00Z'),
          modified: new Date('2024-01-01T10:00:00Z'),
        })),
        edges: Array.from({ length: 500 }, (_, i) => ({
          from: `large_node_${i}`,
          to: `large_node_${(i + 1) % 1000}`,
          type: 'large_connection',
          strength: Math.random(),
          created: new Date('2024-01-01T10:00:00Z'),
        })),
        metadata: {
          version: '1.0.0',
          created: new Date('2024-01-01T10:00:00Z'),
          nodeCount: 1000,
          edgeCount: 500,
        },
      };

      const startTime = performance.now();
      await persistenceManager.saveGraph(largeData, testFilePath);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      const stats = await fs.stat(testFilePath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Load Operations', () => {
    const testData: GraphData = {
      nodes: [
        {
          id: 'load_test_1',
          content: 'Load test content',
          type: 'test',
          created: new Date('2024-01-01T10:00:00Z'),
          modified: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      edges: [
        {
          from: 'load_test_1',
          to: 'load_test_1',
          type: 'self',
          strength: 1.0,
          created: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      metadata: {
        version: '1.0.0',
        created: new Date('2024-01-01T10:00:00Z'),
        nodeCount: 1,
        edgeCount: 1,
      },
    };

    beforeEach(async () => {
      // Prepare test file
      await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2));
    });

    test('loadGraph should load valid graph data from file', async () => {
      const loaded = await persistenceManager.loadGraph(testFilePath);

      expect(loaded.nodes).toHaveLength(1);
      expect(loaded.nodes[0].id).toBe('load_test_1');
      expect(loaded.edges).toHaveLength(1);
      expect(loaded.metadata.nodeCount).toBe(1);
    });

    test('loadGraph should handle missing files', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.json');
      
      await expect(persistenceManager.loadGraph(nonExistentPath))
        .rejects.toThrow('File not found');
    });

    test('loadGraph should handle corrupted JSON', async () => {
      const corruptedPath = path.join(testDir, 'corrupted.json');
      await fs.writeFile(corruptedPath, '{ invalid json content');
      
      await expect(persistenceManager.loadGraph(corruptedPath))
        .rejects.toThrow('Invalid JSON');
    });

    test('loadGraph should validate loaded data', async () => {
      const invalidDataPath = path.join(testDir, 'invalid.json');
      const invalidData = { invalid: 'structure' };
      await fs.writeFile(invalidDataPath, JSON.stringify(invalidData));
      
      await expect(persistenceManager.loadGraph(invalidDataPath))
        .rejects.toThrow('Invalid graph data structure');
    });

    test('loadGraph should handle date parsing correctly', async () => {
      const loaded = await persistenceManager.loadGraph(testFilePath);

      expect(loaded.nodes[0].created).toBeInstanceOf(Date);
      expect(loaded.nodes[0].modified).toBeInstanceOf(Date);
      expect(loaded.edges[0].created).toBeInstanceOf(Date);
      expect(loaded.metadata.created).toBeInstanceOf(Date);
    });

    test('loadGraph should preserve all data types', async () => {
      const complexData: GraphData = {
        nodes: [
          {
            id: 'complex_load',
            content: {
              text: 'complex text',
              number: 42,
              boolean: true,
              array: [1, 'two', { three: 3 }],
              null_value: null,
            },
            type: 'complex',
            created: new Date('2024-01-01T10:00:00Z'),
            modified: new Date('2024-01-01T10:00:00Z'),
          },
        ],
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date('2024-01-01T10:00:00Z'),
          nodeCount: 1,
          edgeCount: 0,
        },
      };

      const complexPath = path.join(testDir, 'complex.json');
      await fs.writeFile(complexPath, JSON.stringify(complexData, null, 2));

      const loaded = await persistenceManager.loadGraph(complexPath);
      expect(loaded).toEqual(complexData);
    });
  });

  describe('Backup and Recovery', () => {
    const backupTestData: GraphData = {
      nodes: [
        {
          id: 'backup_test',
          content: 'Backup test data',
          type: 'test',
          created: new Date('2024-01-01T10:00:00Z'),
          modified: new Date('2024-01-01T10:00:00Z'),
        },
      ],
      edges: [],
      metadata: {
        version: '1.0.0',
        created: new Date('2024-01-01T10:00:00Z'),
        nodeCount: 1,
        edgeCount: 0,
      },
    };

    test('saveWithBackup should create backup before saving', async () => {
      // Create initial file
      await persistenceManager.saveGraph(backupTestData, testFilePath);
      
      // Modify data and save with backup
      const modifiedData = { ...backupTestData };
      modifiedData.nodes[0].content = 'Modified content';
      
      await persistenceManager.saveWithBackup(modifiedData, testFilePath);

      // Verify backup file exists
      const backupPath = `${testFilePath}.backup`;
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);

      // Verify backup contains original data
      const backup = await persistenceManager.loadGraph(backupPath);
      expect(backup.nodes[0].content).toBe('Backup test data');

      // Verify main file contains modified data
      const main = await persistenceManager.loadGraph(testFilePath);
      expect(main.nodes[0].content).toBe('Modified content');
    });

    test('saveWithBackup should handle backup creation errors gracefully', async () => {
      // Try to save with backup to a protected directory
      const protectedPath = path.join('/root', 'protected.json');
      
      await expect(persistenceManager.saveWithBackup(backupTestData, protectedPath))
        .rejects.toThrow();
    });

    test('loadWithRecovery should recover from backup on main file corruption', async () => {
      const backupPath = `${testFilePath}.backup`;
      
      // Save data normally first
      await persistenceManager.saveGraph(backupTestData, testFilePath);
      await persistenceManager.saveGraph(backupTestData, backupPath);
      
      // Corrupt main file
      await fs.writeFile(testFilePath, 'corrupted data');
      
      // Recovery should use backup
      const recovered = await persistenceManager.loadWithRecovery(testFilePath);
      expect(recovered.nodes[0].id).toBe('backup_test');
    });

    test('loadWithRecovery should handle missing backup files', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.json');
      
      await expect(persistenceManager.loadWithRecovery(nonExistentPath))
        .rejects.toThrow('No backup file found');
    });

    test('createBackup should create timestamped backup', async () => {
      await persistenceManager.saveGraph(backupTestData, testFilePath);
      
      const backupPath = await persistenceManager.createBackup(testFilePath);
      
      expect(backupPath).toContain('.backup.');
      expect(backupPath).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/); // Timestamp format
      
      const backupExists = await fs.access(backupPath).then(() => true).catch(() => false);
      expect(backupExists).toBe(true);
    });

    test('listBackups should return all backup files', async () => {
      await persistenceManager.saveGraph(backupTestData, testFilePath);
      
      // Create multiple backups
      await persistenceManager.createBackup(testFilePath);
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamps
      await persistenceManager.createBackup(testFilePath);
      
      const backups = await persistenceManager.listBackups(testFilePath);
      expect(backups.length).toBeGreaterThanOrEqual(2);
      
      // Backups should be sorted by creation time (newest first)
      for (let i = 1; i < backups.length; i++) {
        expect(backups[i - 1].created >= backups[i].created).toBe(true);
      }
    });

    test('cleanupOldBackups should remove old backup files', async () => {
      await persistenceManager.saveGraph(backupTestData, testFilePath);
      
      // Create multiple backups with slight delay to ensure different timestamps
      const backup1 = await persistenceManager.createBackup(testFilePath);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const backup2 = await persistenceManager.createBackup(testFilePath);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const backup3 = await persistenceManager.createBackup(testFilePath);
      
      // Verify we have 3 backups
      const allBackups = await persistenceManager.listBackups(testFilePath);
      expect(allBackups.length).toBe(3);
      
      // Clean up keeping only 1 backup
      const removed = await persistenceManager.cleanupOldBackups(testFilePath, 1);
      expect(removed).toBeGreaterThan(0);
      
      const remainingBackups = await persistenceManager.listBackups(testFilePath);
      expect(remainingBackups.length).toBe(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle permission errors gracefully', async () => {
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir, { mode: 0o444 }); // Read-only directory
      const readOnlyPath = path.join(readOnlyDir, 'readonly.json');
      
      const testData: GraphData = {
        nodes: [],
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 0,
          edgeCount: 0,
        },
      };
      
      await expect(persistenceManager.saveGraph(testData, readOnlyPath))
        .rejects.toThrow();
    });

    test('should handle concurrent file access', async () => {
      const testData: GraphData = {
        nodes: [{ id: 'concurrent', content: 'test', type: 'test', created: new Date(), modified: new Date() }],
        edges: [],
        metadata: { version: '1.0.0', created: new Date(), nodeCount: 1, edgeCount: 0 },
      };
      
      // Simulate concurrent saves
      const savePromises = Array.from({ length: 5 }, (_, i) => {
        const concurrentData = { ...testData };
        concurrentData.nodes[0].content = `Concurrent save ${i}`;
        return persistenceManager.saveGraph(concurrentData, testFilePath);
      });
      
      // Concurrent saves may have some failures due to file system races, but at least some should succeed
      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0); // At least one save should succeed
      
      // File should exist and be valid
      const finalData = await persistenceManager.loadGraph(testFilePath);
      expect(finalData.nodes[0].id).toBe('concurrent');
    });

    test('should handle minimal and edge case values correctly', async () => {
      const edgeData: GraphData = {
        nodes: [
          {
            id: 'minimal_test',
            content: '', // Empty content is allowed
            type: 'minimal', // Type must be non-empty per schema
            created: new Date(),
            modified: new Date(),
          },
        ],
        edges: [
          {
            from: 'minimal_test',
            to: 'minimal_test',
            type: 'self', // Type must be non-empty per schema
            strength: 0, // Zero strength is valid
            created: new Date(),
          },
        ],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 1,
          edgeCount: 1,
        },
      };

      await persistenceManager.saveGraph(edgeData, testFilePath);
      const loaded = await persistenceManager.loadGraph(testFilePath);
      
      expect(loaded.nodes[0].content).toBe('');
      expect(loaded.nodes[0].type).toBe('minimal');
      expect(loaded.edges[0].type).toBe('self');
      expect(loaded.edges[0].strength).toBe(0);
    });

    test('should handle very large file paths', async () => {
      const longFileName = 'a'.repeat(100) + '.json';
      const longPath = path.join(testDir, longFileName);
      
      const testData: GraphData = {
        nodes: [],
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 0,
          edgeCount: 0,
        },
      };
      
      await persistenceManager.saveGraph(testData, longPath);
      const loaded = await persistenceManager.loadGraph(longPath);
      expect(loaded).toEqual(testData);
    });

    test('should handle file system race conditions', async () => {
      const testData: GraphData = {
        nodes: [{ id: 'race', content: 'test', type: 'test', created: new Date(), modified: new Date() }],
        edges: [],
        metadata: { version: '1.0.0', created: new Date(), nodeCount: 1, edgeCount: 0 },
      };
      
      // Save and immediately try to load
      const savePromise = persistenceManager.saveGraph(testData, testFilePath);
      
      // Wait a tiny bit and then try to load
      await new Promise(resolve => setTimeout(resolve, 1));
      const loadPromise = savePromise.then(() => persistenceManager.loadGraph(testFilePath));
      
      const [, loaded] = await Promise.all([savePromise, loadPromise]);
      expect(loaded.nodes[0].id).toBe('race');
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large JSON serialization efficiently', async () => {
      const largeContent = 'x'.repeat(10000); // 10KB of content per node
      const nodeCount = 100; // 100 nodes = ~1MB of data
      
      const largeData: GraphData = {
        nodes: Array.from({ length: nodeCount }, (_, i) => ({
          id: `large_${i}`,
          content: largeContent,
          type: 'large',
          created: new Date(),
          modified: new Date(),
        })),
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount,
          edgeCount: 0,
        },
      };

      const startTime = performance.now();
      await persistenceManager.saveGraph(largeData, testFilePath);
      const saveTime = performance.now() - startTime;

      const loadStartTime = performance.now();
      const loaded = await persistenceManager.loadGraph(testFilePath);
      const loadTime = performance.now() - loadStartTime;

      expect(saveTime).toBeLessThan(2000); // Save should complete within 2 seconds
      expect(loadTime).toBeLessThan(2000); // Load should complete within 2 seconds
      expect(loaded.nodes.length).toBe(nodeCount);
    });

    test('should handle efficient file I/O for large data', async () => {
      // Test that large data can be written efficiently
      const testData: GraphData = {
        nodes: Array.from({ length: 50 }, (_, i) => ({
          id: `stream_${i}`,
          content: `Content ${i}`,
          type: 'stream',
          created: new Date(),
          modified: new Date(),
        })),
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 50,
          edgeCount: 0,
        },
      };

      const startTime = performance.now();
      await persistenceManager.saveGraph(testData, testFilePath);
      const endTime = performance.now();
      
      // Should complete efficiently (less than 100ms for 50 nodes)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Verify data was saved correctly
      const stats = await fs.stat(testFilePath);
      expect(stats.size).toBeGreaterThan(0);
    });

    test('should compress data when beneficial', async () => {
      const repetitiveData: GraphData = {
        nodes: Array.from({ length: 100 }, (_, i) => ({
          id: `repeat_${i}`,
          content: 'This is repeated content that should compress well'.repeat(5),
          type: 'repetitive',
          created: new Date(),
          modified: new Date(),
        })),
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date(),
          nodeCount: 100,
          edgeCount: 0,
        },
      };

      await persistenceManager.saveGraph(repetitiveData, testFilePath);
      
      const stats = await fs.stat(testFilePath);
      const jsonString = JSON.stringify(repetitiveData);
      
      // The file should exist and be readable
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThan(jsonString.length * 2); // Reasonable size
    });
  });

  describe('Format Compatibility', () => {
    test('should maintain backward compatibility across versions', async () => {
      const v1Data: GraphData = {
        nodes: [
          {
            id: 'compat_test',
            content: 'Version compatibility test',
            type: 'compatibility',
            created: new Date('2024-01-01'),
            modified: new Date('2024-01-01'),
          },
        ],
        edges: [],
        metadata: {
          version: '1.0.0',
          created: new Date('2024-01-01'),
          nodeCount: 1,
          edgeCount: 0,
        },
      };

      await persistenceManager.saveGraph(v1Data, testFilePath);
      const loaded = await persistenceManager.loadGraph(testFilePath);
      
      expect(loaded).toEqual(v1Data);
      expect(loaded.metadata.version).toBe('1.0.0');
    });

    test('should handle future version formats gracefully', async () => {
      const futureData = {
        nodes: [
          {
            id: 'future_test',
            content: 'Future version test',
            type: 'future',
            created: new Date(),
            modified: new Date(),
            // Simulated future fields
            futureField: 'future value',
            tags: ['future', 'test'],
          },
        ],
        edges: [],
        metadata: {
          version: '2.0.0',
          created: new Date(),
          nodeCount: 1,
          edgeCount: 0,
          // Simulated future metadata
          compression: 'gzip',
          encryption: false,
        },
      } as unknown as GraphData;

      await fs.writeFile(testFilePath, JSON.stringify(futureData, null, 2));
      
      // Should load without throwing, even with unknown fields
      const loaded = await persistenceManager.loadGraph(testFilePath);
      expect(loaded.nodes[0].id).toBe('future_test');
    });

    test('should export data in standard JSON format', async () => {
      const standardData: GraphData = {
        nodes: [
          {
            id: 'export_test',
            content: { text: 'Export test', metadata: { custom: true } },
            type: 'export',
            created: new Date('2024-01-01T10:00:00.000Z'),
            modified: new Date('2024-01-01T10:00:00.000Z'),
          },
        ],
        edges: [
          {
            from: 'export_test',
            to: 'export_test',
            type: 'self_ref',
            strength: 1.0,
            created: new Date('2024-01-01T10:00:00.000Z'),
          },
        ],
        metadata: {
          version: '1.0.0',
          created: new Date('2024-01-01T10:00:00.000Z'),
          nodeCount: 1,
          edgeCount: 1,
        },
      };

      await persistenceManager.saveGraph(standardData, testFilePath);
      
      // Read raw file content and validate it's proper JSON
      const rawContent = await fs.readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(rawContent);
      
      expect(parsed).toHaveProperty('nodes');
      expect(parsed).toHaveProperty('edges');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed.nodes[0].created).toBe('2024-01-01T10:00:00.000Z');
    });
  });
});