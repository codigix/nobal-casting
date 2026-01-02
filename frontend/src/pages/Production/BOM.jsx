import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, BarChart3, AlertCircle, Zap, TrendingUp, FileText, Trash } from 'lucide-react'
import * as productionService from '../../services/productionService'
import DataTable from '../../components/Table/DataTable'
import { useToast } from '../../components/ToastContainer'

export default function BOM() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
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
      
      // Fetch sales orders to calculate total quantity
      let bomsWithTotals = bomData
      try {
        const token = localStorage.getItem('token')
        const soResponse = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const soData = await soResponse.json()
        const allSalesOrders = soData.data || []
        
        // Add sales order item count to each BOM
        bomsWithTotals = bomData.map(bom => {
          const relatedSOs = allSalesOrders.filter(so => so.item_code === bom.item_code)
          const totalItems = relatedSOs.reduce((sum, so) => sum + (parseFloat(so.qty) || 0), 0)
          const totalQty = totalItems > 0 ? parseFloat(bom.quantity || 0) * totalItems : 0
          return { 
            ...bom, 
            totalItems, 
            totalQty,
            soCount: relatedSOs.length 
          }
        })
      } catch (soErr) {
        console.error('Failed to fetch sales orders:', soErr)
      }
      
      setBOMs(bomsWithTotals)
      
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

  const handleTruncate = async () => {
    if (window.confirm('⚠️ Warning: This will permanently delete ALL BOMs. Are you sure?')) {
      try {
        setLoading(true)
        await fetch(`${import.meta.env.VITE_API_URL}/production/boms/truncate/all`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        setSuccess('All BOMs truncated successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchBOMs()
      } catch (err) {
        setError('Failed to truncate BOMs')
        toast?.error('Failed to truncate BOMs')
      }
    }
  }

  const handleEdit = (bom) => {
    navigate(`/manufacturing/bom/${bom.bom_id}`)
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
      key: 'item_code',
      label: 'Item',
      render: (value, row) => (
        <div 
          onClick={() => handleEdit(row)}
          className="cursor-pointer hover:text-blue-600 transition"
        >
          <div className="font-semibold"> {row.product_name}</div>
          <div className="text-xs text-gray-600">{row.bom_id}</div>
        </div>
      )
    },
    {
      key: 'is_active',
      label: 'Is Active',
      render: (value, row) => (
        <input type="checkbox" checked={row.is_active !== false} readOnly className="cursor-pointer" />
      )
    },
    {
      key: 'is_default',
      label: 'Is Default',
      render: (value, row) => (
        <input type="checkbox" checked={row.is_default === true} readOnly className="cursor-pointer" />
      )
    },
    {
      key: 'quantity',
      label: 'BOM QTY',
      render: (value, row) => (
        <div className="text-left font-semibold">{parseFloat(row.quantity || 0).toFixed(2)} {row.uom}</div>
      )
    },
   
    {
      key: 'total_cost',
      label: 'Total Cost',
      render: (value, row) => {
        const costPerUnit = parseFloat(row.total_cost || 0) / parseFloat(row.quantity || 1)
        return <div className="text-left">₹{costPerUnit.toFixed(2)}</div>
      }
    },
    {
      key: 'updated_at',
      label: 'Last Updated On',
      render: (value, row) => (
        <div className="text-sm text-gray-600">
          {row.updated_at ? new Date(row.updated_at).toLocaleDateString('en-IN') : 'N/A'}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, row) => (
        <span className={`work-order-status ${getStatusColor(row.status)} inline-block rounded px-2 py-1 text-xs capitalize`}>
          {row.status || 'Draft'}
        </span>
      )
    },
  ]

  const renderActions = (row) => (
    <div className="flex items-center justify-center gap-1">
      <button className="btn-edit rounded-md p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors" onClick={() => handleEdit(row)} title="Edit"><Edit2 size={16} /></button>
      <button className="btn-delete rounded-md p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors" onClick={() => handleDelete(row.bom_id)} title="Delete"><Trash2 size={16} /></button>
    </div>
  )

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6 min-h-screen">
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">📋 Bill of Materials</h1>
          <p className="text-sm text-gray-600">Manage product BOMs and components</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/manufacturing/bom/new')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> New BOM
          </button>
          <button 
            onClick={handleTruncate}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-xs hover:bg-red-700 text-white rounded-md transition-colors"
            title="Delete all BOMs"
          >
            <Trash size={18} /> Truncate All
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-2 text-sm text-green-800">
          <span>✓</span> {success}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-2 text-sm text-red-800">
          <span>✕</span> {error}
        </div>
      )}

      {/* Stats */}
      {!loading && (
        <div className="mb-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-blue-500 bg-white p-4">
            <div className="text-2xl text-blue-600">
              <FileText size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Total BOMs</div>
              <div className="text-xl font-bold text-gray-900">{stats.totalBOMs}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-green-500 bg-white p-4">
            <div className="text-2xl text-green-600">
              <Zap size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Active BOMs</div>
              <div className="text-xl font-bold text-gray-900">{stats.activeBOMs}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-amber-500 bg-white p-4">
            <div className="text-2xl text-amber-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Draft BOMs</div>
              <div className="text-xl font-bold text-gray-900">{stats.draftBOMs}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-purple-500 bg-white p-4">
            <div className="text-2xl text-purple-600">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600">Total Cost</div>
              <div className="text-xl font-bold text-gray-900">₹{stats.totalCost.toFixed(0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-semibold text-gray-700">Status</label>
          <select 
            name="status" 
            value={filters.status} 
            onChange={handleFilterChange}
            className=" border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 cursor-pointer transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <label className="text-xs font-semibold text-gray-700">Search</label>
          <input 
            type="text" 
            name="search" 
            placeholder="Search BOM or product..." 
            value={filters.search} 
            onChange={handleFilterChange}
            className=" border border-gray-300 bg-white p-2 text-xs text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-white py-12 text-gray-500">
          <BarChart3 size={48} className="mb-3 opacity-50" />
          <p className="text-sm">Loading BOMs...</p>
        </div>
      ) : boms.length > 0 ? (
        <div className="overflow-hidden ">
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
        <div className="flex flex-col items-center justify-center rounded-lg bg-gray-50 py-12 text-gray-500">
          <FileText size={48} className="mb-3 opacity-50" />
          <p className="text-sm">No BOMs found</p>
          <p className="mt-2 text-xs text-gray-400">Create your first BOM to get started</p>
        </div>
      )}
    </div>
  )
}
