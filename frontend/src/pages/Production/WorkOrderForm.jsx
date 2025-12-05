import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Settings, Plus, Trash2 } from 'lucide-react'
import * as productionService from '../../services/productionService'
import SearchableSelect from '../../components/SearchableSelect'
import './Production.css'

export default function WorkOrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeTab, setActiveTab] = useState('production-item')
  const [items, setItems] = useState([])
  const [bomsData, setBOMsData] = useState([])
  const [requiredItems, setRequiredItems] = useState([])
  const [operationsData, setOperationsData] = useState([])
  const [warehouses, setWarehouses] = useState([])

  const [formData, setFormData] = useState({
    series: 'MFG-WO-.YYYY.-',
    company: 'codigix infotech',
    item_to_manufacture: '',
    bom_no: '',
    qty_to_manufacture: '',
    project: '',
    sales_order: '',
    source_warehouse: '',
    target_warehouse: '',
    wip_warehouse: '',
    scrap_warehouse: '',
    allow_alternative_item: false,
    use_multi_level_bom: true,
    skip_material_transfer_to_wip: false,
    update_consumed_material_cost: true,
    priority: 'medium',
    notes: '',
    planned_start_date: '',
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    expected_delivery_date: ''
  })

  useEffect(() => {
    fetchItems()
    fetchBOMs()
    fetchWarehouses()
    if (id) {
      fetchWorkOrderDetails(id)
    }
  }, [id])

  const fetchItems = async () => {
    try {
      const response = await productionService.getItemsList()
      setItems(response.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const getItemOptions = () => {
    return items.map(item => ({
      label: `${item.item_code} - ${item.item_name}`,
      value: item.item_code
    }))
  }

  const fetchBOMs = async () => {
    try {
      const response = await productionService.getBOMs({ status: 'active' })
      setBOMsData(response.data || [])
    } catch (err) {
      console.error('Failed to fetch BOMs:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await productionService.getWarehouses()
      const warehouseList = response.data || []
      const warehouseOptions = warehouseList.map(wh => ({
        label: `${wh.warehouse_name || wh.name}`,
        value: wh.warehouse_name || wh.name
      }))
      setWarehouses(warehouseOptions)
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchWorkOrderDetails = async (workOrderId) => {
    try {
      const response = await productionService.getWorkOrder(workOrderId)
      setFormData(response.data)
    } catch (err) {
      console.error('Failed to fetch work order details:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)

    if (name === 'item_to_manufacture' && value) {
      fetchBOMsForItem(value)
    }

    if (name === 'bom_no' && value) {
      fetchBOMDetailsAndPopulate(value)
    }
  }

  const fetchBOMsForItem = async (itemCode) => {
    try {
      setLoading(true)
      const response = await productionService.getBOMs({ item_code: itemCode, status: 'active' })
      const bomsForItem = response.data || []
      
      if (bomsForItem.length > 0) {
        const firstBOM = bomsForItem[0]
        setFormData(prev => ({
          ...prev,
          bom_no: firstBOM.bom_id
        }))
        
        await fetchBOMDetailsAndPopulate(firstBOM.bom_id)
      } else {
        setFormData(prev => ({
          ...prev,
          bom_no: ''
        }))
        setRequiredItems([])
        setOperationsData([])
      }
      setError(null)
    } catch (err) {
      console.error('Failed to fetch BOMs for item:', err)
      setError('Failed to fetch BOMs for the selected item')
    } finally {
      setLoading(false)
    }
  }

  const fetchBOMDetailsAndPopulate = async (bomId) => {
    try {
      setLoading(true)
      const response = await productionService.getBOMDetails(bomId)
      const bomData = response.data

      let itemsMap = {}
      try {
        const itemsResponse = await productionService.getItems()
        const itemsData = itemsResponse.data || []
        itemsMap = itemsData.reduce((acc, item) => {
          acc[item.item_code] = item
          return acc
        }, {})
      } catch (err) {
        console.error('Failed to fetch items:', err)
      }

      if (bomData.lines && Array.isArray(bomData.lines)) {
        const requiredItemsFromBOM = bomData.lines.map(line => {
          let defaultWarehouse = ''
          const itemData = itemsMap[line.component_code]
          if (itemData && itemData.default_warehouse) {
            defaultWarehouse = itemData.default_warehouse
          } else if (itemData && itemData.warehouse) {
            defaultWarehouse = itemData.warehouse
          }

          return {
            id: Date.now() + Math.random(),
            item_code: line.component_code,
            source_warehouse: defaultWarehouse,
            required_qty: line.quantity,
            transferred_qty: '0.000',
            consumed_qty: '0.000',
            returned_qty: '0.000'
          }
        })
        setRequiredItems(requiredItemsFromBOM)
      }

      if (bomData.operations && Array.isArray(bomData.operations)) {
        const operationsFromBOM = bomData.operations.map(op => ({
          id: Date.now() + Math.random(),
          operation: op.operation_name || op.operation,
          completed_qty: '0.000',
          process_loss_qty: '0.000',
          bom: bomData.bom_id,
          workstation: op.workstation || '',
          time: op.time || ''
        }))
        setOperationsData(operationsFromBOM)
      }

      setError(null)
    } catch (err) {
      console.error('Failed to fetch BOM details:', err)
      setError('Failed to fetch BOM details')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRequiredItem = () => {
    setRequiredItems([
      ...requiredItems,
      {
        id: Date.now(),
        item_code: '',
        source_warehouse: '',
        required_qty: '',
        transferred_qty: '0.000',
        consumed_qty: '0.000',
        returned_qty: '0.000'
      }
    ])
  }

  const handleRemoveRequiredItem = (id) => {
    setRequiredItems(requiredItems.filter(item => item.id !== id))
  }

  const handleRequiredItemChange = (id, field, value) => {
    setRequiredItems(requiredItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleAddOperation = () => {
    setOperationsData([
      ...operationsData,
      {
        id: Date.now(),
        operation: '',
        completed_qty: '0.000',
        process_loss_qty: '0.000',
        bom: '',
        workstation: '',
        time: ''
      }
    ])
  }

  const handleRemoveOperation = (id) => {
    setOperationsData(operationsData.filter(item => item.id !== id))
  }

  const handleOperationChange = (id, field, value) => {
    setOperationsData(operationsData.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.item_to_manufacture || !formData.bom_no || !formData.qty_to_manufacture) {
        throw new Error('Please fill all required fields')
      }

      const payload = {
        item_code: formData.item_to_manufacture,
        bom_no: formData.bom_no,
        quantity: parseFloat(formData.qty_to_manufacture),
        priority: formData.priority,
        notes: formData.notes,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        actual_start_date: formData.actual_start_date,
        actual_end_date: formData.actual_end_date,
        expected_delivery_date: formData.expected_delivery_date,
        required_items: requiredItems,
        operations: operationsData
      }

      if (id) {
        await productionService.updateWorkOrder(id, payload)
        setSuccess('Work order updated successfully')
      } else {
        await productionService.createWorkOrder(payload)
        setSuccess('Work order and job cards created successfully')
      }

      setTimeout(() => {
        navigate('/production/work-orders')
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to save work order')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'production-item', label: 'Production Item' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'operations', label: 'Operations' },
    { id: 'more-info', label: 'More Info' }
  ]

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📦 {id ? 'Edit' : 'Create'} Work Order</h1>
          <p className="header-subtitle">Create and manage manufacturing work orders</p>
        </div>
        <button onClick={() => navigate('/production/work-orders')} className="btn-cancel">
          <X size={18} /> Back
        </button>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">✕ {error}</div>}

      <form onSubmit={handleSubmit} className="pp-form">
        <div className="tabs-container">
          <div className="tabs-header">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tabs-content">
            {activeTab === 'production-item' && (
              <div className="tab-pane">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Series *</label>
                    <input type="text" name="series" value={formData.series} readOnly />
                  </div>
                  <div className="form-group">
                    <label>Company *</label>
                    <input type="text" name="company" value={formData.company}  />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Item To Manufacture *</label>
                    <select
                      name="item_to_manufacture"
                      value={formData.item_to_manufacture}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Item</option>
                      {items.map(item => (
                        <option key={item.item_code} value={item.item_code}>
                          {item.item_code} - {item.item_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Qty To Manufacture *</label>
                    <input
                      type="number"
                      name="qty_to_manufacture"
                      value={formData.qty_to_manufacture}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>BOM No *</label>
                    <select
                      name="bom_no"
                      value={formData.bom_no}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select BOM</option>
                      {bomsData.map(bom => (
                        <option key={bom.bom_id} value={bom.bom_id}>
                          {bom.bom_id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Project</label>
                    <input type="text" name="project" value={formData.project} onChange={handleInputChange} />
                  </div>
                </div>

                <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>Required Items</h3>
                    <button
                      type="button"
                      onClick={handleAddRequiredItem}
                      className="btn-submit"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      <Plus size={16} /> Add Row
                    </button>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="entries-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center' }}>
                            <input type="checkbox" />
                          </th>
                          <th style={{  textAlign: 'center' }}>No.</th>
                          <th >Item Code</th>
                          <th >Source Warehouse</th>
                          <th >Required Qty</th>
                          <th >Transferred Qty</th>
                          <th >Consumed Qty</th>
                          <th >Returned Qty</th>
                          <th style={{ width: '50px', textAlign: 'center' }}>
                            <Settings size={16} />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {requiredItems.length > 0 ? (
                          requiredItems.map((item, index) => (
                            <tr key={item.id}>
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" />
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                              <td>
                                <select
                                  value={item.item_code}
                                  onChange={(e) => handleRequiredItemChange(item.id, 'item_code', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                >
                                  <option value="">Select item</option>
                                  {items.map(itemOpt => (
                                    <option key={itemOpt.item_code} value={itemOpt.item_code}>
                                      {itemOpt.item_code} - {itemOpt.item_name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <select
                                  value={item.source_warehouse}
                                  onChange={(e) => handleRequiredItemChange(item.id, 'source_warehouse', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                >
                                  <option value="">Select warehouse</option>
                                  {warehouses.map(wh => (
                                    <option key={wh.value} value={wh.value}>
                                      {wh.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.required_qty}
                                  onChange={(e) => handleRequiredItemChange(item.id, 'required_qty', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.transferred_qty}
                                  onChange={(e) => handleRequiredItemChange(item.id, 'transferred_qty', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                  readOnly
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.consumed_qty}
                                  onChange={(e) => handleRequiredItemChange(item.id, 'consumed_qty', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                  readOnly
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={item.returned_qty}
                                  onChange={(e) => handleRequiredItemChange(item.id, 'returned_qty', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                  readOnly
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRequiredItem(item.id)}
                                  className="btn-delete"
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                              No items added yet. Click "Add Row" to add required items.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'configuration' && (
              <div className="tab-pane">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                  <div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="use_multi_level_bom"
                        checked={formData.use_multi_level_bom}
                        onChange={handleInputChange}
                      />
                      <span>Use Multi-Level BOM</span>
                    </label>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px', margin: '8px 0 0 0' }}>Plan material for sub-assemblies</p>
                  </div>
                  <div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="update_consumed_material_cost"
                        checked={formData.update_consumed_material_cost}
                        onChange={handleInputChange}
                      />
                      <span>Update Consumed Material Cost In Project</span>
                    </label>
                  </div>
                </div>

                <h3 style={{ marginBottom: '20px', fontSize: '1rem', fontWeight: '600' }}>Warehouse</h3>
                
                <div className="form-grid-2">
                  <div>
                    <SearchableSelect
                      label="Source Warehouse *"
                      value={formData.source_warehouse}
                      onChange={(value) => setFormData(prev => ({ ...prev, source_warehouse: value }))}
                      options={warehouses}
                      placeholder="Search warehouses..."
                      required
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>This is a location where raw materials are available.</p>
                  </div>
                  <div>
                    <SearchableSelect
                      label="Target Warehouse *"
                      value={formData.target_warehouse}
                      onChange={(value) => setFormData(prev => ({ ...prev, target_warehouse: value }))}
                      options={warehouses}
                      placeholder="Search warehouses..."
                      required
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>This is a location where final product stored.</p>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div>
                    <SearchableSelect
                      label="Work-in-Progress Warehouse *"
                      value={formData.wip_warehouse}
                      onChange={(value) => setFormData(prev => ({ ...prev, wip_warehouse: value }))}
                      options={warehouses}
                      placeholder="Search warehouses..."
                      required
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>This is a location where operations are executed.</p>
                  </div>
                  <div>
                    <SearchableSelect
                      label="Scrap Warehouse"
                      value={formData.scrap_warehouse}
                      onChange={(value) => setFormData(prev => ({ ...prev, scrap_warehouse: value }))}
                      options={warehouses}
                      placeholder="Search warehouses..."
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>This is a location where scraped materials are stored.</p>
                  </div>
                </div>

                <div style={{ marginTop: '30px' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="allow_alternative_item"
                      checked={formData.allow_alternative_item}
                      onChange={handleInputChange}
                    />
                    <span>Allow Alternative Item</span>
                  </label>
                  <label className="checkbox-label" style={{ marginTop: '15px' }}>
                    <input
                      type="checkbox"
                      name="skip_material_transfer_to_wip"
                      checked={formData.skip_material_transfer_to_wip}
                      onChange={handleInputChange}
                    />
                    <span>Skip Material Transfer to WIP Warehouse</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'operations' && (
              <div className="tab-pane">
                <h3 style={{ marginBottom: '20px' }}>Operations</h3>
                
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '500' }}>Operations</h4>
                    <button
                      type="button"
                      onClick={handleAddOperation}
                      className="btn-submit"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem' }}
                    >
                      <Plus size={16} /> Add Row
                    </button>
                  </div>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="entries-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '50px', textAlign: 'center' }}>
                            <input type="checkbox" />
                          </th>
                          <th style={{ width: '60px', textAlign: 'center' }}>No.</th>
                          <th >Operation <span style={{ color: '#dc2626' }}>*</span></th>
                          <th >Completed Qty</th>
                          <th >Process Loss Qty</th>
                          <th >BOM</th>
                          <th >Workstation</th>
                          <th style={{ minWidth: '100px' }}>Time <span style={{ color: '#dc2626' }}>*</span></th>
                          <th style={{ width: '50px', textAlign: 'center' }}>
                            <Settings size={16} />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {operationsData.length > 0 ? (
                          operationsData.map((op, index) => (
                            <tr key={op.id}>
                              <td style={{ textAlign: 'center' }}>
                                <input type="checkbox" />
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                              <td>
                                <input
                                  type="text"
                                  value={op.operation}
                                  onChange={(e) => handleOperationChange(op.id, 'operation', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="Enter operation"
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={op.completed_qty}
                                  onChange={(e) => handleOperationChange(op.id, 'completed_qty', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={op.process_loss_qty}
                                  onChange={(e) => handleOperationChange(op.id, 'process_loss_qty', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={op.bom}
                                  onChange={(e) => handleOperationChange(op.id, 'bom', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="Enter BOM"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={op.workstation}
                                  onChange={(e) => handleOperationChange(op.id, 'workstation', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="Enter workstation"
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={op.time}
                                  onChange={(e) => handleOperationChange(op.id, 'time', e.target.value)}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                                  placeholder="0.000"
                                  step="0.01"
                                  required
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOperation(op.id)}
                                  className="btn-delete"
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                              No operations added yet. Click "Add Row" to add operations.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <h3 style={{ marginBottom: '20px', marginTop: '40px' }}>Time</h3>
                
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Planned Start Date <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="datetime-local"
                      name="planned_start_date"
                      value={formData.planned_start_date}
                      onChange={handleInputChange}
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>Asia/Kolkata</p>
                  </div>
                  <div className="form-group">
                    <label>Actual Start Date</label>
                    <input
                      type="datetime-local"
                      name="actual_start_date"
                      value={formData.actual_start_date}
                      onChange={handleInputChange}
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>Asia/Kolkata</p>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Planned End Date</label>
                    <input
                      type="datetime-local"
                      name="planned_end_date"
                      value={formData.planned_end_date}
                      onChange={handleInputChange}
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>Asia/Kolkata</p>
                  </div>
                  <div className="form-group">
                    <label>Actual End Date</label>
                    <input
                      type="datetime-local"
                      name="actual_end_date"
                      value={formData.actual_end_date}
                      onChange={handleInputChange}
                    />
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>Asia/Kolkata</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    name="expected_delivery_date"
                    value={formData.expected_delivery_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            {activeTab === 'more-info' && (
              <div className="tab-pane">
                <div className="form-group">
                  <label>Priority</label>
                  <select name="priority" value={formData.priority} onChange={handleInputChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="6" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/production/work-orders')} className="btn-cancel">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-submit">
            <Save size={18} /> {loading ? 'Saving...' : 'Save Work Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
