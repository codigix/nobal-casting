# Requirements Document - Automatic Sales Order Status Update

## Overview
When a Job Card's status transitions to "In Progress", the associated Sales Order's status should automatically change to reflect that production has started.

## Current State
- Job Cards are linked to Work Orders.
- Work Orders are linked to Sales Orders.
- When a Job Card status is updated to "In Progress", it triggers an update to the Work Order status.
- The Work Order status update triggers a synchronization of the Sales Order status.
- Currently, the Sales Order status is set to `under_production` when at least one Work Order is in progress.
- The Sales Order status enum includes both `under_production` and `production`.

## Requirements
1.  **Automatic Status Transition**: When ANY Job Card associated with a Work Order (which is linked to a Sales Order) is marked as "In Progress", the Sales Order status must automatically change.
2.  **Status Name**: The target status for the Sales Order should be `production` (to align with standard manufacturing terminology and user preference).
3.  **Consistency**: Ensure that the automatic status update happens reliably regardless of which Job Card (first, middle, or last) is started, provided the Sales Order is not already in a more advanced state (like `dispatched` or `delivered`).
4.  **Notifications**: The system should continue to notify the Sales Order creator about the automatic status change.

## Unclear Aspects
- Should the status change back to `confirmed` if all Job Cards are moved back to `draft`? (Currently, `syncSalesOrderStatus` handles this by setting it to `ready_for_production` if some statuses exist but none are in progress).
- Is `under_production` still needed, or should it be deprecated in favor of `production`? (The frontend supports both, but we should standardize).

## Decisions
- Standardize on `production` as the status for Sales Orders in the manufacturing phase.
- Ensure `syncSalesOrderStatus` correctly identifies "In Progress" states from both Job Cards and Work Orders if necessary, although the current chain (`Job Card` -> `Work Order` -> `Sales Order`) is sound.
