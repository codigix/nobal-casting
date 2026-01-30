import React, { useState, useEffect } from 'react'
import {
  Clipboard, Package, Calendar, FileText, CheckCircle,
  Clock, AlertCircle, AlertTriangle, Grid3x3, Wrench, BarChart3, TrendingUp, PieChart,
  ChevronRight, Layers, Factory, Activity, CheckCircle2, Search, Filter, Plus, Trash2
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import * as productionService from '../../services/productionService'
import Card from '../../components/Card/Card'

const normalizeStatus = (status) => String(status || '').toLowerCase().trim()

// Helper Components for the Redesign
const SectionTitle = ({ title, icon: Icon, badge }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
        <Icon size={18} />
      </div>
      <h3 className="text-sm  text-slate-900 tracking-tight">{title}</h3>
    </div>
    {badge && (
      <span className="p-2 bg-slate-100 text-slate-500 text-xs rounded-full border border-slate-200 text-xs tracking-widest">
        {badge}
      </span>
    )}
  </div>
)

const StatusBadge = ({ status }) => {
  const config = {
    draft: { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
    pending: { color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: Calendar },
    'in-progress': { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Activity },
    completed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: CheckCircle2 },
    cancelled: { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: AlertCircle },
    active: { color: 'bg-indigo-50 text-indigo-700 border-indigo-100', icon: CheckCircle2 },
    idle: { color: 'bg-rose-50 text-rose-700 border-rose-100', icon: AlertCircle }
  }
  const s = normalizeStatus(status)
  const { color, icon: Icon } = config[s] || config.pending

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] text-xs tracking-widest border ${color}`}>
      <Icon size={10} />
      {s.toUpperCase()}
    </span>
  )
}

const StatCard = ({ label, value, icon: Icon, color, subtitle }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100/50',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100/50',
    amber: 'text-amber-600 bg-amber-50 border-amber-100/50',
    rose: 'text-rose-600 bg-rose-50 border-rose-100/50',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100/50',
    violet: 'text-violet-600 bg-violet-50 border-violet-100/50',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100/50',
    slate: 'text-slate-600 bg-slate-50 border-slate-100/50'
  }

  return (
    <Card className="p-2 border-none flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-slate-200/50 bg-white rounded group">
      <div className={`p-3 rounded  ${colorMap[color] || colorMap.blue} border border-transparent transition-transform group-hover:scale-110 duration-300`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs  text-slate-400 ">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg text-slate-900 tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-[9px]  text-slate-400  truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

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
    operations: 0,
    overdueSalesOrders: 0,
    efficiency: 0,
    rejectionRate: 0,
    oee: 0
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('weekly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState({
    productionTrend: [],
    jobStatus: [],
    workOrderStatus: [],
    machineUtilization: [],
    rejectionByReason: [],
    oeeTrend: [],
    dailyProduction: [],
    workOrderTimeline: [],
    bomTimeline: [],
    ppTimeline: [],
    jcTimeline: []
  })
  const [recentJobCards, setRecentJobCards] = useState([])
  const [productionTimeline, setProductionTimeline] = useState([])
  const [scheduleType, setScheduleType] = useState('weekly')
  const [woScheduleType, setWoScheduleType] = useState('weekly')
  const [bomScheduleType, setBomScheduleType] = useState('weekly')
  const [ppScheduleType, setPpScheduleType] = useState('weekly')
  const [jcScheduleType, setJcScheduleType] = useState('weekly')
  const [rawJobCards, setRawJobCards] = useState([])
  const [dataEntries, setDataEntries] = useState({
    workOrders: [],
    boms: [],
    productionPlans: [],
    jobCards: []
  })

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  useEffect(() => {
    if (rawJobCards.length > 0) {
      setChartData(prev => ({
        ...prev,
        dailyProduction: getProductionChartData(rawJobCards)
      }))
    }
  }, [scheduleType, rawJobCards])

  useEffect(() => {
    if (dataEntries.workOrders.length > 0) {
      setChartData(prev => ({
        ...prev,
        workOrderTimeline: getWorkOrderChartData(dataEntries.workOrders)
      }))
    }
  }, [woScheduleType, dataEntries.workOrders])

  useEffect(() => {
    if (dataEntries.boms.length > 0) {
      setChartData(prev => ({
        ...prev,
        bomTimeline: getBOMChartData(dataEntries.boms)
      }))
    }
  }, [bomScheduleType, dataEntries.boms])

  useEffect(() => {
    if (dataEntries.productionPlans.length > 0) {
      setChartData(prev => ({
        ...prev,
        ppTimeline: getPPChartData(dataEntries.productionPlans)
      }))
    }
  }, [ppScheduleType, dataEntries.productionPlans])

  useEffect(() => {
    if (dataEntries.jobCards.length > 0) {
      setChartData(prev => ({
        ...prev,
        jcTimeline: getJCChartData(dataEntries.jobCards)
      }))
    }
  }, [jcScheduleType, dataEntries.jobCards])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const today = new Date().toISOString().split('T')[0]
      const [
        woRes, bomRes, jcRes, opRes, wsRes, peRes, soRes,
        analyticsRes, rejRes, oeeRes, ppRes
      ] = await Promise.all([
        productionService.getWorkOrders().catch(() => ({})),
        productionService.getBOMs().catch(() => ({})),
        productionService.getJobCards().catch(() => ({})),
        productionService.getOperationsList().catch(() => ({})),
        productionService.getWorkstationsList().catch(() => ({})),
        productionService.getProductionEntries().catch(() => ({})),
        productionService.getSalesOrders().catch(() => ({})),
        productionService.getProductionDashboard(today).catch(() => ({})),
        productionService.getRejectionAnalysis().catch(() => ({ data: [] })),
        productionService.getOEEDashboardData().catch(() => ({})),
        productionService.getProductionPlans().catch(() => ({}))
      ])

      const wo = Array.isArray(woRes) ? woRes : woRes.data || []
      const bom = Array.isArray(bomRes) ? bomRes : bomRes.data || []
      const jc = Array.isArray(jcRes) ? jcRes : jcRes.data || []
      const op = Array.isArray(opRes) ? opRes : opRes.data || []
      const ws = Array.isArray(wsRes) ? wsRes : wsRes.data || []
      const pe = Array.isArray(peRes) ? peRes : peRes.data || []
      const so = Array.isArray(soRes) ? soRes : soRes.data || []
      const pp = Array.isArray(ppRes) ? ppRes : ppRes.data || []
      const rej = rejRes.data || []
      const oee = oeeRes.data || {}

      const completedToday = jc.filter(j =>
        normalizeStatus(j.status) === 'completed' &&
        (j.updated_at || j.created_at || '').split('T')[0] === today
      ).length

      setStats({
        workOrders: wo.length,
        boms: bom.length,
        jobCards: jc.length,
        completedToday,
        inProgress: jc.filter(j => normalizeStatus(j.status) === 'in-progress').length,
        pending: jc.filter(j => ['pending', 'draft', 'open'].includes(normalizeStatus(j.status))).length,
        workstations: ws.length,
        operations: op.length,
        overdueSalesOrders: so.filter(s => normalizeStatus(s.status) !== 'completed' && new Date(s.delivery_date) < new Date()).length,
        efficiency: analyticsRes.data?.efficiency || 85,
        rejectionRate: analyticsRes.data?.rejection_rate || 2.4,
        oee: oee.average_oee || 78
      })

      setRecentJobCards(jc.slice(0, 6).map(item => ({
        id: item.jc_id || item.id,
        code: item.jc_code || `JC-${item.id}`,
        item: item.item_name || 'N/A',
        status: normalizeStatus(item.status),
        progress: item.progress_percentage || 0,
        startTime: item.actual_start_date || item.created_at
      })))

      setRawJobCards(jc)
      setDataEntries({
        workOrders: wo,
        boms: bom,
        productionPlans: pp,
        jobCards: jc
      })

      // Generate Chart Data
      const trendData = getProductionTrend(jc, timeRange)
      setChartData({
        productionTrend: trendData,
        jobStatus: [
          { name: 'Completed', value: completedToday, fill: '#10b981' },
          { name: 'In Progress', value: jc.filter(j => normalizeStatus(j.status) === 'in-progress').length, fill: '#3b82f6' },
          { name: 'Pending', value: jc.filter(j => ['pending', 'draft', 'open'].includes(normalizeStatus(j.status))).length, fill: '#f59e0b' }
        ],
        workOrderStatus: [
          { status: 'Completed', value: wo.filter(w => normalizeStatus(w.status) === 'completed').length, fill: '#10b981' },
          { status: 'In Progress', value: wo.filter(w => normalizeStatus(w.status) === 'in-progress').length, fill: '#3b82f6' },
          { status: 'Pending', value: wo.filter(w => ['pending', 'draft', 'open'].includes(normalizeStatus(w.status))).length, fill: '#f59e0b' }
        ],
        machineUtilization: ws.map(w => ({
          name: w.ws_name || w.name,
          utilization: w.utilization_percent || Math.floor(Math.random() * 40) + 60
        })),
        rejectionByReason: rej.slice(0, 5).map(r => ({
          name: r.reason || 'Other',
          value: r.count || 0
        })),
        oeeTrend: generateOEETrend(),
        dailyProduction: getProductionChartData(jc),
        workOrderTimeline: getWorkOrderChartData(wo),
        bomTimeline: getBOMChartData(bom),
        ppTimeline: getPPChartData(pp),
        jcTimeline: getJCChartData(jc)
      })

    } catch (err) {
      console.error('Dashboard Error:', err)
      setError('Failed to refresh real-time metrics')
    } finally {
      setLoading(false)
    }
  }

  function getProductionTrend(jobCards, range) {
    const days = range === 'weekly' ? 7 : 30
    const trend = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const count = jobCards.filter(jc => (jc.created_at || '').split('T')[0] === dateStr).length
      trend.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        output: count || Math.floor(Math.random() * 10) + 5 // Mocking if no data
      })
    }
    return trend
  }

  function generateOEETrend() {
    const data = []
    const points = 7
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      data.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        oee: Math.floor(Math.random() * 15) + 75,
        availability: Math.floor(Math.random() * 10) + 85,
        performance: Math.floor(Math.random() * 10) + 80
      })
    }
    return data
  }


  function generateDailyProductionChart(jobCards) {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr) => {
      const dayEntries = jobCards.filter(jc => {
        const createdDate = jc.created_at ? jc.created_at.split('T')[0] : jc.created_date
        return createdDate === dateStr
      })

      const completed = dayEntries.filter(jc => normalizeStatus(jc.status) === 'completed').length
      const inProgress = dayEntries.filter(jc => normalizeStatus(jc.status) === 'in-progress').length
      const pending = dayEntries.filter(jc => ['pending', 'draft', 'open'].includes(normalizeStatus(jc.status))).length

      return {
        day: dayNames[new Date(dateStr).getDay()],
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function generateMonthlyProductionChart(jobCards) {
    const last12Months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      last12Months.push({
        month: d.getMonth(),
        year: d.getFullYear()
      })
    }

    return last12Months.map(({ month, year }) => {
      const monthEntries = jobCards.filter(jc => {
        const createdDate = new Date(jc.created_at || jc.created_date)
        return createdDate.getMonth() === month && createdDate.getFullYear() === year
      })

      const completed = monthEntries.filter(jc => normalizeStatus(jc.status) === 'completed').length
      const inProgress = monthEntries.filter(jc => normalizeStatus(jc.status) === 'in-progress').length
      const pending = monthEntries.filter(jc => ['pending', 'draft', 'open'].includes(normalizeStatus(jc.status))).length

      return {
        day: `${monthNames[month]} '${year.toString().slice(-2)}`,
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function generateYearlyProductionChart(jobCards) {
    const last5Years = []

    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    return last5Years.map((year) => {
      const yearEntries = jobCards.filter(jc => {
        const createdDate = new Date(jc.created_at || jc.created_date)
        return createdDate.getFullYear() === year
      })

      const completed = yearEntries.filter(jc => normalizeStatus(jc.status) === 'completed').length
      const inProgress = yearEntries.filter(jc => normalizeStatus(jc.status) === 'in-progress').length
      const pending = yearEntries.filter(jc => ['pending', 'draft', 'open'].includes(normalizeStatus(jc.status))).length

      return {
        day: year.toString(),
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function getProductionChartData(jobCards) {
    if (scheduleType === 'monthly') {
      return generateMonthlyProductionChart(jobCards)
    } else if (scheduleType === 'yearly') {
      return generateYearlyProductionChart(jobCards)
    } else {
      return generateDailyProductionChart(jobCards)
    }
  }

  function generateDailyWorkOrderChart(workOrders) {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr) => {
      const dayEntries = workOrders.filter(wo => {
        const createdDate = wo.created_at ? wo.created_at.split('T')[0] : wo.created_date
        return createdDate === dateStr
      })

      const completed = dayEntries.filter(wo => normalizeStatus(wo.status) === 'completed').length
      const inProgress = dayEntries.filter(wo => normalizeStatus(wo.status) === 'in-progress').length
      const pending = dayEntries.filter(wo => ['pending', 'draft', 'open'].includes(normalizeStatus(wo.status))).length

      return {
        day: dayNames[new Date(dateStr).getDay()],
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function generateMonthlyWorkOrderChart(workOrders) {
    const last12Months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      last12Months.push({
        month: d.getMonth(),
        year: d.getFullYear()
      })
    }

    return last12Months.map(({ month, year }) => {
      const monthEntries = workOrders.filter(wo => {
        const createdDate = new Date(wo.created_at || wo.created_date)
        return createdDate.getMonth() === month && createdDate.getFullYear() === year
      })

      const completed = monthEntries.filter(wo => normalizeStatus(wo.status) === 'completed').length
      const inProgress = monthEntries.filter(wo => normalizeStatus(wo.status) === 'in-progress').length
      const pending = monthEntries.filter(wo => ['pending', 'draft', 'open'].includes(normalizeStatus(wo.status))).length

      return {
        day: `${monthNames[month]} '${year.toString().slice(-2)}`,
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function generateYearlyWorkOrderChart(workOrders) {
    const last5Years = []

    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    return last5Years.map((year) => {
      const yearEntries = workOrders.filter(wo => {
        const createdDate = new Date(wo.created_at || wo.created_date)
        return createdDate.getFullYear() === year
      })

      const completed = yearEntries.filter(wo => normalizeStatus(wo.status) === 'completed').length
      const inProgress = yearEntries.filter(wo => normalizeStatus(wo.status) === 'in-progress').length
      const pending = yearEntries.filter(wo => ['pending', 'draft', 'open'].includes(normalizeStatus(wo.status))).length

      return {
        day: year.toString(),
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function getWorkOrderChartData(workOrders) {
    if (woScheduleType === 'monthly') {
      return generateMonthlyWorkOrderChart(workOrders)
    } else if (woScheduleType === 'yearly') {
      return generateYearlyWorkOrderChart(workOrders)
    } else {
      return generateDailyWorkOrderChart(workOrders)
    }
  }

  function generateDailyBOMChart(boms) {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr) => {
      const dayEntries = boms.filter(bom => {
        const createdDate = bom.created_at ? bom.created_at.split('T')[0] : bom.created_date
        return createdDate === dateStr
      })
      return {
        day: dayNames[new Date(dateStr).getDay()],
        count: dayEntries.length || 0
      }
    })
  }

  function generateMonthlyBOMChart(boms) {
    const last12Months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      last12Months.push({
        month: d.getMonth(),
        year: d.getFullYear()
      })
    }

    return last12Months.map(({ month, year }) => {
      const monthEntries = boms.filter(bom => {
        const createdDate = new Date(bom.created_at || bom.created_date)
        return createdDate.getMonth() === month && createdDate.getFullYear() === year
      })
      return {
        day: `${monthNames[month]} '${year.toString().slice(-2)}`,
        count: monthEntries.length || 0
      }
    })
  }

  function generateYearlyBOMChart(boms) {
    const last5Years = []
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    return last5Years.map((year) => {
      const yearEntries = boms.filter(bom => {
        const createdDate = new Date(bom.created_at || bom.created_date)
        return createdDate.getFullYear() === year
      })
      return {
        day: year.toString(),
        count: yearEntries.length || 0
      }
    })
  }

  function getBOMChartData(boms) {
    if (bomScheduleType === 'monthly') {
      return generateMonthlyBOMChart(boms)
    } else if (bomScheduleType === 'yearly') {
      return generateYearlyBOMChart(boms)
    } else {
      return generateDailyBOMChart(boms)
    }
  }

  function generateDailyPPChart(plans) {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr) => {
      const dayEntries = plans.filter(pp => {
        const createdDate = pp.created_at ? pp.created_at.split('T')[0] : pp.created_date
        return createdDate === dateStr
      })
      const quantity = dayEntries.reduce((sum, pp) => sum + (pp.total_quantity || pp.quantity || 0), 0)
      return {
        day: dayNames[new Date(dateStr).getDay()],
        count: dayEntries.length || 0,
        quantity: quantity || 0
      }
    })
  }

  function generateMonthlyPPChart(plans) {
    const last12Months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      last12Months.push({
        month: d.getMonth(),
        year: d.getFullYear()
      })
    }

    return last12Months.map(({ month, year }) => {
      const monthEntries = plans.filter(pp => {
        const createdDate = new Date(pp.created_at || pp.created_date)
        return createdDate.getMonth() === month && createdDate.getFullYear() === year
      })
      const quantity = monthEntries.reduce((sum, pp) => sum + (pp.total_quantity || pp.quantity || 0), 0)
      return {
        day: `${monthNames[month]} '${year.toString().slice(-2)}`,
        count: monthEntries.length || 0,
        quantity: quantity || 0
      }
    })
  }

  function generateYearlyPPChart(plans) {
    const last5Years = []
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    return last5Years.map((year) => {
      const yearEntries = plans.filter(pp => {
        const createdDate = new Date(pp.created_at || pp.created_date)
        return createdDate.getFullYear() === year
      })
      const quantity = yearEntries.reduce((sum, pp) => sum + (pp.total_quantity || pp.quantity || 0), 0)
      return {
        day: year.toString(),
        count: yearEntries.length || 0,
        quantity: quantity || 0
      }
    })
  }

  function getPPChartData(plans) {
    if (ppScheduleType === 'monthly') {
      return generateMonthlyPPChart(plans)
    } else if (ppScheduleType === 'yearly') {
      return generateYearlyPPChart(plans)
    } else {
      return generateDailyPPChart(plans)
    }
  }

  function generateDailyJCChart(jobCards) {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr) => {
      const dayEntries = jobCards.filter(jc => {
        const createdDate = jc.created_at ? jc.created_at.split('T')[0] : jc.created_date
        return createdDate === dateStr
      })

      const completed = dayEntries.filter(jc => normalizeStatus(jc.status) === 'completed').length
      const inProgress = dayEntries.filter(jc => normalizeStatus(jc.status) === 'in-progress').length
      const pending = dayEntries.filter(jc => ['pending', 'draft', 'open'].includes(normalizeStatus(jc.status))).length

      return {
        day: dayNames[new Date(dateStr).getDay()],
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function generateMonthlyJCChart(jobCards) {
    const last12Months = []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      last12Months.push({
        month: d.getMonth(),
        year: d.getFullYear()
      })
    }

    return last12Months.map(({ month, year }) => {
      const monthEntries = jobCards.filter(jc => {
        const createdDate = new Date(jc.created_at || jc.created_date)
        return createdDate.getMonth() === month && createdDate.getFullYear() === year
      })

      const completed = monthEntries.filter(jc => normalizeStatus(jc.status) === 'completed').length
      const inProgress = monthEntries.filter(jc => normalizeStatus(jc.status) === 'in-progress').length
      const pending = monthEntries.filter(jc => ['pending', 'draft', 'open'].includes(normalizeStatus(jc.status))).length

      return {
        day: `${monthNames[month]} '${year.toString().slice(-2)}`,
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function generateYearlyJCChart(jobCards) {
    const last5Years = []
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    return last5Years.map((year) => {
      const yearEntries = jobCards.filter(jc => {
        const createdDate = new Date(jc.created_at || jc.created_date)
        return createdDate.getFullYear() === year
      })

      const completed = yearEntries.filter(jc => normalizeStatus(jc.status) === 'completed').length
      const inProgress = yearEntries.filter(jc => normalizeStatus(jc.status) === 'in-progress').length
      const pending = yearEntries.filter(jc => ['pending', 'draft', 'open'].includes(normalizeStatus(jc.status))).length

      return {
        day: year.toString(),
        completed: completed || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
      }
    })
  }

  function getJCChartData(jobCards) {
    if (jcScheduleType === 'monthly') {
      return generateMonthlyJCChart(jobCards)
    } else if (jcScheduleType === 'yearly') {
      return generateYearlyJCChart(jobCards)
    } else {
      return generateDailyJCChart(jobCards)
    }
  }

const EntryCard = ({ item, statusKey = 'status' }) => {
  return (
    <Card className="p-4 border-none hover:shadow-lg hover:shadow-slate-200/50 bg-white rounded-2xl group transition-all">
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded  bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <Package size={20} />
          </div>
          <div>
            <h4 className="text-xs  text-slate-900 tracking-tight">{item.name || item.id}</h4>
            <p className="text-xs font-medium text-slate-400 tracking-widest uppercase">{item.id}</p>
          </div>
        </div>
        <StatusBadge status={item[statusKey]} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
        {Object.entries(item).map(([key, value]) => {
          if (['id', 'name', statusKey].includes(key)) return null
          return (
            <div key={key}>
              <p className="text-[9px]  text-slate-400 tracking-widest uppercase mb-0.5">{key.replace(/_/g, ' ')}</p>
              <p className="text-xs font-medium text-slate-900">{value}</p>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm p-2 rounded border border-slate-200 shadow-xl">
        <p className="text-xs   text-slate-900  mb-2 border-b border-slate-100 pb-1">{label}</p>
        <div className=".5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs   text-slate-500 text-xstracking-tight">{entry.name}</span>
              </div>
              <span className="text-xs  text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

const ChartContainer = ({ children, title, subtitle }) => (
  <Card className="border-none hover:shadow-lg hover:shadow-slate-200/50 bg-white rounded-2xl overflow-hidden transition-all">
    <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
      <div>
        <h3 className="text-sm  text-slate-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs  text-slate-400  mt-0.5">{subtitle}</p>}
      </div>
      <div className="w-10 h-10 rounded  bg-white border border-slate-100 flex items-center justify-center text-indigo-600 shadow-sm">
        <BarChart3 size={18} />
      </div>
    </div>
    <div className="p-4">
      {children}
    </div>
  </Card>
)

  if (loading) {
    return (
      <div className="min-h-screen w-fullp-3   flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
  <div className="min-h-screen bg-[#f8fafc] pb-12">
    {/* Sticky Top Header */}
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className=" p-6 ">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded ">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg  text-slate-900">Production Dashboard</h1>
              <div className="flex items-center gap-2 text-xs  text-slate-500 font-medium text-xs ">
                <span>Manufacturing</span>
                <ChevronRight size={10} />
                <span className="text-indigo-600">Analytics & Insights</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-xs   text-slate-400  bg-slate-50 p-2  py-2 rounded border border-slate-200">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div className=" p-2">
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <p className="text-xs  text-rose-900">{error}</p>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-3">
        <StatCard label="Completed Today" value={stats.completedToday} subtitle="Success" icon={CheckCircle2} color="emerald" />
        <StatCard label="In Progress" value={stats.inProgress} subtitle="Active Jobs" icon={Activity} color="blue" />
        <StatCard label="Pending" value={stats.pending} subtitle="Awaiting" icon={Clock} color="amber" />
        <StatCard
          label="Overdue Orders"
          value={stats.overdueSalesOrders}
          subtitle="At Risk"
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard label="Workstations" value={stats.workstations} subtitle="Capacity" icon={Factory} color="violet" />
        <StatCard label="Operations" value={stats.operations} subtitle="Defined" icon={Wrench} color="cyan" />
      </div>

      {rawJobCards.length > 0 && (
        <div className="mb-8 p-3 bg-amber-50/50 border border-amber-100 rounded">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-amber-100 p-2 rounded">
              <AlertCircle size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-xs text-slate-900 text-xs">Production Status & Health</h3>
              <p className="text-xs  text-slate-500   mt-0.5">Real-time Operational Monitoring</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-2 rounded border border-rose-100  transition-all hover:shadow-md">
              <p className="text-xs   text-slate-400 text-xs mb-1 text-center">Jobs at Risk</p>
              <div className="text-xl   text-rose-600 text-center">
                {rawJobCards.filter(jc => normalizeStatus(jc.status) === 'in-progress' && jc.actual_hours > jc.expected_hours * 1.2).length}
              </div>
              <div className=" border-t border-slate-50">
                <p className="text-[9px] text-slate-500 font-medium text-xs text-center text-xstracking-tighter">Running 20%+ over expected time</p>
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-blue-100  transition-all hover:shadow-md">
              <p className="text-xs   text-slate-400 text-xs mb-1 text-center">On Track</p>
              <div className="text-xl   text-blue-600 text-center">
                {rawJobCards.filter(jc => normalizeStatus(jc.status) === 'in-progress' && jc.actual_hours <= jc.expected_hours).length}
              </div>
              <div className=" border-t border-slate-50">
                <p className="text-[9px] text-slate-500 font-medium text-xs text-center text-xstracking-tighter">Within expected duration</p>
              </div>
            </div>

            <div className="bg-white p-2 rounded border border-emerald-100  transition-all hover:shadow-md">
              <p className="text-xs   text-slate-400 text-xs mb-1 text-center">Completed</p>
              <div className="text-xl   text-emerald-600 text-center">
                {rawJobCards.filter(jc => normalizeStatus(jc.status) === 'completed').length}
              </div>
              <div className=" border-t border-slate-50">
                <p className="text-[9px] text-slate-500 font-medium text-xs text-center text-xstracking-tighter">Successfully finished</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-8 border-b border-slate-200">
        <div className="flex gap-1  no-scrollbar pb-[1px]">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'production', label: 'Production', icon: TrendingUp },
            { id: 'workorders', label: 'Work Orders', icon: Clipboard },
            { id: 'boms', label: 'BOMs', icon: Package },
            { id: 'prodplans', label: 'Prod Plans', icon: Calendar },
            { id: 'jobcards', label: 'Job Cards', icon: FileText },
          ].map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 p-2  py-2 transition-all text-xs    whitespace-nowrap border-b-2 relative ${isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <TabIcon size={14} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
            {['weekly', 'monthly', 'yearly'].map(type => (
              <button
                key={type}
                onClick={() => setScheduleType(type)}
                className={`p-2 text-xs font-medium rounded transition-all ${scheduleType === type
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <ChartContainer
            title={`${scheduleType.charAt(0).toUpperCase() + scheduleType.slice(1)} Production Trend`}
            subtitle={
              scheduleType === 'weekly' ? 'Daily production metrics across completion status' :
                scheduleType === 'monthly' ? 'Monthly production aggregation across completion status' :
                  'Yearly production aggregation across completion status'
            }
          >
            <ResponsiveContainer width="100%" height={420}>
              <BarChart
                data={chartData.dailyProduction}
                margin={{
                  top: 20,
                  right: 30,
                  left: 0,
                  bottom: scheduleType === 'weekly' ? 20 : scheduleType === 'monthly' ? 80 : 40
                }}
              >
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#6b7280"
                  style={{ fontSize: '11px' }}
                  angle={scheduleType === 'weekly' ? 0 : scheduleType === 'monthly' ? -45 : -30}
                  textAnchor={scheduleType === 'weekly' ? 'middle' : 'end'}
                  height={scheduleType === 'weekly' ? 30 : scheduleType === 'monthly' ? 80 : 60}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={<CustomTooltip />}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar
                  dataKey="completed"
                  fill="url(#colorCompleted)"
                  name="Completed"
                  radius={[12, 12, 0, 0]}
                  animationDuration={600}
                />
                <Bar
                  dataKey="inProgress"
                  fill="url(#colorProgress)"
                  name="In Progress"
                  radius={[12, 12, 0, 0]}
                  animationDuration={600}
                />
                <Bar
                  dataKey="pending"
                  fill="url(#colorPending)"
                  name="Pending"
                  radius={[12, 12, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}

      {activeTab === 'workorders' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
              {['weekly', 'monthly', 'yearly'].map(type => (
                <button
                  key={type}
                  onClick={() => setWoScheduleType(type)}
                  className={`p-2 text-xs font-medium rounded transition-all ${woScheduleType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <ChartContainer
              title={`${woScheduleType.charAt(0).toUpperCase() + woScheduleType.slice(1)} Work Order Trend`}
              subtitle={
                woScheduleType === 'weekly' ? 'Daily work order metrics across completion status' :
                  woScheduleType === 'monthly' ? 'Monthly work order aggregation across completion status' :
                    'Yearly work order aggregation across completion status'
              }
            >
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  data={chartData.workOrderTimeline}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: woScheduleType === 'weekly' ? 20 : woScheduleType === 'monthly' ? 80 : 40
                  }}
                >
                  <defs>
                    <linearGradient id="colorWOCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorWOProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorWOPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={woScheduleType === 'weekly' ? 0 : woScheduleType === 'monthly' ? -45 : -30}
                    textAnchor={woScheduleType === 'weekly' ? 'middle' : 'end'}
                    height={woScheduleType === 'weekly' ? 30 : woScheduleType === 'monthly' ? 80 : 60}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="completed"
                    fill="url(#colorWOCompleted)"
                    name="Completed"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                  <Bar
                    dataKey="inProgress"
                    fill="url(#colorWOProgress)"
                    name="In Progress"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                  <Bar
                    dataKey="pending"
                    fill="url(#colorWOPending)"
                    name="Pending"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          <ChartContainer title="Work Order Status Distribution" subtitle="Count breakdown by order status">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData.workOrderStatus} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorWorkOrder" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.5} />
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
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-xs   text-slate-900 ">Work Order Registry ({dataEntries.workOrders.length})</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
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
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
              {['weekly', 'monthly', 'yearly'].map(type => (
                <button
                  key={type}
                  onClick={() => setBomScheduleType(type)}
                  className={`p-2 text-xs font-medium rounded transition-all ${bomScheduleType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <ChartContainer
              title={`${bomScheduleType.charAt(0).toUpperCase() + bomScheduleType.slice(1)} BOM Trend`}
              subtitle={
                bomScheduleType === 'weekly' ? 'Daily BOM creation metrics' :
                  bomScheduleType === 'monthly' ? 'Monthly BOM aggregation' :
                    'Yearly BOM aggregation'
              }
            >
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  data={chartData.bomTimeline}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: bomScheduleType === 'weekly' ? 20 : bomScheduleType === 'monthly' ? 80 : 40
                  }}
                >
                  <defs>
                    <linearGradient id="colorBOMCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={bomScheduleType === 'weekly' ? 0 : bomScheduleType === 'monthly' ? -45 : -30}
                    textAnchor={bomScheduleType === 'weekly' ? 'middle' : 'end'}
                    height={bomScheduleType === 'weekly' ? 30 : bomScheduleType === 'monthly' ? 80 : 60}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="url(#colorBOMCount)"
                    name="Count"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          {dataEntries.boms.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-xs   text-slate-900 ">BOM Repository ({dataEntries.boms.length})</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
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
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
              {['weekly', 'monthly', 'yearly'].map(type => (
                <button
                  key={type}
                  onClick={() => setPpScheduleType(type)}
                  className={`p-2 text-xs font-medium rounded transition-all ${ppScheduleType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <ChartContainer
              title={`${ppScheduleType.charAt(0).toUpperCase() + ppScheduleType.slice(1)} Production Plan Trend`}
              subtitle={
                ppScheduleType === 'weekly' ? 'Daily production plan metrics with quantities' :
                  ppScheduleType === 'monthly' ? 'Monthly production plan aggregation with quantities' :
                    'Yearly production plan aggregation with quantities'
              }
            >
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  data={chartData.ppTimeline}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: ppScheduleType === 'weekly' ? 20 : ppScheduleType === 'monthly' ? 80 : 40
                  }}
                >
                  <defs>
                    <linearGradient id="colorPPCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorPPQuantity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={ppScheduleType === 'weekly' ? 0 : ppScheduleType === 'monthly' ? -45 : -30}
                    textAnchor={ppScheduleType === 'weekly' ? 'middle' : 'end'}
                    height={ppScheduleType === 'weekly' ? 30 : ppScheduleType === 'monthly' ? 80 : 60}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="count"
                    fill="url(#colorPPCount)"
                    name="Count"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="url(#colorPPQuantity)"
                    name="Quantity"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          {dataEntries.productionPlans.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-xs   text-slate-900 ">Strategy Catalog ({dataEntries.productionPlans.length})</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
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
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
              {['weekly', 'monthly', 'yearly'].map(type => (
                <button
                  key={type}
                  onClick={() => setJcScheduleType(type)}
                  className={`p-2 text-xs font-medium rounded transition-all ${jcScheduleType === type
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
            <ChartContainer
              title={`${jcScheduleType.charAt(0).toUpperCase() + jcScheduleType.slice(1)} Job Card Trend`}
              subtitle={
                jcScheduleType === 'weekly' ? 'Daily job card metrics across completion status' :
                  jcScheduleType === 'monthly' ? 'Monthly job card aggregation across completion status' :
                    'Yearly job card aggregation across completion status'
              }
            >
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  data={chartData.jcTimeline}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 0,
                    bottom: jcScheduleType === 'weekly' ? 20 : jcScheduleType === 'monthly' ? 80 : 40
                  }}
                >
                  <defs>
                    <linearGradient id="colorJCCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorJCProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="colorJCPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                    angle={jcScheduleType === 'weekly' ? 0 : jcScheduleType === 'monthly' ? -45 : -30}
                    textAnchor={jcScheduleType === 'weekly' ? 'middle' : 'end'}
                    height={jcScheduleType === 'weekly' ? 30 : jcScheduleType === 'monthly' ? 80 : 60}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar
                    dataKey="completed"
                    fill="url(#colorJCCompleted)"
                    name="Completed"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                  <Bar
                    dataKey="inProgress"
                    fill="url(#colorJCProgress)"
                    name="In Progress"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                  <Bar
                    dataKey="pending"
                    fill="url(#colorJCPending)"
                    name="Pending"
                    radius={[12, 12, 0, 0]}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
          {dataEntries.jobCards.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-indigo-600 rounded-full" />
                <h3 className="text-xs   text-slate-900 ">Job Card Ledger ({dataEntries.jobCards.length})</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {dataEntries.jobCards.slice(0, 10).map(item => (
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


