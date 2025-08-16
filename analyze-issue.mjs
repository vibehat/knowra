// Analysis of clustering issues

console.log('=== Analysis of Clustering Test Failures ===\n');

console.log('ISSUE 1: Community Detection Not Grouping Nodes');
console.log('Expected: React cluster with nodes A, B, C');
console.log('Expected: Backend cluster with nodes D, E, F');
console.log('Expected: Testing cluster with node G');
console.log('Actual: Each node in its own cluster');
console.log('\nPossible causes:');
console.log('- Louvain algorithm modularity calculation incorrect');
console.log('- Edge weights not being considered properly');
console.log('- Community merging logic not finding improvements');
console.log('- Initial communities (each node separate) not being optimized');

console.log('\n' + '='.repeat(50));

console.log('\nISSUE 2: Similarity Clustering Not Working');
console.log('Expected: React nodes grouped by similar content (React, components, hooks)');
console.log('Expected: Backend nodes grouped by similar content (Node.js, server, Express)');
console.log('Actual: Each node in separate cluster');
console.log('\nPossible causes:');
console.log('- Similarity threshold too high (0.7)');
console.log('- Tokenization not extracting common words correctly');
console.log('- Jaccard similarity calculation issues');
console.log('- Content similarity weights not configured properly');

console.log('\n' + '='.repeat(50));

console.log('\nISSUE 3: Low Coherence Scores (0.47 < 0.5)');
console.log('Expected: >0.5 for tight clusters');
console.log('Actual: 0.47');
console.log('\nPossible causes:');
console.log('- Coherence = internal_weight / total_weight calculation');
console.log('- If nodes are in separate clusters, internal_weight = 0');
console.log('- Need to fix clustering first to get proper coherence');

console.log('\n' + '='.repeat(50));

console.log('\nISSUE 4: Zero Modularity Scores');
console.log('Expected: >0.3 for good community structure');
console.log('Actual: 0');
console.log('\nPossible causes:');
console.log('- Modularity = (internal - expected) / total_weight');
console.log('- If no internal connections (separate clusters), modularity = 0');
console.log('- Need community detection to work first');

console.log('\n' + '='.repeat(50));

console.log('\nTEST GRAPH STRUCTURE:');
console.log('Nodes:');
console.log('  A: "React components and state management" [react]');
console.log('  B: "React hooks and lifecycle" [react]');
console.log('  C: "React routing with components" [react]');
console.log('  D: "Node.js server architecture" [backend]');
console.log('  E: "Express.js middleware patterns" [backend]');
console.log('  F: "Node.js database connections" [backend]');
console.log('  G: "Isolated topic about testing" [testing]');

console.log('\nEdges:');
console.log('  A -> B (strength: 0.9) [related_to]');
console.log('  B -> C (strength: 0.9) [related_to]');
console.log('  A -> C (strength: 0.8) [similar_to]');
console.log('  D -> E (strength: 0.9) [related_to]');
console.log('  E -> F (strength: 0.9) [related_to]');
console.log('  D -> F (strength: 0.8) [similar_to]');
console.log('  C -> D (strength: 0.3) [connects_to] (bridge)');
console.log('  G: (isolated)');

console.log('\nExpected Communities:');
console.log('  Community 1: [A, B, C] - React cluster');
console.log('  Community 2: [D, E, F] - Backend cluster');
console.log('  Community 3: [G] - Isolated node');

console.log('\nExpected Similarities:');
console.log('  A-B: High (React, components)');
console.log('  B-C: High (React, components)');
console.log('  A-C: High (React, components)');
console.log('  D-E: High (Node.js, server)');
console.log('  E-F: Medium (Express, Node.js)');
console.log('  D-F: Medium (Node.js, server)');

console.log('\n' + '='.repeat(50));

console.log('\nFIX PRIORITIES:');
console.log('1. DEBUG similarity calculation with test content');
console.log('   - Check if "React" appears in tokenization');
console.log('   - Check Jaccard similarity for A-B pair');
console.log('   - Verify threshold not too restrictive');

console.log('2. DEBUG Louvain community detection');
console.log('   - Check if edges are being processed correctly');
console.log('   - Verify modularity gain calculation');
console.log('   - Check if optimization loop runs');

console.log('3. ADJUST parameters');
console.log('   - Lower similarity threshold from 0.7 to 0.3');
console.log('   - Check Louvain resolution parameter');
console.log('   - Verify weight calculations');

console.log('\n' + '='.repeat(50));

// Simulate tokenization
console.log('\nTOKENIZATION SIMULATION:');

function mockTokenize(content) {
  return content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2)
    .filter(token => !['the', 'and', 'with', 'for'].includes(token));
}

const contents = [
  'React components and state management',
  'React hooks and lifecycle', 
  'React routing with components',
  'Node.js server architecture',
  'Express.js middleware patterns',
  'Node.js database connections'
];

contents.forEach((content, i) => {
  const tokens = mockTokenize(content);
  console.log(`  ${String.fromCharCode(65 + i)}: ${JSON.stringify(tokens)}`);
});

// Calculate similarity
function jaccardSim(setA, setB) {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

const tokenSets = contents.map(content => new Set(mockTokenize(content)));

console.log('\nSIMILARITY MATRIX:');
for (let i = 0; i < tokenSets.length; i++) {
  for (let j = i + 1; j < tokenSets.length; j++) {
    const sim = jaccardSim(tokenSets[i], tokenSets[j]);
    const label1 = String.fromCharCode(65 + i);
    const label2 = String.fromCharCode(65 + j);
    console.log(`  ${label1}-${label2}: ${sim.toFixed(3)} ${sim >= 0.7 ? '✓' : '✗'}`);
  }
}

console.log('\nConclusion: If similarities are below 0.7 threshold, that explains the issue!');