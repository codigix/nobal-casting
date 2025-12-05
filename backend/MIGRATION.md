# Database Migration Guide

## Issue Fixed
The database schema uses inconsistent primary keys: the `item` table uses `item_code` as the primary key (VARCHAR), but the `stock_entry_items`, `stock_balance`, and `stock_ledger` tables were using numeric `item_id` columns that reference a non-existent `items` table.

This mismatch was causing "Unknown column 'id' in 'field list'" errors when creating stock entries.

## Solution
We've created a migration to update these tables to use `item_code` (VARCHAR) instead of `item_id` (INT), making them consistent with the actual `item` table schema.

## Migration Files
- `scripts/fix-item-code-schema.sql` - The actual SQL migration statements
- `scripts/run-migration.js` - Node.js script to run the migration programmatically

## How to Apply the Migration

### Option 1: Manual SQL Execution (Recommended)
Execute the migration file directly using MySQL CLI:

```bash
mysql -u root -p aluminium_erp < backend/scripts/fix-item-code-schema.sql
```

Or if MySQL is not in PATH:
```bash
C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe -u root -p aluminium_erp < backend/scripts/fix-item-code-schema.sql
```

### Option 2: Using MySQL Workbench or DBeaver
1. Open your database tool
2. Connect to the `aluminium_erp` database
3. Open the file: `backend/scripts/fix-item-code-schema.sql`
4. Execute all statements

### Option 3: Using Node.js Script
```bash
cd backend
npm install dotenv mysql2/promise
node scripts/run-migration.js
```

## What the Migration Does

1. **stock_entry_items table**
   - Adds `item_code` column (VARCHAR)
   - Migrates data from `item_id` to `item_code`
   - Removes `item_id` column
   - Updates foreign key constraint to reference `item(item_code)`
   - Updates indexes

2. **stock_balance table**
   - Adds `item_code` column (VARCHAR)
   - Migrates data from `item_id` to `item_code`
   - Removes `item_id` column  
   - Updates unique constraint from (item_id, warehouse_id) to (item_code, warehouse_id)
   - Updates foreign key constraint to reference `item(item_code)`
   - Updates indexes

3. **stock_ledger table**
   - Adds `item_code` column (VARCHAR)
   - Migrates data from `item_id` to `item_code`
   - Removes `item_id` column
   - Updates foreign key constraint to reference `item(item_code)`
   - Updates indexes

4. **Views**
   - Recreates `v_stock_balance_summary` view with correct joins
   - Recreates `v_stock_valuation_report` view with correct joins
   - Recreates `v_slow_moving_items` view with correct joins

## Testing After Migration

After applying the migration, test the stock entry creation:

1. Start the backend: `npm run dev`
2. Open the frontend
3. Go to Inventory > Stock Entries
4. Click "Manual Entry"
5. Select a GRN request from the dropdown
6. Submit the form

The stock entry should be created successfully without "Unknown column 'id'" errors.

## Rollback (if needed)

If something goes wrong, you can restore from a backup before the migration. The migration is designed to be safe:
- All data is preserved during migration
- Foreign key constraints are maintained
- Views are recreated with correct schema references

## Code Changes

The backend code has been updated to handle both old (item_id) and new (item_code) schemas gracefully:

- **StockEntryModel.js**: Try-catch blocks attempt item_code first, fall back to item_id
- **StockBalanceModel.js**: Updated queries to use item_code in JOINs
- **StockLedgerModel.js**: Updated to use item_code references

This ensures the application will work even if the migration hasn't been fully applied.

## Support

If you encounter any issues during migration:
1. Check that you're using the correct database credentials
2. Verify the `item` table exists and has data
3. Ensure no other processes are accessing the database during migration
4. Check database error logs for detailed error messages
