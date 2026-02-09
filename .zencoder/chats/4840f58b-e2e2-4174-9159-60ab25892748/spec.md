# Technical Specification - Automatic Sales Order Status Update

## Technical Context
- **Backend**: Node.js with Express and MySQL.
- **Frontend**: React with Vite.
- **Data Model**: `selling_sales_order` table has a `status` column with an ENUM that includes `production`.

## Implementation Approach
The main logic resides in `backend/src/models/ProductionModel.js`. I will:
1.  Update `syncSalesOrderStatus` to use `production` instead of `under_production`.
2.  Update `syncSalesOrderStatus` to also handle `ready_for_production` if necessary, or simplify the logic to match the current ENUM.
3.  Ensure that `updateJobCardStatus` correctly propagates the "In Progress" status to the Sales Order.

### Changes in `ProductionModel.js`

#### `syncSalesOrderStatus(sales_order_id)`
- Change `newSOStatus = 'under_production'` to `newSOStatus = 'production'`.
- Ensure `newSOStatus = 'ready_for_production'` is either supported by the ENUM or changed to `confirmed`.
  - Looking at the ENUM: `('draft','confirmed','ready_for_production','under_production','production','complete','on_hold','dispatched','delivered')`.
  - Both `ready_for_production` and `production` are present.
  - I will use `production` when any work order is `in_progress`.

#### `updateJobCardStatus(jobCardId, newStatus)`
- The current implementation already calls `syncSalesOrderStatus`.
- I will verify if `checkAndUpdateWorkOrderProgress` needs to be more aggressive (e.g., if ANY job card is started, not just the first one).
- Actually, `checkAndUpdateWorkOrderProgress` checks `jobCards[0]`. If it's `completed`, it might not update the WO to `in_progress` if it wasn't already.
- Wait, if the first job card is `completed`, the WO SHOULD stay `in_progress` until the last one is `completed`.
- If the first is `completed`, and the second is `in-progress`, the WO status should still be `in_progress`.
- The current logic:
  ```javascript
  1586→        if (workOrderStatus !== 'in-progress' && workOrderStatus !== 'in_progress' && workOrderStatus !== 'completed') {
  1587→          await this.updateWorkOrder(work_order_id, { status: 'in_progress' })
  ```
  If `firstJobStatus` is `completed`, this triggers. This is fine for the start of the first operation.
  What if the first operation is skipped or we start with the second?
  Maybe `checkAndUpdateWorkOrderProgress` should check if ANY job card is `in-progress` or `completed`.

## Delivery Phases
1.  **Phase 1**: Update `syncSalesOrderStatus` in `ProductionModel.js` to use `production` status.
2.  **Phase 2**: Refactor `checkAndUpdateWorkOrderProgress` to be more robust.
3.  **Phase 3**: Verification.

## Verification Approach
- Manual testing: Update a Job Card to "In Progress" and check the Sales Order status in the database/UI.
- Check logs for the notification creation.
