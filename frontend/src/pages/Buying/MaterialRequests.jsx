import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import CreateMaterialRequestModal from '../../components/Buying/CreateMaterialRequestModal'
import ViewMaterialRequestModal from '../../components/Buying/ViewMaterialRequestModal'
import { Plus, Eye, CheckCircle, XCircle, Trash2, AlertCircle, CheckCheck, Clock } from 'lucide-react'
import './Buying.css'

export default function MaterialRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({ status: '', department: '', search: '' })
  const [departments, setDepartments] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [selectedMrId, setSelectedMrId] = useState(null)
  const [stats, setStats] = useState({ total: 0, draft: 0, approved: 0, converted: 0, cancelled: 0 })
  const [stockData, setStockData] = useState({})

  useEffect(() => {
    fetchRequests()
    fetchDepartments()
  }, [filters])

  useEffect(() => {
    const handleMaterialRequestApproved = () => {
      fetchRequests()
    }
    
    window.addEventListener('materialRequestApproved', handleMaterialRequestApproved)
    return () => window.removeEventListener('materialRequestApproved', handleMaterialRequestApproved)
  }, [filters])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.department) params.append('department', filters.department)
      if (filters.search) params.append('search', filters.search)

      const response = await api.get(`/material-requests?${params}`)
      const data = response.data.data || []
      setRequests(data)
      calculateStats(data)
      await checkItemsAvailability(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch material requests')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const checkItemsAvailability = async (requestsList) => {
    try {
      const allStockData = {}
      
      for (const request of requestsList) {
        const warehouse = request.source_warehouse || 'warehouse'
        
        for (const item of request.items || []) {
          const key = `${item.item_code}-${warehouse}`
          
          if (allStockData[key]) {
            continue
          }
          
          try {
            const res = await api.get(`/stock/stock-balance`, {
              params: {
                item_code: item.item_code,
                warehouse_id: warehouse
              }
            })
            
            const balance = res.data.data || res.data
            let availableQty = 0
            
            if (Array.isArray(balance)) {
              availableQty = balance.reduce((sum, b) => sum + (parseFloat(b.available_qty || b.current_qty || 0)), 0)
            } else if (balance && typeof balance === 'object') {
              availableQty = parseFloat(balance.available_qty || balance.current_qty || 0)
            }
            
            allStockData[key] = {
              available: availableQty,
              requested: parseFloat(item.qty),
              status: availableQty >= parseFloat(item.qty) ? 'available' : 'unavailable'
            }
          } catch (err) {
            allStockData[key] = {
              available: 0,
              requested: parseFloat(item.qty),
              status: 'unavailable'
            }
          }
        }
      }
      
      setStockData(allStockData)
    } catch (err) {
      console.error('Error checking stock availability:', err)
    }
  }

  const calculateStats = (data) => {
    const newStats = { total: data.length, draft: 0, approved: 0, converted: 0, cancelled: 0 }
    data.forEach((req) => {
      if (req.status) newStats[req.status] = (newStats[req.status] || 0) + 1
    })
    setStats(newStats)
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/material-requests/departments')
      setDepartments(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const handleApprove = async (id) => {
    try {
      const response = await api.patch(`/material-requests/${id}/approve`)
      const message = response.data.message || 'Material request approved successfully'
      setSuccess(message)
      fetchRequests()
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve')
    }
  }

  const handleReject = async (id) => {
    try {
      await api.patch(`/material-requests/${id}/reject`)
      setSuccess('Material request rejected')
      fetchRequests()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this material request?')) {
      try {
        await api.delete(`/material-requests/${id}`)
        setSuccess('Material request deleted')
        fetchRequests()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete')
      }
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',           // Yellow - Action Required
      approved: 'success',        // Green - Approved & Accepted
      converted: 'secondary',     // Gray - Converted to PO, Processing
      cancelled: 'danger'         // Red - Request Cancelled
    }
    return colors[status] || 'secondary'
  }

  const getItemsAvailabilityStatus = (row) => {
    const warehouse = row.source_warehouse || 'warehouse'
    const items = row.items || []
    
    if (items.length === 0) return { all: 'available', available: 0, unavailable: 0 }
    
    let availableCount = 0
    let unavailableCount = 0
    
    for (const item of items) {
      const key = `${item.item_code}-${warehouse}`
      const itemStock = stockData[key]
      
      if (itemStock && itemStock.status === 'available') {
        availableCount++
      } else {
        unavailableCount++
      }
    }
    
    return {
      all: unavailableCount === 0 ? 'available' : (availableCount === 0 ? 'unavailable' : 'partial'),
      available: availableCount,
      unavailable: unavailableCount
    }
  }

  const columns = [
    { key: 'mr_id', label: 'MR ID', width: '8%' },
    { key: 'requested_by_name', label: 'Requested By', width: '10%' },
    { key: 'department', label: 'Department', width: '10%' },
    { 
      key: 'required_by_date', 
      label: 'Required By', 
      width: '8%',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-'
    },
    { key: 'purpose', label: 'Purpose', width: '12%' },
    {
      key: 'stock_availability',
      label: 'Stock Status',
      width: '12%',
      render: (val, row) => {
        const status = getItemsAvailabilityStatus(row)
        const colors = { available: 'success', unavailable: 'danger', partial: 'warning' }
        const labels = { available: '✓ All Available', unavailable: '✗ Unavailable', partial: '⚠ Partial' }
        return <Badge color={colors[status.all]}>{labels[status.all]}</Badge>
      }
    },
    {
      key: 'items_count',
      label: 'Items (Avail/Total)',
      width: '10%',
      render: (val, row) => {
        const status = getItemsAvailabilityStatus(row)
        return <span>{status.available}/{(row.items || []).length}</span>
      }
    },
    { 
      key: 'status', 
      label: 'Request Status', 
      width: '10%',
      render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge>
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '12%',
      render: (val) => new Date(val).toLocaleString()
    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center gap-1">
      <Button 
        size="sm"
        variant="icon"
        onClick={() => {
          setSelectedMrId(row.mr_id)
          setViewModalOpen(true)
        }}
        title="View Material Request"
        className="flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'draft' && (
        <>
          <Button 
            size="sm"
            variant="icon-success"
            onClick={() => handleApprove(row.mr_id)}
            title="Approve Request"
            className="flex items-center justify-center p-2"
          >
            <CheckCircle size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-danger"
            onClick={() => handleReject(row.mr_id)}
            title="Reject Request"
            className="flex items-center justify-center p-2"
          >
            <XCircle size={16} />
          </Button>
        </>
      )}
      {row.status === 'draft' && (
        <Button 
          size="sm"
          variant="icon-danger"
          onClick={() => handleDelete(row.mr_id)}
          title="Delete Request"
          className="flex items-center justify-center p-2"
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  )

  const StatCard = ({ label, value, icon: Icon, color, onClick }) => (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-neutral-800 rounded-sm p-3 border-l-4 transition-all hover:shadow-lg ${onClick ? 'cursor-pointer' : ''}`}
      style={{ borderLeftColor: { primary: '#3b82f6', success: '#10b981', warning: '#f59e0b', danger: '#ef4444' }[color] }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">{value}</p>
        </div>
        <Icon size={28} className="text-neutral-400 dark:text-neutral-600" />
      </div>
    </div>
  )

  return (
    <div className="buying-container">
      <CreateMaterialRequestModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchRequests()
          setSuccess('Material request created successfully')
          setTimeout(() => setSuccess(null), 3000)
        }}
      />

      <ViewMaterialRequestModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false)
          setSelectedMrId(null)
        }}
        mrId={selectedMrId}
        onStatusChange={() => {
          fetchRequests()
          // Optionally close modal if deleted, or keep open if approved/rejected
          // For delete, the modal closes itself in handleDelete
        }}
      />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Material Requests</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Create and manage material requisitions</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus size={20} /> New Request
        </Button>
      </div>

      {/* Error & Success Alerts */}
      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Stats Dashboard */}
      {!loading && requests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            label="Total Requests"
            value={stats.total}
            icon={AlertCircle}
            color="primary"
            onClick={() => setFilters({ status: '', department: '', search: '' })}
          />
          <StatCard
            label="Draft"
            value={stats.draft}
            icon={Clock}
            color="warning"
            onClick={() => setFilters({ status: 'draft', department: '', search: '' })}
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="success"
            onClick={() => setFilters({ status: 'approved', department: '', search: '' })}
          />
          <StatCard
            label="Converted"
            value={stats.converted}
            icon={CheckCheck}
            color="info"
            onClick={() => setFilters({ status: 'converted', department: '', search: '' })}
          />
          <StatCard
            label="Cancelled"
            value={stats.cancelled}
            icon={XCircle}
            color="danger"
            onClick={() => setFilters({ status: 'cancelled', department: '', search: '' })}
          />
        </div>
      )}

      {/* Main Content Card */}
      <Card>
        <AdvancedFilters 
          filters={filters}
          onFilterChange={setFilters}
          filterConfig={[
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: 'draft', label: 'Draft' },
                { value: 'approved', label: 'Approved' },
                { value: 'converted', label: 'Converted' },
                { value: 'cancelled', label: 'Cancelled' }
              ]
            },
            {
              key: 'department',
              label: 'Department',
              type: 'select',
              options: departments.map(dept => ({ value: dept, label: dept }))
            },
            {
              key: 'search',
              label: 'Search',
              type: 'text',
              placeholder: 'MR ID, requester name...'
            }
          ]}
          onApply={fetchRequests}
          onReset={() => {
            setFilters({ status: '', department: '', search: '' })
          }}
          showPresets={true}
        />

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600 dark:text-neutral-400 mt-4">Loading...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle size={48} className="mx-auto text-neutral-400 dark:text-neutral-600 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">No material requests found</p>
          </div>
        ) : (
          <DataTable 
            columns={columns}
            data={requests}
            renderActions={renderActions}
            filterable={true}
            sortable={true}
            pageSize={10}
          />
        )}
      </Card>
    </div>
  )
}