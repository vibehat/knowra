/**
 * KnowraCore - Main implementation of the Knowledge Database
 *
 * This is the core implementation of the five-level knowledge system:
 * Level 1: Information - Isolated data points
 * Level 2: Knowledge - Connected relationships
 * Level 3: Experience - Learned paths and patterns
 * Level 4: Strategy - Optimized routes to goals
 * Level 5: Intuition - Fast pattern-based decisions
 */

import type {
  KnowledgeDatabaseAPI,
  Information,
  Knowledge,
  Experience,
  Strategy,
  Intuition,
  Relationship,
  SearchOptions,
  InfoOperation,
  BatchResult,
  KnowledgeCluster,
  Constraints,
  StrategyMetrics,
  ComparisonResult,
  Plugin,
  PluginInfo,
} from './types.js';

import { generateId, isValidId, deepClone, contentToString, validateConfidence } from './utils.js';

/**
 * Core implementation of the Knowra Knowledge Database
 * Provides all five levels of knowledge evolution as a unified API
 */
export class KnowraCore implements KnowledgeDatabaseAPI {
  // Core data storage
  private nodes = new Map<string, Information>();
  private edges = new Map<string, Relationship>();
  private experiences = new Map<string, Experience>();
  private strategies = new Map<string, Strategy>();
  private intuitions = new Map<string, Intuition>();

  // Plugin system
  private pluginRegistry = new Map<string, Plugin>();
  private eventHandlers = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor() {
    // Initialize the core system
    this.setupEventSystem();
  }

  // ============ Level 1: Information API ============

