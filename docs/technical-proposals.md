# Technical Proposal: Knowra Knowledge Graph Implementation (Simplified with Intelligence)

> A practical knowledge graph with built-in LLM intelligence

## Executive Summary

Build a minimal yet intelligent knowledge graph system that:
- Encodes information into knowledge using LLMs (OpenAI API)
- Provides semantic search using embeddings
- Tracks experience through graph paths
- Manages knowledge as subgraphs
- Supports parallel exploration for context building
- Has a simple plugin system for progressive enhancement
- Integrates with Claude Code via MCP

**Simple architecture, intelligent capabilities. Focus on practical LLM integration for real-world use.**

## Layer Architecture

```
┌──────────────────────────────────────────────────┐
│              Top Layer                           │
│   CLI Interface | Claude Code Interface          │
│        (User Interaction Layer)                  │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│          Plugin System Layer                     │
│  ┌─────────┐ ┌──────────┐ ┌────────────┐       │
│  │   MCP   │ │   CLI    │ │    GUI     │       │
│  │ Server  │ │  Tools   │ │  Explorer  │       │
│  └─────────┘ └──────────┘ └────────────┘       │
│         (Extensible Plugin Architecture)         │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│            Knowra Core Layer                     │
│                                                  │
│  Core API Functions:                             │
│  ┌────────────────────────────────────────────┐ │
│  │ • Encode: Text → Knowledge (via LLM)       │ │
│  │ • Index: Tags, Categories, Embeddings      │ │
│  │ • Search: Semantic + Text (Hybrid)         │ │
│  │ • Experience: Path Tracking & Learning     │ │
│  │ • Knowledge: Subgraph Operations           │ │
│  │ • Context: Parallel Exploration            │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  Data Structures:                                │
│  • Information (Nodes with embeddings)           │
│  • Experience (Paths through graph)              │
│  • Knowledge (Subgraphs with context)            │
└──────────────────────────────────────────────────┘
```

## Technology Stack

### Core Dependencies (Minimal but Intelligent)
```json
{
  "dependencies": {
    "graphology": "^0.25.0",           // Graph operations
    "flexsearch": "^0.7.31",           // Text search
    "openai": "^4.0.0",                // LLM integration for encoding & embeddings
    "@modelcontextprotocol/sdk": "^0.5.0", // MCP integration
    "zod": "^3.22.0",                  // Schema validation
    "p-queue": "^7.4.0"                // Parallel operations management
  }
}
```

Minimal dependencies with maximum intelligence. OpenAI API provides both text understanding and semantic search capabilities.

## Core Implementation

### 1. KnowraCore - The Entire System

