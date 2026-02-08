import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { TrendingUp, Calendar, AlertCircle, Clock, CheckCircle, AlertTriangle, Target, Eye, Edit2, Truck, Package, LayoutGrid, Search, Filter, ArrowUpRight, ArrowDownRight, MoreHorizontal, Download, Star, Share2, Layers, Zap, Cpu } from 'lucide-react'
import { getSalesOrdersAsProjects, getDetailedProjectAnalysis } from '../../services/adminService'

const statusConfig = {
  draft: { icon: Edit2, color: '#f97316', bg: '#fff7ed', text: '#9a3412', border: '#ffedd5', label: 'Draft' },
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full  text-xs  "
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.text
      }}
    >
      <Icon size={10} style={{ color: config.color }} />
      <span>{config.label}</span>
    </div>
  )
}

const ProcessFlow = ({ stages }) => {
  if (!stages || stages.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded border border-dashed border-slate-200">
      <Layers size={40} className="text-slate-300 mb-4" />
      <p className="text-slate-500 font-medium text-xs">No production workflow data available</p>
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {columns.map(column => {
        const Icon = column.icon;
        const columnStages = groupedStages[column.status] || [];
        
        return (
          <div key={column.status} className="flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-4 bg-white p-2 rounded border border-slate-200 ">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded ${column.color} text-white shadow-lg shadow-blue-200`}>
                  <Icon size={16} />
                </div>
                <h4 className="text-xs  text-slate-700">{column.title}</h4>
              </div>
              <span className="text-xs  bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {columnStages.length}
              </span>
            </div>
            
            <div className={`flex-1 flex flex-col gap-4 p-2 rounded border-2 border-dashed ${column.border} ${column.bg} transition-colors`}>
              {columnStages.map((stage, idx) => {
                const rawProgress = stage.planned_qty > 0 ? Math.round((stage.produced_qty / stage.planned_qty) * 100) : 0;
                const yieldRate = stage.produced_qty > 0 ? Math.round((stage.accepted_qty / stage.produced_qty) * 100) : 0;
                
                return (
                  <div key={idx} className="bg-white p-2 rounded  border border-slate-200 hover:shadow-md hover:border-blue-400 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs   text-slate-400  block mb-1">Stage {stage.sequence || idx + 1}</span>
                        <h5 className="text-xs  text-slate-800 m-0">{stage.stage_name}</h5>
                      </div>
                      {stage.produced_qty > 0 && (
                        <div className={`px-2 py-1 rounded text-xs   ${yieldRate >= 98 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {yieldRate}% Yield
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs   text-slate-500 mb-1.5">
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
                      
                      <div className="flex items-center gap-3 pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs   text-slate-500">
                          <Package size={12} className="text-slate-400" />
                          {stage.job_cards_count} Active Jobs
                        </div>
                        {(parseFloat(stage.rejected_qty) > 0 || parseFloat(stage.scrap_qty) > 0) && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium ml-auto">
                            <AlertCircle size={12} />
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

const DetailModal = ({ isOpen, project: initialProject, onClose, detailedData, detailedLoading }) => {
  const [activeTab, setActiveTab] = useState('overview');
  if (!isOpen || !initialProject) return null

  const project = detailedData?.project || initialProject;
  const progress = project.progress || 0;
  
  // Calculate real metrics from detailed data
  const stages = detailedData?.stages || [];
  const totalProduced = stages.reduce((acc, s) => acc + (parseFloat(s.produced_qty) || 0), 0);
  const totalAccepted = stages.reduce((acc, s) => acc + (parseFloat(s.accepted_qty) || 0), 0);
  const totalRejected = stages.reduce((acc, s) => acc + (parseFloat(s.rejected_qty) || 0), 0);
  const totalScrap = stages.reduce((acc, s) => acc + (parseFloat(s.scrap_qty) || 0), 0);
  const totalLoss = totalRejected + totalScrap;
  
  const yieldRate = totalProduced > 0 ? Math.round((totalAccepted / totalProduced) * 100) : 100;
  const qualityRate = totalProduced > 0 ? Math.round(((totalProduced - totalLoss) / totalProduced) * 100) : 100;
  
  const dueDate = project.dueDate ? new Date(project.dueDate) : null;
  const orderDate = project.order_date ? new Date(project.order_date) : new Date();
  
  const totalDuration = dueDate && orderDate ? Math.max(1, (dueDate - orderDate) / (1000 * 60 * 60 * 24)) : 30;
  const elapsed = orderDate ? (new Date() - orderDate) / (1000 * 60 * 60 * 24) : 15;
  const timeProgress = Math.min(100, Math.max(1, (elapsed / totalDuration) * 100));
  
  // Timeline performance is how much progress we have made relative to time elapsed
  const timelinePerformance = Math.round(Math.min(100, (progress / timeProgress) * 100));
  const efficiency = project.efficiency || 85;

  const isAtRisk = progress < timeProgress && project.status !== 'delivered';

  const radarData = [
    { subject: 'Progress', A: progress, B: 80, fullMark: 100 },
    { subject: 'Yield', A: yieldRate, B: 95, fullMark: 100 },
    { subject: 'Timeline', A: timelinePerformance, B: 90, fullMark: 100 },
    { subject: 'Quality Yield', A: qualityRate, B: 98, fullMark: 100 },
    { subject: 'Efficiency', A: efficiency, B: 85, fullMark: 100 }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 md:p-3">
      <div className="bg-slate-50 rounded  shadow-2xl max-w-5xl w-full  overflow-hidden flex flex-col">
        <div className="bg-slate-900 p-3 md:p-2  flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-xl  shadow-lg shadow-blue-500/30">
              <Package />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl text-white  m-0">{project.name || 'Untitled Project'}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-slate-400 text-xs m-0">
                Customer: <span className="text-white font-medium">{project.customer_name || 'Generic Customer'}</span> | 
                ID: <span className="text-white font-medium">{project.id || 'N/A'}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-5 h-5 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all text-xs p-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-3 max-h-[25pc]">
          <div className="flex gap-2 p-1 bg-slate-200/50 rounded w-fit mb-3 border border-slate-200">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutGrid },
              { id: 'stages', label: 'Production Flow', icon: TrendingUp },
              { id: 'history', label: 'Production History', icon: Clock },
              { id: 'materials', label: 'Resource & Machine Efficiency', icon: Layers }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 p-2 rounded  text-xs  transition-all ${
                  activeTab === tab.id ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {detailedLoading ? (
            <div className="flex flex-col items-center justify-center py-22">
              <div className="w-6 h-6  border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500  animate-pulse">Analyzing Project Vitals...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white p-2 rounded  border border-slate-200 ">
                        <p className="text-xs  text-slate-400 mb-4">Project Completion</p>
                        <div className="flex items-end justify-between mb-2">
                          <h3 className="text-xl  text-slate-900">{progress}%</h3>
                          <TrendingUp size={24} className="text-emerald-500 mb-2" />
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      
                      <div className="bg-white p-2 rounded  border border-slate-200 ">
                        <p className="text-xs  text-slate-400 mb-4">Total Revenue</p>
                        <h3 className="text-xl  text-slate-900">₹{parseFloat(project.revenue || 0).toLocaleString()}</h3>
                        <p className="text-emerald-600 text-xs  mt-2 flex items-center gap-1">
                          <ArrowUpRight size={14} /> Full Payment Confirmed
                        </p>
                      </div>

                      <div className="bg-white p-2 rounded  border border-slate-200 ">
                        <p className="text-xs  text-slate-400 mb-4">Timeline Performance</p>
                        <h3 className="text-xl  text-slate-900">{project.daysLeft || 0} Days</h3>
                        <p className="text-slate-500 text-xs  mt-2">Remaining to delivery</p>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded  mt-3 border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg  text-slate-900">Health Radar Analysis</h4>
                        <div className="flex items-center gap-4 text-xs ">
                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Current Performance</div>
                          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Industry Benchmark</div>
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
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-2 rounded  text-white  relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Calendar size={120} /></div>
                      <h4 className="text-xs  text-blue-400  mb-6">Delivery Intelligence</h4>
                      <div className="space-y-6">
                        <div>
                          <p className="text-slate-400 text-xs  mb-1">Estimated Delivery</p>
                          <p className="text-xl  ">
                            {dueDate 
                              ? dueDate.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })
                              : 'Not Scheduled'}
                          </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded border border-white/10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${
                              isAtRisk ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                            }`}>
                              {isAtRisk ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                            </div>
                            <span className={`text-xs ${isAtRisk ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isAtRisk ? 'At Risk' : 'On Track'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 m-0 leading-relaxed">
                            {isAtRisk 
                              ? `Project is currently behind schedule. Progress (${progress}%) is lower than expected time elapsed (${Math.round(timeProgress)}%).` 
                              : 'Production velocity is currently optimal. No scheduling conflicts detected for the upcoming stages.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded  border border-slate-200 ">
                      <h4 className="text-xs  text-slate-900 mb-6 flex items-center gap-2">
                        <Target size={18} className="text-blue-600" /> Key Milestones
                      </h4>
                      <div className="space-y-6">
                        {stages.length > 0 ? (
                          stages.slice(0, 4).map((stage, i) => (
                            <div key={i} className="flex items-start gap-4">
                              <div className={`mt-1.5 w-2 h-2 rounded-full ring-4 ${
                                stage.status === 'completed' ? 'bg-emerald-500 ring-emerald-50' : 
                                stage.status === 'in_progress' ? 'bg-blue-500 ring-blue-50' : 'bg-slate-300 ring-slate-50'
                              }`} />
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <span className={`text-xs  ${stage.status === 'completed' ? 'text-slate-900' : 'text-slate-500'}`}>{stage.stage_name}</span>
                                  <span className="text-xs   text-slate-400">{stage.produced_qty} / {stage.planned_qty}</span>
                                </div>
                                <span className="text-xs    text-slate-400">{stage.status.replace('_', ' ')}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic py-4">No production milestones detected</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stages' && <ProcessFlow stages={detailedData?.stages} />}

              {activeTab === 'history' && (
                <div className="bg-white rounded  border border-slate-200  overflow-hidden">
                  <div className="p-3 border-b border-slate-100">
                    <h4 className="text-lg  text-slate-900 m-0">Historical Production Entries</h4>
                    <p className="text-xs text-slate-500 m-0">Timeline of all recorded production activity for this project</p>
                  </div>
                  <div className="">
                    <table className="w-full text-left bg-white">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="p-2 text-xs  text-slate-400 ">Entry Date</th>
                          <th className="p-2 text-xs  text-slate-400 ">Item Code</th>
                          <th className="p-2 text-xs  text-slate-400  text-right">Qty</th>
                          <th className="p-2 text-xs  text-slate-400 ">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailedData?.entries?.length > 0 ? (
                          detailedData.entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-2">
                                <p className="text-xs  text-slate-900 m-0">{new Date(entry.entry_date).toLocaleDateString()}</p>
                                <p className="text-xs  text-slate-500 m-0 ">{entry.entry_id}</p>
                              </td>
                              <td className="p-2">
                                <span className="text-xs font-medium text-slate-700">{entry.item_code}</span>
                              </td>
                              <td className="p-2 text-right">
                                <span className="text-xs  text-slate-900">{entry.quantity_produced}</span>
                              </td>
                              <td className="p-2">
                                <span className="px-2 py-1 rounded text-xs bg-emerald-50 text-emerald-600">
                                  Submitted
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="p-6  py-12 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <Clock className="text-slate-300" size={32} />
                                <p className="text-slate-500 ">No production entries found</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {activeTab === 'materials' && (
                <div className="space-y-6">
                  <div className="bg-white rounded   border border-slate-200  p-3">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-6 h-6  bg-amber-100 rounded flex items-center justify-center text-amber-600">
                        <Layers />
                      </div>
                      <div>
                        <h4 className="text-lg  text-slate-900 m-0">Resource & Component Readiness</h4>
                        <p className="text-xs text-slate-500 m-0">Tracking inventory requirements across all production stages</p>
                      </div>
                    </div>
                    
                    {detailedData?.materials?.length > 0 ? (
                      <div className="">
                        <table className="w-full text-left bg-white">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="p-2 text-xs  text-slate-400 ">Item Details</th>
                              <th className="p-2 text-xs  text-slate-400  text-right">Required</th>
                              <th className="p-2 text-xs  text-slate-400  text-right">Consumed</th>
                              <th className="p-2 text-xs  text-slate-400  text-right">Stock Available</th>
                              <th className="p-2 text-xs  text-slate-400  text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {detailedData.materials.map((mat, idx) => {
                              const stockStatus = parseFloat(mat.stock_qty) >= (parseFloat(mat.required_qty) - parseFloat(mat.consumed_qty)) ? 'Ready' : 'Shortage';
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-2">
                                    <p className="text-xs  text-slate-900 m-0">{mat.item_name || mat.item_code}</p>
                                    <p className="text-xs  text-slate-500 m-0 ">{mat.item_code}</p>
                                  </td>
                                  <td className="p-2 text-right">
                                    <p className="text-xs  text-slate-900 m-0">{parseFloat(mat.required_qty).toLocaleString()} {mat.uom}</p>
                                  </td>
                                  <td className="p-2 text-right">
                                    <p className="text-xs font-medium text-slate-600 m-0">{parseFloat(mat.consumed_qty).toLocaleString()} {mat.uom}</p>
                                  </td>
                                  <td className="p-2 text-right">
                                    <p className={`text-xs  m-0 ${stockStatus === 'Ready' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {parseFloat(mat.stock_qty).toLocaleString()} {mat.uom}
                                    </p>
                                  </td>
                                  <td className="p-2 text-center">
                                    <span className={`px-2 py-1 rounded text-xs    ${
                                      stockStatus === 'Ready' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600 border border-rose-100'
                                    }`}>
                                      {stockStatus}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="p-12 bg-slate-50 rounded   border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center col-span-full">
                          <Zap size={32} className="text-slate-300 mb-4" />
                          <p className="text-slate-600 ">No Materials Allocated</p>
                          <p className="text-slate-400 text-xs mt-1">Material requirements are generated when Work Orders are approved.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded   border border-slate-200  p-3">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-6 h-6  bg-blue-100 rounded flex items-center justify-center text-blue-600">
                        <Cpu />
                      </div>
                      <div>
                        <h4 className="text-lg  text-slate-900 m-0">Machine & Workstation Efficiency</h4>
                        <p className="text-xs text-slate-500 m-0">Real-time utilization and downtime analysis per allocated resource</p>
                      </div>
                    </div>

                    {project?.machine_stats?.length > 0 ? (
                      <div className="">
                        <table className="w-full text-left bg-white">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="p-2 text-xs  text-slate-400 ">Machine Name</th>
                              <th className="p-2 text-xs  text-slate-400  text-right">Working Time</th>
                              <th className="p-2 text-xs  text-slate-400  text-right">Downtime</th>
                              <th className="p-2 text-xs  text-slate-400  text-right">Efficiency</th>
                              <th className="p-2 text-xs  text-slate-400 ">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {project.machine_stats.map((machine, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2">
                                  <p className="text-xs  text-slate-900 m-0">{machine.machine_name}</p>
                                  <p className="text-xs  text-slate-500 m-0 ">{machine.machine_id}</p>
                                </td>
                                <td className="p-2 text-right">
                                  <p className="text-xs  text-slate-900 m-0">{(machine.working_time / 60).toFixed(1)} hrs</p>
                                </td>
                                <td className="p-2 text-right">
                                  <p className="text-xs  text-slate-900 m-0">{(machine.downtime / 60).toFixed(1)} hrs</p>
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`text-xs font-bold ${machine.efficiency >= 85 ? 'text-emerald-600' : machine.efficiency >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
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
                                <td className="p-2">
                                  <span className={`px-2 py-1 rounded text-xs    ${
                                    machine.efficiency >= 85 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    {machine.efficiency >= 85 ? 'Optimal' : 'Underperforming'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 bg-slate-50 rounded   border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <Cpu size={32} className="text-slate-300 mb-4" />
                        <p className="text-slate-600 ">No Machine Data Available</p>
                        <p className="text-slate-400 text-xs mt-1">Machine utilization is tracked via Job Card time logs.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ label, value, icon: Icon, trend, trendValue, bgColor, iconColor, textColor }) => (
  <div className="bg-white rounded   p-3 border border-slate-200  hover: transition-all group relative overflow-hidden">
    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full ${bgColor} opacity-10 group-hover:scale-110 transition-transform duration-700`} />
    <div className="relative z-10 p-2">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-6 h-6  rounded ${bgColor} ${iconColor} flex items-center justify-center shadow-lg shadow-black/5`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs  px-2 py-1 rounded ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <h3 className={`text-xl   ${textColor || 'text-slate-900'}`}>{value}</h3>
    </div>
  </div>
);

export default function ProjectAnalysis() {
  const location = useLocation()
  const [projectStatus, setProjectStatus] = useState([])
  const [projectSegments, setProjectSegments] = useState([])
  const [projectTimeline, setProjectTimeline] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [filteredProjects, setFilteredProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [detailedData, setDetailedData] = useState(null)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [segmentTab, setSegmentTab] = useState(location.state?.filterSegment || 'all')
  const [chartType, setChartType] = useState(location.state?.filterSegment === 'Premium' ? 'segment' : 'status')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [trends, setTrends] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (location.state?.filterSegment) {
      setSegmentTab(location.state.filterSegment)
      if (location.state.filterSegment === 'Premium') {
        setChartType('segment')
      }
    }
  }, [location.state])

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
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id?.toString().includes(searchTerm)
      )
    }
    setFilteredProjects(filtered)
  }, [allProjects, activeTab, segmentTab, searchTerm])

  const fetchProjectAnalysis = async () => {
    try {
      setLoading(true)
      const res = await getSalesOrdersAsProjects()
      
      if (res.success && res.data) {
        const { projects, statusCounts, segmentDistribution, monthlyTimeline, totalRevenue, completionRate, trends } = res.data
        setAllProjects(projects || [])
        setTotalRevenue(totalRevenue || 0)
        setCompletionRate(completionRate || 0)
        setProjectTimeline(monthlyTimeline || [])
        setProjectSegments(segmentDistribution || [])
        setTrends(trends)
        
        const COLORS = {
          'Delivered': '#10b981',
          'Complete': '#059669',
          'Production': '#0ea5e9',
          'Dispatched': '#8b5cf6',
          'Draft': '#f97316',
          'On Hold': '#f59e0b'
        }
        
        const formattedStatus = (statusCounts || []).map((s) => {
          const name = s.status.charAt(0).toUpperCase() + s.status.slice(1)
          return {
            name,
            value: s.count,
            color: COLORS[name] || '#94a3b8'
          }
        })
        setProjectStatus(formattedStatus)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedAnalysis = async (project) => {
    try {
      setSelectedProject(project)
      setDetailedLoading(true)
      setModalOpen(true)
      
      const result = await getDetailedProjectAnalysis(project.id)
      
      if (result.success) {
        setDetailedData({
          project: result.data.project,
          stages: result.data.stages,
          entries: result.data.entries,
          materials: result.data.materials || []
        })
      }
    } catch (err) {
      console.error('Error fetching detailed analysis:', err)
    } finally {
      setDetailedLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 p-2 flex flex-col items-center justify-center p-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
      <p className="text-slate-500   text-xs animate-pulse">Syncing Production Intel...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl  text-slate-900 m-0">Project Analysis</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Global production tracking and performance intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded  text-[10px]  text-slate-700 hover:bg-slate-50 transition-all ">
            <Download size={14} /> Export
          </button>
          <button onClick={fetchProjectAnalysis} className="flex items-center gap-2 p-1.5 bg-blue-600 rounded  text-[10px]  text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Zap size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard 
          label="Live Projects" 
          value={allProjects.length} 
          icon={Target} 
          bgColor="bg-blue-50" 
          iconColor="text-blue-600" 
          trend={trends?.projects?.trend || 'up'} 
          trendValue={`${trends?.projects?.percent || 0}%`} 
        />
        <StatCard 
          label="Total Revenue" 
          value={`₹${(totalRevenue / 100000).toFixed(1)}L`} 
          icon={TrendingUp} 
          bgColor="bg-emerald-50" 
          iconColor="text-emerald-600" 
          trend={trends?.revenue?.trend || 'up'} 
          trendValue={`${trends?.revenue?.percent || 0}%`} 
        />
        <StatCard 
          label="Completion Rate" 
          value={`${completionRate}%`} 
          icon={CheckCircle} 
          bgColor="bg-violet-50" 
          iconColor="text-violet-600" 
          trend={trends?.completion?.trend || 'up'} 
          trendValue={`${trends?.completion?.percent || 0}%`} 
        />
        <StatCard 
          label="At Risk Projects" 
          value={allProjects.filter(p => p.daysLeft < 3 && p.status !== 'delivered').length} 
          icon={AlertTriangle} 
          bgColor="bg-rose-50" 
          iconColor="text-rose-600" 
          trend={trends?.atRisk?.trend || 'down'} 
          trendValue={`${trends?.atRisk?.percent || 0}%`} 
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Allocation Intel Chart */}
        <div className="lg:col-span-3 bg-white p-2 rounded border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm  text-slate-900">Allocation</h3>
            <div className="flex gap-1 p-0.5 bg-slate-50 rounded border border-slate-100">
              <button onClick={() => setChartType('status')} className={`px-1.5 py-0.5 rounded text-[8px]  ${chartType !== 'segment' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>STATUS</button>
              <button onClick={() => setChartType('segment')} className={`px-1.5 py-0.5 rounded text-[8px]  ${chartType === 'segment' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>SEGMENT</button>
            </div>
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartType === 'segment' ? projectSegments : projectStatus} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={45} 
                  outerRadius={65} 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {(chartType === 'segment' ? projectSegments : projectStatus).map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-auto pt-2 border-t border-slate-50">
            {(chartType === 'segment' ? projectSegments : projectStatus).map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-slate-400 truncate">{s.name}: <span className="text-slate-900 ">{s.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Table Section */}
        <div className="lg:col-span-9 bg-white rounded border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/20 w-full md:w-48 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5 p-0.5 bg-slate-50 rounded border border-slate-200">
                  {['all', 'production', 'complete'].map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)}
                      className={`px-2 py-1 rounded text-[10px] transition-all font-medium ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex gap-0.5 p-0.5 bg-slate-50 rounded border border-slate-200">
                  {['all', 'Premium', 'Other'].map((seg) => (
                    <button 
                      key={seg} 
                      onClick={() => setSegmentTab(seg)}
                      className={`px-2 py-1 rounded text-[10px] transition-all font-medium ${segmentTab === seg ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {seg.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{filteredProjects.length} Projects</p>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left bg-white">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                <tr>
                  <th className="p-2 text-[10px]  text-slate-400 ">Project</th>
                  <th className="p-2 text-[10px]  text-slate-400 ">Segment</th>
                  <th className="p-2 text-[10px]  text-slate-400 ">Progress</th>
                  <th className="p-2 text-[10px]  text-slate-400 ">Revenue</th>
                  <th className="p-2 text-[10px]  text-slate-400 ">Status</th>
                  <th className="p-2 text-[10px]  text-slate-400  text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProjects.map((project, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Package size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-[11px]  text-slate-900 m-0 truncate">{project.name}</p>
                            {project.segment === 'Premium' && <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                          </div>
                          <p className="text-[10px] text-slate-500 m-0 truncate">{project.customer_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px]  ${
                        project.segment === 'Premium' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {project.segment === 'Premium' ? <Star size={8} className="fill-amber-500" /> : <Package size={8} />}
                        {project.segment.toUpperCase()}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="w-32">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]  text-slate-600">{project.progress}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${project.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <p className="text-[11px]  text-slate-900 m-0">₹{(project.revenue || 0).toLocaleString()}</p>
                      <p className="text-[9px] text-emerald-600 ">PAID</p>
                    </td>
                    <td className="p-2">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="p-2 text-right">
                      <button 
                        onClick={() => fetchDetailedAnalysis(project)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-[10px]  text-slate-700 transition-all"
                      >
                        <Eye size={12} /> VIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Project Velocity Chart - Now at bottom */}
      <div className="bg-white p-2 rounded border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm  text-slate-900">Project Velocity (6M)</h3>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 text-[10px]  text-slate-500"><div className="w-2 h-2 rounded-full bg-blue-500" /> ORDERS</div>
            <div className="flex items-center gap-1.5 text-[10px]  text-slate-500"><div className="w-2 h-2 rounded-full bg-emerald-500" /> DONE</div>
            <div className="flex items-center gap-1.5 text-[10px]  text-slate-500"><div className="w-2 h-2 rounded-full bg-amber-500" /> PREMIUM</div>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projectTimeline}>
              <defs>
                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="total_projects" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorProjects)" />
              <Area type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
              <Area type="monotone" dataKey="premium_projects" stroke="#fbbf24" strokeWidth={2} strokeDasharray="3 3" fillOpacity={0} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <DetailModal 
        isOpen={modalOpen} 
        project={selectedProject} 
        onClose={() => setModalOpen(false)} 
        detailedData={detailedData} 
        detailedLoading={detailedLoading} 
      />
    </div>
  );
}
