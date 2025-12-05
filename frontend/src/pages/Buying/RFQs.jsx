import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Badge from '../../components/Badge/Badge'
import CreateRFQModal from '../../components/Buying/CreateRFQModal'
import { Plus, Eye, Send, Trash2, MessageSquare, XCircle } from 'lucide-react'
import './Buying.css'

export default function RFQs() {
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({ status: '', search: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchRFQs()
  }, [filters])

  const fetchRFQs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await axios.get(`/api/rfqs?${params}`)
      setRfqs(response.data.data || [])
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch RFQs')
      setRfqs([])
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (id) => {
    try {
      await axios.patch(`/api/rfqs/${id}/send`)
      setSuccess('RFQ sent to suppliers successfully')
      fetchRFQs()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send RFQ')
    }
  }

  const handleClose = async (id) => {
    if (window.confirm('Are you sure you want to close this RFQ?')) {
      try {
        await axios.patch(`/api/rfqs/${id}/close`)
        setSuccess('RFQ closed successfully')
        fetchRFQs()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to close RFQ')
      }
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this RFQ?')) {
      try {
        await axios.delete(`/api/rfqs/${id}`)
        setSuccess('RFQ deleted successfully')
        fetchRFQs()
        setTimeout(() => setSuccess(null), 3000)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete RFQ')
      }
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'warning',           // Yellow - Action Required
      sent: 'info',               // Blue - Sent to Suppliers, Awaiting Responses
      responses_received: 'success', // Green - Supplier Responses Received
      closed: 'secondary'         // Gray - RFQ Closed/Completed
    }
    return colors[status] || 'secondary'
  }

  const filterConfig = [
    { key: 'search', label: 'Search RFQ', type: 'text', placeholder: 'RFQ ID...' },
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select',
      options: [
        { value: '', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'responses_received', label: 'Responses Received' },
        { value: 'closed', label: 'Closed' }
      ]
    }
  ]

  const columns = [
    { key: 'rfq_id', label: 'RFQ ID', width: '12%' },
    { key: 'created_by_name', label: 'Created By', width: '12%' },
    { 
      key: 'created_date', 
      label: 'Created Date', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'valid_till', 
      label: 'Valid Till', 
      width: '12%',
      render: (val) => val ? new Date(val).toLocaleDateString() : 'N/A'
    },
    { 
      key: 'supplier_count', 
      label: 'Suppliers', 
      width: '10%',
      render: (val) => val || '0'
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (val) => (
        <Badge color={getStatusColor(val)} variant="solid">
          {val?.replace('_', ' ').toUpperCase()}
        </Badge>
      )
    },
    { 
      key: 'item_count', 
      label: 'Items', 
      width: '10%',
      render: (val) => val || '0'
    }
  ]

  const renderActions = (row) => (
    <div style={{ display: 'flex', gap: '5px'}}>
      <Button 
        size="sm"
        variant="icon"
        onClick={(e) => {
          e.stopPropagation()
          navigate(`/buying/rfq/${row.rfq_id}`)
        }}
        title="View RFQ"
        className="flex items-center justify-center p-2"
      >
        <Eye size={16} />
      </Button>
      {row.status === 'draft' && (
        <>
          <Button 
            size="sm"
            variant="icon-success"
            onClick={(e) => {
              e.stopPropagation()
              handleSend(row.rfq_id)
            }}
            title="Send RFQ to Suppliers"
            className="flex items-center justify-center p-2"
          >
            <Send size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-danger"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(row.rfq_id)
            }}
            title="Delete RFQ"
            className="flex items-center justify-center p-2"
          >
            <Trash2 size={16} />
          </Button>
        </>
      )}
      {(row.status === 'sent' || row.status === 'responses_received') && (
        <>
          <Button 
            size="sm"
            variant="icon-info"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/buying/rfq/${row.rfq_id}/responses`)
            }}
            title="View Supplier Responses"
            className="flex items-center justify-center p-2"
          >
            <MessageSquare size={16} />
          </Button>
          <Button 
            size="sm"
            variant="icon-warning"
            onClick={(e) => {
              e.stopPropagation()
              handleClose(row.rfq_id)
            }}
            title="Close RFQ"
            className="flex items-center justify-center p-2"
          >
            <XCircle size={16} />
          </Button>
        </>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <CreateRFQModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchRFQs()
          setSuccess('RFQ created successfully')
          setTimeout(() => setSuccess(null), 3000)
        }}
      />

      <div className="flex-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Request for Quotation (RFQ)</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">Send RFQs to suppliers and manage their responses</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary" className="flex items-center gap-2">
          <Plus size={20} /> New RFQ
        </Button>
      </div>

      {error && <Alert type="danger">{error}</Alert>}
      {success && <Alert type="success">{success}</Alert>}

      <AdvancedFilters
        filters={filters}
        onFilterChange={setFilters}
        filterConfig={filterConfig}
        showPresets={true}
      />

      <Card>
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">Loading RFQs...</p>
            </div>
          </div>
        ) : rfqs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">No RFQs found</p>
            <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="flex items-center gap-2">
              <Plus size={16} /> Create First RFQ
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rfqs}
            renderActions={renderActions}
            filterable={true}
            sortable={true}
            pageSize={10}
            onRowClick={(row) => navigate(`/buying/rfq/${row.rfq_id}`)}
          />
        )}
      </Card>
    </div>
  )
}