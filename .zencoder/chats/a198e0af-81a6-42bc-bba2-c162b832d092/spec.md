# Technical Specification: Phase 24 - Robust Data Reset & Maintenance

## Technical Context
- **Backend**: Node.js, Express, MySQL
- **Frontend**: React, Tailwind CSS
- **Issue**: `DELETE /production/work-orders/truncate/all` fails with foreign key constraint error because `production_entry` references `work_order`.

## Implementation Approach
The goal is to provide a reliable way to clear data in the system for testing and maintenance purposes. The current implementation of `truncateWorkOrders` in `ProductionModel.js` only deletes from `work_order_item` and `work_order`, which triggers a foreign key constraint failure if `production_entry` or `job_card` records exist.

### Handling Foreign Key Constraints
We will adopt a multi-step deletion approach in the correct order:
1.  **Production Truncation**:
    - Delete from `production_entry` (references `job_card` and `work_order`)
    - Delete from `job_card` (references `work_order`)
    - Delete from `work_order_item` (references `work_order`)
    - Delete from `work_order`
2.  **BOM Truncation**:
    - Ensure `bom_line` and other dependencies are cleared.
3.  **Sales Truncation**:
    - Clear `sales_order_item` before `sales_order`.
    - Handle `delivery_note` and `invoice` if necessary.

### Alternatives
- Using `SET FOREIGN_KEY_CHECKS = 0;` followed by `TRUNCATE TABLE ...;` then `SET FOREIGN_KEY_CHECKS = 1;`. This is faster and simpler for "Clear All" operations but should be used with caution.

## Source Code Structure Changes
- **Backend**:
    - `backend/src/models/ProductionModel.js`: Update `truncateWorkOrders` and `truncateJobCards`.
    - `backend/src/controllers/SellingController.js`: Verify `truncateSalesOrders` and `truncateCustomers`.

## Data Model / API / Interface Changes
- No API signature changes. The internal logic of existing `DELETE` endpoints will be improved.

## Verification Approach
1.  **Manual Verification**:
    - Populate system with Work Orders, Job Cards, and Production Entries.
    - Click "Truncate All" in the Work Orders page.
    - Verify success message and empty list.
2.  **Database Inspection**:
    - Run `SELECT COUNT(*) FROM work_order`, `job_card`, `production_entry` to confirm they are 0.
