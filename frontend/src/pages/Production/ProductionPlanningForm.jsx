import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Save, X, Plus, Trash2, AlertCircle, Package, Boxes, Archive, Check, Factory, Zap } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'

export default function ProductionPlanningForm() {
  const navigate = useNavigate()
  const { plan_id } = useParams()
  const [expandedSections, setExpandedSections] = useState({ 0: true, 1: true, 1.5: true, 2: false, 3: false, 4: false, 5: false })
  const [expandedItemGroups, setExpandedItemGroups] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [fetchingBom, setFetchingBom] = useState(false)

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleItemGroup = (groupKey) => {
    setExpandedItemGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  const groupItemsByItemGroup = (items) => {
    const grouped = {}
    items.forEach(item => {
      const groupName = item.item_group || 'Ungrouped'
      if (!grouped[groupName]) {
        grouped[groupName] = []
      }
      grouped[groupName].push(item)
    })
    return grouped
  }

  const [planHeader, setPlanHeader] = useState({
    plan_id: '',
    naming_series: 'PP',
    company: '',
    sales_order_id: '',
    status: 'draft'
  })

  const [selectedSalesOrders, setSelectedSalesOrders] = useState([])
  const [selectedBomId, setSelectedBomId] = useState(null)
  const [selectedSalesOrderDetails, setSelectedSalesOrderDetails] = useState(null)
  const [salesOrderQuantity, setSalesOrderQuantity] = useState(1)
  const [fgItems, setFGItems] = useState([])
  const [subAssemblyItems, setSubAssemblyItems] = useState([])
  const [rawMaterialItems, setRawMaterialItems] = useState([])
  const [operationItems, setOperationItems] = useState([])
  const [consolidateSubAssembly, setConsolidateSubAssembly] = useState(false)
  const [skipAvailableSubAssembly, setSkipAvailableSubAssembly] = useState(false)
  const [selectedSubAssemblyItems, setSelectedSubAssemblyItems] = useState(new Set())
  const [editingFGIndex, setEditingFGIndex] = useState(null)
  const [editingSubAsmIndex, setEditingSubAsmIndex] = useState(null)
  const [editingRawMatIndex, setEditingRawMatIndex] = useState(null)
  const [editBackupFG, setEditBackupFG] = useState(null)
  const [editBackupSubAsm, setEditBackupSubAsm] = useState(null)
  const [editBackupRawMat, setEditBackupRawMat] = useState(null)
  const [subAssemblyMaterials, setSubAssemblyMaterials] = useState({})
  const [expandedSubAssemblyMaterials, setExpandedSubAssemblyMaterials] = useState({})

  const [items, setItems] = useState([])
  const [boms, setBOMs] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [salesOrders, setSalesOrders] = useState([])
  const [bomFinishedGoods, setBomFinishedGoods] = useState([])
  const [bomRawMaterials, setBomRawMaterials] = useState([])
  const [bomOperations, setBomOperations] = useState([])
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false)
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false)
  const [workOrderData, setWorkOrderData] = useState(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const fetchProductionPlan = async (planId) => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const plan = data.success ? data.data : null
        
        if (plan) {
          console.log('Loaded production plan data:', plan)
          console.log('Sales Order ID from plan:', plan.sales_order_id)
          console.log('Plan sales_order_id type:', typeof plan.sales_order_id)
          console.log('Plan sales_order_id value (JSON):', JSON.stringify(plan.sales_order_id))
          
          setPlanHeader({
            plan_id: plan.plan_id || '',
            naming_series: plan.naming_series || 'PP',
            company: plan.company || '',
            sales_order_id: plan.sales_order_id || '',
            status: plan.status || 'draft'
          })

          setFGItems(plan.fg_items || [])
          setSubAssemblyItems(plan.sub_assembly_items || [])
          setRawMaterialItems(plan.raw_materials || [])
          setOperationItems(plan.operations || [])
          
          const planQty = plan.fg_items?.[0]?.planned_qty || plan.fg_items?.[0]?.quantity || 1
          setSalesOrderQuantity(planQty)

          if (plan.sales_order_id) {
            setSelectedSalesOrders([plan.sales_order_id])
            await processSalesOrderData(plan.sales_order_id, planQty)
          }
        } else {
          setError('Production plan not found')
        }
      } else {
        setError('Failed to fetch production plan')
      }
    } catch (err) {
      console.error('Error fetching production plan:', err)
      setError('Failed to load production plan')
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setItems(data.data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setBOMs(data.data || [])
    } catch (err) {
      console.error('Error fetching BOMs:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/warehouses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setWarehouses(data.data || [])
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setSalesOrders(data.data || [])
    } catch (err) {
      console.error('Error fetching sales orders:', err)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    try {
      setFetchingBom(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      const bomData = data.data || data
      
      if (bomData) {
        setBomFinishedGoods(bomData.finished_goods || bomData.bom_finished_goods || [])
        setBomRawMaterials(bomData.bom_raw_materials || bomData.rawMaterials || [])
        setBomOperations(bomData.operations || bomData.bom_operations || [])
        setOperationItems(bomData.operations || bomData.bom_operations || [])
      }
      
      return bomData
    } catch (err) {
      console.error('Error fetching BOM details:', err)
      return null
    } finally {
      setFetchingBom(false)
    }
  }

  const fetchSalesOrderDetails = async (salesOrderId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      const soData = data.data || data

      try {
        if (soData.bom_raw_materials && typeof soData.bom_raw_materials === 'string') {
          soData.bom_raw_materials = JSON.parse(soData.bom_raw_materials)
        }
        if (soData.bom_operations && typeof soData.bom_operations === 'string') {
          soData.bom_operations = JSON.parse(soData.bom_operations)
        }
        if (soData.bom_finished_goods && typeof soData.bom_finished_goods === 'string') {
          soData.bom_finished_goods = JSON.parse(soData.bom_finished_goods)
        }
      } catch (parseErr) {
        console.warn('Error parsing BOM JSON fields:', parseErr)
      }

      return soData
    } catch (err) {
      console.error('Error fetching sales order details:', err)
      return null
    }
  }

  const loadSubAssemblyMaterials = async (subAssemblySku) => {
    if (subAssemblyMaterials[subAssemblySku]) {
      return subAssemblyMaterials[subAssemblySku]
    }

    try {
      const bomItem = bomRawMaterials.find(rm => rm.item_code === subAssemblySku)
      if (!bomItem) return []

      const token = localStorage.getItem('token')
      const bomId = bomItem.bom_no || bomItem.bom_id
      if (!bomId) return []

      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) return []

      const data = await response.json()
      const bomData = data.data || data
      const materials = (bomData.bom_raw_materials || bomData.rawMaterials || []).filter(m => {
        const group = m.item_group || m.group || ''
        return group.toLowerCase() !== 'sub assembly' && group.toLowerCase() !== 'sub assemblies'
      })

      setSubAssemblyMaterials(prev => ({ ...prev, [subAssemblySku]: materials }))
      return materials
    } catch (err) {
      console.error('Error loading sub-assembly materials:', err)
      return []
    }
  }

  const updateSubAssemblyMaterial = async (subAssemblySku, materialIndex, field, value) => {
    const materials = await loadSubAssemblyMaterials(subAssemblySku)
    if (materials && materials[materialIndex]) {
      const updatedMaterials = [...materials]
      updatedMaterials[materialIndex] = { ...updatedMaterials[materialIndex], [field]: value }
      setSubAssemblyMaterials(prev => ({ ...prev, [subAssemblySku]: updatedMaterials }))
    }
  }

  useEffect(() => {
    fetchItems()
    fetchBOMs()
    fetchWarehouses()
    fetchSalesOrders()

    if (plan_id) {
      fetchProductionPlan(plan_id)
    }
  }, [plan_id])

  const handleSalesOrderSelect = (soId) => {
    setPlanHeader(prev => ({ ...prev, sales_order_id: soId }))
    setSelectedSalesOrders([soId])
  }

  const processSalesOrderData = async (soId, salesOrderQty = 1) => {
    const soDetails = await fetchSalesOrderDetails(soId)
    if (!soDetails) return

    let itemCode = ''
    let itemName = ''
    
    const items = soDetails.items || []
    if (Array.isArray(items) && items.length > 0) {
      const firstItem = items[0]
      itemCode = firstItem.item_code || firstItem.item || firstItem.sku || ''
      itemName = firstItem.item_name || firstItem.name || firstItem.description || ''
    }
    
    if (!itemCode || !itemName) {
      const bomFGList = soDetails.bom_finished_goods || []
      if (Array.isArray(bomFGList) && bomFGList.length > 0) {
        const firstItem = bomFGList[0]
        itemCode = itemCode || firstItem.item_code || firstItem.component_code || firstItem.item || firstItem.sku || 'FG Item'
        itemName = itemName || firstItem.item_name || firstItem.component_description || firstItem.item_description || firstItem.description || firstItem.name || 'Finished Good'
      }
    }

    if (!itemCode) itemCode = 'FG Item'
    if (!itemName) itemName = 'Finished Good'

    let quantity = salesOrderQty || 1
    if (!quantity || quantity === 1) {
      const firstItemQty = items.length > 0 ? (items[0].qty || items[0].quantity || items[0].ordered_qty) : undefined
      if (firstItemQty) {
        quantity = parseFloat(firstItemQty) || 1
      }
    }

    setSalesOrderQuantity(quantity)
    
    const enrichedDetails = {
      ...soDetails,
      item_code: itemCode,
      item_name: itemName
    }
    setSelectedSalesOrderDetails(enrichedDetails)

    const fg = {
      item_code: itemCode,
      item_name: itemName,
      quantity: quantity,
      sales_order_quantity: quantity,
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    const bomId = soDetails.bom_id || soDetails.bom_no
    if (bomId) {
      setSelectedBomId(bomId)

      let bomData = null
      const bomFinishedGoodsFromSO = soDetails.bom_finished_goods || []
      const bomRawMaterialsFromSO = soDetails.bom_raw_materials || []
      const bomOperationsFromSO = soDetails.bom_operations || []

      if (bomFinishedGoodsFromSO.length === 0 || bomRawMaterialsFromSO.length === 0) {
        bomData = await fetchBOMDetails(bomId)
      }

      const bomFinishedGoods = bomFinishedGoodsFromSO.length > 0 ? bomFinishedGoodsFromSO : (bomData?.finished_goods || bomData?.bom_finished_goods || bomData?.lines || [])
      
      if (bomFinishedGoods.length > 0) {
        const fgItemsFromBOM = bomFinishedGoods.map(fgItem => ({
          item_code: fgItem.item_code || fgItem.component_code || itemCode,
          item_name: fgItem.item_name || fgItem.component_description || fgItem.product_name || itemName,
          quantity: (fgItem.qty || fgItem.quantity || 1) * quantity,
          sales_order_quantity: quantity,
          planned_start_date: new Date().toISOString().split('T')[0],
          planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }))
        setFGItems(fgItemsFromBOM)
      } else if (bomData?.item_code || bomData?.product_name) {
        const fgFromBOM = {
          item_code: bomData.item_code || itemCode,
          item_name: bomData.product_name || itemName,
          quantity: quantity,
          sales_order_quantity: quantity,
          planned_start_date: new Date().toISOString().split('T')[0],
          planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
        setFGItems([fgFromBOM])
      } else {
        setFGItems([fg])
      }

      const proportionalMaterials = (bomRawMaterialsFromSO.length > 0 ? bomRawMaterialsFromSO : (bomData?.bom_raw_materials || bomData?.rawMaterials || [])).map(mat => ({
        ...mat,
        quantity: (mat.qty || mat.quantity || 0) * quantity,
        rate: mat.rate || 0,
        bom_qty: mat.qty || mat.quantity || 0,
        sales_order_quantity: quantity
      }))

      setRawMaterialItems(proportionalMaterials)

      const proportionalOperations = (bomOperationsFromSO.length > 0 ? bomOperationsFromSO : (bomData?.operations || bomData?.bom_operations || [])).map(op => ({
        ...op,
        proportional_time: (op.time || op.operation_time || 0) * quantity
      }))

      setOperationItems(proportionalOperations)
    } else {
      setFGItems([fg])
    }
  }

  const saveProductionPlan = async () => {
    try {
      setSavingPlan(true)
      setError(null)
      const token = localStorage.getItem('token')

      if (!selectedSalesOrders.length) {
        setError('Please select a sales order')
        return
      }

      if (!fgItems.length) {
        setError('Please add at least one finished good item')
        return
      }

      const payloadPlanId = planHeader.plan_id || `PP-${Date.now()}`

      const planPayload = {
        plan_id: payloadPlanId,
        naming_series: planHeader.naming_series || 'PP',
        company: planHeader.company || '',
        sales_order_id: selectedSalesOrders[0],
        status: planHeader.status || 'draft',
        bom_id: selectedBomId || '',
        plan_date: new Date().toISOString().split('T')[0],
        week_number: null
      }

      let planResponse
      if (plan_id) {
        planResponse = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${plan_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...planPayload,
            fg_items: fgItems,
            sub_assemblies: subAssemblyItems,
            raw_materials: rawMaterialItems,
            operations: operationItems
          })
        })
      } else {
        planResponse = await fetch(`${import.meta.env.VITE_API_URL}/production-planning`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(planPayload)
        })
      }

      if (!planResponse.ok) {
        const errorData = await planResponse.json()
        setError(errorData.message || 'Failed to save production plan')
        return
      }

      const planResult = await planResponse.json()
      const savedPlanId = planResult.data?.plan_id || payloadPlanId

      setPlanHeader(prev => ({
        ...prev,
        plan_id: savedPlanId
      }))

      if (fgItems.length > 0) {
        for (const item of fgItems) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${savedPlanId}/fg-items`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                item_code: item.item_code,
                item_name: item.item_name,
                planned_qty: item.quantity || item.planned_qty || 1,
                planned_start_date: item.planned_start_date,
                planned_end_date: item.planned_end_date
              })
            })
          } catch (err) {
            console.error('Error adding FG item:', err)
          }
        }
      }

      if (subAssemblyItems.length > 0) {
        for (const item of subAssemblyItems) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${savedPlanId}/sub-assembly-items`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                item_code: item.item_code,
                item_name: item.item_name,
                planned_qty: item.quantity || item.planned_qty || 1,
                scheduled_date: item.planned_start_date
              })
            })
          } catch (err) {
            console.error('Error adding sub-assembly item:', err)
          }
        }
      }

      if (rawMaterialItems.length > 0) {
        for (const item of rawMaterialItems) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${savedPlanId}/raw-material-items`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                item_code: item.item_code,
                item_name: item.item_name,
                qty: item.quantity || item.qty || 0,
                plan_to_request_qty: item.quantity || item.qty || 0,
                for_warehouse: item.for_warehouse || item.source_warehouse,
                rate: item.rate || 0
              })
            })
          } catch (err) {
            console.error('Error adding raw material item:', err)
          }
        }
      }

      setSuccess(`Production Plan ${savedPlanId} saved successfully!`)
      setTimeout(() => setSuccess(null), 3000)
      
      if (!plan_id) {
        setTimeout(() => {
          navigate(`/manufacturing/production-planning/${savedPlanId}`)
        }, 1000)
      }
    } catch (err) {
      console.error('Error saving production plan:', err)
      setError(`Failed to save production plan: ${err.message}`)
    } finally {
      setSavingPlan(false)
    }
  }

  const prepareWorkOrderData = async () => {
    if (!selectedSalesOrderDetails || !fgItems.length) {
      setError('Please select a sales order and ensure FG items are loaded')
      return null
    }

    try {
      const fgItem = fgItems[0]
      const salesOrderId = selectedSalesOrders[0]
      const soDetails = await fetchSalesOrderDetails(salesOrderId)

      const requiredItems = rawMaterialItems.map((item, idx) => {
        const baseBomQty = item.plan_to_request_qty || item.qty_as_per_bom || 0
        const proportionalQty = baseBomQty * salesOrderQuantity
        const itemRate = item.rate || 0
        return {
          item_code: item.item_code || '',
          source_warehouse: item.for_warehouse || '',
          required_qty: proportionalQty,
          rate: itemRate,
          sales_order_quantity: salesOrderQuantity,
          bom_qty: baseBomQty,
          sequence: idx + 1
        }
      })

      let operations = operationItems
      if (!operations || operations.length === 0) {
        const bomId = selectedBomId || fgItem.bom_no
        if (bomId) {
          const bomDetails = await fetchBOMDetails(bomId)
          operations = bomDetails?.operations || bomDetails?.bom_operations || []
        }
      }

      const soQty = fgItem.sales_order_quantity || salesOrderQuantity || 1
      const operationsPayload = operations.map((op, idx) => ({
        operation: op.operation || op.operation_name || op.name || '',
        workstation: op.workstation || op.workstation_type || op.default_workstation || '',
        time: op.proportional_time !== undefined ? op.proportional_time : (op.time || op.operation_time || 0),
        sequence: idx + 1
      }))

      const woData = {
        item_code: fgItem.item_code || fgItem.component_code || '',
        bom_no: selectedBomId || fgItem.bom_no || '',
        quantity: soQty,
        sales_order_quantity: soQty,
        priority: 'Medium',
        notes: `From Production Plan: ${planHeader.plan_id}`,
        sales_order_id: salesOrderId,
        planned_start_date: fgItem.planned_start_date || new Date().toISOString().split('T')[0],
        planned_end_date: fgItem.planned_end_date || new Date().toISOString().split('T')[0],
        actual_start_date: fgItem.actual_start_date || null,
        actual_end_date: fgItem.actual_end_date || null,
        expected_delivery_date: fgItem.expected_delivery_date || soDetails?.delivery_date || null,
        required_items: requiredItems,
        operations: operationsPayload,
        production_plan_id: planHeader.plan_id
      }

      setWorkOrderData(woData)
      setShowWorkOrderModal(true)
      return woData
    } catch (err) {
      console.error('Error preparing work order data:', err)
      setError('Failed to prepare work order data')
      return null
    }
  }

  const handleCreateWorkOrder = async () => {
    if (!workOrderData) return

    try {
      setCreatingWorkOrder(true)
      setError(null)
      const token = localStorage.getItem('token')

      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/work-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workOrderData)
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess('Work Order created successfully!')
        setShowWorkOrderModal(false)
        setWorkOrderData(null)
        
        setTimeout(() => {
          navigate('/manufacturing/work-orders')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create work order')
      }
    } catch (err) {
      console.error('Error creating work order:', err)
      setError(`Failed to create work order: ${err.message}`)
    } finally {
      setCreatingWorkOrder(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-600">Loading production plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-3">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-3">
          <button 
            onClick={() => navigate('/manufacturing/production-planning')}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Production Plan</h1>
              <p className="text-xs text-gray-500">{planHeader.plan_id}</p>
            </div>
            <div className="flex gap-2">
              {!plan_id && (
                <button 
                  onClick={async () => {
                    if (!selectedSalesOrders.length) {
                      setError('Please select a sales order')
                      return
                    }
                    await prepareWorkOrderData()
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 transition"
                >
                  ⚡ Create Work Order
                </button>
              )}
              {plan_id && (
                <button 
                  onClick={async () => {
                    if (!selectedSalesOrders.length || selectedSalesOrders.length === 0) {
                      setError('Please select a sales order')
                      return
                    }
                    await prepareWorkOrderData()
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 transition"
                >
                  ⚡ Create Work Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border-l-4 border-red-500 rounded text-red-800 text-xs">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 p-2 bg-green-50 border-l-4 border-green-500 rounded text-green-800 text-xs">
            {success}
          </div>
        )}

        {/* Section 0: Plan Header */}
        <div className="bg-white rounded shadow mb-3">
          <button
            onClick={() => toggleSection(0)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-600">0</span>
              <h2 className="text-sm font-semibold text-gray-900">Plan Header</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[0] ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections[0] && (
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Plan ID</label>
                  <input
                    type="text"
                    disabled
                    value={planHeader.plan_id || 'Auto-generated'}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded bg-gray-50 text-gray-600 text-xs cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Series</label>
                  <input
                    type="text"
                    value={planHeader.naming_series}
                    onChange={(e) => setPlanHeader(prev => ({ ...prev, naming_series: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={planHeader.status}
                    onChange={(e) => setPlanHeader(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="planned">Planned</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Sales Order Selection */}
        <div className="bg-white rounded shadow mb-3">
          <button
            onClick={() => toggleSection(1)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-orange-600">1</span>
              <h2 className="text-sm font-semibold text-gray-900">Sales Order Selection</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[1] ? 'rotate-180' : ''}`} />
          </button>

          {expandedSections[1] && (
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Sales Order</label>
                  <SearchableSelect
                    options={salesOrders.map(so => ({
                      value: so.sales_order_id || so.name,
                      label: `${so.sales_order_id || so.name} - ${so.customer_name || 'N/A'}`
                    }))}
                    value={selectedSalesOrders[0] || ''}
                    onChange={(value) => {
                      setSelectedSalesOrders([value])
                      handleSalesOrderSelect(value)
                      processSalesOrderData(value)
                    }}
                    placeholder="Search and select sales order..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sales Order Quantity</label>
                  <input
                    type="number"
                    value={salesOrderQuantity}
                    onChange={(e) => {
                      const qty = parseInt(e.target.value) || 1
                      setSalesOrderQuantity(qty)
                      if (selectedSalesOrders[0]) {
                        processSalesOrderData(selectedSalesOrders[0], qty)
                      }
                    }}
                    min="1"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 1.5: BOM Selection */}
        {(selectedSalesOrderDetails || fgItems.length > 0) && (
          <div className="bg-white rounded shadow mb-3">
            <button
              onClick={() => toggleSection(1.5)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">1.5</span>
                <h2 className="text-sm font-semibold text-gray-900">BOM Details</h2>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[1.5] ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections[1.5] && (
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-xs text-gray-600 font-semibold">Item</p>
                    <p className="text-xs font-bold text-gray-900">
                      {(fgItems[0]?.item_code || selectedSalesOrderDetails?.item_code || 'N/A')}
                      {(fgItems[0]?.item_name || selectedSalesOrderDetails?.item_name) && (
                        <span> - {fgItems[0]?.item_name || selectedSalesOrderDetails?.item_name}</span>
                      )}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs text-gray-600 font-semibold">BOM No</p>
                    <p className="text-xs font-bold text-gray-900">{selectedBomId || 'N/A'}</p>
                  </div>
                  <div className="bg-orange-50 rounded p-2">
                    <p className="text-xs text-gray-600 font-semibold">Quantity</p>
                    <p className="text-xs font-bold text-gray-900">{salesOrderQuantity || fgItems[0]?.quantity || 1}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Finished Goods */}
        {fgItems.length > 0 && (
          <div className="bg-white rounded shadow mb-3">
            <button
              onClick={() => toggleSection(2)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-600">2</span>
                <h2 className="text-sm font-semibold text-gray-900">Finished Goods ({fgItems.length})</h2>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[2] ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections[2] && (
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="space-y-2">
                  {fgItems.map((item, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-green-50 to-green-100 rounded p-2 border border-green-200">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Item Code</p>
                          <p className="font-bold text-gray-900">{item.item_code || selectedSalesOrderDetails?.item_code || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Item Name</p>
                          <p className="font-bold text-gray-900">{item.item_name || selectedSalesOrderDetails?.item_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Qty</p>
                          <p className="font-bold text-gray-900">{item.planned_qty || item.quantity || item.qty}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Start Date</p>
                          <p className="font-bold text-gray-900">{item.planned_start_date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Raw Materials */}
        {rawMaterialItems.length > 0 && (
          <div className="bg-white rounded shadow mb-3">
            <button
              onClick={() => toggleSection(3)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-purple-600">3</span>
                <h2 className="text-sm font-semibold text-gray-900">Raw Materials ({rawMaterialItems.length})</h2>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[3] ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections[3] && (
              <div className="px-4 py-3 border-t border-gray-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Code</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Name</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Warehouse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterialItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1 font-medium text-gray-900">{item.item_code}</td>
                        <td className="px-2 py-1 text-gray-700">{item.item_name}</td>
                        <td className="px-2 py-1 text-right font-bold text-gray-900">{item.quantity || item.qty_as_per_bom}</td>
                        <td className="px-2 py-1 text-gray-700">{item.for_warehouse || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Sub-assembly Items */}
        {subAssemblyItems.length > 0 && (
          <div className="bg-white rounded shadow mb-3">
            <button
              onClick={() => toggleSection(4)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-600">4</span>
                <h2 className="text-sm font-semibold text-gray-900">Sub-Assembly ({subAssemblyItems.length})</h2>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[4] ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections[4] && (
              <div className="px-4 py-3 border-t border-gray-200">
                <div className="space-y-2">
                  {subAssemblyItems.map((item, idx) => (
                    <div key={idx} className="bg-blue-50 rounded p-2 border border-blue-200">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Item Code</p>
                          <p className="font-bold text-gray-900">{item.item_code}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Item Name</p>
                          <p className="font-bold text-gray-900">{item.item_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Qty</p>
                          <p className="font-bold text-gray-900">{item.required_qty || item.qty}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-semibold">Warehouse</p>
                          <p className="font-bold text-gray-900">{item.target_warehouse || '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 5: Operations */}
        {operationItems.length > 0 && (
          <div className="bg-white rounded shadow mb-3">
            <button
              onClick={() => toggleSection(5)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-indigo-600">5</span>
                <h2 className="text-sm font-semibold text-gray-900">Operations ({operationItems.length})</h2>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[5] ? 'rotate-180' : ''}`} />
            </button>

            {expandedSections[5] && (
              <div className="px-4 py-3 border-t border-gray-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Operation</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Workstation</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Time (hrs)</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Seq</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1 font-medium text-gray-900">{item.operation || item.operation_name}</td>
                        <td className="px-2 py-1 text-gray-700">{item.workstation || item.workstation_type || '-'}</td>
                        <td className="px-2 py-1 text-right font-bold text-gray-900">{item.time || item.operation_time || 0}</td>
                        <td className="px-2 py-1 text-gray-700">{item.sequence || idx + 1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between pt-3 mb-3">
          <button
            onClick={() => navigate('/manufacturing/production-planning')}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition"
          >
            ← Back to Plans
          </button>
          <div className="flex gap-2">
            {selectedSalesOrders.length > 0 && (
              <>
                <button
                  onClick={saveProductionPlan}
                  disabled={savingPlan || !selectedSalesOrders.length}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Save size={16} /> {savingPlan ? 'Saving...' : 'Save Plan'}
                </button>
                <button
                  onClick={async () => {
                    if (!selectedSalesOrders.length) {
                      setError('Please select a sales order')
                      return
                    }
                    await prepareWorkOrderData()
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm font-medium hover:bg-orange-700 transition flex items-center gap-2"
                >
                  <Zap size={16} /> Create Work Order
                </button>
              </>
            )}
          </div>
        </div>

        {/* Work Order Modal */}
        {showWorkOrderModal && workOrderData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99] p-4">
            <div className="bg-white rounded shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-orange-600 via-orange-600 to-orange-700 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-white bg-opacity-20 rounded p-1.5">
                    <Boxes size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-sm">Create Work Order</h2>
                    <p className="text-orange-100 text-xs">Review details and confirm</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowWorkOrderModal(false)
                    setWorkOrderData(null)
                  }}
                  className="text-white hover:bg-orange-500 p-1 rounded transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Main Info Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2 border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Item Code</p>
                    <p className="text-xs font-bold text-gray-900 break-words">{workOrderData.item_code}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2 border border-purple-200">
                    <p className="text-xs text-purple-600 font-semibold mb-1">BOM No</p>
                    <p className="text-xs font-bold text-gray-900 break-words">{workOrderData.bom_no}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2 border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Quantity</p>
                    <p className="text-xs font-bold text-gray-900">{workOrderData.quantity}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded p-2 border border-orange-200">
                    <p className="text-xs text-orange-600 font-semibold mb-1">Priority</p>
                    <p className="text-xs font-bold text-gray-900">{workOrderData.priority}</p>
                  </div>
                </div>

                {/* Operations Section */}
                {workOrderData.operations && workOrderData.operations.length > 0 && (
                  <div className="rounded overflow-hidden border border-gray-200 shadow-sm">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 px-3 py-2 border-b border-green-200">
                      <h3 className="font-semibold text-xs text-green-900 flex items-center gap-2">
                        <Factory size={14} className="text-green-600" />
                        Operations ({workOrderData.operations.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-40">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Operation</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Workstation</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Time (hrs)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {workOrderData.operations.map((op, idx) => (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 transition`}>
                              <td className="px-2 py-1 font-medium text-gray-900">{op.operation}</td>
                              <td className="px-2 py-1 text-gray-700">{op.workstation || '-'}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">{op.time || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Raw Materials Section */}
                {workOrderData.required_items && workOrderData.required_items.length > 0 && (
                  <div className="rounded overflow-hidden border border-gray-200 shadow-sm">
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-2 border-b border-purple-200">
                      <h3 className="font-semibold text-xs text-purple-900 flex items-center gap-2">
                        <Boxes size={14} className="text-purple-600" />
                        Raw Materials ({workOrderData.required_items.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto max-h-40">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Code</th>
                            <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Warehouse</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {workOrderData.required_items.map((item, idx) => (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition`}>
                              <td className="px-2 py-1 font-medium text-gray-900">{item.item_code}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">{item.required_qty}</td>
                              <td className="px-2 py-1 text-gray-700">{item.source_warehouse || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded p-3 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Notes</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{workOrderData.notes}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setShowWorkOrderModal(false)
                      setWorkOrderData(null)
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkOrder}
                    disabled={creatingWorkOrder}
                    className="px-3 py-1.5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded text-xs font-medium hover:from-orange-700 hover:to-orange-800 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-1"
                  >
                    <Check size={14} /> {creatingWorkOrder ? 'Creating...' : 'Confirm & Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
