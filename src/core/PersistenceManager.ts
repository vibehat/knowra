/**
 * PersistenceManager - JSON-based persistence for Knowra
 * 
 * This class handles saving and loading graph data to/from JSON files,
 * with support for data validation, backup management, and error recovery.
 * 
 * Key features:
 * - JSON serialization with proper date handling
 * - Data validation using Zod schemas
 * - Automatic backup creation
 * - Error recovery from backup files
 * - Concurrent access handling
 * - Performance optimized for large datasets
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { GraphData, BackupInfo } from './types.js';
import { validateGraphData } from './types.js';

/**
 * Error class for persistence operations
 */
export class PersistenceError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string = 'PERSISTENCE_ERROR', context?: Record<string, unknown>) {
    super(message);
    this.name = 'PersistenceError';
    this.code = code;
    this.context = context;
  }
}

/**
 * PersistenceManager handles all file I/O operations for the Knowledge Database
 */
export class PersistenceManager {
  private static readonly BACKUP_SUFFIX = '.backup';
  private static readonly MAX_BACKUPS = 5;

  constructor() {
    // Initialize any needed resources
  }

  // ============ Core Save/Load Operations ============

  /**
   * Save graph data to a JSON file
   * @param data GraphData to save
   * @param filePath Target file path
   * @throws PersistenceError if save fails
   */
  async saveGraph(data: GraphData, filePath: string): Promise<void> {
    try {
      // Validate data before saving
      if (!this.validateGraphData(data)) {
        throw new PersistenceError(
          'Invalid graph data structure',
          'INVALID_DATA',
          { nodeCount: data.nodes?.length, edgeCount: data.edges?.length }
        );
      }

      // Ensure directory exists
      await this.ensureDirectoryExists(path.dirname(filePath));

      // Serialize data with proper JSON formatting
      const jsonData = this.serializeGraphData(data);

      // Write to temporary file first, then rename (atomic operation)
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, jsonData, 'utf-8');
      await fs.rename(tempPath, filePath);

    } catch (error) {
      if (error instanceof PersistenceError) {
        throw error;
      }

      throw new PersistenceError(
        `Failed to save graph to ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED',
        { filePath, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Load graph data from a JSON file
   * @param filePath Source file path
   * @returns Loaded GraphData
   * @throws PersistenceError if load fails
   */
  async loadGraph(filePath: string): Promise<GraphData> {
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new PersistenceError(
          `File not found: ${filePath}`,
          'FILE_NOT_FOUND',
          { filePath }
        );
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse JSON with error handling
      let rawData: unknown;
      try {
        rawData = JSON.parse(content);
      } catch (parseError) {
        throw new PersistenceError(
          `Invalid JSON in file: ${filePath}`,
          'INVALID_JSON',
          { filePath, parseError: parseError instanceof Error ? parseError.message : String(parseError) }
        );
      }

      // Deserialize and validate
      const graphData = this.deserializeGraphData(rawData);
      
      if (!this.validateGraphData(graphData)) {
        throw new PersistenceError(
          `Invalid graph data structure in file: ${filePath}`,
          'INVALID_STRUCTURE',
          { filePath }
        );
      }

      return graphData;

    } catch (error) {
      if (error instanceof PersistenceError) {
        throw error;
      }

      throw new PersistenceError(
        `Failed to load graph from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOAD_FAILED',
        { filePath, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ============ Data Validation ============

  /**
   * Validate graph data structure
   * @param data Data to validate
   * @returns True if valid, false otherwise
   */
  validateGraphData(data: unknown): data is GraphData {
    return validateGraphData(data);
  }

  // ============ Backup and Recovery ============

  /**
   * Save graph data with automatic backup creation
   * @param data GraphData to save
   * @param filePath Target file path
   * @throws PersistenceError if save fails
   */
  async saveWithBackup(data: GraphData, filePath: string): Promise<void> {
    try {
      // Create backup if file exists
      const fileExists = await this.fileExists(filePath);
      if (fileExists) {
        // Create both simple and timestamped backups
        const simpleBackupPath = `${filePath}${PersistenceManager.BACKUP_SUFFIX}`;
        await fs.copyFile(filePath, simpleBackupPath);
        await this.createBackup(filePath);
      }

      // Save the new data
      await this.saveGraph(data, filePath);

      // Clean up old backups
      await this.cleanupOldBackups(filePath, PersistenceManager.MAX_BACKUPS);

    } catch (error) {
      throw new PersistenceError(
        `Failed to save with backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_WITH_BACKUP_FAILED',
        { filePath, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Load graph data with automatic recovery from backup if needed
   * @param filePath Source file path
   * @returns Loaded GraphData
   * @throws PersistenceError if load and recovery fail
   */
  async loadWithRecovery(filePath: string): Promise<GraphData> {
    try {
      // Try to load the main file first
      return await this.loadGraph(filePath);
    } catch (mainError) {
      // If main file fails, try backup
      const backupPath = `${filePath}${PersistenceManager.BACKUP_SUFFIX}`;
      
      try {
        const data = await this.loadGraph(backupPath);
        console.warn(`Recovered data from backup: ${backupPath}`);
        return data;
      } catch (backupError) {
        // Try timestamped backups
        const backups = await this.listBackups(filePath);
        
        for (const backup of backups) {
          try {
            const data = await this.loadGraph(backup.path);
            console.warn(`Recovered data from backup: ${backup.path}`);
            return data;
          } catch {
            // Continue to next backup
          }
        }

        // No recovery possible
        throw new PersistenceError(
          `No backup file found`,
          'NO_BACKUP_FOUND',
          { 
            filePath, 
            mainError: mainError instanceof Error ? mainError.message : String(mainError),
            backupError: backupError instanceof Error ? backupError.message : String(backupError)
          }
        );
      }
    }
  }

  /**
   * Create a backup of an existing file
   * @param filePath Path to file to backup
   * @returns Path to the created backup
   * @throws PersistenceError if backup creation fails
   */
  async createBackup(filePath: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;

      await fs.copyFile(filePath, backupPath);
      return backupPath;

    } catch (error) {
      throw new PersistenceError(
        `Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BACKUP_FAILED',
        { filePath, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * List all backup files for a given main file
   * @param filePath Main file path
   * @returns Array of BackupInfo objects sorted by creation time (newest first)
   */
  async listBackups(filePath: string): Promise<BackupInfo[]> {
    try {
      const directory = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const backupPattern = `${fileName}.backup.`;

      const files = await fs.readdir(directory);
      const backupFiles = files.filter(file => file.startsWith(backupPattern));

      const backups: BackupInfo[] = [];

      for (const backupFile of backupFiles) {
        const backupPath = path.join(directory, backupFile);
        
        try {
          const stats = await fs.stat(backupPath);
          const isValid = await this.isValidBackupFile(backupPath);

          backups.push({
            path: backupPath,
            created: stats.mtime,
            size: stats.size,
            isValid,
          });
        } catch {
          // Skip invalid backup files
        }
      }

      // Sort by creation time (newest first)
      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    } catch (error) {
      throw new PersistenceError(
        `Failed to list backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LIST_BACKUPS_FAILED',
        { filePath, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Clean up old backup files, keeping only the most recent ones
   * @param filePath Main file path
   * @param maxBackups Maximum number of backups to keep
   * @returns Number of backups removed
   */
  async cleanupOldBackups(filePath: string, maxBackups: number): Promise<number> {
    try {
      const backups = await this.listBackups(filePath);
      
      if (backups.length <= maxBackups) {
        return 0;
      }

      const backupsToRemove = backups.slice(maxBackups);
      let removedCount = 0;

      for (const backup of backupsToRemove) {
        try {
          await fs.unlink(backup.path);
          removedCount++;
        } catch {
          // Continue even if some deletions fail
        }
      }

      return removedCount;

    } catch (error) {
      throw new PersistenceError(
        `Failed to cleanup old backups: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEANUP_FAILED',
        { filePath, maxBackups, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  // ============ Private Helper Methods ============

  /**
   * Serialize GraphData to JSON string with proper formatting
   */
  private serializeGraphData(data: GraphData): string {
    // Custom serializer to handle Date objects properly
    return JSON.stringify(data, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2); // Pretty-print with 2-space indentation
  }

  /**
   * Deserialize raw data to GraphData with proper type conversion
   */
  private deserializeGraphData(rawData: unknown): GraphData {
    if (typeof rawData !== 'object' || rawData === null) {
      throw new Error('Invalid data format');
    }

    const data = rawData as Record<string, unknown>;

    // Convert date strings back to Date objects
    const convertDates = (obj: unknown): unknown => {
      if (typeof obj === 'string' && this.isISODateString(obj)) {
        return new Date(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(convertDates);
      }
      
      if (typeof obj === 'object' && obj !== null) {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = convertDates(value);
        }
        return result;
      }
      
      return obj;
    };

    return convertDates(data) as GraphData;
  }

  /**
   * Check if a string is a valid ISO date string
   */
  private isISODateString(str: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    return iso8601Regex.test(str) && !isNaN(Date.parse(str));
  }

  /**
   * Ensure a directory exists, creating it if necessary
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new PersistenceError(
        `Failed to create directory: ${dirPath}`,
        'MKDIR_FAILED',
        { dirPath, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a backup file contains valid graph data
   */
  private async isValidBackupFile(backupPath: string): Promise<boolean> {
    try {
      const data = await this.loadGraph(backupPath);
      return this.validateGraphData(data);
    } catch {
      return false;
    }
  }
}