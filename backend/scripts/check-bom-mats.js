import mysql from 'mysql2/promise';

async function checkBOMMaterials() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    const bomId = 'BOM-1773669839953';
    console.log(`Checking BOM Raw Materials for: ${bomId}`);
    
    const [mats] = await connection.execute(
      'SELECT * FROM bom_raw_material WHERE bom_id = ?',
      [bomId]
    );
    
    console.table(mats);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

checkBOMMaterials();
