# Material Deduction Flow - Step by Step Implementation

## Overview
This document provides a complete step-by-step guide for implementing automatic material deduction from inventory based on work order and job card execution.

---

## STEP 1: Create Work Order → Allocate Materials

### When: User creates a work order
### What Happens:
1. WO is created with BOM details
2. System automatically fetches BOM raw materials
3. Checks stock availability in source warehouse
4. **Reserves materials** (marks as allocated but not yet deducted)
5. Creates allocation records for audit trail

### Database Flow:
```
Work Order Created
    ↓
Fetch BOM Materials
    ↓
Check Stock Availability
    ↓
Create material_allocation records (status='pending')
    ↓
Update stock_balance.reserved_qty += allocated_qty
    ↓
Log in material_deduction_log (transaction_type='allocate')
```

### API Endpoint:
```
POST /api/inventory/allocate-materials
Body: {
  "work_order_id": "WO-1234567890",
  "materials": [
    {
      "item_code": "RM-001",
      "item_name": "Aluminum",
      "required_qty": 100,
      "source_warehouse": "Stores - NC",
      "uom": "kg"
    }
  ]
}
```

### Example Response:
```json
{
  "success": true,
  "message": "3 materials allocated successfully",
  "data": [
    {
      "allocation_id": 1,
      "work_order_id": "WO-1234567890",
      "item_code": "RM-001",
      "allocated_qty": 100
    }
  ]
}
```

### Stock Balance After Step 1:
```
Before:  current_qty=500, reserved_qty=0, available_qty=500
After:   current_qty=500, reserved_qty=100, available_qty=400
         (Material is reserved but not yet deducted)
```

---

## STEP 2: Execute Job Cards → Track Consumption

### When: Operator uses materials and marks quantities consumed/wasted
### What Happens:
1. Operator performs operation using materials
2. Operator records: consumed qty, wasted qty, waste reason
3. System creates consumption records
4. Updates allocation with actual consumption
5. Maintains audit trail

### Database Flow:
```
Job Card Execution
    ↓
Operator Tracks Material Usage
    ↓
Create job_card_material_consumption records
    ↓
Update material_allocation.consumed_qty
    ↓
Update material_allocation.wasted_qty
    ↓
Log in material_deduction_log (transaction_type='consume')
```

### API Endpoint:
```
POST /api/inventory/track-consumption
Body: {
  "job_card_id": "JC-1768497093570-3yqe0ol7e",
  "work_order_id": "WO-1234567890",
  "materials": [
    {
      "item_code": "RM-001",
      "item_name": "Aluminum",
      "warehouse_id": 1,
      "operation_name": "Cutting",
      "planned_qty": 100,
      "consumed_qty": 98,
      "wasted_qty": 2,
      "waste_reason": "Tool wear and offcuts"
    }
  ]
}
```

### Example Response:
```json
{
  "success": true,
  "message": "Material consumption tracked for 1 items",
  "data": [
    {
      "consumption_id": 1,
      "job_card_id": "JC-...",
      "item_code": "RM-001",
      "consumed_qty": 98,
      "wasted_qty": 2
    }
  ]
}
```

### Material Allocation After Step 2:
```
Before:  allocated_qty=100, consumed_qty=0, wasted_qty=0
After:   allocated_qty=100, consumed_qty=98, wasted_qty=2
         (Status: 'partial' - still being processed)
```

---

## STEP 3: Complete Work Order → Finalize Deduction

### When: All job cards for work order are completed
### What Happens:
1. System collects all consumptions for the WO
2. Calculates total consumed + wasted
3. **Finally deducts** from stock_balance.current_qty
4. Updates reserved_qty accordingly
5. Logs final deduction in stock_ledger
6. Handles return of unused materials

### Database Flow:
```
All Job Cards Completed
    ↓
Get All Allocations for WO
    ↓
Calculate: Final Deduction = consumed_qty + wasted_qty
    ↓
Calculate: Return Qty = allocated_qty - final_deduction
    ↓
Update stock_balance.current_qty -= final_deduction
    ↓
Update stock_balance.reserved_qty -= allocated_qty
    ↓
Insert into stock_ledger (transaction_type='Manufacturing Issue')
    ↓
If Return Qty > 0: Return to inventory
    ↓
Update material_allocation.status = 'completed'
```

### API Endpoint:
```
POST /api/inventory/finalize-materials/:work_order_id

Example: POST /api/inventory/finalize-materials/WO-1234567890
```

