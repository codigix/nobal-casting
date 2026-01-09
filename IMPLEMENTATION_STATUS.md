# Material Request Approval Stock Tracking - Implementation Status

## Issue Identified
Stock Ledger entries were not being created when material requests were approved, even though stock was being deducted from `stock_balance`.

## Root Cause
- `MaterialRequestModel.approve()` receives `db` as a parameter
- `StockLedgerModel.create()` and `StockBalanceModel.upsert()` were using `global.db`
- These may not be the same database connection, causing ledger creation to fail silently

## Solution Applied

### 1. StockLedgerModel.js (Line 70)
```javascript
// BEFORE
static async create(data) {
  const db = this.getDb()

// AFTER
static async create(data, dbConnection = null) {
  const db = dbConnection || this.getDb()
```

### 2. StockBalanceModel.js (Line 96)
```javascript
// BEFORE
static async upsert(itemCode, warehouseId, data) {
  const db = this.getDb()

// AFTER
static async upsert(itemCode, warehouseId, data, dbConnection = null) {
  const db = dbConnection || this.getDb()
```

### 3. MaterialRequestModel.js - Updated all calls to pass `db`

**Line 255** - Upsert stock balance:
```javascript
await StockBalanceModel.upsert(..., db)
```

**Line 270** - Create ledger entry (OUT):
```javascript
await StockLedgerModel.create({...}, db)
```

**Line 282** - Upsert target warehouse stock:
```javascript
await StockBalanceModel.upsert(..., db)
```

**Line 297** - Create ledger entry (IN) for transfers:
```javascript
await StockLedgerModel.create({...}, db)
```

## Complete Material Request Approval Flow

```
1. User approves Material Request
   ↓
2. ViewMaterialRequestModal.jsx calls:
   PATCH /material-requests/{mrId}/approve
   ↓
3. MaterialRequestController.approve() receives request
   ↓
4. MaterialRequestModel.approve(db, mrId, approvedBy, source_warehouse)
   ↓
5. For each item in Material Request:
   a. Get stock balance from warehouse
   b. Calculate qty to deduct
   ↓
6. StockBalanceModel.upsert(..., db)
   - Updates current_qty
   - Recalculates available_qty
   - Sets last_issue_date
   ↓
7. StockLedgerModel.create({...}, db)
   - Creates transaction record
   - Calculates balance_qty
   - Stores transaction_value & valuation_rate
   ↓
8. Updates Material Request status to 'approved'
   ↓
9. Dispatches 'materialRequestApproved' event
   ↓
10. Frontend pages refresh:
    - StockBalance.jsx listens & refreshes tables
    - StockLedger.jsx listens & refreshes tables
```

## Tables Updated When MR Approved

### stock_balance
- `current_qty` → Decremented by issued quantity
- `available_qty` → Recalculated (current_qty - reserved_qty)
- `last_issue_date` → Set to current timestamp
- `total_value` → Recalculated (current_qty × valuation_rate)
- `updated_at` → Set to current timestamp

### stock_ledger
- `transaction_type` → 'Issue' (for material_issue) or 'Transfer'
- `qty_in` → 0 (for issue/transfer out)
- `qty_out` → Quantity deducted from warehouse
- `balance_qty` → Running balance (calculated from previous entry)
- `valuation_rate` → Cost per unit from warehouse
- `transaction_value` → qty_out × valuation_rate
- `reference_name` → Material Request ID (for traceability)
- `reference_doctype` → 'Material Request'

## Test Results

### Before Fix
```
Stock Ledger Entries for Material Requests: 0
Total Entries: 0
```

### After Fix (pending - requires server restart)
Expected: Stock ledger entries will be created with proper:
- qty_in/qty_out quantities
- balance (running inventory balance)
- rates (valuation_rate per unit)
- values (transaction_value = qty × rate)

## Testing Instructions

1. **Restart Backend Server**
   ```bash
   # Stop existing server (Ctrl+C)
   # Restart
   cd backend
   npm start
   ```

2. **Create or Reuse Material Request**
   - Navigate to `/inventory/material-requests`
   - Create a new MR with purpose "material_issue"
   - OR select existing production request

3. **Approve Material Request**
   - Select source warehouse
   - Click "Approve"
   - System will:
     - Deduct from stock_balance
     - Create stock_ledger entries
     - Dispatch refresh event

4. **Verify Stock Updates**
   - Navigate to `/inventory/stock-balance`
   - Should show:
     - Updated current_qty
     - Updated available_qty
     - Last Issue Date = current date
   
   - Navigate to `/inventory/stock-ledger`
   - Should show:
     - New entries with transaction_type = 'Issue'
     - qty_out = quantity deducted
     - balance_qty = running balance
     - valuation_rate & transaction_value filled

## Files Modified

1. `backend/src/models/StockLedgerModel.js` - Added dbConnection parameter
2. `backend/src/models/StockBalanceModel.js` - Added dbConnection parameter  
3. `backend/src/models/MaterialRequestModel.js` - Pass db to model methods
4. `frontend/src/pages/Inventory/StockBalance.jsx` - Added event listener & refresh logic
5. `frontend/src/pages/Inventory/StockLedger.jsx` - Fixed field mappings & added event listener

## Next Steps

After restarting the server:
- Test new Material Request approvals
- Verify stock_ledger entries are created
- Confirm Stock Balance page refreshes automatically
- Confirm Stock Ledger page shows new entries with correct calculations
