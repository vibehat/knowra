# Knowra

> A natural memory system that mirrors human cognition - transforming raw data into intuitive decision-making through connected concepts and optimized pathways

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()

## Why Knowra?

**Think like humans**: Our minds don't store isolated facts. When you think "coffee", you automatically traverse a graph: morning → energy → productivity → work. This is associative memory in action.

**AI should work the same way**: Instead of separate databases, knowledge forms a living network where information evolves through five distinct stages, from disconnected data points to intuitive wisdom.

---

*Knowra follows the progression: **Information** → **Knowledge** → **Experience** → **Strategy** → **Intuition***

*Each stage represents a deeper level of graph sophistication, where AI systems become increasingly intelligent and responsive.*

## Quick Start

```bash
npm install knowra
```

```javascript
import { KnowraGraph } from 'knowra';

const graph = new KnowraGraph();

// Stage 1: Collect raw information
await graph.collect("React hooks were introduced in v16.8");

// Stage 2: Build knowledge connections
await graph.connect("React hooks", "state management", {
  type: "improves",
  evidence: "cleaner component logic"
});

// Stage 3: Learn from experience
await graph.reinforcePath(["problem", "research", "implement", "test"]);

// Stage 4: Strategic planning
const strategy = await graph.planRoute({
  goal: "implement authentication",
  constraints: { time: "1 week", risk: "low" }
});

// Stage 5: Intuitive insights
const wisdom = await graph.intuitiveResponse("users complaining about slow app");
```

## The Five Stages of Knowledge Evolution

### Stage 1: Information (Isolated Nodes)
**Definition:** Disconnected data points with no context  
**Graph:** Isolated nodes  
**Goal:** Increase coverage — collect diverse information

```javascript
// Adding raw information
graph.collect("Authentication takes 3 seconds on average");
graph.collect("JWT library: jsonwebtoken v8.5.1");
```

### Stage 2: Knowledge (Connected Graph)
**Definition:** Data points connected by relationships  
**Graph:** Nodes + edges forming knowledge clusters  
**Goal:** Build meaningful, validated connections

```javascript
// Connecting information into knowledge
graph.connect("JWT expiration", "user logout", {
  type: "causes",
  strength: 0.9,
  evidence: "observed in production logs"
});
```

### Stage 3: Experience (Traversed Paths)
**Definition:** Practical use of the knowledge graph  
**Graph:** Well-traveled routes with feedback loops  
**Goal:** Learn which paths produce real-world results

```javascript
// Learning from successful paths
graph.reinforcePath(["bug report", "check logs", "fix JWT"], {
  outcome: "success",
  confidence: 0.95
});
```

### Stage 4: Strategy (Optimized Routes)
**Definition:** Deliberate path selection to achieve goals  
**Graph:** Optimized routes using algorithms  
**Goal:** Minimize wasted moves, maximize impact

```javascript
// Strategic planning
const strategy = graph.planRoute({
  goal: "secure user authentication",
  constraints: { time: "2 weeks", risk: "low" },
  algorithm: "shortest_path"
});
```

### Stage 5: Intuition (High-Weight Shortcuts)
**Definition:** Fast, subconscious route selection based on pattern recognition  
**Graph:** High-weight shortcuts across the entire graph  
**Goal:** Act quickly without sacrificing accuracy

```javascript
// Intuitive pattern recognition
const insight = graph.intuitiveResponse("users complaining about slow app");
// Returns: "Check authentication bottleneck - high probability database connection pooling issue"
```

### Stage-Aware Operations

```javascript
// Information Stage: Data collection
graph.collect("React hooks make state management cleaner");

// Knowledge Stage: Relationship building  
graph.connect("React hooks", "state management", { type: "improves" });

// Experience Stage: Path-based learning
const debuggingPath = graph.getExperiencePath("performance issues");

// Strategy Stage: Goal-optimized recommendations
const optimal = graph.planOptimalPath("implement feature", constraints);

// Intuition Stage: Instant wisdom
const wisdom = graph.extractWisdom("project delays");
```

## Features

- **🧠 5-Stage Evolution**: Information → Knowledge → Experience → Strategy → Intuition
- **🔗 Associative Memory**: Knowledge connects by meaning, like human cognition
- **⏰ Temporal Intelligence**: Navigate knowledge across time dimensions
- **🤖 LLM Integration**: Natural language graph operations at every stage
- **📊 Stage-Aware Summarization**: Context changes based on graph maturity
- **🔍 Semantic Search**: Find concepts and patterns, not just text
- **📈 Experience Learning**: Paths get stronger with successful outcomes
- **⚡ Intuitive Insights**: Instant wisdom from accumulated experience
- **🎯 Strategic Planning**: Goal-optimized route selection
- **🧭 Pattern Recognition**: Cross-domain analogies and meta-patterns

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Natural       │    │   Knowledge      │    │   Intelligent   │
│   Language      │───▶│   Graph          │───▶│   Retrieval     │
│   Interface     │    │   Engine         │    │   System        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   LLM Graph     │    │   Temporal       │    │   Context       │
│   Operations    │    │   Navigation     │    │   Summarization │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Use Cases Across All Stages

### Learning Assistant (All Stages)
```javascript
// Information: Collect learning materials
graph.collect("Docker simplifies deployment but adds complexity");

// Knowledge: Connect concepts
graph.connect("Docker", "deployment", { type: "simplifies" });

// Experience: Track what actually worked
graph.reinforcePath(["learn Docker", "build container", "deploy successfully"]);

// Strategy: Optimal learning approach
const learningPlan = graph.planRoute({ goal: "master containerization" });

// Intuition: Instant learning wisdom
const advice = graph.intuitiveResponse("struggling with new technology");
```

