import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import * as productionService from '../../services/productionService'
import CreateJobCardModal from '../../components/Production/CreateJobCardModal'
import ViewJobCardModal from '../../components/Production/ViewJobCardModal'
import SearchableSelect from '../../components/SearchableSelect'
import { useToast } from '../../components/ToastContainer'
import './Production.css'

export default function JobCard() {
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

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    fetchWorkOrders()
  }, [filters])

  const fetchData = async () => {
    try {
      const [wsRes, empRes] = await Promise.all([
        productionService.getWorkstationsList(),
        productionService.getEmployees()
      ])
      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations/operators:', err)
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
      setJobCardsByWO(prev => ({
        ...prev,
        [wo_id]: response.data || []
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

  const handleEdit = (card) => {
    setEditingId(card.job_card_id)
    setShowModal(true)
  }

  const handleInlineEdit = (card) => {
    setInlineEditingId(card.job_card_id)
    setInlineEditData({
      operation: card.operation || '',
      planned_quantity: card.planned_quantity || 0,
      produced_quantity: card.produced_quantity || 0,
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
    const previousProduced = previousCard?.produced_quantity || 0
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

    const plannedTotal = workOrder.quantity || workOrder.qty_to_manufacture || 0
    
    const alreadyProduced = jobCards.reduce((sum, card) => {
      if (card.job_card_id === jobCardId) {
        return sum
      }
      return sum + (card.produced_quantity || 0)
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

      await productionService.updateJobCard(jobCardId, inlineEditData)
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

  const getMaxPlannableQty = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const currentCardIndex = jobCards.findIndex(c => c.job_card_id === jobCardId)

    if (currentCardIndex === 0) return Infinity

    const previousCard = jobCards[currentCardIndex - 1]
    return previousCard?.produced_quantity || 0
  }

  const getMaxProducibleQty = (jobCardId, woId) => {
    const jobCards = jobCardsByWO[woId] || []
    const workOrder = workOrders.find(wo => wo.wo_id === woId)
    if (!workOrder) return 0

    const plannedTotal = workOrder.quantity || workOrder.qty_to_manufacture || 0
    const alreadyProduced = jobCards.reduce((sum, card) => {
      if (card.job_card_id === jobCardId) return sum
      return sum + (card.produced_quantity || 0)
    }, 0)

    return plannedTotal - alreadyProduced
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>🎫 Job Cards</h1>
          <p className="text-gray-600 mt-1">View work orders and their job cards</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null)
            setShowModal(true)
          }}
          className="btn-submit w-auto flex items-center gap-2"
        >
          <Plus size={18} /> New Job Card
        </button>
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

      <div className="filter-section">
        <div className="filter-group">
          <label>Status</label>
          <select name="status" value={filters.status} onChange={handleFilterChange}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Search</label>
          <input type="text" name="search" placeholder="Search work order..." value={filters.search} onChange={handleFilterChange} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading work orders...</div>
      ) : workOrders.length > 0 ? (
        <div className="production-entries-container">
          <table className="entries-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>WO ID</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th className="w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map(wo => (
                <React.Fragment key={wo.wo_id}>
                  <tr className="work-order-row" onClick={() => fetchJobCardsForWO(wo.wo_id)}>
                    <td className="w-10 cursor-pointer text-center">
                      {expandedWO === wo.wo_id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </td>
                    <td><strong>{wo.wo_id}</strong></td>
                    <td>{wo.item_name || wo.item_code || 'N/A'}</td>
                    <td>{wo.quantity || wo.qty_to_manufacture || 0}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        wo.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        wo.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {wo.priority || 'N/A'}
                      </span>
                    </td>
                    <td><span className={`work-order-status ${getStatusColor(wo.status)}`}>{wo.status}</span></td>
                    <td>{wo.required_date ? new Date(wo.required_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="w-28">
                      <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-view" title="View"><Eye size={16} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedWO === wo.wo_id && jobCardsByWO[wo.wo_id] && jobCardsByWO[wo.wo_id].length > 0 && (
                    <>
                      <tr className="job-card-header bg-gray-100 border-t-2 border-gray-300">
                        <td colSpan="2" className="font-semibold text-xs text-gray-600 border-b border-gray-300">Job Card ID</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Workstation</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Operation</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Assignee</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Planned Qty</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Produced Qty</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Status</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">Start Date</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300">End Date</td>
                        <td className="font-semibold text-xs text-gray-600 border-b border-gray-300 w-32">Actions</td>
                      </tr>
                      {jobCardsByWO[wo.wo_id].map((card, idx) => (
                        inlineEditingId === card.job_card_id ? (
                          <tr key={card.job_card_id} className={`job-card-row ${idx === 0 ? 'first-card' : ''} bg-yellow-50`}>
                            <td colSpan="2">
                              <strong className="text-gray-600">{card.job_card_id}</strong>
                            </td>
                            <td>
                              <SearchableSelect
                                value={inlineEditData.machine_id}
                                onChange={(val) => handleInlineInputChange('machine_id', val)}
                                options={getWorkstationOptions()}
                                placeholder="Select Workstation"
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                value={inlineEditData.operation} 
                                onChange={(e) => handleInlineInputChange('operation', e.target.value)} 
                                placeholder="Operation Name"
                                className="w-full px-1.5 py-1.5 text-xs border border-gray-300 rounded" 
                              />
                            </td>
                            <td>
                              <SearchableSelect
                                value={inlineEditData.operator_id}
                                onChange={(val) => handleInlineInputChange('operator_id', val)}
                                options={getOperatorOptions()}
                                placeholder="Select Operator"
                              />
                            </td>
                            <td>
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
                                      className="w-full px-1.5 py-1.5 text-xs border border-gray-300 rounded" 
                                    />
                                    {isValidPlannableNumber && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Max: {maxPlannableQty.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </td>
                            <td>
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
                                      className="w-full px-1.5 py-1.5 text-xs border border-gray-300 rounded"
                                    />
                                    {isValidProducibleNumber && (
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Max: {maxProducibleQty.toFixed(2)}
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </td>
                            <td>
                              <select value={inlineEditData.status} onChange={(e) => handleInlineInputChange('status', e.target.value)} className="w-full px-1.5 py-1.5 text-xs border border-gray-300 rounded">
                                <option value="draft">Draft</option>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td>
                              <input type="date" value={inlineEditData.scheduled_start_date} onChange={(e) => handleInlineInputChange('scheduled_start_date', e.target.value)} className="w-full px-1.5 py-1.5 text-xs border border-gray-300 rounded" />
                            </td>
                            <td>
                              <input type="date" value={inlineEditData.scheduled_end_date} onChange={(e) => handleInlineInputChange('scheduled_end_date', e.target.value)} className="w-full px-1.5 py-1.5 text-xs border border-gray-300 rounded" />
                            </td>
                            <td>
                              <div className="entry-actions flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button className="btn-submit px-2.5 py-1.5 text-xs bg-emerald-500 text-white border-none rounded cursor-pointer hover:bg-emerald-600 transition" title="Save" onClick={() => handleInlineSave(card.job_card_id)}>✓</button>
                                <button className="btn-cancel px-2.5 py-1.5 text-xs bg-red-500 text-white border-none rounded cursor-pointer hover:bg-red-600 transition" title="Cancel" onClick={handleInlineCancel}>✕</button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          <tr key={card.job_card_id} className={`job-card-row ${idx === 0 ? 'first-card' : ''}`}>
                            <td colSpan="2">
                              <strong className="text-gray-600">{card.job_card_id}</strong>
                            </td>
                            <td>{getWorkstationName(card.machine_id)}</td>
                            <td>{card.operation || 'N/A'}</td>
                            <td>{getOperatorName(card.operator_id)}</td>
                            <td>{formatQuantity(card.planned_quantity)}</td>
                            <td>{formatQuantity(card.produced_quantity)}</td>
                            <td><span className={`work-order-status ${getStatusColor(card.status)}`}>{card.status}</span></td>
                            <td>{card.scheduled_start_date ? new Date(card.scheduled_start_date).toLocaleDateString() : 'N/A'}</td>
                            <td>{card.scheduled_end_date ? new Date(card.scheduled_end_date).toLocaleDateString() : 'N/A'}</td>
                            <td>
                              <div className="entry-actions flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <button className="btn-view" title="View" onClick={() => handleViewJobCard(card.job_card_id)}><Eye size={16} /></button>
                                <button className="btn-edit" title="Edit Inline" onClick={() => handleInlineEdit(card)}><Edit2 size={16} /></button>
                                <button className="btn-delete" title="Delete" onClick={() => handleDelete(card.job_card_id)}><Trash2 size={16} /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </>
                  )}
                  {expandedWO === wo.wo_id && jobCardsByWO[wo.wo_id] && jobCardsByWO[wo.wo_id].length === 0 && (
                    <tr className="job-card-empty-row">
                      <td colSpan="10" className="text-center">
                        No job cards for this work order
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded">No work orders found</div>
      )}
    </div>
  )
}
