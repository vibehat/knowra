/**
 * Test suite for core types and Zod schema validation
 * Following TDD methodology - these tests define expected behavior
 */

import { describe, it, expect } from 'vitest';
import {
  // Type imports will be used for validation
  Information,
  Knowledge,
  Relationship,
  Experience,
  Strategy,
  Intuition,
  SearchOptions,
  Constraints,
  InfoOperation,
  BatchResult,
  KnowledgeCluster,
  StrategyMetrics,
  ComparisonResult,
  
  // Schema imports (will be implemented)
  InformationSchema,
  KnowledgeSchema,
  RelationshipSchema,
  ExperienceSchema,
  StrategySchema,
  IntuitionSchema,
  SearchOptionsSchema,
  ConstraintsSchema,
  InfoOperationSchema,
  BatchResultSchema,
  KnowledgeClusterSchema,
  StrategyMetricsSchema,
  ComparisonResultSchema,
  
  // Validation function imports (will be implemented)
  validateInformation,
  validateKnowledge,
  validateRelationship,
  validateExperience,
  validateStrategy,
  validateIntuition,
  validateSearchOptions,
  validateConstraints,
} from '../../core/types';

describe('Information Type Validation', () => {
  describe('Valid Information Objects', () => {
    it('should validate a minimal valid Information object', () => {
      const validInformation: Information = {
        id: 'info-123',
        content: 'Test content',
        type: 'text',
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-01'),
      };

      expect(() => InformationSchema.parse(validInformation)).not.toThrow();
      expect(validateInformation(validInformation)).toBe(true);
    });

    it('should validate Information with all optional fields', () => {
      const fullInformation: Information = {
        id: 'info-456',
        content: { complex: 'object', with: ['arrays', 123] },
        type: 'json',
        source: 'api.example.com',
        created: new Date('2024-01-01'),
        modified: new Date('2024-01-02'),
        metadata: {
          priority: 'high',
          tags: ['important', 'urgent'],
          author: 'john.doe@example.com',
        },
      };

      expect(() => InformationSchema.parse(fullInformation)).not.toThrow();
      expect(validateInformation(fullInformation)).toBe(true);
    });

    it('should validate Information with different content types', () => {
      const testCases = [
        { content: 'string content', type: 'text' },
        { content: 12345, type: 'number' },
        { content: true, type: 'boolean' },
        { content: { key: 'value' }, type: 'json' },
        { content: ['item1', 'item2'], type: 'array' },
        { content: null, type: 'null' },
      ];

      testCases.forEach(({ content, type }) => {
        const info: Information = {
          id: `info-${type}`,
          content,
          type,
          created: new Date(),
          modified: new Date(),
        };

        expect(() => InformationSchema.parse(info)).not.toThrow();
        expect(validateInformation(info)).toBe(true);
      });
    });
  });

  describe('Invalid Information Objects', () => {
    it('should reject Information with missing required fields', () => {
      const invalidCases = [
        // Missing id
        { content: 'test', type: 'text', created: new Date(), modified: new Date() },
        // Missing content
        { id: 'test', type: 'text', created: new Date(), modified: new Date() },
        // Missing type
        { id: 'test', content: 'test', created: new Date(), modified: new Date() },
        // Missing created
        { id: 'test', content: 'test', type: 'text', modified: new Date() },
        // Missing modified
        { id: 'test', content: 'test', type: 'text', created: new Date() },
      ];

      invalidCases.forEach((invalid) => {
        expect(() => InformationSchema.parse(invalid)).toThrow();
        expect(validateInformation(invalid as any)).toBe(false);
      });
    });

    it('should reject Information with invalid field types', () => {
      const invalidCases = [
        // Invalid id type
        { id: 123, content: 'test', type: 'text', created: new Date(), modified: new Date() },
        // Invalid type field
        { id: 'test', content: 'test', type: 123, created: new Date(), modified: new Date() },
        // Invalid dates
        { id: 'test', content: 'test', type: 'text', created: 'not-a-date', modified: new Date() },
        { id: 'test', content: 'test', type: 'text', created: new Date(), modified: 'not-a-date' },
        // Invalid source type
        { id: 'test', content: 'test', type: 'text', source: 123, created: new Date(), modified: new Date() },
      ];

      invalidCases.forEach((invalid) => {
        expect(() => InformationSchema.parse(invalid)).toThrow();
        expect(validateInformation(invalid as any)).toBe(false);
      });
    });

    it('should reject Information with empty required string fields', () => {
      const invalidCases = [
        // Empty id
        { id: '', content: 'test', type: 'text', created: new Date(), modified: new Date() },
        // Empty type
        { id: 'test', content: 'test', type: '', created: new Date(), modified: new Date() },
      ];

      invalidCases.forEach((invalid) => {
        expect(() => InformationSchema.parse(invalid)).toThrow();
        expect(validateInformation(invalid as any)).toBe(false);
      });
    });
  });

  describe('Date Validation', () => {
    it('should ensure modified date is not before created date', () => {
      const invalidInfo = {
        id: 'test',
        content: 'test',
        type: 'text',
        created: new Date('2024-01-02'),
        modified: new Date('2024-01-01'), // Modified before created
      };

      expect(() => InformationSchema.parse(invalidInfo)).toThrow();
      expect(validateInformation(invalidInfo)).toBe(false);
    });

    it('should allow modified date equal to created date', () => {
      const sameDate = new Date('2024-01-01');
      const validInfo = {
        id: 'test',
        content: 'test',
        type: 'text',
        created: sameDate,
        modified: sameDate,
      };

      expect(() => InformationSchema.parse(validInfo)).not.toThrow();
      expect(validateInformation(validInfo)).toBe(true);
    });
  });
});

