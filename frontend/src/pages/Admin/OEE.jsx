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
import { getOEEDashboardData, getMachineHistoricalMetrics, getAllMachinesAnalysis } from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

// --- High Density UI Components ---

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

  const kpis = [
    { label: 'AVAILABILITY', value: machine.a || machine.availability || 0, color: '#6366f1', icon: Clock },
    { label: 'PERFORMANCE', value: machine.p || machine.performance || 0, color: '#3b82f6', icon: Activity },
    { label: 'QUALITY', value: machine.q || machine.quality || 0, color: '#10b981', icon: CheckCircle2 },
    { label: 'OVERALL OEE', value: machine.oee || 0, color: '#4338ca', icon: Gauge }
  ]

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white  rounded  max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
        {/* Modal Header */}
        <div className="p-6 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 border border-indigo-100 ">
              <Monitor size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-xl  text-slate-900 m-0">
                {machine.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px]  text-slate-400 ">MACHINE ID:</span>
                <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">{machine.id}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mx-1"></span>
                <span className="text-xs  text-slate-500 uppercase tracking-wide">{machine.line}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all border border-transparent hover:border-rose-100 group"
          >
            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 pt-0">
          {/* Main KPI Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white p-2 rounded border border-slate-200  relative overflow-hidden group hover:shadow-md transition-all duration-300">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                  <div
                    className="h-full transition-all duration-1000 ease-out"
                    style={{ width: `${kpi.value}%`, backgroundColor: kpi.color }}
                  />
                </div>
                <div className="flex justify-between items-start ">
                  <div>
                    <p className="text-[10px]  text-slate-400  mb-2">{kpi.label}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl  text-slate-900">{kpi.value}</span>
                      <span className="text-sm  text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded transition-transform group-hover:scale-110 duration-300" style={{ backgroundColor: `${kpi.color}10`, color: kpi.color }}>
                    <kpi.icon size={20} strokeWidth={2} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Historical Performance Chart Section */}
          <div className="bg-white  rounded  border border-slate-200  overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 ">
                  <TrendingUp size={20} />
                </div>
                <h3 className="text-sm  text-slate-700 ">Historical Performance</h3>
              </div>

              <div className="flex bg-slate-100 p-1 rounded gap-1">
                {['daily', 'weekly', 'monthly'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded text-xs   transition-all ${activeTab === tab
                        ? 'bg-white text-indigo-600 '
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-8">
              {error ? (
                <div className="flex flex-col items-center justify-center h-[350px] text-center bg-rose-50/30  rounded  border border-dashed border-rose-200">
                  <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-4">
                    <AlertTriangle size={32} />
                  </div>
                  <p className="text-rose-900  mb-1">Data Retrieval Error</p>
                  <p className="text-rose-600 text-xs uppercase tracking-wider">{error}</p>
                </div>
              ) : historyLoading ? (
                <div className="flex flex-col items-center justify-center h-[350px] text-center">
                  <div className="relative">
                    <RefreshCcw size={48} className="text-indigo-500 animate-spin mb-6" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-xs  uppercase tracking-[0.2em] animate-pulse">Analyzing Performance Vectors...</p>
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    {activeTab === 'daily' ? (
                      <ComposedChart data={historyData.daily} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorOEE" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                          dy={15}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[0, 'auto']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                          label={{ value: 'OEE %', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 10, fill: '#94a3b8', fontWeight: 700 } }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '16px' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          iconType="circle"
                          wrapperStyle={{ paddingBottom: '40px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                        />
                        <Bar yAxisId="left" dataKey="working_time" fill="#10b981" name="Running Time (min)" radius={[6, 6, 0, 0]} barSize={24} />
                        <Bar yAxisId="left" dataKey="downtime" fill="#f43f5e" name="Downtime (min)" radius={[6, 6, 0, 0]} barSize={24} />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="oee"
                          stroke="#6366f1"
                          strokeWidth={4}
                          dot={{ r: 6, fill: '#fff', stroke: '#6366f1', strokeWidth: 3 }}
                          activeDot={{ r: 8, strokeWidth: 0, fill: '#4338ca' }}
                          name="Overall OEE %"
                        />
                      </ComposedChart>
                    ) : activeTab === 'weekly' ? (
                      <BarChart data={historyData.weekly} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="week"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                          dy={15}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[0, 'auto']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px' }}
                        />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '40px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                        <Bar yAxisId="left" dataKey="working_time" fill="#10b981" name="Running Time (min)" radius={[6, 6, 0, 0]} barSize={24} />
                        <Bar yAxisId="left" dataKey="downtime" fill="#f43f5e" name="Downtime (min)" radius={[6, 6, 0, 0]} barSize={24} />
                        <Bar yAxisId="right" dataKey="avg_efficiency" fill="#6366f1" name="Avg OEE %" radius={[6, 6, 0, 0]} barSize={24} />
                      </BarChart>
                    ) : (
                      <ComposedChart data={historyData.monthly} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                          dy={15}
                        />
                        <YAxis
                          yAxisId="left"
                          domain={[0, 'auto']}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '16px' }}
                        />
                        <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '40px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }} />
                        <Bar yAxisId="left" dataKey="working_time" fill="#10b981" name="Running Time (min)" radius={[8, 8, 0, 0]} barSize={40} />
                        <Bar yAxisId="left" dataKey="downtime" fill="#f43f5e" name="Downtime (min)" radius={[8, 8, 0, 0]} barSize={40} />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="avg_efficiency_percentage"
                          stroke="#6366f1"
                          strokeWidth={4}
                          dot={{ r: 8, fill: '#fff', stroke: '#6366f1', strokeWidth: 4 }}
                          name="Avg OEE %"
                        />
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
         

const StatCard = ({ label, value, subValue, icon: Icon, color, trend, unit = "%", tooltip }) => (
  <div className="bg-white  p-2 border border-slate-200 hover:shadow-xl hover:border-indigo-200 transition-all group relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-150`}></div>
    <div className="flex justify-between items-start relative z-0">
      <div>
        <div className="flex items-center gap-1.5 mb-1 group/label">
          <span className="text-[10px]  text-slate-400 uppercase tracking-wider block">{label}</span>
          {tooltip && (
            <div className="relative">
              <AlertCircle size={10} className="text-slate-300 cursor-help hover:text-indigo-500 transition-colors" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl opacity-0 invisible group-hover/label:opacity-100 group-hover/label:visible transition-all z-50 leading-relaxed">
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
      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]  ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {trend === 'up' ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
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
    <div className="bg-white  border border-slate-200 overflow-hidden ">
      <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider">Production Loss Decomposition</h3>
        <span className="text-[10px]  text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-100">Total Loss: {totalLoss.toFixed(1)}%</span>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {[
            { label: 'Availability Gap', val: availabilityLoss, color: 'bg-indigo-500', desc: 'Downtime & Setup' },
            { label: 'Performance Gap', val: performanceLoss, color: 'bg-blue-500', desc: 'Speed & Minor Stops' },
            { label: 'Quality Gap', val: qualityLoss, color: 'bg-emerald-500', desc: 'Rejects & Rework' }
          ].map((loss, i) => (
            <div key={i} className="group">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-xs  text-slate-700 block">{loss.label}</span>
                  <span className="text-[10px] text-slate-400">{loss.desc}</span>
                </div>
                <span className="text-sm  text-slate-900">{loss.val.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
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
    'Running': { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    'active': { color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    'Idle': { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
    'Down': { color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
    'Maintenance': { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
    'Offline': { color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' }
  };
  const config = statusConfig[machine.status] || statusConfig[machine.status?.toLowerCase()] || statusConfig.Offline;

  return (
    <div
      onClick={onClick}
      className="bg-white  border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all cursor-pointer group overflow-hidden"
    >
      <div className="p-2 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded  bg-white  border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
            <Cpu size={18} />
          </div>
          <div className="min-w-0 items-center">
            <h4 className="text-xs  text-slate-800 m-0 truncate">{machine.name}</h4>
            <span className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">{machine.id}</span>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px]  border ${config.bg} ${config.color} ${config.border} shrink-0`}>
          <div className={`w-1.5 h-1.5 rounded-full ${['Running', 'active'].includes(machine.status) ? 'bg-current animate-pulse' : 'bg-current'}`}></div>
          {machine.status}
        </div>
      </div>

      <div className="p-2">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'A', val: machine.a, color: 'text-indigo-600' },
            { label: 'P', val: machine.p, color: 'text-blue-600' },
            { label: 'Q', val: machine.q, color: 'text-emerald-600' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-50/50 rounded  p-2 border border-slate-100 flex flex-col items-center">
              <span className="text-[9px]  text-slate-400 uppercase mb-1">{stat.label}</span>
              <span className={`text-xs  ${stat.color}`}>{stat.val}%</span>
            </div>
          ))}
        </div>

        {machine.active_jobs > 0 && (
          <div className="mb-3 px-3 py-1.5 bg-indigo-50 rounded  border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-indigo-600" />
              <span className="text-[10px]  text-indigo-700 uppercase">Active Production</span>
            </div>
            <span className="text-[10px]  text-indigo-600">{machine.active_jobs} Jobs</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-[9px]  text-slate-400  leading-none mb-1">Overall OEE</span>
            <span className={`text-lg  ${machine.oee >= 85 ? 'text-emerald-600' : machine.oee >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{machine.oee}%</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 group-hover:text-indigo-600 transition-colors">
            <span className="text-[10px]  uppercase tracking-wider">Analysis</span>
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
    range: 'Today',
    line: 'All Lines',
    shift: 'All Shifts',
    startDate: new Date().toISOString().split('T')[0],
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
    if (filters.range === 'Yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (filters.range === 'Weekly') {
      start.setDate(start.getDate() - 7);
    } else if (filters.range === 'Monthly') {
      start.setMonth(start.getMonth() - 1);
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

      console.log('OEE Dashboard Data:', response);
      console.log('Machine Analysis Data:', analysisRes);

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
        return {
          ...m,
          a: Number(avg(m.availability).toFixed(1)),
          p: Number(avg(m.performance).toFixed(1)),
          q: Number(avg(m.quality).toFixed(1)),
          oee: Number(avg(m.oee).toFixed(1)),
          health: m.health || (m.entries > 0 ? 92 : 85),
          throughput: m.total_units
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
        csvContent += `Overall Plant OEE,${realData.summary.oee.toFixed(1)}%,+3.4%\n`;
        csvContent += `Availability,${realData.summary.availability.toFixed(1)}%,+2.1%\n`;
        csvContent += `Performance,${realData.summary.performance.toFixed(1)}%,-0.8%\n`;
        csvContent += `Quality,${realData.summary.quality.toFixed(1)}%,+0.4%\n\n`;
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
          const impact = ((dt.duration / 480) * 100).toFixed(1);
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

  const renderExecutiveOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard 
          label="Plant Availability" 
          value={(realData.summary?.availability || 0).toFixed(1)} 
          subValue="+2.1%" 
          color="bg-indigo-600" 
          trend="up" 
          icon={Clock} 
          tooltip="Ratio of actual production time to planned time. Losses: Downtime & Setup."
        />
        <StatCard 
          label="Plant Performance" 
          value={(realData.summary?.performance || 0).toFixed(1)} 
          subValue="-0.8%" 
          color="bg-blue-600" 
          trend="down" 
          icon={Activity} 
          tooltip="Ratio of actual speed to ideal speed. Losses: Slow cycles & minor stops."
        />
        <StatCard 
          label="Plant Quality" 
          value={(realData.summary?.quality || 0).toFixed(1)} 
          subValue="+0.4%" 
          color="bg-emerald-600" 
          trend="up" 
          icon={CheckCircle2} 
          tooltip="Ratio of good units produced to total units produced. Losses: Scrap & Rework."
        />
        <div className="bg-slate-900  p-2 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between group/oee">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px]  text-slate-400 uppercase tracking-wider block">Overall Plant OEE</span>
              <div className="relative">
                <AlertCircle size={10} className="text-slate-500 cursor-help hover:text-indigo-400 transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-white text-slate-900 text-[10px] rounded shadow-2xl opacity-0 invisible group-hover/oee:opacity-100 group-hover/oee:visible transition-all z-50 leading-relaxed border border-slate-200">
                  Overall Equipment Effectiveness (Availability × Performance × Quality). Industry world-class benchmark is 85%.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white"></div>
                </div>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl  text-white m-0">{Math.round(realData.summary?.oee || 0)}%</h3>
              <span className="text-xs  text-emerald-400">+3.4%</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${realData.summary?.oee || 0}%` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900  p-2 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 ">
        <div className="flex items-center gap-2">
          <div className="p-2  bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white  shadow-indigo-500/20">
            <Rocket size={15} />
          </div>
          <div>
            <h4 className="text-base  text-white m-0">AI Optimization Engine</h4>
            <p className="text-xs text-slate-400 m-0 mt-1">Found 2 high-impact optimization opportunities for Line 1</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-slate-800/50 border border-slate-700 px-3 py-2 rounded ">
            <span className="text-[10px]  text-indigo-400 block uppercase">Suggestion</span>
            <span className="text-xs text-slate-300">Adjust feed rate on M-001 (+4% OEE)</span>
          </div>
          <button 
            onClick={handleApplyAutoFix}
            className="p-2 bg-white text-slate-900 text-xs  rounded  hover:bg-indigo-50 transition-all shadow-lg"
          >
            Apply Auto-Fix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        <div className="lg:col-span-2 bg-white  border border-slate-200 p-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider">Plant OEE Trend</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px]  text-slate-500 uppercase">Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                <span className="text-[10px]  text-slate-500 uppercase">Target (85%)</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={realData.trends}>
              <defs>
                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="oee" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOee)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white  border border-slate-200 p-2 flex flex-col">
          <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider mb-6">Efficiency Balance</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontBold: 700, fill: '#64748b' }} />
                <Radar name="Plant" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <LossTree summary={realData.summary} />
        <div className="bg-white  border border-slate-200 p-2">
          <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider mb-4">Top Downtime Reasons (Pareto)</h3>
          <div className="space-y-3">
            {realData.downtimeReasons?.slice(0, 5).map((dt, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded  border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-rose-500  text-xs border border-rose-100">{i + 1}</div>
                  <div>
                    <span className="text-xs  text-slate-700 block">{dt.reason}</span>
                    <span className="text-[10px] text-slate-400">{dt.occurrences} occurrences</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs  text-slate-900 block">{dt.duration} min</span>
                  <div className="h-1 w-24 bg-slate-200 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-rose-500" style={{ width: `${(dt.duration / 480) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-2 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl  text-slate-900 m-0">OEE Intelligence Dashboard</h1>
          <p className="text-slate-500 text-xs">Real-time manufacturing performance & bottleneck analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchData(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs  rounded  hover:bg-slate-50 transition-all">
            <RefreshCcw size={16} className={syncLoading ? 'animate-spin' : ''} />
            Sync Dashboard
          </button>
          <button 
            onClick={handleExportReport}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-xs  rounded  hover:bg-indigo-700  shadow-indigo-600/20 transition-all"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 p-2 mb-6 flex flex-wrap items-center gap-2 ">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded  text-slate-500">
          <Filter size={16} />
          <span className="text-[10px]  uppercase tracking-wider">Filters</span>
        </div>
        <select value={filters.range} onChange={(e) => setFilters({ ...filters, range: e.target.value })} className="bg-slate-50 border-none text-xs  text-slate-700 rounded  px-3 py-1.5 focus:ring-0 outline-none">
          {['Today', 'Yesterday', 'Weekly', 'Monthly'].map(opt => <option key={opt}>{opt}</option>)}
        </select>
        <div className="h-6 w-[1px] bg-slate-200"></div>
        <select value={filters.line} onChange={(e) => setFilters({ ...filters, line: e.target.value })} className="bg-slate-50 border-none text-xs  text-slate-700 rounded  px-3 py-1.5 focus:ring-0 outline-none">
          <option>All Lines</option>
          {[...new Set((realData.machineOEE || []).map(m => m.line_id || 'Unassigned'))].filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {['Executive Overview', 'Machine Analytics', 'Loss Analysis'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded  text-xs  transition-all ${activeTab === tab ? 'bg-white text-indigo-600  border border-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
          >
            {tab}
            {tab === 'Machine Analytics' && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-50 text-[10px] text-indigo-600 border border-indigo-100">
                {filteredMachines.length} / {realData.machineOEE?.length || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white  rounded  border border-slate-200 ">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
          <p className="text-sm  text-slate-500 ">Hydrating Dashboard...</p>
        </div>
      ) : (
        <main>
          {activeTab === 'Executive Overview' && renderExecutiveOverview()}
          {activeTab === 'Machine Analytics' && (
            <div className="space-y-4">
              {filteredMachines.length === 0 ? (
                <div className="bg-white  rounded  border border-slate-200 p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                    <Monitor size={32} />
                  </div>
                  <h3 className="text-lg  text-slate-900 m-0">No Workstations Found</h3>
                  <p className="text-sm text-slate-500 max-w-xs mt-2">We couldn't find any workstations matching your current filter criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  {filteredMachines.map(m => <MachineCard key={m.id} machine={m} onClick={() => setSelectedMachine(m)} />)}
                </div>
              )}
            </div>
          )}
          {activeTab === 'Loss Analysis' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div className="bg-white  border border-slate-200 p-2">
                  <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider mb-6">Loss Category Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={realData.downtimeReasons}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="duration"
                        nameKey="reason"
                      >
                        {realData.downtimeReasons?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white  border border-slate-200 p-2">
                  <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider mb-6">Production Bottlenecks</h3>
                  <div className="space-y-4">
                    {filteredMachines.sort((a, b) => a.oee - b.oee).slice(0, 3).map((m, i) => (
                      <div key={i} className="p-2 bg-slate-50  border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded  bg-white border border-slate-200 flex items-center justify-center text-rose-500 ">
                            <AlertTriangle size={20} />
                          </div>
                          <div>
                            <span className="text-xs  text-slate-800 block">{m.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">{m.line}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm  text-rose-600 block">{m.oee}% OEE</span>
                          <span className="text-[10px] text-slate-400  uppercase">Critical Asset</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Intelligence Insights */}
              <div className="bg-white  border border-slate-200 overflow-hidden">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="text-amber-500" size={18} />
                    <h3 className="text-sm  text-slate-900 m-0 uppercase tracking-wider">Intelligence Insights & Recommendations</h3>
                  </div>
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {filteredMachines.filter(m => m.oee < 75).slice(0, 3).map((m, i) => (
                      <div key={i} className="p-2  border border-indigo-100 bg-indigo-50/30">
                        <div className="flex items-center gap-2 mb-3">
                          <Settings className="text-indigo-600" size={16} />
                          <span className="text-xs  text-slate-800">{m.name} Optimization</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mb-4">
                          OEE is currently at {m.oee}%. Bottleneck analysis suggests a {(100 - m.p).toFixed(1)}% performance gap.
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]  text-indigo-600 uppercase">Recommendation</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-[9px]  text-indigo-700">Check Feed Rate</span>
                        </div>
                      </div>
                    ))}
                    {realData.summary?.quality < 98 && (
                      <div className="p-2  border border-emerald-100 bg-emerald-50/30">
                        <div className="flex items-center gap-2 mb-3">
                          <ShieldCheck className="text-emerald-600" size={16} />
                          <span className="text-xs  text-slate-800">Quality Improvement</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mb-4">
                          Plant-wide quality is {(100 - realData.summary.quality).toFixed(1)}% below target. Rejection analysis shows {realData.downtimeReasons[0]?.reason || 'Material Defects'} as primary cause.
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px]  text-emerald-600 uppercase">Recommendation</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-[9px]  text-emerald-700">Audit Calibration</span>
                        </div>
                      </div>
                    )}
                    <div className="p-2  border border-amber-100 bg-amber-50/30">
                      <div className="flex items-center gap-2 mb-3">
                        <Activity className="text-amber-600" size={16} />
                        <span className="text-xs  text-slate-800">Availability Peak</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-4">
                        Average downtime per machine is {Math.round(realData.summary?.downtime_mins / filteredMachines.length || 0)} minutes. Target reduction: 15%.
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]  text-amber-600 uppercase">Action Item</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-[9px]  text-amber-700">Schedule PM</span>
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
      <DetailModal
        isOpen={!!selectedMachine}
        machine={selectedMachine}
        onClose={() => setSelectedMachine(null)}
      />
    </div>
  );
}
