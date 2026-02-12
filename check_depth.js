
const fs = require('fs');
const content = fs.readFileSync('frontend/src/pages/Production/ProductionEntry.jsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
let inString = false;
let stringChar = '';
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if ((char === '"' || char === "'" || char === '`') && line[j-1] !== '\\') {
            if (!inString) {
                inString = true;
                stringChar = char;
            } else if (stringChar === char) {
                inString = false;
            }
        }
        if (!inString) {
            if (char === '{') depth++;
            else if (char === '}') depth--;
        }
    }
    if (line.includes('return')) {
        console.log(`Line ${i + 1} depth: ${depth} | ${line.trim()}`);
    }
}
console.log('Final depth:', depth);
