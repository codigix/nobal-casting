import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import DataTable from '../../components/Table/DataTable'
import { Plus, Eye, Edit2, Trash2, Package, Search, Filter } from 'lucide-react'
import CreateGRNPage from './CreateGRNPage'
import './Inventory.css'

export default function GRNManagement() {
  const [grns, setGrns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    dateFrom: '',
    dateTo: ''
  })
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchGRNs()
  }, [filters, searchTerm])

  const fetchGRNs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.status) params.append('status', filters.status)
      if (searchTerm) params.append('search', searchTerm)
      if (filters.supplier) params.append('supplier_name', filters.supplier)

      const response = await axios.get(`/api/grn-requests?${params}`)
      setGrns(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch GRN requests')
      console.error('Error fetching GRNs:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGRN = async (id) => {
    if (!window.confirm('Are you sure you want to delete this GRN request?')) return

    try {
      await axios.delete(`/api/grn-requests/${id}`)
      setSuccess('GRN request deleted successfully')
      fetchGRNs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete GRN request')
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
      awaiting_inventory_approval: 'Awaiting Approval',
      approved: 'Approved',
      rejected: 'Rejected',
      sent_back: 'Sent Back'
    }
    return <Badge variant="solid" color={colors[status] || 'secondary'}>{labels[status] || status}</Badge>
  }

  const columns = [
    { key: 'grn_no', label: 'GRN Number', width: '15%' },
    { key: 'po_no', label: 'PO Number', width: '12%' },
    { key: 'supplier_name', label: 'Supplier', width: '18%' },
    {
      key: 'receipt_date',
      label: 'Receipt Date',
      width: '13%',
      render: (val) => val ? new Date(val).toLocaleDateString() : '-'
    },
    {
      key: 'status',
      label: 'Status',
      width: '15%',
      render: (val) => getStatusBadge(val)
    },
    {
      key: 'total_items',
      label: 'Items',
      width: '8%',
      render: (val) => <span style={{ fontWeight: 600, color: '#0284c7' }}>{val}</span>
    },
    {
      key: 'total_accepted',
      label: 'Accepted',
      width: '10%',
      render: (val) => <span style={{ fontWeight: 600, color: '#16a34a' }}>{val || 0}</span>
    }
  ]

  const renderActions = (row) => (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      <Button
        size="sm"
        variant="icon"
        onClick={() => {
          setSelectedGRN(row)
          setShowDetails(true)
        }}
        title="View details"
        className="flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'pending' && (
        <Button
          size="sm"
          variant="icon"
          title="Edit"
          className="flex items-center justify-center p-2"
        >
          <Edit2 size={16} />
        </Button>
      )}
      {row.status === 'pending' && (
        <Button
          size="sm"
          variant="icon"
          onClick={() => handleDeleteGRN(row.id)}
          title="Delete"
          className="flex items-center justify-center p-2"
          style={{ color: '#ef4444' }}
        >
          <Trash2 size={16} />
        </Button>
      )}
    </div>
  )

  const MetricCard = ({ label, value, icon, color }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border-l-4 transition-all hover:shadow-lg" style={{ borderLeftColor: color }}>
      <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">
        {value}
      </p>
      <p className="text-3xl opacity-20 mt-2">{icon}</p>
    </div>
  )

  const metrics = {
    total: grns.length,
    pending: grns.filter(g => g.status === 'pending').length,
    awaiting: grns.filter(g => g.status === 'awaiting_inventory_approval').length,
    approved: grns.filter(g => g.status === 'approved').length
  }

  if (showCreateForm) {
    return (
      <CreateGRNPage
        onClose={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false)
          setSuccess('GRN request created successfully')
          fetchGRNs()
          setTimeout(() => setSuccess(null), 3000)
        }}
      />
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <div className="flex-1">
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">GRN Management</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-base">Create and manage all GRN requests from inventory • {grns.length} total</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          variant="primary"
          className="flex items-center gap-2 px-6 py-3"
        >
          <Plus size={20} /> Create GRN
        </Button>
      </div>

      {/* Error/Success Alerts */}
      {error && <Alert type="danger" className="mb-6">{error}</Alert>}
      {success && <Alert type="success" className="mb-6">{success}</Alert>}

      {/* Metrics */}
      {!loading && grns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Total GRNs" value={metrics.total} icon="📦" color="#3b82f6" />
          <MetricCard label="Pending" value={metrics.pending} icon="⏳" color="#f59e0b" />
          <MetricCard label="Awaiting Approval" value={metrics.awaiting} icon="🔍" color="#06b6d4" />
          <MetricCard label="Approved" value={metrics.approved} icon="✅" color="#10b981" />
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6 p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by GRN #, PO, Supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-neutral-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="awaiting_inventory_approval">Awaiting Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Supplier
              </label>
              <input
                type="text"
                placeholder="Filter by supplier..."
                value={filters.supplier}
                onChange={(e) => setFilters({ ...filters, supplier: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg dark:bg-neutral-700 dark:text-white"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setFilters({ status: '', supplier: '', dateFrom: '', dateTo: '' })}
                className="flex items-center gap-1"
              >
                <Filter size={16} /> Clear Filters
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-600 dark:text-neutral-400 mt-3">Loading GRN requests...</p>
            </div>
          </div>
        ) : grns.length === 0 ? (
          <div className="py-16 text-center">
            <Package size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400 mb-6 text-base">No GRN requests found</p>
            <Button
              onClick={() => setShowCreateForm(true)}
              variant="primary"
              size="sm"
            >
              Create First GRN
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

      {/* Details Modal */}
      {showDetails && selectedGRN && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <Card title={`GRN Details - ${selectedGRN.grn_no}`} style={{
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>GRN Number</p>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedGRN.grn_no}</p>
                </div>
                <div>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>PO Number</p>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedGRN.po_no}</p>
                </div>
                <div>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Supplier</p>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedGRN.supplier_name}</p>
                </div>
                <div>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Receipt Date</p>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{new Date(selectedGRN.receipt_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Status</p>
                  {getStatusBadge(selectedGRN.status)}
                </div>
                <div>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Total Items</p>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{selectedGRN.total_items}</p>
                </div>
              </div>

              {selectedGRN.notes && (
                <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '4px' }}>Notes</p>
                  <p>{selectedGRN.notes}</p>
                </div>
              )}
            </div>

            <h4 style={{ marginBottom: '10px', fontWeight: 600 }}>Items</h4>
            {selectedGRN.items && selectedGRN.items.length > 0 ? (
              <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead style={{ backgroundColor: '#f5f5f5' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Item Code</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Item Name</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>PO Qty</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Received</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Accepted</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Warehouse</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Batch No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGRN.items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{item.item_code}</td>
                        <td style={{ padding: '10px', color: '#666' }}>{item.item_name}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{item.po_qty || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600 }}>{item.received_qty}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{item.accepted_qty || 0}</td>
                        <td style={{ padding: '10px', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '4px' }}>
                          {item.warehouse_name}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.85rem' }}>{item.batch_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#666', padding: '10px' }}>No items in this GRN</p>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
              <Button variant="secondary" onClick={() => setShowDetails(false)}>Close</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
