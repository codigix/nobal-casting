import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { TrendingUp, Calendar, AlertCircle, Clock, CheckCircle, Truck, Package, LayoutGrid, ArrowUpRight, Layers, Zap, Cpu, ChevronLeft, ClipboardCheck, ArrowRight, ShoppingCart, Boxes } from 'lucide-react'
import { getDetailedProjectAnalysis } from '../../services/adminService'

const Factory = ({ size, className, style }) => <Cpu size={size} className={className} style={style} />

const statusConfig = {
  draft: { icon: Clock, color: '#f97316', bg: '#fff7ed', text: '#9a3412', border: '#ffedd5', label: 'Draft' },
  confirmed: { icon: CheckCircle, color: '#3b82f6', bg: '#eff6ff', text: '#1e40af', border: '#dbeafe', label: 'Confirmed' },
  under_production: { icon: Factory, color: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e', border: '#e0f2fe', label: 'In Production' },
  production: { icon: Truck, color: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e', border: '#e0f2fe', label: 'Production' },
  complete: { icon: CheckCircle, color: '#10b981', bg: '#f0fdf4', text: '#14532d', border: '#dcfce7', label: 'Complete' },
  on_hold: { icon: AlertCircle, color: '#f59e0b', bg: '#fffbeb', text: '#78350f', border: '#fef3c7', label: 'On Hold' },
  dispatched: { icon: Truck, color: '#8b5cf6', bg: '#f5f3ff', text: '#4c1d95', border: '#ede9fe', label: 'Dispatched' },
  delivered: { icon: Package, color: '#059669', bg: '#ecfdf5', text: '#064e3b', border: '#d1fae5', label: 'Delivered' }
}

const StatusBadge = ({ status }) => {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft
  const Icon = config.icon

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
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

const MaterialStatusBadge = ({ status }) => {
  const configs = {
    pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600 border-slate-200' },
    requested: { label: 'Requested', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    received: { label: 'Received', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    completed: { label: 'Completed', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    draft: { label: 'Draft', color: 'bg-amber-50 text-amber-600 border-amber-200' },
    approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    rejected: { label: 'Rejected', color: 'bg-rose-50 text-rose-600 border-rose-200' },
    partial: { label: 'Partial', color: 'bg-amber-50 text-amber-600 border-amber-200' }
  }
  const config = configs[status?.toLowerCase()] || configs.pending
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
      {config.label}
    </span>
  )
}

const ProcessFlow = ({ stages }) => {
  if (!stages || stages.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white  border border-dashed border-slate-200">
      <Layers size={40} className="text-slate-300 mb-4" />
      <p className="text-slate-500 font-medium text-sm">No production workflow data available</p>
    </div>
  );

  const columns = [
    { status: 'pending', title: 'Pending', color: 'bg-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: Clock },
    { status: 'in_progress', title: 'In Progress', color: 'bg-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: TrendingUp },
    { status: 'completed', title: 'Completed', color: 'bg-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle }
  ];

  const groupedStages = stages.reduce((acc, stage) => {
    const status = stage.status === 'in_progress' ? 'in_progress' : 
                   stage.status === 'completed' ? 'completed' : 'pending';
    if (!acc[status]) acc[status] = [];
    acc[status].push(stage);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(column => {
        const Icon = column.icon;
        const columnStages = groupedStages[column.status] || [];
        
        return (
          <div key={column.status} className="flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4 bg-white p-3  border border-slate-200  ">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded  ${column.color} text-white  shadow-blue-200`}>
                  <Icon size={18} />
                </div>
                <h4 className=" text-slate-700">{column.title}</h4>
              </div>
              <span className="text-xs  bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {columnStages.length}
              </span>
            </div>
            
            <div className={`flex-1 flex flex-col gap-4 p-3  rounded  border-2 border-dashed ${column.border} ${column.bg} transition-colors`}>
              {columnStages.map((stage, idx) => {
                const rawProgress = stage.planned_qty > 0 ? Math.round((stage.produced_qty / stage.planned_qty) * 100) : 0;
                const yieldRate = stage.produced_qty > 0 ? Math.round((stage.accepted_qty / stage.produced_qty) * 100) : 0;
                
                return (
                  <div key={idx} className="bg-white p-2    border border-slate-200 hover: hover:border-blue-400 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px]  text-slate-400  block mb-1">Stage {stage.sequence || idx + 1}</span>
                        <h5 className=" text-slate-800 text-xs m-0">{stage.stage_name}</h5>
                        {stage.start_date && (
                          <span className="text-[9px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                            <Calendar size={10} /> 
                            {new Date(stage.start_date).toLocaleDateString()}
                            {stage.end_date && ` - ${new Date(stage.end_date).toLocaleDateString()}`}
                          </span>
                        )}
                      </div>
                      {stage.produced_qty > 0 && (
                        <div className={`px-2 py-1 rounded-md text-[10px]  ${yieldRate >= 98 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {yieldRate}% Yield
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px]  text-slate-500 mb-1.5">
                          <span>PROGRESS</span>
                          <span className="text-slate-900">{rawProgress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${column.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(rawProgress, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 border-t border-slate-50">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Package size={12} className="text-slate-400 text-xs" />
                            {stage.job_cards_count} Active Jobs
                          </div>
                          {stage.material_status && (
                            <div className="flex items-center gap-1.5">
                              <MaterialStatusBadge status={stage.material_status} />
                            </div>
                          )}
                        </div>
                        {(parseFloat(stage.rejected_qty) > 0 || parseFloat(stage.scrap_qty) > 0) && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-500  ml-auto">
                            <AlertCircle size={14} />
                            {parseFloat(stage.rejected_qty) + parseFloat(stage.scrap_qty)} Loss
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedItemForStages, setSelectedItemForStages] = useState('All Items')
  const [detailedData, setDetailedData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await getDetailedProjectAnalysis(id)
        if (response.success) {
          setDetailedData(response.data)
          setError(null)
        } else {
          setError(response.message || 'Failed to load project details')
        }
      } catch (err) {
        console.error('Error fetching project details:', err)
        setError('Failed to load project details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Analyzing Project Vitals...</p>
      </div>
    )
  }

  if (error || !detailedData) {
    return (
      <div className="p-8 text-center">
        <AlertCircle size={48} className="text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl  text-slate-900 mb-2">Analysis Error</h2>
        <p className="text-slate-500 mb-6">{error || 'Project data not found'}</p>
        <button 
          onClick={() => navigate('/admin/project-analysis')}
          className="px-6 py-2 bg-blue-600 text-white rounded  hover:bg-blue-700 transition-colors"
        >
          Back to List
        </button>
      </div>
    )
  }

  const project = detailedData.project || {}
  const progress = project.progress || 0
  
  const stages = detailedData.stages || []
  const totalProduced = stages.reduce((acc, s) => acc + (parseFloat(s.produced_qty) || 0), 0)
  const totalAccepted = stages.reduce((acc, s) => acc + (parseFloat(s.accepted_qty) || 0), 0)
  const totalRejected = stages.reduce((acc, s) => acc + (parseFloat(s.rejected_qty) || 0), 0)
  const totalScrap = stages.reduce((acc, s) => acc + (parseFloat(s.scrap_qty) || 0), 0)
  const totalLoss = totalRejected + totalScrap
  
  const yieldRate = totalProduced > 0 ? Math.round((totalAccepted / totalProduced) * 100) : 100
  const qualityRate = totalProduced > 0 ? Math.round(((totalProduced - totalLoss) / totalProduced) * 100) : 100
  
  const dueDate = project.dueDate ? new Date(project.dueDate) : null
  const orderDate = project.order_date ? new Date(project.order_date) : new Date()
  
  const totalDuration = dueDate && orderDate ? Math.max(1, (dueDate - orderDate) / (1000 * 60 * 60 * 24)) : 30
  const elapsed = orderDate ? (new Date() - orderDate) / (1000 * 60 * 60 * 24) : 15
  const timeProgress = Math.min(100, Math.max(1, (elapsed / totalDuration) * 100))
  
  const timelinePerformance = Math.round(Math.min(100, (progress / timeProgress) * 100))
  const efficiency = project.efficiency || 85

  const radarData = [
    { subject: 'Progress', A: progress, B: 80, fullMark: 100 },
    { subject: 'Yield', A: yieldRate, B: 95, fullMark: 100 },
    { subject: 'Timeline', A: timelinePerformance, B: 90, fullMark: 100 },
    { subject: 'Quality Yield', A: qualityRate, B: 98, fullMark: 100 },
    { subject: 'Efficiency', A: efficiency, B: 85, fullMark: 100 }
  ]

  const availableItems = ['All Items', ...Object.keys(detailedData?.project?.stagesByItem || {})]
  const displayStages = selectedItemForStages === 'All Items' 
    ? (detailedData?.stages || [])
    : (detailedData?.project?.stagesByItem?.[selectedItemForStages] || [])

  return (
    <div className="p-6">
      {/* Header */}
      <div className=" md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/project-analysis')}
            className="p-2 bg-white border border-slate-200 rounded  text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all  "
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl  text-slate-900 m-0">{project.name || 'Untitled Project'}</h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="text-slate-500 font-medium m-0">
              Customer: <span className="text-slate-900">{project.customer_name || 'Generic Customer'}</span> | 
              ID: <span className="text-slate-900">{project.id || 'N/A'}</span>
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-5 p-1 bg-slate-100 rounded border border-slate-200 w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'stages', label: 'Production Flow', icon: TrendingUp },
            { id: 'workorders', label: 'Work Orders', icon: ClipboardCheck },
            { id: 'supplychain', label: 'Supply Chain', icon: ShoppingCart },
            { id: 'history', label: 'Production History', icon: Clock },
            { id: 'materials', label: 'Inventory Matrix', icon: Layers }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 p-2 rounded  text-xs transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-600  scale-105' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="col-span-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Completion</p>
                  <div className="flex items-end justify-between mb-2">
                    <h3 className="text-2xl font-bold text-slate-900">{progress}%</h3>
                    <TrendingUp size={15} className="text-emerald-500 mb-2" />
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                
                <div className="bg-white p-4  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Revenue</p>
                  <h3 className="text-2xl font-bold text-slate-900">₹{parseFloat(project.revenue || 0).toLocaleString()}</h3>
                  <p className="text-emerald-600 text-[10px] font-bold mt-2 flex items-center gap-1 uppercase">
                    <CheckCircle size={12} /> Confirmed
                  </p>
                </div>

                <div className="bg-white p-4  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Timeline</p>
                  <h3 className="text-2xl font-bold text-slate-900">{project.daysLeft || 0} Days</h3>
                  <p className="text-slate-500 text-[10px] font-bold mt-2 uppercase">Remaining</p>
                </div>

                <div className="bg-white p-4  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-wider">Materials</p>
                  <h3 className="text-2xl font-bold text-slate-900">{detailedData.project?.material_requests?.length || 0}</h3>
                  <p className="text-blue-600 text-[10px] font-bold mt-2 uppercase">Requests Active</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded border border-slate-200">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">Supply Chain Health</h4>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-500 uppercase">Material Requests</span>
                        <span className="text-slate-900">{detailedData.project?.material_requests?.filter(mr => mr.status === 'approved' || mr.status === 'completed').length || 0} / {detailedData.project?.material_requests?.length || 0} Approved</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(detailedData.project?.material_requests?.length > 0 ? (detailedData.project.material_requests.filter(mr => mr.status === 'approved' || mr.status === 'completed').length / detailedData.project.material_requests.length) * 100 : 0)}%` }} 
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-2">
                        <span className="text-slate-500 uppercase">Stock Logistics</span>
                        <span className="text-slate-900">{detailedData.project?.stock_movements?.length || 0} Transactions</span>
                      </div>
                      <div className="flex gap-1">
                        {detailedData.project?.stock_movements?.slice(0, 10).map((sm, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${sm.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-400'}`} title={sm.transaction_no} />
                        ))}
                        {(!detailedData.project?.stock_movements || detailedData.project.stock_movements.length === 0) && (
                          <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                        )}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                          <ShoppingCart size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Last Request</p>
                          <p className="text-xs font-bold text-slate-700 m-0">
                            {detailedData.project?.material_requests?.[0]?.mr_id || 'No requests yet'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('supplychain')}
                        className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline"
                      >
                        View Details <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded border border-slate-200">
                  <h4 className="text-lg font-bold text-slate-900 mb-6 tracking-tight">Machine Utilization</h4>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={detailedData.project?.machine_stats?.slice(0, 5) || []}>
                        <XAxis dataKey="machine_name" hide />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="efficiency" radius={[4, 4, 0, 0]}>
                          {detailedData.project?.machine_stats?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.efficiency >= 85 ? '#10b981' : entry.efficiency >= 70 ? '#f59e0b' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Active</p>
                        <p className="text-sm font-bold text-slate-700">{detailedData.project?.machine_stats?.length || 0}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Eff.</p>
                        <p className="text-sm font-bold text-slate-700">
                          {Math.round((detailedData.project?.machine_stats?.reduce((acc, m) => acc + m.efficiency, 0) || 0) / (detailedData.project?.machine_stats?.length || 1))}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-2 rounded  border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg  text-slate-900">Health Radar Analysis</h4>
                  <div className="flex items-center gap-6 text-xs ">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> Current Performance</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-200" /> Industry Benchmark</div>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Benchmark" dataKey="B" stroke="#cbd5e1" fill="#f1f5f9" fillOpacity={0.5} />
                      <Radar name="Project" dataKey="A" stroke="#2563eb" strokeWidth={3} fill="#3b82f6" fillOpacity={0.3} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-2  rounded  text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10"><Calendar size={50} /></div>
                <h4 className="text-xs  text-blue-400  mb-2">Delivery Intelligence</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-slate-400 text-[10px]   mb-1">Estimated Delivery</p>
                    <p className="text-xl ">{project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not Scheduled'}</p>
                  </div>
                  
                  <div className={`p-2  border ${progress < timeProgress && project.status !== 'delivered' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <div className="flex items-center gap-3 mb-3">
                      {progress < timeProgress && project.status !== 'delivered' ? (
                        <>
                          <AlertCircle className="text-rose-400" />
                          <span className="text-rose-400  ">At Risk</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="text-emerald-400" />
                          <span className="text-emerald-400 text-sm ">On Track</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed m-0">
                      {progress < timeProgress && project.status !== 'delivered' ? 
                        `Project is currently behind schedule. Progress (${progress}%) is lower than expected time elapsed (${Math.round(timeProgress)}%).` : 
                        "Production velocity is aligned with delivery targets. Current efficiency suggests early completion possible."
                      }
                    </p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px]  text-slate-400 ">Key Milestones</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Project Kickoff', date: orderDate, completed: true },
                        { label: 'Production Start', date: stages[0]?.start_date || orderDate, completed: stages.some(s => s.status !== 'pending') },
                        { label: 'Target Delivery', date: dueDate, completed: project.status === 'delivered' }
                      ].map((milestone, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className={`w-2 h-2 rounded-full ${milestone.completed ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                          <div>
                            <p className="text-xs  m-0">{milestone.label}</p>
                            <p className="text-[10px] text-slate-400 m-0">{milestone.date ? new Date(milestone.date).toLocaleDateString() : 'TBD'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stages' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded border border-slate-200 gap-4 shadow-sm">
              <div>
                <h4 className="text-lg font-bold text-slate-900 m-0 tracking-tight">Production Workflow Analysis</h4>
                <p className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-wider">Status of operations across all manufacturing phases</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">Filter Item:</span>
                <select 
                  className="bg-white border border-slate-200 rounded px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer min-w-[200px]"
                  value={selectedItemForStages}
                  onChange={(e) => setSelectedItemForStages(e.target.value)}
                >
                  {availableItems.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <ProcessFlow stages={displayStages} />
          </div>
        )}

        {activeTab === 'workorders' && (
          <div className="space-y-6">
            {detailedData.productionPlan && (
              <div className="bg-blue-600  rounded  p-2 text-white  flex items-center justify-between overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Cpu size={90} /></div>
                <div className="relative z-0">
                  <p className="text-[10px]  uppercase tracking-[0.2em] text-blue-200 mb-1">Production Planning</p>
                  <h3 className="text-xl text-white  m-0">{detailedData.productionPlan.plan_id}</h3>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1.5 text-xs  bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md">
                      <Clock size={12} /> {new Date(detailedData.productionPlan.plan_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs  bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-md ">
                      Status: {detailedData.productionPlan.status}
                    </span>
                  </div>
                </div>
                <div className="text-right relative z-0">
                  <p className="text-[10px]  uppercase tracking-[0.2em] text-blue-200 mb-1">Total Operations</p>
                  <p className="text-4xl text-white m-0">{detailedData.operations?.length || 0}</p>
                </div>
              </div>
            )}

            <div className="bg-white  rounded    border border-slate-200 overflow-hidden">
              <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-lg  text-slate-900 m-0">Manufacturing Work Orders</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Detailed tracking of item production status</p>
                </div>
                <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px]  text-slate-600 ">
                  {detailedData.workOrders?.length || 0} Orders
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-[10px]  text-slate-400 ">Work Order</th>
                      <th className="p-4 text-[10px]  text-slate-400 ">Item</th>
                      <th className="p-4 text-[10px]  text-slate-400  text-center">Qty</th>
                      <th className="p-4 text-[10px]  text-slate-400  text-center">Produced</th>
                      <th className="p-4 text-[10px]  text-slate-400 ">Status</th>
                      <th className="p-4 text-[10px]  text-slate-400 ">Target Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.workOrders?.length > 0 ? (
                      detailedData.workOrders.map((wo, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2">
                            <span className="text-xs  text-slate-900 group-hover:text-blue-600 transition-colors">{wo.wo_id}</span>
                            <div className="flex gap-2 mt-1">
                              {wo.bom_no && <span className="text-[9px]  text-slate-400 uppercase tracking-tighter">BOM: {wo.bom_no}</span>}
                            </div>
                          </td>
                          <td className="p-2">
                            <p className="text-xs  text-slate-700 m-0">{wo.item_name || wo.item_code}</p>
                            <p className="text-[10px]  text-slate-400 m-0 uppercase">{wo.item_code}</p>
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-xs  text-slate-900">{parseFloat(wo.quantity).toLocaleString()}</span>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-xs  ${wo.produced_qty >= wo.quantity ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {parseFloat(wo.produced_qty).toLocaleString()}
                              </span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className={`h-full ${wo.produced_qty >= wo.quantity ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                  style={{ width: `${Math.min(100, (wo.produced_qty / wo.quantity) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-[10px]   ${
                              wo.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                              wo.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                              'bg-slate-50 text-slate-500'
                            }`}>
                              {wo.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5 text-xs  text-slate-600">
                              <Clock size={12} className="text-slate-400" />
                              {wo.expected_delivery_date ? new Date(wo.expected_delivery_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center">
                          <ClipboardCheck size={40} className="text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 ">No Work Orders generated yet</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {detailedData.operations?.length > 0 && (
              <div className="bg-white  rounded    border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h4 className="text-xl  text-slate-900 m-0">Planned Operations</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Resource allocation from Production Plan</p>
                </div>
                <div className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-100">
                    {detailedData.operations.map((op, idx) => (
                      <div key={idx} className="bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px]  text-blue-600 uppercase tracking-[0.2em]">{op.operation_type || 'IN-HOUSE'}</span>
                          <span className="text-xs  text-slate-400">#{idx + 1}</span>
                        </div>
                        <h5 className="text-sm  text-slate-800 mb-1">{op.operation_name}</h5>
                        <div className="flex items-center gap-3 text-xs  text-slate-500 mb-4">
                          <span className="flex items-center gap-1"><Clock size={12} /> {Number(op.total_hours || 0).toFixed(1)} Hrs</span>
                          <span className="flex items-center gap-1"><Cpu size={12} /> {op.workstation_type || 'Manual'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                          <span className="text-[10px]  text-slate-400 uppercase">Cost Allocation</span>
                          <span className="text-xs  text-slate-900">₹{parseFloat(op.total_cost || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            {/* Stage-wise Progress Analysis (Matching Excel Visual - Consolidated - Light Theme) */}
            {detailedData.stages && detailedData.stages.length > 0 ? (
              <div className="bg-white p-6  rounded    border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-xl  text-slate-900 m-0 ">Global Production Tracking</h4>
                    <p className="text-blue-600 text-[10px]  uppercase tracking-[0.3em] mt-1">Consolidated Operation Progress Analysis</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#10b981] rounded-sm  " />
                      <span className="text-[10px]  text-slate-500 ">PLAN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#ef4444] rounded-sm  " />
                      <span className="text-[10px]  text-slate-500 ">ACTUAL</span>
                    </div>
                  </div>
                </div>

                <div className="h-[450px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={detailedData.stages} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="stage_name" 
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 800 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontSize: '10px',
                          fontWeight: 'bold'
                        }}
                        itemStyle={{ color: '#1e293b' }}
                      />
                      <Bar 
                        dataKey="planned_qty" 
                        name="PLAN" 
                        fill="#10b981" 
                        radius={[2, 2, 0, 0]}
                        barSize={30}
                      />
                      <Bar 
                        dataKey="produced_qty" 
                        name="ACTUAL" 
                        fill="#ef4444" 
                        radius={[2, 2, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Data Summary Table below chart */}
                <div className="mt-8 overflow-x-auto  border border-slate-100 bg-slate-50/50">
                  <table className="w-full text-center">
                    <thead className="bg-white">
                      <tr>
                        <th className="p-2 text-[9px]  text-slate-400  border-r border-slate-100">TYPE</th>
                        {detailedData.stages.map((s, i) => (
                          <th key={i} className="p-2 text-[9px]  text-slate-600  border-r border-slate-100">{s.stage_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="p-2 text-[10px]  text-emerald-600 border-r border-slate-100 bg-emerald-50/30">PLAN</td>
                        {detailedData.stages.map((s, i) => (
                          <td key={i} className="p-2 text-[10px]  text-slate-700 border-r border-slate-100">{s.planned_qty}</td>
                        ))}
                      </tr>
                      <tr className="border-t border-slate-100">
                        <td className="p-2 text-[10px]  text-rose-600 border-r border-slate-100 bg-rose-50/30">ACTUAL</td>
                        {detailedData.stages.map((s, i) => (
                          <td key={i} className="p-2 text-[10px]  text-slate-700 border-r border-slate-100">{s.produced_qty}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Production Log - Detailed History */}
                <div className="mt-12">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h5 className="text-xs  text-slate-900 ">Recent Production Logs</h5>
                    <span className="text-[10px]  text-slate-400">{detailedData.entries?.length || 0} Entries</span>
                  </div>
                  <div className="overflow-hidden  border border-slate-100 bg-white  ">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="p-3 text-[9px]  text-slate-400 ">ID</th>
                          <th className="p-3 text-[9px]  text-slate-400 ">Date</th>
                          <th className="p-3 text-[9px]  text-slate-400 ">Work Order</th>
                          <th className="p-3 text-[9px]  text-slate-400 ">Operation</th>
                          <th className="p-3 text-[9px]  text-slate-400  text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailedData.entries?.length > 0 ? (
                          detailedData.entries.slice().reverse().map((entry, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 text-[10px]  text-slate-600">{entry.pe_id}</td>
                              <td className="p-3 text-[10px]  text-slate-500">
                                {new Date(entry.entry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </td>
                              <td className="p-3 text-[10px]  text-slate-900">{entry.work_order_id}</td>
                              <td className="p-3 text-[10px]  text-blue-600 uppercase">{entry.operation}</td>
                              <td className="p-3 text-[10px]  text-slate-900 text-right">{entry.quantity_produced}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-[10px]  text-slate-400 uppercase">
                              No production entries logged yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            
          </div>
        )}

        {activeTab === 'supplychain' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Material Requests Section */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-lg text-slate-900 m-0 font-bold tracking-tight">Supply Chain Activity</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Status of procurement and internal material issues</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                    {detailedData.project?.material_requests?.length || 0} Requests
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">MR ID</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Dept</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Purpose</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-center">Items</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Request Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.project?.material_requests?.length > 0 ? (
                      detailedData.project.material_requests.map((mr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="text-xs font-bold text-slate-900">{mr.mr_id}</span>
                          </td>
                          <td className="p-4 text-xs text-slate-700 font-medium">{mr.department}</td>
                          <td className="p-4 text-xs text-slate-700 font-medium capitalize">{mr.purpose?.replace(/_/g, ' ')}</td>
                          <td className="p-4 text-center text-xs text-slate-900 font-bold">{mr.item_count}</td>
                          <td className="p-4">
                            <MaterialStatusBadge status={mr.status} />
                          </td>
                          <td className="p-4 text-xs text-slate-500 font-medium">
                            {new Date(mr.request_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center">
                          <ShoppingCart size={40} className="text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-medium">No material requests found for this project</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stock Movements Section */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-lg text-slate-900 m-0 font-bold tracking-tight">Stock Logistics</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Real-time inventory transfers and issues</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                    {detailedData.project?.stock_movements?.length || 0} Movements
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Transaction</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Item Details</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Type</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider text-right">Quantity</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Route (Source → Target)</th>
                      <th className="p-4 text-[10px] text-slate-400 uppercase font-bold tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.project?.stock_movements?.length > 0 ? (
                      detailedData.project.stock_movements.map((sm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <span className="text-xs font-bold text-slate-900">{sm.transaction_no}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">{sm.reference_name}</div>
                          </td>
                          <td className="p-4">
                            <p className="text-xs text-slate-900 m-0 font-bold">{sm.item_name || sm.item_code}</p>
                            <p className="text-[10px] text-slate-400 m-0 font-medium uppercase">{sm.item_code}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sm.movement_type === 'IN' ? 'bg-blue-50 text-blue-600' :
                              sm.movement_type === 'OUT' ? 'bg-rose-50 text-rose-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {sm.movement_type}
                            </span>
                          </td>
                          <td className="p-4 text-right text-xs font-bold text-slate-900">
                            {parseFloat(sm.quantity).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="font-bold text-slate-700 truncate max-w-[100px]">{sm.source_warehouse_name || 'EXTERNAL'}</span>
                              <ArrowRight size={10} className="text-slate-300" />
                              <span className="font-bold text-slate-700 truncate max-w-[100px]">{sm.target_warehouse_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <MaterialStatusBadge status={sm.status} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center">
                          <Boxes size={40} className="text-slate-200 mx-auto mb-3" />
                          <p className="text-slate-400 font-medium">No logistics transactions recorded</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materials' && (
          <div className="space-y-8">
            <div className="bg-white  rounded    border border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-amber-100  flex items-center justify-center text-amber-600   shadow-amber-200">
                  <Layers size={24} />
                </div>
                <div>
                  <h4 className="text-xl  text-slate-900 m-0">Resource & Component Readiness</h4>
                  <p className="text-slate-500 font-medium m-0">Tracking inventory requirements across all production stages</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-4 text-[10px]  text-slate-400 ">Item Details</th>
                      <th className="p-4 text-[10px]  text-slate-400  text-right">Required</th>
                      <th className="p-4 text-[10px]  text-slate-400  text-right">Consumed</th>
                      <th className="p-4 text-[10px]  text-slate-400  text-right">Available</th>
                      <th className="p-4 text-[10px]  text-slate-400  text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.materials?.length > 0 ? (
                      detailedData.materials.map((mat, idx) => {
                        const shortage = (parseFloat(mat.required_qty) - parseFloat(mat.consumed_qty)) > parseFloat(mat.stock_qty)
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <p className="text-xs  text-slate-900 m-0">{mat.item_name || mat.item_code}</p>
                              <p className="text-[10px]  text-slate-400 m-0 ">{mat.item_code}</p>
                            </td>
                            <td className="p-4 text-right">
                              <p className="text-xs  text-slate-900 m-0">{parseFloat(mat.required_qty).toLocaleString()} {mat.uom}</p>
                            </td>
                            <td className="p-4 text-right">
                              <p className="text-xs  text-slate-600 m-0">{parseFloat(mat.consumed_qty).toLocaleString()} {mat.uom}</p>
                            </td>
                            <td className="p-4 text-right">
                              <p className={`text-xs  m-0 ${!shortage ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {parseFloat(mat.stock_qty).toLocaleString()} {mat.uom}
                              </p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2 py-1 rounded-md text-[10px]  uppercase ${
                                !shortage ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                              }`}>
                                {!shortage ? 'Ready' : 'Shortage'}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-2 text-center">
                          <Zap size={48} className="text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-500 ">No Materials Allocated</p>
                          <p className="text-slate-400 text-xs font-medium">Material requirements are generated when a Production Plan is created or Work Orders are approved.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white  rounded    border border-slate-200 p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-blue-100  flex items-center justify-center text-blue-600   shadow-blue-200">
                  <Cpu size={24} />
                </div>
                <div>
                  <h4 className="text-xl  text-slate-900 m-0">Machine Efficiency</h4>
                  <p className="text-slate-500 font-medium m-0">Real-time utilization and downtime analysis</p>
                </div>
              </div>

              {detailedData.project?.machine_stats?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-4 text-[10px]  text-slate-400 ">Machine</th>
                        <th className="p-4 text-[10px]  text-slate-400  text-right">Working</th>
                        <th className="p-4 text-[10px]  text-slate-400  text-right">Downtime</th>
                        <th className="p-4 text-[10px]  text-slate-400  text-right">Efficiency</th>
                        <th className="p-4 text-[10px]  text-slate-400  text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailedData.project.machine_stats.map((machine, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <p className="text-xs  text-slate-900 m-0">{machine.machine_name}</p>
                            <p className="text-[10px]  text-slate-400 m-0 ">{machine.machine_id}</p>
                          </td>
                          <td className="p-4 text-right">
                            <p className="text-xs  text-slate-900 m-0">{(Number(machine.working_time || 0) / 60).toFixed(1)} hrs</p>
                          </td>
                          <td className="p-4 text-right">
                            <p className="text-xs  text-slate-900 m-0">{(Number(machine.downtime || 0) / 60).toFixed(1)} hrs</p>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs  ${machine.efficiency >= 85 ? 'text-emerald-600' : machine.efficiency >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {machine.efficiency}%
                              </span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${machine.efficiency >= 85 ? 'bg-emerald-500' : machine.efficiency >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${machine.efficiency}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-md text-[10px]  uppercase ${
                              machine.efficiency >= 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {machine.efficiency >= 85 ? 'Optimal' : 'Issues'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-20 bg-slate-50  rounded  border-2 border-dashed border-slate-200 text-center">
                  <Cpu size={48} className="text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 ">No Machine Data</p>
                  <p className="text-slate-400 text-xs font-medium">Machine utilization is tracked via Job Card logs.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
