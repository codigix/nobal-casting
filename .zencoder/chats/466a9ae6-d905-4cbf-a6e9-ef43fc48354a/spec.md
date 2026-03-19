# Technical Specification - Machine Availability Feature

## Technical Context
- **Backend**: Node.js, Express, MySQL
- **Frontend**: React, Tailwind CSS, Heroicons
- **Database**: MySQL (nobalcasting database)

## Implementation Approach

### Backend

1. **New Database Column**:
   - `production_entry` already has `machine_id`, `entry_date`, `shift_no`.
   - `time_log` already has `workstation_name` (which is `machine_id` in some contexts), `log_date`, `shift`.
   - (DONE) Added `machine_id` to `time_log` table to ensure consistent tracking across both production entries and time logs.

2. **Availability Check Logic**:
   - Create a method `checkMachineAvailability(machineId, date, shift, jobCardId)` in `ProductionModel`.
   - Query both `production_entry` and `time_log` for the specified machine, date, and shift.
   - If any record exists with a DIFFERENT `job_card_id`, the machine is considered occupied.

3. **Controller & Model Integration**:
   - Integrate `checkMachineAvailability` into `createProductionEntry` and `createTimeLog` methods in `ProductionModel`.
   - Throw an error if the machine is occupied by another job card.

4. **Workstation API Update**:
   - Update `getWorkstations` method in `ProductionModel` to accept `date` and `shift`.
   - Perform a LEFT JOIN or subquery to determine the current availability and occupant for each workstation.

### Frontend

1. **Job Card Execution UI**:
   - Add state for `selectedDate` and `selectedShift` in `JobCard.jsx`.
   - Trigger workstation list refresh when date or shift changes.

2. **Workstation Selection**:
   - Update `MachineSelection` component (or the workstation dropdown) to show availability status.
   - Disable or visually mark occupied workstations.
   - Show a message indicating which job card is currently using an occupied workstation.

3. **Validation**:
   - Client-side validation to prevent form submission if an unavailable workstation is selected.

## Data Model Changes

### `time_log` table (UPDATED)
- Added `machine_id` VARCHAR(50) (mapped from workstation_master if available)

## API Changes

### `GET /production/workstations`
- New optional query parameters: `date` (YYYY-MM-DD), `shift` (1, 2, or 3).
- Updated response item:
  ```json
  {
    "id": 1,
    "name": "Machine A",
    "is_available": boolean,
    "occupied_by": string | null
  }
  ```

## Verification Approach

1. **Unit Testing**:
   - Create a test script `test-machine-availability.js` to simulate concurrent job card allocations and verify correct blocking behavior.
2. **Integration Testing**:
   - Manually verify the UI behavior in the Job Card page when different shifts and dates are selected.
3. **Database Consistency**:
   - Ensure that the `machine_id` is correctly populated in both `production_entry` and `time_log`.
