import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Card from '../../components/Card/Card'
import DataTable from '../../components/Table/DataTable'
import Modal, { useModal } from '../../components/Modal/Modal'
import {
  Plus, Trash2, Package, X, Calendar, Search, Warehouse, Tag,
  Database, Grid3x3, List, Eye, Edit2, TrendingUp, TrendingDown,
  Activity, CheckCircle2, RotateCcw, Filter, ChevronDown,
  Settings2, Download, RefreshCw, LayoutGrid, List as ListIcon
} from 'lucide-react'
import './Inventory.css'

export default function StockEntries() {
  const [entries, setEntries] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const formModal = useModal(false)
  const [editingId, setEditingId] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [grnRequests, setGrnRequests] = useState([])
  const [grnWithEntries, setGrnWithEntries] = useState(new Set())
  const [selectedGRN, setSelectedGRN] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  // Default visible columns
  const [visibleColumns, setVisibleColumns] = useState(new Set([
    'entry_no', 'entry_type', 'warehouse_transition', 'status', 'entry_date', 'total_items'
  ]))

  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: '',
    from_warehouse_id: '',
    to_warehouse_id: '',
    purpose: '',
    reference_doctype: '',
    reference_name: '',
    remarks: '',
    grn_id: ''
  })

  const [entryItems, setEntryItems] = useState([])
  const [newItem, setNewItem] = useState({
    item_code: '',
    qty: 1,
    valuation_rate: 0,
    uom: 'Kg',
    batch_no: ''
  })

  useEffect(() => {
    fetchEntries()
    fetchStatistics()
    fetchWarehouses()
    fetchItems()
    fetchApprovedGRNs()
  }, [])

  useEffect(() => {
    if (!formModal.isOpen) {
      resetForm()
      setSelectedGRN(null)
    }
  }, [formModal.isOpen])

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/stock/entries/statistics')
      setStatistics(response.data.data)
    } catch (err) {
      console.error('Failed to fetch statistics:', err)
    }
  }

  const fetchApprovedGRNs = async () => {
    try {
      const [grnRes, entriesRes] = await Promise.all([
        api.get('/grn-requests?status=approved'),
        api.get('/stock/entries')
      ])

      const grns = grnRes.data.data || []
      const entriesData = entriesRes.data.data || []

      const grnNosWithEntries = new Set(
        entriesData
          .filter(entry => entry.reference_doctype === 'GRN')
          .map(entry => entry.reference_name)
      )

      setGrnRequests(grns)
      setGrnWithEntries(grnNosWithEntries)
    } catch (err) {
      console.error('Failed to fetch approved GRNs:', err)
    }
  }

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await api.get('/stock/entries')
      const entriesData = response.data.data || []
      setEntries(entriesData)

      const grnNosWithEntries = new Set(
        entriesData
          .filter(entry => entry.reference_doctype === 'GRN')
          .map(entry => entry.reference_name)
      )
      setGrnWithEntries(grnNosWithEntries)

      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock entries')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

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

  const handleGRNSelectInForm = (grnId) => {
    const grn = grnRequests.find(g => g.id === parseInt(grnId))
    if (!grn) return

    setSelectedGRN(grn)

    const grnItems = (grn.items || []).map(item => ({
      _key: `grn_${item.id}`,
      item_code: item.item_code,
      item_name: item.item_name,
      qty: Number(item.accepted_qty) || 0,
      grn_item_id: item.id,
      batch_no: item.batch_no || '',
      valuation_rate: Number(item.valuation_rate) || 0,
      uom: 'Kg'
    }))

    setFormData(prev => ({
      ...prev,
      entry_type: 'Material Receipt',
      purpose: `GRN: ${grn.grn_no}`,
      reference_doctype: 'GRN',
      reference_name: grn.grn_no,
      remarks: grn.notes || '',
      grn_id: grnId
    }))

    setEntryItems(grnItems)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'grn_id') {
      handleGRNSelectInForm(value)
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAddItem = () => {
    if (newItem.item_code && newItem.qty > 0) {
      setEntryItems([...entryItems, { ...newItem, _key: `manual_${Date.now()}` }])
      setNewItem({ item_code: '', qty: 1, valuation_rate: 0, uom: 'Kg', batch_no: '' })
    }
  }

  const handleRemoveItem = (key) => {
    setEntryItems(entryItems.filter(item => item._key !== key))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (entryItems.length === 0) {
      setError('Please add at least one item')
      return
    }

    try {
      setLoading(true)
      const cleanItems = entryItems.map(item => ({
        item_code: item.item_code,
        qty: Number(item.qty) || 0,
        valuation_rate: Number(item.valuation_rate) || 0,
        uom: item.uom || 'Kg',
        batch_no: item.batch_no || null
      }))
      const submitData = {
        ...formData,
        from_warehouse_id: formData.from_warehouse_id ? Number(formData.from_warehouse_id) : null,
        to_warehouse_id: formData.to_warehouse_id ? Number(formData.to_warehouse_id) : null,
        grn_id: formData.grn_id ? Number(formData.grn_id) : null,
        items: cleanItems
      }

      if (editingId) {
        await api.put(`/stock/entries/${editingId}`, submitData)
        setSuccess('Stock entry updated successfully')
      } else {
        await api.post('/stock/entries', submitData)
        setSuccess('Stock entry created successfully')
      }

      resetForm()
      fetchEntries()
      fetchStatistics()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save stock entry')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitEntry = async (id) => {
    if (!window.confirm('Are you sure you want to submit this stock entry? This will update stock balances.')) return

    try {
      setLoading(true)
      await api.post(`/stock/entries/${id}/submit`)
      setSuccess('Stock entry submitted successfully')
      fetchEntries()
      fetchStatistics()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit stock entry')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEntry = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this stock entry? This will reverse stock balances.')) return

    try {
      setLoading(true)
      await api.post(`/stock/entries/${id}/cancel`)
      setSuccess('Stock entry cancelled successfully')
      fetchEntries()
      fetchStatistics()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel stock entry')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: '',
      from_warehouse_id: '',
      to_warehouse_id: '',
      purpose: '',
      reference_doctype: '',
      reference_name: '',
      remarks: '',
      grn_id: ''
    })
    setEntryItems([])
    setSelectedGRN(null)
    setEditingId(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stock entry?')) {
      try {
        await api.delete(`/stock/entries/${id}`)
        setSuccess('Stock entry deleted successfully')
        fetchEntries()
        fetchStatistics()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete stock entry')
      }
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Material Receipt':
        return <Package size={20} className="text-green-500" />
      case 'Material Transfer':
        return <Database size={20} className="text-blue-500" />
      case 'Material Issue':
        return <Tag size={20} className="text-orange-500" />
      case 'Manufacturing Return':
        return <Package size={20} className="text-purple-500" />
      default:
        return <Package size={20} className="text-gray-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'Material Receipt':
        return 'from-green-50 to-green-100'
      case 'Material Transfer':
        return 'from-blue-50 to-blue-100'
      case 'Material Issue':
        return 'from-orange-50 to-orange-100'
      case 'Manufacturing Return':
        return 'from-purple-50 to-purple-100'
      default:
        return 'from-gray-50 to-gray-100'
    }
  }

  const columns = useMemo(() => [
    {
      key: 'entry_no',
      label: 'Entry No',
      render: (value, row) => (
        <div className="flex flex-col">
          <span className=" text-neutral-900 dark:text-white font-medium">{value}</span>
          <span className="text-[10px] text-neutral-500">ID: {row.entry_id}</span>
        </div>
      )
    },
    {
      key: 'entry_type',
      label: 'Type & Purpose',
      render: (value, row) => row ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {getTypeIcon(row.entry_type)}
            <span className="font-medium text-xs">{row.entry_type}</span>
          </div>
          {row.purpose && <span className="text-[10px] text-neutral-500 italic truncate max-w-[150px]">{row.purpose}</span>}
        </div>
      ) : '-'
    },
    {
      key: 'warehouse_transition',
      label: 'Warehouse (Source → Dest)',
      render: (value, row) => (
        <div className="flex items-center gap-2 text-xs">
          <div className="flex flex-col">
            <span className={row.from_warehouse_name ? "text-neutral-900 dark:text-white" : "text-neutral-400 italic"}>
              {row.from_warehouse_name || 'N/A'}
            </span>
          </div>
          <span className="text-neutral-400">→</span>
          <div className="flex flex-col">
            <span className={row.to_warehouse_name ? "text-neutral-900 dark:text-white" : "text-neutral-400 italic"}>
              {row.to_warehouse_name || 'N/A'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => {
        let variant = 'secondary'
        if (value === 'Submitted') variant = 'success'
        if (value === 'Cancelled') variant = 'danger'
        if (value === 'Draft') variant = 'warning'
        return <Badge variant={variant}>{value}</Badge>
      }
    },
    {
      key: 'entry_date',
      label: 'Date',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      key: 'total_items',
      label: 'Items',
      render: (value) => <span className="font-medium">{value || 0}</span>
    }
  ], [warehouses])

  const filteredEntries = useMemo(() => {
    return entries.filter(entry =>
      (entry.entry_id?.toString().includes(searchTerm.toLowerCase()) ||
        entry.entry_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.from_warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.to_warehouse_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (typeFilter === '' || entry.entry_type === typeFilter) &&
      (warehouseFilter === '' || String(entry.from_warehouse_id || entry.to_warehouse_id) === warehouseFilter)
    )
  }, [entries, searchTerm, typeFilter, warehouseFilter])

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredEntries.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredEntries, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)

  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    setTypeFilter('')
    setWarehouseFilter('')
    setCurrentPage(1)
  }, [])

  const toggleColumn = useCallback((columnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnKey)) next.delete(columnKey)
      else next.add(columnKey)
      return next
    })
  }, [])

  const renderActions = (row) => {
    if (!row) return null
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            setEditingId(row.id || row.entry_id)
            setFormData({
              entry_date: row.entry_date?.split('T')[0],
              entry_type: row.entry_type,
              from_warehouse_id: row.from_warehouse_id || '',
              to_warehouse_id: row.to_warehouse_id || '',
              purpose: row.purpose || '',
              reference_doctype: row.reference_doctype || '',
              reference_name: row.reference_name || '',
              remarks: row.remarks || '',
              grn_id: row.grn_id || ''
            })
            api.get(`/stock/entries/${row.id || row.entry_id}`).then(res => {
              setEntryItems(res.data.data.items.map(it => ({ ...it, _key: `ext_${it.id}` })))
            })
            formModal.open()
          }}
          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xs transition-colors"
          title="Edit"
          disabled={row.status !== 'Draft'}
        >
          <Edit2 size={14} />
        </button>

        {row.status === 'Draft' && (
          <button
            onClick={() => handleSubmitEntry(row.id || row.entry_id)}
            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xs transition-colors"
            title="Submit"
          >
            <CheckCircle2 size={14} />
          </button>
        )}

        {row.status === 'Submitted' && (
          <button
            onClick={() => handleCancelEntry(row.id || row.entry_id)}
            className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-xs transition-colors"
            title="Cancel (Reverse Stock)"
          >
            <RotateCcw size={14} />
          </button>
        )}

        <button
          onClick={() => handleDelete(row.id || row.entry_id)}
          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xs transition-all"
          title="Delete"
          disabled={row.status !== 'Draft'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-2 sm:p-5 lg:p-3">
      <div className=" mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl OEE Intelligence text-neutral-900 dark:text-white flex items-center gap-3">
              <Package size={28} className="text-amber-500" />
              Stock Entries
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Track and manage inventory stock movements</p>
          </div>
          <button
            onClick={formModal.open}
            className="flex items-center justify-center gap-2 p-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xs shadow-lg hover: transition-all duration-300 hover:-translate-y-1 whitespace-nowrap text-xs"
          >
            <Plus size={18} />
            Create Entry
          </button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Statistics Dashboard */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xs border border-neutral-200 dark:border-neutral-800  ">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Movements</p>
                  <h3 className="text-xl  text-neutral-900 dark:text-white mt-1">{statistics.total_entries}</h3>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-xs">
                  <Activity size={20} className="text-amber-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[10px] text-neutral-500">Across {Object.keys(statistics.by_type).length} types</span>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xs border border-neutral-200 dark:border-neutral-800  ">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Total Throughput</p>
                  <h3 className="text-xl  text-neutral-900 dark:text-white mt-1">{(Number(statistics.total_qty) || 0).toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-xs">
                  <TrendingUp size={20} className="text-blue-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[10px] text-neutral-500">Items moved</span>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xs border border-neutral-200 dark:border-neutral-800  ">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Inventory Value</p>
                  <h3 className="text-xl  text-neutral-900 dark:text-white mt-1">₹{((Number(statistics.total_value) || 0) / 100000).toFixed(2)}L</h3>
                </div>
                <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-xs">
                  <Database size={20} className="text-green-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[10px] text-neutral-500">Total transaction value</span>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-xs border border-neutral-200 dark:border-neutral-800  ">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Pending Drafts</p>
                  <h3 className="text-xl  text-neutral-900 dark:text-white mt-1">{statistics.by_status?.Draft || 0}</h3>
                </div>
                <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xs">
                  <Tag size={20} className="text-orange-500" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <span className="text-[10px] text-neutral-500">Requires submission</span>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={formModal.isOpen}
          onClose={formModal.close}
          title="Create Stock Entry"
          size="2xl"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button variant="secondary" onClick={formModal.close}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" form="manual-entry-form" loading={loading} className="bg-amber-500 hover:bg-amber-600">
                Create Entry
              </Button>
            </div>
          }
        >
          <form id="manual-entry-form" onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="form-group">
              <label className="text-[11px] font-bold text-neutral-500  tracking-wider mb-1 block">
                Select GRN Request (Optional)
              </label>
              <select
                name="grn_id"
                value={formData.grn_id}
                onChange={handleChange}
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">-- Manual Entry --</option>
                {grnRequests.map(grn => {
                  const hasEntry = grnWithEntries.has(grn.grn_no)
                  return (
                    <option
                      key={grn.id}
                      value={grn.id}
                      disabled={hasEntry}
                      style={{ color: hasEntry ? '#999' : 'inherit' }}
                    >
                      {grn.grn_no} - {grn.supplier_name} ({grn.items?.length} items)
                      {hasEntry ? ' (Already Processed)' : ''}
                    </option>
                  )
                })}
              </select>
              <div className="mt-1.5 text-[10px] text-neutral-500 flex items-center gap-3">
                <span>Available GRNs: <span className="font-bold text-neutral-700 dark:text-neutral-300">{grnRequests.filter(g => !grnWithEntries.has(g.grn_no)).length}</span></span>
                <span className="w-1 h-1 rounded-full bg-neutral-300" />
                <span>Processed: <span className="font-bold text-neutral-700 dark:text-neutral-300">{grnWithEntries.size}</span></span>
              </div>
            </div>

            {selectedGRN && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xs p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                  GRN: <span className="font-bold">{selectedGRN.grn_no}</span> | PO: <span className="font-bold">{selectedGRN.po_no}</span> | Supplier: <span className="font-bold">{selectedGRN.supplier_name}</span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Entry Date *
                </label>
                <input
                  type="date"
                  name="entry_date"
                  value={formData.entry_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  Entry Type *
                </label>
                <select
                  name="entry_type"
                  value={formData.entry_type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select Type</option>
                  <option value="Material Transfer">Material Transfer</option>
                  <option value="Material Receipt">Material Receipt</option>
                  <option value="Material Issue">Material Issue</option>
                  <option value="Manufacturing Return">Manufacturing Return</option>
                  <option value="Repack">Repack</option>
                  <option value="Scrap Entry">Scrap Entry</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  From Warehouse
                </label>
                <select
                  name="from_warehouse_id"
                  value={formData.from_warehouse_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select Source Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={String(wh.id)}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                  To Warehouse {formData.entry_type === 'Material Receipt' && '*'}
                </label>
                <select
                  name="to_warehouse_id"
                  value={formData.to_warehouse_id}
                  onChange={handleChange}
                  required={formData.entry_type === 'Material Receipt'}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Select Destination Warehouse</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={String(wh.id)}>
                      {wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Card className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20">
              <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
                <h4 className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300  tracking-wider flex items-center gap-2">
                  <Package size={14} className="text-amber-500" />
                  Add Items
                </h4>
              </div>
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 ">Item Code *</label>
                    <select
                      value={newItem.item_code}
                      onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800"
                    >
                      <option value="">Select Item</option>
                      {items.map(item => (
                        <option key={item.item_code} value={item.item_code}>
                          {item.name || item.item_name} ({item.item_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 ">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      value={newItem.qty}
                      onChange={(e) => setNewItem({ ...newItem, qty: parseFloat(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 ">UOM</label>
                    <input
                      type="text"
                      value={newItem.uom}
                      onChange={(e) => setNewItem({ ...newItem, uom: e.target.value })}
                      placeholder="Kg"
                      className="w-full px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 ">Batch No</label>
                    <input
                      type="text"
                      value={newItem.batch_no}
                      onChange={(e) => setNewItem({ ...newItem, batch_no: e.target.value })}
                      placeholder="Optional"
                      className="w-full px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-400 ">Valuation Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newItem.valuation_rate}
                      onChange={(e) => setNewItem({ ...newItem, valuation_rate: parseFloat(e.target.value) })}
                      placeholder="0.00"
                      className="w-full px-3 py-1.5 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={handleAddItem} variant="secondary" className="w-full py-1.5 text-xs">
                      Add Item
                    </Button>
                  </div>
                </div>

                {entryItems.length > 0 && (
                  <div className="mt-4 border border-neutral-200 dark:border-neutral-700 rounded-xs overflow-hidden bg-white dark:bg-neutral-800">
                    <table className="w-full text-[11px]">
                      <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-neutral-500 ">Item</th>
                          <th className="px-3 py-2 text-right font-bold text-neutral-500 ">Qty</th>
                          <th className="px-3 py-2 text-left font-bold text-neutral-500 ">UOM</th>
                          <th className="px-3 py-2 text-right font-bold text-neutral-500 ">Rate</th>
                          <th className="px-3 py-2 text-center font-bold text-neutral-500  w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                        {entryItems.map(item => (
                          <tr key={item._key || Math.random()} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-neutral-900 dark:text-white">{item.item_code}</div>
                              {item.batch_no && <div className="text-[9px] text-neutral-400">Batch: {item.batch_no}</div>}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">{item.qty}</td>
                            <td className="px-3 py-2 text-neutral-500">{item.uom}</td>
                            <td className="px-3 py-2 text-right">₹{Number(item.valuation_rate).toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item._key)}
                                className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-neutral-500  tracking-wider">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={2}
                placeholder="Additional notes..."
                className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-700 rounded-xs bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </form>
        </Modal>

        {loading && !entries.length ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 text-center px-4">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xs text-neutral-500 font-medium tracking-wide ">Loading Stock Entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 text-center px-4">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
              <Package size={32} className="text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">No stock entries found</h3>
            <p className="text-xs text-neutral-500 mt-2 max-w-xs">Start tracking your inventory movements by creating your first stock entry.</p>
            <Button
              variant="primary"
              onClick={formModal.open}
              className="mt-6 bg-amber-500 hover:bg-amber-600 text-xs px-6"
            >
              <Plus size={16} className="mr-2" />
              Create First Entry
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xs overflow-hidden shadow-sm">
            {/* Command Center Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 px-4 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="relative flex-1 group max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-amber-500 transition-colors" size={14} />
                <input
                  type="text"
                  placeholder="Search by ID, No, or warehouse..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xs focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all text-xs font-medium"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xs">
                  <Filter size={12} className="text-neutral-400" />
                  <select
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="bg-transparent text-xs border-0 text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer min-w-[100px]"
                  >
                    <option value="">All Types</option>
                    <option value="Material Transfer">Material Transfer</option>
                    <option value="Material Receipt">Material Receipt</option>
                    <option value="Material Issue">Material Issue</option>
                    <option value="Manufacturing Return">Manufacturing Return</option>
                    <option value="Repack">Repack</option>
                    <option value="Scrap Entry">Scrap Entry</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xs">
                  <Warehouse size={12} className="text-neutral-400" />
                  <select
                    value={warehouseFilter}
                    onChange={(e) => {
                      setWarehouseFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="bg-transparent text-xs border-0 text-neutral-700 dark:text-neutral-300 focus:outline-none cursor-pointer min-w-[120px]"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses.map(wh => (
                      <option key={wh.id} value={String(wh.id)}>
                        {wh.warehouse_name}
                      </option>
                    ))}
                  </select>
                </div>

                {(searchTerm || typeFilter || warehouseFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="p-2 text-neutral-500 hover:text-amber-600 transition-colors"
                    title="Clear Filters"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}

                <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1" />

                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-xs transition-all ${viewMode === 'table' ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    <ListIcon size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-1.5 rounded-xs transition-all ${viewMode === 'card' ? 'bg-white dark:bg-neutral-700 shadow-sm text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border rounded-xs transition-all ${showColumnMenu ? 'bg-neutral-100 border-neutral-300' : 'bg-white border-neutral-200 hover:border-neutral-300 dark:bg-neutral-800 dark:border-neutral-700'}`}
                  >
                    <Settings2 size={14} />
                    Columns
                  </button>

                  {showColumnMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowColumnMenu(false)} />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs shadow-xl z-20 py-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-neutral-400  tracking-wider border-b border-neutral-100 dark:border-neutral-700 mb-1 flex justify-between">
                          <span>Visible Columns</span>
                          <div className="flex gap-2">
                            <button onClick={() => setVisibleColumns(new Set(columns.map(c => c.key)))} className="text-amber-600 hover:underline">All</button>
                            <button onClick={() => setVisibleColumns(new Set(['entry_no', 'status']))} className="text-neutral-400 hover:underline">Reset</button>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
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
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={fetchEntries}
                  className="p-2 text-neutral-500 hover:text-blue-600 transition-colors bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xs"
                  title="Refresh Data"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="p-0">
              {filteredEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search size={40} className="text-neutral-200 mb-4" />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">No matching entries</h3>
                  <p className="text-xs text-neutral-500 mt-1">Try adjusting your search or filters.</p>
                </div>
              ) : viewMode === 'table' ? (
                <DataTable
                  columns={columns}
                  data={filteredEntries}
                  renderActions={renderActions}
                  hideColumnToggle
                  externalVisibleColumns={visibleColumns}
                />
              ) : (
                <div className="p-4 bg-neutral-50 dark:bg-neutral-950/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedData.map((entry) => (
                      <div
                        key={entry.entry_id || entry.id}
                        className="bg-white dark:bg-neutral-900 rounded-xs border border-neutral-200 dark:border-neutral-800 hover:shadow-md transition-all duration-200 group flex flex-col"
                      >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${getTypeColor(entry.entry_type)}`} />
                        <div className="p-4 flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xs">
                                {getTypeIcon(entry.entry_type)}
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{entry.entry_no}</h3>
                                <p className="text-[10px] text-neutral-500 font-bold  tracking-wider">{entry.entry_type}</p>
                              </div>
                            </div>
                            <Badge variant={entry.status === 'Submitted' ? 'success' : entry.status === 'Cancelled' ? 'danger' : 'warning'}>
                              {entry.status}
                            </Badge>
                          </div>

                          <div className="space-y-2.5 mb-4">
                            <div className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center gap-1.5 text-neutral-500">
                                <Calendar size={12} />
                                <span>{new Date(entry.entry_date).toLocaleDateString()}</span>
                              </div>
                              <div className="font-bold text-neutral-700 dark:text-neutral-300 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xs">
                                {entry.total_items} Items
                              </div>
                            </div>

                            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-xs border border-neutral-100 dark:border-neutral-800">
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                                <span className="text-[10px] text-neutral-500 truncate flex-1 font-medium">
                                  {entry.from_warehouse_name || 'No Source'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-[10px] text-neutral-900 dark:text-neutral-100 truncate flex-1 font-bold">
                                  {entry.to_warehouse_name || 'No Destination'}
                                </span>
                              </div>
                            </div>

                            {entry.purpose && (
                              <p className="text-[10px] text-neutral-500 italic line-clamp-2 leading-relaxed">
                                "{entry.purpose}"
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800 mt-auto">
                            {entry.status === 'Draft' ? (
                              <>
                                <button
                                  onClick={() => handleSubmitEntry(entry.id || entry.entry_id)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-white bg-green-600 hover:bg-green-700 rounded-xs transition-all shadow-sm active:scale-95"
                                >
                                  <CheckCircle2 size={12} />
                                  SUBMIT
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.id || entry.entry_id)}
                                  className="p-2 text-neutral-400 hover:text-red-600 bg-neutral-50 hover:bg-red-50 rounded-xs transition-all border border-neutral-100 hover:border-red-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : entry.status === 'Submitted' ? (
                              <button
                                onClick={() => handleCancelEntry(entry.id || entry.entry_id)}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xs transition-all border border-orange-100 shadow-sm active:scale-95"
                              >
                                <RotateCcw size={12} />
                                CANCEL & REVERSE
                              </button>
                            ) : (
                              <div className="flex-1 text-center py-2 text-[10px] font-bold text-neutral-400 bg-neutral-50 rounded-xs border border-neutral-100 italic ">
                                Cancelled
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                      <div className="text-[11px] text-neutral-500 font-medium">
                        Showing <span className="text-neutral-900 dark:text-white font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-neutral-900 dark:text-white font-bold">{Math.min(currentPage * itemsPerPage, filteredEntries.length)}</span> of <span className="text-neutral-900 dark:text-white font-bold">{filteredEntries.length}</span> entries
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-xs text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`w-8 h-8 rounded-xs text-[11px] font-bold transition-all ${currentPage === page ? 'bg-amber-500 text-white shadow-md' : 'text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
                                >
                                  {page}
                                </button>
                              );
                            } else if (page === currentPage - 2 || page === currentPage + 2) {
                              return <span key={page} className="text-neutral-400 text-xs px-1">...</span>;
                            }
                            return null;
                          })}
                        </div>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-xs text-[11px] font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
