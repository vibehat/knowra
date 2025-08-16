import { KnowraCore } from './src/core/KnowraCore.js';

const knowra = new KnowraCore();

// Create the same test data as the test
const testNodes = [
  { content: 'React components and state management', type: 'react' },
  { content: 'React hooks and lifecycle', type: 'react' },
  { content: 'React routing with components', type: 'react' },
  { content: 'Node.js server architecture', type: 'backend' },
  { content: 'Express.js middleware patterns', type: 'backend' },
  { content: 'Node.js database connections', type: 'backend' },
  { content: 'Isolated topic about testing', type: 'testing' },
];

// Add nodes
const nodeIds = testNodes.map((node, index) => {
  return knowra.information.add(node.content, { 
    type: node.type,
    metadata: { 
      category: node.type,
      index 
    } 
  });
});

console.log('Node IDs:', nodeIds);

// Create connections as in test
knowra.knowledge.connect(nodeIds[0], nodeIds[1], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[1], nodeIds[2], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[0], nodeIds[2], 'similar_to', { strength: 0.8 });

knowra.knowledge.connect(nodeIds[3], nodeIds[4], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[4], nodeIds[5], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[3], nodeIds[5], 'similar_to', { strength: 0.8 });

knowra.knowledge.connect(nodeIds[2], nodeIds[3], 'connects_to', { strength: 0.3 });

console.log('\n=== Community Clustering ===');
const communityClusters = knowra.knowledge.cluster('community');
console.log('Community clusters:', communityClusters.length);
communityClusters.forEach((cluster, i) => {
  console.log(`Cluster ${i}:`, {
    nodes: cluster.nodes.length,
    nodeIds: cluster.nodes,
    coherence: cluster.coherence,
    modularity: cluster.modularity
  });
});

console.log('\n=== Similarity Clustering ===');
const similarityClusters = knowra.knowledge.cluster('similarity');
console.log('Similarity clusters:', similarityClusters.length);
similarityClusters.forEach((cluster, i) => {
  console.log(`Cluster ${i}:`, {
    nodes: cluster.nodes.length,
    nodeIds: cluster.nodes,
    coherence: cluster.coherence,
    avgSimilarity: cluster.avgSimilarity
  });
});

// Check which nodes have which content
console.log('\n=== Node Contents ===');
nodeIds.forEach((id, i) => {
  const node = knowra.information.get(id);
  console.log(`Node ${i} (${id}): "${node.content}" [${node.type}]`);
});