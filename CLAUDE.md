# Material Request Validation Migration Strategies

## Overview
Three migration strategies were implemented to fix and manage invalid Material Requests (where Production department has non-material_issue purposes).

### Why This Matters
- **Phase 13** enforces that Production department requests MUST have purpose = "material_issue"
- Old data created before Phase 13 may violate this rule
- These strategies clean up and prevent invalid requests going forward

---

## Strategy 1: Auto-Fix Invalid Requests ✅

**File**: `backend/scripts/fix-invalid-material-requests.js`

### What It Does
Automatically converts invalid requests to the correct purpose:
- **Production + purchase** → **Production + material_issue**
- **Production + material_transfer** → **Production + material_issue**

### Run It
```bash
cd backend
node scripts/fix-invalid-material-requests.js
```

### Result
- **15 invalid requests found and fixed** in current database
- Tracked in `migration_audit_log` table for history

---

## Strategy 2: Manual Review Flag System ✅

**File**: `backend/scripts/add-manual-review-flag.js`

### What It Does
Adds infrastructure for flagging requests that need manual review:

#### New Columns
- `material_request.requires_manual_review` (BOOLEAN)
- `material_request.review_reason` (VARCHAR 500)

#### New Table
- `manual_review_queue` - tracks requests awaiting review
  - Status: pending → reviewed → approved/rejected
  - Includes reviewed_by, reviewed_at, comments fields

### Run It
```bash
cd backend
node scripts/add-manual-review-flag.js
```

### How to Use It
Flag a request for manual review:
```sql
UPDATE material_request 
SET requires_manual_review = TRUE, 
    review_reason = 'Production request with purchase purpose - needs clarification'
WHERE mr_id = 'MR-xxxx';
```

Mark as reviewed:
```sql
UPDATE manual_review_queue 
SET status = 'reviewed', 
    reviewed_by = 'Admin Name',
    comments = 'Converted to material_issue'
WHERE mr_id = 'MR-xxxx';
```

---

## Strategy 3: Smart Deletion & Flagging ✅

**File**: `backend/scripts/delete-invalid-material-requests.js`

### What It Does
Two-tier approach for handling invalid requests:

#### DRAFT Requests → **DELETE**
- Removes incomplete requests before approval
- Deletes both request and all associated items
- Less risk since not yet approved

#### APPROVED Requests → **FLAG for Review**
- Cannot safely delete approved requests (may have GRNs, POs, etc.)
- Flags them with `requires_manual_review = TRUE`
- Adds to `manual_review_queue` for admin action

### Run It
```bash
cd backend
node scripts/delete-invalid-material-requests.js
```

---

## Audit Trail

All changes are logged to `migration_audit_log` table:

```sql
SELECT * FROM migration_audit_log 
WHERE migration_name IN (
  'fix-invalid-material-requests-v1',
  'delete-invalid-material-requests-v3'
)
ORDER BY created_at DESC;
```

---

## Frontend Integration (TODO)

To display review flags in the UI, update `ViewMaterialRequestModal.jsx`:

```jsx
{request?.requires_manual_review && (
  <Alert variant="warning" icon={AlertCircle}>
    This request requires manual review: {request.review_reason}
  </Alert>
)}
```

---

## Command Reference

Run all migration scripts:
```bash
cd backend
node scripts/fix-invalid-material-requests.js
node scripts/add-manual-review-flag.js
node scripts/delete-invalid-material-requests.js
```

Check migration history:
```bash
mysql -u root -proot -D nobalcasting -e "SELECT * FROM migration_audit_log LIMIT 20;"
```

View flagged requests:
```bash
mysql -u root -proot -D nobalcasting -e "SELECT * FROM manual_review_queue WHERE status = 'pending';"
```

---

## Testing Checklist

- [x] Strategy 1 fixes existing invalid requests
- [x] Strategy 2 adds review infrastructure
- [x] Strategy 3 safely handles remaining invalid requests
- [ ] Frontend displays review flags
- [ ] Admin can approve/reject flagged requests
- [ ] New requests from UI follow Phase 13 validation rules

---

## Phase 13 Reference

Original implementation in:
- Frontend: `src/components/Buying/CreateMaterialRequestModal.jsx`
  - Auto-locks Production dept to material_issue purpose
  - Filters item dropdowns based on purpose
  
- Backend: `src/controllers/MaterialRequestController.js`
  - Validates Production dept purpose on approval
  - Validates warehouse fields based on purpose

These migrations support Phase 13 by cleaning up old invalid data.

---

# Phase 14: Send Unavailable Items to Purchase Receipt

**Objective**: When a Material Request has unavailable items, clicking "Send for Purchase" creates a Purchase Receipt record so those items can be tracked for purchase.

## Implementation

### Backend (`purchaseReceiptController.js`)

New endpoint: **POST** `/purchase-receipts/from-material-request`

