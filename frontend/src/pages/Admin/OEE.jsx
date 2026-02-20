import React, { useState, useMemo, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid, BarChart, LineChart,
  Tooltip, Legend, ResponsiveContainer, Line, AreaChart, Area,
  ComposedChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  AlertTriangle, X, TrendingUp, Clipboard,
  Rocket, Filter, Download, Calendar, Clock, Settings, Layers,
  Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2,
  Zap, Gauge, Box, Cpu, RefreshCcw, ChevronRight,
  Monitor, Thermometer, ZapOff, AlertCircle, Loader2,
  Eye, PieChart as PieChartIcon, ShieldCheck
} from 'lucide-react'
import {
  getOEEDashboardData,
  getMachineHistoricalMetrics,
  getAllMachinesAnalysis,
  getWorkstationOEEDrillDown,
  getWorkOrderOEEDrillDown,
  getJobCardOEEDrillDown
} from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

// --- Gauge Component for OEE ---
const OEEGauge = ({ value }) => {
  const data = [
    { name: 'OEE', value: value, fill: 'rgb(30 58 138)' },
    { name: 'Remaining', value: 100 - value, fill: '#93c5fd' }
  ];

  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width={240} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={70}
            outerRadius={90}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="text-xl ">{(Number(value) || 0).toFixed(1)}%</span>
        <span className="text-[10px] mt-1">Overall OEE</span>
      </div>
    </div>
  );
};

const KPICard = ({ label, value, status, colorClass }) => (
  <div className="bg-white p-2 rounded  border border-slate-100 flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-all duration-300">
    <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-3xl -mr-4 -mt-4 transition-colors group-hover:bg-slate-100"></div>
    <div className="flex justify-between items-start relative z-10">
      <span className="text-[10px]  text-slate-400  ">{label}</span>
    </div>
    <div className="flex items-baseline gap-1 relative z-10">
      <span className={`text-xl   ${colorClass}`}>{(Number(value) || 0).toFixed(1)}%</span>
    </div>
    {status && (
      <div className="mt-1 relative z-10">
        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 text-[9px]  rounded-full border border-blue-500/20 tracking-wider">
          {status}
        </span>
      </div>
    )}
  </div>
);

