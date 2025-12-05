import React, { useState, useEffect } from 'react'
import axios from 'axios'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import Button from '../../components/Button/Button'
import { Search, BarChart3, X } from 'lucide-react'
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
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchWarehouses()
    fetchStockBalance()
  }, [warehouseFilter])

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/stock/warehouses')
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
      
      const response = await axios.get(`/api/stock/stock-balance?${params}`)
      const stockData = response.data.data || []
      
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
    if (quantity === 0) return { text: 'Out of Stock', class: 'status-out-of-stock' }
    if (quantity <= (reorderLevel || 0)) return { text: 'Low Stock', class: 'status-low-stock' }
    return { text: 'In Stock', class: 'status-in-stock' }
  }

  const getStockStatusValue = (quantity, reorderLevel) => {
    if (quantity === 0) return 'out-of-stock'
    if (quantity <= (reorderLevel || 0)) return 'low-stock'
    return 'in-stock'
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
      label: 'Balance Qty',
      render: (value) => Number(value || 0).toFixed(2)
    },
    {
      key: 'total_value',
      label: 'Balance Value',
      render: (value) => `₹${Number(value || 0).toFixed(2)}`
    },
    {
      key: 'opening_qty',
      label: 'Opening Qty',
      render: (value) => Number(value || 0).toFixed(2)
    },
    {
      key: 'opening_value',
      label: 'Opening Value',
      render: (value) => `₹${Number(value || 0).toFixed(2)}`
    },
    {
      key: 'in_quantity',
      label: 'IN Quantity',
      render: (value) => Number(value || 0).toFixed(2)
    },
    {
      key: 'in_value',
      label: 'IN Value',
      render: (value) => `₹${Number(value || 0).toFixed(2)}`
    },
    {
      key: 'out_quantity',
      label: 'OUT Quantity',
      render: (value) => Number(value || 0).toFixed(2)
    },
    {
      key: 'out_value',
      label: 'OUT Value',
      render: (value) => `₹${Number(value || 0).toFixed(2)}`
    },
    {
      key: 'valuation_rate',
      label: 'Valuation Rate',
      render: (value) => `₹${Number(value || 0).toFixed(4)}`
    },
    {
      key: 'reserved_qty',
      label: 'Reserved Stock',
      render: (value) => Number(value || 0).toFixed(2)
    },
    {
      key: 'stock_status',
      label: 'Status',
      render: (value, row) => {
        if (!row) return null
        const status = getStockStatus(row.current_qty, row.reorder_level)
        return <Badge className={status.class}>{status.text}</Badge>
      }
    }
  ]

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <BarChart3 size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Stock Balance
        </h1>
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      <div className="inventory-stats">
        <div className="inventory-stat-card" style={{ borderLeftColor: '#3b82f6' }}>
          <div>
            <div className="inventory-stat-label">Total</div>
            <div className="inventory-stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="inventory-stat-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div>
            <div className="inventory-stat-label">Low Stock</div>
            <div className="inventory-stat-value" style={{ color: '#f59e0b' }}>{stats.low}</div>
          </div>
        </div>
        <div className="inventory-stat-card" style={{ borderLeftColor: '#ef4444' }}>
          <div>
            <div className="inventory-stat-label">Out of Stock</div>
            <div className="inventory-stat-value" style={{ color: '#ef4444' }}>{stats.outOfStock}</div>
          </div>
        </div>
      </div>

      {stocks.length > 0 && (
        <div className="inventory-filters">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            style={{ minWidth: '150px' }}
          />
          <select 
            value={warehouseFilter} 
            onChange={(e) => {
              setWarehouseFilter(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option value="">All WH</option>
            {warehouses.map(wh => (
              <option key={wh.warehouse_id} value={wh.warehouse_id}>
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
          >
            <option value="">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out</option>
          </select>
          {(searchTerm || statusFilter || warehouseFilter) && (
            <Button 
              variant="secondary" 
              onClick={handleClearFilters}
              icon={X}
              style={{ padding: '6px 10px', fontSize: '11px' }}
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="no-data">
          <BarChart3 size={48} style={{ opacity: 0.5 }} />
          <p>Loading stock balance...</p>
        </div>
      ) : (
        <>
          <DataTable 
            columns={columns} 
            data={paginatedData}
            pageSize={itemsPerPage}
            disablePagination={true}
            filterable={true}
            sortable={true}
          />
          {filteredStocks.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredStocks.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      )}
    </div>
  )
}