# Product Requirements Document (PRD) - Machine Availability Feature

## Overview
The goal of this feature is to prevent machine over-allocation by ensuring that a machine assigned to a specific job card operation is not available for any other operation during the same shift on a given date.

## Target User
Plant Managers and Machine Operators who manage and execute job card operations on the shop floor.

## Key Requirements

1. **Machine Allocation Tracking**:
   - A machine is considered "allocated" if it has an active production entry or time log for a specific date and shift.
   - Allocation is tied to a `job_card_id`.

2. **Uniqueness Constraint**:
   - A machine can only be allocated to ONE job card per shift per date.
   - Multiple entries/logs for the SAME job card on the same machine/date/shift are allowed (for incremental production reporting).
   - Entries/logs for DIFFERENT job cards on the same machine/date/shift are BLOCKED.

3. **Real-time Availability Feedback**:
   - When selecting a machine for a production entry or time log, the system should indicate whether the machine is available.
   - If a machine is occupied, the system should show which job card is currently using it.

4. **Validation during Entry Creation**:
   - Both backend and frontend must enforce this constraint.
   - Attempts to create a production entry or time log for an occupied machine by a different job card should result in an error.

## User Experience (UX)

- **Date and Shift Selection**: Users should select the date and shift BEFORE selecting the machine to see current availability.
- **Visual Indicators**: Occupied machines should be clearly marked in selection dropdowns (e.g., "Occupied by JC-123" or "Unavailable").
- **Error Messaging**: Clear error messages explaining why an operation cannot be started or recorded on a specific machine.

## Success Criteria

- Successfully prevents two different job cards from using the same machine on the same shift and date.
- No regression in existing production entry and time log functionality.
- Clear and helpful UI for machine availability.
