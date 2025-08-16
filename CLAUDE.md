# Knowra - AI Knowledge Graph System

> **A README for AI: Complete project context and development guidance**

## Project Overview

Knowra is a practical knowledge graph system with built-in LLM intelligence that transforms how developers work with information. Unlike traditional knowledge bases, Knowra combines structured graph storage with AI-powered understanding to create a truly intelligent system.

### Core Mission

**Build intelligence into the core, keep the architecture simple.**

Knowra encodes information into structured knowledge using OpenAI's API, provides hybrid search combining semantic embeddings and text matching, tracks experience through graph traversal patterns, manages knowledge as coherent subgraph units, and supports parallel exploration for context building - all while maintaining architectural simplicity.

### Key Capabilities

- **Intelligent Encoding**: Transform text into structured knowledge using LLM analysis
- **Hybrid Search**: Combine semantic embeddings with traditional text search
- **Experience Tracking**: Learn from usage patterns and graph traversal
- **Knowledge Management**: Handle information as coherent subgraph units
- **Parallel Exploration**: Build context through simultaneous knowledge paths
- **Progressive Enhancement**: Core functionality works without AI services

## Architecture Vision

### Layer Structure

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
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│            Knowra Core Layer                     │
│  • Encode: Text → Knowledge (via LLM)            │
│  • Search: Semantic + Text (Hybrid)              │
│  • Experience: Path Tracking & Learning          │
│  • Knowledge: Subgraph Operations                │
│  • Context: Parallel Exploration                 │
└──────────────────────────────────────────────────┘
```

### Design Principles

1. **Intelligence Enhancement**: AI features enhance but never replace core functionality
2. **Graceful Degradation**: All operations have non-AI fallbacks
3. **Progressive Complexity**: Simple operations work instantly, intelligent features add value
4. **User-Centric**: Developer experience prioritized over technical complexity
5. **Extensible Foundation**: Plugin architecture supports diverse use cases

## Technical Foundation

### Core Dependencies

- **`graphology`**: High-performance graph operations and structure management
- **`flexsearch`**: Fast text search and indexing for hybrid search capabilities
- **`openai`**: LLM integration for encoding and embeddings
- **`@modelcontextprotocol/sdk`**: MCP integration for AI assistant compatibility
- **`zod`**: Schema validation and type safety throughout the system
- **`p-queue`**: Parallel operations management for performance

### Technology Stack

- **Language**: TypeScript for type safety and developer experience
- **Testing**: Vitest for fast, modern testing with excellent TypeScript support
- **Architecture**: Modular plugin system with clean separation of concerns
- **AI Integration**: OpenAI API with intelligent fallback strategies
- **Data Storage**: JSON-based graph storage with flexible schema

## Data Model & Types

### Node Structure

```typescript
interface Node {
  id: string;              // Unique identifier (auto-generated)
  content: any;            // Primary content (flexible type)
  type?: string;           // Content type classification
  tags?: string[];         // User-defined tags for organization
  category?: string;       // High-level categorization
  embedding?: number[];    // AI-generated semantic vector
  summary?: string;        // LLM-generated summary
  created: Date;           // Creation timestamp
  modified: Date;          // Last modification
  accessed?: Date;         // Last access (experience tracking)
  accessCount?: number;    // Usage frequency
}
```

### Edge Relationships

```typescript
interface Edge {
  source: string;          // Source node ID
  target: string;          // Target node ID
  type?: string;           // Relationship type
  weight?: number;         // Connection strength
  metadata?: any;          // Additional relationship data
}
```

### Experience Tracking

```typescript
interface Experience {
  id: string;              // Experience identifier
  path: string[];          // Traversal path through graph
  context: string;         // Context of exploration
  success: boolean;        // Whether path was successful
  timestamp: Date;         // When experience occurred
  metadata?: any;          // Additional experience data
}
```

## Development Philosophy

### Test-Driven Development (TDD)

Knowra is built using strict TDD methodology:

1. **Red Phase**: Write failing tests that define expected behavior
2. **Green Phase**: Implement minimal code to pass tests
3. **Refactor Phase**: Improve code structure while maintaining green tests

**Coverage Requirements**: Minimum 80% test coverage for all modules

### Progressive Enhancement Strategy

- Core functionality MUST work without AI services
- AI features enhance but never replace basic operations  
- Graceful degradation when OpenAI API unavailable
- Clear fallback paths for all intelligent features

### Error Handling Philosophy

```typescript
// Example: Always provide fallback for AI operations
async semanticSearch(query: string): Promise<Node[]> {
  if (!this.openai) {
    return this.search(query); // Fallback to text search
  }
  
  try {
    return await this.performSemanticSearch(query);
  } catch (error) {
    console.error('Semantic search failed, falling back:', error);
    return this.search(query); // Graceful degradation
  }
}
```

## Core Implementation Patterns

### Intelligent Encoding Pattern

Transform raw information into structured knowledge with AI enhancement:

```typescript
async encodeInformation(text: string, metadata?: Partial<Node>): Promise<string> {
  // Enhance with AI when available
  if (this.openai) {
    try {
      const enhanced = await this.enhanceWithAI(text);
      return this.addNode(enhanced, metadata);
    } catch (error) {
      console.error('AI encoding failed:', error);
    }
  }
  
  // Always have fallback
  return this.addNode(text, metadata);
}
```

### Experience Tracking Pattern

Learn from usage patterns to improve future recommendations:

```typescript
trackExperience(path: string[], context: string, success = true): string {
  const experience = this.createExperience(path, context, success);
  
  // Strengthen successful paths
  if (success) {
    this.strengthenConnections(path);
  }
  
  // Update access patterns for learning
  this.updateAccessPatterns(path);
  
  return experience.id;
}
```

### Plugin System Pattern

Enable extensibility through clean plugin architecture:

```typescript
export interface Plugin {
  name: string;
  init(core: KnowraCore): void;
}

