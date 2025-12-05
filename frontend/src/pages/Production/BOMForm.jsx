import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Plus, Trash2, X, ChevronRight, Save, RotateCcw } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

export default function BOMForm() {
  const { id } = useParams()
  const navigate = useNavigate()
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
    process_loss_percentage: '0',
    transfer_material_against: 'Work Order',
    routing: ''
  })
  const [bomLines, setBomLines] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [operations, setOperations] = useState([])
  const [scrapItems, setScrapItems] = useState([])
  const [newLine, setNewLine] = useState({
    component_code: '',
    component_name: '',
    qty: '1',
    uom: 'Kg',
    type: 'raw-material',
    rate: '0',
    notes: ''
  })
  const [editingLineId, setEditingLineId] = useState(null)
  const [inlineManualEntry, setInlineManualEntry] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const [operationsList, setOperationsList] = useState([])
  const [workstationsList, setWorkstationsList] = useState([])
  const [operationDropdownOpen, setOperationDropdownOpen] = useState(false)
  const [operationDropdownSearch, setOperationDropdownSearch] = useState('')
  const [operationManualEntry, setOperationManualEntry] = useState(false)
  const [workstationDropdownOpen, setWorkstationDropdownOpen] = useState(false)
  const [workstationDropdownSearch, setWorkstationDropdownSearch] = useState('')
  const [workstationManualEntry, setWorkstationManualEntry] = useState(false)
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
  const [manualEntry, setManualEntry] = useState({
    itemCode: false,
    componentCode: false,
    scrapItemCode: false
  })

  useEffect(() => {
    fetchItems()
    fetchOperations()
    fetchWorkstations()
    if (id) {
      fetchBOMDetails(id)
    }
  }, [id])

  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null)
      setOperationDropdownOpen(false)
      setWorkstationDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchItems = async () => {
    try {
      const response = await productionService.getItemsList()
      setItems(response.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchOperations = async () => {
    try {
      const response = await productionService.getOperationsList()
      setOperationsList(response.data || [])
    } catch (err) {
      console.error('Failed to fetch operations:', err)
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await productionService.getWorkstationsList()
      setWorkstationsList(response.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    try {
      const response = await productionService.getBOMDetails(bomId)
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
      setRawMaterials(bom.rawMaterials || [])
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

    if (name === 'item_code' && !manualEntry.itemCode) {
      const selectedItem = items.find(item => item.item_code === value)
      if (selectedItem && !formData.product_name) {
        setFormData(prev => ({
          ...prev,
          product_name: selectedItem.name
        }))
      }
    }
  }

  const handleLineChange = (e) => {
    const { name, value } = e.target
    setNewLine(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'component_code' && !manualEntry.componentCode) {
      const selectedItem = items.find(item => item.item_code === value)
      if (selectedItem) {
        setNewLine(prev => ({
          ...prev,
          component_name: selectedItem.name
        }))
      }
    }
  }

  const handleScrapItemChange = (e) => {
    const { name, value } = e.target
    setNewScrapItem(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'item_code' && !manualEntry.scrapItemCode) {
      const selectedItem = items.find(item => item.item_code === value)
      if (selectedItem) {
        setNewScrapItem(prev => ({
          ...prev,
          item_name: selectedItem.name
        }))
      }
    }
  }

  const addBomLine = () => {
    if (!newLine.component_code || !newLine.qty) {
      setError('Please fill component code and quantity')
      return
    }
    const amount = (parseFloat(newLine.qty) || 0) * (parseFloat(newLine.rate) || 0)
    setBomLines([...bomLines, { ...newLine, id: Date.now(), amount }])
    setNewLine({
      component_code: '',
      component_name: '',
      qty: '1',
      uom: 'Kg',
      type: 'raw-material',
      rate: '0',
      notes: ''
    })
  }

  const removeBomLine = (lineId) => {
    setBomLines(bomLines.filter(line => line.id !== lineId))
  }

  const updateBomLine = (lineId, field, value) => {
    setBomLines(bomLines.map(line => {
      if (line.id === lineId) {
        const updated = { ...line, [field]: value }
        if (field === 'qty' || field === 'rate') {
          updated.amount = (parseFloat(updated.qty) || 0) * (parseFloat(updated.rate) || 0)
        }
        return updated
      }
      return line
    }))
  }

  const removeRawMaterial = (materialId) => {
    setRawMaterials(rawMaterials.filter(material => material.id !== materialId))
  }

  const updateRawMaterial = (materialId, field, value) => {
    setRawMaterials(rawMaterials.map(material => {
      if (material.id === materialId) {
        const updated = { ...material, [field]: value }
        if (field === 'qty' || field === 'rate') {
          updated.amount = (parseFloat(updated.qty) || 0) * (parseFloat(updated.rate) || 0)
        }
        return updated
      }
      return material
    }))
  }

  const addNewRawMaterial = () => {
    const newId = Date.now()
    setRawMaterials([...rawMaterials, {
      id: newId,
      item_code: '',
      qty: '',
      uom: 'Kg',
      rate: '',
      amount: 0
    }])
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

  const removeOperation = (opId) => {
    setOperations(operations.filter(op => op.id !== opId))
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

  const removeScrapItem = (itemId) => {
    setScrapItems(scrapItems.filter(item => item.id !== itemId))
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
        rawMaterials: rawMaterials,
        operations: operations,
        scrapItems: scrapItems,
        quantity: parseFloat(formData.quantity),
        revision: parseInt(formData.revision),
        process_loss_percentage: parseFloat(formData.process_loss_percentage)
      }

      if (id) {
        await productionService.updateBOM(id, payload)
      } else {
        await productionService.createBOM(payload)
      }

      navigate('/production/boms', { state: { success: id ? 'BOM updated successfully' : 'BOM created successfully' } })
    } catch (err) {
      setError(err.message || 'Failed to save BOM')
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

  const styles = {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px',
      borderBottom: '3px solid #f59e0b',
      paddingBottom: '20px'
    },
    headerTitle: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#1f2937'
    },
    headerSubtitle: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '5px'
    },
    tabsContainer: {
      display: 'flex',
      gap: '10px',
      marginBottom: '30px',
      borderBottom: '2px solid #e5e7eb'
    },
    tabButton: (isActive) => ({
      padding: '12px 20px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontWeight: isActive ? '700' : '600',
      fontSize: '14px',
      color: isActive ? '#f59e0b' : '#6b7280',
      borderBottom: isActive ? '3px solid #f59e0b' : 'none',
      transition: 'all 0.3s ease'
    }),
    form: {
      background: 'white',
      borderRadius: '12px',
      padding: '30px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    section: {
      marginBottom: '30px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#1f2937',
      marginBottom: '20px',
      paddingBottom: '10px',
      borderBottom: '2px solid #f3f4f6'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '20px'
    },
    gridFull: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '20px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      fontSize: '13px',
      fontWeight: '700',
      color: '#374151',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    input: {
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'border-color 0.3s'
    },
    select: {
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
      background: 'white',
      cursor: 'pointer'
    },
    textarea: {
      padding: '10px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'inherit',
      minHeight: '80px'
    },
    checkboxGroup: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '15px'
    },
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: '13px'
    },
    tableRow: {
      borderBottom: '1px solid #e5e7eb'
    },
    tableCell: {
      padding: '12px',
      textAlign: 'left'
    },
    tableHeader: {
      background: '#f9fafb',
      fontWeight: '700',
      color: '#374151'
    },
    button: {
      padding: '10px 16px',
      borderRadius: '6px',
      border: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'all 0.3s ease'
    },
    buttonPrimary: {
      background: '#f59e0b',
      color: 'white'
    },
    buttonSecondary: {
      background: '#e5e7eb',
      color: '#374151'
    },
    addButton: {
      background: '#10b981',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    deleteButton: {
      background: '#ef4444',
      color: 'white'
    },
    toggleButton: {
      background: '#dbeafe',
      color: '#0c4a6e',
      padding: '6px 12px',
      fontSize: '12px',
      border: '1px solid #0284c7'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      borderTop: '2px solid #e5e7eb',
      paddingTop: '20px',
      marginTop: '30px'
    },
    errorBox: {
      background: '#fee2e2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      padding: '12px 16px',
      marginBottom: '20px',
      color: '#dc2626',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    inputWrapper: {
      display: 'flex',
      gap: '8px',
      alignItems: 'flex-end'
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>{id ? '✏️ Edit BOM' : '📋 Create New BOM'}</h1>
          <p style={styles.headerSubtitle}>{id ? 'Modify bill of materials details' : 'Create a new bill of materials for your products'}</p>
        </div>
        <button 
          type="button" 
          onClick={() => navigate('/production/boms')} 
          style={{...styles.button, ...styles.buttonSecondary}}
        >
          ← Back
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div style={styles.tabsContainer}>
          {tabs.map(tab => (
            <button 
              key={tab.id} 
              type="button" 
              onClick={() => setActiveTab(tab.id)} 
              style={styles.tabButton(activeTab === tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'production-item' && (
            <div>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>📦 Product Information</div>
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                      <label style={styles.label}>Item Code *</label>
                      <button 
                        type="button"
                        onClick={() => setManualEntry({...manualEntry, itemCode: !manualEntry.itemCode})}
                        style={{...styles.button, ...styles.toggleButton}}
                      >
                        {manualEntry.itemCode ? '📋 Select' : '✏️ Manual'}
                      </button>
                    </div>
                    {manualEntry.itemCode ? (
                      <input 
                        type="text" 
                        name="item_code" 
                        value={formData.item_code} 
                        onChange={handleInputChange} 
                        placeholder="Enter item code manually" 
                        required 
                        style={styles.input} 
                      />
                    ) : (
                      <select name="item_code" value={formData.item_code} onChange={handleInputChange} required style={styles.select}>
                        <option value="">Select Item</option>
                        {items.map(item => (<option key={item.item_code} value={item.item_code}>{item.item_code} - {item.name}</option>))}
                      </select>
                    )}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Product Name</label>
                    <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} placeholder="e.g., Aluminum Frame A1" style={styles.input} />
                  </div>
                </div>

                <div style={{...styles.grid, gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '20px'}}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Quantity *</label>
                    <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} step="0.01" required style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>UOM</label>
                    <input type="text" name="uom" value={formData.uom} onChange={handleInputChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} style={styles.select}>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Revision</label>
                    <input type="number" name="revision" value={formData.revision} onChange={handleInputChange} step="1" style={styles.input} />
                  </div>
                </div>

                <div style={{marginTop: '20px'}}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Add BOM description and notes..." style={styles.textarea} />
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <div style={styles.sectionTitle}>⚙️ Configuration Options</div>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkbox}>
                    <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} />
                    <span>Is Active</span>
                  </label>
                  <label style={styles.checkbox}>
                    <input type="checkbox" checked={formData.is_default} onChange={(e) => setFormData({...formData, is_default: e.target.checked})} />
                    <span>Is Default</span>
                  </label>
                  <label style={styles.checkbox}>
                    <input type="checkbox" checked={formData.allow_alternative_item} onChange={(e) => setFormData({...formData, allow_alternative_item: e.target.checked})} />
                    <span>Allow Alternative Item</span>
                  </label>
                  <label style={styles.checkbox}>
                    <input type="checkbox" checked={formData.auto_sub_assembly_rate} onChange={(e) => setFormData({...formData, auto_sub_assembly_rate: e.target.checked})} />
                    <span>Auto Sub-assembly Rate</span>
                  </label>
                </div>
              </div>

              <div style={styles.section}>
                <div style={styles.sectionTitle}>💰 Costing Details</div>
                <div style={styles.grid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Project</label>
                    <input type="text" name="project" value={formData.project} onChange={handleInputChange} placeholder="Optional project reference" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Currency</label>
                    <input type="text" name="currency" value={formData.currency} onChange={handleInputChange} style={styles.input} />
                  </div>
                </div>
                <div style={{marginTop: '20px'}}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Cost Rate Based On</label>
                    <select name="cost_rate_based_on" value={formData.cost_rate_based_on} onChange={handleInputChange} style={styles.select}>
                      <option value="Valuation Rate">Valuation Rate</option>
                      <option value="Standard Rate">Standard Rate</option>
                      <option value="Average Rate">Average Rate</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.section}>
                <div style={styles.sectionTitle}>📋 BOM Components</div>
                <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'flex-end'}}>
                  <div style={styles.formGroup}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                      <label style={styles.label}>Item Code *</label>
                      <button 
                        type="button"
                        onClick={() => setManualEntry({...manualEntry, componentCode: !manualEntry.componentCode})}
                        style={{...styles.button, ...styles.toggleButton, fontSize: '11px', padding: '4px 8px'}}
                      >
                        {manualEntry.componentCode ? '📋' : '✏️'}
                      </button>
                    </div>
                    {manualEntry.componentCode ? (
                      <input 
                        type="text" 
                        name="component_code" 
                        value={newLine.component_code} 
                        onChange={handleLineChange} 
                        placeholder="Enter code" 
                        style={styles.input} 
                      />
                    ) : (
                      <select name="component_code" value={newLine.component_code} onChange={handleLineChange} style={styles.select}>
                        <option value="">Select</option>
                        {items.map(item => (<option key={item.item_code} value={item.item_code}>{item.item_code}</option>))}
                      </select>
                    )}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Qty *</label>
                    <input type="number" name="qty" value={newLine.qty} onChange={handleLineChange} step="0.01" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>UOM</label>
                    <input type="text" name="uom" value={newLine.uom} onChange={handleLineChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rate (INR) *</label>
                    <input type="number" name="rate" value={newLine.rate} onChange={handleLineChange} step="0.01" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Type</label>
                    <select name="type" value={newLine.type} onChange={handleLineChange} style={styles.select}>
                      <option value="raw-material">Raw Material</option>
                      <option value="sub-assembly">Sub-assembly</option>
                      <option value="consumable">Consumable</option>
                    </select>
                  </div>
                  <button type="button" onClick={addBomLine} style={{...styles.button, ...styles.addButton, height: '38px'}}>
                    <Plus size={16} /> Add
                  </button>
                </div>

                {bomLines.length > 0 && (
                  <div style={{background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '15px', overflowX: 'auto'}}>
                    <div style={{fontWeight: '700', marginBottom: '12px', color: '#15803d'}}>✓ {bomLines.length} component{bomLines.length > 1 ? 's' : ''} added</div>
                    <table style={{...styles.table, minWidth: '100%'}}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={{...styles.tableCell, width: '40px', textAlign: 'center'}}>No.</th>
                          <th style={styles.tableCell}>Item Code</th>
                          <th style={styles.tableCell}>Qty</th>
                          <th style={styles.tableCell}>UOM</th>
                          <th style={{...styles.tableCell, textAlign: 'right'}}>Rate (INR)</th>
                          <th style={{...styles.tableCell, textAlign: 'right'}}>Amount (INR)</th>
                          <th style={{...styles.tableCell, width: '50px', textAlign: 'center'}}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bomLines.map((line, index) => (
                          <tr key={line.id} style={{...styles.tableRow, backgroundColor: editingLineId === line.id ? '#fef3c7' : (index % 2 === 0 ? '#ffffff' : '#f9fafb')}}>
                            <td style={{...styles.tableCell, width: '40px', textAlign: 'center', fontWeight: '500'}}>{index + 1}</td>
                            <td style={{...styles.tableCell, cursor: 'pointer'}} onClick={() => setEditingLineId(line.id)}>
                              {editingLineId === line.id ? (
                                <input 
                                  type="text" 
                                  value={line.component_code}
                                  onChange={(e) => updateBomLine(line.id, 'component_code', e.target.value)}
                                  placeholder="Item code"
                                  style={{...styles.input, fontSize: '13px', padding: '6px'}}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div>{line.component_code}</div>
                              )}
                            </td>
                            <td style={{...styles.tableCell, cursor: 'pointer', textAlign: 'right'}} onClick={() => setEditingLineId(line.id)}>
                              {editingLineId === line.id ? (
                                <input 
                                  type="number" 
                                  value={line.qty}
                                  onChange={(e) => updateBomLine(line.id, 'qty', e.target.value)}
                                  step="0.01"
                                  style={{...styles.input, width: '100%', textAlign: 'right', fontSize: '13px', padding: '6px'}}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div>{parseFloat(line.qty || 0).toFixed(3)}</div>
                              )}
                            </td>
                            <td style={{...styles.tableCell, cursor: 'pointer'}} onClick={() => setEditingLineId(line.id)}>
                              {editingLineId === line.id ? (
                                <select 
                                  value={line.uom}
                                  onChange={(e) => updateBomLine(line.id, 'uom', e.target.value)}
                                  style={{...styles.select, width: '100%', fontSize: '13px'}}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <option value="Kg">Kg</option>
                                  <option value="Pc">Pc</option>
                                  <option value="Meter">Meter</option>
                                  <option value="Liter">Liter</option>
                                  <option value="Box">Box</option>
                                </select>
                              ) : (
                                <div>{line.uom}</div>
                              )}
                            </td>
                            <td style={{...styles.tableCell, cursor: 'pointer', textAlign: 'right'}} onClick={() => setEditingLineId(line.id)}>
                              {editingLineId === line.id ? (
                                <input 
                                  type="number" 
                                  value={line.rate}
                                  onChange={(e) => updateBomLine(line.id, 'rate', e.target.value)}
                                  step="0.01"
                                  style={{...styles.input, width: '100%', textAlign: 'right', fontSize: '13px', padding: '6px'}}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <div>₹ {parseFloat(line.rate || 0).toFixed(2)}</div>
                              )}
                            </td>
                            <td style={{...styles.tableCell, textAlign: 'right'}}>₹ {parseFloat(line.amount || 0).toFixed(2)}</td>
                            <td style={{...styles.tableCell, textAlign: 'center'}}>
                              <button type="button" onClick={() => removeBomLine(line.id)} style={{...styles.button, background: '#fee2e2', color: '#dc2626', padding: '6px 10px'}}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'operations' && (
            <div>
              <div style={styles.section}>
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
                <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end'}}>
                  <div style={{...styles.formGroup, position: 'relative'}}>
                    <label style={styles.label}>Operation Name *</label>
                    <div style={{display: 'flex', gap: '4px'}}>
                      {operationManualEntry ? (
                        <input 
                          type="text" 
                          value={newOperation.operation_name}
                          onChange={(e) => setNewOperation({...newOperation, operation_name: e.target.value})}
                          placeholder="Enter operation name"
                          style={{...styles.input, flex: 1}}
                        />
                      ) : (
                        <div style={{flex: 1, position: 'relative'}} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={operationDropdownOpen ? operationDropdownSearch : newOperation.operation_name}
                            onChange={(e) => {
                              setOperationDropdownSearch(e.target.value)
                              if (!operationDropdownOpen) setOperationDropdownOpen(true)
                            }}
                            onFocus={() => setOperationDropdownOpen(true)}
                            placeholder="Operation Name"
                            style={{...styles.input, width: '100%'}}
                            onClick={(e) => {e.stopPropagation(); setOperationDropdownOpen(true)}}
                          />
                          {operationDropdownOpen && (
                            <div onClick={(e) => e.stopPropagation()} style={{position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', zIndex: 9999, marginTop: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '300px'}}>
                              {operationsList.filter(op => 
                                op.name.toLowerCase().includes(operationDropdownSearch.toLowerCase())
                              ).map(op => (
                                <div 
                                  key={op.name}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setNewOperation({...newOperation, operation_name: op.name})
                                    setOperationDropdownOpen(false)
                                    setOperationDropdownSearch('')
                                  }}
                                  style={{padding: '10px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.15s'}}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                                >
                                  <div style={{fontWeight: '600', fontSize: '13px', color: '#1f2937'}}>{op.name}</div>
                                  <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>{op.operation_details || ''}</div>
                                </div>
                              ))}
                              {operationsList.filter(op => 
                                op.name.toLowerCase().includes(operationDropdownSearch.toLowerCase())
                              ).length === 0 && (
                                <div style={{padding: '10px 12px', textAlign: 'center', color: '#6b7280', fontSize: '13px'}}>
                                  No operations found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setOperationManualEntry(!operationManualEntry)
                          setOperationDropdownOpen(false)
                          setOperationDropdownSearch('')
                        }}
                        style={{...styles.button, ...styles.toggleButton, fontSize: '10px', padding: '4px 6px'}}
                      >
                        {operationManualEntry ? '📋' : '✏️'}
                      </button>
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Workstation Type</label>
                    <div style={{display: 'flex', gap: '8px'}}>
                      {!workstationManualEntry ? (
                        <div style={{flex: 1, position: 'relative'}} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={workstationDropdownOpen ? workstationDropdownSearch : newOperation.workstation_type}
                            onChange={(e) => {
                              setWorkstationDropdownSearch(e.target.value)
                              if (!workstationDropdownOpen) setWorkstationDropdownOpen(true)
                            }}
                            onFocus={() => setWorkstationDropdownOpen(true)}
                            placeholder="Select Workstation"
                            style={{...styles.input, width: '100%'}}
                            onClick={(e) => {e.stopPropagation(); setWorkstationDropdownOpen(true)}}
                          />
                          {workstationDropdownOpen && (
                            <div onClick={(e) => e.stopPropagation()} style={{position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', zIndex: 9999, marginTop: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '300px'}}>
                              {workstationsList.filter(ws => 
                                ws.name.toLowerCase().includes(workstationDropdownSearch.toLowerCase()) ||
                                ws.workstation_name.toLowerCase().includes(workstationDropdownSearch.toLowerCase())
                              ).map(ws => (
                                <div 
                                  key={ws.name}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setNewOperation({...newOperation, workstation_type: ws.name})
                                    setWorkstationDropdownOpen(false)
                                    setWorkstationDropdownSearch('')
                                  }}
                                  style={{padding: '10px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.15s'}}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                                >
                                  <div style={{fontWeight: '600', fontSize: '13px', color: '#1f2937'}}>{ws.name}</div>
                                  <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>{ws.workstation_name || ''}</div>
                                </div>
                              ))}
                              {workstationsList.filter(ws => 
                                ws.name.toLowerCase().includes(workstationDropdownSearch.toLowerCase()) ||
                                ws.workstation_name.toLowerCase().includes(workstationDropdownSearch.toLowerCase())
                              ).length === 0 && (
                                <div style={{padding: '10px 12px', textAlign: 'center', color: '#6b7280', fontSize: '13px'}}>
                                  No workstations found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input type="text" name="workstation_type" value={newOperation.workstation_type} onChange={(e) => setNewOperation({...newOperation, workstation_type: e.target.value})} placeholder="e.g., Lathe, Press" style={{...styles.input, flex: 1}} />
                      )}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          setWorkstationManualEntry(!workstationManualEntry)
                          setWorkstationDropdownOpen(false)
                          setWorkstationDropdownSearch('')
                        }}
                        style={{...styles.button, ...styles.toggleButton, fontSize: '10px', padding: '4px 6px'}}
                      >
                        {workstationManualEntry ? '📋' : '✏️'}
                      </button>
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Op Time (min)</label>
                    <input type="number" name="operation_time" value={newOperation.operation_time} onChange={(e) => setNewOperation({...newOperation, operation_time: e.target.value})} step="0.01" placeholder="Time in minutes" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Fixed Time (min)</label>
                    <input type="number" name="fixed_time" value={newOperation.fixed_time} onChange={(e) => setNewOperation({...newOperation, fixed_time: e.target.value})} step="0.01" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Op Cost</label>
                    <input type="number" name="operating_cost" value={newOperation.operating_cost} onChange={(e) => setNewOperation({...newOperation, operating_cost: e.target.value})} step="0.01" style={styles.input} />
                  </div>
                  <button type="button" onClick={addOperation} style={{...styles.button, ...styles.addButton, height: '38px'}}>
                    <Plus size={16} /> Add
                  </button>
                </div>

                {operations.length > 0 && (
                  <div style={{background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '15px'}}>
                    <div style={{fontWeight: '700', marginBottom: '12px', color: '#92400e'}}>⚙️ {operations.length} operation{operations.length > 1 ? 's' : ''} added</div>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.tableCell}>Operation</th>
                          <th style={styles.tableCell}>Workstation</th>
                          <th style={styles.tableCell}>Op Time</th>
                          <th style={styles.tableCell}>Fixed Time</th>
                          <th style={styles.tableCell}>Cost</th>
                          <th style={{...styles.tableCell, width: '50px', textAlign: 'center'}}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operations.map((op) => (
                          <tr key={op.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>{op.operation_name}</td>
                            <td style={styles.tableCell}>{op.workstation_type || '-'}</td>
                            <td style={styles.tableCell}>{op.operation_time} min</td>
                            <td style={styles.tableCell}>{op.fixed_time} min</td>
                            <td style={styles.tableCell}>₹{parseFloat(op.operating_cost).toFixed(2)}</td>
                            <td style={{...styles.tableCell, textAlign: 'center'}}>
                              <button type="button" onClick={() => removeOperation(op.id)} style={{...styles.button, background: '#fee2e2', color: '#dc2626', padding: '6px 10px'}}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'scrap' && (
            <div>
              <div style={styles.section}>
                <div style={styles.sectionTitle}>♻️ Scrap & Process Loss Management</div>
                <div style={{marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'flex-end'}}>
                  <div style={styles.formGroup}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                      <label style={styles.label}>Item Code *</label>
                      <button 
                        type="button"
                        onClick={() => setManualEntry({...manualEntry, scrapItemCode: !manualEntry.scrapItemCode})}
                        style={{...styles.button, ...styles.toggleButton, fontSize: '11px', padding: '4px 8px'}}
                      >
                        {manualEntry.scrapItemCode ? '📋' : '✏️'}
                      </button>
                    </div>
                    {manualEntry.scrapItemCode ? (
                      <input 
                        type="text" 
                        name="item_code" 
                        value={newScrapItem.item_code} 
                        onChange={handleScrapItemChange} 
                        placeholder="Enter code" 
                        style={styles.input} 
                      />
                    ) : (
                      <select name="item_code" value={newScrapItem.item_code} onChange={handleScrapItemChange} style={styles.select}>
                        <option value="">Select Item</option>
                        {items.map(item => (<option key={item.item_code} value={item.item_code}>{item.item_code}</option>))}
                      </select>
                    )}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Item Name</label>
                    <input type="text" name="item_name" value={newScrapItem.item_name} onChange={handleScrapItemChange} placeholder="Auto-fill or enter" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Qty *</label>
                    <input type="number" name="quantity" value={newScrapItem.quantity} onChange={handleScrapItemChange} step="0.01" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Rate</label>
                    <input type="number" name="rate" value={newScrapItem.rate} onChange={handleScrapItemChange} step="0.01" style={styles.input} />
                  </div>
                  <button type="button" onClick={addScrapItem} style={{...styles.button, ...styles.addButton, height: '38px'}}>
                    <Plus size={16} /> Add
                  </button>
                </div>

                {scrapItems.length > 0 && (
                  <div style={{background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '15px', marginBottom: '20px'}}>
                    <div style={{fontWeight: '700', marginBottom: '12px', color: '#be185d'}}>♻️ {scrapItems.length} scrap item{scrapItems.length > 1 ? 's' : ''} tracked</div>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.tableCell}>Item Code</th>
                          <th style={styles.tableCell}>Quantity</th>
                          <th style={styles.tableCell}>Rate</th>
                          <th style={styles.tableCell}>Total Value</th>
                          <th style={{...styles.tableCell, width: '50px', textAlign: 'center'}}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scrapItems.map((item) => (
                          <tr key={item.id} style={styles.tableRow}>
                            <td style={styles.tableCell}>{item.item_code}</td>
                            <td style={styles.tableCell}>{item.quantity}</td>
                            <td style={styles.tableCell}>₹{parseFloat(item.rate).toFixed(2)}</td>
                            <td style={styles.tableCell}>₹{(parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(2)}</td>
                            <td style={{...styles.tableCell, textAlign: 'center'}}>
                              <button type="button" onClick={() => removeScrapItem(item.id)} style={{...styles.button, background: '#fee2e2', color: '#dc2626', padding: '6px 10px'}}>
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Process Loss Percentage (%)</label>
                  <input 
                    type="number" 
                    name="process_loss_percentage" 
                    value={formData.process_loss_percentage} 
                    onChange={handleInputChange} 
                    step="0.01" 
                    placeholder="Enter percentage (e.g., 5.5)"
                    style={{...styles.input, maxWidth: '300px'}} 
                  />
                  <p style={{fontSize: '12px', color: '#6b7280', marginTop: '6px'}}>This percentage will be calculated into the total cost of the BOM</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'more-info' && <div style={{ color: '#666', textAlign: 'center', padding: '40px 20px' }}><p style={{ fontSize: '0.9rem' }}>Additional information fields can be added here</p></div>}
          {activeTab === 'website' && <div style={{ color: '#666', textAlign: 'center', padding: '40px 20px' }}><p style={{ fontSize: '0.9rem' }}>Website-related fields can be added here</p></div>}
        </div>

        <div style={styles.actionButtons}>
          <button 
            type="button" 
            onClick={() => navigate('/production/boms')} 
            style={{...styles.button, ...styles.buttonSecondary}}
          >
            <RotateCcw size={16} style={{marginRight: '6px'}} />
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading} 
            style={{...styles.button, ...styles.buttonPrimary, opacity: loading ? 0.6 : 1}}
          >
            <Save size={16} style={{marginRight: '6px'}} />
            {loading ? 'Saving...' : id ? 'Update BOM' : 'Create BOM'}
          </button>
        </div>
      </form>
    </div>
  )
}
