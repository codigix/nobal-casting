import React, { useState, useEffect } from 'react'
import axios from 'axios'
import DataTable from '../../components/Table/DataTable'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Pagination from './Pagination'
import { BookOpen, Download, X } from 'lucide-react'
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
  const [itemsPerPage, setItemsPerPage] = useState(10)

  useEffect(() => {
    fetchWarehouses()
    fetchItems()
  }, [])

  useEffect(() => {
    fetchLedger()
  }, [filters])

  const fetchWarehouses = async () => {
    try {
      const response = await axios.get('/api/stock/warehouses')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await axios.get('/api/items?limit=1000')
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

      const response = await axios.get(`/api/stock/ledger?${params}`)
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

  const totalPages = Math.ceil(ledgers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = ledgers.slice(startIndex, endIndex)

  const handleDownload = () => {
    const headers = ['Item Code', 'Warehouse', 'Date', 'Transaction Type', 'Qty In', 'Qty Out', 'Balance', 'Rate', 'Value']
    const csvContent = [
      headers.join(','),
      ...ledgers.map(row =>
        `${row.item_code},${row.warehouse_name},${row.posting_date},${row.transaction_type},${row.qty_in || 0},${row.qty_out || 0},${row.balance},${row.rate || 0},${(row.balance * (row.rate || 0)).toFixed(2)}`
      )
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
      key: 'balance',
      label: 'Balance'
    },
    {
      key: 'rate',
      label: 'Rate',
      render: (value, row) => row ? `₹${row.rate || 0}` : '-'
    },
    {
      key: 'value',
      label: 'Value',
      render: (value, row) => row ? `₹${((row.balance || 0) * (row.rate || 0)).toFixed(2)}` : '-'
    }
  ]

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>
          <BookOpen size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Stock Ledger
        </h1>
        <Button 
          variant="secondary" 
          onClick={handleDownload} 
          icon={Download}
          style={{ padding: '6px 10px', fontSize: '11px' }}
        >
          Download
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      {ledgers.length > 0 && (
        <div className="inventory-filters">
          <select name="warehouse_id" value={filters.warehouse_id} onChange={handleFilterChange}>
            <option value="">All WH</option>
            {warehouses.map(wh => (
              <option key={wh.warehouse_id} value={wh.warehouse_id}>
                {wh.warehouse_name}
              </option>
            ))}
          </select>

          <select name="item_code" value={filters.item_code} onChange={handleFilterChange}>
            <option value="">All Items</option>
            {items.map(item => (
              <option key={item.item_code} value={item.item_code}>
                {item.item_code}
              </option>
            ))}
          </select>

          <input type="date" name="from_date" value={filters.from_date} onChange={handleFilterChange} />
          <input type="date" name="to_date" value={filters.to_date} onChange={handleFilterChange} />

          {(filters.warehouse_id || filters.item_code || filters.from_date || filters.to_date) && (
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

      {loading ? (
        <div className="no-data">
          <BookOpen size={48} style={{ opacity: 0.5 }} />
          <p>Loading stock ledger...</p>
        </div>
      ) : ledgers.length === 0 ? (
        <div className="no-data">
          <BookOpen size={48} style={{ opacity: 0.5 }} />
          <p>📖 No ledger entries found.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>Ledger entries will appear once stock movements are recorded.</p>
        </div>
      ) : (
        <>
          <DataTable columns={columns} data={paginatedData} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={ledgers.length}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  )
}