### Example Response:
```json
{
  "success": true,
  "message": "Work order materials finalized and deducted from stock",
  "data": {
    "total_items": 3,
    "details": [
      {
        "allocation_id": 1,
        "item_code": "RM-001",
        "consumed_qty": 98,
        "wasted_qty": 2,
        "returned_qty": 0
      }
    ]
  }
}
```

### Stock Balance After Step 3:
```
Before:  current_qty=500, reserved_qty=100, available_qty=400
After:   current_qty=400, reserved_qty=0, available_qty=400
         (Final deduction: 100 consumed + wasted = 100 deducted)
         (Reserved amount released)
```

---

## STEP 4: Optional Return → Handle Unused Materials

### When: Materials were allocated but not used
### What Happens:
1. If consumed + wasted < allocated
2. Difference is returned to inventory
3. Updates both current_qty and reserved_qty
4. Logs as 'Manufacturing Return'

### Database Flow:
```
Unused Materials Exist (Return Qty > 0)
    ↓
Update stock_balance.current_qty += return_qty
    ↓
Update stock_balance.reserved_qty -= return_qty
    ↓
Insert into stock_ledger (transaction_type='Manufacturing Return')
    ↓
Log in material_deduction_log (transaction_type='return')
```

### API Endpoint:
```
POST /api/inventory/return-materials
Body: {
  "work_order_id": "WO-1234567890",
  "job_card_id": "JC-...",
  "item_code": "RM-001",
  "warehouse_id": 1,
  "return_qty": 5,
  "reason": "Operation completed with less material"
}
```

---

## Integration Points in Existing Code

### 1. Production Controller - createWorkOrder()
**File**: `backend/src/controllers/ProductionController.js`

```javascript
async createWorkOrder(req, res) {
  // ... existing code ...
  
  const wo = await this.productionModel.createWorkOrder(payload)
  
  // NEW: Allocate materials
  if (required_items && required_items.length > 0) {
    try {
      const inventoryModel = new InventoryModel(this.db)
      await inventoryModel.allocateMaterialsForWorkOrder(
        wo.wo_id,
        required_items,
        req.user?.username || 'system'
      )
    } catch (allocError) {
      console.error('Material allocation warning:', allocError.message)
      // Don't fail WO creation, just warn about allocation
    }
  }
  
  // ... rest of code ...
}
```

### 2. Job Card Controller - Complete Job Card
**File**: `backend/src/controllers/ProductionController.js`

```javascript
async completeJobCard(req, res) {
  // ... existing code ...
  
  // NEW: Track material consumption
  if (req.body.materials && req.body.materials.length > 0) {
    try {
      const inventoryModel = new InventoryModel(this.db)
      await inventoryModel.trackMaterialConsumption(
        job_card_id,
        jobCard.work_order_id,
        req.body.materials,
        req.user?.username || 'system'
      )
    } catch (consumError) {
      console.warn('Material consumption tracking failed:', consumError.message)
    }
  }
  
  // ... rest of code ...
}
```

### 3. Work Order Controller - Complete Work Order
**File**: `backend/src/controllers/ProductionController.js`

```javascript
async completeWorkOrder(req, res) {
  // ... existing code ...
  
  // NEW: Finalize material deductions
  if (allJobCardsCompleted) {
    try {
      const inventoryModel = new InventoryModel(this.db)
      await inventoryModel.finalizeWorkOrderMaterials(
        wo_id,
        req.user?.username || 'system'
      )
    } catch (finalizeError) {
      console.warn('Material finalization failed:', finalizeError.message)
      // Log error but don't block WO completion
    }
  }
  
  // ... rest of code ...
}
```

---

## Frontend Components Needed

### 1. Material Consumption Tracker (Job Card)
**Location**: `frontend/src/components/Production/MaterialConsumptionTracker.jsx`

```jsx
// Display materials allocated for this job card
// Allow operator to enter:
// - consumed_qty: How much was actually used
// - wasted_qty: How much was wasted
// - waste_reason: Why material was wasted

<MaterialConsumptionTracker
  jobCardId={jobCardId}
  workOrderId={workOrderId}
  allocatedMaterials={allocatedMaterials}
  onSubmit={handleMaterialTracking}
/>
```

### 2. Material Allocation Display (Work Order)
**Location**: `frontend/src/components/Production/MaterialAllocationView.jsx`

