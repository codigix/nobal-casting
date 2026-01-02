# Production-Inventory Integrated Workflow Analysis

## Current State Overview

### Existing Components
1. **Production Dashboard** - Displays stats, charts, BOMs, Work Orders, Job Cards
2. **Production Planning** - Production stages and plans
3. **Work Orders** - Manufacturing orders linked to BOMs
4. **Job Cards** - Operations from BOMs (not yet created operation-wise)
5. **Material Requests** - Basic MR creation (draft status)
6. **Stock Movements** - NEW: Recently added IN/OUT tracking system
7. **Stock Balance** - Inventory management with pagination

---

## **PROPOSED END-TO-END WORKFLOW**

```
BOM CREATED
    ↓
[AUTO] Extract materials from BOM + required quantities
    ↓
[AUTO] Create Material Request to Inventory (Status: Pending)
    ↓
[AUTO] Create Stock Movement (Type: OUT) for each material
    ↓
Inventory Manager Reviews & Approves MR
    ↓
Stock Movement Auto-Deducts from Inventory
    ↓
    ↓
WORK ORDER CREATED (From Approved BOM)
    ↓
[AUTO] Create Job Cards for each Operation in BOM
    ↓
Production Manager Assigns Operations to Workstations
    ↓
OPERATION EXECUTION WORKFLOW:
    ├─ Click START Operation
    │  ├─ Capture: Start Date (auto-filled current time)
    │  ├─ Prefilled: Workstation (from BOM operation config)
    │  ├─ Show: Next Operation Dropdown (all operations linked to this WO)
    │  ├─ Status: In Progress
    │  └─ Log: Start timestamp in operation history
    │
    ├─ During Operation: Monitor for delays
    │  └─ If Current Time > Planned End Date → Mark: DELAYED
    │
    ├─ Click END Operation
    │  ├─ Capture: End Date (auto-filled current time)
    │  ├─ Update: Status → Completed/Delayed
    │  ├─ Validation: Check if End Date > Planned End Date
    │  ├─ Assign: Next Operation (from dropdown)
    │  └─ Log: End timestamp in operation history
    │
    └─ AUTO: Mark next assigned operation as "Ready to Start"
```

---

## **DATABASE SCHEMA ENHANCEMENTS NEEDED**

### 1. **Production Stages Table** (New)
```sql
CREATE TABLE production_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stage_code VARCHAR(50) UNIQUE,
  stage_name VARCHAR(100),
  stage_sequence INT,
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Example Data:
- Stage 1: Planning
- Stage 2: Design & BOM Creation
- Stage 3: Work Order Creation
- Stage 4: Job Card Execution
- Stage 5: QC & Verification
- Stage 6: Delivery
```

### 2. **Job Card (Operations) Enhancement**
```sql
ALTER TABLE job_card ADD COLUMNS:
  work_order_id INT NOT NULL,
  operation_sequence INT,
  planned_start_date DATETIME,
  planned_end_date DATETIME,
  actual_start_date DATETIME,
  actual_end_date DATETIME,
  is_delayed TINYINT(1) DEFAULT 0,
  next_operation_id INT (self-reference),
  assigned_workstation_id INT,
  assignment_notes TEXT,
  parent_job_card_id INT (for sub-operations),
  
INDEXES:
  - INDEX work_order_id
  - INDEX operation_sequence
  - INDEX status
```

### 3. **Operation Execution History** (New)
```sql
CREATE TABLE operation_execution_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_card_id INT NOT NULL,
  event_type ENUM('started', 'paused', 'resumed', 'completed', 'delayed_marked'),
  event_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_minutes INT,
  operator_id VARCHAR(50),
  notes TEXT,
  is_delayed_at_end TINYINT(1) DEFAULT 0,
  
INDEXES:
  - INDEX job_card_id
  - INDEX event_timestamp
);
```

