
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'nobalcasting'
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    console.log('Adding payment_terms and validity_date to supplier_quotation...');
    
    const [columns] = await connection.execute('SHOW COLUMNS FROM supplier_quotation');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('payment_terms')) {
      await connection.execute('ALTER TABLE supplier_quotation ADD COLUMN payment_terms TEXT');
      console.log('Added payment_terms');
    }

    if (!columnNames.includes('validity_date')) {
      await connection.execute('ALTER TABLE supplier_quotation ADD COLUMN validity_date DATE');
      console.log('Added validity_date');
    }

    if (!columnNames.includes('delivery_lead_time_days')) {
      await connection.execute('ALTER TABLE supplier_quotation ADD COLUMN delivery_lead_time_days INT');
      console.log('Added delivery_lead_time_days');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