```typescript
import Graph from 'graphology';
import FlexSearch from 'flexsearch';
import { readFileSync, writeFileSync, existsSync } from 'fs';

interface Node {
  id: string;
  content: any;
  type?: string;
  tags?: string[];
  category?: string;
  embedding?: number[];  // Vector for semantic search
  summary?: string;      // LLM-generated summary
  created: Date;
  modified: Date;
  accessed?: Date;       // For experience tracking
  accessCount?: number;  // Usage patterns
}

interface Edge {
  from: string;
  to: string;
  type: string;
  strength?: number;     // Connection strength
  metadata?: Record<string, any>;
  created?: Date;
  lastTraversed?: Date;  // For experience tracking
}

interface Experience {
  id: string;
  path: string[];        // Sequence of node IDs
  context: string;       // What was learned
  timestamp: Date;
  success?: boolean;     // Was the exploration successful?
}

interface Knowledge {
  id: string;
  nodes: string[];       // Node IDs in this knowledge chunk
  edges: Edge[];         // Relationships within the chunk
  summary: string;       // LLM-generated summary of the subgraph
  domain?: string;       // Knowledge domain/category
}

export class KnowraCore {
  private graph: Graph;
  private searchIndex: FlexSearch.Index;
  private dataPath: string;
  private plugins: Map<string, Plugin> = new Map();
  private experiences: Map<string, Experience> = new Map();
  private knowledgeChunks: Map<string, Knowledge> = new Map();
  private openai: OpenAI | null = null;
  private embeddings: Map<string, number[]> = new Map();
  private queue: PQueue;

  constructor(dataPath = './knowra-data.json', openaiKey?: string) {
    this.dataPath = dataPath;
    this.graph = new Graph();
    this.searchIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 9
    });
    
    // Initialize OpenAI if key provided
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
    
    // Queue for parallel operations
    this.queue = new PQueue({ concurrency: 5 });
    
    this.load();
  }

  // === INTELLIGENT ENCODING ===
  
  async encodeInformation(text: string, metadata?: Partial<Node>): Promise<string> {
    // Use LLM to understand and structure the information
    if (this.openai) {
      try {
        // Generate embedding for semantic search
        const embeddingResponse = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text
        });
        const embedding = embeddingResponse.data[0].embedding;
        
        // Extract key information using LLM
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Extract and structure key information from the text. Return JSON with: summary (brief summary), tags (array of relevant tags), category (main category), entities (key entities mentioned).'
            },
            { role: 'user', content: text }
          ],
          response_format: { type: 'json_object' }
        });
        
        const extracted = JSON.parse(completion.choices[0].message.content || '{}');
        
        // Create enriched node
        return this.addNode({
          original: text,
          ...extracted
        }, {
          ...metadata,
          embedding,
          summary: extracted.summary,
          tags: extracted.tags || metadata?.tags,
          category: extracted.category || metadata?.category
        });
      } catch (error) {
        console.error('LLM encoding failed, falling back to basic storage:', error);
      }
    }
    
    // Fallback to basic storage
    return this.addNode(text, metadata);
  }
  
  // === CORE OPERATIONS ===
  
  addNode(content: any, metadata?: Partial<Node>): string {
    const id = metadata?.id || `node_${Date.now()}_${Math.random()}`;
    const node: Node = {
      id,
      content,
      type: metadata?.type || 'knowledge',
      tags: metadata?.tags || [],
      created: new Date(),
      modified: new Date()
    };
    
    this.graph.addNode(id, node);
    
    // Index for search
    if (typeof content === 'string') {
      this.searchIndex.add(id, content);
    } else if (content?.text) {
      this.searchIndex.add(id, content.text);
    }
    
    this.save();
    return id;
  }

  getNode(id: string): Node | null {
    if (!this.graph.hasNode(id)) return null;
    return this.graph.getNodeAttributes(id) as Node;
  }

  updateNode(id: string, content: any, metadata?: Partial<Node>): boolean {
    if (!this.graph.hasNode(id)) return false;
    
    const existing = this.graph.getNodeAttributes(id) as Node;
    const updated: Node = {
      ...existing,
      ...metadata,
      content,
      modified: new Date()
    };
    
    this.graph.setNodeAttributes(id, updated);
    
    // Update search index
    this.searchIndex.remove(id);
    if (typeof content === 'string') {
      this.searchIndex.add(id, content);
    } else if (content?.text) {
      this.searchIndex.add(id, content.text);
    }
    
    this.save();
    return true;
  }

  deleteNode(id: string): boolean {
    if (!this.graph.hasNode(id)) return false;
    this.graph.dropNode(id);
    this.searchIndex.remove(id);
    this.save();
    return true;
  }

  // === RELATIONSHIPS ===
  
  addEdge(from: string, to: string, type: string, metadata?: Record<string, any>): boolean {
    if (!this.graph.hasNode(from) || !this.graph.hasNode(to)) return false;
    
    this.graph.addEdge(from, to, {
      type,
      metadata: metadata || {},
      created: new Date()
    });
    
    this.save();
    return true;
  }

  getEdges(nodeId: string): Edge[] {
    const edges: Edge[] = [];
    
    // Outgoing edges
    this.graph.forEachOutEdge(nodeId, (edge, attrs, source, target) => {
      edges.push({
        from: source,
        to: target,
        type: attrs.type,
        metadata: attrs.metadata
      });
    });
    
    // Incoming edges
    this.graph.forEachInEdge(nodeId, (edge, attrs, source, target) => {
      edges.push({
        from: source,
        to: target,
        type: attrs.type,
        metadata: attrs.metadata
      });
    });
    
    return edges;
  }

  // === SEMANTIC SEARCH ===
  
  async semanticSearch(query: string, limit = 10): Promise<Node[]> {
    if (!this.openai) {
      // Fallback to text search
      return this.search(query, limit);
    }
    
    try {
      // Get query embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;
      
      // Calculate similarities
      const similarities: Array<{ id: string; similarity: number }> = [];
      
      this.graph.forEachNode((id, attrs) => {
        const node = attrs as Node;
        if (node.embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, node.embedding);
          similarities.push({ id, similarity });
        }
      });
      
      // Sort by similarity and get top results
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      const semanticResults = similarities
        .slice(0, limit)
        .map(({ id }) => this.getNode(id))
        .filter(node => node !== null) as Node[];
      
      // Hybrid approach: combine with text search
      const textResults = this.search(query, limit);
      
      // Merge and deduplicate
      const merged = new Map<string, Node>();
      semanticResults.forEach(node => merged.set(node.id, node));
      textResults.forEach(node => merged.set(node.id, node));
      
      return Array.from(merged.values()).slice(0, limit);
    } catch (error) {
      console.error('Semantic search failed, falling back to text search:', error);
      return this.search(query, limit);
    }
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  // === BASIC SEARCH (kept for fallback) ===
  
  search(query: string, limit = 10): Node[] {
    const results = this.searchIndex.search(query, { limit });
    return results
      .map(id => this.getNode(id as string))
      .filter(node => node !== null) as Node[];
  }

  searchByTag(tag: string): Node[] {
    const results: Node[] = [];
    this.graph.forEachNode((id, attrs) => {
      const node = attrs as Node;
      if (node.tags?.includes(tag)) {
        results.push(node);
      }
    });
    return results;
  }

  searchByType(type: string): Node[] {
    const results: Node[] = [];
    this.graph.forEachNode((id, attrs) => {
      const node = attrs as Node;
      if (node.type === type) {
        results.push(node);
      }
    });
    return results;
  }

  // === EXPERIENCE TRACKING ===
  
  trackExperience(path: string[], context: string, success = true): string {
    const experienceId = `exp_${Date.now()}`;
    const experience: Experience = {
      id: experienceId,
      path,
      context,
      timestamp: new Date(),
      success
    };
    
    this.experiences.set(experienceId, experience);
    
    // Update access patterns
    path.forEach(nodeId => {
      const node = this.getNode(nodeId);
      if (node) {
        node.accessed = new Date();
        node.accessCount = (node.accessCount || 0) + 1;
        this.updateNode(nodeId, node.content, node);
      }
    });
    
    // Strengthen connections along successful paths
    if (success) {
      for (let i = 0; i < path.length - 1; i++) {
        const edges = this.graph.edges(path[i], path[i + 1]);
        edges.forEach(edge => {
          const attrs = this.graph.getEdgeAttributes(edge);
          attrs.strength = (attrs.strength || 1) * 1.1;
          attrs.lastTraversed = new Date();
          this.graph.setEdgeAttributes(edge, attrs);
        });
      }
    }
    
    this.save();
    return experienceId;
  }
  
  getRelevantExperiences(nodeId: string, limit = 5): Experience[] {
    const relevant: Experience[] = [];
    
    this.experiences.forEach(exp => {
      if (exp.path.includes(nodeId)) {
        relevant.push(exp);
      }
    });
    
    return relevant
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // === KNOWLEDGE OPERATIONS ===
  
  async createKnowledgeChunk(nodeIds: string[], domain?: string): Promise<string> {
    const subgraph = this.getSubgraph(nodeIds);
    const knowledgeId = `knowledge_${Date.now()}`;
    
    // Generate summary if LLM available
    let summary = 'Knowledge chunk';
    if (this.openai && subgraph.nodes.length > 0) {
      try {
        const context = subgraph.nodes
          .map(n => n.summary || n.content)
          .join('\n');
        
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Summarize the following knowledge in 2-3 sentences.'
            },
            { role: 'user', content: context }
          ]
        });
        
        summary = completion.choices[0].message.content || summary;
      } catch (error) {
        console.error('Failed to generate knowledge summary:', error);
      }
    }
    
    const knowledge: Knowledge = {
      id: knowledgeId,
      nodes: nodeIds,
      edges: subgraph.edges,
      summary,
      domain
    };
    
    this.knowledgeChunks.set(knowledgeId, knowledge);
    this.save();
    
    return knowledgeId;
  }
  
  // === PARALLEL EXPLORATION ===
  
  async exploreParallel(
    startNodes: string[], 
    depth = 2, 
    contextQuery?: string
  ): Promise<{ nodes: Node[], context: string }> {
    const explored = new Set<string>();
    const results: Node[] = [];
    
    // Parallel exploration from multiple starting points
    await this.queue.addAll(
      startNodes.map(nodeId => async () => {
        const neighbors = this.getNeighbors(nodeId, depth);
        neighbors.forEach(id => explored.add(id));
      })
    );
    
    // Collect all explored nodes
    explored.forEach(id => {
      const node = this.getNode(id);
      if (node) results.push(node);
    });
    
    // Generate context summary if LLM available
    let context = `Explored ${results.length} nodes from ${startNodes.length} starting points`;
    
    if (this.openai && contextQuery) {
      try {
        const nodeContext = results
          .map(n => n.summary || n.content)
          .join('\n');
        
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Based on the following information, answer the question or provide relevant context.'
            },
            { role: 'user', content: `Question: ${contextQuery}\n\nInformation:\n${nodeContext}` }
          ]
        });
        
        context = completion.choices[0].message.content || context;
      } catch (error) {
        console.error('Failed to generate context:', error);
      }
    }
    
    return { nodes: results, context };
  }
  
  // === GRAPH OPERATIONS ===
  
  getNeighbors(nodeId: string, depth = 1): string[] {
    if (!this.graph.hasNode(nodeId)) return [];
    
    const visited = new Set<string>();
    const queue = [{ id: nodeId, level: 0 }];
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      
      if (level > depth) break;
      if (visited.has(id)) continue;
      
      visited.add(id);
      
      if (level < depth) {
        this.graph.forEachNeighbor(id, (neighborId) => {
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, level: level + 1 });
          }
        });
      }
    }
    
    visited.delete(nodeId); // Remove the starting node
    return Array.from(visited);
  }

  getSubgraph(nodeIds: string[]): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeSet = new Set(nodeIds);
    
    // Get nodes
    nodeIds.forEach(id => {
      const node = this.getNode(id);
      if (node) nodes.push(node);
    });
    
    // Get edges between these nodes
    this.graph.forEachEdge((edge, attrs, source, target) => {
      if (nodeSet.has(source) && nodeSet.has(target)) {
        edges.push({
          from: source,
          to: target,
          type: attrs.type,
          metadata: attrs.metadata
        });
      }
    });
    
    return { nodes, edges };
  }

  // === PLUGIN SYSTEM ===
  
  use(plugin: Plugin): void {
    plugin.init(this);
    this.plugins.set(plugin.name, plugin);
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  // === PERSISTENCE ===
  
  save(): void {
    const data = {
      nodes: [] as any[],
      edges: [] as any[]
    };
    
    this.graph.forEachNode((id, attrs) => {
      data.nodes.push({ id, ...attrs });
    });
    
    this.graph.forEachEdge((edge, attrs, source, target) => {
      data.edges.push({ from: source, to: target, ...attrs });
    });
    
    writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
  }

  load(): void {
    if (!existsSync(this.dataPath)) return;
    
    try {
      const data = JSON.parse(readFileSync(this.dataPath, 'utf-8'));
      
      // Load nodes
      data.nodes?.forEach((node: any) => {
        this.graph.addNode(node.id, node);
        // Rebuild search index
        if (typeof node.content === 'string') {
          this.searchIndex.add(node.id, node.content);
        } else if (node.content?.text) {
          this.searchIndex.add(node.id, node.content.text);
        }
      });
      
      // Load edges
      data.edges?.forEach((edge: any) => {
        if (this.graph.hasNode(edge.from) && this.graph.hasNode(edge.to)) {
          this.graph.addEdge(edge.from, edge.to, {
            type: edge.type,
            metadata: edge.metadata,
            created: edge.created
          });
        }
      });
    } catch (error) {
      console.error('Failed to load graph:', error);
    }
  }

  // === UTILITIES ===
  
  getStats() {
    return {
      nodes: this.graph.order,
      edges: this.graph.size,
      types: this.getUniqueTypes(),
      tags: this.getUniqueTags()
    };
  }

  private getUniqueTypes(): string[] {
    const types = new Set<string>();
    this.graph.forEachNode((id, attrs) => {
      const node = attrs as Node;
      if (node.type) types.add(node.type);
    });
    return Array.from(types);
  }

  private getUniqueTags(): string[] {
    const tags = new Set<string>();
    this.graph.forEachNode((id, attrs) => {
      const node = attrs as Node;
      node.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }

  clear(): void {
    this.graph.clear();
    this.searchIndex = new FlexSearch.Index({
      tokenize: 'forward',
      resolution: 9
    });
    this.save();
  }
}

// === SIMPLE PLUGIN INTERFACE ===

export interface Plugin {
  name: string;
  init(core: KnowraCore): void;
}
```

