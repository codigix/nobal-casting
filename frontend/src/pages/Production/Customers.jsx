import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'
import api from '../../services/api'
import CreateCustomersModal from '../../components/Production/CreateCustomersModal'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('tata')

  useEffect(() => {
    fetchCustomers()
  }, [filters])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)

      const response = await api.get(`/customers?${params}`)
      setCustomers(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch customers')
      setCustomers([])
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

  const handleDelete = async (customer_id) => {
    if (window.confirm('Delete this customer?')) {
      try {
        await api.delete(`/customers/${customer_id}`)
        setSuccess('Customer deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchCustomers()
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to delete customer')
      }
    }
  }

  const handleEdit = (customer) => {
    setEditingId(customer.customer_id)
    setShowCreateModal(true)
  }

  const handleCreateSuccess = () => {
    setSuccess('Customer saved successfully')
    setTimeout(() => setSuccess(null), 3000)
    setEditingId(null)
    setShowCreateModal(false)
    fetchCustomers()
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'status-completed',
      inactive: 'status-cancelled',
      pending: 'status-planned'
    }
    return colors[status] || 'status-draft'
  }

  const filteredCustomers = customers.filter(customer => {
    if (activeTab === 'tata') {
      return customer.customer_type?.toLowerCase() === 'tata'
    } else {
      return customer.customer_type?.toLowerCase() !== 'tata'
    }
  })

  return (
    <div className=" px-6 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users size={32} className="text-blue-600" />
            <div>
              
              <h1 className="text-xl font-bold text-gray-900">Customers</h1>
              <p className="text-gray-600 text-xs">Manage customer information and details</p>
            </div>
            

          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setShowCreateModal(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Customer
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-2 text-xs text-green-800">
          <span>✓</span> {success}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-800">
          <span>✕</span> {error}
        </div>
      )}

      <CreateCustomersModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingId(null)
        }}
        onSuccess={handleCreateSuccess}
        editingId={editingId}
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('tata')}
          className={`px-4 py-2.5 text-xs font-medium transition-all ${activeTab === 'tata'
              ? 'border-b-3 border-blue-600 bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Tata Project
        </button>
        <button
          onClick={() => setActiveTab('others')}
          className={`px-4 py-2.5 text-xs font-medium transition-all ${activeTab === 'others'
              ? 'border-b-3 border-blue-600 bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Other Projects
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 ">
        <div className="w-[70%]">
          <label className="mb-2 block text-xs font-medium text-gray-700">Search</label>
          <input
            type="text"
            name="search"
            placeholder="Search by name or ID..."
            value={filters.search}
            onChange={handleFilterChange}
            className="w-full rounded-xs border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-500 transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 "
          />
        </div>
        <div className="w-[30%]">
          <label className="mb-2 block text-xs font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded-xs border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 transition-colors cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-lg bg-white py-12 text-gray-500">
          Loading customers...
        </div>
      ) : filteredCustomers.length > 0 ? (
        <div className="overflow-hidden ">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 p-2 text-center">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="p-2 text-left text-xs font-semibold text-gray-700">ID</th>
                <th className="p-2 text-left text-xs font-semibold text-gray-700">Name</th>
                <th className="p-2 text-left text-xs font-semibold text-gray-700">Email</th>
                <th className="p-2 text-left text-xs font-semibold text-gray-700">Phone</th>
                <th className="p-2 text-center text-xs font-semibold text-gray-700">Status</th>
                <th className="p-2 text-center text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer, index) => (
                <tr
                  key={customer.customer_id}
                  className={`border-b border-gray-100 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50`}
                >
                  <td className="p-2 text-center">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="p-2 text-xs font-semibold text-gray-900">{customer.customer_id}</td>
                  <td className="p-2 text-xs text-gray-800">{customer.customer_name}</td>
                  <td className="p-2 text-xs text-gray-600">{customer.email || '—'}</td>
                  <td className="p-2 text-xs text-gray-600">{customer.phone || '—'}</td>
                  <td className="p-2 text-center">
                    <span className={`work-order-status ${getStatusColor(customer.status)} text-xs`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        className="btn-edit rounded-md p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                        onClick={() => handleEdit(customer)}
                        title="Edit"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        className="btn-delete rounded-md p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                        onClick={() => handleDelete(customer.customer_id)}
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg bg-gray-50 py-12 text-gray-500">
          <p>No customers found</p>
        </div>
      )}
    </div>
  )
}
