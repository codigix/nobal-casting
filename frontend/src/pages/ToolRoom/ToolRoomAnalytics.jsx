import React, { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Calendar, DollarSign } from 'lucide-react'
import toolroomService from '../../services/toolroomService'

const ToolRoomAnalytics = () => {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [utilizationData, setUtilizationData] = useState(null)
  const [costData, setCostData] = useState(null)
  const [downtimeData, setDowntimeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [util, cost, downtime] = await Promise.all([
        toolroomService.getUtilizationReport(startDate, endDate),
        toolroomService.getCostAnalysis(),
        toolroomService.getDowntimeAnalysis()
      ])
      
      setUtilizationData(util.data.data)
      setCostData(cost.data.data)
      setDowntimeData(downtime.data.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics')
      console.error('Analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading analytics...</div>
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded">Error: {error}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-blue-600" />
            Tool Room Analytics
          </h1>
          <p className="text-gray-600 mt-2">Advanced reports and insights</p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-gray-600">to</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 ml-auto"
            >
              Generate Report
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Utilization Trend */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization Trend</h3>
            {utilizationData?.trend ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={utilizationData.trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="percentage" stroke="#3B82F6" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Cost Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
            {costData?.breakdown ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costData.breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ₹${value}`}
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
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Downtime Analysis */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Downtime by Tool</h3>
            {downtimeData?.byTool ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={downtimeData.byTool}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="toolName" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>

          {/* Utilization by Tool Type */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilization by Tool Type</h3>
            {utilizationData?.byType ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={utilizationData.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="toolType" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="percentage" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No data available</p>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            title="Total Maintenance Cost"
            value={`₹${costData?.totalCost || 0}`}
            subtitle="Period cost"
            icon={<DollarSign className="w-6 h-6" />}
          />
          <SummaryCard
            title="Average Utilization"
            value={`${utilizationData?.average || 0}%`}
            subtitle="Equipment usage"
            icon={<TrendingUp className="w-6 h-6" />}
          />
          <SummaryCard
            title="Total Downtime"
            value={`${downtimeData?.total || 0}h`}
            subtitle="Period downtime"
            icon={<Calendar className="w-6 h-6" />}
          />
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Tool Performance */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tool Performance</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-900">Tool</th>
                  <th className="px-3 py-2 text-left text-gray-900">Utilization</th>
                  <th className="px-3 py-2 text-left text-gray-900">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {utilizationData?.byTool?.slice(0, 5).map((tool, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900 font-medium">{tool.toolName}</td>
                    <td className="px-3 py-2 text-gray-600">{tool.percentage}%</td>
                    <td className="px-3 py-2 text-gray-900">₹{tool.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Summary */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Categories</h3>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-900">Category</th>
                  <th className="px-3 py-2 text-right text-gray-900">Amount</th>
                  <th className="px-3 py-2 text-right text-gray-900">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {costData?.breakdown?.slice(0, 5).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-gray-900 text-right">₹{item.value}</td>
                    <td className="px-3 py-2 text-gray-600 text-right">{item.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const SummaryCard = ({ title, value, subtitle, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
      </div>
      <div className="text-blue-600 opacity-20">
        {icon}
      </div>
    </div>
  </div>
)

export default ToolRoomAnalytics