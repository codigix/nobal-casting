import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { 
  Save, X, Plus, Trash2, AlertCircle, CheckCircle2, 
  Settings, Monitor, Clock, FileText, Layout,
  ArrowLeft, Info, Gauge, ClipboardCheck, Zap
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

export default function OperationFormRedesign() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const toast = useToast()
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!id)
  const [workstations, setWorkstations] = useState([])
  const [workstationDropdownOpen, setWorkstationDropdownOpen] = useState(false)
  const [workstationSearch, setWorkstationSearch] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    operation_name: '',
    is_corrective_operation: false,
    default_workstation: '',
    create_job_card_based_on_batch_size: false,
    batch_size: 1,
    quality_inspection_template: '',
    description: '',
    operation_type: 'IN_HOUSE',
    hourly_rate: 0
  })

  const [subOperations, setSubOperations] = useState([
    { _key: `row_${Date.now()}`, no: 1, operation: '', operation_time: 0 }
  ])

  useEffect(() => {
    fetchWorkstations()
    if (id) {
      if (location.state?.operation) {
        loadOperationData(location.state.operation)
        setInitialLoading(false)
      } else {
        fetchOperationDetails(id)
      }
    }
  }, [id])

  useEffect(() => {
    const handleClickOutside = () => setWorkstationDropdownOpen(false)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchWorkstations = async () => {
    try {
      const response = await productionService.getWorkstationsList()
      if (response.success) {
        setWorkstations(response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchOperationDetails = async (opId) => {
    try {
      setInitialLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/operations/${opId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        loadOperationData(data)
      } else {
        toast.addToast('Failed to load operation details', 'error')
      }
    } catch (err) {
      toast.addToast('Error loading operation', 'error')
    } finally {
      setInitialLoading(false)
    }
  }

  const loadOperationData = (data) => {
    setFormData({
      name: data.name || '',
      operation_name: data.operation_name || data.name || '',
      is_corrective_operation: !!data.is_corrective_operation,
      default_workstation: data.default_workstation || '',
      create_job_card_based_on_batch_size: !!data.create_job_card_based_on_batch_size,
      batch_size: data.batch_size || 1,
      quality_inspection_template: data.quality_inspection_template || '',
      description: data.description || '',
      operation_type: data.operation_type || 'IN_HOUSE',
      hourly_rate: data.hourly_rate || 0
    })
    
    if (data.sub_operations && data.sub_operations.length > 0) {
      setSubOperations(data.sub_operations.map((op, idx) => ({
        ...op,
        operation_time: Number(op.operation_time) || 0,
        _key: op._key || `row_${idx}_${Date.now()}`,
        no: idx + 1
      })))
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddSubOperation = () => {
    setSubOperations([
      ...subOperations,
      { _key: `row_${Date.now()}`, no: subOperations.length + 1, operation: '', operation_time: 0 }
    ])
  }

  const handleUpdateSubOperation = (index, field, value) => {
    const updated = [...subOperations]
    updated[index][field] = field === 'operation_time' ? parseFloat(value) || 0 : value
    setSubOperations(updated)
  }

  const handleRemoveSubOperation = (index) => {
    if (subOperations.length > 1) {
      const updated = subOperations.filter((_, i) => i !== index).map((op, idx) => ({
        ...op,
        no: idx + 1
      }))
      setSubOperations(updated)
    }
  }

  const totalTime = useMemo(() => {
    return subOperations.reduce((sum, op) => sum + (Number(op.operation_time) || 0), 0)
  }, [subOperations])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.operation_name.trim()) {
      toast.addToast('Operation name is required', 'warning')
      return
    }

    setLoading(true)
    try {
      const cleanSubOps = subOperations.map(({ _key, ...rest }) => rest)
      const payload = { ...formData, sub_operations: cleanSubOps }
      if (!payload.name) payload.name = payload.operation_name

      const token = localStorage.getItem('token')
      const response = await fetch(
        id ? `${import.meta.env.VITE_API_URL}/production/operations/${id}` : `${import.meta.env.VITE_API_URL}/production/operations`,
        {
          method: id ? 'PUT' : 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(payload)
        }
      )

      if (response.ok) {
        toast.addToast(`Operation ${id ? 'updated' : 'created'} successfully`, 'success')
        navigate('/manufacturing/operations')
      } else {
        const errorData = await response.json()
        toast.addToast(errorData.message || 'Failed to save operation', 'error')
      }
    } catch (err) {
      toast.addToast('An error occurred while saving', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-2/50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 ">Loading operation details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 p-4 md:p-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/manufacturing/operations')}
              className="p-2 bg-white border border-slate-200 rounded text-slate-500 hover:text-indigo-600 hover:border-indigo-100 transition-all "
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl   text-slate-900 tracking-tight">
                {id ? 'Edit Operation' : 'New Operation'}
              </h1>
              <p className="text-xs text-slate-500 font-medium text-xs">
                {id ? `Updating ${formData.name}` : 'Define a new manufacturing process step'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/manufacturing/operations')}
              className="p-6  py-2.5 rounded text-xs  text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 .5 rounded  text-xs shadow-lg shadow-indigo-200 transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              {id ? 'Update Operation' : 'Create Operation'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* General Configuration */}
            <div className="bg-white rounded border border-slate-200  overflow-hidden">
              <div className="p-2  bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Settings size={18} className="text-indigo-600" />
                <h3 className="text-xs  text-slate-900 ">General Configuration</h3>
              </div>
              <div className="p-3 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Operation Name</label>
                    <input 
                      type="text"
                      name="operation_name"
                      value={formData.operation_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Precision Assembly"
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Operation Type</label>
                    <select
                      name="operation_type"
                      value={formData.operation_type}
                      onChange={handleInputChange}
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs  text-slate-700 cursor-pointer"
                    >
                      <option value="IN_HOUSE">In-House</option>
                      <option value="OUTSOURCED">Outsourced</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs  text-slate-500  ml-1">Hourly Rate (₹)</label>
                    <input 
                      type="number"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs  text-slate-500  ml-1">Default Workstation</label>
                  <div className="relative">
                    <div 
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    >
                      <Monitor size={18} />
                    </div>
                    <input 
                      type="text"
                      placeholder="Search workstations..."
                      value={workstationDropdownOpen ? workstationSearch : formData.default_workstation}
                      onChange={(e) => {
                        setWorkstationSearch(e.target.value)
                        setWorkstationDropdownOpen(true)
                      }}
                      onFocus={() => setWorkstationDropdownOpen(true)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full pl-12 pr-4 py-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700"
                    />
                    {workstationDropdownOpen && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded shadow  z-50 max-h-60 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {workstations
                          .filter(ws => 
                            ws.name.toLowerCase().includes(workstationSearch.toLowerCase()) || 
                            ws.workstation_name?.toLowerCase().includes(workstationSearch.toLowerCase())
                          )
                          .map(ws => (
                            <div 
                              key={ws.name}
                              onClick={() => {
                                setFormData({ ...formData, default_workstation: ws.name })
                                setWorkstationDropdownOpen(false)
                                setWorkstationSearch('')
                              }}
                              className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                            >
                              <div className="text-xs  text-slate-900">{ws.workstation_name || ws.name}</div>
                              <div className="text-xs  text-slate-400 font-medium text-xs">{ws.name}</div>
                            </div>
                          ))
                        }
                        <div 
                          className="p-2 hover:bg-indigo-50 cursor-pointer text-indigo-600  text-xs flex items-center gap-2"
                          onClick={() => {
                            setFormData({ ...formData, default_workstation: workstationSearch })
                            setWorkstationDropdownOpen(false)
                          }}
                        >
                          <Plus size={14} /> Use "{workstationSearch}" as custom
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs  text-slate-500  ml-1">Description</label>
                  <textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Briefly describe the operation steps..."
                    className="w-full p-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-medium text-slate-700 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Sub-Operations / Tasks */}
            <div className="bg-white rounded border border-slate-200  overflow-hidden">
              <div className="p-2  bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-indigo-600" />
                  <h3 className="text-xs  text-slate-900 ">Sub-Operations / Tasks</h3>
                </div>
                <div className="text-xs   text-indigo-600 bg-indigo-50 px-2 py-1 rounded  ">
                  Total Time: {(Number(totalTime) || 0).toFixed(2)} Hrs
                </div>
              </div>
              <div className="p-3">
                <div className="space-y-4">
                  {subOperations.map((row, idx) => (
                    <div 
                      key={row._key} 
                      className="group flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded bg-slate-50/50 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100"
                    >
                      <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-xs  text-slate-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 w-full">
                        <input 
                          type="text"
                          value={row.operation}
                          onChange={(e) => handleUpdateSubOperation(idx, 'operation', e.target.value)}
                          placeholder="Task name (e.g. Surface Cleaning)"
                          className="w-full p-2  py-2 bg-transparent border-none focus:ring-0 text-xs  text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-32">
                          <input 
                            type="number"
                            value={row.operation_time}
                            onChange={(e) => handleUpdateSubOperation(idx, 'operation_time', e.target.value)}
                            className="w-full pl-3 pr-10 py-2 rounded bg-white border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs  text-indigo-600"
                            step="0.1"
                            min="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs   text-slate-400 ">Hrs</span>
                        </div>
                        {subOperations.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => handleRemoveSubOperation(idx)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  type="button"
                  onClick={handleAddSubOperation}
                  className="mt-6 w-full py-2 border-2 border-dashed border-slate-200 rounded text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2 text-xs  "
                >
                  <Plus size={16} /> Add Task Step
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            {/* Controls */}
            <div className="bg-white rounded border border-slate-200  p-3 space-y-6">
              <h3 className="text-xs  text-slate-900  border-b border-slate-50 pb-4">Options</h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox"
                      name="is_corrective_operation"
                      checked={formData.is_corrective_operation}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="block text-xs  text-slate-700 tracking-wide group-hover:text-indigo-600 transition-colors">Corrective</span>
                    <span className="text-xs  text-slate-400 font-medium text-xs">Mark as rework operation</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 transition-colors cursor-pointer group">
                  <div className="mt-0.5">
                    <input 
                      type="checkbox"
                      name="create_job_card_based_on_batch_size"
                      checked={formData.create_job_card_based_on_batch_size}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="block text-xs  text-slate-700 tracking-wide group-hover:text-indigo-600 transition-colors">Batch Based</span>
                    <span className="text-xs  text-slate-400 font-medium text-xs">Use specific batch sizes</span>
                  </div>
                </label>

                {formData.create_job_card_based_on_batch_size && (
                  <div className="ml-7 space-y-3 pt-2">
                    <div className="">
                      <label className="text-xs  text-slate-400 ">Batch Size</label>
                      <input 
                        type="number"
                        name="batch_size"
                        value={formData.batch_size}
                        onChange={handleInputChange}
                        className="w-full p-2  py-2 rounded bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-500 text-xs  text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-indigo-600 rounded p-3 text-white shadow-lg shadow-indigo-200">
              <div className="flex items-center gap-2 mb-4">
                <Info size={18} />
                <h4 className=" text-xs">Design Tip</h4>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                Operations define the specific tasks performed at a workstation. Adding detailed sub-operations helps in accurate time tracking and process standardization.
              </p>
            </div>

            <div className="md:hidden flex flex-col gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2  rounded  text-xs shadow-lg shadow-indigo-200 transition-all"
              >
                <Save size={18} /> {id ? 'Update' : 'Create'} Operation
              </button>
              <button
                type="button"
                onClick={() => navigate('/manufacturing/operations')}
                className="w-full p-6  py-2 rounded text-xs  text-slate-600 bg-white border border-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
