import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import CreatePurchaseOrderModal from '../../components/Buying/CreatePurchaseOrderModal'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, Edit2, Send, Download, Eye, Package, AlertCircle, CheckCircle, XCircle, 
  Clock, Plus, TrendingUp, AlertTriangle
} from 'lucide-react'
import './Buying.css'

export default function PurchaseOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    to_receive: 0,
    partially_received: 0,
    completed: 0,
    cancelled: 0,
    total_value: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [showGRNModal, setShowGRNModal] = useState(false)
  const [selectedPO, setSelectedPO] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [filters])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-orders?${query}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data || [])
        calculateStats(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Error fetching purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      submitted: 0,
      to_receive: 0,
      partially_received: 0,
      completed: 0,
      cancelled: 0,
      total_value: 0
    }

    data.forEach((order) => {
      if (order.status) {
        newStats[order.status] = (newStats[order.status] || 0) + 1
      }
      newStats.total_value += parseFloat(order.total_value || 0)
    })

    setStats(newStats)
  }

  const handleSubmitPO = async (po_no) => {
    try {
      setActionLoading(po_no)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/purchase-orders/${po_no}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      
      if (data.success) {
        setError(null)
        fetchOrders()
      } else {
        setError(data.error || 'Failed to submit PO')
      }
    } catch (err) {
      console.error('Error submitting PO:', err)
      setError('Error submitting PO')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReceiveMaterial = (po) => {
    setSelectedPO(po)
    setShowGRNModal(true)
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',           // Yellow - Action Required
      submitted: 'info',          // Blue - In Progress, Awaiting Supplier
      to_receive: 'secondary',    // Gray - Pending Goods Arrival
      partially_received: 'warning', // Yellow - Incomplete, More Items Expected
      completed: 'success',       // Green - All Goods Received
      cancelled: 'danger'         // Red - Order Cancelled
    }
    return colors[status] || 'secondary'
  }

  const filterConfig = [
    { key: 'search', label: 'Search PO', type: 'text', placeholder: 'PO #, Supplier...' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: '', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'to_receive', label: 'To Receive' },
        { value: 'partially_received', label: 'Partially Received' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    { 
      key: 'supplier', 
      label: 'Supplier', 
      type: 'text',
      placeholder: 'Supplier name...'
    }
  ]

  const getStatusIcon = (status) => {
    const icons = {
      draft: FileText,
      submitted: Send,
      to_receive: Download,
      partially_received: AlertTriangle,
      completed: CheckCircle,
      cancelled: XCircle
    }
    const IconComponent = icons[status]
    return IconComponent ? <IconComponent size={18} /> : null
  }

  const getDaysUntilExpiry = (expectedDate) => {
    if (!expectedDate) return null
    const today = new Date()
    const expiry = new Date(expectedDate)
    const diffTime = expiry - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const columns = [
    { 
      key: 'po_no', 
      label: 'PO Number', 
      width: '11%',
      render: (val) => (
        <span className="font-semibold text-primary-600 dark:text-primary-400">
          {val}
        </span>
      )
    },
    { 
      key: 'supplier_name', 
      label: 'Supplier', 
      width: '14%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {val || 'N/A'}
        </span>
      )
    },
    { 
      key: 'order_date', 
      label: 'Order Date', 
      width: '10%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'expected_date', 
      label: 'Expected Delivery', 
      width: '12%',
      render: (row) => {
        const val = row.expected_date
        const days = getDaysUntilExpiry(val)
        if (!val) return 'N/A'
        const dateStr = new Date(val).toLocaleDateString()
        if (days !== null && row.status !== 'completed' && row.status !== 'cancelled') {
          const color = days < 0 ? 'text-red-600' : days < 3 ? 'text-orange-600' : 'text-green-600'
          const icon = days < 0 ? '🔴' : days < 3 ? '🟡' : '🟢'
          return (
            <div className="text-sm">
              <div>{dateStr}</div>
              <div className={`text-xs ${color} font-medium`}>
                {icon} {Math.abs(days)} days {days < 0 ? 'overdue' : 'left'}
              </div>
            </div>
          )
        }
        return dateStr
      }
    },
    { 
      key: 'total_value', 
      label: 'Amount', 
      width: '11%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '13%',
      render: (val) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(val)}
          <Badge color={getStatusColor(val)} variant="solid">
            {val?.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      )
    },
    { 
      key: 'created_by', 
      label: 'Created By', 
      width: '11%',
      render: (val) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {val || 'System'}
        </span>
      )
    }
  ]

  const renderActions = (row) => (
    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
      <Button
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/purchase-order/${row.po_no}`)
        }}
        title="View Purchase Order"
        className="min-w-max flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
      
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="icon-success"
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/buying/purchase-order/${row.po_no}?edit=true`)
          }}
          title="Edit Purchase Order"
          className="min-w-max flex items-center justify-center p-2"
        >
          <Edit2 size={16} />
        </Button>
      )}
      
      {row.status === 'draft' && (
        <Button
          size="sm"
          variant="icon-info"
          onClick={(e) => {
            e.stopPropagation()
            handleSubmitPO(row.po_no)
          }}
          title="Submit Purchase Order to Supplier"
          className="min-w-max flex items-center justify-center p-2"
          disabled={actionLoading === row.po_no}
        >
          <Send size={16} />
        </Button>
      )}
      
      {(row.status === 'submitted' || row.status === 'to_receive' || row.status === 'partially_received') && (
        <Button
          size="sm"
          variant="icon-success"
          onClick={(e) => {
            e.stopPropagation()
            handleReceiveMaterial(row)
          }}
          title="Receive Material - Create GRN"
          className="min-w-max flex items-center justify-center p-2"
        >
          <Download size={16} />
        </Button>
      )}
    </div>
  )

  const getBorderColor = (color) => {
    const colors = {
      primary: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444'
    }
    return colors[color] || '#6b7280'
  }

  const StatCard = ({ label, value, icon, color, trend, onClick }) => (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-neutral-800 rounded-sm border p-3 border-l-4 transition-all hover:shadow-lg cursor-pointer`}
      style={{ borderLeftColor: getBorderColor(color) }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{value}</p>
        </div>
        <div className="text-4xl opacity-20">
          {icon}
        </div>
      </div>
      {trend && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 font-medium">{trend}</p>
      )}
    </div>
  )

  return (
    <div className='p-5'>
      {/* Header Section */}
      <div className="flex-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Purchase Orders</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Manage and track all procurement activities</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          variant="primary" 
          className="flex items-center gap-2"
        >
          <Plus size={20} /> Create New PO
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
        </Card>
      )}

      {/* Stats Dashboard */}
      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            label="Total POs"
            value={stats.total}
            icon={<Package size={24} />}
            color="primary"
            onClick={() => setFilters({ status: '', supplier: '', search: '' })}
            trend={`₹${(stats.total_value / 100000).toFixed(1)}L total value`}
          />
          <StatCard
            label="Draft"
            value={stats.draft}
            icon={<FileText size={24} />}
            color="warning"
            onClick={() => setFilters({ status: 'draft', supplier: '', search: '' })}
          />
          <StatCard
            label="In Progress"
            value={stats.submitted + stats.to_receive + stats.partially_received}
            icon={<Clock size={24} />}
            color="primary"
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckCircle size={24} />}
            color="success"
            onClick={() => setFilters({ status: 'completed', supplier: '', search: '' })}
          />
        </div>
      )}

      {/* Additional Status Cards */}
      {!loading && orders.length > 0 && (stats.to_receive > 0 || stats.partially_received > 0 || stats.cancelled > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.to_receive > 0 && (
            <StatCard
              label="To Receive"
              value={stats.to_receive}
              icon={<Download size={24} />}
              color="primary"
              onClick={() => setFilters({ status: 'to_receive', supplier: '', search: '' })}
            />
          )}
          {stats.partially_received > 0 && (
            <StatCard
              label="Partially Received"
              value={stats.partially_received}
              icon={<AlertTriangle size={24} />}
              color="warning"
              onClick={() => setFilters({ status: 'partially_received', supplier: '', search: '' })}
            />
          )}
          {stats.cancelled > 0 && (
            <StatCard
              label="Cancelled"
              value={stats.cancelled}
              icon="❌"
              color="danger"
              onClick={() => setFilters({ status: 'cancelled', supplier: '', search: '' })}
            />
          )}
        </div>
      )}

      {/* Filters */}
      <AdvancedFilters
        filters={filters}
        onFilterChange={setFilters}
        filterConfig={filterConfig}
        showPresets={true}
      />

      {/* Data Table */}
      <Card>
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-600 dark:text-neutral-400 mt-4 font-medium">Loading purchase orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg font-medium mb-2">No purchase orders found</p>
            <p className="text-neutral-500 dark:text-neutral-500 mb-6">Get started by creating your first purchase order</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              variant="primary"
            >
              Create First Purchase Order
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={orders}
            renderActions={renderActions}
            filterable={true}
            sortable={true}
            pageSize={10}
            onRowClick={(row) => navigate(`/buying/purchase-order/${row.po_no}`)}
          />
        )}
      </Card>

      {/* Create Purchase Order Modal */}
      <CreatePurchaseOrderModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchOrders}
      />

      {/* Create GRN Modal */}
      {selectedPO && (
        <CreateGRNModal
          isOpen={showGRNModal}
          onClose={() => {
            setShowGRNModal(false)
            setSelectedPO(null)
          }}
          poNo={selectedPO.po_no}
          onSuccess={fetchOrders}
        />
      )}
    </div>
  )
}