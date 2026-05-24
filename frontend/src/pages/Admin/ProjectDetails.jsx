import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area } from 'recharts'
import { TrendingUp, Calendar, AlertCircle, Clock, CheckCircle, Truck, Package, LayoutGrid, ArrowUpRight, Layers, Zap, Cpu, ChevronLeft, ClipboardCheck, ArrowRight, ShoppingCart, Boxes, DollarSign, ChevronDown } from 'lucide-react'
import { getDetailedProjectAnalysis } from '../../services/adminService'
import { updateWorkOrder, updateProductionPlan } from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'

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
  const config = statusConfig[String(status || '').toLowerCase()] || statusConfig.draft
  const Icon = config.icon

  return (
    <div 
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
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
  const config = configs[String(status || '').toLowerCase()] || configs.pending
  return (
    <span className={`p-1 rounded border text-xs    ${config.color}`}>
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
              <span className="text-xs  bg-slate-100 text-slate-600 px-2 py-1 rounded">
                {columnStages.length}
              </span>
            </div>
            
            <div className={`flex-1 flex flex-col gap-2 p-3  rounded  border-2 border-dashed ${column.border} ${column.bg} transition-colors`}>
              {columnStages.map((stage, idx) => {
                const verifiedProgress = stage.planned_qty > 0 ? Math.round((stage.accepted_qty / stage.planned_qty) * 100) : 0;
                const producedProgress = stage.planned_qty > 0 ? Math.round((stage.produced_qty / stage.planned_qty) * 100) : 0;
                const yieldRate = stage.produced_qty > 0 ? Math.round((stage.accepted_qty / stage.produced_qty) * 100) : 0;
                
                return (
                  <div key={idx} className="bg-white p-2    border border-slate-200 hover: hover:border-blue-400 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs  text-slate-400  block mb-1">Stage {stage.sequence || idx + 1}</span>
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
                        <div className={`px-2 py-1 rounded-md text-xs  ${yieldRate >= 98 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {yieldRate}% Yield
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs  text-slate-500 mb-1.5">
                          <span>EXECUTION PROGRESS</span>
                          <span className="text-slate-900">{verifiedProgress}% / {producedProgress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded overflow-hidden relative">
                          {/* Produced (Gross) Progress - Light/Orange bar */}
                          <div 
                            className="h-full absolute left-0 top-0 bg-amber-200 transition-all duration-1000"
                            style={{ width: `${Math.min(producedProgress, 100)}%` }}
                          />
                          {/* Verified (Net) Progress - Darker/Blue or Green bar */}
                          <div 
                            className={`h-full absolute left-0 top-0 transition-all duration-1000 ${column.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${Math.min(verifiedProgress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400 mt-1 uppercase  tracking-tighter">
                          <span>Net: {stage.accepted_qty}</span>
                          <span>Gross: {stage.produced_qty}</span>
                          <span>Target: {stage.planned_qty}</span>
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
                            {Math.max(parseFloat(stage.rejected_qty || 0), parseFloat(stage.scrap_qty || 0))} Loss
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
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedItemForStages, setSelectedItemForStages] = useState('All Items')
  const [detailedData, setDetailedData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)

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

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const handleWorkOrderStatusChange = async (woId, newStatus) => {
    try {
      setUpdatingStatus(woId)
      const res = await updateWorkOrder(woId, { status: newStatus })
      if (res.success) {
        toast.success(`Work order ${woId} updated to ${newStatus}`)
        fetchData()
      } else {
        toast.error(res.message || 'Failed to update status')
      }
    } catch (err) {
      toast.error('Error updating work order status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleProjectStatusChange = async (newStatus) => {
    try {
      setUpdatingStatus(project.id)
      const res = await api.put(`/selling/sales-orders/${project.id}`, { status: newStatus })
      if (res.data.success) {
        toast.success(`Project ${project.id} updated to ${newStatus}`)
        fetchData()
      } else {
        toast.error(res.data.message || 'Failed to update status')
      }
    } catch (err) {
      toast.error('Error updating project status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleProductionPlanStatusChange = async (planId, newStatus) => {
    try {
      setUpdatingStatus(planId)
      const res = await updateProductionPlan(planId, { status: newStatus })
      if (res.success) {
        toast.success(`Production plan ${planId} updated to ${newStatus}`)
        fetchData()
      } else {
        toast.error(res.message || 'Failed to update status')
      }
    } catch (err) {
      toast.error('Error updating production plan status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded animate-spin mb-4" />
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
  const costing = project.costing || {}
  const progress = project.progress || 0
  
  const stages = detailedData.stages || []
  const entries = detailedData.entries || []
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

  // Aggregate daily production trend from chartData
  const getAggregatedTrend = () => {
    if (!detailedData?.chartData || detailedData.chartData.length === 0) return [];
    
    const aggregated = {};
    detailedData.chartData.forEach(item => {
      item.data.forEach(point => {
        if (!aggregated[point.date]) {
          aggregated[point.date] = { date: point.date, actual: 0, rejected: 0 };
        }
        aggregated[point.date].actual += point.actual;
        aggregated[point.date].rejected += (point.rejected || 0);
      });
    });
    
    return Object.values(aggregated).sort((a, b) => {
      // Simple date sort (assuming DD MMM format from backend)
      return new Date(a.date) - new Date(b.date);
    });
  };

  const trendData = getAggregatedTrend();

  return (
    <div className="p-4">
      {/* Header */}
      <div className=" md:flex-row md:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/admin/project-analysis')}
            className="p-2 bg-white border border-slate-200 rounded  text-slate-500 hover:text-blue-600 hover:border-blue-100 transition-all  "
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-md  text-slate-900 m-0">{project.project_name || project.name || 'Untitled Project'}</h1>
              <div className="relative group">
                <select 
                  className={`appearance-none inline-flex items-center gap-1.5 px-2 py-1 pr-6 rounded text-xs font-medium border cursor-pointer transition-all outline-none ${
                    project.status === 'complete' || project.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    project.status === 'under_production' || project.status === 'production' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    project.status === 'on_hold' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                  value={project.status || 'draft'}
                  onChange={(e) => handleProjectStatusChange(e.target.value)}
                  disabled={updatingStatus === project.id}
                >
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key} className="text-slate-900">{config.label}</option>
                  ))}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <ChevronDown size={10} />
                </div>
              </div>
            </div>
            <p className="text-slate-500 font-medium m-0 flex flex-wrap gap-x-4 gap-y-1">
              <span>Customer: <span className="text-slate-900">{project.customer_name || 'Generic Customer'}</span></span>
              <span>Project ID: <span className="text-slate-900">{project.id || 'N/A'}</span></span>
              {project.finished_goods && (
                <span>Finished Goods: <span className="text-slate-900">{project.finished_goods}</span></span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-5 p-1 bg-slate-100 rounded border border-slate-200 justify-between">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutGrid },
            { id: 'stages', label: 'Production Flow', icon: TrendingUp },
            { id: 'workorders', label: 'Work Orders', icon: ClipboardCheck },
            { id: 'costing', label: 'Project Costing', icon: DollarSign },
            { id: 'logistics', label: 'Logistics', icon: Truck },
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
              
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="col-span-3   space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                <div className="bg-white p-2  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400  mb-4  ">Completion</p>
                  <div className="flex items-end justify-between mb-2">
                    <h3 className="text-xl  text-slate-900">{progress}%</h3>
                    <TrendingUp size={15} className="text-emerald-500 mb-2" />
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                
                <div className="bg-white p-2  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400  mb-4  ">Sales Order Price</p>
                  <h3 className="text-xl  text-slate-900">₹{parseFloat(costing.sales_price || project.grand_total || 0).toLocaleString()}</h3>
                  <p className="text-emerald-600 text-xs  mt-2 flex items-center gap-1 ">
                    Net: ₹{parseFloat(costing.net_sales || project.revenue || 0).toLocaleString()}
                  </p>
                </div>

                <div className="bg-white p-2  rounded    border border-slate-200 hover: transition-shadow text-rose-600">
                  <p className="text-xs text-slate-400  mb-4  ">Downtime Loss</p>
                  <h3 className="text-xl ">
                    {Math.round((project.total_downtime_minutes || 0) / 60)} Hrs
                  </h3>
                  <p className="text-rose-400 text-xs  mt-2 ">Operational Delay</p>
                </div>

                <div className="bg-white p-2  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400  mb-4  ">Production Loss</p>
                  <h3 className="text-xl  text-rose-600">₹{parseFloat(project.loss_valuation?.total_loss_value || 0).toLocaleString()}</h3>
                  <p className="text-slate-500 text-xs  mt-2 ">Scrap + Rejection</p>
                </div>

                <div className="bg-white p-2  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400  mb-4  ">Cost/Budget</p>
                  <h3 className={`text-xl  ${costing.actual?.total > costing.planned?.total ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {costing.planned?.total > 0 ? Math.round((costing.actual?.total / costing.planned?.total) * 100) : 0}%
                  </h3>
                  <p className="text-slate-500 text-xs  mt-2 ">Efficiency Factor</p>
                </div>

                <div className="bg-white p-2  rounded    border border-slate-200 hover: transition-shadow">
                  <p className="text-xs text-slate-400  mb-4  ">Inventory</p>
                  <h3 className="text-xl  text-slate-900">{detailedData.project?.material_requests?.length || 0}</h3>
                  <p className="text-blue-600 text-xs  mt-2 ">MR Transactions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <h4 className="text-sm  text-slate-900 mb-6 ">Supply Chain Health</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs  mb-2">
                        <span className="text-slate-500 ">Material Requests</span>
                        <span className="text-slate-900">{detailedData.project?.material_requests?.filter(mr => mr.status === 'approved' || mr.status === 'completed').length || 0} / {detailedData.project?.material_requests?.length || 0} Approved</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(detailedData.project?.material_requests?.length > 0 ? (detailedData.project.material_requests.filter(mr => mr.status === 'approved' || mr.status === 'completed').length / detailedData.project.material_requests.length) * 100 : 0)}%` }} 
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs  mb-2">
                        <span className="text-slate-500 ">Stock Logistics</span>
                        <span className="text-slate-900">{detailedData.project?.stock_movements?.length || 0} Transactions</span>
                      </div>
                      <div className="flex gap-1">
                        {detailedData.project?.stock_movements?.slice(0, 10).map((sm, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded ${sm.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-400'}`} title={sm.transaction_no} />
                        ))}
                        {(!detailedData.project?.stock_movements || detailedData.project.stock_movements.length === 0) && (
                          <div className="h-1.5 w-full bg-slate-100 rounded" />
                        )}
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center">
                          <ShoppingCart size={15} />
                        </div>
                        <div>
                          <p className="text-xs  text-slate-400  leading-none mb-1">Last Request</p>
                          <p className="text-xs  text-slate-700 m-0">
                            {detailedData.project?.material_requests?.[0]?.mr_id || 'No requests yet'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveTab('supplychain')}
                        className="text-blue-600 text-xs  flex items-center gap-1 hover:underline"
                      >
                        View Details <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200">
                  <h4 className="text-sm  text-slate-900 mb-2 ">Machine Utilization</h4>
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
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <p className="text-xs  text-slate-400  mb-1">Active</p>
                        <p className="text-sm  text-slate-700">{detailedData.project?.machine_stats?.length || 0}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div className="text-center">
                        <p className="text-xs  text-slate-400  mb-1">Avg Eff.</p>
                        <p className="text-sm  text-slate-700">
                          {Math.round((detailedData.project?.machine_stats?.reduce((acc, m) => acc + m.efficiency, 0) || 0) / (detailedData.project?.machine_stats?.length || 1))}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-2 rounded  border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm  text-slate-900">Verified Progress by Stage</h4>
                  <div className="flex items-center gap-6 text-xs ">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500" /> Verified Stage Output</div>
                  </div>
                </div>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stages.slice(0, 8)} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="stage_name" 
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="accepted_qty" 
                        name="Verified Output" 
                        fill="#3b82f6" 
                        radius={[4, 4, 0, 0]}
                        barSize={40}
                      />
                    </BarChart>
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
                    <p className="text-slate-400 text-xs   mb-1">Estimated Delivery</p>
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
                    <p className="text-xs  text-slate-400 ">Key Milestones</p>
                    <div className="space-y-4">
                      {[
                        { label: 'Project Kickoff', date: orderDate, completed: true },
                        { label: 'Production Start', date: stages[0]?.start_date || orderDate, completed: stages.some(s => s.status !== 'pending') },
                        { label: 'Target Delivery', date: dueDate, completed: project.status === 'delivered' }
                      ].map((milestone, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded ${milestone.completed ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                          <div>
                            <p className="text-xs  m-0">{milestone.label}</p>
                            <p className="text-xs text-slate-400 m-0">{milestone.date ? new Date(milestone.date).toLocaleDateString() : 'TBD'}</p>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between p-2 rounded  gap-2">
              <div>
                <h4 className="text-lg  text-slate-900 m-0 ">Production Workflow Analysis</h4>
                <p className="text-xs text-slate-500 font-medium mt-1  ">Status of operations across all manufacturing phases</p>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded  border border-slate-200">
                <span className="text-xs  text-slate-400  tracking-widest pl-2">Filter Item:</span>
                <select 
                  className="bg-white border border-slate-200 rounded p-1 text-xs  text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer min-w-[200px]"
                  value={selectedItemForStages}
                  onChange={(e) => setSelectedItemForStages(e.target.value)}
                >
                  {availableItems.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>
            
            <ProcessFlow stages={displayStages} />

            {/* Stage-wise Progress Analysis Chart */}
            {displayStages && displayStages.length > 0 && (
              <div className="bg-white p-6 rounded border border-slate-200 mt-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-lg  text-slate-900 m-0">Global Production Tracking</h4>
                    <p className="text-slate-500 text-xs mt-1">Consolidated Operation Progress Analysis</p>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#10b981] rounded " />
                      <span className="text-xs  text-slate-500">PLAN</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-[#ef4444] rounded " />
                      <span className="text-xs  text-slate-500">ACTUAL</span>
                    </div>
                  </div>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={displayStages} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="stage_name" 
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="planned_qty" 
                        name="PLAN" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                      <Bar 
                        dataKey="accepted_qty" 
                        name="ACTUAL" 
                        fill="#ef4444" 
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Data Summary Table */}
                <div className="mt-8 rounded border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-3 text-xs  text-slate-400 border-r border-slate-100 w-32 uppercase tracking-wider">TYPE</th>
                        {displayStages.map((s, i) => (
                          <th key={i} className="p-3 text-xs  text-slate-400 text-center border-r border-slate-100 uppercase tracking-wider">{s.stage_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100 hover:bg-slate-50/30">
                        <td className="p-3 text-xs  text-emerald-600 border-r border-slate-100">PLAN</td>
                        {displayStages.map((s, i) => (
                          <td key={i} className="p-3 text-xs text-slate-700 text-center border-r border-slate-100">{s.planned_qty}</td>
                        ))}
                      </tr>
                      <tr className="border-t border-slate-100 hover:bg-slate-50/30">
                        <td className="p-3 text-xs  text-rose-600 border-r border-slate-100">ACTUAL</td>
                        {displayStages.map((s, i) => (
                          <td key={i} className="p-3 text-xs text-slate-700 text-center border-r border-slate-100">{s.accepted_qty}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'workorders' && (
          <div className="space-y-6">
            {detailedData.productionPlan && (
              <div className="bg-blue-600  rounded  p-2 text-white  flex items-center justify-between overflow-hidden relative">
                <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Cpu size={90} /></div>
                <div className="relative z-0">
                  <p className="text-xs  text-blue-200 mb-1">Production Planning</p>
                  <h3 className="text-sm text-white  m-0">{detailedData.productionPlan.plan_id}</h3>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="flex items-center gap-1.5 text-xs  bg-white/20 px-2 py-1 rounded backdrop-blur-md">
                      <Clock size={12} /> {new Date(detailedData.productionPlan.plan_date).toLocaleDateString()}
                    </span>
                    <div className="relative group">
                      <select 
                        className="appearance-none flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded backdrop-blur-md border-none text-white cursor-pointer transition-all outline-none"
                        value={detailedData.productionPlan.status || 'draft'}
                        onChange={(e) => handleProductionPlanStatusChange(detailedData.productionPlan.plan_id, e.target.value)}
                        disabled={updatingStatus === detailedData.productionPlan.plan_id}
                      >
                        <option value="draft" className="text-slate-900">Draft</option>
                        <option value="in_progress" className="text-slate-900">In Progress</option>
                        <option value="completed" className="text-slate-900">Completed</option>
                        <option value="cancelled" className="text-slate-900">Cancelled</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDown size={10} className="text-white/70" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right relative z-0">
                  <p className="text-xs text-blue-200 mb-1">Total Operations</p>
                  <p className="text-xl text-white m-0">{detailedData.operations?.length || 0}</p>
                </div>
              </div>
            )}

            <div className="bg-white  rounded    border border-slate-200 overflow-hidden">
              <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm  text-slate-900 m-0">Manufacturing Work Orders</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Detailed tracking of item production status</p>
                </div>
                <div className="p-2 bg-slate-100 rounded text-xs  text-slate-600 ">
                  {detailedData.workOrders?.length || 0} Orders
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-2 text-xs  text-slate-400 ">Work Order</th>
                      <th className="p-2 text-xs  text-slate-400 ">Item</th>
                      <th className="p-2 text-xs  text-slate-400  text-center">Qty</th>
                      <th className="p-2 text-xs  text-slate-400  text-center">Produced</th>
                      <th className="p-2 text-xs  text-slate-400  text-center">BOM Price</th>
                      <th className="p-2 text-xs  text-slate-400 ">Status</th>
                      <th className="p-2 text-xs  text-slate-400 ">Target Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.workOrders?.length > 0 ? (
                      detailedData.workOrders.map((wo, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2">
                            <span className="text-xs  text-slate-900 group-hover:text-blue-600 transition-colors">{wo.wo_id}</span>
                            <div className="flex gap-2 mt-1">
                              {wo.bom_no && <span className="text-[9px]  text-slate-400  er">BOM: {wo.bom_no}</span>}
                            </div>
                          </td>
                          <td className="p-2">
                            <p className="text-xs  text-slate-700 m-0">{wo.item_name || wo.item_code}</p>
                            <p className="text-xs  text-slate-400 m-0 ">{wo.item_code}</p>
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-xs  text-slate-900">{parseFloat(wo.quantity).toLocaleString()}</span>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-col items-center">
                              <span className={`text-xs  ${wo.produced_qty >= wo.quantity ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {parseFloat(wo.produced_qty).toLocaleString()}
                              </span>
                              <div className="w-12 h-1 bg-slate-100 rounded mt-1 overflow-hidden">
                                <div 
                                  className={`h-full ${wo.produced_qty >= wo.quantity ? 'bg-emerald-500' : 'bg-blue-600'}`} 
                                  style={{ width: `${Math.min(100, (wo.produced_qty / wo.quantity) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <span className="text-xs  text-emerald-600 font-bold">₹{parseFloat(wo.bom_price || 0).toLocaleString()}</span>
                          </td>
                          <td className="p-2">
                            <div className="relative inline-block">
                              <select 
                                className={`appearance-none px-2 py-1 pr-6 rounded text-[10px] font-medium cursor-pointer transition-all border outline-none ${
                                  String(wo.status || '').toLowerCase().replace(/_/g, ' ') === 'completed' || String(wo.status || '').toLowerCase().replace(/_/g, ' ') === 'complete' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  String(wo.status || '').toLowerCase().replace(/_/g, ' ') === 'in progress' || String(wo.status || '').toLowerCase().replace(/_/g, ' ') === 'under production' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                  'bg-slate-50 text-slate-500 border-slate-100'
                                }`}
                                value={wo.status || 'Draft'}
                                onChange={(e) => handleWorkOrderStatusChange(wo.wo_id, e.target.value)}
                                disabled={updatingStatus === wo.wo_id}
                              >
                                <option value="Draft">Draft</option>
                                <option value="Ready">Ready</option>
                                <option value="Approved">Approved</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                <ChevronDown size={8} />
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1.5 text-xs  text-slate-600">
                              <Clock size={12} className="text-slate-400" />
                              {wo.expected_delivery_date ? new Date(wo.expected_delivery_date).toLocaleDateString() : 
                               (wo.required_date ? new Date(wo.required_date).toLocaleDateString() : 'N/A')}
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
                    {detailedData.operations.map((op, idx) => {
                      const doneQty = parseFloat(op.done_qty || 0);
                      const totalQty = parseFloat(op.total_jc_qty || 0);
                      const progress = totalQty > 0 ? (doneQty / totalQty) * 100 : 0;
                      const doneCost = (progress / 100) * parseFloat(op.total_cost || 0);
                      const remainingCost = parseFloat(op.total_cost || 0) - doneCost;

                      return (
                        <div key={idx} className="bg-white p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{op.operation_type || 'IN-HOUSE'}</span>
                            <span className="text-[10px] font-medium text-slate-400">STAGE #{idx + 1}</span>
                          </div>
                          
                          <h5 className="text-sm font-bold text-slate-800 mb-1">{op.operation_name}</h5>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400">Planned Time</span>
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Clock size={12} className="text-blue-500" />
                                {Number(op.total_hours || 0).toFixed(1)} Hrs
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400">Workstation</span>
                              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                <Cpu size={12} className="text-emerald-500" />
                                {op.workstation_type || 'Manual'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400">Cycle Time</span>
                              <span className="text-xs font-semibold text-slate-600">{op.cycle_time || 0} min/unit</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400">Setup Time</span>
                              <span className="text-xs font-semibold text-slate-600">{op.setup_time || 0} min</span>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-medium text-slate-500 uppercase">Progress</span>
                              <span className="text-[10px] font-bold text-slate-900">{doneQty.toLocaleString()} / {totalQty.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="space-y-2 pt-3 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-medium">Planned Total Cost</span>
                              <span className="text-xs font-bold text-slate-900 font-mono">₹{parseFloat(op.total_cost || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-emerald-600">
                              <span className="text-[10px] font-medium">Done Cost</span>
                              <span className="text-xs font-bold font-mono">₹{doneCost.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-rose-500">
                              <span className="text-[10px] font-medium">Remaining</span>
                              <span className="text-xs font-bold font-mono">₹{remainingCost.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'costing' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-2 rounded border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded -mr-12 -mt-12 blur-2xl"></div>
                <p className="text-xs  text-slate-400  mb-1">Total Project Revenue</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl  text-slate-900">₹{parseFloat(project.revenue || 0).toLocaleString()}</h3>
                  <span className="text-xs text-slate-500 font-medium">SO Total</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="p-1 bg-blue-50 text-blue-600 rounded text-xs ">REVENUE TARGET</div>
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded -mr-12 -mt-12 blur-2xl"></div>
                <p className="text-xs  text-slate-400  mb-1">Actual Direct Cost</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl  text-rose-600">₹{parseFloat(costing.actual?.total || 0).toLocaleString()}</h3>
                  <span className="text-xs text-slate-500 font-medium">Live Consumption</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${costing.actual?.total > costing.planned?.total ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, (costing.actual?.total / (project.revenue || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-2 rounded border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded -mr-12 -mt-12 blur-2xl"></div>
                <p className="text-xs  text-slate-400  mb-1">Estimated Gross Profit</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl  text-emerald-600">
                    ₹{parseFloat((project.revenue || 0) - (costing.actual?.total || 0)).toLocaleString()}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">Margin: {Math.round(((project.revenue - costing.actual?.total) / (project.revenue || 1)) * 100)}%</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <div className="p-1 bg-emerald-50 text-emerald-600 rounded text-xs ">REAL-TIME PROFITABILITY</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h4 className="text-lg  text-slate-900 m-0">Planned vs Actual Costing</h4>
                    <p className="text-slate-500 text-xs mt-1">Variance analysis across primary cost centers</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[
                        { name: 'Materials', planned: costing.planned?.materials || 0, actual: costing.actual?.materials || 0 },
                        { name: 'Operations', planned: costing.planned?.operations || 0, actual: costing.actual?.operations || 0 },
                        { name: 'Subcontract', planned: 0, actual: costing.actual?.subcontract || 0 }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                      <Bar dataKey="planned" name="BOM Planned Cost" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                      <Bar dataKey="actual" name="Actual Production Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded border border-slate-200">
                <h4 className="text-lg  text-slate-900 mb-6">Financial Variance Audit</h4>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs  text-slate-400 uppercase mb-1">Material Variance</p>
                      <p className="text-sm  text-slate-800">₹{parseFloat((costing.actual?.materials || 0) - (costing.planned?.materials || 0)).toLocaleString()}</p>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs  ${(costing.actual?.materials || 0) > (costing.planned?.materials || 0) ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {Math.round(((costing.actual?.materials - costing.planned?.materials) / (costing.planned?.materials || 1)) * 100)}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${Math.min(100, ((costing.actual?.materials || 0) / (costing.planned?.materials || 1)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-8">
                    <div>
                      <p className="text-xs  text-slate-400 uppercase mb-1">Operational Efficiency Impact</p>
                      <p className="text-sm  text-slate-800">₹{parseFloat((costing.actual?.operations || 0) - (costing.planned?.operations || 0)).toLocaleString()}</p>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs  ${(costing.actual?.operations || 0) > (costing.planned?.operations || 0) ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {Math.round(((costing.actual?.operations - costing.planned?.operations) / (costing.planned?.operations || 1)) * 100)}%
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500"
                      style={{ width: `${Math.min(100, ((costing.actual?.operations || 0) / (costing.planned?.operations || 1)) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="mt-8 p-4 bg-slate-50 border border-slate-100 rounded">
                    <div className="flex items-center gap-3 text-slate-600">
                      <TrendingUp size={16} />
                      <p className="text-xs leading-relaxed font-medium m-0">
                        The project is currently seeing a <span className=" text-slate-900">{costing.variance_percentage > 0 ? 'cost overrun' : 'saving'} of ₹{Math.abs(Math.round(costing.variance)).toLocaleString()}</span> compared to the original BOM estimate. 
                        {costing.actual?.subcontract > 0 && ` Subcontracting costs (₹${parseFloat(costing.actual.subcontract).toLocaleString()}) contribute significantly to the actual expenditure.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded border border-slate-200">
                <h4 className="text-lg  text-slate-900 mb-6">Operational Loss & Downtime Audit</h4>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs  text-slate-400 uppercase mb-1">Scrap & Rejection Loss</p>
                      <p className="text-sm  text-slate-800">{totalLoss.toLocaleString()} Units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs  text-slate-400 uppercase mb-1">Value Impact</p>
                      <p className="text-sm  text-rose-600">₹{parseFloat(project.loss_valuation?.total_loss_value || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500"
                      style={{ width: `${Math.min(100, (totalLoss / (totalProduced || 1)) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-8">
                    <div>
                      <p className="text-xs  text-slate-400 uppercase mb-1">Machine Downtime</p>
                      <p className="text-sm  text-slate-800">
                        {Math.round((project.total_downtime_minutes || 0) / 60)} Hours
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs  text-slate-400 uppercase mb-1">OEE Impact</p>
                      <p className="text-sm  text-amber-600">
                        -{100 - efficiency}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500"
                      style={{ width: `${100 - efficiency}%` }}
                    />
                  </div>

                  {project.downtime_details?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-50">
                      <p className="text-xs  text-slate-400 uppercase mb-3 tracking-widest">Downtime Incidents</p>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                        {project.downtime_details.map((dt, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-xs  text-slate-700">{dt.machine_name || dt.machine_id}</span>
                              <span className="text-[9px] text-slate-500">{new Date(dt.entry_date || dt.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className="text-xs  text-rose-600">{dt.downtime_minutes} min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded border border-slate-200">
                <h4 className="text-lg  text-slate-900 mb-4">Strategic Insights</h4>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded flex gap-4">
                    <Zap className="text-blue-600 shrink-0" />
                    <div>
                      <p className="text-xs  text-blue-900 mb-1">Cost Optimization Path</p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {costing.actual?.operations > costing.planned?.operations 
                          ? "Operational costs are higher than planned. Review cycle times and machine assignment to improve throughput."
                          : "Production efficiency is within planned parameters. Focus on material yield optimization to further increase margin."}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded flex gap-4">
                    <TrendingUp className="text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs  text-emerald-900 mb-1">Profitability Outlook</p>
                      <p className="text-xs text-emerald-700 leading-relaxed">
                        Current gross margin is {Math.round(((project.revenue - costing.actual?.total) / (project.revenue || 1)) * 100)}%. 
                        Target margin was {Math.round(((project.revenue - costing.planned?.total) / (project.revenue || 1)) * 100)}%.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Order Detailed Pricing */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden mb-8">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h4 className="text-sm  text-slate-900 m-0">Sales Order Commercials</h4>
                  <p className="text-xs text-slate-500 mt-1">Item-wise revenue breakdown from Sales Order</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs  text-slate-900">Total SO Value: ₹{parseFloat(costing.sales_price || project.grand_total || 0).toLocaleString()}</span>
                  <span className="text-xs text-slate-400">Net Revenue: ₹{parseFloat(costing.net_sales || project.revenue || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white border-b border-slate-100">
                    <tr>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Item Details</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Order Qty</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Unit Rate</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {project.sales_order_items?.length > 0 ? (
                      project.sales_order_items.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            <p className="text-xs  text-slate-900 m-0">{item.item_name || item.item_code}</p>
                            <p className="text-xs text-slate-400 m-0">{item.item_code}</p>
                          </td>
                          <td className="p-3 text-xs text-slate-900 text-right font-medium">{parseFloat(item.qty || 0).toLocaleString()} {item.uom}</td>
                          <td className="p-3 text-xs text-slate-600 text-right">₹{parseFloat(item.rate || 0).toLocaleString()}</td>
                          <td className="p-3 text-xs  text-blue-600 text-right">₹{parseFloat(item.amount || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 italic">No itemized sales data found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 overflow-hidden mb-8">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm  text-slate-900 m-0">Subcontracting (Challan) Costs</h4>
                  <p className="text-xs text-slate-500 mt-1">Direct expenditure for outsourced manufacturing operations</p>
                </div>
                <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded text-xs ">
                  Total: ₹{parseFloat(costing.actual?.subcontract || 0).toLocaleString()}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Challan #</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Vendor</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Operation</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Rate</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {project.subcontract_costs?.length > 0 ? (
                      project.subcontract_costs.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-xs  text-blue-600">{c.challan_number}</td>
                          <td className="p-3 text-xs text-slate-600">{c.supplier_name || c.supplier_id}</td>
                          <td className="p-3">
                            <span className="p-1 bg-slate-100 text-slate-600 rounded text-xs  uppercase tracking-tight">{c.operation}</span>
                          </td>
                          <td className="p-3 text-xs text-slate-900 text-right">{parseFloat(c.quantity_received || 0).toLocaleString()}</td>
                          <td className="p-3 text-xs text-slate-500 text-right">₹{parseFloat(c.rate || 0).toLocaleString()}</td>
                          <td className="p-3 text-xs  text-slate-900 text-right">₹{parseFloat(c.total_cost || 0).toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="p-12 text-center">
                          <p className="text-slate-400 font-medium italic">No subcontracting costs recorded for this project</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Outsourced Production Registry */}
            {project.outsourced_entries?.length > 0 && (
              <div className="bg-white rounded border border-slate-200 overflow-hidden mb-8 shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/30">
                  <div>
                    <h4 className="text-sm  text-amber-900 m-0">Outsourced Production Registry</h4>
                    <p className="text-xs text-amber-700 mt-1">Verified output from external manufacturing partners</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white border-b border-slate-100">
                      <tr>
                        <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Entry ID</th>
                        <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Operation</th>
                        <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Vendor / Challan</th>
                        <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Accepted Qty</th>
                        <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Rejections</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {project.outsourced_entries.map((entry, i) => (
                        <tr key={i} className="hover:bg-amber-50/20 transition-colors">
                          <td className="p-3 text-xs text-slate-600">{entry.entry_id}</td>
                          <td className="p-3 text-xs  text-slate-800">{entry.operation}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="text-xs text-slate-700">{entry.supplier_name || 'Assigned Partner'}</span>
                              <span className="text-xs text-blue-600 font-medium">{entry.challan_number || 'Internal Process'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-emerald-600  text-right">{parseFloat(entry.accepted_quantity).toLocaleString()}</td>
                          <td className="p-3 text-xs text-rose-600 text-right">{parseFloat(entry.quantity_rejected).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            {/* Main KPI Row for History */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded border border-slate-200">
                <p className="text-xs text-slate-400  tracking-wider uppercase mb-1">Overall Plan</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl  text-slate-900">{stages.reduce((acc, s) => acc + s.planned_qty, 0)}</h3>
                  <span className="text-xs text-slate-500">Units</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200">
                <p className="text-xs text-slate-400  tracking-wider uppercase mb-1">Overall Actual</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl  text-blue-600">{stages.reduce((acc, s) => acc + s.accepted_qty, 0)}</h3>
                  <span className="text-xs text-slate-500">Units</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200">
                <p className="text-xs text-slate-400  tracking-wider uppercase mb-1">Production Yield</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl  text-emerald-600">{yieldRate}%</h3>
                  <TrendingUp size={15} className="text-emerald-500" />
                </div>
              </div>
              <div className="bg-white p-4 rounded border border-slate-200">
                <p className="text-xs text-slate-400  tracking-wider uppercase mb-1">Process Loss</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl  text-rose-600">{totalLoss}</h3>
                  <span className="text-xs text-slate-500">Units</span>
                </div>
              </div>
            </div>

            {/* Daily Production Trend Chart */}
            {trendData.length > 0 && (
              <div className="bg-white p-6 rounded border border-slate-200">
                <div className="mb-6">
                  <h4 className="text-lg  text-slate-900 m-0">Production Velocity</h4>
                  <p className="text-slate-500 text-xs mt-1">Daily trend of verified production output across all stages</p>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                      <Area 
                        type="monotone" 
                        dataKey="actual" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorActual)" 
                        name="Verified Output"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="rejected" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorRejected)" 
                        name="Rejected Units"
                        strokeDasharray="5 5"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Production Log - Detailed History */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm  text-slate-900 m-0">Recent Production Logs</h4>
                  <p className="text-xs text-slate-500 mt-1">Audit log of all production transactions</p>
                </div>
                <span className="px-2 py-1 bg-slate-100 rounded text-xs  text-slate-500">{detailedData.entries?.length || 0} Records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Work Order</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider">Operation</th>
                      <th className="p-3 text-xs  text-slate-400 uppercase tracking-wider text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.entries?.length > 0 ? (
                      detailedData.entries.slice().reverse().map((entry, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-xs font-medium text-slate-600">{entry.pe_id || entry.entry_id}</td>
                          <td className="p-3 text-xs text-slate-500">
                            {new Date(entry.entry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3 text-xs  text-slate-900">{entry.work_order_id}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs ">{entry.operation}</span>
                          </td>
                          <td className="p-3 text-xs  text-slate-900 text-right">{entry.quantity_produced}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="p-12 text-center">
                          <div className="flex flex-col items-center">
                            <Clock size={40} className="text-slate-200 mb-2" />
                            <p className="text-slate-400 font-medium">No production history logged yet</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logistics' && (
          <div className="space-y-6">
            <div className="bg-indigo-600  rounded  p-2 text-white  flex items-center justify-between overflow-hidden relative">
              <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12"><Truck size={90} /></div>
              <div className="relative z-0">
                <p className="text-xs  text-indigo-200 mb-1">Logistics & Delivery</p>
                <h3 className="text-sm text-white  m-0">Shipment Status for Project {project.id}</h3>
              </div>
              <div className="text-right relative z-0">
                <p className="text-xs text-indigo-200 mb-1">Total Dispatched</p>
                <p className="text-lg text-white m-0">
                  {project.job_card_shipments?.reduce((sum, s) => sum + parseFloat(s.accepted_quantity || 0), 0).toLocaleString() || 0} Units
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-sm  text-slate-900 m-0 font-semibold flex items-center gap-2">
                    <Truck size={15} className="text-indigo-600" /> Dispatch Events (Production)
                  </h4>
                </div>
                <div className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-400">
                        <th className="p-3">Job Card</th>
                        <th className="p-3">Operation</th>
                        <th className="p-3">Carrier / Tracking</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {project.job_card_shipments?.length > 0 ? project.job_card_shipments.map((s, i) => (
                        <tr key={i} className="text-xs hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-700">{s.job_card_id}</td>
                          <td className="p-3 text-slate-600">{s.operation}</td>
                          <td className="p-3 text-slate-600">
                            <div className="font-medium">{s.carrier_name || 'N/A'}</div>
                            {s.tracking_number && <div className="text-xs text-slate-400">Track: {s.tracking_number}</div>}
                          </td>
                          <td className="p-3 font-semibold text-indigo-600">{parseFloat(s.accepted_quantity).toLocaleString()}</td>
                          <td className="p-3">
                            <span className={`p-1 rounded text-xs ${s.is_partial ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {s.is_partial ? 'Partial' : 'Full'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="5" className="p-8 text-center text-slate-400 italic">No production dispatch logs found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white rounded border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h4 className="text-sm  text-slate-900 m-0 font-semibold flex items-center gap-2">
                    <Package size={15} className="text-blue-600" /> Delivery Challans / Official Orders
                  </h4>
                </div>
                <div className="p-0">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-xs text-slate-400">
                        <th className="p-3">Dispatch ID</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Carrier / Tracking</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {project.dispatches?.length > 0 ? project.dispatches.map((d, i) => (
                        <tr key={i} className="text-xs hover:bg-slate-50">
                          <td className="p-3 font-medium text-blue-600">{d.dispatch_id}</td>
                          <td className="p-3 text-slate-600">{new Date(d.dispatch_date).toLocaleDateString()}</td>
                          <td className="p-3 text-slate-600">
                            <div className="font-medium">{d.carrier || 'N/A'}</div>
                            {d.tracking_number && <div className="text-xs text-slate-400">Track: {d.tracking_number}</div>}
                          </td>
                          <td className="p-3">
                            <span className={`p-1 rounded text-xs ${
                              d.status === 'shipped' ? 'bg-blue-50 text-blue-600' : 
                              d.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 
                              'bg-slate-50 text-slate-500'
                            }`}>{d.status}</span>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No formal dispatch orders found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'supplychain' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Material Requests Section */}
            <div className="bg-white rounded border border-slate-200 overflow-hidden">
              <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm text-slate-900 m-0  ">Supply Chain Activity</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Status of procurement and internal material issues</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded text-xs ">
                    {detailedData.project?.material_requests?.length || 0} Requests
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-2 text-xs text-slate-400   ">MR ID</th>
                      <th className="p-2 text-xs text-slate-400   ">Dept</th>
                      <th className="p-2 text-xs text-slate-400   ">Purpose</th>
                      <th className="p-2 text-xs text-slate-400    text-center">Items</th>
                      <th className="p-2 text-xs text-slate-400   ">Status</th>
                      <th className="p-2 text-xs text-slate-400   ">Request Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.project?.material_requests?.length > 0 ? (
                      detailedData.project.material_requests.map((mr, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2">
                            <span className="text-xs  text-slate-900">{mr.mr_id}</span>
                          </td>
                          <td className="p-2 text-xs text-slate-700 font-medium">{mr.department}</td>
                          <td className="p-2 text-xs text-slate-700 font-medium capitalize">{mr.purpose?.replace(/_/g, ' ')}</td>
                          <td className="p-2 text-center text-xs text-slate-900 ">{mr.item_count}</td>
                          <td className="p-2">
                            <MaterialStatusBadge status={mr.status} />
                          </td>
                          <td className="p-2 text-xs text-slate-500 font-medium">
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
              <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm text-slate-900 m-0  ">Stock Logistics</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">Real-time inventory transfers and issues</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded text-xs ">
                    {detailedData.project?.stock_movements?.length || 0} Movements
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-2 text-xs text-slate-400   ">Transaction</th>
                      <th className="p-2 text-xs text-slate-400   ">Item Details</th>
                      <th className="p-2 text-xs text-slate-400   ">Type</th>
                      <th className="p-2 text-xs text-slate-400    text-right">Quantity</th>
                      <th className="p-2 text-xs text-slate-400   ">Route (Source → Target)</th>
                      <th className="p-2 text-xs text-slate-400   ">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.project?.stock_movements?.length > 0 ? (
                      detailedData.project.stock_movements.map((sm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2">
                            <span className="text-xs  text-slate-900">{sm.transaction_no}</span>
                            <div className="text-xs text-slate-400 mt-0.5 font-medium">{sm.reference_name}</div>
                          </td>
                          <td className="p-2">
                            <p className="text-xs text-slate-900 m-0 ">{sm.item_name || sm.item_code}</p>
                            <p className="text-xs text-slate-400 m-0 font-medium ">{sm.item_code}</p>
                          </td>
                          <td className="p-2">
                            <span className={`p-1 rounded text-xs  ${
                              sm.movement_type === 'IN' ? 'bg-blue-50 text-blue-600' :
                              sm.movement_type === 'OUT' ? 'bg-rose-50 text-rose-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {sm.movement_type}
                            </span>
                          </td>
                          <td className="p-2 text-right text-xs  text-slate-900">
                            {parseFloat(sm.quantity).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className=" text-slate-700 truncate max-w-[100px]">{sm.source_warehouse_name || 'EXTERNAL'}</span>
                              <ArrowRight size={10} className="text-slate-300" />
                              <span className=" text-slate-700 truncate max-w-[100px]">{sm.target_warehouse_name || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-2">
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
          <div className="space-y-2">
            <div className="bg-white  rounded    border border-slate-200 p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-amber-100  flex items-center justify-center text-amber-600   shadow-amber-200">
                  <Layers size={15} />
                </div>
                <div>
                  <h4 className="text-sm  text-slate-900 m-0">Resource & Component Readiness</h4>
                  <p className="text-slate-500 font-medium m-0">Tracking inventory requirements across all production stages</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-2 text-xs  text-slate-400 ">Item Details</th>
                      <th className="p-2 text-xs  text-slate-400  text-right">Required</th>
                      <th className="p-2 text-xs  text-slate-400  text-right">Consumed</th>
                      <th className="p-2 text-xs  text-slate-400  text-right">Rate</th>
                      <th className="p-2 text-xs  text-slate-400  text-right">Extension</th>
                      <th className="p-2 text-xs  text-slate-400  text-right">Available</th>
                      <th className="p-2 text-xs  text-slate-400  text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {detailedData.materials?.length > 0 ? (
                      detailedData.materials.map((mat, idx) => {
                        const shortage = (parseFloat(mat.required_qty) - parseFloat(mat.consumed_qty)) > parseFloat(mat.stock_qty)
                        const extension = parseFloat(mat.consumed_qty || 0) * parseFloat(mat.rate || 0)
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-2">
                              <p className="text-xs  text-slate-900 m-0 font-bold">{mat.item_name || mat.item_code}</p>
                              <div className="flex flex-col gap-0.5 mt-1">
                                <span className="text-[10px] text-slate-400 font-mono">{mat.item_code}</span>
                                {mat.batch_nos && (
                                  <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded w-fit border border-blue-100 flex items-center gap-1 mt-0.5">
                                    <Boxes size={10} />
                                    BATCH: {mat.batch_nos}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              <p className="text-xs  text-slate-900 m-0">{parseFloat(mat.required_qty).toLocaleString()} {mat.uom}</p>
                            </td>
                            <td className="p-2 text-right">
                              <p className="text-xs  text-slate-600 m-0">{parseFloat(mat.consumed_qty).toLocaleString()} {mat.uom}</p>
                            </td>
                            <td className="p-2 text-right">
                              <p className="text-xs  text-slate-600 m-0 font-medium">₹{parseFloat(mat.rate || 0).toLocaleString()}</p>
                            </td>
                            <td className="p-2 text-right">
                              <p className="text-xs  text-blue-600 m-0 font-bold">₹{extension.toLocaleString()}</p>
                              <p className="text-[9px] text-slate-400">Total: ₹{(parseFloat(mat.required_qty) * parseFloat(mat.rate || 0)).toLocaleString()}</p>
                            </td>
                            <td className="p-2 text-right">
                              <p className={`text-xs  m-0 ${!shortage ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {parseFloat(mat.stock_qty).toLocaleString()} {mat.uom}
                              </p>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 rounded-md text-xs   ${
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

            <div className="bg-white  rounded    border border-slate-200 p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-blue-100  flex items-center justify-center text-blue-600   shadow-blue-200">
                  <Cpu size={15} />
                </div>
                <div>
                  <h4 className="text-sm  text-slate-900 m-0">Machine Efficiency</h4>
                  <p className="text-slate-500 font-medium m-0">Real-time utilization and downtime analysis</p>
                </div>
              </div>

              {detailedData.project?.machine_stats?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="p-2 text-xs  text-slate-400 ">Machine</th>
                        <th className="p-2 text-xs  text-slate-400  text-right">Working</th>
                        <th className="p-2 text-xs  text-slate-400  text-right">Downtime</th>
                        <th className="p-2 text-xs  text-slate-400  text-right">Efficiency</th>
                        <th className="p-2 text-xs  text-slate-400  text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailedData.project.machine_stats.map((machine, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-2">
                            <p className="text-xs  text-slate-900 m-0">{machine.machine_name}</p>
                            <p className="text-xs  text-slate-400 m-0 ">{machine.machine_id}</p>
                          </td>
                          <td className="p-2 text-right">
                            <p className="text-xs  text-slate-900 m-0">{(Number(machine.working_time || 0) / 60).toFixed(1)} hrs</p>
                          </td>
                          <td className="p-2 text-right">
                            <p className="text-xs  text-slate-900 m-0">{(Number(machine.downtime || 0) / 60).toFixed(1)} hrs</p>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs  ${machine.efficiency >= 85 ? 'text-emerald-600' : machine.efficiency >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {machine.efficiency}%
                              </span>
                              <div className="w-24 h-1.5 bg-slate-100 rounded overflow-hidden">
                                <div 
                                  className={`h-full ${machine.efficiency >= 85 ? 'bg-emerald-500' : machine.efficiency >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                  style={{ width: `${machine.efficiency}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-1 rounded-md text-xs   ${
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
