import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Activity, Zap } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

export default function ProductionAnalytics() {
  const [machineData, setMachineData] = useState([])
  const [operatorData, setOperatorData] = useState([])
  const [rejectionAnalysis, setRejectionAnalysis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [machines, operators, rejections] = await Promise.all([
        productionService.getMachineUtilization(dateRange.from, dateRange.to),
        productionService.getOperatorEfficiency(dateRange.from, dateRange.to),
        productionService.getRejectionAnalysis({ 
          date_from: dateRange.from, 
          date_to: dateRange.to 
        })
      ])
      
      setMachineData(machines.data || [])
      setOperatorData(operators.data || [])
      setRejectionAnalysis(rejections.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch analytics data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📊 Production Analytics</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Machine and operator performance insights</p>
        </div>
      </div>

      {/* Date Range */}
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading analytics data...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', color: '#dc2626' }}>
          {error}
        </div>
      ) : (
        <>
          {/* Machine Utilization */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Zap size={24} /> Machine Utilization
            </h2>
            
            {machineData.length > 0 ? (
              <div className="analytics-grid">
                {machineData.map(machine => (
                  <div key={machine.machine_id} className="analytics-card">
                    <h3>{machine.machine_name}</h3>
                    <div className="metric">
                      <span className="metric-label">Utilization</span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          background: '#f0f0f0',
                          borderRadius: '10px',
                          height: '6px',
                          width: '100px',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: machine.utilization_percent >= 75 ? '#10b981' : machine.utilization_percent >= 50 ? '#f59e0b' : '#ef4444',
                            width: `${machine.utilization_percent}%`,
                            height: '100%'
                          }} />
                        </div>
                        <span className="metric-value">{machine.utilization_percent || 0}%</span>
                      </div>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Production Days</span>
                      <span className="metric-value">{machine.production_days || 0}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Total Hours</span>
                      <span className="metric-value">{(machine.total_hours || 0).toFixed(1)}h</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Total Produced</span>
                      <span className="metric-value">{(machine.total_produced || 0).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ color: '#666' }}>No machine data available</p>
              </div>
            )}
          </div>

          {/* Operator Efficiency */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Activity size={24} /> Operator Efficiency
            </h2>
            
            {operatorData.length > 0 ? (
              <div className="analytics-grid">
                {operatorData.map(operator => (
                  <div key={operator.operator_id} className="analytics-card">
                    <h3>{operator.operator_name}</h3>
                    <div className="metric">
                      <span className="metric-label">Quality Score</span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          background: '#f0f0f0',
                          borderRadius: '10px',
                          height: '6px',
                          width: '100px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: operator.quality_score >= 95 ? '#10b981' : operator.quality_score >= 85 ? '#f59e0b' : '#ef4444',
                            width: `${Math.min(operator.quality_score, 100)}%`,
                            height: '100%'
                          }} />
                        </div>
                        <span className="metric-value">{(operator.quality_score || 0).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Production Days</span>
                      <span className="metric-value">{operator.production_days || 0}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Units/Hour</span>
                      <span className="metric-value">{(operator.units_per_hour || 0).toFixed(2)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Total Produced</span>
                      <span className="metric-value">{(operator.total_produced || 0).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ color: '#666' }}>No operator data available</p>
              </div>
            )}
          </div>

          {/* Rejection Analysis */}
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <BarChart3 size={24} /> Rejection Analysis
            </h2>
            
            {rejectionAnalysis.length > 0 ? (
              <div className="analytics-card" style={{ gridColumn: '1 / -1' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600' }}>Rejection Reason</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Occurrences</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Total Qty</th>
                      <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600' }}>Avg Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectionAnalysis.map((rejection, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '12px' }}>{rejection.rejection_reason}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{rejection.count}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{(rejection.total_quantity || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: '12px' }}>{(rejection.avg_quantity || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '8px' }}>
                <p style={{ color: '#666' }}>No rejection data available</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}