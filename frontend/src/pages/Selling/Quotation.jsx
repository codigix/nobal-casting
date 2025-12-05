import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FileText, Edit2, Send, Download, Eye, Package, AlertCircle, CheckCircle, XCircle, 
  Clock, Plus, TrendingUp, AlertTriangle, Mail, Trash2, DollarSign, ShoppingCart, CheckSquare,
  XSquare
} from 'lucide-react'

import './Selling.css'

export default function Quotation() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState([])
  const [metrics, setMetrics] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    accepted: 0,
    converted: 0,
    cancelled: 0,
    total_value: 0,
    average_value: 0,
    conversion_rate: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    customer: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchQuotations()
  }, [filters])

  const fetchQuotations = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/quotations?${query}`)
      const data = await res.json()
      if (data.success) {
        setQuotations(data.data || [])
        calculateMetrics(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch quotations')
      }
    } catch (error) {
      console.error('Error fetching quotations:', error)
      setError('Error fetching quotations')
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = (data) => {
    const newMetrics = {
      total: data.length,
      draft: 0,
      sent: 0,
      accepted: 0,
      converted: 0,
      cancelled: 0,
      total_value: 0,
      average_value: 0,
      conversion_rate: 0
    }

    data.forEach((quotation) => {
      if (quotation.status) {
        newMetrics[quotation.status] = (newMetrics[quotation.status] || 0) + 1
      }
      newMetrics.total_value += parseFloat(quotation.amount || 0)
    })

    newMetrics.average_value = newMetrics.total > 0 ? newMetrics.total_value / newMetrics.total : 0
    newMetrics.conversion_rate = newMetrics.total > 0 ? Math.round((newMetrics.converted / newMetrics.total) * 100) : 0

    setMetrics(newMetrics)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'warning'
      case 'sent':
        return 'info'
      case 'accepted':
        return 'success'
      case 'converted':
        return 'secondary'
      case 'cancelled':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const handleSendQuotation = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/quotations/${id}/send`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        setSuccess('Quotation sent successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchQuotations()
      }
    } catch (error) {
      console.error('Error sending quotation:', error)
      setError('Failed to send quotation')
    }
  }

  const handleDeleteQuotation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/quotations/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSuccess('Quotation deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchQuotations()
      }
    } catch (error) {
      console.error('Error deleting quotation:', error)
      setError('Failed to delete quotation')
    }
  }

  const columns = [
    { label: 'Quote ID', key: 'quotation_id', searchable: true },
    { label: 'Customer', key: 'customer_name', searchable: true },
    { label: 'Amount', key: 'amount', render: (val) => `₹${parseFloat(val || 0).toFixed(2)}` },
    { label: 'Valid Till', key: 'validity_date' },
    { label: 'Status', key: 'status', render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge> },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => {
        if (!row) return null
        return (
        <div className="action-buttons">
          <button 
            onClick={() => navigate(`/selling/quotations/${row.quotation_id}`)}
            className="flex items-center justify-center p-2 text-primary-600 hover:bg-primary-100 rounded transition-colors duration-200"
            title="View"
          >
            <Eye size={16} />
          </button>
          {row.status === 'draft' && (
            <>
              <button 
                onClick={() => navigate(`/selling/quotations/${row.quotation_id}/edit`)}
                className="flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded transition-colors duration-200"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => handleSendQuotation(row.quotation_id)}
                className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
                title="Send"
              >
                <Mail size={16} />
              </button>
            </>
          )}
          {row.status === 'accepted' && (
            <button 
              onClick={() => navigate(`/selling/sales-orders/new?quote=${row.quotation_id}`)}
              className="flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors duration-200"
              title="Convert to Sales Order"
            >
              <FileText size={16} />
            </button>
          )}
          <button 
            onClick={() => handleDeleteQuotation(row.quotation_id)}
            className="flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
      }
    }
  ]

  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' })

  return (
    <div style={{ background: 'linear-gradient(to bottom, #f9fafb, #f3f4f6)', minHeight: '100vh', paddingBottom: '30px' }}>
      <div className="production-container">
        
        {/* Header with Date/Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '30px', paddingTop: '20px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>Welcome back, Sales Team! 👋</h1>
            <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>Sales Quotations - Manage quotes and track conversions</p>
          </div>
          <div style={{ textAlign: 'right', color: '#666' }}>
            <div style={{ fontSize: '12px', marginBottom: '4px' }}>{dateStr}</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a' }}>{timeStr}</div>
          </div>
        </div>

        {success && (
          <div style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#16a34a',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {error && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '20px',
            color: '#dc2626',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px', animation: 'spin 2s linear infinite' }}>📋</div>
            <div style={{ color: '#666', fontSize: '1.1rem' }}>Loading quotation data...</div>
          </div>
        ) : (
          <>
            {/* Stat Cards - 6 columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              {/* Total Quotations */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Quotations</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.total}</div>
                  </div>
                  <div style={{ background: '#dbeafe', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={22} color='#3b82f6' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>📈 All active quotes</div>
              </div>

              {/* Draft */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(234, 179, 8, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Draft</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.draft}</div>
                  </div>
                  <div style={{ background: '#fef3c7', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Edit2 size={22} color='#eab308' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626' }}>⚠️ Needs action</div>
              </div>

              {/* Sent */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sent</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.sent}</div>
                  </div>
                  <div style={{ background: '#f3e8ff', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={22} color='#8b5cf6' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>⏳ Awaiting response</div>
              </div>

              {/* Accepted */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Accepted</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.accepted}</div>
                  </div>
                  <div style={{ background: '#dcfce7', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={22} color='#10b981' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>✅ Ready to convert</div>
              </div>

              {/* Converted */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Converted</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.converted}</div>
                  </div>
                  <div style={{ background: '#dbeafe', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={22} color='#3b82f6' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#10b981' }}>🎉 To sales orders</div>
              </div>

              {/* Cancelled */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                transition: 'all 0.3s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cancelled</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1a1a1a', marginTop: '4px' }}>{metrics.cancelled}</div>
                  </div>
                  <div style={{ background: '#fee2e2', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={22} color='#ef4444' />
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#dc2626' }}>❌ Rejected</div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px'
            }}>
              {/* Total Value */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Value</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>₹{(metrics.total_value / 100000).toFixed(1)}L</div>
                <div style={{ fontSize: '12px', color: '#666' }}>quotation value</div>
              </div>

              {/* Average Value */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Average Value</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>₹{(metrics.average_value / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: '12px', color: '#666' }}>per quotation</div>
              </div>

              {/* Conversion Rate */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Conversion Rate</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>{metrics.conversion_rate}%</div>
                <div style={{ fontSize: '12px', color: '#666' }}>quotes to orders</div>
              </div>

              {/* Sent Rate */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Sent Rate</div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: '#1a1a1a', marginBottom: '4px' }}>{metrics.total > 0 ? Math.round(((metrics.sent + metrics.accepted + metrics.converted) / metrics.total) * 100) : 0}%</div>
                <div style={{ fontSize: '12px', color: '#666' }}>quotes sent</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
              {/* Recent Quotations Table */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0' }}>Recent Quotations</h2>
                  <button onClick={() => navigate('/selling/quotations')} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>View All →</button>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quote ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valid Till</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotations.slice(0, 8).map((quote, idx) => (
                        <tr key={quote.quotation_id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                          <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{quote.quotation_id}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#666' }}>{quote.customer_name}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1a1a1a', textAlign: 'center', fontWeight: '500' }}>₹{parseFloat(quote.amount || 0).toFixed(0)}</td>
                          <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              background: quote.status === 'accepted' ? '#dcfce7' : quote.status === 'sent' ? '#f3e8ff' : quote.status === 'draft' ? '#fef3c7' : quote.status === 'converted' ? '#dbeafe' : '#fee2e2',
                              color: quote.status === 'accepted' ? '#16a34a' : quote.status === 'sent' ? '#7c3aed' : quote.status === 'draft' ? '#d97706' : quote.status === 'converted' ? '#1e40af' : '#991b1b',
                              borderRadius: '4px',
                              fontWeight: '500',
                              fontSize: '12px',
                              textTransform: 'capitalize'
                            }}>
                              {quote.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1a1a1a', textAlign: 'right', fontWeight: '500' }}>{quote.validity_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Actions Sidebar */}
              <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                height: 'fit-content'
              }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 16px 0' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    onClick={() => navigate('/selling/quotations/new')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <Plus size={16} /> New Quotation
                  </button>

                  <button
                    onClick={() => setFilters({ ...filters, status: 'draft' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <Edit2 size={16} /> View Drafts
                  </button>

                  <button
                    onClick={() => setFilters({ ...filters, status: 'sent' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <Mail size={16} /> View Sent
                  </button>

                  <button
                    onClick={() => setFilters({ ...filters, status: 'accepted' })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 16px',
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#1a1a1a',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f4ff'
                      e.currentTarget.style.borderColor = '#3b82f6'
                      e.currentTarget.style.color = '#3b82f6'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                      e.currentTarget.style.color = '#1a1a1a'
                    }}
                  >
                    <CheckCircle size={16} /> Convert Orders
                  </button>
                </div>

                {/* Status Summary */}
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>Status Summary</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>✏️ Draft</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.draft}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>📤 Sent</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.sent}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>✅ Accepted</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.accepted}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>🎉 Converted</span>
                      <span style={{ fontWeight: '600', color: '#1a1a1a' }}>{metrics.converted}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
