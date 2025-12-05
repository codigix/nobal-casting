import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, X, AlertCircle, Clock } from 'lucide-react'
import toolroomService from '../../services/toolroomService'

const MaintenanceSchedule = () => {
  const [maintenance, setMaintenance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('schedule')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    toolId: '',
    maintenanceType: '',
    scheduledDate: '',
    cost: '',
    description: '',
    status: 'pending'
  })

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchMaintenanceSchedule()
    } else {
      fetchMaintenanceHistory()
    }
  }, [activeTab])

  const fetchMaintenanceSchedule = async () => {
    try {
      setLoading(true)
      const response = await toolroomService.getMaintenanceSchedule()
      setMaintenance(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch maintenance schedule')
    } finally {
      setLoading(false)
    }
  }

  const fetchMaintenanceHistory = async () => {
    try {
      setLoading(true)
      const response = await toolroomService.getMaintenanceHistory()
      setMaintenance(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch maintenance history')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id)
      setFormData(item)
    } else {
      setEditingId(null)
      setFormData({
        toolId: '',
        maintenanceType: '',
        scheduledDate: '',
        cost: '',
        description: '',
        status: 'pending'
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (activeTab === 'schedule') {
        if (editingId) {
          await toolroomService.updateMaintenanceSchedule(editingId, formData)
        } else {
          await toolroomService.createMaintenanceSchedule(formData)
        }
      } else {
        if (editingId) {
          await toolroomService.updateMaintenanceHistory(editingId, formData)
        } else {
          await toolroomService.createMaintenanceHistory(formData)
        }
      }
      activeTab === 'schedule' ? fetchMaintenanceSchedule() : fetchMaintenanceHistory()
      handleCloseModal()
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving maintenance')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        if (activeTab === 'schedule') {
          // Delete schedule - update status
          await toolroomService.updateMaintenanceSchedule(id, { status: 'cancelled' })
        }
        activeTab === 'schedule' ? fetchMaintenanceSchedule() : fetchMaintenanceHistory()
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting maintenance')
      }
    }
  }

  const filteredMaintenance = maintenance.filter(item =>
    item.toolId?.toString().includes(searchTerm) ||
    item.maintenanceType?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-8 h-8 text-orange-600" />
              Maintenance Management
            </h1>
            <p className="text-gray-600 mt-1">Schedule and track maintenance tasks</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Maintenance
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'schedule'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'history'
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              History
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search maintenance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent flex-1 outline-none text-gray-900"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tool ID</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Maintenance Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Scheduled Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredMaintenance.length > 0 ? (
                  filteredMaintenance.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.toolId}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.maintenanceType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(item.scheduledDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">₹{item.cost}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No maintenance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Maintenance' : 'Add Maintenance'}
              </h2>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tool ID *</label>
                <input
                  type="text"
                  name="toolId"
                  value={formData.toolId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type *</label>
                <select
                  name="maintenanceType"
                  value={formData.maintenanceType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select type</option>
                  <option value="preventive">Preventive</option>
                  <option value="corrective">Corrective</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaintenanceSchedule