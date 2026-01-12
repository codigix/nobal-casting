import { useState, useEffect } from 'react'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import SearchableSelect from '../../components/SearchableSelect'
import { suppliersAPI } from '../../services/api'
import { Plus, Edit2, Trash2, X, Check, Users, Grid3x3, List, Star } from 'lucide-react'

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    group: ''
  })

  const [formData, setFormData] = useState({
    name: '',
    supplier_group: '',
    gstin: '',
    payment_terms_days: 30,
    lead_time_days: 7,
    rating: 0,
    is_active: true
  })

  const supplierGroups = [
    { label: 'Raw Materials', value: 'Raw Materials' },
    { label: 'Components', value: 'Components' },
    { label: 'Services', value: 'Services' },
    { label: 'Tools', value: 'Tools' }
  ]

  const statusOptions = [
    { label: 'All Status', value: 'all' },
    { label: 'Active', value: 'true' },
    { label: 'Inactive', value: 'false' }
  ]

  const getGroupColor = (group) => {
    const colors = {
      'Raw Materials': 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/30',
      'Components': 'from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-950/30',
      'Services': 'from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-950/30',
      'Tools': 'from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-950/30'
    }
    return colors[group] || colors['Raw Materials']
  }

  const getGroupTextColor = (group) => {
    const colors = {
      'Raw Materials': 'text-blue-700 dark:text-blue-400',
      'Components': 'text-purple-700 dark:text-purple-400',
      'Services': 'text-green-700 dark:text-green-400',
      'Tools': 'text-orange-700 dark:text-orange-400'
    }
    return colors[group] || colors['Raw Materials']
  }

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await suppliersAPI.list()
      setSuppliers(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch suppliers')
      console.error('Error fetching suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredSuppliers = () => {
    return suppliers.filter(supplier => {
      if (filters.search) {
        const search = filters.search.toLowerCase()
        if (!supplier.name?.toLowerCase().includes(search) &&
          !supplier.supplier_id?.toLowerCase().includes(search) &&
          !supplier.gstin?.toLowerCase().includes(search)) {
          return false
        }
      }

      if (filters.status !== 'all') {
        if (supplier.is_active !== (filters.status === 'true')) return false
      }

      if (filters.group && supplier.supplier_group !== filters.group) return false

      return true
    })
  }

  const filteredSuppliers = getFilteredSuppliers()
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredSuppliers.slice(startIndex, endIndex)

  const resetForm = () => {
    setFormData({
      name: '',
      supplier_group: '',
      gstin: '',
      payment_terms_days: 30,
      lead_time_days: 7,
      rating: 0,
      is_active: true
    })
    setEditingId(null)
    setFormError('')
  }

  const handleAddClick = () => {
    resetForm()
    setShowAddForm(true)
  }

  const handleEditClick = (supplier) => {
    setFormData({
      name: supplier.name || '',
      supplier_group: supplier.supplier_group || '',
      gstin: supplier.gstin || '',
      payment_terms_days: supplier.payment_terms_days || 30,
      lead_time_days: supplier.lead_time_days || 7,
      rating: supplier.rating || 0,
      is_active: supplier.is_active !== false
    })
    setEditingId(supplier.supplier_id)
    setShowAddForm(false)
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('Supplier name is required')
      return false
    }
    if (!formData.gstin.trim()) {
      setFormError('GSTIN is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setFormError('')

    if (!validateForm()) return

    try {
      if (editingId) {
        await suppliersAPI.update(editingId, formData)
        setSuccess('Supplier updated successfully')
      } else {
        await suppliersAPI.create(formData)
        setSuccess('Supplier created successfully')
      }

      resetForm()
      setShowAddForm(false)
      setEditingId(null)
      fetchSuppliers()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save supplier')
    }
  }

  const handleCancel = () => {
    resetForm()
    setShowAddForm(false)
    setEditingId(null)
  }

  const handleDelete = async (supplierId) => {
    if (!window.confirm('Are you sure you want to delete this supplier?')) return

    try {
      await suppliersAPI.delete(supplierId)
      setSuccess('Supplier deleted successfully')
      fetchSuppliers()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete supplier')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4 animate-pulse">
          <Users size={40} className="text-neutral-400 dark:text-neutral-600" />
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Loading suppliers...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-5 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {success && <Alert variant="success">{success}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-6">
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-3">
              <Users size={28} className="text-purple-500" />
              Suppliers
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Manage your supplier network and relationships</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
          >
            <Plus size={18} />
            Add Supplier
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingId ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={handleCancel} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X size={20} className="text-neutral-600 dark:text-neutral-400" />
              </button>
            </div>

            {formError && <Alert variant="danger" className="mb-4">{formError}</Alert>}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Supplier Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., ABC Industries"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">GSTIN *</label>
                  <input
                    type="text"
                    placeholder="e.g., 27AABCT1234H1Z0"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Supplier Group</label>
                  <SearchableSelect
                    value={formData.supplier_group}
                    onChange={(val) => setFormData({ ...formData, supplier_group: val })}
                    options={supplierGroups}
                    placeholder="Select group"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Rating (0-5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Payment Terms (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.payment_terms_days}
                    onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 cursor-pointer rounded border-neutral-300"
                />
                <label htmlFor="is_active" className="text-sm text-neutral-900 dark:text-white cursor-pointer">Active Supplier</label>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all text-xs font-semibold "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-xs font-semibold  flex items-center gap-1"
                >
                  <Check size={16} />
                  {editingId ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        )}

        {suppliers.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by name, ID, or GSTIN..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />

            <select 
              value={filters.status} 
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select 
              value={filters.group} 
              onChange={(e) => setFilters({ ...filters, group: e.target.value })}
              className="p-2 text-sm border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Groups</option>
              {supplierGroups.map(group => (
                <option key={group.value} value={group.value}>{group.label}</option>
              ))}
            </select>

            {(filters.search || filters.status !== 'all' || filters.group) && (
              <button 
                onClick={() => setFilters({ search: '', status: 'all', group: '' })}
                className="p-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all flex items-center gap-1 text-sm"
              >
                <X size={14} />
                Clear
              </button>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                title="Table view"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-all ${viewMode === 'card' ? 'bg-purple-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
                title="Card view"
              >
                <Grid3x3 size={18} />
              </button>
            </div>
          </div>
        )}

        {filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 mb-4">
              <Users size={40} className="text-neutral-400 dark:text-neutral-600" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Suppliers Found</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center max-w-md mb-4">Try adjusting your filters or create a new supplier</p>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-all"
            >
              <Plus size={16} />
              Create First Supplier
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className=" ">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="p-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">Name</th>
                  <th className="p-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">ID</th>
                  <th className="p-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">GSTIN</th>
                  <th className="p-2 text-left text-xs font-semibold text-neutral-700 dark:text-neutral-300">Group</th>
                  <th className="p-2 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">Rating</th>
                  <th className="p-2 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">Lead Time</th>
                  <th className="p-2 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">Status</th>
                  <th className="p-2 text-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.supplier_id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="p-2 text-xs font-semibold  text-neutral-900 dark:text-white">{supplier.name}</td>
                    <td className="p-2 text-xs text-neutral-600 dark:text-neutral-400 font-mono">{supplier.supplier_id}</td>
                    <td className="p-2 text-xs text-neutral-600 dark:text-neutral-400 font-mono">{supplier.gstin || '-'}</td>
                    <td className="p-2 text-sm">
                      {supplier.supplier_group ? (
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getGroupTextColor(supplier.supplier_group)}`}>
                          {supplier.supplier_group}
                        </span>
                      ) : (
                        <span className="text-neutral-400">-</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-center">
                      {supplier.rating ? (
                        <div className="flex items-center justify-center gap-1">
                          <Star size={14} className="text-amber-500 fill-amber-500" />
                          <span className="text-neutral-900 dark:text-white font-semibold">{Number(supplier.rating).toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-center text-neutral-600 dark:text-neutral-400">{supplier.lead_time_days || 0} days</td>
                    <td className="p-2 text-center">
                      <Badge variant={supplier.is_active ? 'success' : 'warning'}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEditClick(supplier)}
                          className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.supplier_id)}
                          className="px-2.5 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedData.map((supplier) => (
                <div key={supplier.supplier_id} className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-shadow`}>
                  <div className={`bg-gradient-to-r ${getGroupColor(supplier.supplier_group)} p-3 border-b border-neutral-200 dark:border-neutral-700`}>
                    <h3 className="font-bold text-neutral-900 dark:text-white">{supplier.name}</h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{supplier.supplier_id}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">GSTIN</p>
                        <p className="text-sm font-mono text-neutral-900 dark:text-white">{supplier.gstin || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Group</p>
                        <p className={`text-xs font-semibold ${getGroupTextColor(supplier.supplier_group)}`}>{supplier.supplier_group || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Rating</p>
                        <div className="flex items-center gap-1">
                          {supplier.rating ? (
                            <>
                              <Star size={14} className="text-amber-500 fill-amber-500" />
                              <span className="text-sm font-bold text-neutral-900 dark:text-white">{Number(supplier.rating).toFixed(1)}</span>
                            </>
                          ) : (
                            <span className="text-sm text-neutral-400">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Lead Time</p>
                        <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{supplier.lead_time_days || 0}d</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Payment Terms</p>
                        <p className="text-xs font-semibold  text-neutral-900 dark:text-white">{supplier.payment_terms_days || 0}d</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-semibold">Status</p>
                        <div>
                          <Badge variant={supplier.is_active ? 'success' : 'warning'} className="text-xs">
                            {supplier.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                      <button
                        onClick={() => handleEditClick(supplier)}
                        className="flex-1 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.supplier_id)}
                        className="flex-1 p-2 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-neutral-600 dark:text-neutral-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredSuppliers.length)} of {filteredSuppliers.length} suppliers
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
                            ? 'bg-purple-500 text-white'
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
