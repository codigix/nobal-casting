import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Table from '../../components/Table/Table'
import Input from '../../components/Input/Input'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react'
import './Buying.css'

export default function Items() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [groups, setGroups] = useState([])
  const [stats, setStats] = useState({
    totalItems: 0,
    activeGroups: 0,
    lowStockItems: 0
  })
  const [filters, setFilters] = useState({
    item_group: '',
    search: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchItemGroups()
    fetchItems()
  }, [filters])

  const fetchItemGroups = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items/groups`)
      const data = await res.json()
      if (data.success) {
        setGroups(data.data)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchItems = async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v)
      )
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items?${query}`)
      const data = await res.json()
      if (data.success) {
        setItems(data.data)
        setStats({
          totalItems: data.data.length,
          activeGroups: new Set(data.data.map(item => item.item_group)).size,
          lowStockItems: data.data.filter(item => item.quantity <= 10).length
        })
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemCode) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items/${itemCode}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        setItems(items.filter(item => item.item_code !== itemCode))
        alert('Item deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
    }
  }

  const StatCard = ({ icon, label, value, color }) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '8px',
      border: '1px solid var(--card-border)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{
        fontSize: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          fontWeight: '500'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)'
        }}>
          {value}
        </div>
      </div>
    </div>
  )

  const ActionButton = ({ icon: Icon, label, onClick, variant = 'default', disabled = false }) => {
    const baseStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      opacity: disabled ? 0.5 : 1
    }

    const variantStyles = {
      edit: {
        backgroundColor: '#3b82f6',
        color: 'white'
      },
      delete: {
        backgroundColor: '#ef4444',
        color: 'white'
      }
    }

    const buttonStyle = {
      ...baseStyle,
      ...variantStyles[variant]
    }

    return (
      <button
        style={buttonStyle}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = variant === 'edit' ? '#2563eb' : '#dc2626'
            e.currentTarget.style.transform = 'scale(1.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.backgroundColor = variant === 'edit' ? '#3b82f6' : '#ef4444'
            e.currentTarget.style.transform = 'scale(1)'
          }
        }}
      >
        <Icon size={14} />
        {label}
      </button>
    )
  }

  const columns = [
    { key: 'item_code', label: 'Item Code' },
    { key: 'name', label: 'Item Name' },
    { key: 'item_group', label: 'Group' },
    { key: 'uom', label: 'UOM' },
    { key: 'hsn_code', label: 'HSN Code' },
    { key: 'gst_rate', label: 'GST %', format: (val) => `${val}%` }
  ]

  const itemsWithActions = items.map(item => ({
    ...item,
    actions: (
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <ActionButton
          icon={Edit2}
          label="Edit"
          variant="edit"
          onClick={() => navigate(`/masters/item/${item.item_code}`)}
        />
        <ActionButton
          icon={Trash2}
          label="Delete"
          variant="delete"
          onClick={() => handleDelete(item.item_code)}
        />
      </div>
    )
  }))

  const columnsWithActions = [
    ...columns,
    { key: 'actions', label: 'Actions' }
  ]

  return (
    <div className='page-container p-5'>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            margin: '0 0 8px 0'
          }}>
            Items Master
          </h2>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: '0'
          }}>
            Manage your product catalog and inventory
          </p>
        </div>
        <Link to="/masters/item/new">
          <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Create Item
          </Button>
        </Link>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          icon="📦"
          label="Total Items"
          value={stats.totalItems}
          color="#3b82f6"
        />
        <StatCard
          icon="🏷️"
          label="Active Groups"
          value={stats.activeGroups}
          color="#8b5cf6"
        />
        <StatCard
          icon="⚠️"
          label="Low Stock Items"
          value={stats.lowStockItems}
          color="#f59e0b"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        backgroundColor: 'var(--card-bg)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Search size={14} /> Search Items
          </label>
          <Input
            type="text"
            placeholder="Search by code or name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              padding: '10px 12px',
              fontSize: '13px'
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Package size={14} /> Filter by Group
          </label>
          <select
            value={filters.item_group}
            onChange={(e) => setFilters({ ...filters, item_group: e.target.value })}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--input-border)',
              borderRadius: '6px',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--input-text)',
              fontSize: '13px',
              fontFamily: 'var(--font-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <option value="">All Groups</option>
            {groups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>Loading items...</div>
          </div>
        ) : items.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <Package size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px' }}>No items found</div>
            <Link to="/masters/item/new">
              <Button variant="primary" style={{ marginTop: '16px' }}>
                Create First Item
              </Button>
            </Link>
          </div>
        ) : (
          <Table
            columns={columnsWithActions}
            data={itemsWithActions}
            rowClickable={false}
          />
        )}
      </div>
    </div>
  )
}
