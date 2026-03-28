import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/AuthContext'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Badge from '../Badge/Badge'
import Alert from '../Alert/Alert'
import { 
  Printer, CheckCircle, XCircle, Trash2, FileText, 
  ShoppingCart, ArrowRightLeft, Calendar, User, 
  Warehouse, Package, ClipboardList, Info, AlertTriangle,
  RefreshCw, CheckCheck, Activity, Building2, ArrowRight
} from 'lucide-react'

export default function ViewMaterialRequestModal({ isOpen, onClose, mrId, onStatusChange }) {
  const { user } = useAuth()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [stockData, setStockData] = useState({})
  const [itemWarehouses, setItemWarehouses] = useState({})
  const [checkingStock, setCheckingStock] = useState(false)
  const [customQuantities, setCustomQuantities] = useState({})

  const [selectedSourceWarehouse, setSelectedSourceWarehouse] = useState(null)
  const [selectedTargetWarehouse, setSelectedTargetWarehouse] = useState(null)

  useEffect(() => {
    if (isOpen && mrId) {
      const initializeModal = async () => {
        await fetchRequestDetails()
        fetchWarehouses()
      }
      initializeModal()
    } else {
      setRequest(null)
      setError(null)
      setSuccess(null)
      setStockData({})
      setItemWarehouses({})
      setSelectedSourceWarehouse(null)
      setSelectedTargetWarehouse(null)
    }
  }, [isOpen, mrId])


  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchRequestDetails = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/material-requests/${mrId}`)
      setRequest(response.data.data)
      setSelectedSourceWarehouse(response.data.data?.source_warehouse)
      setSelectedTargetWarehouse(response.data.data?.target_warehouse)
      setError(null)
      if (response.data.data?.items) {
        await checkStockAvailability(response.data.data)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material request details')
    } finally {
      setLoading(false)
    }
  }

  const checkStockAvailability = async (requestData) => {
    try {
      setCheckingStock(true)
      const stockInfo = {}
      const suggestedWarehouses = { ...itemWarehouses }
      
      for (const item of requestData.items || []) {
        try {
          // If item-specific warehouse is selected, use it. 
          // Otherwise check all warehouses to find best match
          const itemSpecificWh = itemWarehouses[item.item_code]
          let useGlobalWh = selectedSourceWarehouse || requestData?.source_warehouse
          
          // Ignore "All Warehouses" or empty strings as global warehouse
          if (useGlobalWh === 'All Warehouses' || useGlobalWh === 'warehouse' || !useGlobalWh) {
            useGlobalWh = null
          }
          
          // ALWAYS fetch all warehouses to get a breakdown for filtering dropdowns
          const params = {
            itemCode: item.item_code
          }
          
          // Note: We don't restrict by warehouseId in params here because we want the full breakdown 
          // to populate the "best warehouse" and the filtered dropdown list.
          // Instead, we filter the results locally.
          
          const res = await api.get(`/stock/stock-balance`, { params })
          const balance = res.data.data || res.data
          
          let totalAvailableQty = 0
          let itemExists = false
          let stockBreakdown = []
          let bestWarehouse = null
          let maxStock = -1
          
          if (Array.isArray(balance)) {
            itemExists = balance.length > 0
            
            // Map the balance to breakdown
            balance.forEach(b => {
              const qty = parseFloat(b.current_qty || b.available_qty || b.qty || 0)
              const whId = b.warehouse_id || b.id
              
              if (qty > 0) {
                stockBreakdown.push({
                  warehouse: b.warehouse_name || b.warehouse_code || b.warehouse_id,
                  id: whId,
                  qty: qty
                })
                
                // Track best warehouse (highest stock)
                if (qty > maxStock) {
                  maxStock = qty
                  bestWarehouse = whId
                }
              }
            })
            
            // Calculate available qty based on selection
            const activeWhId = itemSpecificWh || useGlobalWh
            let currentSelectionQty = 0
            if (activeWhId) {
              const activeWhBalance = balance.find(b => (b.warehouse_id || b.id) == activeWhId)
              currentSelectionQty = activeWhBalance ? parseFloat(activeWhBalance.current_qty || activeWhBalance.available_qty || activeWhBalance.qty || 0) : 0
            } else {
              currentSelectionQty = balance.reduce((sum, b) => sum + parseFloat(b.current_qty || b.available_qty || b.qty || 0), 0)
            }
            
            // Auto-suggest best warehouse if:
            // 1. Nothing is selected yet (neither item-specific nor global)
            // 2. OR the current selection has 0 stock but we found stock elsewhere
            if (bestWarehouse && (
                 (!itemSpecificWh && !useGlobalWh) || 
                 (currentSelectionQty <= 0 && maxStock > 0)
            )) {
              suggestedWarehouses[item.item_code] = bestWarehouse
              totalAvailableQty = maxStock
            } else {
              totalAvailableQty = currentSelectionQty
            }
          } else if (balance && typeof balance === 'object') {
            itemExists = true
            const qty = parseFloat(balance.current_qty || balance.available_qty || balance.qty || 0)
            totalAvailableQty = qty
            const whId = balance.warehouse_id || balance.id
            if (qty > 0) {
              stockBreakdown.push({
                warehouse: balance.warehouse_name || balance.warehouse_code || balance.warehouse_id,
                id: whId,
                qty: qty
              })
              bestWarehouse = whId
            }
          }
          
          const totalQty = parseFloat(item.qty || 0)
          const requestedQtyLimit = parseFloat(item.requested_qty || item.qty || 0)
          const issuedQty = parseFloat(item.issued_qty || 0)
          const pendingQty = requestedQtyLimit - issuedQty
          
          // Determine which warehouse name to show - use suggested/active one
          let warehouseDisplayName = 'All Warehouses'
          const finalActiveWhId = suggestedWarehouses[item.item_code] || useGlobalWh
          
          if (finalActiveWhId) {
            const whObj = warehouses.find(w => w.id == finalActiveWhId || w.warehouse_id == finalActiveWhId)
            warehouseDisplayName = whObj ? whObj.warehouse_name : `WH: ${finalActiveWhId}`
          }
          
          stockInfo[item.item_code] = {
            available: totalAvailableQty,
            totalRequested: totalQty,
            requested: requestedQtyLimit,
            pending: pendingQty,
            isAvailable: itemExists && totalAvailableQty > 0 && (pendingQty <= 0 || totalAvailableQty >= pendingQty),
            hasStock: itemExists && totalAvailableQty > 0,
            hasStockAnywhere: stockBreakdown.length > 0,
            isPartial: itemExists && totalAvailableQty > 0 && totalAvailableQty < pendingQty,
            warehouse: warehouseDisplayName,
            breakdown: stockBreakdown,
            foundInInventory: itemExists,
            error: !itemExists
          }
        } catch (err) {
          stockInfo[item.item_code] = {
            available: 0,
            requested: parseFloat(item.qty || 0),
            pending: parseFloat(item.qty || 0) - parseFloat(item.issued_qty || 0),
            isAvailable: false,
            warehouse: 'Unknown',
            foundInInventory: false,
            error: true
          }
        }
      }
      
      setStockData(stockInfo)
      setItemWarehouses(suggestedWarehouses)
    } catch (err) {
      console.error('Error checking stock:', err)
    } finally {
      setCheckingStock(false)
    }
  }

  const handleSend = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.patch(`/material-requests/${mrId}/submit`)
      setSuccess(response.data.message || 'Material request sent for approval')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setLoading(true)
      setError(null)
      const isTransferOrIssue = ['material_transfer', 'material_issue'].includes(request?.purpose?.toLowerCase())
      
      // Identify available items to process if it's a stock transaction
      let itemsToProcess = []
      if (isTransferOrIssue) {
        // Build a list of { item_code, warehouse_id, qty } for items to release
        request?.items?.forEach(item => {
          const stock = stockData[item.item_code]
          const requestedQtyLimit = Number(item.requested_qty || item.qty || 0)
          const pendingQty = requestedQtyLimit - Number(item.issued_qty || 0)
          const whId = itemWarehouses[item.item_code] || selectedSourceWarehouse || request?.source_warehouse
          
          // Get custom qty if set, otherwise use pendingQty
          const releaseQty = customQuantities[item.item_code] !== undefined ? customQuantities[item.item_code] : pendingQty
          
          if (stock && stock.hasStock && releaseQty > 0 && whId) {
            itemsToProcess.push({
              item_code: item.item_code,
              warehouse_id: whId,
              qty: releaseQty
            })
          }
        })

        if (itemsToProcess.length === 0) {
          setError('No items with sufficient stock and valid quantities selected to release.')
          setLoading(false)
          return
        }
        
        if (request?.purpose?.toLowerCase() === 'material_transfer' && !selectedTargetWarehouse && !request?.target_warehouse) {
          setError('Target warehouse is required for transfer requests.')
          setLoading(false)
          return
        }
      }

      const payload = { 
        approvedBy: user?.id || user?.user_id || 'User',
        itemsToProcess
      }
      
      // If we have a global warehouse, send it as fallback
      if (isTransferOrIssue && (selectedSourceWarehouse || request?.source_warehouse)) {
        payload.source_warehouse = selectedSourceWarehouse || request?.source_warehouse
      }
      
      if (isTransferOrIssue && request?.purpose?.toLowerCase() === 'material_transfer' && (selectedTargetWarehouse || request?.target_warehouse)) {
        payload.target_warehouse = selectedTargetWarehouse || request?.target_warehouse
      }
      
      const response = await api.patch(`/material-requests/${mrId}/approve`, payload)
      setSuccess(response.data.message || 'Material request processed successfully')
      
      window.dispatchEvent(new CustomEvent('materialRequestApproved', { detail: { mrId } }))
      
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve')
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseSingleItem = async (itemCode) => {
    try {
      setLoading(true)
      setError(null)
      const whId = itemWarehouses[itemCode] || selectedSourceWarehouse || request?.source_warehouse
      
      if (!whId) {
        setError('Warehouse is required for release. Please select one for this item.')
        setLoading(false)
        return
      }

      // Get quantity to release
      const item = request?.items?.find(i => i.item_code === itemCode)
      const requestedQtyLimit = Number(item?.requested_qty || item?.qty || 0)
      const pendingQty = requestedQtyLimit - Number(item?.issued_qty || 0)
      const releaseQty = customQuantities[itemCode] !== undefined ? customQuantities[itemCode] : pendingQty

      if (releaseQty <= 0) {
        setError('Release quantity must be greater than 0.')
        setLoading(false)
        return
      }

      const payload = { 
        approvedBy: user?.id || user?.user_id || 'User',
        itemsToProcess: [{
          item_code: itemCode,
          warehouse_id: whId,
          qty: releaseQty
        }]
      }
      
      const response = await api.patch(`/material-requests/${mrId}/approve`, payload)
      setSuccess(`Released ${itemCode} successfully`)
      
      window.dispatchEvent(new CustomEvent('materialRequestApproved', { detail: { mrId, itemCode } }))
      
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to release item')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Please enter rejection reason:')
    if (reason === null) return

    try {
      setLoading(true)
      setError(null)
      await api.patch(`/material-requests/${mrId}/reject`, { reason })
      setSuccess('Material request rejected')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this material request? This action cannot be undone.')) return

    try {
      setLoading(true)
      setError(null)
      await api.delete(`/material-requests/${mrId}`)
      setSuccess('Material request deleted successfully')
      setTimeout(() => {
        onClose()
        if (onStatusChange) onStatusChange()
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete material request')
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePO = async () => {
    try {
      setLoading(true)
      setError(null)

      // send only total required items to purchase from vendor buy items for whole production
      const itemsToOrder = request?.items?.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: Number(item.qty), // Total required for whole production
        uom: item.uom || 'Kg',
        rate: parseFloat(item.rate || 0)
      })).filter(i => i.qty > 0) || []

      if (itemsToOrder.length === 0) {
        setError('No items found in this material request to purchase')
        setLoading(false)
        return
      }

      const poData = {
        mr_id: mrId,
        items: itemsToOrder,
        department: request?.department,
        purpose: request?.purpose
      }

      const response = await api.post('/purchase-orders/from-material-request', poData)
      setSuccess(`Purchase Order ${response.data.data.po_no} created successfully. Redirecting...`)
      setTimeout(() => window.location.href = '/buying/purchase-orders', 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create purchase order')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const colors = {
      draft: 'warning',
      approved: 'success',
      partial: 'info',
      completed: 'success',
      converted: 'info',
      cancelled: 'danger',
      rejected: 'danger'
    }
    return <Badge color={colors[status] || 'secondary'} className=" text-xs p-1">{status}</Badge>
  }

  const isTransferOrIssue = ['material_issue', 'material_transfer'].includes(request?.purpose?.toLowerCase())
  const anyAvailable = request?.items?.some(item => {
    const stock = stockData[item.item_code]
    const requestedQtyLimit = Number(item.requested_qty || item.qty || 0)
    const pendingQty = requestedQtyLimit - Number(item.issued_qty || 0)
    return stock && stock.hasStock && (pendingQty > 0 || request?.status === 'completed')
  })
  const anyUnavailable = request?.items?.some(item => {
    const pendingQty = Number(item.qty) - Number(item.issued_qty || 0)
    return pendingQty > 0
  })

  if (!request && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading Request Details..." size="7xl">
        <div className="py-24 text-center">
          <RefreshCw size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 ">Fetching details from the stock ledger...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Material Request: ${request?.finished_goods_name || request?.series_no || 'Details'}`} size="7xl">
      <div className="flex flex-col h-[78vh] bg-slate-50/50">
        <div className="flex-1 overflow-y-auto space-y-3">
          {error && <Alert type="danger" className="  border-2 mb-4">{error}</Alert>}
          {success && <Alert type="success" className="  border-2 mb-4">{success}</Alert>}
          {!!request?.requires_manual_review && (
            <Alert type="warning" className="border-2 mb-4  flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>This request requires manual review: {request.review_reason}</span>
            </Alert>
          )}

          {/* New Header Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-2">
            <div className="bg-white p-2  rounded  border border-slate-200   flex items-center gap-2">
              <div className="w-6 h-6 rounded  bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ClipboardList size={15} />
              </div>
              <div>
                <p className="text-[10px]  text-slate-400 ">Finished Goods</p>
                <p className="text-xs  text-indigo-600" title={request?.finished_goods_name || request?.project_name || 'Internal'}>
                  {request?.finished_goods_name || request?.project_name || 'Internal'}
                </p>
              </div>
            </div>

            <div className="bg-white p-2 rounded  border border-slate-200   flex items-center gap-2">
              <div className="w-6 h-6 rounded  bg-amber-50 flex items-center justify-center text-amber-600">
                <Activity size={15} />
              </div>
              <div>
                <p className="text-[10px]  text-slate-400 ">Status</p>
                <div className="mt-0.5">{getStatusBadge(request?.status)}</div>
              </div>
            </div>

            <div className="bg-white p-2 rounded  border border-slate-200   flex items-center gap-2">
              <div className="w-6 h-6 rounded  bg-blue-50 flex items-center justify-center text-blue-600">
                <ArrowRightLeft size={15} />
              </div>
              <div>
                <p className="text-[10px]  text-slate-400 ">Purpose</p>
                <p className="text-xs  text-slate-700 capitalize">{request?.purpose?.replace('_', ' ')}</p>
              </div>
            </div>

            {isTransferOrIssue && (
              <>
                <div className="bg-white p-2 rounded border border-slate-200 flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Warehouse size={15} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400">Source Store</p>
                    <select 
                      value={selectedSourceWarehouse || ''} 
                      onChange={(e) => {
                        setSelectedSourceWarehouse(e.target.value)
                        setTimeout(() => checkStockAvailability(request), 0)
                      }}
                      className="text-xs text-slate-700 bg-transparent border-none outline-none w-full p-0 h-4"
                    >
                      <option value="">{request?.source_warehouse_name || 'Select Store...'}</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.warehouse_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {request?.purpose?.toLowerCase() === 'material_transfer' && (
                  <div className="bg-white p-2 rounded border border-slate-200 flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Truck size={15} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-slate-400">Target Store</p>
                      <select 
                        value={selectedTargetWarehouse || ''} 
                        onChange={(e) => setSelectedTargetWarehouse(e.target.value)}
                        className="text-xs text-slate-700 bg-transparent border-none outline-none w-full p-0 h-4"
                      >
                        <option value="">{request?.target_warehouse_name || 'Select Store...'}</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.warehouse_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* <div className="bg-white p-2 rounded  border border-slate-200   flex items-center gap-2">
              <div className="w-6 h-6 rounded  bg-purple-50 flex items-center justify-center text-purple-600">
                <Building2 size={15} />
              </div>
              <div>
                <p className="text-[10px]  text-slate-400 ">Department</p>
                <p className="text-xs  text-slate-700">{request?.department}</p>
              </div>
            </div> */}

            {/* <div className="bg-white p-2 rounded  border border-slate-200   flex items-center gap-2">
              <div className="w-6 h-6 rounded  bg-emerald-50 flex items-center justify-center text-emerald-600">
                <User size={15} />
              </div>
              <div>
                <p className="text-[10px]  text-slate-400 ">Requested By</p>
                <p className="text-xs  text-slate-700">{request?.requested_by_name || 'System'}</p>
              </div>
            </div> */}

            <div className="bg-white p-2 rounded  border border-slate-200   flex items-center gap-2">
              <div className="w-6 h-6 rounded  bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ShoppingCart size={15} />
              </div>
              <div>
                <p className="text-[10px]  text-slate-400 ">Linked PO</p>
                {request?.linked_po_no ? (
                  <div className="flex flex-col">
                    <p className="text-xs  text-indigo-700">#{request.linked_po_no}</p>
                    <p className="text-xs text-indigo-500  ">{request.po_status || 'CREATED'}</p>
                  </div>
                ) : (
                  <p className="text-xs  text-slate-400 italic">None</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* Left Column: Line Items */}
            <div className="lg:col-span-2 space-y-2">
              <div className="bg-white rounded  border border-slate-200   overflow-hidden">
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 ">
                      <Package size={20} />
                    </div>
                    <div>
                      <h3 className="text-xs  text-slate-800">Requested Items</h3>
                      <p className="text-[10px] text-slate-400 ">Verify stock availability per store</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => checkStockAvailability(request)}
                      disabled={checkingStock}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-all text-[11px]  "
                    >
                      <RefreshCw size={14} className={checkingStock ? 'animate-spin' : ''} />
                      {checkingStock ? 'Updating...' : 'Refresh Stock'}
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100">
                        <th className="p-2 text-[10px]   text-slate-500 ">Item Details</th>
                        <th className="p-2 text-[10px]   text-slate-500  text-center">Total Required</th>
                        <th className="p-2 text-[10px]   text-slate-500  text-center bg-indigo-50/50">To Request</th>
                        <th className="p-2 text-[10px]   text-slate-500  text-center">Fulfillment Store</th>
                        <th className="p-2 text-[10px]   text-slate-500  text-center">Available Stock</th>
                        <th className="p-2 text-[10px]   text-slate-500  text-right">Fulfillment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {request?.items?.map((item, idx) => {
                        const stock = stockData[item.item_code]
                        const isAvailable = stock?.isAvailable
                        const issuedQty = Number(item.issued_qty || 0)
                        const totalQty = Number(item.qty || 0)
                        const requestedQty = Number(item.requested_qty || item.qty || 0)
                        const pendingQty = requestedQty - issuedQty
                        const itemWarehouse = itemWarehouses[item.item_code] || request?.source_warehouse || ''
                        
                        return (
                          <tr key={idx} className="hover:bg-indigo-50/20 transition-all group">
                            <td className="p-2 align-top">
                              <div className="flex flex-col gap-1">
                                <span className=" text-slate-800 leading-tight text-xs group-hover:text-indigo-600 transition-colors">{item.item_name}</span>
                                <div className="flex flex-col">
                                  <span className="text-[10px] w-fit bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono ">{item.item_code}</span>
                                  {item.item_group && (
                                    <span className="text-[10px] text-slate-400 "> {item.item_group}</span>
                                  )}
                                </div>
                                {issuedQty > 0 && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className="w-1 h-1 rounded bg-emerald-500 animate-pulse"></div>
                                    <p className="text-[10px]  text-emerald-600">Issued: {issuedQty} {item.uom}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-slate-600">{totalQty}</span>
                                <span className="text-[9px] text-slate-400">{item.uom}</span>
                              </div>
                            </td>
                            <td className="p-2 align-top text-center bg-indigo-50/20">
                              <div className="flex flex-col items-center gap-1">
                                {isTransferOrIssue && item.status !== 'completed' ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <input
                                      type="number"
                                      value={customQuantities[item.item_code] !== undefined ? customQuantities[item.item_code] : pendingQty}
                                      onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 0
                                        setCustomQuantities(prev => ({ ...prev, [item.item_code]: val }))
                                      }}
                                      className="w-16 p-1 text-xs font-bold text-center border-2 border-indigo-200 rounded text-indigo-700 bg-white outline-none focus:border-indigo-500 transition-all"
                                      min="0"
                                      max={pendingQty}
                                    />
                                    <span className="text-[9px] text-indigo-400">{item.uom}</span>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-xs font-bold text-indigo-700">{pendingQty}</span>
                                    <span className="text-[9px] text-indigo-400">{item.uom}</span>
                                  </>
                                )}
                                {issuedQty > 0 && (
                                  <div className="mt-1 flex flex-col items-center border-t border-indigo-100 pt-1">
                                    <p className="text-[8px] text-indigo-400 uppercase tracking-tighter">Remaining</p>
                                    <p className="text-[10px] font-bold text-indigo-600">{Math.max(0, pendingQty)} {item.uom}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-2 align-top text-center min-w-[200px]">
                              {isTransferOrIssue && item.status !== 'completed' ? (
                                stock?.hasStockAnywhere ? (
                                  <div className="space-y-1.5 relative group/select">
                                    <select
                                      value={itemWarehouse}
                                      onChange={(e) => {
                                        const newWhId = e.target.value
                                        setItemWarehouses(prev => ({ ...prev, [item.item_code]: newWhId }))
                                        setTimeout(() => checkStockAvailability(request), 0)
                                      }}
                                      className={`w-full text-[11px]  border-2 rounded bg-white outline-none transition-all appearance-none cursor-pointer ${
                                        !itemWarehouse
                                          ? 'border-amber-200 bg-amber-50/30 text-amber-700' 
                                          : 'border-slate-100 text-slate-700 hover:border-indigo-200 focus:border-indigo-500'
                                      }`}
                                    >
                                      <option value="">Choose Store...</option>
                                      {stock?.breakdown?.map(b => (
                                        <option key={b.id} value={b.id}>
                                          {b.warehouse} (Avail: {b.qty})
                                        </option>
                                      ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within/select:text-indigo-500 transition-colors">
                                      <ArrowRight size={12} />
                                    </div>
                                    {stock?.breakdown?.length > 1 && !itemWarehouses[item.item_code] && (
                                      <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-indigo-50/50 rounded-lg">
                                        <Info size={10} className="text-indigo-500" />
                                        <p className="text-[9px]  text-indigo-600  tracking-tighter">Optimization Possible</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1 py-2 px-3 bg-rose-50 border border-rose-100 rounded-xl">
                                    <div className="flex items-center gap-1.5 text-rose-600">
                                      <XCircle size={12} />
                                      <span className="text-[10px]   ">Out of Stock</span>
                                    </div>
                                    <p className="text-[9px]  text-rose-400 text-center leading-tight">Procurement required for fulfillment</p>
                                  </div>
                                )
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1.5 text-slate-500">
                                    <Warehouse size={12} />
                                    <span className="text-xs ">{stock?.warehouse || request?.source_warehouse_name || 'All Warehouses'}</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-2 align-top text-center font-mono">
                              {stock ? (
                                <div className="flex flex-col items-center gap-2">
                                  <div className={`text-xs  px-2 py-0.5 rounded-lg ${stock.available > 0 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 bg-slate-50'}`}>
                                    {stock.available} {item.uom}
                                  </div>
                                  {!itemWarehouses[item.item_code] && stock.breakdown?.length > 0 ? (
                                    <div className="flex flex-col gap-1 w-full max-w-[140px]">
                                      {stock.breakdown.slice(0, 3).map((b, i) => (
                                        <button 
                                          key={i} 
                                          onClick={() => {
                                            setItemWarehouses(prev => ({ ...prev, [item.item_code]: b.id }))
                                            setTimeout(() => checkStockAvailability(request), 0)
                                          }}
                                          className="flex items-center justify-between gap-2 px-2 py-1 bg-white border border-slate-100 hover:border-indigo-300 hover: rounded-lg transition-all text-[9px]  text-slate-500 group/btn"
                                        >
                                          <span className="truncate group-hover/btn:text-indigo-600 transition-colors">{b.warehouse}</span>
                                          <span className="text-indigo-500 bg-indigo-50 px-1 rounded">{b.qty}</span>
                                        </button>
                                      ))}
                                      {stock.breakdown.length > 3 && (
                                        <p className="text-[8px]  text-slate-400  tracking-tighter">+{stock.breakdown.length - 3} more stores</p>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                                      <Activity size={10} className="text-slate-400" />
                                      <span className="text-[9px]  text-slate-500  tracking-tighter">{stock.warehouse}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="w-12 h-4 bg-slate-50 rounded animate-pulse mx-auto"></div>
                              )}
                            </td>
                            <td className="p-2 align-top text-right">
                              <div className="flex flex-col items-end gap-2">
                                {stock ? (
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border  transition-all ${
                                    stock.isAvailable 
                                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                      : (stock.hasStock ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-700')
                                  }`}>
                                    <div className={`w-1.5 h-1.5 rounded ${stock.isAvailable ? 'bg-emerald-500' : (stock.hasStock ? 'bg-amber-500' : 'bg-rose-500')}`}></div>
                                    <span className="text-[10px]    leading-none">
                                      {stock.isAvailable ? 'Optimal' : (stock.hasStock ? 'Partial' : 'Critically Low')}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-20 h-5 bg-slate-50 rounded animate-pulse"></div>
                                )}
                                
                                {item.status && (
                                  <div className={`text-[9px]    px-2 py-0.5 rounded-md border ${
                                    item.status === 'completed' 
                                      ? 'bg-indigo-50 border-indigo-100 text-indigo-600' 
                                      : 'bg-slate-50 border-slate-200 text-slate-500'
                                  }`}>
                                    {item.status}
                                  </div>
                                )}
                                
                                {/* High-Fidelity Quick Release */}
                                {isTransferOrIssue && 
                                 ['pending', 'partial', 'approved', 'completed'].includes(request?.status) && 
                                 item.status !== 'completed' && 
                                 stock?.hasStock && (
                                  <button
                                    onClick={() => handleReleaseSingleItem(item.item_code)}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px]    transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                                  >
                                    <CheckCircle size={12} strokeWidth={3} /> Dispatch
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                         
                    
                    
                  </table>
                </div>
              </div>

             
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-2">
              {/* Approval Flow Info */}
              {request?.status === 'approved' && (
                <div className="bg-emerald-50 rounded  border border-emerald-200 overflow-hidden p-2 space-y-3">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <div className="w-8 h-8 rounded  bg-emerald-100 flex items-center justify-center">
                      <CheckCheck size={18} />
                    </div>
                    <h4 className="text-xs ">Approved Requisition</h4>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed pl-11">
                    This requisition has been reviewed and authorized. 
                    {!isTransferOrIssue ? ' It is now ready for procurement processing.' : ' Materials are being issued/transferred.'}
                  </p>
                </div>
              )}

              {/* Summary Sidebar */}
              
              {/* Print Action */}
             
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Bar */}
        <div className="p-2  border-t border-slate-200 bg-white flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)] rounded-b-xl">
          <div>
            {request?.status === 'draft' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-xs   text-rose-600 hover:bg-rose-50 rounded  transition-all group"
              >
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Remove Request</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2  text-xs   text-slate-400 hover:text-slate-600 transition-colors "
            >
              Cancel
            </button>
            
            {request?.status === 'draft' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleReject}
                  variant="outline-danger"
                  className="p-2 text-xs border-2    rounded "
                >
                  Reject
                </Button>
                <Button
                  onClick={handleSend}
                  variant="primary"
                  className="p-2  shadow-blue-600/20  text-xs rounded  flex items-center gap-2"
                >
                  Send for Approval <ArrowRight size={16} />
                </Button>
                <Button
                  onClick={handleApprove}
                  variant="success"
                  disabled={loading || (isTransferOrIssue && !anyAvailable)}
                  className="p-2   shadow-emerald-600/20  text-xs rounded  flex items-center gap-2"
                >
                  {isTransferOrIssue ? 'Release Material' : 'Authorize Request'} <CheckCircle size={16} />
                </Button>
              </div>
            )}

            {(['pending', 'partial', 'approved', 'completed'].includes(request?.status) && isTransferOrIssue) && (
              <div className="flex items-center gap-3">
                {request?.status === 'pending' && (
                  <Button
                    onClick={handleReject}
                    variant="outline-danger"
                    className="p-2 text-xs border-2    rounded "
                  >
                    Reject
                  </Button>
                )}
                <Button
                  onClick={handleApprove}
                  variant="success"
                  disabled={loading || (isTransferOrIssue && (!anyAvailable || request?.items?.every(item => Number(item.issued_qty) >= Number(item.qty))))}
                  className="p-2   shadow-emerald-600/20  text-xs rounded  flex items-center gap-2"
                >
                  {isTransferOrIssue ? 'Release Material' : 'Authorize Request'} <CheckCircle size={16} />
                </Button>
              </div>
            )}

            {((request?.status === 'approved' && request?.purpose?.toLowerCase() === 'purchase') || 
              (['draft', 'pending', 'approved', 'partial'].includes(request?.status) && anyUnavailable)) && (
              <Button
                onClick={handleCreatePO}
                variant="primary"
                disabled={loading || !!request?.linked_po_no || checkingStock}
                className="p-2   shadow-blue-600/20  text-xs rounded  flex items-center gap-2"
              >
                {checkingStock ? (
                  <>Verifying Stock... <RefreshCw size={16} className="animate-spin" /></>
                ) : (
                  <>{request?.linked_po_no ? 'PO Already Created' : 'Create Purchase Order'} <ShoppingCart size={16} /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}