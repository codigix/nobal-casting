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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="icon"
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white border border-gray-200 rounded-xs hover:bg-gray-50 transition-all"
            title="Go back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <span>Buying</span>
              <ChevronRight size={14} />
              <span>GRN Management</span>
              <ChevronRight size={14} />
              <span className="font-semibold text-gray-900">{grn.grn_no}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">GRN {grn.grn_no}</h1>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                  <span><span className="font-semibold">PO:</span> {grn.po_no}</span>
                  <span className="text-gray-300">•</span>
                  <span><span className="font-semibold">Supplier:</span> {grn.supplier_name}</span>
                </div>
              </div>
              <Badge color={getStatusColor(grn.status)} variant="solid" className="flex items-center gap-2 text-xs px-4 p-2 ">
                {getStatusIcon(grn.status)}
                {grn.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Workflow Progress - Timeline */}
            <div className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-2">
                <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                  <Truck size={18} className="text-blue-600" /> Workflow Progress
                </h3>
              </div>
              <div className="p-2">
                <div className="flex items-center justify-between gap-2">
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
                      <div key={step.status} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-semibold text-xs shadow-sm transition-all ${
                            isCompleted ? 'bg-green-500 text-white' :
                            isActive ? 'bg-blue-600 text-white scale-110 shadow-lg' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            <Icon size={10} />
                          </div>
                          <p className="text-xs mt-2.5 text-gray-700 text-center whitespace-nowrap">{step.label}</p>
                        </div>
                        {idx < 4 && (
                          <div className={`h-1 flex-1 mx-2 rounded-full transition-colors ${
                            isCompleted ? 'bg-green-500' :
                            isActive ? 'bg-blue-400' :
                            'bg-gray-200'
                          }`}></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Key Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-gray-200 rounded-xs p-2  hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Items</p>
                    <p className="text-xl font-bold text-gray-900">{grn.items?.length || 0}</p>
                  </div>
                  <Package size={32} className="text-blue-500 opacity-15" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xs p-2  hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Receipt Date</p>
                    <p className="text-lg font-bold text-gray-900">
                      {new Date(grn.receipt_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Clock size={32} className="text-amber-500 opacity-15" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xs p-2  hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned To</p>
                    <p className="text-lg font-bold text-gray-900">
                      {grn.assigned_user || '—'}
                    </p>
                  </div>
                  <User size={32} className="text-purple-500 opacity-15" />
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xs p-2  hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created By</p>
                    <p className="text-lg font-bold text-gray-900">
                      {grn.created_by_user || 'System'}
                    </p>
                  </div>
                  <FileCheck size={32} className="text-green-500 opacity-15" />
                </div>
              </div>
            </div>

            {/* Receipt Items Section */}
            <div className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Package size={18} className="text-blue-600" /> Receipt Items
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
                <div className="divide-y divide-gray-200">
                  {grn.items.map((item, idx) => {
                    const isExpanded = expandedItems[item.id]
                    return (
                      <div key={item.id}>
                        <div
                          onClick={() => toggleItemExpanded(item.id)}
                          className="p-4 cursor-pointer flex items-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                          <ChevronDown
                            size={20}
                            className={`text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                          <div className="flex-1 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 text-xs">{item.item_code}</p>
                              <p className="text-xs text-gray-600 truncate">{item.item_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-600 font-medium">PO Qty</p>
                              <p className="font-bold text-gray-900">{item.po_qty}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-600 font-medium">Received</p>
                              <p className="font-bold text-amber-600">{item.received_qty}</p>
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
                          <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              <div className="p-1 bg-white rounded-xs border border-gray-200">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Warehouse</p>
                                <p className="font-bold text-gray-900 text-xs">{item.warehouse_name}</p>
                              </div>
                              <div className="p-1 bg-white rounded-xs border border-gray-200">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Accepted</p>
                                <p className="font-bold text-green-600 text-xs">{item.accepted_qty || 0}</p>
                              </div>
                              <div className="p-1 bg-white rounded-xs border border-gray-200">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Rejected</p>
                                <p className="font-bold text-red-600 text-xs">{item.rejected_qty || 0}</p>
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
                <div className="p-12 text-center">
                  <Package size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No items in this GRN</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(grn.status === 'inspecting' || grn.status === 'awaiting_inventory_approval') && (
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xs border border-blue-200 shadow-sm p-5">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <AlertCircle size={18} className="text-blue-600" />
                  Required Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {grn.status === 'inspecting' && (
                    <>
                      <Button
                        variant="success"
                        onClick={handleQCApproval}
                        className="flex items-center justify-center gap-2 py-3 text-xs font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <CheckCircle size={18} />
                        QC Approval
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setShowApprovalModal(true)}
                        className="flex items-center justify-center gap-2 py-3 text-xs font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
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
                        className="flex items-center justify-center gap-2 py-3 text-xs font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <Home size={18} />
                        Approve & Store
                      </Button>
                      <Button
                        variant="warning"
                        onClick={() => setShowApprovalModal(true)}
                        className="flex items-center justify-center gap-2 py-3 text-xs font-semibold h-auto shadow-lg hover:shadow-xl transition-all"
                      >
                        <ArrowLeft size={18} />
                        Send Back to QC
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            {grn.logs && grn.logs.length > 0 && (
              <div className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 p-4">
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-amber-600" />
                    Activity History
                  </h2>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    {grn.logs.map((log, idx) => (
                      <div key={log.id} className="flex gap-4">
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                          {idx < grn.logs.length - 1 && (
                            <div className="w-0.5 h-8 bg-blue-200"></div>
                          )}
                        </div>
                        <div className="pb-3 flex-1">
                          <p className="font-bold text-gray-900 text-xs">{log.action}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge color="info" variant="solid" className="text-xs">
                              {log.status_from}
                            </Badge>
                            <span className="text-gray-400">→</span>
                            <Badge color="success" variant="solid" className="text-xs">
                              {log.status_to}
                            </Badge>
                          </div>
                          {log.reason && (
                            <p className="text-xs text-gray-600 mt-2 italic">{log.reason}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Side Panel */}
          <div className="space-y-6">
            {/* GRN Details Card */}
            {(grn.approved_by_user || grn.notes) && (
              <div className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 p-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <AlertCircle size={18} className="text-green-600" />
                    Details
                  </h3>
                </div>
                <div className="p-2 space-y-3">
                  {grn.approved_by_user && (
                    <div className="p-3 rounded-xs bg-green-50 border border-green-200">
                      <p className="text-xs font-medium text-gray-600 uppercase mb-1">Approved By</p>
                      <p className="font-semibold text-green-900">{grn.approved_by_user}</p>
                    </div>
                  )}
                  {grn.notes && (
                    <div className="p-3 rounded-xs bg-blue-50 border border-blue-200">
                      <p className="text-xs font-medium text-gray-600 uppercase mb-1">Notes</p>
                      <p className="text-xs text-gray-900">{grn.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-white rounded-xs border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200 p-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-600" />
                  Comments
                </h3>
              </div>
              <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                {comments.length > 0 ? (
                  comments.map(comment => (
                    <div key={comment.id} className="p-3 bg-gray-50 rounded-xs border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-medium text-gray-900">{comment.user}</p>
                        <p className="text-xs text-gray-500">
                          {comment.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-gray-700">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-6">No comments yet</p>
                )}
              </div>

              {/* Comment Input */}
              <div className="flex gap-2 border-t border-gray-200 p-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-xs rounded-xs border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
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
            </div>
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
