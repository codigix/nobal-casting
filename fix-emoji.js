const fs = require('fs');
const path = 'd:/projects/nobal-casting/frontend/src/pages/Production/ProductionPlanningForm.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/✏️/g, '[edit]').replace(/📦/g, '[package]');
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed emoji encoding');
