import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Button from '../../components/Button/Button'
import { BarChart3, X, Grid3x3, List, TrendingUp, AlertTriangle, Package, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import StockMovementModal from '../../components/Inventory/StockMovementModal'
import './Inventory.css'

export default function StockBalance() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [warehouses, setWarehouses] = useState([])
  const [stats, setStats] = useState({ total: 0, low: 0, outOfStock: 0 })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState('table')
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedStockItem, setSelectedStockItem] = useState(null)

  useEffect(() => {
    fetchWarehouses()
    fetchStockBalance()
  }, [warehouseFilter])

  useEffect(() => {
    const handleMaterialRequestApproved = () => {
      fetchStockBalance()
    }
    
    window.addEventListener('materialRequestApproved', handleMaterialRequestApproved)
    return () => window.removeEventListener('materialRequestApproved', handleMaterialRequestApproved)
  }, [warehouseFilter])

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchStockBalance = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (warehouseFilter) params.append('warehouse_id', warehouseFilter)
      
      const response = await api.get(`/stock/stock-balance?${params}`)
      const stockData = Array.isArray(response.data.data) ? response.data.data : []
      
      // Calculate statistics
      const lowStock = stockData.filter(s => s.current_qty <= (s.reorder_level || 0)).length
      const outOfStock = stockData.filter(s => s.current_qty === 0).length
      
      setStocks(stockData)
      setStats({
        total: stockData.length,
        low: lowStock,
        outOfStock: outOfStock
      })
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock balance')
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity === 0) return { text: 'Out of Stock', badge: 'danger', color: '#ef4444' }
    if (quantity <= (reorderLevel || 0)) return { text: 'Low Stock', badge: 'warning', color: '#f59e0b' }
    return { text: 'In Stock', badge: 'success', color: '#10b981' }
  }

  const getStockStatusValue = (quantity, reorderLevel) => {
    if (quantity === 0) return 'out-of-stock'
    if (quantity <= (reorderLevel || 0)) return 'low-stock'
    return 'in-stock'
  }

  const getStatusIcon = (quantity, reorderLevel) => {
    if (quantity === 0) return <AlertTriangle size={16} className="text-red-500" />
    if (quantity <= (reorderLevel || 0)) return <AlertTriangle size={16} className="text-amber-500" />
    return <TrendingUp size={16} className="text-green-500" />
  }

  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = stock.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          stock.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '' || getStockStatusValue(stock.current_qty || 0, stock.reorder_level) === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredStocks.slice(startIndex, endIndex)

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setWarehouseFilter('')
    setCurrentPage(1)
  }

  const columns = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'item_group', label: 'Item Group' },
    { key: 'warehouse_name', label: 'Warehouse' },
    {
      key: 'current_qty',
      label: 'Current Stock',
      render: (value) => <strong>{Number(value || 0).toFixed(2)}</strong>
    },
    { key: 'uom', label: 'UOM' },
    {
      key: 'available_qty',
      label: 'Available Qty',
      render: (value) => <strong>{Number(value || 0).toFixed(2)}</strong>
    },

    {
      key: 'last_receipt_date',
      label: 'Last Receipt',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'last_issue_date',
      label: 'Last Issue',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },

    {
      key: 'in_quantity',
      label: 'Inward Movement',
      render: (value, row) => {
        if (!row) return null
        const qty = Number(value || 0)
        const val = Number(row.in_value || 0)
        return (
          <div className="flex gap-1 min-w-max">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded p-1 flex gap-2">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">↓ {qty.toFixed(2)}</span>
              <span className="text-xs text-green-600 dark:text-green-500 block">₹{val.toFixed(2)}</span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'out_quantity',
      label: 'Outward Movement',
      render: (value, row) => {
        if (!row) return null
        const qty = Number(value || 0)
        const val = Number(row.out_value || 0)
        return (
          <div className="flex gap-1 min-w-max">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-1 flex gap-2">
              <span className="text-xs font-semibold text-red-700 dark:text-red-400">↑ {qty.toFixed(2)}</span>
              <span className="text-xs text-red-600 dark:text-red-500 block">₹{val.toFixed(2)}</span>
            </div>
          </div>
        )
      }
    },

    {
      key: 'stock_status',
      label: 'Status',
      render: (value, row) => {
        if (!row) return null
        const status = getStockStatus(row.current_qty, row.reorder_level)
        return <Badge className={status.class}>{status.text}</Badge>
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => {
        if (!row) return null
        return (
          <div className="flex gap-2">
            <Button
              variant="success"
              size="sm"
              onClick={() => { setSelectedStockItem({ ...row, movement_type: 'IN' }); setShowMovementModal(true) }}
              className="text-xs flex items-center gap-1"
            >
              <ArrowDown size={14} /> IN
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setSelectedStockItem({ ...row, movement_type: 'OUT' }); setShowMovementModal(true) }}
              className="text-xs flex items-center gap-1"
            >
              <ArrowUp size={14} /> OUT
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-2 sm:p-5 lg:p-3">
      <div className=" mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl OEE Intelligence text-neutral-900 dark:text-white flex items-center gap-3">
              <BarChart3 size={28} className="text-amber-500" />
              Stock Balance
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Monitor inventory levels across all warehouses</p>
          </div>
          <button
            onClick={fetchStockBalance}
            disabled={loading}
            className="flex items-center gap-2 p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xs font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-950/40 rounded-xs p-2 border border-blue-200 dark:border-blue-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 ">Total Items</p>
                <p className="text-xl  OEE Intelligence text-blue-900 dark:text-blue-100 mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-blue-200 dark:bg-blue-900/50 rounded-xs">
                <Package size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-950/40 rounded-xs p-2 border border-amber-200 dark:border-amber-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 ">Low Stock</p>
                <p className="text-xl  OEE Intelligence text-amber-900 dark:text-amber-100 mt-1">{stats.low}</p>
              </div>
              <div className="p-2 bg-amber-200 dark:bg-amber-900/50 rounded-xs">
                <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-950/40 rounded-xs p-2 border border-red-200 dark:border-red-900">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700 dark:text-red-400 ">Out of Stock</p>
                <p className="text-xl  OEE Intelligence text-red-900 dark:text-red-100 mt-1">{stats.outOfStock}</p>
              </div>
              <div className="p-2 bg-red-200 dark:bg-red-900/50 rounded-xs">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {stocks.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by item code or name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="flex-1 p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <select 
              value={warehouseFilter} 
              onChange={(e) => {
                setWarehouseFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>
                  {wh.warehouse_name}
                </option>
              ))}
            </select>
            <select 
              value={statusFilter} 
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="p-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
            {(searchTerm || statusFilter || warehouseFilter) && (
              <button 
                onClick={handleClearFilters}
                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 text-xs"
              >
                <X size={14} />
                Clear
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-xs transition-all ${viewMode === 'table' ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                title="Table view"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-xs transition-all ${viewMode === 'card' ? 'bg-amber-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                title="Card view"
              >
                <Grid3x3 size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-2 mb-4 animate-pulse">
              <BarChart3 size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Loading stock balance...</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-80 0 p-2 mb-4">
              <BarChart3 size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <h3 className="text-lg  text-neutral-900 dark:text-white mb-2">No Stock Items Found</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md">Try adjusting your search or filters.</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className=" ">
            <DataTable 
              columns={columns} 
              data={filteredStocks}
              pageSize={itemsPerPage}
              filterable={true}
              sortable={true}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.map((stock) => (
              <div key={`${stock.item_code}-${stock.warehouse_name}`} className="bg-white dark:bg-neutral-800 rounded-xs border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 p-3 border-b border-neutral-200 dark:border-neutral-700">
                  <h3 className=" text-neutral-900 dark:text-white">{stock.item_code}</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{stock.item_name}</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Current Stock</p>
                      <p className="text-xs  text-neutral-900 dark:text-white">{Number(stock.current_qty || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Available Qty</p>
                      <p className="text-xs  text-green-600 dark:text-green-400">{Number(stock.available_qty || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Reserved Qty</p>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">{Number(stock.reserved_qty || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">UOM</p>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">{stock.uom || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Total Value</p>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">₹{Number(stock.total_value || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Valuation Rate</p>
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white">₹{Number(stock.valuation_rate || 0).toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Last Receipt</p>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{stock.last_receipt_date ? new Date(stock.last_receipt_date).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Last Issue</p>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{stock.last_issue_date ? new Date(stock.last_issue_date).toLocaleDateString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Warehouse</p>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{stock.warehouse_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Item Group</p>
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{stock.item_group || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    {getStatusIcon(stock.current_qty, stock.reorder_level)}
                    <div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Status</p>
                      <p className="text-xs " style={{ color: getStockStatus(stock.current_qty, stock.reorder_level).color }}>
                        {getStockStatus(stock.current_qty, stock.reorder_level).text}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Card Pagination */}
        {viewMode === 'card' && totalPages > 1 && (
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-neutral-600 dark:text-neutral-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredStocks.length)} of {filteredStocks.length} items
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1.5 rounded-xs text-xs font-medium transition-all ${
                      currentPage === page
                        ? 'bg-amber-500 text-white'
                        : 'border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-xs text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Stock Movement Modal */}
        {showMovementModal && (
          <StockMovementModal
            initialItem={selectedStockItem}
            onClose={() => { setShowMovementModal(false); setSelectedStockItem(null) }}
            onSuccess={() => { setShowMovementModal(false); setSelectedStockItem(null); fetchStockBalance() }}
          />
        )}
      </div>
    </div>
  )
}