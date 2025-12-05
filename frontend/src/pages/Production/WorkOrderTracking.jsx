import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Zap, TrendingUp } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

const PRODUCTION_STAGES = [
  { id: 'pending', label: 'Pending', icon: '📋', color: '#3b82f6' },
  { id: 'in-progress', label: 'In Progress', icon: '⚙️', color: '#f59e0b' },
  { id: 'completed', label: 'Completed', icon: '✓', color: '#10b981' },
  { id: 'quality-check', label: 'Quality Check', icon: '🔍', color: '#8b5cf6' },
  { id: 'delivered', label: 'Delivered', icon: '📦', color: '#06b6d4' }
]

export default function WorkOrderTracking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [workOrder, setWorkOrder] = useState(null)
  const [jobCards, setJobCards] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    qualityCheck: 0,
    delivered: 0
  })
  const [selectedStage, setSelectedStage] = useState(null)

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const woResponse = await productionService.getWorkOrder(id)
      setWorkOrder(woResponse.data)

      const jcResponse = await productionService.getJobCards({ work_order_id: id })
      const jobCardsData = jcResponse.data || []
      setJobCards(jobCardsData)
      
      calculateStats(jobCardsData)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch work order tracking data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (jobCardsData) => {
    const total = jobCardsData.length
    const pending = jobCardsData.filter(j => j.status === 'pending' || j.status === 'draft').length
    const inProgress = jobCardsData.filter(j => j.status === 'in-progress').length
    const completed = jobCardsData.filter(j => j.status === 'completed').length
    const qualityCheck = jobCardsData.filter(j => j.status === 'quality-check').length
    const delivered = jobCardsData.filter(j => j.status === 'delivered').length

    setStats({ total, pending, inProgress, completed, qualityCheck, delivered })
  }

  const getJobCardsByStage = (stage) => {
    return jobCards.filter(jc => {
      const status = jc.status || 'pending'
      if (stage === 'pending') return status === 'pending' || status === 'draft'
      if (stage === 'quality-check') return status === 'quality-check'
      return status === stage
    })
  }

  const getProgressPercentage = () => {
    if (stats.total === 0) return 0
    return Math.round(((stats.completed + stats.delivered) / stats.total) * 100)
  }

  const getStageStats = (stage) => {
    const stageMap = {
      'pending': stats.pending,
      'in-progress': stats.inProgress,
      'completed': stats.completed,
      'quality-check': stats.qualityCheck,
      'delivered': stats.delivered
    }
    return stageMap[stage] || 0
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      'pending': 'status-draft',
      'draft': 'status-draft',
      'in-progress': 'status-in-progress',
      'completed': 'status-completed',
      'quality-check': 'status-planned',
      'delivered': 'status-completed'
    }
    return statusMap[status] || 'status-draft'
  }

  if (loading) {
    return (
      <div className="wo-dashboard">
        <div className="wo-loading">
          <div className="wo-loading-icon">⏳</div>
          <div className="wo-loading-text">Loading work order tracking...</div>
        </div>
      </div>
    )
  }

  if (error || !workOrder) {
    return (
      <div className="wo-dashboard">
        <button onClick={() => navigate('/production/work-orders')} className="back-button" style={{ marginBottom: '20px' }}>
          <ArrowLeft size={18} /> Back to Work Orders
        </button>
        <div className="wo-empty-state">
          <div className="wo-empty-icon">⚠️</div>
          <div className="wo-empty-title">{error || 'Work Order Not Found'}</div>
          <div className="wo-empty-text">The work order you're looking for doesn't exist or an error occurred.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="wo-dashboard">
      <button onClick={() => navigate('/production/work-orders')} className="back-button" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} /> Back to Work Orders
      </button>

      <div className="wot-header">
        <div className="wot-header-content">
          <h1>Work Order Tracking</h1>
          <p>Monitor production stages for work order <strong>{id}</strong></p>
        </div>
      </div>

      <div className="wot-work-order-info">
        <div className="wot-info-item">
          <span className="wot-label">Item:</span>
          <span className="wot-value">{workOrder.item_name || workOrder.item_code || 'N/A'}</span>
        </div>
        <div className="wot-info-item">
          <span className="wot-label">Quantity:</span>
          <span className="wot-value">{workOrder.qty_to_manufacture || workOrder.quantity || 0}</span>
        </div>
        <div className="wot-info-item">
          <span className="wot-label">Due Date:</span>
          <span className="wot-value">
            {workOrder.required_date ? new Date(workOrder.required_date).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <div className="wot-info-item">
          <span className="wot-label">Status:</span>
          <span className={`wo-status-badge ${getStatusBadgeClass(workOrder.status)}`}>
            {workOrder.status}
          </span>
        </div>
      </div>

      <div className="wot-progress-section">
        <div className="wot-progress-header">
          <h3>Overall Progress</h3>
          <span className="wot-progress-percentage">{getProgressPercentage()}%</span>
        </div>
        <div className="wot-progress-bar">
          <div className="wot-progress-fill" style={{ width: `${getProgressPercentage()}%` }}></div>
        </div>
        <div className="wot-progress-info">
          <div className="wot-progress-info-item">
            <span className="wot-progress-icon">✓</span>
            <span>{stats.completed + stats.delivered} Completed</span>
          </div>
          <div className="wot-progress-info-item">
            <span className="wot-progress-icon">⚙️</span>
            <span>{stats.inProgress} In Progress</span>
          </div>
          <div className="wot-progress-info-item">
            <span className="wot-progress-icon">📋</span>
            <span>{stats.pending} Pending</span>
          </div>
        </div>
      </div>

      <div className="wot-stats-grid">
        {PRODUCTION_STAGES.map(stage => (
          <div
            key={stage.id}
            className={`wot-stat-card ${selectedStage === stage.id ? 'active' : ''}`}
            onClick={() => setSelectedStage(selectedStage === stage.id ? null : stage.id)}
            style={{ borderTopColor: stage.color }}
          >
            <div className="wot-stat-icon">{stage.icon}</div>
            <div className="wot-stat-content">
              <div className="wot-stat-label">{stage.label}</div>
              <div className="wot-stat-value" style={{ color: stage.color }}>
                {getStageStats(stage.id)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="wot-timeline">
        <h2>Production Timeline</h2>
        <div className="wot-stages-container">
          {PRODUCTION_STAGES.map((stage, idx) => (
            <div key={stage.id} className="wot-stage">
              <div className="wot-stage-header">
                <div className="wot-stage-title">{stage.label}</div>
                <div className="wot-stage-count" style={{ backgroundColor: stage.color }}>
                  {getStageStats(stage.id)}
                </div>
              </div>

              <div className="wot-stage-cards">
                {getJobCardsByStage(stage.id).length > 0 ? (
                  getJobCardsByStage(stage.id).map((card, idx) => (
                    <div key={card.job_card_id || idx} className="wot-job-card">
                      <div className="wot-job-card-header">
                        <strong>{card.job_card_id || `Job ${idx + 1}`}</strong>
                        <span className={`wot-job-status-badge ${getStatusBadgeClass(card.status)}`}>
                          {card.status}
                        </span>
                      </div>
                      <div className="wot-job-card-body">
                        <div className="wot-job-detail">
                          <span className="wot-job-label">Planned:</span>
                          <span className="wot-job-value">{card.planned_quantity || 0}</span>
                        </div>
                        <div className="wot-job-detail">
                          <span className="wot-job-label">Produced:</span>
                          <span className="wot-job-value">{card.produced_quantity || 0}</span>
                        </div>
                        <div className="wot-job-detail">
                          <span className="wot-job-label">Operator:</span>
                          <span className="wot-job-value">{card.operator_id || 'Unassigned'}</span>
                        </div>
                        {card.scheduled_start_date && (
                          <div className="wot-job-detail">
                            <span className="wot-job-label">Start:</span>
                            <span className="wot-job-value">
                              {new Date(card.scheduled_start_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="wot-job-progress">
                        <div className="wot-job-progress-bar">
                          <div
                            className="wot-job-progress-fill"
                            style={{
                              width: card.planned_quantity
                                ? `${(card.produced_quantity / card.planned_quantity) * 100}%`
                                : 0
                            }}
                          ></div>
                        </div>
                        <span className="wot-job-progress-text">
                          {card.planned_quantity
                            ? `${Math.round((card.produced_quantity / card.planned_quantity) * 100)}%`
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="wot-stage-empty">
                    <span>No job cards</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="wot-summary">
        <div className="wot-summary-card">
          <div className="wot-summary-icon">
            <Zap size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div className="wot-summary-content">
            <div className="wot-summary-label">Total Job Cards</div>
            <div className="wot-summary-value">{stats.total}</div>
          </div>
        </div>

        <div className="wot-summary-card">
          <div className="wot-summary-icon">
            <Clock size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div className="wot-summary-content">
            <div className="wot-summary-label">Currently Processing</div>
            <div className="wot-summary-value">{stats.inProgress}</div>
          </div>
        </div>

        <div className="wot-summary-card">
          <div className="wot-summary-icon">
            <CheckCircle size={24} style={{ color: '#10b981' }} />
          </div>
          <div className="wot-summary-content">
            <div className="wot-summary-label">Completed</div>
            <div className="wot-summary-value">{stats.completed + stats.delivered}</div>
          </div>
        </div>

        <div className="wot-summary-card">
          <div className="wot-summary-icon">
            <TrendingUp size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div className="wot-summary-content">
            <div className="wot-summary-label">Completion Rate</div>
            <div className="wot-summary-value">{getProgressPercentage()}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
