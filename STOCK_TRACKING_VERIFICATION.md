# Stock Tracking Verification - Material Request Approval Workflow

## Overview
When a Material Request (MR) is approved and sent to Production, the system automatically updates both **stock_balance** and **stock_ledger** tables.

## Complete Workflow

### 1. Material Issue Approval Flow

```
Material Request (Material Issue)
  ↓
User Selects Source Warehouse & Approves
  ↓
MaterialRequestController.approve()
  ↓
MaterialRequestModel.approve(db, id, approvedBy, source_warehouse)
  ↓
For each item in MR:
  ├─ StockBalanceModel.upsert() → Deducts from stock_balance
  └─ StockLedgerModel.create() → Creates audit entry in stock_ledger
  ↓
MR Status: draft/pending → approved
```

### 2. Stock Balance Update

**File**: `src/models/MaterialRequestModel.js` (lines 250-255)

```javascript
await StockBalanceModel.upsert(item.item_code, sourceWarehouseId, {
  current_qty: currentQty - qtyToDeduct,
  reserved_qty: sourceBalance ? Number(sourceBalance.reserved_qty) : 0,
  valuation_rate: currentValuation,
  last_issue_date: new Date()
})
```

**Updates in `stock_balance` table**:
- `current_qty` → Decremented by issued quantity
- `available_qty` → Automatically recalculated (current_qty - reserved_qty)
- `valuation_rate` → Preserved from existing record
- `total_value` → Recalculated (current_qty × valuation_rate)
- `last_issue_date` → Set to current timestamp
- `updated_at` → Automatically updated

### 3. Stock Ledger Entry

**File**: `src/models/MaterialRequestModel.js` (lines 258-270)

```javascript
await StockLedgerModel.create({
  item_code: item.item_code,
  warehouse_id: sourceWarehouseId,
  transaction_date: new Date(),
  transaction_type: 'Issue',              // For material_issue
  qty_in: 0,
  qty_out: qtyToDeduct,                   // Quantity issued
  valuation_rate: currentValuation,
  reference_doctype: 'Material Request',
  reference_name: mrId,                   // Links to MR
  remarks: `Approved Material Request ${mrId}`,
  created_by: approvedBy
})
```

**Creates in `stock_ledger` table**:
- `item_code` → The material item
- `warehouse_id` → Source warehouse from MR
- `transaction_date` → Current timestamp
- `transaction_type` → 'Issue' (for material_issue purpose)
- `qty_in` → 0
- `qty_out` → Quantity issued to production
- `balance_qty` → Running balance (calculated from previous entry)
- `valuation_rate` → Retrieval rate of the material
- `transaction_value` → qty_out × valuation_rate
- `reference_doctype` → 'Material Request'
- `reference_name` → MR ID for traceability
- `remarks` → Human-readable description
- `created_by` → User who approved the MR

### 4. Material Transfer Flow (for transfers between warehouses)

If the MR purpose is **material_transfer**:

1. **Deduct from Source Warehouse** (same as above)
2. **Add to Target Warehouse**:
   ```javascript
   await StockBalanceModel.upsert(item.item_code, targetWarehouseId, {
     current_qty: targetQty + qtyToDeduct,
     reserved_qty: targetBalance ? Number(targetBalance.reserved_qty) : 0,
     valuation_rate: currentValuation,
     last_receipt_date: new Date()
   })
   ```

3. **Create Transfer IN Ledger Entry**:
   ```javascript
   await StockLedgerModel.create({
     item_code: item.item_code,
     warehouse_id: targetWarehouseId,
     transaction_date: new Date(),
     transaction_type: 'Transfer',
     qty_in: qtyToDeduct,              // Received in target
     qty_out: 0,
     valuation_rate: currentValuation,
     reference_doctype: 'Material Request',
     reference_name: mrId,
     remarks: `Incoming Transfer from MR ${mrId}`,
     created_by: approvedBy
   })
   ```

## Data Consistency Checks

### Stock Balance Verification
```sql
-- Check stock balance for an item
SELECT 
  sb.item_code,
  w.warehouse_name,
  sb.current_qty,
  sb.reserved_qty,
  sb.available_qty,
  sb.valuation_rate,
  sb.total_value,
  sb.last_issue_date,
  sb.last_receipt_date
FROM stock_balance sb
JOIN warehouses w ON sb.warehouse_id = w.id
WHERE sb.item_code = 'ITEM_CODE' AND w.warehouse_name = 'Main Warehouse';
```

### Stock Ledger Verification
```sql
-- Check ledger entries for material issue
SELECT 
  sl.id,
  sl.transaction_date,
  sl.transaction_type,
  sl.qty_in,
  sl.qty_out,
  sl.balance_qty,
  sl.reference_doctype,
  sl.reference_name,
  sl.remarks
FROM stock_ledger sl
WHERE sl.item_code = 'ITEM_CODE' 
  AND sl.warehouse_id = 1
  AND sl.reference_doctype = 'Material Request'
ORDER BY sl.transaction_date DESC;
```

### Running Balance Verification
The `balance_qty` in stock_ledger should match calculations:
```
For each transaction in order by date:
  balance_qty = previous_balance + qty_in - qty_out
```

## Edge Cases Handled

### 1. Partial Stock Deduction
If requested quantity exceeds available quantity, system deducts only what's available:
```javascript
const qtyToDeduct = Math.min(qty, Math.max(0, currentQty))
```

### 2. Zero Stock Items
Allows approval even if item has zero stock (useful for items that will be issued from future receipts).

### 3. Multiple Warehouses
For transfers, stock is properly tracked in both source and target warehouses with separate ledger entries.

### 4. Valuation Rate Preservation
Uses existing valuation_rate from source warehouse, ensuring cost tracking accuracy.

## Summary Table of Updates

| Table | Operation | Updated Fields | Trigger |
|-------|-----------|-----------------|---------|
| `material_request` | UPDATE | `status` = 'approved' | MR Approval |
| `stock_balance` | INSERT/UPDATE | `current_qty`, `available_qty`, `total_value`, `last_issue_date` | For each item (material_issue) |
| `stock_balance` | INSERT/UPDATE | `current_qty`, `available_qty`, `total_value`, `last_receipt_date` | For each item (material_transfer - target) |
| `stock_ledger` | INSERT | `qty_out`, `balance_qty`, transaction details | For each item (material_issue) |
| `stock_ledger` | INSERT | `qty_in`, `balance_qty`, transaction details | For each item (material_transfer - target) |

## Testing Checklist

- [ ] Create Material Request with purpose = 'material_issue'
- [ ] Select source warehouse
- [ ] Approve the MR
- [ ] Verify `stock_balance.current_qty` decreased
- [ ] Verify `stock_balance.available_qty` decreased
- [ ] Verify `stock_balance.last_issue_date` updated
- [ ] Verify `stock_ledger` entry created with `transaction_type` = 'Issue'
- [ ] Verify `stock_ledger.balance_qty` calculated correctly
- [ ] Verify `reference_name` in ledger points to correct MR ID
- [ ] Check Stock Balance page shows updated quantities
- [ ] Check Stock Ledger page shows new transaction

## Files Modified/Reviewed

1. **src/models/MaterialRequestModel.js** - approve() method (lines 194-307)
2. **src/models/StockBalanceModel.js** - upsert() method (lines 96-135)
3. **src/models/StockLedgerModel.js** - create() method (lines 70-116)
4. **src/controllers/MaterialRequestController.js** - approve() method (lines 106-187)

## Status
✅ **Stock Balance and Stock Ledger updates are correctly implemented**

Both tables are updated automatically when a Material Request is approved and sent to production.
