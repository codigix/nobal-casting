import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Package, ArrowRight, Info, Save, MapPin, Zap } from 'lucide-react'
import Modal from '../../components/Modal/Modal'
import InventoryApprovalModal from '../../components/Buying/InventoryApprovalModal'
import './Inventory.css'

export default function GRNRequests() {
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({ status: '' })
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showApprovalForm, setShowApprovalForm] = useState(false)
  const [showInventoryApprovalModal, setShowInventoryApprovalModal] = useState(false)
  const [showStorageForm, setShowStorageForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalItems, setApprovalItems] = useState([])
  const [stats, setStats] = useState({ pending: 0, inspecting: 0, awaiting: 0, approved: 0 })
  const [warehouses, setWarehouses] = useState([])
  const [storageData, setStorageData] = useState({})

  useEffect(() => {
    fetchGRNRequests()
  }, [filters])

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchGRNRequests = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString()
      const response = await axios.get(`/api/grn-requests?${query}`)
      const data = response.data.data || []
      setGrns(data)
      
      try {
        const allResponse = await axios.get('/api/grn-requests')
        const allGrns = allResponse.data.data || []
        setStats({
          pending: allGrns.filter(g => g.status === 'pending').length,
          inspecting: allGrns.filter(g => g.status === 'inspecting').length,
          awaiting: allGrns.filter(g => g.status === 'awaiting_inventory_approval').length,
          approved: allGrns.filter(g => g.status === 'approved').length
        })
      } catch (e) {
        console.log('Could not fetch stats')
      }
      
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch GRN requests')
    } finally {
      setLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/stock/warehouses')
      const warehouseData = response.data.data || []
      console.log('Warehouses loaded:', warehouseData)
      setWarehouses(warehouseData)
    } catch (err) {
      console.error('Error fetching warehouses:', err)
      setError('Failed to load warehouses. Please refresh the page.')
    }
  }

  const handleStartInspection = async (grnId) => {
    try {
      const response = await axios.post(`/api/grn-requests/${grnId}/start-inspection`)
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
      const response = await axios.post(`/api/grn-requests/${grnId}/approve`, {
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
      await axios.post(`/api/grn-requests/${grnId}/reject`, {
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
    const colors = {
      pending: 'warning',
      inspecting: 'info',
      awaiting_inventory_approval: 'info',
      approved: 'success',
      rejected: 'danger',
      sent_back: 'warning'
    }
    const labels = {
      pending: 'Pending',
      inspecting: 'Inspecting',
      awaiting_inventory_approval: 'Awaiting Inventory Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      sent_back: 'Sent Back'
    }
    return <Badge variant={colors[status] || 'secondary'}>{labels[status] || status}</Badge>
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

      const response = await axios.post(`/api/grn-requests/${selectedGRN.id}/inventory-approve`, {
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
          <div style={{ display: 'flex', gap: '6px'}}>
            <button 
              type="button"
              className="btn-primary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => {
                setSelectedGRN(row)
                setShowDetails(true)
              }}
              title="View GRN details"
            >
              <Eye size={14} style={{ marginRight: '4px' }} /> View
            </button>
            {row.status === 'awaiting_inventory_approval' && (
            <button 
              type="button"
              className="btn-success" 
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#059669', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', zIndex: 10 }}
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
              <CheckCircle size={14} style={{ marginRight: '4px' }} /> Approve & Store
            </button>
          )}
          {(row.status === 'approved' || row.status === 'accepted') && (
            <button 
              className="btn-success" 
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981', border: 'none', color: 'white', borderRadius: '4px', cursor: 'not-allowed', fontWeight: '500' }}
              disabled
              title="Item stored in warehouse"
            >
              <CheckCircle size={14} style={{ marginRight: '4px' }} /> ✓ Stored
            </button>
          )}
          {row.status === 'rejected' && (
            <button 
              className="btn-danger" 
              style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'not-allowed', fontWeight: '500' }}
              disabled
              title="GRN was rejected"
            >
              <XCircle size={14} style={{ marginRight: '4px' }} /> Rejected
            </button>
          )}
            </div>
        )
      }
    }
  ]

  if (loading) {
    return <div className="inventory-container"><p>Loading GRN requests...</p></div>
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <Package size={18} style={{ display: 'inline', marginRight: '6px' }} />
          GRN Requests
        </h1>
      </div>

      <div className="inventory-stats" style={{ marginBottom: '12px' }}>
        <StatCard title="Pending" count={stats.pending} color="#f59e0b" icon={<Clock size={16} />} />
        <StatCard title="Inspecting" count={stats.inspecting} color="#3b82f6" icon={<Clock size={16} />} />
        <StatCard title="Await Approv" count={stats.awaiting} color="#d946ef" icon={<AlertCircle size={16} />} />
        <StatCard title="Approved" count={stats.approved} color="#10b981" icon={<CheckCircle size={16} />} />
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <Card title="GRN Requests">
        <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={filters.status} 
            onChange={(e) => setFilters({ status: e.target.value })}
            style={{
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '3px',
              fontSize: '12px',
            }}
          >
            <option value="">All Status</option>
            <option value="pending">⏳ Pending - Awaiting Inspection</option>
            <option value="inspecting">🔍 Inspecting - QC In Progress</option>
            <option value="awaiting_inventory_approval">⭐ Awaiting Inventory Approval</option>
            <option value="approved">✅ Approved & Stored</option>
            <option value="rejected">❌ Rejected</option>
            <option value="sent_back">↩️ Sent Back</option>
          </select>
        </div>

        {grns.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px',
            color: '#666'
          }}>
            <Package size={40} style={{ margin: '0 auto 12px', color: '#cbd5e1' }} />
            <p style={{ margin: 0, fontSize: '16px' }}>
              {filters.status === 'awaiting_inventory_approval' 
                ? 'No GRN requests awaiting approval. All items are stored!' 
                : 'No GRN requests found with selected status'}
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={grns} />
        )}
      </Card>

      <Modal
        isOpen={showDetails && !showApprovalForm}
        onClose={() => {
          setShowDetails(false)
          setRejectionReason('')
        }}
        title={selectedGRN ? `GRN Details - ${selectedGRN.grn_no}` : 'GRN Details'}
        size="2xl"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', width: '100%' }}>
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
                <XCircle size={16} style={{ marginRight: '6px' }} />
                Reject GRN
              </Button>
            )}
            <div style={{ marginLeft: 'auto' }}>
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
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '13px', color: '#166534', fontWeight: 500 }}>
                  <strong>GRN Status:</strong> {getStatusBadge(selectedGRN.status)}
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>PO Number</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>{selectedGRN.po_no}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>Supplier</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>{selectedGRN.supplier_name}</p>
              </div>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>Receipt Date</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                  {new Date(selectedGRN.receipt_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666', fontWeight: 600, textTransform: 'uppercase' }}>Total Items</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>{(selectedGRN.items || []).length}</p>
              </div>
            </div>

            {selectedGRN.rejection_reason && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#991b1b', fontWeight: 500 }}>
                  <strong>Rejection Reason:</strong> {selectedGRN.rejection_reason}
                </p>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                📦 Received Items
              </h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item Code</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item Name</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Received Qty</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedGRN.items || []).map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#1f2937' }}>{item.item_code}</td>
                        <td style={{ padding: '10px', color: '#4b5563' }}>{item.item_name}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 500, color: '#059669' }}>{item.received_qty}</td>
                        <td style={{ padding: '10px', textAlign: 'center', color: '#6b7280' }}>{item.uom || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedGRN.status === 'inspecting' && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '8px',
                padding: '12px',
                marginTop: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
                  <strong>Rejection Note:</strong> Enter reason below if rejecting this GRN
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  style={{
                    width: '100%',
                    minHeight: '70px',
                    padding: '10px',
                    marginTop: '10px',
                    borderRadius: '6px',
                    border: '1px solid #fcd34d',
                    fontFamily: 'Arial',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showApprovalForm && !showStorageForm}
        onClose={() => {
          setShowApprovalForm(false)
          setApprovalItems([])
        }}
        title={selectedGRN ? `📋 Material Inspection & Approval - ${selectedGRN.grn_no}` : 'Material Inspection'}
        size="3xl"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowApprovalForm(false)
                setApprovalItems([])
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="success" 
              onClick={() => {
                if (approvalItems.length === 0) {
                  setError('Please set quantities for items')
                  return
                }
                setShowStorageForm(true)
              }}
            >
              <ArrowRight size={16} style={{ marginRight: '6px' }} />
              Next: Storage Details
            </Button>
          </div>
        }
      >
        <div>
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '16px' }}>✓</div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#166534', fontWeight: 500 }}>
                <strong>Inspection Step 1 of 2:</strong> Set accepted and rejected quantities for each item. Mark QC status (Pass/Fail/Hold).
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item Code</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item Name</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Received</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Accepted</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Rejected</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>QC Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedGRN?.items || []).map(item => {
                  const approval = approvalItems.find(a => a.id === item.id) || {}
                  const totalQty = (parseFloat(approval.accepted_qty) || 0) + (parseFloat(approval.rejected_qty) || 0)
                  const isComplete = totalQty === item.received_qty
                  
                  return (
                    <tr key={item.id} style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: isComplete ? '#f0fdf4' : 'white'
                    }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#1f2937' }}>{item.item_code}</td>
                      <td style={{ padding: '12px', color: '#4b5563' }}>{item.item_name}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 500, color: '#1f2937' }}>{item.received_qty}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={approval.accepted_qty || ''}
                          onChange={(e) => handleApprovalItemChange(item.id, 'accepted_qty', e.target.value)}
                          min="0"
                          max={item.received_qty}
                          placeholder="0"
                          style={{
                            width: '70px',
                            padding: '6px',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          value={approval.rejected_qty || ''}
                          onChange={(e) => handleApprovalItemChange(item.id, 'rejected_qty', e.target.value)}
                          min="0"
                          max={item.received_qty}
                          placeholder="0"
                          style={{
                            width: '70px',
                            padding: '6px',
                            textAlign: 'center',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <select
                          value={approval.qc_status || 'pass'}
                          onChange={(e) => handleApprovalItemChange(item.id, 'qc_status', e.target.value)}
                          style={{
                            padding: '6px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="pass">✓ Pass</option>
                          <option value="fail">✗ Fail</option>
                          <option value="hold">⚠ On Hold</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '16px',
            fontSize: '13px',
            color: '#92400e'
          }}>
            <p style={{ margin: 0, fontWeight: 500 }}>
              💡 <strong>Tip:</strong> Accepted + Rejected quantities must equal Received quantity for each item.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showApprovalForm && showStorageForm}
        onClose={() => {
          setShowStorageForm(false)
        }}
        title={selectedGRN ? `🏢 Storage & Warehouse Details - ${selectedGRN.grn_no}` : 'Storage Details'}
        size="3xl"
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', width: '100%' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowStorageForm(false)}
            >
              Back
            </Button>
            <Button 
              variant="success" 
              onClick={handleApproveAndStore}
              disabled={loading}
            >
              <Save size={16} style={{ marginRight: '6px' }} />
              {loading ? 'Processing...' : 'Approve & Store in Inventory'}
            </Button>
          </div>
        }
      >
        <div>
          <div style={{
            backgroundColor: '#e0f2fe',
            border: '1px solid #7dd3fc',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <div style={{ fontSize: '16px' }}>🏢</div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: '#0c4a6e', fontWeight: 500 }}>
                <strong>Inspection Step 2 of 2:</strong> Assign warehouse locations, batch numbers, and cost details for each accepted item.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Item Code</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>Accepted Qty</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Warehouse</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Bin/Rack</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Batch #</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Cost/Unit</th>
                </tr>
              </thead>
              <tbody>
                {(selectedGRN?.items || []).map(item => {
                  const approval = approvalItems.find(a => a.id === item.id)
                  if (!approval || parseFloat(approval.accepted_qty) === 0) return null
                  
                  const storage = storageData[item.id] || {}
                  const hasWarehouse = storage.warehouse_id
                  
                  return (
                    <tr key={item.id} style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: hasWarehouse ? '#f0fdf4' : 'white'
                    }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: '#1f2937' }}>
                        {item.item_code}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 500, color: '#059669' }}>
                        {approval.accepted_qty}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={storage.warehouse_id || ''}
                          onChange={(e) => handleStorageDataChange(item.id, 'warehouse_id', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: hasWarehouse ? '1px solid #10b981' : '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            backgroundColor: hasWarehouse ? '#f0fdf4' : 'white'
                          }}
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
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          placeholder="e.g., A-12-3"
                          value={storage.bin_rack || ''}
                          onChange={(e) => handleStorageDataChange(item.id, 'bin_rack', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <input
                          type="text"
                          placeholder={item.batch_no || 'Batch #'}
                          value={storage.batch_no || item.batch_no || ''}
                          onChange={(e) => handleStorageDataChange(item.id, 'batch_no', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={storage.valuation_rate || ''}
                          onChange={(e) => handleStorageDataChange(item.id, 'valuation_rate', e.target.value)}
                          min="0"
                          step="0.01"
                          style={{
                            width: '100px',
                            padding: '6px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '12px',
                            textAlign: 'right'
                          }}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '13px',
            color: '#92400e'
          }}>
            <p style={{ margin: 0, fontWeight: 500 }}>
              ⚠️ <strong>Required Fields:</strong> Warehouse location must be assigned for all accepted items before approval.
            </p>
          </div>
        </div>
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
    </div>
  )
}

function StatCard({ title, count, color, icon }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: `2px solid ${color}20`,
      borderRadius: '8px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px', color }}>
        {icon}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>
        {count}
      </div>
      <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
        {title}
      </div>
    </div>
  )
}
