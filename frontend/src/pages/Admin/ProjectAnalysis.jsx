import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, BarChart, Bar, Cell, PieChart, Pie } from 'recharts'
import {
  TrendingUp, CheckCircle, AlertTriangle, Package, Search,
  Star, Eye, Edit2, Truck, ClipboardList, Factory, Boxes,
  LayoutGrid, List, Filter, Download, RefreshCcw,
  Calendar, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  Activity, Clock, Layers
} from 'lucide-react'
import { getSalesOrdersAsProjects } from '../../services/adminService'

const statusConfig = {
  draft: { icon: Edit2, color: '#f97316', bg: '#fff7ed', text: '#9a3412', border: '#ffedd5', label: 'Draft' },
  production: { icon: Truck, color: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e', border: '#e0f2fe', label: 'Production' },
  complete: { icon: CheckCircle, color: '#10b981', bg: '#f0fdf4', text: '#14532d', border: '#dcfce7', label: 'Complete' },
  on_hold: { icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', text: '#78350f', border: '#fef3c7', label: 'On Hold' },
  dispatched: { icon: Truck, color: '#8b5cf6', bg: '#f5f3ff', text: '#4c1d95', border: '#ede9fe', label: 'Dispatched' },
  delivered: { icon: Package, color: '#059669', bg: '#ecfdf5', text: '#064e3b', border: '#d1fae5', label: 'Delivered' }
}

const StatusBadge = ({ status }) => {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft
  const Icon = config.icon

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] "
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text
      }}
    >
      <Icon size={12} style={{ color: config.color }} />
      <span>{config.label}</span>
    </div>
  )
}

const StatCard = ({ label, value, icon: Icon, trend, trendValue, bgColor, iconColor, textColor }) => (
  <div className="bg-white rounded p-2 border border-slate-200 hover: hover:border-blue-200 transition-all group relative overflow-hidden">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${bgColor} opacity-5 group-hover:opacity-10 transition-opacity`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10  ${bgColor} ${iconColor} flex items-center justify-center `}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px]  px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-[11px]  text-slate-400   mb-1">{label}</p>
      <h3 className={`text-2xl  ${textColor || 'text-slate-900'}`}>{value}</h3>
    </div>
  </div>
);

