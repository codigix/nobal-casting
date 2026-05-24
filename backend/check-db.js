import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'nobalcasting_user',
    password: 'C0digix$309',
    database: 'nobalcasting',
    port: 3307
  });

  try {
    console.log('Checking recent stock entries:');
    const [entries] = await connection.execute(
      'SELECT id, entry_no, entry_type, status, created_at FROM stock_entries ORDER BY created_at DESC LIMIT 10'
    );
    console.table(entries);

    console.log('\nChecking items for the most recent entry:');
    if (entries.length > 0) {
      const [items] = await connection.execute(
        'SELECT * FROM stock_entry_items WHERE stock_entry_id = ?',
        [entries[0].id]
      );
      console.table(items);
    }
    
    console.log('\nChecking stock ledger for RM-BLADECAP:');
    const [ledger] = await connection.execute(
      'SELECT * FROM stock_ledger WHERE item_code = "RM-BLADECAP" ORDER BY created_at DESC'
    );
    console.table(ledger);

  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

check();
