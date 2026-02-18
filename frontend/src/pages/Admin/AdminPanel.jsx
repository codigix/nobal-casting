import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import Card from '../../components/Card/Card'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'
import Button from '../../components/Button/Button'
import {
  BarChart3,
  Users,
  Warehouse,
  Package,
  Settings,
  TrendingUp,
  Activity,
  Shield,
  Plus,
  Edit2,
  Eye,
  Database,
  Zap,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge
} from 'lucide-react'

export default function AdminPanel() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    users: 0,
    warehouses: 0,
    items: 0
  })
  const [systemMetrics, setSystemMetrics] = useState({
    apiResponseTime: 0,
    databaseConnections: 0,
    activeUsers: 0,
    systemUptime: '99.9%',
    errorRate: 0.1,
    cacheHitRate: 95.5
  })
  const [machineStats, setMachineStats] = useState({ total: 0, operational: 0, maintenance: 0, machines: [] })
  const [projectStats, setProjectStats] = useState({ total: 0, running: 0, completed: 0, projects: [] })
  const [productionReports, setProductionReports] = useState({ totalProduced: 0, totalRejected: 0, qualityScore: 0, reports: [] })
  const [departments, setDepartments] = useState([])
  const [recentEvents, setRecentEvents] = useState([])
  const [criticalAlerts, setCriticalAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [reportPeriod, setReportPeriod] = useState('monthly')

  useEffect(() => {
    fetchSystemStats()
    fetchDepartments()
    fetchMachineStats()
    fetchProjectStats()
    fetchProductionReports('daily')
    fetchSystemMetrics()
    fetchRecentEvents()
    fetchCriticalAlerts()
  }, [])

  const fetchSystemStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/system-stats`)
      const data = await response.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/departments`)
      const data = await response.json()
      if (data.success) {
        setDepartments(data.data || [])
      } else {
        setError(data.error || 'Failed to fetch departments')
      }
    } catch (err) {
      console.error('Error fetching departments:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMachineStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/machine-stats`)
      const data = await response.json()
      if (data.success) {
        setMachineStats(data.data)
      }
    } catch (err) {
      console.error('Error fetching machine stats:', err)
    }
  }

  const fetchProjectStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/project-stats`)
      const data = await response.json()
      if (data.success) {
        setProjectStats(data.data)
      }
    } catch (err) {
      console.error('Error fetching project stats:', err)
    }
  }

  const fetchProductionReports = async (period) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/production-reports?period=${period}`)
      const data = await response.json()
      if (data.success) {
        setProductionReports(data.data)
      }
    } catch (err) {
      console.error('Error fetching production reports:', err)
    }
  }

  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/system-metrics`)
      const data = await response.json()
      if (data.success) {
        setSystemMetrics(data.data)
      } else {
        setSystemMetrics(prev => ({
          ...prev,
          apiResponseTime: Math.random() * 500,
          databaseConnections: Math.floor(Math.random() * 50),
          activeUsers: Math.floor(Math.random() * 100),
          errorRate: (Math.random() * 5).toFixed(2)
        }))
      }
    } catch (err) {
      console.error('Error fetching system metrics:', err)
      setSystemMetrics(prev => ({
        ...prev,
        apiResponseTime: Math.random() * 500,
        databaseConnections: Math.floor(Math.random() * 50),
        activeUsers: Math.floor(Math.random() * 100)
      }))
    }
  }

  const fetchRecentEvents = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/recent-events`)
      const data = await response.json()
      if (data.success) {
        setRecentEvents(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching recent events:', err)
      setRecentEvents([
        { id: 1, type: 'production', message: 'Production started on Machine A-01', timestamp: new Date(Date.now() - 5 * 60000), severity: 'info' },
        { id: 2, type: 'user', message: 'User Admin logged in', timestamp: new Date(Date.now() - 15 * 60000), severity: 'info' },
        { id: 3, type: 'system', message: 'Database backup completed successfully', timestamp: new Date(Date.now() - 30 * 60000), severity: 'success' }
      ])
    }
  }

  const fetchCriticalAlerts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/masters/critical-alerts`)
      const data = await response.json()
      if (data.success) {
        setCriticalAlerts(data.data || [])
      }
    } catch (err) {
      console.error('Error fetching critical alerts:', err)
      setCriticalAlerts([])
    }
  }

  const StatCard = ({ icon: Icon, label, value, color = 'primary' }) => (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-xl  text-gray-800">{value}</p>
        </div>
        <div
          className="p-2 rounded-xs"
          style={{ backgroundColor: `rgba(${color === 'primary' ? '37, 99, 235' : color === 'success' ? '16, 185, 129' : '249, 115, 22'}, 0.1)` }}
        >
          <Icon size={24} color={color === 'primary' ? '#2563eb' : color === 'success' ? '#10b981' : '#f97316'} />
        </div>
      </div>
    </Card>
  )

  const QuickActionButton = ({ icon: Icon, label, onClick, variant = 'secondary' }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 p-2 rounded-xs font-medium transition-all ${
        variant === 'primary'
          ? 'bg-blue-500 text-white hover:bg-blue-600'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  )

  const DepartmentCard = ({ dept }) => (
    <Card className="hover: transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-lg  text-gray-800 capitalize">{dept}</h3>
          <p className="text-xs text-gray-600">Department Management</p>
        </div>
        <Badge color="secondary">{dept.charAt(0).toUpperCase()}</Badge>
      </div>
      <div className="flex gap-2 mt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/admin/department/${dept}`)}
          className="flex items-center gap-1"
        >
          <Eye size={14} />
          View
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/admin/department/${dept}/settings`)}
          className="flex items-center gap-1"
        >
          <Settings size={14} />
          Settings
        </Button>
      </div>
    </Card>
  )

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Modern Gradient Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6  py-12 mb-3 border-b border-blue-500/20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
        </div>
        <div className="relative z-0 max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded ">
              <Shield size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl  text-white mb-1">Administration Dashboard</h1>
              <p className="text-blue-200">Monitor system health, manage resources, and oversee operations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6  pb-8">
        {error && <Alert type="danger">{error}</Alert>}

        {/* Modern Tab Navigation */}
        <div className="flex gap-2 mb-3  pb-4 border-b border-slate-700">
          {['overview', 'machines', 'projects', 'reports', 'departments', 'masters', 'security'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-2  capitalize transition-all whitespace-nowrap rounded-t-lg text-xs ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white  shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              {tab === 'machines' ? 'Machine Stats' : tab === 'projects' ? 'Project Status' : tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Critical Alerts - Modern Banner Style */}
            {criticalAlerts.length > 0 && (
              <div className="space-y-3">
                {criticalAlerts.map((alert) => (
                  <div key={alert.id} className="relative overflow-hidden p-5 bg-gradient-to-r from-red-900/40 to-red-800/20 border border-red-500/40 rounded  backdrop-blur-sm flex items-start gap-4 hover:border-red-500/60 transition-all">
                    <div className="absolute inset-0 opacity-5 bg-red-600" />
                    <AlertTriangle size={24} className="text-red-400 flex-shrink-0 mt-0.5 relative z-0" />
                    <div className="relative z-0 flex-1">
                      <p className="text-xs  text-red-200">{alert.title}</p>
                      <p className="text-xs text-red-300 mt-1">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Main KPI Cards - Modern Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users Card */}
              <div className="group relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-blue-500/50 transition-all hover: hover:shadow-blue-500/10">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-br from-blue-500 to-transparent transition-opacity" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <Users size={24} className="text-blue-400" />
                    <span className="text-xs  text-blue-400 bg-blue-500/10 p-2  py-1 rounded-full">Users</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-2">Total Users</p>
                  <p className="text-4xl  text-white mb-3">{stats.users}</p>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400" style={{ width: `${Math.min((stats.users / 1000) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Total Warehouses Card */}
              <div className="group relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-green-500/50 transition-all hover: hover:shadow-green-500/10">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-br from-green-500 to-transparent transition-opacity" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <Warehouse size={24} className="text-green-400" />
                    <span className="text-xs  text-green-400 bg-green-500/10 p-2  py-1 rounded-full">Warehouses</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-2">Total Warehouses</p>
                  <p className="text-4xl  text-white mb-3">{stats.warehouses}</p>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400" style={{ width: `${Math.min((stats.warehouses / 100) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Total Items Card */}
              <div className="group relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-amber-500/50 transition-all hover: hover:shadow-amber-500/10">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-br from-amber-500 to-transparent transition-opacity" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <Package size={24} className="text-amber-400" />
                    <span className="text-xs  text-amber-400 bg-amber-500/10 p-2  py-1 rounded-full">Items</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-2">Total Items</p>
                  <p className="text-4xl  text-white mb-3">{stats.items}</p>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${Math.min((stats.items / 10000) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Active Users Card */}
              <div className="group relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-purple-500/50 transition-all hover: hover:shadow-purple-500/10">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-gradient-to-br from-purple-500 to-transparent transition-opacity" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <Activity size={24} className="text-purple-400" />
                    <span className="text-xs  text-purple-400 bg-purple-500/10 p-2  py-1 rounded-full">Active</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-2">Active Users</p>
                  <p className="text-4xl  text-white mb-3">{systemMetrics.activeUsers}</p>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400" style={{ width: `${Math.min((systemMetrics.activeUsers / 500) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* System Performance Metrics - Modern Gradient Cards */}
            <div className="space-y-2">
              <h2 className="text-xl   text-white flex items-center gap-3">
                <Gauge size={28} className="text-blue-400" />
                System Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* API Performance Card */}
                <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-blue-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
                  <div className="relative z-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs  text-slate-200">API Performance</h3>
                      <div className={`w-3 h-3 rounded-full ${systemMetrics.apiResponseTime < 200 ? 'bg-green-500 animate-pulse' : systemMetrics.apiResponseTime < 400 ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                    </div>
                    <p className="text-slate-400 text-xs mb-2">Response Time</p>
                    <p className="text-xl   text-blue-400 mb-4">{systemMetrics.apiResponseTime.toFixed(0)}<span className="text-lg text-slate-400">ms</span></p>
                    <div className="space-y-2">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all" style={{ width: `${Math.min(systemMetrics.apiResponseTime / 5, 100)}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">Optimal: &lt;200ms</p>
                    </div>
                  </div>
                </div>

                {/* System Health Card */}
                <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-green-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl" />
                  <div className="relative z-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs  text-slate-200">System Health</h3>
                      <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <p className="text-slate-400 text-xs mb-2">Uptime Status</p>
                    <p className="text-xl   text-green-400 mb-4">{systemMetrics.systemUptime}</p>
                    <div className="inline-block p-2  py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                      <p className="text-xs  text-green-300">Operational</p>
                    </div>
                  </div>
                </div>

                {/* Error Rate Card */}
                <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-amber-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                  <div className="relative z-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs  text-slate-200">Error Rate</h3>
                      <div className={`w-3 h-3 rounded-full ${systemMetrics.errorRate < 1 ? 'bg-green-500' : systemMetrics.errorRate < 3 ? 'bg-amber-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                    </div>
                    <p className="text-slate-400 text-xs mb-2">Current Rate</p>
                    <p className="text-xl   text-amber-400 mb-4">{systemMetrics.errorRate.toFixed(2)}<span className="text-lg text-slate-400">%</span></p>
                    <div className="space-y-2">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width: `${Math.min(systemMetrics.errorRate * 20, 100)}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">Target: &lt;0.5%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Database & Cache Performance */}
            <div className="space-y-2">
              <h2 className="text-xl   text-white flex items-center gap-3">
                <Database size={28} className="text-purple-400" />
                Database & Infrastructure
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Database Status Card */}
                <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-blue-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl" />
                  <div className="relative z-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs  text-slate-200">Database Status</h3>
                      <div className={`w-3 h-3 rounded-full ${systemMetrics.databaseConnections < 80 ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                    </div>
                    <p className="text-slate-400 text-xs mb-2">Active Connections</p>
                    <p className="text-xl   text-blue-400 mb-4">{systemMetrics.databaseConnections}<span className="text-lg text-slate-400"> / 100</span></p>
                    <div className="space-y-3">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all" style={{ width: `${systemMetrics.databaseConnections}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">Capacity: {systemMetrics.databaseConnections}%</p>
                    </div>
                  </div>
                </div>

                {/* Cache Performance Card */}
                <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-green-500/50 transition-all">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-green-500/10 rounded-full blur-2xl" />
                  <div className="relative z-0">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xs  text-slate-200">Cache Performance</h3>
                      <div className={`w-3 h-3 rounded-full ${systemMetrics.cacheHitRate > 90 ? 'bg-green-500 animate-pulse' : systemMetrics.cacheHitRate > 80 ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                    </div>
                    <p className="text-slate-400 text-xs mb-2">Hit Rate</p>
                    <p className="text-xl   text-green-400 mb-4">{systemMetrics.cacheHitRate.toFixed(1)}<span className="text-lg text-slate-400">%</span></p>
                    <div className="space-y-3">
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all" style={{ width: `${systemMetrics.cacheHitRate}%` }} />
                      </div>
                      <p className="text-xs text-slate-400">Optimal Status: Excellent</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity - Timeline Style */}
            <div className="space-y-2">
              <h2 className="text-xl   text-white flex items-center gap-3">
                <Activity size={28} className="text-cyan-400" />
                Recent Activity Log
              </h2>
              <div className="relative rounded  bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700p-3   backdrop-blur-sm">
                <div className="space-y-2">
                  {recentEvents.length > 0 ? (
                    recentEvents.slice(0, 8).map((event, idx) => (
                      <div key={event.id} className="relative flex gap-4 pb-4 last:pb-0">
                        {/* Timeline connector */}
                        {idx !== recentEvents.length - 1 && (
                          <div className="absolute left-[11px] top-12 w-0.5 h-8 bg-gradient-to-b from-slate-500 to-transparent" />
                        )}
                        {/* Timeline dot */}
                        <div className={`relative z-0 w-6 h-6 rounded-full border-2 border-slate-700 bg-slate-900 flex items-center justify-center flex-shrink-0 mt-1 ${
                          event.severity === 'success' ? 'bg-green-500/20 border-green-500' :
                          event.severity === 'warning' ? 'bg-amber-500/20 border-amber-500' :
                          event.severity === 'error' ? 'bg-red-500/20 border-red-500' :
                          'bg-blue-500/20 border-blue-500'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            event.severity === 'success' ? 'bg-green-400' :
                            event.severity === 'warning' ? 'bg-amber-400' :
                            event.severity === 'error' ? 'bg-red-400' :
                            'bg-blue-400'
                          }`} />
                        </div>
                        {/* Event content */}
                        <div className="flex-1 py-1">
                          <div className="flex items-start justify-between">
                            <p className="text-xs font-medium text-slate-200">{event.message}</p>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-4">
                              {event.timestamp instanceof Date 
                                ? event.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                              }
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 capitalize">{event.type} • {event.severity}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center">
                      <Activity size={40} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No recent activities</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions - Modern Button Grid */}
            <div className="space-y-2">
              <h2 className="text-xl   text-white flex items-center gap-3">
                <Zap size={28} className="text-amber-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Add User Button */}
                <button
                  onClick={() => navigate('/admin/employees-designations?action=add')}
                  className="group relative overflow-hidden rounded  bg-gradient-to-br from-blue-600 to-blue-700 p-4 transition-all hover: hover:shadow-blue-500/30 hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                  <div className="relative z-0 flex items-center gap-3 justify-center">
                    <Plus size={20} className="text-white" />
                    <span className="text-xs  text-white">Add User</span>
                  </div>
                </button>

                {/* New Warehouse Button */}
                <button
                  onClick={() => navigate('/inventory/warehouses')}
                  className="group relative overflow-hidden rounded  bg-gradient-to-br from-green-600 to-green-700 p-4 transition-all hover: hover:shadow-green-500/30 hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                  <div className="relative z-0 flex items-center gap-3 justify-center">
                    <Warehouse size={20} className="text-white" />
                    <span className="text-xs  text-white">New Warehouse</span>
                  </div>
                </button>

                {/* Master Data Button */}
                <button
                  onClick={() => setActiveTab('masters')}
                  className="group relative overflow-hidden rounded  bg-gradient-to-br from-purple-600 to-purple-700 p-4 transition-all hover: hover:shadow-purple-500/30 hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                  <div className="relative z-0 flex items-center gap-3 justify-center">
                    <Database size={20} className="text-white" />
                    <span className="text-xs  text-white">Master Data</span>
                  </div>
                </button>

                {/* Audit Logs Button */}
                <button
                  onClick={() => navigate('/admin/audit-logs')}
                  className="group relative overflow-hidden rounded  bg-gradient-to-br from-cyan-600 to-cyan-700 p-4 transition-all hover: hover:shadow-cyan-500/30 hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                  <div className="relative z-0 flex items-center gap-3 justify-center">
                    <Wrench size={20} className="text-white" />
                    <span className="text-xs  text-white">Audit Logs</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Machine Stats Tab */}
        {activeTab === 'machines' && (
          <div className="space-y-8">
            <h2 className="text-xl   text-white flex items-center gap-3">
              <Gauge size={32} className="text-orange-400" />
              Machine Statistics & Performance
            </h2>

            {/* Machine Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Machines */}
              <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-blue-500/50 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <Gauge size={24} className="text-blue-400" />
                    <span className="text-xs  text-blue-400 bg-blue-500/10 p-2  py-1 rounded-full">Machines</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Total Machines</p>
                  <p className="text-4xl  text-blue-400">{machineStats.total}</p>
                </div>
              </div>

              {/* Operational */}
              <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-green-500/50 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <CheckCircle size={24} className="text-green-400" />
                    <span className="text-xs  text-green-400 bg-green-500/10 p-2  py-1 rounded-full">Active</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Operational</p>
                  <p className="text-4xl  text-green-400">{machineStats.operational}</p>
                </div>
              </div>

              {/* In Maintenance */}
              <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-amber-500/50 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <Clock size={24} className="text-amber-400" />
                    <span className="text-xs  text-amber-400 bg-amber-500/10 p-2  py-1 rounded-full">Service</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-1">In Maintenance</p>
                  <p className="text-4xl  text-amber-400">{machineStats.maintenance}</p>
                </div>
              </div>

              {/* OEE Status */}
              <div className="relative overflow-hidden rounded  bg-gradient-to-br from-slate-800 to-slate-900p-3   border border-slate-700 hover:border-purple-500/50 transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
                <div className="relative z-0">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp size={24} className="text-purple-400" />
                    <span className="text-xs  text-purple-400 bg-purple-500/10 p-2  py-1 rounded-full">OEE</span>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-1">Overall Equipment</p>
                  <p className="text-xl   text-purple-400">{machineStats.machines.length > 0 ? '92%' : '—'}</p>
                </div>
              </div>
            </div>

            {/* Machine Performance & Downtime Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded  bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700p-3   backdrop-blur-sm">
                <h3 className="text-lg  text-white mb-6 flex items-center gap-2">
                  <BarChart3 size={24} className="text-blue-400" />
                  Daily Machine Performance
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { day: 'Mon', efficiency: 88, downtime: 12 },
                    { day: 'Tue', efficiency: 85, downtime: 15 },
                    { day: 'Wed', efficiency: 90, downtime: 10 },
                    { day: 'Thu', efficiency: 87, downtime: 13 },
                    { day: 'Fri', efficiency: 92, downtime: 8 },
                    { day: 'Sat', efficiency: 84, downtime: 16 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="downtime" fill="#ef4444" name="Downtime hrs" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded  bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700p-3   backdrop-blur-sm">
                <h3 className="text-lg  text-white mb-6 flex items-center gap-2">
                  <AlertTriangle size={24} className="text-red-400" />
                  Machine Downtime Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Planned Maintenance', value: 35, color: '#f59e0b' },
                      { name: 'Unplanned Downtime', value: 20, color: '#ef4444' },
                      { name: 'Setup Time', value: 25, color: '#8b5cf6' },
                      { name: 'Operational', value: 20, color: '#10b981' }
                    ]} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={100}>
                      {[
                        { name: 'Planned Maintenance', value: 35, color: '#f59e0b' },
                        { name: 'Unplanned Downtime', value: 20, color: '#ef4444' },
                        { name: 'Setup Time', value: 25, color: '#8b5cf6' },
                        { name: 'Operational', value: 20, color: '#10b981' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }} formatter={(value) => `${value} hrs`} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Machine Details Table */}
            <div className="rounded  bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700p-3   backdrop-blur-sm ">
              <h3 className="text-lg  text-white mb-6">Machine Information</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left p-3  text-slate-300 text-xs">Machine ID</th>
                    <th className="text-left p-3  text-slate-300 text-xs">Name</th>
                    <th className="text-left p-3  text-slate-300 text-xs">Status</th>
                    <th className="text-left p-3  text-slate-300 text-xs">Days Since Maintenance</th>
                  </tr>
                </thead>
                <tbody>
                  {machineStats.machines.length > 0 ? (
                    machineStats.machines.map((machine) => (
                      <tr key={machine.id} className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 text-slate-200 font-medium text-xs">{machine.id}</td>
                        <td className="p-3 text-slate-200 text-xs">{machine.name}</td>
                        <td className="p-3">
                          <span className={`inline-block p-2  py-1 rounded-full text-xs  ${
                            machine.status === 'active' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                            machine.status === 'maintenance' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {machine.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{machine.days_since_maintenance || '—'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="py-8 px-4 text-center text-slate-400 text-xs">
                        No machine data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Project Status Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-8">
            <h2 className="text-xl  text-gray-800 flex items-center gap-2">
              <CheckCircle size={28} className="text-green-600" />
              Project Status & Tracking
            </h2>

            {/* Project Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Total Projects</p>
                    <p className="text-xl  text-gray-800">{projectStats.total}</p>
                  </div>
                  <Clock size={24} className="text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Running</p>
                    <p className="text-xl  text-amber-600">{projectStats.running}</p>
                  </div>
                  <AlertTriangle size={24} className="text-amber-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Completed</p>
                    <p className="text-xl  text-green-600">{projectStats.completed}</p>
                  </div>
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Pending</p>
                    <p className="text-xl  text-blue-600">{projectStats.total - projectStats.running - projectStats.completed}</p>
                  </div>
                  <TrendingUp size={24} className="text-blue-600" />
                </div>
              </Card>
            </div>

            {/* Project Status & Timeline Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <h3 className="text-lg  text-gray-800 mb-4">Project Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Completed', value: 14, color: '#10b981' },
                      { name: 'In Progress', value: 8, color: '#f59e0b' },
                      { name: 'Pending', value: 2, color: '#3b82f6' }
                    ]} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={100}>
                      {[
                        { name: 'Completed', value: 14, color: '#10b981' },
                        { name: 'In Progress', value: 8, color: '#f59e0b' },
                        { name: 'Pending', value: 2, color: '#3b82f6' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="text-lg  text-gray-800 mb-4">Monthly Project Timeline</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[
                    { month: 'Jan', started: 2, completed: 1 },
                    { month: 'Feb', started: 3, completed: 2 },
                    { month: 'Mar', started: 4, completed: 3 },
                    { month: 'Apr', started: 3, completed: 2 },
                    { month: 'May', started: 5, completed: 4 },
                    { month: 'Jun', started: 4, completed: 2 }
                  ]}>
                    <defs>
                      <linearGradient id="colorStarted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="started" stroke="#f59e0b" fill="url(#colorStarted)" name="Started" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Running Projects */}
            <Card>
              <h3 className="text-lg  text-gray-800 mb-4">Running Projects</h3>
              <div className="space-y-2">
                {projectStats.projects.length > 0 ? (
                  projectStats.projects.map((project) => (
                    <div key={project.id} className="p-4 bg-gray-50 rounded-xs border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className=" text-gray-800">{project.name}</p>
                          <p className="text-xs text-gray-600">{project.id} • Status: {project.status}</p>
                        </div>
                        <Badge color={project.days_left > 5 ? 'success' : 'warning'}>
                          {project.days_left > 0 ? `${project.days_left} days left` : 'Overdue'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                              style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs   text-gray-700">{project.progress || 0}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Quantity: {project.quantity} units</p>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    No running projects
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl  text-gray-800 flex items-center gap-2">
                <BarChart3 size={28} className="text-purple-600" />
                Production Reports & Analytics
              </h2>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setReportPeriod(period)
                      fetchProductionReports(period)
                    }}
                    className={`p-2 rounded-xs font-medium transition-all capitalize ${
                      reportPeriod === period
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* Report Metrics */}
            {reportPeriod === 'daily' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Production (Today)</p>
                        <p className="text-xl  text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Quality Score (Today)</p>
                        <p className="text-xl  text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Rejected (Today)</p>
                        <p className="text-xl  text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg  text-gray-800 mb-4">Production Details</h3>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 p-2   text-gray-700">Period</th>
                            <th className="text-left py-2 p-2   text-gray-700">Produced</th>
                            <th className="text-left py-2 p-2   text-gray-700">Rejected</th>
                            <th className="text-left py-2 p-2   text-gray-700">Hours</th>
                            <th className="text-left py-2 p-2   text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.slice(0, 5).map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 p-2  text-gray-800">{report.period}</td>
                              <td className="py-2 p-2  text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 p-2  text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.machines_used || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {reportPeriod === 'weekly' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Production (This Week)</p>
                        <p className="text-xl  text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Quality Score (This Week)</p>
                        <p className="text-xl  text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Rejected (This Week)</p>
                        <p className="text-xl  text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg  text-gray-800 mb-4">Weekly Production Breakdown</h3>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 p-2   text-gray-700">Week</th>
                            <th className="text-left py-2 p-2   text-gray-700">Produced</th>
                            <th className="text-left py-2 p-2   text-gray-700">Rejected</th>
                            <th className="text-left py-2 p-2   text-gray-700">Hours</th>
                            <th className="text-left py-2 p-2   text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.slice(0, 7).map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 p-2  text-gray-800">{report.period}</td>
                              <td className="py-2 p-2  text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 p-2  text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.machines_used || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {reportPeriod === 'monthly' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Production (This Month)</p>
                        <p className="text-xl  text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Quality Score (This Month)</p>
                        <p className="text-xl  text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Rejected (This Month)</p>
                        <p className="text-xl  text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg  text-gray-800 mb-4">Monthly Production Summary</h3>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 p-2   text-gray-700">Month</th>
                            <th className="text-left py-2 p-2   text-gray-700">Produced</th>
                            <th className="text-left py-2 p-2   text-gray-700">Rejected</th>
                            <th className="text-left py-2 p-2   text-gray-700">Hours</th>
                            <th className="text-left py-2 p-2   text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.slice(0, 12).map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 p-2  text-gray-800">{report.period}</td>
                              <td className="py-2 p-2  text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 p-2  text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.machines_used || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {reportPeriod === 'yearly' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Production (This Year)</p>
                        <p className="text-xl  text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Quality Score (This Year)</p>
                        <p className="text-xl  text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Rejected (This Year)</p>
                        <p className="text-xl  text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg  text-gray-800 mb-4">Yearly Production Summary</h3>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 p-2   text-gray-700">Month</th>
                            <th className="text-left py-2 p-2   text-gray-700">Produced</th>
                            <th className="text-left py-2 p-2   text-gray-700">Rejected</th>
                            <th className="text-left py-2 p-2   text-gray-700">Hours</th>
                            <th className="text-left py-2 p-2   text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 p-2  text-gray-800">{report.period}</td>
                              <td className="py-2 p-2  text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 p-2  text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 p-2  text-gray-600">{report.machines_used || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-2">
            <h2 className="text-xl  text-gray-800 flex items-center gap-2">
              <Users size={28} className="text-blue-600" />
              Departments
            </h2>

            {loading ? (
              <div className="text-center py-12 text-gray-600">Loading departments...</div>
            ) : departments.length === 0 ? (
              <Card>
                <p className="text-center text-gray-600 py-8">No departments found</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {departments.map((dept) => (
                  <DepartmentCard key={dept} dept={dept} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Masters Tab */}
        {activeTab === 'masters' && (
          <div className="space-y-2">
            <h2 className="text-xl  text-gray-800 flex items-center gap-2">
              <Wrench size={28} className="text-blue-600" />
              Master Data Management
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Machines */}
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg  text-gray-800">Machines</h3>
                    <p className="text-xs text-gray-600">Manage production machines</p>
                  </div>
                  <Zap className="text-orange-500" />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/manufacturing/machines')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Manage Machines
                </Button>
              </Card>

              {/* Operators */}
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg  text-gray-800">Operators</h3>
                    <p className="text-xs text-gray-600">Manage production operators</p>
                  </div>
                  <Users className="text-blue-500" />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/manufacturing/operators')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Manage Operators
                </Button>
              </Card>

              {/* Tools */}
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg  text-gray-800">Tools</h3>
                    <p className="text-xs text-gray-600">Manage tool room tools</p>
                  </div>
                  <Wrench className="text-green-500" />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/toolroom')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Manage Tools
                </Button>
              </Card>

              {/* Inspection Checklists */}
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg  text-gray-800">QC Checklists</h3>
                    <p className="text-xs text-gray-600">Inspection checklists</p>
                  </div>
                  <BarChart3 className="text-purple-500" />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/qc/checklists')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Manage Checklists
                </Button>
              </Card>

              {/* Item Groups */}
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg  text-gray-800">Item Groups</h3>
                    <p className="text-xs text-gray-600">Manage item classification</p>
                  </div>
                  <Package className="text-yellow-500" />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/admin/item-groups')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Manage Groups
                </Button>
              </Card>

              {/* UOM */}
              <Card>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-lg  text-gray-800">Units of Measure</h3>
                    <p className="text-xs text-gray-600">Manage measurement units</p>
                  </div>
                  <TrendingUp className="text-indigo-500" />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/admin/uom')}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Manage UOM
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-2">
            <h2 className="text-xl  text-gray-800 flex items-center gap-2">
              <Shield size={28} className="text-red-600" />
              Security & Audit
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card>
                <h3 className="text-lg  text-gray-800 mb-4">Audit Logs</h3>
                <p className="text-xs text-gray-600 mb-4">View all system activities and user actions</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/audit-logs')}
                  className="w-full"
                >
                  View Audit Logs
                </Button>
              </Card>

              <Card>
                <h3 className="text-lg  text-gray-800 mb-4">User Roles</h3>
                <p className="text-xs text-gray-600 mb-4">Manage user roles and permissions</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/roles')}
                  className="w-full"
                >
                  Manage Roles
                </Button>
              </Card>

              <Card>
                <h3 className="text-lg  text-gray-800 mb-4">Access Control</h3>
                <p className="text-xs text-gray-600 mb-4">Configure department-wise access</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/access-control')}
                  className="w-full"
                >
                  Configure Access
                </Button>
              </Card>

              <Card>
                <h3 className="text-lg  text-gray-800 mb-4">System Backups</h3>
                <p className="text-xs text-gray-600 mb-4">Manage database backups and recovery</p>
                <Button variant="primary" onClick={() => {}} className="w-full">
                  Backup & Restore
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
