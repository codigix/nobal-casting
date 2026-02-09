# Full SDD workflow

## Workflow Steps

### [x] Step: Requirements

Create a Product Requirements Document (PRD) based on the feature description. [DONE]

Save the PRD to `d:\projects\nobal-casting\.zencoder\chats\4840f58b-e2e2-4174-9159-60ab25892748/requirements.md`.

### [x] Step: Technical Specification

Create a technical specification based on the PRD. [DONE]

Save to `d:\projects\nobal-casting\.zencoder\chats\4840f58b-e2e2-4174-9159-60ab25892748/spec.md`.

### [x] Step: Planning

Create a detailed implementation plan based on `spec.md`. [DONE]

### [ ] Step: Implementation

1. [x] Update `syncSalesOrderStatus` in `backend/src/models/ProductionModel.js` to use `production` status. [DONE]
2. [x] Refactor `checkAndUpdateWorkOrderProgress` in `backend/src/models/ProductionModel.js` to check if ANY job card is in progress or completed. [DONE]
3. [ ] Verify the changes by manually updating a Job Card and checking the Sales Order status.
