import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import { BookOpen, Download, X, Grid3x3, List, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react'
import Button from '../../components/Button/Button'
import './Inventory.css'

export default function StockLedger() {
  const [ledgers, setLedgers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    warehouse_id: '',
    item_code: '',
    from_date: '',
    to_date: ''
  })
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [viewMode, setViewMode] = useState('table')

  useEffect(() => {
    fetchWarehouses()
    fetchItems()
  }, [])

  useEffect(() => {
    fetchLedger()
  }, [filters])

  useEffect(() => {
    const handleMaterialRequestApproved = () => {
      fetchLedger()
    }
    
    window.addEventListener('materialRequestApproved', handleMaterialRequestApproved)
    return () => window.removeEventListener('materialRequestApproved', handleMaterialRequestApproved)
  }, [filters])

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
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setFilters({
      warehouse_id: '',
      item_code: '',
      from_date: '',
      to_date: ''
    })
    setCurrentPage(1)
  }

  const getTransactionIcon = (type) => {
    const lowerType = type?.toLowerCase()
    if (lowerType === 'in' || lowerType === 'receipt') {
      return <TrendingUp size={16} className="text-green-500" />
    } else if (lowerType === 'out') {
      return <TrendingDown size={16} className="text-red-500" />
    }
    return <BookOpen size={16} className="text-blue-500" />
  }

  const getTransactionColor = (type) => {
    const lowerType = type?.toLowerCase()
    if (lowerType === 'in' || lowerType === 'receipt') return 'text-green-600 dark:text-green-400'
    if (lowerType === 'out') return 'text-red-600 dark:text-red-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  const totalPages = Math.ceil(ledgers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = ledgers.slice(startIndex, endIndex)

  const handleDownload = () => {
    const headers = ['Item Code', 'Warehouse', 'Date', 'Transaction Type', 'Qty In', 'Qty Out', 'Balance', 'Rate', 'Value']
    const csvContent = [
      headers.join(','),
      ...ledgers.map(row => {
        const balance = row.balance_qty || 0
        const rate = row.valuation_rate || 0
        const value = Number(row.transaction_value) || 0
        return `${row.item_code},${row.warehouse_name},${row.posting_date},${row.transaction_type},${row.qty_in || 0},${row.qty_out || 0},${balance},${rate},${value.toFixed(2)}`
      })
    ].join('\n')

    const link = document.createElement('a')
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent)
    link.download = `stock_ledger_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getTransactionBadge = (type) => {
    const badges = {
      'in': 'success',
      'out': 'danger',
      'receipt': 'success',
      'transfer': 'info',
      'adjustment': 'warning'
    }
    return badges[type] || 'secondary'
  }

  const columns = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'item_name', label: 'Item Name' },
    { key: 'warehouse_name', label: 'Warehouse' },
    {
      key: 'posting_date',
      label: 'Date',
      render: (value, row) => row ? new Date(row.posting_date).toLocaleDateString() : '-'
    },
    {
      key: 'transaction_type',
      label: 'Type',
      render: (value, row) => row ? <Badge>{row.transaction_type}</Badge> : '-'
    },
    {
      key: 'qty_in',
      label: 'In',
      render: (value, row) => row && row.qty_in ? `+${row.qty_in}` : '-'
    },
    {
      key: 'qty_out',
      label: 'Out',
      render: (value, row) => row && row.qty_out ? `-${row.qty_out}` : '-'
    },
    {
      key: 'balance_qty',
      label: 'Balance',
      render: (value, row) => row && row.balance_qty ? `${row.balance_qty}` : '-'
    },
    {
      key: 'valuation_rate',
      label: 'Rate',
      render: (value, row) => row ? `₹${row.valuation_rate || 0}` : '-'
    },
    {
      key: 'transaction_value',
      label: 'Value',
      render: (value, row) => row ? `₹${(Number(row.transaction_value) || 0).toFixed(2)}` : '-'
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-5 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <BookOpen size={28} className="text-blue-500" />
              Stock Ledger
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Track all stock movements and transactions</p>
          </div>
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}

        {ledgers.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row gap-3 flex-wrap">
            <select 
              name="warehouse_id" 
              value={filters.warehouse_id} 
              onChange={handleFilterChange}
              className="p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(wh => (
                <option key={wh.warehouse_id} value={wh.warehouse_id}>
                  {wh.warehouse_name}
                </option>
              ))}
            </select>

            <select 
              name="item_code" 
              value={filters.item_code} 
              onChange={handleFilterChange}
              className="p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Items</option>
              {items.map(item => (
                <option key={item.item_code} value={item.item_code}>
                  {item.item_code}
                </option>
              ))}
            </select>

            <input 
              type="date" 
              name="from_date" 
              value={filters.from_date} 
              onChange={handleFilterChange}
              className="p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="date" 
              name="to_date" 
              value={filters.to_date} 
              onChange={handleFilterChange}
              className="p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {(filters.warehouse_id || filters.item_code || filters.from_date || filters.to_date) && (
              <button 
                onClick={handleClearFilters}
                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 text-sm"
              >
                <X size={14} />
                Clear
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                title="Table view"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-blue-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                title="Card view"
              >
                <Grid3x3 size={18} />
              </button>
            </div>
            <button
              onClick={handleDownload}
              className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 text-sm ml-auto"
            >
              <Download size={14} />
              Download
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4 animate-pulse">
              <BookOpen size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Loading stock ledger...</p>
          </div>
        ) : ledgers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4">
              <BookOpen size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Ledger Entries Found</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md">Ledger entries will appear once stock movements are recorded.</p>
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-x-auto ">
            <DataTable columns={columns} data={ledgers} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedData.map((entry, idx) => (
                <div key={idx} className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30 p-3 border-b border-neutral-200 dark:border-neutral-700">
                    <h3 className="font-bold text-neutral-900 dark:text-white">{entry.item_code}</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{entry.item_name}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Date</p>
                        <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{new Date(entry.posting_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Warehouse</p>
                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{entry.warehouse_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">In</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{entry.qty_in ? `+${entry.qty_in}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Out</p>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">{entry.qty_out ? `-${entry.qty_out}` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Balance</p>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white">{entry.balance_qty || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Rate</p>
                        <p className="text-xs font-semibold  text-neutral-900 dark:text-white">₹{entry.valuation_rate || 0}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                      {getTransactionIcon(entry.transaction_type)}
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Type</p>
                        <p className={`text-xs font-bold ${getTransactionColor(entry.transaction_type)}`}>
                          {entry.transaction_type}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Value</p>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">₹{(Number(entry.transaction_value) || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, ledgers.length)} of {ledgers.length} entries
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
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
                    className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
