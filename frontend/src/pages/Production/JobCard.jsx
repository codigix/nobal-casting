import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, CheckCircle, ChevronDown, ChevronRight, AlertCircle, Zap, Trash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as productionService from '../../services/productionService'
import CreateJobCardModal from '../../components/Production/CreateJobCardModal'
import ViewJobCardModal from '../../components/Production/ViewJobCardModal'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../components/ToastContainer'

export default function JobCard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [workOrders, setWorkOrders] = useState([])
  const [jobCardsByWO, setJobCardsByWO] = useState({})
  const [expandedWO, setExpandedWO] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [viewingJobCardId, setViewingJobCardId] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [inlineEditingId, setInlineEditingId] = useState(null)
  const [inlineEditData, setInlineEditData] = useState({})
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchWorkOrders()
  }, [filters])

  const fetchData = async () => {
    try {
      const [wsRes, empRes, opsRes] = await Promise.all([
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList()
      ])
      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
      setOperations(opsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations/operators/operations:', err)
    }
  }

  const fetchWorkOrders = async () => {
    try {
      setLoading(true)
      const response = await productionService.getWorkOrders(filters)
      setWorkOrders(response.data || [])
      setJobCardsByWO({})
      setExpandedWO(null)
    } catch (err) {
      toast.addToast(err.message || 'Failed to fetch work orders', 'error')
      setWorkOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchJobCardsForWO = async (wo_id) => {
    try {
      if (jobCardsByWO[wo_id]) {
        setExpandedWO(expandedWO === wo_id ? null : wo_id)
        return
      }
      
      const response = await productionService.getJobCards({ work_order_id: wo_id })
      const jobCards = response.data || []
      
      setJobCardsByWO(prev => ({
        ...prev,
        [wo_id]: jobCards
      }))
      setExpandedWO(wo_id)
    } catch (err) {
      toast.addToast(err.message || 'Failed to fetch job cards', 'error')
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (job_card_id) => {
    if (window.confirm('Delete this job card?')) {
      try {
        await productionService.deleteJobCard(job_card_id)
        toast.addToast('Job card deleted successfully', 'success')
        fetchWorkOrders()
      } catch (err) {
        toast.addToast(err.message || 'Failed to delete job card', 'error')
      }
    }
  }

  const handleTruncate = async () => {
    if (!window.confirm('⚠️ Warning: This will permanently delete ALL job cards. Are you sure?')) return
    try {
      setLoading(true)
      await productionService.truncateJobCards()
      toast.addToast('All job cards truncated successfully', 'success')
      fetchWorkOrders()
    } catch (err) {
      toast.addToast(err.message || 'Failed to truncate job cards', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (card) => {
    setEditingId(card.job_card_id)
    setShowModal(true)
  }



  const handleInlineEdit = (card) => {
    setInlineEditingId(card.job_card_id)
    setInlineEditData({
      operation: card.operation || '',
      planned_quantity: parseFloat(card.planned_quantity) || 0,
      produced_quantity: parseFloat(card.produced_quantity) || 0,
      machine_id: card.machine_id || '',
      operator_id: card.operator_id || '',
      status: card.status || 'draft',
      scheduled_start_date: card.scheduled_start_date ? card.scheduled_start_date.split('T')[0] : '',
      scheduled_end_date: card.scheduled_end_date ? card.scheduled_end_date.split('T')[0] : ''
    })
  }

  const handleInlineInputChange = (field, value) => {
    setInlineEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validatePlannedQuantity = (jobCardId, woId, newPlannedQty) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { valid: true }

    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)
    if (currentCardIndex === 0) return { valid: true }

    const previousCard = jobCards[currentCardIndex - 1]
    const previousProduced = parseFloat(previousCard?.produced_quantity) || 0
    const newPlanned = parseFloat(newPlannedQty) || 0

    if (newPlanned > previousProduced) {
      return {
        valid: false,
        message: `Planned quantity cannot exceed previous task's production. Previous task produced: ${previousProduced.toFixed(2)}, but you set: ${newPlanned.toFixed(2)}`
      }
    }

    return { valid: true }
  }

  const validateProducedQuantity = (jobCardId, woId, newProducedQty) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    if (!currentCard) return { valid: true }

    const workOrder = workOrders.find(wo => wo.wo_id === woId)
    if (!workOrder) return { valid: true }

    const plannedTotal = parseFloat(workOrder.quantity || workOrder.qty_to_manufacture || 0)
    
    const alreadyProduced = jobCards.reduce((sum, card) => {
      if (card.job_card_id === jobCardId) {
        return sum
      }
      return sum + (parseFloat(card.produced_quantity) || 0)
    }, 0)

    const availableProduction = plannedTotal - alreadyProduced
    const newProduced = parseFloat(newProducedQty) || 0

    if (newProduced > availableProduction) {
      return {
        valid: false,
        message: `Cannot produce ${newProduced}. Only ${availableProduction} units remaining. (Total Planned: ${plannedTotal}, Already Produced: ${alreadyProduced})`
      }
    }

    return { valid: true }
  }

  const handleInlineSave = async (jobCardId) => {
    try {
      const currentWO = Array.from(Object.entries(jobCardsByWO)).find(([woId, cards]) => 
        cards.some(c => c.job_card_id === jobCardId)
      )
      
      if (currentWO) {
        const plannedValidation = validatePlannedQuantity(jobCardId, currentWO[0], inlineEditData.planned_quantity)
        if (!plannedValidation.valid) {
          toast.addToast(plannedValidation.message, 'error')
          return
        }

        const producedValidation = validateProducedQuantity(jobCardId, currentWO[0], inlineEditData.produced_quantity)
        if (!producedValidation.valid) {
          toast.addToast(producedValidation.message, 'error')
          return
        }
      }

      const currentCard = jobCardsByWO[currentWO?.[0]]?.find(c => c.job_card_id === jobCardId)
      const statusChanged = currentCard && (currentCard.status !== inlineEditData.status)

      const updateData = { ...inlineEditData }
      if (!statusChanged) {
        delete updateData.status
      }

      await productionService.updateJobCard(jobCardId, updateData)
      
      if (statusChanged) {
        await productionService.updateJobCardStatus(jobCardId, inlineEditData.status)
      }
      
      toast.addToast('Job card updated successfully', 'success')
      setInlineEditingId(null)
      setInlineEditData({})
      fetchWorkOrders()
    } catch (err) {
      toast.addToast(err.message || 'Failed to update job card', 'error')
    }
  }

  const handleInlineCancel = () => {
    setInlineEditingId(null)
    setInlineEditData({})
  }

  const handleViewJobCard = (jobCardId) => {
    setViewingJobCardId(jobCardId)
    setShowViewModal(true)
  }

  const getOperatorName = (operatorId) => {
    const operator = operators.find(op => op.employee_id === operatorId)
    return operator ? `${operator.first_name} ${operator.last_name}` : 'Unassigned'
  }

  const getWorkstationName = (wsId) => {
    const ws = workstations.find(w => w.name === wsId)
    return ws ? (ws.workstation_name || ws.name) : 'N/A'
  }

  const canStartJobCard = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCard = jobCards.find(c => c.job_card_id === jobCardId)
    
    if (!currentCard || (currentCard.status || '').toLowerCase() !== 'draft') {
      return { canStart: false, reason: 'Only draft job cards can be started' }
    }

    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)
    
    if (currentCardIndex === 0) {
      return { canStart: true }
    }

    const previousCard = jobCards[currentCardIndex - 1]
    const prevStatus = (previousCard.status || '').toLowerCase()
    
    if (prevStatus !== 'completed') {
      return { 
        canStart: false, 
        reason: `Previous operation must be completed first. Current status: ${prevStatus.toUpperCase()}` 
      }
    }

    return { canStart: true }
  }

  const handleStartJobCard = async (jobCardId, woId) => {
    try {
      const { canStart, reason } = canStartJobCard(jobCardId, woId)
      
      if (!canStart) {
        toast.addToast(reason, 'error')
        return
      }

      setLoading(true)
      
      await productionService.updateJobCard(jobCardId, { status: 'in-progress' })
      
      await new Promise(resolve => setTimeout(resolve, 300))
      
      try {
        const jobCardsResponse = await productionService.getJobCards({ work_order_id: woId })
        setJobCardsByWO(prev => ({
          ...prev,
          [woId]: jobCardsResponse.data || []
        }))
      } catch (err) {
        console.error('Failed to refresh job cards:', err)
      }
      
      await fetchWorkOrders()
      
      toast.addToast('Job card started. Redirecting to production entry...', 'success')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate(`/manufacturing/job-cards/${jobCardId}/production-entry`)
    } catch (err) {
      toast.addToast(err.message || 'Failed to start job card', 'error')
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'status-draft',
      pending: 'status-planned',
      'in-progress': 'status-in-progress',
      completed: 'status-completed',
      cancelled: 'status-cancelled',
      'quality-check': 'status-planned',
      delivered: 'status-completed',
      open: 'status-in-progress'
    }
    return colors[status] || 'status-draft'
  }

  const formatQuantity = (qty) => {
    return typeof qty === 'number' ? qty.toFixed(2) : parseFloat(qty || 0).toFixed(2)
  }

  const getWorkstationOptions = () => {
    return workstations.map(ws => ({
      value: ws.name,
      label: ws.workstation_name || ws.name
    }))
  }

  const getOperatorOptions = () => {
    return operators.map(op => ({
      value: op.employee_id,
      label: `${op.first_name} ${op.last_name}`
    }))
  }

  const getOperationOptions = () => {
    return operations.map(op => ({
      value: op.name || op.operation_name,
      label: op.operation_name || op.name
    }))
  }

  const getStatusWorkflow = () => {
    return {
      'draft': ['in-progress', 'hold', 'completed'],
      'in-progress': ['completed', 'hold'],
      'hold': ['in-progress', 'completed'],
      'completed': ['completed'],
      'open': ['in-progress', 'hold', 'completed'],
      'pending': ['in-progress', 'hold', 'completed'],
      'cancelled': ['cancelled']
    }
  }

  const getAllowedStatuses = (currentStatus) => {
    const workflow = getStatusWorkflow()
    return workflow[(currentStatus || '').toLowerCase()] || []
  }

  const getMaxPlannableQty = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)

    if (currentCardIndex === 0) return Infinity

    const previousCard = jobCards[currentCardIndex - 1]
    return parseFloat(previousCard?.produced_quantity) || 0
  }

  const getMaxProducibleQty = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const workOrder = workOrders.find(wo => wo.wo_id === woId)
    if (!workOrder) return 0

    const plannedTotal = parseFloat(workOrder.quantity || workOrder.qty_to_manufacture || 0)
    const alreadyProduced = jobCards.reduce((sum, card) => {
      if (card.job_card_id === jobCardId) return sum
      return sum + (parseFloat(card.produced_quantity) || 0)
    }, 0)

    return plannedTotal - alreadyProduced
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                🎫
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Job Cards</h1>
                <p className="text-xs text-gray-600 mt-0">View and manage job cards</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setEditingId(null)
                setShowModal(true)
              }}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-purple-400 to-purple-600"
            >
              <Plus size={16} /> New Job Card
            </button>
            <button 
              onClick={handleTruncate}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-red-400 to-red-600"
              title="Delete all job cards"
            >
              <Trash size={16} /> Truncate All
            </button>
          </div>
        </div>

        <CreateJobCardModal 
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditingId(null)
          }}
          onSuccess={fetchWorkOrders}
          editingId={editingId}
        />

        <ViewJobCardModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false)
            setViewingJobCardId(null)
          }}
          onSuccess={fetchWorkOrders}
          jobCardId={viewingJobCardId}
        />

        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
              <select 
                name="status" 
                value={filters.status} 
                onChange={handleFilterChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Search</label>
              <input 
                type="text" 
                name="search" 
                placeholder="Work order ID..." 
                value={filters.search} 
                onChange={handleFilterChange}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading work orders...</div>
          </div>
        ) : workOrders.length > 0 ? (
          <div className="space-y-2">
            {workOrders.map(wo => (
              <div key={wo.wo_id} className="bg-white rounded-lg shadow-sm">
                <div 
                  className="border-l-4 border-purple-400 bg-gray-50 hover:bg-gray-100 transition p-3 flex items-center gap-2"
                >
                  <div 
                    className="w-5 flex items-center justify-center text-gray-600 cursor-pointer"
                    onClick={() => fetchJobCardsForWO(wo.wo_id)}
                  >
                    {expandedWO === wo.wo_id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  <div className="flex-1 grid grid-cols-6 gap-3 items-center text-xs cursor-pointer" onClick={() => fetchJobCardsForWO(wo.wo_id)}>
                    <div>
                      <div className="text-gray-500 text-xs">WO ID</div>
                      <div className="font-semibold text-gray-900">{wo.wo_id}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Item</div>
                      <div className="text-gray-700">{wo.item_name || wo.item_code || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Qty</div>
                      <div className="font-semibold text-gray-900">{wo.quantity || wo.qty_to_manufacture || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Priority</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        wo.priority === 'high' ? 'bg-red-100 text-red-800' : 
                        wo.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {wo.priority || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Status</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${
                        wo.status === 'draft' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                        wo.status === 'planned' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        wo.status === 'in-progress' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        wo.status === 'completed' ? 'bg-green-100 text-green-800 border-green-300' :
                        'bg-red-100 text-red-800 border-red-300'
                      }`}>{wo.status}</span>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs">Due Date</div>
                      <div className="text-gray-700">{wo.planned_end_date ? new Date(wo.planned_end_date).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                </div>
                {expandedWO === wo.wo_id && (
                  <>
                    {jobCardsByWO[wo.wo_id] && jobCardsByWO[wo.wo_id].length > 0 ? (
                      <div className="">
                        <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">ID</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Work Order</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Item</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Qty To Manuf</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Operation</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Workstation</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Status</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobCardsByWO[wo.wo_id].map((card, idx) => (
                          inlineEditingId === card.job_card_id ? (
                            <tr key={card.job_card_id} className="bg-yellow-50 border border-yellow-200">
                              <td colSpan="8" className="px-3 py-3">
                                <div className="text-xs font-semibold text-gray-700 mb-2">Editing: {card.job_card_id}</div>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Operation</label>
                                    <SearchableSelect
                                      value={inlineEditData.operation}
                                      onChange={(val) => handleInlineInputChange('operation', val)}
                                      options={getOperationOptions()}
                                      placeholder="Select Operation"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Workstation</label>
                                    <SearchableSelect
                                      value={inlineEditData.machine_id}
                                      onChange={(val) => handleInlineInputChange('machine_id', val)}
                                      options={getWorkstationOptions()}
                                      placeholder="Select Workstation"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Status</label>
                                    <select value={inlineEditData.status} onChange={(e) => handleInlineInputChange('status', e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500">
                                      {(() => {
                                        const currentStatus = (inlineEditData.status || 'draft').toLowerCase()
                                        const allowedStatuses = getAllowedStatuses(currentStatus)
                                        const statusLabels = {
                                          'draft': 'Draft',
                                          'pending': 'Pending',
                                          'in-progress': 'In Progress',
                                          'hold': 'Hold',
                                          'completed': 'Completed',
                                          'cancelled': 'Cancelled',
                                          'open': 'Open'
                                        }
                                        const optionsToShow = [currentStatus, ...allowedStatuses].filter((status, idx, arr) => arr.indexOf(status) === idx)
                                        return optionsToShow.map(status => (
                                          <option key={status} value={status}>{statusLabels[status] || status}</option>
                                        ))
                                      })()}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Operator</label>
                                    <SearchableSelect
                                      value={inlineEditData.operator_id}
                                      onChange={(val) => handleInlineInputChange('operator_id', val)}
                                      options={getOperatorOptions()}
                                      placeholder="Select Operator"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Planned Qty</label>
                                    {(() => {
                                      const maxPlannableQty = getMaxPlannableQty(card.job_card_id, wo.wo_id)
                                      const isFirstTask = maxPlannableQty === Infinity
                                      const isValidPlannableNumber = typeof maxPlannableQty === 'number' && isFinite(maxPlannableQty)
                                      return (
                                        <div>
                                          <input 
                                            type="number" 
                                            value={inlineEditData.planned_quantity} 
                                            onChange={(e) => handleInlineInputChange('planned_quantity', e.target.value)} 
                                            step="0.01" 
                                            max={isFirstTask ? undefined : maxPlannableQty}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                          />
                                          {isValidPlannableNumber && (
                                            <div className="text-xs text-gray-500 mt-0.5">Max: {maxPlannableQty.toFixed(2)}</div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Produced Qty</label>
                                    {(() => {
                                      const maxProducibleQty = getMaxProducibleQty(card.job_card_id, wo.wo_id)
                                      const isValidProducibleNumber = typeof maxProducibleQty === 'number' && isFinite(maxProducibleQty)
                                      return (
                                        <div>
                                          <input 
                                            type="number" 
                                            value={inlineEditData.produced_quantity} 
                                            onChange={(e) => handleInlineInputChange('produced_quantity', e.target.value)} 
                                            step="0.01" 
                                            max={isValidProducibleNumber ? maxProducibleQty : undefined}
                                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                                          />
                                          {isValidProducibleNumber && (
                                            <div className="text-xs text-gray-500 mt-0.5">Max: {maxProducibleQty.toFixed(2)}</div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">Start Date</label>
                                    <input type="date" value={inlineEditData.scheduled_start_date} onChange={(e) => handleInlineInputChange('scheduled_start_date', e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-600 block mb-1">End Date</label>
                                    <input type="date" value={inlineEditData.scheduled_end_date} onChange={(e) => handleInlineInputChange('scheduled_end_date', e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                  </div>
                                </div>
                                <div className="flex gap-2 justify-end pt-3 mt-3 border-t border-yellow-200">
                                  <button className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition" title="Save" onClick={() => handleInlineSave(card.job_card_id)}>Save</button>
                                  <button className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition" title="Cancel" onClick={handleInlineCancel}>Cancel</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={card.job_card_id} className={`border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                              <td className="px-3 py-2 text-gray-900 font-medium">{card.job_card_id}</td>
                                <td className="px-3 py-2 text-gray-900">{wo.wo_id}</td>
                                <td className="px-3 py-2 text-gray-900">{wo.item_name || wo.item_code || 'N/A'}</td>
                                <td className="px-3 py-2 text-right text-gray-900 font-medium">{formatQuantity(card.planned_quantity)}</td>
                              <td className="px-3 py-2 text-gray-900 font-medium">{card.operation || 'N/A'}</td>
                                <td className="px-3 py-2 text-gray-900">{getWorkstationName(card.machine_id)}</td>

                              <td className="px-3 py-2">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  card.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  card.status === 'in-progress' ? 'bg-orange-100 text-orange-800' :
                                  card.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                                  card.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {card.status || 'Draft'}
                                </span>
                              </td>
                              
                            
                              
                              <td className="px-3 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {(card.status || '').toLowerCase() === 'draft' ? (
                                    <button 
                                      className="px-2 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded transition font-medium"
                                      title="Start this job card"
                                      onClick={() => handleStartJobCard(card.job_card_id, wo.wo_id)}
                                      disabled={loading}
                                    >
                                      Start
                                    </button>
                                  ) : (
                                    <>
                                      <button className="p-1 hover:bg-blue-50 rounded transition" title="View" onClick={() => handleViewJobCard(card.job_card_id)}>
                                        <Eye size={14} className="text-blue-600" />
                                      </button>
                                      {(card.status || '').toLowerCase() === 'in-progress' && (
                                        <button className="p-1 hover:bg-green-50 rounded transition" title="Production Entry" onClick={() => {
                                          navigate(`/manufacturing/job-cards/${card.job_card_id}/production-entry`)
                                        }}>
                                          <Zap size={14} className="text-green-600" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                  <button className="p-1 hover:bg-gray-50 rounded transition" title="Edit" onClick={() => handleInlineEdit(card)}>
                                    <Edit2 size={14} className="text-gray-600" />
                                  </button>
                                  <button className="p-1 hover:bg-red-50 rounded transition" title="Delete" onClick={() => handleDelete(card.job_card_id)}>
                                    <Trash2 size={14} className="text-red-600" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border-t border-blue-200 px-3 py-3 text-xs text-blue-700">
                        <p>No job cards found. Job cards are created automatically when the work order is saved.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📋</div>
            <div className="text-xs text-gray-600">No work orders found. Job cards will be auto-created when you expand a work order.</div>
          </div>
        )}
      </div>
    </div>
  )
}
