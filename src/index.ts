/**
 * Knowra - Knowledge Database System
 * 
 * Main entry point for the Knowra Knowledge Database that models how understanding
 * evolves from information to intuition through five levels:
 * 
 * Level 1: Information - Isolated data points
 * Level 2: Knowledge - Connected relationships  
 * Level 3: Experience - Learned paths and patterns
 * Level 4: Strategy - Optimized routes to goals
 * Level 5: Intuition - Fast pattern-based decisions
 */

// Core exports
export { KnowraCore } from './core/KnowraCore.js';
export type * from './core/types.js';
export * from './core/utils.js';

// MCP Server (Phase 6 implementation)
export { MCPServer } from './mcp/server.js';

// Re-export main class as default
export { KnowraCore as default } from './core/KnowraCore.js';