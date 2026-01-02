const fs = require('fs');

// Update ProductionController.js
const controllerFile = 'backend/src/controllers/ProductionController.js';
let controllerContent = fs.readFileSync(controllerFile, 'utf8');

// Update the destructuring in startOperation
controllerContent = controllerContent.replace(
  'const { actual_start_date, workstation_id, inhouse, outsource, notes } = req.body',
  'const { actual_start_date, workstation_id, operator_name, start_date, start_time, inhouse, outsource, notes } = req.body'
);

// Add operator_name validation
const operatorValidation = `

      if (!operator_name) {
        return res.status(400).json({
          success: false,
          error: 'operator_name is required'
        })
      }`;

controllerContent = controllerContent.replace(
  `      if (!actual_start_date) {
        return res.status(400).json({
          success: false,
          error: 'actual_start_date is required'
        })
      }

      const userId = req.user?.user_id`,
  `      if (!actual_start_date) {
        return res.status(400).json({
          success: false,
          error: 'actual_start_date is required'
        })
      }${operatorValidation}

      const userId = req.user?.user_id`
);

// Update the model call
controllerContent = controllerContent.replace(
  `const result = await this.productionModel.startOperation(job_card_id, {
        actual_start_date,
        workstation_id,
        inhouse,
        outsource,
        notes,
        created_by: userId
      })`,
  `const result = await this.productionModel.startOperation(job_card_id, {
        actual_start_date,
        workstation_id,
        operator_name,
        start_date,
        start_time,
        inhouse,
        outsource,
        notes,
        created_by: userId
      })`
);

fs.writeFileSync(controllerFile, controllerContent, 'utf8');

// Update ProductionModel.js
const modelFile = 'backend/src/models/ProductionModel.js';
let modelContent = fs.readFileSync(modelFile, 'utf8');

// Update the destructuring in startOperation model method
modelContent = modelContent.replace(
  'const { actual_start_date, workstation_id, inhouse, outsource, notes, created_by } = data',
  'const { actual_start_date, workstation_id, operator_name, start_date, start_time, inhouse, outsource, notes, created_by } = data'
);

// Update the INSERT query to include operator_name, start_date, start_time
modelContent = modelContent.replace(
  `INSERT INTO operation_execution_log 
          (job_card_id, event_type, event_timestamp, workstation_id, notes, created_by)
         VALUES (?, 'START', ?, ?, ?, ?)`,
  `INSERT INTO operation_execution_log 
          (job_card_id, event_type, event_timestamp, workstation_id, operator_name, start_date, start_time, notes, created_by)
         VALUES (?, 'START', ?, ?, ?, ?, ?, ?, ?)`
);

// Update the query parameters
modelContent = modelContent.replace(
  `[jobCardId, eventTimestamp, workstation_id || null, notes || null, created_by || 'system']`,
  `[jobCardId, eventTimestamp, workstation_id || null, operator_name || null, start_date || null, start_time || null, notes || null, created_by || 'system']`
);

// Also update the job_card table update to include operator_name
modelContent = modelContent.replace(
  `UPDATE job_card SET actual_start_date = ?, status = 'in-progress', assigned_workstation_id = ?, inhouse = ?, outsource = ? WHERE job_card_id = ?`,
  `UPDATE job_card SET actual_start_date = ?, status = 'in-progress', assigned_workstation_id = ?, operator_name = ?, inhouse = ?, outsource = ? WHERE job_card_id = ?`
);

// Update the UPDATE parameters
modelContent = modelContent.replace(
  `[eventTimestamp, workstation_id || null, inhouse ? 1 : 0, outsource ? 1 : 0, jobCardId]`,
  `[eventTimestamp, workstation_id || null, operator_name || null, inhouse ? 1 : 0, outsource ? 1 : 0, jobCardId]`
);

fs.writeFileSync(modelFile, modelContent, 'utf8');

console.log('Backend files updated successfully');
console.log('✓ ProductionController.js');
console.log('✓ ProductionModel.js');
