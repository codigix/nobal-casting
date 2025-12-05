import React, { useState, useEffect } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, Calendar, Package, Zap, User } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'

export default function ViewProductionPlanModal({ isOpen, onClose, planId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [jobCardsByWO, setJobCardsByWO] = useState({})
  const [expandedWOs, setExpandedWOs] = useState({})
  const [expandedJCWO, setExpandedJCWO] = useState(null)

  useEffect(() => {
    if (isOpen && planId) {
      fetchPlanDetails()
    }
  }, [isOpen, planId])

  const fetchPlanDetails = async () => {
    try {
      setLoading(true)
      const response = await productionService.getProductionPlanDetails(planId)
      setPlan(response.data)
      
      const woResponse = await productionService.getWorkOrders({ status: '' })
      setWorkOrders(woResponse.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load plan details')
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleWOExpand = async (wo_id) => {
    if (expandedWOs[wo_id]) {
      setExpandedWOs(prev => ({ ...prev, [wo_id]: false }))
      return
    }

    if (!jobCardsByWO[wo_id]) {
      try {
        const response = await productionService.getJobCards({ work_order_id: wo_id })
        setJobCardsByWO(prev => ({
          ...prev,
          [wo_id]: response.data || []
        }))
      } catch (err) {
        console.error('Failed to fetch job cards:', err)
      }
    }

    setExpandedWOs(prev => ({ ...prev, [wo_id]: true }))
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: '#fef3c7',
      pending: '#dbeafe',
      'in-progress': '#feca57',
      completed: '#dcfce7',
      cancelled: '#fee2e2',
      planned: '#dbeafe'
    }
    return colors[status] || '#f3f4f6'
  }

  const getStatusBorder = (status) => {
    const borders = {
      draft: '#f59e0b',
      pending: '#3b82f6',
      'in-progress': '#f97316',
      completed: '#10b981',
      cancelled: '#ef4444',
      planned: '#3b82f6'
    }
    return borders[status] || '#d1d5db'
  }

  const calculateCompletion = (jobCards) => {
    if (!jobCards || jobCards.length === 0) return 0
    const completed = jobCards.filter(jc => jc.status === 'completed').length
    return Math.round((completed / jobCards.length) * 100)
  }

  if (!plan && !loading) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📅 Production Plan Details" size="xl">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading plan details...</div>
      ) : (
        <>
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', borderLeft: `4px solid ${getStatusBorder(plan?.status)}` }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '4px' }}>Plan ID</label>
              <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{plan?.plan_id}</p>
            </div>
            <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', borderLeft: `4px solid ${getStatusBorder(plan?.status)}` }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '4px' }}>Status</label>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: getStatusColor(plan?.status),
                border: `1px solid ${getStatusBorder(plan?.status)}`,
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: plan?.status === 'completed' ? '#10b981' : plan?.status === 'in-progress' ? '#f97316' : '#666'
              }}>
                {plan?.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Calendar size={16} style={{ color: '#f59e0b' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>Planning Date</label>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>
                {plan?.plan_date ? new Date(plan.plan_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Zap size={16} style={{ color: '#3b82f6' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>Week Number</label>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{plan?.week_number || 'N/A'}</p>
            </div>
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Package size={16} style={{ color: '#10b981' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>Company</label>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{plan?.company || 'N/A'}</p>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '15px', color: '#1f2937' }}>
              📋 Associated Work Orders & Job Cards
            </h3>
            
            <div style={{ background: '#f9fafb', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e7eb', maxHeight: '400px', overflowY: 'auto' }}>
              {workOrders.length > 0 ? (
                workOrders.map(wo => (
                  <div key={wo.wo_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <div
                      onClick={() => toggleWOExpand(wo.wo_id)}
                      style={{
                        padding: '12px 15px',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.background = '#ffffff'}
                    >
                      <span>
                        {expandedWOs[wo.wo_id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', margin: 0, fontSize: '0.9rem' }}>
                          {wo.wo_id}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                          {wo.item_name || wo.item_code || 'N/A'} • Qty: {wo.quantity}
                        </p>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        background: getStatusColor(wo.status),
                        border: `1px solid ${getStatusBorder(wo.status)}`,
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#666'
                      }}>
                        {wo.status}
                      </span>
                    </div>

                    {expandedWOs[wo.wo_id] && (
                      <div style={{ background: '#fafafa', padding: '10px 0' }}>
                        {jobCardsByWO[wo.wo_id]?.length > 0 ? (
                          jobCardsByWO[wo.wo_id].map(jc => (
                            <div key={jc.job_card_id} style={{
                              padding: '10px 15px 10px 45px',
                              borderTop: '1px solid #e5e7eb',
                              background: '#fffbeb'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
                                <div>
                                  <p style={{ margin: 0, color: '#666', fontWeight: '500' }}>{jc.job_card_id}</p>
                                  <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: '0.8rem' }}>Operation: {jc.operation || 'N/A'}</p>
                                </div>
                                <div>
                                  <p style={{ margin: 0, color: '#666', fontWeight: '500' }}>
                                    Qty: {jc.planned_quantity} / {jc.produced_quantity || 0}
                                  </p>
                                  <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: '0.8rem' }}>Progress: {calculateCompletion([jc])}%</p>
                                </div>
                                <div>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    background: getStatusColor(jc.status),
                                    border: `1px solid ${getStatusBorder(jc.status)}`,
                                    borderRadius: '3px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: jc.status === 'completed' ? '#10b981' : jc.status === 'in-progress' ? '#f97316' : '#666'
                                  }}>
                                    {jc.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '10px 15px 10px 45px', color: '#999', fontSize: '0.85rem' }}>
                            No job cards
                          </div>
                        )}
                        {jobCardsByWO[wo.wo_id] && jobCardsByWO[wo.wo_id].length > 0 && (
                          <div style={{
                            padding: '10px 15px 10px 45px',
                            background: '#f3f4f6',
                            borderTop: '1px solid #e5e7eb',
                            fontSize: '0.85rem'
                          }}>
                            <strong>Completion: {calculateCompletion(jobCardsByWO[wo.wo_id])}%</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No work orders found
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              onClick={onClose}
              style={{ 
                padding: '8px 16px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                background: '#f3f4f6', 
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
