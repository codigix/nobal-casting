import React, { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertCircle, TrendingUp, Users, Package, Wrench } from 'lucide-react'
import toolroomService from '../../services/toolroomService'

const ToolRoomDashboard = () => {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await toolroomService.getDashboardAnalytics()
      setAnalytics(response.data.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading dashboard...</div>
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded">Error: {error}</div>

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Wrench className="w-10 h-10 text-blue-600" />
            Tool Room Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Track tools, dies, maintenance & performance</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="Total Tools"
            value={analytics?.totalTools || 0}
            icon={<Package className="w-8 h-8" />}
            color="blue"
          />
          <KPICard
            title="Dies in Use"
            value={analytics?.dieCount || 0}
            icon={<TrendingUp className="w-8 h-8" />}
            color="green"
          />
          <KPICard
            title="Maintenance Due"
            value={analytics?.maintenanceDue || 0}
            icon={<AlertCircle className="w-8 h-8" />}
            color="orange"
          />
          <KPICard
            title="Utilization Rate"
            value={`${analytics?.utilizationRate || 0}%`}
            icon={<Users className="w-8 h-8" />}
            color="purple"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Maintenance Cost Trend */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Cost Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics?.maintenanceCostTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cost" stroke="#3B82F6" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tool Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tool Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.toolStatusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Die Utilization by Tool Type */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Die Utilization by Tool Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.dieUtilizationByType || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="toolType" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilization" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Downtime Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Downtime Analysis (Hours)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.downtimeAnalysis || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tool" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="downtime" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            title="Recent Maintenance"
            items={analytics?.recentMaintenance || []}
          />
          <SummaryCard
            title="Die Rework Log"
            items={analytics?.recentRework || []}
          />
          <SummaryCard
            title="Tool Alerts"
            items={analytics?.toolAlerts || []}
          />
        </div>
      </div>
    </div>
  )
}

const KPICard = ({ title, value, icon, color }) => {
  const colorClass = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600'
  }[color]

  return (
    <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
      <div className={`${colorClass} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

const SummaryCard = ({ title, items }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ul className="space-y-3">
        {items.slice(0, 5).map((item, idx) => (
          <li key={idx} className="flex justify-between text-sm text-gray-600 border-b pb-2">
            <span>{item.name || item.title}</span>
            <span className="font-semibold text-gray-900">{item.value || item.status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ToolRoomDashboard