### 4. **BOM to Material Request Link** (New)
```sql
CREATE TABLE bom_material_request_link (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bom_id INT NOT NULL,
  material_request_id VARCHAR(100) NOT NULL,
  auto_created TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
FOREIGN KEY (bom_id) REFERENCES bom(id),
FOREIGN KEY (material_request_id) REFERENCES material_request(mr_id)
);
```

---

## **BACKEND API ENDPOINTS NEEDED**

### Production Stage Management
```
GET    /api/production/stages              - List all stages
POST   /api/production/stages              - Create stage
GET    /api/production/stages/:id          - Get stage details
PUT    /api/production/stages/:id          - Update stage
```

### Job Card Operations
```
GET    /api/production/work-orders/:wo_id/job-cards
       - List all job cards for a work order (in sequence)

POST   /api/job-cards/:job_card_id/start
  Body: { workstation_id, notes }
  Response: { job_card, operation_log, next_operations }

POST   /api/job-cards/:job_card_id/end
  Body: { notes, next_operation_id, delay_marked }
  Response: { job_card, operation_log, next_operation_status }

GET    /api/job-cards/:job_card_id/next-operations
       - Get all available next operations for a job card

GET    /api/job-cards/:job_card_id/execution-history
       - Get complete execution timeline
```

### BOM to Material Request
```
POST   /api/bom/:bom_id/create-material-request
  - Auto-extract materials from BOM
  - Create MR with all items
  - Create Stock Movements for inventory deduction
  Response: { material_request, stock_movements }

GET    /api/bom/:bom_id/material-requests
  - Get all MRs linked to this BOM
```

---

## **FRONTEND COMPONENTS NEEDED**

### 1. **Production Stages Manager** (`/manufacturing/production-stages`)
- List all stages with sequence
- Create/Edit/Delete stages
- Drag-drop to reorder

### 2. **Enhanced Work Order Form**
- Link to Production Stage (dropdown)
- Auto-populate from BOM
- Auto-generate Job Cards (operation-wise)
- Show material request status

### 3. **Job Card Execution Panel** (NEW)
```jsx
Location: /manufacturing/job-cards or /manufacturing/work-orders/:wo_id/execute

Features:
├─ Operation List (sequential)
│  ├─ Operation Name
│  ├─ Planned Duration (start - end date)
│  ├─ Status Badge (Pending → In Progress → Completed/Delayed)
│  ├─ Assigned Workstation
│  └─ Action Buttons (START / IN PROGRESS / END)
│
├─ Active Operation Panel
│  ├─ Large operation title
│  ├─ START Button
│  │  └─ Opens modal:
│  │     ├─ Workstation (prefilled, editable)
│  │     ├─ Start Time (auto-filled, editable)
│  │     └─ Notes textarea
│  │
│  ├─ Timer showing elapsed time
│  ├─ Planned vs Actual time comparison
│  │  └─ Red highlight if exceeded
│  │
│  ├─ END Button
│  │  └─ Opens modal:
│  │     ├─ End Time (auto-filled)
│  │     ├─ Delay Checkbox (if past planned end)
│  │     ├─ Next Operation Dropdown
│  │     │  └─ Fetched from WO operations
│  │     └─ Completion Notes
│  │
│  └─ Execution History (timeline view)
│     ├─ Started: timestamp
│     ├─ Duration: HH:MM
│     ├─ Delay Status: Yes/No
│     └─ Operator: name
│
└─ Analytics Panel (optional)
   ├─ Total elapsed vs planned
   ├─ Operations on-time %
   └─ Delay reason trends
```

### 4. **Work Order Progress Dashboard** (ENHANCED)
```jsx
Location: /manufacturing/work-orders/:wo_id/progress

Show:
├─ Kanban-style Operation Cards (grouped by status)
│  ├─ Column: Not Started
│  ├─ Column: In Progress
│  ├─ Column: Completed On Time
│  └─ Column: Completed Delayed
│
├─ Timeline View
│  └─ Gantt-like horizontal timeline showing:
│     ├─ Planned duration
│     ├─ Actual duration
│     ├─ Delay indicator
│     └─ Operator info
│
├─ Linked Materials Status
│  └─ Show material request & stock movement status
│
└─ Real-time Alerts
   ├─ Operation overdue by X minutes
   ├─ Low stock on required materials
   └─ Workstation unavailable
```