describe('Relationship Type Validation', () => {
  describe('Valid Relationship Objects', () => {
    it('should validate a minimal valid Relationship', () => {
      const validRelationship: Relationship = {
        from: 'node-1',
        to: 'node-2',
        type: 'related_to',
        created: new Date('2024-01-01'),
      };

      expect(() => RelationshipSchema.parse(validRelationship)).not.toThrow();
      expect(validateRelationship(validRelationship)).toBe(true);
    });

    it('should validate Relationship with all optional fields', () => {
      const fullRelationship: Relationship = {
        from: 'node-1',
        to: 'node-2',
        type: 'causes',
        strength: 0.8,
        created: new Date('2024-01-01'),
        metadata: {
          confidence: 0.95,
          source: 'expert_annotation',
          weight: 'high',
        },
      };

      expect(() => RelationshipSchema.parse(fullRelationship)).not.toThrow();
      expect(validateRelationship(fullRelationship)).toBe(true);
    });
  });

  describe('Invalid Relationship Objects', () => {
    it('should reject Relationship with missing required fields', () => {
      const invalidCases = [
        // Missing from
        { to: 'node-2', type: 'related', created: new Date() },
        // Missing to
        { from: 'node-1', type: 'related', created: new Date() },
        // Missing type
        { from: 'node-1', to: 'node-2', created: new Date() },
        // Missing created
        { from: 'node-1', to: 'node-2', type: 'related' },
      ];

      invalidCases.forEach((invalid) => {
        expect(() => RelationshipSchema.parse(invalid)).toThrow();
        expect(validateRelationship(invalid as any)).toBe(false);
      });
    });

    it('should reject Relationship with invalid strength values', () => {
      const invalidCases = [
        // Strength below 0
        { from: 'node-1', to: 'node-2', type: 'related', strength: -0.1, created: new Date() },
        // Strength above 1
        { from: 'node-1', to: 'node-2', type: 'related', strength: 1.1, created: new Date() },
        // Strength not a number
        { from: 'node-1', to: 'node-2', type: 'related', strength: 'high', created: new Date() },
      ];

      invalidCases.forEach((invalid) => {
        expect(() => RelationshipSchema.parse(invalid)).toThrow();
        expect(validateRelationship(invalid as any)).toBe(false);
      });
    });

    it('should reject self-referencing relationships', () => {
      const selfRef = {
        from: 'node-1',
        to: 'node-1', // Same as from
        type: 'related',
        created: new Date(),
      };

      expect(() => RelationshipSchema.parse(selfRef)).toThrow();
      expect(validateRelationship(selfRef)).toBe(false);
    });
  });
});

