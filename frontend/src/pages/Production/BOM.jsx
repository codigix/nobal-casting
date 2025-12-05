import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, BarChart3, AlertCircle, Zap, TrendingUp, FileText } from 'lucide-react'
import * as productionService from '../../services/productionService'
import DataTable from '../../components/Table/DataTable'
import './Production.css'

export default function BOM() {
  const navigate = useNavigate()
  const location = useLocation()
  const [boms, setBOMs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(location.state?.success || null)
  const [stats, setStats] = useState({
    totalBOMs: 0,
    activeBOMs: 0,
    draftBOMs: 0,
    totalCost: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })

  useEffect(() => {
    fetchBOMs()
  }, [filters])

  const fetchBOMs = async () => {
    try {
      setLoading(true)
      const response = await productionService.getBOMs(filters)
      const bomData = response.data || []
      setBOMs(bomData)
      
      const allResponse = await productionService.getBOMs({})
      const allBOMs = allResponse.data || []
      const activeBOMs = allBOMs.filter(b => b.status === 'active').length
      const draftBOMs = allBOMs.filter(b => b.status === 'draft').length
      const totalCost = allBOMs.reduce((sum, b) => sum + (parseFloat(b.total_cost) || 0), 0)
      
      setStats({
        totalBOMs: allBOMs.length,
        activeBOMs,
        draftBOMs,
        totalCost
      })
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch BOMs')
      setBOMs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (bom_id) => {
    if (window.confirm('Delete this BOM?')) {
      try {
        await productionService.deleteBOM(bom_id)
        setSuccess('BOM deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchBOMs()
      } catch (err) {
        setError(err.message || 'Failed to delete BOM')
      }
    }
  }

  const handleEdit = (bom) => {
    navigate(`/production/boms/form/${bom.bom_id}`)
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'status-completed',
      draft: 'status-draft',
      inactive: 'status-cancelled'
    }
    return colors[status] || 'status-draft'
  }

  const columns = [
    {
      key: 'bom_id',
      label: 'ID',
      width: '80px'
    },
    {
      key: 'status',
      label: 'Status',
      width: '120px',
      render: (value, row) => (
        <span className={`work-order-status ${getStatusColor(row.status)}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', display: 'inline-block', textTransform: 'capitalize' }}>
          {row.status || 'Draft'}
        </span>
      )
    },
    {
      key: 'item_code',
      label: 'Item',
      width: '220px',
      render: (value, row) => (
        <div>{row.item_code} {row.product_name && <span style={{ color: '#666' }}>- {row.product_name}</span>}</div>
      )
    },
    {
      key: 'is_active',
      label: 'Is Active',
      width: '100px',
      render: (value, row) => (
        <input type="checkbox" checked={row.is_active !== false} readOnly style={{ cursor: 'pointer' }} />
      )
    },
    {
      key: 'is_default',
      label: 'Is Default',
      width: '100px',
      render: (value, row) => (
        <input type="checkbox" checked={row.is_default === true} readOnly style={{ cursor: 'pointer' }} />
      )
    },
    {
      key: 'total_cost',
      label: 'Total Cost',
      width: '120px',
      render: (value, row) => (
        <div style={{ textAlign: 'right' }}>₹{parseFloat(row.total_cost || 0).toFixed(2)}</div>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated On',
      width: '140px',
      render: (value, row) => (
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          {row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-IN') : 'N/A'}
        </div>
      )
    }
  ]

  const renderActions = (row) => (
    <div className="entry-actions" style={{ gap: '4px' }}>
      <button className="btn-edit" onClick={() => handleEdit(row)} title="Edit"><Edit2 size={16} /></button>
      <button className="btn-delete" onClick={() => handleDelete(row.bom_id)} title="Delete"><Trash2 size={16} /></button>
    </div>
  )

  return (
    <div className="bom-dashboard">
      <div className="bom-header">
        <div className="bom-header-content">
          <h1>Bill of Materials</h1>
          <p>Manage product BOMs and components</p>
        </div>
        <button 
          onClick={() => navigate('/production/boms/form')}
          className="bom-btn-new"
        >
          <Plus size={18} /> New BOM
        </button>
      </div>

      {success && (
        <div className="bom-alert bom-alert-success">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="bom-alert bom-alert-error">
          ✕ {error}
        </div>
      )}

      {!loading && (
        <div className="bom-kpi-section">
          <div className="bom-kpi-row">
            <div className="bom-kpi-card bom-kpi-primary">
              <div className="bom-kpi-icon">
                <FileText size={24} />
              </div>
              <div className="bom-kpi-details">
                <span className="bom-kpi-label">Total BOMs</span>
                <span className="bom-kpi-value">{stats.totalBOMs}</span>
              </div>
            </div>

            <div className="bom-kpi-card bom-kpi-success">
              <div className="bom-kpi-icon">
                <Zap size={24} />
              </div>
              <div className="bom-kpi-details">
                <span className="bom-kpi-label">Active BOMs</span>
                <span className="bom-kpi-value">{stats.activeBOMs}</span>
              </div>
            </div>

            <div className="bom-kpi-card bom-kpi-warning">
              <div className="bom-kpi-icon">
                <AlertCircle size={24} />
              </div>
              <div className="bom-kpi-details">
                <span className="bom-kpi-label">Draft BOMs</span>
                <span className="bom-kpi-value">{stats.draftBOMs}</span>
              </div>
            </div>

            <div className="bom-kpi-card bom-kpi-info">
              <div className="bom-kpi-icon">
                <TrendingUp size={24} />
              </div>
              <div className="bom-kpi-details">
                <span className="bom-kpi-label">Total Cost</span>
                <span className="bom-kpi-value">₹{stats.totalCost.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bom-filter-section">
        <div className="bom-filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="bom-filter-group">
          <label>Search</label>
          <input type="text" name="search" placeholder="Search BOM or product..." value={filters.search} onChange={handleFilterChange} />
        </div>
      </div>

      {loading ? (
        <div className="bom-loading">
          <BarChart3 size={48} style={{ opacity: 0.5 }} />
          <p>Loading BOMs...</p>
        </div>
      ) : boms.length > 0 ? (
        <div className="bom-table-container">
          <DataTable 
            columns={columns}
            data={boms}
            renderActions={renderActions}
            filterable={true}
            sortable={true}
            pageSize={10}
          />
        </div>
      ) : (
        <div className="bom-no-data">
          <FileText size={48} style={{ opacity: 0.5 }} />
          <p>No BOMs found</p>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>Create your first BOM to get started</p>
        </div>
      )}
    </div>
  )
}
