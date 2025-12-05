import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import Card from '../../components/Card/Card'
import './Production.css'

export default function OperationForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [workstations, setWorkstations] = useState([])
  const [qualityTemplates, setQualityTemplates] = useState([])
  const [workstationDropdownOpen, setWorkstationDropdownOpen] = useState(false)
  const [workstationDropdownSearch, setWorkstationDropdownSearch] = useState('')
  const [workstationManualEntry, setWorkstationManualEntry] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    is_corrective_operation: false,
    default_workstation: '',
    create_job_card_based_on_batch_size: false,
    batch_size: 1,
    quality_inspection_template: '',
    description: ''
  })

  const [subOperations, setSubOperations] = useState([
    { _key: `row_${Date.now()}`, no: 1, operation: '', operation_time: 0 }
  ])

  useEffect(() => {
    fetchWorkstations()
    if (id) {
      fetchOperationDetails(id)
    }
  }, [id])

  useEffect(() => {
    const handleClickOutside = () => {
      setWorkstationDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchWorkstations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWorkstations(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchOperationDetails = async (opId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/operations/${opId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData(data)
        if (data.sub_operations && data.sub_operations.length > 0) {
          setSubOperations(data.sub_operations.map((op, idx) => ({
            ...op,
            _key: op._key || `row_${idx}`,
            no: idx + 1
          })))
        }
      }
    } catch (err) {
      setError('Failed to load operation details')
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)
  }

  const handleAddSubOperation = () => {
    const newRow = {
      _key: `row_${Date.now()}`,
      no: subOperations.length + 1,
      operation: '',
      operation_time: 0
    }
    setSubOperations([...subOperations, newRow])
  }

  const handleUpdateSubOperation = (index, field, value) => {
    const updated = [...subOperations]
    updated[index][field] = field === 'operation_time' ? parseFloat(value) || 0 : value
    setSubOperations(updated)
  }

  const handleRemoveSubOperation = (index) => {
    if (subOperations.length > 1) {
      const updated = subOperations.filter((_, i) => i !== index).map((op, idx) => ({
        ...op,
        no: idx + 1
      }))
      setSubOperations(updated)
    }
  }

  const getTotalOperationTime = () => {
    return subOperations.reduce((sum, op) => sum + (op.operation_time || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.name.trim()) throw new Error('Operation name is required')

      const cleanSubOps = subOperations.map(({ _key, ...rest }) => rest)

      const token = localStorage.getItem('token')
      const response = await fetch(
        id ? `${import.meta.env.VITE_API_URL}/operations/${id}` : `${import.meta.env.VITE_API_URL}/operations`,
        {
          method: id ? 'PUT' : 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, sub_operations: cleanSubOps })
        }
      )

      if (response.ok) {
        setSuccess('Operation saved successfully! Redirecting...')
        setTimeout(() => navigate('/production/operations'), 1500)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save operation')
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
          <h1>⚙️ {id ? 'Edit Operation' : 'Create Operation'}</h1>
          <p className="header-subtitle">{id ? 'Update operation details' : 'Define a new production operation'}</p>
        </div>
      </div>

      {error && <div className="alert alert-error">✕ {error}</div>}
      {success && <div className="alert alert-success">✓ {success}</div>}

      <form onSubmit={handleSubmit}>
        <Card className="form-card" style={{ marginBottom: '24px' }}>
          <div className="form-group">
            <label>Operation Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Assembly, Welding, Painting"
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Default Workstation</label>
              <div style={{display: 'flex', gap: '8px'}}>
                {!workstationManualEntry ? (
                  <div style={{flex: 1, position: 'relative'}} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="text" 
                      value={workstationDropdownOpen ? workstationDropdownSearch : (workstations.find(ws => ws.name === formData.default_workstation)?.workstation_name || formData.default_workstation || '')}
                      onChange={(e) => {
                        setWorkstationDropdownSearch(e.target.value)
                        if (!workstationDropdownOpen) setWorkstationDropdownOpen(true)
                      }}
                      onFocus={() => setWorkstationDropdownOpen(true)}
                      placeholder="Select Workstation"
                      style={{width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', fontFamily: 'inherit'}}
                      onClick={(e) => {e.stopPropagation(); setWorkstationDropdownOpen(true)}}
                    />
                    {workstationDropdownOpen && (
                      <div onClick={(e) => e.stopPropagation()} style={{position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', maxHeight: '300px', overflowY: 'auto', zIndex: 9999, marginTop: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: '300px'}}>
                        {workstations.filter(ws => 
                          ws.name.toLowerCase().includes(workstationDropdownSearch.toLowerCase()) ||
                          ws.workstation_name.toLowerCase().includes(workstationDropdownSearch.toLowerCase())
                        ).map(ws => (
                          <div 
                            key={ws.name}
                            onClick={(e) => {
                              e.stopPropagation()
                              setFormData({...formData, default_workstation: ws.name})
                              setWorkstationDropdownOpen(false)
                              setWorkstationDropdownSearch('')
                            }}
                            style={{padding: '10px 12px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background-color 0.15s'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                          >
                            <div style={{fontWeight: '600', fontSize: '13px', color: '#1f2937'}}>{ws.name}</div>
                            <div style={{fontSize: '12px', color: '#6b7280', marginTop: '2px'}}>{ws.workstation_name || ''}</div>
                          </div>
                        ))}
                        {workstations.filter(ws => 
                          ws.name.toLowerCase().includes(workstationDropdownSearch.toLowerCase()) ||
                          ws.workstation_name.toLowerCase().includes(workstationDropdownSearch.toLowerCase())
                        ).length === 0 && (
                          <div style={{padding: '10px 12px', textAlign: 'center', color: '#6b7280', fontSize: '13px'}}>
                            No workstations found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    name="default_workstation" 
                    value={formData.default_workstation} 
                    onChange={handleInputChange} 
                    placeholder="e.g., Lathe, Press" 
                    style={{flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', fontFamily: 'inherit'}} 
                  />
                )}
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    setWorkstationManualEntry(!workstationManualEntry)
                    setWorkstationDropdownOpen(false)
                    setWorkstationDropdownSearch('')
                  }}
                  style={{padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#f9fafb', cursor: 'pointer', fontSize: '14px'}}
                >
                  {workstationManualEntry ? '📋' : '✏️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_corrective_operation"
                  checked={formData.is_corrective_operation}
                  onChange={handleInputChange}
                />
                <span>Corrective Operation</span>
              </label>
            </div>
          </div>
        </Card>

        <Card className="form-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937', marginBottom: '16px', marginTop: 0 }}>Job Card Settings</h3>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="create_job_card_based_on_batch_size"
                checked={formData.create_job_card_based_on_batch_size}
                onChange={handleInputChange}
              />
              <span>Create Job Card based on Batch Size</span>
            </label>
          </div>

          {formData.create_job_card_based_on_batch_size && (
            <div className="form-grid-2">
              <div className="form-group">
                <label>Batch Size <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="number"
                  name="batch_size"
                  value={formData.batch_size}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                />
              </div>

              <div className="form-group">
                <label>Quality Inspection Template</label>
                <select
                  name="quality_inspection_template"
                  value={formData.quality_inspection_template}
                  onChange={handleInputChange}
                >
                  <option value="">Select Template</option>
                  {qualityTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </Card>

        <Card className="form-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>Sub Operations</h3>
            <button
              type="button"
              onClick={handleAddSubOperation}
              className="btn-add"
            >
              <Plus size={18} /> Add Row
            </button>
          </div>

          {subOperations.length === 0 ? (
            <div className="empty-state">
              <p>No sub-operations added yet. Click "Add Row" to start.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="entries-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>No.</th>
                    <th>Operation</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Time (hrs)</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subOperations.map((row, idx) => (
                    <tr key={row._key}>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{row.no}</td>
                      <td>
                        <input
                          type="text"
                          value={row.operation}
                          onChange={(e) => handleUpdateSubOperation(idx, 'operation', e.target.value)}
                          placeholder="e.g., Cut, Grind, Weld"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.operation_time}
                          onChange={(e) => handleUpdateSubOperation(idx, 'operation_time', e.target.value)}
                          min="0"
                          step="0.1"
                          placeholder="0.0"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            textAlign: 'center'
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {subOperations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSubOperation(idx)}
                            className="btn-delete-small"
                            title="Delete row"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="form-card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1f2937', marginBottom: '16px', marginTop: 0 }}>Operation Description</h3>
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detailed description of the operation, process notes, safety guidelines, etc."
              rows={6}
            />
          </div>
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={() => navigate('/production/operations')}
            className="btn-cancel"
          >
            Cancel
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
            <Save size={18} /> {loading ? 'Saving...' : 'Save Operation'}
          </button>
        </div>
      </form>
    </div>
  )
}
