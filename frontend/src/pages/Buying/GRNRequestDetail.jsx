import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import Alert from '../../components/Alert/Alert'
import { ArrowLeft, CheckCircle, XCircle, Clock, Package, User, ChevronRight, Truck, Home, FileCheck, AlertCircle, ChevronDown, MessageSquare, Send } from 'lucide-react'
import ItemInspectionModal from '../../components/Buying/ItemInspectionModal'
import InspectionApprovalModal from '../../components/Buying/InspectionApprovalModal'
import QCApprovalModal from '../../components/Buying/QCApprovalModal'
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
  const [showQCApprovalModal, setShowQCApprovalModal] = useState(false)
  const [showInventoryApprovalModal, setShowInventoryApprovalModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [user, setUser] = useState(null)
  const [expandedItems, setExpandedItems] = useState({})
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

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

  const toggleItemExpanded = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: Date.now(),
        user: user?.name || 'Anonymous',
        timestamp: new Date(),
        text: newComment
      }
      setComments([...comments, comment])
      setNewComment('')
    }
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

  const handleQCApproval = () => {
    setShowQCApprovalModal(true)
  }

  const handleQCApprovalSuccess = (updatedGrn) => {
    setGrn(updatedGrn)
    setShowQCApprovalModal(false)
    setSuccess('GRN approved by QC. Ready for inventory approval.')
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 p-4 md:p-6">
      <div className=" mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="icon"
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-all shadow-sm"
            title="Go back"
          >
            <ArrowLeft size={20} className="text-neutral-600 dark:text-neutral-400" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mb-2">
              <span>Buying</span>
              <ChevronRight size={14} />
              <span>GRN Management</span>
              <ChevronRight size={14} />
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{grn.grn_no}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">GRN #{grn.grn_no}</h1>
                <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-sm">
                  <span className="font-medium">Purchase Order:</span> {grn.po_no} <span className="mx-2">•</span> 
                  <span className="font-medium">Supplier:</span> {grn.supplier_name}
                </p>
              </div>
              <Badge color={getStatusColor(grn.status)} variant="solid" className="flex items-center gap-2 text-sm px-4 py-2 whitespace-nowrap shadow-lg">
                {getStatusIcon(grn.status)}
                {grn.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {error && <Alert type="danger" className="shadow-lg">{error}</Alert>}
        {success && <Alert type="success" className="shadow-lg">{success}</Alert>}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workflow Progress - Timeline */}
            <Card className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-900/30 shadow-lg">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <Truck size={16} /> Workflow Progress
              </h3>
              <div className="flex items-center justify-between  pb-2">
                {[
                  { status: 'pending', label: 'Received', icon: Truck },
                  { status: 'inspecting', label: 'Inspecting', icon: FileCheck },
                  { status: 'qc_approval', label: 'QC Check', icon: CheckCircle },
                  { status: 'awaiting_inventory_approval', label: 'Storage', icon: Package },
                  { status: 'approved', label: 'Completed', icon: CheckCircle }
                ].map((step, idx) => {
                  const Icon = step.icon
                  const isCompleted = ['inspecting', 'qc_approval', 'awaiting_inventory_approval', 'approved'].includes(grn.status) && idx === 0 ||
                                     ['qc_approval', 'awaiting_inventory_approval', 'approved'].includes(grn.status) && idx <= 1 ||
                                     ['awaiting_inventory_approval', 'approved'].includes(grn.status) && idx <= 2 ||
                                     ['approved'].includes(grn.status) && idx <= 3 ||
                                     grn.status === 'approved' && idx <= 4
                  const isActive = (idx === 0 && grn.status === 'pending') ||
                                  (idx === 1 && grn.status === 'inspecting') ||
                                  (idx === 2 && grn.status === 'qc_approval') ||
                                  (idx === 3 && grn.status === 'awaiting_inventory_approval') ||
                                  (idx === 4 && grn.status === 'approved')

                  return (
                    <div key={step.status} className="flex items-center flex-1 min-w-max">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shadow-md transition-all ${
                          isCompleted ? 'bg-green-500 text-white' :
                          isActive ? 'bg-blue-600 text-white scale-110' :
                          'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <p className="text-xs  mt-2 text-neutral-700 dark:text-neutral-300 text-center">{step.label}</p>
                      </div>
                      {idx < 4 && (
                        <div className={`h-1 flex-1 mx-2 mb-6 rounded-full transition-colors ${
                          isCompleted ? 'bg-green-500' :
                          isActive ? 'bg-blue-300 dark:bg-blue-600' :
                          'bg-neutral-200 dark:bg-neutral-700'
                        }`}></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Key Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4 border-l-4 border-blue-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Total Items</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{grn.items?.length || 0}</p>
                  </div>
                  <Package size={32} className="text-blue-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-amber-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Receipt Date</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {new Date(grn.receipt_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Clock size={32} className="text-amber-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-purple-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Assigned To</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {grn.assigned_user || '—'}
                    </p>
                  </div>
                  <User size={32} className="text-purple-500 opacity-20" />
                </div>
              </Card>

              <Card className="p-4 border-l-4 border-green-500 hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wide mb-2">Created By</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                      {grn.created_by_user || 'System'}
                    </p>
                  </div>
                  <FileCheck size={32} className="text-green-500 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Receipt Items Section */}
            <Card className="overflow-hidden shadow-lg">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 flex justify-between items-center">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Package size={18} /> Receipt Items
                </h2>
                {grn.status === 'pending' && (
                  <Button
                    variant="primary"
                    onClick={handleStartInspection}
                    loading={loading}
                    size="sm"
                    className="gap-2 flex items-center text-xs"
                  >
                    <CheckCircle size={14} />
                    Start Inspection
                  </Button>
                )}
              </div>

              {grn.items && grn.items.length > 0 ? (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {grn.items.map((item, idx) => {
                    const isExpanded = expandedItems[item.id]
                    return (
                      <div key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <div
                          onClick={() => toggleItemExpanded(item.id)}
                          className="p-4 cursor-pointer flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all"
                        >
                          <ChevronDown
                            size={20}
                            className={`text-neutral-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400 text-sm flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{item.item_code}</p>
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{item.item_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">PO Qty</p>
                              <p className="font-bold text-neutral-900 dark:text-neutral-100">{item.po_qty}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">Received</p>
                              <p className="font-bold text-amber-600 dark:text-amber-400">{item.received_qty}</p>
                            </div>
                            <Badge
                              color={item.item_status === 'accepted' ? 'success' : item.item_status === 'rejected' ? 'danger' : 'warning'}
                              variant="solid"
                              className="text-xs whitespace-nowrap"
                            >
                              {item.item_status?.replace('_', ' ') || 'pending'}
                            </Badge>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase mb-1">Warehouse</p>
                                <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{item.warehouse_name}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase mb-1">Accepted</p>
                                <p className="font-bold text-green-600 dark:text-green-400 text-sm">{item.accepted_qty || 0}</p>
                              </div>
                              <div className="p-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase mb-1">Rejected</p>
                                <p className="font-bold text-red-600 dark:text-red-400 text-sm">{item.rejected_qty || 0}</p>
                              </div>
                            </div>

                            {grn.status === 'inspecting' && (
                              <Button
                                variant="primary"
                                onClick={() => handleItemInspection(item)}
                                size="sm"
                                className="w-full gap-2 flex items-center justify-center"
                              >
                                <FileCheck size={14} />
                                Inspect Item
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Package size={48} className="mx-auto text-neutral-300 mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">No items in this GRN</p>
                </div>
              )}
            </Card>

            {/* Action Buttons */}
            {(grn.status === 'inspecting' || grn.status === 'awaiting_inventory_approval') && (
              <Card className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-900 shadow-lg">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Required Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grn.status === 'inspecting' && (
                    <>
                      <Button
                        variant="success"
                        onClick={handleQCApproval}
                        className="flex items-center justify-center gap-2 py-3 text-sm font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <CheckCircle size={18} />
                        QC Approval
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setShowApprovalModal(true)}
                        className="flex items-center justify-center gap-2 py-3 text-sm font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <XCircle size={18} />
                        Send Back
                      </Button>
                    </>
                  )}
                  {grn.status === 'awaiting_inventory_approval' && (
                    <>
                      <Button
                        variant="success"
                        onClick={() => setShowInventoryApprovalModal(true)}
                        className="flex items-center justify-center gap-2 py-3 text-sm font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <Home size={18} />
                        Approve & Store
                      </Button>
                      <Button
                        variant="warning"
                        onClick={() => setShowApprovalModal(true)}
                        className="flex items-center justify-center gap-2 py-3 text-sm font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <ArrowLeft size={18} />
                        Send Back to QC
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Activity Timeline */}
            {grn.logs && grn.logs.length > 0 && (
              <Card className="p-5 overflow-hidden shadow-lg">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                  <Clock size={18} />
                  Activity History
                </h2>
                <div className="space-y-3">
                  {grn.logs.map((log, idx) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-neutral-950"></div>
                        {idx < grn.logs.length - 1 && (
                          <div className="w-0.5 h-8 bg-blue-200 dark:bg-blue-900"></div>
                        )}
                      </div>
                      <div className="pb-3 flex-1">
                        <p className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">{log.action}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge color="info" variant="solid" className="text-xs">
                            {log.status_from}
                          </Badge>
                          <span className="text-neutral-600 dark:text-neutral-400">→</span>
                          <Badge color="success" variant="solid" className="text-xs">
                            {log.status_to}
                          </Badge>
                        </div>
                        {log.reason && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 italic">{log.reason}</p>
                        )}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Side Panel */}
          <div className="space-y-6">
            {/* GRN Details Card */}
            {(grn.approved_by_user || grn.notes) && (
              <Card className="p-5 shadow-lg">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                  <AlertCircle size={18} />
                  Details
                </h3>
                <div className="space-y-3">
                  {grn.approved_by_user && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
                      <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase mb-1">Approved By</p>
                      <p className="font-semibold text-green-900 dark:text-green-100">{grn.approved_by_user}</p>
                    </div>
                  )}
                  {grn.notes && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900">
                      <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase mb-1">Notes</p>
                      <p className="text-sm text-neutral-900 dark:text-neutral-100">{grn.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Comments Section */}
            <Card className="p-5 shadow-lg">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <MessageSquare size={18} />
                Comments
              </h3>

              {/* Comments List */}
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm text-neutral-900 dark:text-neutral-100">{comment.user}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {comment.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">No comments yet</p>
                )}
              </div>

              {/* Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <Button
                  variant="primary"
                  onClick={handleAddComment}
                  size="sm"
                  className="px-3"
                >
                  <Send size={16} />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

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

      {showQCApprovalModal && (
        <QCApprovalModal
          grn={grn}
          onClose={() => setShowQCApprovalModal(false)}
          onSuccess={handleQCApprovalSuccess}
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
