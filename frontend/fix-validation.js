const fs = require('fs');
const filePath = './src/pages/Production/BOMForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace(/bomLines\.length === 0/, 'false');
content = content.replace('Please fill all required fields and add at least one component', 'Please fill all required fields');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated successfully');
