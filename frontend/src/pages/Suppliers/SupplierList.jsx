import { useState, useEffect } from 'react'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import SearchableSelect from '../../components/SearchableSelect'
import { suppliersAPI } from '../../services/api'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading suppliers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-5">
      {success && (
        <Alert variant="success">{success}</Alert>
      )}

      {error && (
        <Alert variant="danger">{error}</Alert>
      )}

      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-600 mt-1">Manage your supplier network and relationships</p>
          </div>
          <Button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-blue-500 text-white px-5 py-2.5 rounded-md font-semibold text-sm"
          >
            <Plus size={18} />
            Add New Supplier
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-5 border border-gray-200">
        <div className="grid grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Search</label>
            <input
              type="text"
              placeholder="Name, ID, or GSTIN..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Status</label>
            <SearchableSelect
              value={filters.status}
              onChange={(val) => setFilters({ ...filters, status: val })}
              options={statusOptions}
              placeholder="All Status"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Group</label>
            <SearchableSelect
              value={filters.group}
              onChange={(val) => setFilters({ ...filters, group: val })}
              options={[{ label: 'All Groups', value: '' }, ...supplierGroups]}
              placeholder="All Groups"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => setFilters({ search: '', status: 'all', group: '' })}
              className="w-full px-2 py-1.5 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-md font-medium hover:bg-gray-200"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800">Add New Supplier</h3>
            <button
              onClick={handleCancel}
              className="bg-transparent border-none cursor-pointer p-1 flex items-center justify-center"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {formError && (
            <Alert variant="danger" className="mb-4">{formError}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g., ABC Industries"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">GSTIN *</label>
                <input
                  type="text"
                  placeholder="e.g., 27AABCT1234H1Z0"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Supplier Group</label>
                <SearchableSelect
                  value={formData.supplier_group}
                  onChange={(val) => setFormData({ ...formData, supplier_group: val })}
                  options={supplierGroups}
                  placeholder="Select group"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Rating (0-5)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Payment Terms (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.payment_terms_days}
                  onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1.5">Lead Time (Days)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.lead_time_days}
                  onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="is_active" className="text-sm text-gray-800 cursor-pointer">Active Supplier</label>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-gray-200 text-gray-800 border border-gray-300 rounded-md text-sm font-semibold hover:bg-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-5 py-2.5 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700"
              >
                Create Supplier
              </Button>
            </div>
          </form>
        </div>
      )}

      {filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-lg p-10 text-center border border-gray-200">
          <p className="text-base text-gray-600 mb-4">No suppliers found</p>
          <p className="text-sm text-gray-500 mb-5">Try adjusting your filters or create a new supplier</p>
          <Button
            onClick={handleAddClick}
            className="inline-block px-5 py-2.5 bg-blue-500 text-white rounded-md text-sm font-semibold hover:bg-blue-600"
          >
            Create First Supplier
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600">ID</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600">GSTIN</th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600">Group</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600">Rating</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600">Lead Time</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600">Status</th>
                <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supplier) => (
                editingId === supplier.supplier_id ? (
                  <tr key={`edit-${supplier.supplier_id}`} className="bg-gray-50 border-b border-gray-200">
                    <td colSpan="8" className="px-4 py-4">
                      <form onSubmit={handleSubmit}>
                        <div className="grid grid-cols-4 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-2.5 py-2 text-sm border border-blue-500 rounded-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">GSTIN *</label>
                            <input
                              type="text"
                              value={formData.gstin}
                              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                              className="w-full px-2.5 py-2 text-sm border border-blue-500 rounded-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Group</label>
                            <SearchableSelect
                              value={formData.supplier_group}
                              onChange={(val) => setFormData({ ...formData, supplier_group: val })}
                              options={supplierGroups}
                              placeholder="Select group"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Rating</label>
                            <input
                              type="number"
                              min="0"
                              max="5"
                              step="0.1"
                              value={formData.rating}
                              onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2.5 py-2 text-sm border border-blue-500 rounded-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Terms</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.payment_terms_days}
                              onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 0 })}
                              className="w-full px-2.5 py-2 text-sm border border-blue-500 rounded-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Lead Time</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.lead_time_days}
                              onChange={(e) => setFormData({ ...formData, lead_time_days: parseInt(e.target.value) || 0 })}
                              className="w-full px-2.5 py-2 text-sm border border-blue-500 rounded-sm"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <input
                            type="checkbox"
                            id={`is_active_${supplier.supplier_id}`}
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="w-3.5 h-3.5 cursor-pointer"
                          />
                          <label htmlFor={`is_active_${supplier.supplier_id}`} className="text-xs text-gray-800 cursor-pointer">Active Supplier</label>
                        </div>

                        {formError && (
                          <Alert variant="danger" className="mb-3 text-xs">{formError}</Alert>
                        )}

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={handleCancel}
                            className="px-4 py-2 bg-red-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 hover:bg-red-600"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-green-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 hover:bg-green-600"
                          >
                            <Check size={14} />
                            Save Changes
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr key={supplier.supplier_id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm text-gray-800 font-medium">
                      {supplier.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {supplier.supplier_id}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {supplier.gstin || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {supplier.supplier_group || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">
                      {supplier.rating ? `⭐ ${Number(supplier.rating).toFixed(1)}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 text-center">
                      {supplier.lead_time_days || 0} days
                    </td>
                    <td className="px-4 py-4 text-center">
                      <Badge variant={supplier.is_active ? 'success' : 'warning'}>
                        {supplier.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEditClick(supplier)}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1 hover:bg-blue-600"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.supplier_id)}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-sm text-xs font-semibold flex items-center gap-1 hover:bg-red-600"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
