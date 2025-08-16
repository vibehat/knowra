# Agent Knowledge Retrieval with Knowra Graph

> How AI agents use Knowra's graph structure to retrieve exactly the context they need for intelligent task execution

## How Agents Query Knowledge for Context

Agents need specific information at different moments during task execution. Knowra's graph structure enables precise retrieval of relevant context through targeted queries.

### Agent Knowledge Needs

1. **Task Context**: "What do I know about this type of task?"
2. **Experience Context**: "How have similar tasks been handled before?"
3. **Decision Context**: "What factors should influence this choice?"
4. **Progress Context**: "Where am I in this complex task?"
5. **Risk Context**: "What could go wrong based on past experience?"

## Scenario 1: Agent Debugging Production Issue

**Situation**: Users reporting "authentication errors after deployment"

### What the Agent Needs:
- Past authentication issues and their solutions
- Deployment-related problems and patterns
- Error types and resolution strategies
- Team-specific debugging approaches

### Knowra Graph Query:
```javascript
// Query for authentication deployment issues
const context = await knowraGraph.query({
  nodes: {
    type: 'issue',
    domain: 'authentication',
    keywords: ['deployment', 'errors', 'production']
  },
  edges: {
    relationships: ['causes', 'solved_by', 'similar_to'],
    include_paths: true
  },
  depth: 3,
  filter: {
    success_rate: '>0.7',
    recency: 'last_6_months'
  }
});
```

### Retrieved Context Structure:
```javascript
{
  primary_patterns: [
    {
      pattern: "JWT secret mismatch in production",
      frequency: 8,
      success_rate: 0.95,
      resolution: "Check environment variables",
      time_to_resolve: "15 minutes"
    },
    {
      pattern: "Token expiration config changes",
      frequency: 5,
      success_rate: 0.87,
      resolution: "Verify token settings consistency",
      time_to_resolve: "30 minutes"
    }
  ],
  
  connected_knowledge: [
    {
      node: "deployment_checklist",
      content: "Always verify auth environment variables",
      strength: 0.9
    },
    {
      node: "jwt_debugging_steps", 
      content: "1. Check secrets 2. Verify expiration 3. Test endpoints",
      strength: 0.8
    }
  ],
  
  team_experience: [
    {
      decision: "Use environment variable validation",
      context: "After 3 deployment auth failures",
      effectiveness: 0.92
    }
  ],
  
  risk_factors: [
    {
      risk: "Database connection timeout during auth",
      probability: 0.3,
      mitigation: "Check connection pool settings"
    }
  ]
}
```

### How Agent Uses This Context:
```javascript
// Agent prioritizes most likely solutions
const diagnosis = context.primary_patterns[0]; // JWT secret mismatch (95% success rate)

// Agent explains reasoning using retrieved knowledge
const explanation = `Based on 8 similar cases, this is likely a JWT secret mismatch. 
The standard resolution takes 15 minutes: check environment variables first.`;

// Agent applies team-specific approach
const approach = context.team_experience[0]; // Use environment variable validation
```

## Scenario 2: Agent Planning New Feature Implementation

**Situation**: "Implement user dashboard with data visualization"

### What the Agent Needs:
- Past dashboard implementations and patterns
- Data visualization choices and outcomes
- User interface decisions that worked
- Integration approaches for similar features

### Knowra Graph Query:
```javascript
// Query for dashboard implementation knowledge
const planningContext = await knowraGraph.query({
  nodes: {
    type: 'implementation',
    features: ['dashboard', 'data_visualization', 'user_interface'],
    stage: ['experience', 'strategy'] // Focus on proven approaches
  },
  edges: {
    relationships: ['implements', 'uses', 'integrates_with', 'succeeded_by'],
    traverse_patterns: true
  },
  include: {
    decision_history: true,
    performance_data: true,
    user_feedback: true
  }
});
```

### Retrieved Context Structure:
```javascript
{
  implementation_patterns: [
    {
      pattern: "React + Chart.js dashboard",
      projects: 3,
      user_satisfaction: 0.89,
      development_time: "2 weeks",
      maintenance_effort: "low"
    },
    {
      pattern: "D3.js custom visualizations", 
      projects: 1,
      user_satisfaction: 0.95,
      development_time: "4 weeks",
      maintenance_effort: "high"
    }
  ],
  
  architectural_decisions: [
    {
      decision: "Component-based dashboard layout",
      reasoning: "Easier to maintain and extend",
      outcomes: "Reduced bugs by 40%"
    },
    {
      decision: "Real-time data updates via WebSocket",
      reasoning: "User requested live data",
      outcomes: "High user engagement"
    }
  ],
  
  integration_knowledge: [
    {
      component: "data_fetching",
      approach: "Custom React hooks",
      benefits: "Reusable across dashboard widgets"
    },
    {
      component: "state_management",
      approach: "Context API for dashboard state",
      benefits: "Simple setup, good performance"
    }
  ],
  
  learned_pitfalls: [
    {
      pitfall: "Loading all data at once",
      impact: "Slow initial load times",
      solution: "Implement lazy loading per widget"
    }
  ]
}
```

