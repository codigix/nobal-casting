import React, { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react'
import toolroomService from '../../services/toolroomService'

const ToolMasterList = () => {
  const [tools, setTools] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    toolName: '',
    toolCode: '',
    toolType: '',
    status: 'active',
    location: '',
    acquisitionDate: '',
    cost: '',
    description: ''
  })

  useEffect(() => {
    fetchTools()
  }, [])

  const fetchTools = async () => {
    try {
      setLoading(true)
      const response = await toolroomService.getToolsList()
      setTools(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch tools')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (tool = null) => {
    if (tool) {
      setEditingId(tool.id)
      setFormData(tool)
    } else {
      setEditingId(null)
      setFormData({
        toolName: '',
        toolCode: '',
        toolType: '',
        status: 'active',
        location: '',
        acquisitionDate: '',
        cost: '',
        description: ''
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
      if (editingId) {
        await toolroomService.updateTool(editingId, formData)
      } else {
        await toolroomService.createTool(formData)
      }
      fetchTools()
      handleCloseModal()
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving tool')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await toolroomService.deleteTool(id)
        fetchTools()
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting tool')
      }
    }
  }

  const filteredTools = tools.filter(tool =>
    tool.toolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.toolCode?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50p-3  ">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-xl  text-gray-900">Tool Master</h1>
            <p className="text-gray-600 mt-1">Manage tools and equipment</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xs flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Tool
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
              placeholder="Search tools..."
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
                  <th className="p-6  py-2 text-left text-xs font-semibold  text-gray-900">Tool Name</th>
                  <th className="p-6  py-2 text-left text-xs font-semibold  text-gray-900">Tool Code</th>
                  <th className="p-6  py-2 text-left text-xs font-semibold  text-gray-900">Type</th>
                  <th className="p-6  py-2 text-left text-xs font-semibold  text-gray-900">Location</th>
                  <th className="p-6  py-2 text-left text-xs font-semibold  text-gray-900">Status</th>
                  <th className="p-6  py-2 text-left text-xs font-semibold  text-gray-900">Cost</th>
                  <th className="p-6  py-2 text-center text-xs font-semibold  text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTools.length > 0 ? (
                  filteredTools.map(tool => (
                    <tr key={tool.id} className="hover:bg-gray-50">
                      <td className="p-2 text-xs text-gray-900 font-medium">{tool.toolName}</td>
                      <td className="p-2 text-xs text-gray-600">{tool.toolCode}</td>
                      <td className="p-2 text-xs text-gray-600">{tool.toolType}</td>
                      <td className="p-2 text-xs text-gray-600">{tool.location}</td>
                      <td className="p-2">
                        <span className={`inline-block p-2  py-1 rounded-full text-xs font-medium ${
                          tool.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tool.status}
                        </span>
                      </td>
                      <td className="p-2 text-xs text-gray-900 font-medium">₹{tool.cost}</td>
                      <td className="p-2 text-center text-xs">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(tool)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(tool.id)}
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
                    <td colSpan="7" className="p-6  py-8 text-center text-gray-500">No tools found</td>
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
                {editingId ? 'Edit Tool' : 'Add New Tool'}
              </h2>
              <button onClick={handleCloseModal}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-3 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Tool Name *</label>
                <input
                  type="text"
                  name="toolName"
                  value={formData.toolName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Tool Code *</label>
                <input
                  type="text"
                  name="toolCode"
                  value={formData.toolCode}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Tool Type</label>
                <input
                  type="text"
                  name="toolType"
                  value={formData.toolType}
                  onChange={handleInputChange}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs  text-gray-700 mb-1">Cost</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
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
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
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
                  className="flex-1 p-2 bg-blue-600 text-white rounded-xs hover:bg-blue-700"
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

export default ToolMasterList