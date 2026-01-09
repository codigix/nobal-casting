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
  const [machineStats, setMachineStats] = useState({ total: 0, operational: 0, maintenance: 0, machines: [] })
  const [projectStats, setProjectStats] = useState({ total: 0, running: 0, completed: 0, projects: [] })
  const [productionReports, setProductionReports] = useState({ totalProduced: 0, totalRejected: 0, qualityScore: 0, reports: [] })
  const [departments, setDepartments] = useState([])
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

  const StatCard = ({ icon: Icon, label, value, color = 'primary' }) => (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
        </div>
        <div
          className="p-3 rounded-lg"
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
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
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
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 capitalize">{dept}</h3>
          <p className="text-sm text-gray-600">Department Management</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <Shield size={36} className="text-blue-600" />
            Administration Panel
          </h1>
          <p className="text-gray-600">Manage system configuration, users, and master data</p>
        </div>

        {error && <Alert type="danger">{error}</Alert>}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-gray-200 overflow-x-auto">
          {['overview', 'machines', 'projects', 'reports', 'departments', 'masters', 'security'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'machines' ? 'Machine Stats' : tab === 'projects' ? 'Project Status' : tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={Users} label="Total Users" value={stats.users} color="primary" />
              <StatCard icon={Warehouse} label="Total Warehouses" value={stats.warehouses} color="success" />
              <StatCard icon={Package} label="Total Items" value={stats.items} color="warning" />
            </div>

            {/* Quick Actions */}
            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap size={24} className="text-blue-600" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton
                  icon={Plus}
                  label="Add User"
                  onClick={() => navigate('/admin/employees-designations?action=add')}
                  variant="primary"
                />
                <QuickActionButton
                  icon={Plus}
                  label="New Warehouse"
                  onClick={() => navigate('/inventory/warehouses')}
                />
                <QuickActionButton
                  icon={Database}
                  label="Master Data"
                  onClick={() => setActiveTab('masters')}
                />
                <QuickActionButton
                  icon={Activity}
                  label="Audit Logs"
                  onClick={() => navigate('/admin/audit-logs')}
                />
              </div>
            </Card>

            {/* System Health */}
            <Card>
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity size={24} className="text-green-600" />
                System Health
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">Database</p>
                  <Badge color="success">Connected</Badge>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">API Service</p>
                  <Badge color="success">Running</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Machine Stats Tab */}
        {activeTab === 'machines' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Gauge size={28} className="text-orange-600" />
              Machine Statistics & Performance
            </h2>

            {/* Machine Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Machines</p>
                    <p className="text-xl font-bold text-gray-800">{machineStats.total}</p>
                  </div>
                  <Gauge size={24} className="text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Operational</p>
                    <p className="text-xl font-bold text-green-600">{machineStats.operational}</p>
                  </div>
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">In Maintenance</p>
                    <p className="text-xl font-bold text-amber-600">{machineStats.maintenance}</p>
                  </div>
                  <Clock size={24} className="text-amber-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Total OEE</p>
                    <p className="text-xl font-bold text-blue-600">{machineStats.machines.length > 0 ? 'Tracking' : '—'}</p>
                  </div>
                  <TrendingUp size={24} className="text-blue-600" />
                </div>
              </Card>
            </div>

            {/* Machine Performance & Downtime Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 size={20} className="text-blue-600" />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="downtime" fill="#ef4444" name="Downtime hrs" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-600" />
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
                    <Tooltip formatter={(value) => `${value} hrs`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Machine Details Table */}
            <Card>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Machine Information</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-2 font-semibold text-gray-700 text-left">Machine ID</th>
                      <th className="text-left p-2 font-semibold text-gray-700 text-left">Name</th>
                      <th className="text-left p-2 font-semibold text-gray-700 text-left">Status</th>
                      <th className="text-left p-2 font-semibold text-gray-700 text-left">Days Since Maintenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machineStats.machines.length > 0 ? (
                      machineStats.machines.map((machine) => (
                        <tr key={machine.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-2 text-gray-800 font-medium">{machine.id}</td>
                          <td className="p-2 text-gray-800">{machine.name}</td>
                          <td className="p-2">
                            <Badge color={machine.status === 'active' ? 'success' : machine.status === 'maintenance' ? 'warning' : 'danger'}>
                              {machine.status}
                            </Badge>
                          </td>
                          <td className="p-2 text-gray-600 text-sm">{machine.days_since_maintenance || '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="py-8 px-4 text-center text-gray-500">
                          No machine data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Project Status Tab */}
        {activeTab === 'projects' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <CheckCircle size={28} className="text-green-600" />
              Project Status & Tracking
            </h2>

            {/* Project Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Projects</p>
                    <p className="text-xl font-bold text-gray-800">{projectStats.total}</p>
                  </div>
                  <Clock size={24} className="text-blue-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Running</p>
                    <p className="text-xl font-bold text-amber-600">{projectStats.running}</p>
                  </div>
                  <AlertTriangle size={24} className="text-amber-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Completed</p>
                    <p className="text-xl font-bold text-green-600">{projectStats.completed}</p>
                  </div>
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </Card>
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Pending</p>
                    <p className="text-xl font-bold text-blue-600">{projectStats.total - projectStats.running - projectStats.completed}</p>
                  </div>
                  <TrendingUp size={24} className="text-blue-600" />
                </div>
              </Card>
            </div>

            {/* Project Status & Timeline Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Project Status Distribution</h3>
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
                <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Project Timeline</h3>
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
              <h3 className="text-lg font-bold text-gray-800 mb-4">Running Projects</h3>
              <div className="space-y-4">
                {projectStats.projects.length > 0 ? (
                  projectStats.projects.map((project) => (
                    <div key={project.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800">{project.name}</p>
                          <p className="text-sm text-gray-600">{project.id} • Status: {project.status}</p>
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
                        <span className="text-xs font-semibold  text-gray-700">{project.progress || 0}%</span>
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
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
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
                    className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Production (Today)</p>
                        <p className="text-xl font-bold text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Quality Score (Today)</p>
                        <p className="text-xl font-bold text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Rejected (Today)</p>
                        <p className="text-xl font-bold text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Production Details</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Period</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Produced</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Rejected</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Hours</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.slice(0, 5).map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-800">{report.period}</td>
                              <td className="py-2 px-3 text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 px-3 text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.machines_used || 0}</td>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Production (This Week)</p>
                        <p className="text-xl font-bold text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Quality Score (This Week)</p>
                        <p className="text-xl font-bold text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Rejected (This Week)</p>
                        <p className="text-xl font-bold text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Weekly Production Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Week</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Produced</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Rejected</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Hours</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.slice(0, 7).map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-800">{report.period}</td>
                              <td className="py-2 px-3 text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 px-3 text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.machines_used || 0}</td>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Production (This Month)</p>
                        <p className="text-xl font-bold text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Quality Score (This Month)</p>
                        <p className="text-xl font-bold text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Rejected (This Month)</p>
                        <p className="text-xl font-bold text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Production Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Month</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Produced</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Rejected</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Hours</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.slice(0, 12).map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-800">{report.period}</td>
                              <td className="py-2 px-3 text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 px-3 text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.machines_used || 0}</td>
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
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Production (This Year)</p>
                        <p className="text-xl font-bold text-blue-600">{productionReports.totalProduced}</p>
                        <p className="text-xs text-gray-600 mt-2">units produced</p>
                      </div>
                      <Package size={24} className="text-blue-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Quality Score (This Year)</p>
                        <p className="text-xl font-bold text-green-600">{productionReports.qualityScore}%</p>
                        <p className="text-xs text-gray-600 mt-2">good product rate</p>
                      </div>
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                  </Card>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Rejected (This Year)</p>
                        <p className="text-xl font-bold text-red-600">{productionReports.totalRejected}</p>
                        <p className="text-xs text-gray-600 mt-2">units rejected</p>
                      </div>
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                  </Card>
                </div>
                {productionReports.reports.length > 0 && (
                  <Card>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Yearly Production Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Month</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Produced</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Rejected</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Hours</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Machines</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productionReports.reports.map((report, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-3 text-gray-800">{report.period}</td>
                              <td className="py-2 px-3 text-gray-800 font-medium">{report.produced || 0}</td>
                              <td className="py-2 px-3 text-red-600">{report.rejected || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.hours || 0}</td>
                              <td className="py-2 px-3 text-gray-600">{report.machines_used || 0}</td>
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
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {departments.map((dept) => (
                  <DepartmentCard key={dept} dept={dept} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Masters Tab */}
        {activeTab === 'masters' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Wrench size={28} className="text-blue-600" />
              Master Data Management
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Machines */}
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Machines</h3>
                    <p className="text-sm text-gray-600">Manage production machines</p>
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Operators</h3>
                    <p className="text-sm text-gray-600">Manage production operators</p>
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Tools</h3>
                    <p className="text-sm text-gray-600">Manage tool room tools</p>
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">QC Checklists</h3>
                    <p className="text-sm text-gray-600">Inspection checklists</p>
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Item Groups</h3>
                    <p className="text-sm text-gray-600">Manage item classification</p>
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
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Units of Measure</h3>
                    <p className="text-sm text-gray-600">Manage measurement units</p>
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
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Shield size={28} className="text-red-600" />
              Security & Audit
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Audit Logs</h3>
                <p className="text-sm text-gray-600 mb-4">View all system activities and user actions</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/audit-logs')}
                  className="w-full"
                >
                  View Audit Logs
                </Button>
              </Card>

              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">User Roles</h3>
                <p className="text-sm text-gray-600 mb-4">Manage user roles and permissions</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/roles')}
                  className="w-full"
                >
                  Manage Roles
                </Button>
              </Card>

              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Access Control</h3>
                <p className="text-sm text-gray-600 mb-4">Configure department-wise access</p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/admin/access-control')}
                  className="w-full"
                >
                  Configure Access
                </Button>
              </Card>

              <Card>
                <h3 className="text-lg font-bold text-gray-800 mb-4">System Backups</h3>
                <p className="text-sm text-gray-600 mb-4">Manage database backups and recovery</p>
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
