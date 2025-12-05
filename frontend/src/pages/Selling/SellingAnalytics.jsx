import React, { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, LineChart as LineChartIcon, PieChart as PieChartIcon,
  Calendar, Users, ShoppingCart, DollarSign, Package, Receipt,
  Filter, Download, Zap
} from 'lucide-react'
import Button from '../../components/Button/Button'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import './Selling.css'

export default function SellingAnalytics() {
  const [period, setPeriod] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [analyticsData, setAnalyticsData] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    topCustomer: { name: '', value: 0 },
    topProduct: { name: '', value: 0 },
    monthlyTrend: [],
    statusBreakdown: [],
    paymentStatus: []
  })

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/analytics?period=${period}`)
      const data = await res.json()
      if (data.success) {
        setAnalyticsData(data.data || {})
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/analytics/export?period=${period}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `selling-analytics-${period}.xlsx`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting analytics:', error)
    }
  }

  return (
    <div className="selling-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Selling Analytics</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>Track your sales performance and insights</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)'
            }}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Button 
            onClick={handleExport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download size={18} /> Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Sales</h3>
            <p>₹{analyticsData.totalSales?.toFixed(0) || '0'}</p>
          </div>
          <div className="stat-icon primary">💰</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Orders</h3>
            <p>{analyticsData.totalOrders || '0'}</p>
          </div>
          <div className="stat-icon info">📦</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Average Order Value</h3>
            <p>₹{analyticsData.averageOrderValue?.toFixed(0) || '0'}</p>
          </div>
          <div className="stat-icon success">📊</div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <h3>Conversion Rate</h3>
            <p>{analyticsData.conversionRate?.toFixed(1) || '0'}%</p>
          </div>
          <div className="stat-icon warning">📈</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginTop: '24px' }}>
        {/* Top Customer */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>Top Customer</h3>
            <Users size={20} style={{ color: 'var(--primary-600)' }} />
          </div>
          <div style={{ padding: '16px 0' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: '8px' }}>
              {analyticsData.topCustomer?.name || 'N/A'}
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              ₹{analyticsData.topCustomer?.value?.toFixed(0) || '0'} in sales
            </p>
          </div>
        </Card>

        {/* Top Product */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>Top Product</h3>
            <Package size={20} style={{ color: 'var(--success-600)' }} />
          </div>
          <div style={{ padding: '16px 0' }}>
            <p style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBottom: '8px' }}>
              {analyticsData.topProduct?.name || 'N/A'}
            </p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              {analyticsData.topProduct?.value || '0'} units sold
            </p>
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card style={{ marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
          Order Status Breakdown
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {analyticsData.statusBreakdown?.map((status, idx) => (
            <div key={idx} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'var(--font-medium)' }}>{status.name}</span>
                <Badge color="primary">{status.count}</Badge>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--card-border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${(status.count / (analyticsData.totalOrders || 1)) * 100}%`,
                    height: '100%',
                    background: `var(--${status.color}-600)`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment Status */}
      <Card style={{ marginTop: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>
          Payment Status
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {analyticsData.paymentStatus?.map((status, idx) => (
            <div key={idx} style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'var(--font-medium)' }}>{status.name}</span>
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                  ₹{status.value?.toFixed(0) || '0'}
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                {status.percentage?.toFixed(1) || '0'}% of total
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}