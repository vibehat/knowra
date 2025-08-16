/**
 * StrategyManager - Level 4: Strategy API
 * 
 * Manages strategic planning, route optimization, and strategy evaluation
 */

import type { 
  Strategy, 
  StrategyMetrics, 
  ComparisonResult, 
  Constraints, 
  Experience 
} from '../../types.js';
import { generateId, deepClone, validateConfidence } from '../../utils.js';
import type { EventBus } from '../../orchestration/EventBus.js';
import type { KnowledgeManager } from '../knowledge/KnowledgeManager.js';

export interface StrategyManagerDependencies {
  eventBus: EventBus;
  knowledgeManager: KnowledgeManager;
  strategies: Map<string, Strategy>;
}

export class StrategyManager {
  private dependencies: StrategyManagerDependencies;

  constructor(dependencies: StrategyManagerDependencies) {
    this.dependencies = dependencies;
  }

  /**
   * Plan a route to achieve a goal
   * @param goal Goal description
   * @param startNode Starting node ID
   * @param constraints Optional constraints
   * @returns Planned strategy
   */
  planRoute(goal: string, startNode: string, constraints?: Constraints): Strategy {
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

    this.dependencies.strategies.set(id, strategy);
    this.dependencies.eventBus.emit('strategy:afterPlan', strategy);
    
    return deepClone(strategy);
  }

  /**
   * Optimize path between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param criteria Optimization criteria
   * @returns Optimized path
   */
  optimizePath(from: string, to: string, criteria = 'shortest' as const): string[] {
    const paths = this.dependencies.knowledgeManager.findPaths(from, to);
    if (paths.length === 0) return [];

    // Simple optimization based on criteria
    if (criteria === 'shortest') {
      return paths.reduce((shortest, current) =>
        current.length < shortest.length ? current : shortest
      );
    }

    return paths[0] ?? [];
  }

  /**
   * Find strategies by goal
   * @param goal Goal to search for
   * @returns Array of matching strategies
   */
  findStrategies(goal: string): Strategy[] {
    const strategies: Strategy[] = [];

    for (const strategy of this.dependencies.strategies.values()) {
      if (strategy.goal.toLowerCase().includes(goal.toLowerCase())) {
        strategies.push(deepClone(strategy));
      }
    }

    return strategies;
  }

  /**
   * Evaluate strategy performance
   * @param strategyId Strategy ID to evaluate
   * @returns Strategy metrics
   */
  evaluateStrategy(strategyId: string): StrategyMetrics {
    const strategy = this.dependencies.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Simplified evaluation - would be more sophisticated in practice
    return {
      efficiency: 0.7,
      reliability: 0.8,
      novelty: 0.6,
      complexity: 0.5,
    };
  }

  /**
   * Adapt strategy based on experience feedback
   * @param strategyId Strategy ID to adapt
   * @param feedback Experience feedback
   * @returns Adapted strategy
   */
  adaptStrategy(strategyId: string, feedback: Experience): Strategy {
    const strategy = this.dependencies.strategies.get(strategyId);
    if (!strategy) {
      throw new Error('Strategy not found');
    }

    // Simplified adaptation
    const adapted = deepClone(strategy);
    adapted.confidence = validateConfidence(
      adapted.confidence + (feedback.outcome === 'success' ? 0.1 : -0.1)
    );

    this.dependencies.strategies.set(strategyId, adapted);
    this.dependencies.eventBus.emit('strategy:afterAdapt', adapted, feedback);
    
    return adapted;
  }

  /**
   * Compare multiple strategies
   * @param ids Array of strategy IDs to compare
   * @returns Comparison result
   */
  compareStrategies(ids: string[]): ComparisonResult {
    const strategies = ids
      .map(id => this.dependencies.strategies.get(id))
      .filter((s): s is Strategy => s !== undefined);

    const rankings = strategies.map(strategy => ({
      strategyId: strategy.id,
      score: strategy.confidence,
      reasons: [`Confidence: ${strategy.confidence}`],
    }));

    rankings.sort((a, b) => b.score - a.score);

    const result: ComparisonResult = {
      strategies: strategies.map(s => deepClone(s)),
      rankings,
      recommendation: rankings[0]?.strategyId ?? '',
    };

    this.dependencies.eventBus.emit('strategy:afterCompare', result);
    
    return result;
  }

  /**
   * Get strategy by ID
   * @param id Strategy ID
   * @returns Strategy or null if not found
   */
  getStrategy(id: string): Strategy | null {
    const strategy = this.dependencies.strategies.get(id);
    return strategy ? deepClone(strategy) : null;
  }

  /**
   * Update existing strategy
   * @param id Strategy ID
   * @param updates Partial updates to apply
   * @returns True if update was successful
   */
  updateStrategy(id: string, updates: Partial<Strategy>): boolean {
    const strategy = this.dependencies.strategies.get(id);
    if (!strategy) {
      return false;
    }

    const updated = { ...strategy, ...updates };
    this.dependencies.strategies.set(id, updated);
    this.dependencies.eventBus.emit('strategy:afterUpdate', updated);
    
    return true;
  }

  /**
   * Delete strategy
   * @param id Strategy ID
   * @returns True if deletion was successful
   */
  deleteStrategy(id: string): boolean {
    const deleted = this.dependencies.strategies.delete(id);
    if (deleted) {
      this.dependencies.eventBus.emit('strategy:afterDelete', id);
    }
    return deleted;
  }

  /**
   * Get all strategies
   * @returns Array of all strategies
   */
  getAllStrategies(): Strategy[] {
    return Array.from(this.dependencies.strategies.values()).map(s => deepClone(s));
  }
}