describe('Knowledge Type Validation', () => {
  describe('Valid Knowledge Objects', () => {
    it('should validate Knowledge with valid node and edges', () => {
      const validKnowledge: Knowledge = {
        node: {
          id: 'node-1',
          content: 'Test knowledge',
          type: 'concept',
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
        edges: [
          {
            from: 'node-1',
            to: 'node-2',
            type: 'relates_to',
            created: new Date('2024-01-01'),
          },
        ],
      };

      expect(() => KnowledgeSchema.parse(validKnowledge)).not.toThrow();
      expect(validateKnowledge(validKnowledge)).toBe(true);
    });

    it('should validate Knowledge with context and multiple edges', () => {
      const knowledgeWithContext: Knowledge = {
        node: {
          id: 'node-1',
          content: 'Complex knowledge',
          type: 'theory',
          created: new Date('2024-01-01'),
          modified: new Date('2024-01-01'),
        },
        edges: [
          {
            from: 'node-1',
            to: 'node-2',
            type: 'supports',
            strength: 0.9,
            created: new Date('2024-01-01'),
          },
          {
            from: 'node-3',
            to: 'node-1',
            type: 'contradicts',
            strength: 0.3,
            created: new Date('2024-01-01'),
          },
        ],
        context: 'Scientific research context',
      };

      expect(() => KnowledgeSchema.parse(knowledgeWithContext)).not.toThrow();
      expect(validateKnowledge(knowledgeWithContext)).toBe(true);
    });
  });

  describe('Invalid Knowledge Objects', () => {
    it('should reject Knowledge with invalid node', () => {
      const invalidKnowledge = {
        node: {
          // Missing required fields
          id: 'node-1',
          content: 'test',
          // missing type, created, modified
        },
        edges: [],
      };

      expect(() => KnowledgeSchema.parse(invalidKnowledge)).toThrow();
      expect(validateKnowledge(invalidKnowledge as any)).toBe(false);
    });

    it('should reject Knowledge with invalid edges', () => {
      const invalidKnowledge = {
        node: {
          id: 'node-1',
          content: 'test',
          type: 'concept',
          created: new Date(),
          modified: new Date(),
        },
        edges: [
          {
            // Missing required fields
            from: 'node-1',
            // missing to, type, created
          },
        ],
      };

      expect(() => KnowledgeSchema.parse(invalidKnowledge)).toThrow();
      expect(validateKnowledge(invalidKnowledge as any)).toBe(false);
    });
  });
});

describe('SearchOptions Type Validation', () => {
  it('should validate valid SearchOptions', () => {
    const validOptions: SearchOptions = {
      type: 'concept',
      tags: ['important', 'research'],
      limit: 10,
      offset: 0,
      sortBy: 'relevance',
      sortOrder: 'desc',
    };

    expect(() => SearchOptionsSchema.parse(validOptions)).not.toThrow();
    expect(validateSearchOptions(validOptions)).toBe(true);
  });

  it('should validate minimal SearchOptions', () => {
    const minimalOptions: SearchOptions = {};

    expect(() => SearchOptionsSchema.parse(minimalOptions)).not.toThrow();
    expect(validateSearchOptions(minimalOptions)).toBe(true);
  });

  it('should reject invalid sortBy values', () => {
    const invalidOptions = {
      sortBy: 'invalid_sort_field',
    };

    expect(() => SearchOptionsSchema.parse(invalidOptions)).toThrow();
    expect(validateSearchOptions(invalidOptions as any)).toBe(false);
  });

  it('should reject negative limit or offset', () => {
    const invalidCases = [
      { limit: -1 },
      { offset: -1 },
      { limit: 0 }, // Should be positive
    ];

    invalidCases.forEach((invalid) => {
      expect(() => SearchOptionsSchema.parse(invalid)).toThrow();
      expect(validateSearchOptions(invalid as any)).toBe(false);
    });
  });
});

describe('InfoOperation Type Validation', () => {
  it('should validate valid InfoOperations', () => {
    const validOperations: InfoOperation[] = [
      { operation: 'add', data: { content: 'new content', type: 'text' } },
      { operation: 'update', id: 'info-123', data: { content: 'updated content' } },
      { operation: 'delete', id: 'info-456' },
    ];

    validOperations.forEach((op) => {
      expect(() => InfoOperationSchema.parse(op)).not.toThrow();
    });
  });

  it('should reject operations missing required fields', () => {
    const invalidCases = [
      { operation: 'update' }, // Missing id for update
      { operation: 'delete' }, // Missing id for delete
      { operation: 'add' }, // Missing data for add
    ];

    invalidCases.forEach((invalid) => {
      expect(() => InfoOperationSchema.parse(invalid)).toThrow();
    });
  });
});

describe('Experience Type Validation', () => {
  describe('Valid Experience Objects', () => {
    it('should validate a minimal valid Experience', () => {
      const validExperience: Experience = {
        id: 'exp-123',
        path: ['node-1', 'node-2', 'node-3'],
        context: 'Exploring knowledge paths',
        outcome: 'success',
        timestamp: new Date('2024-01-01'),
        traversalTime: 1500,
        reinforcement: 0.8,
      };

      expect(() => ExperienceSchema.parse(validExperience)).not.toThrow();
      expect(validateExperience(validExperience)).toBe(true);
    });

    it('should validate Experience with feedback', () => {
      const experienceWithFeedback: Experience = {
        id: 'exp-456',
        path: ['node-1', 'node-2'],
        context: 'Testing path effectiveness',
        outcome: 'failure',
        feedback: 'Path was blocked due to missing connection',
        timestamp: new Date('2024-01-01'),
        traversalTime: 800,
        reinforcement: 0.2,
      };

      expect(() => ExperienceSchema.parse(experienceWithFeedback)).not.toThrow();
      expect(validateExperience(experienceWithFeedback)).toBe(true);
    });

    it('should validate all outcome types', () => {
      const outcomes: Array<'success' | 'failure' | 'neutral'> = ['success', 'failure', 'neutral'];
      
      outcomes.forEach((outcome) => {
        const experience: Experience = {
          id: `exp-${outcome}`,
          path: ['node-1'],
          context: 'Testing outcomes',
          outcome,
          timestamp: new Date(),
          traversalTime: 100,
          reinforcement: 0.5,
        };

        expect(() => ExperienceSchema.parse(experience)).not.toThrow();
        expect(validateExperience(experience)).toBe(true);
      });
    });
  });

  describe('Invalid Experience Objects', () => {
    it('should reject Experience with empty path', () => {
      const invalidExperience = {
        id: 'exp-invalid',
        path: [], // Empty path
        context: 'Testing',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience as any)).toBe(false);
    });

    it('should reject Experience with invalid outcome', () => {
      const invalidExperience = {
        id: 'exp-invalid',
        path: ['node-1'],
        context: 'Testing',
        outcome: 'invalid_outcome',
        timestamp: new Date(),
        traversalTime: 100,
        reinforcement: 0.5,
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience as any)).toBe(false);
    });

    it('should reject Experience with negative traversalTime', () => {
      const invalidExperience = {
        id: 'exp-invalid',
        path: ['node-1'],
        context: 'Testing',
        outcome: 'success',
        timestamp: new Date(),
        traversalTime: -100, // Negative time
        reinforcement: 0.5,
      };

      expect(() => ExperienceSchema.parse(invalidExperience)).toThrow();
      expect(validateExperience(invalidExperience as any)).toBe(false);
    });

    it('should reject Experience with invalid reinforcement range', () => {
      const invalidCases = [
        { reinforcement: -0.1 }, // Below 0
        { reinforcement: 1.1 },  // Above 1
      ];

      invalidCases.forEach(({ reinforcement }) => {
        const experience = {
          id: 'exp-invalid',
          path: ['node-1'],
          context: 'Testing',
          outcome: 'success',
          timestamp: new Date(),
          traversalTime: 100,
          reinforcement,
        };

        expect(() => ExperienceSchema.parse(experience)).toThrow();
        expect(validateExperience(experience as any)).toBe(false);
      });
    });
  });
});

