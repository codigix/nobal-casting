import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Edit2, Trash2, Clock, Settings, Search, Filter, 
  ChevronRight, Activity, Zap, Box, Layers, AlertCircle,
  MoreVertical, CheckCircle2, Sliders, ArrowRight,
  Monitor, Cpu, Wrench, Hammer
} from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

export default function OperationsRedesign() {
  const navigate = useNavigate()
  const toast = useToast()
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  useEffect(() => {
    fetchOperations()
  }, [])

  const fetchOperations = async () => {
    try {
      setLoading(true)
      const response = await productionService.getOperationsList()
      if (response.success) {
        setOperations(response.data || [])
      } else {
        toast.addToast('Failed to fetch operations', 'error')
      }
    } catch (err) {
      toast.addToast('Error loading operations', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (operationName) => {
    if (!window.confirm(`Are you sure you want to delete "${operationName}"?`)) return

    try {
      const response = await productionService.deleteOperation(operationName)
      if (response.success) {
        toast.addToast('Operation deleted successfully', 'success')
        fetchOperations()
      } else {
        toast.addToast('Failed to delete operation', 'error')
      }
    } catch (err) {
      toast.addToast('Error deleting operation', 'error')
      console.error(err)
    }
  }

  const handleEdit = (operation) => {
    navigate(`/manufacturing/operations/${operation.name}`, { state: { operation } })
  }

  const filteredOperations = useMemo(() => {
    return operations.filter(op => {
      const matchesSearch = 
        op.name.toLowerCase().includes(search.toLowerCase()) ||
        op.operation_name?.toLowerCase().includes(search.toLowerCase()) ||
        op.default_workstation?.toLowerCase().includes(search.toLowerCase())
      
      const matchesType = filterType === 'All' || op.operation_type === filterType
      
      return matchesSearch && matchesType
    })
  }, [operations, search, filterType])

  const stats = useMemo(() => {
    const total = operations.length
    const corrective = operations.filter(op => op.is_corrective_operation).length
    const batchBased = operations.filter(op => op.create_job_card_based_on_batch_size).length
    const inHouse = operations.filter(op => op.operation_type === 'IN_HOUSE' || !op.operation_type).length
    
    return { total, corrective, batchBased, inHouse }
  }, [operations])

  const getComplexityColor = (subOpsCount) => {
    if (subOpsCount <= 2) return 'text-emerald-500 bg-emerald-50'
    if (subOpsCount <= 5) return 'text-amber-500 bg-amber-50'
    return 'text-rose-500 bg-rose-50'
  }

  const getComplexityLabel = (subOpsCount) => {
    if (subOpsCount <= 2) return 'Low'
    if (subOpsCount <= 5) return 'Medium'
    return 'High'
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6  rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Settings size={24} />
              </div>
              <div>
                <h1 className="text-xl  text-slate-900 ">Manufacturing Operations</h1>
                <p className="text-slate-500 font-medium text-xs">Define and manage production process steps</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded border border-slate-200 ">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2  py-1.5 rounded text-xs font-semibold transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2  py-1.5 rounded text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-400 hover:text-slate-600'}`}
              >
                List
              </button>
            </div>
            <button 
              onClick={() => navigate('/manufacturing/operations/new')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded  text-xs shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} />
              New Operation
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: 'Total Operations', value: stats.total, icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'In-House', value: stats.inHouse, icon: Monitor, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Corrective', value: stats.corrective, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'Batch Based', value: stats.batchBased, icon: Box, color: 'text-amber-600', bg: 'bg-amber-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded p-3 border border-slate-200  flex items-center gap-3">
              <div className={`w-6 h-6  rounded ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs  text-slate-400  mb-1">{stat.label}</p>
                <h3 className="text-xl   text-slate-900">{stat.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded p-4 border border-slate-200  mb-3 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, ID or workstation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 rounded bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-50 border-none rounded p-2 text-xs  text-slate-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="IN_HOUSE">In-House</option>
              <option value="OUTSOURCED">Outsourced</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded   border border-slate-200 ">
            <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 ">Loading operations catalog...</p>
          </div>
        ) : filteredOperations.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredOperations.map((op) => (
                <div 
                  key={op.name}
                  className="bg-white rounded border border-slate-200  hover:shadow-xl hover:border-indigo-200 transition-all group overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${op.is_corrective_operation ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {op.is_corrective_operation ? <AlertCircle size={20} /> : <Zap size={20} />}
                        </div>
                        <div>
                          <h3 className="text-sm  text-slate-900 truncate max-w-[180px] group-hover:text-indigo-600 transition-colors">
                            {op.operation_name || op.name}
                          </h3>
                          <span className="text-xs  text-slate-400 ">{op.name}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => handleEdit(op)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(op.name)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400  ">Workstation</span>
                        <span className="text-slate-700  flex items-center gap-1.5">
                          <Monitor size={14} className="text-slate-400" />
                          {op.default_workstation || 'Not Assigned'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400  ">Sub-Operations</span>
                        <span className={`px-2 py-0.5 rounded-md  ${getComplexityColor(op.sub_operations?.length || 0)}`}>
                          {op.sub_operations?.length || 0} Tasks
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400  ">Complexity</span>
                        <span className={` ${getComplexityColor(op.sub_operations?.length || 0).split(' ')[0]}`}>
                          {getComplexityLabel(op.sub_operations?.length || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {op.sub_operations?.slice(0, 3).map((sub, i) => (
                          <div 
                            key={i} 
                            title={sub.operation}
                            className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs   text-slate-600"
                          >
                            {i + 1}
                          </div>
                        ))}
                        {(op.sub_operations?.length || 0) > 3 && (
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-xs   text-indigo-600">
                            +{(op.sub_operations?.length || 0) - 3}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => handleEdit(op)}
                        className="text-xs  text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all"
                      >
                        Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded border border-slate-200  text-xs">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-2 text-left  text-slate-400 ">Operation</th>
                    <th className="p-2 text-left  text-slate-400 ">Workstation</th>
                    <th className="p-2 text-left  text-slate-400 ">Type</th>
                    <th className="p-2 text-left  text-slate-400 ">Complexity</th>
                    <th className="p-2 text-left  text-slate-400 ">Tasks</th>
                    <th className="p-2 text-left  text-slate-400 ">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOperations.map((op) => (
                    <tr key={op.name} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-2 ">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded flex items-center justify-center ${op.is_corrective_operation ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {op.is_corrective_operation ? <AlertCircle size={16} /> : <Zap size={16} />}
                          </div>
                          <div>
                            <p className=" text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">{op.operation_name || op.name}</p>
                            <p className="text-xs  text-slate-400 font-medium text-xs">{op.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 ">
                        <span className="text-slate-700  flex items-center gap-1.5">
                          <Monitor size={14} className="text-slate-400" />
                          {op.default_workstation || '-'}
                        </span>
                      </td>
                      <td className="p-2 ">
                        <span className={`px-2.5 py-1 rounded-full text-xs   ${op.operation_type === 'OUTSOURCED' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {op.operation_type || 'IN_HOUSE'}
                        </span>
                      </td>
                      <td className="p-2 ">
                        <span className={` ${getComplexityColor(op.sub_operations?.length || 0).split(' ')[0]}`}>
                          {getComplexityLabel(op.sub_operations?.length || 0)}
                        </span>
                      </td>
                      <td className="p-2  text-slate-500 ">
                        {op.sub_operations?.length || 0} Sub-tasks
                      </td>
                      <td className="p-2  text-right">
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => handleEdit(op)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(op.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded   border border-slate-200 ">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <Box size={40} />
            </div>
            <h3 className="text-xl  text-slate-900 mb-2">No operations found</h3>
            <p className="text-slate-500 font-medium text-xs mb-3">Try adjusting your search or create a new operation</p>
            <button 
              onClick={() => navigate('/manufacturing/operations/new')}
              className="flex items-center gap-2 bg-indigo-600 text-white p-6  py-2 rounded  shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              <Plus size={20} /> Create First Operation
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
