import React, { useState, useEffect } from 'react'
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
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [selectedSourceWarehouse, setSelectedSourceWarehouse] = useState('')
  const [stockData, setStockData] = useState({})
  const [checkingStock, setCheckingStock] = useState(false)

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
      setSelectedSourceWarehouse('')
      setStockData({})
    }
  }, [isOpen, mrId])

  useEffect(() => {
    if (request && selectedSourceWarehouse) {
      checkStockAvailability(request)
    }
  }, [selectedSourceWarehouse])

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
      setError(null)
      setSelectedSourceWarehouse('')
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
      const warehouse = selectedSourceWarehouse || requestData?.source_warehouse
      const warehouseObj = warehouse ? warehouses.find(w => w.id == warehouse || w.warehouse_id == warehouse) : null
      const warehouseName = warehouseObj ? `${warehouseObj.warehouse_name} (${warehouseObj.warehouse_code || warehouseObj.warehouse_id})` : 'All Warehouses'
      
      const stockInfo = {}
      
      for (const item of requestData.items || []) {
        try {
          const params = {
            itemCode: item.item_code
          }
          
          if (warehouse) {
            params.warehouseId = warehouse
          }
          
          const res = await api.get(`/stock/stock-balance`, { params })
          const balance = res.data.data || res.data
          
          let availableQty = 0
          let itemExists = false
          
          if (Array.isArray(balance)) {
            itemExists = balance.length > 0
            availableQty = balance.reduce((sum, b) => {
              const qty = parseFloat(b.current_qty || b.available_qty || b.qty || 0)
              return sum + qty
            }, 0)
          } else if (balance && typeof balance === 'object') {
            itemExists = true
            availableQty = parseFloat(balance.current_qty || balance.available_qty || balance.qty || 0)
          }
          
          const requestedQty = parseFloat(item.qty || 0)
          const hasRequiredQty = availableQty >= requestedQty
          
          stockInfo[item.item_code] = {
            available: availableQty,
            requested: requestedQty,
            isAvailable: itemExists && availableQty > 0 && hasRequiredQty,
            warehouse: warehouseName,
            foundInInventory: itemExists,
            error: !itemExists
          }
        } catch (err) {
          stockInfo[item.item_code] = {
            available: 0,
            requested: parseFloat(item.qty || 0),
            isAvailable: false,
            warehouse: warehouseName,
            foundInInventory: false,
            error: true
          }
        }
      }
      
      setStockData(stockInfo)
    } catch (err) {
      console.error('Error checking stock:', err)
    } finally {
      setCheckingStock(false)
    }
  }

  const handleSend = async () => {
    try {
      setLoading(true)
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
      const isTransferOrIssue = ['material_transfer', 'material_issue'].includes(request?.purpose)
      const finalWarehouse = selectedSourceWarehouse || request?.source_warehouse
      
      if (isTransferOrIssue && !finalWarehouse) {
        setError('Source warehouse is required for Material Transfer/Issue. Please select one.')
        return
      }

      const payload = { 
        approvedBy: 'User'
      }
      
      if (isTransferOrIssue) {
        payload.source_warehouse = finalWarehouse
      }
      
      const response = await api.patch(`/material-requests/${mrId}/approve`, payload)
      setSuccess(response.data.message || 'Material request approved successfully')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async () => {
    const reason = prompt('Please enter rejection reason:')
    if (reason === null) return

    try {
      await api.patch(`/material-requests/${mrId}/reject`, { reason })
      setSuccess('Material request rejected')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this material request? This action cannot be undone.')) return

    try {
      setLoading(true)
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
      const unavailableItems = request?.items?.filter(item => {
        const stock = stockData[item.item_code]
        return stock && (!stock.foundInInventory || !stock.isAvailable)
      }) || []

      if (unavailableItems.length === 0) {
        setError('No unavailable items to purchase')
        return
      }

      const itemsToOrder = unavailableItems.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        uom: item.uom || 'Kg',
        rate: parseFloat(item.rate || 0)
      }))

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
      completed: 'success',
      converted: 'info',
      cancelled: 'danger',
      rejected: 'danger'
    }
    return <Badge color={colors[status] || 'secondary'} className=" text-xs p-2">{status}</Badge>
  }

  if (!request && loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Loading Request Details..." size="7xl">
        <div className="py-24 text-center">
          <RefreshCw size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Fetching details from the stock ledger...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Material Request: ${request?.series_no || 'Details'}`} size="7xl">
      <div className="flex flex-col h-[85vh] bg-slate-50/50">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <Alert type="danger" className="shadow-sm border-2 mb-4">{error}</Alert>}
          {success && <Alert type="success" className="shadow-sm border-2 mb-4">{success}</Alert>}

          {/* New Header Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded  border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                <div className="mt-0.5">{getStatusBadge(request?.status)}</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded  border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purpose</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">{request?.purpose?.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded  border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department</p>
                <p className="text-sm font-semibold text-slate-700">{request?.department}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded  border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <User size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Requested By</p>
                <p className="text-sm font-semibold text-slate-700">{request?.requested_by_name || 'System'}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded  border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Linked PO</p>
                {request?.linked_po_no ? (
                  <div className="flex flex-col">
                    <p className="text-sm font-semibold text-indigo-700">#{request.linked_po_no}</p>
                    <p className="text-xs text-indigo-500 uppercase font-bold">{request.po_status || 'CREATED'}</p>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-400 italic">None</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Line Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded  border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg text-slate-600">
                      <Package size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Line Items</h3>
                  </div>
                  {checkingStock && (
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase animate-pulse">
                      <RefreshCw size={12} className="animate-spin" /> Verifying Inventory...
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Item Details</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Quantity</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Stock Level</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {request?.items?.map((item, idx) => {
                        const stock = stockData[item.item_code]
                        const isAvailable = stock?.isAvailable
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900 leading-tight">{item.item_code}</p>
                              <p className="text-xs text-slate-500 mt-1">{item.item_name}</p>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {item.qty} {item.uom}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-xs">
                              {stock ? (
                                <div className="flex flex-col items-center">
                                  <span className={stock.available > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                                    {stock.available} {item.uom}
                                  </span>
                                  <span className="text-xs text-slate-400 mt-0.5">{stock.warehouse}</span>
                                </div>
                              ) : '---'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {stock ? (
                                <Badge color={isAvailable ? 'success' : 'danger'} className="text-xs px-2 py-1 uppercase tracking-wider">
                                  {isAvailable ? 'In Stock' : 'Out of Stock'}
                                </Badge>
                              ) : (
                                <span className="text-slate-300">--</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {request?.items_notes && (
                <div className="bg-white rounded  border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center gap-2 text-slate-400">
                    <FileText size={16} />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Requester's Notes</h4>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                    "{request.items_notes}"
                  </p>
                </div>
              )}
            </div>

            {/* Right Column: Sidebar */}
            <div className="space-y-6">
              {/* Source Configuration */}
              {request?.status === 'draft' && ['material_issue', 'material_transfer'].includes(request?.purpose) && (
                <div className="bg-white rounded  border border-amber-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-amber-50 bg-amber-50 flex items-center gap-2 text-amber-800">
                    <Warehouse size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Source Configuration</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fulfillment Warehouse</label>
                      <div className="relative">
                        <select
                          value={selectedSourceWarehouse || request.source_warehouse || ''}
                          onChange={(e) => setSelectedSourceWarehouse(e.target.value)}
                          className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none appearance-none transition-all"
                        >
                          <option value="">Select Warehouse...</option>
                          {warehouses.map(wh => (
                            <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <ArrowRight size={14} />
                        </div>
                      </div>
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-2">
                        <Info size={12} className="shrink-0 mt-0.5" />
                        <span>Changing the warehouse will trigger a real-time stock verification for all line items.</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Approval Flow Info */}
              {request?.status === 'approved' && (
                <div className="bg-emerald-50 rounded  border border-emerald-200 overflow-hidden p-4 space-y-3">
                  <div className="flex items-center gap-3 text-emerald-800">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCheck size={18} />
                    </div>
                    <h4 className="text-sm font-bold uppercase tracking-wider">Approved Requisition</h4>
                  </div>
                  <p className="text-xs text-emerald-700 leading-relaxed pl-11">
                    This requisition has been reviewed and authorized. 
                    {request.purpose === 'purchase' ? ' It is now ready for procurement processing.' : ' Materials are being issued/transferred.'}
                  </p>
                </div>
              )}

              {/* Summary Sidebar */}
              <div className="bg-white rounded  border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList size={14} /> Request Summary
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                  {request?.linked_po_no && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-800 flex gap-2">
                      <ShoppingCart size={14} className="shrink-0 text-blue-600" />
                      <div>
                        <strong>Linked Purchase Order:</strong>
                        <p className="mt-1 font-bold">{request.linked_po_no}</p>
                        <p className="mt-0.5">Status: <Badge color="info" className="text-[8px] uppercase">{request.po_status}</Badge></p>
                      </div>
                    </div>
                  )}
                  {['material_issue', 'material_transfer'].includes(request?.purpose) && 
                    Object.values(stockData).some(s => !s.isAvailable) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex gap-2">
                      <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                      <div>
                        <strong>Insufficient Stock:</strong> Some items are not available in the selected warehouse. Authorize Request is disabled.
                        <p className="mt-1 font-bold">Use "Create Purchase Order" to buy missing items.</p>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase">Required By</span>
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(request?.required_by_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase">Created On</span>
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(request?.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 uppercase">Items Total</span>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                      {request?.items?.length || 0} Unique Items
                    </span>
                  </div>
                </div>
              </div>

              {/* Print Action */}
              <button 
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 rounded  text-slate-600 font-bold text-xs hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print Document
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.03)] rounded-b-xl">
          <div>
            {request?.status === 'draft' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-all group"
              >
                <Trash2 size={16} className="group-hover:scale-110 transition-transform" /> 
                <span>Remove Request</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              Cancel
            </button>
            
            {request?.status === 'draft' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleReject}
                  variant="outline-danger"
                  className="p-2 text-xs border-2 uppercase font-bold tracking-wider rounded "
                >
                  Reject
                </Button>
                <Button
                  onClick={handleSend}
                  variant="primary"
                  className="p-2 shadow-lg shadow-blue-600/20  text-xs rounded  flex items-center gap-2"
                >
                  Send for Approval <ArrowRight size={16} />
                </Button>
                <Button
                  onClick={handleApprove}
                  variant="success"
                  disabled={loading || (['material_issue', 'material_transfer'].includes(request?.purpose) && Object.values(stockData).some(s => !s.isAvailable))}
                  className="p-2  shadow-lg shadow-emerald-600/20  text-xs rounded  flex items-center gap-2"
                >
                  Authorize Request <CheckCircle size={16} />
                </Button>
              </div>
            )}

            {request?.status === 'pending' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleReject}
                  variant="outline-danger"
                  className="p-2 text-xs border-2 uppercase font-bold tracking-wider rounded "
                >
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  variant="success"
                  disabled={loading || (['material_issue', 'material_transfer'].includes(request?.purpose) && Object.values(stockData).some(s => !s.isAvailable))}
                  className="p-2  shadow-lg shadow-emerald-600/20  text-xs rounded  flex items-center gap-2"
                >
                  Authorize Request <CheckCircle size={16} />
                </Button>
              </div>
            )}

            {((request?.status === 'approved' && request?.purpose === 'purchase') || 
              (request?.status === 'draft' && Object.values(stockData).some(s => !s.isAvailable))) && (
              <Button
                onClick={handleCreatePO}
                variant="primary"
                disabled={loading || !!request?.linked_po_no}
                className="p-2  shadow-lg shadow-blue-600/20  text-xs rounded  flex items-center gap-2"
              >
                {request?.linked_po_no ? 'PO Already Created' : 'Create Purchase Order'} <ShoppingCart size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}