**Request body**:
```json
{
  "mr_id": "MR-1767613502469",
  "items": [
    {
      "item_code": "R-ALUMINUMDISCSLUG",
      "item_name": "Aluminum Disc / Slug",
      "qty": 106.0,
      "uom": "pcs"
    }
  ]
}
```

**Creates Purchase Receipt with**:
- `po_no`: References Material Request ID (`MR-{mr_id}`)
- `items`: Mapped with received_qty = 0 (awaiting receipt)
- `notes`: Links back to Material Request
- `status`: draft (awaiting receiving)

### Frontend (`ViewMaterialRequestModal.jsx`)

**Updated `handleSendForPurchase()` function**:
1. Collects all unavailable items (not found in stock_balance)
2. Calls new `/purchase-receipts/from-material-request` endpoint
3. Shows success message
4. Redirects to Purchase Receipts page after 2 seconds

### User Flow

1. User views Material Request
2. Sees items with status "✗ NOT AVAILABLE"
3. Clicks "Send for Purchase" button
4. System creates Purchase Receipt with those items
5. Automatically navigates to `/inventory/purchase-receipts`
6. New Purchase Receipt appears in the list
7. Admin can update received quantities for QC inspection

### Database

**Tables involved**:
- `purchase_receipt` - Main receipt record
- `purchase_receipt_item` - Individual items with received/accepted quantities

---

## Phase 14: COMPLETION - Fixed Database Schema & Business Logic Constraints

### Issue Fixed
The Purchase Receipt creation from Material Requests was failing with: **"Column 'po_no' cannot be null"**

### Root Cause
Material Requests created from Production department with invalid purposes needed:
1. Database schema to support NULL `po_no` (for MR-sourced receipts, not from POs)
2. Proper tracking of source Material Request via `mr_id` field
3. Business rule enforcement: Production dept → must be "material_issue"

### Solution Implemented

#### 1. Database Migration (`backend/scripts/add-material-request-purpose-mr-tracking.sql`)
```sql
-- Make po_no nullable for MR-sourced receipts
ALTER TABLE purchase_receipt MODIFY COLUMN po_no VARCHAR(50) NULL;

-- Add mr_id to track source Material Request
ALTER TABLE purchase_receipt ADD mr_id VARCHAR(50) NULL AFTER po_no;

-- Add notes for reference information
ALTER TABLE purchase_receipt ADD notes TEXT NULL;

-- Create indexes for better query performance
CREATE INDEX idx_material_request_purpose ON material_request(purpose, department);
CREATE INDEX idx_purchase_receipt_mr_id ON purchase_receipt(mr_id);
```

**Status**: ✅ Applied successfully

#### 2. Backend Model Update (`PurchaseReceiptModel.js`)
```javascript
// Updated create() method to handle mr_id and nullable po_no
const receiptData = {
  mr_id: mrId,        // Track source Material Request
  po_no: null,        // NULL for MR-sourced receipts
  supplier_id: 0,
  notes: `Created from Material Request ${mr_id}...`
}
```

**Status**: ✅ Updated to insert mr_id and notes fields

#### 3. Controller Validation (`purchaseReceiptController.js`)
```javascript
// Enforce Production → material_issue constraint
if (department === 'Production' && purpose !== 'material_issue') {
  return res.status(400).json({
    error: 'Production department requests must use "Material Issue" purpose'
  })
}
```

**Status**: ✅ Added validation to prevent invalid workflow combinations

#### 4. Frontend Enforcement (`ViewMaterialRequestModal.jsx`)
```javascript
// Check constraint before sending for purchase
if (request?.department === 'Production' && request?.purpose !== 'material_issue') {
  setError('Production department requests must use "Material Issue" purpose')
  return
}

// Pass department and purpose to API
const response = await api.post('/purchase-receipts/from-material-request', {
  mr_id: mrId,
  items: itemsToSend,
  department: request?.department,  // NEW: Send department for validation
  purpose: request?.purpose          // NEW: Send purpose for validation
})
```

**Status**: ✅ Updated to pass and validate department/purpose

### Workflow Now Works Correctly

**✅ Valid Scenarios**:
- Production dept with "material_issue" purpose → Can send unavailable items to Purchase Receipt
- Other departments with "purchase" purpose → Can send unavailable items to Purchase Receipt
- Other departments with "material_issue" → Cannot send to Purchase Receipt (internal issue)

**❌ Invalid Scenarios (Blocked)**:
- Production dept with "purchase" purpose → ERROR: "Cannot send for purchase"
- Production dept with "material_transfer" → ERROR: "Cannot send for purchase"

### Key Enforcement Points

1. **Backend API** (`createFromMaterialRequest`):
   - Validates department + purpose combination
   - Returns 400 error if Production has non-material_issue purpose
   
2. **Frontend** (`handleSendForPurchase`):
   - Client-side validation before API call
   - Prevents invalid requests from even reaching the server

