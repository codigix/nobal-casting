import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye, Zap, Trash, X, Boxes, Factory, Check, Send, Loader } from 'lucide-react'
import { useToast } from '../../components/ToastContainer'

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
    const rawMaterials = bom.bom_raw_materials || bom.rawMaterials || []
    const consumables = bom.bom_consumables || bom.consumables || []
    
    console.log(`\n========== Processing BOM ${bomId} ==========`)
    console.log(`Found ${rawMaterials.length} raw materials and ${consumables.length} consumables`)
    console.log(`Raw Materials:`, rawMaterials)
    console.log(`Consumables:`, consumables)
    
    const allMaterials = [...rawMaterials, ...consumables]
    
    for (const material of allMaterials) {
      const itemCode = material.item_code || material.component_code
      if (!itemCode) continue
      
      const baseQty = parseFloat(material.qty) || parseFloat(material.quantity) || parseFloat(material.bom_qty) || 1
      const totalQty = baseQty * plannedQty
      
      const isSubAssembly = material.item_group === 'Sub Assemblies' || material.item_group === 'sub-assemblies'
      
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
          
          try {
            const subBomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${subBomId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (subBomRes.ok) {
              const subBomData = await subBomRes.json()
              const subBom = subBomData.data || subBomData
              const subBomMaterials = subBom.bom_raw_materials || subBom.rawMaterials || []
              console.log(`Sub-assembly BOM ${subBomId} (${itemCode}) has ${subBomMaterials.length} materials:`, subBomMaterials)
              
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
              console.log(`BOM ${subBomId} not found (status: ${subBomRes.status}), treating ${itemCode} as raw material`)
              if (allRawMaterials[itemCode]) {
                allRawMaterials[itemCode].qty += totalQty
                allRawMaterials[itemCode].quantity += totalQty
              } else {
                allRawMaterials[itemCode] = {
                  item_code: itemCode,
                  item_name: material.item_name || material.name || itemCode,
                  qty: totalQty,
                  quantity: totalQty,
                  uom: material.uom || 'pcs'
                }
              }
            }
          } catch (err) {
            console.error(`Error fetching sub-assembly BOM ${subBomId}:`, err)
            if (allRawMaterials[itemCode]) {
              allRawMaterials[itemCode].qty += totalQty
              allRawMaterials[itemCode].quantity += totalQty
            } else {
              allRawMaterials[itemCode] = {
                item_code: itemCode,
                item_name: material.item_name || material.name || itemCode,
                qty: totalQty,
                quantity: totalQty,
                uom: material.uom || 'pcs'
              }
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
              item_name: material.item_name || material.name || itemCode,
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
            item_name: material.item_name || material.name || itemCode,
            qty: totalQty,
            quantity: totalQty,
            uom: material.uom || 'pcs'
          }
        }
      }
    }
    console.log(`BOM ${bomId} processing complete, total materials: ${Object.keys(allRawMaterials).length}`)
  } catch (err) {
    console.error(`Error fetching BOM ${bomId}:`, err)
  }
  
  return allRawMaterials
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

  useEffect(() => {
    fetchPlans()
  }, [])

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
        
        const plansNeedingBom = plansData.filter(plan => 
          (!plan.fg_items || plan.fg_items.length === 0) && plan.bom_id
        )
        
        const bomResponses = await Promise.all(
          plansNeedingBom.map(plan =>
            fetch(`${import.meta.env.VITE_API_URL}/production/boms/${plan.bom_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(res => res.ok ? res.json() : null)
              .catch(err => {
                console.error(`Error fetching BOM ${plan.bom_id}:`, err)
                return null
              })
          )
        )
        
        const bomDataMap = {}
        bomResponses.forEach((bomData, idx) => {
          if (bomData) {
            const plan = plansNeedingBom[idx]
            const bom = bomData.data || bomData
            let fgItems = bom.lines || bom.bom_finished_goods || bom.finished_goods || []
            
            if (!fgItems || fgItems.length === 0) {
              if (bom.item_code) {
                fgItems = [{
                  item_code: bom.item_code,
                  item_name: bom.product_name || bom.item_code,
                  quantity: bom.quantity || 1,
                  bom_no: plan.bom_id
                }]
              }
            }
            
            bomDataMap[plan.bom_id] = fgItems
          }
        })
        
        const newBomCache = { ...bomCache }
        
        for (const plan of plansData) {
          let fgItems = plan.fg_items || plan.finished_goods || plan.bom_finished_goods || []
          
          if ((!fgItems || fgItems.length === 0) && bomDataMap[plan.bom_id]) {
            fgItems = bomDataMap[plan.bom_id]
          }
          
          if (fgItems && fgItems.length > 0) {
            const fgItem = fgItems[0]
            const itemCode = fgItem.item_code || fgItem.component_code || fgItem.item_name || ''
            const bomNo = fgItem.bom_no || plan.bom_id || ''
            const productName = bomNo && itemCode ? `${itemCode} - ${bomNo}` : (itemCode || bomNo || '')
            if (plan.bom_id) {
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
    
    const rawMatsList = bomDetails?.bom_raw_materials || bomDetails?.rawMaterials || []
    let allItems = rawMatsList.map(item => {
      const baseQty = parseFloat(item.qty) || parseFloat(item.quantity) || parseFloat(item.bom_qty) || 1
      return {
        ...item,
        qty: baseQty * plannedQty,
        quantity: baseQty * plannedQty,
        required_qty: baseQty * plannedQty
      }
    })
    
    if (allItems.length > 0) {
      const token = localStorage.getItem('token')
      allItems = await enrichRequiredItemsWithStock(allItems, token)
    }

    const subAssemblies = allItems.filter(item => item.bom_id || item.is_sub_assembly)
    const rawMaterials = allItems.filter(item => !item.bom_id && !item.is_sub_assembly)

    const woData = {
      item_code: fgItem.item_code || fgItem.component_code || '',
      item_name: fgItem.item_name || fgItem.component_description || '',
      quantity: fgItem.quantity || fgItem.qty || fgItem.planned_qty || 1,
      bom_no: fgItem.bom_no || plan.bom_id || '',
      planned_start_date: fgItem.planned_start_date || new Date().toISOString().split('T')[0],
      priority: 'Medium',
      notes: '',
      operations: bomDetails?.operations || [],
      sub_assemblies: subAssemblies,
      required_items: rawMaterials,
      production_plan_id: plan.plan_id
    }
    
    setWorkOrderData(woData)
    setShowWorkOrderModal(true)
    
    const allRequiredItems = [...subAssemblies, ...rawMaterials]
    if (allRequiredItems.length > 0) {
      checkItemsStock(allRequiredItems, setWorkOrderStockData)
    }
  }

  const handleCreateWorkOrderConfirm = () => {
    if (!workOrderData) return
    
    const params = new URLSearchParams()
    params.append('item_to_manufacture', workOrderData.item_code)
    params.append('item_name', workOrderData.item_name)
    params.append('qty_to_manufacture', workOrderData.quantity)
    params.append('bom_no', workOrderData.bom_no)
    params.append('planned_start_date', workOrderData.planned_start_date)
    params.append('production_plan_id', workOrderData.production_plan_id)
    
    setShowWorkOrderModal(false)
    setWorkOrderData(null)
    navigate(`/manufacturing/work-orders/new?${params.toString()}`)
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
        purpose: 'purchase',
        required_by_date: requiredByDate.toISOString().split('T')[0],
        target_warehouse: '',
        source_warehouse: '',
        items_notes: `Material request for Production Plan: ${plan.plan_id}\\nBOM: ${plan.bom_id}\\nItem: ${fgItem.item_code || fgItem.item_name || ''}\\nPlanned Quantity: ${plannedQty}\\nIncludes raw materials from all sub-assemblies`,
        items: requiredItems
      }

      setMaterialRequestData(mrData)
      setShowMaterialRequestModal(true)
      setSendingMaterialRequest(false)
      
      const mrItems = Object.values(allRawMaterials)
      if (mrItems.length > 0) {
        checkItemsStock(mrItems, setMaterialStockData)
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

  const filteredPlans = plans.filter(plan => 
    plan.plan_id.toLowerCase().includes(search.toLowerCase()) ||
    plan.company?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (status) => {
    const colors = {
      draft: 'text-yellow-600 bg-yellow-50',
      submitted: 'text-blue-600 bg-blue-50',
      completed: 'text-green-600 bg-green-50'
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                📊
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Production Planning</h1>
                <p className="text-xs text-gray-600 mt-0">Create and manage production plans</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/manufacturing/production-planning/new')}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-blue-400 to-blue-600 "
            >
              <Plus size={16} /> New Plan
            </button>
            <button 
              onClick={handleTruncate}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-red-400 to-red-600"
              title="Delete all production plans"
            >
              <Trash size={16} /> Truncate All
            </button>
          </div>
        </div>

        {success && (
          <div className="mb-2 p-2 pl-3 bg-green-50 border-l-4 border-green-400 rounded text-xs text-green-800 flex gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-2 p-2 pl-3 bg-red-50 border-l-4 border-red-400 rounded text-xs text-red-800 flex gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <label className="text-xs font-semibold text-gray-700 block mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search plan ID or company..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading production plans...</div>
          </div>
        ) : filteredPlans.length > 0 ? (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Plan ID</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Company</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Status</th>
                      <th className="px-3 py-2 text-center text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan, idx) => (
                      <tr key={plan.plan_id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2">
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{plan.plan_id}</div>
                            {plan.bom_id && bomCache[plan.bom_id] && (
                              <div className="text-xs text-gray-600 mt-1">{bomCache[plan.bom_id]}</div>
                            )}
                            {plan.fg_items && plan.fg_items.length > 0 && !bomCache[plan.bom_id] && (
                              <div className="text-xs text-gray-600 mt-1">
                                {plan.fg_items.map((item, idx) => {
                                  const bomNo = item.bom_no || plan.bom_id || ''
                                  const displayText = bomNo && item.item_code ? `${item.item_code} - ${bomNo}` : (item.item_code || bomNo || '')
                                  return <div key={idx}>{displayText}</div>
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{plan.company || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(plan.status)}`}>
                            {plan.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            
                            <button 
                              onClick={() => handleCreateWorkOrder(plan)}
                              title="Create Work Order"
                              className="p-1 hover:bg-green-50 rounded transition"
                            >
                              <Zap size={14} className="text-green-600" />
                            </button>
                            <button 
                              onClick={() => handleSendMaterialRequest(plan)}
                              title="Send Material Request"
                              disabled={sendingMaterialRequest}
                              className="p-1 hover:bg-purple-50 rounded transition disabled:opacity-60"
                            >
                              {sendingMaterialRequest ? (
                                <Loader size={14} className="text-purple-600 animate-spin" />
                              ) : (
                                <Send size={14} className="text-purple-600" />
                              )}
                            </button>
                            <button 
                              onClick={() => handleEdit(plan)}
                              title="Edit"
                              className="p-1 hover:bg-blue-50 rounded transition"
                            >
                              <Edit2 size={14} className="text-blue-600" />
                            </button>
                            <button 
                              onClick={() => handleDelete(plan.plan_id)}
                              title="Delete"
                              className="p-1 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 px-3 py-2 text-right text-xs text-gray-600">
              Showing {filteredPlans.length} of {plans.length} production plans
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-semibold  text-gray-900">
              {search ? 'No production plans found' : 'No production plans created yet'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {search 
                ? 'Try adjusting your search terms' 
                : 'Create your first production plan to get started'}
            </div>
          </div>
        )}

      {showWorkOrderModal && workOrderData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99] p-4">
          <div className="bg-white rounded shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 via-green-600 to-green-700 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white bg-opacity-20 rounded p-1.5">
                  <Boxes size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Create Work Order</h2>
                  <p className="text-green-100 text-xs">Review details and confirm</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWorkOrderModal(false)
                  setWorkOrderData(null)
                }}
                className="text-white hover:bg-green-500 p-1 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
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
                            <td className="px-2 py-1 font-medium text-gray-900">{op.operation_name || op.operation || op.name || '-'}</td>
                            <td className="px-2 py-1 text-gray-700">{op.workstation_type || op.workstation || op.station || '-'}</td>
                            <td className="px-2 py-1 text-right font-medium text-gray-900">{op.operation_time || op.time || op.duration || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {workOrderData.sub_assemblies && workOrderData.sub_assemblies.length > 0 && (
                <div className="rounded overflow-hidden border border-gray-200 shadow-sm">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-3 py-2 border-b border-orange-200">
                    <h3 className="font-semibold text-xs text-orange-900 flex items-center gap-2">
                      <Boxes size={14} className="text-orange-600" />
                      Sub-Assemblies ({workOrderData.sub_assemblies.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-40">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Code</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Available</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-gray-700">Status</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Warehouse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {workOrderData.sub_assemblies.map((item, idx) => {
                          const stock = workOrderStockData[item.item_code]
                          return (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition ${stock?.isAvailable === false ? 'bg-red-50' : ''}`}>
                              <td className="px-2 py-1 font-medium text-gray-900">{item.item_code}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">{item.required_qty || item.qty || item.quantity || '-'}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">
                                {stock ? stock.available.toFixed(2) : '-'}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {stock ? (
                                  stock.hasStock ? (
                                    stock.isAvailable ? (
                                      <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">✓</span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">✗</span>
                                    )
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">⚠</span>
                                  )
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-gray-700">{item.source_warehouse || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                          <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Available</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-gray-700">Status</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Warehouse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {workOrderData.required_items.map((item, idx) => {
                          const stock = workOrderStockData[item.item_code]
                          return (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition ${stock?.isAvailable === false ? 'bg-red-50' : ''}`}>
                              <td className="px-2 py-1 font-medium text-gray-900">{item.item_code}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">{item.required_qty || item.qty || item.quantity || '-'}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">
                                {stock ? stock.available.toFixed(2) : '-'}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {stock ? (
                                  stock.hasStock ? (
                                    stock.isAvailable ? (
                                      <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">✓</span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">✗</span>
                                    )
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">⚠</span>
                                  )
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-2 py-1 text-gray-700">{item.source_warehouse || '-'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                  onClick={handleCreateWorkOrderConfirm}
                  disabled={creatingWorkOrder}
                  className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded text-xs font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <Check size={14} /> {creatingWorkOrder ? 'Creating...' : 'Confirm & Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMaterialRequestModal && materialRequestData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99] p-4">
          <div className="bg-white rounded shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 via-purple-600 to-purple-700 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white bg-opacity-20 rounded p-1.5">
                  <Boxes size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">Create Material Request</h2>
                  <p className="text-purple-100 text-xs">Review and confirm material request</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMaterialRequestModal(false)
                  setMaterialRequestData(null)
                }}
                className="text-white hover:bg-purple-500 p-1 rounded transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2 border border-blue-200">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Series No</p>
                  <p className="text-xs font-bold text-gray-900 break-words">{materialRequestData.series_no}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded p-2 border border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold mb-1">Department</p>
                  <p className="text-xs font-bold text-gray-900">{materialRequestData.department}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2 border border-green-200">
                  <p className="text-xs text-green-600 font-semibold mb-1">Required By</p>
                  <p className="text-xs font-bold text-gray-900">{new Date(materialRequestData.required_by_date).toLocaleDateString()}</p>
                </div>
              </div>

              {materialRequestData.items_notes && (
                <div className="rounded overflow-hidden border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-gray-600 font-semibold mb-1">Notes</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{materialRequestData.items_notes}</p>
                </div>
              )}

              {materialRequestData.items && materialRequestData.items.length > 0 && (
                <div className="rounded overflow-hidden border border-gray-200 shadow-sm">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-3 py-2 border-b border-purple-200">
                    <h3 className="font-semibold text-xs text-purple-900 flex items-center gap-2">
                      <Boxes size={14} className="text-purple-600" />
                      Materials ({materialRequestData.items.length})
                    </h3>
                  </div>
                  {checkingStock && (
                    <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-800">
                      Checking stock availability...
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-40">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Code</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Name</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty</th>
                          <th className="px-2 py-1.5 text-left font-semibold text-gray-700">UOM</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Available</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {materialRequestData.items.map((item, idx) => {
                          const stock = materialStockData[item.item_code]
                          return (
                            <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-purple-50 transition ${stock?.isAvailable === false ? 'bg-red-50' : ''}`}>
                              <td className="px-2 py-1 font-medium text-gray-900">{item.item_code}</td>
                              <td className="px-2 py-1 text-gray-700">{item.item_name || '-'}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">{item.qty.toFixed(2)}</td>
                              <td className="px-2 py-1 text-gray-700">{item.uom}</td>
                              <td className="px-2 py-1 text-right font-medium text-gray-900">
                                {stock ? stock.available.toFixed(2) : '-'}
                              </td>
                              <td className="px-2 py-1 text-center">
                                {stock ? (
                                  stock.hasStock ? (
                                    stock.isAvailable ? (
                                      <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">✓ Available</span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-xs font-medium">✗ Insufficient</span>
                                    )
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-medium">⚠ Zero Stock</span>
                                  )
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
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

              <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowMaterialRequestModal(false)
                    setMaterialRequestData(null)
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMaterialRequestConfirm}
                  disabled={sendingMaterialRequest}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded text-xs font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  {sendingMaterialRequest ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Send Request
                    </>
                  )}
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
