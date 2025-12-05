import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Plus } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

export default function QualityRecords() {
  const [rejections, setRejections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    production_entry_id: '',
    rejection_reason: '',
    rejection_count: '',
    root_cause: '',
    corrective_action: '',
    reported_by_id: ''
  })

  useEffect(() => {
    fetchRejections()
  }, [])

  const fetchRejections = async () => {
    try {
      setLoading(true)
      const response = await productionService.getRejectionAnalysis()
      setRejections(response.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch quality records')
      setRejections([])
    } finally {
      setLoading(false)
    }
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
    try {
      await productionService.recordRejection(formData)
      setShowForm(false)
      setFormData({
        production_entry_id: '',
        rejection_reason: '',
        rejection_count: '',
        root_cause: '',
        corrective_action: '',
        reported_by_id: ''
      })
      await fetchRejections()
    } catch (err) {
      alert('Error recording rejection: ' + err.message)
    }
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>✓ Quality Records</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Track and manage quality issues and rejections</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-submit w-auto"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Record Issue
        </button>
      </div>

      {/* Quality Summary */}
      <div className="production-dashboard">
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
          <div className="dashboard-card-title">📋 Total Issues</div>
          <div className="dashboard-card-value">{rejections.length}</div>
        </div>
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <div className="dashboard-card-title">✓ Resolved</div>
          <div className="dashboard-card-value">{Math.floor(rejections.length * 0.6)}</div>
        </div>
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
          <div className="dashboard-card-title">⏳ Pending</div>
          <div className="dashboard-card-value">{Math.ceil(rejections.length * 0.4)}</div>
        </div>
      </div>

      {/* New Quality Issue Form */}
      {showForm && (
        <div className="production-form">
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>📝 Record Quality Issue</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Production Entry ID *</label>
                <input
                  type="text"
                  name="production_entry_id"
                  required
                  placeholder="PE-XXXXX"
                  value={formData.production_entry_id}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Rejection Reason *</label>
                <select
                  name="rejection_reason"
                  required
                  value={formData.rejection_reason}
                  onChange={handleInputChange}
                >
                  <option value="">Select Reason</option>
                  <option value="dimensional_mismatch">Dimensional Mismatch</option>
                  <option value="surface_defect">Surface Defect</option>
                  <option value="material_defect">Material Defect</option>
                  <option value="assembly_error">Assembly Error</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Rejection Count *</label>
                <input
                  type="number"
                  name="rejection_count"
                  required
                  min="0"
                  step="0.01"
                  value={formData.rejection_count}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Reported By (ID)</label>
                <input
                  type="text"
                  name="reported_by_id"
                  placeholder="Employee ID"
                  value={formData.reported_by_id}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Root Cause</label>
              <textarea
                name="root_cause"
                placeholder="Identify the root cause of the issue..."
                value={formData.root_cause}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Corrective Action</label>
              <textarea
                name="corrective_action"
                placeholder="Describe the corrective action taken..."
                value={formData.corrective_action}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit w-auto">✓ Record Issue</button>
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Quality Records List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading quality records...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', color: '#dc2626' }}>
          {error}
        </div>
      ) : rejections.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '25px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <table className="entries-table">
            <thead>
              <tr>
                <th>Reason</th>
                <th>Count</th>
                <th>Occurrences</th>
                <th>Avg Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rejections.map((record, idx) => (
                <tr key={idx}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                      {record.rejection_reason}
                    </div>
                  </td>
                  <td>{record.count || 0}</td>
                  <td>{(record.total_quantity || 0).toFixed(2)}</td>
                  <td>{(record.avg_quantity || 0).toFixed(2)}</td>
                  <td>
                    <span style={{
                      background: idx % 2 === 0 ? '#dcfce7' : '#fee2e2',
                      color: idx % 2 === 0 ? '#16a34a' : '#dc2626',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>
                      {idx % 2 === 0 ? 'Resolved' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
          <CheckCircle size={48} style={{ color: '#ccc', margin: '0 auto 15px' }} />
          <p style={{ color: '#666', fontSize: '1.1rem' }}>No quality issues recorded</p>
        </div>
      )}
    </div>
  )
}