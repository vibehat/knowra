/**
 * StrategyAPI - Level 4: Strategy Planning
 * 
 * Public API class for strategy operations. Provides clean interface
 * while delegating implementation to StrategyManager.
 */

import type { 
  Strategy, 
  StrategyMetrics, 
  ComparisonResult, 
  Constraints, 
  Experience 
} from '../types.js';
import type { StrategyManager } from '../levels/strategy/StrategyManager.js';

export class StrategyAPI {
  constructor(private manager: StrategyManager) {}

  /**
   * Plan a route to achieve a goal
   * @param goal Goal description
   * @param startNode Starting node ID
   * @param constraints Optional constraints
   * @returns Planned strategy
   */
  planRoute(goal: string, startNode: string, constraints?: Constraints): Strategy {
    return this.manager.planRoute(goal, startNode, constraints);
  }

  /**
   * Optimize path between two nodes
   * @param from Source node ID
   * @param to Target node ID
   * @param criteria Optimization criteria
   * @returns Optimized path
   */
  optimizePath(from: string, to: string, criteria = 'shortest' as const): string[] {
    return this.manager.optimizePath(from, to, criteria);
  }

  /**
   * Find strategies by goal
   * @param goal Goal to search for
   * @returns Array of matching strategies
   */
  findStrategies(goal: string): Strategy[] {
    return this.manager.findStrategies(goal);
  }

  /**
   * Evaluate strategy performance
   * @param strategyId Strategy ID to evaluate
   * @returns Strategy metrics
   */
  evaluateStrategy(strategyId: string): StrategyMetrics {
    return this.manager.evaluateStrategy(strategyId);
  }

  /**
   * Adapt strategy based on experience feedback
   * @param strategyId Strategy ID to adapt
   * @param feedback Experience feedback
   * @returns Adapted strategy
   */
  adaptStrategy(strategyId: string, feedback: Experience): Strategy {
    return this.manager.adaptStrategy(strategyId, feedback);
  }

  /**
   * Compare multiple strategies
   * @param ids Array of strategy IDs to compare
   * @returns Comparison result
   */
  compareStrategies(ids: string[]): ComparisonResult {
    return this.manager.compareStrategies(ids);
  }

  /**
   * Get strategy by ID
   * @param id Strategy ID
   * @returns Strategy or null if not found
   */
  getStrategy(id: string): Strategy | null {
    return this.manager.getStrategy(id);
  }

  /**
   * Update existing strategy
   * @param id Strategy ID
   * @param updates Partial updates to apply
   * @returns True if update was successful
   */
  updateStrategy(id: string, updates: Partial<Strategy>): boolean {
    return this.manager.updateStrategy(id, updates);
  }

  /**
   * Delete strategy
   * @param id Strategy ID
   * @returns True if deletion was successful
   */
  deleteStrategy(id: string): boolean {
    return this.manager.deleteStrategy(id);
  }

  /**
   * Get all strategies
   * @returns Array of all strategies
   */
  getAllStrategies(): Strategy[] {
    return this.manager.getAllStrategies();
  }
}