  public readonly information = {
    add: (content: unknown, metadata?: Partial<Information>): string => {
      const id = generateId('info');
      const now = new Date();

      const info: Information = {
        id,
        content,
        type: metadata?.type ?? 'unknown',
        source: metadata?.source ?? undefined,
        created: now,
        modified: now,
        metadata: metadata?.metadata,
        ...metadata,
      };

      this.nodes.set(id, info);
      this.events.emit('information:afterAdd', info);

      return id;
    },

    get: (id: string): Information | null => {
      if (!isValidId(id)) return null;
      return this.nodes.get(id) ?? null;
    },

    update: (id: string, updates: Partial<Information>): boolean => {
      if (!isValidId(id)) return false;

      const existing = this.nodes.get(id);
      if (!existing) return false;

      const updated: Information = {
        ...existing,
        ...updates,
        id: existing.id, // Never allow ID changes
        modified: new Date(),
      };

      this.nodes.set(id, updated);
      this.events.emit('information:afterUpdate', updated);

      return true;
    },

    delete: (id: string): boolean => {
      if (!isValidId(id)) return false;

      const deleted = this.nodes.delete(id);
      if (deleted) {
        // Clean up related data
        this.cleanupRelatedData(id);
        this.events.emit('information:afterDelete', id);
      }

      return deleted;
    },

    search: (query: string, options?: SearchOptions): Information[] => {
      if (!query.trim()) return [];

      const normalizedQuery = query.toLowerCase();
      const results: Information[] = [];

      for (const info of this.nodes.values()) {
        const content = contentToString(info.content).toLowerCase();
        const matches =
          content.includes(normalizedQuery) ||
          info.type.toLowerCase().includes(normalizedQuery) ||
          (info.source?.toLowerCase().includes(normalizedQuery) ?? false);

        if (matches) {
          // Apply filters
          if (options?.type && info.type !== options.type) continue;

          results.push(deepClone(info));
        }
      }

      // Sort results
      if (options?.sortBy === 'created') {
        results.sort((a, b) => {
          const order = options.sortOrder === 'desc' ? -1 : 1;
          return order * (a.created.getTime() - b.created.getTime());
        });
      } else if (options?.sortBy === 'modified') {
        results.sort((a, b) => {
          const order = options.sortOrder === 'desc' ? -1 : 1;
          return order * (a.modified.getTime() - b.modified.getTime());
        });
      }

      // Apply pagination
      const start = options?.offset ?? 0;
      const end = options?.limit ? start + options.limit : undefined;

      return results.slice(start, end);
    },

    batch: (operations: InfoOperation[]): BatchResult => {
      const result: BatchResult = {
        success: true,
        processed: 0,
        errors: [],
        results: [],
      };

      for (const op of operations) {
        try {
          switch (op.operation) {
            case 'add':
              if (!op.data) throw new Error('Add operation requires data');
              const id = this.information.add(op.data.content, op.data);
              result.results.push(id);
              break;

            case 'update':
              if (!op.id || !op.data) throw new Error('Update operation requires id and data');
              const updated = this.information.update(op.id, op.data);
              if (!updated) throw new Error('Update failed');
              result.results.push(op.id);
              break;

            case 'delete':
              if (!op.id) throw new Error('Delete operation requires id');
              const deleted = this.information.delete(op.id);
              if (!deleted) throw new Error('Delete failed');
              result.results.push(op.id);
              break;
          }
          result.processed++;
        } catch (error) {
          result.success = false;
          result.errors.push({
            operation: op,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return result;
    },
  };

  // ============ Level 2: Knowledge API ============

  public readonly knowledge = {
    connect: (from: string, to: string, type: string, metadata?: unknown): Relationship => {
      if (!isValidId(from) || !isValidId(to)) {
        throw new Error('Invalid node IDs');
      }

      if (!this.nodes.has(from) || !this.nodes.has(to)) {
        throw new Error('One or both nodes do not exist');
      }

      const relationship: Relationship = {
        from,
        to,
        type,
        strength: 1.0,
        created: new Date(),
        metadata: metadata ? (metadata as Record<string, unknown>) : undefined,
      };

      const edgeId = `${from}->${to}:${type}`;
      this.edges.set(edgeId, relationship);

      this.events.emit('knowledge:afterConnect', relationship);

      return deepClone(relationship);
    },

    disconnect: (from: string, to: string): boolean => {
      let removed = false;

      for (const [edgeId, edge] of this.edges.entries()) {
        if (edge.from === from && edge.to === to) {
          this.edges.delete(edgeId);
          removed = true;
        }
      }

      if (removed) {
        this.events.emit('knowledge:afterDisconnect', from, to);
      }

      return removed;
    },

    getRelationships: (nodeId: string, direction?: 'in' | 'out' | 'both'): Relationship[] => {
      const dir = direction ?? 'both';
      if (!isValidId(nodeId)) return [];

      const relationships: Relationship[] = [];

      for (const edge of this.edges.values()) {
        if (dir === 'both' || dir === 'out') {
          if (edge.from === nodeId) {
            relationships.push(deepClone(edge));
          }
        }

        if (dir === 'both' || dir === 'in') {
          if (edge.to === nodeId) {
            relationships.push(deepClone(edge));
          }
        }
      }

      return relationships;
    },

    findPaths: (from: string, to: string, maxDepth = 5): string[][] => {
      if (!isValidId(from) || !isValidId(to)) return [];
      if (from === to) return [[from]];

      const paths: string[][] = [];
      const visited = new Set<string>();

      const dfs = (current: string, target: string, path: string[], depth: number): void => {
        if (depth > maxDepth) return;
        if (visited.has(current)) return;

        visited.add(current);
        path.push(current);

        if (current === target) {
          paths.push([...path]);
        } else {
          const outgoing = this.knowledge.getRelationships(current, 'out');
          for (const edge of outgoing) {
            dfs(edge.to, target, path, depth + 1);
          }
        }

        path.pop();
        visited.delete(current);
      };

      dfs(from, to, [], 0);
      return paths;
    },

    getSubgraph: (nodeId: string, depth = 2): Knowledge[] => {
      if (!isValidId(nodeId)) return [];

      const visited = new Set<string>();
      const result: Knowledge[] = [];

      const explore = (currentId: string, currentDepth: number): void => {
        if (currentDepth < 0 || visited.has(currentId)) return;

        visited.add(currentId);
        const node = this.nodes.get(currentId);
        if (!node) return;

        const edges = this.knowledge.getRelationships(currentId);
        result.push({
          node: deepClone(node),
          edges: deepClone(edges),
        });

        // Explore connected nodes
        for (const edge of edges) {
          const nextId = edge.from === currentId ? edge.to : edge.from;
          explore(nextId, currentDepth - 1);
        }
      };

      explore(nodeId, depth);
      return result;
    },

    cluster: (algorithm = 'community' as const): KnowledgeCluster[] => {
      // Simplified clustering implementation
      // In a full implementation, this would use proper graph clustering algorithms

      const clusters: KnowledgeCluster[] = [];
      const visited = new Set<string>();

      for (const nodeId of this.nodes.keys()) {
        if (visited.has(nodeId)) continue;

        const cluster: KnowledgeCluster = {
          id: generateId('cluster'),
          nodes: [],
          algorithm,
          coherence: 0,
        };

        // Simple connected component clustering
        const stack = [nodeId];
        while (stack.length > 0) {
          const current = stack.pop();
          if (!current || visited.has(current)) continue;

          visited.add(current);
          cluster.nodes.push(current);

          const edges = this.knowledge.getRelationships(current);
          for (const edge of edges) {
            const next = edge.from === current ? edge.to : edge.from;
            if (!visited.has(next)) {
              stack.push(next);
            }
          }
        }

        if (cluster.nodes.length > 0) {
          cluster.coherence = cluster.nodes.length > 1 ? 0.8 : 1.0; // Simplified coherence
          clusters.push(cluster);
        }
      }

      return clusters;
    },
  };

  // ============ Level 3: Experience API ============

  public readonly experience = {
    recordPath: (
      path: string[],
      context: string,
      outcome: 'success' | 'failure' | 'neutral'
    ): string => {
      if (path.length < 2) {
        throw new Error('Path must contain at least 2 nodes');
      }

      const id = generateId('exp');
      const experience: Experience = {
        id,
        path: [...path],
        context,
        outcome,
        timestamp: new Date(),
        traversalTime: 0, // Will be calculated by higher-level systems
        reinforcement: outcome === 'success' ? 1.0 : outcome === 'failure' ? -0.5 : 0.0,
      };

      this.experiences.set(id, experience);
      this.events.emit('experience:afterRecord', experience);

      return id;
    },

    getExperiences: (nodeId?: string): Experience[] => {
      const experiences: Experience[] = [];

      for (const exp of this.experiences.values()) {
        if (!nodeId || exp.path.includes(nodeId)) {
          experiences.push(deepClone(exp));
        }
      }

      return experiences.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    },

    learnFrom: (experienceId: string, feedback: string): void => {
      const experience = this.experiences.get(experienceId);
      if (!experience) return;

      experience.feedback = feedback;
      this.events.emit('experience:onLearn', experienceId, feedback);
    },

    reinforcePath: (path: string[], weight: number): void => {
      const normalizedWeight = validateConfidence(weight);

      // Find related experiences and adjust their reinforcement
      for (const experience of this.experiences.values()) {
        const pathOverlap = experience.path.filter(node => path.includes(node)).length;
        const overlapRatio = pathOverlap / Math.max(experience.path.length, path.length);

        if (overlapRatio > 0.5) {
          experience.reinforcement += normalizedWeight * overlapRatio * 0.1;
          experience.reinforcement = validateConfidence(experience.reinforcement);
        }
      }
    },

    forgetOld: (daysOld: number): number => {
      const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      let removed = 0;

      for (const [id, experience] of this.experiences.entries()) {
        if (experience.timestamp < cutoff) {
          this.experiences.delete(id);
          removed++;
        }
      }

      return removed;
    },

    getSuggestions: (currentNode: string, context?: string): string[] => {
      if (!isValidId(currentNode)) return [];

      const suggestions = new Map<string, number>();

      // Analyze successful experiences starting from this node
      for (const experience of this.experiences.values()) {
        if (experience.outcome === 'success' && experience.path[0] === currentNode) {
          if (context && !experience.context.includes(context)) continue;

          // Suggest the next node in successful paths
          if (experience.path.length > 1) {
            const nextNode = experience.path[1];
            if (nextNode) {
              const score = suggestions.get(nextNode) ?? 0;
              suggestions.set(nextNode, score + experience.reinforcement);
            }
          }
        }
      }

      // Sort by score and return top suggestions
      return Array.from(suggestions.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([nodeId]) => nodeId);
    },
  };

  // ============ Level 4: Strategy API ============

  public readonly strategy = {
    planRoute: (goal: string, startNode: string, constraints?: Constraints): Strategy => {
      // Simplified strategy planning - full implementation would use advanced algorithms
      const id = generateId('strategy');

      const strategy: Strategy = {
        id,
        goal,
        startNode,
        route: [startNode], // Simplified: just the start node
        algorithm: 'simple',
        cost: 0,
        confidence: 0.5,
      };

      this.strategies.set(id, strategy);
      return deepClone(strategy);
    },

    optimizePath: (from: string, to: string, criteria = 'shortest' as const): string[] => {
      const paths = this.knowledge.findPaths(from, to);
      if (paths.length === 0) return [];

      // Simple optimization based on criteria
      if (criteria === 'shortest') {
        return paths.reduce((shortest, current) =>
          current.length < shortest.length ? current : shortest
        );
      }

      return paths[0] ?? [];
    },

    findStrategies: (goal: string): Strategy[] => {
      const strategies: Strategy[] = [];

      for (const strategy of this.strategies.values()) {
        if (strategy.goal.toLowerCase().includes(goal.toLowerCase())) {
          strategies.push(deepClone(strategy));
        }
      }

      return strategies;
    },

    evaluateStrategy: (strategyId: string): StrategyMetrics => {
      return {
        efficiency: 0.7,
        reliability: 0.8,
        novelty: 0.6,
        complexity: 0.5,
      };
    },

    adaptStrategy: (strategyId: string, feedback: Experience): Strategy => {
      const strategy = this.strategies.get(strategyId);
      if (!strategy) {
        throw new Error('Strategy not found');
      }

      // Simplified adaptation
      const adapted = deepClone(strategy);
      adapted.confidence = validateConfidence(
        adapted.confidence + (feedback.outcome === 'success' ? 0.1 : -0.1)
      );

      this.strategies.set(strategyId, adapted);
      return adapted;
    },

    compareStrategies: (ids: string[]): ComparisonResult => {
      const strategies = ids
        .map(id => this.strategies.get(id))
        .filter((s): s is Strategy => s !== undefined);

      const rankings = strategies.map(strategy => ({
        strategyId: strategy.id,
        score: strategy.confidence,
        reasons: [`Confidence: ${strategy.confidence}`],
      }));

      rankings.sort((a, b) => b.score - a.score);

      return {
        strategies: strategies.map(s => deepClone(s)),
        rankings,
        recommendation: rankings[0]?.strategyId ?? '',
      };
    },
  };

  // ============ Level 5: Intuition API ============

  public readonly intuition = {
    recognize: (pattern: string): Intuition | null => {
      for (const intuition of this.intuitions.values()) {
        if (intuition.pattern.includes(pattern) || pattern.includes(intuition.pattern)) {
          intuition.usageCount++;
          return deepClone(intuition);
        }
      }
      return null;
    },

    buildIntuition: (experiences: string[]): Intuition => {
      const id = generateId('intuition');

      const intuition: Intuition = {
        id,
        pattern: 'Generated pattern',
        trigger: ['common', 'pattern'],
        shortcut: experiences.slice(0, 3),
        confidence: 0.7,
        usageCount: 0,
        successRate: 0.8,
      };

      this.intuitions.set(id, intuition);
      return deepClone(intuition);
    },

    getShortcut: (trigger: string): string[] | null => {
      for (const intuition of this.intuitions.values()) {
        if (intuition.trigger.some(t => t.includes(trigger) || trigger.includes(t))) {
          return [...intuition.shortcut];
        }
      }
      return null;
    },

    strengthenIntuition: (intuitionId: string): void => {
      const intuition = this.intuitions.get(intuitionId);
      if (intuition) {
        intuition.confidence = validateConfidence(intuition.confidence + 0.05);
        intuition.successRate = validateConfidence(intuition.successRate + 0.02);
      }
    },

    getConfidence: (intuitionId: string): number => {
      return this.intuitions.get(intuitionId)?.confidence ?? 0;
    },

    pruneUnreliable: (threshold = 0.3): number => {
      let removed = 0;

      for (const [id, intuition] of this.intuitions.entries()) {
        if (intuition.confidence < threshold) {
          this.intuitions.delete(id);
          removed++;
        }
      }

      return removed;
    },
  };

  // ============ Cross-Level Analysis ============

  public readonly analyze = {
    extractKnowledge: (informationIds: string[]): Knowledge[] => {
      return informationIds
        .map(id => this.nodes.get(id))
        .filter((node): node is Information => node !== undefined)
        .map(node => ({
          node: deepClone(node),
          edges: this.knowledge.getRelationships(node.id),
        }));
    },

    trackExploration: (knowledgePath: Knowledge[]): Experience => {
      const path = knowledgePath.map(k => k.node.id);
      return {
        id: generateId('exploration'),
        path,
        context: 'Cross-level exploration',
        outcome: 'neutral',
        timestamp: new Date(),
        traversalTime: 0,
        reinforcement: 0,
      };
    },

    synthesizeStrategy: (experiences: Experience[]): Strategy => {
      const successfulPaths = experiences
        .filter(exp => exp.outcome === 'success')
        .map(exp => exp.path);

      const mostCommonPath = successfulPaths[0] ?? [];
      const startNode = mostCommonPath[0];

      if (!startNode) {
        throw new Error('No successful experiences to synthesize strategy from');
      }

      return {
        id: generateId('synthesized'),
        goal: 'Synthesized from experience',
        startNode,
        route: mostCommonPath,
        algorithm: 'experience-synthesis',
        cost: mostCommonPath.length,
        confidence: 0.6,
      };
    },

    formIntuition: (strategies: Strategy[]): Intuition => {
      const commonPatterns = strategies
        .map(s => s.algorithm)
        .filter((algo, index, arr) => arr.indexOf(algo) === index);

      return {
        id: generateId('formed'),
        pattern: commonPatterns.join(', '),
        trigger: ['strategy', 'pattern'],
        shortcut: strategies[0]?.route ?? [],
        confidence: 0.7,
        usageCount: 0,
        successRate: 0.8,
      };
    },
  };

  // ============ Plugin System ============

  public readonly plugins = {
    register: (plugin: Plugin): void => {
      this.pluginRegistry.set(plugin.name, plugin);

      if (plugin.init) {
        plugin.init(this);
      }
    },

    enable: (name: string, config?: unknown): void => {
      const plugin = this.pluginRegistry.get(name);
      if (plugin?.enable) {
        plugin.enable();
      }
    },

    disable: (name: string): void => {
      const plugin = this.pluginRegistry.get(name);
      if (plugin?.disable) {
        plugin.disable();
      }
    },

    list: (): PluginInfo[] => {
      return Array.from(this.pluginRegistry.values()).map(plugin => ({
        name: plugin.name,
        version: plugin.version,
        enabled: true, // Simplified - would track actual state
        enhances: plugin.enhances,
        dependencies: plugin.dependencies ?? [],
      }));
    },
  };

  // ============ Event System ============

  public readonly events = {
    on: (event: string, handler: (...args: unknown[]) => void): void => {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, []);
      }
      this.eventHandlers.get(event)?.push(handler);
    },

    off: (event: string, handler: (...args: unknown[]) => void): void => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    },

    emit: (event: string, ...args: unknown[]): void => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(...args);
          } catch (error) {
            console.error(`Error in event handler for ${event}:`, error);
          }
        }
      }
    },
  };

  // ============ Private Helper Methods ============

  private setupEventSystem(): void {
    // Initialize core event handlers
    this.events.on('information:afterDelete', (...args: unknown[]) => {
      const nodeId = args[0] as string;
      this.cleanupRelatedData(nodeId);
    });
  }

  private cleanupRelatedData(nodeId: string): void {
    // Remove edges connected to this node
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.from === nodeId || edge.to === nodeId) {
        this.edges.delete(edgeId);
      }
    }

    // Remove experiences that include this node
    for (const [expId, experience] of this.experiences.entries()) {
      if (experience.path.includes(nodeId)) {
        this.experiences.delete(expId);
      }
    }

    // Clean up strategies
    for (const [strategyId, strategy] of this.strategies.entries()) {
      if (strategy.startNode === nodeId || strategy.route.includes(nodeId)) {
        this.strategies.delete(strategyId);
      }
    }
  }
}
