import React, { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import { BookOpen, Download, X, Grid3x3, List, TrendingDown, TrendingUp, RefreshCw, Settings2, Search, LayoutGrid, Table as TableIcon, RotateCcw } from 'lucide-react'
import Button from '../../components/Button/Button'
import './Inventory.css'

const TABS = [
  { id: 'all', label: 'All Transactions', types: [] },
  { id: 'issue', label: 'Material Issue', types: ['Issue', 'Consumption', 'Manufacturing Issue'] },
  { id: 'transfer', label: 'Material Transfer', types: ['Transfer'] },
  { id: 'purchase', label: 'Purchase', types: ['Purchase Receipt'] },
]

export default function StockLedger() {
  const [ledgers, setLedgers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState({
    warehouse_id: '',
    item_code: '',
    from_date: '',
    to_date: '',
    search: ''
  })
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [viewMode, setViewMode] = useState('table')
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState(new Set(['item_code', 'item_name', 'warehouse_name', 'posting_date', 'transaction_type', 'qty_in', 'balance_qty', 'reference_name']))

  useEffect(() => {
    fetchWarehouses()
    fetchItems()
  }, [])

  useEffect(() => {
    fetchLedger()
  }, [filters.warehouse_id, filters.item_code, filters.from_date, filters.to_date])

  useEffect(() => {
    const handleMaterialRequestApproved = () => {
      fetchLedger()
    }
    
    window.addEventListener('materialRequestApproved', handleMaterialRequestApproved)
    return () => window.removeEventListener('materialRequestApproved', handleMaterialRequestApproved)
  }, [])

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get('/items?limit=1000')
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchLedger = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id)
      if (filters.item_code) params.append('item_code', filters.item_code)
      if (filters.from_date) params.append('from_date', filters.from_date)
      if (filters.to_date) params.append('to_date', filters.to_date)

      const response = await api.get(`/stock/ledger?${params}`)
      setLedgers(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock ledger')
      setLedgers([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters({ ...filters, [name]: value })
  }

  const handleClearFilters = () => {
    setFilters({
      warehouse_id: '',
      item_code: '',
      from_date: '',
      to_date: '',
      search: ''
    })
  }

  const filteredLedgers = useMemo(() => {
    let result = ledgers
    
    // Tab filtering
    const currentTab = TABS.find(t => t.id === activeTab)
    if (currentTab && currentTab.types.length > 0) {
      result = result.filter(l => currentTab.types.includes(l.transaction_type))
    }

    if (!filters.search) return result
    const searchLower = filters.search.toLowerCase()
    return result.filter(ledger => (
      ledger.item_code?.toLowerCase().includes(searchLower) ||
      ledger.item_name?.toLowerCase().includes(searchLower) ||
      ledger.warehouse_name?.toLowerCase().includes(searchLower) ||
      ledger.transaction_type?.toLowerCase().includes(searchLower) ||
      ledger.reference_name?.toLowerCase().includes(searchLower)
    ))
  }, [ledgers, filters.search, activeTab])

  const handleDownload = () => {
    const headers = ['Item Code', 'Item Name', 'Warehouse', 'Date', 'Transaction Type', 'Reference', 'Qty In', 'Qty Out', 'Balance', 'Rate', 'Value']
    const csvContent = [
      headers.join(','),
      ...filteredLedgers.map(row => {
        const balance = row.balance_qty || 0
        const rate = row.valuation_rate || 0
        const value = Number(row.transaction_value) || 0
        const reference = row.reference_name ? `${row.reference_doctype}: ${row.reference_name}` : '-'
        return `"${row.item_code}","${row.item_name}","${row.warehouse_name}",${row.posting_date},"${row.transaction_type}","${reference}",${row.qty_in || 0},${row.qty_out || 0},${balance},${rate},${value.toFixed(2)}`
      })
    ].join('\n')

    const link = document.createElement('a')
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
    link.download = `stock_ledger_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const columns = useMemo(() => [
    { key: 'item_code', label: 'Item Code' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'warehouse_name', label: 'Warehouse' },
    {
      key: 'posting_date',
      label: 'Date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (value) => value ? <Badge variant="secondary" className="capitalize">{value}</Badge> : '-'
    },
    {
      key: 'reference_name',
      label: 'Reference',
      render: (value, row) => row.reference_name ? (
        <div className="flex flex-col">
          <span className="text-xs font-medium">{row.reference_name}</span>
          <span className="text-[10px] text-neutral-500">{row.reference_doctype}</span>
        </div>
      ) : '-'
    },
    {
      key: 'qty_in',
      label: 'Movement',
      render: (value, row) => {
        if (!row) return '-'
        const qtyIn = Number(row.qty_in || 0)
        const qtyOut = Number(row.qty_out || 0)
        const transValue = Number(row.transaction_value || 0)
        
        if (qtyIn > 0) {
          return (
            <div className="flex flex-col">
              <span className="text-xs  text-green-600 dark:text-green-400">+{qtyIn}</span>
              <span className="text-[10px] text-neutral-500">₹{transValue.toFixed(2)}</span>
            </div>
          )
        } else if (qtyOut > 0) {
          return (
            <div className="flex flex-col">
              <span className="text-xs  text-red-600 dark:text-red-400">-{qtyOut}</span>
              <span className="text-[10px] text-neutral-500">₹{transValue.toFixed(2)}</span>
            </div>
          )
        }
        return '-'
      }
    },
    {
      key: 'balance_qty',
      label: 'Balance',
      render: (value) => {
        const balance = Number(value || 0)
        return (
          <span className={`text-xs  ${balance > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500'}`}>
            {balance.toFixed(2)}
          </span>
        )
      }
    },
    {
      key: 'valuation_rate',
      label: 'Rate',
      render: (value) => value ? `₹${Number(value).toFixed(2)}` : '-'
    }
  ], [activeTab])

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
              <BookOpen size={24} className="text-blue-500" />
              Stock Ledger
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Track all stock movements and transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs  rounded-xs transition-all hover:bg-neutral-50"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs  rounded-xs transition-all   active:transform active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {error && <Alert type="danger" className="mb-4">{error}</Alert>}

        <div className="flex border-b border-neutral-200 dark:border-neutral-800 mb-4 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden">
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
                <input
                  type="text"
                  placeholder="Search item, warehouse..."
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <select
                name="warehouse_id"
                value={filters.warehouse_id}
                onChange={handleFilterChange}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">All Warehouses</option>
                {warehouses.map(wh => (
                  <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                ))}
              </select>

              <select
                name="item_code"
                value={filters.item_code}
                onChange={handleFilterChange}
                className="px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[140px]"
              >
                <option value="">All Items</option>
                {items.map(item => (
                  <option key={item.item_code} value={item.item_code}>{item.item_code}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleFilterChange}
                  className="px-2 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-neutral-400">-</span>
                <input
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleFilterChange}
                  className="px-2 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {(filters.search || filters.warehouse_id || filters.item_code || filters.from_date || filters.to_date) && (
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
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-700   text-blue-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  title="Table View"
                >
                  <TableIcon size={14} />
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-1.5 rounded-xs transition-all ${viewMode === 'card' ? 'bg-white dark:bg-neutral-700   text-blue-600' : 'text-neutral-500 hover:text-neutral-700'}`}
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
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs shadow  z-20 py-2">
                      <div className="px-3 py-1 text-[10px]  text-neutral-400  tracking-wider border-b border-neutral-100 dark:border-neutral-700 mb-1">
                        Visible Columns
                      </div>
                      {columns.map(col => (
                        <label key={col.key} className="flex items-center px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns.has(col.key)}
                            onChange={() => toggleColumn(col.key)}
                            className="w-3.5 h-3.5 rounded-xs border-neutral-300 text-blue-500 focus:ring-blue-500"
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
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs text-neutral-500">Loading stock ledger...</p>
              </div>
            ) : filteredLedgers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                  <BookOpen size={24} className="text-neutral-400" />
                </div>
                <h3 className="text-sm  text-neutral-900 dark:text-white">
                  {activeTab !== 'all' ? `No ${TABS.find(t => t.id === activeTab).label} entries found` : 'No ledger entries found'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  {filters.search || filters.warehouse_id || filters.item_code 
                    ? "Try adjusting your filters to find what you're looking for." 
                    : activeTab !== 'all' 
                      ? `There are no ${TABS.find(t => t.id === activeTab).label.toLowerCase()} movements recorded.`
                      : "Stock movements will appear here once transactions are recorded."}
                </p>
                {(filters.search || filters.warehouse_id || filters.item_code) && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 text-xs text-blue-600 font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <DataTable
                columns={columns}
                data={filteredLedgers}
                externalVisibleColumns={visibleColumns}
                hideColumnToggle={true}
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-neutral-50/50 dark:bg-neutral-950/50">
                {filteredLedgers.map((entry, idx) => (
                  <div
                    key={idx}
                    className="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden hover: transition-all duration-300"
                  >
                    <div className={`h-1.5 w-full ${Number(entry.qty_in) > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xs ${Number(entry.qty_in) > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                            {Number(entry.qty_in) > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </div>
                          <div>
                            <h3 className="text-sm  text-neutral-900 dark:text-white group-hover:text-blue-600 transition-colors">
                              {entry.item_code}
                            </h3>
                            <p className="text-[10px] text-neutral-500   tracking-wider">
                              {entry.transaction_type}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {new Date(entry.posting_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                          {entry.item_name}
                        </p>
                        
                        {entry.reference_name && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen size={12} className="text-blue-500" />
                            <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate">
                              {entry.reference_name}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5">
                          <LayoutGrid size={12} className="text-neutral-400" />
                          <span className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">{entry.warehouse_name}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-neutral-400  ">Movement</span>
                            <span className={`text-xs  ${Number(entry.qty_in) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {Number(entry.qty_in) > 0 ? `+${entry.qty_in}` : `-${entry.qty_out}`}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-neutral-400  ">Balance</span>
                            <span className="text-xs  text-blue-600">
                              {Number(entry.balance_qty).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
