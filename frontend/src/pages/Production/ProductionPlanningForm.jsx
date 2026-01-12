import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Save, X, Plus, Trash2, AlertCircle, Package, Boxes, Archive, Check, Factory, Zap } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'

const isSubAssemblyGroup = (itemGroup) => {
  if (!itemGroup) return false
  const normalized = itemGroup.toLowerCase().replace(/[-\s]/g, '').trim()
  return normalized === 'subassemblies' || normalized === 'subassembly'
}

export default function ProductionPlanningForm() {
  const navigate = useNavigate()
  const { plan_id } = useParams()
  const [expandedSections, setExpandedSections] = useState({ 0: true, 1: true, 1.5: true, 2: true, 3: true, 3.5: true, 4: true, 5: true })
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
  const [subAssemblyBomMaterials, setSubAssemblyBomMaterials] = useState([])
  const [fetchingSubAssemblyBoms, setFetchingSubAssemblyBoms] = useState(false)
  const [expandedMaterialDetails, setExpandedMaterialDetails] = useState({})
  const [nestedMaterialsData, setNestedMaterialsData] = useState({})
  const [expandedOperations, setExpandedOperations] = useState({})
  const [expandedMaterialOps, setExpandedMaterialOps] = useState({})
  const [materialOperationsData, setMaterialOperationsData] = useState({})
  const [expandedBomOps, setExpandedBomOps] = useState({})
  const [bomOperationsData, setBomOperationsData] = useState({})
  const [creatingWorkOrders, setCreatingWorkOrders] = useState(false)

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
        setBomFinishedGoods(bomData.lines || bomData.finished_goods || bomData.bom_finished_goods || [])
        setBomRawMaterials(bomData.rawMaterials || bomData.bom_raw_materials || [])
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

  const fetchSubAssemblyBomMaterials = async (subAssemblyItems) => {
    if (!subAssemblyItems || subAssemblyItems.length === 0) {
      console.warn('No sub-assembly items to fetch materials for')
      return
    }

    try {
      console.log('=== STARTING SUB-ASSEMBLY BOM MATERIALS FETCH ===')
      console.log('Total sub-assemblies to process:', subAssemblyItems.length)
      console.log('Input items structure:', subAssemblyItems)
      
      const token = localStorage.getItem('token')
      const allSubAsmMaterials = []

      for (let idx = 0; idx < subAssemblyItems.length; idx++) {
        const subAsm = subAssemblyItems[idx]
        const subAsmCode = subAsm.item_code || subAsm.component_code
        const subAsmName = subAsm.item_name || subAsm.component_description || subAsmCode
        const subAsmQty = subAsm.quantity || subAsm.qty || 1

        console.log(`\n--- Processing Sub-Assembly ${idx + 1}/${subAssemblyItems.length} ---`)
        console.log('Sub-Assembly Code:', subAsmCode)
        console.log('Sub-Assembly Name:', subAsmName)
        console.log('Sub-Assembly Quantity:', subAsmQty)
        console.log('Sub-Assembly Item Details:', JSON.stringify(subAsm, null, 2))
        console.log('Checking for BOM ID in item:')
        console.log('  bom_id:', subAsm.bom_id)
        console.log('  bom_no:', subAsm.bom_no)
        console.log('  bom:', subAsm.bom)
        console.log('  All fields:', Object.keys(subAsm).join(', '))

        try {
          let bomId = null
          let bomData = null
          
          console.log(`Fetching BOMs for sub-assembly item_code: ${subAsmCode}`)
          console.log(`Note: Ignoring any BOM ID from raw materials (${subAsm.bom_id || subAsm.bom_no}) as it's likely the finished goods BOM`)
          
          const subAsmBomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?item_code=${subAsmCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (!subAsmBomRes.ok) {
            console.warn(`Failed to fetch BOMs. Status: ${subAsmBomRes.status}`)
            continue
          }
          
          const subAsmBomData = await subAsmBomRes.json()
          const bomList = subAsmBomData.data || []
          console.log(`API Response structure:`, JSON.stringify(subAsmBomData, null, 2).substring(0, 500))
          console.log(`BOMs found: ${bomList.length}`)
          bomList.forEach((bom, i) => {
            console.log(`  BOM ${i + 1}: ${bom.bom_id || bom.id} | item: ${bom.item || bom.item_code || 'N/A'} | name: ${bom.bom_name || 'N/A'}`)
          })
          
          if (bomList.length === 0) {
            console.warn(`No BOM found for sub-assembly: ${subAsmCode}`)
            continue
          }
          
          let selectedBom = null
          
          for (const bom of bomList) {
            const testBomId = bom.bom_id || bom.id
            try {
              const testBomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${testBomId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              
              if (testBomRes.ok) {
                const testBomData = await testBomRes.json()
                const bomDetail = testBomData.data || testBomData
                const bomItemCode = bomDetail.item_code || bomDetail.item || ''
                const bomName = bomDetail.bom_name || bomDetail.name || ''
                
                console.log(`Testing BOM ${testBomId}:`)
                console.log(`  Detail item_code: "${bomItemCode}"`)
                console.log(`  Detail name: "${bomName}"`)
                console.log(`  Looking for: "${subAsmCode}"`)
                console.log(`  Full detail:`, JSON.stringify(bomDetail, null, 2).substring(0, 300))
                
                if (bomItemCode.toLowerCase() === subAsmCode.toLowerCase()) {
                  console.log(`✓✓ MATCHED! Found correct sub-assembly BOM: ${testBomId}`)
                  selectedBom = bom
                  bomData = bomDetail
                  break
                } else {
                  console.log(`✗ No match (expected "${subAsmCode}", got "${bomItemCode}")`)
                }
              }
            } catch (e) {
              console.warn(`Failed to check BOM ${testBomId}`)
            }
          }
          
          if (!selectedBom) {
            selectedBom = bomList[0]
            console.log(`Using first available BOM as fallback`)
            const bomDetailsRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${selectedBom.bom_id || selectedBom.id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (bomDetailsRes.ok) {
              const bomDetails = await bomDetailsRes.json()
              bomData = bomDetails.data || bomDetails
            }
          }
          
          bomId = selectedBom.bom_id || selectedBom.id
          console.log(`BOM ID extracted from API: ${bomId}`)
          
          if (!bomId || !bomData) {
            console.warn(`Could not determine BOM ID or fetch BOM data for sub-assembly: ${subAsmCode}`)
            continue
          }
          
          console.log(`Using BOM ID: ${bomId}`)
          
          const rawMaterials = bomData.rawMaterials || bomData.bom_raw_materials || []
          const operations = bomData.operations || bomData.bom_operations || []
          
          console.log(`Raw Materials in BOM: ${rawMaterials.length}`)
          rawMaterials.forEach((mat, i) => {
            console.log(`  Material ${i + 1}: ${mat.item_code || mat.component_code} - Qty: ${mat.quantity || mat.qty}`)
          })
          
          console.log(`Operations in BOM: ${operations.length}`)
          operations.forEach((op, i) => {
            console.log(`  Operation ${i + 1}: ${op.operation_name || op.name} - Time: ${op.operation_time}`)
          })
          
          const filteredMaterials = rawMaterials.filter(m => !isSubAssemblyGroup(m.item_group))
          console.log(`Filtered Materials (after removing sub-assemblies): ${filteredMaterials.length}`)
          
          filteredMaterials.forEach(mat => {
            const matQty = (mat.qty || mat.quantity || 0) * subAsmQty
            const matEntry = {
              ...mat,
              sub_assembly_code: subAsmCode,
              sub_assembly_name: subAsmName,
              bom_id: bomId,
              quantity: matQty,
              qty: matQty
            }
            allSubAsmMaterials.push(matEntry)
            console.log(`  Added material: ${mat.item_code || mat.component_code} - Qty: ${matQty}`)
          })
          
          operations.forEach(op => {
            const opTime = (op.operation_time || op.time || 0) * subAsmQty
            const opEntry = {
              ...op,
              sub_assembly_code: subAsmCode,
              sub_assembly_name: subAsmName,
              bom_id: bomId,
              is_operation: true,
              operation_qty: opTime,
              operation_time: opTime
            }
            allSubAsmMaterials.push(opEntry)
            console.log(`  Added operation: ${op.operation_name || op.name} - Time: ${opTime}`)
          })
          
          console.log(`✓ Sub-assembly ${subAsmCode} processed successfully`)
        } catch (err) {
          console.error(`✗ Error processing sub-assembly ${subAsmCode}:`, err)
        }
      }
      
      console.log('\n=== FETCH COMPLETE ===')
      console.log('Total items fetched (materials + operations):', allSubAsmMaterials.length)
      
      setSubAssemblyBomMaterials(allSubAsmMaterials)
      console.log('Sub-Assembly BOM Materials state updated')
    } catch (err) {
      console.error('Error fetching sub-assembly BOM materials:', err)
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
      const materials = (bomData.rawMaterials || bomData.bom_raw_materials || []).filter(m => {
        const group = m.item_group || m.group || ''
        return !isSubAssemblyGroup(group)
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

  useEffect(() => {
    console.log('=== rawMaterialItems CHANGED ===')
    console.log('rawMaterialItems count:', rawMaterialItems.length)
    console.log('rawMaterialItems data:', rawMaterialItems)
  }, [rawMaterialItems])

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

      const bomFinishedGoods = bomFinishedGoodsFromSO.length > 0 ? bomFinishedGoodsFromSO : (bomData?.lines || bomData?.finished_goods || bomData?.bom_finished_goods || [])
      
      const isSubAssemblyType = (itemType, itemGroup = '') => {
        if (!itemType && !itemGroup) return false
        
        const normalizeStr = (str) => str ? str.toLowerCase().replace(/[-\s]/g, '').trim() : ''
        
        const typeNorm = normalizeStr(itemType)
        const groupNorm = normalizeStr(itemGroup)
        
        const subAsmPatterns = ['subassemblies', 'subassembly', 'subassembries', 'sub-assembly', 'assembly']
        
        return subAsmPatterns.some(pattern => 
          typeNorm.includes(pattern) || groupNorm.includes(pattern)
        )
      }
      
      console.log('=== BOM FINISHED GOODS ANALYSIS ===')
      console.log('Total items in BOM Finished Goods:', bomFinishedGoods.length)
      bomFinishedGoods.forEach((item, idx) => {
        const typeField = item.fg_sub_assembly || item.component_type
        const groupField = item.item_group || item.group || ''
        const isSubAsm = isSubAssemblyType(typeField, groupField)
        console.log(`Item ${idx + 1}: Code=${item.item_code || item.component_code}, Type="${typeField}", Group="${groupField}", IsSubAssembly=${isSubAsm}, Full=${JSON.stringify({type: typeField, group: groupField})}`)
      })
      
      const finishedGoodsOnly = bomFinishedGoods.filter(item => !isSubAssemblyType(item.fg_sub_assembly || item.component_type, item.item_group))
      const subAssembliesOnly = bomFinishedGoods.filter(item => isSubAssemblyType(item.fg_sub_assembly || item.component_type, item.item_group))
      
      console.log('Separated Finished Goods:', finishedGoodsOnly.length)
      console.log('Separated Sub-Assemblies:', subAssembliesOnly.length)
      console.log('Sub-Assemblies Detail:', subAssembliesOnly)
      
      if (finishedGoodsOnly.length > 0) {
        const fgItemsFromBOM = finishedGoodsOnly.map(fgItem => ({
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

      if (subAssembliesOnly.length > 0) {
        const subAsmItemsFromBOM = subAssembliesOnly.map(subAsmItem => ({
          item_code: subAsmItem.item_code || subAsmItem.component_code,
          item_name: subAsmItem.item_name || subAsmItem.component_description,
          quantity: (subAsmItem.qty || subAsmItem.quantity || subAsmItem.bom_qty || 1) * quantity,
          sales_order_quantity: quantity,
          fg_sub_assembly: subAsmItem.fg_sub_assembly || subAsmItem.component_type || 'Sub-Assembly',
          planned_start_date: new Date().toISOString().split('T')[0],
          planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }))
        console.log('Setting Sub-Assembly Items:', subAsmItemsFromBOM)
        setSubAssemblyItems(subAsmItemsFromBOM)
        
        await fetchSubAssemblyBomMaterials(subAsmItemsFromBOM)
      } else {
        setSubAssemblyItems([])
        setSubAssemblyBomMaterials([])
      }

      const allMaterials = bomRawMaterialsFromSO.length > 0 ? bomRawMaterialsFromSO : (bomData?.rawMaterials || bomData?.bom_raw_materials || [])
      const proportionalMaterials = allMaterials
        .filter(mat => mat.item_group !== 'Consumable')
        .map(mat => ({
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

  const fetchNestedMaterialDetails = async (subAsmCode, bomId) => {
    const detailKey = `${subAsmCode}-${bomId}`
    
    if (nestedMaterialsData[detailKey]) {
      setExpandedMaterialDetails(prev => ({
        ...prev,
        [detailKey]: !prev[detailKey]
      }))
      return
    }

    try {
      const token = localStorage.getItem('token')
      const nestedMaterials = []

      let bomDetailsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (!bomDetailsResponse.ok && bomDetailsResponse.status === 404) {
        console.warn(`BOM ID ${bomId} not found, trying to fetch BOMs list...`)
        try {
          const bomListResponse = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (bomListResponse.ok) {
            const bomListData = await bomListResponse.json()
            const bomList = bomListData.data || []
            const foundBom = bomList.find(b => b.bom_id === bomId || b.item_code === bomId)
            if (foundBom) {
              bomDetailsResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/production/boms/${foundBom.bom_id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              )
            } else {
              console.warn(`No BOM found for ${bomId}`)
            }
          }
        } catch (fallbackErr) {
          console.error('Error in BOM fallback lookup:', fallbackErr)
        }
      }

      if (!bomDetailsResponse.ok) {
        console.warn(`BOM ${bomId} not found, skipping nested material details`)
        setNestedMaterialsData(prev => ({...prev, [detailKey]: []}))
        setExpandedMaterialDetails(prev => ({...prev, [detailKey]: false}))
        return
      }

      const bomDetails = await bomDetailsResponse.json()
      let bom = bomDetails.data || bomDetails
      
      if (!bom) {
        console.warn(`No BOM data returned for ${bomId}`)
        setNestedMaterialsData(prev => ({...prev, [detailKey]: []}))
        setExpandedMaterialDetails(prev => ({...prev, [detailKey]: false}))
        return
      }
      
      if (Array.isArray(bom)) {
        bom = bom[0]
      }
      console.log('BOM data fetched:', bom)
      
      const bomLines = bom.rawMaterials || bom.lines || bom.bom_raw_materials || []
      console.log('BOM raw materials:', bomLines)

      let bomList = boms && boms.length > 0 ? boms : []
      if (bomList.length === 0) {
        const bomListResponse = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (bomListResponse.ok) {
          const bomListData = await bomListResponse.json()
          bomList = bomListData.data || []
        } else {
          console.warn('Failed to fetch BOM list')
        }
      }
      console.log('Available BOMs:', bomList)

      for (const material of bomLines) {
        const itemCode = (material.item_code || material.component_code || '').trim()
        const itemName = material.item_name || material.component_description || ''
        
        if (!itemCode) continue

        const matchingBom = bomList.find(b => {
          const bomItemCode = (b.item_code || b.product_code || '').trim()
          return bomItemCode.toLowerCase() === itemCode.toLowerCase()
        })

        if (matchingBom) {
          console.log(`Found matching BOM for ${itemCode}:`, matchingBom)
          
          const subBomDetailsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/production/boms/${matchingBom.bom_id}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )

          if (!subBomDetailsResponse.ok) {
            console.warn(`Failed to fetch sub-BOM ${matchingBom.bom_id}`)
            continue
          }

          const subBomDetails = await subBomDetailsResponse.json()
          const subBom = subBomDetails.data || subBomDetails
          console.log(`Sub-BOM details for ${itemCode}:`, subBom)
          
          const subMaterials = subBom.rawMaterials || subBom.bom_raw_materials || []
          const operations = subBom.operations || subBom.bom_operations || []

          subMaterials.forEach(subMat => {
            if (subMat.item_group === 'Consumable') return
            
            const subBomQty = subMat.qty || subMat.quantity || 1
            const parentBomQty = material.qty || material.quantity || 1
            const actualQty = subBomQty * parentBomQty * salesOrderQuantity
            nestedMaterials.push({
              parent_code: itemCode,
              parent_name: itemName,
              parent_bom_id: matchingBom.bom_id,
              item_code: subMat.item_code || subMat.component_code,
              item_name: subMat.item_name || subMat.component_description,
              item_group: subMat.item_group || 'N/A',
              qty: actualQty,
              bom_qty: subBomQty,
              parent_bom_qty: parentBomQty,
              operations_qty: operations.length > 0 ? operations.reduce((sum, op) => sum + (op.operation_time || op.time || 0), 0) : 0,
              operations_count: operations.length
            })
          })
        } else {
          console.warn(`No matching BOM found for item code: ${itemCode}`)
        }
      }

      console.log('Nested materials collected:', nestedMaterials)

      setNestedMaterialsData(prev => ({
        ...prev,
        [detailKey]: nestedMaterials
      }))

      setExpandedMaterialDetails(prev => ({
        ...prev,
        [detailKey]: true
      }))
    } catch (err) {
      console.error('Error fetching nested material details:', err)
      setNestedMaterialsData(prev => ({...prev, [detailKey]: []}))
      setExpandedMaterialDetails(prev => ({...prev, [detailKey]: false}))
    }
  }

  const fetchMaterialOperations = async (materialItemCode, subAsmCode, bomId) => {
    const opKey = `${subAsmCode}-${bomId}-${materialItemCode}-mat-ops`
    
    if (materialOperationsData[opKey]) {
      setExpandedMaterialOps(prev => ({
        ...prev,
        [opKey]: !prev[opKey]
      }))
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      let bomList = boms && boms.length > 0 ? boms : []
      if (bomList.length === 0) {
        const bomListResponse = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (bomListResponse.ok) {
          const bomListData = await bomListResponse.json()
          bomList = bomListData.data || []
        } else {
          console.warn('Failed to fetch BOM list for material operations')
        }
      }

      const matchingBom = bomList.find(b => {
        const bomItemCode = (b.item_code || b.product_code || '').trim()
        return bomItemCode.toLowerCase() === materialItemCode.trim().toLowerCase()
      })

      let operations = []
      if (matchingBom) {
        console.log(`Found matching BOM for material ${materialItemCode}:`, matchingBom)
        const bomDetailsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/production/boms/${matchingBom.bom_id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (!bomDetailsResponse.ok) {
          console.warn(`Failed to fetch BOM ${matchingBom.bom_id}`)
        } else {
          const bomDetails = await bomDetailsResponse.json()
          const bom = bomDetails.data || bomDetails
          operations = bom.operations || bom.bom_operations || []
          console.log(`Operations for ${materialItemCode}:`, operations)
        }
      } else {
        console.warn(`No matching BOM found for material: ${materialItemCode}`)
      }

      setMaterialOperationsData(prev => ({
        ...prev,
        [opKey]: operations
      }))

      setExpandedMaterialOps(prev => ({
        ...prev,
        [opKey]: true
      }))
    } catch (err) {
      console.error(`Error fetching operations for material ${materialItemCode}:`, err)
      alert('Failed to fetch material operations')
    }
  }

  const fetchBomOperations = async (bomId) => {
    if (bomOperationsData[bomId]) {
      setExpandedBomOps(prev => ({
        ...prev,
        [bomId]: !prev[bomId]
      }))
      return
    }

    try {
      const token = localStorage.getItem('token')
      
      const bomDetailsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      let operations = []
      if (!bomDetailsResponse.ok) {
        console.warn(`Failed to fetch BOM ${bomId}`)
      } else {
        const bomDetails = await bomDetailsResponse.json()
        const bom = bomDetails.data || bomDetails
        operations = bom.operations || bom.bom_operations || []
        console.log(`Fetched operations for BOM ${bomId}:`, operations)
      }

      setBomOperationsData(prev => ({
        ...prev,
        [bomId]: operations
      }))

      setExpandedBomOps(prev => ({
        ...prev,
        [bomId]: true
      }))
    } catch (err) {
      console.error(`Error fetching operations for BOM ${bomId}:`, err)
      alert('Failed to fetch BOM operations')
    }
  }

  const createWorkOrders = async () => {
    try {
      setCreatingWorkOrders(true)
      const token = localStorage.getItem('token')
      
      if (subAssemblyBomMaterials.length === 0) {
        alert('Please fetch sub-assembly materials first')
        return
      }

      const uniqueSubAssemblies = Array.from(new Set(subAssemblyBomMaterials.map(m => m.sub_assembly_code)))
        .map(code => {
          const info = subAssemblyBomMaterials.find(m => m.sub_assembly_code === code)
          return {
            item_code: code,
            item_name: info.sub_assembly_name,
            bom_id: info.bom_id,
            operations: bomOperationsData[info.bom_id] || []
          }
        })

      const createdWorkOrders = []

      console.log('=== STEP 1: Creating work orders for sub-assemblies ===')
      console.log(`Creating ${uniqueSubAssemblies.length} sub-assembly work orders...`)

      for (const subAsm of uniqueSubAssemblies) {
        console.log(`  Creating work order for: ${subAsm.item_code}`)
        const woPayload = {
          item_code: subAsm.item_code,
          quantity: salesOrderQuantity,
          bom_no: subAsm.bom_id,
          priority: 'medium',
          notes: `Sub-assembly for production plan ${planHeader.plan_id}`,
          sales_order_id: selectedSalesOrders[0] || null,
          planned_start_date: new Date().toISOString().split('T')[0],
          operations: subAsm.operations
        }

        const woResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/production/work-orders`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(woPayload)
          }
        )

        if (woResponse.ok) {
          const woData = await woResponse.json()
          createdWorkOrders.push({
            type: 'sub-assembly',
            work_order_id: woData.data?.wo_id,
            item_code: subAsm.item_code,
            item_name: subAsm.item_name
          })
        } else {
          console.error(`Failed to create work order for ${subAsm.item_code}`)
        }
      }

      console.log('=== STEP 2: Creating work orders for finished goods ===')
      console.log(`Creating ${fgItems.length} finished goods work orders...`)

      for (const fgItem of fgItems) {
        console.log(`  Creating work order for: ${fgItem.item_code}`)
        const fgBom = Array.from(new Set(subAssemblyBomMaterials.map(m => m.bom_id)))
        
        const fgWoPayload = {
          item_code: fgItem.item_code,
          quantity: salesOrderQuantity,
          bom_no: selectedBomId || null,
          priority: 'high',
          notes: `Finished good for production plan ${planHeader.plan_id}`,
          sales_order_id: selectedSalesOrders[0] || null,
          planned_start_date: new Date().toISOString().split('T')[0],
          operations: operationItems
        }

        const fgWoResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/production/work-orders`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fgWoPayload)
          }
        )

        if (fgWoResponse.ok) {
          const fgWoData = await fgWoResponse.json()
          createdWorkOrders.push({
            type: 'finished-good',
            work_order_id: fgWoData.data?.wo_id,
            item_code: fgItem.item_code,
            item_name: fgItem.item_name
          })
        } else {
          console.error(`Failed to create work order for ${fgItem.item_code}`)
        }
      }

      const subAsmCount = createdWorkOrders.filter(wo => wo.type === 'sub-assembly').length
      const fgCount = createdWorkOrders.filter(wo => wo.type === 'finished-good').length
      
      console.log('=== WORK ORDER CREATION COMPLETE ===')
      console.log(`✓ Sub-assembly work orders: ${subAsmCount}`)
      console.log(`✓ Finished goods work orders: ${fgCount}`)
      console.log(`✓ Total work orders: ${createdWorkOrders.length}`)
      
      setSuccess(`Created ${subAsmCount} sub-assembly + ${fgCount} finished goods = ${createdWorkOrders.length} work orders`)
      
      setTimeout(() => {
        navigate('/production/work-orders')
      }, 2000)
    } catch (err) {
      console.error('Error creating work orders:', err)
      setError('Failed to create work orders')
    } finally {
      setCreatingWorkOrders(false)
    }
  }

  const _oldFetchSubAssemblyBomMaterials = async () => {
    console.log('=== fetchSubAssemblyBomMaterials CALLED ===')
    console.log('rawMaterialItems:', rawMaterialItems)
    console.log('salesOrderQuantity:', salesOrderQuantity)
    try {
      setFetchingSubAssemblyBoms(true)
      const token = localStorage.getItem('token')
      console.log('Token retrieved:', !!token)
      
      if (rawMaterialItems.length === 0) {
        console.warn('No raw material items found, returning early')
        alert('No raw material items found')
        return
      }

      const allMaterials = []
      console.log('Processing raw materials with their BOMs...')
      
      for (const rawMat of rawMaterialItems) {
        const itemCode = rawMat.item_code
        const bomId = rawMat.bom_id
        console.log(`Processing raw material: ${itemCode}, BOM ID: ${bomId}`)
        
        if (!bomId) {
          console.warn(`No BOM ID found for ${itemCode}`)
          continue
        }
        
        try {
          console.log(`Fetching BOM details for ${bomId}...`)
          let bomDetailsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          console.log(`BOM details response status: ${bomDetailsResponse.status}`)
          
          if (!bomDetailsResponse.ok && bomDetailsResponse.status === 404) {
            console.warn(`BOM ID ${bomId} not found, trying to fetch BOM by item code ${itemCode}...`)
            try {
              const bomListResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/production/boms?item_code=${itemCode}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              )
              if (bomListResponse.ok) {
                const bomListData = await bomListResponse.json()
                const bomList = bomListData.data || []
                if (bomList.length > 0) {
                  console.log(`Found BOM for item ${itemCode}:`, bomList[0].bom_id)
                  bomDetailsResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/production/boms/${bomList[0].bom_id}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  )
                } else {
                  console.warn(`No BOM found for item ${itemCode}`)
                }
              }
            } catch (fallbackErr) {
              console.error('Error in BOM fallback lookup:', fallbackErr)
            }
          }
          
          if (bomDetailsResponse.ok) {
            let bomDetails = await bomDetailsResponse.json()
            let bom = bomDetails.data || bomDetails
            
            if (Array.isArray(bom)) {
              bom = bom[0]
            }
            
            console.log(`BOM details for ${itemCode}:`, bom)
            
            const materials = bom.bom_raw_materials || bom.rawMaterials || bom.lines || []
            const operations = bom.bom_operations || bom.operations || []
            console.log(`Materials found: ${materials.length}, Operations found: ${operations.length}`)
            
            const actualBomId = bom.bom_id || bomId
            
            materials.forEach(material => {
              if (material.item_group === 'Consumable') {
                console.log(`Skipping consumable: ${material.item_code}`)
                return
              }
              
              const bomQty = material.qty || material.quantity || 1
              const actualQty = bomQty * salesOrderQuantity
              console.log(`Adding material: ${material.item_code}, BOM qty: ${bomQty}, Actual qty: ${actualQty}`)
              allMaterials.push({
                bom_id: actualBomId,
                sub_assembly_code: itemCode,
                sub_assembly_name: rawMat.item_name,
                item_code: material.item_code || material.component_code,
                item_name: material.item_name || material.component_description,
                item_group: material.item_group || 'N/A',
                qty: actualQty,
                bom_qty: bomQty,
                operations_qty: operations.length > 0 ? operations.reduce((sum, op) => sum + (op.operation_time || op.time || 0), 0) : 0,
                operations_count: operations.length,
                operations: operations
              })
            })
          } else {
            console.warn(`Failed to fetch BOM details for ${bomId}: ${bomDetailsResponse.status}`)
          }
        } catch (err) {
          console.error(`Error fetching BOM for ${itemCode}:`, err)
        }
      }
      
      console.log('All materials collected:', allMaterials.length)
      console.log('All materials data:', allMaterials)
      setSubAssemblyBomMaterials(allMaterials)
      console.log('State updated with sub-assembly materials')
      
      if (allMaterials.length > 0) {
        console.log('Expanding section 3.5 and fetching operations...')
        setExpandedSections(prev => ({ ...prev, 3.5: true }))
        
        const uniqueBomIds = new Set(allMaterials.map(m => m.bom_id))
        console.log('Unique BOM IDs to fetch operations for:', Array.from(uniqueBomIds))
        const bomOpsData = {}
        const expandedOpsState = {}
        
        for (const bomId of uniqueBomIds) {
          console.log(`Processing operations for BOM ${bomId}...`)
          try {
            const bomDetailsResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            )

            if (bomDetailsResponse.ok) {
              const bomDetails = await bomDetailsResponse.json()
              const bom = bomDetails.data || bomDetails
              const operations = bom.bom_operations || bom.operations || []
              
              bomOpsData[bomId] = operations
              expandedOpsState[bomId] = true
            }
          } catch (err) {
            console.error(`Error fetching operations for BOM ${bomId}:`, err)
          }
        }
        
        setBomOperationsData(prev => ({ ...prev, ...bomOpsData }))
        setExpandedBomOps(prev => ({ ...prev, ...expandedOpsState }))
      }
    } catch (err) {
      console.error('=== ERROR in fetchSubAssemblyBomMaterials ===')
      console.error('Error details:', err)
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
      alert('Failed to fetch sub-assembly BOM materials: ' + err.message)
    } finally {
      console.log('=== fetchSubAssemblyBomMaterials COMPLETED ===')
      setFetchingSubAssemblyBoms(false)
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
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-3">
          <button 
            onClick={() => navigate('/manufacturing/production-planning')}
            className="text-blue-600 hover:text-blue-800 text-xs font-medium mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          
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

        {/* DEBUG PANEL */}
        <div className="bg-red-50 border border-red-300 rounded p-3 mb-3">
          <p className="text-xs font-bold text-red-700">DEBUG INFO:</p>
          <p className="text-xs text-red-600">rawMaterialItems: {rawMaterialItems.length}</p>
          <p className="text-xs text-red-600">salesOrderQuantity: {salesOrderQuantity}</p>
          <p className="text-xs text-red-600">selectedSalesOrders: {selectedSalesOrders.length}</p>
          <button
            type="button"
            onClick={() => console.log('Test button clicked! rawMaterialItems:', rawMaterialItems)}
            className="mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            Test Console Log
          </button>
        </div>

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    console.log('Get Sub-Asm Materials button clicked!')
                    e.stopPropagation()
                    console.log('Raw Material Items count:', rawMaterialItems.length)
                    console.log('Raw Material Items:', rawMaterialItems)
                    
                    const subAsmFromRawMaterials = rawMaterialItems.filter(item => 
                      (item.item_code || '').startsWith('SA-') || 
                      (item.fg_sub_assembly || item.component_type || '').toLowerCase().includes('sub')
                    )
                    
                    console.log('Extracted sub-assemblies from raw materials:', subAsmFromRawMaterials.length)
                    subAsmFromRawMaterials.forEach((item, idx) => {
                      console.log(`Sub-Assembly ${idx + 1}: ${item.item_code} - BOM ID: ${item.bom_id || item.bom_no || 'NOT FOUND'}`)
                      console.log(`  Full Item Data:`, JSON.stringify(item, null, 2))
                    })
                    
                    if (subAsmFromRawMaterials.length === 0) {
                      console.warn('No sub-assemblies found in raw materials')
                      alert('No sub-assemblies found in raw materials')
                      return
                    }
                    
                    console.log('About to call fetchSubAssemblyBomMaterials with extracted items...')
                    setFetchingSubAssemblyBoms(true)
                    fetchSubAssemblyBomMaterials(subAsmFromRawMaterials).finally(() => {
                      setFetchingSubAssemblyBoms(false)
                    })
                  }}
                  disabled={fetchingSubAssemblyBoms}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-xs font-semibold rounded transition"
                  title="Fetch materials from sub-assembly BOMs"
                >
                  {fetchingSubAssemblyBoms ? 'Loading...' : 'Get Sub-Asm Materials'}
                </button>
                <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[3] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expandedSections[3] && (
              <div className="px-4 py-3 border-t border-gray-200 ">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Code</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Name</th>
                      <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Warehouse</th>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-700">BOM ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterialItems.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1 font-medium text-gray-900">{item.item_code}</td>
                        <td className="px-2 py-1 text-gray-700">{item.item_name}</td>
                        <td className="px-2 py-1 text-right font-bold text-gray-900">{item.quantity || item.qty_as_per_bom}</td>
                        <td className="px-2 py-1 text-gray-700">{item.for_warehouse || '-'}</td>
                        <td className="px-2 py-1 text-gray-700 font-mono text-xs">{item.bom_id || item.bom_no || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 3.5: Sub-Assembly BOM Materials */}
        {subAssemblyBomMaterials.length > 0 && (
          <div className="bg-white rounded shadow mb-3">
            <button
              onClick={() => toggleSection(3.5)}
              className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-cyan-600">3.5</span>
                <h2 className="text-sm font-semibold text-gray-900">Sub-Assembly BOM Materials ({subAssemblyBomMaterials.length})</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    const uniqueBomIds = new Set(subAssemblyBomMaterials.map(m => `${m.sub_assembly_code}-${m.bom_id}`))
                    uniqueBomIds.forEach(key => {
                      const [code, bomId] = key.split('-')
                      fetchNestedMaterialDetails(code, bomId)
                    })
                  }}
                  className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded transition"
                  title="Fetch all sub-assembly nested materials details"
                >
                  📥 Fetch All Details
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    createWorkOrders()
                  }}
                  disabled={creatingWorkOrders}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs font-semibold rounded transition"
                  title="Create work orders for sub-assemblies and finished goods"
                >
                  {creatingWorkOrders ? 'Creating...' : 'Create Work Orders'}
                </button>
                <ChevronDown size={16} className={`text-gray-400 transition ${expandedSections[3.5] ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {expandedSections[3.5] && (
              <div className="px-4 py-3 border-t border-gray-200 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                  <p className="text-xs text-blue-800"><strong>📋 How to use:</strong></p>
                  <ul className="text-xs text-blue-700 mt-1 space-y-0.5">
                    <li>• Click <strong>"Fetch All Details"</strong> button to load all nested materials for each sub-assembly</li>
                    <li>• Click item code to expand <strong>operations</strong> for that item</li>
                    <li>• Click <strong>ops count</strong> number to expand <strong>nested raw materials</strong> from sub-BOM</li>
                  </ul>
                </div>
                {Array.from(new Set(subAssemblyBomMaterials.map(m => m.sub_assembly_code))).map((subAsmCode) => {
                  const subAsmMaterials = subAssemblyBomMaterials.filter(m => m.sub_assembly_code === subAsmCode)
                  const subAsmInfo = subAsmMaterials[0]
                  const materialsOnly = subAsmMaterials.filter(m => !m.is_operation)
                  const operationsOnly = subAsmMaterials.filter(m => m.is_operation)
                  
                  return (
                    <div key={subAsmCode} className="border border-cyan-200 rounded bg-cyan-50 p-3">
                      <div className="mb-2 pb-2 border-b border-cyan-200">
                        <h4 className="font-semibold text-sm text-cyan-900">
                          {subAsmCode} - {subAsmInfo.sub_assembly_name}
                        </h4>
                        <p className="text-xs text-cyan-700 mt-1">
                          BOM ID: <span className="font-semibold">{subAsmInfo.bom_id}</span>
                          <span className="ml-3">| Materials: {materialsOnly.length}</span>
                          <span className="ml-3">| Operations: {operationsOnly.length}</span>
                        </p>
                      </div>
                      
                      {materialsOnly.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-xs font-semibold text-cyan-900 mb-2">📦 Raw Materials ({materialsOnly.length})</h5>
                          <table className="w-full text-xs">
                            <thead className="bg-green-100 border-b border-green-300">
                              <tr>
                                <th className="px-2 py-1 text-left font-semibold text-gray-700">Item Code</th>
                                <th className="px-2 py-1 text-left font-semibold text-gray-700">Item Name</th>
                                <th className="px-2 py-1 text-left font-semibold text-gray-700">Item Group</th>
                                <th className="px-2 py-1 text-right font-semibold text-gray-700">Quantity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {materialsOnly.map((item, idx) => {
                                const itemCode = item.item_code || item.component_code || '-'
                                const itemName = item.item_name || item.component_description || '-'
                                const itemGroup = item.item_group || item.group || '-'
                                const itemQty = item.qty || item.quantity || '0'
                                
                                return (
                                  <tr 
                                    key={idx}
                                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-green-25'} hover:bg-green-100 transition`}
                                  >
                                    <td className="px-2 py-1 font-medium text-gray-900">{itemCode}</td>
                                    <td className="px-2 py-1 text-gray-700">{itemName}</td>
                                    <td className="px-2 py-1 text-gray-700 text-xs"><span className="bg-gray-100 px-2 py-1 rounded">{itemGroup}</span></td>
                                    <td className="px-2 py-1 text-right font-bold text-gray-900">{Number(itemQty).toFixed(2)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {operationsOnly.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-cyan-900 mb-2">⚙️ Operations ({operationsOnly.length})</h5>
                          <table className="w-full text-xs">
                            <thead className="bg-purple-100 border-b border-purple-300">
                              <tr>
                                <th className="px-2 py-1 text-left font-semibold text-gray-700">Operation Name</th>
                                <th className="px-2 py-1 text-right font-semibold text-gray-700">Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {operationsOnly.map((item, idx) => {
                                const opName = item.operation_name || item.name || '-'
                                const opTime = item.operation_time || item.operation_qty || '0'
                                
                                return (
                                  <tr 
                                    key={idx}
                                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-purple-25'} hover:bg-purple-100 transition`}
                                  >
                                    <td className="px-2 py-1 font-medium text-gray-900">{opName}</td>
                                    <td className="px-2 py-1 text-right font-bold text-gray-900">{Number(opTime).toFixed(2)}</td>
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
              <div className="px-4 py-3 border-t border-gray-200 ">
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
                    <div className=" max-h-40">
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
                    <div className=" max-h-40">
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
