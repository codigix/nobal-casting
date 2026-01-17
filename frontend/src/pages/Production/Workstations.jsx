import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Workstations() {
  const navigate = useNavigate()
  const [workstations, setWorkstations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchWorkstations()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const fetchWorkstations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setWorkstations(data.data || [])
        setError(null)
      } else {
        setError('Failed to fetch workstations')
      }
    } catch (err) {
      setError('Error loading workstations')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (workstationName) => {
    if (!window.confirm('Are you sure you want to delete this workstation?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations/${workstationName}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('Workstation deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchWorkstations()
      } else {
        setError('Failed to delete workstation')
      }
    } catch (err) {
      setError('Error deleting workstation')
      console.error(err)
    }
  }

  const handleEdit = (workstation) => {
    navigate(`/manufacturing/workstations/${workstation.name}`, { state: { workstation } })
  }

  const filteredWorkstations = workstations.filter(ws => 
    ws.name.toLowerCase().includes(search.toLowerCase()) ||
    ws.workstation_name?.toLowerCase().includes(search.toLowerCase()) ||
    ws.description?.toLowerCase().includes(search.toLowerCase()) ||
    ws.workstation_type?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filteredWorkstations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedWorkstations = filteredWorkstations.slice(startIndex, endIndex)

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
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                🏭
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Workstations</h1>
                <p className="text-xs text-gray-600 mt-0">Manage manufacturing equipment</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/manufacturing/workstations/new')}
            className="btn-primary flex items-center gap-2 bg-gradient-to-br from-cyan-400 to-cyan-600"
          >
            <Plus size={16} /> New Workstation
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

        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <label className="text-xs font-semibold text-gray-700 block mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search name or description..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading workstations...</div>
          </div>
        ) : filteredWorkstations.length > 0 ? (
          <>
            <div className="bg-white rounded-lg shadow-sm">
              <div className="">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">ID</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Type</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Description</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Last Updated</th>
                      <th className="px-3 py-2 text-center text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedWorkstations.map((ws, idx) => (
                      <tr key={ws.name} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2 font-semibold text-gray-900">{ws.name}</td>
                        <td className="px-3 py-2 text-gray-700">{ws.workstation_name || ws.name}</td>
                        <td className="px-3 py-2 text-gray-700">{ws.workstation_type ? <span className="inline-block bg-cyan-100 text-cyan-800 px-2 py-1 rounded text-xs font-medium">{ws.workstation_type}</span> : '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{ws.description || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{formatDate(ws.modified)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <button 
                              onClick={() => handleEdit(ws)}
                              title="Edit"
                              className="p-1 hover:bg-cyan-50 rounded transition"
                            >
                              <Edit2 size={14} className="text-cyan-600" />
                            </button>
                            <button 
                              onClick={() => handleDelete(ws.name)}
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
            <div className="mt-3 flex items-center justify-between px-3 py-2">
              <div className="text-xs text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredWorkstations.length)} of {filteredWorkstations.length} workstations
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={16} className="text-gray-600" />
                </button>
                <span className="text-xs text-gray-700 font-medium min-w-[80px] text-center">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-semibold  text-gray-900">
              {search ? 'No workstations found' : 'No workstations created yet'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {search 
                ? 'Try adjusting your search terms' 
                : 'Create your first workstation to get started'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
