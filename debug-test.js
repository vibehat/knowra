// Simple direct test to debug clustering
import { test } from 'vitest'
import { KnowraCore } from '../src/core/KnowraCore.js';

console.log('Testing clustering directly...');

const knowra = new KnowraCore();
const nodeIds = [];

// Add nodes with clear patterns  
const nodes = [
  { content: 'React components and state management', type: 'react' },
  { content: 'React hooks and lifecycle', type: 'react' }, 
  { content: 'React routing with components', type: 'react' },
  { content: 'Node.js server architecture', type: 'backend' },
  { content: 'Express.js middleware patterns', type: 'backend' },
  { content: 'Node.js database connections', type: 'backend' },
  { content: 'Testing framework setup', type: 'testing' }
];

nodes.forEach((node, i) => {
  const id = knowra.information.add(node.content, { type: node.type });
  nodeIds.push(id);
  console.log(`Node ${i}: ${id} - "${node.content}" [${node.type}]`);
});

// Add connections
knowra.knowledge.connect(nodeIds[0], nodeIds[1], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[1], nodeIds[2], 'related_to', { strength: 0.9 }); 
knowra.knowledge.connect(nodeIds[0], nodeIds[2], 'similar_to', { strength: 0.8 });

knowra.knowledge.connect(nodeIds[3], nodeIds[4], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[4], nodeIds[5], 'related_to', { strength: 0.9 });
knowra.knowledge.connect(nodeIds[3], nodeIds[5], 'similar_to', { strength: 0.8 });

knowra.knowledge.connect(nodeIds[2], nodeIds[3], 'connects_to', { strength: 0.3 });

console.log('\nTesting similarity clustering...');
try {
  const clusters = knowra.knowledge.cluster('similarity');
  console.log(`Found ${clusters.length} similarity clusters`);
  clusters.forEach((cluster, i) => {
    console.log(`  Cluster ${i}: ${cluster.nodes.length} nodes - ${cluster.nodes}`);
    console.log(`    Coherence: ${cluster.coherence}, AvgSim: ${cluster.avgSimilarity}`);
  });
} catch (error) {
  console.error('Similarity clustering error:', error);
}

console.log('\nTesting community clustering...');
try {
  const clusters = knowra.knowledge.cluster('community');
  console.log(`Found ${clusters.length} community clusters`);
  clusters.forEach((cluster, i) => {
    console.log(`  Cluster ${i}: ${cluster.nodes.length} nodes - ${cluster.nodes}`);
    console.log(`    Coherence: ${cluster.coherence}, Modularity: ${cluster.modularity}`);
  });
} catch (error) {
  console.error('Community clustering error:', error);
}