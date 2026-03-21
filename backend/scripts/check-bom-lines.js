import mysql from 'mysql2/promise';

async function checkBOMLines() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const bomId = 'BOM-1773669839953';
    console.log(`Checking BOM Lines for: ${bomId}`);
    
    const [lines] = await connection.execute(
      'SELECT * FROM bom_line WHERE bom_id = ?',
      [bomId]
    );
    
    console.table(lines);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkBOMLines();