```jsx
// Show status of allocated materials
// Columns:
// - Item Name
// - Allocated Qty
// - Consumed Qty
// - Wasted Qty  
// - Pending Qty
// - Status

<MaterialAllocationView
  workOrderId={workOrderId}
  materials={materials}
/>
```

### 3. Waste Report (Work Order Details)
**Location**: `frontend/src/components/Production/WasteReport.jsx`

```jsx
// Show waste analysis
// - Total waste percentage
// - Per-item waste breakdown
// - Waste trends

<WasteReport
  workOrderId={workOrderId}
  showTrends={true}
/>
```

---

## Database Tables Created

### Table 1: material_allocation
Tracks reserved materials for each work order

```sql
Columns:
- allocation_id: Primary key
- work_order_id: References work_order
- item_code: Item being allocated
- allocated_qty: Amount reserved
- consumed_qty: Amount actually used
- returned_qty: Amount not used
- wasted_qty: Amount wasted
- status: pending|partial|completed
```

### Table 2: job_card_material_consumption
Tracks consumption per job card operation

```sql
Columns:
- consumption_id: Primary key
- job_card_id: References job_card
- work_order_id: References work_order
- item_code: Item consumed
- planned_qty: Expected usage
- consumed_qty: Actual usage
- wasted_qty: Waste amount
- waste_reason: Why wasted
- tracked_at: When tracked
```

### Table 3: material_deduction_log
Complete audit trail

```sql
Columns:
- log_id: Primary key
- work_order_id: WO reference
- job_card_id: Job card reference
- item_code: Item affected
- transaction_type: allocate|consume|return|scrap
- quantity: Amount changed
- before_qty/after_qty: Stock snapshots
- created_by: Who made the change
- created_at: When changed
```

---

## Testing Workflow

### Test Scenario 1: Complete Flow
1. Create Sales Order
2. Create Work Order with BOM (materials auto-allocate)
3. Create Job Cards automatically
4. Complete first Job Card (track consumption)
5. Complete remaining Job Cards
6. Complete Work Order (finalize deductions)
7. Verify stock updated correctly
8. Check waste report

### Test Scenario 2: Return Flow
1. Create Work Order (allocate 100 kg)
2. Complete Job Card (consume 98 kg)
3. Complete Work Order with 2 kg return
4. Verify 2 kg returned to inventory

### Test Scenario 3: Allocation Failure
1. Create Work Order with material not in stock
2. System should prevent allocation or warn user
3. User can manually allocate or cancel

---

## Execution Commands

### 1. Setup Database Tables
```bash
cd backend/scripts
node setup-material-deduction.js
```

### 2. Test Allocation
```bash
curl -X POST http://localhost:5001/api/inventory/allocate-materials \
  -H "Content-Type: application/json" \
  -d '{
    "work_order_id": "WO-TEST",
    "materials": [
      {
        "item_code": "RM-001",
        "item_name": "Aluminum",
        "required_qty": 50,
        "source_warehouse": "Stores - NC"
      }
    ]
  }'
```

### 3. Test Consumption
```bash
curl -X POST http://localhost:5001/api/inventory/track-consumption \
  -H "Content-Type: application/json" \
  -d '{
    "job_card_id": "JC-TEST",
    "work_order_id": "WO-TEST",
    "materials": [
      {
        "item_code": "RM-001",
        "consumed_qty": 48,
        "wasted_qty": 2,
        "waste_reason": "Tool wear"
      }
    ]
  }'
```

### 4. Test Finalize
```bash
curl -X POST http://localhost:5001/api/inventory/finalize-materials/WO-TEST
```

---

## Key Features

✅ **Two-stage deduction**: Allocate on WO creation, deduct on completion
✅ **Waste tracking**: Separate consumed vs wasted quantities
✅ **Stock safety**: Check availability before allocating
✅ **Complete audit trail**: Every transaction logged
✅ **Return handling**: Automatically return unused materials
✅ **Reservation**: Materials reserved but not deducted until final
✅ **Reports**: Waste percentage, consumption details, audit logs

---

## Next Steps

1. ✅ Create database migrations
2. ✅ Create InventoryModel with all methods
3. ✅ Create InventoryController with API endpoints
4. ⬜ Add API routes to express server
5. ⬜ Create frontend components
6. ⬜ Integrate with Production Controller
7. ⬜ Test complete flow
8. ⬜ Monitor and refine
