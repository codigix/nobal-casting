import React, { useState, useEffect } from 'react'
import { Package, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

export default function BatchTracking() {
  const [entries, setEntries] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchBatchData()
  }, [dateRange])

  const fetchBatchData = async () => {
    try {
      setLoading(true)
      const response = await productionService.getProductionEntries()
      setEntries(response.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch batch data')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  const getBatchSummary = () => {
    const summary = {
      totalBatches: entries.length,
      totalProduced: entries.reduce((sum, e) => sum + (e.quantity_produced || 0), 0),
      totalRejected: entries.reduce((sum, e) => sum + (e.quantity_rejected || 0), 0),
      avgQuality: entries.length > 0 
        ? ((entries.reduce((sum, e) => sum + (e.quantity_produced - e.quantity_rejected || 0), 0) / 
            entries.reduce((sum, e) => sum + (e.quantity_produced || 0), 0)) * 100).toFixed(2)
        : 0
    }
    return summary
  }

  const summary = getBatchSummary()

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📦 Batch Tracking</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Track production batches and quality metrics</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="filter-section">
        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
          />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="production-dashboard">
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' }}>
          <div className="dashboard-card-title">📦 Total Batches</div>
          <div className="dashboard-card-value">{summary.totalBatches}</div>
        </div>
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <div className="dashboard-card-title">✓ Total Produced</div>
          <div className="dashboard-card-value">{summary.totalProduced.toFixed(0)}</div>
        </div>
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
          <div className="dashboard-card-title">✗ Total Rejected</div>
          <div className="dashboard-card-value">{summary.totalRejected.toFixed(0)}</div>
        </div>
        <div className="dashboard-card" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' }}>
          <div className="dashboard-card-title">✅ Quality Rate</div>
          <div className="dashboard-card-value">{summary.avgQuality}%</div>
        </div>
      </div>

      {/* Batch Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading batch data...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', color: '#dc2626' }}>
          {error}
        </div>
      ) : entries.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '25px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ marginTop: 0, marginBottom: '25px', color: '#1a1a1a' }}>Batch Timeline</h2>
          <div className="batch-tracking-timeline">
            {entries.map((entry, index) => {
              const produced = entry.quantity_produced || 0
              const rejected = entry.quantity_rejected || 0
              const accepted = produced - rejected
              const qualityRate = produced > 0 ? ((accepted / produced) * 100).toFixed(1) : 0
              
              return (
                <div key={entry.entry_id} className="timeline-item">
                  {index < entries.length - 1 && <div className="timeline-line" />}
                  <div className="timeline-marker" style={{
                    background: qualityRate >= 95 ? '#10b981' : qualityRate >= 85 ? '#f59e0b' : '#ef4444'
                  }}>
                    {index + 1}
                  </div>
                  <div className="timeline-content">
                    <h4>{entry.entry_id}</h4>
                    <p><strong>Work Order:</strong> {entry.wo_id}</p>
                    <p><strong>Machine:</strong> {entry.machine_name}</p>
                    <p><strong>Date:</strong> {new Date(entry.entry_date).toLocaleDateString()}</p>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '10px',
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '600' }}>Produced</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a1a1a' }}>
                          {produced.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '600' }}>Rejected</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ef4444' }}>
                          {rejected.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: '600' }}>Quality</span>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: '700',
                          color: qualityRate >= 95 ? '#10b981' : qualityRate >= 85 ? '#f59e0b' : '#ef4444'
                        }}>
                          {qualityRate}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
          <Package size={48} style={{ color: '#ccc', margin: '0 auto 15px' }} />
          <p style={{ color: '#666', fontSize: '1.1rem' }}>No batch data available</p>
        </div>
      )}
    </div>
  )
}