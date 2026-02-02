import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Zap,
  Trash,
  X,
  Boxes,
  Factory,
  Check,
  Send,
  Loader,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Activity,
  FileText,
  ClipboardCheck,
  AlertCircle,
  Settings,
  MoreVertical,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Package,
  Layers,
  BarChart3,
  ClipboardList
} from 'lucide-react'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'

const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  }

  return (
    <div className="bg-white p-2 rounded  border border-gray-100   hover:shadow-md transition-all group  relative">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-gray-50 rounded-full opacity-50 group-hover:scale-110 transition-transform" />
      <div className="relative flex justify-between items-start">
        <div className="">
          <p className="text-xs   text-gray-400 ">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-xl  text-gray-900 ">{value}</h3>
            {trend && (
              <span className={`text-xs   ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs    text-gray-500  ">{subtitle}</p>
          )}
        </div>
        <div className={`p-2 roundedl ${colorMap[color] || colorMap.blue}   group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  )
}

const isSubAssemblyGroup = (itemGroup) => {
  if (!itemGroup) return false
  const normalized = itemGroup.toLowerCase().replace(/[-\s]/g, '').trim()
  return normalized === 'subassemblies' || normalized === 'subassembly'
}

const enrichRequiredItemsWithStock = async (items, token) => {
  if (!items || items.length === 0) return items

  try {
    const stockRes = await fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (stockRes.ok) {
      const stockData = await stockRes.json()
      const stockByItem = {}

      const stockList = Array.isArray(stockData) ? stockData : (stockData.data || [])
      stockList.forEach(stock => {
        if (!stockByItem[stock.item_code]) {
          stockByItem[stock.item_code] = {
            quantity: 0,
            warehouse: stock.warehouse_name || stock.warehouse || '-'
          }
        }
        stockByItem[stock.item_code].quantity += parseFloat(stock.available_qty || stock.qty || stock.quantity || 0)
      })

      return items.map(item => {
        const bomQty = item.qty || item.quantity || item.required_qty || item.bom_qty || 0
        return {
          ...item,
          qty: stockByItem[item.item_code]?.quantity || 0,
          quantity: stockByItem[item.item_code]?.quantity || 0,
          required_qty: bomQty,
          source_warehouse: stockByItem[item.item_code]?.warehouse || item.source_warehouse || '-'
        }
      })
    }
  } catch (err) {
    console.error('Error fetching stock data:', err)
  }

  return items
}

const findBomForItem = async (itemCode, token, excludeBomId = null) => {
  try {
    console.log(`Fetching all BOMs to search for item: ${itemCode}`)
    const searchRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (searchRes.ok) {
      const data = await searchRes.json()
      const bomList = Array.isArray(data) ? data : (data.data || [])
      console.log(`Found ${bomList.length} BOMs in system:`, bomList.map(b => ({ bom_id: b.bom_id, item_code: b.item_code })))

      const matchingBom = bomList.find(bom => {
        const bomItemCode = bom.item_code || bom.product_code || ''
        const isMatch = bomItemCode.trim() === itemCode.trim() && bom.bom_id !== excludeBomId
        if (isMatch) {
          console.log(`MATCH FOUND: BOM ${bom.bom_id} for item ${itemCode}`)
        }
        return isMatch
      })

      if (matchingBom) {
        console.log(`Returning BOM ID: ${matchingBom.bom_id}`)
        return matchingBom.bom_id || matchingBom.id
      } else {
        console.log(`NO MATCH found for ${itemCode} (excluding ${excludeBomId})`)
      }
    }
  } catch (err) {
    console.error(`Error searching BOM for item ${itemCode}:`, err)
  }
  return null
}

const collectAllRawMaterials = async (bomId, plannedQty = 1, token, visitedBoms = new Set()) => {
  if (!bomId || visitedBoms.has(bomId)) {
    return {}
  }

  visitedBoms.add(bomId)
  const allRawMaterials = {}

  try {
    const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!bomRes.ok) {
      console.warn(`BOM ${bomId} not found`)
      return allRawMaterials
    }

    const bomData = await bomRes.json()
    const bom = bomData.data || bomData

    console.log(`\n========== Processing BOM ${bomId} ==========`)
    console.log(`BOM Data:`, bom)

    let materialsToProcess = []
    const bomLines = bom.lines || bom.items || []
    const rawMaterials = bom.bom_raw_materials || bom.rawMaterials || []
    const consumables = bom.bom_consumables || bom.consumables || []

    console.log(`BOM Lines (potential sub-assemblies): ${bomLines.length}`)
    console.log(`Raw Materials: ${rawMaterials.length}`)
    console.log(`Consumables: ${consumables.length}`)

    if (bomLines.length > 0) {
      materialsToProcess = [...bomLines, ...rawMaterials, ...consumables]
      console.log(`FG BOM detected with ${bomLines.length} sub-assemblies`)
    } else {
      materialsToProcess = [...rawMaterials, ...consumables]
      console.log(`Regular BOM with direct raw materials`)
    }

    console.log(`Total items to process: ${materialsToProcess.length}`)

    for (const material of materialsToProcess) {
      const itemCode = material.item_code || material.component_code
      if (!itemCode) continue

      const baseQty = parseFloat(material.qty) || parseFloat(material.quantity) || parseFloat(material.bom_qty) || 1
      const totalQty = baseQty * plannedQty

      const isSubAssembly = isSubAssemblyGroup(material.item_group) ||
        material.fg_sub_assembly === 'Sub-Assembly' ||
        material.component_type === 'Sub-Assembly' ||
        (itemCode && itemCode.startsWith('SA-'))

      if (isSubAssembly) {
        console.log(`\n=== SUB-ASSEMBLY: ${itemCode} ===`)

        let subBomId = material.bom_id
        if (subBomId && subBomId !== bomId) {
          console.log(`Using existing bom_id: ${subBomId}`)
        } else {
          console.log(`Searching for BOM of sub-assembly: ${itemCode}`)
          subBomId = await findBomForItem(itemCode, token, bomId)
        }

        if (subBomId && subBomId !== bomId) {
          console.log(`Found BOM ${subBomId} for sub-assembly ${itemCode}, fetching its materials...`)
          const subMaterials = await collectAllRawMaterials(subBomId, totalQty, token, visitedBoms)
          console.log(`Sub-assembly ${itemCode} returned ${Object.keys(subMaterials).length} aggregated materials`)
          for (const [subItemCode, subMaterial] of Object.entries(subMaterials)) {
            if (allRawMaterials[subItemCode]) {
              allRawMaterials[subItemCode].qty += subMaterial.qty
              allRawMaterials[subItemCode].quantity += subMaterial.qty
            } else {
              allRawMaterials[subItemCode] = subMaterial
            }
          }
        } else {
          console.log(`No BOM found for sub-assembly ${itemCode}, treating as raw material`)
          if (allRawMaterials[itemCode]) {
            allRawMaterials[itemCode].qty += totalQty
            allRawMaterials[itemCode].quantity += totalQty
          } else {
            allRawMaterials[itemCode] = {
              item_code: itemCode,
              item_name: material.item_name || material.component_description || material.name || itemCode,
              qty: totalQty,
              quantity: totalQty,
              uom: material.uom || 'pcs'
            }
          }
        }
      } else {
        console.log(`Adding raw material: ${itemCode} with qty ${totalQty}`)
        if (allRawMaterials[itemCode]) {
          allRawMaterials[itemCode].qty += totalQty
          allRawMaterials[itemCode].quantity += totalQty
        } else {
          allRawMaterials[itemCode] = {
            item_code: itemCode,
            item_name: material.item_name || material.component_description || material.name || itemCode,
            qty: totalQty,
            quantity: totalQty,
            uom: material.uom || 'pcs'
          }
        }
      }
    }
    console.log(`BOM ${bomId} processing complete, total raw materials: ${Object.keys(allRawMaterials).length}`)
    console.log(`Raw Materials collected:`, allRawMaterials)
  } catch (err) {
    console.error(`Error fetching BOM ${bomId}:`, err)
  }

  return allRawMaterials
}

const collectAllOperations = async (bomId, token, visitedBoms = new Set(), depth = 0) => {
  if (!bomId || visitedBoms.has(bomId)) {
    return []
  }

  visitedBoms.add(bomId)
  let allOperations = []

  try {
    const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!bomRes.ok) return allOperations

    const bomData = await bomRes.json()
    const bom = bomData.data || bomData

    // Add current BOM's operations
    const operations = (bom.operations || []).map(op => ({
      ...op,
      bom_id: bomId,
      item_code: bom.item_code,
      item_name: bom.product_name || bom.item_code,
      depth
    }))
    allOperations = [...allOperations, ...operations]

    // Recurse into sub-assemblies
    const materials = [...(bom.lines || []), ...(bom.bom_raw_materials || []), ...(bom.rawMaterials || [])]
    for (const material of materials) {
      const itemCode = material.item_code || material.component_code
      if (!itemCode) continue

      const isSubAssembly = isSubAssemblyGroup(material.item_group) ||
        material.fg_sub_assembly === 'Sub-Assembly' ||
        material.component_type === 'Sub-Assembly' ||
        (itemCode && itemCode.startsWith('SA-'))

      if (isSubAssembly) {
        let subBomId = material.bom_id
        if (!subBomId || subBomId === bomId) {
          subBomId = await findBomForItem(itemCode, token, bomId)
        }

        if (subBomId && subBomId !== bomId) {
          const subOps = await collectAllOperations(subBomId, token, visitedBoms, depth + 1)
          allOperations = [...allOperations, ...subOps]
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching operations for BOM ${bomId}:`, err)
  }

  return allOperations
}

export default function ProductionPlanning() {
  const navigate = useNavigate()
  const toast = useToast()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [search, setSearch] = useState('')
  const [bomCache, setBomCache] = useState({})
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false)
  const [workOrderData, setWorkOrderData] = useState(null)
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false)
  const [showMaterialRequestModal, setShowMaterialRequestModal] = useState(false)
  const [materialRequestData, setMaterialRequestData] = useState(null)
  const [sendingMaterialRequest, setSendingMaterialRequest] = useState(false)
  const [materialStockData, setMaterialStockData] = useState({})
  const [workOrderStockData, setWorkOrderStockData] = useState({})
  const [checkingStock, setCheckingStock] = useState(false)
  const [planProgress, setPlanProgress] = useState({})
  const [mrHistory, setMrHistory] = useState({})
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedPlanForHistory, setSelectedPlanForHistory] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    if (plans.length > 0) {
      plans.forEach(plan => {
        fetchPlanMRHistory(plan.plan_id)
      })
    }
  }, [plans])

  const fetchPlanOperationProgress = async (planId) => {
    try {
      const token = localStorage.getItem('token')
      const woRes = await fetch(`${import.meta.env.VITE_API_URL}/production/work-orders?production_plan_id=${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!woRes.ok) {
        setPlanProgress(prev => ({
          ...prev,
          [planId]: { progress: 0, currentOp: 'No operations', totalOps: 0, completedOps: 0 }
        }))
        return
      }

      const woData = await woRes.json()
      const workOrders = Array.isArray(woData) ? woData : (woData.data || [])

      if (workOrders.length === 0) {
        setPlanProgress(prev => ({
          ...prev,
          [planId]: { progress: 0, currentOp: 'No work orders', totalOps: 0, completedOps: 0 }
        }))
        return
      }

      let totalOps = 0
      let completedOps = 0
      let lastInProgressOp = 'Not Started'

      for (const wo of workOrders) {
        const jcRes = await fetch(`${import.meta.env.VITE_API_URL}/production/job-cards?work_order_id=${wo.wo_id || wo.work_order_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (jcRes.ok) {
          const jcData = await jcRes.json()
          const jobCards = Array.isArray(jcData) ? jcData : (jcData.data || [])

          jobCards.forEach(jc => {
            totalOps++
            if (jc.status === 'completed') {
              completedOps++
            } else if (jc.status === 'in-progress') {
              lastInProgressOp = `${jc.operation || 'Operation'} (${jc.operation_sequence || 'Seq'}) - In Progress`
            }
          })
        }
      }

      const progress = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : 0

      setPlanProgress(prev => ({
        ...prev,
        [planId]: {
          progress,
          currentOp: lastInProgressOp,
          totalOps,
          completedOps
        }
      }))
    } catch (err) {
      console.error(`Error fetching progress for plan ${planId}:`, err)
      setPlanProgress(prev => ({
        ...prev,
        [planId]: { progress: 0, currentOp: 'Error loading', totalOps: 0, completedOps: 0 }
      }))
    }
  }

  const fetchPlanMRHistory = async (planId) => {
    try {
      setLoadingHistory(true)
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/material-requests?production_plan_id=${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const requests = data.data || data
        setMrHistory(prev => ({ ...prev, [planId]: requests }))
        return requests
      }
    } catch (err) {
      console.error(`Error fetching MR history for plan ${planId}:`, err)
    } finally {
      setLoadingHistory(false)
    }
    return []
  }

  const handleShowHistory = async (plan) => {
    setSelectedPlanForHistory(plan)
    setShowHistoryModal(true)
    await fetchPlanMRHistory(plan.plan_id)
  }

  const fetchBOMProductName = async (bomId) => {
    if (bomCache[bomId]) return bomCache[bomId]
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      const bomData = data.data || data
      let productName = ''

      if (bomData.product_name) {
        productName = bomData.product_name
      } else if (bomData.lines && bomData.lines.length > 0) {
        productName = bomData.lines[0].product_name || bomData.lines[0].item_name || ''
      } else if (bomData.bom_finished_goods && bomData.bom_finished_goods.length > 0) {
        productName = bomData.bom_finished_goods[0].product_name || bomData.bom_finished_goods[0].item_name || ''
      } else if (bomData.finished_goods && bomData.finished_goods.length > 0) {
        productName = bomData.finished_goods[0].product_name || bomData.finished_goods[0].item_name || ''
      } else if (bomData.item_code) {
        try {
          const itemRes = await fetch(`${import.meta.env.VITE_API_URL}/items/${bomData.item_code}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const itemData = await itemRes.json()
          const item = itemData.data || itemData
          productName = item.item_name || item.product_name || bomData.item_code
        } catch (itemErr) {
          productName = bomData.item_code
        }
      }

      if (!productName) productName = bomData.item_code || ''
      setBomCache(prev => ({ ...prev, [bomId]: productName }))
      return productName
    } catch (err) {
      console.error('Error fetching BOM:', bomId, err)
      return ''
    }
  }

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        let plansData = data.data || []
        console.log('Fetched production plans:', plansData)

        const newBomCache = { ...bomCache }

        for (const plan of plansData) {
          // If the backend provided BOM info directly, use it
          if (plan.bom_id && plan.bom_product_name) {
            newBomCache[plan.bom_id] = plan.bom_product_name
          }

          let fgItems = plan.fg_items || plan.finished_goods || plan.bom_finished_goods || []

          // If no fg_items but we have BOM info from join, create a virtual fg_item for display
          if ((!fgItems || fgItems.length === 0) && plan.bom_id && plan.bom_item_code) {
            fgItems = [{
              item_code: plan.bom_item_code,
              item_name: plan.bom_product_name || plan.bom_item_code,
              quantity: 1,
              bom_no: plan.bom_id
            }]
          }

          if (fgItems && fgItems.length > 0) {
            const fgItem = fgItems[0]
            const productName = fgItem.item_name || fgItem.product_name || fgItem.item_code || ''
            if (plan.bom_id && !newBomCache[plan.bom_id]) {
              newBomCache[plan.bom_id] = productName
            }

            for (let i = 0; i < fgItems.length; i++) {
              if (!fgItems[i].bom_no && plan.bom_id) {
                fgItems[i].bom_no = plan.bom_id
              }
            }
            plan.fg_items = fgItems
          }
        }
        setBomCache(newBomCache)
        setPlans(plansData)
        setError(null)

        plansData.forEach(plan => {
          fetchPlanOperationProgress(plan.plan_id)
        })
      } else {
        setError('Failed to fetch production plans')
      }
    } catch (err) {
      setError('Error loading production plans')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this production plan?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('Production plan deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchPlans()
      } else {
        setError('Failed to delete production plan')
      }
    } catch (err) {
      setError('Error deleting production plan')
      console.error(err)
    }
  }

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL production plans. Are you sure?')) return

    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/truncate/all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('All production plans truncated successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchPlans()
      } else {
        setError('Failed to truncate production plans')
      }
    } catch (err) {
      setError('Error truncating production plans')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (plan) => {
    navigate(`/manufacturing/production-planning/${plan.plan_id}`)
  }

  const handleCreateWorkOrder = async (plan) => {
    let fgItems = plan.fg_items
    let bomDetails = null
    let fullPlan = plan

    if (!fgItems || fgItems.length === 0) {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${plan.plan_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          fullPlan = data.data || data
          fgItems = fullPlan.fg_items || fullPlan.finished_goods || fullPlan.bom_finished_goods || []
        }

        if (!fgItems || fgItems.length === 0) {
          if (plan.bom_id) {
            try {
              const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${plan.bom_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })

              if (bomRes.ok) {
                const bomData = await bomRes.json()
                const bom = bomData.data || bomData
                bomDetails = bom
                if (bom && bom.item_code) {
                  fgItems = [{
                    item_code: bom.item_code,
                    item_name: bom.product_name || bom.item_code,
                    quantity: bom.quantity || fullPlan.quantity || 1,
                    bom_no: plan.bom_id
                  }]
                }
              } else {
                console.warn(`BOM ${plan.bom_id} not found (404). Will use plan item details as fallback.`)
              }
            } catch (bomErr) {
              console.error('Error fetching BOM details:', bomErr)
            }
          }
        }
      } catch (err) {
        console.error('Error loading production plan details:', err)
      }
    }

    if (!fgItems || fgItems.length === 0) {
      if (fullPlan.item_code || fullPlan.product_code) {
        fgItems = [{
          item_code: fullPlan.item_code || fullPlan.product_code || 'UNKNOWN',
          item_name: fullPlan.item_name || fullPlan.product_name || 'Production Item',
          quantity: fullPlan.quantity || fullPlan.planned_qty || 1,
          bom_no: plan.bom_id || '',
          planned_qty: fullPlan.planned_qty || fullPlan.quantity || 1
        }]
      } else {
        setError('No finished goods items found. Please ensure the production plan has valid item code, product code, or BOM.')
        return
      }
    }

    if (!bomDetails && plan.bom_id) {
      try {
        const token = localStorage.getItem('token')
        const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${plan.bom_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (bomRes.ok) {
          const bomData = await bomRes.json()
          bomDetails = bomData.data || bomData
        }
      } catch (err) {
        console.error('Error fetching BOM:', err)
      }
    }

    const fgItem = fgItems[0]
    const plannedQty = fgItem.quantity || fgItem.planned_qty || fullPlan.planned_qty || fullPlan.quantity || 1
    const token = localStorage.getItem('token')

    // Fetch comprehensive data recursively
    let allMaterials = []
    let allOperations = []

    if (plan.bom_id) {
      const rawMaterialsMap = await collectAllRawMaterials(plan.bom_id, plannedQty, token)
      allMaterials = Object.values(rawMaterialsMap)
      allOperations = await collectAllOperations(plan.bom_id, token)
    }

    if (allMaterials.length > 0) {
      allMaterials = await enrichRequiredItemsWithStock(allMaterials, token)
    }

    const subAssemblies = allMaterials.filter(item => {
      const isSub = isSubAssemblyGroup(item.item_group) ||
        item.fg_sub_assembly === 'Sub-Assembly' ||
        item.component_type === 'Sub-Assembly' ||
        (item.item_code && item.item_code.startsWith('SA-')) ||
        item.bom_id
      return isSub
    })
    const rawMaterials = allMaterials.filter(item => !subAssemblies.find(sa => sa.item_code === item.item_code))

    const woData = {
      item_code: fgItem.item_code || fgItem.component_code || '',
      item_name: fgItem.item_name || fgItem.component_description || '',
      quantity: plannedQty,
      bom_no: plan.bom_id || '',
      planned_start_date: (fgItem.planned_start_date ? fgItem.planned_start_date.split('T')[0] : new Date().toISOString().split('T')[0]),
      priority: 'Medium',
      notes: '',
      operations: allOperations,
      sub_assemblies: subAssemblies,
      required_items: rawMaterials,
      production_plan_id: plan.plan_id
    }

    setWorkOrderData(woData)
    setShowWorkOrderModal(true)

    if (allMaterials.length > 0) {
      checkItemsStock(allMaterials, setWorkOrderStockData)
    }
  }

  const handleCreateWorkOrderConfirm = async () => {
    if (!workOrderData) return

    try {
      setCreatingWorkOrder(true)

      let response;
      if (workOrderData.production_plan_id) {
        // Use the multi-level generation endpoint that creates separate WOs for each item
        response = await productionService.createWorkOrdersFromPlan(workOrderData.production_plan_id)
      } else {
        // Fallback to single WO creation if no plan ID
        const payload = {
          item_code: workOrderData.item_code,
          bom_no: workOrderData.bom_no,
          quantity: parseFloat(workOrderData.quantity),
          priority: workOrderData.priority || 'Medium',
          notes: workOrderData.notes || '',
          planned_start_date: workOrderData.planned_start_date ? workOrderData.planned_start_date.split('T')[0] : new Date().toISOString().split('T')[0],
          production_plan_id: workOrderData.production_plan_id,
          required_items: (workOrderData.required_items || []).map(mat => ({
            item_code: mat.item_code,
            source_warehouse: mat.source_warehouse || 'Stores - NC',
            required_qty: mat.required_qty || mat.qty || 0
          })),
          operations: (workOrderData.operations || []).map(op => ({
            operation_name: op.operation_name || op.operation || '',
            workstation_type: op.workstation || op.workstation_type || '',
            operation_time: op.operation_time || op.time || 0,
            operating_cost: op.operating_cost || 0,
            operation_type: op.operation_type || 'IN_HOUSE',
            hourly_rate: op.hourly_rate || 0
          }))
        }
        response = await productionService.createWorkOrder(payload)
      }

      if (response.success) {
        const workOrders = response.data?.work_orders || []
        const firstWoId = workOrders.length > 0 ? workOrders[0] : (response.data?.wo_id || response.wo_id)
        
        toast.addToast(response.message || 'Work Orders generated successfully', 'success')
        
        setShowWorkOrderModal(false)
        setWorkOrderData(null)
        
        // Refresh plans to show updated status
        fetchPlans()
        
        // Navigate to job cards page. If we have multiple, maybe just the list, 
        // or filter by the first one (usually the FG)
        if (firstWoId) {
          navigate(`/manufacturing/job-cards?filter_work_order=${firstWoId}`)
        } else {
          navigate(`/manufacturing/job-cards`)
        }
      } else {
        toast.addToast(response.message || 'Failed to create work order', 'error')
      }
    } catch (err) {
      console.error('Error in work order creation:', err)
      toast.addToast(err.message || 'Error initiating production', 'error')
    } finally {
      setCreatingWorkOrder(false)
    }
  }

  const handleSendMaterialRequest = async (plan) => {
    let fgItems = plan.fg_items
    let fullPlan = plan

    try {
      setSendingMaterialRequest(true)
      const token = localStorage.getItem('token')

      if (!fgItems || fgItems.length === 0) {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${plan.plan_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          fullPlan = data.data || data
          fgItems = fullPlan.fg_items || fullPlan.finished_goods || fullPlan.bom_finished_goods || []
        }
      }

      if (!plan.bom_id) {
        toast.addToast('No BOM associated with this production plan', 'warning')
        setSendingMaterialRequest(false)
        return
      }

      const fgItem = fgItems && fgItems.length > 0 ? fgItems[0] : {}
      const plannedQty = fgItem.quantity || fgItem.planned_qty || fullPlan.planned_qty || fullPlan.quantity || 1

      const allRawMaterials = await collectAllRawMaterials(plan.bom_id, plannedQty, token)

      if (Object.keys(allRawMaterials).length === 0) {
        toast.addToast('No raw materials found in BOM or sub-assemblies', 'warning')
        setSendingMaterialRequest(false)
        return
      }

      const requiredItems = Object.values(allRawMaterials)

      const seriesNo = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
      const requiredByDate = new Date()
      requiredByDate.setDate(requiredByDate.getDate() + 7)

      const mrData = {
        series_no: seriesNo,
        transition_date: new Date().toISOString().split('T')[0],
        requested_by_id: 'System',
        department: 'Production',
        purpose: 'material_issue',
        required_by_date: requiredByDate.toISOString().split('T')[0],
        target_warehouse: '',
        source_warehouse: '',
        items_notes: `Material request for Production Plan: ${plan.plan_id}\\nBOM: ${plan.bom_id}\\nItem: ${fgItem.item_code || fgItem.item_name || ''}\\nPlanned Quantity: ${plannedQty}\\nIncludes raw materials from all sub-assemblies`,
        production_plan_id: plan.plan_id,
        items: requiredItems
      }

      setMaterialRequestData(mrData)
      setShowMaterialRequestModal(true)
      setSendingMaterialRequest(false)

      const mrItems = Object.values(allRawMaterials)
      if (mrItems.length > 0) {
        await checkItemsStock(mrItems, (stockInfo) => {
          setMaterialStockData(stockInfo)
        })
      }
    } catch (err) {
      console.error('Error preparing material request:', err)
      toast.addToast('Error preparing material request', 'error')
      setSendingMaterialRequest(false)
    }
  }

  const handleSendMaterialRequestConfirm = async () => {
    if (!materialRequestData) return

    try {
      setSendingMaterialRequest(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${import.meta.env.VITE_API_URL}/material-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(materialRequestData)
      })

      if (res.ok) {
        toast.addToast('Material request created successfully', 'success')
        if (materialRequestData.production_plan_id) {
          fetchPlanMRHistory(materialRequestData.production_plan_id)
        }
        setShowMaterialRequestModal(false)
        setMaterialRequestData(null)
      } else {
        const errData = await res.json()
        toast.addToast(errData.error || 'Failed to create material request', 'error')
      }
    } catch (err) {
      console.error('Error creating material request:', err)
      toast.addToast('Error creating material request', 'error')
    } finally {
      setSendingMaterialRequest(false)
    }
  }

  const stats = useMemo(() => {
    const total = plans.length
    const submitted = plans.filter(p => p.status === 'submitted').length
    const completed = plans.filter(p => p.status === 'completed').length
    const draft = plans.filter(p => p.status === 'draft').length
    return { total, submitted, completed, draft }
  }, [plans])

  const filteredPlans = useMemo(() => {
    return plans.filter(plan =>
      plan.plan_id.toLowerCase().includes(search.toLowerCase()) ||
      plan.company?.toLowerCase().includes(search.toLowerCase()) ||
      (plan.bom_id && plan.bom_id.toLowerCase().includes(search.toLowerCase()))
    )
  }, [plans, search])

  const getStatusBadge = (status) => {
    const configs = {
      draft: { color: 'text-slate-600 bg-slate-50 border-slate-100', icon: FileText },
      submitted: { color: 'text-blue-600 bg-blue-50 border-blue-100', icon: Activity },
      completed: { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 },
      cancelled: { color: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle }
    }
    const normalized = (status || 'draft').toLowerCase()
    const config = configs[normalized] || configs.draft
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 p-2  py-1 rounded w-fit text-xs    border ${config.color}`}>
        <Icon size={12} />
        {status}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return '-'
    }
  }

  const checkItemsStock = async (items, stateUpdater) => {
    try {
      setCheckingStock(true)
      const token = localStorage.getItem('token')
      const stockInfo = {}

      for (const item of items || []) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, {
            headers: { 'Authorization': `Bearer ${token}` },
            method: 'GET'
          })

          if (res.ok) {
            const data = await res.json()
            const balances = Array.isArray(data) ? data : (data.data || [])

            const itemBalance = balances.find(b => b.item_code === item.item_code)
            const availableQty = itemBalance ? parseFloat(itemBalance.available_qty || itemBalance.current_qty || 0) : 0

            stockInfo[item.item_code] = {
              available: availableQty,
              requested: item.quantity || item.qty || 0,
              isAvailable: availableQty > 0 && availableQty >= (item.quantity || item.qty || 0),
              hasStock: availableQty > 0
            }
          }
        } catch (err) {
          stockInfo[item.item_code] = {
            available: 0,
            requested: item.quantity || item.qty || 0,
            isAvailable: false,
            hasStock: false
          }
        }
      }

      stateUpdater(stockInfo)
    } catch (err) {
      console.error('Error checking stock:', err)
    } finally {
      setCheckingStock(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2 rounded  shadow  shadow-slate-200">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className=" text-xl  text-slate-900 ">
                  Production <span className="text-indigo-600">Intelligence</span>
                </h1>
                <div className="flex items-center gap-2 text-xs   text-slate-400 ">
                  <Activity size={12} className="text-indigo-500" />
                  <span>Planning & Strategy Center</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <Clock size={12} className="text-amber-500" />
                  <span className="text-slate-900">
                    {currentTime.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTruncate}
              className="group flex items-center gap-2 px-5 py-2 text-rose-600 hover:bg-rose-50 rounded  transition-all text-xs    border border-transparent hover:border-rose-100"
            >
              <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
              Reset System
            </button>
            <button
              onClick={() => navigate('/manufacturing/production-planning/new')}
              className="flex items-center gap-2 p-2  bg-slate-900 text-white rounded hover:bg-slate-800 shadow  shadow-slate-200 hover:shadow-2xl hover:-translate-y-1 transition-all text-xs   "
            >
              <Plus size={18} />
              New Strategic Plan
            </button>
          </div>
        </div>

        {/* Intelligence Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Active Strategies"
            value={stats.total}
            icon={Layers}
            color="indigo"
            subtitle="Total registered plans"
          />
          <StatCard
            label="Execution Phase"
            value={stats.submitted}
            icon={Zap}
            color="blue"
            subtitle="Plans in active production"
          />
          <StatCard
            label="Optimization Complete"
            value={stats.completed}
            icon={CheckCircle2}
            color="emerald"
            subtitle="Successfully closed plans"
          />
          <StatCard
            label="Draft Formulation"
            value={stats.draft}
            icon={FileText}
            color="slate"
            subtitle="Pending validation"
          />
        </div>

        {/* Main Content Board */}
        <div className="bg-white rounded  border border-gray-100   overflow-hidden">
          {/* Dashboard Control Bar */}
          <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 my-4">
            <div className="flex items-center gap-4">
              <div className="bg-white p-2 rounded    border border-gray-100 text-indigo-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-xs  text-gray-900 ">Strategy Pipeline</h3>
                <p className="text-xs   text-gray-400">Manage and monitor manufacturing execution</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="SEARCH STRATEGIES..."
                  className="pl-12 pr-6 py-2 bg-white border border-gray-100 rounded  text-xs    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-80"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="p-3 bg-white border border-gray-100 rounded  text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all  ">
                <Filter size={20} />
              </button>
            </div>
          </div>

          <div className="">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-22 bg-gray-50/30">
                <div className="w-6 h-6  border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mb-6" />
                <p className="text-xs   text-slate-500  animate-pulse">Synchronizing Production Intelligence...</p>
              </div>
            ) : filteredPlans.length > 0 ? (
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="p-2   text-xs   text-gray-400  border-b border-gray-100">Plan ID</th>
                    <th className="p-2   text-xs   text-gray-400  border-b border-gray-100 text-center">Origin & Status</th>
                    <th className="p-2   text-xs   text-gray-400  border-b border-gray-100 text-center">Timeline</th>
                    <th className="p-2   text-xs   text-gray-400  border-b border-gray-100">Production Progress</th>
                    <th className="p-2   text-xs   text-gray-400  border-b border-gray-100 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPlans.map((plan) => {
                    const progressData = planProgress[plan.plan_id] || { progress: 0, currentOp: 'Awaiting Start', totalOps: 0, completedOps: 0 }
                    const progressValue = progressData.progress
                    const currentOp = progressData.currentOp
                    const opsInfo = `${progressData.completedOps}/${progressData.totalOps}`
                    const isOverdue = plan.expected_completion_date && new Date(plan.expected_completion_date) < new Date() && plan.status !== 'completed'

                    return (
                      <tr key={plan.plan_id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-2 ">
                          <div className="flex items-center gap-4">
                            <div className="w-6 h-6 p-2  rounded  bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                              <Package size={15} />
                            </div>
                            <div>
                              <p className="text-xs  text-gray-900">{plan.plan_id}</p>
                              <div className="flex items-center gap-2 ">
                                
                                <span className="text-xs   text-gray-400 truncate max-w-[200px]">
                                  {plan.bom_id && bomCache[plan.bom_id] ? bomCache[plan.bom_id] : (plan.fg_items?.[0]?.item_name || 'Generic Production')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 ">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-left gap-2 text-[11px] text-gray-600  ">
                              <Factory size={12} className="text-gray-400" />
                              <span>{plan.company || 'Global Manufacturing'}</span>
                            </div>
                            {getStatusBadge(plan.status || 'draft')}
                          </div>
                        </td>
                        <td className="p-2  text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2 text-[11px] text-gray-600  ">
                              <Calendar size={12} className="text-gray-400" />
                              <span>{formatDate(plan.expected_completion_date)}</span>
                            </div>
                            {plan.expected_completion_date && (
                              <span className={`inline-flex items-center gap-1.5 p-2  py-1 rounded-full text-[9px]   border ${isOverdue ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                }`}>
                                {isOverdue ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                                {isOverdue ? 'Overdue' : 'O Schedule'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 ">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs   text-gray-400 ">{progressValue}% Complete</span>
                              <span className="text-xs   text-slate-900 bg-slate-100 px-2 py-0.5 rounded ">{opsInfo} OPS</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                              <div
                                className={`h-full transition-all duration-700 rounded-full ${progressValue === 0 ? 'bg-gray-200' :
                                  progressValue < 30 ? 'bg-amber-500' :
                                    progressValue < 70 ? 'bg-indigo-500' :
                                      'bg-emerald-500'
                                  }`}
                                style={{ width: `${progressValue}%` }}
                              />
                            </div>
                            <p className="text-xs   text-gray-500 truncate flex items-center gap-1.5">
                              <Clock size={15} className="text-indigo-500" /> {currentOp}
                            </p>
                          </div>
                        </td>
                        <td className="p-2  text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => fetchPlanOperationProgress(plan.plan_id)}
                              className=" p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded  transition-all   hover:shadow-md bg-white border border-gray-50"
                              title="Sync Progress"
                            >
                              <TrendingUp size={15} />
                            </button>
                            <button
                              onClick={() => handleCreateWorkOrder(plan)}
                              className=" p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all   hover:shadow-md bg-white border border-gray-50"
                              title="Configure Strategy"
                            >
                              <Settings size={15} />
                            </button>
                            <button
                              onClick={() => handleSendMaterialRequest(plan)}
                              disabled={sendingMaterialRequest}
                              className=" p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded  transition-all   hover:shadow-md bg-white border border-gray-50 disabled:opacity-50"
                              title="Request Materials"
                            >
                              {sendingMaterialRequest ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
                            </button>
                            <button
                              onClick={() => handleEdit(plan)}
                              className=" p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded  transition-all   hover:shadow-md bg-white border border-gray-50"
                              title="Modify Strategy"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => handleShowHistory(plan)}
                              className=" p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all   hover:shadow-md bg-white border border-gray-50 relative"
                              title="View Request History"
                            >
                              <FileText size={15} />
                              {mrHistory[plan.plan_id] && mrHistory[plan.plan_id].length > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-xs   text-white   animate-in zoom-in duration-300">
                                  {mrHistory[plan.plan_id].length}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(plan.plan_id)}
                              className=" p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all   hover:shadow-md bg-white border border-gray-50"
                              title="Discard Plan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-22 text-center bg-gray-50/30">
                <div className="w-24 h-24 rounded bg-white shadow  shadow-gray-200/50 flex items-center justify-center text-gray-200 mb-6 border border-gray-100">
                  <Layers size={48} />
                </div>
                <h3 className="text-lg  text-gray-900 ">No Strategic Plans Found</h3>
                <p className="text-sm  text-gray-400 mt-2 max-w-[300px] leading-relaxed">
                  Start by creating a new production plan to coordinate your manufacturing operations.
                </p>
                <button
                  onClick={() => navigate('/manufacturing/production-planning/new')}
                  className="mt-8 flex items-center gap-2 p-2  bg-slate-900 text-white rounded hover:bg-slate-800 shadow  shadow-slate-200 transition-all text-xs   "
                >
                  <Plus size={18} />
                  Initiate First Strategy
                </button>
              </div>
            )}
          </div>

          {filteredPlans.length > 0 && (
            <div className="p-2  bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs   text-gray-400 ">
                Showing {filteredPlans.length} of {plans.length} strategic formulations
              </p>
              <div className="flex items-center gap-2 bg-white p-2 rounded-full border border-gray-100  ">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-xs   text-gray-900 ">Neural Link Active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showWorkOrderModal && workOrderData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded  shadow-2xl max-w-4xl w-full  overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[30pc] overflow-hidden">
            <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded  shadow-lg shadow-indigo-200">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl  text-gray-900 ">Configure Work Order</h2>
                  <p className="text-xs   text-gray-400  mt-0.5 flex items-center gap-2">
                    <Activity size={12} className="text-indigo-500" />
                    Strategy Implementation Phase
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWorkOrderModal(false)
                  setWorkOrderData(null)
                }}
                className=" p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded  transition-all   border border-transparent hover:border-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 ">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-2 rounded   bg-gray-50 border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Item Code</p>
                  <p className="text-sm  text-gray-900">{workOrderData.item_code}</p>
                </div>
                <div className="p-2 rounded   bg-gray-50 border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">BOM Reference</p>
                  <p className="text-xs  text-gray-900 truncate" title={workOrderData.bom_no}>{workOrderData.bom_no || 'Manual'}</p>
                </div>
                <div className="p-2 rounded   bg-gray-50 border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Target Qty</p>
                  <p className="text-sm  text-gray-900">{workOrderData.quantity} Units</p>
                </div>
                <div className="p-2 rounded   bg-gray-50 border border-gray-100">
                  <p className="text-xs   text-gray-400  mb-1">Priority</p>
                  <span className="inline-flex items-center gap-1.5 p-2  py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-xs   ">
                    {workOrderData.priority}
                  </span>
                </div>
              </div>

              {workOrderData.operations && workOrderData.operations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    <h3 className="text-xs  text-gray-900 ">Operational Sequence ({workOrderData.operations.length})</h3>
                  </div>
                  <div className="rounded border border-gray-100 overflow-hidden  ">
                    <table className="w-full text-left bg-white border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="p-2  text-xs   text-gray-400 ">Item / Operation</th>
                          <th className="p-2  text-xs   text-gray-400 ">Workstation</th>
                          <th className="p-2  text-xs   text-gray-400  text-right">Time (hrs)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {workOrderData.operations.map((op, idx) => {
                          const isNewGroup = idx === 0 || workOrderData.operations[idx - 1].bom_id !== op.bom_id;
                          return (
                            <React.Fragment key={idx}>
                              {isNewGroup && (
                                <tr className="bg-slate-50/50">
                                  <td colSpan="3" className="p-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${op.depth === 0 ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                                    {op.item_name || op.item_code} {op.depth === 0 ? '(Finished Good)' : '(Sub-Assembly)'}
                                  </td>
                                </tr>
                              )}
                              <tr className="hover:bg-indigo-50/30 transition-colors">
                                <td className="p-2  text-xs  text-gray-900 flex items-center gap-2">
                                  <div className="w-4 flex justify-center">
                                    <div className="w-0.5 h-4 bg-gray-200" />
                                  </div>
                                  {op.operation_name || op.operation || '-'}
                                </td>
                                <td className="p-2  text-xs  text-gray-500">{op.workstation_type || op.workstation || '-'}</td>
                                <td className="p-2  text-right text-xs  text-indigo-600">{op.operation_time || op.time || 0}</td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* {(workOrderData.sub_assemblies?.length > 0 || workOrderData.required_items?.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    <h3 className="text-xs  text-gray-900 ">Resource Allocation</h3>
                  </div>
                  <div className="rounded border border-gray-100 overflow-hidden  ">
                    <table className="w-full text-left bg-white border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="p-2  text-xs   text-gray-400 ">Component</th>
                          <th className="p-2  text-xs   text-gray-400  text-right">Required</th>
                          <th className="p-2  text-xs   text-gray-400  text-right">Available</th>
                          <th className="p-2  text-xs   text-gray-400  text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[...(workOrderData.sub_assemblies || []), ...(workOrderData.required_items || [])].map((item, idx) => {
                          const stock = workOrderStockData[item.item_code]
                          const isLow = stock && !stock.isAvailable
                          return (
                            <tr key={idx} className={`hover:bg-indigo-50/30 transition-colors ${isLow ? 'bg-rose-50/50' : ''}`}>
                              <td className="p-2 ">
                                <p className="text-xs  text-gray-900 tracking-tight">{item.item_code}</p>
                                <p className="text-xs   text-gray-400 mt-0.5">{item.item_name}</p>
                              </td>
                              <td className="p-2  text-right text-xs  text-gray-900">
                                {item.required_qty || item.qty || 0}
                              </td>
                              <td className="p-2  text-right text-xs  text-gray-900">
                                {stock ? stock.available.toFixed(2) : '-'}
                              </td>
                              <td className="p-2  text-center">
                                {stock ? (
                                  stock.isAvailable ? (
                                    <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded  inline-block">
                                      <CheckCircle2 size={16} />
                                    </div>
                                  ) : (
                                    <div className="bg-rose-50 text-rose-600 p-1.5 rounded  inline-block">
                                      <AlertCircle size={16} />
                                    </div>
                                  )
                                ) : (
                                  <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin mx-auto" />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )} */}
            </div>

            <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3 p-2 bg-white rounded  border border-gray-100  ">
                <div className={`w-2.5 h-2.5 rounded-full ${checkingStock ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} />
                <span className="text-xs   text-gray-900 ">{checkingStock ? 'Analyzing Inventories...' : 'All Stocks Verified'}</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setShowWorkOrderModal(false)
                    setWorkOrderData(null)
                  }}
                  className="p-2 text-xs   text-gray-500 hover:text-gray-900  transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleCreateWorkOrderConfirm}
                  disabled={creatingWorkOrder}
                  className="flex items-center gap-2 p-2  bg-slate-900 text-white rounded  hover:bg-slate-800 shadow  shadow-slate-200 transition-all text-xs    disabled:opacity-50"
                >
                  {creatingWorkOrder ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  {creatingWorkOrder ? 'Implementing...' : 'Initiate Production'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMaterialRequestModal && materialRequestData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[35pc] overflow-hidden">
            <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-2 rounded shadow-lg shadow-blue-200 transition-colors">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-gray-900 ">Material Request</h2>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <Boxes size={12} className="text-blue-500" />
                    Resource Acquisition Phase
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMaterialRequestModal(false)
                  setMaterialRequestData(null)
                }}
                className=" p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded transition-all border border-transparent hover:border-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 ">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-2 rounded bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Request Identifier</p>
                  <p className="text-sm text-gray-900">{materialRequestData.series_no}</p>
                </div>
                <div className="p-2 rounded bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Originating Dept</p>
                  <p className="text-sm text-gray-900">{materialRequestData.department}</p>
                </div>
                <div className="p-2 rounded bg-gray-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">SLA Target Date</p>
                  <p className="text-sm text-gray-900">{formatDate(materialRequestData.required_by_date)}</p>
                </div>
              </div>

              {materialRequestData.items_notes && (
                <div className="p-2 mt-3 rounded bg-indigo-50/30 border border-indigo-100 border-l-4 border-l-indigo-600">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-indigo-600" />
                    <p className="text-xs text-indigo-900 ">Intelligence Strategy Notes</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{materialRequestData.items_notes}</p>
                </div>
              )}

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full transition-colors" />
                  <h3 className="text-xs text-gray-900 ">
                    Items to Request ({materialRequestData.items?.length || 0})
                  </h3>
                </div>
                <div className="rounded border border-gray-100 overflow-hidden  ">
                  <table className="w-full text-left bg-white border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="p-2 text-xs text-gray-400 ">Component Intelligence</th>
                        <th className="p-2 text-xs text-gray-400 text-right">Required</th>
                        <th className="p-2 text-xs text-gray-400 text-right">Inventory</th>
                        <th className="p-2 text-xs text-gray-400 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {materialRequestData.items?.map((item, idx) => {
                        const stock = materialStockData[item.item_code]
                        const isLow = stock && !stock.isAvailable
                        return (
                          <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${isLow ? 'bg-rose-50/50' : ''}`}>
                            <td className="p-2 ">
                              <p className="text-xs text-gray-900 tracking-tight">{item.item_code}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{item.item_name}</p>
                            </td>
                            <td className="p-2 text-right">
                              <span className="text-xs text-gray-900">{item.qty || item.quantity || 0}</span>
                              <span className="ml-1 text-xs text-slate-400 ">{item.uom || 'pcs'}</span>
                            </td>
                            <td className="p-2 text-right text-xs text-gray-900">
                              {stock ? stock.available.toFixed(2) : '-'}
                            </td>
                            <td className="p-2 text-center">
                              {stock ? (
                                stock.isAvailable ? (
                                  <div className="bg-emerald-50 text-emerald-600 p-2 py-1 rounded-full text-[9px] border border-emerald-100 inline-flex items-center gap-1">
                                    <Check size={15} /> Fully Stocked
                                  </div>
                                ) : stock.hasStock ? (
                                  <div className="bg-amber-50 text-amber-600 p-2 py-1 rounded-full text-[9px] border border-amber-100 inline-flex items-center gap-1">
                                    <AlertCircle size={15} /> Partial Stock
                                  </div>
                                ) : (
                                  <div className="bg-rose-50 text-rose-600 p-2 py-1 rounded-full text-[9px] border border-rose-100 inline-flex items-center gap-1">
                                    <X size={15} /> Zero Stock
                                  </div>
                                )
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin mx-auto" />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
              <button
                onClick={() => {
                  setShowMaterialRequestModal(false)
                  setMaterialRequestData(null)
                }}
                className="p-2 text-xs text-gray-500 hover:text-gray-900 transition-all"
              >
                Abort Request
              </button>
              <button
                onClick={handleSendMaterialRequestConfirm}
                disabled={sendingMaterialRequest}
                className="flex items-center gap-2 p-2 bg-slate-900 text-white rounded hover:bg-slate-800 shadow shadow-slate-200 transition-all text-xs disabled:opacity-50"
              >
                {sendingMaterialRequest ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                {sendingMaterialRequest ? 'SYNCHRONIZING...' : 'Material Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && selectedPlanForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded shadow-lg shadow-indigo-200">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl   text-gray-900">Request Traceability History</h2>
                  <p className="text-xs font-medium text-gray-400 mt-0.5 flex items-center gap-2">
                    <Activity size={12} className="text-indigo-500" />
                    Linked Material Requests for Plan: {selectedPlanForHistory.plan_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedPlanForHistory(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded transition-all border border-transparent hover:border-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader size={48} className="text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm text-gray-500">Retrieving historical data from vault...</p>
                </div>
              ) : mrHistory[selectedPlanForHistory.plan_id] && mrHistory[selectedPlanForHistory.plan_id].length > 0 ? (
                <div className="space-y-2">
                  {mrHistory[selectedPlanForHistory.plan_id].map((mr, idx) => (
                    <div key={mr.mr_id} className="border border-gray-100 rounded  overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-gray-50/50 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200 text-indigo-600   text-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-sm   text-gray-900">{mr.mr_id}</h3>
                            <p className="text-xs text-gray-400 font-medium">Requested: {new Date(mr.request_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs tracking-wider border ${
                            mr.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            mr.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            mr.status === 'draft' ? 'bg-gray-50 text-gray-600 border-gray-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {mr.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-xs text-gray-400 border-b border-gray-50">
                              <th className="pb-2   ">Item Details</th>
                              <th className="pb-2 text-right">Requested Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {mr.items && mr.items.map((item, itemIdx) => (
                              <tr key={itemIdx} className="text-xs">
                                <td className="py-2">
                                  <p className="  text-gray-800">{item.item_code}</p>
                                  <p className="text-xs text-gray-400">{item.item_name}</p>
                                </td>
                                <td className="py-2 text-right font-medium text-gray-900">
                                  {item.qty} {item.uom}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded  border border-dashed border-gray-200">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-gray-200 mb-4   border border-gray-100">
                    <Boxes size={32} />
                  </div>
                  <h3 className="text-base   text-gray-900">No Request History Found</h3>
                  <p className="text-xs text-gray-400 mt-1">This production plan has no historical material requests yet.</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedPlanForHistory(null)
                }}
                className="px-6 py-2 bg-slate-900 text-white text-xs   rounded hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
   
