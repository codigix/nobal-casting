const fs = require('fs');
const path = 'd:/projects/nobal-casting/frontend/src/pages/Production/ProductionPlanningForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the problematic onClick handler
content = content.replace(
  `onClick={() => navigate('/manufacturing/production-planning')}`,
  `onClick={() => navigate("\/manufacturing\/production-planning")}`
);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed slashes');
