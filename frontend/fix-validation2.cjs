const fs = require('fs');
const filePath = './src/pages/Production/BOMForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('if (!formData.item_code || !formData.quantity || false)', 'if (!formData.item_code || !formData.quantity)');
fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated successfully');
