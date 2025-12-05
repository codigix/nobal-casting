import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addColumnsToUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log('Adding department, role, and phone columns to users table...');

    // Check if columns already exist
    const [columns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME IN ('department', 'role', 'phone')"
    );

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    // Add department column if it doesn't exist
    if (!existingColumns.includes('department')) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN department VARCHAR(100) DEFAULT 'buying' AFTER password"
      );
      console.log('✓ Added department column');
    } else {
      console.log('✓ department column already exists');
    }

    // Add role column if it doesn't exist
    if (!existingColumns.includes('role')) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'staff' AFTER department"
      );
      console.log('✓ Added role column');
    } else {
      console.log('✓ role column already exists');
    }

    // Add phone column if it doesn't exist
    if (!existingColumns.includes('phone')) {
      await connection.query(
        "ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER role"
      );
      console.log('✓ Added phone column');
    } else {
      console.log('✓ phone column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nUsers table schema:');
    const [schema] = await connection.query('DESCRIBE users');
    console.table(schema);

  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

addColumnsToUsers();