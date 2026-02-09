# Plan: Phase 24 - Robust Data Reset & Maintenance

## Workflow Steps

### [x] Step: Technical Specification
- Difficulty: Easy-Medium
- Created `spec.md` identifying the foreign key constraint issue.
- Approach: Update truncation logic to handle dependencies in correct order.

### [ ] Step: Implementation

#### 1. Fix Production Truncation Logic
- [ ] Modify `ProductionModel.js`: `truncateWorkOrders` to delete `production_entry` and `job_card` first.
- [ ] Modify `ProductionModel.js`: `truncateJobCards` to handle any specific dependencies (e.g. `operation_logs`).
- [ ] Verify `truncateBOMs` for similar dependency issues.

#### 2. Fix Sales Truncation Logic
- [ ] Modify `SellingController.js`: `truncateSalesOrders` to ensure items are deleted.
- [ ] Verify `truncateCustomers` for dependencies (Quotations, Sales Orders).

#### 3. Verification
- [ ] Manual test: Truncate Work Orders from UI.
- [ ] Manual test: Truncate BOMs from UI.
- [ ] Manual test: Truncate Customers/Sales Orders (if UI exists).

### [ ] Step: Reporting
- [ ] Create `report.md` with implementation details.
