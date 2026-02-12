const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Production/ProductionEntry.jsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
let componentStarted = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('export default function ProductionEntry')) {
    componentStarted = true;
    console.log('Component started at line ' + (i + 1));
  }
  for (let char of line) {
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (componentStarted && depth === 0 && char === '}') {
      console.log('Depth hit 0 at line ' + (i + 1) + ': ' + line.trim());
    }
  }
}
console.log('Final depth: ' + depth);
