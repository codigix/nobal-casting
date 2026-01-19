import { useState, useEffect } from 'react'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'

import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Package, ArrowRight, Info, Save, MapPin, Zap, Plus, Grid3x3, List } from 'lucide-react'
import Modal from '../../components/Modal/Modal'
import InventoryApprovalModal from '../../components/Buying/InventoryApprovalModal'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'

export default function PurchaseReceipts() {
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [showInventoryApprovalModal, setShowInventoryApprovalModal] = useState(false)
  const [showStorageForm, setShowStorageForm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalItems, setApprovalItems] = useState([])
  const [stats, setStats] = useState({ pending: 0, inspecting: 0, awaiting: 0, approved: 0 })
  const [warehouses, setWarehouses] = useState([])
  const [storageData, setStorageData] = useState({})
  const [viewMode, setViewMode] = useState('table')
  const [currentTab, setCurrentTab] = useState('grn-requests')
  const [availableItems, setAvailableItems] = useState([])
  const [availableItemsLoading, setAvailableItemsLoading] = useState(false)

  useEffect(() => {
    fetchGRNRequests()
  }, [])

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchGRNRequests = async () => {
    try {
      setLoading(true)
      const response = await api.get('/grn-requests')
      const data = response.data.data || []
      setGrns(data)

      setStats({
        pending: data.filter(g => g.status === 'pending').length,
        inspecting: data.filter(g => g.status === 'inspecting').length,
        awaiting: data.filter(g => g.status === 'awaiting_inventory_approval').length,
        approved: data.filter(g => g.status === 'approved').length
      })

      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch GRN requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      const warehouseData = response.data.data || []
      console.log('Warehouses loaded:', warehouseData)
      setWarehouses(warehouseData)
    } catch (err) {
      console.error('Error fetching warehouses:', err)
      setError('Failed to load warehouses. Please refresh the page.')
    }
  }

  const fetchAvailableItems = async () => {
    try {
      setAvailableItemsLoading(true)
      const response = await api.get('/stock/stock-balance')
      const items = response.data.data || []
      const filteredItems = items.filter(item => item.current_qty > 0)
      setAvailableItems(filteredItems)
      setError(null)
    } catch (err) {
      console.error('Error fetching available items:', err)
      setError('Failed to load available items')
    } finally {
      setAvailableItemsLoading(false)
    }
  }

  const handleStartInspection = async (grnId) => {
    try {
      const response = await api.post(`/grn-requests/${grnId}/start-inspection`)
      setSuccess('Inspection started')
      fetchGRNRequests()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start inspection')
    }
  }

  const handleApprove = async (grnId) => {
    if (approvalItems.length === 0) {
      setError('Please add accepted items')
      return
    }

    try {
      const response = await api.post(`/grn-requests/${grnId}/approve`, {
        approvedItems: approvalItems
      })
      setSuccess('GRN approved and stock entry created')
      setShowApprovalForm(false)
      setApprovalItems([])
      fetchGRNRequests()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve GRN')
    }
  }

  const handleReject = async (grnId) => {
    if (!rejectionReason.trim()) {
      setError('Please provide rejection reason')
      return
    }

    try {
      await api.post(`/grn-requests/${grnId}/reject`, {
        reason: rejectionReason
      })
      setSuccess('GRN rejected')
      setShowDetails(false)
      setRejectionReason('')
      fetchGRNRequests()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject GRN')
    }
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: <Clock size={16} />,
        label: 'Pending',
        colorClass: 'text-amber-500'
      },
      inspecting: {
        icon: <AlertCircle size={16} />,
        label: 'Inspecting',
        colorClass: 'text-blue-500'
      },
      awaiting_inventory_approval: {
        icon: <AlertCircle size={16} />,
        label: 'Awaiting Approval',
        colorClass: 'text-purple-500'
      },
      approved: {
        icon: <CheckCircle size={16} />,
        label: 'Approved',
        colorClass: 'text-emerald-500'
      },
      rejected: {
        icon: <XCircle size={16} />,
        label: 'Rejected',
        colorClass: 'text-red-500'
      },
      sent_back: {
        icon: <ArrowRight size={16} />,
        label: 'Sent Back',
        colorClass: 'text-amber-500'
      }
    }
    
    const config = statusConfig[status] || { icon: null, label: status, colorClass: 'text-neutral-500' }
    
    return (
      <div className={`flex items-center gap-2 ${config.colorClass} font-medium`}>
        <span className="flex items-center">
          {config.icon}
        </span>
        <span className='text-xs'>{config.label}</span>
      </div>
    )
  }

  const handleApprovalItemChange = (itemId, field, value) => {
    setApprovalItems(prev => {
      const existing = prev.find(item => item.id === itemId)
      const numValue = ['accepted_qty', 'rejected_qty'].includes(field) ? Number(value) || 0 : value

      if (existing) {
        return prev.map(item =>
          item.id === itemId ? { ...item, [field]: numValue } : item
        )
      } else {
        return [...prev, { id: itemId, [field]: numValue }]
      }
    })
  }

  const handleStorageDataChange = (itemId, field, value) => {
    const finalValue = field === 'valuation_rate' ? (Number(value) || 0) : value

    setStorageData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: finalValue
      }
    }))
  }

  const handleApproveAndStore = async () => {
    if (approvalItems.length === 0) {
      setError('Please add accepted items')
      return
    }

    const warehouseAssigned = approvalItems.every(item => {
      return storageData[item.id]?.warehouse_id
    })

    if (!warehouseAssigned) {
      setError('Please assign warehouse location for all items')
      return
    }

    setLoading(true)
    try {
      const approvedItemsWithStorage = approvalItems.map(item => {
        const warehouseId = storageData[item.id]?.warehouse_id
        const selectedWarehouse = warehouses.find(w => String(w.id) === String(warehouseId))

        if (!selectedWarehouse) {
          throw new Error(`Warehouse not found for item ${item.id}`)
        }

        const processedItem = {
          id: item.id,
          accepted_qty: Number(item.accepted_qty) || 0,
          rejected_qty: Number(item.rejected_qty) || 0,
          qc_status: item.qc_status || 'pass',
          bin_rack: storageData[item.id]?.bin_rack || '',
          batch_no: storageData[item.id]?.batch_no || '',
          valuation_rate: Number(storageData[item.id]?.valuation_rate) || 0,
          warehouse_name: selectedWarehouse.warehouse_name
        }

        console.log(`Item ${processedItem.id}:`, {
          accepted: processedItem.accepted_qty,
          rejected: processedItem.rejected_qty,
          total: processedItem.accepted_qty + processedItem.rejected_qty,
          warehouse: processedItem.warehouse_name
        })

        return processedItem
      })

      console.log('Sending approval data:', approvedItemsWithStorage)

      const response = await api.post(`/grn-requests/${selectedGRN.id}/inventory-approve`, {
        approvedItems: approvedItemsWithStorage
      })
      setSuccess('✓ GRN approved! Materials stored in inventory. Stock entries created automatically.')
      setShowApprovalForm(false)
      setShowStorageForm(false)
      setApprovalItems([])
      setStorageData({})
      fetchGRNRequests()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Approval error:', err)
      setError(err.response?.data?.error || err.message || 'Failed to approve and store GRN')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { key: 'grn_no', label: 'GRN Number' },
    { key: 'po_no', label: 'PO Number' },
    { key: 'supplier_name', label: 'Supplier' },
    {
      key: 'receipt_date',
      label: 'Receipt Date',
      render: (value, row) => row && row.receipt_date ? new Date(row.receipt_date).toLocaleDateString() : '-'
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => row ? getStatusBadge(row.status) : '-'
    },
    {
      key: 'total_items',
      label: 'Items'
    },
    {
      key: 'total_accepted',
      label: 'Accepted Qty'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        if (!row) return null
        return (
          <div className="flex gap-1.5">
            <button
              type="button"
              className="btn-primary py-1 px-2 text-xs"
              onClick={() => {
                setSelectedGRN(row)
                setShowDetails(true)
              }}
              title="View GRN details"
            >
              <Eye size={14} className="inline mr-1" /> View
            </button>
            {row.status === 'awaiting_inventory_approval' && (
              <button
                type="button"
                className="btn-success p-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium z-10"
                onClick={() => {
                  setSelectedGRN(row)
                  if (row.items && row.items.length > 0) {
                    setApprovalItems(row.items.map(item => ({
                      id: item.id,
                      accepted_qty: Number(item.received_qty) || 0,
                      rejected_qty: 0,
                      qc_status: 'pass'
                    })))
                  }
                  setShowApprovalForm(true)
                }}
                title="Inspect, approve, and store items"
              >
                <CheckCircle size={14} className="inline mr-1" /> Approve
              </button>
            )}
            {(row.status === 'approved' || row.status === 'accepted') && (
              <button
                className="btn-success py-1 px-2 text-xs bg-emerald-500 text-white rounded font-medium cursor-not-allowed opacity-70"
                disabled
                title="Item stored in warehouse"
              >
                <CheckCircle size={14} className="inline mr-1" /> ✓ Stored
              </button>
            )}
            {row.status === 'rejected' && (
              <button
                className="btn-danger py-1 px-2 text-xs bg-red-500 text-white rounded font-medium cursor-not-allowed opacity-70"
                disabled
                title="GRN was rejected"
              >
                <XCircle size={14} className="inline mr-1" /> Rejected
              </button>
            )}
          </div>
        )
      }
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
            <Package size={32} className="text-neutral-400 dark:text-neutral-600 animate-pulse" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Loading GRN requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Goods Receipt Notes</h1>
          <p className="text-xs text-gray-500 mt-1">Manage incoming material receipts and inventory approvals</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xs transition-all text-xs"
        >
          <Plus size={18} />
          Create GRN
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-6 border-b border-gray-200">
        <button
          onClick={() => setCurrentTab('grn-requests')}
          className={`p-2 font-semibold transition-all border-b-2 ${
            currentTab === 'grn-requests'
              ? 'text-blue-600 border-blue-600 text-xs'
              : 'text-gray-600 border-transparent hover:text-gray-900 text-xs'
          }`}
        >
          GRN Requests
        </button>
        <button
          onClick={() => {
            setCurrentTab('available-items')
            fetchAvailableItems()
          }}
          className={`p-2 font-semibold transition-all border-b-2 ${
            currentTab === 'available-items'
              ? 'text-blue-600 border-blue-600 text-xs'
              : 'text-gray-600 border-transparent hover:text-gray-900 text-xs'
          }`}
        >
          Available Items
        </button>
      </div>

      {/* Metrics Grid - Only show for GRN Requests */}
      {currentTab === 'grn-requests' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pending Inspection"
            count={stats.pending}
            trend="Awaiting QC"
            bgColor="from-orange-50 to-amber-50"
          />
          <MetricCard
            title="Under Inspection"
            count={stats.inspecting}
            trend="In Progress"
            bgColor="from-blue-50 to-cyan-50"
          />
          <MetricCard
            title="Awaiting Approval"
            count={stats.awaiting}
            trend="Ready to approve"
            bgColor="from-purple-50 to-pink-50"
          />
          <MetricCard
            title="Approved & Stored"
            count={stats.approved}
            trend="Successfully stored"
            bgColor="from-emerald-50 to-green-50"
          />
        </div>
        )}

        {/* Alerts */}
        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

      {/* Main Content Card */}
      {currentTab === 'grn-requests' && (
        <div className="">
          {/* Card Header */}
          <div className="p-2 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">GRN Requests</h2>
            {grns.length > 0 && (
              <div className="flex gap-2 bg-white rounded-xs p-1 border border-gray-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Table view"
                >
                  <List size={18} />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2.5 rounded-md transition-all ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Card view"
                >
                  <Grid3x3 size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Card Body */}
          <div>
            {grns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Package size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No GRN Requests Found</h3>
                <p className="text-gray-500 text-center max-w-md">
                  No GRN requests available
                </p>
              </div>
            ) : viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <DataTable columns={columns} data={grns} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grns.map(grn => (
                  <div key={grn.id} className="bg-white dark:bg-neutral-800 rounded-xs border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-2 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-start justify-between text-xs">
                        <div>
                          <h3 className="font-semibold text-neutral-900 dark:text-white text-md">{grn.grn_no}</h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{grn.supplier_name}</p>
                        </div>
                        {getStatusBadge(grn.status)}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">PO Number</p>
                          <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{grn.po_no}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Receipt Date</p>
                          <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{new Date(grn.receipt_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Total Items</p>
                          <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{grn.items?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Accepted Qty</p>
                          <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{grn.total_accepted || 0}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          className="flex-1 btn-primary text-xs py-2 px-3"
                          onClick={() => {
                            setSelectedGRN(grn)
                            setShowDetails(true)
                          }}
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} /> View
                        </button>
                        {grn.status === 'awaiting_inventory_approval' && (
                          <button
                            type="button"
                            className="flex-1 btn-success text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium"
                            onClick={() => {
                              setSelectedGRN(grn)
                              if (grn.items && grn.items.length > 0) {
                                setApprovalItems(grn.items.map(item => ({
                                  id: item.id,
                                  accepted_qty: Number(item.received_qty) || 0,
                                  rejected_qty: 0,
                                  qc_status: 'pass'
                                })))
                              }
                              setShowApprovalForm(true)
                            }}
                          >
                            <CheckCircle size={14} className="inline mr-1" /> Approve
                          </button>
                        )}
                        {(grn.status === 'approved' || grn.status === 'accepted') && (
                          <button
                            className="flex-1 btn-success text-xs py-2 px-3 bg-emerald-500 text-white rounded font-medium cursor-not-allowed opacity-70"
                            disabled
                          >
                            <CheckCircle size={14} className="inline mr-1" /> ✓ Stored
                          </button>
                        )}
                        {grn.status === 'rejected' && (
                          <button
                            className="flex-1 btn-danger text-xs py-2 px-3 bg-red-500 text-white rounded font-medium cursor-not-allowed opacity-70"
                            disabled
                          >
                            <XCircle size={14} className="inline mr-1" /> Rejected
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

      {/* Available Items Tab */}
      {currentTab === 'available-items' && (
        <div className="">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">Available Items in Stock</h2>
          </div>

          {/* Card Body */}
          <div>
            {availableItemsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Package size={32} className="text-gray-300 mb-4 animate-pulse" />
                <p className="text-gray-500 font-medium">Loading available items...</p>
              </div>
            ) : availableItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <Package size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Available Items</h3>
                <p className="text-gray-500 text-center max-w-md">
                  All items are currently out of stock
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-2 text-xs">Item Code</th>
                      <th className="p-2 text-xs">Item Name</th>
                      <th className="p-2 text-xs text-right">Available Qty</th>
                      <th className="p-2 text-xs text-right">Reserved Qty</th>
                      <th className="p-2 text-xs text-right">Rate</th>
                      <th className="p-2 text-xs text-right">Total Value</th>
                      <th className="p-2 text-xs">Warehouse</th>
                      <th className="p-2 text-xs">Last Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableItems.map((item, idx) => {
                      const totalValue = (parseFloat(item.current_qty) || 0) * (parseFloat(item.valuation_rate) || 0)
                      return (
                        <tr key={idx} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-2 font-medium text-gray-900 whitespace-nowrap">{item.item_code}</td>
                          <td className="p-3 text-gray-700">{item.item_name}</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              {(parseFloat(item.current_qty) || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-right text-gray-700">{(parseFloat(item.reserved_qty) || 0).toFixed(2)}</td>
                          <td className="p-3 text-right text-gray-700">{(parseFloat(item.valuation_rate) || 0).toFixed(2)}</td>
                          <td className="p-3 text-right font-medium text-gray-900">{totalValue.toFixed(2)}</td>
                          <td className="p-3 text-gray-700">{item.warehouse_name || '-'}</td>
                          <td className="p-3 text-gray-700 text-xs">
                            {item.last_receipt_date ? new Date(item.last_receipt_date).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        isOpen={showDetails && !showApprovalForm}
        onClose={() => {
          setShowDetails(false)
          setRejectionReason('')
        }}
        title={selectedGRN ? `GRN Details - ${selectedGRN.grn_no}` : 'GRN Details'}
        size="2xl"
        footer={
          <div className="flex gap-2 justify-between w-full">
            {selectedGRN?.status === 'inspecting' && (
              <Button
                variant="danger"
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    setError('Please provide rejection reason')
                    return
                  }
                  handleReject(selectedGRN.id)
                }}
              >
                <XCircle size={16} className="inline mr-1" />
                Reject GRN
              </Button>
            )}
            <div className="ml-auto">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDetails(false)
                  setRejectionReason('')
                }}
              >
                Close
              </Button>
            </div>
          </div>
        }
      >
        {selectedGRN && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-xs p-2 mb-5 flex gap-3 items-start">
              <div>
                <p className="m-0 text-xs text-green-900 font-medium">
                  <strong>GRN Status:</strong> {getStatusBadge(selectedGRN.status)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 mb-6">
              <div>
                <p className="mb-2 text-xs text-gray-500 font-semibold uppercase">PO Number</p>
                <p className="m-0 text-base font-semibold text-gray-900">{selectedGRN.po_no}</p>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 font-semibold uppercase">Supplier</p>
                <p className="m-0 text-base font-semibold text-gray-900">{selectedGRN.supplier_name}</p>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 font-semibold uppercase">Receipt Date</p>
                <p className="m-0 text-base font-semibold text-gray-900">
                  {new Date(selectedGRN.receipt_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 font-semibold uppercase">Total Items</p>
                <p className="m-0 text-base font-semibold text-gray-900">{(selectedGRN.items || []).length}</p>
              </div>
            </div>

            {selectedGRN.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xs p-3 mb-5">
                <p className="m-0 text-xs text-red-900 font-medium">
                  <strong>Rejection Reason:</strong> {selectedGRN.rejection_reason}
                </p>
              </div>
            )}

            <div className="mb-5">
              <h4 className="mb-3 text-xs font-semibold  text-gray-900">
                📦 Received Items
              </h4>
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="w-full border-collapse border border-gray-200 text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Item Code</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Item Name</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Qty</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedGRN.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="px-3 py-2.5 text-gray-900 font-medium">{item.item_code}</td>
                        <td className="px-3 py-2.5 text-gray-900">{item.item_name}</td>
                        <td className="px-3 py-2.5 text-right text-gray-900 font-semibold">{item.received_qty}</td>
                        <td className="px-3 py-2.5 text-gray-600">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedGRN.status === 'inspecting' && (
              <div>
                <h4 className="mt-5 mb-3 text-xs font-semibold  text-gray-900">
                  Rejection Reason (if rejecting)
                </h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  className="w-full min-h-20 px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showApprovalForm}
        onClose={() => {
          setShowApprovalForm(false)
          setShowStorageForm(false)
          setApprovalItems([])
          setStorageData({})
        }}
        title={selectedGRN ? `Approve & Store - ${selectedGRN.grn_no}` : 'Approve & Store GRN'}
        size="3xl"
        footer={
          <div className="flex gap-2 justify-end w-full">
            <Button
              variant="secondary"
              onClick={() => {
                setShowApprovalForm(false)
                setShowStorageForm(false)
                setApprovalItems([])
                setStorageData({})
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleApproveAndStore}
              disabled={loading}
            >
              {loading ? 'Processing...' : (<><Save size={16} className="inline mr-1" />Approve & Store</>)}
            </Button>
          </div>
        }
      >
        {selectedGRN && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-xs p-3 mb-5 text-xs text-amber-900">
              <p className="m-0 font-medium">
                ⚠️ <strong>Note:</strong> Review quantities and assign warehouse locations for each item.
              </p>
            </div>

            <div className="mb-5">
              <h4 className="mb-3 text-xs font-semibold  text-gray-900">
                Items for Approval
              </h4>
              <div className="">
                <table className="w-full border-collapse border border-gray-200 text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-30">Item</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-24">Received Qty</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-24">Accept Qty</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-24">Reject Qty</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-gray-700 min-w-20">QC Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedGRN.items || []).map((item, idx) => {
                      const approvalItem = approvalItems.find(ai => ai.id === item.id) || {}
                      return (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className=" px-6 py-6 text-gray-900 font-medium">
                            <div>{item.item_code}</div>
                            <div className="text-xs text-gray-600">{item.item_name}</div>
                          </td>
                          <td className=" px-6 py-6 text-center text-gray-900 font-semibold">
                            {item.received_qty}
                          </td>
                          <td className=" px-6 py-6">
                            <input
                              type="number"
                              min="0"
                              max={item.received_qty}
                              value={approvalItem.accepted_qty || 0}
                              onChange={(e) => handleApprovalItemChange(item.id, 'accepted_qty', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className=" px-6 py-6">
                            <input
                              type="number"
                              min="0"
                              max={item.received_qty}
                              value={approvalItem.rejected_qty || 0}
                              onChange={(e) => handleApprovalItemChange(item.id, 'rejected_qty', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className=" px-6 py-6 text-center">
                            <select
                              value={approvalItem.qc_status || 'pass'}
                              onChange={(e) => handleApprovalItemChange(item.id, 'qc_status', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="pass">Pass</option>
                              <option value="fail">Fail</option>
                              <option value="rework">Rework</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="mb-3 text-xs font-semibold  text-gray-900">
                Storage Information
              </h4>
              <div className="">
                <table className="w-full border-collapse border border-gray-200 text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-30">Item</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-36">Warehouse</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-24">Bin/Rack</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 min-w-24">Batch No</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-700 min-w-24">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedGRN.items || []).map((item, idx) => {
                      const storage = storageData[item.id] || {}
                      const hasWarehouse = storage.warehouse_id
                      return (
                        <tr key={idx} className="border-b border-gray-200">
                          <td className=" px-6 py-6 text-gray-900 font-medium">
                            <div>{item.item_code}</div>
                            <div className="text-xs text-gray-600">{item.item_name}</div>
                          </td>
                          <td className=" px-6 py-6">
                            <select
                              value={storage.warehouse_id || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'warehouse_id', e.target.value)}
                              className={`w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${hasWarehouse ? 'bg-green-50' : 'bg-white'}`}
                            >
                              <option value="">Select Warehouse {warehouses.length === 0 ? '(Loading...)' : ''}</option>
                              {warehouses.length === 0 ? (
                                <option disabled>No warehouses available</option>
                              ) : (
                                warehouses.map(wh => (
                                  <option key={wh.id} value={wh.id}>{wh.warehouse_name}</option>
                                ))
                              )}
                            </select>
                          </td>
                          <td className=" px-6 py-6">
                            <input
                              type="text"
                              placeholder="e.g., A-12-3"
                              value={storage.bin_rack || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'bin_rack', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className=" px-6 py-6">
                            <input
                              type="text"
                              placeholder={item.batch_no || 'Batch #'}
                              value={storage.batch_no || item.batch_no || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'batch_no', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className=" px-6 py-6 text-right">
                            <input
                              type="number"
                              placeholder="0.00"
                              value={storage.valuation_rate || ''}
                              onChange={(e) => handleStorageDataChange(item.id, 'valuation_rate', e.target.value)}
                              min="0"
                              step="0.01"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xs p-3 text-xs text-amber-900">
              <p className="m-0 font-medium">
                ⚠️ <strong>Required Fields:</strong> Warehouse location must be assigned for all accepted items before approval.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {showInventoryApprovalModal && selectedGRN && (
        <InventoryApprovalModal
          grn={selectedGRN}
          onClose={() => {
            setShowInventoryApprovalModal(false)
            setSelectedGRN(null)
          }}
          onSuccess={(updatedGRN) => {
            setSuccess('GRN approved and items stored in inventory')
            setShowInventoryApprovalModal(false)
            setSelectedGRN(null)
            fetchGRNRequests()
            setTimeout(() => setSuccess(null), 3000)
          }}
        />
      )}

      <CreateGRNModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newGRN) => {
          setSuccess('✓ GRN Request created successfully!')
          setShowCreateModal(false)
          fetchGRNRequests()
          setTimeout(() => setSuccess(null), 3000)
        }}
      />
    </div>
  )
}

function MetricCard({ title, count, icon, trend, bgColor }) {
  const colorMap = {
    'from-orange-50 to-amber-50': 'from-orange-50 to-amber-100 text-orange-700',
    'from-blue-50 to-cyan-50': 'from-blue-50 to-cyan-100 text-blue-700',
    'from-purple-50 to-pink-50': 'from-purple-50 to-pink-100 text-purple-700',
    'from-emerald-50 to-green-50': 'from-emerald-50 to-green-100 text-emerald-700'
  }
  
  return (
    <div className={`bg-gradient-to-br ${colorMap[bgColor] || bgColor} p-4 rounded-sm border border-opacity-30 shadow-sm hover:shadow-md transition-all`}>
      <p className="text-xs font-medium text-gray-600 mb-2">{title}</p>
      <p className="text-xl font-bold">{count}</p>
      {trend && (
        <p className="text-xs text-gray-600 mt-1">{trend}</p>
      )}
    </div>
  )
}
