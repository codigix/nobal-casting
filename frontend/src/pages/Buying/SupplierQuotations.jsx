import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import CreateQuotationModal from '../../components/Buying/CreateQuotationModal'
import { Plus, Eye, Send, Trash2, CheckCircle, XCircle } from 'lucide-react'
import './Buying.css'

export default function SupplierQuotations() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchQuotations()
  }, [filters])

  const fetchQuotations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await axios.get(`/api/quotations?${params}`)
      setQuotations(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch quotations')
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (id) => {
    try {
      await axios.patch(`/api/quotations/${id}/submit`)
      setSuccess('Quotation submitted successfully')
      fetchQuotations()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quotation')
    }
  }

  const handleAccept = async (id) => {
    if (window.confirm('Are you sure you want to accept this quotation?')) {
      try {
        await axios.patch(`/api/quotations/${id}/accept`)
        setSuccess('Quotation accepted successfully')
        fetchQuotations()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to accept quotation')
      }
    }
  }

  const handleReject = async (id) => {
    try {
      await axios.patch(`/api/quotations/${id}/reject`)
      setSuccess('Quotation rejected successfully')
      fetchQuotations()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject quotation')
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await axios.delete(`/api/quotations/${id}`)
        setSuccess('Quotation deleted successfully')
        fetchQuotations()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete quotation')
      }
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',           // Yellow - Action Required
      received: 'info',           // Blue - Quote Received from Supplier
      accepted: 'success',        // Green - Quote Selected/Accepted
      rejected: 'danger'          // Red - Quote Rejected
    }
    return colors[status] || 'secondary'
  }

  const columns = [
    { key: 'supplier_quotation_id', label: 'Quote ID', width: '10%' },
    { key: 'supplier_name', label: 'Supplier', width: '12%' },
    { key: 'rfq_id', label: 'RFQ ID', width: '10%' },
    { 
      key: 'quote_date', 
      label: 'Quote Date', 
      width: '10%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'total_value', 
      label: 'Total Value', 
      width: '10%',
      render: (val) => `₹${(parseFloat(val) || 0).toFixed(2)}`
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '10%',
      render: (val) => <Badge color={getStatusColor(val)}>{val}</Badge>
    },
    { 
      key: 'created_at', 
      label: 'Created', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleString() : 'N/A'
    },
    { 
      key: 'created_by', 
      label: 'Created By', 
      width: '10%',
      render: (val) => val || 'System'
    }
  ]

  const renderActions = (row) => (
    <div style={{ display: 'flex', gap: '2px' }}>
      <Button 
        size="sm"
        variant="icon"
        onClick={() => navigate(`/buying/quotation/${row.supplier_quotation_id}`)}
        title="View Quotation"
        className="flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'draft' && (
        <>
          <Button 
            size="sm"
            variant="icon-info"
            onClick={() => handleSubmit(row.supplier_quotation_id)}
            title="Submit Quotation"
            className="flex items-center justify-center p-2"
          >
            <Send size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-danger"
            onClick={() => handleDelete(row.supplier_quotation_id)}
            title="Delete Quotation"
            className="flex items-center justify-center p-2"
          >
            <Trash2 size={16} />
          </Button>
        </>
      )}
      {row.status === 'received' && (
        <>
          <Button 
            size="sm"
            variant="icon-success"
            onClick={() => handleAccept(row.supplier_quotation_id)}
            title="Accept Quotation"
            className="flex items-center justify-center p-2"
          >
            <CheckCircle size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-danger"
            onClick={() => handleReject(row.supplier_quotation_id)}
            title="Reject Quotation"
            className="flex items-center justify-center p-2"
          >
            <XCircle size={16} />
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="buying-container">
      <CreateQuotationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchQuotations()
          setSuccess('Quotation created successfully')
          setTimeout(() => setSuccess(null), 3000)
        }}
      />

      <Card>
        <div className="page-header">
          <h2>Supplier Quotations</h2>
          <Button 
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus size={20} /> New Quotation
          </Button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <AdvancedFilters 
          filters={filters}
          onFilterChange={setFilters}
          filterConfig={[
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: [
                { value: 'draft', label: 'Draft' },
                { value: 'received', label: 'Received' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' }
              ]
            },
            {
              key: 'search',
              label: 'Search',
              type: 'text',
              placeholder: 'Quote ID or supplier name...'
            }
          ]}
          onApply={fetchQuotations}
          onReset={() => {
            setFilters({ status: '', search: '' })
          }}
          showPresets={true}
        />

        {loading ? (
          <div className="loading">Loading...</div>
        ) : quotations.length === 0 ? (
          <div className="empty-state">
            <p>No quotations found</p>
          </div>
        ) : (
          <DataTable 
            columns={columns}
            data={quotations}
            renderActions={renderActions}
            filterable={true}
            sortable={true}
            pageSize={10}
          />
        )}
      </Card>
    </div>
  )
}