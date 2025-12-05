import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import { useNavigate } from 'react-router-dom'
import { 
  Edit2, Eye, Package, CheckCircle, Trash2, Plus, TrendingUp, AlertTriangle, 
  Truck, Clock, Calendar
} from 'lucide-react'
import ViewSalesOrderModal from '../../components/Selling/ViewSalesOrderModal'
import './Selling.css'

const styles = {
  mainContainer: {
    maxWidth: '100%',
    margin: '2rem',
    padding: '0'
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    margin: '0',
    color: '#1f2937'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e5e7eb'
  },
  statCardPrimary: {
    borderLeft: '4px solid #007bff'
  },
  statCardSuccess: {
    borderLeft: '4px solid #10b981'
  },
  statCardWarning: {
    borderLeft: '4px solid #f59e0b'
  },
  statCardDanger: {
    borderLeft: '4px solid #ef4444'
  },
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
  filtersSection: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    border: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#374151'
  },
  filterInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    minWidth: '200px'
  },
  tableSection: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  tableContent: {
    padding: '20px',
    overflowX: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#6b7280'
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    color: '#374151',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap'
  }
}

export default function SalesOrder() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [viewOrderId, setViewOrderId] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    confirmed: 0,
    dispatched: 0,
    invoiced: 0,
    cancelled: 0,
    total_value: 0,
    avg_value: 0,
    pending_delivery: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOrders()
  }, [filters])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders?${query}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data || [])
        calculateStats(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch sales orders')
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError('Error fetching sales orders')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      draft: 0,
      confirmed: 0,
      dispatched: 0,
      invoiced: 0,
      cancelled: 0,
      total_value: 0,
      avg_value: 0,
      pending_delivery: 0
    }

    data.forEach((order) => {
      if (order.status) {
        const status = order.status.toLowerCase()
        newStats[status] = (newStats[status] || 0) + 1
      }
      newStats.total_value += parseFloat(order.total_value || 0)
      if (order.status === 'confirmed' || order.status === 'dispatched') {
        newStats.pending_delivery += 1
      }
    })

    newStats.avg_value = data.length > 0 ? newStats.total_value / data.length : 0
    setStats(newStats)
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'warning'
      case 'confirmed':
        return 'info'
      case 'dispatched':
        return 'info'
      case 'invoiced':
        return 'success'
      case 'cancelled':
        return 'danger'
      default:
        return 'secondary'
    }
  }

  const handleConfirmOrder = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        fetchOrders()
      } else {
        alert('Failed to confirm order')
      }
    } catch (error) {
      console.error('Error confirming order:', error)
      alert('Error confirming order')
    }
  }

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sales order?')) return
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchOrders()
      } else {
        alert('Failed to delete order')
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Error deleting order')
    }
  }

  const ActionButton = ({ icon: Icon, label, onClick, danger = false }) => (
    <button
      onClick={onClick}
      style={{
        ...styles.actionButton,
        color: danger ? '#dc2626' : '#374151'
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = danger ? '#fee2e2' : '#f3f4f6'
        e.target.style.borderColor = danger ? '#fca5a5' : '#9ca3af'
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = '#fff'
        e.target.style.borderColor = '#d1d5db'
      }}
    >
      <Icon size={14} /> {label}
    </button>
  )

  const ActionDropdown = ({ row }) => {
    return (
      <div style={{
        display: 'flex',
        gap: '4px',
        flexWrap: 'nowrap',
        justifyContent: 'center'
      }}>
        <ActionButton
          icon={Eye}
          onClick={() => setViewOrderId(row.sales_order_id)}
        />
        {row.status?.toLowerCase() === 'draft' && (
          <>
            <ActionButton
              icon={Edit2}
             
              onClick={() => navigate(`/selling/sales-orders/${row.sales_order_id}`)}
            />
            <ActionButton
              icon={CheckCircle}
              
              onClick={() => handleConfirmOrder(row.sales_order_id)}
            />
          </>
        )}
        {row.status?.toLowerCase() === 'confirmed' && (
          <ActionButton
            icon={Truck}
            
            onClick={() => navigate(`/selling/delivery-notes/new?order=${row.sales_order_id}`)}
          />
        )}
        <ActionButton
          icon={Trash2}
          
          onClick={() => handleDeleteOrder(row.sales_order_id)}
          danger={true}
        />
      </div>
    )
  }

  const columns = [
    { label: 'Order ID', key: 'sales_order_id', searchable: true },
    { label: 'Customer', key: 'customer_name', searchable: true },
    { 
      label: 'Items Summary', 
      key: 'items_summary',
      render: (value, row) => {
        if (!row || !row.items || row.items.length === 0) return 'No items'
        const itemList = row.items.map(item => `${item.item_name || item.item_code} (Qty: ${item.qty})`).join(', ')
        return (
          <span title={itemList} style={{ 
            maxWidth: '250px', 
            display: 'inline-block', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {itemList}
          </span>
        )
      }
    },
    { label: 'Amount', key: 'total_value', render: (val) => `₹${parseFloat(val || 0).toFixed(2)}` },
    { label: 'Delivery Date', key: 'delivery_date' },
    { label: 'Status', key: 'status', render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge> },
    {
      label: 'Actions',
      key: 'actions',
      render: (value, row) => {
        if (!row) return null
        return <ActionDropdown row={row} />
      }
    }
  ]

  return (
    <div style={styles.mainContainer}>
      <Card>
        <div style={styles.header}>
          <h2 style={styles.title}>Sales Orders</h2>
          <Button 
            onClick={() => navigate('/selling/sales-orders/new')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} /> New Order
          </Button>
        </div>

        <div style={styles.statsGrid}>
          <div style={{...styles.statCard, ...styles.statCardPrimary}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Total Orders</span>
              <div style={{...styles.statIcon, backgroundColor: '#eff6ff'}}>📦</div>
            </div>
            <div style={styles.statValue}>{stats.total}</div>
            <div style={{...styles.statTrend, color: '#6b7280'}}>
              <Calendar size={12} /> All time
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardWarning}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Draft Orders</span>
              <div style={{...styles.statIcon, backgroundColor: '#fffbeb'}}>✏️</div>
            </div>
            <div style={styles.statValue}>{stats.draft}</div>
            <div style={{...styles.statTrend, color: '#f59e0b'}}>
              <AlertTriangle size={12} /> Awaiting confirmation
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardSuccess}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Confirmed Orders</span>
              <div style={{...styles.statIcon, backgroundColor: '#f0fdf4'}}>✅</div>
            </div>
            <div style={styles.statValue}>{stats.confirmed}</div>
            <div style={{...styles.statTrend, color: '#10b981'}}>
              <CheckCircle size={12} /> Ready to dispatch
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardSuccess}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Total Revenue</span>
              <div style={{...styles.statIcon, backgroundColor: '#f0fdf4'}}>💰</div>
            </div>
            <div style={styles.statValue}>₹{(stats.total_value / 100000).toFixed(1)}L</div>
            <div style={{...styles.statTrend, color: '#10b981'}}>
              <TrendingUp size={12} /> Avg: ₹{(stats.avg_value / 1000).toFixed(0)}K
            </div>
          </div>

          <div style={{...styles.statCard, ...styles.statCardDanger}}>
            <div style={styles.statHeader}>
              <span style={styles.statLabel}>Pending Delivery</span>
              <div style={{...styles.statIcon, backgroundColor: '#fef2f2'}}>🚚</div>
            </div>
            <div style={styles.statValue}>{stats.pending_delivery}</div>
            <div style={{...styles.statTrend, color: '#ef4444'}}>
              <Clock size={12} /> In transit
            </div>
          </div>
        </div>

        <div style={styles.filtersSection}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Status</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={styles.filterInput}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="dispatched">Dispatched</option>
              <option value="invoiced">Invoiced</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Search</label>
            <input
              type="text"
              placeholder="Order ID or Customer..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={styles.filterInput}
            />
          </div>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            borderLeft: '4px solid #ef4444',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '16px',
            color: '#991b1b',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        <div style={styles.tableSection}>
          <div style={styles.tableContent}>
            {loading ? (
              <div style={styles.emptyState}>Loading...</div>
            ) : orders.length === 0 ? (
              <div style={styles.emptyState}>
                <Package size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ margin: '8px 0' }}>No sales orders found.</p>
                <Button 
                  onClick={() => navigate('/selling/sales-orders/new')}
                  style={{ marginTop: '12px' }}
                >
                  Create First Order
                </Button>
              </div>
            ) : (
              <DataTable columns={columns} data={orders} />
            )}
          </div>
        </div>
      </Card>

      <ViewSalesOrderModal 
        isOpen={!!viewOrderId}
        orderId={viewOrderId}
        onClose={() => setViewOrderId(null)}
      />
    </div>
  )
}
