# Implementation Summary: Material Request Approval & Stock Tracking

## Session Overview
Fixed material request approval workflow and verified stock balance/ledger updates when production items are issued.

## Issues Addressed

### Issue 1: Material Request Status Validation Error
**Error**: "Failed to approve material request: Only draft MRs can be approved"

**Root Cause**: When a GRN was created from a Material Request via "Send for Purchase," the MR status wasn't being updated to an intermediate state, preventing approval of pending MRs.

**Solution**:
1. **Database Migration**: Added `'pending'` status to `material_request.status` ENUM
   - File: `scripts/add-pending-mr-status.js`
   - Updated status values: `'draft'`, `'pending'`, `'approved'`, `'converted'`, `'cancelled'`

2. **GRN Creation Flow**: Updated `GRNRequestController.js`
   - When GRN created from MR → Sets MR status to `'pending'`
   - When GRN approved by inventory → Sets linked MR status to `'approved'`

3. **Approval Validation**: Updated `MaterialRequestModel.js`
   - Changed status validation to allow both `'draft'` and `'pending'` states
   - Line 201: `if (request.status !== 'draft' && request.status !== 'pending')`

**Files Modified**:
- `backend/src/controllers/GRNRequestController.js` (lines 87-146, 200-402)
- `backend/src/models/MaterialRequestModel.js` (line 201)
- `backend/scripts/add-pending-mr-status.js` (new)

### Issue 2: Warehouse Identifier Resolution in Stock Balance Lookup
**Problem**: When approving material requests, the system couldn't find stock balance because it was searching only by warehouse_code, but receiving warehouse_name.

**Solution**: Updated `StockBalanceModel.getByItemAndWarehouse()` to search by both warehouse_code AND warehouse_name
- File: `backend/src/models/StockBalanceModel.js` (line 78)
- Changed from: `w.warehouse_code = ?`
- Changed to: `(w.warehouse_code = ? OR w.warehouse_name = ?)`

## Stock Tracking Implementation

### Complete Material Issue Approval Workflow

```
1. User creates Material Request (purpose = 'material_issue', department = 'Production')
                           ↓
2. User selects source warehouse and clicks "Approve"
                           ↓
3. MaterialRequestController.approve() validates:
   - MR exists
   - Source warehouse provided
   - MR status is draft or pending
                           ↓
4. MaterialRequestModel.approve() executes:
   - For each item in the MR:
     a. Get current stock from warehouse
     b. Calculate quantity to deduct (requested qty or available, whichever is less)
     c. Update stock_balance (deduct from current_qty, recalculate available_qty)
     d. Create stock_ledger entry (transaction_type = 'Issue')
   - Update MR status to 'approved'
                           ↓
5. Results:
   - stock_balance.current_qty decreased
   - stock_balance.available_qty recalculated
   - stock_balance.last_issue_date set
   - stock_ledger entry created for audit trail
   - Material now available for production
```

### Stock Balance Table Updates
**File**: `src/models/MaterialRequestModel.js` (lines 250-255)

When a material_issue is approved:
```sql
UPDATE stock_balance SET
  current_qty = current_qty - qtyToDeduct,
  available_qty = current_qty - reserved_qty,
  valuation_rate = preserved_from_warehouse,
  total_value = current_qty * valuation_rate,
  last_issue_date = NOW(),
  updated_at = NOW()
WHERE item_code = ? AND warehouse_id = ?
```

### Stock Ledger Entry Creation
**File**: `src/models/StockLedgerModel.js` (lines 70-116)

Automatically created for each issued item:
```sql
INSERT INTO stock_ledger (
  item_code, warehouse_id, transaction_date, transaction_type,
  qty_in, qty_out, balance_qty, valuation_rate, transaction_value,
  reference_doctype, reference_name, remarks, created_by
) VALUES (
  'ITEM_CODE', warehouse_id, NOW(), 'Issue',
  0, issued_qty, running_balance, valuation_rate, issued_qty * valuation_rate,
  'Material Request', 'MR-123456', 'Approved Material Request MR-123456', user_id
)
```

