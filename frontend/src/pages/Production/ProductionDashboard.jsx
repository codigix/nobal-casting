import React, { useState, useEffect } from 'react'
import {
  Clipboard, Package, Calendar, FileText, CheckCircle,
  Clock, AlertCircle, Grid3x3, Wrench, BarChart3, TrendingUp, PieChart
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import * as productionService from '../../services/productionService'

export default function ProductionDashboard() {
  const [stats, setStats] = useState({
    workOrders: 0,
    boms: 0,
    productionPlans: 0,
    jobCards: 0,
    completedToday: 0,
    inProgress: 0,
    pending: 0,
    workstations: 0,
    operations: 0
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState({
    jobStatus: [],
    dailyProduction: [],
    workOrderStatus: [],
    capacityUtilization: []
  })
  const [dataEntries, setDataEntries] = useState({
    workOrders: [],
    boms: [],
    productionPlans: [],
    jobCards: [],
    workstations: [],
    operations: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const normalizeStatus = (status) => {
    if (!status) return 'draft'
    return String(status).toLowerCase().trim()
  }

  const getStatusDisplayName = (status) => {
    const normalized = normalizeStatus(status)
    const displayNames = {
      'completed': 'Completed',
      'in-progress': 'In Progress',
      'pending': 'Pending',
      'draft': 'Draft',
      'cancelled': 'Cancelled'
    }
    return displayNames[normalized] || status
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [woRes, bomRes, ppRes, jcRes, opRes, wsRes, peRes] = await Promise.all([
        productionService.getWorkOrders().catch(() => ({})),
        productionService.getBOMs().catch(() => ({})),
        productionService.getProductionPlans().catch(() => ({})),
        productionService.getJobCards().catch(() => ({})),
        productionService.getOperationsList().catch(() => ({})),
        productionService.getWorkstationsList().catch(() => ({})),
        productionService.getProductionEntries().catch(() => ({}))
      ])

      const wo = Array.isArray(woRes) ? woRes : woRes.data || []
      const bom = Array.isArray(bomRes) ? bomRes : bomRes.data || []
      const pp = Array.isArray(ppRes) ? ppRes : ppRes.data || []
      const jc = Array.isArray(jcRes) ? jcRes : jcRes.data || []
      const op = Array.isArray(opRes) ? opRes : opRes.data || []
      const ws = Array.isArray(wsRes) ? wsRes : wsRes.data || []
      const pe = Array.isArray(peRes) ? peRes : peRes.data || []

      const completedCount = jc.filter(j => normalizeStatus(j.status) === 'completed').length
      const inProgressCount = jc.filter(j => normalizeStatus(j.status) === 'in-progress').length
      const pendingCount = jc.filter(j => ['pending', 'draft'].includes(normalizeStatus(j.status))).length

      setStats({
        workOrders: wo.length,
        boms: bom.length,
        productionPlans: pp.length,
        jobCards: jc.length,
        completedToday: completedCount,
        inProgress: inProgressCount,
        pending: pendingCount,
        workstations: ws.length,
        operations: op.length
      })

      const workOrdersData = wo.length > 0 ? wo.map((item, idx) => ({
        id: item.wo_id || item.id || `WO-${idx + 1}`,
        name: item.wo_id || item.name || `Work Order ${idx + 1}`,
        status: getStatusDisplayName(item.status),
        priority: item.priority || 'medium'
      })) : []

      const bomData = bom.length > 0 ? bom.map((item, idx) => ({
        id: item.bom_id || item.id || `BOM-${idx + 1}`,
        name: item.bom_name || item.name || `BOM ${idx + 1}`,
        status: normalizeStatus(item.status),
        items: item.total_items || item.items || 0
      })) : []

      const prodPlanData = pp.length > 0 ? pp.map((item, idx) => ({
        id: item.plan_id || item.id || `PP-${idx + 1}`,
        name: item.plan_name || item.name || `Production Plan ${idx + 1}`,
        status: normalizeStatus(item.status),
        quantity: item.total_quantity || item.quantity || 0
      })) : []

      const jobCardData = jc.length > 0 ? jc.map((item, idx) => ({
        id: item.jc_id || item.id || `JC-${idx + 1}`,
        name: item.jc_code || item.name || `Job Card ${idx + 1}`,
        status: getStatusDisplayName(item.status),
        priority: item.priority || 'medium'
      })) : []

      const workstationData = ws.length > 0 ? ws.map((item, idx) => ({
        id: item.ws_id || item.id || `WS-${idx + 1}`,
        name: item.ws_name || item.name || `Workstation ${idx + 1}`,
        status: item.status || 'active',
        utilization: item.utilization_percent || 0
      })) : []

      const operationsData = op.length > 0 ? op.map((item, idx) => ({
        id: item.op_id || item.name || `OP-${idx + 1}`,
        name: item.op_name || item.name || `Operation ${idx + 1}`,
        status: getStatusDisplayName(item.status),
        duration: item.standard_time || 0
      })) : []

      const dailyData = pe.length > 0 
        ? generateDailyProductionChart(pe)
        : generateEmptyDailyChart()

      const capacityData = ws.length > 0 ? ws.map(item => ({
        station: item.ws_name || item.name || `Station`,
        usage: Math.max(0, Math.min(100, item.utilization_percent || 0))
      })) : []

      setDataEntries({
        workOrders: workOrdersData,
        boms: bomData,
        productionPlans: prodPlanData,
        jobCards: jobCardData,
        workstations: workstationData,
        operations: operationsData
      })

      const workOrderStatusBreakdown = [
        { status: 'In Progress', value: wo.filter(w => normalizeStatus(w.status) === 'in-progress').length, fill: '#3b82f6' },
        { status: 'Completed', value: wo.filter(w => normalizeStatus(w.status) === 'completed').length, fill: '#10b981' },
        { status: 'Pending', value: wo.filter(w => normalizeStatus(w.status) === 'pending').length, fill: '#ef4444' },
        { status: 'Draft', value: wo.filter(w => normalizeStatus(w.status) === 'draft').length, fill: '#f59e0b' }
      ]

      setChartData({
        jobStatus: [
          { name: 'Completed', value: completedCount, fill: '#10b981' },
          { name: 'In Progress', value: inProgressCount, fill: '#f59e0b' },
          { name: 'Pending', value: pendingCount, fill: '#ef4444' }
        ],
        dailyProduction: dailyData,
        workOrderStatus: workOrderStatusBreakdown,
        capacityUtilization: capacityData
      })
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError('Failed to load dashboard data')
      setStats({
        workOrders: 0,
        boms: 0,
        productionPlans: 0,
        jobCards: 0,
        completedToday: 0,
        inProgress: 0,
        pending: 0,
        workstations: 0,
        operations: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const generateEmptyDailyChart = () => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr) => ({
      day: dayNames[new Date(dateStr).getDay()],
      completed: 0,
      inProgress: 0,
      pending: 0
    }))
  }

  const generateDailyProductionChart = (entries) => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr, idx) => {
      const dayEntry = entries.filter(e => {
        const entryDate = e.created_at ? e.created_at.split('T')[0] : e.entry_date
        return entryDate === dateStr
      })
      
      const completed = dayEntry.filter(e => normalizeStatus(e.status) === 'completed').length
      const inProgress = dayEntry.filter(e => normalizeStatus(e.status) === 'in-progress').length
      const pending = dayEntry.filter(e => ['pending', 'draft'].includes(normalizeStatus(e.status))).length

      return {
        day: dayNames[new Date(dateStr).getDay()],
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  const StatCard = ({ label, value, subtitle, icon: Icon, borderColor, bgColor }) => (
    <div className="bg-white rounded-lg p-3 border-l-4 flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5" >
      <div className="flex justify-between items-start gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
        <div className="flex items-center justify-center w-9 h-9 rounded" style={{ backgroundColor: bgColor }}>
          {Icon && <Icon size={20} color={borderColor} />}
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-medium" style={{ color: borderColor }}>
        {subtitle}
      </div>
    </div>
  )

  const StatusBadge = ({ status }) => {
    const statusConfig = {
      'Completed': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      'In Progress': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
      'Pending': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
      'Draft': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      'Active': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      'Idle': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
    }
    const config = statusConfig[status] || statusConfig['Pending']
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        {status}
      </span>
    )
  }

  const EntryCard = ({ item, statusKey = 'status' }) => {
    const statusConfig = {
      'Completed': { color: '#10b981' },
      'In Progress': { color: '#f59e0b' },
      'Pending': { color: '#ef4444' },
      'Draft': { color: '#3b82f6' },
      'Active': { color: '#3b82f6' },
      'Idle': { color: '#6b7280' }
    }
    const statusColor = statusConfig[item[statusKey]]?.color || '#ef4444'
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-all" style={{ borderLeftColor: statusColor }}>
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="flex-1">
            <h4 className="text-xs font-semibold  text-gray-900">{item.name || item.id}</h4>
            <p className="text-xs text-gray-500 mt-1">{item.id}</p>
          </div>
          <StatusBadge status={item[statusKey]} />
        </div>
        <div className="flex gap-4 text-xs mt-3">
          {Object.entries(item).map(([key, value]) => {
            if (['id', 'name', statusKey].includes(key)) return null
            return (
              <div key={key} className="flex-1">
                <span className="text-gray-500 capitalize">{key}:</span>
                <span className="ml-1 font-semibold text-gray-900">{value}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
          <p className="text-xs font-semibold text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-xs font-medium">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const ChartContainer = ({ children, title, subtitle }) => (
    <div className="bg-gradient-to-br from-white via-blue-50 to-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl transition-shadow">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen w-full p-6 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full p-6 relative overflow-hidden bg-gray-50">
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Production Dashboard 🏭</h1>
            <p className="text-xs font-medium text-gray-500">Track production, work orders, and manufacturing operations</p>
          </div>
          <p className="text-xs font-medium text-gray-500 whitespace-nowrap">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-3 rounded-lg mb-6 text-sm bg-amber-50 text-amber-900 border border-amber-200">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="COMPLETED TODAY" value={stats.completedToday} subtitle="Completed" icon={CheckCircle} borderColor="#059669" bgColor="#ecfdf5" />
          <StatCard label="IN PROGRESS" value={stats.inProgress} subtitle="Running" icon={Clock} borderColor="#dc2626" bgColor="#fef2f2" />
          <StatCard label="PENDING" value={stats.pending} subtitle="Waiting" icon={AlertCircle} borderColor="#f97316" bgColor="#ffedd5" />
          <StatCard label="WORKSTATIONS" value={stats.workstations} subtitle="Available" icon={Grid3x3} borderColor="#8b5cf6" bgColor="#faf5ff" />
        </div>

        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'production', label: 'Production', icon: TrendingUp },
              { id: 'workorders', label: 'Work Orders', icon: Clipboard },
              { id: 'boms', label: 'BOMs', icon: Package },
              { id: 'prodplans', label: 'Prod Plans', icon: Calendar },
              { id: 'jobcards', label: 'Job Cards', icon: FileText },
              { id: 'workstations', label: 'Workstations', icon: Grid3x3 },
              { id: 'operations', label: 'Operations', icon: Wrench },
            ].map(tab => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 p-2  transition-all text-xs font-medium whitespace-nowrap ${
                    isActive ? 'border-b-2 border-b-blue-500 text-blue-500 ' : 'bg-transparent text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <TabIcon size={18} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Job Card Status Distribution" subtitle="Current job card performance metrics">
              <ResponsiveContainer width="100%" height={320}>
                <RechartsPie data={chartData.jobStatus}>
                  <Pie data={chartData.jobStatus} cx="50%" cy="50%" labelLine={true} label={({ name, value, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={110} fill="#8884d8" dataKey="value">
                    {chartData.jobStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartContainer>
            <ChartContainer title="Work Order Status Breakdown" subtitle="Order distribution by status">
              <ResponsiveContainer width="100%" height={320}>
                <RechartsPie data={chartData.workOrderStatus}>
                  <Pie data={chartData.workOrderStatus} cx="50%" cy="50%" labelLine={true} label={({ status, value, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} outerRadius={110} fill="#8884d8" dataKey="value">
                    {chartData.workOrderStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPie>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        )}

        {activeTab === 'production' && (
          <ChartContainer title="Weekly Production Trend" subtitle="Daily production metrics across completion status">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={chartData.dailyProduction} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="completed" fill="url(#colorCompleted)" name="Completed" radius={[12, 12, 0, 0]} />
                <Bar dataKey="inProgress" fill="url(#colorProgress)" name="In Progress" radius={[12, 12, 0, 0]} />
                <Bar dataKey="pending" fill="url(#colorPending)" name="Pending" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}

        {activeTab === 'workorders' && (
          <div className="space-y-6">
            <ChartContainer title="Work Order Distribution" subtitle="Count breakdown by order status">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.workOrderStatus} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorWorkOrder" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="status" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="url(#colorWorkOrder)" name="Count" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dataEntries.workOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Recent Work Orders</h3>
                <div className="space-y-4">
                  {dataEntries.workOrders.slice(0, 10).map(item => (
                    <EntryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'boms' && (
          <div className="space-y-6">
            <ChartContainer title="Bill of Materials Overview" subtitle="Item count per BOM document">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dataEntries.boms} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorBOM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="items" fill="url(#colorBOM)" name="Items" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dataEntries.boms.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">BOMs List</h3>
                <div className="space-y-4">
                  {dataEntries.boms.slice(0, 10).map(item => (
                    <EntryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'prodplans' && (
          <div className="space-y-6">
            <ChartContainer title="Production Plans Quantity Analysis" subtitle="Scheduled production quantities per plan">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dataEntries.productionPlans} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorProdPlan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantity" fill="url(#colorProdPlan)" name="Quantity" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dataEntries.productionPlans.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Production Plans</h3>
                <div className="space-y-4">
                  {dataEntries.productionPlans.slice(0, 10).map(item => (
                    <EntryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'jobcards' && (
          <div className="space-y-6">
            <ChartContainer title="Job Cards Performance" subtitle="Job card activity and distribution">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dataEntries.jobCards} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorJobCard" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="id" fill="url(#colorJobCard)" name="Count" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dataEntries.jobCards.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Job Cards</h3>
                <div className="space-y-4">
                  {dataEntries.jobCards.slice(0, 10).map(item => (
                    <EntryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'workstations' && (
          <div className="space-y-6">
            <ChartContainer title="Workstation Utilization Analytics" subtitle="Real-time capacity utilization by workstation">
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={dataEntries.workstations} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorUtilization" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="utilization" fill="url(#colorUtilization)" name="Utilization %" radius={[0, 12, 12, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
            {dataEntries.workstations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Workstations</h3>
                <div className="space-y-4">
                  {dataEntries.workstations.slice(0, 10).map(item => (
                    <EntryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="space-y-6">
            <ChartContainer title="Operations Duration Timeline" subtitle="Processing time per operation in minutes">
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={dataEntries.operations} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                  <defs>
                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="name"  style={{ fontSize: '10px' }} angle={-45} textAnchor="end" height={80} />
                  <YAxis  style={{ fontSize: '10px' }} label={{ value: 'Duration (minutes)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="duration" fill="url(#colorDuration)" name="Duration (min)" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Operations Status Distribution" subtitle="Count by operation status">
                <ResponsiveContainer width="100%" height={340}>
                  <RechartsPie data={[
                    { name: 'Completed', value: dataEntries.operations.filter(o => normalizeStatus(o.status) === 'completed').length, fill: '#10b981' },
                    { name: 'In Progress', value: dataEntries.operations.filter(o => normalizeStatus(o.status) === 'in-progress').length, fill: '#f59e0b' },
                    { name: 'Pending', value: dataEntries.operations.filter(o => ['pending', 'draft'].includes(normalizeStatus(o.status))).length, fill: '#ef4444' }
                  ]}>
                    <Pie data={[
                      { name: 'Completed', value: dataEntries.operations.filter(o => normalizeStatus(o.status) === 'completed').length, fill: '#10b981' },
                      { name: 'In Progress', value: dataEntries.operations.filter(o => normalizeStatus(o.status) === 'in-progress').length, fill: '#f59e0b' },
                      { name: 'Pending', value: dataEntries.operations.filter(o => ['pending', 'draft'].includes(normalizeStatus(o.status))).length, fill: '#ef4444' }
                    ]} cx="50%" cy="50%" labelLine={true} label={({ name, value, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={110} fill="#8884d8" dataKey="value">
                      {[
                        { name: 'Completed', value: dataEntries.operations.filter(o => normalizeStatus(o.status) === 'completed').length, fill: '#10b981' },
                        { name: 'In Progress', value: dataEntries.operations.filter(o => normalizeStatus(o.status) === 'in-progress').length, fill: '#f59e0b' },
                        { name: 'Pending', value: dataEntries.operations.filter(o => ['pending', 'draft'].includes(normalizeStatus(o.status))).length, fill: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer title="Average Duration by Status" subtitle="Mean operation time per status">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={[
                    { status: 'Completed', duration: Math.round(dataEntries.operations.filter(o => normalizeStatus(o.status) === 'completed').reduce((a, o) => a + o.duration, 0) / Math.max(dataEntries.operations.filter(o => normalizeStatus(o.status) === 'completed').length, 1)) },
                    { status: 'In Progress', duration: Math.round(dataEntries.operations.filter(o => normalizeStatus(o.status) === 'in-progress').reduce((a, o) => a + o.duration, 0) / Math.max(dataEntries.operations.filter(o => normalizeStatus(o.status) === 'in-progress').length, 1)) },
                    { status: 'Pending', duration: Math.round(dataEntries.operations.filter(o => ['pending', 'draft'].includes(normalizeStatus(o.status))).reduce((a, o) => a + o.duration, 0) / Math.max(dataEntries.operations.filter(o => ['pending', 'draft'].includes(normalizeStatus(o.status))).length, 1)) }
                  ]} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorAvgDuration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.5}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="status" stroke="#6b7280" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Avg Duration (min)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="duration" fill="url(#colorAvgDuration)" name="Avg Duration" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>

            {dataEntries.operations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">Operations List</h3>
                <div className="space-y-4">
                  {dataEntries.operations.slice(0, 10).map(item => (
                    <EntryCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
