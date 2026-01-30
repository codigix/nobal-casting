
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function createPeriodClosingTable() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('Creating period_closing table...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS period_closing (
        closing_id VARCHAR(50) PRIMARY KEY,
        closing_date DATE NOT NULL,
        closed_by VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('period_closing table created successfully');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createPeriodClosingTable();