export default function ProjectAnalysis() {
  const location = useLocation()
  const navigate = useNavigate()
  const [projectTimeline, setProjectTimeline] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('list')
  const [segmentTab, setSegmentTab] = useState(location.state?.filterSegment || 'all')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [trends, setTrends] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjectAnalysis()
  }, [])

  useEffect(() => {
    let filtered = allProjects
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === activeTab)
    }
    if (segmentTab !== 'all') {
      filtered = filtered.filter(p => p.segment === segmentTab)
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(lowerSearch) ||
        p.customer_name?.toLowerCase().includes(lowerSearch) ||
        p.id?.toString().includes(lowerSearch)
      )
    }
    setFilteredProjects(filtered)
  }, [allProjects, activeTab, segmentTab, searchTerm])

  const fetchProjectAnalysis = async () => {
    try {
      setLoading(true)
      const res = await getSalesOrdersAsProjects()

      if (res.success && res.data) {
        const { projects, monthlyTimeline, totalRevenue, completionRate, trends } = res.data
        setAllProjects(projects || [])
        setTotalRevenue(totalRevenue || 0)
        setCompletionRate(completionRate || 0)
        setProjectTimeline(monthlyTimeline || [])
        setTrends(trends)
      }
    } catch (err) {
      console.error('Error fetching project analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewProject = (id) => {
    navigate(`/admin/project-analysis/${id}`)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
      <p className="text-slate-500  mt-6 animate-pulse   text-xs">Analyzing Project Portfolio...</p>
    </div>
  )

  const atRiskCount = allProjects.filter(p => p.daysLeft < 3 && p.status !== 'delivered' && p.status !== 'complete').length;

  return (
    <div className="p-4 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white  shadow-blue-200">
              <Activity size={15} />
            </div>
            <h1 className="text-xl  text-slate-900 m-0 tracking-tight">Project Matrix</h1>
          </div>
          <p className="text-slate-500 font-medium text-xs m-0 flex items-center gap-2">
            <Clock size={14} className="text-slate-400" />
            Last synchronized: {new Date().toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded border border-slate-200 flex ">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>

          <button className=" p-2 bg-white border border-slate-200 rounded text-xs  text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 ">
            <Download size={15} />
            Export
          </button>

          <button
            onClick={fetchProjectAnalysis}
            className=" p-2 bg-blue-600 rounded text-xs  text-white hover:bg-blue-700 transition-all  shadow-blue-200 flex items-center gap-2"
          >
            <RefreshCcw size={15} />
            Sync Repo
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-8">
        <StatCard
          label="Total Projects"
          value={allProjects.length}
          icon={Layers}
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
          trend={trends?.projects?.trend || 'up'}
          trendValue={`${trends?.projects?.percent || 0}%`}
        />
        <StatCard
          label="Estimated Revenue"
          value={`₹${(totalRevenue / 100000).toFixed(1)}L`}
          icon={TrendingUp}
          bgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          trend={trends?.revenue?.trend || 'up'}
          trendValue={`${trends?.revenue?.percent || 0}%`}
        />
        <StatCard
          label="System Completion"
          value={`${completionRate}%`}
          icon={CheckCircle}
          bgColor="bg-violet-50"
          iconColor="text-violet-600"
          trend={trends?.completion?.trend || 'up'}
          trendValue={`${trends?.completion?.percent || 0}%`}
        />
        <StatCard
          label="Critical / At Risk"
          value={atRiskCount}
          icon={AlertTriangle}
          bgColor="bg-rose-50"
          iconColor="text-rose-600"
          trend={atRiskCount > 5 ? 'up' : 'down'}
          trendValue={atRiskCount > 0 ? `${Math.round((atRiskCount / allProjects.length) * 100)}%` : '0%'}
        />
      </div>

      {/* Main Analysis Area */}
      <div className="bg-white rounded border border-slate-200  mb-8">
        {/* Filter Bar */}
        <div className="p-2 border-b border-slate-100 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by project or customer..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full md:w-80 transition-all "
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className=" w-px bg-slate-200 hidden md:block" />

            <div className="flex items-center gap-2">
              
              <div className="flex p-1 bg-white rounded border border-slate-200 ">
                {['all', 'production', 'complete'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-4 rounded text-xs transition-all    ${activeTab === tab ? 'bg-blue-600 text-white ' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              
              <div className="flex p-1 bg-white rounded border border-slate-200 ">
                {['all', 'Premium', 'Other'].map((seg) => (
                  <button
                    key={seg}
                    onClick={() => setSegmentTab(seg)}
                    className={`px-4 py-1.5 rounded text-xs transition-all    ${segmentTab === seg ? 'bg-amber-500 text-white ' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {seg}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500  text-[10px]  ">
            <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              {filteredProjects.length} RESULTS IDENTIFIED
            </span>
          </div>
        </div>

        {/* Project Display */}
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-2 text-[11px]  text-slate-400   border-b border-slate-100">Project Identifier</th>
                  <th className="p-2 text-[11px]  text-slate-400   border-b border-slate-100">Execution Status</th>
                  <th className="p-2 text-[11px]  text-slate-400   border-b border-slate-100">Resource Matrix</th>
                  <th className="p-2 text-[11px]  text-slate-400   border-b border-slate-100">Production Yield</th>
                  <th className="p-2 text-[11px]  text-slate-400   border-b border-slate-100">Revenue</th>
                  <th className="p-2 text-[11px]  text-slate-400   border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((project, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all group">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-white  rounded  border border-slate-200 flex items-center justify-center text-slate-500 group-hover:border-blue-500 group-hover:text-blue-600 transition-all ">
                          <Package size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-xs  text-slate-900 m-0 truncate leading-none">{project.name}</p>
                            {project.segment === 'Premium' && (
                              <div className="p-1 bg-amber-50 rounded-md border border-amber-100">
                                <Star size={10} className="text-amber-500 fill-amber-500" />
                              </div>
                            )}
                          </div>
                          <div className=" items-center gap-2 text-[11px] text-slate-500   tracking-tight">
                            <span>{project.customer_name}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-400 font-medium">#{project.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <StatusBadge status={project.status} />
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] ">
                        <Calendar size={10} className="text-slate-400" />
                        <span className={project.daysLeft < 3 ? 'text-rose-600' : 'text-slate-500'}>
                          {project.daysLeft < 0 ? 'EXPIRED' : `${project.daysLeft} DAYS REMAINING`}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex flex-col items-center gap-1 group/matrix" title="Work Orders">
                          <div className={`w-8 h-8  flex items-center justify-center transition-all ${project.work_order_count > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-300'
                            }`}>
                            <Factory size={14} />
                          </div>
                          <span className="text-[10px] ">{project.work_order_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 group/matrix" title="Job Cards">
                          <div className={`w-8 h-8  flex items-center justify-center transition-all ${project.pending_job_card_count > 0
                              ? 'bg-rose-50 text-rose-600  shadow-rose-100 animate-pulse'
                              : project.job_card_count > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-300'
                            }`}>
                            <ClipboardList size={14} />
                          </div>
                          <span className="text-[10px] ">{project.job_card_count || 0}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 group/matrix" title="Material Requests">
                          <div className={`w-8 h-8  flex items-center justify-center transition-all ${project.pending_material_request_count > 0
                              ? 'bg-amber-50 text-amber-600  shadow-amber-100 animate-pulse'
                              : project.material_request_count > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-300'
                            }`}>
                            <Boxes size={14} />
                          </div>
                          <span className="text-[10px] ">{project.material_request_count || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="w-36">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px]  text-slate-900">{project.progress}%</span>
                          <span className="text-[9px]  text-slate-400  tracking-tight">
                            {project.produced_qty || 0} / {project.planned_qty || 0}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full transition-all duration-1000 ease-out ${project.progress === 100 ? 'bg-emerald-500' :
                                project.progress > 70 ? 'bg-blue-500' :
                                  project.progress > 30 ? 'bg-amber-500' : 'bg-slate-400'
                              }`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col">
                        <span className="text-sm  text-slate-900">₹{parseFloat(project.revenue || 0).toLocaleString()}</span>
                        <span className="text-[9px]  text-emerald-600   flex items-center gap-1">
                          <CheckCircle size={10} /> VALUATED
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewProject(project.id)}
                          className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600  transition-all "
                        >
                          <Eye size={15} />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProjects.map((project, idx) => (
              <div
                key={idx}
                onClick={() => handleViewProject(project.id)}
                className="bg-white rounded border border-slate-200 p-2 hover:shadow-xl hover:border-blue-500 transition-all group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-2">
                  <StatusBadge status={project.status} />
                </div>

                <div className="p-2 w-fit bg-slate-50  rounded  flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all mb-6 border border-slate-100">
                  <Package size={15} />
                </div>

                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xs  text-slate-900 truncate m-0">{project.name}</h3>
                    {project.segment === 'Premium' && <Star size={14} className="text-amber-500 fill-amber-500" />}
                  </div>
                  <p className="text-xs  text-slate-400  ">{project.customer_name}</p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px]  text-slate-400  ">Progress</span>
                      <span className="text-xs  text-slate-900">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1" title="Work Orders">
                        <Factory size={12} className="text-slate-400" />
                        <span className="text-xs  text-slate-600">{project.work_order_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Job Cards">
                        <ClipboardList size={12} className="text-slate-400" />
                        <span className="text-xs  text-slate-600">{project.job_card_count || 0}</span>
                      </div>
                    </div>
                    <span className="text-sm  text-slate-900">₹{parseFloat(project.revenue || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px]  text-slate-500">
                    <Calendar size={12} />
                    {project.daysLeft} Days Left
                  </div>
                  <span className="text-blue-600  text-[10px]   group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    Analyze Vitals <ArrowUpRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center bg-white">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 border border-dashed border-slate-200">
              <Search size={32} />
            </div>
            <h3 className="text-lg  text-slate-900 mb-2 tracking-tight">No Strategic Data Found</h3>
            <p className="text-slate-500 text-sm max-w-xs text-center font-medium">
              We couldn't find any projects matching your current filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setActiveTab('all'); setSegmentTab('all'); }}
              className="mt-6 px-6 py-2 bg-slate-900 text-white text-xs   hover:bg-slate-800 transition-all"
            >
              RESET ENGINE FILTERS
            </button>
          </div>
        )}
      </div>

      {/* Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 ">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg  text-slate-900 m-0 tracking-tight">Timeline Analytics</h3>
            <div className="flex items-center gap-2 text-[10px] ">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> PRODUCTION</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200" /> FORECAST</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectTimeline}>
                <defs>
                  <linearGradient id="colorProject" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorProject)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 ">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg  text-slate-900 m-0 tracking-tight">Volume Distribution</h3>
            <StatusBadge status="complete" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40}>
                  {projectTimeline.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === projectTimeline.length - 1 ? '#3b82f6' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