## Verification

### Testing Checklist
- [x] Database schema verified (stock_balance, stock_ledger fields present)
- [x] Material request status ENUM updated to include 'pending'
- [x] GRN creation from MR sets status to 'pending'
- [x] GRN inventory approval sets status to 'approved'
- [x] Stock balance lookup works with warehouse_code OR warehouse_name
- [x] Stock balance updated on MR approval
- [x] Stock ledger entries created on MR approval
- [x] Warehouse field resolution fixed

### Verification Scripts
Created two test/debug scripts:
1. `test-stock-update-on-mr-approval.js` - Verifies database structure
2. `debug-mr-stock-updates.js` - Checks existing approved requests

Run with:
```bash
cd backend
node test-stock-update-on-mr-approval.js
node debug-mr-stock-updates.js
```

## Data Flow Diagram

```
Material Request Approval Request
           ↓
MaterialRequestController.approve()
           ↓
MaterialRequestModel.approve()
    ↙                    ↖
   YES                   NO (if not stock transaction)
   ↓                     ↓
For each item:      Status → approved
   ↓                     ↓
1. Get warehouse ID    (return)
2. Get current stock
3. Calculate deduct qty
4. StockBalanceModel.upsert()
   ├─ current_qty -= qty
   ├─ available_qty recalc
   └─ last_issue_date = NOW
5. StockLedgerModel.create()
   ├─ qty_out = deducted_qty
   ├─ balance_qty = running_balance
   └─ reference_name = MR_ID
   ↓
Status → approved
```

## Files Modified/Created

### Modified Files
1. `backend/src/controllers/GRNRequestController.js`
   - Lines 87-146: createGRNFromMaterialRequest - Sets MR status to pending
   - Lines 134-137: Updates material_request status when GRN created
   - Lines 278-283: Updates material_request status when GRN approved
   
2. `backend/src/models/MaterialRequestModel.js`
   - Line 201: Allow both draft and pending status in approval validation
   
3. `backend/src/models/StockBalanceModel.js`
   - Line 78: Search by warehouse_code OR warehouse_name

### Created Files
1. `backend/scripts/add-pending-mr-status.js` - Migration script for database schema
2. `backend/test-stock-update-on-mr-approval.js` - Verification test script
3. `backend/debug-mr-stock-updates.js` - Debug script for existing data

### Documentation
1. `STOCK_TRACKING_VERIFICATION.md` - Complete documentation of stock tracking
2. `IMPLEMENTATION_SUMMARY.md` - This file

## Key Implementation Details

### 1. Warehouse Resolution
The system accepts warehouse identifiers as:
- **Warehouse ID** (numeric, e.g., 1)
- **Warehouse Code** (string, e.g., "MW-001")
- **Warehouse Name** (string, e.g., "Main Warehouse")

Resolution order:
```javascript
if (is_numeric(identifier)) {
  use_warehouse_id = identifier
} else {
  query warehouses WHERE code = identifier OR name = identifier
  use_warehouse_id = result.id
}
```

### 2. Stock Deduction Logic
```javascript
qtyToDeduct = Math.min(
  requested_qty,
  Math.max(0, current_qty)  // Allows zero stock items
)
```

This allows approving even if there's insufficient stock (for future receipts).

### 3. Valuation Tracking
- Preserves valuation_rate from source warehouse
- Tracks transaction_value = qty_out × valuation_rate
- Enables accurate cost tracking and inventory valuation

## Status
✅ **Implementation Complete**

Material Request approval workflow now properly:
1. Validates status transitions (draft → pending → approved)
2. Updates stock_balance with accurate quantities
3. Creates audit entries in stock_ledger
4. Handles warehouse resolution correctly
5. Tracks costs through valuation_rate

## Next Steps (Optional Enhancements)
- [ ] Add batch processing for large material requests
- [ ] Implement stock reservations for allocated items
- [ ] Create management reports for stock movements
- [ ] Add alerts for low stock scenarios
- [ ] Implement ABC analysis for inventory management
