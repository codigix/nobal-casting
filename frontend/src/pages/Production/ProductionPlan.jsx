import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'
import * as productionService from '../../services/productionService'
import ViewProductionPlanModal from '../../components/Production/ViewProductionPlanModal'

export default function ProductionPlan() {
  const navigate = useNavigate()
  const location = useLocation()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(location.state?.success || null)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })
  const [viewingPlanId, setViewingPlanId] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  useEffect(() => {
    fetchPlans()
  }, [filters])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const response = await productionService.getProductionPlans(filters)
      setPlans(response.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch production plans')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleDelete = async (plan_id) => {
    if (window.confirm('Delete this production plan?')) {
      try {
        await productionService.deleteProductionPlan(plan_id)
        setSuccess('Plan deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchPlans()
      } catch (err) {
        setError(err.message || 'Failed to delete plan')
      }
    }
  }

  const handleEdit = (plan) => {
    navigate(`/manufacturing/production-plan/${plan.plan_id}`)
  }

  const handleViewPlan = (plan) => {
    setViewingPlanId(plan.plan_id)
    setShowViewModal(true)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
      planned: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      'in-progress': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    }
    const config = statusConfig[status] || statusConfig.draft
    return config
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className=" mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                📅
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Production Plans</h1>
                <p className="text-xs text-gray-600 mt-0">Schedule and track production</p>
              </div>
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-2 mb-2 flex items-start gap-2">
            <div className="text-green-600 mt-0.5">✓</div>
            <div>
              <p className="font-semibold text-green-800 text-xs">Success</p>
              <p className="text-green-700 text-xs mt-0">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-2 mb-2 flex items-start gap-2">
            <div className="text-red-600 mt-0.5">✕</div>
            <div>
              <p className="font-semibold text-red-800 text-xs">Error</p>
              <p className="text-red-700 text-xs mt-0">{error}</p>
            </div>
          </div>
        )}

        <ViewProductionPlanModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false)
            setViewingPlanId(null)
          }}
          planId={viewingPlanId}
        />

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-600 mb-1">Status</label>
              <select 
                name="status" 
                value={filters.status} 
                onChange={handleFilterChange}
                className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-600 mb-1">Search</label>
              <input 
                type="text" 
                name="search" 
                placeholder="Plan ID or product..." 
                value={filters.search} 
                onChange={handleFilterChange}
                className="p-2 border border-gray-200 rounded text-xs font-inherit transition-all hover:border-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-gray-600 text-xs">Loading production plans...</p>
          </div>
        ) : plans.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 w-10">
                      <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Plan ID</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Company</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">Updated</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan, index) => {
                    const statusConfig = getStatusBadge(plan.status)
                    const isSelected = selectedIds.has(plan.plan_id)
                    return (
                      <tr key={plan.plan_id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                        <td className="px-3 py-2 text-center">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedIds)
                              if (e.target.checked) {
                                newSet.add(plan.plan_id)
                              } else {
                                newSet.delete(plan.plan_id)
                              }
                              setSelectedIds(newSet)
                            }}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold text-gray-900">{plan.plan_id}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                            {plan.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-700">{plan.company || 'N/A'}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {plan.updated_at ? new Date(plan.updated_at).toLocaleDateString() : new Date(plan.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button 
                              onClick={() => handleViewPlan(plan)} 
                              title="View"
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => handleEdit(plan)} 
                              title="Edit"
                              className="p-1.5 text-amber-600 hover:bg-amber-100 rounded transition"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDelete(plan.plan_id)} 
                              title="Delete"
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 text-center">
            <p className="text-gray-600 text-xs">No production plans found</p>
          </div>
        )}
      </div>
    </div>
  )
}
