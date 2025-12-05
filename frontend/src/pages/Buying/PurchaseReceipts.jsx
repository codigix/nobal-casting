import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, Package, CheckCircle, XCircle, Download, TrendingUp, AlertCircle, Info } from 'lucide-react'
import CreateGRNModal from '../../components/Buying/CreateGRNModal'
import Alert from '../../components/Alert/Alert'
import './Buying.css'

export default function PurchaseReceipts() {
  const navigate = useNavigate()
  const [grns, setGrns] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedGRNs, setSelectedGRNs] = useState(new Set())
  const [filters, setFilters] = useState({
    status: '',
    po_no: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    inspecting: 0,
    approved: 0,
    rejected: 0,
    totalValue: 0
  })

  useEffect(() => {
    fetchGRNs()
  }, [filters])

  const fetchGRNs = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/grn-requests?${query}`)
      const data = await res.json()
      if (data.success) {
        const grnData = data.data || []
        setGrns(grnData)
        calculateMetrics(grnData)
      } else {
        setError(data.error || 'Failed to fetch receipts')
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error)
      setError('Error fetching purchase receipts')
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (data) => {
    const newMetrics = {
      total: data.length,
      pending: 0,
      inspecting: 0,
      approved: 0,
      rejected: 0,
      totalValue: 0
    }

    data.forEach((grn) => {
      if (grn.status === 'pending') newMetrics.pending++
      else if (grn.status === 'inspecting' || grn.status === 'awaiting_inventory_approval') newMetrics.inspecting++
      else if (grn.status === 'approved' || grn.status === 'accepted') newMetrics.approved++
      else if (grn.status === 'rejected' || grn.status === 'sent_back') newMetrics.rejected++
    })

    setMetrics(newMetrics)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',                  // Yellow - Action Required
      inspecting: 'info',                  // Blue - Under Inspection
      awaiting_inventory_approval: 'info', // Blue - Awaiting Inventory
      approved: 'success',                 // Green - Approved
      rejected: 'danger',                  // Red - Rejected
      sent_back: 'warning',                // Yellow - Sent Back
      draft: 'warning',
      submitted: 'info',
      inspected: 'info',
      accepted: 'success'
    }
    return colors[status] || 'secondary'
  }

  const handleSelectGRN = (grnId) => {
    const newSelected = new Set(selectedGRNs)
    if (newSelected.has(grnId)) {
      newSelected.delete(grnId)
    } else {
      newSelected.add(grnId)
    }
    setSelectedGRNs(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedGRNs.size === grns.length) {
      setSelectedGRNs(new Set())
    } else {
      setSelectedGRNs(new Set(grns.map(g => g.id)))
    }
  }

  const exportToCSV = () => {
    const headers = ['GRN Number', 'PO Number', 'Supplier', 'Receipt Date', 'Items', 'Status', 'Created Date']
    const data = grns.map(g => [
      g.grn_no,
      g.po_no,
      g.supplier_name,
      g.receipt_date ? new Date(g.receipt_date).toLocaleDateString() : '-',
      g.total_items,
      g.status?.replace('_', ' ').toUpperCase(),
      g.created_at ? new Date(g.created_at).toLocaleDateString() : '-'
    ])

    let csv = headers.join(',') + '\n'
    data.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n'
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `grn-reports-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }



  const StatCard = ({ label, value, icon: Icon, color, onClick }) => (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-neutral-800 rounded-lg p-6 border-l-4 transition-all hover:shadow-lg ${onClick ? 'cursor-pointer' : ''}`}
      style={{ borderLeftColor: { primary: '#3b82f6', success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#0284c7' }[color] }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">{value}</p>
        </div>
        <Icon size={28} className="text-neutral-400 dark:text-neutral-600" />
      </div>
    </div>
  )

  const columns = [
    { 
      key: 'grn_no', 
      label: 'GRN #', 
      width: '12%',
      render: (val) => (
        <span className="font-semibold text-primary-600 dark:text-primary-400">
          {val}
        </span>
      )
    },
    { 
      key: 'po_no', 
      label: 'PO #', 
      width: '12%',
      render: (val) => (
        <span className="font-medium text-neutral-900 dark:text-neutral-100">
          {val || 'N/A'}
        </span>
      )
    },
    { 
      key: 'supplier_name', 
      label: 'Supplier', 
      width: '14%',
      render: (val) => (
        <span className="text-neutral-700 dark:text-neutral-300">
          {val || 'N/A'}
        </span>
      )
    },
    { 
      key: 'receipt_date', 
      label: 'Receipt Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-'
    },
    { 
      key: 'total_items', 
      label: 'Items', 
      width: '8%',
      render: (val) => (
        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
          {val || 0}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '16%',
      render: (val) => <Badge color={getStatusColor(val)}>{val?.replace(/_/g, ' ').toUpperCase()}</Badge>
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-'
    }
  ]

  const renderActions = (row) => (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        size="sm"
        variant="icon"
        onClick={() => navigate(`/buying/grn-requests/${row.grn_no}`)}
        title="View GRN Details"
        className="flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
      <Button
        size="sm"
        variant="icon-info"
        onClick={exportToCSV}
        title="Export Details"
        className="flex items-center justify-center p-2"
      >
        <Download size={16} />
      </Button>
    </div>
  )

  return (
    <div className="buying-container">
      <CreateGRNModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchGRNs()
          setSuccess('GRN created successfully')
          setTimeout(() => setSuccess(null), 3000)
        }}
      />

      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Goods Receipt Notes</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Track incoming goods from suppliers and create GRNs for inventory processing</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus size={20} /> Create GRN
          </Button>
          <Button 
            onClick={exportToCSV}
            variant="secondary"
            disabled={grns.length === 0}
            className="flex items-center gap-2"
          >
            <Download size={20} /> Export
          </Button>
        </div>
      </div>

      {/* Workflow Instructions */}
      <Card className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500">
        <div className="flex gap-3 items-start">
          <Info size={20} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-300 text-sm mb-2">GRN Workflow</p>
            <ol className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-decimal list-inside">
              <li>Receive goods from supplier</li>
              <li>Create GRN from Purchase Order</li>
              <li>Send to Inventory department for material inspection</li>
              <li>Inventory inspects and assigns warehouse locations</li>
              <li>Stock entries created automatically</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Error & Success Alerts */}
      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      {/* Stats Dashboard */}
      {!loading && grns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            label="Total GRNs"
            value={metrics.total}
            icon={Package}
            color="primary"
            onClick={() => setFilters({ status: '', po_no: '', search: '' })}
          />
          <StatCard
            label="Pending"
            value={metrics.pending}
            icon={AlertCircle}
            color="warning"
            onClick={() => setFilters({ status: 'pending', po_no: '', search: '' })}
          />
          <StatCard
            label="Inspecting"
            value={metrics.inspecting}
            icon={TrendingUp}
            color="info"
            onClick={() => setFilters({ status: 'inspecting', po_no: '', search: '' })}
          />
          <StatCard
            label="Approved"
            value={metrics.approved}
            icon={CheckCircle}
            color="success"
            onClick={() => setFilters({ status: 'approved', po_no: '', search: '' })}
          />
          <StatCard
            label="Rejected"
            value={metrics.rejected}
            icon={XCircle}
            color="danger"
            onClick={() => setFilters({ status: 'rejected', po_no: '', search: '' })}
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
                { value: 'pending', label: 'Pending' },
                { value: 'inspecting', label: 'Inspecting' },
                { value: 'awaiting_inventory_approval', label: 'Awaiting Inventory Approval' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'sent_back', label: 'Sent Back' }
              ]
            },
            {
              key: 'po_no',
              label: 'PO Number',
              type: 'text',
              placeholder: 'Enter PO number...'
            },
            {
              key: 'search',
              label: 'Search',
              type: 'text',
              placeholder: 'GRN #, Supplier...'
            }
          ]}
          onApply={fetchGRNs}
          onReset={() => {
            setFilters({ status: '', po_no: '', search: '' })
          }}
          showPresets={true}
        />

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="text-neutral-600 dark:text-neutral-400 mt-4">Loading GRNs...</p>
          </div>
        ) : grns.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={48} className="mx-auto text-neutral-400 dark:text-neutral-600 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">No GRN records found</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              variant="primary"
              className="mt-4 inline-flex items-center gap-2"
            >
              <Plus size={16} /> Create First GRN
            </Button>
          </div>
        ) : (
          <DataTable 
            columns={columns}
            data={grns}
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