import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Card from '../../components/Card/Card'
import Alert from '../../components/Alert/Alert'
import { TrendingUp, Boxes, AlertTriangle, DollarSign, ChevronRight } from 'lucide-react'
import './InventoryAnalytics.css'

export default function InventoryAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/analytics/inventory')
      setAnalytics(response.data.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-header">
          <div className="analytics-title">
            <h1>Inventory Analytics</h1>
            <p className="analytics-subtitle">Track and monitor your inventory metrics</p>
          </div>
        </div>
        <Alert type="danger">{error}</Alert>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-title">
          <h1>Inventory Analytics</h1>
          <p className="analytics-subtitle">Real-time inventory metrics and insights</p>
        </div>
      </div>

      <div className="analytics-metrics">
        <div className="metric-card metric-card-primary">
          <div className="metric-icon">
            <DollarSign size={28} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Inventory Value</span>
            <span className="metric-value">₹{analytics?.total_value?.toLocaleString() || '0'}</span>
          </div>
        </div>

        <div className="metric-card metric-card-blue">
          <div className="metric-icon">
            <Boxes size={28} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Items</span>
            <span className="metric-value">{analytics?.total_items || 0}</span>
          </div>
        </div>

        <div className="metric-card metric-card-danger">
          <div className="metric-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Low Stock Items</span>
            <span className="metric-value">{analytics?.low_stock_items || 0}</span>
          </div>
        </div>

        <div className="metric-card metric-card-success">
          <div className="metric-icon">
            <TrendingUp size={28} />
          </div>
          <div className="metric-content">
            <span className="metric-label">Stock Turnover Rate</span>
            <span className="metric-value">{analytics?.turnover_rate?.toFixed(2) || '0'}x</span>
          </div>
        </div>
      </div>

      <div className="analytics-grid">
        <Card title="Inventory by Warehouse" className="analytics-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Warehouse</th>
                  <th className="text-right">Total Items</th>
                  <th className="text-right">Value</th>
                  <th className="text-right">Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.warehouse_distribution?.length > 0 ? (
                  analytics.warehouse_distribution.map((wh, idx) => (
                    <tr key={idx}>
                      <td className="font-medium">{wh.warehouse_name}</td>
                      <td className="text-right">{wh.item_count}</td>
                      <td className="text-right font-medium">₹{wh.value?.toLocaleString()}</td>
                      <td className="text-right">
                        <span className="occupancy-badge">{wh.occupancy}%</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center no-data-cell">No warehouse data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Top Items by Inventory Value" className="analytics-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.top_items?.length > 0 ? (
                  analytics.top_items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className="item-code">{item.item_code}</span>
                      </td>
                      <td className="font-medium">{item.item_name}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right font-medium">₹{item.value?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center no-data-cell">No item data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Stock Movement (Last 30 Days)" className="analytics-card analytics-card-full">
        <div className="stock-movement">
          <div className="movement-stat">
            <div className="movement-number">{analytics?.stock_movements_count || 0}</div>
            <div className="movement-label">Total Transactions</div>
          </div>
          <div className="movement-divider"></div>
          <div className="movement-row">
            <div className="movement-item">
              <span className="movement-badge inward">Inward</span>
              <span className="movement-value">{analytics?.inward_qty || 0}</span>
            </div>
            <div className="movement-item">
              <span className="movement-badge outward">Outward</span>
              <span className="movement-value">{analytics?.outward_qty || 0}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}