import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FileText, Edit2, Send, Download, Eye, Package, AlertCircle, CheckCircle, XCircle, 
  Clock, Plus, TrendingUp, AlertTriangle, Truck, Trash2, MapPin
} from 'lucide-react'
import CreateDeliveryNoteModal from '../../components/Selling/CreateDeliveryNoteModal'
import './Selling.css'

export default function DeliveryNote() {
  const navigate = useNavigate()
  const [deliveryNotes, setDeliveryNotes] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    delivered: 0,
    partially_delivered: 0,
    cancelled: 0,
    total_value: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    customer: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDeliveryNotes()
  }, [filters])

  const fetchDeliveryNotes = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/delivery-notes?${query}`)
      const data = await res.json()
      if (data.success) {
        setDeliveryNotes(data.data || [])
        calculateStats(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch delivery notes')
      }
    } catch (error) {
      console.error('Error fetching delivery notes:', error)
      setError('Error fetching delivery notes')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      submitted: 0,
      delivered: 0,
      partially_delivered: 0,
      cancelled: 0,
      total_value: 0
    }

    data.forEach((note) => {
      if (note.status) {
        newStats[note.status] = (newStats[note.status] || 0) + 1
      }
      newStats.total_value += parseFloat(note.total_value || 0)
    })

    setStats(newStats)
  }

  const getStatusColor = (status) => {
    // Status colors with semantic meaning for delivery workflow
    switch (status) {
      case 'draft':
        // Yellow - Action Required: Note needs to be submitted
        return 'warning'
      case 'submitted':
        // Blue - In Progress: Delivery in process
        return 'info'
      case 'delivered':
        // Green - Success: Goods delivered
        return 'success'
      case 'partially_delivered':
        // Yellow - Action Required: Incomplete delivery, more items pending
        return 'warning'
      case 'cancelled':
        // Red - Rejected: Delivery was cancelled
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const handleSubmitDelivery = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/delivery-notes/${id}/submit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        fetchDeliveryNotes()
      }
    } catch (error) {
      console.error('Error submitting delivery note:', error)
    }
  }

  const handleDeleteDeliveryNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery note?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/delivery-notes/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchDeliveryNotes()
      }
    } catch (error) {
      console.error('Error deleting delivery note:', error)
    }
  }

  const columns = [
    { label: 'Delivery ID', key: 'delivery_note_id', searchable: true },
    { label: 'Customer', key: 'customer_name', searchable: true },
    { label: 'Delivery Date', key: 'delivery_date' },
    { label: 'Qty', key: 'quantity', render: (val) => `${val} units` },
    { label: 'Status', key: 'status', render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge> },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => {
        if (!row) return null
        return (
        <div className="action-buttons">
          <button 
            onClick={() => navigate(`/selling/delivery-notes/${row.delivery_note_id}`)}
            className="flex items-center justify-center p-2 text-primary-600 hover:bg-primary-100 rounded transition-colors duration-200"
            title="View"
          >
            <Eye size={16} />
          </button>
          {row.status === 'draft' && (
            <>
              <button 
                onClick={() => navigate(`/selling/delivery-notes/${row.delivery_note_id}/edit`)}
                className="flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleSubmitDelivery(row.delivery_note_id)}
                className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                title="Submit"
              >
                <Send size={16} />
              </button>
            </>
          )}
          <button 
            onClick={() => handleDeleteDeliveryNote(row.delivery_note_id)}
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
        <h2>Delivery Notes</h2>
        <Button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Plus size={18} /> New Delivery Note
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Notes</h3>
            <p>{stats.total}</p>
          </div>
          <div className="stat-icon primary">📄</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Draft</h3>
            <p>{stats.draft}</p>
          </div>
          <div className="stat-icon warning">✏️</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Submitted</h3>
            <p>{stats.submitted}</p>
          </div>
          <div className="stat-icon info">📤</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Delivered</h3>
            <p>{stats.delivered}</p>
          </div>
          <div className="stat-icon success">✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Qty Delivered</h3>
            <p>{stats.total_value}</p>
          </div>
          <div className="stat-icon primary">📦</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="delivered">Delivered</option>
            <option value="partially_delivered">Partially Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            placeholder="Delivery ID or Customer..."
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
        ) : deliveryNotes.length === 0 ? (
          <div className="table-empty">
            <Truck size={48} />
            <p>No delivery notes found. Create one to get started.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={deliveryNotes} />
        )}
      </div>

      {/* Create Delivery Note Modal */}
      <CreateDeliveryNoteModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchDeliveryNotes}
      />
    </div>
  )
}