### 5. **Project Analytics Page** (NEW)
```jsx
Location: /manufacturing/analytics or /manufacturing/dashboard/advanced

Dashboard showing:
├─ PROJECT STAGE DISTRIBUTION (Pie Chart)
│  ├─ Planning: 3 projects
│  ├─ BOM Creation: 5 projects
│  ├─ Execution: 8 projects
│  ├─ QC: 2 projects
│  └─ Delivery: 1 project
│
├─ PRODUCTION WORKFLOW HEALTH (Sankey Diagram)
│  └─ Flow: Planning → BOM → WO → Operations → QC → Delivery
│     with success/delay counts at each stage
│
├─ OPERATION PERFORMANCE (Table + Charts)
│  ├─ Filter by workstation, operation type, date range
│  ├─ Metrics per operation:
│  │  ├─ Total runs
│  │  ├─ On-time %
│  │  ├─ Average duration
│  │  ├─ Delays: count & reasons
│  │  └─ Operator productivity
│  │
│  └─ Trend chart (line graph showing on-time % over time)
│
├─ WORKSTATION UTILIZATION (Heatmap)
│  ├─ X-axis: Workstations
│  ├─ Y-axis: Time slots
│  ├─ Color intensity: Utilization %
│  └─ Hover: Show operation details
│
├─ MATERIAL FLOW ANALYSIS
│  ├─ Materials requested vs deducted
│  ├─ Stock levels after each production batch
│  ├─ Bottlenecks (high usage items)
│  └─ Waste/Scrap analysis
│
├─ DELAY ANALYSIS
│  ├─ Top reasons for delays
│  ├─ Delayed operations timeline
│  ├─ Impact on overall project timeline
│  └─ Workstation/operator specific delays
│
└─ PROJECT TIMELINE GANTT
   └─ Show all active WOs with:
      ├─ Planned timeline (light bar)
      ├─ Actual timeline (dark bar)
      ├─ Critical path highlighting
      └─ Status colors
```

---

## **IMPLEMENTATION ROADMAP**

### **Phase 1: Foundation (Week 1)**
- [ ] Create Production Stages table + CRUD API
- [ ] Enhance Job Card schema with operation fields
- [ ] Create Operation Execution Log table
- [ ] Create BOM-MR link table

### **Phase 2: Material Integration (Week 2)**
- [ ] Add BOM → Material Request auto-creation API
- [ ] Integrate with Stock Movements (auto-deduct)
- [ ] Add MR status tracking in BOM/WO views
- [ ] Create material status indicator components

### **Phase 3: Job Card Execution (Week 2-3)**
- [ ] Build Job Card Execution Panel UI
- [ ] Implement START operation (capture workstation, time)
- [ ] Implement END operation (capture time, assign next)
- [ ] Add operation execution logging
- [ ] Add next operation dropdown fetching

### **Phase 4: Analytics & Monitoring (Week 3-4)**
- [ ] Build Project Analytics page
- [ ] Add Gantt chart for WO timeline
- [ ] Create workstation utilization heatmap
- [ ] Add delay tracking & reporting
- [ ] Create Sankey diagram for workflow

### **Phase 5: Optimization (Week 4)**
- [ ] Add real-time alerts
- [ ] Create performance dashboards per operator
- [ ] Implement predictive delay warnings
- [ ] Add batch operation processing

---

## **KEY FEATURES BY MODULE**

### **Production Module**
1. ✅ Production Stages management
2. ✅ Work Order → Job Card auto-generation
3. ✅ Operation execution workflow (START/END)
4. ✅ Workstation assignment & prefilling
5. ✅ Next operation auto-queue
6. ✅ Delay detection & marking
7. ✅ Execution history logging

