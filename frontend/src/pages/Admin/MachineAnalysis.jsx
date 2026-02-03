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
    <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-neutral-200">
        {/* Modal Header */}
        <div className="p-2 border-b border-neutral-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded bg-blue-50 flex items-center justify-center text-blue-600">
              <Monitor size={24} />
            </div>
            <div>
              <h2 className="text-xl  text-neutral-900 m-0">
                {machine.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs    text-neutral-400">Machine ID:</span>
                <span className="text-xs  text-neutral-600">{machine.id}</span>
                <span className="w-1 h-1 rounded-full bg-neutral-300 mx-1"></span>
                <span className="text-xs font-medium text-neutral-500">{machine.workstationType}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 bg-neutral-50/30">
          {/* Main KPI Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Availability', value: machine.availability, color: '#3b82f6', icon: Clock },
              { label: 'Performance', value: machine.performance, color: '#f59e0b', icon: Activity },
              { label: 'Quality', value: machine.quality, color: '#10b981', icon: CheckCircle2 },
              { label: 'Overall OEE', value: machine.oee, color: '#6366f1', icon: BarChart3 }
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-xl p-2 border border-neutral-200  relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: kpi.color }}></div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs  text-neutral-400   mb-1 m-0">{kpi.label}</p>
                    <p className="text-xl  text-neutral-900 m-0">{kpi.value}%</p>
                  </div>
                  <div className="p-2 rounded" style={{ backgroundColor: `${kpi.color}10`, color: kpi.color }}>
                    <kpi.icon size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs  text-neutral-400  ">
                    <span>Efficiency</span>
                    <span>{kpi.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${kpi.value}%`, backgroundColor: kpi.color }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Secondary Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Uptime', value: `${machine.uptimeHours}h`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Allocation', value: `${machine.allocation}h`, icon: Calendar, color: 'text-neutral-600', bg: 'bg-neutral-100' },
              { label: 'Downtime', value: `${machine.downtime}h`, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Rejection', value: `${machine.rejectionRate}%`, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-4 border border-neutral-200  flex items-center gap-4 transition-all hover:border-neutral-300">
                <div className={`w-10 h-10 rounded ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-xs  text-neutral-400   mb-0.5 m-0">{stat.label}</p>
                  <p className="text-lg  text-neutral-900 m-0">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Historical Performance Chart Section */}
          <div className="bg-white rounded border border-neutral-200  overflow-hidden">
            <div className="p-2 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <h3 className="text-sm  text-neutral-900 m-0">Historical Performance</h3>
                  <p className="text-xs text-neutral-500 m-0   font-medium">Trends and analytics across periods</p>
                </div>
              </div>
              <div className="flex bg-neutral-100 p-1 rounded gap-1">
                {['daily', 'weekly', 'monthly'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-md text-xs  transition-all ${
                      activeTab === tab
                        ? 'bg-white text-blue-600 '
                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/50'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 h-[350px]">
              {error ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <AlertTriangle size={32} className="text-amber-500 mb-2" />
                  <p className="text-neutral-600 text-xs font-medium">{error}</p>
                </div>
              ) : historyLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <RefreshCw size={32} className="text-blue-500 animate-spin mb-4" />
                  <p className="text-neutral-600 text-xs font-medium  ">Analyzing historical metrics...</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === 'daily' ? (
                    <AreaChart data={historyData.daily}>
                      <defs>
                        <linearGradient id="colorOEE" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}}
                        dy={10}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                      />
                      <Area type="monotone" dataKey="oee" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorOEE)" name="OEE %" />
                      <Area type="monotone" dataKey="performance" stroke="#f59e0b" strokeWidth={2} fill="transparent" name="Performance %" />
                    </AreaChart>
                  ) : activeTab === 'weekly' ? (
                    <BarChart data={historyData.weekly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="week" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}}
                        dy={10}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: '' }} />
                      <Bar dataKey="avg_performance" fill="#3b82f6" name="Avg Performance %" radius={[4, 4, 0, 0]} barSize={30} />
                      <Bar dataKey="avg_efficiency" fill="#10b981" name="Avg Efficiency %" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  ) : (
                    <LineChart data={historyData.monthly}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}}
                        dy={10}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 700, textTransform: '' }} />
                      <Line type="monotone" dataKey="avg_performance_percentage" stroke="#8b5cf6" strokeWidth={4} dot={{r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} name="Avg Performance %" />
                      <Line type="monotone" dataKey="avg_efficiency_percentage" stroke="#10b981" strokeWidth={4} dot={{r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} name="Avg OEE %" />
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

const StatCard = ({ label, value, icon: Icon, color, accentColor, trend }) => (
  <div className="bg-white p-2 rounded border border-neutral-200  transition-all duration-300 hover:shadow-md hover:-translate-y-1 relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: accentColor }} />
    <div className="flex items-start justify-between mb-4">
      <div className="p-2.5 rounded" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
        <Icon size={20} />
      </div>
    </div>
    <div>
      <p className="text-xs  text-neutral-400   mb-1 m-0">{label}</p>
      <h3 className="text-xl  text-neutral-900 m-0">{value}</h3>
    </div>
    <div className="mt-4 flex items-center gap-1.5">
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
      <p className="text-xs  text-neutral-500   m-0">{trend}</p>
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
    <div className="w-full bg-neutral-50/50 min-h-screen p-2">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
          <div>
            <h1 className="text-xl  text-neutral-900 flex items-center gap-3 m-0">
              <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Monitor size={15} />
              </div>
              Machine Analysis
            </h1>
            <p className="text-xs font-medium text-neutral-500 mt-2">
              Live Factory Performance & Intelligence
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs  text-neutral-400  tracking-widest m-0">Last Synchronized</p>
              <p className="text-xs  text-neutral-700 m-0">{refreshTime.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={syncLoading}
              className={`flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-all shadow-xl shadow-neutral-900/10 text-xs  ${syncLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
            accentColor="#6366f1"
            trend="Efficiency Rating"
          />
          <StatCard 
            label="Avg Performance" 
            value={`${averagePerformance}%`}
            icon={TrendingUp}
            accentColor="#f59e0b"
            trend="Production Output"
          />
          <StatCard 
            label="Avg Availability" 
            value={`${averageUtilization}%`}
            icon={Clock}
            accentColor="#3b82f6"
            trend="Machine Uptime"
          />
          <StatCard 
            label="Avg Quality" 
            value={`${averageQuality}%`}
            icon={CheckCircle2}
            accentColor="#10b981"
            trend="Good Units %"
          />
          <StatCard 
            label="Active Units" 
            value={machineDetails.filter(m => m.status === 'Operational').length}
            icon={Zap}
            accentColor="#8b5cf6"
            trend="Operational Status"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-8 border-b border-neutral-200">
          {['overview', 'machines', 'efficiency'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-xs   tracking-widest transition-all relative ${
                activeTab === tab
                  ? 'text-blue-600'
                  : 'text-neutral-400 hover:text-neutral-600'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Overview Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Status Distribution */}
              <div className="bg-white rounded-xl border border-neutral-200 p-2 ">
                <h3 className="text-xs  text-neutral-400  tracking-widest mb-6 flex items-center gap-2">
                  <PieIcon size={16} className="text-neutral-400" /> Status Distribution
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
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: '' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Work Time vs Downtime */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-2 ">
                <h3 className="text-xs  text-neutral-400  tracking-widest mb-6 flex items-center gap-2">
                  <BarChart3 size={16} className="text-neutral-400" /> Work Time vs Downtime (h)
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={machineDetails.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: '', paddingBottom: '20px' }} />
                      <Bar dataKey="uptimeHours" name="Work Time" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} barSize={20} />
                      <Bar dataKey="downtime" name="Downtime" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Overall Efficiency Area Chart */}
            <div className="bg-white rounded-xl border border-neutral-200 p-2 ">
              <h3 className="text-xs  text-neutral-400  tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-neutral-400" /> Factory Efficiency Trend
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={machineEfficiency}>
                    <defs>
                      <linearGradient id="colorEff" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="period" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 600}} />
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                    <Area type="monotone" dataKey="efficiency" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorEff)" name="OEE %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Machines Tab */}
        {activeTab === 'machines' && (
          <div className="bg-white rounded border border-neutral-200  overflow-hidden">
            <div className="p-2 bg-neutral-50/50 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-1 max-w-md relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search machines..."
                  className="w-full bg-white border border-neutral-200 rounded pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-neutral-400" />
                <select 
                  className="bg-white border border-neutral-200 rounded px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none pr-8 cursor-pointer"
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
                  <tr className="bg-neutral-50/50 border-b border-neutral-200">
                    <th className="p-2 text-xs  text-neutral-400  ">Identification</th>
                    <th className="p-2 text-xs  text-neutral-400  ">Status</th>
                    <th className="p-2 text-xs  text-neutral-400  ">OEE Performance</th>
                    <th className="p-2 text-xs  text-neutral-400   text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {paginatedMachines.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="p-2">
                        <p className="text-xs  text-neutral-900 m-0">{m.name}</p>
                        <p className="text-xs  text-neutral-400   m-0 mt-0.5">{m.id} • {m.workstationType}</p>
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs    ${
                          m.status === 'Operational' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                          m.status === 'Maintenance' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-neutral-50 text-neutral-600 border border-neutral-100'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            m.status === 'Operational' ? 'bg-emerald-500' : 
                            m.status === 'Maintenance' ? 'bg-amber-500' : 'bg-neutral-400'
                          }`} />
                          {m.status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-4">
                          <span className="text-sm  text-neutral-900 w-10">{m.oee}%</span>
                          <div className="flex-1 h-2 bg-neutral-100 rounded-full w-32 overflow-hidden hidden sm:block">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${m.oee > 85 ? 'bg-emerald-500' : m.oee > 70 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                              style={{ width: `${m.oee}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => { setSelectedMachine(m); setModalOpen(true); }}
                          className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                          title="View Details"
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
            <div className="p-2 bg-neutral-50/30 border-t border-neutral-200 flex items-center justify-between">
              <p className="text-xs  text-neutral-400  tracking-widest">
                Showing {(currentMachinePage-1)*itemsPerPage + 1} - {Math.min(currentMachinePage*itemsPerPage, filteredMachines.length)} of {filteredMachines.length}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentMachinePage(p => Math.max(1, p-1))}
                  disabled={currentMachinePage === 1}
                  className="p-2 text-neutral-500 border border-neutral-200 rounded hover:bg-white hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setCurrentMachinePage(p => Math.min(Math.ceil(filteredMachines.length/itemsPerPage), p+1))}
                  disabled={currentMachinePage >= Math.ceil(filteredMachines.length/itemsPerPage)}
                  className="p-2 text-neutral-500 border border-neutral-200 rounded hover:bg-white hover:text-blue-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Efficiency Tab Content */}
        {activeTab === 'efficiency' && (
          <div className="bg-white rounded-xl border border-neutral-200 p-6 ">
            <h3 className="text-xs  text-neutral-400  tracking-widest mb-6 flex items-center gap-2">
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
    </div>
  )
}

export default MachineAnalysis