### How Agent Uses This Context:
```javascript
// Agent recommends based on team patterns and constraints
const recommendation = {
  approach: planningContext.implementation_patterns[0], // React + Chart.js
  reasoning: "Balances user satisfaction (89%) with reasonable development time (2 weeks)",
  
  architecture: planningContext.architectural_decisions[0], // Component-based layout
  data_strategy: planningContext.integration_knowledge[0], // Custom React hooks
  
  risk_mitigation: planningContext.learned_pitfalls[0] // Implement lazy loading
};

// Agent creates informed timeline
const timeline = {
  week1: "Component structure + data hooks",
  week2: "Chart integration + performance optimization",
  confidence: 0.85 // Based on 3 similar successful projects
};
```

## Scenario 3: Agent Learning from Task Outcomes

**Situation**: Agent completed "API security audit" and needs to learn for future tasks

### What the Agent Needs:
- Pattern recognition across security audits
- Success/failure correlation analysis
- Knowledge gap identification
- Strategy refinement for similar tasks

### Knowra Graph Query:
```javascript
// Query to learn patterns from completed security audits
const learningContext = await knowraGraph.query({
  nodes: {
    type: 'task_outcome',
    domain: 'security_audit',
    temporal_range: 'all_time'
  },
  edges: {
    relationships: ['led_to', 'prevented', 'discovered', 'missed'],
    analyze_patterns: true
  },
  learning_focus: {
    success_factors: true,
    failure_modes: true,
    improvement_opportunities: true
  }
});
```

### Retrieved Context Structure:
```javascript
{
  success_patterns: [
    {
      pattern: "Automated scanning + manual verification",
      success_rate: 0.94,
      coverage: "95% of vulnerabilities found",
      time_efficiency: "3x faster than manual only"
    },
    {
      pattern: "Security checklist + penetration testing",
      success_rate: 0.87,
      coverage: "90% of vulnerabilities found", 
      client_satisfaction: 0.91
    }
  ],
  
  failure_analysis: [
    {
      failure: "Missed SQL injection in admin panel",
      frequency: 2,
      root_cause: "Didn't test admin-specific endpoints",
      prevention: "Include admin endpoint testing in checklist"
    },
    {
      failure: "False positive rate too high",
      frequency: 3,
      root_cause: "Automated tool not tuned for framework",
      prevention: "Framework-specific tool configuration"
    }
  ],
  
  emerging_insights: [
    {
      insight: "GraphQL endpoints need specific testing approach",
      evidence: "3 recent projects with GraphQL-specific vulnerabilities",
      recommendation: "Add GraphQL security testing to standard process"
    }
  ],
  
  knowledge_evolution: {
    new_connections: [
      "JWT validation → CORS configuration",
      "API rate limiting → DDoS prevention",
      "Input sanitization → XSS prevention"
    ],
    strengthened_paths: [
      "Automated scanning → Manual verification (0.7 → 0.9 strength)",
      "Security checklist → Vulnerability detection (0.6 → 0.8 strength)"
    ]
  }
}
```

### How Agent Uses This Context for Learning:
```javascript
// Agent updates its security audit strategy
await knowraGraph.evolveStrategy('security_audit', {
  primary_approach: learningContext.success_patterns[0], // Automated + manual
  
  enhanced_checklist: [
    ...existing_checklist,
    learningContext.failure_analysis[0].prevention, // Admin endpoint testing
    learningContext.emerging_insights[0].recommendation // GraphQL testing
  ],
  
  tool_configuration: {
    tune_for_framework: true, // Address false positive issue
    graphql_specific_tests: true // New requirement
  }
});

// Agent strengthens knowledge connections
await knowraGraph.reinforceConnections(
  learningContext.knowledge_evolution.strengthened_paths
);

// Agent creates new knowledge connections
await knowraGraph.createConnections(
  learningContext.knowledge_evolution.new_connections
);
```

## Scenario 4: Agent Managing Complex Multi-Day Project

**Situation**: Agent working on "migrate user system to microservices" over 2 weeks

### What the Agent Needs:
- Current progress and next steps
- Decision history and reasoning
- Risk assessment and mitigation status
- Resource allocation and timeline adjustments

### Knowra Graph Query:
```javascript
// Query for project state and context
const projectContext = await knowraGraph.query({
  nodes: {
    project_id: 'user_migration_2024',
    include_all_related: true
  },
  edges: {
    relationships: ['depends_on', 'blocks', 'informs', 'requires'],
    temporal_ordering: true
  },
  context: {
    decisions: true,
    progress: true,
    risks: true,
    team_status: true
  }
});
```

