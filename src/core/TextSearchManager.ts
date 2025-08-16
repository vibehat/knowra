/**
 * TextSearchManager - FlexSearch integration for efficient text search
 * 
 * Provides fast text search capabilities using FlexSearch with automatic
 * index management and updates. Supports searching across content, tags,
 * type fields, and metadata.
 */

import FlexSearch from 'flexsearch';
import type { Information, SearchOptions } from './types.js';
import { contentToString } from './utils.js';

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
  id: string;
  score: number;
  node: Information;
}

/**
 * FlexSearch configuration for different index types
 */
interface IndexConfig {
  tokenize: 'forward' | 'strict' | 'full';
  resolution: number;
  depth: number;
  threshold: number;
  stemmer: boolean;
}

/**
 * TextSearchManager handles all text search operations using FlexSearch
 */
export class TextSearchManager {
  // Multiple indexes for different search strategies
  private contentIndex: FlexSearch.Index;
  private typeIndex: FlexSearch.Index;
  private tagsIndex: FlexSearch.Index;
  private metadataIndex: FlexSearch.Index;

  // Document storage for full-text search
  private documentIndex: FlexSearch.Document<Information, ['content', 'type', 'metadata']>;

  // Mapping of node IDs to Information objects
  private nodeStorage = new Map<string, Information>();

