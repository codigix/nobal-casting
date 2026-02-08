import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import {
  Package, Warehouse, TrendingUp, AlertTriangle, DollarSign,
  Eye, BarChart3, PieChart as PieIcon, Activity, RefreshCw,
  ArrowUpRight, ArrowDownRight, ShoppingBag, ClipboardList,
  Search, PackageCheck, ArrowRightLeft, Truck, Factory, ChevronRight
} from 'lucide-react'
import { getInventoryAnalytics } from '../../services/adminService'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#059669', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e']

export default function InventoryDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalItems: 0,
    totalValue: 0,
    warehouses: 0,
    lowStockItems: 0,
    avgValue: 0,
    totalMovements: 0,
    trends: null,
    workflow: {
      pending_mrs: 0,
      active_pos: 0,
      pending_qc: 0,
      pending_transfers: 0
    }
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
      
      const [analyticsRes, ledgerRes] = await Promise.all([
        getInventoryAnalytics(),
        fetch(`${import.meta.env.VITE_API_URL}/stock/ledger`, { 
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
        }).then(r => r.json()).catch(() => ({ data: [] }))
      ])

      if (analyticsRes.success) {
        const d = analyticsRes.data
        setStats({
          totalItems: d.total_items,
          totalValue: d.total_value,
          warehouses: d.warehouse_distribution.length,
          lowStockItems: d.low_stock_items,
          avgValue: d.total_items > 0 ? Math.round(d.total_value / d.total_items) : 0,
          totalMovements: d.stock_movements_count,
          trends: d.kpiTrends,
          workflow: d.workflow_status || {
            pending_mrs: 0,
            active_pos: 0,
            pending_qc: 0,
            pending_transfers: 0
          }
        })

        const ledger = Array.isArray(ledgerRes?.data) ? ledgerRes.data : []
        const stockTrendData = generateStockTrendData(ledger)

        setChartData({
          stockTrend: stockTrendData,
          warehouseDistribution: d.warehouse_distribution.map(w => ({ name: w.warehouse_name, value: w.item_count })),
          stockByWarehouse: d.warehouse_distribution.map(w => ({ name: w.warehouse_name, value: w.value })),
          lowStockItems: d.low_stock_list || [],
          topItems: d.top_items.map(i => ({ name: i.item_code, value: i.value, qty: i.quantity })),
          movementType: [
            { name: 'Inward', value: d.inward_qty },
            { name: 'Outward', value: d.outward_qty }
          ],
          warehouseUtilization: d.warehouse_distribution.map(w => ({
            name: w.warehouse_name,
            items: w.item_count,
            capacity: 100,
            utilization: w.occupancy
          }))
        })
      }

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

  const StatCard = ({ label, value, icon: Icon, color, trend, trendValue, trendDirection }) => (
    <div className={`bg-gradient-to-br ${color} p-2 rounded  border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 relative overflow-hidden group`}>
      <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-110 transition-transform" />
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs    text-gray-500 ">{label}</span>
        <div className="p-2 bg-white/50 rounded ">
          <Icon size={18} className="text-gray-700" />
        </div>
      </div>
      <p className="text-xl   text-gray-900 mb-2">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs  text-gray-500 font-medium tracking-tighter">{trend}</p>
        {trendValue && (
          <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs   ${trendDirection === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            {trendDirection === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full bg-gray-50 min-h-screen p-3">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-xl   text-gray-950">📦 Inventory Dashboard</h1>
              <p className="text-gray-500 text-xs font-medium mt-1">
                Real-time asset tracking and movement intelligence
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-gray-400 text-xs    bg-white p-2  py-2 rounded border border-gray-200">
                Sync: {refreshTime.toLocaleTimeString()}
              </p>
              <button
                onClick={() => { setLoading(true); fetchInventoryData() }}
                className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 text-xs "
              >
                <RefreshCw size={14} /> Refresh Intel
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
          <StatCard 
            label="Total Value" 
            value={`₹${(Number(stats.totalValue) / 100000).toFixed(1)}L`}
            icon={DollarSign}
            color="from-emerald-50 to-emerald-100"
            trend="Total Portfolio"
            trendDirection={stats.trends?.value?.trend}
            trendValue={`${stats.trends?.value?.percent || 0}%`}
          />
          <StatCard 
            label="Total Items" 
            value={Number(stats.totalItems) || 0} 
            icon={Package}
            color="from-blue-50 to-blue-100"
            trend="Active SKUs"
            trendDirection={stats.trends?.items?.trend}
            trendValue={`${stats.trends?.items?.percent || 0}%`}
          />
          <StatCard 
            label="Movements" 
            value={Number(stats.totalMovements) || 0}
            icon={Activity}
            color="from-amber-50 to-amber-100"
            trend="Monthly Activity"
            trendDirection={stats.trends?.movements?.trend}
            trendValue={`${stats.trends?.movements?.percent || 0}%`}
          />
          <StatCard 
            label="Low Stock" 
            value={Number(stats.lowStockItems) || 0}
            icon={AlertTriangle}
            color="from-rose-50 to-rose-100"
            trend="Items at risk"
            trendDirection={stats.trends?.lowStock?.trend}
            trendValue={`${stats.trends?.lowStock?.percent || 0}%`}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {['overview', 'workflow', 'warehouse', 'items', 'movements'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`p-2 text-xs  border-b-2 transition-colors whitespace-nowrap ${
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
            <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
              <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Movement Types */}
              <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
                <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
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
              <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
                <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
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

        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Procurement Flow */}
            <section>
              <h2 className="text-md  mb-4 flex items-center gap-2 text-gray-800">
                <ShoppingBag className="text-blue-600" size={20} /> Procurement to Inventory Flow
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                <WorkflowStep 
                  title="Material Request" 
                  desc="Identify requirement" 
                  count={stats.workflow.pending_mrs} 
                  icon={ClipboardList} 
                  color="bg-amber-100 text-amber-700"
                  link="/inventory/material-requests"
                />
                <WorkflowStep 
                  title="Purchase Order" 
                  desc="Order from vendor" 
                  count={stats.workflow.active_pos} 
                  icon={ShoppingBag} 
                  color="bg-blue-100 text-blue-700"
                  link="/buying/purchase-orders"
                />
                <WorkflowStep 
                  title="QC Inspection" 
                  desc="Quality check" 
                  count={stats.workflow.pending_qc} 
                  icon={Search} 
                  color="bg-purple-100 text-purple-700"
                  link="/inventory/grn-management"
                />
                <WorkflowStep 
                  title="Stock Receipt" 
                  desc="Add to warehouse" 
                  icon={PackageCheck} 
                  color="bg-emerald-100 text-emerald-700"
                  link="/inventory/stock-balance"
                />
                <WorkflowStep 
                  title="Inventory" 
                  desc="Available for use" 
                  icon={Warehouse} 
                  color="bg-slate-100 text-slate-700"
                  link="/inventory/stock-balance"
                  isLast
                />
              </div>
            </section>

            {/* Production Supply Flow */}
            <section>
              <h2 className="text-md  mb-4 flex items-center gap-2 text-gray-800">
                <Factory className="text-orange-600" size={20} /> Supply to Production Flow
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <WorkflowStep 
                  title="Production Plan" 
                  desc="Calculate requirement" 
                  icon={ClipboardList} 
                  color="bg-orange-100 text-orange-700"
                  link="/manufacturing/production-planning"
                />
                <WorkflowStep 
                  title="Material Request" 
                  desc="Request for floor" 
                  count={stats.workflow.production_mrs} 
                  icon={ArrowRightLeft} 
                  color="bg-blue-100 text-blue-700"
                  link="/inventory/material-requests"
                />
                <WorkflowStep 
                  title="Material Issue" 
                  desc="Release to shopfloor" 
                  icon={Truck} 
                  color="bg-indigo-100 text-indigo-700"
                  link="/inventory/stock-entries"
                />
                <WorkflowStep 
                  title="WIP / Consumption" 
                  desc="Production in progress" 
                  icon={Factory} 
                  color="bg-green-100 text-green-700"
                  link="/manufacturing/production-entry"
                  isLast
                />
              </div>
            </section>

            {/* Transfer Flow */}
            <section>
              <h2 className="text-md  mb-4 flex items-center gap-2 text-gray-800">
                <ArrowRightLeft className="text-indigo-600" size={20} /> Inter-Warehouse Transfer
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <WorkflowStep 
                  title="Transfer Request" 
                  desc="Request movement" 
                  count={stats.workflow.pending_transfers}
                  icon={ClipboardList} 
                  color="bg-indigo-100 text-indigo-700"
                  link="/inventory/stock-movements"
                />
                <WorkflowStep 
                  title="Approval" 
                  desc="Verify availability" 
                  icon={PackageCheck} 
                  color="bg-blue-100 text-blue-700"
                  link="/inventory/stock-movements"
                />
                <WorkflowStep 
                  title="Dispatch / Transit" 
                  desc="Items moving" 
                  icon={Truck} 
                  color="bg-amber-100 text-amber-700"
                  link="/inventory/stock-movements"
                />
                <WorkflowStep 
                  title="Receipt" 
                  desc="Received at target" 
                  icon={Warehouse} 
                  color="bg-emerald-100 text-emerald-700"
                  link="/inventory/stock-balance"
                  isLast
                />
              </div>
            </section>
          </div>
        )}

        {/* Warehouse Tab */}
        {activeTab === 'warehouse' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Warehouse Distribution */}
              <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
                <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
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
              <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
                <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
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
            <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
              <h2 className="text-lg  mb-6 flex items-center gap-2 text-gray-900">
                <Warehouse size={20} /> Warehouse Utilization
              </h2>
              <div className="space-y-2">
                {chartData.warehouseUtilization.map((wh, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-2">
                      <span className="text-xs  text-gray-700">{wh.name}</span>
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
            <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
              <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
                <AlertTriangle size={20} /> Low Stock Items
              </h2>
              {chartData.lowStockItems.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chartData.lowStockItems.map((item, idx) => (
                    <div 
                      key={idx}
                      className="p-4 rounded bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 "
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className=" text-gray-900 text-xs">{item.item_code}</p>
                          <p className="text-xs  text-gray-500 font-medium ">{item.warehouse_name}</p>
                        </div>
                        <span className="text-red-600  text-lg">{Number(item.current_qty).toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="text-xs  text-gray-400  ">
                          Value: ₹{(Number(item.total_value) || 0).toLocaleString()}
                        </p>
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px]  rounded-full ">Critical</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package size={32} />
                  </div>
                  <p className="text-emerald-700  text-lg">All levels healthy</p>
                  <p className="text-gray-500 text-xs font-medium">No items currently below safety threshold</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Movements Tab */}
        {activeTab === 'movements' && (
          <div className="space-y-6">
            <div className="bg-white rounded border border-gray-200 p-3  hover:shadow-md transition-shadow">
              <h2 className="text-lg  mb-4 flex items-center gap-2 text-gray-900">
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

const WorkflowStep = ({ title, desc, count, icon: Icon, color, link, isLast }) => {
  const navigate = useNavigate()
  
  return (
    <div className="flex flex-col items-center group relative">
      <div 
        onClick={() => navigate(link)}
        className={`w-full bg-white border border-gray-200 rounded p-4  hover:shadow-md transition-all cursor-pointer relative z-10 ${count > 0 ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded ${color}`}>
            <Icon size={18} />
          </div>
          <div className="flex-1">
            <h3 className="text-xs  text-gray-900 leading-tight">{title}</h3>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">{desc}</p>
          </div>
        </div>
        
        {count !== undefined && (
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${count > 0 ? 'bg-amber-100 text-amber-700 ' : 'bg-gray-100 text-gray-400'}`}>
              {count} Pending
            </span>
            <ChevronRight size={12} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        )}
        {!count && (
           <div className="mt-2 flex items-center justify-end">
             <ChevronRight size={12} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
           </div>
        )}
      </div>
      
      {!isLast && (
        <div className="hidden md:block absolute top-1/2 -right-2 translate-x-1/2 -translate-y-1/2 z-0">
          <ChevronRight size={16} className="text-gray-300" />
        </div>
      )}
    </div>
  )
}
