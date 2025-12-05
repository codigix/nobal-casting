const fs = require('fs');
const path = require('path');

const filePath = 'd:\\projects\\Aluminium-erp\\frontend\\src\\pages\\Production\\BOMForm.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add transfer_material_against and routing to formData state
content = content.replace(
  "    with_operations: false,\n    process_loss_percentage: '0'\n  })",
  "    with_operations: false,\n    process_loss_percentage: '0',\n    transfer_material_against: 'Work Order',\n    routing: ''\n  })"
);

// Add the new UI section with Transfer Material Against and Routing fields
const oldSection = `              <div style={styles.section}>
                <div style={styles.sectionTitle}>⚙️ Manufacturing Operations</div>
                <label style={styles.checkbox}>
                  <input type="checkbox" checked={formData.with_operations} onChange={(e) => setFormData({...formData, with_operations: e.target.checked})} />
                  <span style={{fontWeight: '600'}}>Include Operations in this BOM</span>
                </label>
              </div>

              <div style={styles.section}>
                <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end'}}>`;

const newSection = `              <div style={styles.section}>
                <div style={styles.sectionTitle}>⚙️ Manufacturing Operations</div>
                <label style={styles.checkbox}>
                  <input type="checkbox" checked={formData.with_operations} onChange={(e) => setFormData({...formData, with_operations: e.target.checked})} />
                  <span style={{fontWeight: '600'}}>Include Operations in this BOM</span>
                </label>
                <div style={{marginTop: '12px', color: '#6b7280', fontSize: '13px'}}>Manage cost of operations</div>
              </div>

              <div style={styles.section}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '20px'}}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Transfer Material Against</label>
                    <select name="transfer_material_against" value={formData.transfer_material_against || 'Work Order'} onChange={handleInputChange} style={styles.select}>
                      <option value="Work Order">Work Order</option>
                      <option value="Job Card">Job Card</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Routing</label>
                    <input type="text" name="routing" value={formData.routing || ''} onChange={handleInputChange} placeholder="Enter routing details" style={styles.input} />
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end'}}>`;

content = content.replace(oldSection, newSection);

fs.writeFileSync(filePath, content);
console.log('✓ Updated BOMForm.jsx with operations tab fields');
