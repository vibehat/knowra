/**
 * Core types for the Knowra Knowledge Database
 * Defines the five levels of knowledge evolution: Information → Knowledge → Experience → Strategy → Intuition
 */

// ============ Level 1: Information Types ============

/**
 * Information represents isolated data points - the foundation of all knowledge
 */
export interface Information {
  id: string;
  content: unknown; // Raw data (text, JSON, etc.)
  type: string; // Information type classification
  source?: string; // Where this came from
  created: Date;
  modified: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Search options for information queries
 */
export interface SearchOptions {
  type?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'created' | 'modified';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Batch operation for information management
 */
export interface InfoOperation {
  operation: 'add' | 'update' | 'delete';
  id?: string;
  data?: Partial<Information>;
}

/**
 * Result of batch operations
 */
export interface BatchResult {
  success: boolean;
  processed: number;
  errors: Array<{ operation: InfoOperation; error: string }>;
  results: string[]; // IDs of successful operations
}

// ============ Level 2: Knowledge Types ============

/**
 * Knowledge represents connected information with meaningful relationships
 */
export interface Knowledge {
  node: Information; // The information node
  edges: Relationship[]; // Connections to other nodes
  context?: string; // Contextual understanding
}

/**
 * Relationship defines connections between information nodes
 */
export interface Relationship {
  from: string; // Source node ID
  to: string; // Target node ID
  type: string; // Relationship type
  strength?: number; // Connection strength (0-1)
  created: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Knowledge cluster from clustering algorithms
 */
export interface KnowledgeCluster {
  id: string;
  nodes: string[]; // Node IDs in this cluster
  centroid?: string; // Central node ID
  coherence: number; // How tightly connected (0-1)
  algorithm: 'community' | 'similarity';
}

// ============ Level 3: Experience Types ============

/**
 * Experience represents learned paths through the knowledge graph
 */
export interface Experience {
  id: string;
  path: string[]; // Sequence of node IDs
  context: string; // What was being explored
  outcome: 'success' | 'failure' | 'neutral';
  feedback?: string; // What was learned
  timestamp: Date;
  traversalTime: number; // How long it took (ms)
  reinforcement: number; // Learning weight
}

// ============ Level 4: Strategy Types ============

/**
 * Strategy represents optimized routes to achieve goals
 */
export interface Strategy {
  id: string;
  goal: string; // What to achieve
  startNode: string; // Where to begin
  endNode?: string; // Target destination
  route: string[]; // Optimal path
  algorithm: string; // How it was calculated
  cost: number; // Total cost/distance
  confidence: number; // Confidence in strategy (0-1)
}

/**
 * Constraints for strategy planning
 */
export interface Constraints {
  maxDepth?: number;
  excludeNodes?: string[];
  requiredNodes?: string[];
  timeLimit?: number;
  costLimit?: number;
}

/**
 * Strategy evaluation metrics
 */
export interface StrategyMetrics {
  efficiency: number; // Cost vs alternatives
  reliability: number; // Historical success rate
  novelty: number; // How different from existing strategies
  complexity: number; // Number of steps/decisions
}

/**
 * Strategy comparison result
 */
export interface ComparisonResult {
  strategies: Strategy[];
  rankings: Array<{ strategyId: string; score: number; reasons: string[] }>;
  recommendation: string; // Best strategy ID
}

// ============ Level 5: Intuition Types ============

/**
 * Intuition represents crystallized patterns for fast decisions
 */
export interface Intuition {
  id: string;
  pattern: string; // Pattern description
  trigger: string[]; // What activates this pattern
  shortcut: string[]; // Direct path to insight
  confidence: number; // How reliable (0-1)
  usageCount: number; // How often used
  successRate: number; // How often correct
}

// ============ Plugin System Types ============

/**
 * Plugin interface for extending knowledge levels
 */
export interface Plugin {
  name: string;
  version: string;
  enhances: KnowledgeLevel[]; // Which levels this plugin enhances
  dependencies?: string[]; // Required plugins

  // Lifecycle hooks
  init?(api: KnowledgeDatabaseAPI): void;
  enable?(): void;
  disable?(): void;
  destroy?(): void;
}

/**
 * Plugin information
 */
export interface PluginInfo {
  name: string;
  version: string;
  enabled: boolean;
  enhances: KnowledgeLevel[];
  dependencies: string[];
}

/**
 * Knowledge levels supported by the system
 */
export type KnowledgeLevel = 'information' | 'knowledge' | 'experience' | 'strategy' | 'intuition';

// ============ Main API Interface ============

/**
 * Main Knowledge Database API - the five levels of understanding
 */
export interface KnowledgeDatabaseAPI {
  // Level 1: Information Management
  information: {
    add(content: unknown, metadata?: Partial<Information>): string;
    get(id: string): Information | null;
    update(id: string, updates: Partial<Information>): boolean;
    delete(id: string): boolean;
    search(query: string, options?: SearchOptions): Information[];
    batch(operations: InfoOperation[]): BatchResult;
  };

  // Level 2: Knowledge Building
  knowledge: {
    connect(from: string, to: string, type: string, metadata?: unknown): Relationship;
    disconnect(from: string, to: string): boolean;
    getRelationships(nodeId: string, direction?: 'in' | 'out' | 'both'): Relationship[];
    findPaths(from: string, to: string, maxDepth?: number): string[][];
    getSubgraph(nodeId: string, depth?: number): Knowledge[];
    cluster(algorithm?: 'community' | 'similarity'): KnowledgeCluster[];
  };

  // Level 3: Experience Tracking
  experience: {
    recordPath(path: string[], context: string, outcome: 'success' | 'failure' | 'neutral'): string;
    getExperiences(nodeId?: string): Experience[];
    learnFrom(experienceId: string, feedback: string): void;
    reinforcePath(path: string[], weight: number): void;
    forgetOld(daysOld: number): number;
    getSuggestions(currentNode: string, context?: string): string[];
  };

  // Level 4: Strategy Planning
  strategy: {
    planRoute(goal: string, startNode: string, constraints?: Constraints): Strategy;
    optimizePath(
      from: string,
      to: string,
      criteria?: 'shortest' | 'strongest' | 'learned'
    ): string[];
    findStrategies(goal: string): Strategy[];
    evaluateStrategy(strategyId: string): StrategyMetrics;
    adaptStrategy(strategyId: string, feedback: Experience): Strategy;
    compareStrategies(ids: string[]): ComparisonResult;
  };

  // Level 5: Intuition Access
  intuition: {
    recognize(pattern: string): Intuition | null;
    buildIntuition(experiences: string[]): Intuition;
    getShortcut(trigger: string): string[] | null;
    strengthenIntuition(intuitionId: string): void;
    getConfidence(intuitionId: string): number;
    pruneUnreliable(threshold?: number): number;
  };

  // Cross-level operations
  analyze: {
    extractKnowledge(informationIds: string[]): Knowledge[];
    trackExploration(knowledgePath: Knowledge[]): Experience;
    synthesizeStrategy(experiences: Experience[]): Strategy;
    formIntuition(strategies: Strategy[]): Intuition;
  };

  // Plugin system
  plugins: {
    register(plugin: Plugin): void;
    enable(name: string, config?: unknown): void;
    disable(name: string): void;
    list(): PluginInfo[];
  };

  // Event system
  events: {
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
    emit(event: string, ...args: unknown[]): void;
  };
}
