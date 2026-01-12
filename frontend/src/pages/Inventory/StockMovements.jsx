import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { ArrowDown, ArrowUp, Filter, RefreshCw, Plus, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import StockMovementModal from '../../components/Inventory/StockMovementModal'

export default function StockMovements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedMovement, setSelectedMovement] = useState(null)

  useEffect(() => {
    fetchMovements()
  }, [statusFilter, typeFilter])

  const fetchMovements = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (typeFilter) params.append('movement_type', typeFilter)

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/stock/movements?${params}`)
      if (response.data.success) {
        setMovements(response.data.data || [])
        setError(null)
      } else {
        setError(response.data.error || 'Failed to fetch stock movements')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err.response?.data?.error || 'Failed to load stock movements')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (movementId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/stock/movements/${movementId}/approve`
      )
      if (response.data.success) {
        fetchMovements()
      }
    } catch (err) {
      alert('Failed to approve movement')
    }
  }

  const handleReject = async (movementId, reason) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/stock/movements/${movementId}/reject`,
        { reason }
      )
      if (response.data.success) {
        fetchMovements()
      }
    } catch (err) {
      alert('Failed to reject movement')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-700'
      case 'Approved':
        return 'bg-blue-100 text-blue-700'
      case 'Completed':
        return 'bg-green-100 text-green-700'
      case 'Cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-neutral-100 text-neutral-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock size={16} />
      case 'Approved':
        return <CheckCircle size={16} />
      case 'Completed':
        return <CheckCircle size={16} />
      case 'Cancelled':
        return <XCircle size={16} />
      default:
        return <AlertCircle size={16} />
    }
  }

  const filteredMovements = movements.filter(m => {
    const matchesSearch = !searchTerm || 
      m.transaction_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Stock Movements</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Track material IN/OUT transactions with approval workflow</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => { setSelectedMovement(null); setShowModal(true) }}
            className="flex items-center gap-2"
          >
            <Plus size={18} /> New Movement
          </Button>
          <Button
            variant="secondary"
            onClick={fetchMovements}
            className="flex items-center gap-2"
          >
            <RefreshCw size={18} />
          </Button>
        </div>
      </div>

      {error && <Alert type="danger">{error}</Alert>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by transaction #, item code, or item name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading stock movements...</p>
          </div>
        </div>
      ) : filteredMovements.length === 0 ? (
        <Card className="p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-neutral-300 mb-3" />
          <p className="text-neutral-600">No stock movements found</p>
        </Card>
      ) : (
        <div className="">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Transaction #</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Item</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100">Quantity</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Warehouse</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Reference</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-neutral-900 dark:text-neutral-100">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{movement.transaction_no}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{movement.item_code}</p>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">{movement.item_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {movement.movement_type === 'IN' ? (
                        <>
                          <ArrowDown size={16} className="text-green-600" />
                          <span className="font-semibold text-green-600">IN</span>
                        </>
                      ) : (
                        <>
                          <ArrowUp size={16} className="text-red-600" />
                          <span className="font-semibold text-red-600">OUT</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{parseFloat(movement.quantity).toFixed(2)}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{movement.warehouse_name}</td>
                  <td className="px-4 py-3 text-xs">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{movement.reference_type}</p>
                      {movement.reference_name && (
                        <p className="text-neutral-600 dark:text-neutral-400">{movement.reference_name}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(movement.status)}
                      <Badge className={getStatusColor(movement.status)}>
                        {movement.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                    {new Date(movement.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {movement.status === 'Pending' && (
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(movement.id)}
                          className="text-xs"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleReject(movement.id, 'Rejected by user')}
                          className="text-xs"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {movement.status !== 'Pending' && (
                      <span className="text-xs text-neutral-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <StockMovementModal
          onClose={() => { setShowModal(false); setSelectedMovement(null) }}
          onSuccess={() => { setShowModal(false); fetchMovements() }}
        />
      )}
    </div>
  )
}
