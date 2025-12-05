import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Plus, Eye, Edit2, Trash2, Users, Mail, MapPin, Phone, TrendingUp
} from 'lucide-react'
import CreateCustomerModal from '../../components/Selling/CreateCustomerModal'
import './Selling.css'

export default function Customers() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    total_credit_limit: 0,
    top_customer_value: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    group: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCustomers()
  }, [filters])

  const fetchCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/customers?${query}`)
      const data = await res.json()
      if (data.success) {
        setCustomers(data.data || [])
        calculateStats(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch customers')
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setError('Error fetching customers')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      active: 0,
      inactive: 0,
      total_credit_limit: 0,
      top_customer_value: 0
    }

    data.forEach((customer) => {
      if (customer.status === 'active') {
        newStats.active++
      } else {
        newStats.inactive++
      }
      newStats.total_credit_limit += parseFloat(customer.credit_limit || 0)
      newStats.top_customer_value = Math.max(
        newStats.top_customer_value,
        parseFloat(customer.total_sales || 0)
      )
    })

    setStats(newStats)
  }

  const getStatusColor = (status) => {
    // Customer status colors
    switch (status) {
      case 'active':
        // Green - Active customer
        return 'success'
      case 'inactive':
        // Gray - Inactive customer
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/customers/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchCustomers()
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }

  const columns = [
    { label: 'Customer Name', key: 'name', searchable: true },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'GST No', key: 'gst_no' },
    { label: 'Credit Limit', key: 'credit_limit', render: (val) => `₹${parseFloat(val || 0).toFixed(0)}` },
    { label: 'Status', key: 'status', render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge> },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => {
        if (!row) return null
        return (
        <div className="action-buttons">
          <button 
            onClick={() => navigate(`/selling/customers/${row.id}`)}
            className="flex items-center justify-center p-2 text-primary-600 hover:bg-primary-100 rounded transition-colors duration-200"
            title="View"
          >
            <Eye size={16} />
          </button>
          <button 
            onClick={() => navigate(`/selling/customers/${row.id}/edit`)}
            className="flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => handleDeleteCustomer(row.id)}
            className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
      }
    }
  ]

  return (
    <div className="selling-container">
      {/* Page Header */}
      <div className="page-header">
        <h2>Customers</h2>
        <Button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Plus size={18} /> New Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Customers</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-icon primary">👥</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Active</h3>
            <p>{stats.active}</p>
          </div>
          <div className="stat-icon success">✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Inactive</h3>
            <p>{stats.inactive}</p>
          </div>
          <div className="stat-icon warning">⏸️</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Credit</h3>
            <p>₹{stats.total_credit_limit.toFixed(0)}</p>
          </div>
          <div className="stat-icon primary">💳</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Top Customer</h3>
            <p>₹{stats.top_customer_value.toFixed(0)}</p>
          </div>
          <div className="stat-icon success">⭐</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Customer name or email..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && <Card className="error-banner">{error}</Card>}

      {/* Data Table */}
      <div className="table-container">
        {loading ? (
          <div className="table-empty">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="table-empty">
            <Users size={48} />
            <p>No customers found. Add one to get started.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={customers} />
        )}
      </div>

      {/* Create Customer Modal */}
      <CreateCustomerModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchCustomers}
      />
    </div>
  )
}