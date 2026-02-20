import React, { useState, useEffect, useMemo } from 'react'
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts'
import { 
  AlertTriangle, Zap, Eye, X, Factory, BarChart3, 
  TrendingUp, Clipboard, Rocket, Wrench, Calendar, 
  ChevronLeft, ChevronRight, Activity, Clock, 
  CheckCircle2, Monitor, RefreshCw, ArrowUpRight,Search ,Filter , ArrowDownRight, XCircle,
  PieChart as PieIcon
} from 'lucide-react'
import { getOEEDashboardData, getMachineHistoricalMetrics } from '../../services/productionService'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const DetailModal = ({ isOpen, machine, onClose }) => {
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyData, setHistoryData] = useState({ daily: [], weekly: [], monthly: [], yearly: [] })
  const [activeTab, setActiveTab] = useState('daily')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && machine?.id) {
      setError(null)
      fetchHistoricalMetrics()
    }
  }, [isOpen, machine?.id])

  const fetchHistoricalMetrics = async () => {
    try {
      setHistoryLoading(true)
      const data = await getMachineHistoricalMetrics(machine.id)
      
      if (data.success && data.data) {
        setHistoryData(data.data || { daily: [], weekly: [], monthly: [], yearly: [] })
        setError(null)
      } else {
        setError('API returned unsuccessful response')
      }
    } catch (error) {
      console.error('[DetailModal] Error fetching historical metrics:', error)
      setError(`Error: ${error.message}`)
    } finally {
      setHistoryLoading(false)
    }
  }

  if (!isOpen || !machine) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header - Dark Blue */}
        <div className="p-2 text-white flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded bg-white/10 flex items-center justify-center border border-white/20 shadow-inner backdrop-blur-md">
              <Monitor size={32} className="text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-2xl  m-0 ">{machine.name}</h2>
                 <span className={`px-2.5 py-1 rounded text-[9px]    border ${
                    ['Running', 'active', 'Operational'].includes(machine?.status) ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                 }`}>
                    {machine.status}
                 </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px]  text-gray-500">Identifier:</span>
                <span className="text-xs text-black ">{machine.id}</span>
                <div className="w-1 h-1 rounded bg-blue-400/40"></div>
                <span className="text-[10px]  text-gray-500">{machine.workstationType}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center text-black  rounded transition-all border border-transparent hover:border-white/20"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 bg-slate-50/30">
          {/* Main KPI Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Availability', value: machine.availability, color: '#3b82f6', icon: Clock, tag: 'Uptime' },
              { label: 'Performance', value: machine.performance, color: '#f59e0b', icon: Activity, tag: 'Speed' },
              { label: 'Quality', value: machine.quality, color: '#10b981', icon: CheckCircle2, tag: 'Yield' },
              { label: 'Overall OEE', value: machine.oee, color: '#6366f1', icon: BarChart3, tag: 'OEE' }
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded p-2 pt-4 border border-slate-100  relative overflow-hidden group  transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: kpi.color }}></div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110 opacity-50"></div>
                
                <div className="flex justify-between items-start mb-6 relative ">
                  <div>
                    <p className="text-[10px]  text-slate-400   mb-1">{kpi.label}</p>
                    <p className="text-xl  text-slate-900 m-0 ">{kpi.value}%</p>
                  </div>
                  <div className="p-3.5 rounded  transition-all duration-500 group-hover:rotate-6" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                    <kpi.icon size={15} strokeWidth={2.5} />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 relative ">
                   <div className="flex-1 h-1.5 bg-slate-50 rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-1000 ease-out" style={{ width: `${kpi.value}%`, backgroundColor: kpi.color }}></div>
                   </div>
                   <span className="text-[9px]    px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400">{kpi.tag}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Secondary Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Uptime', value: `${machine.uptimeHours}h`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Allocation', value: `${machine.allocation}h`, icon: Calendar, color: 'text-slate-600', bg: 'bg-slate-100' },
              { label: 'Downtime', value: `${machine.downtime}h`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Rejection', value: `${machine.rejectionRate}%`, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded p-2 border border-slate-100  flex items-center gap-5 transition-all hover:shadow-md">
                <div className={`w-6 h-6 rounded ${stat.bg} ${stat.color} flex items-center justify-center shrink-0 shadow-inner`}>
                  <stat.icon size={15} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px]  text-slate-400   mb-1">{stat.label}</p>
                  <p className="text-xl  text-slate-900 m-0 ">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Historical Performance Chart Section */}
          <div className="bg-white rounded border border-slate-100  overflow-hidden">
            <div className="p-2 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <TrendingUp size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xs  text-slate-800   m-0">Historical Performance</h3>
                  <p className="text-[10px] font-bold text-slate-400   m-0">Trends and analytics across periods</p>
                </div>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded gap-1">
                {['daily', 'weekly', 'monthly'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-2 rounded-lg text-xs    transition-all ${
                      activeTab === tab
                        ? 'bg-white text-blue-600 '
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8 h-[450px]">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded bg-amber-50 flex items-center justify-center text-amber-500 mb-6 shadow-inner">
                    <AlertTriangle size={32} />
                  </div>
                  <p className="text-slate-800    text-[11px] mb-2">Intelligence Interrupted</p>
                  <p className="text-slate-400  text-xs max-w-xs">{error}</p>
                </div>
              ) : historyLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="relative">
                    <div className="w-24 h-24 rounded border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                      <Activity size={32} className="animate-pulse" />
                    </div>
                  </div>
                  <p className="text-slate-400    text-xs mt-8 animate-pulse">Reconstructing Historical Matrix...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'daily' ? (
                    <AreaChart data={historyData.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOeeModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fill: '#64748b', fontWeight: 800}}
                        dy={15}
                      />
                      <YAxis 
                        domain={[0, 105]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-4 rounded shadow-2xl border border-white/10 backdrop-blur-md">
                                <p className="text-[9px]    text-blue-400 mb-3 border-b border-white/10 pb-2">{label}</p>
                                <div className="space-y-2">
                                   <div className="flex items-center justify-between gap-8">
                                      <span className="text-xs  text-slate-400 ">OEE Efficiency</span>
                                      <span className="text-sm  text-white">{payload[0].value}%</span>
                                   </div>
                                   <div className="flex items-center justify-between gap-8">
                                      <span className="text-xs  text-slate-400 ">Performance</span>
                                      <span className="text-sm  text-amber-400">{payload[1].value}%</span>
                                   </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area type="monotone" dataKey="oee" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorOeeModal)" name="OEE %" />
                      <Area type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={2} fill="transparent" name="Performance %" strokeDasharray="5 5" />
                    </AreaChart>
                  ) : activeTab === 'weekly' ? (
                    <BarChart data={historyData.weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="modalBar1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" />
                          <stop offset="100%" stopColor="#1d4ed8" />
                        </linearGradient>
                        <linearGradient id="modalBar2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="week" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fill: '#64748b', fontWeight: 800}}
                        dy={15}
                      />
                      <YAxis 
                        domain={[0, 105]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}}
                      />
                      <Tooltip 
                        cursor={{fill: '#f8fafc', radius: 12}}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-4 rounded shadow-2xl border border-white/10 backdrop-blur-md">
                                <p className="text-[9px]    text-emerald-400 mb-3 border-b border-white/10 pb-2">Week {label}</p>
                                <div className="space-y-2">
                                   <div className="flex items-center justify-between gap-8">
                                      <span className="text-xs  text-slate-400 ">Avg Performance</span>
                                      <span className="text-sm  text-blue-400">{payload[0].value}%</span>
                                   </div>
                                   <div className="flex items-center justify-between gap-8">
                                      <span className="text-xs  text-slate-400 ">Avg Efficiency</span>
                                      <span className="text-sm  text-emerald-400">{payload[1].value}%</span>
                                   </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="avg_performance" fill="url(#modalBar1)" name="Avg Performance %" radius={[6, 6, 0, 0]} barSize={24} />
                      <Bar dataKey="avg_efficiency" fill="url(#modalBar2)" name="Avg Efficiency %" radius={[6, 6, 0, 0]} barSize={24} />
                    </BarChart>
                  ) : (
                    <LineChart data={historyData.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fill: '#64748b', fontWeight: 800}}
                        dy={15}
                      />
                      <YAxis 
                        domain={[0, 105]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-4 rounded shadow-2xl border border-white/10 backdrop-blur-md">
                                <p className="text-[9px]    text-violet-400 mb-3 border-b border-white/10 pb-2">{label}</p>
                                <div className="space-y-2">
                                   {payload.map((entry, i) => (
                                     <div key={i} className="flex items-center justify-between gap-8">
                                        <span className="text-xs  text-slate-400 ">{entry.name}</span>
                                        <span className="text-sm " style={{ color: entry.color }}>{entry.value}%</span>
                                     </div>
                                   ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line type="monotone" dataKey="avg_performance_percentage" stroke="#8b5cf6" strokeWidth={4} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} name="Avg Performance %" />
                      <Line type="monotone" dataKey="avg_efficiency_percentage" stroke="#10b981" strokeWidth={4} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} name="Avg OEE %" />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LineDetailsModal = ({ isOpen, line, onClose, setSelectedMachine, setModalOpen }) => {
  if (!isOpen || !line) return null

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Header - Dark Blue */}
        <div className="p-2  flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/20 shadow-inner backdrop-blur-md">
              <Factory size={15} className="text-black" />
            </div>
            <div>
              <h2 className="text-xl  m-0  flex items-center gap-3">Line Intelligence: {line.id}</h2>
              <div className="flex items-center gap-3 mt-2">
                 <span className="text-[10px]  text-gray-500-500  ">{line.machines.length} Integrated Assets</span>
                 <div className="w-1 h-1 rounded bg-blue-400/40"></div>
                 <span className="text-[10px]  text-gray-500-500  ">Active Monitoring</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 flex items-center justify-center  hover:text-white hover:bg-white/10 rounded transition-all border border-transparent hover:border-white/20"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            {[
              { label: 'Avg Availability', value: line.availability, color: '#3b82f6', icon: Clock, trend: 'Temporal' },
              { label: 'Avg Performance', value: line.performance, color: '#f59e0b', icon: Activity, trend: 'Velocity' },
              { label: 'Avg Quality', value: line.quality, color: '#10b981', icon: CheckCircle2, trend: 'Precision' },
              { label: 'Overall OEE', value: line.oee, color: '#6366f1', icon: BarChart3, trend: 'Efficiency' }
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded p-2 pt-4 border border-slate-100  relative overflow-hidden group  transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: kpi.color }}></div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-50"></div>
                
                <div className="flex justify-between items-start mb-6 relative ">
                  <div>
                    <p className="text-xs  text-slate-400   mb-1">{kpi.label}</p>
                    <p className="text-xl  text-slate-900 m-0 er">{kpi.value}%</p>
                  </div>
                  <div className="p-2 rounded  transition-transform group-hover:scale-110 duration-500" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                    <kpi.icon size={15} strokeWidth={2.5} />
                  </div>
                </div>

                <div className="flex items-center gap-2 relative ">
                   <div className="flex-1 h-1.5 bg-slate-50 rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-1000 ease-out" style={{ width: `${kpi.value}%`, backgroundColor: kpi.color }}></div>
                   </div>
                   <span className="text-[9px]    px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400">{kpi.trend}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <h3 className="text-xs  text-slate-800   m-0">Integrated Machine Performance in {line.id}</h3>
              <span className="text-[10px] bg-blue-100 text-[#1e3a8a] px-3 py-1 rounded    border border-blue-200">System Traceability</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-[10px]  text-slate-400  ">Asset Identification</th>
                    <th className="p-2 text-[10px]  text-slate-400   text-center">Status</th>
                    <th className="p-2 text-[10px]  text-slate-400   text-center er">A / P / Q</th>
                    <th className="p-2 text-[10px]  text-slate-400   text-center">OEE Score</th>
                    <th className="p-2 text-[10px]  text-slate-400   text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {line.machines.map((m) => (
                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-2">
                        <div className="flex flex-col">
                           <span className="text-xs  text-slate-900 m-0 ">{m.name}</span>
                           <span className="text-[10px] font-bold text-slate-400 m-0 mt-1  er">{m.id} • {m.workstationType}</span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px]    border ${
                          ['Running', 'active', 'Operational'].includes(m.status) ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          m.status === 'Maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded ${['Running', 'active', 'Operational'].includes(m.status) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-3">
                           <span className="text-[10px]  text-blue-500">{m.availability}%</span>
                           <div className="w-px h-3 bg-slate-100"></div>
                           <span className="text-[10px]  text-amber-500">{m.performance}%</span>
                           <div className="w-px h-3 bg-slate-100"></div>
                           <span className="text-[10px]  text-emerald-500">{m.quality}%</span>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center justify-center gap-4">
                          <span className="text-xs  text-slate-900 w-10 er">{m.oee}%</span>
                          <div className="w-24 h-2 bg-slate-100 rounded overflow-hidden shadow-inner p-0.5">
                            <div 
                              className={`h-full rounded transition-all duration-1000 ${
                                m.oee > 85 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                                m.oee > 70 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 
                                'bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                              }`} 
                              style={{ width: `${m.oee}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <button 
                          onClick={() => { setSelectedMachine(m); setModalOpen(true); }}
                          className="p-2 bg-[#1e3a8a]/5 text-[#1e3a8a] rounded-xl hover:bg-[#1e3a8a] hover:text-white transition-all shadow-sm"
                        >
                          <Eye size={14} strokeWidth={2.5} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const StatCard = ({ label, value, icon: Icon, color, accentColor, trend, tooltip }) => (
  <div className="bg-white p-2 rounded border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 relative overflow-hidden group">
    {/* Background Pattern */}
    <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-16 -mt-16 transition-all duration-700 group-hover:scale-150 group-hover:rotate-12 opacity-[0.05]" style={{ backgroundColor: accentColor }}></div>
    <div className="absolute bottom-0 left-0 w-16 h-16 rounded-tr-full -ml-8 -mb-8 opacity-[0.02]" style={{ backgroundColor: accentColor }}></div>
    
    <div className="flex justify-between items-start mb-6 relative ">
      <div className="p-2 rounded transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 " style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
        <Icon size={15} strokeWidth={2.5} />
      </div>
      {tooltip && (
        <div className="group/tooltip relative">
          <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-slate-300 cursor-help hover:bg-slate-900 hover:text-white transition-all">
            <AlertTriangle size={12} />
          </div>
          <div className="absolute bottom-full right-0 mb-3 w-56 p-3 bg-slate-900/95 backdrop-blur-md text-white text-xs rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 leading-relaxed shadow-2xl border border-white/10">
            <p className="   text-blue-400 mb-1">AI Insight</p>
            {tooltip}
            <div className="absolute top-full right-4 border-8 border-transparent border-t-slate-900/95"></div>
          </div>
        </div>
      )}
    </div>

    <div className="relative ">
      <p className="text-xs  text-slate-400   mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <h3 className="text-xl  text-slate-900 leading-none er">{value}</h3>
      </div>
    </div>

    <div className=" border-t border-slate-50 flex items-center justify-between relative ">
      <div className="flex items-center gap-1 p-1 rounded text-xs    " style={{ backgroundColor: `${accentColor}10`, color: accentColor }}>
        <TrendingUp size={12} />
        {trend}
      </div>
      {/* <div className="w-8 h-1 bg-slate-100 rounded overflow-hidden">
        <div className="h-full bg-slate-300 w-1/2 group-hover:w-full transition-all duration-1000"></div>
      </div> */}
    </div>
  </div>
)

const MachineAnalysis = () => {
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [error, setError] = useState(null)
  const [machineDetails, setMachineDetails] = useState([])
  const [lineDetails, setLineDetails] = useState([])
  const [machineStatus, setMachineStatus] = useState([])
  const [machineEfficiency, setMachineEfficiency] = useState([])
  const [averagePerformance, setAveragePerformance] = useState(0)
  const [averageUtilization, setAverageUtilization] = useState(0)
  const [averageQuality, setAverageQuality] = useState(0)
  const [averageOEE, setAverageOEE] = useState(0)
  const [workstations, setWorkstations] = useState([])
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [selectedLine, setSelectedLine] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [hoveredStatus, setHoveredStatus] = useState(null)
  
  // Filtering & Pagination
  const [currentMachinePage, setCurrentMachinePage] = useState(1)
  const itemsPerPage = 8
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (isSync = false) => {
    try {
      if (isSync) {
        setSyncLoading(true)
      } else {
        setLoading(true)
      }
      const [oeeRes, workstationsRes] = await Promise.all([
        getOEEDashboardData(),
        fetch(`${import.meta.env.VITE_API_URL}/production/workstations`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json())
      ])

      if (oeeRes.success) {
        const { summary, trends, machineOEE } = oeeRes.data
        
        // Group by machine
        const grouped = (machineOEE || []).reduce((acc, m) => {
          const mId = m.machine_id;
          if (!acc[mId]) {
            acc[mId] = {
              id: mId,
              name: m.machine_name,
              workstationType: m.workstation_type || 'General',
              line_id: m.line_id || 'General',
              status: m.machine_status,
              availability: [],
              performance: [],
              quality: [],
              oee: [],
              total_units: 0,
              rejected_units: 0,
              downtime_mins: 0,
              operating_time_mins: 0,
              entries: 0
            };
          }
          
          if (m.entry_date) {
            acc[mId].availability.push(m.availability);
            acc[mId].performance.push(m.performance);
            acc[mId].quality.push(m.quality);
            acc[mId].oee.push(m.oee);
            acc[mId].total_units += m.total_units;
            acc[mId].rejected_units += m.rejected_units;
            acc[mId].downtime_mins += (m.downtime_mins || 0);
            acc[mId].operating_time_mins += (m.operating_time_mins || 0);
            acc[mId].entries += 1;
          }
          return acc;
        }, {});

        const processedMachines = Object.values(grouped).map(m => {
          const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          const oeeVal = Number(avg(m.oee).toFixed(1));
          return {
            ...m,
            lineId: m.line_id,
            availability: Number(avg(m.availability).toFixed(1)),
            performance: Number(avg(m.performance).toFixed(1)),
            quality: Number(avg(m.quality).toFixed(1)),
            oee: oeeVal,
            uptimeHours: Number((m.operating_time_mins / 60).toFixed(1)),
            allocation: Number(((m.operating_time_mins + m.downtime_mins) / 60).toFixed(1)),
            downtime: Number((m.downtime_mins / 60).toFixed(1)),
            rejectionRate: m.total_units > 0 ? Number(((m.rejected_units / m.total_units) * 100).toFixed(1)) : 0,
            jobs: m.entries,
            utilization: (m.operating_time_mins + m.downtime_mins) > 0 
              ? Number(((m.operating_time_mins / (m.operating_time_mins + m.downtime_mins)) * 100).toFixed(1))
              : 0
          };
        });

        // Line-wise aggregation
        const linesGrouped = processedMachines.reduce((acc, m) => {
          const lId = m.lineId || 'General';
          if (!acc[lId]) {
            acc[lId] = {
              id: lId,
              availability: [],
              performance: [],
              quality: [],
              oee: [],
              machines: []
            };
          }
          acc[lId].availability.push(m.availability);
          acc[lId].performance.push(m.performance);
          acc[lId].quality.push(m.quality);
          acc[lId].oee.push(m.oee);
          acc[lId].machines.push(m);
          return acc;
        }, {});

        const processedLines = Object.values(linesGrouped).map(l => {
          const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          return {
            ...l,
            availability: Number(avg(l.availability).toFixed(1)),
            performance: Number(avg(l.performance).toFixed(1)),
            quality: Number(avg(l.quality).toFixed(1)),
            oee: Number(avg(l.oee).toFixed(1))
          };
        });

        setMachineDetails(processedMachines)
        setLineDetails(processedLines)
        setAveragePerformance(summary.performance)
        setAverageUtilization(summary.availability)
        setAverageQuality(summary.quality)
        setAverageOEE(summary.oee)

        // Status Distribution
        const statuses = processedMachines.reduce((acc, m) => {
          const s = m.status || 'Offline'
          acc[s] = (acc[s] || 0) + 1
          return acc
        }, {})
        
        setMachineStatus(Object.entries(statuses).map(([name, value], i) => ({
          name, value, color: COLORS[i % COLORS.length]
        })))

        // Efficiency Trend
        setMachineEfficiency((trends || []).map(t => ({
          period: t.date,
          efficiency: Number(t.oee || 0).toFixed(1),
          availability: Number(t.availability || 0).toFixed(1),
          performance: Number(t.performance || 0).toFixed(1),
          quality: Number(t.quality || 0).toFixed(1)
        })))
      }

      if (workstationsRes.success) {
        setWorkstations(workstationsRes.data || [])
      }

      setRefreshTime(new Date())
      setError(null)
    } catch (err) {
      console.error('Error fetching machines analysis:', err)
      setError('Failed to synchronize machine intelligence. Verify backend connectivity.')
    } finally {
      setLoading(false)
      setSyncLoading(false)
    }
  }

  const filteredMachines = useMemo(() => {
    return machineDetails.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           m.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'All' || m.workstationType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [machineDetails, searchTerm, typeFilter]);

  const workstationTypes = useMemo(() => {
    const types = new Set(machineDetails.map(m => m.workstationType).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [machineDetails]);

  const paginatedMachines = filteredMachines.slice(
    (currentMachinePage - 1) * itemsPerPage,
    currentMachinePage * itemsPerPage
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-2">
        <div className="animate-spin mb-4">
          <RefreshCw size={40} className="text-blue-600" />
        </div>
        <p className="text-slate-600  animate-pulse  text-xs">Calibrating Analytics...</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen">
      {/* Redesigned Header - Dark Blue like OEE */}
      <div className=" p-2 mb-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded bg-white/10 flex items-center justify-center border border-white/20 shadow-inner backdrop-blur-md">
                <Monitor size={30} className="text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl  m-0  flex items-center gap-3">
                  Machine Analysis 
                  <span className="text-xs bg-blue-500/20 text-blue px-2 py-0.5 rounded border border-blue-400/30   ">Live AI Insights</span>
                </h1>
                <p className="text-xs  text-blue mt-1  ">
                  Factory Floor Performance Monitoring
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-blue    leading-none mb-1">Last Sync</span>
                <div className="flex items-center gap-2">
                   <Clock size={12} className="text-blue-400" />
                   <span className="text-sm  text-white">{refreshTime.toLocaleTimeString()}</span>
                </div>
              </div>
              <button
                onClick={() => fetchData(true)}
                disabled={syncLoading}
                className={`group flex items-center gap-3 px-6 py-2.5 bg-white text-[#1e3a8a] rounded  text-[11px]   hover:bg-blue-50 transition-all shadow-xl active:scale-95 disabled:opacity-50 ${syncLoading ? 'cursor-not-allowed' : ''}`}
              >
                <RefreshCw size={14} className={syncLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} /> 
                {syncLoading ? 'Synchronizing...' : 'Refresh Intelligence'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 -mt-8">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard 
            label="Overall OEE" 
            value={`${averageOEE}%`}
            icon={Activity}
            accentColor="#6366f1"
            trend="Efficiency Score"
            tooltip="Overall Equipment Effectiveness across all machines."
          />
          <StatCard 
            label="Performance" 
            value={`${averagePerformance}%`}
            icon={TrendingUp}
            accentColor="#f59e0b"
            trend="Throughput Avg"
            tooltip="Ratio of actual output vs ideal machine speed."
          />
          <StatCard 
            label="Availability" 
            value={`${averageUtilization}%`}
            icon={Clock}
            accentColor="#3b82f6"
            trend="Uptime Rating"
            tooltip="Percentage of planned production time machines were running."
          />
          <StatCard 
            label="Quality Index" 
            value={`${averageQuality}%`}
            icon={CheckCircle2}
            accentColor="#10b981"
            trend="Rework Mitigation"
            tooltip="Percentage of good units produced out of total output."
          />
          <StatCard 
            label="Operational Status" 
            value={machineDetails.filter(m => ['Running', 'active', 'Operational'].includes(m.status)).length}
            icon={Zap}
            accentColor="#8b5cf6"
            trend="Live Assets"
            tooltip="Total number of machines currently in production."
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-10 mb-8 border-b border-slate-200">
          {['overview', 'lines', 'machines', 'efficiency'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[11px]    transition-all relative ${
                activeTab === tab
                  ? 'text-[#1e3a8a]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#1e3a8a] rounded-t-full shadow-[0_-4px_10px_rgba(30,58,138,0.3)]" />
              )}
            </button>
          ))}
        </div>

        {/* Overview Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Distribution */}
              <div className="bg-white rounded border border-slate-100 p-8  group  transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                
                <div className="flex items-center justify-between mb-8 relative ">
                  <h3 className="text-[11px]  text-slate-400   flex items-center gap-2">
                    <PieIcon size={14} className="text-indigo-500" /> Asset Health Spread
                  </h3>
                  <div className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[9px]   er">Live Monitor</div>
                </div>

                <div className="h-[300px] relative ">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={machineStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={85}
                        outerRadius={115}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                        onMouseEnter={(_, index) => setHoveredStatus(machineStatus[index])}
                        onMouseLeave={() => setHoveredStatus(null)}
                      >
                        {machineStatus.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            className="transition-all duration-500 cursor-pointer outline-none"
                            style={{ filter: hoveredStatus?.name === entry.name ? `drop-shadow(0 0 8px ${entry.color}80)` : 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white px-4 py-2.5 rounded shadow-2xl border border-white/10 backdrop-blur-md">
                                <p className="text-xs    mb-0.5">{payload[0].name}</p>
                                <p className="text-lg ">{payload[0].value} <span className="text-xs  text-slate-400">Assets</span></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <div className=" w-16 h-16 bg-white rounded  flex flex-col items-center justify-center  border-slate-50">
                        {hoveredStatus ? (
                          <>
                            <span className="text-xl  transition-all duration-300 animate-in fade-in zoom-in" style={{ color: hoveredStatus.color }}>
                              {((hoveredStatus.value / machineDetails.length) * 100).toFixed(0)}%
                            </span>
                            <span className="text-[8px] text-slate-400    mt-1">
                              {hoveredStatus.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-4xl  text-slate-800 er">
                              {machineDetails.length}
                            </span>
                            <span className="text-[8px] text-slate-400    mt-1">
                              Total Assets
                            </span>
                          </>
                        )}
                     </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 justify-center relative ">
                  {machineStatus.map((status, i) => (
                    <div 
                      key={i} 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded border transition-all cursor-default ${
                        hoveredStatus?.name === status.name ? 'border-slate-200 bg-slate-50  translate-y--0.5' : 'border-transparent bg-transparent'
                      }`}
                    >
                      <div className="w-2 h-2 rounded " style={{ backgroundColor: status.color }}></div>
                      <span className="text-[9px]  text-slate-600  ">{status.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Time vs Downtime */}
              <div className="lg:col-span-2 bg-white rounded border border-slate-100 p-8  group  transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
                
                <div className="flex items-center justify-between mb-10 relative ">
                   <div>
                      <h3 className="text-[11px]  text-slate-400   flex items-center gap-2 mb-1">
                        <BarChart3 size={14} className="text-blue-500" /> Temporal Asset Analysis
                      </h3>
                      <p className="text-xs  text-slate-400  er">Active vs Standby Duration by Asset (Top 10)</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded bg-blue-600"></div>
                        <span className="text-[9px]  text-slate-500  ">Productive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded bg-slate-300"></div>
                        <span className="text-[9px]  text-slate-500  ">Idle Time</span>
                      </div>
                   </div>
                </div>

                <div className="h-[320px] relative ">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={machineDetails.slice(0, 10)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" />
                          <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                        <linearGradient id="idleGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#cbd5e1" />
                          <stop offset="100%" stopColor="#94a3b8" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 9, fill: '#64748b', fontWeight: 800}} 
                        dy={15} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} 
                      />
                      <Tooltip 
                        cursor={{fill: '#f8fafc', radius: 12}}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900 text-white p-4 rounded shadow-2xl border border-white/10 backdrop-blur-lg">
                                <p className="text-xs    text-blue-400 mb-3 border-b border-white/10 pb-2">{label}</p>
                                <div className="space-y-2">
                                   <div className="flex items-center justify-between gap-6">
                                      <span className="text-xs  text-slate-400 ">Productive</span>
                                      <span className="text-xs  text-white">{payload[0].value}h</span>
                                   </div>
                                   <div className="flex items-center justify-between gap-6">
                                      <span className="text-xs  text-slate-400 ">Idle / Down</span>
                                      <span className="text-xs  text-white">{payload[1].value}h</span>
                                   </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="uptimeHours" 
                        name="Work Time" 
                        fill="url(#barGradient)" 
                        stackId="a" 
                        radius={[0, 0, 0, 0]} 
                        barSize={32} 
                      />
                      <Bar 
                        dataKey="downtime" 
                        name="Downtime" 
                        fill="url(#idleGradient)" 
                        stackId="a" 
                        radius={[8, 8, 0, 0]} 
                        barSize={32} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Overall Efficiency Area Chart */}
            <div className="bg-white rounded border border-slate-100 p-8  group  transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded -mr-48 -mt-48 transition-transform group-hover:scale-110 opacity-50"></div>
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 relative  gap-6">
                <div>
                  <h3 className="text-[11px]  text-slate-400   flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-[#1e3a8a]" /> Multi-Factor Efficiency Stream
                  </h3>
                  <p className="text-xs  text-slate-400  er">Holistic OEE Components Trend Analysis</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-6">
                   {[
                     { label: 'OEE Score', color: '#1e3a8a' },
                     { label: 'Availability', color: '#3b82f6' },
                     { label: 'Performance', color: '#f59e0b' },
                     { label: 'Quality', color: '#10b981' }
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[9px]  text-slate-500  ">{item.label}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="h-[350px] relative ">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={machineEfficiency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fill: '#94a3b8', fontWeight: 800}} 
                      dy={15} 
                    />
                    <YAxis 
                      domain={[0, 105]} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} 
                    />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-xl text-white p-5 rounded shadow-2xl border border-white/10 min-w-[200px]">
                              <p className="text-xs    text-blue-400 mb-4 border-b border-white/10 pb-3">{label}</p>
                              <div className="space-y-3">
                                 {payload.map((entry, index) => (
                                   <div key={index} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                         <div className="w-1.5 h-1.5 rounded" style={{ backgroundColor: entry.color }}></div>
                                         <span className="text-xs  text-slate-400 ">{entry.name}</span>
                                      </div>
                                      <span className="text-sm " style={{ color: entry.color }}>{entry.value}%</span>
                                   </div>
                                 ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="efficiency" stroke="#1e3a8a" strokeWidth={5} fillOpacity={1} fill="url(#colorOee)" name="OEE Score" animationDuration={1500} />
                    <Area type="monotone" dataKey="availability" stroke="#3b82f6" strokeWidth={2} fill="transparent" name="Availability" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={2} fill="transparent" name="Performance" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2} fill="transparent" name="Quality" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Lines Tab Content */}
        {activeTab === 'lines' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lineDetails.map((line) => (
              <div 
                key={line.id} 
                className="bg-white rounded border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer group flex flex-col hover:-translate-y-2"
                onClick={() => { setSelectedLine(line); setLineModalOpen(true); }}
              >
                <div className="p-2 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded bg-[#1e3a8a]/5 flex items-center justify-center text-[#1e3a8a] group-hover:bg-[#1e3a8a] group-hover:text-white transition-all duration-500 shadow-inner">
                      <Factory size={15} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h3 className="text-xs  text-slate-800 m-0  ">Line: {line.id}</h3>
                      <p className="text-[10px] font-bold text-slate-400 m-0  ">{line.machines.length} Operational Units</p>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center w-14 h-14 transition-transform group-hover:scale-110 duration-500">
                     <svg className="w-full h-full -rotate-90">
                        <circle cx="28" cy="28" r="24" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                        <circle 
                          cx="28" 
                          cy="28" 
                          r="24" 
                          fill="transparent" 
                          stroke={line.oee > 85 ? '#10b981' : line.oee > 70 ? '#f59e0b' : '#ef4444'} 
                          strokeWidth="4" 
                          strokeDasharray={150.8} 
                          strokeDashoffset={150.8 * (1 - line.oee / 100)} 
                          strokeLinecap="round"
                        />
                     </svg>
                     <span className="absolute text-[11px]  text-slate-800">{line.oee.toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="p-2 space-y-2 flex-1">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Avail.', val: line.availability, color: 'text-blue-500' },
                      { label: 'Perf.', val: line.performance, color: 'text-amber-500' },
                      { label: 'Qual.', val: line.quality, color: 'text-emerald-500' }
                    ].map((m, i) => (
                      <div key={i} className={`text-center p-3 rounded bg-slate-50/50 border border-slate-100/50 transition-colors group-hover:bg-white`}>
                        <p className="text-[9px]  text-slate-400   mb-1">{m.label}</p>
                        <p className={`text-xs  ${m.color}`}>{m.val}%</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px]  text-slate-400  ">Aggregate Health</span>
                      <span className="text-xs  text-slate-800 ">{line.oee}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded overflow-hidden p-0.5 shadow-inner">
                      <div 
                        className={`h-full rounded transition-all duration-1000 ${line.oee > 85 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : line.oee > 70 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-rose-400 to-rose-600'}`}
                        style={{ width: `${line.oee}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-auto border-t border-slate-50">
                    <div className="flex -space-x-3 overflow-hidden">
                      {line.machines.slice(0, 4).map((m, i) => (
                        <div 
                          key={i}
                          className="inline-block h-9 w-9 rounded-xl ring-4 ring-white bg-slate-100 flex items-center justify-center text-xs  text-slate-500 shadow-sm border border-slate-200"
                          title={m.name}
                        >
                          {m.name.charAt(0)}
                        </div>
                      ))}
                      {line.machines.length > 4 && (
                        <div className="inline-block h-9 w-9 rounded-xl ring-4 ring-white bg-slate-50 flex items-center justify-center text-[10px]  text-slate-400 shadow-sm border border-slate-200">
                          +{line.machines.length - 4}
                        </div>
                      )}
                    </div>
                    <button className="text-[10px]  text-[#1e3a8a]   flex items-center gap-2 hover:gap-3 transition-all group/btn">
                      View Explorer <ArrowUpRight size={14} strokeWidth={3} className="transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div className="bg-white rounded border border-slate-100 overflow-hidden ">
            <div className="p-4 bg-slate-50/30 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex flex-1 max-w-lg relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#1e3a8a] transition-colors" size={16} strokeWidth={2.5} />
                <input 
                  type="text" 
                  placeholder="Scan machine identifiers..."
                  className="w-full bg-white border border-slate-200 rounded pl-12 pr-4 py-3 text-xs  text-slate-700 focus:ring-4 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] outline-none transition-all "
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white border border-slate-200 rounded text-slate-400">
                   <Filter size={16} strokeWidth={2.5} />
                </div>
                <select 
                  className="bg-white border border-slate-200 rounded px-4 py-3 text-xs  text-slate-700 focus:ring-4 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] outline-none transition-all appearance-none pr-10 cursor-pointer  min-w-[180px]"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  {workstationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-xs  text-slate-400  ">Asset Identification</th>
                    <th className="p-2 text-xs  text-slate-400  ">Live Status</th>
                    <th className="p-2 text-xs  text-slate-400  ">OEE Performance</th>
                    <th className="p-2 text-xs  text-slate-400   text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedMachines.map((m) => (
                    <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-2">
                        <div className="flex flex-col">
                           <span className="text-xs  text-slate-900 m-0 ">{m.name}</span>
                           <span className="text-xs  text-slate-400 m-0 mt-1  ">{m.id} • <span className="text-[#1e3a8a]/60">{m.workstationType}</span></span>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-2 p-1 rounded text-xs   ${
                          ['Running', 'active', 'Operational'].includes(m.status) ? ' text-emerald-600 ' : 
                          m.status === 'Maintenance' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded ${
                            ['Running', 'active', 'Operational'].includes(m.status) ? 'bg-emerald-500 animate-pulse' : 
                            m.status === 'Maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-6">
                          <span className="text-xs  text-slate-900">{m.oee}%</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded w-40 overflow-hidden hidden xl:block">
                            <div 
                              className={`h-full rounded transition-all duration-1000 ${m.oee > 85 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : m.oee > 70 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                              style={{ width: `${m.oee}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <button 
                          onClick={() => { setSelectedMachine(m); setModalOpen(true); }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e3a8a]/5 text-[#1e3a8a]  text-xs   rounded hover:bg-[#1e3a8a] hover:text-white transition-all "
                        >
                          <Eye size={14} strokeWidth={2.5} />
                          Explore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs  text-slate-400  ">
                Viewing <span className="text-slate-900">{(currentMachinePage-1)*itemsPerPage + 1} - {Math.min(currentMachinePage*itemsPerPage, filteredMachines.length)}</span> of <span className="text-slate-900">{filteredMachines.length}</span> Assets
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setCurrentMachinePage(p => Math.max(1, p-1))}
                  disabled={currentMachinePage === 1}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 border border-slate-200 rounded hover:bg-white hover:text-[#1e3a8a] hover:border-[#1e3a8a] disabled:opacity-30 disabled:hover:bg-transparent transition-all "
                >
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => setCurrentMachinePage(p => Math.min(Math.ceil(filteredMachines.length/itemsPerPage), p+1))}
                  disabled={currentMachinePage >= Math.ceil(filteredMachines.length/itemsPerPage)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 border border-slate-200 rounded hover:bg-white hover:text-[#1e3a8a] hover:border-[#1e3a8a] disabled:opacity-30 disabled:hover:bg-transparent transition-all "
                >
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Efficiency Tab Content */}
        {activeTab === 'efficiency' && (
          <div className="bg-white rounded  border border-neutral-200 p-6 ">
            <h3 className="text-xs  text-neutral-400   mb-6 flex items-center gap-2">
              <Activity size={16} className="text-neutral-400" /> Multi-Metric Performance Analysis
            </h3>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={machineEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: '' }} />
                  <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={4} name="OEE %" dot={{r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
                  <Line type="monotone" dataKey="availability" stroke="#10b981" strokeWidth={2} name="Availability %" strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={2} name="Performance %" strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <DetailModal 
        isOpen={modalOpen} 
        machine={selectedMachine} 
        onClose={() => setModalOpen(false)} 
      />

      <LineDetailsModal
        isOpen={lineModalOpen}
        line={selectedLine}
        onClose={() => setLineModalOpen(false)}
        setSelectedMachine={setSelectedMachine}
        setModalOpen={setModalOpen}
      />
    </div>
  )
}

export default MachineAnalysis
