import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Eye, FileText, DollarSign, CheckCircle } from 'lucide-react'
import CreatePurchaseInvoiceModal from '../../components/Buying/CreatePurchaseInvoiceModal'
import './Buying.css'

export default function PurchaseInvoices() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-invoices?${query}`)
      const data = await res.json()
      if (data.success) {
        setInvoices(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch invoices')
      }
    } catch (error) {
      console.error('Error fetching invoices:', error)
      setError('Error fetching purchase invoices')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',           // Yellow - Action Required
      submitted: 'info',          // Blue - Invoice Submitted
      paid: 'success',            // Green - Payment Completed
      cancelled: 'danger'         // Red - Invoice Cancelled
    }
    return colors[status] || 'secondary'
  }

  const filterConfig = [
    { key: 'search', label: 'Search Invoice', type: 'text', placeholder: 'Invoice #, Supplier...' },
    { 
      key: 'status', 
      label: 'Payment Status', 
      type: 'select',
      options: [
        { value: '', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'submitted', label: 'Submitted' },
        { value: 'paid', label: 'Paid' },
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

  const columns = [
    { key: 'purchase_invoice_no', label: 'Invoice Number', width: '12%' },
    { key: 'supplier_name', label: 'Supplier', width: '15%' },
    { 
      key: 'invoice_date', 
      label: 'Invoice Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'due_date', 
      label: 'Due Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'net_amount', 
      label: 'Amount', 
      width: '12%',
      render: (val) => `₹${(parseFloat(val) || 0).toFixed(2)}`
    },
    { 
      key: 'status', 
      label: 'Payment Status', 
      width: '12%',
      render: (val) => (
        <Badge color={getStatusColor(val)} variant="solid">
          {val?.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '13%',
      render: (val) => val ? new Date(val).toLocaleString() : 'N/A'
    },
    { 
      key: 'created_by', 
      label: 'Created By', 
      width: '12%',
      render: (val) => val || 'System'
    }
  ]

  const renderActions = (row) => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Button
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/purchase-invoice/${row.purchase_invoice_no}`)
        }}
        title="View Invoice"
        className="flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
    </div>
  )

  return (
    <div>
      <div className="flex-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Purchase Invoices</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Track and manage all purchase invoices</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          variant="primary" 
          className="flex items-center gap-2"
        >
          <Plus size={20} /> Create Invoice
        </Button>
      </div>

      {error && (
        <Card className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </Card>
      )}

      <AdvancedFilters
        filters={filters}
        onFilterChange={setFilters}
        filterConfig={filterConfig}
        showPresets={true}
      />

      <Card>
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">Loading invoices...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">No purchase invoices found</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              variant="primary" 
              size="sm"
            >
              Create First Invoice
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            renderActions={renderActions}
            filterable={true}
            sortable={true}
            pageSize={10}
            onRowClick={(row) => navigate(`/buying/purchase-invoice/${row.purchase_invoice_no}`)}
          />
        )}
      </Card>

      {/* Create Purchase Invoice Modal */}
      <CreatePurchaseInvoiceModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchInvoices}
      />
    </div>
  )
}