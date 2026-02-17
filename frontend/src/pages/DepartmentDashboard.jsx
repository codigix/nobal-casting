import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/AuthContext'
import { 
  FileText, DollarSign, Clipboard, Receipt,
  Package, BarChart3, AlertCircle, Plus, Clock,
  CheckCircle, ShoppingCart, Users, ArrowUp, ArrowDown,
  TrendingUp, TrendingDown, Warehouse, AlertTriangle, Grid3x3, Wrench, Calendar
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import * as productionService from '../services/productionService'
import ProductionDashboard from './Production/ProductionDashboard'
import './DepartmentDashboard.css'

export default function DepartmentDashboard() {
  const { user } = useAuth()
  let userDept = user?.department?.toLowerCase() || 'manufacturing'
  if (userDept === 'production') userDept = 'manufacturing'
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState({
    stockTrend: [],
    warehouseDistribution: [],
    stockByWarehouse: [],
    lowStockItems: []
  })
  const [activeTabs, setActiveTabs] = useState({
    overview: 'overview',
    warehouse: 'distribution'
  })
  const [warehouseChartType, setWarehouseChartType] = useState('donut')

  useEffect(() => {
    fetchDepartmentStats()
  }, [userDept])

  const fetchDepartmentStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }

      if (userDept === 'inventory') {
        const [prRes, whRes, seRes, sbRes, slRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/purchase-receipts`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/stock/warehouses`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/stock/entries`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, { headers }).catch(() => ({})),
          fetch(`${import.meta.env.VITE_API_URL}/stock/ledger`, { headers }).catch(() => ({}))
        ])
        const [pr, wh, se, sb, sl] = await Promise.all([
          prRes.json?.().catch(() => []), whRes.json?.().catch(() => []), 
          seRes.json?.().catch(() => []), sbRes.json?.().catch(() => []),
          slRes.json?.().catch(() => [])
        ])

        const warehouses = Array.isArray(wh) ? wh : []
        const stockBalance = Array.isArray(sb) ? sb : []
        const stockLedger = Array.isArray(sl) ? sl : []

        const warehouseCounts = {}
        const warehouseValues = {}
        
        warehouses.forEach(w => {
          warehouseCounts[w.warehouse_name] = stockBalance.filter(s => s.warehouse_name === w.warehouse_name).length
          warehouseValues[w.warehouse_name] = stockBalance
            .filter(s => s.warehouse_name === w.warehouse_name)
            .reduce((sum, s) => sum + (Number(s.total_value) || 0), 0)
        })

        const warehouseDistribution = Object.entries(warehouseCounts).map(([name, count]) => ({
          name,
          value: count
        }))

        const stockByWarehouse = Object.entries(warehouseValues).map(([name, value]) => ({
          name,
          value: Math.round(value)
        }))

        const lowStock = stockBalance
          .filter(s => Number(s.current_qty) < 20)
          .sort((a, b) => Number(a.current_qty) - Number(b.current_qty))
          .slice(0, 5)

        const stockTrendData = generateStockTrendData(stockLedger)

        setStats({
          purchaseReceipts: Array.isArray(pr) ? pr.length : 0,
          warehouses: Array.isArray(wh) ? wh.length : 0,
          stockEntries: Array.isArray(se) ? se.length : 0,
          stockBalance: Array.isArray(sb) ? sb.length : 0,
          lowStockItems: lowStock.length,
          stockMovements: Array.isArray(sl) ? sl.length : 0,
          totalStockValue: Math.round(stockBalance.reduce((sum, s) => sum + (Number(s.total_value) || 0), 0))
        })

        setChartData({
          stockTrend: stockTrendData,
          warehouseDistribution,
          stockByWarehouse,
          lowStockItems: lowStock
        })
      } else if (userDept === 'manufacturing') {
        const [woRes, bomRes, ppRes, jcRes, opRes, wsRes, peRes, soRes] = await Promise.all([
          productionService.getWorkOrders().catch(() => []),
          productionService.getBOMs().catch(() => []),
          productionService.getProductionPlans().catch(() => []),
          productionService.getJobCards().catch(() => []),
          productionService.getOperationsList().catch(() => []),
          productionService.getWorkstationsList().catch(() => []),
          productionService.getProductionEntries().catch(() => []),
          productionService.getSalesOrders().catch(() => [])
        ])

        const wo = Array.isArray(woRes) ? woRes : woRes.data || []
        const bom = Array.isArray(bomRes) ? bomRes : bomRes.data || []
        const pp = Array.isArray(ppRes) ? ppRes : ppRes.data || []
        const jc = Array.isArray(jcRes) ? jcRes : jcRes.data || []
        const op = Array.isArray(opRes) ? opRes : opRes.data || []
        const ws = Array.isArray(wsRes) ? wsRes : wsRes.data || []
        const pe = Array.isArray(peRes) ? peRes : peRes.data || []
        const so = Array.isArray(soRes) ? soRes : soRes.data || []

        const normalizeStatus = (status) => {
          if (!status) return 'draft'
          return String(status).toLowerCase().trim()
        }

        const completedCount = jc.filter(j => normalizeStatus(j.status) === 'completed').length
        const inProgressCount = jc.filter(j => normalizeStatus(j.status) === 'in-progress').length
        const pendingCount = jc.filter(j => ['pending', 'draft'].includes(normalizeStatus(j.status))).length

        const overdueCount = so.filter(order => {
          if (!order.delivery_date) return false
          const status = (order.status || '').toLowerCase()
          if (['complete', 'dispatched', 'delivered', 'cancelled'].includes(status)) return false
          const deliveryDate = new Date(order.delivery_date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return deliveryDate < today
        }).length

        setStats({
          workOrders: wo.length,
          boms: bom.length,
          productionPlans: pp.length,
          jobCards: jc.length,
          completedToday: completedCount,
          inProgress: inProgressCount,
          pending: pendingCount,
          workstations: ws.length,
          operations: op.length,
          overdueSalesOrders: overdueCount,
          salesOrders: so.length
        })
      } else if (userDept === 'admin') {
        setStats({
          totalProjects: 8,
          activeMachines: 24,
          totalClients: 42,
          projectsInProgress: 5,
          machineDowntime: 2,
          clientSatisfaction: 95
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateStockTrendData = (ledger) => {
    if (!Array.isArray(ledger) || ledger.length === 0) {
      return [
        { date: '1 Jan', quantity: 1200, movement: 400, inbound: 300, outbound: 100 },
        { date: '8 Jan', quantity: 1400, movement: 580, inbound: 450, outbound: 130 },
        { date: '15 Jan', quantity: 1800, movement: 720, inbound: 600, outbound: 120 },
        { date: '22 Jan', quantity: 1600, movement: 450, inbound: 350, outbound: 100 },
        { date: '29 Jan', quantity: 2000, movement: 890, inbound: 700, outbound: 190 }
      ]
    }

    const grouped = {}
    const sortedLedger = [...ledger].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date))
    
    sortedLedger.forEach(entry => {
      const date = new Date(entry.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const qtyIn = Number(entry.qty_in) || 0
      const qtyOut = Number(entry.qty_out) || 0
      
      if (!grouped[date]) {
        grouped[date] = { qty_in: 0, qty_out: 0 }
      }
      grouped[date].qty_in += qtyIn
      grouped[date].qty_out += qtyOut
    })

    let cumulativeQty = 0
    const trendData = Object.entries(grouped).map(([date, data]) => {
      const net = data.qty_in - data.qty_out
      cumulativeQty += net
      return {
        date,
        quantity: Math.max(0, cumulativeQty),
        movement: data.qty_in + data.qty_out,
        inbound: data.qty_in,
        outbound: data.qty_out
      }
    })

    return trendData.length > 0 ? trendData : [
      { date: '1 Jan', quantity: 1200, movement: 400, inbound: 300, outbound: 100 },
      { date: '8 Jan', quantity: 1400, movement: 580, inbound: 450, outbound: 130 },
      { date: '15 Jan', quantity: 1800, movement: 720, inbound: 600, outbound: 120 },
      { date: '22 Jan', quantity: 1600, movement: 450, inbound: 350, outbound: 100 },
      { date: '29 Jan', quantity: 2000, movement: 890, inbound: 700, outbound: 190 }
    ]
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-600">Loading dashboard...</p></div>

  const COLORS = ['#059669', '#2563eb', '#f59e0b', '#dc2626', '#8b5cf6', '#06b6d4']

  const renderInventoryDashboard = () => {
    return (
      <div className="w-full p-0 bg-gray-50 min-h-screen">
        <div className="p-3">
          <div className=" mx-auto">
            <div className="mb-7">
              <h1 className="text-xl  text-gray-900 -">
                Stock Overview
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
              {[
                { label: 'Stock Items', value: stats.stockBalance || 0, icon: '📦', color: 'from-blue-50 to-blue-100', borderColor: '#3b82f6', textColor: 'text-blue-700' },
                { label: 'Total Stock Value', value: `₹${(stats.totalStockValue || 0).toLocaleString()}`, icon: '💰', color: 'from-green-50 to-green-100', borderColor: '#10b981', textColor: 'text-green-700' },
                { label: 'Warehouses', value: stats.warehouses || 0, icon: '🏢', color: 'from-purple-50 to-purple-100', borderColor: '#8b5cf6', textColor: 'text-purple-700' },
                { label: 'Stock Movements', value: stats.stockMovements || 0, icon: '📊', color: 'from-amber-50 to-amber-100', borderColor: '#f59e0b', textColor: 'text-amber-700' }
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className={`bg-gradient-to-br ${stat.color} p-2 rounded  border-2 transition-all duration-300 hover: hover:scale-105 hover:border-opacity-100`}
                  style={{ borderColor: stat.borderColor }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs   tracking-wide text-gray-600 mb-2">
                        {stat.label}
                      </p>
                      <p className={`text-xl  ${stat.textColor}`}>
                        {stat.value}
                      </p>
                    </div>
                    <span className="text-xl ">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-7">
              <h2 className="text-lg  mb-3 text-gray-900">
                Stock Movement Analysis
              </h2>
              <div className="bg-white rounded border border-gray-200 p-3   hover: transition-shadow duration-300">
                <div className="flex gap-5 border-b border-gray-200 mb-6 pb-0 ">
                  {['Overview', 'Inbound', 'Outbound'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTabs({ ...activeTabs, overview: tab.toLowerCase() })}
                      className={`text-xs font-medium px-0 py-2 whitespace-nowrap border-b-2 -mb-0.5 transition-colors ${
                        activeTabs.overview === tab.toLowerCase()
                          ? 'border-blue-600 text-blue-600 '
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={chartData.stockTrend} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMovement" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '2px solid #e5e7eb', 
                        borderRadius: '8px',
                        padding: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    />
                    <Legend />
                    
                    {activeTabs.overview === 'overview' && (
                      <>
                        <Area 
                          type="monotone" 
                          dataKey="quantity" 
                          stroke="#2563eb" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorQuantity)" 
                          name="Stock Quantity"
                          animationDuration={800}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="movement" 
                          stroke="#10b981" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#colorMovement)" 
                          name="Movement Volume"
                          animationDuration={800}
                        />
                      </>
                    )}
                    
                    {activeTabs.overview === 'inbound' && (
                      <Area 
                        type="monotone" 
                        dataKey="inbound" 
                        stroke="#06b6d4" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorInbound)" 
                        name="Inbound Stock"
                        animationDuration={800}
                      />
                    )}
                    
                    {activeTabs.overview === 'outbound' && (
                      <Area 
                        type="monotone" 
                        dataKey="outbound" 
                        stroke="#f97316" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorOutbound)" 
                        name="Outbound Stock"
                        animationDuration={800}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-7">
              <div>
                <h2 className="text-lg  mb-3 text-gray-900">
                  Warehouse Analysis
                </h2>
                <div className="bg-white rounded border border-gray-200 p-3   hover: transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex gap-5 border-b border-gray-200 pb-0">
                      {['Distribution', 'Stock Value'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTabs({ ...activeTabs, warehouse: tab.toLowerCase() })}
                          className={`text-xs font-medium px-0 py-2 border-b-2 -mb-0.5 transition-colors ${
                            activeTabs.warehouse === tab.toLowerCase()
                              ? 'border-blue-600 text-blue-600 '
                              : 'border-transparent text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    {activeTabs.warehouse === 'distribution' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setWarehouseChartType('donut')}
                          className={`p-2  py-1 rounded text-xs  transition-colors ${
                            warehouseChartType === 'donut'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Donut
                        </button>
                        <button
                          onClick={() => setWarehouseChartType('bar')}
                          className={`p-2  py-1 rounded text-xs  transition-colors ${
                            warehouseChartType === 'bar'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Bar
                        </button>
                      </div>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    {activeTabs.warehouse === 'distribution' ? (
                      warehouseChartType === 'donut' ? (
                        <PieChart>
                          <Pie 
                            data={chartData.warehouseDistribution} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            labelLine={false} 
                            label={({ name, value }) => `${name}: ${value}`} 
                            fill="#8884d8" 
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                          >
                            {chartData.warehouseDistribution.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[index % COLORS.length]}
                                style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))' }}
                              />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      ) : (
                        <BarChart data={chartData.warehouseDistribution} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                          <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                          <Bar 
                            dataKey="value" 
                            fill="#2563eb" 
                            radius={[8, 8, 0, 0]}
                            animationDuration={800}
                          >
                            {chartData.warehouseDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      )
                    ) : (
                      <BarChart data={chartData.stockByWarehouse} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="0" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="name" stroke="#9ca3af" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                          formatter={(value) => `₹${value.toLocaleString()}`}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#10b981" 
                          name="Stock Value (₹)" 
                          radius={[8, 8, 0, 0]}
                          animationDuration={800}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h2 className="text-lg  mb-3 text-gray-900">
                  Low Stock Alerts
                </h2>
                <div className="bg-white rounded border border-gray-200 p-3   max-h-96 overflow-auto hover: transition-shadow duration-300">
                  {chartData.lowStockItems && chartData.lowStockItems.length > 0 ? (
                    <div className="space-y-3">
                      {chartData.lowStockItems.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="p-2 rounded-sm bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border border-red-200 flex justify-between items-center hover: hover:scale-102 transition-all duration-300 group"
                          style={{ borderLeftColor: '#dc2626' }}
                        >
                          <div>
                            <p className="text-xs  text-red-700 mb-1  ">
                              {item.item_code}
                            </p>
                            <p className="text-xs text-red-600 font-medium">
                              📍 {item.warehouse_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs  text-red-700 mb-1">
                              {Number(item.current_qty).toFixed(2)} units
                            </p>
                            <p className="text-xs text-red-500 ">
                              ₹{(Number(item.total_value) || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 px-5 text-center">
                      <div className="text-6xl mb-4 animate-pulse">✓</div>
                      <p className="text-base  text-green-700 mb-1">All Stock Levels Healthy</p>
                      <p className="text-xs text-gray-500">No low stock alerts at the moment</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }



  const renderAdminDashboard = () => {
    const StatCardWithBorder = ({ label, value, icon: Icon, statusText, borderColor, bgColor }) => (
      <div className={`bg-white rounded-xsp-2 border-l-4 border border-gray-200 `} style={{ borderLeftColor: borderColor }}>
        <div className="flex justify-between items-start gap-3 mb-2">
          <span className="text-xs text-gray-500">{label}</span>
          <div className="flex items-center justify-center w-8 h-8 rounded" style={{ backgroundColor: bgColor }}>
            {typeof Icon === 'string' ? <span className="text-lg">{Icon}</span> : <Icon size={16} color={borderColor} />}
          </div>
        </div>
        <div className="text-xl  text-gray-900 mb-1">{value}</div>
        <div className="text-xs font-medium flex items-center gap-1" style={{ color: borderColor }}>
          <TrendingUp size={12} /> {statusText}
        </div>
      </div>
    )

   
  }

  if (userDept === 'inventory') return renderInventoryDashboard()
  if (userDept === 'manufacturing') return <ProductionDashboard />
  if (userDept === 'admin') return renderAdminDashboard()

  return <div className="dashboard"><p>Unknown department: {userDept}</p></div>
}
