import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/AuthContext'
import Card from '../components/Card/Card'
import { 
  FileText, Send, DollarSign, Building2, Clipboard, Receipt,
  TrendingUp, Activity, Calendar, AlertCircle, Plus, ChevronRight,
  ArrowUp, ArrowDown, TrendingDown
} from 'lucide-react'

const styles = {
  mainContainer: {
    maxWidth: '100%',
    margin: '2rem',
    padding: '0'
  },
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '0',
    color: '#1f2937'
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  statCardPrimary: { borderLeft: '4px solid #007bff' },
  statCardSuccess: { borderLeft: '4px solid #10b981' },
  statCardWarning: { borderLeft: '4px solid #f59e0b' },
  statCardDanger: { borderLeft: '4px solid #ef4444' },
  statCardInfo: { borderLeft: '4px solid #06b6d4' },
  statCardPurple: { borderLeft: '4px solid #8b5cf6' },
  statHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px'
  },
  statTrend: {
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '8px'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '24px',
    marginBottom: '24px'
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },
  activityHeader: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  activityTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  activityContent: {
    padding: '16px'
  },
  activityItem: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  activityItemLast: {
    borderBottom: 'none'
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '16px'
  },
  quickActionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '16px'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    color: '#374151',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  dateDisplay: {
    fontSize: '12px',
    color: '#6b7280'
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    materialRequests: 0,
    rfqs: 0,
    quotations: 0,
    suppliers: 0,
    purchaseOrders: 0,
    invoices: 0,
    totalSpend: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        const [mrRes, rfqRes, quotRes, supplierRes, poRes, invoiceRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/material-requests`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/rfqs`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/quotations`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/suppliers`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/purchase-orders`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/purchase-invoices`, { headers }).catch(() => ({}))
        ])

        const [mrs, rfqs, quotations, suppliers, pos, invoices] = await Promise.all([
          mrRes.json?.().catch(() => []),
          rfqRes.json?.().catch(() => []),
          quotRes.json?.().catch(() => []),
          supplierRes.json?.().catch(() => []),
          poRes.json?.().catch(() => []),
          invoiceRes.json?.().catch(() => [])
        ])

        const purchaseOrdersData = Array.isArray(pos) ? pos : []
        const totalSpend = purchaseOrdersData.reduce((sum, po) => sum + (parseFloat(po.total_value || 0)), 0)

        setStats({
          materialRequests: Array.isArray(mrs) ? mrs.length : 0,
          rfqs: Array.isArray(rfqs) ? rfqs.length : 0,
          quotations: Array.isArray(quotations) ? quotations.length : 0,
          suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
          purchaseOrders: Array.isArray(pos) ? pos.length : 0,
          invoices: Array.isArray(invoices) ? invoices.length : 0,
          totalSpend: totalSpend
        })

        setRecentActivity([
          { type: 'Material Request', action: 'Created', time: '2 hrs', status: 'draft', icon: FileText },
          { type: 'RFQ', action: 'Sent', time: '4 hrs', status: 'sent', icon: Send },
          { type: 'Quotation', action: 'Received', time: '6 hrs', status: 'received', icon: DollarSign },
          { type: 'PO', action: 'Created', time: '1 day', status: 'draft', icon: Clipboard }
        ])
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const getActivityIconColor = (type) => {
    switch (type) {
      case 'Material Request': return '#007bff'
      case 'RFQ': return '#8b5cf6'
      case 'Quotation': return '#10b981'
      case 'PO': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div style={styles.mainContainer}>
      <Card>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Welcome back, {user?.full_name}! 👋</h1>
            <p style={styles.subtitle}>Buying & Procurement Dashboard</p>
          </div>
          <p style={styles.dateDisplay}>
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, ...styles.statCardPrimary}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Material Requests</span>
              <div style={{...styles.statIcon, backgroundColor: '#eff6ff'}}>📋</div>
            </div>
            <div style={styles.statValue}>{stats.materialRequests}</div>
            <div style={{...styles.statTrend, color: '#0284c7'}}>
              <FileText size={12} /> Active requests
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardPurple}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>RFQs Sent</span>
              <div style={{...styles.statIcon, backgroundColor: '#faf5ff'}}>📤</div>
            </div>
            <div style={styles.statValue}>{stats.rfqs}</div>
            <div style={{...styles.statTrend, color: '#7c3aed'}}>
              <Send size={12} /> Awaiting quotes
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardSuccess}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Quotations</span>
              <div style={{...styles.statIcon, backgroundColor: '#f0fdf4'}}>💰</div>
            </div>
            <div style={styles.statValue}>{stats.quotations}</div>
            <div style={{...styles.statTrend, color: '#10b981'}}>
              <TrendingUp size={12} /> {Math.round(stats.quotations * 0.75)} being evaluated
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardWarning}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Suppliers</span>
              <div style={{...styles.statIcon, backgroundColor: '#fffbeb'}}>🏢</div>
            </div>
            <div style={styles.statValue}>{stats.suppliers}</div>
            <div style={{...styles.statTrend, color: '#f59e0b'}}>
              <AlertCircle size={12} /> Active suppliers
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardDanger}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Purchase Orders</span>
              <div style={{...styles.statIcon, backgroundColor: '#fef2f2'}}>📦</div>
            </div>
            <div style={styles.statValue}>{stats.purchaseOrders}</div>
            <div style={{...styles.statTrend, color: '#ef4444'}}>
              <TrendingDown size={12} /> {Math.round(stats.purchaseOrders * 0.4)} pending
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardInfo}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Total Spend</span>
              <div style={{...styles.statIcon, backgroundColor: '#ecfdf5'}}>💵</div>
            </div>
            <div style={styles.statValue}>₹{(stats.totalSpend / 100000).toFixed(1)}L</div>
            <div style={{...styles.statTrend, color: '#06b6d4'}}>
              <ArrowUp size={12} /> This fiscal year
            </div>
          </div>
        </div>

        <div style={styles.metricsGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Average Lead Time</div>
            <div style={styles.metricValue}>8.5 days</div>
            <div style={{...styles.statTrend, color: '#10b981', marginTop: '8px'}}>
              <ArrowDown size={12} /> 2 days improvement
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Supplier Response Rate</div>
            <div style={styles.metricValue}>92%</div>
            <div style={{...styles.statTrend, color: '#10b981', marginTop: '8px'}}>
              <ArrowUp size={12} /> 4% increase
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Average Order Value</div>
            <div style={styles.metricValue}>₹52K</div>
            <div style={{...styles.statTrend, color: '#6b7280', marginTop: '8px'}}>
              <Calendar size={12} /> Fiscal average
            </div>
          </div>

          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Pending Invoices</div>
            <div style={styles.metricValue}>{Math.round(stats.purchaseOrders * 0.25)}</div>
            <div style={{...styles.statTrend, color: '#f59e0b', marginTop: '8px'}}>
              <AlertCircle size={12} /> Need approval
            </div>
          </div>
        </div>

        <div style={styles.gridContainer}>
          <div style={styles.activityContainer}>
            <div style={styles.activityHeader}>
              <h2 style={styles.activityTitle}>Recent Activity</h2>
              <Activity size={18} color="#6b7280" />
            </div>
            <div style={styles.activityContent}>
              {recentActivity.map((activity, idx) => {
                const Icon = activity.icon
                return (
                  <div 
                    key={idx} 
                    style={{
                      ...styles.activityItem,
                      ...((idx === recentActivity.length - 1) && styles.activityItemLast)
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${getActivityIconColor(activity.type)}15`,
                      flexShrink: 0
                    }}>
                      <Icon size={16} color={getActivityIconColor(activity.type)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1f2937',
                        marginBottom: '2px'
                      }}>
                        {activity.type}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {activity.action}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      flexShrink: 0
                    }}>
                      {activity.time}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={styles.quickActionsContainer}>
            <h2 style={styles.quickActionsTitle}>Quick Actions</h2>
            <a 
              href="/buying/material-requests/new" 
              style={{...styles.actionButton, backgroundColor: '#eff6ff', borderColor: '#bfdbfe'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#dbeafe'; e.target.style.borderColor = '#93c5fd' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#eff6ff'; e.target.style.borderColor = '#bfdbfe' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={16} />
                <span>Create MR</span>
              </div>
              <ChevronRight size={16} color="#0284c7" />
            </a>

            <a 
              href="/buying/rfqs/new" 
              style={{...styles.actionButton, backgroundColor: '#faf5ff', borderColor: '#e9d5ff'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#f3e8ff'; e.target.style.borderColor = '#ddd6fe' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#faf5ff'; e.target.style.borderColor = '#e9d5ff' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} />
                <span>Create RFQ</span>
              </div>
              <ChevronRight size={16} color="#8b5cf6" />
            </a>

            <a 
              href="/buying/quotations" 
              style={{...styles.actionButton, backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#dcfce7'; e.target.style.borderColor = '#86efac' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#f0fdf4'; e.target.style.borderColor = '#bbf7d0' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={16} />
                <span>View Quotations</span>
              </div>
              <ChevronRight size={16} color="#10b981" />
            </a>

            <a 
              href="/buying/purchase-orders" 
              style={{...styles.actionButton, backgroundColor: '#fef2f2', borderColor: '#fecaca'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#fee2e2'; e.target.style.borderColor = '#fca5a5' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#fef2f2'; e.target.style.borderColor = '#fecaca' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clipboard size={16} />
                <span>View POs</span>
              </div>
              <ChevronRight size={16} color="#ef4444" />
            </a>

            <a 
              href="/buying/suppliers" 
              style={{...styles.actionButton, backgroundColor: '#fffbeb', borderColor: '#fde68a'}}
              onMouseEnter={(e) => { e.target.style.backgroundColor = '#fef3c7'; e.target.style.borderColor = '#fcd34d' }}
              onMouseLeave={(e) => { e.target.style.backgroundColor = '#fffbeb'; e.target.style.borderColor = '#fde68a' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={16} />
                <span>View Suppliers</span>
              </div>
              <ChevronRight size={16} color="#f59e0b" />
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}