## MCP Server Integration

### Simple MCP Server

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { KnowraCore } from './KnowraCore.js';

export class KnowraMCPServer {
  private server: Server;
  private knowra: KnowraCore;

  constructor() {
    this.knowra = new KnowraCore();
    this.server = new Server(
      {
        name: 'knowra',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupTools();
  }

  private setupTools(): void {
    // Add knowledge
    this.server.setRequestHandler('tools/list', async () => ({
      tools: [
        {
          name: 'add_knowledge',
          description: 'Add a knowledge node to the graph',
          inputSchema: {
            type: 'object',
            properties: {
              content: { 
                type: 'string',
                description: 'The knowledge content to store'
              },
              type: { 
                type: 'string',
                description: 'Type of knowledge (optional)'
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for the knowledge (optional)'
              }
            },
            required: ['content']
          }
        },
        {
          name: 'search_knowledge',
          description: 'Search for knowledge nodes',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              limit: {
                type: 'number',
                description: 'Maximum results (default: 10)'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'connect_knowledge',
          description: 'Create a relationship between two knowledge nodes',
          inputSchema: {
            type: 'object',
            properties: {
              from: {
                type: 'string',
                description: 'Source node ID'
              },
              to: {
                type: 'string',
                description: 'Target node ID'
              },
              type: {
                type: 'string',
                description: 'Relationship type'
              }
            },
            required: ['from', 'to', 'type']
          }
        },
        {
          name: 'get_context',
          description: 'Get context around a knowledge node',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: {
                type: 'string',
                description: 'Node ID to get context for'
              },
              depth: {
                type: 'number',
                description: 'Depth of context (default: 1)'
              }
            },
            required: ['nodeId']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'add_knowledge': {
          const id = this.knowra.addNode(args.content, {
            type: args.type,
            tags: args.tags
          });
          return {
            content: [
              {
                type: 'text',
                text: `Added knowledge node: ${id}`
              }
            ]
          };
        }

        case 'search_knowledge': {
          const results = this.knowra.search(args.query, args.limit || 10);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2)
              }
            ]
          };
        }

        case 'connect_knowledge': {
          const success = this.knowra.addEdge(args.from, args.to, args.type);
          return {
            content: [
              {
                type: 'text',
                text: success 
                  ? `Connected ${args.from} to ${args.to} with type: ${args.type}`
                  : 'Failed to create connection (nodes not found)'
              }
            ]
          };
        }

        case 'get_context': {
          const neighbors = this.knowra.getNeighbors(args.nodeId, args.depth || 1);
          const subgraph = this.knowra.getSubgraph([args.nodeId, ...neighbors]);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(subgraph, null, 2)
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Knowra MCP server started');
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new KnowraMCPServer();
  server.start().catch(console.error);
}
```

## Example Plugin

```typescript
// Simple plugin to track access patterns
export class AccessTrackerPlugin implements Plugin {
  name = 'access-tracker';
  private accessCounts = new Map<string, number>();

  init(core: KnowraCore): void {
    // Hook into getNode to track access
    const originalGetNode = core.getNode.bind(core);
    core.getNode = (id: string) => {
      this.accessCounts.set(id, (this.accessCounts.get(id) || 0) + 1);
      return originalGetNode(id);
    };
  }

  getMostAccessed(limit = 10): Array<{ id: string; count: number }> {
    return Array.from(this.accessCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ id, count }));
  }
}
```

## Usage Example

```typescript
// Create knowledge graph
const knowra = new KnowraCore('./my-knowledge.json');

// Add knowledge
const nodeId1 = knowra.addNode('TypeScript is a typed superset of JavaScript', {
  type: 'fact',
  tags: ['programming', 'typescript', 'javascript']
});

const nodeId2 = knowra.addNode('React is a JavaScript library for building UIs', {
  type: 'fact',
  tags: ['programming', 'react', 'javascript']
});

// Connect knowledge
knowra.addEdge(nodeId1, nodeId2, 'related_to');

// Search
const results = knowra.search('JavaScript');

// Get context
const context = knowra.getNeighbors(nodeId1, 2);

// Use a plugin
knowra.use(new AccessTrackerPlugin());
```

## File Structure

```
knowra/
├── src/
│   ├── core/
│   │   └── KnowraCore.ts       # Core graph implementation
│   ├── mcp/
│   │   └── server.ts           # MCP server
│   └── plugins/
│       └── access-tracker.ts   # Example plugin
├── package.json
├── tsconfig.json
└── knowra-data.json            # Graph storage
```

## Key Scenarios

### 1. Codebase Indexing
```typescript
// Index a codebase for intelligent search
const knowra = new KnowraCore('./codebase-knowledge.json', process.env.OPENAI_KEY);

// Encode implementation insights
const nodeId = await knowra.encodeInformation(
  'The authentication module uses JWT tokens with refresh rotation. Implementation in auth.service.ts handles token generation and validation.',
  { type: 'implementation', tags: ['auth', 'security', 'jwt'] }
);

// Later: Find latest insights
const results = await knowra.semanticSearch(
  'How does authentication work in this codebase?'
);

// Get full context
const context = await knowra.exploreParallel(
  results.map(r => r.id),
  2,
  'Explain the authentication flow'
);
```

### 2. Task Management Database
```typescript
// Track what's been done and what's next
const taskGraph = new KnowraCore('./tasks.json', process.env.OPENAI_KEY);

// Record completed work
const doneId = await taskGraph.encodeInformation(
  'Completed user authentication module with JWT implementation',
  { type: 'completed', category: 'backend' }
);

// Record next steps
const todoId = await taskGraph.encodeInformation(
  'Need to add rate limiting to authentication endpoints',
  { type: 'todo', category: 'backend', tags: ['security', 'priority-high'] }
);

// Connect tasks
taskGraph.addEdge(doneId, todoId, 'leads_to');

// Track the journey
taskGraph.trackExperience(
  [doneId, todoId],
  'Authentication implementation requires rate limiting for production',
  true
);

// AI never loses context
const taskContext = await taskGraph.semanticSearch(
  'What needs to be done for authentication?'
);
```

### 3. Knowledge Evolution
```typescript
// Track how understanding improves
const learningGraph = new KnowraCore('./learning.json', process.env.OPENAI_KEY);

// Initial understanding
const v1 = await learningGraph.encodeInformation(
  'React components are functions that return JSX',
  { type: 'concept', version: 1 }
);

// Deeper understanding
const v2 = await learningGraph.encodeInformation(
  'React components use hooks for state and lifecycle. The useState and useEffect hooks replace class component patterns.',
  { type: 'concept', version: 2 }
);

// Connect evolution
learningGraph.addEdge(v1, v2, 'evolved_to', { strength: 1.5 });

// Create knowledge chunk
const knowledgeId = await learningGraph.createKnowledgeChunk(
  [v1, v2],
  'React Concepts'
);

// Track learning experience
learningGraph.trackExperience(
  [v1, v2],
  'Understanding of React evolved from basic components to hooks',
  true
);
```

## Key Features Added

### Intelligent Capabilities
- ✅ **LLM Encoding**: Transform text into structured knowledge using OpenAI
- ✅ **Semantic Search**: Find relevant information using embeddings
- ✅ **Experience Tracking**: Learn from graph traversal patterns
- ✅ **Knowledge Chunks**: Manage subgraphs as coherent knowledge units
- ✅ **Parallel Exploration**: Build context from multiple starting points
- ✅ **Hybrid Search**: Combine semantic and text search for best results

### Maintained Simplicity
- ✅ Still uses JSON for storage (progressive enhancement path)
- ✅ Graceful fallback when OpenAI unavailable
- ✅ Plugin architecture for extensibility
- ✅ Clean API surface
- ✅ MCP server integration

## Why This Approach?

1. **Practical Intelligence**: LLM integration that actually helps, not hinders
2. **Progressive Enhancement**: Works without OpenAI, better with it
3. **Real-World Scenarios**: Designed for actual use cases (codebase knowledge, task tracking)
4. **Maintains Simplicity**: Core remains understandable and maintainable
5. **Claude Code Ready**: Enhanced MCP integration with semantic capabilities
6. **Scalable**: Can grow from simple JSON to vector databases via plugins

## Getting Started

```bash
# Install dependencies
npm install graphology flexsearch @modelcontextprotocol/sdk zod

# Build
npm run build

# Run MCP server
node dist/mcp/server.js

# Configure Claude Code
# Add to claude_desktop_config.json:
{
  "mcpServers": {
    "knowra": {
      "command": "node",
      "args": ["path/to/knowra/dist/mcp/server.js"]
    }
  }
}
```

## Summary

This intelligent yet simple approach:
- Provides real AI capabilities through OpenAI integration
- Maintains architectural simplicity
- Supports three key scenarios out of the box
- Gracefully degrades when AI unavailable
- Can be progressively enhanced through plugins
- Tracks experience and knowledge evolution naturally

**Build intelligence into the core, keep the architecture simple.**

## Next Steps

1. **Phase 1**: Implement core with OpenAI integration
2. **Phase 2**: Add MCP server with semantic search tools
3. **Phase 3**: Build CLI for codebase indexing
4. **Phase 4**: Create GUI explorer plugin
5. **Phase 5**: Add vector database plugin for scale

Focus on making AI-assisted knowledge management practical and accessible.