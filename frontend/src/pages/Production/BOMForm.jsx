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
    notes: '',
    loss_percentage: '0',
    scrap_qty: '0'
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
    hourly_rate: '0',
    operating_cost: '0',
    operation_type: 'IN_HOUSE',
    target_warehouse: '',
    notes: ''
  })
  const [newScrapItem, setNewScrapItem] = useState({
    item_code: '',
    item_name: '',
    input_quantity: '0',
    loss_percentage: '0',
    scrap_qty: '0',
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
    costing: true
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

  useEffect(() => {
    const updateSubAssemblyRates = async () => {
      const updatedMaterials = [...rawMaterials]
      let hasChanges = false
      
      for (let i = 0; i < updatedMaterials.length; i++) {
        const material = updatedMaterials[i]
        const item = items.find(it => it.item_code === material.item_code)
        
        if (item && (item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')) {
          try {
            const bomsResponse = await productionService.getBOMs({ item_code: material.item_code })
            if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
              const bom = bomsResponse.data[0]
              let totalCost = parseFloat(bom.total_cost || 0)
              const bomQuantity = parseFloat(bom.quantity || 1)
              
              if ((totalCost === 0 || !totalCost) && bom.bom_id) {
                try {
                  const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
                  const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
                  if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
                    totalCost = 0
                    for (const line of bomDetails.lines) {
                      try {
                        const itemResp = await productionService.getItemDetails(line.component_code)
                        if (itemResp && itemResp.data) {
                          const itemRate = parseFloat(itemResp.data.valuation_rate || 0)
                          const qty = parseFloat(line.quantity || 0)
                          totalCost += (itemRate * qty)
                        }
                      } catch (e) {
                        console.warn(`Failed to fetch cost for ${line.component_code}:`, e)
                      }
                    }
                  }
                } catch (detailErr) {
                  console.warn('Failed to fetch BOM details for', material.item_code, ':', detailErr.message)
                  totalCost = parseFloat(item.valuation_rate || 0)
                }
              }
              
              const costPerUnit = totalCost > 0 ? totalCost / bomQuantity : 0
              const newRate = costPerUnit.toFixed(2)
              
              if (newRate !== updatedMaterials[i].rate) {
                updatedMaterials[i] = {...updatedMaterials[i], rate: newRate, amount: (parseFloat(updatedMaterials[i].qty || 0) * newRate).toFixed(2)}
                hasChanges = true
              }
            }
          } catch (bomErr) {
            console.warn('Failed to fetch BOM for sub-assembly', material.item_code, ':', bomErr.message)
          }
        }
      }
      
      if (hasChanges) {
        setRawMaterials(updatedMaterials)
      }
    }
    
    if (rawMaterials.length > 0 && items.length > 0) {
      updateSubAssemblyRates()
    }
  }, [id])

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
      
      let itemGroupValue = bom.item_group || bom.items_group || ''
      let productNameValue = bom.product_name || ''
      
      if (bom.item_code) {
        try {
          const itemResponse = await productionService.getItemDetails(bom.item_code)
          if (itemResponse.success && itemResponse.data) {
            const itemData = itemResponse.data
            itemGroupValue = itemData.item_group || itemGroupValue
            productNameValue = itemData.name || itemData.item_name || productNameValue
          }
        } catch (itemErr) {
          console.warn('Failed to fetch item details:', itemErr)
        }
      }
      
      setFormData({
        bom_id: bom.bom_id,
        item_code: bom.item_code,
        product_name: productNameValue,
        item_group: itemGroupValue,
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
      const linesWithIds = (bom.lines || []).map((l, idx) => ({
        ...l, 
        id: l.id || `line-${Date.now()}-${idx}`,
        qty: l.qty || l.quantity || 0,
        component_name: l.component_name || l.component_description || ''
      }))
      setBomLines(linesWithIds)
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

  const handleProductNameChange = async (value) => {
    setFormData(prev => ({
      ...prev,
      product_name: value
    }))
    setError(null)

    if (value && !formData.item_code) {
      const selectedItem = items.find(item => 
        (item.name === value || item.item_name === value) && 
        (item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
      )
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          item_code: selectedItem.item_code,
          product_name: value,
          item_group: selectedItem.item_group || prev.item_group,
          uom: selectedItem.uom || prev.uom
        }))
      }
    }
  }

  const handleItemCodeChange = (value) => {
    const selectedItem = items.find(item => item.item_code === value)
    setFormData(prev => ({
      ...prev,
      item_code: value,
      item_group: selectedItem?.item_group || prev.item_group
    }))
    if (selectedItem) {
      handleInputChange({target: {name: 'item_code', value: value}})
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
          let rate = itemData.valuation_rate || '0'
          
          if (itemData.item_group === 'Sub Assemblies' || itemData.item_group === 'Sub-assembly') {
            try {
              const bomsResponse = await productionService.getBOMs({ item_code: value })
              if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
                const bom = bomsResponse.data[0]
                let totalCost = parseFloat(bom.total_cost || 0)
                const bomQuantity = parseFloat(bom.quantity || 1)
                
                if ((totalCost === 0 || !totalCost) && bom.bom_id) {
                  try {
                    const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
                    const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
                    if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
                      totalCost = 0
                      for (const line of bomDetails.lines) {
                        try {
                          const itemResp = await productionService.getItemDetails(line.component_code)
                          if (itemResp && itemResp.data) {
                            const rate = parseFloat(itemResp.data.valuation_rate || 0)
                            const qty = parseFloat(line.quantity || 0)
                            totalCost += (rate * qty)
                          }
                        } catch (e) {
                          console.warn(`Failed to fetch cost for ${line.component_code}:`, e)
                        }
                      }
                    }
                  } catch (detailErr) {
                    console.warn('Failed to fetch BOM details for', value, ':', detailErr.message)
                    totalCost = parseFloat(itemData.valuation_rate || 0)
                  }
                }
                
                const costPerUnit = totalCost / bomQuantity
                rate = costPerUnit.toFixed(2)
              }
            } catch (bomErr) {
              console.warn('Failed to fetch BOM for sub-assembly:', bomErr)
              rate = itemData.valuation_rate || '0'
            }
          }
          
          setNewLine(prev => ({
            ...prev,
            component_name: itemData.name || itemData.item_name || prev.component_name,
            uom: itemData.uom || prev.uom,
            rate: rate
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
    const lossPercentage = parseFloat(newLine.loss_percentage) || 0
    const scrapQty = (parseFloat(newLine.qty) * lossPercentage) / 100
    setBomLines([...bomLines, { ...newLine, id: Date.now(), amount, loss_percentage: lossPercentage, scrap_qty: scrapQty }])
    setNewLine({
      component_code: '',
      component_name: '',
      qty: '1',
      uom: 'Kg',
      item_group: '',
      rate: '0',
      notes: '',
      loss_percentage: '0',
      scrap_qty: '0'
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

  const calculateOperationCost = (cycleTime, setupTime, hourlyRate) => {
    const cycleTimeMinutes = parseFloat(cycleTime) || 0
    const setupTimeMinutes = parseFloat(setupTime) || 0
    const totalTimeMinutes = cycleTimeMinutes + setupTimeMinutes
    const rate = parseFloat(hourlyRate) || 0
    return (totalTimeMinutes / 60) * rate
  }

  const addOperation = () => {
    if (!newOperation.operation_name) {
      setError('Please enter operation name')
      return
    }
    const calculatedCost = calculateOperationCost(newOperation.operation_time, newOperation.fixed_time, newOperation.hourly_rate)
    setOperations([...operations, { ...newOperation, operating_cost: calculatedCost.toFixed(2), id: Date.now() }])
    setNewOperation({
      operation_name: '',
      workstation_type: '',
      operation_time: '0',
      fixed_time: '0',
      hourly_rate: '0',
      operating_cost: '0',
      operation_type: 'IN_HOUSE',
      target_warehouse: '',
      notes: ''
    })
  }

  const removeOperation = (opId) => {
    setOperations(operations.filter(op => op.id !== opId))
  }

  const addScrapItem = () => {
    if (!newScrapItem.input_quantity) {
      setError('Please fill Input Qty')
      return
    }
    setScrapItems([...scrapItems, { ...newScrapItem, id: Date.now() }])
    setNewScrapItem({
      item_code: '',
      item_name: '',
      input_quantity: '0',
      loss_percentage: '0',
      scrap_qty: '0',
      rate: '0'
    })
  }

  const updateScrapItemLoss = (itemId, lossPercent) => {
    setScrapItems(scrapItems.map(item => 
      item.id === itemId ? { ...item, loss_percentage: lossPercent } : item
    ))
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
  lines: bomLines.filter(line => line.component_code && line.component_code.trim()),
  rawMaterials: rawMaterials.filter(rm => rm.item_code && rm.item_code.trim()),
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
  const totalScrapQty = bomLines.reduce((sum, line) => sum + (parseFloat(line.scrap_qty) || 0), 0)
  const totalScrapLossCost = scrapItems.reduce((sum, item) => {
    const inputQty = parseFloat(item.input_quantity) || 0
    const lossPercent = parseFloat(item.loss_percentage) || 0
    const scrapQty = (inputQty * lossPercent) / 100
    const rate = parseFloat(item.rate) || 0
    return sum + (scrapQty * rate)
  }, 0)
  
  const materialCost = (totalComponentCost + totalRawMaterialCost) - totalScrapLossCost
  const labourCost = totalOperationCost
  const totalBOMCost = materialCost + labourCost

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
      <div className="w-full mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                {id ? '✏️' : '📋'}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{id ? 'Edit BOM' : 'Create BOM'}</h1>
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

          <div className=" rounded-lg shadow-sm border border-gray-200">
            {/* PRODUCT INFORMATION SECTION */}
            <div className={`border-b border-gray-200 p-2 ${expandedSections.product ? 'bg-blue-50 border-blue-200' : ''}`}>
              <button
                type="button"
                onClick={() => toggleSection('product')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">📦</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-blue-900 group-hover:text-blue-700 transition">Product Information</h2>
                    <p className="text-xs text-gray-500 mt-0">Basics</p>
                  </div>
                </div>
                <div className="text-blue-600 group-hover:text-blue-700 transition flex-shrink-0">
                  {expandedSections.product ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.product && (
                <div className="space-y-3 pt-3 border-t border-blue-100">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Product Name *</label>
                      <SearchableSelect
                        value={formData.product_name}
                        onChange={handleProductNameChange}
                        options={items
                          .filter(item => item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
                          .map(item => ({
                            label: item.name || item.item_name,
                            value: item.name || item.item_name
                          }))}
                        placeholder="Search products..."
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Item Code *</label>
                      <SearchableSelect
                        value={formData.item_code}
                        onChange={handleItemCodeChange}
                        options={items
                          .filter(item => item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
                          .map(item => ({
                            label: item.name,
                            value: item.item_code
                          }))}
                        placeholder="Search items..."
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Item Group</label>
                      <SearchableSelect
                        value={formData.item_group}
                        onChange={(value) => setFormData(prev => ({...prev, item_group: value}))}
                        options={itemGroups.map(group => ({
                          label: group.name || group.item_group_name,
                          value: group.name || group.item_group_name
                        }))}
                        placeholder="Select item group..."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-gray-600 mb-1">Quantity *</label>
                      <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} onKeyDown={handleKeyDown} step="0.01" required className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
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
                      <input type="number" name="revision" value={formData.revision} onChange={handleInputChange} onKeyDown={handleKeyDown} step="1" className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
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

            {/* COMPONENTS/SUB-ASSEMBLIES SECTION */}
            <div className={`border-b border-gray-200 p-2 ${expandedSections.components ? 'bg-blue-50 border-blue-200' : ''}`}>
              <button
                type="button"
                onClick={() => toggleSection('components')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">📦</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-blue-900 group-hover:text-blue-700 transition">Components/Sub-Assemblies</h2>
                    <p className="text-xs text-gray-500 mt-0">{bomLines.length} items • ₹{bomLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-blue-600 group-hover:text-blue-700 transition flex-shrink-0">
                  {expandedSections.components ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.components && (
                <div className="space-y-3 pt-3 border-t border-blue-100">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded p-3">
                    <h3 className="font-bold text-blue-900 mb-3 text-xs flex items-center gap-1">
                      <Plus size={14} /> Add Component
                    </h3>
                    <div className="grid auto-fit gap-2 items-end" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'}}>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Component/ Sub assemblies *</label>
                        <SearchableSelect
                          value={newLine.component_code}
                          onChange={async (value) => {
                            let item = items.find(i => i.item_code === value)
                            let rate = item?.valuation_rate || '0'
                            let componentName = item?.name || ''
                            
                            if (!componentName) {
                              try {
                                const itemResp = await productionService.getItemDetails(value)
                                if (itemResp && itemResp.data) {
                                  componentName = itemResp.data.name || itemResp.data.item_name || ''
                                  rate = itemResp.data.valuation_rate || rate
                                  item = itemResp.data
                                }
                              } catch (e) {
                                console.warn(`Failed to fetch item details for ${value}:`, e)
                              }
                            }
                            
                            const isFinishedGoods = item?.item_group === 'Finished Goods' || item?.item_group === 'Finished good'
                            const isSubAssembly = item?.item_group === 'Sub Assemblies' || item?.item_group === 'Sub-assembly'
                            
                            if (isFinishedGoods || isSubAssembly) {
                              try {
                                const bomsResponse = await productionService.getBOMs({ item_code: value })
                                if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
                                  const bom = bomsResponse.data[0]
                                  let totalCost = parseFloat(bom.total_cost || 0)
                                  const bomQuantity = parseFloat(bom.quantity || 1)
                                  
                                  if ((totalCost === 0 || !totalCost) && bom.bom_id) {
                                    try {
                                      const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
                                      const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
                                      if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
                                        totalCost = 0
                                        
                                        if (isFinishedGoods) {
                                          const newBomLines = []
                                          for (const line of bomDetails.lines) {
                                            try {
                                              const itemResp = await productionService.getItemDetails(line.component_code)
                                              const itemRate = itemResp?.data?.valuation_rate || 0
                                              const qty = parseFloat(line.quantity || 0)
                                              const lossPercentage = itemResp?.data?.loss_percentage || line.item_loss_percentage || '0'
                                              const amount = (itemRate * qty).toFixed(2)
                                              const scrapQty = (qty * (parseFloat(lossPercentage) / 100)).toFixed(2)
                                              
                                              totalCost += parseFloat(amount)
                                              
                                              newBomLines.push({
                                                id: Date.now() + Math.random(),
                                                component_code: line.component_code,
                                                component_name: line.component_name || itemResp?.data?.name || '',
                                                qty: qty.toString(),
                                                uom: line.uom || 'Kg',
                                                item_group: line.item_group,
                                                rate: itemRate.toString(),
                                                amount: amount,
                                                loss_percentage: lossPercentage,
                                                scrap_qty: scrapQty,
                                                notes: line.notes || ''
                                              })
                                            } catch (e) {
                                              console.warn(`Failed to fetch details for ${line.component_code}:`, e)
                                            }
                                          }
                                          
                                          if (newBomLines.length > 0) {
                                            setBomLines([...bomLines, ...newBomLines])
                                            alert(`✓ Added ${newBomLines.length} sub-assemblies from ${componentName}`)
                                            setNewLine({component_code: '', component_name: '', qty: '1', uom: 'Kg', item_group: '', rate: '0', notes: '', loss_percentage: '0', scrap_qty: '0'})
                                            return
                                          }
                                        } else {
                                          for (const line of bomDetails.lines) {
                                            try {
                                              const itemResp = await productionService.getItemDetails(line.component_code)
                                              if (itemResp && itemResp.data) {
                                                const itemRate = parseFloat(itemResp.data.valuation_rate || 0)
                                                const qty = parseFloat(line.quantity || 0)
                                                totalCost += (itemRate * qty)
                                              }
                                            } catch (e) {
                                              console.warn(`Failed to fetch cost for ${line.component_code}:`, e)
                                            }
                                          }
                                        }
                                      }
                                    } catch (detailErr) {
                                      console.warn('Failed to fetch BOM details for', value, ':', detailErr.message)
                                      totalCost = parseFloat(item.valuation_rate || 0)
                                    }
                                  }
                                  
                                  const costPerUnit = totalCost / bomQuantity
                                  rate = costPerUnit.toFixed(2)
                                }
                              } catch (bomErr) {
                                console.warn('Failed to fetch BOM for component:', bomErr)
                              }
                            }
                            
                            const selectedItem = items.find(i => i.item_code === value)
                            const lossPercentage = selectedItem?.loss_percentage || '0'
                            setNewLine({...newLine, component_code: value, component_name: componentName, rate, loss_percentage: lossPercentage})
                          }}
                          options={items.filter(item => item && item.item_code && item.name).map(item => ({
                            label: item.name,
                            value: item.item_code
                          }))}
                          placeholder="Search component..."
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Qty *</label>
                        <input type="number" value={newLine.qty} onChange={(e) => setNewLine({...newLine, qty: e.target.value})} onKeyDown={handleKeyDown} step="0.01" placeholder="1" className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">UOM</label>
                        <select value={newLine.uom} onChange={(e) => setNewLine({...newLine, uom: e.target.value})} className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-white font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
                          <option value="Kg">Kg</option>
                          <option value="Nos">Nos</option>
                          <option value="Ltr">Ltr</option>
                          <option value="Meter">Meter</option>
                          <option value="Box">Box</option>
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Rate (₹)</label>
                        <input type="number" value={newLine.rate} onChange={(e) => setNewLine({...newLine, rate: e.target.value})} onKeyDown={handleKeyDown} step="0.01" placeholder="0" className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Loss % (Scrap)</label>
                        <input type="number" value={newLine.loss_percentage} onChange={(e) => setNewLine({...newLine, loss_percentage: e.target.value})} onKeyDown={handleKeyDown} step="0.01" placeholder="0" min="0" max="100" className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Notes</label>
                        <input type="text" value={newLine.notes} onChange={(e) => setNewLine({...newLine, notes: e.target.value})} onKeyDown={handleKeyDown} placeholder="Notes" className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                      </div>
                      <button type="button" onClick={addBomLine} className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded font-semibold text-xs flex items-center justify-center gap-1 hover:from-blue-600 hover:to-blue-700 transition shadow-sm h-9">
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>

                  {bomLines.length > 0 && (
                    <div className="border border-blue-200 rounded overflow-hidden">
                      <div className="bg-blue-50 px-3 py-2 border-b border-blue-200">
                        <div className="font-bold text-blue-700 text-xs flex items-center gap-1">
                          <Check size={14} className="text-blue-600" />
                          Components Added ({bomLines.length})
                        </div>
                      </div>
                      <div className="">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-blue-200">
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">#</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Component Code</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Component Name</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Qty</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">UOM</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Rate</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Amount</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Loss %</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Scrap Qty</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Notes</th>
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bomLines.map((line, index) => (
                              <tr key={line.id} className={`border-b border-blue-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                <td className="px-2 py-1.5 text-center text-xs font-medium text-gray-600">{index + 1}</td>
                                <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{line.component_code}</td>
                                <td className="px-2 py-1.5 text-xs text-gray-700">{line.component_name}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">{parseFloat(line.qty || 0).toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-xs text-gray-700">{line.uom}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">₹{parseFloat(line.rate || 0).toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-xs text-right font-semibold text-gray-900">₹{parseFloat(line.amount || 0).toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">{parseFloat(line.loss_percentage || 0).toFixed(2)}%</td>
                                <td className="px-2 py-1.5 text-xs text-right text-amber-700 font-semibold">{parseFloat(line.scrap_qty || 0).toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-xs text-gray-600">{line.notes || '-'}</td>
                                <td className="px-2 py-1.5 text-center">
                                  <button type="button" onClick={() => removeBomLine(line.id)} className="p-1 text-red-600 hover:bg-red-100 rounded transition">
                                    <Trash2 size={12} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-amber-50 border-t-2 border-amber-200 font-semibold">
                              <td colSpan="7" className="px-2 py-2 text-right text-xs text-amber-900">Total Scrap Qty:</td>
                              <td className="px-2 py-2 text-right text-sm font-bold text-amber-700">{totalScrapQty.toFixed(2)}</td>
                              <td colSpan="3"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MATERIALS SECTION */}
            <div className={`border-b border-gray-200 p-2 ${expandedSections.raw_materials ? 'bg-emerald-50 border-emerald-200' : ''}`}>
              <button
                type="button"
                onClick={() => toggleSection('raw_materials')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">🏭</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-emerald-900 group-hover:text-emerald-700 transition">Materials</h2>
                    <p className="text-xs text-gray-500 mt-0">{rawMaterials.length} • ₹{rawMaterials.reduce((sum, rm) => sum + (parseFloat(rm.amount) || 0), 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-emerald-600 group-hover:text-emerald-700 transition flex-shrink-0">
                  {expandedSections.raw_materials ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.raw_materials && rawMaterials.length > 0 && (
              <div className="mt-3 border border-emerald-100 rounded p-3 bg-emerald-50">
                <h4 className="text-xs font-bold text-emerald-900 mb-2">RM Consumption Preview (for {formData.quantity} {formData.uom})</h4>
                <div className="space-y-1">
                  {calculateRMConsumption(formData.quantity).map((consumption, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-emerald-800">
                      <span>{consumption.item_code} - {consumption.qty_required.toFixed(2)} {consumption.uom}</span>
                      <span className="font-semibold">₹{consumption.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedSections.raw_materials && (
                <div className="space-y-3 pt-3 border-t border-emerald-100">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded p-3">
                    <h3 className="font-bold text-emerald-900 mb-3 text-xs flex items-center gap-1">
                      <Plus size={14} /> Add Raw Material
                    </h3>
                    <div className="grid auto-fit gap-2 items-end" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))'}}>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Item Name *</label>
                        <SearchableSelect
                          value={newRawMaterial.item_code}
                          onChange={async (value) => {
                            const item = items.find(i => i.item_code === value)
                            let rate = item?.valuation_rate || '0'
                            
                            if (item?.item_group === 'Sub Assemblies' || item?.item_group === 'Sub-assembly') {
                              try {
                                const bomsResponse = await productionService.getBOMs({ item_code: value })
                                if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
                                  const bom = bomsResponse.data[0]
                                  let totalCost = parseFloat(bom.total_cost || 0)
                                  const bomQuantity = parseFloat(bom.quantity || 1)
                                  
                                  if ((totalCost === 0 || !totalCost) && bom.bom_id) {
                                    try {
                                      const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
                                      const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
                                      if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
                                        totalCost = 0
                                        for (const line of bomDetails.lines) {
                                          try {
                                            const itemResp = await productionService.getItemDetails(line.component_code)
                                            if (itemResp && itemResp.data) {
                                              const itemRate = parseFloat(itemResp.data.valuation_rate || 0)
                                              const qty = parseFloat(line.quantity || 0)
                                              totalCost += (itemRate * qty)
                                            }
                                          } catch (e) {
                                            console.warn(`Failed to fetch cost for ${line.component_code}:`, e)
                                          }
                                        }
                                      }
                                    } catch (detailErr) {
                                      console.warn('Failed to fetch BOM details for', value, ':', detailErr.message)
                                      totalCost = parseFloat(itemData.valuation_rate || 0)
                                    }
                                  }
                                  
                                  const costPerUnit = totalCost / bomQuantity
                                  rate = costPerUnit.toFixed(2)
                                }
                              } catch (bomErr) {
                                console.warn('Failed to fetch BOM for sub-assembly:', bomErr)
                              }
                            }
                            
                            setNewRawMaterial({...newRawMaterial, item_code: value, item_name: item?.name || '', item_group: item?.item_group || '', rate})
                          }}
                          options={items.filter(item => item && item.item_code && item.name && item.item_group !== 'Finished Goods').map(item => ({
                            label: item.name,
                            value: item.item_code
                          }))}
                          placeholder="Search by name..."
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
                            value: wh.id
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
                              <div className="">
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
                                          <td className="px-2 py-1.5 text-xs text-right font-semibold text-gray-900">₹{parseFloat(isEditing ? (parseFloat(data.qty || 0) * parseFloat(data.rate || 0)) : (material.amount || 0)).toFixed(2)}</td>
                                          <td className="px-2 py-1.5 text-xs text-gray-700">
                                            {isEditing ? (
                                              <select value={data.source_warehouse || ''} onChange={(e) => setEditingRowData({...data, source_warehouse: e.target.value})} className="px-2 py-1 border border-gray-300 rounded text-xs w-full">
                                                <option value="">-</option>
                                                {warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => (
                                                  <option key={wh.id} value={wh.id}>{wh.warehouse_name || wh.name}</option>
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
                                                <button type="button" onClick={async () => {const updatedData = {...editingRowData, amount: (parseFloat(editingRowData.qty || 0) * parseFloat(editingRowData.rate || 0))}; const updated = rawMaterials.map(m => m.id === material.id ? updatedData : m); setRawMaterials(updated); if(id) {try {setLoading(true); const payload = {...formData, lines: bomLines, rawMaterials: updated, operations, scrapItems, quantity: parseFloat(formData.quantity), revision: parseInt(formData.revision), process_loss_percentage: parseFloat(formData.process_loss_percentage)}; await productionService.updateBOM(id, payload); setError(null);} catch(err) {setError('Failed to save: ' + err.message);} finally {setLoading(false);}} setEditingRowId(null)}} className="p-1 text-green-600 hover:bg-green-100 rounded" title="Save">
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
            <div className={`border-b border-gray-200 p-2 ${expandedSections.operations ? 'bg-purple-50 border-purple-200' : ''}`}>
              <button
                type="button"
                onClick={() => toggleSection('operations')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">⚙️</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-purple-900 group-hover:text-purple-700 transition">Operations</h2>
                    <p className="text-xs text-gray-500 mt-0">{operations.length} • ₹{totalOperationCost.toFixed(0)}</p>
                  </div>
                </div>
                <div className="text-purple-600 group-hover:text-purple-700 transition flex-shrink-0">
                  {expandedSections.operations ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.operations && (
                <div className="space-y-3 pt-3 border-t border-purple-100">
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
                        <label className="text-xs font-bold text-gray-700 mb-1">Hourly Rate (₹)</label>
                        <input type="number" name="hourly_rate" value={newOperation.hourly_rate} onChange={(e) => setNewOperation({...newOperation, hourly_rate: e.target.value})} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-100" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Cost (₹)</label>
                        <div className="px-2 py-1.5 border border-gray-300 rounded text-xs font-semibold bg-gray-100 text-gray-700">
                          {calculateOperationCost(newOperation.operation_time, newOperation.fixed_time, newOperation.hourly_rate).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Type</label>
                        <select value={newOperation.operation_type} onChange={(e) => setNewOperation({...newOperation, operation_type: e.target.value})} className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-purple-400 focus:ring-1 focus:ring-purple-100">
                          <option value="IN_HOUSE">In-House</option>
                          <option value="OUTSOURCED">Outsourced</option>
                        </select>
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
                      <div className="">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">#</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Operation</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Workstation</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Cycle (min)</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Setup (min)</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Hourly Rate (₹)</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Cost (₹)</th>
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Type</th>
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
                                <td className="px-2 py-1.5 text-xs text-right text-gray-700">₹{parseFloat(op.hourly_rate || 0).toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-xs text-right font-semibold text-gray-900">₹{parseFloat(op.operating_cost).toFixed(2)}</td>
                                <td className="px-2 py-1.5 text-xs">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${op.operation_type === 'OUTSOURCED' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                                    {op.operation_type === 'OUTSOURCED' ? 'Outsourced' : 'In-House'}
                                  </span>
                                </td>
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
            <div className={`p-2 border-b border-gray-200 ${expandedSections.scrap ? 'bg-cyan-50 border-cyan-200' : ''}`}>
              <button
                type="button"
                onClick={() => toggleSection('scrap')}
                className="w-full flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">♻️</div>
                  <div className="text-left">
                    <h2 className="text-sm font-bold text-cyan-900 group-hover:text-cyan-700 transition">Scrap & Loss</h2>
                    <p className="text-xs text-gray-500 mt-0">{scrapItems.length} item{scrapItems.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-cyan-600 group-hover:text-cyan-700 transition flex-shrink-0">
                  {expandedSections.scrap ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {expandedSections.scrap && (
                <div className="space-y-3 pt-3 border-t border-cyan-100">
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded p-3">
                    <h3 className="font-bold text-cyan-900 mb-3 text-xs flex items-center gap-1">
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
                            label: item.name,
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
                        <label className="text-xs font-bold text-gray-700 mb-1">Input Qty *</label>
                        <input type="number" name="input_quantity" value={newScrapItem.input_quantity} onChange={handleScrapItemChange} onKeyDown={handleKeyDown} step="0.01" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-100" placeholder="Material qty" />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-700 mb-1">Loss %</label>
                        <input type="number" name="loss_percentage" value={newScrapItem.loss_percentage} onChange={handleScrapItemChange} onKeyDown={handleKeyDown} step="0.01" min="0" max="100" className="px-2 py-1.5 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-100" placeholder="0-100" />
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
                      <div className="">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-2 py-1.5 text-left text-xs font-bold text-gray-600">Item</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Input Qty</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Loss %</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-orange-700 bg-orange-50">Scrap Qty</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-gray-600">Rate (₹)</th>
                              <th className="px-2 py-1.5 text-right text-xs font-bold text-orange-700 bg-orange-50">Total (₹)</th>
                              <th className="px-2 py-1.5 text-center text-xs font-bold text-gray-600 w-8">Del</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scrapItems.map((item, index) => {
                              const inputQty = parseFloat(item.input_quantity) || 0
                              const lossPercent = parseFloat(item.loss_percentage) || 0
                              const scrapQty = (inputQty * lossPercent) / 100
                              const rate = parseFloat(item.rate) || 0
                              const totalValue = scrapQty * rate
                              return (
                                <tr key={item.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                                  <td className="px-2 py-1.5 text-xs font-medium text-gray-900">{item.item_code}</td>
                                  <td className="px-2 py-1.5 text-xs text-right text-gray-700">{inputQty.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right">
                                    <input 
                                      type="number" 
                                      value={item.loss_percentage || '0'}
                                      onChange={(e) => updateScrapItemLoss(item.id, e.target.value)}
                                      min="0"
                                      max="100"
                                      step="0.01"
                                      className="w-full px-1 py-0.5 border border-gray-200 rounded text-xs text-right hover:border-orange-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
                                    />
                                  </td>
                                  <td className="px-2 py-1.5 text-xs text-right font-semibold text-orange-700 bg-orange-50">{scrapQty.toFixed(4)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right text-gray-700">₹{rate.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 text-xs text-right font-bold text-orange-700 bg-orange-50">₹{totalValue.toFixed(2)}</td>
                                  <td className="px-2 py-1.5 text-center">
                                    <button type="button" onClick={() => removeScrapItem(item.id)} className="p-1 text-red-600 hover:bg-red-100 rounded transition">
                                      <Trash2 size={12} />
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}


                </div>
              )}
            </div>
          </div>

          {/* COSTING SUMMARY SECTION */}
          <div className={`border-b border-gray-200 p-2 ${expandedSections.costing ? 'bg-indigo-50 border-indigo-200' : ''}`}>
            <button
              type="button"
              onClick={() => toggleSection('costing')}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">💰</div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-indigo-900 group-hover:text-indigo-700 transition">BOM Costing</h2>
                  <p className="text-xs text-gray-500 mt-0">₹{totalBOMCost.toFixed(2)} Total Cost</p>
                </div>
              </div>
              <div className="text-indigo-600 group-hover:text-indigo-700 transition flex-shrink-0">
                {expandedSections.costing ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {expandedSections.costing && (
              <div className="pt-3 border-t border-indigo-100">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Material Cost</div>
                    <div className="text-lg font-bold text-blue-900">₹{materialCost.toFixed(2)}</div>
                    <p className="text-xs text-blue-600 mt-1">(Components − Scrap)</p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <div className="text-xs font-semibold text-purple-700 mb-1">Labour Cost</div>
                    <div className="text-lg font-bold text-purple-900">₹{labourCost.toFixed(2)}</div>
                    <p className="text-xs text-purple-600 mt-1">Operations</p>
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
                    <div className="flex justify-between text-xs text-red-600">
                      <span className="text-gray-600">Scrap Loss (Deduction):</span>
                      <span className="font-semibold">−₹{totalScrapLossCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs bg-blue-50 px-2 py-1.5 rounded border border-blue-200">
                      <span className="text-blue-800 font-semibold">Material Cost (after Scrap):</span>
                      <span className="font-bold text-blue-700">₹{materialCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Operations Cost:</span>
                      <span className="font-semibold text-gray-900">₹{totalOperationCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs bg-amber-50 px-2 py-1.5 rounded border border-amber-200">
                      <span className="text-amber-800 font-semibold">Total Scrap Qty:</span>
                      <span className="font-bold text-amber-700">{totalScrapQty.toFixed(2)} {formData.uom}</span>
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
                <h2 className="text-sm font-bold text-gray-900">Load Draft</h2>
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
