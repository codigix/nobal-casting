import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { TrendingUp, Calendar, AlertCircle, Clock, CheckCircle, AlertTriangle, Target, Eye, Edit2, Truck, Package } from 'lucide-react'

const statusConfig = {
  draft: { icon: Edit2, color: '#f97316', bg: '#fef3c7', text: '#92400e', label: 'Draft' },
  production: { icon: Truck, color: '#06b6d4', bg: '#cffafe', text: '#164e63', label: 'Production' },
  complete: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Complete' },
  on_hold: { icon: AlertCircle, color: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'On Hold' },
  dispatched: { icon: Truck, color: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6', label: 'Dispatched' },
  delivered: { icon: Package, color: '#059669', bg: '#d1fae5', text: '#065f46', label: 'Delivered' }
}

const StatusBadge = ({ status }) => {
  const config = statusConfig[status?.toLowerCase()] || statusConfig.draft
  const Icon = config.icon

  return (
    <div 
      className="inline-flex items-center gap-1 px-2 py-1 rounded font-semibold text-xs"
      style={{
        backgroundColor: config.bg,
        borderLeft: `2px solid ${config.color}`,
        color: config.text
      }}
    >
      <Icon size={12} style={{ color: config.color }} />
      <span>{config.label}</span>
    </div>
  )
}

const DetailModal = ({ isOpen, project, onClose }) => {
  if (!isOpen || !project) return null

  const timelineData = [
    { week: 'Week 1', progress: Math.floor(project.progress * 0.15) },
    { week: 'Week 2', progress: Math.floor(project.progress * 0.3) },
    { week: 'Week 3', progress: Math.floor(project.progress * 0.5) },
    { week: 'Week 4', progress: Math.floor(project.progress * 0.65) },
    { week: 'Week 5', progress: Math.floor(project.progress * 0.8) },
    { week: 'Week 6', progress: project.progress }
  ]

  const getStatusColor = (status) => {
    const s = status?.toLowerCase() || ''
    switch (true) {
      case s.includes('delivered'):
        return 'bg-green-100 text-green-800'
      case s.includes('complete'):
        return 'bg-green-100 text-green-800'
      case s.includes('dispatched'):
        return 'bg-purple-100 text-purple-800'
      case s.includes('production'):
        return 'bg-cyan-100 text-cyan-800'
      case s.includes('on_hold'):
        return 'bg-amber-100 text-amber-800'
      case s.includes('draft'):
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-2">
      <div className="bg-white rounded-xs shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 p-3 flex items-center justify-between text-white z-10">
          <div>
            <h2 className="text-lg font-bold m-0">{project.name}</h2>
            <p className="text-slate-300 text-xs mt-0.5 m-0">Project ID: PRJ-{String(project.id).padStart(4, '0')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-green-50 rounded-xs p-3 border border-green-200">
              <p className="text-xs font-semibold text-green-900 uppercase mb-1 m-0">Progress</p>
              <p className="text-xl font-bold text-green-700 m-0">{project.progress}%</p>
              <p className="text-xs text-slate-600 mt-1">Overall completion</p>
            </div>
            <div className="bg-blue-50 rounded-xs p-3 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 uppercase mb-1 m-0">Status</p>
              <div className="mt-1 mb-1">
                <StatusBadge status={project.status} />
              </div>
              <p className="text-xs text-slate-600 mt-1">Current state</p>
            </div>
            <div className="bg-orange-50 rounded-xs p-3 border border-orange-200">
              <p className="text-xs font-semibold text-orange-900 uppercase mb-1 m-0">Timeline</p>
              <p className="text-xl font-bold text-orange-700 m-0">{project.daysLeft > 0 ? project.daysLeft : '0'}</p>
              <p className="text-xs text-slate-600 mt-1">{project.daysLeft > 0 ? 'Days remaining' : 'Completed'}</p>
            </div>
            <div className="bg-purple-50 rounded-xs p-3 border border-purple-200">
              <p className="text-xs font-semibold text-purple-900 uppercase mb-1 m-0">Revenue</p>
              <p className="text-lg font-bold text-purple-700 m-0">{project.revenue ? new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0}).format(project.revenue) : 'N/A'}</p>
              <p className="text-xs text-slate-600 mt-1">Order amount</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-xs p-3 border border-gray-200">
              <h3 className="text-xs font-bold text-slate-900 mb-2 m-0">📈 Weekly Progress Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip formatter={(value) => `${value}%`} contentStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="progress" stroke="#06b6d4" fillOpacity={1} fill="url(#colorProgress)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xs p-3 border border-gray-200">
              <h3 className="text-xs font-bold text-slate-900 mb-2 m-0">📊 Tasks Completed Per Week</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="tasks" fill="#8b5cf6" name="Tasks Completed" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xs p-3 border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 mb-2 m-0">📋 Project Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-300">
                <span className="text-slate-600">Project ID:</span>
                <span className="font-bold text-slate-900">{project.id || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-300">
                <span className="text-slate-600">Customer:</span>
                <span className="font-bold text-slate-900">{project.customer_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-300">
                <span className="text-slate-600">Status:</span>
                <span className="font-bold text-slate-900 capitalize">{project.status || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-300">
                <span className="text-slate-600">Progress:</span>
                <span className="font-bold text-slate-900">{project.progress || 0}%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-300">
                <span className="text-slate-600">Due Date:</span>
                <span className="font-bold text-slate-900">{project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-300">
                <span className="text-slate-600">Revenue:</span>
                <span className="font-bold text-slate-900">{project.revenue ? new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0}).format(project.revenue) : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectAnalysis() {
  const [projectStatus, setProjectStatus] = useState([])
  const [projectTimeline, setProjectTimeline] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)

  useEffect(() => {
    fetchProjectAnalysis()
  }, [])

  const fetchProjectAnalysis = async () => {
    try {
      setLoading(true)
      
      const apiUrl = import.meta.env.VITE_API_URL
      const token = localStorage.getItem('token')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const [salesOrdersRes, productionPlansRes, jobCardsRes] = await Promise.all([
        fetch(`${apiUrl}/selling/sales-orders`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/production/plans`, { headers }).then(r => r.json()).catch(() => []),
        fetch(`${apiUrl}/production/job-cards`, { headers }).then(r => r.json()).catch(() => [])
      ])

      const salesOrders = (salesOrdersRes.data || salesOrdersRes || []).filter(item => item)
      const productionPlans = (productionPlansRes.data || productionPlansRes || []).filter(item => item)
      const jobCards = (jobCardsRes.data || jobCardsRes || []).filter(item => item)

      console.log('Real Data - Sales Orders:', salesOrders.length, 'Production Plans:', productionPlans.length, 'Job Cards:', jobCards.length)

      const projectsWithMetrics = salesOrders.map((so, idx) => {
        const relatedPlans = productionPlans.filter(pp => pp.sales_order_id === so.id || pp.so_id === so.id || pp.order_id === so.id)
        const relatedJobCards = jobCards.filter(jc => jc.sales_order_id === so.id || jc.so_id === so.id)
        
        const completedJCs = relatedJobCards.filter(jc => {
          const status = String(jc.status || '').toLowerCase().trim()
          return status === 'completed' || status === 'delivered'
        }).length
        
        const totalJCs = relatedJobCards.length || 1
        const progress = totalJCs > 0 ? Math.round((completedJCs / totalJCs) * 100) : 0
        
        const createdDate = new Date(so.creation_date || so.created_at || new Date())
        const dueDate = new Date(so.delivery_date || so.due_date || new Date())
        const today = new Date()
        const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
        
        return {
          id: so.id || so.sales_order_id || idx,
          name: so.name || so.order_id || `SO-${idx + 1}`,
          customer_name: so.customer_name || so.customer || 'Unknown',
          status: so.status || so.order_status || 'draft',
          progress: progress,
          revenue: so.grand_total || so.total || so.amount || 0,
          daysLeft: daysLeft,
          dueDate: dueDate,
          createdDate: createdDate,
          total_qty: so.total_qty || so.qty || 0,
          item_name: so.item_name || 'N/A',
          production_plans_count: relatedPlans.length,
          job_cards_count: relatedJobCards.length,
          completed_job_cards: completedJCs
        }
      })

      const statusCounts = {}
      projectsWithMetrics.forEach(p => {
        const status = p.status?.toLowerCase() || 'draft'
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      const statusData = Object.entries(statusCounts).map(([status, count]) => {
        let color = '#6b7280'
        switch (status.toLowerCase()) {
          case 'delivered':
          case 'completed':
            color = '#059669'
            break
          case 'dispatched':
            color = '#8b5cf6'
            break
          case 'complete':
            color = '#10b981'
            break
          case 'production':
          case 'in-progress':
            color = '#06b6d4'
            break
          case 'on_hold':
            color = '#f59e0b'
            break
          case 'draft':
            color = '#f97316'
            break
        }
        return {
          name: status.charAt(0).toUpperCase() + status.replace('_', ' ').replace('-', ' ').slice(1),
          value: count,
          color: color
        }
      })

      const monthlyTimeline = {}
      projectsWithMetrics.forEach(p => {
        const monthKey = p.createdDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })
        if (!monthlyTimeline[monthKey]) {
          monthlyTimeline[monthKey] = { month: monthKey, projects: 0, completed: 0, revenue: 0 }
        }
        monthlyTimeline[monthKey].projects += 1
        monthlyTimeline[monthKey].revenue += p.revenue
        if (p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'delivered') {
          monthlyTimeline[monthKey].completed += 1
        }
      })

      const timelineData = Object.values(monthlyTimeline).reverse()

      const totalRev = projectsWithMetrics.reduce((sum, p) => sum + (p.revenue || 0), 0)
      const completedCount = projectsWithMetrics.filter(p => {
        const status = String(p.status || '').toLowerCase().trim()
        return status === 'completed' || status === 'delivered' || status === 'complete'
      }).length
      const compRate = projectsWithMetrics.length > 0 ? Math.round((completedCount / projectsWithMetrics.length) * 100) : 0

      setProjectStatus(statusData)
      setProjectTimeline(timelineData)
      setAllProjects(projectsWithMetrics)
      setTotalRevenue(totalRev)
      setCompletionRate(compRate)

      console.log('Processed:', projectsWithMetrics.length, 'projects with status breakdown:', statusData, 'timeline:', timelineData)
    } catch (err) {
      console.error('Error fetching production projects:', err)
      setError(err.message || 'Failed to fetch projects from production')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return '#059669'
      case 'dispatched':
        return '#8b5cf6'
      case 'complete':
        return '#10b981'
      case 'production':
        return '#06b6d4'
      case 'on_hold':
        return '#f59e0b'
      case 'draft':
        return '#f97316'
      default:
        return '#6b7280'
    }
  }

  const recentProjects = activeTab === 'all' ? allProjects : allProjects.filter(p => p.status?.toLowerCase() === activeTab)

  const openModal = (project) => {
    setSelectedProject(project)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedProject(null)
  }

  const getStatusBadgeColor = (status) => {
    const s = status?.toLowerCase() || ''
    switch (true) {
      case s.includes('delivered'):
        return 'bg-green-100 text-green-800'
      case s.includes('complete'):
        return 'bg-green-100 text-green-800'
      case s.includes('dispatched'):
        return 'bg-purple-100 text-purple-800'
      case s.includes('production'):
        return 'bg-cyan-100 text-cyan-800'
      case s.includes('on_hold'):
        return 'bg-amber-100 text-amber-800'
      case s.includes('draft'):
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getProgressBarColor = (status) => {
    const s = status?.toLowerCase() || ''
    switch (true) {
      case s.includes('delivered'):
        return 'bg-green-500'
      case s.includes('complete'):
        return 'bg-green-500'
      case s.includes('dispatched'):
        return 'bg-purple-500'
      case s.includes('production'):
        return 'bg-cyan-500'
      case s.includes('on_hold'):
        return 'bg-amber-500'
      case s.includes('draft'):
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block p-2 bg-white rounded-xs shadow-sm mb-4">
            <div className="animate-spin text-4xl">⏳</div>
          </div>
          <p className="text-slate-600">Loading sales orders analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="inline-block p-2 bg-red-50 rounded-xs mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <p className="text-red-600 font-semibold mb-2">Error Loading Data</p>
          <p className="text-slate-600 text-xs">{error}</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0)
  }

  const stats = [
    { 
      label: 'Total Orders', 
      value: allProjects.length.toString(), 
      icon: Target, 
      color: 'from-purple-500 to-purple-600', 
      bgColor: 'from-purple-50 to-purple-100' 
    },
    { 
      label: 'Total Revenue', 
      value: formatCurrency(totalRevenue), 
      icon: TrendingUp, 
      color: 'from-emerald-500 to-emerald-600', 
      bgColor: 'from-emerald-50 to-emerald-100' 
    },
    { 
      label: 'Completion Rate', 
      value: `${completionRate}%`, 
      icon: CheckCircle, 
      color: 'from-green-500 to-green-600', 
      bgColor: 'from-green-50 to-green-100' 
    },
    { 
      label: 'At Risk', 
      value: allProjects.filter(p => p.daysLeft < 3 && p.daysLeft > 0).length.toString(), 
      icon: AlertTriangle, 
      color: 'from-red-500 to-red-600', 
      bgColor: 'from-red-50 to-red-100' 
    }
  ]

  return (
    <div className="p-0 bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-white to-slate-100 p-2 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className=" mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xs bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-lg">
              📊
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 m-0">
                Project Analysis
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Track and analyze all projects
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4  mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={idx} className={`bg-gradient-to-br ${stat.bgColor} rounded-xs p-3 shadow-md border border-slate-200 relative overflow-hidden`}>
                <div className="absolute -top-5 -right-5 opacity-5 text-4xl">
                  {idx === 0 ? '🎯' : idx === 1 ? '✓' : idx === 2 ? '⏱️' : '⚠️'}
                </div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase">{stat.label}</span>
                    <Icon size={16} className="text-slate-600" />
                  </div>
                  <p className={`text-2xl font-extrabold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent m-0`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xs p-2 border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 mb-3 m-0">
              📈 Project Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie 
                  data={projectStatus} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={({ name, value }) => `${name} (${value})`} 
                  outerRadius={60} 
                  fill="#8884d8" 
                  dataKey="value"
                >
                  {projectStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} projects`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex flex-wrap gap-2">
              {projectStatus.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-semibold text-slate-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xs p-2 border border-gray-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 mb-3 m-0">
              📊 Project Timeline (6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={projectTimeline} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} yAxisId="left" />
                <YAxis stroke="#64748b" fontSize={11} yAxisId="right" orientation="right" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px', color: '#0f172a', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="projects" fill="#3b82f6" name="Total Projects" radius={[6, 6, 0, 0]} yAxisId="left" />
                <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[6, 6, 0, 0]} yAxisId="left" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xs border border-gray-200 shadow-sm">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-slate-900 m-0">
              🚀 Recent Projects
            </h3>
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '8px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 16px',
                backgroundColor: activeTab === 'all' ? '#2563eb' : 'transparent',
                color: activeTab === 'all' ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeTab === 'all' ? '600' : '500',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              All ({allProjects.length})
            </button>
            <button
              onClick={() => setActiveTab('production')}
              style={{
                padding: '6px 16px',
                backgroundColor: activeTab === 'production' ? '#2563eb' : 'transparent',
                color: activeTab === 'production' ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeTab === 'production' ? '600' : '500',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              Production
            </button>
            <button
              onClick={() => setActiveTab('delivered')}
              style={{
                padding: '6px 16px',
                backgroundColor: activeTab === 'delivered' ? '#2563eb' : 'transparent',
                color: activeTab === 'delivered' ? '#fff' : '#666',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: activeTab === 'delivered' ? '600' : '500',
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
            >
              Delivered
            </button>
          </div>

          <div className="">
            <table className="w-full border-collapse border border-gray-200 text-xs">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Project Name</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Status</th>
                  <th className="text-right p-2 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                  <th className="text-center p-2 text-xs font-semibold text-slate-500 uppercase">Progress</th>
                  <th className="text-center p-2 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                  <th className="text-center p-2 text-xs font-semibold text-slate-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500 text-xs">
                      Loading projects...
                    </td>
                  </tr>
                ) : recentProjects.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500 text-xs">
                      No projects found
                    </td>
                  </tr>
                ) : (
                  recentProjects.map((project, idx) => (
                    <tr key={project.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                      <td className="p-2 text-xs text-gray-700 font-semibold">{project.name || 'N/A'}</td>
                      <td className="p-2">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="p-2 text-right">
                        <span className="text-xs font-semibold text-gray-900">{formatCurrency(project.revenue || 0)}</span>
                      </td>
                      <td className="p-2 text-center text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${getProgressBarColor(project.status)}`} 
                              style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-6">{project.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="p-2 text-center text-xs">
                        {project.dueDate ? (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <Calendar size={12} className="text-slate-500" />
                            <span className="text-xs text-gray-700 font-medium">
                              {new Date(project.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-xs font-semibold" style={{
                              color: project.daysLeft > 3 ? '#10b981' : project.daysLeft > 0 ? '#f59e0b' : '#ef4444'
                            }}>
                              {project.daysLeft > 0 ? `${project.daysLeft}d` : project.daysLeft === 0 ? 'Today' : 'Late'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="p-2 text-center text-xs">
                        <button
                          onClick={() => openModal(project)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs font-semibold transition-colors"
                        >
                          <Eye size={12} />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xs p-3 border border-green-200 border-l-4 border-l-green-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-green-900 uppercase mb-0.5 m-0">Completion Rate</p>
                <p className="text-2xl font-extrabold text-green-700 m-0">
                  {completionRate}%
                </p>
                <p className="text-xs text-slate-600 mt-1">Projects delivered</p>
              </div>
              <CheckCircle size={18} className="text-green-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xs p-3 border border-amber-200 border-l-4 border-l-amber-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-900 uppercase mb-0.5 m-0">At Risk</p>
                <p className="text-2xl font-extrabold text-amber-700 m-0">
                  {allProjects.length > 0 ? Math.round((allProjects.filter(p => p.daysLeft > 0 && p.daysLeft < 3).length / allProjects.length) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-600 mt-1">Needs attention</p>
              </div>
              <AlertCircle size={18} className="text-amber-600" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xs p-3 border border-blue-200 border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-900 uppercase mb-0.5 m-0">Total Revenue</p>
                <p className="text-xl font-extrabold text-blue-700 m-0 break-words">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-slate-600 mt-1">All projects combined</p>
              </div>
              <TrendingUp size={18} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <DetailModal
        isOpen={modalOpen}
        project={selectedProject}
        onClose={closeModal}
      />
    </div>
  )
}
