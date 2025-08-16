import { expect } from 'vitest'

// Mock the test environment to see what's happening
const mockKnowra = {
  information: {
    add: (content, metadata) => {
      const id = `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`Added node: ${id} - "${content}" [${metadata?.type}]`);
      return id;
    }
  },
  knowledge: {
    connect: (from, to, type, metadata) => {
      console.log(`Connected: ${from} -> ${to} [${type}] strength=${metadata?.strength}`);
    },
    cluster: (algorithm) => {
      console.log(`\n=== Clustering with ${algorithm} algorithm ===`);
      
      if (algorithm === 'similarity') {
        // Mock similarity clustering that doesn't group correctly
        return [
          { nodes: ['info_1'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_1' },
          { nodes: ['info_2'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_2' },
          { nodes: ['info_3'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_3' },
          { nodes: ['info_4'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_4' },
          { nodes: ['info_5'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_5' },
          { nodes: ['info_6'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_6' },
          { nodes: ['info_7'], coherence: 1.0, algorithm: 'similarity', id: 'cluster_7' },
        ];
      } else {
        // Mock community clustering that doesn't group correctly
        return [
          { nodes: ['info_1'], coherence: 0.47, algorithm: 'community', id: 'cluster_1', modularity: 0 },
          { nodes: ['info_2'], coherence: 0.47, algorithm: 'community', id: 'cluster_2', modularity: 0 },
          { nodes: ['info_3'], coherence: 0.47, algorithm: 'community', id: 'cluster_3', modularity: 0 },
          { nodes: ['info_4'], coherence: 0.47, algorithm: 'community', id: 'cluster_4', modularity: 0 },
          { nodes: ['info_5'], coherence: 0.47, algorithm: 'community', id: 'cluster_5', modularity: 0 },
          { nodes: ['info_6'], coherence: 0.47, algorithm: 'community', id: 'cluster_6', modularity: 0 },
          { nodes: ['info_7'], coherence: 0.47, algorithm: 'community', id: 'cluster_7', modularity: 0 },
        ];
      }
    }
  }
};

console.log('=== Simulating the failing test scenario ===');

const nodeIds = [];
const testNodes = [
  { content: 'React components and state management', type: 'react' },
  { content: 'React hooks and lifecycle', type: 'react' },
  { content: 'React routing with components', type: 'react' },
  { content: 'Node.js server architecture', type: 'backend' },
  { content: 'Express.js middleware patterns', type: 'backend' },
  { content: 'Node.js database connections', type: 'backend' },
  { content: 'Isolated topic about testing', type: 'testing' },
];

testNodes.forEach((node, index) => {
  const id = mockKnowra.information.add(node.content, { type: node.type });
  nodeIds.push(id);
});

// Create connections
mockKnowra.knowledge.connect(nodeIds[0], nodeIds[1], 'related_to', { strength: 0.9 });
mockKnowra.knowledge.connect(nodeIds[1], nodeIds[2], 'related_to', { strength: 0.9 });
mockKnowra.knowledge.connect(nodeIds[0], nodeIds[2], 'similar_to', { strength: 0.8 });

mockKnowra.knowledge.connect(nodeIds[3], nodeIds[4], 'related_to', { strength: 0.9 });
mockKnowra.knowledge.connect(nodeIds[4], nodeIds[5], 'related_to', { strength: 0.9 });
mockKnowra.knowledge.connect(nodeIds[3], nodeIds[5], 'similar_to', { strength: 0.8 });

mockKnowra.knowledge.connect(nodeIds[2], nodeIds[3], 'connects_to', { strength: 0.3 });

console.log(`\nNode IDs: ${nodeIds}`);

// Test community clustering
const communityClusters = mockKnowra.knowledge.cluster('community');
console.log(`Community clusters: ${communityClusters.length}`);

// Simulate the failing test
const reactCluster = communityClusters.find(cluster => 
  cluster.nodes.includes(nodeIds[0]) && 
  cluster.nodes.includes(nodeIds[1])
);

console.log(`\nExpected: React cluster with nodes ${nodeIds[0]} and ${nodeIds[1]}`);
console.log(`Found: ${reactCluster ? 'YES' : 'NO (undefined)'}`);

if (!reactCluster) {
  console.log('\nThis is why the test fails: reactCluster is undefined');
  console.log('The algorithm is not grouping related nodes together');
  console.log('\nActual clusters:');
  communityClusters.forEach((cluster, i) => {
    console.log(`  Cluster ${i}: [${cluster.nodes.join(', ')}]`);
  });
}

console.log('\nTesting similarity clustering...');
const similarityClusters = mockKnowra.knowledge.cluster('similarity');
console.log(`Similarity clusters: ${similarityClusters.length}`);

const reactSimilarityCluster = similarityClusters.find(cluster => 
  cluster.nodes.includes(nodeIds[0])
);

console.log(`\nExpected: React similarity cluster with node ${nodeIds[0]} should also contain ${nodeIds[1]} and ${nodeIds[2]}`);
console.log(`Found cluster: ${reactSimilarityCluster ? JSON.stringify(reactSimilarityCluster.nodes) : 'undefined'}`);
console.log(`Contains ${nodeIds[1]}: ${reactSimilarityCluster?.nodes.includes(nodeIds[1]) ? 'YES' : 'NO'}`);
console.log(`Contains ${nodeIds[2]}: ${reactSimilarityCluster?.nodes.includes(nodeIds[2]) ? 'YES' : 'NO'}`);

console.log('\n=== Summary of Issues ===');
console.log('1. Community detection is creating one cluster per node instead of grouping related nodes');
console.log('2. Similarity clustering is not recognizing content similarity between React-related nodes');
console.log('3. Coherence scores are too low (0.47 instead of >0.5)');  
console.log('4. Modularity scores are 0 instead of >0.3');
console.log('\n=== Root Causes ===');
console.log('1. Louvain algorithm may not be finding modularity improvements');
console.log('2. Similarity algorithm threshold may be too high (0.7)');
console.log('3. Content tokenization may not be extracting common tokens correctly');