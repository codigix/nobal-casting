import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Warehouse } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

export default function ProductionWarehouses() {
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      setLoading(true)
      const response = await productionService.getWarehouses()
      setWarehouses(response.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch warehouses')
      setWarehouses([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (name) => {
    if (window.confirm('Delete this warehouse?')) {
      try {
        await productionService.deleteWarehouse(name)
        setSuccess('Warehouse deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchWarehouses()
      } catch (err) {
        setError(err.message || 'Failed to delete warehouse')
      }
    }
  }

  const handleEdit = (warehouse) => {
    navigate(`/production/warehouses/form/${warehouse.name}`, { state: { warehouse } })
  }

  const filteredWarehouses = warehouses.filter(warehouse =>
    warehouse.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    warehouse.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>🏭 Production Warehouses</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Manage production warehouse locations and details</p>
        </div>
        <button
          onClick={() => navigate('/production/warehouses/form')}
          className="btn-submit w-auto"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> New Warehouse
        </button>
      </div>

      {success && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#16a34a'
        }}>
          ✓ {success}
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#dc2626'
        }}>
          ✗ {error}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search warehouses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px'
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading warehouses...</div>
      ) : filteredWarehouses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          {searchTerm ? 'No warehouses found' : 'No warehouses available'}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Location</th>
              <th style={{ padding: '12px' }}>Company</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWarehouses.map((warehouse, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Warehouse size={18} />
                    {warehouse.name}
                  </div>
                </td>
                <td style={{ padding: '12px' }}>{warehouse.location || '-'}</td>
                <td style={{ padding: '12px' }}>{warehouse.company || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(warehouse)}
                      style={{
                        background: '#dbeafe',
                        border: '1px solid #93c5fd',
                        color: '#1d4ed8',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(warehouse.name)}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}