import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import toolroomService from '../../services/toolroomService'

const DieRegisterList = () => {
  const [dies, setDies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    dieName: '',
    dieCode: '',
    toolId: '',
    status: 'active',
    assignedTo: '',
    location: '',
    usageCount: 0,
    productionHours: 0,
    reworkRequired: false,
    notes: ''
  })

  useEffect(() => {
    fetchDieRegister()
  }, [])

  const fetchDieRegister = async () => {
    try {
      setLoading(true)
      const response = await toolroomService.getDieRegisterList()
      setDies(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch die register')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (die = null) => {
    if (die) {
      setEditingId(die.id)
      setFormData(die)
    } else {
      setEditingId(null)
      setFormData({
        dieName: '',
        dieCode: '',
        toolId: '',
        status: 'active',
        assignedTo: '',
        location: '',
        usageCount: 0,
        productionHours: 0,
        reworkRequired: false,
        notes: ''
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await toolroomService.updateDieRegister(editingId, formData)
      } else {
        await toolroomService.createDieRegister(formData)
      }
      fetchDieRegister()
      handleCloseModal()
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving die register')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await toolroomService.deleteDieRegister(id)
        fetchDieRegister()
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting die register')
      }
    }
  }

  const filteredDies = dies.filter(die =>
    die.dieName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    die.dieCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50p-3  ">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl  text-gray-900">Die Register</h1>
            <p className="text-gray-600 mt-1">Track die lifecycle and usage</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-xs flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Die
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-xs mb-6">
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-2 rounded-sm shadow mb-6">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search dies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent flex-1 outline-none text-gray-900"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xs shadow overflow-hidden">
          {loading ? (
            <div className="p-3 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-6  py-2 text-left text-xs   text-gray-900">Die Name</th>
                  <th className="p-6  py-2 text-left text-xs   text-gray-900">Die Code</th>
                  <th className="p-6  py-2 text-left text-xs   text-gray-900">Assigned To</th>
                  <th className="p-6  py-2 text-left text-xs   text-gray-900">Status</th>
                  <th className="p-6  py-2 text-left text-xs   text-gray-900">Usage Count</th>
                  <th className="p-6  py-2 text-left text-xs   text-gray-900">Prod Hours</th>
                  <th className="p-6  py-2 text-center text-xs   text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDies.length > 0 ? (
                  filteredDies.map(die => (
                    <tr key={die.id} className="hover:bg-gray-50">
                      <td className="p-2 text-xs text-gray-900 font-medium">{die.dieName}</td>
                      <td className="p-2 text-xs text-gray-600">{die.dieCode}</td>
                      <td className="p-2 text-xs text-gray-600">{die.assignedTo}</td>
                      <td className="p-2">
                        <span className={`inline-block p-2  py-1 rounded-full text-xs font-medium ${
                          die.status === 'active' ? 'bg-green-100 text-green-800' :
                          die.status === 'rework' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {die.status}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-gray-900">{die.usageCount}</td>
                      <td className="p-2 text-xs text-gray-900">{die.productionHours}h</td>
                      <td className="p-2 text-center text-xs">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(die)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(die.id)}
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
                    <td colSpan="7" className="p-6  py-8 text-center text-gray-500">No dies found</td>
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
          <div className="bg-white rounded-xs  max-w-4xl w-full mx-4">
            <div className="flex justify-between items-centerp-3   border-b">
              <h2 className="text-xl  text-gray-900">
                {editingId ? 'Edit Die' : 'Add New Die'}
              </h2>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-2 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Die Name *</label>
                <input
                  type="text"
                  name="dieName"
                  value={formData.dieName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Die Code *</label>
                <input
                  type="text"
                  name="dieCode"
                  value={formData.dieCode}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Assigned To</label>
                <input
                  type="text"
                  name="assignedTo"
                  value={formData.assignedTo}
                  onChange={handleInputChange}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Usage Count</label>
                <input
                  type="number"
                  name="usageCount"
                  value={formData.usageCount}
                  onChange={handleInputChange}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Production Hours</label>
                <input
                  type="number"
                  name="productionHours"
                  value={formData.productionHours}
                  onChange={handleInputChange}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="rework">Rework</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="reworkRequired"
                  checked={formData.reworkRequired}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded"
                />
                <label className="text-xs font-medium text-gray-700">Rework Required</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 p-2 border border-gray-300 rounded-xs text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 p-2 bg-green-600 text-white rounded-xs hover:bg-green-700"
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

export default DieRegisterList