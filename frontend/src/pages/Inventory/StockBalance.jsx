import React, { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Button from '../../components/Button/Button'
import { BarChart3, X, Grid3x3, List, TrendingUp, AlertTriangle, Package, ArrowDown, ArrowUp, RefreshCw, Settings2, Search, LayoutGrid, Table as TableIcon, RotateCcw } from 'lucide-react'
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
  const [viewMode, setViewMode] = useState('table')
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedStockItem, setSelectedStockItem] = useState(null)
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState(new Set(['item_code', 'item_name', 'warehouse_name', 'current_qty', 'uom', 'available_qty', 'stock_status']))

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
    if (quantity === 0) return { text: 'Out of Stock', variant: 'danger' }
    if (quantity <= (reorderLevel || 0)) return { text: 'Low Stock', variant: 'warning' }
    return { text: 'In Stock', variant: 'success' }
  }

  const getStockStatusValue = (quantity, reorderLevel) => {
    if (quantity === 0) return 'out-of-stock'
    if (quantity <= (reorderLevel || 0)) return 'low-stock'
    return 'in-stock'
  }

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const matchesSearch = stock.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            stock.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === '' || getStockStatusValue(stock.current_qty || 0, stock.reorder_level) === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [stocks, searchTerm, statusFilter])

  const latestItem = useMemo(() => {
    if (!stocks || stocks.length === 0) return null;
    return [...stocks].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0))[0];
  }, [stocks])

  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setWarehouseFilter('')
  }

  const columns = useMemo(() => [
    { key: 'item_code', label: 'Item Code' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'item_group', label: 'Item Group' },
    { key: 'warehouse_name', label: 'Warehouse' },
    {
      key: 'in_quantity',
      label: 'Total In',
      render: (value) => <span className="text-green-600 font-medium">{Number(value || 0).toFixed(2)}</span>
    },
    {
      key: 'out_quantity',
      label: 'Total Out',
      render: (value) => <span className="text-red-600 font-medium">{Number(value || 0).toFixed(2)}</span>
    },
    {
      key: 'current_qty',
      label: 'Current Stock',
      render: (value) => <span className="">{Number(value || 0).toFixed(2)}</span>
    },
    { key: 'uom', label: 'UOM' },
    {
      key: 'available_qty',
      label: 'Available Qty',
      render: (value) => <span className="">{Number(value || 0).toFixed(2)}</span>
    },
    {
      key: 'last_receipt_date',
      label: 'Last Receipt',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'stock_status',
      label: 'Status',
      render: (value, row) => {
        const status = getStockStatus(row.current_qty, row.reorder_level)
        return <Badge variant={status.variant}>{status.text}</Badge>
      }
    }
  ], [])

  const renderActions = (row) => (
    <div className="flex gap-2">
      <button
        onClick={() => { setSelectedStockItem({ ...row, movement_type: 'IN' }); setShowMovementModal(true) }}
        className="flex items-center gap-1 px-2 py-1 text-[10px]  bg-green-50 text-green-700 border border-green-200 rounded-xs hover:bg-green-100 transition-colors"
      >
        <ArrowDown size={12} /> IN
      </button>
      <button
        onClick={() => { setSelectedStockItem({ ...row, movement_type: 'OUT' }); setShowMovementModal(true) }}
        className="flex items-center gap-1 px-2 py-1 text-[10px]  bg-red-50 text-red-700 border border-red-200 rounded-xs hover:bg-red-100 transition-colors"
      >
        <ArrowUp size={12} /> OUT
      </button>
    </div>
  )

  const toggleColumn = (key) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        if (newSet.size > 1) newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl  text-neutral-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={24} className="text-amber-500" />
              Stock Balance
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Monitor inventory levels across all warehouses</p>
          </div>
          <button
            onClick={fetchStockBalance}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xs transition-all shadow-sm active:transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px]  text-neutral-400  tracking-wider">Total Items</p>
                <p className="text-2xl  text-neutral-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-xs">
                <Package size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px]  text-neutral-400  tracking-wider">Low Stock</p>
                <p className="text-2xl  text-amber-600 mt-1">{stats.low}</p>
              </div>
              <div className="p-2 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-xs">
                <AlertTriangle size={20} />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 border border-neutral-200 dark:border-neutral-800 rounded-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px]  text-neutral-400  tracking-wider">Out of Stock</p>
                <p className="text-2xl  text-red-600 mt-1">{stats.outOfStock}</p>
              </div>
              <div className="p-2 bg-red-50 dark:bg-red-950/30 text-red-600 rounded-xs">
                <AlertTriangle size={20} />
              </div>
            </div>
          </div>
        </div>

        {latestItem && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xs p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center text-amber-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[10px]  text-amber-600  tracking-wider">Latest Stock Movement</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm  text-neutral-900 dark:text-white">{latestItem.item_name} ({latestItem.item_code})</span>
                  <span className="text-xs text-neutral-500">•</span>
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{latestItem.warehouse_name}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs  text-neutral-900 dark:text-white">{Number(latestItem.current_qty).toFixed(2)} {latestItem.uom}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Updated {new Date(latestItem.updated_at).toLocaleString()}</p>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-[140px]"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.warehouse_name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500 min-w-[140px]"
              >
                <option value="">All Status</option>
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              {(searchTerm || statusFilter || warehouseFilter) && (
                <button
                  onClick={handleClearFilters}
                  className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                  title="Clear filters"
                >
                  <RotateCcw size={16} />
                </button>
              )}

              <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xs">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'card' ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>

              <div className="relative ml-auto">
                <button
                  onClick={() => setShowColumnMenu(!showColumnMenu)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border rounded-xs transition-all ${showColumnMenu ? 'bg-neutral-100 border-neutral-300' : 'bg-white border-neutral-200 hover:border-neutral-300'}`}
                >
                  <Settings2 size={14} />
                  Columns
                </button>

                {showColumnMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs shadow-xl z-20 py-2">
                      <div className="px-3 py-1 text-[10px]  text-neutral-400  tracking-wider border-b border-neutral-100 dark:border-neutral-700 mb-1">
                        Visible Columns
                      </div>
                      {columns.map(col => (
                        <label key={col.key} className="flex items-center px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="w-3.5 h-3.5 rounded-xs border-neutral-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="ml-2 text-xs text-neutral-700 dark:text-neutral-300">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs text-neutral-500">Loading stock balance...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">No stock items found</h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  {searchTerm || statusFilter || warehouseFilter 
                    ? "Try adjusting your filters to find what you're looking for." 
                    : "Stock balance will appear here once items are added."}
                </p>
                {(searchTerm || statusFilter || warehouseFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 text-xs text-amber-600 font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <DataTable
                columns={columns}
                data={filteredStocks}
                renderActions={renderActions}
                externalVisibleColumns={visibleColumns}
                hideColumnToggle={true}
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-neutral-50/50 dark:bg-neutral-950/50">
                {filteredStocks.map((stock) => {
                  const status = getStockStatus(stock.current_qty, stock.reorder_level)
                  return (
                    <div
                      key={`${stock.item_code}-${stock.warehouse_id}`}
                      className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden hover:shadow-md transition-all duration-300"
                    >
                      <div className={`h-1.5 w-full ${status.variant === 'danger' ? 'bg-red-500' : status.variant === 'warning' ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xs text-neutral-500">
                              <Package size={16} />
                            </div>
                            <div>
                              <h3 className="text-sm  text-neutral-900 dark:text-white group-hover:text-amber-600 transition-colors">
                                {stock.item_code}
                              </h3>
                              <p className="text-[10px] text-neutral-500   tracking-wider">
                                {stock.item_group}
                              </p>
                            </div>
                          </div>
                          <Badge variant={status.variant} className="text-[10px] px-1.5 py-0">
                            {status.text}
                          </Badge>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                            {stock.item_name}
                          </p>
                          
                          <div className="flex items-center gap-1.5">
                            <LayoutGrid size={12} className="text-neutral-400" />
                            <span className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">{stock.warehouse_name}</span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-neutral-400  tracking-tight">Stock</span>
                              <span className="text-xs  text-neutral-900 dark:text-white">
                                {Number(stock.current_qty).toFixed(2)} {stock.uom}
                              </span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setSelectedStockItem({ ...stock, movement_type: 'IN' }); setShowMovementModal(true) }}
                                className="p-1.5 bg-green-50 text-green-600 rounded-xs hover:bg-green-100"
                                title="Stock In"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                onClick={() => { setSelectedStockItem({ ...stock, movement_type: 'OUT' }); setShowMovementModal(true) }}
                                className="p-1.5 bg-red-50 text-red-600 rounded-xs hover:bg-red-100"
                                title="Stock Out"
                              >
                                <ArrowUp size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMovementModal && selectedStockItem && (
        <StockMovementModal
          isOpen={showMovementModal}
          onClose={() => { setShowMovementModal(false); setSelectedStockItem(null) }}
          item={selectedStockItem}
          onSuccess={fetchStockBalance}
        />
      )}
    </div>
  )
}
