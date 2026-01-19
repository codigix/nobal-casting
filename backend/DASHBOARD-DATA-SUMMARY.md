# Manufacturing Dashboard Data Summary

## Database Records (as of 2026-01-18)

### Production Plans: 2 records
- **PP-1768629397297**
  - Status: draft
  - Total Quantity: 40 units
  - Sales Order: SO-1768628817530
  - BOM: BOM-1768626849074

- **PP-1768637725481**
  - Status: draft
  - Total Quantity: 0 units (no work orders assigned)
  - Sales Order: SO-1768637708422

### Work Orders: 4 records
- **WO-1768638410667**: SO-1768628817530 | SA-BOTTLEBODYASSEMBLY | Qty: 10 | Status: in_progress | Priority: medium
- **WO-1768638410734**: SO-1768628817530 | SA-BOTTLEBODYUNTRIMMED | Qty: 10 | Status: draft | Priority: medium
- **WO-1768638410800**: SO-1768628817530 | SA-LABELBACKING | Qty: 10 | Status: draft | Priority: medium
- **WO-1768638410867**: SO-1768637708422 | SA-CAP-ASSEMBLY | Qty: 5 | Status: draft | Priority: medium

### Job Cards: 203 records
- **Completed**: 14
- **Draft**: 163
- **In Progress**: 17
- **Open**: 9

### Sales Orders: 0 records
- None created in the system

## Dashboard Display Expectations

### KPI Cards
- Work Orders: 4
- BOMs: (data from BOM table)
- Production Plans: 2
- Job Cards: 203
- Completed Today: 14
- In Progress: 17
- Pending: 172 (163 draft + 9 open)
- Workstations: (from workstations table)
- Operations: (from operations table)

### Charts

#### Job Card Status Distribution (Pie Chart)
- Completed: 14 (6.9%)
- In Progress: 17 (8.4%)
- Pending: 172 (84.7%)

#### Work Order Status Breakdown (Pie Chart)
- In Progress: 1 (25%)
- Draft: 3 (75%)

#### Weekly Production Trend (Bar Chart)
- Shows daily production counts for last 7 days
- Grouped by: Completed, In Progress, Pending

#### Work Order Distribution (Bar Chart)
- In Progress: 1
- Draft: 3

## Data Relationships

```
Sales Order (0)
  └── Production Plan (2)
      └── Work Order (4)
          └── Job Card (203)
```

## Recent Updates

✓ Added `total_quantity` column to `production_plan` table
✓ Populated `total_quantity` from summing related work orders
✓ Updated DepartmentDashboard to fetch real production data
✓ Verified database connectivity and schema
