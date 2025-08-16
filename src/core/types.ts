/**
 * Core types for the Knowra Knowledge Database
 * Defines the five levels of knowledge evolution: Information → Knowledge → Experience → Strategy → Intuition
 */

import { z } from 'zod';

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

// ============ Zod Schemas for Runtime Validation ============

/**
 * Information schema with validation rules
 */
export const InformationSchema = z.object({
  id: z.string().min(1, 'Information ID must not be empty'),
  content: z.any().refine(val => val !== undefined, 'Content is required'), // Accept any type but require it to be defined
  type: z.string().min(1, 'Information type must not be empty'),
  source: z.string().optional(),
  created: z.date(),
  modified: z.date(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.modified >= data.created,
  {
    message: 'Modified date must not be before created date',
    path: ['modified']
  }
);

/**
 * Relationship schema with validation rules
 */
export const RelationshipSchema = z.object({
  from: z.string().min(1, 'Source node ID must not be empty'),
  to: z.string().min(1, 'Target node ID must not be empty'),
  type: z.string().min(1, 'Relationship type must not be empty'),
  strength: z.number().min(0).max(1).optional(),
  created: z.date(),
  metadata: z.record(z.unknown()).optional(),
}).refine(
  (data) => data.from !== data.to,
  {
    message: 'Self-referencing relationships are not allowed',
    path: ['to']
  }
);

/**
 * Knowledge schema with validation rules
 */
export const KnowledgeSchema = z.object({
  node: InformationSchema,
  edges: z.array(RelationshipSchema),
  context: z.string().optional(),
});

/**
 * SearchOptions schema with validation rules
 */
export const SearchOptionsSchema = z.object({
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  sortBy: z.enum(['relevance', 'created', 'modified']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

/**
 * InfoOperation schema with conditional validation
 */
export const InfoOperationSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('add'),
    data: z.object({
      content: z.unknown(),
      type: z.string().min(1),
    }).and(z.record(z.unknown())), // Allow additional fields
  }),
  z.object({
    operation: z.literal('update'),
    id: z.string().min(1),
    data: z.record(z.unknown()),
  }),
  z.object({
    operation: z.literal('delete'),
    id: z.string().min(1),
    data: z.record(z.unknown()).optional(),
  }),
]);

/**
 * BatchResult schema with validation rules
 */
export const BatchResultSchema = z.object({
  success: z.boolean(),
  processed: z.number().int().nonnegative(),
  errors: z.array(z.object({
    operation: InfoOperationSchema,
    error: z.string(),
  })),
  results: z.array(z.string()),
});

/**
 * Experience schema with validation rules
 */
export const ExperienceSchema = z.object({
  id: z.string().min(1, 'Experience ID must not be empty'),
  path: z.array(z.string().min(1)).min(1, 'Path must contain at least one node'),
  context: z.string().min(1, 'Context must not be empty'),
  outcome: z.enum(['success', 'failure', 'neutral']),
  feedback: z.string().optional(),
  timestamp: z.date(),
  traversalTime: z.number().nonnegative(),
  reinforcement: z.number().min(0).max(1),
});

/**
 * Strategy schema with validation rules
 */
export const StrategySchema = z.object({
  id: z.string().min(1, 'Strategy ID must not be empty'),
  goal: z.string().min(1, 'Goal must not be empty'),
  startNode: z.string().min(1, 'Start node must not be empty'),
  endNode: z.string().min(1).optional(),
  route: z.array(z.string().min(1)).min(1, 'Route must contain at least one node'),
  algorithm: z.string().min(1, 'Algorithm must not be empty'),
  cost: z.number().nonnegative(),
  confidence: z.number().min(0).max(1),
}).refine(
  (data) => data.route.includes(data.startNode),
  {
    message: 'Start node must be in the route',
    path: ['route']
  }
).refine(
  (data) => !data.endNode || data.route.includes(data.endNode),
  {
    message: 'End node must be in the route if specified',
    path: ['route']
  }
);

/**
 * Intuition schema with validation rules
 */
export const IntuitionSchema = z.object({
  id: z.string().min(1, 'Intuition ID must not be empty'),
  pattern: z.string().min(1, 'Pattern must not be empty'),
  trigger: z.array(z.string().min(1)).min(1, 'Trigger must contain at least one element'),
  shortcut: z.array(z.string().min(1)).min(1, 'Shortcut must contain at least one element'),
  confidence: z.number().min(0).max(1),
  usageCount: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
});

/**
 * Constraints schema with validation rules
 */
export const ConstraintsSchema = z.object({
  maxDepth: z.number().int().positive().optional(),
  excludeNodes: z.array(z.string().min(1)).optional(),
  requiredNodes: z.array(z.string().min(1)).optional(),
  timeLimit: z.number().int().positive().optional(),
  costLimit: z.number().positive().optional(),
});

/**
 * KnowledgeCluster schema with validation rules
 */
export const KnowledgeClusterSchema = z.object({
  id: z.string().min(1, 'Cluster ID must not be empty'),
  nodes: z.array(z.string().min(1)).min(1, 'Nodes must contain at least one element'),
  centroid: z.string().min(1).optional(),
  coherence: z.number().min(0).max(1),
  algorithm: z.enum(['community', 'similarity']),
}).refine(
  (data) => !data.centroid || data.nodes.includes(data.centroid),
  {
    message: 'Centroid must be one of the nodes if specified',
    path: ['centroid']
  }
);

/**
 * StrategyMetrics schema with validation rules
 */
export const StrategyMetricsSchema = z.object({
  efficiency: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1),
  novelty: z.number().min(0).max(1),
  complexity: z.number().min(0).max(1),
});

/**
 * ComparisonResult schema with validation rules
 */
export const ComparisonResultSchema = z.object({
  strategies: z.array(StrategySchema).min(1, 'Strategies must contain at least one element'),
  rankings: z.array(z.object({
    strategyId: z.string().min(1),
    score: z.number().min(0).max(1),
    reasons: z.array(z.string().min(1)),
  })),
  recommendation: z.string().min(1),
}).refine(
  (data) => data.strategies.some(s => s.id === data.recommendation),
  {
    message: 'Recommendation must be the ID of one of the strategies',
    path: ['recommendation']
  }
);

// ============ Runtime Validation Functions ============

/**
 * Validates an Information object at runtime
 */
export function validateInformation(data: unknown): data is Information {
  try {
    InformationSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a Relationship object at runtime
 */
export function validateRelationship(data: unknown): data is Relationship {
  try {
    RelationshipSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a Knowledge object at runtime
 */
export function validateKnowledge(data: unknown): data is Knowledge {
  try {
    KnowledgeSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates SearchOptions at runtime
 */
export function validateSearchOptions(data: unknown): data is SearchOptions {
  try {
    SearchOptionsSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an Experience object at runtime
 */
export function validateExperience(data: unknown): data is Experience {
  try {
    ExperienceSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a Strategy object at runtime
 */
export function validateStrategy(data: unknown): data is Strategy {
  try {
    StrategySchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an Intuition object at runtime
 */
export function validateIntuition(data: unknown): data is Intuition {
  try {
    IntuitionSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates Constraints at runtime
 */
export function validateConstraints(data: unknown): data is Constraints {
  try {
    ConstraintsSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}
