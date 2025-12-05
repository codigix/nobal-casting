import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Clock, AlertCircle } from 'lucide-react'
import * as productionService from '../../services/productionService'
import CreateProductionPlanModal from '../../components/Production/CreateProductionPlanModal'
import './Production.css'

// Helper function to get week number
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export default function ProductionSchedule() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    status: '',
    week_number: ''
  })
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(new Date()))
  const [showModal, setShowModal] = useState(false)

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

  const getStatusColor = (status) => {
    const colors = {
      draft: '#f3f4f6',
      approved: '#dbeafe',
      scheduled: '#fef3c7',
      completed: '#dcfce7'
    }
    return colors[status] || '#f3f4f6'
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📅 Production Schedule</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Weekly production plans and schedules</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-submit w-auto" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> Create Plan
        </button>
      </div>

      {/* Modal */}
      <CreateProductionPlanModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchPlans}
      />

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Week Number</label>
          <input
            type="number"
            name="week_number"
            placeholder="Enter week number"
            value={filters.week_number}
            onChange={handleFilterChange}
          />
        </div>
      </div>

      {/* Production Plans */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading production plans...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', color: '#dc2626' }}>
          {error}
        </div>
      ) : plans.length > 0 ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          {plans.map(plan => (
            <div key={plan.plan_id} style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '5px', color: '#1a1a1a' }}>
                    {plan.plan_id}
                  </h3>
                  <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                    Week {plan.week_number} • {new Date(plan.plan_date).toLocaleDateString()}
                  </p>
                </div>
                <div style={{
                  background: getStatusColor(plan.status),
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  fontSize: '0.85rem'
                }}>
                  {plan.status}
                </div>
              </div>

              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px',
                marginBottom: '15px',
                paddingBottom: '15px',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9rem', fontWeight: '600' }}>
                    📋 Total Items
                  </p>
                  <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#f59e0b' }}>
                    {plan.total_items || 0}
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#666', fontSize: '0.9rem', fontWeight: '600' }}>
                    📅 Plan Date
                  </p>
                  <p style={{ margin: 0, fontSize: '1rem', color: '#1a1a1a' }}>
                    {new Date(plan.plan_date).toDateString()}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-edit" style={{ flex: 1 }}>View Details</button>
                <button className="btn-track" style={{ flex: 1 }}>Edit Plan</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
          <Calendar size={48} style={{ color: '#ccc', margin: '0 auto 15px' }} />
          <p style={{ color: '#666', fontSize: '1.1rem' }}>No production plans found</p>
        </div>
      )}
    </div>
  )
}