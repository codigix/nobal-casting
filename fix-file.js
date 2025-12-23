const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/Production/ProductionPlanningForm.jsx');

// Read the file as binary to preserve exact content
let content = fs.readFileSync(filePath, 'utf-8');

// Remove all non-ASCII characters (corrupted emoji, etc)
content = content.replace(/[^\x00-\x7F]/g, '');

// Fix any broken strings
content = content.replace(/Manual\s*<\/td>/g, 'Manual</td>');
content = content.replace(/From BOM\s*<\/td>/g, 'From BOM</td>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('File fixed!');
