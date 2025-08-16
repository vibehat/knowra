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
  Pattern,
  Insight,
  ExperienceMetrics,
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
  NodeMetrics,
  GraphMetrics,
  StructuralAnalysis,
  StructuralImportance,
  CentralNode,
} from './types.js';

import { generateId, isValidId, deepClone, contentToString, validateConfidence } from './utils.js';
import { GraphFoundation } from './GraphFoundation.js';
import { PersistenceManager } from './PersistenceManager.js';
import { TextSearchManager } from './TextSearchManager.js';
import { PathTracker } from './experience/PathTracker.js';
import { PatternDetector } from './levels/experience/PatternDetector.js';
import { InsightExtractor } from './levels/experience/InsightExtractor.js';
import { LearningEngine } from './levels/experience/LearningEngine.js';
import { SuggestionEngine } from './levels/experience/SuggestionEngine.js';
import { EventBus } from './orchestration/EventBus.js';
import { InformationManager } from './levels/information/InformationManager.js';
import { KnowledgeManager } from './levels/knowledge/KnowledgeManager.js';
import { ExperienceManager } from './levels/experience/ExperienceManager.js';
import { StrategyManager } from './levels/strategy/StrategyManager.js';
import { IntuitionManager } from './levels/intuition/IntuitionManager.js';
import { 
  InformationAPI, 
  KnowledgeAPI, 
  ExperienceAPI, 
  StrategyAPI, 
  IntuitionAPI, 
  AnalyzeAPI, 
  PluginAPI,
  EventAPI 
} from './api/index.js';

/**
 * Core implementation of the Knowra Knowledge Database
 * Provides all five levels of knowledge evolution as a unified API
 */
export class KnowraCore implements KnowledgeDatabaseAPI {
  // Core data storage - now using GraphFoundation instead of Maps
  private graphFoundation = new GraphFoundation();
  private persistenceManager = new PersistenceManager();
  private textSearchManager = new TextSearchManager();
  private pathTracker: PathTracker;
  private eventBus = new EventBus();
  
  // Higher-level data structures that don't fit in the graph
  private experiences = new Map<string, Experience>();
  private patterns = new Map<string, Pattern>();
  private insights = new Map<string, Insight>();
  private strategies = new Map<string, Strategy>();
  private intuitions = new Map<string, Intuition>();

  // Plugin system
  private pluginRegistry = new Map<string, Plugin>();
  private eventHandlers = new Map<string, Array<(...args: unknown[]) => void>>();

  // Experience-level services
  private patternDetector: PatternDetector;
  private insightExtractor: InsightExtractor;
  private learningEngine: LearningEngine;
  private suggestionEngine: SuggestionEngine;

  // API Level Managers (private)
  private informationManager: InformationManager;
  private knowledgeManager: KnowledgeManager;
  private experienceManager: ExperienceManager;
  private strategyManager: StrategyManager;
  private intuitionManager: IntuitionManager;

  // Public API Instances (replacing object literals)
  public readonly information: InformationAPI;
  public readonly knowledge: KnowledgeAPI;
  public readonly experience: ExperienceAPI;
  public readonly strategy: StrategyAPI;
  public readonly intuition: IntuitionAPI;
  public readonly analyze: AnalyzeAPI;
  public readonly plugins: PluginAPI;
  public readonly events: EventAPI;

