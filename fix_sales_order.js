const fs = require('fs');
const filePath = 'd:\\projects\\nobal-casting\\frontend\\src\\pages\\Selling\\SalesOrderForm.jsx';

let content = fs.readFileSync(filePath, 'utf-8');
content = content.replace('setBomFinishedGoods(bomLines)', 'setBomFinishedGoods(allItems)');
fs.writeFileSync(filePath, content, 'utf-8');

console.log('Replacement completed');
