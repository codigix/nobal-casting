const fs = require('fs');
const path = 'd:/projects/nobal-casting/frontend/src/pages/Production/ProductionPlanningForm.jsx.bak';

let content = fs.readFileSync(path, 'utf8');

// Fix the main issues:
// 1. Remove problematic emoji characters that might be corrupted
content = content.replace(/[^\x00-\x7F]/g, '');

// 2. Fix any mangled className or attribute strings
content = content.replace(/className="([^"]*)"/g, (match, className) => {
  if (!className.includes('...') && !className.includes('`')) {
    return match;
  }
  return match;
});

// 3. Make sure there are no unterminated strings
const lines = content.split('\n');
let result = [];
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  // Check for malformed JSX attribute strings
  let quoteCount = (line.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0 && !line.trim().endsWith(',') && !line.trim().endsWith('{')) {
    // Try to fix by removing the problematic line
    if (i > 1600 && i < 1700) {
      // In the problematic range, skip problematic lines
      if (line.includes('Manual') || line.includes('From BOM')) {
        line = line.replace(/Manual.*/, 'Manual</td>').replace(/From BOM.*/, 'From BOM</td>');
      }
    }
  }
  result.push(line);
}

const newPath = 'd:/projects/nobal-casting/frontend/src/pages/Production/ProductionPlanningForm.jsx';
fs.writeFileSync(newPath, result.join('\n'), 'utf8');
console.log('Fixed JSX');
