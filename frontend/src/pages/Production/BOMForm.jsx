import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Plus, Trash2, X, ChevronRight, Save, RotateCcw, ChevronDown, ChevronUp, Check, FileText } from 'lucide-react'
import * as productionService from '../../services/productionService'
import SearchableSelect from '../../components/SearchableSelect'
import DraftsList from '../../components/DraftsList'
import { useDraftSave } from '../../hooks/useDraftSave'

export default function BOMForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [formData, setFormData] = useState({
    bom_id: '',
    item_code: '',
    product_name: '',
    item_group: '',
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
    valuation_rate_value: '',
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
    item_group: '',
    rate: '0',
    notes: ''
  })
  const [editingLineId, setEditingLineId] = useState(null)
  const [editingRowId, setEditingRowId] = useState(null)
  const [editingRowData, setEditingRowData] = useState({})
  const [inlineManualEntry, setInlineManualEntry] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  const [dropdownSearch, setDropdownSearch] = useState('')
  const [operationsList, setOperationsList] = useState([])
  const [workstationsList, setWorkstationsList] = useState([])
  const [warehousesList, setWarehousesList] = useState([])
  const [newRawMaterial, setNewRawMaterial] = useState({
    item_code: '',
    item_name: '',
    item_group: '',
    qty: '1',
    uom: 'Kg',
    rate: '0',
    source_warehouse: '',
    operation: ''
  })
  const [newOperation, setNewOperation] = useState({
    operation_name: '',
    workstation_type: '',
    operation_time: '0',
    fixed_time: '0',
    operating_cost: '0',
    target_warehouse: '',
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
  const [uomList, setUomList] = useState([])
  const [itemGroups, setItemGroups] = useState([])
  const [expandedSections, setExpandedSections] = useState({
    product: true,
    components: true,
    raw_materials: true,
    operations: true,
    scrap: false,
    costing: false
  })
  const [expandedItemGroups, setExpandedItemGroups] = useState({})
  const [showDrafts, setShowDrafts] = useState(false)
  
  const { loadDraft, deleteDraft, clearCurrentDraft } = useDraftSave('BOM', {
    formData,
    bomLines,
    rawMaterials,
    operations,
    scrapItems
  })

  useEffect(() => {
    fetchItems()
    fetchOperations()
    fetchWorkstations()
    fetchWarehouses()
    fetchUOMs()
    fetchItemGroups()
    if (id) {
      fetchBOMDetails(id)
    }
  }, [id])

  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({...prev, [section]: !prev[section]}))
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const handleLoadDraft = (draftId, draftData) => {
    if (draftData) {
      setFormData(draftData.formData || {})
      setBomLines(draftData.bomLines || [])
      setRawMaterials(draftData.rawMaterials || [])
      setOperations(draftData.operations || [])
      setScrapItems(draftData.scrapItems || [])
      setShowDrafts(false)
    }
  }

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

  const fetchWarehouses = async () => {
    try {
      const response = await productionService.getWarehouses()
      const warehousesData = response.data?.data || response.data || []
      setWarehousesList(Array.isArray(warehousesData) ? warehousesData : [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchUOMs = async () => {
    try {
      const response = await productionService.getUOMList()
      setUomList(response.data || [])
    } catch (err) {
      console.error('Failed to fetch UOM list:', err)
    }
  }

  const fetchItemGroups = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/item-groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.data) {
        setItemGroups(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch item groups:', err)
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
        valuation_rate_value: bom.valuation_rate_value || '',
        currency: bom.currency || 'INR',
        with_operations: bom.with_operations === true,
        process_loss_percentage: bom.process_loss_percentage || 0
      })
      setBomLines(bom.lines || [])
      const materialsWithIds = (bom.rawMaterials || []).map((m, idx) => ({...m, id: m.id || `mat-${Date.now()}-${idx}`}))
      setRawMaterials(materialsWithIds)
      setOperations(bom.operations || [])
      setScrapItems(bom.scrapItems || [])
    } catch (err) {
      setError('Failed to load BOM details')
    }
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)

    if (name === 'item_code' && !manualEntry.itemCode && value) {
      try {
        const response = await productionService.getItemDetails(value)
        if (response.success && response.data) {
          const itemData = response.data
          setFormData(prev => ({
            ...prev,
            product_name: itemData.name || itemData.item_name || prev.product_name,
            item_group: itemData.item_group || prev.item_group,
            uom: itemData.uom || prev.uom,
            weight_per_unit: itemData.weight_per_unit || prev.weight_per_unit,
            weight_uom: itemData.weight_uom || prev.weight_uom
          }))
        }
      } catch (err) {
        console.error('Failed to fetch item details:', err)
      }
    }
  }

  const handleLineChange = async (e) => {
    const { name, value } = e.target
    setNewLine(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'component_code' && !manualEntry.componentCode && value) {
      try {
        const response = await productionService.getItemDetails(value)
        if (response.success && response.data) {
          const itemData = response.data
          setNewLine(prev => ({
            ...prev,
            component_name: itemData.name || itemData.item_name || prev.component_name,
            uom: itemData.uom || prev.uom,
            rate: itemData.valuation_rate || prev.rate || '0'
          }))
        }
      } catch (err) {
        console.error('Failed to fetch component item details:', err)
      }
    }
  }

  const handleScrapItemChange = async (e) => {
    const { name, value } = e.target
    setNewScrapItem(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'item_code' && !manualEntry.scrapItemCode && value) {
      try {
        const response = await productionService.getItemDetails(value)
        if (response.success && response.data) {
          const itemData = response.data
          setNewScrapItem(prev => ({
            ...prev,
            item_name: itemData.name || itemData.item_name || prev.item_name,
            rate: itemData.valuation_rate || prev.rate || '0'
          }))
        }
      } catch (err) {
        console.error('Failed to fetch scrap item details:', err)
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
      item_group: '',
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
    if (!newRawMaterial.item_code || !newRawMaterial.qty) {
      setError('Please enter item code and quantity')
      return
    }
    const amount = (parseFloat(newRawMaterial.qty) || 0) * (parseFloat(newRawMaterial.rate) || 0)
    setRawMaterials([...rawMaterials, { ...newRawMaterial, id: Date.now(), amount }])
    setNewRawMaterial({
      item_code: '',
      item_name: '',
      item_group: '',
      qty: '1',
      uom: 'Kg',
      rate: '0',
      source_warehouse: '',
      operation: ''
    })
    setError(null)
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
      target_warehouse: '',
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

  const calculateRMConsumption = (quantity) => {
    return rawMaterials.map(rm => ({
      item_code: rm.item_code,
      item_name: rm.item_name,
      qty_required: (parseFloat(rm.qty) || 0) * (parseFloat(quantity) || 0),
      uom: rm.uom,
      source_warehouse: rm.source_warehouse,
      operation: rm.operation,
      cost: (parseFloat(rm.amount) || 0) * (parseFloat(quantity) || 0)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.item_code || !formData.quantity) {
        throw new Error('Please fill all required fields')
      }

    const payload = {
  ...formData,
  lines: bomLines,
  rawMaterials: rawMaterials,
  operations: operations,
  scrapItems: scrapItems,
  quantity: parseFloat(formData.quantity),
  revision: parseInt(formData.revision),
  process_loss_percentage: parseFloat(formData.process_loss_percentage),
  total_cost: totalBOMCost
}



      if (id) {
        await productionService.updateBOM(id, payload)
      } else {
        await productionService.createBOM(payload)
      }

      clearCurrentDraft()
      navigate('/manufacturing/bom', { state: { success: id ? 'BOM updated successfully' : 'BOM created successfully' } })
    } catch (err) {
      setError(err.message || 'Failed to save BOM')
    } finally {
      setLoading(false)
    }
  }

  const totalComponentCost = bomLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)
  const totalRawMaterialCost = rawMaterials.reduce((sum, rm) => sum + (parseFloat(rm.amount) || 0), 0)
  const totalOperationCost = operations.reduce((sum, op) => sum + (parseFloat(op.operating_cost) || 0), 0)
  
  const materialCost = totalComponentCost + totalRawMaterialCost
  const labourCost = totalOperationCost
  const overheadCost = (materialCost + labourCost) * 0.1
  const totalBOMCost = materialCost + labourCost + overheadCost

  const groupRawMaterialsByItemGroup = () => {
    const grouped = {}
    rawMaterials.forEach(material => {
      const group = material.item_group || 'Unclassified'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(material)
    })
    return grouped
  }

  const groupedRawMaterials = groupRawMaterialsByItemGroup()
  const itemGroupsInOrder = Object.keys(groupedRawMaterials).sort()

  const toggleItemGroup = (group) => {
    setExpandedItemGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                {id ? '✏️' : '📋'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit BOM' : 'Create BOM'}</h1>
                <p className="text-xs text-gray-600 mt-0">{id ? 'Modify BOM details' : 'Create BOM'}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => setShowDrafts(true)}
              className="px-4 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold text-xs hover:bg-blue-100 transition shadow-sm border border-blue-200 hover:border-blue-300 flex items-center gap-2"
            >
              <FileText size={14} />
              Drafts
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/manufacturing/bom')} 
              className="px-4 py-1.5 bg-white text-gray-700 rounded-lg font-semibold text-xs hover:bg-gray-100 transition shadow-sm border border-gray-200 hover:border-gray-300"
            >
              ← Back
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-2 flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800 text-xs">Error</p>
                <p className="text-red-700 text-xs mt-0">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* PRODUCT INFORMATION SECTION */}
            <div className="border-b border-gray-200 p-2">
              <button
                type="button"
                onClick={() => toggleSection('product')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-base font-bold flex-shrink-0">📦</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition">Product Information</h2>
                    <p className="text-xs text-gray-500 mt-0">Basics</p>
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition flex-shrink-0">
                  {expandedSections.product ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.product && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Item Code *</label>
                      <SearchableSelect
                        value={formData.item_code}
                        onChange={(value) => {
                          setFormData({...formData, item_code: value})
                          const selectedItem = items.find(item => item.item_code === value)
                          if (selectedItem) {
                            handleInputChange({target: {name: 'item_code', value: value}})
                          }
                        }}
                        options={items
                          .filter(item => item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
                          .map(item => ({
                            label: item.item_code,
                            value: item.item_code
                          }))}
                        placeholder="Search items..."
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Product Name</label>
                      <input type="text" name="product_name" value={formData.product_name} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Name" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Quantity *</label>
                      <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} onKeyDown={handleKeyDown} step="0.01" required className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">UOM</label>
                      <SearchableSelect
                        value={formData.uom}
                        onChange={(value) => setFormData({...formData, uom: value})}
                        options={uomList.map(uom => ({
                          label: uom,
                          value: uom
                        }))}
                        placeholder="Select UOM..."
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Revision</label>
                      <input type="number" name="revision" value={formData.revision} onChange={handleInputChange} onKeyDown={handleKeyDown} step="1" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-600 mb-1">Description</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Notes..." className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit min-h-12 transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition">
                      <input
                        type="checkbox"
                        name="is_default"
                        checked={formData.is_default}
                        onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                        className="w-3 h-3 text-blue-600 border-gray-300 rounded cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-700">Default</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* MATERIALS SECTION */}
            <div className="border-b border-gray-200 p-2">
              <button
                type="button"
                onClick={() => toggleSection('raw_materials')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-base font-bold flex-shrink-0">🏭</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition">Materials</h2>
                    <p className="text-xs text-gray-500 mt-0">{rawMaterials.length} • ₹{rawMaterials.reduce((sum, rm) => sum + (parseFloat(rm.amount) || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition flex-shrink-0">
                  {expandedSections.raw_materials ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.raw_materials && rawMaterials.length > 0 && (
              <div className="mt-3 border border-blue-100 rounded p-3 bg-blue-50">
                <h4 className="text-xs font-bold text-blue-900 mb-2">RM Consumption Preview (for {formData.quantity} {formData.uom})</h4>
                <div className="space-y-1">
                  {calculateRMConsumption(formData.quantity).map((consumption, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-blue-800">
                      <span>{consumption.item_code} - {consumption.qty_required.toFixed(2)} {consumption.uom}</span>
                      <span className="font-semibold">₹{consumption.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedSections.raw_materials && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded p-3">
                    <h3 className="font-bold text-red-900 mb-3 text-xs flex items-center gap-1">
                      <Plus size={14} /> Add Raw Material
                    </h3>
                    <div className="grid auto-fit gap-2 items-end" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'}}>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Item Code *</label>
                        <SearchableSelect
                          value={newRawMaterial.item_code}
                          onChange={(value) => {
                            const item = items.find(i => i.item_code === value)
                            setNewRawMaterial({...newRawMaterial, item_code: value, item_name: item?.name || '', item_group: item?.item_group || ''})
                          }}
                          options={items.filter(item => item && item.item_code && item.name && item.item_group !== 'Finished Goods').map(item => ({
                            label: item.item_code,
                            value: item.item_code
                          }))}
                          placeholder="Search items..."
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Qty *</label>
                        <input type="number" value={newRawMaterial.qty} onChange={(e) => setNewRawMaterial({...newRawMaterial, qty: e.target.value})} onKeyDown={handleKeyDown} step="0.01" placeholder="1" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-red-400 focus:ring-1 focus:ring-red-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">UOM</label>
                        <select value={newRawMaterial.uom} onChange={(e) => setNewRawMaterial({...newRawMaterial, uom: e.target.value})} className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-white font-inherit transition-all hover:border-gray-300 focus:border-red-400 focus:ring-1 focus:ring-red-100">
                          <option value="Kg">Kg</option>
                          <option value="Nos">Nos</option>
                          <option value="Ltr">Ltr</option>
                          <option value="Meter">Meter</option>
                          <option value="Box">Box</option>
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Item Group</label>
                        <SearchableSelect value={newRawMaterial.item_group} onChange={(value) => setNewRawMaterial({...newRawMaterial, item_group: value})} options={itemGroups.filter(ig => ig && (ig.name || ig.item_group)).map(ig => ({label: ig.name || ig.item_group, value: ig.name || ig.item_group}))} placeholder="Select" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Rate (₹)</label>
                        <input type="number" value={newRawMaterial.rate} onChange={(e) => setNewRawMaterial({...newRawMaterial, rate: e.target.value})} onKeyDown={handleKeyDown} step="0.01" placeholder="0" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-red-400 focus:ring-1 focus:ring-red-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Warehouse</label>
                        <SearchableSelect
                          value={newRawMaterial.source_warehouse}
                          onChange={(value) => setNewRawMaterial({...newRawMaterial, source_warehouse: value})}
                          options={warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => ({
                            label: wh.warehouse_name || wh.name,
                            value: wh.warehouse_name || wh.name
                          }))}
                          placeholder="Select"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Operation</label>
                        <SearchableSelect
                          value={newRawMaterial.operation}
                          onChange={(value) => setNewRawMaterial({...newRawMaterial, operation: value})}
                          options={operationsList.filter(op => op && op.name).map(op => ({
                            label: op.name,
                            value: op.name
                          }))}
                          placeholder="Select"
                        />
                      </div>
                      <button type="button" onClick={addNewRawMaterial} className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded font-semibold text-xs flex items-center justify-center gap-1 hover:from-red-600 hover:to-red-700 transition shadow-sm h-9">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>

                  {rawMaterials.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="font-bold text-red-700 text-xs flex items-center gap-1 px-3 py-2">
                        <Check size={14} className="text-red-600" />
                        Materials Added by Item Group
                      </div>
                      {itemGroupsInOrder.map((groupName) => {
                        const groupItems = groupedRawMaterials[groupName]
                        const isExpanded = expandedItemGroups[groupName]
                        const groupCost = groupItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                        
                        return (
                          <div key={groupName} className="border border-red-200 rounded overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleItemGroup(groupName)}
                              className="w-full flex items-center justify-between bg-red-50 hover:bg-red-100 transition p-3 group"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="text-left">
                                  <h3 className="text-sm font-bold text-red-900 group-hover:text-red-700">{groupName}</h3>
                                  <p className="text-xs text-red-700 mt-0">{groupItems.length} items • ₹{groupCost.toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="text-red-600 flex-shrink-0">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-gray-50 border-b border-red-200">
                                      <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">#</th>
                                      <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Item Code</th>
                                      <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Item Name</th>
                                      <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Qty</th>
                                      <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">UOM</th>
                                      <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Rate</th>
                                      <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Amount</th>
                                      <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Warehouse</th>
                                      <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Operation</th>
                                      <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupItems.map((material, index) => {
                                      const isEditing = editingRowId === material.id
                                      const data = isEditing ? editingRowData : material
                                      return (
                                        <tr key={material.id} className={`border-b border-red-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                          <td className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">{index + 1}</td>
                                          <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{material.item_code}</td>
                                          <td className="px-2 py-1.5 text-xs text-gray-700">{material.item_name}</td>
                                          <td className="px-2 py-1.5 text-xs text-right text-gray-700">
                                            {isEditing ? (
                                              <input type="number" value={data.qty || ''} onChange={(e) => setEditingRowData({...data, qty: e.target.value})} step="0.01" className="px-2 py-1 border border-gray-300 rounded text-xs w-full" />
                                            ) : (
                                              material.qty
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-xs text-gray-700">
                                            {isEditing ? (
                                              <select value={data.uom || ''} onChange={(e) => setEditingRowData({...data, uom: e.target.value})} className="px-2 py-1 border border-gray-300 rounded text-xs w-full">
                                                {['Kg', 'Nos', 'Ltr', 'Meter', 'Box'].map(u => <option key={u} value={u}>{u}</option>)}
                                              </select>
                                            ) : (
                                              material.uom
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-xs text-right text-gray-700">
                                            {isEditing ? (
                                              <input type="number" value={data.rate || ''} onChange={(e) => setEditingRowData({...data, rate: e.target.value})} step="0.01" className="px-2 py-1 border border-gray-300 rounded text-xs w-full" />
                                            ) : (
                                              `₹${parseFloat(material.rate).toFixed(2)}`
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-xs text-right font-semibold text-gray-900">₹{parseFloat(material.amount || 0).toFixed(2)}</td>
                                          <td className="px-2 py-1.5 text-xs text-gray-700">
                                            {isEditing ? (
                                              <select value={data.source_warehouse || ''} onChange={(e) => setEditingRowData({...data, source_warehouse: e.target.value})} className="px-2 py-1 border border-gray-300 rounded text-xs w-full">
                                                <option value="">-</option>
                                                {warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => (
                                                  <option key={wh.id} value={wh.warehouse_name || wh.name}>{wh.warehouse_name || wh.name}</option>
                                                ))}
                                              </select>
                                            ) : (
                                              material.source_warehouse || '-'
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-xs text-gray-700">
                                            {isEditing ? (
                                              <select value={data.operation || ''} onChange={(e) => setEditingRowData({...data, operation: e.target.value})} className="px-2 py-1 border border-gray-300 rounded text-xs w-full">
                                                <option value="">-</option>
                                                {operationsList.filter(op => op && op.name).map(op => (
                                                  <option key={op.id} value={op.name}>{op.name}</option>
                                                ))}
                                              </select>
                                            ) : (
                                              material.operation || '-'
                                            )}
                                          </td>
                                          <td className="px-2 py-1.5 text-center flex gap-1 justify-center">
                                            {isEditing ? (
                                              <>
                                                <button type="button" onClick={async () => {const updated = rawMaterials.map(m => m.id === material.id ? editingRowData : m); setRawMaterials(updated); if(id) {try {setLoading(true); const payload = {...formData, lines: bomLines, rawMaterials: updated, operations, scrapItems, quantity: parseFloat(formData.quantity), revision: parseInt(formData.revision), process_loss_percentage: parseFloat(formData.process_loss_percentage)}; await productionService.updateBOM(id, payload); setError(null);} catch(err) {setError('Failed to save: ' + err.message);} finally {setLoading(false);}} setEditingRowId(null)}} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Save">
                                                  <Check size={12} />
                                                </button>
                                                <button type="button" onClick={() => setEditingRowId(null)} className="p-1 text-gray-600 hover:bg-gray-200 rounded" title="Cancel">
                                                  <X size={12} />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button type="button" onClick={() => {setEditingRowId(material.id); setEditingRowData({...material})}} className="p-1 text-blue-600 hover:bg-blue-100 rounded transition" title="Edit">
                                                  ✏️
                                                </button>
                                                <button type="button" onClick={() => removeRawMaterial(material.id)} className="p-1 text-red-600 hover:bg-red-100 rounded transition" title="Delete">
                                                  <Trash2 size={12} />
                                                </button>
                                              </>
                                            )}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* OPERATIONS SECTION */}
            <div className="border-b border-gray-200 p-2">
              <button
                type="button"
                onClick={() => toggleSection('operations')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center text-base font-bold flex-shrink-0">⚙️</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-gray-900 group-hover:text-purple-600 transition">Operations</h2>
                    <p className="text-xs text-gray-500 mt-0">{operations.length} • ₹{totalOperationCost.toFixed(0)}</p>
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition flex-shrink-0">
                  {expandedSections.operations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.operations && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded p-3">
                    <h3 className="font-bold text-purple-900 mb-3 text-xs flex items-center gap-1">
                      <Plus size={14} /> Add Operation
                    </h3>
                    <div className="grid auto-fit gap-2 items-end" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'}}>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Operation *</label>
                        <SearchableSelect
                          value={newOperation.operation_name}
                          onChange={(value) => setNewOperation({...newOperation, operation_name: value})}
                          options={operationsList.filter(op => op && op.name).map(op => ({
                            label: op.name,
                            value: op.name
                          }))}
                          placeholder="Search operations..."
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Workstation</label>
                        <SearchableSelect
                          value={newOperation.workstation_type}
                          onChange={(value) => setNewOperation({...newOperation, workstation_type: value})}
                          options={workstationsList.filter(ws => ws && ws.name).map(ws => ({
                            label: ws.name,
                            value: ws.name
                          }))}
                          placeholder="Select"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Cycle Time (min)</label>
                        <input type="number" name="operation_time" value={newOperation.operation_time} onChange={(e) => setNewOperation({...newOperation, operation_time: e.target.value})} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Setup Time (min)</label>
                        <input type="number" name="fixed_time" value={newOperation.fixed_time} onChange={(e) => setNewOperation({...newOperation, fixed_time: e.target.value})} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Cost (₹)</label>
                        <input type="number" name="operating_cost" value={newOperation.operating_cost} onChange={(e) => setNewOperation({...newOperation, operating_cost: e.target.value})} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Target Warehouse</label>
                        <SearchableSelect
                          value={newOperation.target_warehouse}
                          onChange={(value) => setNewOperation({...newOperation, target_warehouse: value})}
                          options={warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => ({
                            label: wh.warehouse_name || wh.name,
                            value: wh.warehouse_name || wh.name
                          }))}
                          placeholder="Select"
                        />
                      </div>
                      <button type="button" onClick={addOperation} className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded font-semibold text-xs flex items-center justify-center gap-1 hover:from-purple-600 hover:to-purple-700 transition shadow-sm h-9">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>

                  {operations.length > 0 && (
                    <div className="border border-purple-200 rounded overflow-hidden">
                      <div className="bg-purple-50 px-3 py-2 border-b border-purple-200">
                        <div className="font-bold text-purple-700 text-xs flex items-center gap-1">
                          <Check size={14} className="text-purple-600" />
                          Operations
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">#</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Operation</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Workstation</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Cycle (min)</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Setup (min)</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Cost (₹)</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Target Warehouse</th>
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">Del</th>
                            </tr>
                          </thead>
                          <tbody>
                            {operations.map((op, index) => (
                              <tr key={op.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                <td className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">{index + 1}</td>
                                <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{op.operation_name}</td>
                                <td className="px-2 py-1.5 text-xs text-gray-700">{op.workstation_type || '-'}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">{op.operation_time}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">{op.fixed_time}</td>
                                <td className="px-2 py-1.5 text-xs text-right font-semibold text-gray-900">₹{parseFloat(op.operating_cost).toFixed(0)}</td>
                                <td className="px-2 py-1.5 text-xs text-gray-700">{op.target_warehouse || '-'}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <button type="button" onClick={() => removeOperation(op.id)} className="p-1 text-red-600 hover:bg-red-100 rounded transition">
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SCRAP & PROCESS LOSS SECTION */}
            <div className="p-2">
              <button
                type="button"
                onClick={() => toggleSection('scrap')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-base font-bold flex-shrink-0">♻️</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition">Scrap & Loss</h2>
                    <p className="text-xs text-gray-500 mt-0">{scrapItems.length} item{scrapItems.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition flex-shrink-0">
                  {expandedSections.scrap ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.scrap && (
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded p-3">
                    <h3 className="font-bold text-orange-900 mb-3 text-xs flex items-center gap-1">
                      <Plus size={14} /> Add Scrap
                    </h3>
                    <div className="grid auto-fit gap-2 items-end" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'}}>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Item Code *</label>
                        <SearchableSelect
                          value={newScrapItem.item_code}
                          onChange={(value) => {
                            setNewScrapItem({...newScrapItem, item_code: value})
                            handleScrapItemChange({target: {name: 'item_code', value: value}})
                          }}
                          options={items.filter(item => item && item.item_code && item.name).map(item => ({
                            label: item.item_code,
                            value: item.item_code
                          }))}
                          placeholder="Search items..."
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Name</label>
                        <input type="text" name="item_name" value={newScrapItem.item_name} onChange={handleScrapItemChange} onKeyDown={handleKeyDown} placeholder="Name" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Qty *</label>
                        <input type="number" name="quantity" value={newScrapItem.quantity} onChange={handleScrapItemChange} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Rate (₹)</label>
                        <input type="number" name="rate" value={newScrapItem.rate} onChange={handleScrapItemChange} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-100" />
                      </div>
                      <button type="button" onClick={addScrapItem} className="p-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded font-semibold text-xs flex items-center justify-center gap-1 hover:from-orange-600 hover:to-orange-700 transition shadow-sm h-9">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>

                  {scrapItems.length > 0 && (
                    <div className="border border-orange-200 rounded overflow-hidden mb-3">
                      <div className="bg-orange-50 px-3 py-2 border-b border-orange-200">
                        <div className="font-bold text-orange-700 text-xs flex items-center gap-1">
                          <Check size={14} className="text-orange-600" />
                          Scrap Items
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Item</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Qty</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Rate</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Total</th>
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">Del</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scrapItems.map((item, index) => (
                              <tr key={item.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{item.item_code}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">{item.quantity}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">₹{parseFloat(item.rate).toFixed(0)}</td>
                                <td className="px-2 py-1.5 text-xs text-right font-semibold text-gray-900">₹{(parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(0)}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <button type="button" onClick={() => removeScrapItem(item.id)} className="p-1 text-red-600 hover:bg-red-100 rounded transition">
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-600 mb-1">Loss %</label>
                    <input 
                      type="number" 
                      name="process_loss_percentage" 
                      value={formData.process_loss_percentage} 
                      onChange={handleInputChange} 
                      step="0.01" 
                      placeholder="0.00"
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 max-w-xs"
                    />
                    <p className="text-xs text-gray-500 mt-1">Included in BOM cost</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COSTING SUMMARY SECTION */}
          <div className="border-b border-gray-200 p-2">
            <button
              type="button"
              onClick={() => toggleSection('costing')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center text-base font-bold flex-shrink-0">💰</div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-gray-900 group-hover:text-green-600 transition">BOM Costing</h2>
                  <p className="text-xs text-gray-500 mt-0">₹{totalBOMCost.toFixed(2)} Total Cost</p>
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-gray-600 transition flex-shrink-0">
                {expandedSections.costing ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expandedSections.costing && (
              <div className="pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Material Cost</div>
                    <div className="text-lg font-bold text-blue-900">₹{materialCost.toFixed(2)}</div>
                    <p className="text-xs text-blue-600 mt-1">Components + RM</p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div className="text-xs font-semibold text-purple-700 mb-1">Labour Cost</div>
                    <div className="text-lg font-bold text-purple-900">₹{labourCost.toFixed(2)}</div>
                    <p className="text-xs text-purple-600 mt-1">Operations</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="text-xs font-semibold text-amber-700 mb-1">Overhead (10%)</div>
                    <div className="text-lg font-bold text-amber-900">₹{overheadCost.toFixed(2)}</div>
                    <p className="text-xs text-amber-600 mt-1">Auto Calculated</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="text-xs font-semibold text-green-700 mb-1">Total BOM Cost</div>
                    <div className="text-lg font-bold text-green-900">₹{totalBOMCost.toFixed(2)}</div>
                    <p className="text-xs text-green-600 mt-1">Per {formData.quantity} {formData.uom}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Components Cost:</span>
                      <span className="font-semibold text-gray-900">₹{totalComponentCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Raw Materials Cost:</span>
                      <span className="font-semibold text-gray-900">₹{totalRawMaterialCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Operations Cost:</span>
                      <span className="font-semibold text-gray-900">₹{totalOperationCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-gray-300 pt-2 mt-2">
                      <span className="text-gray-700 font-semibold">Cost Per Unit:</span>
                      <span className="font-bold text-gray-900">₹{formData.quantity && formData.quantity !== '0' ? (totalBOMCost / parseFloat(formData.quantity)).toFixed(2) : '0.00'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 justify-end pt-2">
            <button 
              type="button" 
              onClick={() => navigate('/manufacturing/bom')} 
              className="px-4 py-1.5 bg-white text-gray-700 rounded font-semibold text-xs hover:bg-gray-100 transition border border-gray-200 hover:border-gray-300 flex items-center gap-1"
            >
              <RotateCcw size={12} />
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded font-semibold text-xs hover:from-amber-600 hover:to-amber-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
            >
              <Save size={12} />
              {loading ? 'Saving...' : id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>

        {showDrafts && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-96 max-h-96 overflow-y-auto p-4">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">Load Draft</h2>
                <button
                  onClick={() => setShowDrafts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <DraftsList
                formName="BOM"
                onLoadDraft={handleLoadDraft}
                onDeleteDraft={deleteDraft}
                onClose={() => setShowDrafts(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
