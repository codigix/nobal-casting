import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Save, X } from 'lucide-react'
import * as productionService from '../../services/productionService'
import './Production.css'

export default function ProductionWarehouseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    warehouse_code: '',
    warehouse_name: '',
    warehouse_type: 'Raw Material',
    location: '',
    capacity: '',
    parent_warehouse_id: ''
  })

  useEffect(() => {
    if (location.state?.warehouse) {
      setFormData(location.state.warehouse)
    }
  }, [location])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (id) {
        await productionService.updateWarehouse(id, formData)
      } else {
        await productionService.createWarehouse(formData)
      }
      navigate('/production/warehouses', { state: { success: `Warehouse ${id ? 'updated' : 'created'} successfully` } })
    } catch (err) {
      setError(err.message || 'Failed to save warehouse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="production-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>{id ? '✏️ Edit Warehouse' : '➕ New Warehouse'}</h1>
        <button onClick={() => navigate(-1)} style={{ background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '20px', borderRadius: '8px', maxWidth: '900px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Warehouse Code *</label>
            <input
              type="text"
              name="warehouse_code"
              value={formData.warehouse_code}
              onChange={handleInputChange}
              required
              disabled={!!id}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="e.g., WH001"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Warehouse Name *</label>
            <input
              type="text"
              name="warehouse_name"
              value={formData.warehouse_name}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="e.g., Main Warehouse"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Warehouse Type *</label>
            <select
              name="warehouse_type"
              value={formData.warehouse_type}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
            >
              <option value="Raw Material">Raw Material</option>
              <option value="Finished Goods">Finished Goods</option>
              <option value="Scrap">Scrap</option>
              <option value="WIP">WIP</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="e.g., Mumbai"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Storage Capacity</label>
            <input
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              step="0.01"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="e.g., 1000"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Parent Warehouse</label>
            <input
              type="number"
              name="parent_warehouse_id"
              value={formData.parent_warehouse_id}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              placeholder="Leave empty if no parent"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            disabled={loading}
            className="btn-submit"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save Warehouse'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ padding: '10px 20px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
