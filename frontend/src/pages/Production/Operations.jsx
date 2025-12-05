import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Clock } from 'lucide-react'
import './Production.css'

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
    navigate(`/production/operations/form/${operation.name}`, { state: { operation } })
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
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>⚙️ Operations</h1>
          <p className="header-subtitle">Manage manufacturing operations and sub-operations</p>
        </div>
        <button
          onClick={() => navigate('/production/operations/form')}
          className="btn-submit"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Add Operation
        </button>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">✕ {error}</div>}

      <div className="filter-section">
        <div className="filter-group">
          <label>Search</label>
          <input 
            type="text" 
            placeholder="Search operation name or workstation..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <p>Loading operations...</p>
        </div>
      ) : filteredOperations.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="entries-table">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>ID</th>
                <th style={{ width: '25%' }}>Operation Name</th>
                <th style={{ width: '25%' }}>Default Workstation</th>
                <th style={{ width: '15%' }}>Last Updated</th>
                <th style={{ width: '15%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.map((op) => (
                <tr key={op.name}>
                  <td>
                    <strong>{op.name}</strong>
                  </td>
                  <td>{op.operation_name || op.name}</td>
                  <td>
                    {op.default_workstation ? (
                      <span style={{ color: '#666' }}>{op.default_workstation}</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>
                      {formatDate(op.modified)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEdit(op)}
                        title="Edit operation"
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(op.name)}
                        title="Delete operation"
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
            {filteredOperations.length} of {operations.length} operations
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f9fafb', borderRadius: '8px', color: '#666' }}>
          <p>{search ? 'No operations found matching your search' : 'No operations created yet'}</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px', color: '#999' }}>
            {!search && <button onClick={() => navigate('/production/operations/form')} style={{ color: '#3b82f6', cursor: 'pointer', border: 'none', background: 'none', textDecoration: 'underline' }}>Create your first operation</button>}
          </p>
        </div>
      )}
    </div>
  )
}
