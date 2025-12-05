import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import './Production.css'

export default function Workstations() {
  const navigate = useNavigate()
  const [workstations, setWorkstations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchWorkstations()
  }, [])

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
    navigate(`/production/workstations/form/${workstation.name}`, { state: { workstation } })
  }

  const filteredWorkstations = workstations.filter(ws => 
    ws.name.toLowerCase().includes(search.toLowerCase()) ||
    ws.workstation_name?.toLowerCase().includes(search.toLowerCase()) ||
    ws.description?.toLowerCase().includes(search.toLowerCase())
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
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>🏭 Workstations</h1>
          <p className="header-subtitle">Manage manufacturing workstations</p>
        </div>
        <button
          onClick={() => navigate('/production/workstations/form')}
          className="btn-submit"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Add Workstation
        </button>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">✕ {error}</div>}

      <div className="filter-section">
        <div className="filter-group">
          <label>Search</label>
          <input 
            type="text" 
            placeholder="Search workstation name or description..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <p>Loading workstations...</p>
        </div>
      ) : filteredWorkstations.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="entries-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>ID</th>
                <th style={{ width: '25%' }}>Workstation Name</th>
                <th style={{ width: '30%' }}>Description</th>
                <th style={{ width: '15%' }}>Last Updated</th>
                <th style={{ width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkstations.map((ws) => (
                <tr key={ws.name}>
                  <td>
                    <strong>{ws.name}</strong>
                  </td>
                  <td>{ws.workstation_name || ws.name}</td>
                  <td>
                    <span style={{ color: '#666' }}>
                      {ws.description || '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>
                      {formatDate(ws.modified)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEdit(ws)}
                        title="Edit workstation"
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(ws.name)}
                        title="Delete workstation"
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '16px', textAlign: 'right', color: '#666', fontSize: '0.9rem' }}>
            {filteredWorkstations.length} of {workstations.length} workstations
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px', color: '#666' }}>
          <p>{search ? 'No workstations found matching your search' : 'No workstations created yet'}</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px', color: '#999' }}>
            {!search && <button onClick={() => navigate('/production/workstations/form')} style={{ color: '#3b82f6', cursor: 'pointer', border: 'none', background: 'none', textDecoration: 'underline' }}>Create your first workstation</button>}
          </p>
        </div>
      )}
    </div>
  )
}
