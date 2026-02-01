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
  CheckCircle2, Monitor, RefreshCw, ArrowUpRight, ArrowDownRight,
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
      <div className="bg-white rounded shadow-2xl max-w-5xl w-full  overflow-hidden flex flex-col">
        <div className="bg-slate-900 p-2 flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl  m-0 flex items-center gap-2">
              <Monitor size={20} className="text-blue-400" />
              {machine.name}
            </h2>
            <p className="text-slate-400 text-xs mt-1 m-0">Machine ID: {machine.id} • {machine.workstationType}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {/* Machine KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
            {[
              { label: 'Availability', value: machine.availability, color: 'indigo' },
              { label: 'Performance', value: machine.performance, color: 'blue' },
              { label: 'Quality', value: machine.quality, color: 'emerald' },
              { label: 'OEE', value: machine.oee, color: 'orange' }
            ].map((kpi) => (
              <div key={kpi.label} className={`bg-${kpi.color}-50 rounded p-4 border border-${kpi.color}-100`}>
                <p className="text-xs   text-slate-500  mb-1 m-0">{kpi.label}</p>
                <p className={`text-xl   text-${kpi.color}-700 m-0`}>{kpi.value}%</p>
                <div className="w-full h-1.5 bg-white rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full bg-${kpi.color}-500 rounded-full transition-all duration-1000`} 
                    style={{ width: `${kpi.value}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="bg-slate-50 rounded p-4 border border-slate-200">
              <p className="text-xs   text-slate-500  mb-1 m-0">Uptime</p>
              <p className="text-xl  text-slate-900 m-0">{machine.uptimeHours}h</p>
            </div>
            <div className="bg-slate-50 rounded p-4 border border-slate-200">
              <p className="text-xs   text-slate-500  mb-1 m-0">Allocation</p>
              <p className="text-xl  text-slate-900 m-0">{machine.allocation}h</p>
            </div>
            <div className="bg-amber-50 rounded p-4 border border-amber-200">
              <p className="text-xs   text-amber-900  mb-1 m-0">Downtime</p>
              <p className="text-xl  text-amber-700 m-0">{machine.downtime}h</p>
            </div>
            <div className="bg-rose-50 rounded p-4 border border-rose-200">
              <p className="text-xs   text-rose-900  mb-1 m-0">Rejection</p>
              <p className="text-xl  text-rose-700 m-0">{machine.rejectionRate}%</p>
            </div>
          </div>

          <div className="bg-white rounded border border-slate-200 overflow-hidden ">
            <div className="bg-slate-50 p-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-slate-500" />
                <h3 className="text-xs  text-slate-900 m-0">Historical Performance</h3>
              </div>
              <div className="flex bg-white rounded p-1 border border-slate-200 gap-1">
                {['daily', 'weekly', 'monthly'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`p-2  py-1.5 rounded  text-xs    transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 h-[400px]">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertTriangle size={32} className="text-amber-500 mb-2" />
                  <p className="text-slate-600 text-xs">{error}</p>
                </div>
              ) : historyLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="animate-spin mb-4">
                    <RefreshCw size={32} className="text-blue-600" />
                  </div>
                  <p className="text-slate-600 text-xs">Synchronizing historical metrics...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'daily' ? (
                    <AreaChart data={historyData.daily}>
                      <defs>
                        <linearGradient id="colorOEE" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Area type="monotone" dataKey="oee" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOEE)" name="OEE %" />
                      <Line type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={2} dot={false} name="Performance %" />
                    </AreaChart>
                  ) : activeTab === 'weekly' ? (
                    <BarChart data={historyData.weekly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avg_performance" fill="#3b82f6" name="Avg Performance %" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_efficiency" fill="#10b981" name="Avg Efficiency %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={historyData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="avg_performance_percentage" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6'}} name="Avg Performance %" />
                      <Line type="monotone" dataKey="avg_efficiency_percentage" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981'}} name="Avg OEE %" />
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

const StatCard = ({ label, value, icon: Icon, color, trend, trendValue, trendDirection }) => (
  <div className={`bg-gradient-to-br ${color} p-5 rounded border border-white/20  transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group`}>
    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-110 transition-transform" />
    <div className="flex items-start justify-between mb-2">
      <span className="text-xs    text-slate-500 ">{label}</span>
      <div className="p-2 bg-white/60 rounded ">
        <Icon size={18} className="text-slate-700" />
      </div>
    </div>
    <p className="text-xl   text-slate-900 mb-2">{value}</p>
    <div className="flex items-center justify-between">
      <p className="text-xs  text-slate-500  tracking-tighter">{trend}</p>
      {trendValue && (
        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs   ${trendDirection === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {trendDirection === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
          {trendValue}
        </div>
      )}
    </div>
  </div>
)

const MachineAnalysis = () => {
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [error, setError] = useState(null)
  const [machineDetails, setMachineDetails] = useState([])
  const [machineStatus, setMachineStatus] = useState([])
  const [machineEfficiency, setMachineEfficiency] = useState([])
  const [averagePerformance, setAveragePerformance] = useState(0)
  const [averageUtilization, setAverageUtilization] = useState(0)
  const [averageQuality, setAverageQuality] = useState(0)
  const [averageOEE, setAverageOEE] = useState(0)
  const [workstations, setWorkstations] = useState([])
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshTime, setRefreshTime] = useState(new Date())
  
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

        setMachineDetails(processedMachines)
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
          efficiency: t.oee,
          availability: t.availability,
          performance: t.performance
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
    <div className="w-full bg-slate-50 min-h-screen p-4 md:p-3">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 my-4 mb-3">
          <div>
            <h1 className="text-xl  text-slate-900 flex items-center gap-2">
              <Monitor className="text-blue-600" /> Machine Analysis
            </h1>
            <p className="text-slate-500 text-xs   mt-1">
              Live Factory Performance & Intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-xs   text-slate-400 ">Last Synchronized</p>
              <p className="text-xs  text-slate-700">{refreshTime.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={syncLoading}
              className={`flex items-center gap-2 p-2.5 bg-slate-900 text-white rounded hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 text-xs ${syncLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={14} className={syncLoading ? 'animate-spin' : ''} /> 
              {syncLoading ? 'Syncing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-3">
          <StatCard 
            label="Overall OEE" 
            value={`${averageOEE}%`}
            icon={Activity}
            color="from-blue-50 to-blue-100"
            trend="Efficiency Rating"
          />
          <StatCard 
            label="Avg Performance" 
            value={`${averagePerformance}%`}
            icon={TrendingUp}
            color="from-emerald-50 to-emerald-100"
            trend="Production Output"
          />
          <StatCard 
            label="Avg Availability" 
            value={`${averageUtilization}%`}
            icon={Clock}
            color="from-amber-50 to-amber-100"
            trend="Machine Uptime"
          />
          <StatCard 
            label="Avg Quality" 
            value={`${averageQuality}%`}
            icon={CheckCircle2}
            color="from-indigo-50 to-indigo-100"
            trend="Good Units %"
          />
          <StatCard 
            label="Active Units" 
            value={machineDetails.filter(m => m.status === 'Operational').length}
            icon={Zap}
            color="from-purple-50 to-purple-100"
            trend="Operational Status"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-200">
          {['overview', 'machines', 'efficiency'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-6  py-2 text-xs   border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Status Distribution */}
              <div className="bg-white rounded border border-slate-200 p-3 ">
                <h3 className="text-xs  text-slate-900 mb-6  flex items-center gap-2">
                  <PieIcon size={18} className="text-slate-400" /> Status Distribution
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={machineStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {machineStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Work Time vs Downtime */}
              <div className="lg:col-span-2 bg-white rounded border border-slate-200 p-3 ">
                <h3 className="text-xs  text-slate-900 mb-6  flex items-center gap-2">
                  <BarChart3 size={18} className="text-slate-400" /> Work Time vs Downtime (h)
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={machineDetails.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{fontSize: 10}} />
                      <YAxis tick={{fontSize: 10}} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="uptimeHours" name="Work Time" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="downtime" name="Downtime" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Overall Efficiency Area Chart */}
            <div className="bg-white rounded border border-slate-200 p-3 ">
              <h3 className="text-xs  text-slate-900 mb-6  flex items-center gap-2">
                <TrendingUp size={18} className="text-slate-400" /> Factory Efficiency Trend
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={machineEfficiency}>
                    <defs>
                      <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="period" hide />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorEff)" name="OEE %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div className="bg-white rounded border border-slate-200  overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-1 max-w-md gap-2">
                <Monitor className="text-slate-400 mt-2" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by Machine Code or Name..."
                  className="w-full bg-white border border-slate-200 rounded  p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="bg-white border border-slate-200 rounded  p-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                {workstationTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="">
              <table className="w-full text-left bg-white border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-2 text-xs   text-slate-500 ">Identification</th>
                    <th className="p-2 text-xs   text-slate-500 ">Status</th>
                    <th className="p-2 text-xs   text-slate-500 ">OEE %</th>
                    <th className="p-2 text-xs   text-slate-500 ">Availability</th>
                    <th className="p-2 text-xs   text-slate-500 ">Utilization</th>
                    <th className="p-2 text-xs   text-slate-500 ">Performance</th>
                    <th className="p-2 text-xs   text-slate-500  text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMachines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-2">
                        <p className="text-xs  text-slate-900 m-0">{m.name}</p>
                        <p className="text-xs   text-slate-400 m-0">{m.id} • {m.workstationType}</p>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs   tracking-tighter ${
                          m.status === 'Operational' ? 'bg-emerald-100 text-emerald-700' : 
                          m.status === 'Maintenance' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            m.status === 'Operational' ? 'bg-emerald-500' : 
                            m.status === 'Maintenance' ? 'bg-amber-500' : 'bg-slate-400'
                          }`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs  text-slate-900 w-10">{m.oee}%</span>
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-24 overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full rounded-full ${m.oee > 85 ? 'bg-emerald-500' : m.oee > 70 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                              style={{ width: `${m.oee}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-xs  text-slate-600">{m.availability}%</td>
                      <td className="p-2 text-xs  text-slate-600">{m.utilization}%</td>
                      <td className="p-2 text-xs  text-slate-600">{m.performance}%</td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => { setSelectedMachine(m); setModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs   text-slate-500 ">
                Showing {(currentMachinePage-1)*itemsPerPage + 1} - {Math.min(currentMachinePage*itemsPerPage, filteredMachines.length)} of {filteredMachines.length}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentMachinePage(p => Math.max(1, p-1))}
                  disabled={currentMachinePage === 1}
                  className="p-2 border border-slate-200 rounded hover:bg-white disabled:opacity-50 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setCurrentMachinePage(p => Math.min(Math.ceil(filteredMachines.length/itemsPerPage), p+1))}
                  disabled={currentMachinePage >= Math.ceil(filteredMachines.length/itemsPerPage)}
                  className="p-2 border border-slate-200 rounded hover:bg-white disabled:opacity-50 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Efficiency Tab Content */}
        {activeTab === 'efficiency' && (
          <div className="bg-white rounded border border-slate-200 p-3 ">
            <h3 className="text-xs  text-slate-900 mb-3  flex items-center gap-2">
              <Activity size={18} className="text-slate-400" /> Multi-Metric Performance Analysis
            </h3>
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={machineEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{fontSize: 10}} />
                  <YAxis domain={[0, 100]} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={3} name="OEE %" dot={{r: 4}} />
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
    </div>
  )
}

export default MachineAnalysis