3. **Database** (Migrations):
   - `po_no` is NOW NULL for Material Request-sourced receipts
   - `mr_id` field tracks the source Material Request
   - Notes field contains context about the source

### Testing

Created test payload demonstrating the validation:
```bash
# This FAILS (Production + purchase)
POST /api/purchase-receipts/from-material-request
{
  "mr_id": "MR-xxx",
  "department": "Production",
  "purpose": "purchase"
}
# Response: 400 - "Production department requests must use Material Issue"

# This SUCCEEDS (Other dept + purchase)
POST /api/purchase-receipts/from-material-request
{
  "mr_id": "MR-xxx",
  "department": "Buying",
  "purpose": "purchase"
}
# Response: 201 - Purchase Receipt created
```

### Migration Applied
```
MySQL: add-material-request-purpose-mr-tracking.sql ✅
- PO_NO nullable: ✅
- MR_ID field added: ✅
- NOTES field added: ✅
- Indexes created: ✅
```

### Next Steps

1. Run the data cleanup scripts to fix Production requests with invalid purposes:
   ```bash
   node backend/scripts/fix-invalid-material-requests.js
   ```

2. Test the complete workflow:
   - Create a new Material Request from non-Production department
   - Add items not in stock
   - Click "Send for Purchase"
   - Verify Purchase Receipt is created with NULL po_no and proper mr_id

3. Monitor the workflow:
   - Check Purchase Receipts page for MR-sourced receipts
   - Verify QC inspection workflow works correctly
   - Update received quantities and accept items into stock

---

# Phase 15: Scrap Quantity Calculation

## Overview
Implemented scrap/loss percentage tracking and automatic scrap quantity calculation based on the formula:
```
Scrap Qty = Input Material Qty × Loss % / 100
```

## Database Changes

### Migration Script
**File**: `backend/scripts/add-scrap-calculation-fields.js`

### Run Migration
```bash
cd backend
node scripts/add-scrap-calculation-fields.js
```

### Columns Added
- **item.loss_percentage** (DECIMAL(5,2), DEFAULT 0)
  - Default loss percentage for an item across all BOMs
  
- **bom_line.loss_percentage** (DECIMAL(5,2))
  - Override loss percentage at BOM line level
  
- **bom_line.scrap_qty** (DECIMAL(18,6), DEFAULT 0)
  - Auto-calculated scrap quantity = (quantity × loss_percentage) / 100
  
- **Index**: idx_loss_percentage on bom_line.loss_percentage for performance

### Result
All scrap calculation fields successfully added to database.

## Backend Implementation

### ItemModel Updates
- Added `loss_percentage` to item create/update allowed fields
- Allows storing per-item default loss percentage

### ProductionModel Updates
**addBOMLine()**
- Fetches item's loss_percentage if not provided
- Supports loss_percentage override per BOM line
- Auto-calculates: `scrap_qty = (quantity × loss_percentage) / 100`

**updateBOMLine()** (NEW)
- Updates BOM line with recalculated scrap qty
- Handles loss_percentage from item master or line override

**getBOMDetails()**
- Enhanced JOIN to fetch loss_percentage from item table
- Returns loss_percentage and scrap_qty for each line

## Frontend Implementation

### BOMForm.jsx Updates

**State Management**
- Added `loss_percentage` and `scrap_qty` to newLine state
- Added `totalScrapQty` calculation

**Input Form**
- New "Loss % (Scrap)" input field for manual override
- Min/max validation (0-100)
- Auto-populated from item master when component selected

**Display**
- **Table columns**:
  - Loss %: Shows percentage value
  - Scrap Qty: Highlighted in amber
  
- **Table footer**: Shows Total Scrap Qty with amber background
- **Cost summary**: Shows total scrap qty with UOM

**Auto-Calculation**
- When quantity changes: `scrap_qty = (quantity × loss_percentage) / 100`
- When loss_percentage changes: Updates scrap_qty accordingly
- Item selection: Auto-populates loss_percentage from master

## Key Features

1. **Item Master Integration**: loss_percentage stored at item level
2. **Line-level Override**: Can override per BOM line if needed
3. **Automatic Calculation**: Instant recalculation on input changes
4. **Visual Distinction**: Scrap qty highlighted in amber/orange colors
5. **Summary Displays**: Total scrap visible in multiple locations
6. **Error Handling**: Gracefully handles missing/null values

## Formula Applied
```javascript
// In addBOMLine()
const scrapQty = (quantity * lossPercentage) / 100

// In BOM form
const totalScrapQty = bomLines.reduce((sum, line) => sum + (parseFloat(line.scrap_qty) || 0), 0)
```

## Testing Checklist

- [x] Migration script creates columns successfully
- [x] Item master stores loss_percentage
- [x] BOM lines calculate scrap_qty automatically
- [x] Frontend displays scrap in table and footer
- [x] Total scrap shown in cost summary
- [x] Auto-population from item master works
- [x] Loss % override per line works
- [x] Frontend build passes without errors