describe('Strategy Type Validation', () => {
  describe('Valid Strategy Objects', () => {
    it('should validate a minimal Strategy', () => {
      const validStrategy: Strategy = {
        id: 'strategy-123',
        goal: 'Find optimal path to knowledge',
        startNode: 'node-1',
        route: ['node-1', 'node-2', 'node-3'],
        algorithm: 'dijkstra',
        cost: 2.5,
        confidence: 0.85,
      };

      expect(() => StrategySchema.parse(validStrategy)).not.toThrow();
      expect(validateStrategy(validStrategy)).toBe(true);
    });

    it('should validate Strategy with endNode', () => {
      const strategyWithEnd: Strategy = {
        id: 'strategy-456',
        goal: 'Connect concepts efficiently',
        startNode: 'node-1',
        endNode: 'node-5',
        route: ['node-1', 'node-2', 'node-5'],
        algorithm: 'a-star',
        cost: 1.8,
        confidence: 0.92,
      };

      expect(() => StrategySchema.parse(strategyWithEnd)).not.toThrow();
      expect(validateStrategy(strategyWithEnd)).toBe(true);
    });
  });

  describe('Invalid Strategy Objects', () => {
    it('should reject Strategy with empty route', () => {
      const invalidStrategy = {
        id: 'strategy-invalid',
        goal: 'Test goal',
        startNode: 'node-1',
        route: [], // Empty route
        algorithm: 'test',
        cost: 1.0,
        confidence: 0.5,
      };

      expect(() => StrategySchema.parse(invalidStrategy)).toThrow();
      expect(validateStrategy(invalidStrategy as any)).toBe(false);
    });

    it('should reject Strategy with invalid confidence range', () => {
      const invalidCases = [
        { confidence: -0.1 }, // Below 0
        { confidence: 1.1 },  // Above 1
      ];

      invalidCases.forEach(({ confidence }) => {
        const strategy = {
          id: 'strategy-invalid',
          goal: 'Test goal',
          startNode: 'node-1',
          route: ['node-1'],
          algorithm: 'test',
          cost: 1.0,
          confidence,
        };

        expect(() => StrategySchema.parse(strategy)).toThrow();
        expect(validateStrategy(strategy as any)).toBe(false);
      });
    });

    it('should reject Strategy with negative cost', () => {
      const invalidStrategy = {
        id: 'strategy-invalid',
        goal: 'Test goal',
        startNode: 'node-1',
        route: ['node-1'],
        algorithm: 'test',
        cost: -1.0, // Negative cost
        confidence: 0.5,
      };

      expect(() => StrategySchema.parse(invalidStrategy)).toThrow();
      expect(validateStrategy(invalidStrategy as any)).toBe(false);
    });

    it('should reject Strategy when startNode not in route', () => {
      const invalidStrategy = {
        id: 'strategy-invalid',
        goal: 'Test goal',
        startNode: 'node-1',
        route: ['node-2', 'node-3'], // startNode not in route
        algorithm: 'test',
        cost: 1.0,
        confidence: 0.5,
      };

      expect(() => StrategySchema.parse(invalidStrategy)).toThrow();
      expect(validateStrategy(invalidStrategy as any)).toBe(false);
    });
  });
});