  constructor() {
    // Initialize the path tracker with node validation
    this.pathTracker = new PathTracker(
      {
        maxConcurrentPaths: 50,
        autoCompleteTimeout: 600000, // 10 minutes
        enableDetailedTiming: true,
        validateNodes: true,
        recordIntermediary: true,
      },
      (nodeId: string) => this.graphFoundation.hasNode(nodeId)
    );

    // Initialize experience-level services
    this.patternDetector = new PatternDetector({
      minPathLength: 3,
      similarityThreshold: 0.5,
      maxPatternsPerDetection: 5,
    });
    
    this.insightExtractor = new InsightExtractor({
      minConfidenceThreshold: 0.3,
      sentimentAnalysisEnabled: true,
      patternDetectionEnabled: true,
    });
    
    this.learningEngine = new LearningEngine(this.experiences, {
      decayPeriod: 30,
      maxReinforcement: 1.0,
      minReinforcement: 0.0,
      similarityThreshold: 0.3,
      reinforcementDecayRate: 0.1,
    });
    
    this.suggestionEngine = new SuggestionEngine(this.experiences, this.graphFoundation, {
      defaultLimit: 5,
      minConfidence: 0.1,
      recencyWeightFactor: 0.2,
      contextMatchBonus: 0.3,
      maxDaysForRecency: 30,
    });

    // Initialize API Level Managers
    this.informationManager = new InformationManager({
      graphFoundation: this.graphFoundation,
      textSearchManager: this.textSearchManager,
      eventBus: this.eventBus,
      cleanupRelatedData: (nodeId: string) => this.cleanupRelatedData(nodeId),
    });

    this.knowledgeManager = new KnowledgeManager({
      graphFoundation: this.graphFoundation,
      eventBus: this.eventBus,
    });

    this.experienceManager = new ExperienceManager({
      graphFoundation: this.graphFoundation,
      eventBus: this.eventBus,
      pathTracker: this.pathTracker,
      patternDetector: this.patternDetector,
      insightExtractor: this.insightExtractor,
      learningEngine: this.learningEngine,
      suggestionEngine: this.suggestionEngine,
      experiences: this.experiences,
    });

    this.strategyManager = new StrategyManager({
      eventBus: this.eventBus,
      knowledgeManager: this.knowledgeManager,
      strategies: this.strategies,
    });

    this.intuitionManager = new IntuitionManager({
      eventBus: this.eventBus,
      intuitions: this.intuitions,
    });

    // Initialize API instances (replacing object literals)
    this.information = new InformationAPI(this.informationManager);
    this.knowledge = new KnowledgeAPI(this.knowledgeManager);
    this.experience = new ExperienceAPI(this.experienceManager);
    this.strategy = new StrategyAPI(this.strategyManager);
    this.intuition = new IntuitionAPI(this.intuitionManager);
    this.analyze = new AnalyzeAPI(this.graphFoundation, this.knowledge);
    this.plugins = new PluginAPI(
      this.pluginRegistry, 
      this.eventHandlers,
      (plugin: Plugin) => plugin.init?.(this)
    );
    this.events = new EventAPI(this.eventHandlers);

    // Initialize the core system
    this.setupEventSystem();
  }


  // ============ Persistence Methods ============

  /**
   * Save the knowledge database to a file
   * @param filePath Path to save the data
   */
  async save(filePath: string): Promise<void> {
    const graphData = this.graphFoundation.export();
    
    // Add higher-level data to metadata
    graphData.metadata = {
      ...graphData.metadata,
      experienceCount: this.experiences.size,
      strategyCount: this.strategies.size,
      intuitionCount: this.intuitions.size,
    };

    await this.persistenceManager.saveWithBackup(graphData, filePath);
  }

  /**
   * Load the knowledge database from a file
   * @param filePath Path to load the data from
   */
  async load(filePath: string): Promise<void> {
    const graphData = await this.persistenceManager.loadWithRecovery(filePath);
    
    // Import graph data
    this.graphFoundation.import(graphData);
    
    // Rebuild search indexes
    this.rebuildSearchIndex();
    
    // Note: For now, we only persist the graph data (nodes and edges)
    // Higher-level data (experiences, strategies, intuitions) are kept in memory
    // In a full implementation, these would also be persisted
  }

  /**
   * Get graph foundation for advanced operations
   */
  getGraphFoundation(): GraphFoundation {
    return this.graphFoundation;
  }

  /**
   * Get persistence manager for advanced operations
   */
  getPersistenceManager(): PersistenceManager {
    return this.persistenceManager;
  }

  /**
   * Get text search manager for advanced operations
   */
  getTextSearchManager(): TextSearchManager {
    return this.textSearchManager;
  }

  /**
   * Rebuild the text search index from all current nodes
   */
  private rebuildSearchIndex(): void {
    // Clear existing index
    this.textSearchManager.clear();
    
    // Add all nodes to the search index
    const allNodes = this.graphFoundation.getAllNodes();
    for (const node of allNodes) {
      this.textSearchManager.addNode(node);
    }
  }

  // ============ Private Helper Methods ============



  private setupEventSystem(): void {
    // Initialize core event handlers
    this.eventBus.on('information:afterDelete', (...args: unknown[]) => {
      const nodeId = args[0] as string;
      this.cleanupRelatedData(nodeId);
    });

    // Bridge internal EventBus to external EventAPI
    // Forward important system events to the external API for plugins and external consumers
    this.eventBus.on('knowledge:onCluster', (...args: unknown[]) => {
      this.events.emit('knowledge:onCluster', ...args);
    });
    
    this.eventBus.on('information:afterAdd', (...args: unknown[]) => {
      this.events.emit('information:afterAdd', ...args);
    });
    
    this.eventBus.on('knowledge:afterConnect', (...args: unknown[]) => {
      this.events.emit('knowledge:afterConnect', ...args);
    });
    
    this.eventBus.on('knowledge:afterDisconnect', (...args: unknown[]) => {
      this.events.emit('knowledge:afterDisconnect', ...args);
    });
    
    this.eventBus.on('experience:afterRecord', (...args: unknown[]) => {
      this.events.emit('experience:afterRecord', ...args);
    });
  }

  private cleanupRelatedData(nodeId: string): void {
    // GraphFoundation automatically handles edge cleanup when nodes are deleted
    // We only need to clean up higher-level data structures

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
