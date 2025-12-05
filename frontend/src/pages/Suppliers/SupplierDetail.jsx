import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { suppliersAPI } from '../../services/api'

export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSupplierDetails()
  }, [id])

  const fetchSupplierDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await suppliersAPI.get(id)
      setSupplier(response.data.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch supplier details')
      console.error('Error fetching supplier details:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Loading supplier details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <Alert variant="danger" className="mb-6">{error}</Alert>
        <Button variant="secondary" onClick={() => navigate('/suppliers')}>
          Back to Suppliers
        </Button>
      </div>
    )
  }

  if (!supplier) {
    return (
      <div>
        <Alert variant="warning" className="mb-6">Supplier not found</Alert>
        <Button variant="secondary" onClick={() => navigate('/suppliers')}>
          Back to Suppliers
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">{supplier.name}</h1>
          <p className="text-[var(--text-secondary)] mt-1">Supplier ID: {supplier.supplier_id}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/suppliers')}>
            Back to List
          </Button>
          <Button variant="primary" onClick={() => navigate(`/suppliers/${id}/edit`)}>
            Edit Supplier
          </Button>
        </div>
      </div>

      {/* Status and Key Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-1">Status</p>
            <Badge variant={supplier.is_active ? 'success' : 'warning'}>
              {supplier.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-1">Rating</p>
            <p className="text-2xl font-bold">
              {supplier.rating ? `⭐ ${supplier.rating.toFixed(1)}` : '—'}
            </p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-1">Payment Terms</p>
            <p className="text-2xl font-bold">{supplier.payment_terms_days} days</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-1">Lead Time</p>
            <p className="text-2xl font-bold">{supplier.lead_time_days} days</p>
          </div>
        </Card>
      </div>

      {/* Basic Information */}
      <Card className="mb-8">
        <h2 className="text-xl font-bold mb-6">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Supplier Name</label>
            <p className="text-[var(--text-primary)]">{supplier.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">GSTIN</label>
            <p className="font-mono text-[var(--text-primary)]">{supplier.gstin}</p>
          </div>

          {supplier.supplier_group && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Supplier Group</label>
              <p className="text-[var(--text-primary)]">{supplier.supplier_group}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Supplier ID</label>
            <p className="text-[var(--text-primary)]">{supplier.supplier_id}</p>
          </div>
        </div>
      </Card>

      {/* Contacts */}
      {supplier.contacts && supplier.contacts.length > 0 && (
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-6">Contacts</h2>
          <div className="space-y-4">
            {supplier.contacts.map((contact, index) => (
              <div key={index} className="border-l-4 border-primary-600 pl-4">
                <p className="font-semibold text-[var(--text-primary)]">{contact.name}</p>
                {contact.role && (
                  <p className="text-sm text-[var(--text-secondary)]">{contact.role}</p>
                )}
                {contact.email && (
                  <p className="text-sm text-[var(--text-secondary)]">{contact.email}</p>
                )}
                {contact.phone && (
                  <p className="text-sm text-[var(--text-secondary)]">{contact.phone}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Addresses */}
      {supplier.addresses && supplier.addresses.length > 0 && (
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-6">Addresses</h2>
          <div className="space-y-4">
            {supplier.addresses.map((address, index) => (
              <div key={index} className="border-l-4 border-primary-600 pl-4">
                <p className="font-semibold text-[var(--text-primary)]">
                  {address.address_line1}
                </p>
                {address.address_line2 && (
                  <p className="text-[var(--text-secondary)]">{address.address_line2}</p>
                )}
                <p className="text-[var(--text-secondary)]">
                  {address.city} {address.state && `, ${address.state}`} {address.pincode}
                </p>
                {address.country && (
                  <p className="text-[var(--text-secondary)]">{address.country}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Scorecard */}
      {supplier.scorecard && (
        <Card className="mb-8">
          <h2 className="text-xl font-bold mb-6">Performance Scorecard</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Quality Score</label>
              <p className="text-2xl font-bold">{supplier.scorecard.quality_score || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Delivery Score</label>
              <p className="text-2xl font-bold">{supplier.scorecard.delivery_score || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Cost Score</label>
              <p className="text-2xl font-bold">{supplier.scorecard.cost_score || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Overall Score</label>
              <p className="text-2xl font-bold">{supplier.scorecard.overall_score || '—'}</p>
            </div>
          </div>
          {supplier.scorecard.last_evaluated_date && (
            <p className="text-sm text-[var(--text-secondary)] mt-4">
              Last evaluated: {new Date(supplier.scorecard.last_evaluated_date).toLocaleDateString()}
            </p>
          )}
        </Card>
      )}

      {/* Timestamps */}
      {(supplier.created_at || supplier.updated_at) && (
        <Card>
          <div className="text-sm text-[var(--text-secondary)] space-y-1">
            {supplier.created_at && (
              <p>Created on {new Date(supplier.created_at).toLocaleString()}</p>
            )}
            {supplier.updated_at && (
              <p>Last updated on {new Date(supplier.updated_at).toLocaleString()}</p>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}