describe('Intuition Type Validation', () => {
  describe('Valid Intuition Objects', () => {
    it('should validate a valid Intuition', () => {
      const validIntuition: Intuition = {
        id: 'intuition-123',
        pattern: 'When exploring concepts X and Y, path Z is optimal',
        trigger: ['concept_exploration', 'optimization_needed'],
        shortcut: ['node-1', 'node-5', 'node-7'],
        confidence: 0.88,
        usageCount: 25,
        successRate: 0.92,
      };

      expect(() => IntuitionSchema.parse(validIntuition)).not.toThrow();
      expect(validateIntuition(validIntuition)).toBe(true);
    });

    it('should validate Intuition with single trigger and shortcut', () => {
      const singleIntuition: Intuition = {
        id: 'intuition-456',
        pattern: 'Quick decision pattern',
        trigger: ['urgent_decision'],
        shortcut: ['direct_path'],
        confidence: 0.75,
        usageCount: 1,
        successRate: 1.0,
      };

      expect(() => IntuitionSchema.parse(singleIntuition)).not.toThrow();
      expect(validateIntuition(singleIntuition)).toBe(true);
    });
  });

  describe('Invalid Intuition Objects', () => {
    it('should reject Intuition with empty trigger array', () => {
      const invalidIntuition = {
        id: 'intuition-invalid',
        pattern: 'Test pattern',
        trigger: [], // Empty trigger
        shortcut: ['node-1'],
        confidence: 0.5,
        usageCount: 1,
        successRate: 0.5,
      };

      expect(() => IntuitionSchema.parse(invalidIntuition)).toThrow();
      expect(validateIntuition(invalidIntuition as any)).toBe(false);
    });

    it('should reject Intuition with empty shortcut array', () => {
      const invalidIntuition = {
        id: 'intuition-invalid',
        pattern: 'Test pattern',
        trigger: ['trigger-1'],
        shortcut: [], // Empty shortcut
        confidence: 0.5,
        usageCount: 1,
        successRate: 0.5,
      };

      expect(() => IntuitionSchema.parse(invalidIntuition)).toThrow();
      expect(validateIntuition(invalidIntuition as any)).toBe(false);
    });

    it('should reject Intuition with invalid confidence or successRate', () => {
      const invalidCases = [
        { confidence: -0.1, successRate: 0.5 },
        { confidence: 1.1, successRate: 0.5 },
        { confidence: 0.5, successRate: -0.1 },
        { confidence: 0.5, successRate: 1.1 },
      ];

      invalidCases.forEach(({ confidence, successRate }) => {
        const intuition = {
          id: 'intuition-invalid',
          pattern: 'Test pattern',
          trigger: ['trigger-1'],
          shortcut: ['node-1'],
          confidence,
          usageCount: 1,
          successRate,
        };

        expect(() => IntuitionSchema.parse(intuition)).toThrow();
        expect(validateIntuition(intuition as any)).toBe(false);
      });
    });

    it('should reject Intuition with negative usageCount', () => {
      const invalidIntuition = {
        id: 'intuition-invalid',
        pattern: 'Test pattern',
        trigger: ['trigger-1'],
        shortcut: ['node-1'],
        confidence: 0.5,
        usageCount: -1, // Negative usage count
        successRate: 0.5,
      };

      expect(() => IntuitionSchema.parse(invalidIntuition)).toThrow();
      expect(validateIntuition(invalidIntuition as any)).toBe(false);
    });
  });
});