### Retrieved Context Structure:
```javascript
{
  project_state: {
    completion: 0.65,
    current_phase: "Service extraction",
    active_tasks: [
      {
        task: "Extract user authentication service",
        status: "in_progress",
        progress: 0.8,
        estimated_completion: "2 days",
        assignee: "backend_team"
      }
    ],
    blocked_tasks: [
      {
        task: "Database migration scripts",
        blocker: "Schema review pending",
        blocking_since: "2 days",
        impact: "Critical path"
      }
    ]
  },
  
  decision_history: [
    {
      decision: "Use strangler fig pattern",
      timestamp: "week_1_day_2",
      reasoning: "Zero-downtime requirement",
      status: "implemented",
      outcome: "Working well, no service interruptions"
    },
    {
      decision: "Migrate authentication service first",
      timestamp: "week_1_day_3", 
      reasoning: "Highest user impact if broken",
      status: "in_progress",
      outcome: "80% complete, on schedule"
    }
  ],
  
  risk_assessment: [
    {
      risk: "Database migration complexity",
      probability: 0.7,
      impact: "high",
      mitigation: "Database expert consultation scheduled",
      status: "mitigating"
    },
    {
      risk: "Service discovery configuration",
      probability: 0.4,
      impact: "medium", 
      mitigation: "Fallback to direct service calls",
      status: "contingency_ready"
    }
  ],
  
  next_priorities: [
    {
      priority: 1,
      action: "Unblock database migration",
      reason: "Critical path dependency",
      estimated_effort: "4 hours"
    },
    {
      priority: 2,
      action: "Complete authentication service testing",
      reason: "Current task completion",
      estimated_effort: "8 hours"
    }
  ]
}
```

### How Agent Uses This Context:
```javascript
// Agent provides intelligent project summary
const summary = `Migration project 65% complete. Currently extracting authentication service (80% done).
BLOCKER: Database migration scripts waiting for schema review (2 days).
This is on critical path - resolving this is top priority.

Next actions:
1. Escalate schema review (4 hours to resolve)
2. Complete auth service testing (8 hours)
3. Begin user data service extraction

Risk status: Database complexity being mitigated with expert consultation.
Timeline: Still on track if blocker resolved within 1 day.`;

// Agent makes intelligent priority decisions
const nextAction = projectContext.next_priorities[0]; // Unblock database migration

// Agent updates project knowledge
await knowraGraph.updateProjectState('user_migration_2024', {
  context_summary: summary,
  immediate_focus: nextAction,
  lessons_learned: "Schema reviews should be scheduled earlier in migration timeline"
});
```

## Data Structure Meeting Agent Needs

### Node Structure for Agent Memory
```javascript
// Knowledge nodes store rich, contextual information
const agentKnowledgeNode = {
  id: "jwt_authentication_pattern",
  content: "JWT with refresh tokens for stateless auth",
  type: "implementation_pattern",
  domain: "authentication",
  
  // Context for intelligent retrieval
  context: {
    frameworks: ["Express.js", "React"],
    team_size: "2-5 developers",
    security_level: "high",
    performance_requirement: "high"
  },
  
  // Experience data for learning
  usage_history: {
    implementations: 12,
    success_rate: 0.91,
    avg_development_time: "3 days",
    user_satisfaction: 0.88
  },
  
  // Temporal information
  temporal: {
    created: "2024-01-15",
    last_used: "2024-08-10", 
    access_frequency: "high",
    recency_score: 0.9
  },
  
  // Stage information for knowledge evolution
  knowledge_stage: "experience", // Information → Knowledge → Experience → Strategy → Intuition
  confidence: 0.87,
  validation_status: "proven_in_production"
};
```

### Edge Relationships for Context
```javascript
// Edges connect related knowledge for contextual retrieval
const contextualEdges = [
  {
    from: "jwt_authentication_pattern",
    to: "express_middleware_pattern",
    relationship: "implements_with",
    strength: 0.9,
    context: "JWT requires middleware for request processing"
  },
  {
    from: "jwt_authentication_pattern", 
    to: "security_vulnerability_xss",
    relationship: "prevents",
    strength: 0.7,
    context: "Stateless tokens reduce session-based attack vectors"
  },
  {
    from: "jwt_authentication_pattern",
    to: "database_session_storage",
    relationship: "alternative_to",
    strength: 0.8,
    context: "JWT eliminates need for server-side session storage"
  },
  {
    from: "jwt_authentication_pattern",
    to: "production_deployment_issue_auth",
    relationship: "caused",
    strength: 0.6,
    context: "Environment variable misconfiguration led to auth failures"
  }
];
```

### Query Capabilities for Agent Context Retrieval

