import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Save, X, Plus, Trash2, AlertCircle, Package, Boxes, Archive, Check } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'

export default function ProductionPlanningForm() {
  const navigate = useNavigate()
  const { plan_id } = useParams()
  const [expandedSections, setExpandedSections] = useState({ 1: true, 1.5: true, 2: false, 3: false, 4: false })
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
    posting_date: new Date().toISOString().split('T')[0],
    sales_order_id: '',
    status: 'draft'
  })

  const [selectedSalesOrders, setSelectedSalesOrders] = useState([])
  const [selectedBomId, setSelectedBomId] = useState(null)
  const [selectedSalesOrderDetails, setSelectedSalesOrderDetails] = useState(null)
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

  const [items, setItems] = useState([])
  const [boms, setBOMs] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [salesOrders, setSalesOrders] = useState([])
  const [bomFinishedGoods, setBomFinishedGoods] = useState([])
  const [bomRawMaterials, setBomRawMaterials] = useState([])
  const [bomOperations, setBomOperations] = useState([])

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
          
          const postingDate = plan.posting_date || new Date().toISOString().split('T')[0]
          console.log('Plan posting_date from API:', plan.posting_date)
          console.log('Posting date after processing:', postingDate)
          
          setPlanHeader({
            plan_id: plan.plan_id || '',
            naming_series: plan.naming_series || 'PP',
            company: plan.company || '',
            posting_date: postingDate,
            sales_order_id: plan.sales_order_id || '',
            status: plan.status || 'draft'
          })
          console.log('Plan header set to:', {
            posting_date: postingDate
          })
          
          console.log('Sales order ID to fetch:', plan.sales_order_id)
          console.log('Available sales orders count:', salesOrders.length)
          console.log('Available sales orders:', salesOrders.map(so => ({
            sales_order_id: so.sales_order_id,
            customer_name: so.customer_name
          })))
          
          let hasError = false
          
          if (plan.sales_order_id && plan.sales_order_id.trim() !== '') {
            const matchingSO = salesOrders.find(so => so.sales_order_id === plan.sales_order_id)
            console.log('Matching sales order in list:', matchingSO)
            
            try {
              console.log('Fetching sales order details for:', plan.sales_order_id)
              const soDetails = await fetchSalesOrderDetails(plan.sales_order_id)
              console.log('Sales order details received:', soDetails)
              
              if (soDetails) {
                console.log('Setting selected sales orders:', [plan.sales_order_id])
                setSelectedSalesOrders([plan.sales_order_id])
                setSelectedSalesOrderDetails(soDetails)
                setSelectedBomId(soDetails.bom_id)
                console.log('Processing sales order data with saved plan data...')
                await processSalesOrderData(soDetails, postingDate, plan)
                console.log('Sales order data processed successfully with saved values merged')
              } else {
                console.warn('No sales order details returned')
                setError('Sales order not found. Please select a new sales order.')
                hasError = true
              }
            } catch (err) {
              console.error('Error fetching sales order details:', err)
              setError('Failed to load sales order details. Please select a sales order.')
              hasError = true
            }
          } else {
            console.log('No sales_order_id found in plan - user must select one')
            setSelectedSalesOrders([])
          }
          
          if (!hasError) {
            setSuccess('Production plan loaded successfully')
            setTimeout(() => setSuccess(null), 3000)
          }
        }
      } else {
        setError('Failed to load production plan')
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      console.error('Failed to fetch production plan:', err)
      setError('Error loading production plan')
      setTimeout(() => setError(null), 3000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initLoad = async () => {
      await Promise.all([
        fetchItems(),
        fetchBOMs(),
        fetchWarehouses(),
        fetchSalesOrders()
      ])
      
      if (plan_id) {
        await fetchProductionPlan(plan_id)
      }
    }
    initLoad()
  }, [plan_id])

  useEffect(() => {
    if (selectedSalesOrders.length > 0 && salesOrders.length > 0) {
      const selectedSO = salesOrders.find(so => so.sales_order_id === selectedSalesOrders[0])
      if (selectedSO) {
        console.log('Sales order auto-selected:', selectedSO.sales_order_id, selectedSO.customer_name)
      }
    }
  }, [selectedSalesOrders, salesOrders])

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setItems(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setBOMs(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch BOMs:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stock/warehouses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWarehouses(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSalesOrders(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch sales orders:', err)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        return data.data
      }
    } catch (err) {
      console.error('Failed to fetch BOM details:', err)
    }
    return null
  }

  const fetchSalesOrderDetails = async (salesOrderId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        return data.data
      }
    } catch (err) {
      console.error('Failed to fetch sales order details:', err)
    }
    return null
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.preventDefault()
  }

  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) return '-'
    const warehouseObj = warehouses.find(w => String(w.id) === String(warehouseId))
    return warehouseObj?.warehouse_name || warehouseId || '-'
  }

  const formatDateForAPI = (dateValue) => {
    if (!dateValue) return new Date().toISOString().split('T')[0]
    if (typeof dateValue === 'string') {
      if (dateValue.includes('T')) {
        return dateValue.split('T')[0]
      }
      return dateValue
    }
    return new Date(dateValue).toISOString().split('T')[0]
  }

  const updateFGItem = (index, field, value) => {
    const updatedItems = [...fgItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }
    setFGItems(updatedItems)
  }

  const updateSubAssemblyItem = (index, field, value) => {
    const updatedItems = [...subAssemblyItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }
    setSubAssemblyItems(updatedItems)
  }

  const updateRawMaterialItem = (index, field, value) => {
    const updatedItems = [...rawMaterialItems]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }
    setRawMaterialItems(updatedItems)
  }

  const startEditFG = (index) => {
    setEditingFGIndex(index)
    setEditBackupFG(JSON.parse(JSON.stringify(fgItems[index])))
  }

  const confirmEditFG = () => {
    setEditingFGIndex(null)
    setEditBackupFG(null)
  }

  const cancelEditFG = () => {
    if (editBackupFG !== null) {
      const updatedItems = [...fgItems]
      updatedItems[editingFGIndex] = editBackupFG
      setFGItems(updatedItems)
    }
    setEditingFGIndex(null)
    setEditBackupFG(null)
  }

  const startEditSubAsm = (index) => {
    setEditingSubAsmIndex(index)
    setEditBackupSubAsm(JSON.parse(JSON.stringify(subAssemblyItems[index])))
  }

  const confirmEditSubAsm = () => {
    setEditingSubAsmIndex(null)
    setEditBackupSubAsm(null)
  }

  const cancelEditSubAsm = () => {
    if (editBackupSubAsm !== null) {
      const updatedItems = [...subAssemblyItems]
      updatedItems[editingSubAsmIndex] = editBackupSubAsm
      setSubAssemblyItems(updatedItems)
    }
    setEditingSubAsmIndex(null)
    setEditBackupSubAsm(null)
  }

  const startEditRawMat = (index) => {
    setEditingRawMatIndex(index)
    setEditBackupRawMat(JSON.parse(JSON.stringify(rawMaterialItems[index])))
  }

  const confirmEditRawMat = () => {
    setEditingRawMatIndex(null)
    setEditBackupRawMat(null)
  }

  const cancelEditRawMat = () => {
    if (editBackupRawMat !== null) {
      const updatedItems = [...rawMaterialItems]
      updatedItems[editingRawMatIndex] = editBackupRawMat
      setRawMaterialItems(updatedItems)
    }
    setEditingRawMatIndex(null)
    setEditBackupRawMat(null)
  }

  const processSalesOrderData = async (soDetails, postingDate, planData = null) => {
    console.log('=== processSalesOrderData called ===')
    console.log('Sales order details:', soDetails.sales_order_id)
    console.log('BOM ID in soDetails:', soDetails.bom_id)
    console.log('Has bom_finished_goods:', soDetails.bom_finished_goods && soDetails.bom_finished_goods.length > 0)
    console.log('Has bom_raw_materials:', soDetails.bom_raw_materials && soDetails.bom_raw_materials.length > 0)
    
    let finishedGoods = []
    let allSubAssemblies = []
    let actualRawMaterials = []
    let operations = []

    if (soDetails.bom_finished_goods && soDetails.bom_finished_goods.length > 0) {
      console.log('Raw BOM finished goods from SO:', JSON.stringify(soDetails.bom_finished_goods, null, 2))
      console.log('BOM ID from SO:', soDetails.bom_id)
      finishedGoods = soDetails.bom_finished_goods.map(item => ({
        ...item,
        item_code: item.item_code || item.component_code || '',
        item_name: item.item_name || item.component_description || '',
        bom_no: item.bom_no || soDetails.bom_id || ''
      }))
      console.log('Processed FG items with bom_no:', JSON.stringify(finishedGoods, null, 2))
    }

    if (soDetails.bom_raw_materials && soDetails.bom_raw_materials.length > 0) {
      allSubAssemblies = soDetails.bom_raw_materials.filter(item =>
        item.component_type === 'Sub-assembly' || item.fg_sub_assembly === 'Sub-assembly' || item.item_group === 'Sub Assemblies'
      ).map(item => ({
        ...item,
        item_code: item.item_code || item.component_code || '',
        item_name: item.item_name || item.component_description || ''
      }))
      actualRawMaterials = soDetails.bom_raw_materials.filter(item =>
        (item.component_type === 'Raw-Material' || item.item_group === 'Raw Material') &&
        item.component_type !== 'Sub-assembly' && item.fg_sub_assembly !== 'Sub-assembly'
      ).map(item => ({
        ...item,
        item_code: item.item_code || item.component_code || '',
        item_name: item.item_name || item.component_description || ''
      }))
    }

    if (soDetails.bom_operations && soDetails.bom_operations.length > 0) {
      operations = soDetails.bom_operations
    }

    if (soDetails.bom_id && (finishedGoods.length === 0 || actualRawMaterials.length === 0)) {
      console.log('Fetching full BOM details for:', soDetails.bom_id)
      const bomDetails = await fetchBOMDetails(soDetails.bom_id)
      console.log('BOM details fetched:', bomDetails ? 'Yes' : 'No')
      if (bomDetails) {
        console.log('BOM details have lines:', bomDetails.lines && bomDetails.lines.length > 0)
        const lines = bomDetails.lines || []
        const rawMats = bomDetails.rawMaterials || []
        const bomOperations = bomDetails.operations || []

        if (finishedGoods.length === 0) {
          const fgFromLines = lines.filter(item =>
            item.component_type === 'FG' || item.fg_sub_assembly === 'FG'
          )
          finishedGoods = fgFromLines.length > 0 ? fgFromLines.map(item => ({
            ...item,
            item_code: item.item_code || item.component_code || '',
            item_name: item.item_name || item.component_description || '',
            bom_no: item.bom_no || bomDetails.bom_id || soDetails.bom_id || ''
          })) : [{
            item_code: bomDetails.item_code,
            item_name: bomDetails.product_name,
            component_code: bomDetails.item_code,
            component_description: bomDetails.product_name,
            item_group: bomDetails.item_group,
            quantity: bomDetails.quantity,
            qty: bomDetails.quantity,
            uom: bomDetails.uom,
            rate: 0,
            component_type: 'FG',
            warehouse: bomDetails.warehouse || '',
            planned_start_date: postingDate,
            bom_no: bomDetails.bom_id || soDetails.bom_id || ''
          }]
        } else {
          finishedGoods = finishedGoods.map(item => ({
            ...item,
            item_code: item.item_code || item.component_code || '',
            item_name: item.item_name || item.component_description || '',
            warehouse: item.warehouse || bomDetails.warehouse || '',
            planned_start_date: item.planned_start_date || postingDate,
            bom_no: item.bom_no || bomDetails.bom_id || soDetails.bom_id || ''
          }))
        }

        if (actualRawMaterials.length === 0 && allSubAssemblies.length === 0) {
          const subAssembliesFromLines = lines.filter(item =>
            item.component_type === 'Sub-assembly' || item.fg_sub_assembly === 'Sub-assembly' || item.item_group === 'Sub Assemblies'
          ).map(item => ({
            ...item,
            item_code: item.item_code || item.component_code || '',
            item_name: item.item_name || item.component_description || ''
          }))
          const subAssembliesFromRawMats = rawMats.filter(item =>
            item.component_type === 'Sub-assembly' || item.fg_sub_assembly === 'Sub-assembly' || item.item_group === 'Sub Assemblies'
          ).map(item => ({
            ...item,
            item_code: item.item_code || item.component_code || '',
            item_name: item.item_name || item.component_description || ''
          }))
          allSubAssemblies = [...subAssembliesFromLines, ...subAssembliesFromRawMats]
          actualRawMaterials = rawMats.filter(item =>
            (item.component_type === 'Raw-Material' || item.item_group === 'Raw Material') &&
            item.component_type !== 'Sub-assembly' && item.fg_sub_assembly !== 'Sub-assembly' && item.item_group !== 'Sub Assemblies'
          ).map(item => ({
            ...item,
            item_code: item.item_code || item.component_code || '',
            item_name: item.item_name || item.component_description || ''
          }))
        }

        if (operations.length === 0) {
          operations = bomOperations
        }
      }
    } else if (soDetails.bom_id) {
      finishedGoods = finishedGoods.map(item => ({
        ...item,
        warehouse: item.warehouse || '',
        planned_start_date: item.planned_start_date || postingDate,
        bom_no: item.bom_no || soDetails.bom_id || ''
      }))
    }

    allSubAssemblies = allSubAssemblies.map(item => ({
      ...item,
      item_code: item.item_code || item.component_code || '',
      item_name: item.item_name || item.component_description || '',
      target_warehouse: item.target_warehouse || '',
      scheduled_date: item.scheduled_date || postingDate,
      bom_no: item.bom_no || '',
      manufacturing_type: item.manufacturing_type || 'In House'
    }))

    actualRawMaterials = actualRawMaterials.map(item => ({
      ...item,
      item_code: item.item_code || item.component_code || '',
      item_name: item.item_name || item.component_description || '',
      for_warehouse: item.for_warehouse || '',
      type: item.type || 'Material',
      plan_to_request_qty: item.plan_to_request_qty || item.qty || 0,
      qty_as_per_bom: item.qty || item.quantity || 0,
      required_by: item.required_by || postingDate
    }))

    if (planData && planData.fg_items && planData.fg_items.length > 0) {
      console.log('Merging saved FG items with processed data')
      finishedGoods = finishedGoods.map(processedItem => {
        const savedItem = planData.fg_items.find(f => 
          f.item_code === processedItem.item_code && 
          f.item_name === processedItem.item_name
        )
        return savedItem ? { ...savedItem, ...processedItem } : processedItem
      })
    }

    if (planData && planData.sub_assemblies && planData.sub_assemblies.length > 0) {
      console.log('Merging saved sub-assemblies with processed data')
      allSubAssemblies = allSubAssemblies.map(processedItem => {
        const savedItem = planData.sub_assemblies.find(s => 
          s.item_code === processedItem.item_code && 
          s.item_name === processedItem.item_name
        )
        return savedItem ? { ...savedItem, ...processedItem } : processedItem
      })
    }

    if (planData && planData.raw_materials && planData.raw_materials.length > 0) {
      console.log('Merging saved raw materials with processed data')
      actualRawMaterials = actualRawMaterials.map(processedItem => {
        const savedItem = planData.raw_materials.find(r => 
          r.item_code === processedItem.item_code && 
          r.item_name === processedItem.item_name
        )
        return savedItem ? { ...savedItem, ...processedItem } : processedItem
      })
    }

    setSubAssemblyItems(allSubAssemblies)
    setFGItems(finishedGoods)
    setRawMaterialItems(actualRawMaterials)
    setOperationItems(operations)

    setBomFinishedGoods(finishedGoods)
    setBomRawMaterials(actualRawMaterials)
    setBomOperations(operations)

    setExpandedSections({ 1: true, 1.5: true, 2: true, 3: true, 4: true })

    const groupedFG = groupItemsByItemGroup(finishedGoods)
    const groupedSubAssembly = groupItemsByItemGroup(allSubAssemblies)
    const groupedRawMaterials = groupItemsByItemGroup(actualRawMaterials)

    const initialGroupExpand = {}
    Object.keys(groupedFG).forEach(group => {
      initialGroupExpand[`fg-${group}`] = true
    })
    Object.keys(groupedSubAssembly).forEach(group => {
      initialGroupExpand[`sub-${group}`] = true
    })
    Object.keys(groupedRawMaterials).forEach(group => {
      initialGroupExpand[`raw-${group}`] = true
    })
    setExpandedItemGroups(initialGroupExpand)
  }

  const handleSalesOrderSelect = async (value) => {
    if (value) {
      setSelectedSalesOrders([value])
      setFetchingBom(true)
      setExpandedItemGroups({})

      try {
        const soDetails = await fetchSalesOrderDetails(value)
        if (soDetails) {
          setSelectedSalesOrderDetails(soDetails)
          setSelectedBomId(soDetails.bom_id)
          await processSalesOrderData(soDetails, planHeader.posting_date)
        }
      } catch (err) {
        console.error('Error fetching BOM:', err)
        setError('Failed to fetch BOM details')
      } finally {
        setFetchingBom(false)
      }
    } else {
      setSelectedSalesOrders([])
      setSelectedBomId(null)
      setSelectedSalesOrderDetails(null)
      setFGItems([])
      setSubAssemblyItems([])
      setRawMaterialItems([])
      setOperationItems([])
      setBomFinishedGoods([])
      setBomRawMaterials([])
      setBomOperations([])
      setExpandedItemGroups({})
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      
      const salesOrderId = selectedSalesOrders.length > 0 ? selectedSalesOrders[0] : null
      
      const postingDate = formatDateForAPI(planHeader.posting_date)
      
      console.log('FG Items before save:', JSON.stringify(fgItems, null, 2))
      
      const formattedFGItems = fgItems.map(item => ({
        ...item,
        planned_start_date: formatDateForAPI(item.planned_start_date),
        bom_no: item.bom_no || selectedBomId || ''
      }))
      
      console.log('Formatted FG Items to save:', JSON.stringify(formattedFGItems, null, 2))
      
      const formattedSubAssemblies = subAssemblyItems.map(item => ({
        ...item,
        scheduled_date: formatDateForAPI(item.scheduled_date),
        bom_no: item.bom_no || ''
      }))
      
      const formattedRawMaterials = rawMaterialItems.map(item => ({
        ...item,
        required_by: formatDateForAPI(item.required_by)
      }))
      
      const payload = {
        plan_id: planHeader.plan_id || `PLAN-${Date.now()}`,
        naming_series: planHeader.naming_series,
        company: planHeader.company,
        posting_date: postingDate,
        sales_order_id: salesOrderId,
        status: planHeader.status,
        bom_id: selectedBomId,
        fg_items: formattedFGItems,
        sub_assemblies: formattedSubAssemblies,
        raw_materials: formattedRawMaterials,
        operations: operationItems
      }

      const url = plan_id
        ? `${import.meta.env.VITE_API_URL}/production-planning/${plan_id}`
        : `${import.meta.env.VITE_API_URL}/production-planning`

      const method = plan_id ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setSuccess('Production plan saved successfully')
        setTimeout(() => navigate('/manufacturing/production-planning'), 1500)
      } else {
        const errData = await response.json()
        setError(errData.error || 'Failed to save production plan')
      }
    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white px-3 py-2">
      <div className="max-w-6xl mx-auto">
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white">
              <Package size={16} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-gray-900 mb-0">Production Planning</h1>
              <p className="text-gray-600 text-xs">Create and manage production schedule</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-300 rounded text-xs text-red-800 flex gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-2 p-2 bg-green-50 border border-green-300 rounded text-xs text-green-800 flex gap-2">
            <Check size={14} className="flex-shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {loading && plan_id && (
          <div className="mb-2 p-3 bg-blue-50 border border-blue-300 rounded text-xs text-blue-800 flex items-center gap-2">
            <div className="animate-spin">⏳</div>
            <span>Loading production plan details...</span>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded mb-2 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(1)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Package size={14} />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Planning Details</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${expandedSections[1] ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections[1] && (
            <div className="border-t border-gray-200 p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Step 1: Select Sales Order</label>
                  <SearchableSelect
                    value={selectedSalesOrders.length > 0 ? selectedSalesOrders[0] : ''}
                    onChange={handleSalesOrderSelect}
                    options={salesOrders.map(so => ({
                      value: so.sales_order_id,
                      label: `${so.sales_order_id} - ${so.customer_name || 'N/A'}`
                    }))}
                    placeholder={fetchingBom ? "Loading BOM..." : "Search and select sales order..."}
                    isClearable={true}
                    disabled={fetchingBom}
                  />
                </div>

               
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Naming Series</label>
                    <input
                      type="text"
                      value={planHeader.naming_series}
                      onChange={(e) => setPlanHeader({ ...planHeader, naming_series: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder="e.g., PP"
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={planHeader.company}
                      onChange={(e) => setPlanHeader({ ...planHeader, company: e.target.value })}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter company name"
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Posting Date</label>
                    <input
                      type="date"
                      value={planHeader.posting_date}
                      onChange={(e) => setPlanHeader({ ...planHeader, posting_date: e.target.value })}
                      className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded mb-2 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(1.5)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Package size={14} />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Sales Orders</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${expandedSections[1.5] ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections[1.5] && (
            <div className="border-t border-gray-200 p-2">
              {selectedSalesOrderDetails ? (
                <div>
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">Get Sales Orders</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-100">
                          <th className="text-center py-1 px-2 font-semibold">No.</th>
                          <th className="text-left py-1 px-2 font-semibold">Sales Order</th>
                          <th className="text-left py-1 px-2 font-semibold">Sales Order Date</th>
                          <th className="text-left py-1 px-2 font-semibold">Customer</th>
                          <th className="text-right py-1 px-2 font-semibold">Grand Total</th>
                          <th className="text-center py-1 px-2 font-semibold"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="text-center py-1 px-2 font-medium">1</td>
                          <td className="py-1 px-2 font-medium text-blue-600">{selectedSalesOrderDetails.sales_order_id || '-'}</td>
                          <td className="py-1 px-2">{selectedSalesOrderDetails.sales_order_date || '-'}</td>
                          <td className="py-1 px-2">{selectedSalesOrderDetails.customer_name || '-'}</td>
                          <td className="py-1 px-2 text-right">₹ {parseFloat(selectedSalesOrderDetails.grand_total || 0).toFixed(2)}</td>
                          <td className="text-center py-1 px-2 text-blue-600 cursor-pointer">✎</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600">No sales order selected. Select a sales order first.</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded mb-2 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(2)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <Package size={14} />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Step 2: Finished Goods ({fgItems.length})</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${expandedSections[2] ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections[2] && (
            <div className="border-t border-gray-200 p-2">
              {fgItems.length > 0 && (
                <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="text-xs font-semibold text-blue-900 mb-1">📦 Item Details</h3>
                  <div className="space-y-1">
                    {Object.entries(groupItemsByItemGroup(fgItems)).map(([group, items]) => (
                      <div key={group} className="flex items-center justify-between">
                        <span className="text-xs text-blue-700">
                          <strong>Finished Goods Item Group:</strong> {group}
                        </span>
                        <span className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded">{items.length} items</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fgItems.length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(groupItemsByItemGroup(fgItems)).map(([group, items]) => (
                    <div key={group} className="border border-gray-200 rounded">
                      <button
                        type="button"
                        onClick={() => toggleItemGroup(`fg-${group}`)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
                      >
                        <span className="text-xs font-semibold text-gray-800">{group} ({items.length})</span>
                        <ChevronDown size={14} className={`text-gray-600 transition-transform ${expandedItemGroups[`fg-${group}`] ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedItemGroups[`fg-${group}`] && (
                        <div className="border-t border-gray-200 p-1 bg-gray-50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-100">
                                  <th className="text-center py-1 px-2 font-semibold">No.</th>
                                  <th className="text-left py-1 px-2 font-semibold">Item Code</th>
                                  <th className="text-left py-1 px-2 font-semibold">BOM No</th>
                                  <th className="text-right py-1 px-2 font-semibold">Planned Qty</th>
                                  <th className="text-left py-1 px-2 font-semibold">UOM</th>
                                  <th className="text-left py-1 px-2 font-semibold">Finished Goods Warehouse</th>
                                  <th className="text-left py-1 px-2 font-semibold">Planned Start Date</th>
                                  <th className="text-center py-1 px-2 font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  const globalIdx = fgItems.findIndex(fg => 
                                    fg.item_code === item.item_code && fg.item_name === item.item_name
                                  )
                                  const isEditing = editingFGIndex === globalIdx
                                  const stateItem = globalIdx >= 0 ? fgItems[globalIdx] : item
                                  return (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-white">
                                      <td className="py-1 px-2 text-center text-xs font-medium">{globalIdx + 1}</td>
                                      <td className="py-1 px-2 text-xs font-medium">{stateItem.component_code || stateItem.item_code || '-'}</td>
                                      <td className="py-1 px-2 text-xs">{selectedBomId || '-'}</td>
                                      <td className="py-1 px-2 text-right text-xs font-medium">{stateItem.quantity || stateItem.qty || 1}</td>
                                      <td className="py-1 px-2 text-xs">{stateItem.uom || '-'}</td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <SearchableSelect
                                            value={stateItem.warehouse || stateItem.fg_warehouse || ''}
                                            onChange={(val) => updateFGItem(globalIdx, 'warehouse', val)}
                                            options={warehouses.map(w => ({
                                              value: w.id,
                                              label: w.warehouse_name
                                            }))}
                                            placeholder="Select warehouse"
                                            isClearable={true}
                                          />
                                        ) : (
                                          <span className="text-xs">{getWarehouseName(stateItem.warehouse)}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <input
                                            type="date"
                                            value={stateItem.planned_start_date || ''}
                                            onChange={(e) => updateFGItem(globalIdx, 'planned_start_date', e.target.value)}
                                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        ) : (
                                          <span className="text-xs">{stateItem.planned_start_date || '-'}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 flex gap-1 justify-end">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={() => confirmEditFG()}
                                              className="text-green-600 hover:text-green-700 text-lg"
                                              title="Confirm"
                                            >
                                              ✓
                                            </button>
                                            <button
                                              onClick={() => cancelEditFG()}
                                              className="text-red-600 hover:text-red-700 text-lg"
                                              title="Cancel"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => startEditFG(globalIdx)}
                                            className="text-blue-600 hover:text-blue-700"
                                            title="Edit"
                                          >
                                            ✎
                                          </button>
                                        )}
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
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No finished goods found. Select a sales order first.</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded mb-2 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(3)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                <Boxes size={14} />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Step 3: Sub-Assembly Items ({subAssemblyItems.length})</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${expandedSections[3] ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections[3] && (
            <div className="border-t border-gray-200 p-2">
              {subAssemblyItems.length > 0 && (
                <div className="mb-3 space-y-2">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={consolidateSubAssembly}
                        onChange={(e) => setConsolidateSubAssembly(e.target.checked)}
                        className="w-4 h-4 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span>Consolidate Sub Assembly Items</span>
                    </label>
                  </div>
                  <div className="flex items-start gap-4">
                    <label className="flex items-start gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={skipAvailableSubAssembly}
                        onChange={(e) => setSkipAvailableSubAssembly(e.target.checked)}
                        className="w-4 h-4 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mt-0.5"
                      />
                      <div>
                        <div>Skip Available Sub Assembly Items</div>
                        <p className="text-gray-600 text-xs mt-0.5">If this checkbox is enabled, then the system won't run the MRP for the available sub-assembly items.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
              {subAssemblyItems.length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(groupItemsByItemGroup(subAssemblyItems)).map(([group, items]) => (
                    <div key={group} className="border border-gray-200 rounded">
                      <button
                        type="button"
                        onClick={() => toggleItemGroup(`sub-${group}`)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
                      >
                        <span className="text-xs font-semibold text-gray-800">{group} ({items.length})</span>
                        <ChevronDown size={14} className={`text-gray-600 transition-transform ${expandedItemGroups[`sub-${group}`] ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedItemGroups[`sub-${group}`] && (
                        <div className="border-t border-gray-200 p-1 bg-gray-50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-100">
                                  <th className="text-center py-1 px-2 font-semibold">
                                    <input
                                      type="checkbox"
                                      className="w-3 h-3 border border-gray-300 rounded"
                                    />
                                  </th>
                                  <th className="text-center py-1 px-2 font-semibold">No.</th>
                                  <th className="text-left py-1 px-2 font-semibold">Sub Assembly Item Code</th>
                                  <th className="text-left py-1 px-2 font-semibold">Target Warehouse</th>
                                  <th className="text-left py-1 px-2 font-semibold">Scheduled Date</th>
                                  <th className="text-right py-1 px-2 font-semibold">Required Qty</th>
                                  <th className="text-left py-1 px-2 font-semibold">BOM No</th>
                                  <th className="text-left py-1 px-2 font-semibold">Manufacturing Type</th>
                                  <th className="text-center py-1 px-2 font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  const globalIdx = subAssemblyItems.findIndex(sub =>
                                    sub.item_code === item.item_code && sub.item_name === item.item_name
                                  )
                                  const isEditing = editingSubAsmIndex === globalIdx
                                  const stateItem = globalIdx >= 0 ? subAssemblyItems[globalIdx] : item
                                  return (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-white">
                                      <td className="text-center py-1 px-2">
                                        <input
                                          type="checkbox"
                                          className="w-3 h-3 border border-gray-300 rounded"
                                        />
                                      </td>
                                      <td className="text-center py-1 px-2 font-medium">{globalIdx + 1}</td>
                                      <td className="py-1 px-2 font-medium">{stateItem.component_code || stateItem.item_code || '-'}</td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <SearchableSelect
                                            value={stateItem.target_warehouse || ''}
                                            onChange={(val) => updateSubAssemblyItem(globalIdx, 'target_warehouse', val)}
                                            options={warehouses.map(w => ({
                                              value: w.id,
                                              label: w.warehouse_name
                                            }))}
                                            placeholder="Select warehouse"
                                            isClearable={true}
                                          />
                                        ) : (
                                          <span className="text-xs">{getWarehouseName(stateItem.target_warehouse)}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <input
                                            type="date"
                                            value={stateItem.scheduled_date || ''}
                                            onChange={(e) => updateSubAssemblyItem(globalIdx, 'scheduled_date', e.target.value)}
                                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        ) : (
                                          <span className="text-xs">{stateItem.scheduled_date || '-'}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 text-right">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            value={stateItem.quantity || stateItem.qty || ''}
                                            onChange={(e) => updateSubAssemblyItem(globalIdx, 'qty', parseFloat(e.target.value))}
                                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                          />
                                        ) : (
                                          <span className="text-xs">{stateItem.quantity || stateItem.qty || '-'}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2">{stateItem.bom_no || '-'}</td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <select
                                            value={stateItem.manufacturing_type || 'In House'}
                                            onChange={(e) => updateSubAssemblyItem(globalIdx, 'manufacturing_type', e.target.value)}
                                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          >
                                            <option value="In House">In House</option>
                                            <option value="Out Source">Out Source</option>
                                          </select>
                                        ) : (
                                          <span className="text-xs">{stateItem.manufacturing_type || '-'}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 flex gap-1 justify-end">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={() => confirmEditSubAsm()}
                                              className="text-green-600 hover:text-green-700 text-lg"
                                              title="Confirm"
                                            >
                                              ✓
                                            </button>
                                            <button
                                              onClick={() => cancelEditSubAsm()}
                                              className="text-red-600 hover:text-red-700 text-lg"
                                              title="Cancel"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => startEditSubAsm(globalIdx)}
                                            className="text-blue-600 hover:text-blue-700"
                                            title="Edit"
                                          >
                                            ✎
                                          </button>
                                        )}
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
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No sub-assembly items found. Select a sales order first.</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded mb-2 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection(4)}
            className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                <Archive size={14} />
              </div>
              <h2 className="text-xs font-semibold text-gray-900">Step 4: Raw Material Planning ({rawMaterialItems.length})</h2>
            </div>
            <ChevronDown size={16} className={`text-gray-600 transition-transform ${expandedSections[4] ? 'rotate-180' : ''}`} />
          </button>
          {expandedSections[4] && (
            <div className="border-t border-gray-200 p-2">
              {rawMaterialItems.length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(groupItemsByItemGroup(rawMaterialItems)).map(([group, items]) => (
                    <div key={group} className="border border-gray-200 rounded">
                      <button
                        type="button"
                        onClick={() => toggleItemGroup(`raw-${group}`)}
                        className="w-full flex items-center justify-between p-1.5 hover:bg-gray-50 transition"
                      >
                        <span className="text-xs font-semibold text-gray-800">{group} ({items.length})</span>
                        <ChevronDown size={14} className={`text-gray-600 transition-transform ${expandedItemGroups[`raw-${group}`] ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedItemGroups[`raw-${group}`] && (
                        <div className="border-t border-gray-200 p-1 bg-gray-50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-100">
                                  <th className="text-center py-1 px-2 font-semibold">
                                    <input
                                      type="checkbox"
                                      className="w-3 h-3 border border-gray-300 rounded"
                                    />
                                  </th>
                                  <th className="text-center py-1 px-2 font-semibold">No.</th>
                                  <th className="text-left py-1 px-2 font-semibold">Item Code</th>
                                  <th className="text-left py-1 px-2 font-semibold">For Warehouse</th>
                                  <th className="text-left py-1 px-2 font-semibold">Type</th>
                                  <th className="text-right py-1 px-2 font-semibold">Plan to Request Qty</th>
                                  <th className="text-right py-1 px-2 font-semibold">Qty As Per BOM</th>
                                  <th className="text-left py-1 px-2 font-semibold">Required By</th>
                                  <th className="text-center py-1 px-2 font-semibold">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map((item, idx) => {
                                  const globalIdx = rawMaterialItems.findIndex(raw =>
                                    raw.item_code === item.item_code && raw.item_name === item.item_name
                                  )
                                  const isEditing = editingRawMatIndex === globalIdx
                                  const stateItem = globalIdx >= 0 ? rawMaterialItems[globalIdx] : item
                                  return (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-white">
                                      <td className="text-center py-1 px-2">
                                        <input
                                          type="checkbox"
                                          className="w-3 h-3 border border-gray-300 rounded"
                                        />
                                      </td>
                                      <td className="text-center py-1 px-2 font-medium">{globalIdx + 1}</td>
                                      <td className="py-1 px-2 font-medium">{stateItem.item_code || '-'}</td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <SearchableSelect
                                            value={stateItem.for_warehouse || ''}
                                            onChange={(val) => updateRawMaterialItem(globalIdx, 'for_warehouse', val)}
                                            options={warehouses.map(w => ({
                                              value: w.id,
                                              label: w.warehouse_name
                                            }))}
                                            placeholder="Select warehouse"
                                            isClearable={true}
                                          />
                                        ) : (
                                          <span className="text-xs">{getWarehouseName(stateItem.for_warehouse)}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2">{stateItem.type || '-'}</td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            value={stateItem.plan_to_request_qty || ''}
                                            onChange={(e) => updateRawMaterialItem(globalIdx, 'plan_to_request_qty', parseFloat(e.target.value))}
                                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                          />
                                        ) : (
                                          <span className="text-xs text-right block">{stateItem.plan_to_request_qty || 0}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 text-right font-medium">{stateItem.qty_as_per_bom || 0}</td>
                                      <td className="py-1 px-2">
                                        {isEditing ? (
                                          <input
                                            type="date"
                                            value={stateItem.required_by || ''}
                                            onChange={(e) => updateRawMaterialItem(globalIdx, 'required_by', e.target.value)}
                                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                        ) : (
                                          <span className="text-xs">{stateItem.required_by || '-'}</span>
                                        )}
                                      </td>
                                      <td className="py-1 px-2 flex gap-1 justify-end">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={() => confirmEditRawMat()}
                                              className="text-green-600 hover:text-green-700 text-lg"
                                              title="Confirm"
                                            >
                                              ✓
                                            </button>
                                            <button
                                              onClick={() => cancelEditRawMat()}
                                              className="text-red-600 hover:text-red-700 text-lg"
                                              title="Cancel"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => startEditRawMat(globalIdx)}
                                            className="text-blue-600 hover:text-blue-700"
                                            title="Edit"
                                          >
                                            ✎
                                          </button>
                                        )}
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
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No raw materials found. Select a sales order first.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end mb-3 mt-3">
          <button
            type="button"
            onClick={() => navigate('/manufacturing/production-planning')}
            className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 hover:border-gray-400 flex items-center gap-1 transition"
          >
            <X size={12} /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1 transition"
          >
            <Save size={12} /> {loading ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