describe('Constraints Type Validation', () => {
  it('should validate valid Constraints', () => {
    const validConstraints: Constraints = {
      maxDepth: 5,
      excludeNodes: ['node-exclude-1', 'node-exclude-2'],
      requiredNodes: ['node-required-1'],
      timeLimit: 5000,
      costLimit: 10.0,
    };

    expect(() => ConstraintsSchema.parse(validConstraints)).not.toThrow();
    expect(validateConstraints(validConstraints)).toBe(true);
  });

  it('should validate empty Constraints', () => {
    const emptyConstraints: Constraints = {};

    expect(() => ConstraintsSchema.parse(emptyConstraints)).not.toThrow();
    expect(validateConstraints(emptyConstraints)).toBe(true);
  });

  it('should reject Constraints with negative values', () => {
    const invalidCases = [
      { maxDepth: -1 },
      { timeLimit: -1000 },
      { costLimit: -5.0 },
    ];

    invalidCases.forEach((invalid) => {
      expect(() => ConstraintsSchema.parse(invalid)).toThrow();
      expect(validateConstraints(invalid as any)).toBe(false);
    });
  });

  it('should reject Constraints with zero maxDepth', () => {
    const invalidConstraints = { maxDepth: 0 };

    expect(() => ConstraintsSchema.parse(invalidConstraints)).toThrow();
    expect(validateConstraints(invalidConstraints as any)).toBe(false);
  });
});

describe('BatchResult Type Validation', () => {
  it('should validate valid BatchResult', () => {
    const validResult: BatchResult = {
      success: true,
      processed: 5,
      errors: [],
      results: ['id-1', 'id-2', 'id-3', 'id-4', 'id-5'],
    };

    expect(() => BatchResultSchema.parse(validResult)).not.toThrow();
  });

  it('should validate BatchResult with errors', () => {
    const resultWithErrors: BatchResult = {
      success: false,
      processed: 2,
      errors: [
        { 
          operation: { operation: 'add', data: { content: 'test', type: 'text' } },
          error: 'Validation failed'
        },
        {
          operation: { operation: 'update', id: 'test-id', data: { content: 'updated' } },
          error: 'Node not found'
        }
      ],
      results: ['id-1', 'id-2'],
    };

    expect(() => BatchResultSchema.parse(resultWithErrors)).not.toThrow();
  });

  it('should reject BatchResult with negative processed count', () => {
    const invalidResult = {
      success: true,
      processed: -1, // Negative processed
      errors: [],
      results: [],
    };

    expect(() => BatchResultSchema.parse(invalidResult)).toThrow();
  });
});

