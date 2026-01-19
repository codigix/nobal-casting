import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  Package, Warehouse, TrendingUp, AlertTriangle, DollarSign,
  Eye, BarChart3, PieChart as PieIcon, Activity, RefreshCw
} from 'lucide-react'

const COLORS = ['#059669', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e']

export default function InventoryDashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    warehouses: 0,
    lowStockItems: 0,
    avgValue: 0,
    totalMovements: 0
  })
  
  const [chartData, setChartData] = useState({
    stockTrend: [],
    warehouseDistribution: [],
    stockByWarehouse: [],
    lowStockItems: [],
    topItems: [],
    movementType: [],
    warehouseUtilization: []
  })
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchInventoryData()
  }, [])

  const fetchInventoryData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch all inventory data
      const [sbRes, whRes, smRes, slRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, { headers }).catch(() => ({ json: async () => [] })),
        fetch(`${import.meta.env.VITE_API_URL}/stock/warehouses`, { headers }).catch(() => ({ json: async () => [] })),
        fetch(`${import.meta.env.VITE_API_URL}/stock/movements`, { headers }).catch(() => ({ json: async () => [] })),
        fetch(`${import.meta.env.VITE_API_URL}/stock/ledger`, { headers }).catch(() => ({ json: async () => [] }))
      ])

      const [sb, wh, sm, sl] = await Promise.all([
        sbRes.json(),
        whRes.json(),
        smRes.json(),
        slRes.json()
      ])

      const stockBalance = Array.isArray(sb?.data || sb) ? (sb?.data || sb) : []
      const warehouses = Array.isArray(wh?.data || wh) ? (wh?.data || wh) : []
      const movements = Array.isArray(sm?.data || sm) ? (sm?.data || sm) : []
      const ledger = Array.isArray(sl?.data || sl) ? (sl?.data || sl) : []

      // Calculate statistics
      const totalValue = stockBalance.reduce((sum, item) => sum + (Number(item.total_value) || 0), 0)
      const lowStock = stockBalance.filter(item => Number(item.current_qty) < 20)
      
      setStats({
        totalItems: stockBalance.length,
        totalValue: Math.round(totalValue),
        warehouses: warehouses.length,
        lowStockItems: lowStock.length,
        avgValue: stockBalance.length > 0 ? Math.round(totalValue / stockBalance.length) : 0,
        totalMovements: movements.length
      })

      // Prepare chart data
      const warehouseCounts = {}
      const warehouseValues = {}
      
      warehouses.forEach(w => {
        const whItems = stockBalance.filter(s => s.warehouse_id === w.id)
        warehouseCounts[w.warehouse_name] = whItems.length
        warehouseValues[w.warehouse_name] = whItems.reduce((sum, s) => sum + (Number(s.total_value) || 0), 0)
      })

      const topItems = stockBalance
        .sort((a, b) => Number(b.total_value) - Number(a.total_value))
        .slice(0, 8)
        .map(item => ({
          name: item.item_code,
          value: Number(item.total_value) || 0,
          qty: Number(item.current_qty) || 0
        }))

      const movementTypeData = calculateMovementTypes(movements)
      const stockTrendData = generateStockTrendData(ledger)
      
      setChartData({
        stockTrend: stockTrendData,
        warehouseDistribution: Object.entries(warehouseCounts).map(([name, value]) => ({ name, value })),
        stockByWarehouse: Object.entries(warehouseValues).map(([name, value]) => ({ name, value: Math.round(value) })),
        lowStockItems: lowStock.slice(0, 8),
        topItems,
        movementType: movementTypeData,
        warehouseUtilization: Object.entries(warehouseCounts).map(([name, count]) => ({
          name,
          items: count,
          capacity: 100,
          utilization: Math.min((count / 50) * 100, 100) // Assuming 50 items per warehouse
        }))
      })

      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching inventory data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMovementTypes = (movements) => {
    const types = { IN: 0, OUT: 0, TRANSFER: 0 }
    movements.forEach(m => {
      const type = m.movement_type || 'OTHER'
      if (types.hasOwnProperty(type)) {
        types[type]++
      }
    })
    return Object.entries(types).map(([type, count]) => ({ name: type, value: count }))
  }

  const generateStockTrendData = (ledger) => {
    if (!Array.isArray(ledger) || ledger.length === 0) {
      return generateMockData()
    }

    const grouped = {}
    ledger.forEach(entry => {
      const date = new Date(entry.transaction_date || entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const qtyIn = Number(entry.qty_in) || 0
      const qtyOut = Number(entry.qty_out) || 0
      
      if (!grouped[date]) {
        grouped[date] = { qty_in: 0, qty_out: 0, count: 0 }
      }
      grouped[date].qty_in += qtyIn
      grouped[date].qty_out += qtyOut
      grouped[date].count += 1
    })

    const trendData = Object.entries(grouped)
      .sort((a, b) => new Date(`${a[0]} 2025`) - new Date(`${b[0]} 2025`))
      .map(([date, data]) => ({
        date,
        inbound: data.qty_in,
        outbound: data.qty_out,
        net: data.qty_in - data.qty_out,
        transactions: data.count
      }))

    return trendData.length > 0 ? trendData : generateMockData()
  }

  const generateMockData = () => [
    { date: 'Jan 1', inbound: 300, outbound: 150, net: 150, transactions: 5 },
    { date: 'Jan 8', inbound: 450, outbound: 130, net: 320, transactions: 8 },
    { date: 'Jan 15', inbound: 600, outbound: 120, net: 480, transactions: 12 },
    { date: 'Jan 22', inbound: 350, outbound: 100, net: 250, transactions: 7 },
    { date: 'Jan 29', inbound: 700, outbound: 190, net: 510, transactions: 15 }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <RefreshCw size={32} className="text-blue-600" />
          </div>
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    )
  }

  const StatCard = ({ label, value, icon: Icon, color, trend }) => (
    <div className={`bg-gradient-to-br ${color} p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</span>
        <Icon size={20} className="text-gray-600" />
      </div>
      <p className="text-xl font-bold text-gray-900 mb-2">{value}</p>
      {trend && <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp size={12} /> {trend}</p>}
    </div>
  )

  return (
    <div className="w-full bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">📦 Inventory Dashboard</h1>
              <p className="text-gray-500 text-sm mt-2">
                Last updated: {refreshTime.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchInventoryData() }}
              className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded-xs hover:bg-blue-700 transition-colors text-xs"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard 
            label="Total Items" 
            value={stats.totalItems} 
            icon={Package}
            color="from-blue-50 to-blue-100"
            trend="In inventory"
          />
          <StatCard 
            label="Total Value" 
            value={`₹${(stats.totalValue / 100000).toFixed(1)}L`}
            icon={DollarSign}
            color="from-green-50 to-green-100"
            trend={`Avg: ₹${(stats.avgValue / 1000).toFixed(1)}K`}
          />
          <StatCard 
            label="Warehouses" 
            value={stats.warehouses}
            icon={Warehouse}
            color="from-purple-50 to-purple-100"
            trend="Active"
          />
          <StatCard 
            label="Low Stock" 
            value={stats.lowStockItems}
            icon={AlertTriangle}
            color="from-red-50 to-red-100"
            trend="Items"
          />
          <StatCard 
            label="Movements" 
            value={stats.totalMovements}
            icon={Activity}
            color="from-amber-50 to-amber-100"
            trend="This month"
          />
          <StatCard 
            label="Avg Stock" 
            value={`₹${(stats.avgValue / 1000).toFixed(1)}K`}
            icon={BarChart3}
            color="from-cyan-50 to-cyan-100"
            trend="Per item"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {['overview', 'warehouse', 'items', 'movements'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stock Movement Trend */}
            <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <TrendingUp size={20} /> Stock Movement Trend
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData.stockTrend}>
                  <defs>
                    <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="inbound" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    fill="url(#colorInbound)" 
                    name="Inbound"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="outbound" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    fill="url(#colorOutbound)" 
                    name="Outbound"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Movement Type Distribution & Top Items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Movement Types */}
              <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <Activity size={20} /> Movement Types
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.movementType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.movementType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top Items by Value */}
              <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <Eye size={20} /> Top Items by Value
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData.topItems}
                    margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      formatter={(value) => `₹${(value / 1000).toFixed(1)}K`}
                      contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb' }}
                    />
                    <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Warehouse Tab */}
        {activeTab === 'warehouse' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Warehouse Distribution */}
              <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <PieIcon size={20} /> Items Distribution
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.warehouseDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.warehouseDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Stock Value by Warehouse */}
              <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <DollarSign size={20} /> Stock Value by Warehouse
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.stockByWarehouse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Warehouse Utilization */}
            <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900">
                <Warehouse size={20} /> Warehouse Utilization
              </h2>
              <div className="space-y-4">
                {chartData.warehouseUtilization.map((wh, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">{wh.name}</span>
                      <span className="text-xs text-gray-500">{wh.items} items</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${wh.utilization}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <AlertTriangle size={20} /> Low Stock Items
              </h2>
              {chartData.lowStockItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chartData.lowStockItems.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded-xs bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-red-700 text-sm">{item.item_code}</p>
                          <p className="text-xs text-gray-600">{item.warehouse_name}</p>
                        </div>
                        <span className="text-red-600 font-bold text-lg">{Number(item.current_qty).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Value: ₹{(Number(item.total_value) || 0).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-2xl mb-2">✓</p>
                  <p className="text-green-700 font-semibold">All stock levels are healthy!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xs border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-900">
                <RefreshCw size={20} /> Movement Analysis
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData.stockTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '2px solid #e5e7eb'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="inbound" fill="#06b6d4" name="Inbound" />
                  <Bar dataKey="outbound" fill="#f97316" name="Outbound" />
                  <Bar dataKey="net" fill="#10b981" name="Net Movement" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
