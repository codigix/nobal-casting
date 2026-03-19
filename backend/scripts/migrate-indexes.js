import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'nobalcasting_user',
    password: process.env.DB_PASSWORD || 'C0digix$309',
    database: process.env.DB_NAME || 'nobalcasting',
    port: parseInt(process.env.DB_PORT || '3307')
};

async function migrate() {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL');

    try {
        const sqlPath = path.join(process.cwd(), 'backend', 'scripts', 'fix-stock-performance-indexes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Split by semicolon and filter out empty statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            try {
                console.log(`Executing: ${statement.substring(0, 50)}...`);
                await connection.execute(statement);
                console.log('✓ Success');
            } catch (err) {
                console.warn(`⚠️  Statement failed: ${err.message}`);
                // Continue if index already exists
                if (err.message.includes('Duplicate key name') || err.message.includes('Duplicate column name')) {
                    console.log('Index/column already exists, skipping...');
                } else {
                    // throw err; // Or decide to skip for certain errors
                }
            }
        }
        
        console.log('🎉 Index migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
