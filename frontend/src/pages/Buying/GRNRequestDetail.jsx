import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { ArrowLeft, CheckCircle, XCircle, Clock, Package, User, ChevronRight, Truck, Home, FileCheck, AlertCircle } from 'lucide-react'
import ItemInspectionModal from '../../components/Buying/ItemInspectionModal'
import InspectionApprovalModal from '../../components/Buying/InspectionApprovalModal'
import InventoryApprovalModal from '../../components/Buying/InventoryApprovalModal'
import './Buying.css'

export default function GRNRequestDetail() {
  const { grnNo } = useParams()
  const navigate = useNavigate()
  const [grn, setGrn] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showInspectionModal, setShowInspectionModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showInventoryApprovalModal, setShowInventoryApprovalModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (grnNo) {
      fetchGRN()
      fetchUser()
    }
  }, [grnNo])

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }

  const fetchGRN = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/grn-requests/${grnNo}`)
      const data = await res.json()
      if (data.success) {
        setGrn(data.data)
      } else {
        setError(data.error || 'Failed to fetch GRN')
      }
    } catch (error) {
      console.error('Error fetching GRN:', error)
      setError('Error fetching GRN details')
    } finally {
      setLoading(false)
    }
  }

  const refetchGRN = () => {
    fetchGRN()
  }

  const handleStartInspection = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/grn-requests/${grn.id}/start-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await res.json()
      if (data.success) {
        setGrn(data.data)
        setSuccess('Inspection started successfully')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error)
      }
    } catch (error) {
      setError('Error starting inspection')
    } finally {
      setLoading(false)
    }
  }

  const handleItemInspection = (item) => {
    setSelectedItem(item)
    setShowInspectionModal(true)
  }

  const handleApproval = () => {
    setShowApprovalModal(true)
  }

  const handleApprovalSuccess = (updatedGrn) => {
    setGrn(updatedGrn)
    setShowApprovalModal(false)
    setSuccess('GRN approved and stock moved to inventory')
    setTimeout(() => setSuccess(null), 3000)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      inspecting: 'info',
      awaiting_inventory_approval: 'info',
      approved: 'success',
      rejected: 'danger',
      sent_back: 'warning'
    }
    return colors[status] || 'secondary'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} />
      case 'inspecting':
        return <Package size={16} />
      case 'awaiting_inventory_approval':
        return <Clock size={16} />
      case 'approved':
        return <CheckCircle size={16} />
      case 'rejected':
        return <XCircle size={16} />
      case 'sent_back':
        return <ArrowLeft size={16} />
      default:
        return null
    }
  }

  if (loading && !grn) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">Loading GRN details...</p>
        </div>
      </div>
    )
  }

  if (error && !grn) {
    return (
      <Card className="p-6 bg-red-50 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <Button variant="primary" size="sm" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </Card>
    )
  }

  if (!grn) return null

  return (
    <div className="space-y-4 m-4">
      {/* Header Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="icon"
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 text-xs">
            <span>Buying</span>
            <ChevronRight size={14} />
            <span>GRN</span>
            <ChevronRight size={14} />
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">{grn.grn_no}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-0">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">GRN #{grn.grn_no}</h1>
            <p className="text-neutral-600 dark:text-neutral-400 mt-1 text-sm">
              <span className="font-medium">PO:</span> {grn.po_no} <span className="mx-1.5">•</span> <span className="font-medium">Supplier:</span> {grn.supplier_name}
            </p>
          </div>
          <Badge color={getStatusColor(grn.status)} variant="solid" className="flex items-center gap-1.5 text-sm px-3 py-1.5 whitespace-nowrap">
            {getStatusIcon(grn.status)}
            {grn.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {error && <Alert type="danger" className="mb-2">{error}</Alert>}
      {success && <Alert type="success" className="mb-2">{success}</Alert>}

      {/* Workflow Progress - Horizontal Timeline */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-900/30">
        <div className="flex items-center justify-between">
          {[
            { status: 'pending', label: 'Received', icon: Truck },
            { status: 'inspecting', label: 'Inspecting', icon: FileCheck },
            { status: 'awaiting_inventory_approval', label: 'Review', icon: Home },
            { status: 'approved', label: 'Completed', icon: CheckCircle }
          ].map((step, idx) => {
            const Icon = step.icon
            const isCompleted = ['inspecting', 'awaiting_inventory_approval', 'approved', 'rejected'].includes(grn.status) && idx === 0 ||
                               ['awaiting_inventory_approval', 'approved'].includes(grn.status) && idx <= 1 ||
                               grn.status === 'approved' && idx <= 3
            const isActive = (idx === 0 && grn.status === 'pending') ||
                            (idx === 1 && grn.status === 'inspecting') ||
                            (idx === 2 && grn.status === 'awaiting_inventory_approval') ||
                            (idx === 3 && grn.status === 'approved')
            const isSkipped = ['rejected', 'sent_back'].includes(grn.status) && idx >= 3

            return (
              <div key={step.status} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all transform font-semibold text-sm shadow-md ${
                    isCompleted ? 'bg-green-500 text-white scale-105' :
                    isActive ? 'bg-blue-500 text-white scale-105' :
                    isSkipped ? 'bg-red-400 text-white' :
                    'bg-neutral-300 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300'
                  }`}>
                    <Icon size={18} />
                  </div>
                  <p className="text-xs font-semibold mt-1.5 text-neutral-700 dark:text-neutral-300 text-center whitespace-nowrap">{step.label}</p>
                </div>
                {idx < 3 && (
                  <div className={`h-1.5 flex-1 mx-1.5 mb-7 rounded-full transition-colors ${
                    isCompleted ? 'bg-green-500' :
                    isActive ? 'bg-blue-300' :
                    isSkipped ? 'bg-red-200' :
                    'bg-neutral-300 dark:bg-neutral-700'
                  }`}></div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-1">Total Items</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{grn.items?.length || 0}</p>
            </div>
            <Package size={32} className="text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-amber-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-1">Receipt Date</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {new Date(grn.receipt_date).toLocaleDateString()}
              </p>
            </div>
            <Clock size={32} className="text-amber-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-1">Assigned To</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {grn.assigned_user || '—'}
              </p>
            </div>
            <User size={32} className="text-purple-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-3 border-l-4 border-green-500 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-1">Created By</p>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {grn.created_by_user || 'System'}
              </p>
            </div>
            <FileCheck size={32} className="text-green-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* GRN Details Section */}
      {(grn.approved_by_user || grn.notes) && (
        <Card className="p-3">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Additional Information
          </h3>
          <div className="space-y-2">
            {grn.approved_by_user && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 text-sm">
                <span className="font-medium text-neutral-600 dark:text-neutral-400">Approved By:</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">{grn.approved_by_user}</span>
              </div>
            )}
            {grn.notes && (
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 text-sm">
                <p className="font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notes:</p>
                <p className="text-neutral-900 dark:text-neutral-100">{grn.notes}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Items Section */}
      <Card className="overflow-hidden">
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Receipt Items</h2>
          {grn.status === 'pending' && (
            <Button
              variant="primary"
              onClick={handleStartInspection}
              loading={loading}
              size="sm"
              className="gap-1.5 flex items-center text-xs px-3 py-1.5"
            >
              <CheckCircle size={14} />
              Start Inspection
            </Button>
          )}
        </div>

        {grn.items && grn.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">#</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Item Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Item Name</th>
                  <th className="px-3 py-2 text-center font-semibold text-neutral-700 dark:text-neutral-300">PO Qty</th>
                  <th className="px-3 py-2 text-center font-semibold text-neutral-700 dark:text-neutral-300">Received</th>
                  <th className="px-3 py-2 text-center font-semibold text-neutral-700 dark:text-neutral-300">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700 dark:text-neutral-300">Warehouse</th>
                  <th className="px-3 py-2 text-center font-semibold text-neutral-700 dark:text-neutral-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grn.items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-3 py-2">
                      <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-xs">
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">{item.item_code}</td>
                    <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">{item.item_name}</td>
                    <td className="px-3 py-2 text-center font-semibold text-neutral-900 dark:text-neutral-100">{item.po_qty}</td>
                    <td className="px-3 py-2 text-center font-semibold text-amber-600 dark:text-amber-400">{item.received_qty}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge
                        color={item.item_status === 'accepted' ? 'success' : item.item_status === 'rejected' ? 'danger' : 'warning'}
                        variant="solid"
                        className="text-xs inline-block"
                      >
                        {item.item_status?.replace('_', ' ') || 'pending'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100 text-xs">{item.warehouse_name}</td>
                    <td className="px-3 py-2 text-center">
                      {grn.status === 'inspecting' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleItemInspection(item)}
                          className="text-xs px-2 py-1"
                        >
                          Inspect
                        </Button>
                      )}
                      {grn.status === 'approved' && item.accepted_qty > 0 && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold text-xs">
                          <CheckCircle size={12} /> {item.accepted_qty}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Package size={48} className="mx-auto text-neutral-400 mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">No items in this GRN</p>
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      {(grn.status === 'inspecting' || grn.status === 'awaiting_inventory_approval') && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-900">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Required Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grn.status === 'inspecting' && (
              <>
                <Button
                  variant="success"
                  onClick={handleApproval}
                  className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold h-auto shadow-lg hover:shadow-xl"
                >
                  <CheckCircle size={16} />
                  Send to Inventory
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setShowApprovalModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold h-auto shadow-lg hover:shadow-xl"
                >
                  <XCircle size={16} />
                  Reject GRN
                </Button>
              </>
            )}
            {grn.status === 'awaiting_inventory_approval' && (
              <>
                <Button
                  variant="success"
                  onClick={() => setShowInventoryApprovalModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold h-auto shadow-lg hover:shadow-xl"
                >
                  <Home size={16} />
                  Approve & Store
                </Button>
                <Button
                  variant="warning"
                  onClick={() => setShowApprovalModal(true)}
                  className="flex items-center justify-center gap-1.5 py-2 text-sm font-semibold h-auto shadow-lg hover:shadow-xl"
                >
                  <ArrowLeft size={16} />
                  Send Back to Inspection
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Activity Timeline - Horizontal */}
      {grn.logs && grn.logs.length > 0 && (
        <Card className="p-4 overflow-hidden">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3 flex items-center gap-2">
            <Clock size={16} />
            Activity History
          </h2>
          
          <div className="overflow-x-auto pb-2">
            <div className="relative flex items-start gap-2 min-w-max px-2">
              <div className="absolute top-7 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-300 to-green-500"></div>
              
              {grn.logs.map((log, idx) => (
                <div key={log.id} className="relative flex flex-col items-center flex-shrink-0 w-64">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-4 border-white dark:border-neutral-950 mb-3 relative z-10"></div>
                  
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-2 border border-neutral-200 dark:border-neutral-700 w-full">
                    <p className="font-bold text-neutral-900 dark:text-neutral-100 text-xs mb-1.5">{log.action}</p>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-xs flex-wrap">
                        <Badge color="info" variant="solid" className="text-xs whitespace-nowrap">
                          {log.status_from}
                        </Badge>
                        <span className="text-neutral-600 dark:text-neutral-400 font-semibold">→</span>
                        <Badge color="success" variant="solid" className="text-xs whitespace-nowrap">
                          {log.status_to}
                        </Badge>
                      </div>
                      
                      {log.reason && (
                        <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900">
                          <p className="text-xs text-amber-900 dark:text-amber-200 line-clamp-2">
                            <span className="font-semibold">Reason:</span> {log.reason}
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-0.5">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Modals */}
      {showInspectionModal && selectedItem && (
        <ItemInspectionModal
          item={selectedItem}
          grnId={grn.id}
          grnNo={grn.grn_no}
          onClose={() => {
            setShowInspectionModal(false)
            setSelectedItem(null)
          }}
          onSuccess={() => {
            refetchGRN()
            setShowInspectionModal(false)
            setSelectedItem(null)
          }}
        />
      )}

      {showApprovalModal && (
        <InspectionApprovalModal
          grn={grn}
          onClose={() => setShowApprovalModal(false)}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {showInventoryApprovalModal && (
        <InventoryApprovalModal
          grn={grn}
          onClose={() => setShowInventoryApprovalModal(false)}
          onSuccess={(updatedGrn) => {
            setGrn(updatedGrn)
            setShowInventoryApprovalModal(false)
            setSuccess('GRN approved and items stored in inventory')
            setTimeout(() => setSuccess(null), 3000)
          }}
        />
      )}
    </div>
  )
}