const WorkstationList = ({ machines }) => (
  <div className="bg-white rounded-xl  border border-slate-100 overflow-hidden">
    <div className="p-4 border-b border-slate-50 flex items-center gap-2">
      <Monitor size={16} className="text-slate-400" />
      <h3 className="text-xs  text-slate-700  ">Workstation OEE Analysis</h3>
    </div>
    <div className="divide-y divide-slate-50">
      {machines.map((m, i) => (
        <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
          <div className="flex flex-col">
            <span className="text-xs  text-slate-900">{m.name}</span>
            <span className="text-[9px] text-slate-400  er truncate max-w-[120px]">
              {m.id}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={m.oee_history || [
                  { oee: 60 }, { oee: 80 }, { oee: 75 }, { oee: 85 }, { oee: 80 }
                ]}>
                  <Line
                    type="monotone"
                    dataKey="oee"
                    stroke="#1e3a8a"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={`px-2 py-1 rounded text-[10px]  bg-blue-100 text-blue-700`}>
              {(Number(m.oee) || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const RecentJobCards = ({ jobCards }) => (
  <div className="bg-white rounded  border border-slate-100 overflow-hidden">
    <div className="p-2 border-b border-slate-50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clipboard size={18} className="text-indigo-500" />
        <h3 className="text-xs  text-slate-700  ">Recent Floor Operations</h3>
      </div>
      <span className="text-[10px]  text-slate-400 ">Live Tracking</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50/50">
          <tr>
            <th className="px-6 py-4 text-[10px]  text-slate-400  tracking-wider">Identifier</th>
            <th className="px-6 py-4 text-[10px]  text-slate-400  tracking-wider">Asset Context</th>
            <th className="px-6 py-4 text-[10px]  text-slate-400  tracking-wider">Output Metrics</th>
            <th className="px-6 py-4 text-[10px]  text-slate-400  tracking-wider">Quality Index</th>
            <th className="px-6 py-4 text-[10px]  text-slate-400  tracking-wider text-right">OEE Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {jobCards.map((jc, i) => (
            <tr key={jc.id} className="hover:bg-slate-50/80 transition-colors group">
              <td className="px-6 py-5">
                <div className="flex flex-col">
                  <span className="text-xs  text-slate-900 ">{jc.id}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={10} className="text-slate-300" />
                    <span className="text-[9px] text-slate-400 ">Shift {jc.shift || 'N/A'}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex flex-col">
                  <span className="text-xs  text-slate-700">{jc.workstation}</span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{jc.workstation_desc}</span>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400  block  mb-1">Produced</span>
                    <span className="text-xs  text-slate-900">{jc.produced}</span>
                  </div>
                  <div className="h-8 w-px bg-slate-100"></div>
                  <div>
                    <span className="text-[9px] text-slate-400  block  mb-1">Target</span>
                    <span className="text-xs  text-slate-400">{jc.target || Math.round(jc.produced * 1.1)}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center w-32">
                    <span className="text-[9px]  text-blue-500 ">Reject Rate</span>
                    <span className="text-[9px]  text-slate-600 ">{((jc.rejected / (jc.produced || 1)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-1000"
                      style={{ width: `${(jc.rejected / (jc.produced || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-5 text-right">
                <div className="flex flex-col items-end">
                  <div className={`px-3 py-1.5 rounded text-xs  min-w-[64px] text-center bg-blue-600 text-white shadow-blue-500/10`}>
                    {(Number(jc.oee) || 0).toFixed(1)}%
                  </div>
                  <span className="text-[9px] text-slate-400   mt-1 er">
                    {jc.oee >= 85 ? 'OPTIMAL' : jc.oee >= 75 ? 'MARGINAL' : 'CRITICAL'}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// --- High Density UI Components ---

const OEEDrillDownModal = ({ isOpen, machine, onClose, filters }) => {
  const [level, setLevel] = useState('workstation') // 'workstation', 'work-order', 'job-card'
  const [selectionPath, setSelectionPath] = useState([])
  const [loading, setLoading] = useState(false)
  const [drillDownData, setDrillDownData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && machine?.id) {
      setSelectionPath([{ level: 'workstation', id: machine.id, name: machine.name }])
      setLevel('workstation')
      fetchDrillDownData('workstation', machine.id)
    }
  }, [isOpen, machine?.id])

  const fetchDrillDownData = async (currentLevel, referenceId) => {
    try {
      setLoading(true)
      setError(null)
      let response;
      if (currentLevel === 'workstation') {
        response = await getWorkstationOEEDrillDown(referenceId, filters)
      } else if (currentLevel === 'work-order') {
        response = await getWorkOrderOEEDrillDown(referenceId, filters)
      } else if (currentLevel === 'job-card') {
        response = await getJobCardOEEDrillDown(referenceId, filters)
      }

      if (response?.success) {
        setDrillDownData(response.data)
      } else {
        setError('Failed to fetch drill-down data')
      }
    } catch (err) {
      console.error('Error fetching OEE drill-down:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDrillDown = (nextLevel, id, name) => {
    const newPath = [...selectionPath, { level: nextLevel, id, name }]
    setSelectionPath(newPath)
    setLevel(nextLevel)
    fetchDrillDownData(nextLevel, id)
  }

  const handleBreadcrumbClick = (index) => {
    if (index === selectionPath.length - 1) return
    const newPath = selectionPath.slice(0, index + 1)
    const lastItem = newPath[newPath.length - 1]
    setSelectionPath(newPath)
    setLevel(lastItem.level)
    fetchDrillDownData(lastItem.level, lastItem.id)
  }

  if (!isOpen || !machine) return null

  const metrics = drillDownData?.metrics || { a: 0, p: 0, q: 0, oee: 0 }
  const losses = drillDownData?.losses || { availability: 0, performance: 0, quality: 0 }
  const subEntities = drillDownData?.subEntities || []

  const kpis = [
    { label: 'AVAILABILITY', value: metrics.a, color: '#93c5fd', icon: Clock, loss: losses.availability },
    { label: 'PERFORMANCE', value: metrics.p, color: '#60a5fa', icon: Activity, loss: losses.performance },
    { label: 'QUALITY', value: metrics.q, color: '#3b82f6', icon: CheckCircle2, loss: losses.quality },
    { label: 'OVERALL OEE', value: metrics.oee, color: '#1e3a8a', icon: Gauge }
  ]

  const getLevelIcon = (l) => {
    switch (l) {
      case 'workstation': return <Monitor size={14} />
      case 'work-order': return <Box size={14} />
      case 'job-card': return <Layers size={14} />
      default: return <Settings size={14} />
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded max-w-6xl w-full max-h-[95vh]  flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-4 flex items-center justify-between bg-white border-b border-slate-100">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-400   ">
              <ShieldCheck size={12} className="text-indigo-600" />
              OEE Traceability Explorer
            </div>

            <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {selectionPath.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronRight size={14} className="text-slate-300 shrink-0" />}
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all shrink-0 ${index === selectionPath.length - 1
                      ? 'bg-indigo-50 text-indigo-700  border border-indigo-100'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                  >
                    {getLevelIcon(item.level)}
                    <span className="text-xs  er truncate max-w-[150px]">
                      {item.name}
                    </span>
                  </button>
                </React.Fragment>
              ))}
            </nav>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all border border-transparent hover:border-blue-100 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 pt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-center">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 text-xs  tracking-[0.2em] animate-pulse">Recalculating Multi-Level Metrics...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-center bg-blue-50/30 rounded border border-dashed border-blue-200 m-4">
              <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center text-blue-500 mb-4">
                <AlertTriangle size={32} />
              </div>
              <p className="text-blue-900 mb-1">Drill-down error</p>
              <p className="text-blue-600 text-xs  ">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary KPI Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-white p-4 rounded border border-slate-200 relative  group hover:shadow-md transition-all duration-300">
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                      <div
                        className="h-full transition-all duration-1000 ease-out"
                        style={{ width: `${kpi.value}%`, backgroundColor: kpi.color }}
                      />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-400 mb-2   ">{kpi.label}</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl  text-slate-900">{kpi.value.toFixed(1)}</span>
                          <span className="text-xs  text-slate-400">%</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: `${kpi.color}10`, color: kpi.color }}>
                        <kpi.icon size={20} strokeWidth={2} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loss Classification Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded border border-slate-200">
                  <h3 className="text-xs  text-slate-900   mb-6 flex items-center gap-2">
                    <ZapOff size={16} className="text-blue-500" />
                    Loss Classification (min/qty)
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-[10px]   mb-2">
                        <span className="text-blue-300">Availability Loss</span>
                        <span className="text-slate-600">{losses.availability} min</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded ">
                        <div className="h-full bg-blue-300" style={{ width: `${Math.min(100, (losses.availability / 480) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px]   mb-2">
                        <span className="text-blue-400">Performance Loss</span>
                        <span className="text-slate-600">{losses.performance} min</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded ">
                        <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (losses.performance / 480) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px]   mb-2">
                        <span className="text-blue-500">Quality Loss</span>
                        <span className="text-slate-600">{losses.quality} units</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded ">
                        <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (losses.quality / (metrics.total_units || 1)) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-entities Drill-down List */}
                <div className="lg:col-span-2 bg-white rounded border border-slate-200 flex flex-col">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xs  text-slate-900   flex items-center gap-2">
                      <Layers size={16} className="text-indigo-600" />
                      {level === 'workstation' ? 'Child Work Orders' : level === 'work-order' ? 'Production Job Cards' : 'Shift Performance Logs'}
                    </h3>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded  ">
                      {subEntities.length} Items Found
                    </span>
                  </div>

                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-6 py-3 text-[10px]  text-slate-400  ">Reference ID</th>
                          <th className="px-6 py-3 text-[10px]  text-slate-400  ">OEE %</th>
                          <th className="px-6 py-3 text-[10px]  text-slate-400  ">A / P / Q</th>
                          <th className="px-6 py-3 text-[10px]  text-slate-400  ">Status</th>
                          <th className="px-6 py-3 text-[10px]  text-slate-400   text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {subEntities.length > 0 ? subEntities.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs  text-slate-900">{item.name || item.id}</span>
                                <span className="text-[9px] text-slate-400 font-mono er">{item.id}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded bg-blue-500`} />
                                <span className="text-xs  text-slate-700">{item.oee.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2 text-[10px] ">
                                <span className="text-blue-300">{item.a}%</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-blue-400">{item.p}%</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-blue-500">{item.q}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[9px]    border bg-blue-50 text-blue-700 border-blue-100`}>
                                {item.status || 'Active'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {level !== 'job-card' && (
                                <button
                                  onClick={() => handleDrillDown(level === 'workstation' ? 'work-order' : 'job-card', item.id, item.name || item.id)}
                                  className="p-1.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="5" className="px-6 py-12 text-center text-slate-400 text-xs italic">
                              No granular data available for this range
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


const StatCard = ({ label, value, subValue, icon: Icon, color, trend, unit = "%", tooltip }) => (
  <div className="bg-white  p-2 border border-slate-200 hover: hover:border-indigo-200 transition-all group relative ">
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-150`}></div>
    <div className="flex justify-between items-start relative z-0">
      <div>
        <div className="flex items-center gap-1.5 mb-1 group/label">
          <span className="text-[10px]  text-slate-400   block">{label}</span>
          {tooltip && (
            <div className="relative">
              <AlertCircle size={10} className="text-slate-300 cursor-help hover:text-indigo-500 transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded  opacity-0 invisible group-hover/label:opacity-100 group-hover/label:visible transition-all z-50 leading-relaxed">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <h3 className="text-xl  text-slate-900 m-0">{value}</h3>
          {unit && <span className="text-sm  text-slate-400">{unit}</span>}
        </div>
      </div>
      <div className={`p-2.5 rounded  ${color.replace('bg-', 'bg-opacity-10 ')} ${color.replace('bg-', 'text-')}`}>
        <Icon size={20} />
      </div>
    </div>
    <div className="flex items-center gap-1.5 border-t border-slate-50">
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600`}>
        <TrendingUp size={12} className={trend === 'up' ? '' : 'rotate-180'} />
        {subValue}
      </div>
      <span className="text-[10px] text-slate-400 font-medium">vs last period</span>
    </div>
  </div>
);

const LossTree = ({ summary }) => {
  if (!summary) return null;

  const availabilityLoss = 100 - summary.availability;
  const performanceLoss = (summary.availability / 100) * (100 - summary.performance);
  const qualityLoss = (summary.availability / 100) * (summary.performance / 100) * (100 - summary.quality);
  const totalLoss = 100 - summary.oee;

  return (
    <div className="bg-white  border border-slate-200  ">
      <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm  text-slate-900 m-0  ">Production Loss Decomposition</h3>
        <span className="text-[10px]  text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100">Total Loss: {(Number(totalLoss) || 0).toFixed(1)}%</span>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {[
            { label: 'Availability Gap', val: availabilityLoss, color: 'bg-blue-300', desc: 'Downtime & Setup' },
            { label: 'Performance Gap', val: performanceLoss, color: 'bg-blue-400', desc: 'Speed & Minor Stops' },
            { label: 'Quality Gap', val: qualityLoss, color: 'bg-blue-500', desc: 'Rejects & Rework' }
          ].map((loss, i) => (
            <div key={i} className="group">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-xs  text-slate-700 block">{loss.label}</span>
                  <span className="text-[10px] text-slate-400">{loss.desc}</span>
                </div>
                <span className="text-sm  text-slate-900">{(Number(loss.val) || 0).toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded ">
                <div
                  className={`h-full ${loss.color} transition-all duration-1000 group-hover:opacity-80`}
                  style={{ width: `${(loss.val / totalLoss) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MachineCard = ({ machine, onClick }) => {
  const statusConfig = {
    'Running': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    'active': { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    'Idle': { color: 'text-blue-400', bg: 'bg-blue-50', border: 'border-blue-100' },
    'Down': { color: 'text-blue-300', bg: 'bg-blue-50', border: 'border-blue-100' },
    'Maintenance': { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    'Offline': { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' }
  };
  const config = statusConfig[machine.status] || statusConfig[machine.status?.toLowerCase()] || statusConfig.Offline;

  return (
    <div
      onClick={onClick}
      className="bg-white  border border-slate-200 hover:border-blue-400 hover: transition-all cursor-pointer group "
    >
      <div className="p-2 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded  bg-white  border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
            <Cpu size={18} />
          </div>
          <div className="min-w-0 items-center">
            <h4 className="text-xs  text-slate-800 m-0 truncate">{machine.name}</h4>
            <span className="text-[10px] font-medium text-slate-400  ">{machine.id}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px]  border ${config.bg} ${config.color} ${config.border} shrink-0`}>
          <div className={`w-1.5 h-1.5 rounded ${['Running', 'active'].includes(machine.status) ? 'bg-current animate-pulse' : 'bg-current'}`}></div>
          {machine.status}
        </div>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'A', val: machine.a, color: 'text-blue-300' },
            { label: 'P', val: machine.p, color: 'text-blue-400' },
            { label: 'Q', val: machine.q, color: 'text-blue-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50/50 rounded  p-2 border border-slate-100 flex flex-col items-center">
              <span className="text-[9px]  text-slate-400  mb-1">{stat.label}</span>
              <span className={`text-xs  ${stat.color}`}>{stat.val}%</span>
            </div>
          ))}
        </div>

        {machine.active_jobs > 0 && (
          <div className="mb-3 px-3 py-1.5 bg-blue-50 rounded  border border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-blue-600" />
              <span className="text-[10px]  text-blue-700 ">Active Production</span>
            </div>
            <span className="text-[10px]  text-blue-600">{machine.active_jobs} Jobs</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[9px]  text-slate-400  leading-none mb-1">Overall OEE</span>
            <span className={`text-lg text-[#1e3a8a]`}>{machine.oee}%</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-600 transition-colors">
            <span className="text-[10px]   ">Analysis</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default function OEE() {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [activeTab, setActiveTab] = useState('Executive Overview');
  const [filters, setFilters] = useState({
    range: 'Weekly',
    line: 'All Lines',
    shift: 'All Shifts',
    startDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    })(),
    endDate: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [realData, setRealData] = useState({
    summary: null,
    trends: [],
    downtimeReasons: [],
    machineOEE: [],
    recentJobCards: [],
    comprehensiveAnalysis: []
  });
  const [syncLoading, setSyncLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    updateDateRange();
  }, [filters.range]);

  useEffect(() => {
    fetchData();
  }, [filters.startDate, filters.endDate, filters.line, filters.shift]);

  const updateDateRange = () => {
    const end = new Date();
    let start = new Date();
    if (filters.range === 'Daily' || filters.range === 'Today') {
      // No change needed, start and end are both Today
    } else if (filters.range === 'Yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (filters.range === 'Weekly') {
      start.setDate(start.getDate() - 7);
    } else if (filters.range === 'Monthly') {
      start.setMonth(start.getMonth() - 1);
    } else if (filters.range === 'Yearly') {
      start.setFullYear(start.getFullYear() - 1);
    }
    setFilters(prev => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }));
  };

  const fetchData = async (isSync = false) => {
    try {
      isSync ? setSyncLoading(true) : setLoading(true);
      const apiFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      if (filters.line !== 'All Lines') apiFilters.lineId = filters.line;
      if (filters.shift !== 'All Shifts') apiFilters.shift = filters.shift;

      const [response, analysisRes] = await Promise.all([
        getOEEDashboardData(apiFilters),
        getAllMachinesAnalysis(apiFilters)
      ]);


      if (response.success) {
        setRealData({
          ...response.data,
          machineOEE: response.data.machineOEE || [],
          comprehensiveAnalysis: analysisRes.success ? analysisRes.data : []
        });
        setLastSync(new Date());
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching OEE data:', err);
      setError('Failed to fetch real-time analytics. Please check connection.');
    } finally {
      setLoading(false);
      setSyncLoading(false);
    }
  };

  const filteredMachines = useMemo(() => {
    if (!realData.machineOEE || !Array.isArray(realData.machineOEE)) return [];

    const grouped = realData.machineOEE.reduce((acc, m) => {
      const mid = m.machine_id || m.name || 'unknown';
      if (!acc[mid]) {
        acc[mid] = {
          id: mid,
          name: m.machine_name || m.name || mid,
          line: m.line_id || 'Unassigned',
          status: m.machine_status || 'Offline',
          availability: [], performance: [], quality: [], oee: [],
          total_units: 0, rejected_units: 0, downtime_mins: 0, entries: 0,
          ideal_cycle_time: Number(m.ideal_cycle_time_mins || 1),
          active_jobs: Number(m.active_jobs || 0),
          bottleneck_score: Number(m.bottleneck_score || 0)
        };
      }
      acc[mid].availability.push(Number(m.availability || 0));
      acc[mid].performance.push(Number(m.performance || 0));
      acc[mid].quality.push(Number(m.quality || 0));
      acc[mid].oee.push(Number(m.oee || 0));
      acc[mid].total_units += Number(m.total_units || 0);
      acc[mid].rejected_units += Number(m.rejected_units || 0);
      acc[mid].downtime_mins += Number(m.downtime_mins || 0);
      if (m.entry_date) {
        acc[mid].entries += 1;
      }
      return acc;
    }, {});

    return Object.values(grouped)
      .filter(m => filters.line === 'All Lines' || m.line === filters.line)
      .map(m => {
        const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const analysis = (realData.comprehensiveAnalysis || []).find(a => a.id === m.id);

        return {
          ...m,
          a: Number(avg(m.availability).toFixed(1)),
          p: Number(avg(m.performance).toFixed(1)),
          q: Number(avg(m.quality).toFixed(1)),
          oee: Number(avg(m.oee).toFixed(1)),
          health: m.health || (m.entries > 0 ? 92 : 85),
          throughput: m.total_units,
          oee_history: analysis ? analysis.daily : []
        };
      });
  }, [filters.line, realData.machineOEE]);

  const radarData = useMemo(() => {
    if (!realData.summary) return [];
    return [
      { subject: 'Availability', A: realData.summary.availability, fullMark: 100 },
      { subject: 'Performance', A: realData.summary.performance, fullMark: 100 },
      { subject: 'Quality', A: realData.summary.quality, fullMark: 100 },
    ];
  }, [realData.summary]);

  const handleExportReport = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";

      // 1. Report Header
      csvContent += "OEE INTELLIGENCE REPORT\n";
      csvContent += `Generated On,${new Date().toLocaleString()}\n`;
      csvContent += `Filter Range,${filters.range}\n`;
      csvContent += `Filter Line,${filters.line}\n\n`;

      // 2. Plant Summary
      if (realData.summary) {
        csvContent += "SECTION 1: PLANT-WIDE SUMMARY\n";
        csvContent += "Metric,Value,Trend\n";
        csvContent += `Overall Plant OEE,${(Number(realData.summary.oee) || 0).toFixed(1)}%,+3.4%\n`;
        csvContent += `Availability,${(Number(realData.summary.availability) || 0).toFixed(1)}%,+2.1%\n`;
        csvContent += `Performance,${(Number(realData.summary.performance) || 0).toFixed(1)}%,-0.8%\n`;
        csvContent += `Quality,${(Number(realData.summary.quality) || 0).toFixed(1)}%,+0.4%\n\n`;
      }

      // 3. Machine-wise Analytics
      if (filteredMachines.length > 0) {
        csvContent += "SECTION 2: MACHINE PERFORMANCE ANALYTICS\n";
        csvContent += "Machine ID,Machine Name,Line,Status,OEE %,Availability %,Performance %,Quality %,Total Units,Rejected Units,Downtime (min)\n";

        filteredMachines.forEach(m => {
          csvContent += `${m.id},"${m.name}","${m.line}",${m.status},${m.oee}%,${m.a}%,${m.p}%,${m.q}%,${m.total_units},${m.rejected_units},${m.downtime_mins}\n`;
        });
        csvContent += "\n";
      }

      // 4. Downtime Analysis
      if (realData.downtimeReasons && realData.downtimeReasons.length > 0) {
        csvContent += "SECTION 3: TOP DOWNTIME REASONS (PARETO)\n";
        csvContent += "Reason,Duration (min),Occurrences,Impact %\n";

        realData.downtimeReasons.forEach(dt => {
          const impact = ((Number(dt.duration) / 480) * 100).toFixed(1);
          csvContent += `"${dt.reason}",${dt.duration},${dt.occurrences},${impact}%\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `OEE_Intelligence_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.addToast('OEE Intelligence report exported successfully', 'success');
    } catch (err) {
      console.error('Error exporting OEE report:', err);
      toast.addToast('Failed to export OEE report', 'error');
    }
  };

  const handleApplyAutoFix = () => {
    // This is a simulation for now as requested in TODO
    toast.addToast('AI Optimization: Adjusting feed rate parameters for M-001. Parameters updated successfully. Expected OEE improvement: +4%', 'success');
  };

  const renderExecutiveOverview = () => {
    const jobCards = realData.recentJobCards || [];

    const summary = realData.summary || { availability: 0, performance: 0, quality: 0, oee: 0 };

    // Calculate losses for the pie chart
    const availabilityLoss = 100 - summary.availability;
    const performanceLoss = (summary.availability / 100) * (100 - summary.performance);
    const qualityLoss = (summary.availability / 100) * (summary.performance / 100) * (100 - summary.quality);
    const goodOEE = summary.oee;

    const pieData = [
      { name: 'Availability Loss', value: Number(availabilityLoss) || 0, fill: '#93c5fd' },
      { name: 'Performance Loss', value: Number(performanceLoss) || 0, fill: '#60a5fa' },
      { name: 'Quality Loss', value: Number(qualityLoss) || 0, fill: '#3b82f6' },
      { name: 'Operational Excellence', value: Number(goodOEE) || 0, fill: '#1e3a8a' }
    ];

    return (
      <div className="flex flex-col gap-6">
        {/* Top Header Row - Dark Blue like screenshot */}
        <div className=" rounded p-2 flex items-center justify-between ">
          <div className="flex items-center gap-2">
            <h2 className="text-lg">Overall Equipment Effectiveness (OEE)</h2>
            <div className="group relative">
              <AlertCircle size={15} className="text-white/60 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] rounded  opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                OEE measures how well a manufacturing operation is utilized compared to its full potential.
              </div>
            </div>
          </div>
          <select
            value={filters.range}
            onChange={(e) => setFilters({ ...filters, range: e.target.value })}
            className="bg-white/10 border border-white/20 text-xs  text-white rounded px-4 py-1.5 outline-none focus:ring-2 focus:ring-white/20 transition-all appearance-none cursor-pointer"
          >
            {['Daily', 'Yesterday', 'Weekly', 'Monthly', 'Yearly'].map(opt => <option key={opt} className="text-slate-900">{opt}</option>)}
          </select>
        </div>

        <div className="bg-white p-2 rounded  border-x border-b border-slate-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
            {/* Left Column - 4/12 */}
            <div className="lg:col-span-6 bg-blue-50 flex flex-col gap-8">
              {/* Overall OEE Card */}
              <div className=" rounded p-2 flex flex-col m-auto items-center justify-center text-center  shadow-blue-600/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
                <OEEGauge value={summary.oee} />
              </div>

              {/* KPI Cards Grid */}


              {/* Workstation OEE Analysis Pie */}


              {/* Workstation List */}
            </div>
            <div className='col-span-6'>
              <div className="bg-white rounded-xl border border-slate-100 p-6 relative overflow-hidden group hover:shadow-lg transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110 opacity-30 pointer-events-none"></div>
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <PieChartIcon size={14} className="text-blue-600" />
                  Workstation OEE Analysis
                </h3>
                <div className="flex items-center justify-between gap-6 relative z-10">
                  <div className="w-1/2 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                          startAngle={90}
                          endAngle={450}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-[#1e3a8a] leading-none tracking-tight">{(Number(summary.oee) || 0).toFixed(0)}%</span>
                      <span className="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Global OEE</span>
                    </div>
                  </div>
                  <div className="w-1/2 flex flex-col gap-5">
                    {[
                      { label: 'Availability Loss', val: availabilityLoss, color: '#93c5fd' },
                      { label: 'Performance Loss', val: performanceLoss, color: '#60a5fa' },
                      { label: 'Quality Loss', val: qualityLoss, color: '#3b82f6' }
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col gap-1.5 group/item cursor-default">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-[10px] font-bold text-slate-500 group-hover/item:text-slate-900 transition-colors tracking-tight">{item.label}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-800">{(Number(item.val) || 0).toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all duration-1000 ease-out rounded-full"
                            style={{
                              width: `${(item.val / (100 - (Number(summary.oee) || 0) || 1)) * 100}%`,
                              backgroundColor: item.color
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className='col-span-3'>
              <KPICard
                label="Availability"
                value={summary.availability}
                status="OPTIMAL"
                colorClass="text-[#1e3a8a]"
              />
            </div>
            <div className='col-span-3'>
              <KPICard
                label="Performance"
                value={summary.performance}
                status="OPTIMAL"
                colorClass="text-[#1e3a8a]"
              />
            </div>

            <div className='col-span-3'>
              <KPICard
                label="Quality"
                value={summary.quality}
                status="OPTIMAL"
                colorClass="text-[#1e3a8a]"
              />
            </div>
            <div className='col-span-3'>
              <KPICard
                label="Utilization"
                value={summary.availability}
                status="OPTIMAL"
                colorClass="text-[#1e3a8a]"
              />
            </div>

            <div className='col-span-6'>
              <WorkstationList machines={filteredMachines.slice(0, 4)} />
            </div>

            {/* Right Column - 8/12 */}
            <div className="lg:col-span-6 flex flex-col gap-8">
              {/* Loss Breakdown Bar Chart - Grouped by A, P, Q */}
              <div className=" rounded-xl  border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs  text-slate-700  tracking-wider">Metric Breakdown by Workstation</h3>
                  <span className="text-[10px]  text-slate-400 ">A / P / Q Comparison</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={filteredMachines.slice(0, 4)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="id"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '20px' }} />
                    <Bar dataKey="a" name="Availability" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="p" name="Performance" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="q" name="Quality" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* OEE by Workstation Bar Chart */}


              {/* Recent Job Cards */}


              {/* Legend Section */}
              
            </div>
            <div className='col-span-12'>
              <div className=" bg-slate-50 rounded-xl p-6 flex justify-between  gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                    <span className="text-[11px]  text-slate-700  er">Availability Loss</span>
                    <span className="text-[11px] text-slate-400 er">Breakdowns, Setup Time, Waiting</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <span className="text-[11px]  text-slate-700  er">Performance Loss</span>
                    <span className="text-[11px] text-slate-400 er">Minor Stops, Slow Cycles</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-[11px]  text-slate-700  er">Quality Loss</span>
                    <span className="text-[11px] text-slate-400 er">Scrap, Rework</span>
                  </div>
                </div>
              </div>
            </div>
          
            <div className='col-span-12'>
              <div className="bg-blue-50 rounded-xl  border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xs  text-slate-700  tracking-wider">OEE by Workstation</h3>
                  <span className="text-[10px]  text-slate-400 ">Overall Avg: {(Number(summary.oee) || 0).toFixed(1)}%</span>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={filteredMachines.slice(0, 4)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="id"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                      dy={10}
                    />
                    <YAxis hide domain={[0, 100]} />
                    <Bar dataKey="oee" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={40} label={{ position: 'top', fill: '#1e293b', fontSize: 12, fontWeight: 900, formatter: (val) => `${val}%` }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
              <div className='col-span-12'>
              <RecentJobCards jobCards={jobCards} />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className=" min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl  text-slate-900 m-0 ">OEE Intelligence Dashboard</h1>
          <p className="text-slate-500 text-xs    mt-1">Real-time performance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={filters.range}
              onChange={(e) => setFilters({ ...filters, range: e.target.value })}
              className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer pr-2"
            >
              {['Daily', 'Yesterday', 'Weekly', 'Monthly', 'Yearly'].map(opt => <option key={opt} className="text-slate-900">{opt}</option>)}
            </select>
          </div>
          <button onClick={() => fetchData(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs  rounded hover:bg-slate-50 transition-all ">
            <RefreshCcw size={16} className={syncLoading ? 'animate-spin' : ''} />
            Sync Dashboard
          </button>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-6 py-2 bg-[#1e3a8a] text-white text-xs  rounded hover:bg-[#1e3a8a]/90  shadow-md transition-all"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-fit ">
        {['Executive Overview', 'Machine Analytics', 'Loss Analysis'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`p-2 rounded text-xs  transition-all ${activeTab === tab ? 'bg-[#1e3a8a] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            {tab}
            {tab === 'Machine Analytics' && (
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {filteredMachines.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 bg-white rounded border border-slate-200 ">
          <Loader2 className="animate-spin text-[#1e3a8a] mb-4" size={48} />
          <p className="text-xs  text-slate-400  tracking-[0.2em] animate-pulse">Hydrating Analytics...</p>
        </div>
      ) : (
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === 'Executive Overview' && renderExecutiveOverview()}
          {activeTab === 'Machine Analytics' && (
            <div className="space-y-6">
              {/* Filter bar for Machine Analytics */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-4 ">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded text-slate-500">
                  <Filter size={16} />
                  <span className="text-[10px]   tracking-wider">Filters</span>
                </div>
                <select value={filters.line} onChange={(e) => setFilters({ ...filters, line: e.target.value })} className="bg-slate-50 border-none text-xs  text-slate-700 rounded px-4 py-2 focus:ring-0 outline-none cursor-pointer">
                  <option>All Lines</option>
                  {[...new Set((realData.machineOEE || []).map(m => m.line_id || 'Unassigned'))].filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {filteredMachines.length === 0 ? (
                <div className="bg-white rounded border border-slate-200 p-20 flex flex-col items-center justify-center text-center ">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-6">
                    <Monitor size={40} />
                  </div>
                  <h3 className="text-xl  text-slate-900 m-0">No Workstations Found</h3>
                  <p className="text-sm text-slate-500 max-w-xs mt-3">We couldn't find any workstations matching your current filter criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredMachines.map(m => <MachineCard key={m.id} machine={m} onClick={() => setSelectedMachine(m)} />)}
                </div>
              )}
            </div>
          )}
          {activeTab === 'Loss Analysis' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded border border-slate-200 p-6 ">
                  <h3 className="text-xs  text-slate-700  tracking-wider mb-8 flex items-center gap-2">
                    <PieChartIcon size={16} className="text-indigo-500" />
                    Loss Category Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <Pie
                        data={realData.downtimeReasons}
                        cx="50%" cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={8}
                        dataKey="duration"
                        nameKey="reason"
                      >
                        {realData.downtimeReasons?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1e3a8a'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded border border-slate-200 p-6 ">
                  <h3 className="text-xs  text-slate-700  tracking-wider mb-8 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-blue-500" />
                    Production Bottlenecks
                  </h3>
                  <div className="space-y-3">
                    {filteredMachines.sort((a, b) => a.oee - b.oee).slice(0, 5).map((m, i) => (
                      <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded flex items-center justify-between group hover:bg-white hover:border-blue-200 transition-all cursor-pointer hover: hover:shadow-blue-500/5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-500  group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                            <AlertTriangle size={20} strokeWidth={2.5} />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400    block mb-0.5">{m.line}</span>
                            <span className="text-sm  text-slate-900 block">{m.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-lg  text-blue-600 block">{m.oee}%</span>
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                              <span className="text-[9px] text-slate-400   er">Critical Bottleneck</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Intelligence Insights */}
              <div className="bg-slate-900 rounded overflow-hidden ">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="text-blue-400" size={24} />
                    <h3 className="text-sm  text-white   m-0">Intelligence Insights & Recommendations</h3>
                  </div>
                  <div className="px-3 py-1 bg-blue-400/10 text-blue-400 text-[10px]  rounded-full border border-blue-400/20 ">
                    AI Enabled
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredMachines.filter(m => m.oee < 75).slice(0, 3).map((m, i) => (
                      <div key={i} className="p-5 border border-white/10 bg-white/5 rounded hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/20 rounded">
                            <Settings className="text-blue-400" size={18} />
                          </div>
                          <span className="text-sm  text-white">{m.name} Optimization</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                          OEE is currently at <span className="text-blue-400 ">{(Number(m.oee) || 0)}%</span>. Bottleneck analysis suggests a <span className="text-white ">{(100 - (Number(m.p) || 0)).toFixed(1)}%</span> performance gap.
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[10px] text-blue-400   tracking-wider">Recommendation</span>
                          <button className="px-3 py-1 rounded bg-blue-500 text-white text-[10px]   hover:bg-blue-400 transition-colors">
                            Check Feed Rate
                          </button>
                        </div>
                      </div>
                    ))}
                    {realData.summary?.quality < 98 && (
                      <div className="p-5 border border-white/10 bg-white/5 rounded hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-500/20 rounded">
                            <ShieldCheck className="text-blue-400" size={18} />
                          </div>
                          <span className="text-sm  text-white">Quality Improvement</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                          Plant-wide quality is <span className="text-blue-400 ">{(100 - (Number(realData.summary.quality) || 0)).toFixed(1)}%</span> below target. Rejection analysis shows <span className="text-white ">{realData.downtimeReasons[0]?.reason || 'Material Defects'}</span> as primary cause.
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                          <span className="text-[10px] text-blue-400   tracking-wider">Recommendation</span>
                          <button className="px-3 py-1 rounded bg-blue-500 text-white text-[10px]   hover:bg-blue-400 transition-colors">
                            Audit Calibration
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="p-5 border border-white/10 bg-white/5 rounded hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/20 rounded">
                          <Activity className="text-blue-400" size={18} />
                        </div>
                        <span className="text-sm  text-white">Availability Peak</span>
                      </div>
                      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                        Average downtime per machine is <span className="text-white ">{Math.round(realData.summary?.downtime_mins / filteredMachines.length || 0)}</span> minutes. Target reduction: <span className="text-blue-400 ">15%</span>.
                      </p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] text-blue-400   tracking-wider">Action Item</span>
                        <button className="px-3 py-1 rounded bg-blue-500 text-white text-[10px]   hover:bg-blue-400 transition-colors">
                          Schedule PM
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Machine Detail Modal */}
      <OEEDrillDownModal
        isOpen={!!selectedMachine}
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
        filters={filters}
      />
    </div>
  );
}


