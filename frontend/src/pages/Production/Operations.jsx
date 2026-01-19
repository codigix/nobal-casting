import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Clock } from 'lucide-react'

export default function Operations() {
  const navigate = useNavigate()
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchOperations()
  }, [])

  const fetchOperations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/operations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setOperations(data.data || [])
        setError(null)
      } else {
        setError('Failed to fetch operations')
      }
    } catch (err) {
      setError('Error loading operations')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (operationName) => {
    if (!window.confirm('Are you sure you want to delete this operation?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/operations/${operationName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('Operation deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchOperations()
      } else {
        setError('Failed to delete operation')
      }
    } catch (err) {
      setError('Error deleting operation')
      console.error(err)
    }
  }

  const handleEdit = (operation) => {
    navigate(`/manufacturing/operations/${operation.name}`, { state: { operation } })
  }

  const filteredOperations = operations.filter(op => 
    op.name.toLowerCase().includes(search.toLowerCase()) ||
    op.operation_name?.toLowerCase().includes(search.toLowerCase()) ||
    op.default_workstation?.toLowerCase().includes(search.toLowerCase())
  )

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return '-'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className=" mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xs bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                ⚙️
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Operations</h1>
                <p className="text-xs text-gray-600 mt-0">Manage manufacturing operations</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/manufacturing/operations/new')}
            className="btn-primary flex items-center gap-2 bg-gradient-to-br from-orange-400 to-orange-600"
          >
            <Plus size={16} /> New operation
          </button>
        </div>

        {success && (
          <div className="mb-2 p-2 pl-3 bg-green-50 border-l-4 border-green-400 rounded text-xs text-green-800 flex gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-2 p-2 pl-3 bg-red-50 border-l-4 border-red-400 rounded text-xs text-red-800 flex gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-xs shadow-sm p-3 mb-3">
          <label className="text-xs font-semibold text-gray-700 block mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search name or workstation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xs p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading operations...</div>
          </div>
        ) : filteredOperations.length > 0 ? (
          <>
            <div className="bg-white rounded-xs shadow-sm">
              <div className="">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">ID</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Operation Name</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Default Workstation</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Last Updated</th>
                      <th className="px-3 py-2 text-center text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOperations.map((op, idx) => (
                      <tr key={op.name} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2 font-semibold text-gray-900">{op.name}</td>
                        <td className="px-3 py-2 text-gray-700">{op.operation_name || op.name}</td>
                        <td className="px-3 py-2 text-gray-700">{op.default_workstation || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{formatDate(op.modified)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <button 
                              onClick={() => handleEdit(op)}
                              title="Edit"
                              className="p-1 hover:bg-orange-50 rounded transition"
                            >
                              <Edit2 size={14} className="text-orange-600" />
                            </button>
                            <button 
                              onClick={() => handleDelete(op.name)}
                              title="Delete"
                              className="p-1 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 px-3 py-2 text-right text-xs text-gray-600">
              Showing {filteredOperations.length} of {operations.length} operations
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xs p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-semibold  text-gray-900">
              {search ? 'No operations found' : 'No operations created yet'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {search 
                ? 'Try adjusting your search terms' 
                : 'Create your first operation to get started'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
