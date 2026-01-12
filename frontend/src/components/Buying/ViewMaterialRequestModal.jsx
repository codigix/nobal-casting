import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Badge from '../Badge/Badge'
import Alert from '../Alert/Alert'
import { Printer, CheckCircle, XCircle, Trash2, FileText, ShoppingCart } from 'lucide-react'

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
      console.log('Warehouse selected, re-checking stock for warehouse:', selectedSourceWarehouse)
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
      const warehouseObj = warehouse ? warehouses.find(w => w.id == warehouse) : null
      const warehouseName = warehouseObj ? `${warehouseObj.warehouse_name} (${warehouseObj.warehouse_code})` : 'All Warehouses'
      
      console.log(`Checking stock for warehouse ID: ${warehouse}, Name: ${warehouseName}`)
      const stockInfo = {}
      
      for (const item of requestData.items || []) {
        try {
          const params = {
            itemCode: item.item_code
          }
          
          if (warehouse) {
            params.warehouseId = warehouse
          }
          
          console.log(`Fetching stock for ${item.item_code} with params:`, params)
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
          
          console.log(`Stock check: ${item.item_code} - Found: ${itemExists}, Available: ${availableQty}, Required: ${requestedQty}, Has required: ${hasRequiredQty}`)
          
          stockInfo[item.item_code] = {
            available: availableQty,
            requested: requestedQty,
            isAvailable: itemExists && availableQty > 0 && hasRequiredQty,
            warehouse: warehouseName,
            foundInInventory: itemExists,
            error: !itemExists
          }
        } catch (err) {
          console.error(`Stock check error for ${item.item_code}:`, err)
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
      console.log('Stock availability check complete:', stockInfo)
    } catch (err) {
      console.error('Error checking stock:', err)
    } finally {
      setCheckingStock(false)
    }
  }

  const getAvailableItems = () => {
    return Object.entries(stockData)
      .filter(([_, stock]) => stock.foundInInventory && stock.isAvailable)
      .map(([itemCode]) => itemCode)
  }

  const getUnavailableItems = () => {
    return request?.items?.filter(item => {
      const stock = stockData[item.item_code]
      return stock && (!stock.foundInInventory || stock.available === 0)
    }) || []
  }

  const handleApprove = async () => {
    try {
      const isTransferOrIssue = ['material_transfer', 'material_issue'].includes(request?.purpose)
      const finalWarehouse = selectedSourceWarehouse || request?.source_warehouse
      
      if (isTransferOrIssue && !finalWarehouse) {
        setError('Source warehouse is required for Material Transfer/Issue. Please select one.')
        return
      }

      const availableItems = getAvailableItems()
      const unavailableItems = getUnavailableItems()

      if (availableItems.length === 0 && unavailableItems.length > 0) {
        setError(`No available items to approve. All items (${unavailableItems.map(i => i.item_code).join(', ')}) need to be sent for purchase.`)
        return
      }

      const payload = { 
        approvedBy: 'User'
      }
      
      if (isTransferOrIssue) {
        payload.source_warehouse = finalWarehouse
      }
      
      console.log('Approving MR with payload:', payload)
      const response = await api.patch(`/material-requests/${mrId}/approve`, payload)
      
      const successMsg = response.data.message || 'Material request approved successfully'
      setSuccess(successMsg)
      setSelectedSourceWarehouse('')
      fetchRequestDetails()
      if (onStatusChange) onStatusChange()
      
      window.dispatchEvent(new CustomEvent('materialRequestApproved', { detail: { mrId, items: request.items } }))
      
      const showDuration = unavailableItems.length > 0 ? 6000 : 4000
      setTimeout(() => setSuccess(null), showDuration)
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
    if (window.confirm('Are you sure you want to delete this material request?')) {
      try {
        await api.delete(`/material-requests/${mrId}`)
        onClose()
        if (onStatusChange) onStatusChange()
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete')
      }
    }
  }

  const handleSendForPurchase = async () => {
    try {
      const unavailableItems = getUnavailableItems()
      if (unavailableItems.length === 0) {
        setError('No unavailable items to purchase')
        return
      }

      setLoading(true)

      const itemsToSend = unavailableItems.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: item.qty,
        uom: item.uom || 'Kg',
        rate: parseFloat(item.rate || 0)
      }))

      const grnData = {
        material_request_id: mrId,
        items: itemsToSend,
        department: request?.department,
        purpose: 'purchase',
        notes: `GRN created from Material Request: ${request.series_no} - Unavailable items for purchase`
      }

      const response = await api.post('/stock/grns/from-material-request', grnData)

      if (response.data.success || response.status === 201) {
        setSuccess(`GRN request created successfully for ${unavailableItems.length} unavailable item(s). Redirecting to Purchase Receipts...`)
        
        setTimeout(() => {
          window.location.href = '/inventory/purchase-receipts'
        }, 2000)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create GRN request'
      setError(errorMsg)
      console.error('Send for purchase error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGRN = async () => {
    try {
      setLoading(true)
      
      if (request?.items?.length === 0) {
        setError('No items in this material request')
        return
      }

      const itemsForGRN = request.items.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        qty: parseFloat(item.qty || 0),
        uom: item.uom || 'Kg',
        rate: parseFloat(item.rate || 0)
      }))

      const grnData = {
        material_request_id: mrId,
        items: itemsForGRN,
        department: request?.department,
        purpose: request?.purpose,
        notes: `GRN created from Material Request: ${request.series_no}`
      }

      const response = await api.post('/stock/grns/from-material-request', grnData)
      
      if (response.data.success || response.status === 201) {
        setSuccess(`GRN created successfully. Items added to inventory.`)
        fetchRequestDetails()
        if (onStatusChange) onStatusChange()
        
        setTimeout(() => {
          window.location.href = '/inventory/grn-management'
        }, 2000)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create GRN'
      setError(errorMsg)
      console.error('Create GRN error:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',
      approved: 'success',
      converted: 'secondary',
      cancelled: 'danger'
    }
    return colors[status] || 'secondary'
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Material Request: ${mrId || ''}`} size="xl">
      <div className="p-1">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600 mt-4">Loading details...</p>
          </div>
        ) : error && !request ? (
          <Alert type="danger">{error}</Alert>
        ) : request ? (
          <>
            {error && <Alert type="danger" className="mb-4">{error}</Alert>}
            {success && <Alert type="success" className="mb-4">{success}</Alert>}

            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <Badge color={getStatusColor(request.status)} size="lg">
                  {request.status.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-500">
                  Created on {new Date(request.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex gap-2 items-center flex-wrap">
                {request.status === 'draft' && (
                  <>
                    {['material_transfer', 'material_issue'].includes(request?.purpose) && (
                      <select
                        value={selectedSourceWarehouse || request?.source_warehouse || ''}
                        onChange={(e) => {
                          setSelectedSourceWarehouse(e.target.value)
                          if (request?.items) {
                            checkStockAvailability({ ...request, source_warehouse: e.target.value })
                          }
                        }}
                        className={`px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                          !selectedSourceWarehouse && !request?.source_warehouse 
                            ? 'border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:ring-primary-500'
                        }`}
                        required
                      >
                        <option value="">Select Source Warehouse *</option>
                        {warehouses && warehouses.length > 0 ? (
                          warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.warehouse_name} ({w.warehouse_code})
                            </option>
                          ))
                        ) : (
                          <option disabled>No warehouses available</option>
                        )}
                      </select>
                    )}
                    {getUnavailableItems().length > 0 && (
                      <Button 
                        onClick={handleSendForPurchase}
                        variant="warning"
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={loading}
                        title={`Send ${getUnavailableItems().length} unavailable item(s) for purchase`}
                      >
                        <ShoppingCart size={16} /> Send for Purchase
                      </Button>
                    )}
                    {getAvailableItems().length > 0 && (
                      <Button 
                        onClick={handleApprove}
                        variant="success"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle size={16} /> Approve
                      </Button>
                    )}
                    <Button 
                      onClick={handleReject}
                      variant="danger"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <XCircle size={16} /> Reject
                    </Button>
                    <Button 
                      onClick={handleDelete}
                      variant="outline-danger"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  </>
                )}
                {request.status === 'approved' && request?.purpose === 'purchase' && (
                  <>
                    <Button 
                      onClick={handleCreateGRN}
                      variant="success"
                      size="sm"
                      className="flex items-center gap-2"
                      disabled={loading}
                      title="Create Goods Received Note to add items to inventory"
                    >
                      <FileText size={16} /> Create GRN
                    </Button>
                    <Button 
                      onClick={handleDelete}
                      variant="outline-danger"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Request Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Series No:</span>
                    <span className="text-sm font-medium">{request.series_no || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Requested By:</span>
                    <span className="text-sm font-medium">{request.requested_by_name || request.requested_by_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Department:</span>
                    <span className="text-sm font-medium">{request.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Purpose:</span>
                    <span className="text-sm font-medium capitalize">{request.purpose.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Logistics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Required By:</span>
                    <span className="text-sm font-medium">
                      {request.required_by_date ? new Date(request.required_by_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Target Warehouse:</span>
                    <span className="text-sm font-medium">{request.target_warehouse || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Source Warehouse:</span>
                    <span className="text-sm font-medium">{request.source_warehouse || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Transition Date:</span>
                    <span className="text-sm font-medium">
                      {request.transition_date ? new Date(request.transition_date).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {checkingStock && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                Checking stock availability...
              </div>
            )}

            {getAvailableItems().length > 0 && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
                <h4 className="text-sm font-bold text-green-800 mb-2">✓ Available Items</h4>
                <p className="text-sm text-green-700">{getAvailableItems().length} item(s) are available in stock and can be approved.</p>
              </div>
            )}

            {getUnavailableItems().length > 0 && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded">
                <h4 className="text-sm font-bold text-orange-800 mb-2">⚠ Unavailable Items</h4>
                <p className="text-sm text-orange-700">{getUnavailableItems().length} item(s) are not available in stock. Click "Send for Purchase" to create a Purchase Receipt.</p>
              </div>
            )}

            <div className="mb-6">
              <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Items & Stock Status</h4>
              <div className=" border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-xs">
                    <tr>
                      <th className="px-4 py-3">Item Code</th>
                      <th className="px-4 py-3">Item Name</th>
                      <th className="px-4 py-3 text-right">Requested Qty</th>
                      <th className="px-4 py-3 text-right">Available Qty</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-center">UOM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {request.items && request.items.length > 0 ? (
                      request.items.map((item, index) => {
                        const stock = stockData[item.item_code]
                        return (
                          <tr key={index} className={`hover:bg-gray-50 ${stock?.error ? 'bg-orange-50' : stock?.isAvailable === false ? 'bg-red-50' : stock?.isAvailable ? 'bg-green-50' : ''}`}>
                            <td className="px-4 py-3 font-medium text-gray-900">{item.item_code}</td>
                            <td className="px-4 py-3 text-gray-600">{item.item_name || '-'}</td>
                            <td className="px-4 py-3 text-right font-medium">{item.qty}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              {stock ? stock.available.toFixed(2) : 'Checking...'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {stock ? (
                                stock.isAvailable ? (
                                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">✓ AVAILABLE ({stock.available.toFixed(0)})</span>
                                ) : !stock.foundInInventory ? (
                                  <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">✗ NOT AVAILABLE</span>
                                ) : (
                                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">⚠ INSUFFICIENT ({stock.available.toFixed(2)} of {stock.requested})</span>
                                )
                              ) : (
                                <span className="text-gray-400 text-xs">Checking...</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500">{item.uom}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                          No items found in this request
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {request.items_notes && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <h4 className="text-sm font-bold text-yellow-800 mb-2">Notes</h4>
                <p className="text-sm text-yellow-800 whitespace-pre-wrap">{request.items_notes}</p>
              </div>
            )}
            
            <div className="mt-8 flex justify-end">
               <Button onClick={onClose} variant="secondary">Close</Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}
