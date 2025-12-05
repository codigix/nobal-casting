import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import Card from '../../components/Card/Card'
import './Production.css'

export default function WorkstationForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    workstation_name: '',
    description: '',
    location: '',
    capacity_per_hour: 0,
    is_active: true
  })

  useEffect(() => {
    if (id && location.state?.workstation) {
      setFormData(location.state.workstation)
    } else if (id) {
      fetchWorkstationDetails(id)
    }
  }, [id, location])

  const fetchWorkstationDetails = async (wsId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations/${wsId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData(data.data || data)
      }
    } catch (err) {
      setError('Failed to load workstation details')
      console.error(err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'capacity_per_hour' ? parseFloat(value) || 0 : value)
    }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.name.trim()) throw new Error('Workstation name is required')

      const token = localStorage.getItem('token')
      const response = await fetch(
        id ? `${import.meta.env.VITE_API_URL}/production/workstations/${id}` : `${import.meta.env.VITE_API_URL}/production/workstations`,
        {
          method: id ? 'PUT' : 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        }
      )

      if (response.ok) {
        setSuccess('Workstation saved successfully! Redirecting...')
        setTimeout(() => navigate('/production/workstations'), 1500)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save workstation')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>🏭 {id ? 'Edit Workstation' : 'Create Workstation'}</h1>
          <p className="header-subtitle">{id ? 'Update workstation details' : 'Define a new workstation'}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">✕ {error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      <form onSubmit={handleSubmit}>
        <Card className="form-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937', marginBottom: '16px', marginTop: 0 }}>Basic Information</h3>

          <div className="form-group">
            <label>Workstation ID <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., WS-001, ASSEMBLY-A1"
              required
              disabled={id ? true : false}
            />
          </div>

          <div className="form-group">
            <label>Workstation Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              name="workstation_name"
              value={formData.workstation_name}
              onChange={handleInputChange}
              placeholder="e.g., Assembly Line 1"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Building A, Floor 2"
              />
            </div>

            <div className="form-group">
              <label>Capacity (units/hour)</label>
              <input
                type="number"
                name="capacity_per_hour"
                value={formData.capacity_per_hour}
                onChange={handleInputChange}
                min="0"
                step="0.1"
                placeholder="0"
              />
            </div>
          </div>
        </Card>

        <Card className="form-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937', marginBottom: '16px', marginTop: 0 }}>Details</h3>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of the workstation, equipment, specifications, etc."
              rows={6}
            />
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
              />
              <span>Active</span>
            </label>
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => navigate('/production/workstations')}
            className="btn-cancel"
          >
            <X size={18} /> Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-submit"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save Workstation'}
          </button>
        </div>
      </form>
    </div>
  )
}