### Project Memory (Evolution Over Time)
```javascript
// Stage 2: Capture decisions and relationships
graph.connect("MongoDB choice", "rapid prototyping", {
  type: "enables",
  evidence: "flexible schema for changing requirements"
});

// Stage 3: Learn from project outcomes
graph.reinforcePath(["MongoDB", "performance issues", "indexing solution"]);

// Stage 4: Strategic project planning
const projectStrategy = graph.planRoute({
  goal: "new project success",
  constraints: { timeline: "3 months", team_size: 2 }
});

// Stage 5: Project wisdom
const insight = graph.extractWisdom("project delays");
// Returns: "Scope creep + insufficient planning = 80% of delays"
```

### Debugging Intelligence (Pattern-Based Problem Solving)
```javascript
// Experience Stage: Learn debugging patterns
graph.reinforcePath(["bug report", "check logs", "identify auth issue"], {
  outcome: "success",
  time_taken: "2 hours"
});

// Strategy Stage: Optimal debugging approach
const debugStrategy = graph.planRoute({
  goal: "resolve authentication bug",
  constraints: { urgency: "high" }
});

// Intuition Stage: Instant problem recognition
const quickFix = graph.intuitiveResponse("users logged out randomly");
// Returns: "JWT refresh race condition - check token timing"
```

## API Reference

### Stage-Specific Methods

```javascript
// Stage 1: Information Collection
graph.collect(content, options)        // Add raw information
graph.getIsolatedNodes()               // Find disconnected data

// Stage 2: Knowledge Building  
graph.connect(from, to, relationship)  // Create connections
graph.getCluster(topic)                // Get knowledge networks
graph.validateConnections()            // Verify relationships

// Stage 3: Experience Learning
graph.reinforcePath(route, outcome)    // Strengthen successful paths
graph.getExperiencePath(context)       // Get proven approaches
graph.trackOutcomes(pathId, result)    // Record path results

// Stage 4: Strategic Planning
graph.planRoute(goal, constraints)     // Find optimal paths
graph.findAlternatives(strategy)       // Backup plans
graph.assessRisk(path)                 // Evaluate success probability

// Stage 5: Intuitive Operations
graph.intuitiveResponse(situation)     // Instant pattern matching
graph.extractWisdom(domain)            // Synthesize principles
graph.findAnalogy(concept1, concept2)  // Cross-domain insights

// Cross-Stage Operations
graph.ask(query, stageContext)         // Natural language queries
graph.summarize(options)               // Stage-aware summaries
graph.recall(timeframe)                // Temporal navigation
graph.evolve(nodeId)                   // Progress through stages
```

### Configuration

```javascript
const graph = new KnowraGraph({
  // Core Settings
  llm: 'gpt-4',                        // LLM provider for natural language
  storage: 'levelgraph',               // levelgraph | memory | file
  
  // Stage Evolution
  autoEvolve: true,                    // Automatically progress through stages
  stageThresholds: {                   // When to evolve to next stage
    knowledge: { connections: 3 },      // 3+ connections = knowledge
    experience: { traversals: 5 },      // 5+ uses = experience  
    strategy: { success_rate: 0.8 },    // 80% success = strategic
    intuition: { cross_domain: 3 }      // 3+ domains = intuitive
  },
  
  // Graph Behavior
  strengthThreshold: 0.3,              // Minimum connection strength
  temporalDecay: true,                 // Fade unused knowledge
  maxConnections: 50,                  // Limit node connections
  
  // Stage-Specific Features
  enableSemanticSearch: true,          // Vector embeddings for similarity
  pathReinforcement: true,             // Learn from successful paths
  wisdomExtraction: true,              // Synthesize meta-patterns
  temporalNavigation: true             // Time-based queries
});
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Knowra Contributors](LICENSE)

## Real-World Example: Authentication Knowledge Evolution

```javascript
// Stage 1: Collect scattered information
graph.collect("JWT library exists");
graph.collect("Users need login");
graph.collect("Security is important");

// Stage 2: Build knowledge connections
graph.connect("JWT tokens", "user authentication", { type: "enables" });
graph.connect("token expiration", "user logout", { type: "causes" });

// Stage 3: Learn from experience  
graph.reinforcePath(["choose JWT", "implement validation", "add refresh logic"], {
  outcome: "success",
  project: "chat-app"
});

// Stage 4: Strategic decision-making
const authStrategy = graph.planRoute({
  goal: "implement secure authentication", 
  constraints: { time: "1 week", team_expertise: "JWT familiar" }
});
// Returns: "Use JWT library (proven path) → Standard patterns → Testing → Deploy"

// Stage 5: Instant intuitive wisdom
const quickDecision = graph.intuitiveResponse("authentication decision needed urgently");
// Returns: "Go with JWT library you know. Authentication isn't the place for innovation."
```

## Documentation

- **[Core Concepts](docs/concepts.md)** - The 5-stage evolution model
- **[Detailed Specification](docs/graph-knowledge.md)** - Complete system design
- **[Technical Proposal](docs/technical-proposals.md)** - Implementation approach

---

**Built for developers who want AI that remembers, connects, and grows smarter over time.**

*From isolated information to intuitive wisdom - just like human cognition.*