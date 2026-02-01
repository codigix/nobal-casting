
import http from 'http';

http.get('http://localhost:5001/api/items', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    const item = json.data.find(i => i.item_code === 'R-ANGLESECTION');
    console.log(JSON.stringify(item, null, 2));
  });
}).on('error', (err) => {
  console.error('Error: ' + err.message);
});
