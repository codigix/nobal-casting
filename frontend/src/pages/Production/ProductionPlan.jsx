import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'
import * as productionService from '../../services/productionService'
import ViewProductionPlanModal from '../../components/Production/ViewProductionPlanModal'
import './Production.css'

export default function ProductionPlan() {
  const navigate = useNavigate()
  const location = useLocation()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(location.state?.success || null)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [viewingPlanId, setViewingPlanId] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [filters])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await productionService.getProductionPlans(filters)
      setPlans(response.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch production plans')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (plan_id) => {
    if (window.confirm('Delete this production plan?')) {
      try {
        await productionService.deleteProductionPlan(plan_id)
        setSuccess('Plan deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchPlans()
      } catch (err) {
        setError(err.message || 'Failed to delete plan')
      }
    }
  }

  const handleEdit = (plan) => {
    navigate(`/production/plans/form/${plan.plan_id}`)
  }

  const handleViewPlan = (plan) => {
    setViewingPlanId(plan.plan_id)
    setShowViewModal(true)
  }

  const getStatusColor = (status) => {
    const colors = {
      planned: 'status-planned',
      'in-progress': 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      draft: 'status-draft'
    }
    return colors[status] || 'status-draft'
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📅 Production Plans</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Schedule and track production planning</p>
        </div>
        <button 
          onClick={() => navigate('/production/plans/form')}
          className="btn-submit w-auto"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> New Plan
        </button>
      </div>

      {success && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#16a34a',
          fontSize: '0.9rem'
        }}>
          ✓ {success}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#dc2626',
          fontSize: '0.9rem'
        }}>
          ✕ {error}
        </div>
      )}

      <ViewProductionPlanModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setViewingPlanId(null)
        }}
        planId={viewingPlanId}
      />

      <div className="filter-section">
        <div className="filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input type="text" name="search" placeholder="Search plan ID or product..." value={filters.search} onChange={handleFilterChange} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading production plans...</div>
      ) : plans.length > 0 ? (
        <div className="production-entries-container">
          <table className="entries-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" /></th>
                <th>ID</th>
                <th>Status</th>
                <th>Company</th>
                <th>Last Updated On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(plan => (
                <tr key={plan.plan_id}>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                  <td><strong>{plan.plan_id}</strong></td>
                  <td><span className={`work-order-status ${getStatusColor(plan.status)}`}>{plan.status}</span></td>
                  <td>{plan.company || 'N/A'}</td>
                  <td>{plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : new Date(plan.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="entry-actions">
                      <button className="btn-view" onClick={() => handleViewPlan(plan)} title="View"><Eye size={16} /></button>
                      <button className="btn-edit" onClick={() => handleEdit(plan)} title="Edit"><Edit2 size={16} /></button>
                      <button className="btn-delete" onClick={() => handleDelete(plan.plan_id)} title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '6px' }}>No production plans found</div>
      )}
    </div>
  )
}
