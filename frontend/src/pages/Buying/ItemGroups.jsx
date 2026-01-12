import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react'
import api from '../../services/api'

export default function ItemGroups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    fetchItemGroups()
  }, [])

  const fetchItemGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/item-groups')
      setGroups(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch item groups')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (group = null) => {
    if (group) {
      setEditingGroup(group)
      setFormData({
        name: group.name || '',
        description: group.description || ''
      })
    } else {
      setEditingGroup(null)
      setFormData({
        name: '',
        description: ''
      })
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingGroup(null)
    setFormData({
      name: '',
      description: ''
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Item Group name is required')
      return
    }

    try {
      setLoading(true)
      if (editingGroup) {
        await api.put(`/item-groups/${editingGroup.id}`, formData)
        setSuccess('Item Group updated successfully')
      } else {
        await api.post('/item-groups', formData)
        setSuccess('Item Group created successfully')
      }
      setTimeout(() => setSuccess(null), 3000)
      handleCloseForm()
      fetchItemGroups()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save item group')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this item group?')) {
      try {
        await api.delete(`/item-groups/${groupId}`)
        setSuccess('Item Group deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchItemGroups()
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to delete item group')
      }
    }
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 px-6 py-6 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white">
            <FolderOpen size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Item Groups</h1>
            <p className="text-xs text-gray-600">Manage product categories and groups</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenForm()}
          className="btn-primary flex items-center gap-2 bg-gradient-to-br from-purple-400 to-purple-600"
        >
          <Plus size={16} /> Add Item Group
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 p-3 text-xs text-green-800">
          <span>✓</span> {success}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
          <span>✕</span> {error}
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingGroup ? 'Edit Item Group' : 'Add Item Group'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Raw Materials, Finished Goods..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Optional description..."
                  rows="3"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-xs font-medium text-white hover:from-purple-500 hover:to-purple-700 disabled:opacity-50 transition-all"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {loading && !showForm ? (
          <div className="flex items-center justify-center px-4 py-12 text-gray-500">
            <div className="text-sm">Loading item groups...</div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-gray-500">
            <FolderOpen size={32} className="mb-3 opacity-50" />
            <div className="text-sm">No item groups found</div>
            <button
              onClick={() => handleOpenForm()}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
            >
              Create First Item Group
            </button>
          </div>
        ) : (
          <div className="">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, idx) => (
                  <tr
                    key={group.id}
                    className={`border-b border-gray-100 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-purple-50 transition-colors`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{group.name}</td>
                    <td className="px-4 py-3 text-gray-700">{group.description || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenForm(group)}
                          className="rounded-md p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="rounded-md p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