// Plugin registration and initialization
use(plugin: Plugin): void {
  plugin.init(this);
  this.plugins.set(plugin.name, plugin);
}
```

## Project Structure

```
src/
├── core/
│   ├── KnowraCore.ts       # Main graph implementation
│   ├── types.ts            # Core interface definitions
│   └── utils.ts            # Shared utility functions
├── mcp/
│   └── server.ts           # MCP server implementation
├── plugins/
│   └── [plugin-name].ts   # Plugin implementations
└── __tests__/
    ├── core/               # Core functionality tests
    ├── mcp/                # MCP server tests
    └── plugins/            # Plugin tests
```

## Performance Benchmarks

Target performance for core operations:

- **Basic CRUD operations**: <10ms
- **Text search**: <50ms  
- **Semantic search**: <500ms
- **Graph traversal (depth 2)**: <100ms
- **Knowledge chunk creation**: <1000ms
- **Parallel exploration**: <2000ms

## Success Criteria

### Code Quality Standards

- Test coverage >80%
- Zero TypeScript errors
- ESLint compliance
- Comprehensive JSDoc documentation

### Functionality Requirements

- All core operations work without AI dependencies
- AI features enhance experience when available
- Graceful degradation on API failures
- Plugin system supports extensibility

### Performance Standards

- Operations complete within defined benchmarks
- Memory usage remains reasonable for large graphs
- No memory leaks in long-running processes

## Integration Points

### MCP (Model Context Protocol) Server

Knowra provides an MCP server for integration with AI assistants like Claude:

- Exposes core graph operations as MCP tools
- Enables AI assistants to work with knowledge graphs
- Maintains session state across interactions
- Supports both read and write operations

### Plugin Architecture

The plugin system enables diverse integrations:

- **CLI Tools**: Command-line interfaces for developers
- **GUI Explorer**: Visual graph exploration interfaces  
- **Import/Export**: Various data format handlers
- **AI Providers**: Alternative LLM service integrations

## Development Guidelines

### TypeScript Best Practices

- Use explicit types, avoid `any`
- Define interfaces for all data structures
- Use type guards for runtime validation
- Leverage discriminated unions for state management

### Testing Strategy

- Unit tests for all public methods
- Integration tests for AI functionality
- Mock external dependencies (OpenAI, file system)
- Test both success and failure scenarios

### Documentation Requirements

- JSDoc for all public APIs
- README updates for new features
- Architecture documentation for major changes
- Examples for complex functionality

## Getting Started for AI

When working with Knowra:

1. **Understand the Mission**: Build intelligence into the core while keeping architecture simple
2. **Follow TDD**: Always write tests first, then implement
3. **Ensure Fallbacks**: Every AI feature needs a non-AI alternative
4. **Respect the Architecture**: Work within the established layer structure
5. **Test Thoroughly**: Maintain high test coverage and validate both AI and fallback paths

The goal is to create a system that developers love to use and extend - one that demonstrates how AI can enhance traditional software without adding unnecessary complexity.

## Contributing Philosophy

Knowra values:

- **Clarity over cleverness**: Simple solutions that work reliably
- **User experience**: Developer happiness is a primary metric
- **Test coverage**: Tests are the specification, not documentation
- **Progressive enhancement**: Basic functionality first, intelligence second
- **Extensibility**: Plugin architecture enables community contributions

This system represents a new approach to knowledge management - one where intelligence emerges from the interaction between structured data, AI capabilities, and human usage patterns.