  constructor() {
    // Content index - optimized for natural language search
    this.contentIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 3,
      depth: 2,
      threshold: 1,
      stemmer: true,
      cache: 100,
      charset: 'latin:extra',
    });

    // Type index - exact matching for types
    this.typeIndex = new FlexSearch.Index({
      tokenize: 'strict',
      resolution: 9,
      threshold: 0,
      stemmer: false,
      cache: 50,
    });

    // Tags index - word-based matching
    this.tagsIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 5,
      threshold: 1,
      stemmer: false,
      cache: 50,
    });

    // Metadata index - flexible search
    this.metadataIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 3,
      threshold: 2,
      stemmer: false,
      cache: 30,
    });

    // Document index for combined field search
    this.documentIndex = new FlexSearch.Document({
      tokenize: 'forward',
      resolution: 3,
      threshold: 1,
      stemmer: true,
      cache: 100,
      document: {
        id: 'id',
        field: ['content', 'type', 'metadata'],
      },
    });
  }

  /**
   * Add a node to the search indexes
   */
  addNode(node: Information): void {
    // Store the node
    this.nodeStorage.set(node.id, node);

    // Extract searchable text
    const content = contentToString(node.content);
    const type = node.type || '';
    const tags = this.extractTags(node);
    const metadata = this.extractMetadata(node);

    // Add to individual indexes
    this.contentIndex.add(node.id, content);
    this.typeIndex.add(node.id, type);
    if (tags) {
      this.tagsIndex.add(node.id, tags);
    }
    if (metadata) {
      this.metadataIndex.add(node.id, metadata);
    }

    // Add to document index
    this.documentIndex.add({
      id: node.id,
      content,
      type,
      metadata: metadata || '',
    });
  }

  /**
   * Update a node in the search indexes
   */
  updateNode(node: Information): void {
    // For updates, we need to remove and re-add to ensure clean indexing
    // Store the node first to avoid losing it
    const nodeExists = this.nodeStorage.has(node.id);
    
    if (nodeExists) {
      // Remove old entries from indexes only, keep storage for now
      this.contentIndex.remove(node.id);
      this.typeIndex.remove(node.id);
      this.tagsIndex.remove(node.id);
      this.metadataIndex.remove(node.id);
      this.documentIndex.remove(node.id);
    }
    
    // Add updated node (this will also update storage)
    this.addNode(node);
  }

  /**
   * Remove a node from all search indexes
   */
  removeNode(id: string): void {
    this.nodeStorage.delete(id);
    
    this.contentIndex.remove(id);
    this.typeIndex.remove(id);
    this.tagsIndex.remove(id);
    this.metadataIndex.remove(id);
    this.documentIndex.remove(id);
  }

  /**
   * Search across all indexes with relevance scoring
   */
  search(query: string, options?: SearchOptions): Information[] {
    if (!query.trim()) {
      return [];
    }

    const results = new Map<string, SearchResult>();
    const normalizedQuery = query.trim().toLowerCase();

    const searchLimit = Math.min(options?.limit || 50, 1000); // Cap at reasonable limit

    // Search content index (highest weight)
    this.searchIndex(this.contentIndex, normalizedQuery, results, 1.0, searchLimit);

    // Search type index (medium weight)
    this.searchIndex(this.typeIndex, normalizedQuery, results, 0.8, searchLimit);

    // Search tags index (medium weight)
    this.searchIndex(this.tagsIndex, normalizedQuery, results, 0.7, searchLimit);

    // Search metadata index (lower weight)
    this.searchIndex(this.metadataIndex, normalizedQuery, results, 0.5, searchLimit);

    // Document-based search for phrase matching
    const docResults = this.documentIndex.search(normalizedQuery, {
      limit: searchLimit,
      enrich: true,
    });

    // Process document search results - handle both enriched and simple formats
    for (const result of docResults) {
      let nodeId: string | undefined;
      
      if (typeof result === 'string') {
        nodeId = result;
      } else if (typeof result === 'object' && result !== null) {
        if ('id' in result) {
          nodeId = result.id as string;
        } else if ('field' in result && Array.isArray((result as any).result)) {
          // Handle enriched results format
          for (const fieldResult of (result as any).result) {
            if (typeof fieldResult === 'string') {
              nodeId = fieldResult;
              break;
            }
          }
        }
      }

      if (nodeId) {
        const node = this.nodeStorage.get(nodeId);
        if (node) {
          const existing = results.get(node.id);
          const score = (existing?.score || 0) + 0.9; // High weight for document matches
          results.set(node.id, {
            id: node.id,
            score,
            node,
          });
        }
      }
    }

    // Convert to sorted array
    const sortedResults = Array.from(results.values())
      .sort((a, b) => b.score - a.score);

    // Apply filters
    let filteredResults = sortedResults;

    if (options?.type) {
      filteredResults = filteredResults.filter(r => r.node.type === options.type);
    }

    // Extract nodes and apply sorting/pagination
    let nodes = filteredResults.map(r => r.node);

    // Apply additional sorting if requested (overrides relevance)
    if (options?.sortBy === 'created') {
      nodes.sort((a, b) => {
        const order = options.sortOrder === 'desc' ? -1 : 1;
        return order * (a.created.getTime() - b.created.getTime());
      });
    } else if (options?.sortBy === 'modified') {
      nodes.sort((a, b) => {
        const order = options.sortOrder === 'desc' ? -1 : 1;
        return order * (a.modified.getTime() - b.modified.getTime());
      });
    }

    // Apply pagination
    const start = options?.offset ?? 0;
    const end = options?.limit ? start + options.limit : undefined;

    return nodes.slice(start, end);
  }

  /**
   * Get search suggestions for autocomplete
   */
  getSuggestions(query: string, limit = 5): string[] {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();
    const normalizedQuery = query.toLowerCase();

    // Get suggestions from different indexes
    const contentSuggestions = this.contentIndex.search(normalizedQuery, {
      limit: limit * 2,
    });
    
    // Extract meaningful terms from content
    for (const id of contentSuggestions) {
      const node = this.nodeStorage.get(id as string);
      if (node) {
        const content = contentToString(node.content).toLowerCase();
        const words = content.split(/\s+/).filter(word => 
          word.length > 2 && word.includes(normalizedQuery)
        );
        words.slice(0, 2).forEach(word => suggestions.add(word));
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    this.nodeStorage.clear();
    
    this.contentIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 3,
      depth: 2,
      threshold: 1,
      stemmer: true,
      cache: 100,
    });

    this.typeIndex = new FlexSearch.Index({
      tokenize: 'strict',
      resolution: 9,
      threshold: 0,
      stemmer: false,
      cache: 50,
    });

    this.tagsIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 5,
      threshold: 1,
      stemmer: false,
      cache: 50,
    });

    this.metadataIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 3,
      threshold: 2,
      stemmer: false,
      cache: 30,
    });

    this.documentIndex = new FlexSearch.Document({
      tokenize: 'forward',
      resolution: 3,
      threshold: 1,
      stemmer: true,
      cache: 100,
      document: {
        id: 'id',
        field: ['content', 'type', 'metadata'],
      },
    });
  }

  /**
   * Get index statistics
   */
  getStats(): {
    nodeCount: number;
    contentIndexSize: number;
    typeIndexSize: number;
    tagsIndexSize: number;
    metadataIndexSize: number;
  } {
    return {
      nodeCount: this.nodeStorage.size,
      contentIndexSize: this.nodeStorage.size, // FlexSearch doesn't expose length, use node count
      typeIndexSize: this.nodeStorage.size,
      tagsIndexSize: this.nodeStorage.size,
      metadataIndexSize: this.nodeStorage.size,
    };
  }

  // ============ Private Helper Methods ============

  /**
   * Search a specific index and add results to the results map
   */
  private searchIndex(
    index: FlexSearch.Index,
    query: string,
    results: Map<string, SearchResult>,
    weight: number,
    limit = 50
  ): void {
    try {
      // Ensure query is a string and handle special characters
      if (typeof query !== 'string') {
        console.error('Query must be a string:', typeof query, query);
        return;
      }
      
      // Sanitize query for FlexSearch - remove/escape problematic characters
      const sanitizedQuery = query.replace(/[^\w\s\-]/g, ' ').trim();
      if (!sanitizedQuery) {
        return; // Empty query after sanitization
      }
      
      const indexResults = index.search(sanitizedQuery, { limit });
      
      for (const id of indexResults) {
        const node = this.nodeStorage.get(id as string);
        if (node) {
          const existing = results.get(node.id);
          const score = (existing?.score || 0) + weight;
          results.set(node.id, {
            id: node.id,
            score,
            node,
          });
        }
      }
    } catch (error) {
      console.error(`Error searching index:`, error);
    }
  }

  /**
   * Extract tags from node metadata or content
   */
  private extractTags(node: Information): string | null {
    // Check for tags in metadata
    if (node.metadata && typeof node.metadata === 'object') {
      const tags = (node.metadata as any).tags;
      if (Array.isArray(tags)) {
        return tags.filter(tag => typeof tag === 'string').join(' ');
      }
    }

    // Extract hashtags from content if it's a string
    if (typeof node.content === 'string') {
      const hashtags = node.content.match(/#\w+/g);
      if (hashtags) {
        return hashtags.join(' ');
      }
    }

    return null;
  }

  /**
   * Extract searchable text from metadata
   */
  private extractMetadata(node: Information): string | null {
    if (!node.metadata || typeof node.metadata !== 'object') {
      return null;
    }

    const searchableFields: string[] = [];
    
    // Recursive function to extract all searchable text from nested objects
    const extractFromValue = (key: string, value: unknown): void => {
      if (key === 'tags') return; // Tags handled separately
      
      if (typeof value === 'string') {
        searchableFields.push(`${key}:${value}`);
        searchableFields.push(value); // Also add just the value for direct search
      } else if (typeof value === 'number') {
        searchableFields.push(`${key}:${value}`);
      } else if (typeof value === 'boolean') {
        searchableFields.push(`${key}:${value}`);
      } else if (Array.isArray(value)) {
        const stringValues = value.filter(v => typeof v === 'string');
        if (stringValues.length > 0) {
          searchableFields.push(`${key}:${stringValues.join(' ')}`);
          searchableFields.push(...stringValues); // Also add values directly
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          extractFromValue(`${key}.${nestedKey}`, nestedValue);
        }
      }
    };
    
    for (const [key, value] of Object.entries(node.metadata)) {
      extractFromValue(key, value);
    }

    return searchableFields.length > 0 ? searchableFields.join(' ') : null;
  }
}