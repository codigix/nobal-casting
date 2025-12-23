import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Eye } from 'lucide-react'

export default function ProductionPlanning() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [search, setSearch] = useState('')
  const [bomCache, setBomCache] = useState({})

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchBOMProductName = async (bomId) => {
    if (bomCache[bomId]) return bomCache[bomId]
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      const bomData = data.data || data
      let productName = ''
      
      if (bomData.product_name) {
        productName = bomData.product_name
      } else if (bomData.lines && bomData.lines.length > 0) {
        productName = bomData.lines[0].product_name || bomData.lines[0].item_name || ''
      } else if (bomData.bom_finished_goods && bomData.bom_finished_goods.length > 0) {
        productName = bomData.bom_finished_goods[0].product_name || bomData.bom_finished_goods[0].item_name || ''
      } else if (bomData.finished_goods && bomData.finished_goods.length > 0) {
        productName = bomData.finished_goods[0].product_name || bomData.finished_goods[0].item_name || ''
      } else if (bomData.item_code) {
        try {
          const itemRes = await fetch(`${import.meta.env.VITE_API_URL}/items/${bomData.item_code}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const itemData = await itemRes.json()
          const item = itemData.data || itemData
          productName = item.item_name || item.product_name || bomData.item_code
        } catch (itemErr) {
          productName = bomData.item_code
        }
      }
      
      if (!productName) productName = bomData.item_code || ''
      setBomCache(prev => ({ ...prev, [bomId]: productName }))
      return productName
    } catch (err) {
      console.error('Error fetching BOM:', bomId, err)
      return ''
    }
  }

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        const plansData = data.data || []
        
        const newBomCache = { ...bomCache }
        for (const plan of plansData) {
          if (plan.fg_items && plan.fg_items.length > 0) {
            const fgItem = plan.fg_items[0]
            const itemCode = fgItem.item_code || fgItem.item_name || ''
            const bomNo = fgItem.bom_no || plan.bom_id || ''
            const productName = bomNo && itemCode ? `${itemCode} - ${bomNo}` : (itemCode || bomNo || '')
            if (plan.bom_id) {
              newBomCache[plan.bom_id] = productName
            }
            
            if (plan.fg_items && plan.fg_items.length > 0) {
              for (let i = 0; i < plan.fg_items.length; i++) {
                if (!plan.fg_items[i].bom_no && plan.bom_id) {
                  plan.fg_items[i].bom_no = plan.bom_id
                }
              }
            }
          }
        }
        setBomCache(newBomCache)
        setPlans(plansData)
        setError(null)
      } else {
        setError('Failed to fetch production plans')
      }
    } catch (err) {
      setError('Error loading production plans')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this production plan?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setSuccess('Production plan deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchPlans()
      } else {
        setError('Failed to delete production plan')
      }
    } catch (err) {
      setError('Error deleting production plan')
      console.error(err)
    }
  }

  const handleEdit = (plan) => {
    navigate(`/manufacturing/production-planning/${plan.plan_id}`)
  }

  const filteredPlans = plans.filter(plan => 
    plan.plan_id.toLowerCase().includes(search.toLowerCase()) ||
    plan.company?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (status) => {
    const colors = {
      draft: 'text-yellow-600 bg-yellow-50',
      submitted: 'text-blue-600 bg-blue-50',
      completed: 'text-green-600 bg-green-50'
    }
    return colors[status] || 'text-gray-600 bg-gray-50'
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return '-'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100  px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                📊
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Production Planning</h1>
                <p className="text-xs text-gray-600 mt-0">Create and manage production plans</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => navigate('/manufacturing/production-planning/new')}
            className="btn-primary flex items-center gap-2 bg-gradient-to-br from-blue-400 to-blue-600 "
          >
            <Plus size={16} /> New Plan
          </button>
        </div>

        {success && (
          <div className="mb-2 p-2 pl-3 bg-green-50 border-l-4 border-green-400 rounded text-xs text-green-800 flex gap-2">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="mb-2 p-2 pl-3 bg-red-50 border-l-4 border-red-400 rounded text-xs text-red-800 flex gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
          <label className="text-xs font-semibold text-gray-700 block mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search plan ID or company..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-xs text-gray-600">Loading production plans...</div>
          </div>
        ) : filteredPlans.length > 0 ? (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Plan ID</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Company</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Posting Date</th>
                      <th className="px-3 py-2 text-left text-gray-700 font-semibold">Status</th>
                      <th className="px-3 py-2 text-center text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((plan, idx) => (
                      <tr key={plan.plan_id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-2">
                          <div className="text-left">
                            <div className="font-semibold text-gray-900">{plan.plan_id}</div>
                            {plan.bom_id && bomCache[plan.bom_id] && (
                              <div className="text-xs text-gray-600 mt-1">{bomCache[plan.bom_id]}</div>
                            )}
                            {plan.fg_items && plan.fg_items.length > 0 && !bomCache[plan.bom_id] && (
                              <div className="text-xs text-gray-600 mt-1">
                                {plan.fg_items.map((item, idx) => {
                                  const bomNo = item.bom_no || plan.bom_id || ''
                                  const displayText = bomNo && item.item_code ? `${item.item_code} - ${bomNo}` : (item.item_code || bomNo || '')
                                  return <div key={idx}>{displayText}</div>
                                })}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{plan.company || '-'}</td>
                        <td className="px-3 py-2 text-gray-700">{formatDate(plan.posting_date)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(plan.status)}`}>
                            {plan.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <button 
                              onClick={() => handleEdit(plan)}
                              title="Edit"
                              className="p-1 hover:bg-blue-50 rounded transition"
                            >
                              <Edit2 size={14} className="text-blue-600" />
                            </button>
                            <button 
                              onClick={() => handleDelete(plan.plan_id)}
                              title="Delete"
                              className="p-1 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 px-3 py-2 text-right text-xs text-gray-600">
              Showing {filteredPlans.length} of {plans.length} production plans
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg p-3 text-center shadow-sm">
            <div className="text-3xl mb-2">📭</div>
            <div className="text-xs font-semibold  text-gray-900">
              {search ? 'No production plans found' : 'No production plans created yet'}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {search 
                ? 'Try adjusting your search terms' 
                : 'Create your first production plan to get started'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
