import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  Users,
  Warehouse,
  Package,
  TrendingUp,
  Activity,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Gauge,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Factory,
  LayoutDashboard
} from 'lucide-react'

const StatCard = ({ icon: Icon, label, value, trend, trendValue, color, bgColor, iconColor }) => (
  <div className="p-2 rounded border border-slate-200  hover:shadow-md transition-all group relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
    <div className={`absolute -right-4 -top-4 w-20 h-24 rounded-full ${bgColor} opacity-10 group-hover:opacity-20 transition-opacity`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-3 rounded ${bgColor} ${iconColor}`}>
          <Icon size={15} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px]  p-2 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-xs  mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <h3 className="text-xl " style={{ color: 'var(--text-primary)' }}>{value}</h3>
    </div>
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    users: 0,
    warehouses: 0,
    items: 0,
    projects: 0
  })
  const [machineStats, setMachineStats] = useState({ total: 0, operational: 0, maintenance: 0 })
  const [projectStats, setProjectStats] = useState({ total: 0, running: 0, completed: 0, projects: [] })
  const [productionReports, setProductionReports] = useState({ totalProduced: 0, totalRejected: 0, qualityScore: 0, reports: [] })
  const [notifications, setNotifications] = useState([])
  const [period, setPeriod] = useState('daily')

  useEffect(() => {
    fetchDashboardData()
  }, [period])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      const token = localStorage.getItem('token')
      
      const fetchWithAuth = (url) => fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).catch(e => ({ success: false, error: e.message }))

      const [systemRes, machineRes, projectRes, productionRes, notificationRes] = await Promise.all([
        fetchWithAuth(`${apiUrl}/masters/system-stats`),
        fetchWithAuth(`${apiUrl}/masters/machine-stats`),
        fetchWithAuth(`${apiUrl}/masters/project-stats`),
        fetchWithAuth(`${apiUrl}/masters/production-reports?period=${period}`),
        fetchWithAuth(`${apiUrl}/notifications?limit=5&unread_only=true`)
      ])

      if (systemRes.success) setStats(systemRes.data)
      if (machineRes.success) setMachineStats(machineRes.data)
      if (projectRes.success) setProjectStats(projectRes.data)
      if (productionRes.success) setProductionReports(productionRes.data)
      if (notificationRes.success) setNotifications(notificationRes.data)
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="font-medium animate-pulse" style={{ color: 'var(--text-secondary)' }}>Initializing Dashboard...</p>
      </div>
    )
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const machineData = [
    { name: 'Operational', value: machineStats?.operational || 0 },
    { name: 'Maintenance', value: machineStats?.maintenance || 0 },
    { name: 'Idle', value: Math.max(0, (machineStats?.total || 0) - (machineStats?.operational || 0) - (machineStats?.maintenance || 0)) }
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl   flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <LayoutDashboard size={15} className="text-blue-600" />
            Admin Intelligence Dashboard
          </h1>
          <p className="mt-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Global oversight of Nobal Casting operations and resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded border  flex items-center gap-2" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <Clock size={15} style={{ color: 'var(--text-secondary)' }} />
            <span className="text-xs " style={{ color: 'var(--text-primary)' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            <Zap size={15} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard 
          icon={Users}
          label="Total Workforce"
          value={stats.users}
          trend="up"
          trendValue="12%"
          color="blue"
          bgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard 
          icon={Layers}
          label="Active Projects"
          value={projectStats.running}
          trend="up"
          trendValue="8%"
          color="emerald"
          bgColor="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard 
          icon={Factory}
          label="Operational Assets"
          value={machineStats.operational}
          trend="down"
          trendValue="2%"
          color="amber"
          bgColor="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard 
          icon={CheckCircle}
          label="Quality Index"
          value={`${productionReports?.qualityScore || 0}%`}
          trend="up"
          trendValue="1.5%"
          color="indigo"
          bgColor="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Production Trends */}
        <div className="lg:col-span-2 p-4 rounded border " style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-semibold " style={{ color: 'var(--text-primary)' }}>Production Velocity</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Output and quality trends over time</p>
            </div>
            <select 
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border-slate-200 rounded focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5" 
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              <option value="daily">Daily View</option>
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
            </select>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productionReports?.reports || []}>
                <defs>
                  <linearGradient id="colorProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRejected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="period" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="top" align="right" />
                <Area 
                  name="Produced Units"
                  type="monotone" 
                  dataKey="produced" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorProduced)" 
                />
                <Area 
                  name="Rejected Units"
                  type="monotone" 
                  dataKey="rejected" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRejected)" 
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Status Distribution */}
        <div className="p-6 rounded border " style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm" style={{ color: 'var(--text-primary)' }}>Asset Allocation</h3>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Current state of production line</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={machineData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {machineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-2 h-2 rounded-full bg-blue-500" /> Operational
              </span>
              <span className="" style={{ color: 'var(--text-primary)' }}>{machineStats.operational}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Maintenance
              </span>
              <span className="" style={{ color: 'var(--text-primary)' }}>{machineStats.maintenance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Project Health Table */}
        <div className="rounded border  overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
          <div className="p-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <div>
              <h3 className="text-sm " style={{ color: 'var(--text-primary)' }}>Project Portfolio Health</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Live tracking of high-priority orders</p>
            </div>
            <button 
              onClick={() => navigate('/admin/project-analysis')}
              className="text-blue-600 text-xs  hover:underline"
            >
              View Full Matrix
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <th className="p-2 text-xs   " style={{ color: 'var(--text-secondary)' }}>Project ID</th>
                  <th className="p-2 text-xs   " style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="p-2 text-xs    text-right" style={{ color: 'var(--text-secondary)' }}>Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                {(projectStats?.projects || []).slice(0, 5).map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/5 transition-colors">
                    <td className="p-2">
                      <div className="" style={{ color: 'var(--text-primary)' }}>{project.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Due in {project.days_left} days</div>
                    </td>
                    <td className="p-2">
                      <span className={`px-2.5 py-1 rounded-full text-[10px]   ${
                        project.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        project.status === 'in_progress' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs " style={{ color: 'var(--text-primary)' }}>{project.progress}%</span>
                        <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                          <div 
                            className={`h-full rounded-full ${project.progress > 80 ? 'bg-emerald-500' : project.progress > 40 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Notifications & Maintenance Queue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notifications Feed */}
          <div className="p-4 rounded border " style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Shield size={16} className="text-blue-500" />
                Security & System Alerts
              </h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                {notifications.length} NEW
              </span>
            </div>
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 4).map((note, idx) => (
                  <div key={idx} className="flex gap-3 p-2 rounded hover:bg-slate-50/5 transition-colors border border-transparent hover:border-slate-200/10">
                    <div className={`p-2 rounded h-fit ${
                      note.notification_type === 'STOCK_ALERT' ? 'bg-amber-50 text-amber-600' :
                      note.notification_type === 'MATERIAL_REQUEST' ? 'bg-blue-50 text-blue-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{note.title}</p>
                      <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{note.message}</p>
                      <p className="text-[10px] mt-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex flex-col items-center justify-center opacity-40">
                  <Shield size={32} className="mb-2" />
                  <p className="text-xs">No active system alerts</p>
                </div>
              )}
            </div>
          </div>

          {/* Maintenance Queue */}
          <div className="p-4 rounded border " style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <AlertTriangle size={16} className="text-amber-500" />
                Maintenance Queue
              </h3>
              <button onClick={() => navigate('/admin/machine-analysis')} className="text-[10px] text-blue-600 font-bold hover:underline uppercase">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {machineStats?.machines?.filter(m => m.status === 'maintenance' || m.days_since_maintenance > 30).slice(0, 3).map((machine, idx) => (
                <div key={idx} className="relative">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{machine.name}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Last: {machine.days_since_maintenance} days ago</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <div 
                      className={`h-full rounded-full ${machine.status === 'maintenance' ? 'bg-rose-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (machine.days_since_maintenance / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!machineStats?.machines || machineStats.machines.length === 0) && (
                <div className="h-40 flex flex-col items-center justify-center opacity-40">
                  <Activity size={32} className="mb-2" />
                  <p className="text-xs">All assets operational</p>
                </div>
              )}
            </div>
            <div className="mt-6 p-3 rounded bg-amber-50/10 border border-amber-100/10 flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded text-white shadow-lg shadow-amber-200">
                <Gauge size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-500">Service Optimization</p>
                <p className="text-[10px] opacity-70" style={{ color: 'var(--text-secondary)' }}>Preventive maintenance reduces downtime by 24%.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
