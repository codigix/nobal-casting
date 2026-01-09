import React, { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts'
import { Star, TrendingUp, DollarSign, Users, Award, Target, ArrowUpRight, ArrowDownRight, Zap, ChevronDown, Eye, X } from 'lucide-react'

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 px-3 py-2.5 rounded-lg border border-gray-700 shadow-lg">
        <p className="text-gray-100 text-xs m-0">
          {payload[0].name}: <span className="font-semibold" style={{ color: payload[0].color }}>${payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    )
  }
  return null
}

const DetailModal = ({ isOpen, item, itemType, onClose }) => {
  if (!isOpen || !item) return null

  const monthlyData = [
    { month: 'Jan', revenue: Math.floor(item.revenue * 0.12), orders: Math.floor(item.orders * 0.15) },
    { month: 'Feb', revenue: Math.floor(item.revenue * 0.14), orders: Math.floor(item.orders * 0.16) },
    { month: 'Mar', revenue: Math.floor(item.revenue * 0.15), orders: Math.floor(item.orders * 0.17) },
    { month: 'Apr', revenue: Math.floor(item.revenue * 0.16), orders: Math.floor(item.orders * 0.18) },
    { month: 'May', revenue: Math.floor(item.revenue * 0.18), orders: Math.floor(item.orders * 0.19) },
    { month: 'Jun', revenue: Math.floor(item.revenue * 0.25), orders: Math.floor(item.orders * 0.15) }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex items-center justify-between text-white z-10">
          <div>
            <h2 className="text-2xl font-bold m-0">{item.name}</h2>
            <p className="text-slate-300 text-sm mt-1 m-0">{itemType === 'customer' ? `Segment: ${item.segment}` : `Type: ${itemType}`}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <p className="text-xs font-semibold text-green-900 uppercase mb-2 m-0">Total Revenue</p>
              <p className="text-xl font-bold text-green-700 m-0">${(item.revenue / 1000).toFixed(0)}k</p>
              <p className="text-xs text-slate-600 mt-2">Lifetime value</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 uppercase mb-2 m-0">Total Orders</p>
              <p className="text-xl font-bold text-blue-700 m-0">{item.orders}</p>
              <p className="text-xs text-slate-600 mt-2">Transaction count</p>
            </div>
            {itemType === 'customer' && (
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                <p className="text-xs font-semibold text-amber-900 uppercase mb-2 m-0">Satisfaction</p>
                <p className="text-xl font-bold text-amber-700 m-0">{item.satisfaction} ⭐</p>
                <p className="text-xs text-slate-600 mt-2">Customer rating</p>
              </div>
            )}
            {itemType === 'project' && (
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <p className="text-xs font-semibold text-purple-900 uppercase mb-2 m-0">Completion</p>
                <p className="text-xl font-bold text-purple-700 m-0">{item.completion}%</p>
                <p className="text-xs text-slate-600 mt-2">Project progress</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-base font-bold text-slate-900 mb-4 m-0">📈 Monthly Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h3 className="text-base font-bold text-slate-900 mb-4 m-0">📦 Monthly Orders Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 m-0">📊 Summary Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itemType === 'customer' && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-600">Projects Active:</span>
                    <span className="font-bold text-slate-900">{item.projects}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-600">Avg Order Value:</span>
                    <span className="font-bold text-slate-900">${(item.revenue / item.orders).toFixed(0)}</span>
                  </div>
                </>
              )}
              {itemType === 'project' && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-600">Status:</span>
                    <span className="font-bold text-slate-900">{item.status}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-600">Start Date:</span>
                    <span className="font-bold text-slate-900">{item.startDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-600">Customer:</span>
                    <span className="font-bold text-slate-900">{item.customer || 'Tata Steel'}</span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Monthly Avg Revenue:</span>
                <span className="font-bold text-slate-900">${(item.revenue / 6 / 1000).toFixed(0)}k</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerStatistics() {
  const [activeTab, setActiveTab] = useState('premium')
  const [activeProjectTab, setActiveProjectTab] = useState('tata')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedItemType, setSelectedItemType] = useState(null)

  const [premiumVsRegular] = useState([
    { name: 'Premium Customers', value: 8, color: '#fbbf24' },
    { name: 'Regular Clients', value: 42, color: '#3b82f6' }
  ])

  const [customerRevenue] = useState([
    { month: 'Jan', premium: 85000, regular: 32000 },
    { month: 'Feb', premium: 92000, regular: 38000 },
    { month: 'Mar', premium: 105000, regular: 45000 },
    { month: 'Apr', premium: 115000, regular: 52000 },
    { month: 'May', premium: 128000, regular: 58000 },
    { month: 'Jun', premium: 145000, regular: 62000 }
  ])

  const [orderComparison] = useState([
    { name: 'Premium', orders: 324, avgValue: 8500, retention: 95, color: '#fbbf24' },
    { name: 'Regular', orders: 425, avgValue: 3200, retention: 72, color: '#3b82f6' }
  ])

  const [premiumCustomers] = useState([
    { id: 1, name: 'Tata Steel Limited', segment: 'Premium', revenue: 580000, orders: 128, satisfaction: 4.9, projects: 15 },
    { id: 2, name: 'Reliance Industries', segment: 'Premium', revenue: 520000, orders: 112, satisfaction: 4.8, projects: 12 },
    { id: 3, name: 'Mahindra & Mahindra', segment: 'Premium', revenue: 485000, orders: 105, satisfaction: 4.7, projects: 11 },
    { id: 4, name: 'Bajaj Auto', segment: 'Premium', revenue: 425000, orders: 95, satisfaction: 4.6, projects: 10 },
    { id: 5, name: 'Hero MotoCorp', segment: 'Premium', revenue: 390000, orders: 82, satisfaction: 4.5, projects: 9 },
    { id: 6, name: 'Maruti Suzuki', segment: 'Premium', revenue: 365000, orders: 78, satisfaction: 4.4, projects: 8 },
    { id: 7, name: 'TVS Motor', segment: 'Premium', revenue: 340000, orders: 72, satisfaction: 4.3, projects: 7 },
    { id: 8, name: 'Escorts Limited', segment: 'Premium', revenue: 295000, orders: 65, satisfaction: 4.2, projects: 6 }
  ])

  const [regularClients] = useState([
    { id: 1, name: 'Tech Manufacturing Co', segment: 'Regular', revenue: 45000, orders: 18, satisfaction: 4.0, projects: 3 },
    { id: 2, name: 'Precision Engineering Ltd', segment: 'Regular', revenue: 38000, orders: 15, satisfaction: 3.8, projects: 2 },
    { id: 3, name: 'AutoParts Solutions', segment: 'Regular', revenue: 32000, orders: 12, satisfaction: 3.7, projects: 2 },
    { id: 4, name: 'Quality Castings Inc', segment: 'Regular', revenue: 28000, orders: 10, satisfaction: 3.5, projects: 2 },
    { id: 5, name: 'Industrial Supplies Co', segment: 'Regular', revenue: 25000, orders: 9, satisfaction: 3.4, projects: 1 },
    { id: 6, name: 'Mechanical Works Ltd', segment: 'Regular', revenue: 22000, orders: 8, satisfaction: 3.3, projects: 1 },
    { id: 7, name: 'Engineering Solutions', segment: 'Regular', revenue: 18000, orders: 6, satisfaction: 3.2, projects: 1 },
    { id: 8, name: 'Small Scale Manufacturing', segment: 'Regular', revenue: 15000, orders: 5, satisfaction: 3.0, projects: 1 }
  ])

  const [performanceMetrics] = useState([
    { metric: 'Revenue', premium: 95, regular: 62 },
    { metric: 'Order Frequency', premium: 87, regular: 58 },
    { metric: 'Satisfaction', premium: 92, regular: 65 },
    { metric: 'Retention', premium: 96, regular: 68 },
    { metric: 'Growth Rate', premium: 88, regular: 55 }
  ])

  const [revenueDistribution] = useState([
    { customer: 'Tata Steel', revenue: 580000, premium: true },
    { customer: 'Reliance', revenue: 520000, premium: true },
    { customer: 'Mahindra & M', revenue: 485000, premium: true },
    { customer: 'Bajaj Auto', revenue: 425000, premium: true },
    { customer: 'Hero MotoCorp', revenue: 390000, premium: true },
    { customer: 'Maruti Suzuki', revenue: 365000, premium: true },
    { customer: 'TVS Motor', revenue: 340000, premium: true },
    { customer: 'Escorts Ltd', revenue: 295000, premium: true },
    { customer: 'Tech Mfg', revenue: 45000, premium: false },
    { customer: 'Precision Eng', revenue: 38000, premium: false }
  ])

  const [tataSteelProjects] = useState([
    { id: 1, name: 'Automotive Steel Casting', status: 'Active', revenue: 145000, completion: 92, startDate: 'Jan 2024', orders: 38 },
    { id: 2, name: 'High-Performance Alloys', status: 'Active', revenue: 128000, completion: 85, startDate: 'Feb 2024', orders: 32 },
    { id: 3, name: 'Precision Engine Parts', status: 'Active', revenue: 112000, completion: 78, startDate: 'Mar 2024', orders: 28 },
    { id: 4, name: 'Structural Steel Components', status: 'Completed', revenue: 95000, completion: 100, startDate: 'Dec 2023', orders: 24 },
    { id: 5, name: 'Industrial Valve Castings', status: 'Completed', revenue: 100000, completion: 100, startDate: 'Nov 2023', orders: 26 }
  ])

  const [otherProjects] = useState([
    { id: 1, name: 'Reliance Manufacturing Hub', customer: 'Reliance Industries', status: 'Active', revenue: 115000, completion: 88, startDate: 'Jan 2024', orders: 28 },
    { id: 2, name: 'Mahindra Component Series', customer: 'Mahindra & Mahindra', status: 'Active', revenue: 98000, completion: 75, startDate: 'Feb 2024', orders: 24 },
    { id: 3, name: 'Bajaj Precision Casting', customer: 'Bajaj Auto', status: 'Active', revenue: 87000, completion: 82, startDate: 'Mar 2024', orders: 21 },
    { id: 4, name: 'Tech Manufacturing Initiative', customer: 'Tech Manufacturing Co', status: 'Active', revenue: 45000, completion: 60, startDate: 'Apr 2024', orders: 12 },
    { id: 5, name: 'Precision Engineering Batch', customer: 'Precision Engineering Ltd', status: 'Planning', revenue: 38000, completion: 25, startDate: 'May 2024', orders: 9 }
  ])

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800'
      case 'Completed':
        return 'bg-blue-100 text-blue-800'
      case 'Planning':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const openModal = (item, type) => {
    setSelectedItem(item)
    setSelectedItemType(type)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedItem(null)
    setSelectedItemType(null)
  }

  return (
    <div className="p-0 bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-white to-slate-100 px-2 py-2 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white text-xl">
              📊
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 m-0">
                Customer Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0 m-0">
                Premium vs Regular Client Performance Dashboard
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 shadow-md border border-yellow-200 relative overflow-hidden">
            <div className="absolute -top-5 -right-5 opacity-5 text-8xl">
              🏆
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-yellow-900 uppercase">Premium Customers</span>
                <Award size={20} className="text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-2xl font-extrabold text-amber-700 m-0">8</p>
                <span className="text-xs text-yellow-900">clients</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-900 text-xs font-semibold">
                <ArrowUpRight size={14} />
                <span>12% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-md border border-blue-200 relative overflow-hidden">
            <div className="absolute -top-5 -right-5 opacity-5 text-8xl">
              👥
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-blue-900 uppercase">Regular Clients</span>
                <Users size={20} className="text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-2xl font-extrabold text-blue-600 m-0">42</p>
                <span className="text-xs text-blue-900">clients</span>
              </div>
              <div className="flex items-center gap-1 text-blue-900 text-xs font-semibold">
                <ArrowUpRight size={14} />
                <span>8% from last month</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-md border border-green-200 relative overflow-hidden">
            <div className="absolute -top-5 -right-5 opacity-5 text-8xl">
              💰
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-green-900 uppercase">Total Revenue</span>
                <DollarSign size={20} className="text-green-600" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-2xl font-extrabold text-green-700 m-0">$4.2M</p>
                <span className="text-xs text-green-900">annually</span>
              </div>
              <div className="flex items-center gap-1 text-green-900 text-xs font-semibold">
                <ArrowUpRight size={14} />
                <span>23% revenue increase</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 shadow-md border border-amber-200 relative overflow-hidden">
            <div className="absolute -top-5 -right-5 opacity-5 text-8xl">
              ⭐
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-amber-900 uppercase">Avg Satisfaction</span>
                <Star size={20} className="text-amber-600" />
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <p className="text-2xl font-extrabold text-amber-700 m-0">4.2</p>
                <span className="text-xs text-amber-900">/ 5.0</span>
              </div>
              <div className="flex items-center gap-1 text-amber-900 text-xs font-semibold">
                <ArrowUpRight size={14} />
                <span>0.3 point improvement</span>
              </div>
            </div>
          </div>
        </div>
<div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveProjectTab('tata')}
              className={`flex-1 p-2 font-semibold text-sm transition-colors ${
                activeProjectTab === 'tata'
                  ? 'text-orange-600 border-b-2 border-orange-400 bg-orange-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏭 Tata Steel Projects
            </button>
            <button
              onClick={() => setActiveProjectTab('other')}
              className={`flex-1 p-2 font-semibold text-sm transition-colors ${
                activeProjectTab === 'other'
                  ? 'text-purple-600 border-b-2 border-purple-400 bg-purple-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔧 Other Projects
            </button>
          </div>

          <div className="p-3">
            {activeProjectTab === 'tata' ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-slate-50">
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Project Name</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Status</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Revenue</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Completion</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Start Date</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Orders</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tataSteelProjects.map((project, idx) => (
                      <tr key={project.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                        <td className="p-2 text-xs text-gray-700 font-medium">{project.name}</td>
                        <td className="p-4 text-sm">
                          <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-green-600 font-semibold text-center">
                          ${(project.revenue / 1000).toFixed(0)}k
                        </td>
                        <td className="p-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${project.completion}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{project.completion}%</span>
                          </div>
                        </td>
                        <td className="p-2 text-xs text-gray-700 text-center font-medium">{project.startDate}</td>
                        <td className="p-4 text-sm text-center">
                          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-xs font-semibold">
                            {project.orders}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openModal(project, 'project')}
                            className="inline-flex items-center gap-2 p-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye size={14} />
                            Progress
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-slate-50">
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Project Name</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Customer</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Status</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Revenue</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Completion</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Start Date</th>
                      <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherProjects.map((project, idx) => (
                      <tr key={project.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                        <td className="p-2 text-xs text-gray-700 font-medium">{project.name}</td>
                        <td className="p-2 text-xs text-gray-700 font-medium">{project.customer}</td>
                        <td className="p-4 text-sm">
                          <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(project.status)}`}>
                            {project.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-green-600 font-semibold text-center">
                          ${(project.revenue / 1000).toFixed(0)}k
                        </td>
                        <td className="p-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${project.completion}%` }}></div>
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{project.completion}%</span>
                          </div>
                        </td>
                        <td className="p-2 text-xs text-gray-700 text-center font-medium">{project.startDate}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => openModal(project, 'project')}
                            className="inline-flex items-center gap-2 p-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Eye size={14} />
                            Progress
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-6 m-0">
              Customer Segmentation
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={premiumVsRegular} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} (${value})`} outerRadius={70} fill="#8884d8" dataKey="value">
                  {premiumVsRegular.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-6 m-0">
              Performance Metrics
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={performanceMetrics}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" fontSize={11} stroke="#64748b" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#e5e7eb" />
                <Radar name="Premium" dataKey="premium" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.6} />
                <Radar name="Regular" dataKey="regular" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-6 m-0">
              Orders Comparison
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={orderComparison} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} stroke="#64748b" />
                <YAxis dataKey="name" type="category" width={70} fontSize={12} stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }} />
                <Bar dataKey="orders" fill="#06b6d4" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mb-8">
            <h3 className="text-base font-bold text-slate-900 mb-6 m-0">
              📈 Revenue Trends: Premium vs Regular
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={customerRevenue}>
                <defs>
                  <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorRegular" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }} formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey="premium" stroke="#fbbf24" fillOpacity={1} fill="url(#colorPremium)" name="Premium Revenue" strokeWidth={2} />
                <Area type="monotone" dataKey="regular" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRegular)" name="Regular Revenue" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mb-8">
            <h3 className="text-base font-bold text-slate-900 mb-6 m-0">
              💰 Top 10 Revenue Generators
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueDistribution} layout="vertical" margin={{ left: 150 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" fontSize={12} stroke="#64748b" />
                <YAxis dataKey="customer" type="category" width={140} fontSize={11} stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }} formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" radius={[0, 8, 8, 0]}>
                  {revenueDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.premium ? '#fbbf24' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        

        

        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-6 m-0">
            📊 Key Business Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 border-l-4 border-l-amber-400">
              <p className="text-xs font-semibold text-yellow-900 mb-2 m-0 uppercase">Premium Revenue Share</p>
              <p className="text-3xl font-extrabold text-amber-700 m-0">87%</p>
              <p className="text-xs text-slate-500 mt-2">Premium customers generate majority of revenue despite being only 16% of base</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 border-l-4 border-l-blue-400">
              <p className="text-xs font-semibold text-blue-900 mb-2 m-0 uppercase">Regular Client Base</p>
              <p className="text-3xl font-extrabold text-blue-600 m-0">84%</p>
              <p className="text-xs text-slate-500 mt-2">Regular clients form bulk of customer base with high growth potential</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6 border-l-4 border-l-green-400">
              <p className="text-xs font-semibold text-green-900 mb-2 m-0 uppercase">Satisfaction Gap</p>
              <p className="text-3xl font-extrabold text-green-700 m-0">0.8 ⭐</p>
              <p className="text-xs text-slate-500 mt-2">Premium customers more satisfied - focus on regular client experience</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 border-l-4 border-l-amber-400">
              <p className="text-xs font-semibold text-amber-900 mb-2 m-0 uppercase">Order Value Multiple</p>
              <p className="text-3xl font-extrabold text-amber-700 m-0">2.7x</p>
              <p className="text-xs text-slate-500 mt-2">Premium order values significantly higher than regular clients</p>
            </div>
          </div>
        </div>
      </div>

      <DetailModal
        isOpen={modalOpen}
        item={selectedItem}
        itemType={selectedItemType}
        onClose={closeModal}
      />
    </div>
  )
}