#### 1. Contextual Similarity Queries
```javascript
// Find knowledge similar to current context
const similarContext = await knowraGraph.findSimilar({
  anchor: "current_authentication_task",
  similarity_factors: ["domain", "team_context", "framework", "constraints"],
  threshold: 0.7,
  limit: 5
});
```

#### 2. Path-Based Experience Queries  
```javascript
// Find proven paths for achieving goals
const experiencePaths = await knowraGraph.getExperiencePaths({
  goal: "secure_user_authentication",
  context: {
    framework: "Express.js",
    team_expertise: "intermediate",
    timeline: "1_week"
  },
  success_threshold: 0.8
});
```

#### 3. Risk and Pattern Queries
```javascript
// Identify risks and patterns from past experience
const riskPatterns = await knowraGraph.analyzeRisks({
  task_type: "authentication_implementation",
  context_factors: ["new_framework", "tight_timeline", "security_requirements"],
  include_mitigation: true
});
```

#### 4. Decision Support Queries
```javascript
// Get context for making informed decisions
const decisionContext = await knowraGraph.getDecisionContext({
  decision_type: "authentication_approach",
  alternatives: ["JWT", "sessions", "OAuth"],
  evaluation_criteria: ["security", "scalability", "development_time"],
  team_context: current_team_context
});
```

## Implementation Examples

### Basic Agent Context Retrieval
```javascript
class ContextAwareAgent {
  constructor(agentId, domain) {
    this.graph = new KnowraGraph(agentId);
    this.domain = domain;
  }

  async getTaskContext(task) {
    // Retrieve relevant knowledge for this specific task
    return await this.graph.query({
      nodes: {
        domain: this.domain,
        type: ['pattern', 'experience', 'decision'],
        relevance_to: task.description
      },
      edges: {
        relationships: ['similar_to', 'applies_to', 'solved_by'],
        strength_threshold: 0.6
      },
      context: {
        team_history: true,
        recent_outcomes: true,
        risk_factors: true
      }
    });
  }

  async executeWithContext(task) {
    // Get context first
    const context = await this.getTaskContext(task);
    
    // Use context to inform execution
    const approach = this.selectApproach(task, context);
    const result = await this.execute(task, approach);
    
    // Learn from outcome
    await this.updateKnowledge(task, approach, result, context);
    
    return result;
  }
}
```

### Advanced Pattern Recognition
```javascript
class LearningAgent extends ContextAwareAgent {
  async recognizePatterns(domain) {
    // Query for pattern recognition across experiences
    const patterns = await this.graph.query({
      analysis_type: 'pattern_recognition',
      nodes: {
        domain: domain,
        type: 'experience',
        temporal_range: 'last_6_months'
      },
      pattern_detection: {
        min_occurrences: 3,
        success_correlation: 0.7,
        context_similarity: 0.6
      }
    });

    return patterns.discovered_patterns;
  }

  async evolveThroughStages(nodeId) {
    // Move knowledge through evolution stages
    const node = await this.graph.getNode(nodeId);
    const usage_data = await this.graph.getUsageData(nodeId);
    
    if (this.shouldEvolve(node, usage_data)) {
      await this.graph.evolveNode(nodeId, {
        new_stage: this.calculateNextStage(node.stage, usage_data),
        confidence_increase: this.calculateConfidenceGain(usage_data),
        strengthened_connections: this.identifyStrengthenedPaths(nodeId)
      });
    }
  }
}
```

### Multi-Agent Knowledge Sharing
```javascript
class CollaborativeAgent extends LearningAgent {
  async shareContextWithTeam(context, task) {
    // Share relevant context with other agents
    await this.graph.shareKnowledge({
      context: context,
      task_domain: task.domain,
      recipients: this.getRelevantAgents(task),
      knowledge_type: ['patterns', 'risks', 'successful_approaches']
    });
  }

  async getTeamContext(task) {
    // Get context from entire team's accumulated knowledge
    return await this.graph.query({
      scope: 'team_knowledge',
      nodes: {
        shared: true,
        relevance_to: task,
        validated: true
      },
      aggregation: {
        consensus_patterns: true,
        collective_experience: true,
        distributed_expertise: true
      }
    });
  }
}
```

## Summary: Knowra Graph Enabling Agent Intelligence

The Knowra graph structure enables agents to:

1. **Retrieve Precise Context**: Query for exactly the knowledge needed for current tasks
2. **Learn from Experience**: Store and retrieve outcome data to improve future performance  
3. **Recognize Patterns**: Identify successful approaches and failure modes across experiences
4. **Make Informed Decisions**: Access decision history and outcome data for similar choices
5. **Maintain Project State**: Keep track of complex, multi-session tasks with full context
6. **Share Knowledge**: Collaborate with other agents through shared graph knowledge

The graph's flexible query system allows agents to request information at exactly the right level of detail and context, making them truly intelligent partners rather than simple task executors.