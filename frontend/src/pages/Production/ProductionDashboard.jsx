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
  const [scheduleType, setScheduleType] = useState('weekly')
  const [woScheduleType, setWoScheduleType] = useState('weekly')
  const [bomScheduleType, setBomScheduleType] = useState('weekly')
  const [ppScheduleType, setPpScheduleType] = useState('weekly')
  const [jcScheduleType, setJcScheduleType] = useState('weekly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartData, setChartData] = useState({
    jobStatus: [],
    dailyProduction: [],
    workOrderStatus: [],
    capacityUtilization: [],
    workOrderTimeline: [],
    bomTimeline: [],
    ppTimeline: [],
    jcTimeline: []
  })
  const [rawJobCards, setRawJobCards] = useState([])
  const [rawWorkOrders, setRawWorkOrders] = useState([])
  const [rawBOMs, setRawBOMs] = useState([])
  const [rawProductionPlans, setRawProductionPlans] = useState([])
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

  useEffect(() => {
    if (rawJobCards.length > 0) {
      console.log(`[Dashboard] Chart update: scheduleType=${scheduleType}, jobCards=${rawJobCards.length}`)
      const dailyData = getProductionChartData(rawJobCards)
      console.log(`[Dashboard] Generated ${scheduleType} chart data:`, dailyData)
      setChartData(prev => ({
        ...prev,
        dailyProduction: dailyData
      }))
    }
  }, [scheduleType, rawJobCards])

  useEffect(() => {
    if (rawWorkOrders.length > 0) {
      console.log(`[Dashboard] WO Chart update: woScheduleType=${woScheduleType}, workOrders=${rawWorkOrders.length}`)
      const woData = getWorkOrderChartData(rawWorkOrders)
      console.log(`[Dashboard] Generated ${woScheduleType} WO chart data:`, woData)
      setChartData(prev => ({
        ...prev,
        workOrderTimeline: woData
      }))
    }
  }, [woScheduleType, rawWorkOrders])

  useEffect(() => {
    if (rawBOMs.length > 0) {
      console.log(`[Dashboard] BOM Chart update: bomScheduleType=${bomScheduleType}, BOMs=${rawBOMs.length}`)
      const bomData = getBOMChartData(rawBOMs)
      console.log(`[Dashboard] Generated ${bomScheduleType} BOM chart data:`, bomData)
      setChartData(prev => ({
        ...prev,
        bomTimeline: bomData
      }))
    }
  }, [bomScheduleType, rawBOMs])

  useEffect(() => {
    if (rawProductionPlans.length > 0) {
      console.log(`[Dashboard] PP Chart update: ppScheduleType=${ppScheduleType}, PPs=${rawProductionPlans.length}`)
      const ppData = getPPChartData(rawProductionPlans)
      console.log(`[Dashboard] Generated ${ppScheduleType} PP chart data:`, ppData)
      setChartData(prev => ({
        ...prev,
        ppTimeline: ppData
      }))
    }
  }, [ppScheduleType, rawProductionPlans])

  useEffect(() => {
    if (rawJobCards.length > 0) {
      console.log(`[Dashboard] JC Chart update: jcScheduleType=${jcScheduleType}, JCs=${rawJobCards.length}`)
      const jcData = getJCChartData(rawJobCards)
      console.log(`[Dashboard] Generated ${jcScheduleType} JC chart data:`, jcData)
      setChartData(prev => ({
        ...prev,
        jcTimeline: jcData
      }))
    }
  }, [jcScheduleType, rawJobCards])

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

      const dailyData = jc.length > 0 
        ? getProductionChartData(jc)
        : generateEmptyDailyChart()

      const capacityData = ws.length > 0 ? ws.map(item => ({
        station: item.ws_name || item.name || `Station`,
        usage: Math.max(0, Math.min(100, item.utilization_percent || 0))
      })) : []

      setRawJobCards(jc)
      setRawWorkOrders(wo)
      setRawBOMs(bom)
      setRawProductionPlans(pp)

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

  const generateDailyProductionChart = (jobCards) => {
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      last7Days.push(d.toISOString().split('T')[0])
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return last7Days.map((dateStr, idx) => {
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

  const generateMonthlyProductionChart = (jobCards) => {
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

    console.log('[Monthly] Job cards count:', jobCards.length)
    console.log('[Monthly] Sample job card:', jobCards[0])

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

  const generateYearlyProductionChart = (jobCards) => {
    const last5Years = []
    
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    console.log('[Yearly] Job cards count:', jobCards.length)
    console.log('[Yearly] Sample job card:', jobCards[0])

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

  const getProductionChartData = (jobCards) => {
    if (scheduleType === 'monthly') {
      return generateMonthlyProductionChart(jobCards)
    } else if (scheduleType === 'yearly') {
      return generateYearlyProductionChart(jobCards)
    } else {
      return generateDailyProductionChart(jobCards)
    }
  }

  const generateDailyWorkOrderChart = (workOrders) => {
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

  const generateMonthlyWorkOrderChart = (workOrders) => {
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

    console.log('[Monthly WO] Work orders count:', workOrders.length)
    console.log('[Monthly WO] Sample work order:', workOrders[0])

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

  const generateYearlyWorkOrderChart = (workOrders) => {
    const last5Years = []
    
    for (let i = 4; i >= 0; i--) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - i)
      last5Years.push(d.getFullYear())
    }

    console.log('[Yearly WO] Work orders count:', workOrders.length)
    console.log('[Yearly WO] Sample work order:', workOrders[0])

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

  const getWorkOrderChartData = (workOrders) => {
    if (woScheduleType === 'monthly') {
      return generateMonthlyWorkOrderChart(workOrders)
    } else if (woScheduleType === 'yearly') {
      return generateYearlyWorkOrderChart(workOrders)
    } else {
      return generateDailyWorkOrderChart(workOrders)
    }
  }

  const generateDailyBOMChart = (boms) => {
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

  const generateMonthlyBOMChart = (boms) => {
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

  const generateYearlyBOMChart = (boms) => {
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

  const getBOMChartData = (boms) => {
    if (bomScheduleType === 'monthly') {
      return generateMonthlyBOMChart(boms)
    } else if (bomScheduleType === 'yearly') {
      return generateYearlyBOMChart(boms)
    } else {
      return generateDailyBOMChart(boms)
    }
  }

  const generateDailyPPChart = (plans) => {
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

  const generateMonthlyPPChart = (plans) => {
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

  const generateYearlyPPChart = (plans) => {
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

  const getPPChartData = (plans) => {
    if (ppScheduleType === 'monthly') {
      return generateMonthlyPPChart(plans)
    } else if (ppScheduleType === 'yearly') {
      return generateYearlyPPChart(plans)
    } else {
      return generateDailyPPChart(plans)
    }
  }

  const generateDailyJCChart = (jobCards) => {
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

  const generateMonthlyJCChart = (jobCards) => {
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

  const generateYearlyJCChart = (jobCards) => {
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

  const getJCChartData = (jobCards) => {
    if (jcScheduleType === 'monthly') {
      return generateMonthlyJCChart(jobCards)
    } else if (jcScheduleType === 'yearly') {
      return generateYearlyJCChart(jobCards)
    } else {
      return generateDailyJCChart(jobCards)
    }
  }

  const StatCard = ({ label, value, subtitle, icon: Icon, borderColor, bgColor }) => (
    <div className="bg-white rounded-xs p-3 border-l-4 flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5" >
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
      <div className="bg-gradient-to-br from-white to-gray-50 border-l-4 rounded-xsp-2 shadow-sm hover:shadow-md transition-all" style={{ borderLeftColor: statusColor }}>
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
        <div className="bg-white p-3 rounded-xs shadow-xl border border-gray-200">
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
        <h3 className="text-xs font-bold text-gray-900">{title}</h3>
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
          <div className="flex items-center gap-3 p-3 rounded-xs mb-6 text-xs bg-amber-50 text-amber-900 border border-amber-200">
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

        {rawJobCards.length > 0 && (
          <div className="mb-6 p-4 rounded-xs border border-orange-200 bg-orange-50">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-600" /> Production Status & Alerts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded border border-orange-100">
                <div className="text-gray-600 font-semibold mb-1">Jobs at Risk</div>
                <div className="text-lg font-bold text-red-600">
                  {rawJobCards.filter(jc => (jc.status || '').toLowerCase() === 'in-progress' && jc.actual_hours > jc.expected_hours * 1.2).length}
                </div>
                <div className="text-gray-500 mt-1">Running 20%+ over expected time</div>
              </div>
              <div className="bg-white p-3 rounded border border-blue-100">
                <div className="text-gray-600 font-semibold mb-1">On Track</div>
                <div className="text-lg font-bold text-green-600">
                  {rawJobCards.filter(jc => (jc.status || '').toLowerCase() === 'in-progress' && jc.actual_hours <= jc.expected_hours).length}
                </div>
                <div className="text-gray-500 mt-1">Within expected duration</div>
              </div>
              <div className="bg-white p-3 rounded border border-green-100">
                <div className="text-gray-600 font-semibold mb-1">Completed</div>
                <div className="text-lg font-bold text-green-600">
                  {rawJobCards.filter(jc => (jc.status || '').toLowerCase() === 'completed').length}
                </div>
                <div className="text-gray-500 mt-1">Successfully finished</div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
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
          <div className="space-y-4">
            <div className="flex gap-2 items-center">
              <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
              {['weekly', 'monthly', 'yearly'].map(type => (
                <button
                  key={type}
                  onClick={() => setScheduleType(type)}
                  className={`px-4 py-2 text-xs font-medium rounded transition-all ${
                    scheduleType === type
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
                    className={`px-4 py-2 text-xs font-medium rounded transition-all ${
                      woScheduleType === type
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
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="colorWOProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="colorWOPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
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
                <h3 className="text-xs font-bold text-gray-900 mb-4">Recent Work Orders</h3>
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
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
                {['weekly', 'monthly', 'yearly'].map(type => (
                  <button
                    key={type}
                    onClick={() => setBomScheduleType(type)}
                    className={`px-4 py-2 text-xs font-medium rounded transition-all ${
                      bomScheduleType === type
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
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.6}/>
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
              <div>
                <h3 className="text-xs font-bold text-gray-900 mb-4">BOMs List</h3>
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
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
                {['weekly', 'monthly', 'yearly'].map(type => (
                  <button
                    key={type}
                    onClick={() => setPpScheduleType(type)}
                    className={`px-4 py-2 text-xs font-medium rounded transition-all ${
                      ppScheduleType === type
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
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="colorPPQuantity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
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
              <div>
                <h3 className="text-xs font-bold text-gray-900 mb-4">Production Plans</h3>
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
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <span className="text-xs font-semibold text-gray-600 mr-2">Schedule:</span>
                {['weekly', 'monthly', 'yearly'].map(type => (
                  <button
                    key={type}
                    onClick={() => setJcScheduleType(type)}
                    className={`px-4 py-2 text-xs font-medium rounded transition-all ${
                      jcScheduleType === type
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
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="colorJCProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6}/>
                    </linearGradient>
                    <linearGradient id="colorJCPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.6}/>
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
              <div>
                <h3 className="text-xs font-bold text-gray-900 mb-4">Job Cards</h3>
                <div className="space-y-4">
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
