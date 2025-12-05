import React, { useState, useEffect } from 'react'
import { AlertCircle, Plus, Trash2, X } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'

export default function CreateBOMModal({ isOpen, onClose, onSuccess, editingId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('production-item')
  const [formData, setFormData] = useState({
    bom_id: '',
    item_code: '',
    product_name: '',
    quantity: '1',
    uom: 'Kg',
    status: 'draft',
    revision: '1',
    description: '',
    is_active: true,
    is_default: false,
    allow_alternative_item: false,
    auto_sub_assembly_rate: false,
    project: '',
    cost_rate_based_on: 'Valuation Rate',
    currency: 'INR',
    with_operations: false,
    process_loss_percentage: '0'
  })
  const [bomLines, setBomLines] = useState([])
  const [operations, setOperations] = useState([])
  const [scrapItems, setScrapItems] = useState([])
  const [newLine, setNewLine] = useState({
    component_code: '',
    component_name: '',
    qty: '1',
    uom: 'Kg',
    type: 'raw-material',
    notes: ''
  })
  const [newOperation, setNewOperation] = useState({
    operation_name: '',
    workstation_type: '',
    operation_time: '0',
    fixed_time: '0',
    operating_cost: '0',
    notes: ''
  })
  const [newScrapItem, setNewScrapItem] = useState({
    item_code: '',
    item_name: '',
    quantity: '0',
    rate: '0'
  })

  useEffect(() => {
    if (isOpen) {
      fetchItems()
      if (editingId) {
        fetchBOMDetails(editingId)
      }
    }
  }, [isOpen, editingId])

  const fetchItems = async () => {
    try {
      const response = await productionService.getItemsList()
      setItems(response.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchBOMDetails = async (id) => {
    try {
      const response = await productionService.getBOMDetails(id)
      const bom = response.data
      setFormData({
        bom_id: bom.bom_id,
        item_code: bom.item_code,
        product_name: bom.product_name || '',
        quantity: bom.quantity || 1,
        uom: bom.uom || 'Kg',
        status: bom.status || 'draft',
        revision: bom.revision || 1,
        description: bom.description || '',
        is_active: bom.is_active !== false,
        is_default: bom.is_default === true,
        allow_alternative_item: bom.allow_alternative_item === true,
        auto_sub_assembly_rate: bom.auto_sub_assembly_rate === true,
        project: bom.project || '',
        cost_rate_based_on: bom.cost_rate_based_on || 'Valuation Rate',
        currency: bom.currency || 'INR',
        with_operations: bom.with_operations === true,
        process_loss_percentage: bom.process_loss_percentage || 0
      })
      setBomLines(bom.lines || [])
      setOperations(bom.operations || [])
      setScrapItems(bom.scrapItems || [])
    } catch (err) {
      setError('Failed to load BOM details')
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const handleLineChange = (e) => {
    const { name, value } = e.target
    setNewLine(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const addBomLine = () => {
    if (!newLine.component_code || !newLine.qty) {
      setError('Please fill component code and quantity')
      return
    }
    setBomLines([...bomLines, { ...newLine, id: Date.now() }])
    setNewLine({
      component_code: '',
      component_name: '',
      qty: '1',
      uom: 'Kg',
      type: 'raw-material',
      notes: ''
    })
  }

  const removeBomLine = (id) => {
    setBomLines(bomLines.filter(line => line.id !== id))
  }

  const addOperation = () => {
    if (!newOperation.operation_name) {
      setError('Please enter operation name')
      return
    }
    setOperations([...operations, { ...newOperation, id: Date.now() }])
    setNewOperation({
      operation_name: '',
      workstation_type: '',
      operation_time: '0',
      fixed_time: '0',
      operating_cost: '0',
      notes: ''
    })
  }

  const removeOperation = (id) => {
    setOperations(operations.filter(op => op.id !== id))
  }

  const addScrapItem = () => {
    if (!newScrapItem.item_code || !newScrapItem.quantity) {
      setError('Please fill item code and quantity')
      return
    }
    setScrapItems([...scrapItems, { ...newScrapItem, id: Date.now() }])
    setNewScrapItem({
      item_code: '',
      item_name: '',
      quantity: '0',
      rate: '0'
    })
  }

  const removeScrapItem = (id) => {
    setScrapItems(scrapItems.filter(item => item.id !== id))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.item_code || !formData.quantity || bomLines.length === 0) {
        throw new Error('Please fill all required fields and add at least one component')
      }

      const payload = {
        ...formData,
        lines: bomLines,
        operations: operations,
        scrapItems: scrapItems,
        quantity: parseFloat(formData.quantity),
        revision: parseInt(formData.revision),
        process_loss_percentage: parseFloat(formData.process_loss_percentage)
      }

      if (editingId) {
        await productionService.updateBOM(editingId, payload)
      } else {
        await productionService.createBOM(payload)
      }

      setBomLines([])
      setOperations([])
      setScrapItems([])
      setFormData({
        bom_id: '',
        item_code: '',
        product_name: '',
        quantity: '1',
        uom: 'Kg',
        status: 'draft',
        revision: '1',
        description: '',
        is_active: true,
        is_default: false,
        allow_alternative_item: false,
        auto_sub_assembly_rate: false,
        project: '',
        cost_rate_based_on: 'Valuation Rate',
        currency: 'INR',
        with_operations: false,
        process_loss_percentage: '0'
      })
      setActiveTab('production-item')

      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create BOM')
    } finally {
      setLoading(false)
    }
  }

  const tabStyle = {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s ease'
  }

  const tabs = [
    { id: 'production-item', label: 'Production Item', icon: '📦' },
    { id: 'operations', label: 'Operations', icon: '⚙️' },
    { id: 'scrap', label: 'Scrap & Process Loss', icon: '♻️' },
    { id: 'more-info', label: 'More Info', icon: 'ℹ️' },
    { id: 'website', label: 'Website', icon: '🌐' }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingId ? '✏️ Edit BOM' : '📋 Create New BOM'} size="xl">
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px 16px',
            marginBottom: '15px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '15px', display: 'flex', gap: '0' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...tabStyle,
                borderBottomColor: activeTab === tab.id ? '#f59e0b' : 'transparent',
                color: activeTab === tab.id ? '#f59e0b' : '#666'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '15px' }}>
          {activeTab === 'production-item' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Item Code *</label>
                  <select name="item_code" value={formData.item_code} onChange={handleInputChange} required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <option value="">Select Item</option>
                    {items.map(item => (
                      <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Product Name</label>
                  <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} placeholder="Product name" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Quantity *</label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} step="0.01" required style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>UOM</label>
                  <input type="text" name="uom" value={formData.uom} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Revision</label>
                  <input type="number" name="revision" value={formData.revision} onChange={handleInputChange} step="1" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="BOM description" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} />
              </div>

              <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '4px', marginBottom: '15px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.9rem' }}>Product Options</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Is Active</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({...formData, is_default: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Is Default</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.allow_alternative_item} onChange={(e) => setFormData({...formData, allow_alternative_item: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Allow Alternative Item</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={formData.auto_sub_assembly_rate} onChange={(e) => setFormData({...formData, auto_sub_assembly_rate: e.target.checked})} />
                    <span style={{ fontSize: '0.9rem' }}>Set rate of sub-assembly item based on BOM</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Project</label>
                  <input type="text" name="project" value={formData.project} onChange={handleInputChange} placeholder="Project (optional)" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Currency</label>
                  <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Cost Rate Based On</label>
                <select name="cost_rate_based_on" value={formData.cost_rate_based_on} onChange={handleInputChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="Valuation Rate">Valuation Rate</option>
                  <option value="Standard Rate">Standard Rate</option>
                  <option value="Average Rate">Average Rate</option>
                </select>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '0.9rem' }}>BOM Components</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.5fr 0.6fr 1fr 0.4fr', gap: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Component Code *</label>
                  <select name="component_code" value={newLine.component_code} onChange={handleLineChange} style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Select</option>
                    {items.map(item => (
                      <option key={item.code} value={item.code}>{item.code} - {item.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Name</label>
                  <input type="text" name="component_name" value={newLine.component_name} onChange={handleLineChange} placeholder="Auto-fill" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Qty *</label>
                  <input type="number" name="qty" value={newLine.qty} onChange={handleLineChange} step="0.01" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>UOM</label>
                  <input type="text" name="uom" value={newLine.uom} onChange={handleLineChange} style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Type</label>
                  <select name="type" value={newLine.type} onChange={handleLineChange} style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="raw-material">Raw Material</option>
                    <option value="sub-assembly">Sub-assembly</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </div>
                <button type="button" onClick={addBomLine} style={{ alignSelf: 'flex-end', background: '#10b981', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}>
                  <Plus size={12} /> Add
                </button>
              </div>

              {bomLines.length > 0 && (
                <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>Added: {bomLines.length}</div>
                  {bomLines.map((line) => (
                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <span>{line.component_code} - {line.qty} {line.uom}</span>
                      <button type="button" onClick={() => removeBomLine(line.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'operations' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '15px' }}>
                <input type="checkbox" checked={formData.with_operations} onChange={(e) => setFormData({...formData, with_operations: e.target.checked})} />
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>With Operations</span>
              </label>

              <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.9rem' }}>Operations</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 0.8fr 0.8fr 1fr 0.4fr', gap: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Operation Name *</label>
                  <input type="text" name="operation_name" value={newOperation.operation_name} onChange={(e) => setNewOperation({...newOperation, operation_name: e.target.value})} placeholder="Operation name" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Workstation Type</label>
                  <input type="text" name="workstation_type" value={newOperation.workstation_type} onChange={(e) => setNewOperation({...newOperation, workstation_type: e.target.value})} placeholder="Workstation" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Op Time</label>
                  <input type="number" name="operation_time" value={newOperation.operation_time} onChange={(e) => setNewOperation({...newOperation, operation_time: e.target.value})} step="0.01" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Fixed Time</label>
                  <input type="number" name="fixed_time" value={newOperation.fixed_time} onChange={(e) => setNewOperation({...newOperation, fixed_time: e.target.value})} step="0.01" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Op Cost</label>
                  <input type="number" name="operating_cost" value={newOperation.operating_cost} onChange={(e) => setNewOperation({...newOperation, operating_cost: e.target.value})} step="0.01" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <button type="button" onClick={addOperation} style={{ alignSelf: 'flex-end', background: '#10b981', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <Plus size={12} />
                </button>
              </div>

              {operations.length > 0 && (
                <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>Added: {operations.length}</div>
                  {operations.map((op) => (
                    <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <span>{op.operation_name} - {op.workstation_type}</span>
                      <button type="button" onClick={() => removeOperation(op.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'scrap' && (
            <div>
              <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '0.9rem' }}>Scrap Items</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.6fr 0.6fr 0.4fr', gap: '8px', marginBottom: '10px', fontSize: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Item Code *</label>
                  <select name="item_code" value={newScrapItem.item_code} onChange={(e) => setNewScrapItem({...newScrapItem, item_code: e.target.value})} style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <option value="">Select</option>
                    {items.map(item => (
                      <option key={item.code} value={item.code}>{item.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Item Name</label>
                  <input type="text" name="item_name" value={newScrapItem.item_name} onChange={(e) => setNewScrapItem({...newScrapItem, item_name: e.target.value})} placeholder="Item name" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Qty *</label>
                  <input type="number" name="quantity" value={newScrapItem.quantity} onChange={(e) => setNewScrapItem({...newScrapItem, quantity: e.target.value})} step="0.01" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: '600' }}>Rate</label>
                  <input type="number" name="rate" value={newScrapItem.rate} onChange={(e) => setNewScrapItem({...newScrapItem, rate: e.target.value})} step="0.01" style={{ width: '100%', padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem' }} />
                </div>
                <button type="button" onClick={addScrapItem} style={{ alignSelf: 'flex-end', background: '#10b981', color: 'white', border: 'none', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <Plus size={12} />
                </button>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '6px', fontSize: '0.9rem' }}>Process Loss %</label>
                <input type="number" name="process_loss_percentage" value={formData.process_loss_percentage} onChange={handleInputChange} step="0.01" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              {scrapItems.length > 0 && (
                <div style={{ background: '#f9fafb', padding: '10px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>Added: {scrapItems.length}</div>
                  {scrapItems.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #e5e7eb' }}>
                      <span>{item.item_code} - {item.quantity}</span>
                      <button type="button" onClick={() => removeScrapItem(item.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '2px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'more-info' && (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '0.9rem' }}>Additional information fields can be added here</p>
            </div>
          )}

          {activeTab === 'website' && (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px 20px' }}>
              <p style={{ fontSize: '0.9rem' }}>Website-related fields can be added here</p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '15px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', background: '#f3f4f6', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
            {loading ? 'Saving...' : editingId ? 'Update BOM' : 'Create BOM'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
