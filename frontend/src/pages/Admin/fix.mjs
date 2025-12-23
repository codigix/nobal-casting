import fs from 'fs';

let content = fs.readFileSync('MachineAnalysis.jsx', 'utf8');

content = content.replace(
  '    Promise.all([fetchMachinesAnalysis(), fetchWorkstations()])',
  '    fetchMachinesAnalysis().finally(() => setLoading(false))'
);

fs.writeFileSync('MachineAnalysis.jsx', content);
console.log('File updated - removed fetchWorkstations call');