describe('KnowledgeCluster Type Validation', () => {
  it('should validate valid KnowledgeCluster', () => {
    const validCluster: KnowledgeCluster = {
      id: 'cluster-123',
      nodes: ['node-1', 'node-2', 'node-3'],
      centroid: 'node-2',
      coherence: 0.85,
      algorithm: 'community',
    };

    expect(() => KnowledgeClusterSchema.parse(validCluster)).not.toThrow();
  });

  it('should validate KnowledgeCluster without centroid', () => {
    const clusterNoCentroid: KnowledgeCluster = {
      id: 'cluster-456',
      nodes: ['node-1', 'node-2'],
      coherence: 0.72,
      algorithm: 'similarity',
    };

    expect(() => KnowledgeClusterSchema.parse(clusterNoCentroid)).not.toThrow();
  });

  it('should reject KnowledgeCluster with empty nodes', () => {
    const invalidCluster = {
      id: 'cluster-invalid',
      nodes: [], // Empty nodes
      coherence: 0.5,
      algorithm: 'community',
    };

    expect(() => KnowledgeClusterSchema.parse(invalidCluster)).toThrow();
  });

  it('should reject KnowledgeCluster with invalid coherence', () => {
    const invalidCases = [
      { coherence: -0.1 }, // Below 0
      { coherence: 1.1 },  // Above 1
    ];

    invalidCases.forEach(({ coherence }) => {
      const cluster = {
        id: 'cluster-invalid',
        nodes: ['node-1'],
        coherence,
        algorithm: 'community',
      };

      expect(() => KnowledgeClusterSchema.parse(cluster)).toThrow();
    });
  });

  it('should reject KnowledgeCluster with invalid algorithm', () => {
    const invalidCluster = {
      id: 'cluster-invalid',
      nodes: ['node-1'],
      coherence: 0.5,
      algorithm: 'invalid_algorithm',
    };

    expect(() => KnowledgeClusterSchema.parse(invalidCluster)).toThrow();
  });
});

describe('StrategyMetrics Type Validation', () => {
  it('should validate valid StrategyMetrics', () => {
    const validMetrics: StrategyMetrics = {
      efficiency: 0.85,
      reliability: 0.92,
      novelty: 0.45,
      complexity: 0.67,
    };

    expect(() => StrategyMetricsSchema.parse(validMetrics)).not.toThrow();
  });

  it('should reject StrategyMetrics with values outside 0-1 range', () => {
    const invalidCases = [
      { efficiency: -0.1, reliability: 0.5, novelty: 0.5, complexity: 0.5 },
      { efficiency: 1.1, reliability: 0.5, novelty: 0.5, complexity: 0.5 },
      { efficiency: 0.5, reliability: -0.1, novelty: 0.5, complexity: 0.5 },
      { efficiency: 0.5, reliability: 1.1, novelty: 0.5, complexity: 0.5 },
      { efficiency: 0.5, reliability: 0.5, novelty: -0.1, complexity: 0.5 },
      { efficiency: 0.5, reliability: 0.5, novelty: 1.1, complexity: 0.5 },
      { efficiency: 0.5, reliability: 0.5, novelty: 0.5, complexity: -0.1 },
      { efficiency: 0.5, reliability: 0.5, novelty: 0.5, complexity: 1.1 },
    ];

    invalidCases.forEach((invalid) => {
      expect(() => StrategyMetricsSchema.parse(invalid)).toThrow();
    });
  });
});

describe('ComparisonResult Type Validation', () => {
  it('should validate valid ComparisonResult', () => {
    const validComparison: ComparisonResult = {
      strategies: [
        {
          id: 'strategy-1',
          goal: 'Test goal',
          startNode: 'node-1',
          route: ['node-1', 'node-2'],
          algorithm: 'test',
          cost: 1.0,
          confidence: 0.8,
        },
      ],
      rankings: [
        {
          strategyId: 'strategy-1',
          score: 0.85,
          reasons: ['Most efficient', 'High reliability'],
        },
      ],
      recommendation: 'strategy-1',
    };

    expect(() => ComparisonResultSchema.parse(validComparison)).not.toThrow();
  });

  it('should reject ComparisonResult with empty strategies', () => {
    const invalidComparison = {
      strategies: [], // Empty strategies
      rankings: [],
      recommendation: 'strategy-1',
    };

    expect(() => ComparisonResultSchema.parse(invalidComparison)).toThrow();
  });

  it('should reject ComparisonResult where recommendation is not in strategies', () => {
    const invalidComparison = {
      strategies: [
        {
          id: 'strategy-1',
          goal: 'Test goal',
          startNode: 'node-1',
          route: ['node-1'],
          algorithm: 'test',
          cost: 1.0,
          confidence: 0.8,
        },
      ],
      rankings: [
        {
          strategyId: 'strategy-1',
          score: 0.85,
          reasons: ['Good strategy'],
        },
      ],
      recommendation: 'strategy-not-in-list', // Not in strategies
    };

    expect(() => ComparisonResultSchema.parse(invalidComparison)).toThrow();
  });
});