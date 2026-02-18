import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import DataTable from '../../components/Table/DataTable'
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
  ClipboardList,
  Download
} from 'lucide-react'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'

const StatCard = ({ label, value, icon: Icon, color, subtitle, trend }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 ',
    amber: 'text-amber-600',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    violet: 'text-violet-600 bg-violet-50 border-violet-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  }

  return (
    <div className="bg-slate-50/50 p-2 rounded  border border-gray-100   hover: transition-all group  relative">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white rounded-full opacity-50 group-hover:scale-110 transition-transform" />
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

const isSubAssemblyGroup = (itemGroup, itemCode = '') => {
  if (!itemGroup && !itemCode) return false
  
  const normalizedGroup = (itemGroup || '').toLowerCase().replace(/[-\s]/g, '').trim()
  if (normalizedGroup === 'consumable') return false
  
  const isSAGroup = normalizedGroup === 'subassemblies' || 
                    normalizedGroup === 'subassembly' || 
                    normalizedGroup === 'intermediates' ||
                    normalizedGroup.includes('subassembly') ||
                    normalizedGroup.includes('sub-assembly')

  const isSACode = (itemCode || '').toUpperCase().startsWith('SA-') || 
                   (itemCode || '').toUpperCase().startsWith('SA') ||
                   (itemCode || '').toUpperCase().startsWith('S-') ||
                   (itemCode || '').toUpperCase().includes('SUBASM')
  
  return isSAGroup || isSACode
}

const enrichRequiredItemsWithStock = async (items, token) => {
  if (!items || items.length === 0) return items

  try {
    const stockData = await productionService.getStockBalance()
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
  } catch (err) {
    console.error('Error fetching stock data:', err)
  }

  return items
}

const findBomForItem = async (itemCode, token, excludeBomId = null) => {
  try {
    const data = await productionService.getBOMs()
    const bomList = Array.isArray(data) ? data : (data.data || [])

    const matchingBom = bomList.find(bom => {
      const bomItemCode = bom.item_code || bom.product_code || ''
      return bomItemCode.trim() === itemCode.trim() && bom.bom_id !== excludeBomId
    })

    if (matchingBom) {
      return matchingBom.bom_id || matchingBom.id
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
    const bomData = await productionService.getBOMDetails(bomId)
    const bom = bomData.data || bomData

    let materialsToProcess = []
    const bomLines = bom.lines || bom.items || []
    const rawMaterials = bom.bom_raw_materials || bom.rawMaterials || []
    const consumables = bom.bom_consumables || bom.consumables || []

    if (bomLines.length > 0) {
      materialsToProcess = [...bomLines, ...rawMaterials, ...consumables]
    } else {
      materialsToProcess = [...rawMaterials, ...consumables]
    }

    for (const material of materialsToProcess) {
      const itemCode = material.item_code || material.component_code
      if (!itemCode) continue

      const baseQty = parseFloat(material.qty) || parseFloat(material.quantity) || parseFloat(material.bom_qty) || 1
      const totalQty = baseQty * plannedQty

      const isSubAssembly = isSubAssemblyGroup(material.item_group, material.item_code) ||
        material.fg_sub_assembly === 'Sub-Assembly' ||
        material.component_type === 'Sub-Assembly' ||
        (itemCode && itemCode.startsWith('SA-'))

      if (isSubAssembly) {
        let subBomId = material.bom_id
        if (!subBomId || subBomId === bomId) {
          subBomId = await findBomForItem(itemCode, token, bomId)
        }

        if (subBomId && subBomId !== bomId) {
          const subMaterials = await collectAllRawMaterials(subBomId, totalQty, token, visitedBoms)
          for (const [subItemCode, subMaterial] of Object.entries(subMaterials)) {
            if (allRawMaterials[subItemCode]) {
              allRawMaterials[subItemCode].qty += subMaterial.qty
              allRawMaterials[subItemCode].quantity += subMaterial.qty
            } else {
              allRawMaterials[subItemCode] = subMaterial
            }
          }
        } else {
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
    const bomData = await productionService.getBOMDetails(bomId)
    const bom = bomData.data || bomData

    // Collect sub-assembly operations first
    const materials = [...(bom.lines || []), ...(bom.bom_raw_materials || []), ...(bom.rawMaterials || [])]
    for (const material of materials) {
      const itemCode = material.item_code || material.component_code
      if (!itemCode) continue

      const isSubAssembly = isSubAssemblyGroup(material.item_group, material.item_code) ||
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

    // Add current BOM's operations last (Finished Goods will be at the very end)
    const operations = (bom.operations || []).map(op => ({
      ...op,
      bom_id: bomId,
      item_code: bom.item_code,
      item_name: bom.product_name || bom.item_code,
      depth
    }))
    allOperations = [...allOperations, ...operations]
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
  const [mrActiveTab, setMrActiveTab] = useState('pending')
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedPlanForHistory, setSelectedPlanForHistory] = useState(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [currentTime, setCurrentTime] = useState(new Date())

  const renderHistoryCard = (mr, idx) => (
    <div key={mr.mr_id} className="border border-gray-100 rounded  overflow-hidden hover: transition-shadow">
      <div className="bg-gray-50/50 p-2 flex items-center justify-between">
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
  );

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
      const woData = await productionService.getWorkOrders({ production_plan_id: planId })
      const workOrders = Array.isArray(woData) ? woData : (woData.data || [])

      if (workOrders.length === 0) {
        setPlanProgress(prev => ({
          ...prev,
          [planId]: { progress: 0, currentOp: 'No work orders', totalOps: 0, completedOps: 0, woCount: 0 }
        }))
        return
      }

      let totalOps = 0
      let completedOps = 0
      let weightedProgress = 0
      let lastInProgressOp = 'Not Started'

      for (const wo of workOrders) {
        try {
          const jcData = await productionService.getJobCards({ work_order_id: wo.wo_id || wo.work_order_id })
          const jobCards = Array.isArray(jcData) ? jcData : (jcData.data || [])

          jobCards.forEach(jc => {
            totalOps++
            if (jc.status === 'completed') {
              completedOps++
              weightedProgress += 1
            } else if (jc.status === 'in-progress' || jc.status === 'in_progress') {
              lastInProgressOp = `${jc.operation || 'Operation'} (${jc.operation_sequence || 'Seq'}) - In Progress`
              weightedProgress += 0.5
            }
          })
        } catch (jcErr) {
          console.error(`Error fetching job cards for WO ${wo.wo_id}:`, jcErr)
        }
      }

      const progress = totalOps > 0 ? Math.round((weightedProgress / totalOps) * 100) : 0

      setPlanProgress(prev => ({
        ...prev,
        [planId]: {
          progress,
          currentOp: lastInProgressOp,
          totalOps,
          completedOps,
          woCount: workOrders.length
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
      const data = await productionService.getMaterialRequests({ production_plan_id: planId })
      const requests = data.data || data
      setMrHistory(prev => ({ ...prev, [planId]: requests }))
      return requests
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
      const bomData = await productionService.getBOMDetails(bomId)
      const bom = bomData.data || bomData
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
          const itemData = await productionService.getItemDetails(bomData.item_code)
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
      const data = await productionService.getProductionPlanningList()
      let plansData = data.data || []

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
      await productionService.deleteProductionPlan(planId)
      setSuccess('Production plan deleted successfully')
      setTimeout(() => setSuccess(null), 3000)
      fetchPlans()
    } catch (err) {
      setError('Error deleting production plan')
      console.error(err)
    }
  }

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL production plans. Are you sure?')) return

    try {
      setLoading(true)
      await productionService.truncateProductionPlanning()
      setSuccess('All production plans truncated successfully')
      setTimeout(() => setSuccess(null), 3000)
      fetchPlans()
    } catch (err) {
      setError('Error truncating production plans')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = async (plan) => {
    try {
      const result = await productionService.getProductionPlanReport(plan.plan_id)
      const { workOrders, jobCards, productionEntries } = result.data;
      const progressData = planProgress[plan.plan_id] || { progress: 0 };

      // Create a comprehensive CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // 1. Report Header
      csvContent += `PRODUCTION PERFORMANCE REPORT: ${plan.plan_id}\n`;
      csvContent += `Company,${plan.company || 'N/A'},Date,${new Date().toLocaleDateString()}\n`;
      csvContent += `Status,${plan.status || 'draft'},Total Progress,${progressData.progress}%\n\n`;

      // 2. Work Order Summary Section
      csvContent += "SECTION 1: WORK ORDER SUMMARY\n";
      csvContent += "Work Order ID,Item Code,Item Name,Planned Qty,Produced Qty,Scrap Qty,Rejected Qty,Status,Completion %\n";
      
      workOrders.forEach(wo => {
        const completionPct = wo.quantity > 0 ? Math.round((wo.produced_qty / wo.quantity) * 100) : 0;
        csvContent += `${wo.wo_id},${wo.item_code},"${wo.item_name || ''}",${wo.quantity},${wo.produced_qty},${wo.scrap_qty || 0},${wo.rejected_qty || 0},${wo.status},${completionPct}%\n`;
      });
      csvContent += "\n";

      // 3. Operational Details Section
      if (jobCards && jobCards.length > 0) {
        csvContent += "SECTION 2: OPERATIONAL BREAKDOWN (JOB CARDS)\n";
        csvContent += "Job Card ID,Work Order ID,Sequence,Operation,Workstation,Status,Accepted Qty,Rejected Qty\n";
        
        jobCards.forEach(jc => {
          csvContent += `${jc.job_card_id},${jc.work_order_id},${jc.operation_sequence},"${jc.operation_name || jc.operation}",${jc.workstation || ''},${jc.status},${jc.accepted_quantity || 0},${jc.rejected_quantity || 0}\n`;
        });
        csvContent += "\n";
      }

      // 4. Production Entries Log Section
      if (productionEntries && productionEntries.length > 0) {
        csvContent += "SECTION 3: PRODUCTION ENTRIES LOG\n";
        csvContent += "Entry ID,Work Order ID,Quantity Produced,Posting Date,Posting Time,Created At\n";
        
        productionEntries.forEach(pe => {
          const postingDate = pe.posting_date ? new Date(pe.posting_date).toLocaleDateString() : '';
          const createdAt = pe.created_at ? new Date(pe.created_at).toLocaleString() : '';
          csvContent += `${pe.entry_id},${pe.work_order_id},${pe.quantity_produced},${postingDate},${pe.posting_time || ''},${createdAt}\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Production_Report_${plan.plan_id}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.addToast('Comprehensive report generated successfully', 'success');
    } catch (err) {
      console.error('Error downloading report:', err);
      toast.addToast('Failed to generate report', 'error');
    }
  }

  const handleEdit = (plan) => {
    navigate(`/manufacturing/production-planning/${plan.plan_id}`)
  }

  const handleCreateWorkOrder = async (plan) => {
    // Check if work orders already exist for this plan
    const existingProgress = planProgress[plan.plan_id];
    if (existingProgress && existingProgress.woCount > 0) {
      toast.addToast(`Work orders already exist for plan ${plan.plan_id}. You can manage them in the Work Orders page.`, 'warning');
      return;
    }

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
      const isSub = isSubAssemblyGroup(item.item_group, item.item_code) ||
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

  const plansWithProgress = useMemo(() => {
    return plans.map(plan => {
      const progressData = planProgress[plan.plan_id] || { progress: 0, currentOp: 'Awaiting Start', totalOps: 0, completedOps: 0, woCount: 0 }
      const isEffectiveCompleted = plan.status === 'completed' || (progressData.progress === 100 && progressData.totalOps > 0)
      
      let effectiveStatus = plan.status || 'draft'
      if (isEffectiveCompleted) {
        effectiveStatus = 'completed'
      } else if (progressData.progress > 0 || progressData.currentOp.includes('In Progress')) {
        effectiveStatus = 'in-progress'
      } else if (progressData.woCount > 0) {
        effectiveStatus = 'submitted'
      }

      return {
        ...plan,
        progress: progressData.progress,
        currentOp: progressData.currentOp,
        totalOps: progressData.totalOps,
        completedOps: progressData.completedOps,
        woCount: progressData.woCount,
        effectiveStatus
      }
    })
  }, [plans, planProgress])

  const stats = useMemo(() => {
    const total = plansWithProgress.length
    const submitted = plansWithProgress.filter(p => (p.status === 'submitted' || p.effectiveStatus === 'in-progress') && p.effectiveStatus !== 'completed').length
    const completed = plansWithProgress.filter(p => p.effectiveStatus === 'completed').length
    const draft = plansWithProgress.filter(p => p.status === 'draft' && p.effectiveStatus !== 'in-progress').length
    return { total, submitted, completed, draft }
  }, [plansWithProgress])

  const filteredPlans = useMemo(() => {
    return plansWithProgress.filter(plan => {
      // Search filter
      const matchesSearch = plan.plan_id.toLowerCase().includes(search.toLowerCase()) ||
        plan.company?.toLowerCase().includes(search.toLowerCase()) ||
        (plan.bom_id && plan.bom_id.toLowerCase().includes(search.toLowerCase()))

      if (!matchesSearch) return false

      // Tab filter
      if (activeTab === 'pending_mr') {
        const history = mrHistory[plan.plan_id] || []
        return history.some(mr => mr.status !== 'completed')
      }

      return true
    })
  }, [plansWithProgress, search, activeTab, mrHistory])

  const getStatusBadge = (status) => {
    const configs = {
      draft: { color: 'text-slate-600 ', icon: FileText },
      submitted: { color: 'text-blue-600 ', icon: Activity },
      'in progress': { color: 'text-amber-600 ', icon: TrendingUp },
      'in-progress': { color: 'text-amber-600 ', icon: TrendingUp },
      completed: { color: 'text-emerald-600 ', icon: CheckCircle2 },
      cancelled: { color: 'text-rose-600 ', icon: XCircle }
    }
    const normalized = (status || 'draft').toLowerCase()
    const config = configs[normalized] || configs.draft
    const Icon = config.icon

    return (
      <span className={`w-fit text-[8px] text-left font-medium uppercase tracking-wider ${config.color}`}>
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

      const res = await fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, {
        headers: { 'Authorization': `Bearer ${token}` },
        method: 'GET'
      })

      if (res.ok) {
        const data = await res.json()
        const balances = Array.isArray(data) ? data : (data.data || [])

        for (const item of items || []) {
          const itemBalance = balances.find(b => b.item_code === item.item_code)
          const availableQty = itemBalance ? parseFloat(itemBalance.available_qty || itemBalance.current_qty || 0) : 0

          stockInfo[item.item_code] = {
            available: availableQty,
            requested: item.quantity || item.qty || 0,
            isAvailable: availableQty > 0 && availableQty >= (item.quantity || item.qty || 0),
            hasStock: availableQty > 0
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

  const columns = [
    {
      key: 'plan_id',
      label: 'Plan ID',
      render: (value, plan) => (
        <div className="flex items-center gap-4">
          
          <div>
            <p className="text-xs text-gray-900">{plan.bom_id && bomCache[plan.bom_id] ? bomCache[plan.bom_id] : (plan.fg_items?.[0]?.item_name || 'Generic Production')}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 truncate max-w-[200px]">
                {plan.plan_id}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Origin & Status',
      render: (value, plan) => {
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-left gap-2 text-[11px] text-gray-600">
              <Factory size={12} className="text-gray-400" />
              <span>{plan.company || 'Global Manufacturing'}</span>
            </div>
            {getStatusBadge(plan.effectiveStatus)}
          </div>
        )
      }
    },
    {
      key: 'expected_completion_date',
      label: 'Timeline',
      render: (value, plan) => {
        const isOverdue = plan.expected_completion_date && new Date(plan.expected_completion_date) < new Date() && plan.effectiveStatus !== 'completed'
        return (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-[11px] text-gray-600">
              <Calendar size={12} className="text-gray-400" />
              <span>{formatDate(plan.expected_completion_date)}</span>
            </div>
            {plan.expected_completion_date && (
              <span className={`inline-flex items-center gap-1.5  text-[9px] border ${isOverdue ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-emerald-600 '}`}>
                {isOverdue ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                {isOverdue ? 'Overdue' : 'On Schedule'}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'progress',
      label: 'Production Progress',
      render: (value, plan) => {
        const progressValue = plan.progress
        const currentOp = plan.currentOp
        const opsInfo = `${plan.completedOps}/${plan.totalOps}`
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{progressValue}% Complete</span>
              <span className="text-[8px] text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{opsInfo} OPS</span>
            </div>
            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-700 rounded-full ${progressValue === 0 ? 'bg-gray-200' :
                  progressValue < 30 ? 'bg-amber-500' :
                    progressValue < 70 ? 'bg-indigo-500' :
                      'bg-emerald-500'
                  }`}
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 truncate flex items-center gap-1.5">
              <Clock size={12} className="text-indigo-500" /> {plan.effectiveStatus === 'completed' ? 'Production Completed' : currentOp}
            </p>
          </div>
        )
      }
    }
  ]

  const renderActions = (plan) => {
    return (
      <div className="flex items-center justify-end ">
        <button
          onClick={() => navigate(`/manufacturing/production-planning/${plan.plan_id}`)}
          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all hover: bg-white border border-gray-50"
          title="View Strategy"
        >
          <Eye size={12} />
        </button>
        {plan.effectiveStatus === 'completed' && (
          <button
            onClick={() => handleDownloadReport(plan)}
            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all hover: bg-white border border-gray-50"
            title="Download Production Report"
          >
            <Download size={12} />
          </button>
        )}
        {plan.effectiveStatus !== 'completed' && (
          <button
            onClick={() => fetchPlanOperationProgress(plan.plan_id)}
            className="p-2 rounded transition-all hover: bg-white border border-gray-50 text-gray-400 hover:text-amber-600 hover:bg-amber-50"
            title="Sync Progress"
          >
            <TrendingUp size={12} />
          </button>
        )}
        {plan.effectiveStatus !== 'completed' && plan.woCount === 0 && (
          <button
            onClick={() => handleCreateWorkOrder(plan)}
            className="p-2 rounded transition-all hover: bg-white border border-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
            title="Configure Strategy"
          >
            <Settings size={12} />
          </button>
        )}
        {plan.effectiveStatus !== 'completed' && (
          <button
            onClick={() => handleSendMaterialRequest(plan)}
            disabled={sendingMaterialRequest}
            className="p-2 rounded transition-all hover: bg-white border border-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
            title="Request Materials"
          >
            {sendingMaterialRequest ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
          </button>
        )}
        {plan.effectiveStatus !== 'completed' && (
          <button
            onClick={() => handleEdit(plan)}
            className="p-2 rounded transition-all hover: bg-white border border-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
            title="Modify Strategy"
          >
            <Edit2 size={12} />
          </button>
        )}
        <button
          onClick={() => handleShowHistory(plan)}
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all hover: bg-white border border-gray-50 relative"
          title="View Request History"
        >
          <FileText size={12} />
          {mrHistory[plan.plan_id] && mrHistory[plan.plan_id].length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-xs text-white animate-in zoom-in duration-300">
              {mrHistory[plan.plan_id].length}
            </span>
          )}
        </button>
        {plan.effectiveStatus !== 'completed' && (
          <button
            onClick={() => handleDelete(plan.plan_id)}
            className="p-2 rounded transition-all hover: bg-white border border-gray-50 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
            title="Discard Plan"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2">
      <div className="max-w-5xl mx-auto space-y-2">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {/* <div className="bg-slate-900 p-2 rounded  shadow  shadow-slate-200">
                <Layers className="w-6 h-6 text-white" />
              </div> */}
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
              className="flex items-center gap-2 p-2  bg-slate-900 text-white rounded hover:bg-slate-800 shadow  shadow-slate-200 hover: hover:-translate-y-1 transition-all text-xs   "
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
          {/* Dashboard Tabs */}
          {/* <div className="flex border-b border-gray-100 bg-white">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-8 py-4 text-xs font-bold transition-all relative ${
                activeTab === 'all' 
                  ? 'text-indigo-600 bg-indigo-50/30' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Plans
              {activeTab === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('pending_mr')}
              className={`px-8 py-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                activeTab === 'pending_mr' 
                  ? 'text-amber-600 bg-amber-50/30' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              Pending Requests
              {Object.values(mrHistory).flat().filter(mr => mr.status !== 'completed').length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  activeTab === 'pending_mr' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {Object.values(mrHistory).flat().filter(mr => mr.status !== 'completed').length}
                </span>
              )}
              {activeTab === 'pending_mr' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600" />
              )}
            </button>
          </div> */}

          {/* Dashboard Control Bar */}
          <div className="p-2 border-b border-gray-50 bg-gray-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4 ">
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
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={12} />
                <input
                  type="text"
                  placeholder="Search Production Plannings..."
                  className="pl-12 pr-6 py-2 bg-white border border-gray-100 rounded  text-xs    focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full md:w-80"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="p-2 bg-white border border-gray-100 rounded  text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all  ">
                <Filter size={15} />
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
              <DataTable 
                columns={columns} 
                data={filteredPlans} 
                renderActions={renderActions}
                pageSize={10}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-5 text-center bg-gray-50/30">
                <div className="w-12 h-12 rounded bg-white shadow  shadow-gray-200/50 flex items-center justify-center text-gray-200 mb-6 border border-gray-100">
                  <Layers size={12} />
                </div>
                <h3 className="text-md  text-gray-900 ">No Strategic Plans Found</h3>
                <p className="text-xs  text-gray-400 mt-2  leading-relaxed">
                  Start by creating a new production plan to coordinate your manufacturing operations.
                </p>
                <button
                  onClick={() => navigate('/manufacturing/production-planning/new')}
                  className="mt-2 flex items-center gap-2 p-2  bg-slate-900 text-white rounded hover:bg-slate-800 shadow  shadow-slate-200 transition-all text-xs   "
                >
                  <Plus size={18} />
                  Initiate First Strategy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showWorkOrderModal && workOrderData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded   max-w-4xl w-full  overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[30pc] overflow-hidden">
            <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded   shadow-indigo-200">
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
                        {(() => {
                          const sortedOps = [...(workOrderData.operations || [])].sort((a, b) => {
                            // Sort by depth descending (deepest sub-assemblies first)
                            if ((b.depth || 0) !== (a.depth || 0)) {
                              return (b.depth || 0) - (a.depth || 0);
                            }
                            // Keep relative order within same BOM
                            return 0;
                          });
                          
                          return sortedOps.map((op, idx) => {
                            const isNewGroup = idx === 0 || sortedOps[idx - 1].bom_id !== op.bom_id;
                            return (
                              <React.Fragment key={idx}>
                                {isNewGroup && (
                                  <tr className="bg-slate-50/50">
                                    <td colSpan="3" className="p-2 py-1 text-[10px]  text-slate-500  tracking-wider flex items-center gap-2">
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
                          });
                        })()}
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
                                <p className="text-xs  text-gray-900 ">{item.item_code}</p>
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
          <div className="bg-white rounded  max-w-4xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[30pc] overflow-hidden">
            <div className="p-2 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                {/* <div className="bg-blue-600 p-2 rounded  shadow-blue-200 transition-colors">
                  <Send className="w-6 h-6 text-white" />
                </div> */}
                <div>
                  <h2 className="text-lg text-gray-900 ">Material Request</h2>
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
                <X size={15} />
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

             

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between border-b border-gray-100">
                  <div className="flex gap-4">
                    <button
                      onClick={() => setMrActiveTab('pending')}
                      className={`pb-2 text-xs font-bold transition-all relative ${
                        mrActiveTab === 'pending'
                          ? 'text-rose-600'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Pending Request
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px]">
                        {materialRequestData.items?.filter(item => {
                          const stock = materialStockData[item.item_code];
                          return !stock || !stock.isAvailable;
                        }).length || 0}
                      </span>
                      {mrActiveTab === 'pending' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600" />
                      )}
                    </button>
                    <button
                      onClick={() => setMrActiveTab('complete')}
                      className={`pb-2 text-xs font-bold transition-all relative ${
                        mrActiveTab === 'complete'
                          ? 'text-emerald-600'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Complete Request
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px]">
                        {materialRequestData.items?.filter(item => {
                          const stock = materialStockData[item.item_code];
                          return stock && stock.isAvailable;
                        }).length || 0}
                      </span>
                      {mrActiveTab === 'complete' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full transition-colors" />
                    <h3 className="text-xs text-gray-900 ">
                      Items to Request ({materialRequestData.items?.length || 0})
                    </h3>
                  </div>
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
                      {materialRequestData.items?.filter(item => {
                        const stock = materialStockData[item.item_code];
                        if (mrActiveTab === 'pending') return !stock || !stock.isAvailable;
                        return stock && stock.isAvailable;
                      }).map((item, idx) => {
                        const stock = materialStockData[item.item_code]
                        const isLow = stock && !stock.isAvailable
                        return (
                          <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${isLow ? 'bg-rose-50/50' : ''}`}>
                            <td className="p-2 ">
                              <p className="text-xs text-gray-900 ">{item.item_name} ({item.item_code})</p>
                              
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
                                  <div className=" text-emerald-600  text-[9px]  inline-flex items-center gap-1">
                                    <Check size={12} /> Fully Stocked
                                  </div>
                                ) : stock.hasStock ? (
                                  <div className=" text-amber-600  text-[9px]  inline-flex items-center gap-1">
                                    <AlertCircle size={12} /> Partial Stock
                                  </div>
                                ) : (
                                  <div className=" text-rose-600  text-[9px]  inline-flex items-center gap-1">
                                    <X size={12} /> Zero Stock
                                  </div>
                                )
                              ) : (
                                <div className="w-5 h-5 rounded-full  animate-spin mx-auto" />
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

            <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
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
          <div className="bg-white rounded  max-w-4xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-2 rounded  shadow-indigo-200">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl   text-gray-900">Request Traceability History</h2>
                  <p className="text-xs font-medium text-gray-400  mt-0.5 flex items-center gap-2">
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

            <div className="flex-1 overflow-y-auto p-4">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader size={48} className="text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm text-gray-500">Retrieving historical data from vault...</p>
                </div>
              ) : mrHistory[selectedPlanForHistory.plan_id] && mrHistory[selectedPlanForHistory.plan_id].length > 0 ? (
                <div className="space-y-8">
                  {/* Pending/Active Requests Section */}
                  {mrHistory[selectedPlanForHistory.plan_id].some(mr => mr.status !== 'completed') && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-amber-600 px-1">
                        <Clock size={16} className="animate-pulse" />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Active Requests</h3>
                        <div className="flex-1 h-px bg-amber-100/50 ml-2" />
                        <span className="text-[10px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-bold">
                          {mrHistory[selectedPlanForHistory.plan_id].filter(mr => mr.status !== 'completed').length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {mrHistory[selectedPlanForHistory.plan_id]
                          .filter(mr => mr.status !== 'completed')
                          .map((mr, idx) => renderHistoryCard(mr, idx))}
                      </div>
                    </div>
                  )}

                  {/* Completed History Section */}
                  {mrHistory[selectedPlanForHistory.plan_id].some(mr => mr.status === 'completed') && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-emerald-600 px-1">
                        <CheckCircle2 size={16} />
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Completed Archive</h3>
                        <div className="flex-1 h-px bg-emerald-100/50 ml-2" />
                        <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 font-bold">
                          {mrHistory[selectedPlanForHistory.plan_id].filter(mr => mr.status === 'completed').length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {mrHistory[selectedPlanForHistory.plan_id]
                          .filter(mr => mr.status === 'completed')
                          .map((mr, idx) => renderHistoryCard(mr, idx))}
                      </div>
                    </div>
                  )}
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

            <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false)
                  setSelectedPlanForHistory(null)
                }}
                className="p-2  bg-slate-900 text-white text-xs   rounded hover:bg-slate-800 transition-all  shadow-slate-200"
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
   
