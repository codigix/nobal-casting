import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FileText, Edit2, Send, Download, Eye, Package, AlertCircle, CheckCircle, XCircle, 
  Clock, Plus, TrendingUp, AlertTriangle, Receipt, Trash2, CreditCard
} from 'lucide-react'
import CreateInvoiceModal from '../../components/Selling/CreateInvoiceModal'
import './Selling.css'

export default function SalesInvoice() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    unpaid: 0,
    partially_paid: 0,
    paid: 0,
    total_value: 0,
    total_collected: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    payment_status: '',
    customer: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchInvoices()
  }, [filters])

  const fetchInvoices = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-invoices?${query}`)
      const data = await res.json()
      if (data.success) {
        setInvoices(data.data || [])
        calculateStats(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch invoices')
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setError('Error fetching sales invoices')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      submitted: 0,
      unpaid: 0,
      partially_paid: 0,
      paid: 0,
      total_value: 0,
      total_collected: 0
    }

    data.forEach((invoice) => {
      if (invoice.status) {
        newStats[invoice.status] = (newStats[invoice.status] || 0) + 1
      }
      const invoiceValue = parseFloat(invoice.total_value || 0)
      newStats.total_value += invoiceValue
      newStats.total_collected += parseFloat(invoice.amount_paid || 0)
    })

    setStats(newStats)
  }

  const getStatusColor = (status) => {
    // Status colors with semantic meaning for invoice workflow
    switch (status) {
      case 'draft':
        // Yellow - Action Required: Invoice needs to be finalized
        return 'warning'
      case 'submitted':
        // Blue - In Progress: Invoice sent to customer, awaiting payment
        return 'info'
      case 'paid':
        // Green - Success: Invoice fully paid
        return 'success'
      case 'cancelled':
        // Red - Rejected: Invoice was cancelled
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const getPaymentStatusColor = (status) => {
    // Payment status colors
    switch (status) {
      case 'unpaid':
        // Red - Payment not received
        return 'danger'
      case 'partially_paid':
        // Yellow - Partial payment received
        return 'warning'
      case 'paid':
        // Green - Full payment received
        return 'success'
      default:
        return 'secondary'
    }
  }

  const handleSubmitInvoice = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-invoices/${id}/submit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        fetchInvoices()
      }
    } catch (error) {
      console.error('Error submitting invoice:', error)
    }
  }

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-invoices/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchInvoices()
      }
    } catch (error) {
      console.error('Error deleting invoice:', error)
    }
  }

  const columns = [
    { label: 'Invoice ID', key: 'invoice_id', searchable: true },
    { label: 'Customer', key: 'customer_name', searchable: true },
    { label: 'Amount', key: 'amount', render: (val) => `₹${parseFloat(val || 0).toFixed(2)}` },
    { label: 'Invoice Date', key: 'invoice_date' },
    { label: 'Status', key: 'status', render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge> },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => {
        if (!row) return null
        return (
        <div className="action-buttons">
          <button 
            onClick={() => navigate(`/selling/sales-invoices/${row.invoice_id}`)}
            className="flex items-center justify-center p-2 text-primary-600 hover:bg-primary-100 rounded transition-colors duration-200"
            title="View"
          >
            <Eye size={16} />
          </button>
          {row.status === 'draft' && (
            <>
              <button 
                onClick={() => navigate(`/selling/sales-invoices/${row.invoice_id}/edit`)}
                className="flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleSubmitInvoice(row.invoice_id)}
                className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                title="Submit"
              >
                <Send size={16} />
              </button>
            </>
          )}
          <button 
            onClick={() => handleDeleteInvoice(row.invoice_id)}
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
        <h2>Sales Invoices</h2>
        <Button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Plus size={18} /> New Invoice
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Invoices</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-icon primary">📃</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Pending</h3>
            <p>{stats.unpaid}</p>
          </div>
          <div className="stat-icon warning">⏳</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Paid</h3>
            <p>{stats.paid}</p>
          </div>
          <div className="stat-icon success">✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Value</h3>
            <p>₹{stats.total_value.toFixed(0)}</p>
          </div>
          <div className="stat-icon primary">💰</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Collected</h3>
            <p>₹{stats.total_collected.toFixed(0)}</p>
          </div>
          <div className="stat-icon success">💵</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Invoice Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Payment Status</label>
          <select value={filters.payment_status} onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}>
            <option value="">All Payments</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Invoice ID or Customer..."
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
        ) : invoices.length === 0 ? (
          <div className="table-empty">
            <Receipt size={48} />
            <p>No invoices found. Create one to get started.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={invoices} />
        )}
      </div>

      {/* Create Invoice Modal */}
      <CreateInvoiceModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  )
}