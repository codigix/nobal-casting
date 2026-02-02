import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, Edit2, Trash2, ChevronLeft, ChevronRight, 
  Search, Factory, Settings, Info, Calendar, Clock,
  MoreVertical, Shield, Monitor, Layout, Grid, List,
  ArrowRight, AlertCircle, CheckCircle2
} from 'lucide-react'
import Card from '../../components/Card/Card'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

export default function Workstations() {
  const navigate = useNavigate()
  const toast = useToast()
  const [workstations, setWorkstations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const itemsPerPage = 12
  
  useEffect(() => {
    fetchWorkstations()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  const fetchWorkstations = async () => {
    try {
      setLoading(true)
      const response = await productionService.getWorkstationsList()
      if (response.success) {
        setWorkstations(response.data || [])
      } else {
        toast.addToast('Failed to fetch workstations', 'error')
      }
    } catch (err) {
      toast.addToast('Error loading workstations', 'error')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (workstationName) => {
    if (!window.confirm(`Are you sure you want to delete "${workstationName}"?`)) return

    try {
      const response = await productionService.deleteWorkstation(workstationName)
      if (response.success) {
        toast.addToast('Workstation deleted successfully', 'success')
        fetchWorkstations()
      } else {
        toast.addToast('Failed to delete workstation', 'error')
      }
    } catch (err) {
      toast.addToast('Error deleting workstation', 'error')
      console.error(err)
    }
  }

  const handleEdit = (workstation) => {
    navigate(`/manufacturing/workstations/${workstation.name}`, { state: { workstation } })
  }

  const filteredWorkstations = useMemo(() => {
    return workstations.filter(ws => 
      ws.name.toLowerCase().includes(search.toLowerCase()) ||
      ws.workstation_name?.toLowerCase().includes(search.toLowerCase()) ||
      ws.description?.toLowerCase().includes(search.toLowerCase()) ||
      ws.workstation_type?.toLowerCase().includes(search.toLowerCase())
    )
  }, [workstations, search])

  const totalPages = Math.ceil(filteredWorkstations.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedWorkstations = filteredWorkstations.slice(startIndex, startIndex + itemsPerPage)

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

  const stats = useMemo(() => {
    const total = workstations.length
    const active = workstations.filter(ws => ws.is_active !== false).length
    const types = new Set(workstations.map(ws => ws.workstation_type).filter(Boolean)).size
    return { total, active, types }
  }, [workstations])

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6  rounded bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Monitor size={24} />
              </div>
              <div>
                <h1 className="text-xl  text-slate-900 ">Workstations</h1>
                <p className="text-slate-500 text-xs font-medium">Manage manufacturing assets and production nodes</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1 rounded border border-slate-200 ">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2  py-1.5 rounded text-xs  transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2  py-1.5 rounded text-xs  transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 ' : 'text-slate-400 hover:text-slate-600'}`}
              >
                List
              </button>
            </div>
            <button 
              onClick={() => navigate('/manufacturing/workstations/new')}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded  text-xs shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
            >
              <Plus size={18} />
              New Workstation
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          {[
            { label: 'Total Assets', value: stats.total, icon: Factory, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Operational', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Asset Classes', value: stats.types, icon: Layout, color: 'text-amber-600', bg: 'bg-amber-50' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded p-3 border border-slate-200  flex items-center gap-5">
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
        <div className="bg-white rounded p-4 border border-slate-200  mb-3 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, ID, type or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 rounded bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-700"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded   border border-slate-200 ">
            <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 ">Synchronizing asset registry...</p>
          </div>
        ) : filteredWorkstations.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedWorkstations.map((ws) => (
                  <div 
                    key={ws.name}
                    className="bg-white rounded border border-slate-200  hover:shadow  hover:border-indigo-200 transition-all group overflow-hidden"
                  >
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded flex items-center justify-center ${ws.is_active === false ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {ws.is_active === false ? <AlertCircle size={20} /> : <Settings size={20} />}
                          </div>
                          <div>
                            <h3 className="text-sm  text-slate-900 truncate max-w-[180px] group-hover:text-indigo-600 transition-colors">
                              {ws.workstation_name || ws.name}
                            </h3>
                            <span className="text-xs text-slate-400  ">{ws.name}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleEdit(ws)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(ws.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400  ">Type</span>
                          <span className="text-slate-700  flex items-center gap-1.5">
                            {ws.workstation_type || 'Unclassified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400  ">Location</span>
                          <span className="text-slate-700 ">
                            {ws.location || 'Not Specified'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400  ">Utilization</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600" 
                                style={{ width: `${ws.capacity_utilization || 0}%` }}
                              />
                            </div>
                            <span className=" text-indigo-600">{ws.capacity_utilization || 0}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${ws.is_active === false ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`} />
                          <span className="text-xs text-slate-400  ">
                            {ws.is_active === false ? 'Offline' : 'Operational'}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleEdit(ws)}
                          className="text-xs  text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all"
                        >
                          Config <ChevronRight size={14} />
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
                      <th className="p-2 text-left  text-slate-400 ">Identification</th>
                      <th className="p-2 text-left  text-slate-400 ">Type / Class</th>
                      <th className="p-2 text-left  text-slate-400 ">Location</th>
                      <th className="p-2 text-left  text-slate-400 ">Status</th>
                      <th className="p-2 text-left  text-slate-400 ">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedWorkstations.map((ws) => (
                      <tr key={ws.name} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${ws.is_active === false ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              {ws.is_active === false ? <AlertCircle size={16} /> : <Settings size={16} />}
                            </div>
                            <div>
                              <p className=" text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">{ws.workstation_name || ws.name}</p>
                              <p className="text-xs  text-slate-400 font-medium text-xs ">{ws.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <span className="px-2.5 py-1 rounded-full text-xs    bg-slate-100 text-slate-600">
                            {ws.workstation_type || 'Standard'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="text-slate-600 ">{ws.location || '-'}</span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${ws.is_active === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span className="text-xs   text-slate-500 ">
                              {ws.is_active === false ? 'Maintenance' : 'Active'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-left">
                          <div className="flex  gap-2">
                            <button 
                              onClick={() => handleEdit(ws)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(ws.name)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
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
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-8 px-2">
                <p className="text-xs text-slate-400  ">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredWorkstations.length)} of {filteredWorkstations.length} Assets
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded border border-slate-200 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-50 transition-all "
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-8 h-8 rounded text-xs  transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded border border-slate-200 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-50 transition-all "
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded   border border-slate-200  py-20 flex flex-col items-center text-center p-6 ">
            <div className="w-20 h-20 bg-slate-50 rounded   flex items-center justify-center text-slate-300 mb-6">
              <Monitor size={40} />
            </div>
            <h3 className="text-xl  text-slate-900 mb-2">No Workstations Found</h3>
            <p className="text-slate-500 text-xs max-w-xs mb-3">
              {search ? "Adjust your search parameters to find the asset you're looking for." : "Register your first manufacturing asset to begin managing your production capacity."}
            </p>
            {!search && (
              <button 
                onClick={() => navigate('/manufacturing/workstations/new')}
                className="flex items-center gap-2 bg-indigo-600 text-white p-6  py-2 rounded  text-xs shadow-lg shadow-indigo-200"
              >
                <Plus size={18} /> Add First Workstation
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
