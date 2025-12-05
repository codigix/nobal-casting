const fs = require('fs');

const filePath = 'd:\\projects\\Aluminium-erp\\frontend\\src\\pages\\Production\\BOM.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const newContent = content
  .replace(
    /<th>BOM ID<\/th>\s+<th>Product<\/th>\s+<th>Item Code<\/th>\s+<th>Qty<\/th>\s+<th>UOM<\/th>\s+<th>Components<\/th>\s+<th>Status<\/th>\s+<th>Rev<\/th>\s+<th>Actions<\/th>/,
    `<th style={{ width: '40px' }}><input type="checkbox" /></th>
                <th>ID</th>
                <th>Status</th>
                <th>Item</th>
                <th>Is Active</th>
                <th>Is Default</th>
                <th>Total Cost</th>
                <th>Last Updated On</th>
                <th style={{ width: '50px' }}>Actions</th>`
  )
  .replace(
    /<td><strong>\{bom\.bom_id\}<\/strong><\/td>\s+<td>\{bom\.product_name \|\| 'N\/A'\}<\/td>\s+<td>\{bom\.item_code\}<\/td>\s+<td>\{bom\.quantity\}<\/td>\s+<td>\{bom\.uom \|\| 'Kg'\}<\/td>\s+<td><span style=\{\{ background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '4px', fontSize: '0\.85rem' \}\}>\{bom\.component_count \|\| 0\}<\/span><\/td>\s+<td><span className=\{`work-order-status \$\{getStatusColor\(bom\.status\)\}`\}>\{bom\.status\}<\/span><\/td>\s+<td>\{bom\.revision \|\| '-'\}<\/td>\s+<td>\s+<div className="entry-actions">\s+<button className="btn-view"><Eye size=\{16\} \/><\/button>\s+<button className="btn-edit" onClick=\{\(\) => handleEdit\(bom\)\}><Edit2 size=\{16\} \/><\/button>\s+<button className="btn-delete" onClick=\{\(\) => handleDelete\(bom\.bom_id\)\}><Trash2 size=\{16\} \/><\/button>\s+<\/div>\s+<\/td>/,
    `<td style={{ width: '40px', textAlign: 'center' }}><input type="checkbox" /></td>
                  <td><strong>{bom.bom_id}</strong></td>
                  <td><span className={\`work-order-status \${getStatusColor(bom.status)}\`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', display: 'inline-block', textTransform: 'capitalize' }}>{bom.status || 'Draft'}</span></td>
                  <td>{bom.item_code} {bom.product_name && <span style={{ color: '#666' }}>- {bom.product_name}</span>}</td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={bom.is_active !== false} readOnly style={{ cursor: 'pointer' }} /></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={bom.is_default === true} readOnly style={{ cursor: 'pointer' }} /></td>
                  <td style={{ textAlign: 'right' }}>₹{parseFloat(bom.total_cost || 0).toFixed(2)}</td>
                  <td style={{ fontSize: '0.9rem', color: '#666' }}>{bom.updated_at ? new Date(bom.updated_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                  <td style={{ width: '50px' }}>
                    <div className="entry-actions" style={{ gap: '4px' }}>
                      <button className="btn-edit" onClick={() => handleEdit(bom)} title="Edit"><Edit2 size={16} /></button>
                      <button className="btn-delete" onClick={() => handleDelete(bom.bom_id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>`
  );

fs.writeFileSync(filePath, newContent);
console.log('✓ BOM table updated successfully');