### **Inventory Integration**
1. ✅ BOM → Material Request auto-creation
2. ✅ Stock Movement auto-creation (OUT type)
3. ✅ Inventory approval workflow
4. ✅ Material status tracking
5. ✅ Stock balance updates
6. ✅ Material shortage alerts

### **Analytics & Reporting**
1. ✅ Project stage distribution
2. ✅ Operation performance metrics
3. ✅ Workstation utilization tracking
4. ✅ Delay analysis & trends
5. ✅ Gantt charts for timeline visualization
6. ✅ Material consumption vs availability
7. ✅ Operator productivity metrics
8. ✅ Production efficiency KPIs

---

## **DATA FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BOM CREATION                                 │
├─────────────────────────────────────────────────────────────────────┤
│  1. User creates BOM with items                                     │
│  2. On BOM SAVE:                                                    │
│     ├─ Extract materials & quantities                               │
│     ├─ Create Material Request (Status: Pending)                    │
│     ├─ Create Stock Movements (OUT, Status: Pending)                │
│     └─ Store BOM-MR link                                            │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│              INVENTORY APPROVAL (Async)                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. Inventory Manager reviews MR                                    │
│  2. Click APPROVE on MR                                             │
│  3. Auto-updates Stock Movements to APPROVED                        │
│  4. Deduct from Stock Balance                                       │
│  5. Send notification: "Materials allocated to BOM-XXX"             │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   WORK ORDER CREATION                               │
├─────────────────────────────────────────────────────────────────────┤
│  1. User creates WO, selects approved BOM                           │
│  2. On WO SAVE:                                                     │
│     ├─ Auto-generate Job Cards from BOM operations                  │
│     ├─ Set operation sequence                                       │
│     ├─ Assign to Production Stage: "Execution"                      │
│     ├─ Set planned start/end dates                                  │
│     └─ Create operation dependency chain                            │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│               JOB CARD EXECUTION WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│  Status: Pending → In Progress → Completed/Delayed                 │
│                                                                     │
│  START OPERATION:                                                   │
│  ├─ Capture: Workstation (prefilled), Time (auto)                  │
│  ├─ Log: Start event with timestamp                                │
│  ├─ Update Status: In Progress                                     │
│  └─ Response: Show active timer                                    │
│                                                                     │
│  DURING EXECUTION:                                                  │
│  ├─ Monitor: Current Time vs Planned End Date                      │
│  ├─ Alert: If exceeded by 5min, 15min, 30min                       │
│  └─ Flag: Mark as DELAYED if still running past end                │
│                                                                     │
│  END OPERATION:                                                     │
│  ├─ Capture: Time (auto), Next Operation (dropdown)                │
│  ├─ Calculate: Actual duration, check delay status                 │
│  ├─ Log: End event with timestamp                                  │
│  ├─ Update Status: Completed or Delayed                            │
│  ├─ Auto-mark: Next operation as "Ready to Start"                  │
│  └─ Create: Notification for next operator                         │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────────────────────┐
│              PRODUCTION COMPLETION & ANALYTICS                      │
├─────────────────────────────────────────────────────────────────────┤
│  1. All operations complete                                         │
│  2. Mark WO: Status = Completed                                     │
│  3. Update Production Stage: "QC & Verification" / "Delivery"       │
│  4. Generate reports:                                               │
│     ├─ Total time vs planned                                        │
│     ├─ Delay analysis                                               │
│     ├─ Material consumption                                         │
│     ├─ Workstation utilization                                      │
│     └─ Operator productivity                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## **QUICK WIN PRIORITIES**

Start with these for maximum impact:

1. **Production Stages** → Define your stage workflow
2. **Job Card START/END** → Operation execution tracking
3. **BOM → Material Request** → Inventory integration
4. **Work Order Progress Dashboard** → Real-time status visibility
5. **Analytics Page** → See project health at a glance

---

## **NEXT STEPS**

1. Review this architecture
2. Confirm database schema changes
3. Prioritize which components to build first
4. I'll create the backend models, APIs, and frontend components
5. Implement with real data from your system

---

**Status**: Analysis Complete | Ready for Implementation ✅
