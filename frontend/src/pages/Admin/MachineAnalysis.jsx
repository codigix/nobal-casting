import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { AlertTriangle, Zap, Eye, X, Factory, BarChart3, TrendingUp, Clipboard, Rocket, Wrench, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

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
      const url = `${import.meta.env.VITE_API_URL}/machines/${machine.id}/historical-metrics`
      console.log('[DetailModal] Fetching from:', url)
      const response = await fetch(url)
      console.log('[DetailModal] Response status:', response.status)
      
      const data = await response.json()
      console.log('[DetailModal] Response data:', data)
      
      if (data.success && data.data) {
        console.log('[DetailModal] Data received:', {
          daily: data.data.daily?.length || 0,
          weekly: data.data.weekly?.length || 0,
          monthly: data.data.monthly?.length || 0,
          yearly: data.data.yearly?.length || 0
        })
        setHistoryData(data.data || { daily: [], weekly: [], monthly: [], yearly: [] })
        setError(null)
      } else {
        console.warn('[DetailModal] API response not successful:', data)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex items-center justify-between text-white z-10">
          <div>
            <h2 className="text-2xl font-bold m-0">{machine.name}</h2>
            <p className="text-slate-300 text-sm mt-1 m-0">Machine ID: {machine.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 uppercase mb-2 m-0">Efficiency</p>
              <p className="text-xl font-bold text-blue-700 m-0">{machine.efficiencyPercentage}%</p>
              <p className="text-xs text-slate-600 mt-2">Overall efficiency</p>
            </div>
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <p className="text-xs font-semibold text-green-900 uppercase mb-2 m-0">Uptime</p>
              <p className="text-xl font-bold text-green-700 m-0">{machine.uptimeHours}h</p>
              <p className="text-xs text-slate-600 mt-2">Total uptime hours</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <p className="text-xs font-semibold text-purple-900 uppercase mb-2 m-0">Allocation</p>
              <p className="text-xl font-bold text-purple-700 m-0">{machine.allocation}h</p>
              <p className="text-xs text-slate-600 mt-2">Allocation time (hrs)</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 uppercase mb-2 m-0">Downtime</p>
              <p className="text-xl font-bold text-amber-700 m-0">{machine.downtime}h</p>
              <p className="text-xs text-slate-600 mt-2">Total downtime (hrs)</p>
            </div>
            <div className="bg-red-50 rounded-xl p-6 border border-red-200">
              <p className="text-xs font-semibold text-red-900 uppercase mb-2 m-0">Rejection</p>
              <p className="text-xl font-bold text-red-700 m-0">{machine.rejectionRate}%</p>
              <p className="text-xs text-slate-600 mt-2">Rejection rate</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 mb-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={20} className="text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">Historical Performance Metrics</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold  transition-colors ${
                    activeTab === 'daily'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Daily (30 Days)
                </button>
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold  transition-colors ${
                    activeTab === 'weekly'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Weekly (12 Weeks)
                </button>
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold  transition-colors ${
                    activeTab === 'monthly'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Monthly (12 Months)
                </button>
                <button
                  onClick={() => setActiveTab('yearly')}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold  transition-colors ${
                    activeTab === 'yearly'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}
              
              {historyLoading ? (
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="inline-block p-4 bg-slate-100 rounded-lg mb-2">
                      <div className="animate-spin text-2xl">⏳</div>
                    </div>
                    <p className="text-slate-600 text-sm">Loading metrics...</p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'daily' && historyData.daily && historyData.daily.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold  text-slate-700 mb-4">Daily Performance (Last 30 Days)</h4>
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={historyData.daily}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#64748b" 
                            tick={{ fontSize: 12 }}
                            interval={Math.floor(historyData.daily.length / 6)}
                          />
                          <YAxis stroke="#64748b" domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Line type="monotone" dataKey="performance_percentage" stroke="#f59e0b" name="Performance %" strokeWidth={2} />
                          <Line type="monotone" dataKey="efficiency_percentage" stroke="#10b981" name="Efficiency %" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeTab === 'weekly' && historyData.weekly && historyData.weekly.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold  text-slate-700 mb-4">Weekly Performance Averages</h4>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={historyData.weekly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="week" stroke="#64748b" />
                          <YAxis stroke="#64748b" domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="avg_performance" fill="#3b82f6" name="Avg Performance %" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="avg_efficiency" fill="#06b6d4" name="Avg Efficiency %" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeTab === 'monthly' && historyData.monthly && historyData.monthly.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold  text-slate-700 mb-4">Monthly Performance Trends</h4>
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={historyData.monthly}>
                          <defs>
                            <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="month" stroke="#64748b" />
                          <YAxis stroke="#64748b" domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Area type="monotone" dataKey="avg_performance_percentage" stroke="#8b5cf6" fill="url(#colorMonthly)" name="Avg Performance %" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeTab === 'yearly' && historyData.yearly && historyData.yearly.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold  text-slate-700 mb-4">Yearly Performance Comparison</h4>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={historyData.yearly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="year" stroke="#64748b" />
                          <YAxis stroke="#64748b" domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                          <Bar dataKey="performance" fill="#ef4444" name="Avg Performance %" radius={[8, 8, 0, 0]} />
                          <Bar dataKey="efficiency" fill="#22c55e" name="Avg Efficiency %" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {(!historyData[activeTab] || historyData[activeTab].length === 0) && (
                    <div className="flex items-center justify-center h-80">
                      <div className="text-center">
                        <p className="text-slate-500 text-sm">No data available for {activeTab}</p>
                        <p className="text-slate-400 text-xs mt-1">Data: daily={historyData.daily?.length || 0}, weekly={historyData.weekly?.length || 0}, monthly={historyData.monthly?.length || 0}, yearly={historyData.yearly?.length || 0}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench size={20} className="text-slate-600" />
              <h3 className="text-base font-bold text-slate-900 m-0">Operations & Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="py-2 border-b border-slate-300">
                <span className="text-xs font-semibold text-slate-600 uppercase">Assigned Operations</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{machine.operations || 'N/A'}</p>
              </div>
              <div className="py-2 border-b border-slate-300">
                <span className="text-xs font-semibold text-slate-600 uppercase">Location</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{machine.location || 'N/A'}</p>
              </div>
              <div className="py-2 border-b border-slate-300">
                <span className="text-xs font-semibold text-slate-600 uppercase">Total Jobs</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{machine.totalJobs}</p>
              </div>
              <div className="py-2 border-b border-slate-300">
                <span className="text-xs font-semibold text-slate-600 uppercase">Completed Jobs</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{machine.completedJobs}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Clipboard size={20} className="text-slate-600" />
              <h3 className="text-base font-bold text-slate-900 m-0">Maintenance & Status</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Status:</span>
                <span className={`font-bold px-3 py-1 rounded text-xs ${
                  machine.status === 'Operational' ? 'bg-green-100 text-green-800' :
                  machine.status === 'Maintenance' ? 'bg-amber-100 text-amber-800' :
                  'bg-red-100 text-red-800'
                }`}>{machine.status}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Performance:</span>
                <span className="font-bold text-slate-900">{machine.performance}%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Last Maintenance:</span>
                <span className="font-bold text-slate-900">{machine.lastMaintenance}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Next Maintenance:</span>
                <span className="font-bold text-slate-900">{machine.nextMaintenance}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Total Uptime Hours:</span>
                <span className="font-bold text-slate-900">{machine.uptimeHours} hrs</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Rejection Rate:</span>
                <span className="font-bold text-slate-900">{machine.rejectionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MachineAnalysis() {
  const [machineStatus, setMachineStatus] = useState([])
  const [machineUtilization, setMachineUtilization] = useState([])
  const [machineEfficiency, setMachineEfficiency] = useState([])
  const [machineDetails, setMachineDetails] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [averagePerformance, setAveragePerformance] = useState(0)
  const [averageUtilization, setAverageUtilization] = useState(0)
  const [selectedWorkstationType, setSelectedWorkstationType] = useState('All')
  const [currentMachineDetailsPage, setCurrentMachineDetailsPage] = useState(1)
  const machineDetailsPerPage = 10
  const [timeFilterUtilization, setTimeFilterUtilization] = useState('month')
  const [timeFilterEfficiency, setTimeFilterEfficiency] = useState('monthly')
  const [machineStatusChartType, setMachineStatusChartType] = useState('donut')
  const [workstationTypeChartType, setWorkstationTypeChartType] = useState('donut')

  useEffect(() => {
    fetchMachinesAnalysis().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCurrentMachineDetailsPage(1)
  }, [machineDetails])

  const fetchMachinesAnalysis = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/machines/machines-analysis`)
      const data = await response.json()
      
      if (data.success) {
        const { statusCounts, machines, machineUtilization, machineEfficiency, averagePerformance, averageUtilization } = data.data
        
        const statusData = statusCounts && statusCounts.length > 0 ? statusCounts.map(item => {
          let color = '#6b7280'
          switch (item.status?.toLowerCase()) {
            case 'operational':
              color = '#10b981'
              break
            case 'maintenance':
              color = '#f59e0b'
              break
            case 'down':
              color = '#ef4444'
              break
          }
          return {
            name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
            value: item.count,
            color: color
          }
        }) : []
        
        setMachineStatus(statusData)
        setMachineUtilization(machineUtilization || [])
        setMachineEfficiency(machineEfficiency || [])
        setMachineDetails(machines || [])
        setAveragePerformance(averagePerformance || 0)
        setAverageUtilization(averageUtilization || 0)
      } else {
        setError(data.message || 'Failed to fetch machines analysis')
      }
    } catch (err) {
      console.error('Error fetching machines analysis:', err)
      setError('Error fetching machines data')
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations`)
      const data = await response.json()
      
      if (data.success) {
        setWorkstations(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching workstations:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (machine) => {
    setSelectedMachine(machine)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedMachine(null)
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Operational':
        return 'bg-green-100 text-green-800'
      case 'Maintenance':
        return 'bg-amber-100 text-amber-800'
      case 'Down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCapacityColor = (capacity) => {
    if (capacity >= 90) return 'text-green-600'
    if (capacity >= 70) return 'text-amber-600'
    return 'text-red-600'
  }

  const getWorkloadColor = (workload) => {
    if (workload >= 80) return 'text-red-600'
    if (workload >= 60) return 'text-amber-600'
    return 'text-green-600'
  }

  const getWorkstationStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'maintenance':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getWorkstationTypes = () => {
    const types = new Set(machineDetails.map(m => m.workstationType).filter(Boolean))
    return ['All', ...Array.from(types).sort()]
  }

  const getFilteredMachineStatus = () => {
    if (selectedWorkstationType === 'All') {
      return machineStatus
    }
    const filtered = machineDetails.filter(m => m.workstationType === selectedWorkstationType)
    const statusCounts = {}
    filtered.forEach(machine => {
      const status = machine.status
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    return Object.entries(statusCounts).map(([status, count]) => {
      let color = '#6b7280'
      switch (status?.toLowerCase()) {
        case 'operational':
          color = '#10b981'
          break
        case 'maintenance':
          color = '#f59e0b'
          break
        case 'down':
          color = '#ef4444'
          break
      }
      return {
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: color
      }
    })
  }

  const getWorkstationTypeDistribution = () => {
    const typeCounts = {}
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4',
      '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#0ea5e9'
    ]
    const typeColorMap = {}
    let colorIndex = 0

    machineDetails.forEach(machine => {
      const type = machine.workstationType || 'Unassigned'
      typeCounts[type] = (typeCounts[type] || 0) + 1
      if (!typeColorMap[type]) {
        typeColorMap[type] = colors[colorIndex % colors.length]
        colorIndex++
      }
    })

    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        name: type,
        value: count,
        color: typeColorMap[type]
      }))
      .sort((a, b) => b.value - a.value)
  }

  const totalMachineDetailsPages = Math.ceil(machineDetails.length / machineDetailsPerPage)
  const machineDetailsStartIndex = (currentMachineDetailsPage - 1) * machineDetailsPerPage
  const machineDetailsEndIndex = machineDetailsStartIndex + machineDetailsPerPage
  const paginatedMachineDetails = machineDetails.slice(machineDetailsStartIndex, machineDetailsEndIndex)

  const getMachineWorkTimeData = () => {
    const multipliers = { day: 1, week: 7, month: 30, year: 365 }
    const mult = multipliers[timeFilterUtilization] || 1
    return machineDetails.map(machine => ({
      machine: machine.name,
      worktime: Math.round((machine.allocation || 0) * mult),
      downtime: Math.round((machine.downtime || 0) * mult)
    }))
  }

  const getEfficiencyTrendData = () => {
    const timeData = {
      daily: [
        { period: 'Mon', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Tue', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Wed', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Thu', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Fri', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Sat', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Sun', efficiency: Math.floor(Math.random() * 20) + 75 }
      ],
      weekly: [
        { period: 'Week 1', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Week 2', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Week 3', efficiency: Math.floor(Math.random() * 20) + 75 },
        { period: 'Week 4', efficiency: Math.floor(Math.random() * 20) + 75 }
      ],
      monthly: [
        { period: 'Jan', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: 'Feb', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: 'Mar', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: 'Apr', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: 'May', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: 'Jun', efficiency: Math.floor(Math.random() * 30) + 70 }
      ],
      yearly: [
        { period: '2020', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: '2021', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: '2022', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: '2023', efficiency: Math.floor(Math.random() * 30) + 70 },
        { period: '2024', efficiency: Math.floor(Math.random() * 30) + 70 }
      ]
    }
    return timeData[timeFilterEfficiency] || timeData.monthly
  }

  if (loading) {
    return (
      <div className="p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-4 bg-white rounded-lg shadow-sm mb-4">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
          <p className="text-slate-600">Loading machines analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-block p-4 bg-red-50 rounded-lg mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <p className="text-red-600 font-semibold mb-2">Error Loading Data</p>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-0 bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-white to-slate-100 px-2 py-2 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white">
              <Factory size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 m-0">
                Machine Analysis
              </h1>
              <p className="text-xs text-slate-500 mt-0 m-0">
                Monitor machine health, utilization, capacity, and performance metrics
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500  m-0">Total Machines</p>
                <p className="text-xl font-bold text-slate-900 mt-2 m-0">{machineDetails.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Factory size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500  m-0">Avg Performance</p>
                <p className="text-xl font-bold text-slate-900 mt-2 m-0">{averagePerformance}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500  m-0">Avg Utilization</p>
                <p className="text-xl font-bold text-slate-900 mt-2 m-0">{averageUtilization}%</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500  m-0">Workstations</p>
                <p className="text-xl font-bold text-slate-900 mt-2 m-0">{workstations.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Wrench size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" style={{ animation: 'fadeIn 0.5s ease-in-out' }}>
          <div className="bg-white rounded-xl p-6 md:p-3 border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">Machine Status Distribution</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setMachineStatusChartType('donut')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    machineStatusChartType === 'donut'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Donut
                </button>
                <button
                  onClick={() => setMachineStatusChartType('bar')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    machineStatusChartType === 'bar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>
            {machineStatusChartType === 'donut' ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie 
                    data={machineStatus} 
                    cx="50%" 
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value}`}
                    fill="#8884d8" 
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {machineStatus.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value} machines`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={machineStatus} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} angle={-15} textAnchor="end" height={70} />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => `${value} machines`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  >
                    {machineStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm lg:col-span-2 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <BarChart3 size={20} className="text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">Workstation Type Distribution</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setWorkstationTypeChartType('donut')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    workstationTypeChartType === 'donut'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Donut
                </button>
                <button
                  onClick={() => setWorkstationTypeChartType('bar')}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                    workstationTypeChartType === 'bar'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bar
                </button>
              </div>
            </div>

            {workstationTypeChartType === 'donut' ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={getWorkstationTypeDistribution()} 
                    cx="50%" 
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {getWorkstationTypeDistribution().map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `${value} workstations`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getWorkstationTypeDistribution()} margin={{ top: 20, right: 30, left: 0, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    formatter={(value) => `${value} workstations`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#10b981" 
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  >
                    {getWorkstationTypeDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">Machine Work Time & Downtime</h3>
              </div>
              <div className="flex gap-2">
                {['day', 'week', 'month', 'year'].map(period => (
                  <button
                    key={period}
                    onClick={() => setTimeFilterUtilization(period)}
                    className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                      timeFilterUtilization === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getMachineWorkTimeData()} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="machine" stroke="#64748b" fontSize={11} angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#64748b" fontSize={12} label={{ value: `Hours (${timeFilterUtilization.charAt(0).toUpperCase() + timeFilterUtilization.slice(1)})`, angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }}
                  formatter={(value) => `${value}h`}
                  labelFormatter={(label) => `Machine: ${label}`}
                />
                <Legend />
                <Bar dataKey="worktime" fill="#10b981" name="Work Time (h)" radius={[8, 8, 0, 0]} stackId="a" />
                <Bar dataKey="downtime" fill="#ef4444" name="Downtime (h)" radius={[8, 8, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-slate-600" />
              <h3 className="text-base font-bold text-slate-900 m-0">Overall Efficiency Trend</h3>
            </div>
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
                <button
                  key={period}
                  onClick={() => setTimeFilterEfficiency(period)}
                  className={`p-2 rounded-lg text-xs font-semibold transition-colors ${
                    timeFilterEfficiency === period
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getEfficiencyTrendData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="period" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Legend />
              <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} name="Efficiency %" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="p-2 border-b border-gray-200 flex items-center gap-2">
            <Rocket size={20} className="text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 m-0">Machine Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Code</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Machine Name</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Operations</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Status</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Allocation (h)</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Downtime (h)</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Performance %</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Efficiency %</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Jobs</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMachineDetails.map((machine, idx) => (
                  <tr key={machine.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                    <td className="p-2 text-xs text-gray-700 font-semibold">{machine.id}</td>
                    <td className="p-2 text-xs text-gray-700">{machine.name}</td>
                    <td className="p-2 text-xs text-gray-700">{machine.operations || 'N/A'}</td>
                    <td className="p-2">
                      <span className={`p-2 rounded-lg text-xs font-semibold ${getStatusBadgeColor(machine.status)}`}>
                        {machine.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {machine.allocation}h
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-semibold  text-amber-600">
                        {machine.downtime}h
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-semibold  ${getCapacityColor(machine.performance)}`}>
                        {machine.performance}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-semibold  ${getCapacityColor(machine.efficiencyPercentage)}`}>
                        {machine.efficiencyPercentage}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {machine.completedJobs}/{machine.totalJobs}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openModal(machine)}
                        className="inline-flex items-center gap-2 p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye size={14} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Showing {machineDetailsStartIndex + 1}-{Math.min(machineDetailsEndIndex, machineDetails.length)} of {machineDetails.length} machines
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMachineDetailsPage(prev => Math.max(prev - 1, 1))}
                disabled={currentMachineDetailsPage === 1}
                className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <span className="text-xs text-gray-700 font-medium min-w-[80px] text-center">
                Page {currentMachineDetailsPage} of {totalMachineDetailsPages || 1}
              </span>
              <button
                onClick={() => setCurrentMachineDetailsPage(prev => Math.min(prev + 1, totalMachineDetailsPages))}
                disabled={currentMachineDetailsPage === totalMachineDetailsPages}
                className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-2 border-b border-gray-200 flex items-center gap-2">
            <Wrench size={20} className="text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 m-0">Workstations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">ID</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Name</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Description</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Status</th>
                </tr>
              </thead>
              <tbody>
                {workstations.length > 0 ? (
                  workstations.map((workstation, idx) => (
                    <tr key={workstation.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="p-2 text-xs text-gray-700 font-semibold">{workstation.id}</td>
                      <td className="p-2 text-xs text-gray-700">{workstation.workstation_name || workstation.name}</td>
                      <td className="p-2 text-xs text-gray-700">{workstation.description || '-'}</td>
                      <td className="p-4 text-center">
                        <span className={`p-2 rounded-lg text-xs font-semibold ${getWorkstationStatusColor(workstation.status)}`}>
                          {workstation.status || 'active'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-sm text-gray-500">
                      No workstations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DetailModal
        isOpen={modalOpen}
        machine={selectedMachine}
        onClose={closeModal}
      />
    </div>
  )
}
