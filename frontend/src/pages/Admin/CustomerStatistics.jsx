import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area, ComposedChart } from 'recharts'
import { Star, TrendingUp, DollarSign, Users, Award, Target, ArrowUpRight, ArrowDownRight, Zap, ChevronDown, Eye, X, Building2, Package, Search, Filter, Download } from 'lucide-react'
import { getCustomerStats, getCustomerDetailedStats } from '../../services/adminService'

const StatCard = ({ label, value, icon: Icon, trend, trendValue, bgColor, iconColor }) => (
  <div className="bg-white rounded p-3 border border-slate-200  hover: transition-all group relative overflow-hidden">
    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full ${bgColor} opacity-10 group-hover:scale-110 transition-transform duration-700`} />
    <div className="relative z-0">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-6 h-6  rounded ${bgColor} ${iconColor} flex items-center justify-center `}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs  px-2.5 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trendValue}
          </div>
        )}
      </div>
      <p className="text-xs  text-slate-400  mb-1">{label}</p>
      <h3 className="text-xl ftext-slate-900">{value}</h3>
    </div>
  </div>
);

const DetailModal = ({ isOpen, item, onClose, detailedData, loading }) => {
  if (!isOpen || !item) return null

  const monthlyData = detailedData?.trends || []
  const profile = detailedData?.profile || {}
  const statusDist = detailedData?.statusDistribution || []
  const topItems = detailedData?.topItems || []

  const COLORS = ['#3b82f6', '#fbbf24', '#8b5cf6', '#ef4444', '#10b981', '#6366f1']

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-50 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20 shadow-2xl">
        <div className="bg-slate-900 p-6 flex items-center justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse" />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 ring-4 ring-white/10">
              <Building2 size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold m-0 tracking-tight">{profile.name || item.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-slate-400 text-sm">ID: <span className="text-slate-200 font-mono">{item.id}</span></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${item.segment === 'Premium' ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30'}`}>
                  {item.segment}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all hover:rotate-90 text-white relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-semibold text-sm animate-pulse">Synchronizing Intelligence Data...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column - Stats & Charts */}
              <div className="lg:col-span-8 space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3 text-blue-600">
                      <div className="p-2 bg-blue-50 rounded-lg"><DollarSign size={20} /></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Lifetime Revenue</p>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 m-0">₹{parseFloat(item.revenue).toLocaleString()}</h4>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3 text-purple-600">
                      <div className="p-2 bg-purple-50 rounded-lg"><Package size={20} /></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Total Orders</p>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 m-0">{item.orders} <span className="text-xs font-medium text-slate-400 ml-1 italic">Executions</span></h4>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3 text-emerald-600">
                      <div className="p-2 bg-emerald-50 rounded-lg"><Zap size={20} /></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider m-0">Avg Ticket Size</p>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 m-0">₹{item.orders > 0 ? Math.round(item.revenue / item.orders).toLocaleString() : 0}</h4>
                  </div>
                </div>

                {/* Main Charts */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 m-0">Revenue & Volume Performance</h4>
                      <p className="text-xs text-slate-400 mt-1">Bi-dimensional analysis of historical trends (6 Months)</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Revenue</div>
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Orders</div>
                    </div>
                  </div>
                  <div className="h-72">
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyData}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }} 
                            cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }}
                          />
                          <Area yAxisId="left" type="monotone" dataKey="revenue" fillOpacity={1} fill="url(#colorRevenue)" stroke="none" />
                          <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                          <Bar yAxisId="right" dataKey="orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <TrendingUp size={48} className="text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium text-sm">No historical metrics available</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Items Bar Chart */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Target size={18} className="text-amber-500" />
                      Top 5 Strategic Products
                    </h4>
                    <div className="h-64">
                      {topItems.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topItems} layout="vertical" margin={{ left: -20 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} width={100} />
                            <Tooltip 
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                              {topItems.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">No product distribution data</div>
                      )}
                    </div>
                  </div>

                  {/* Order Status Distribution */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Zap size={18} className="text-indigo-500" />
                      Execution Lifecycle Status
                    </h4>
                    <div className="h-64 flex items-center">
                      {statusDist.length > 0 ? (
                        <div className="w-full flex">
                          <div className="w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={statusDist}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {statusDist.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-1/2 flex flex-col justify-center gap-2 pl-4">
                            {statusDist.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">{entry.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900">{entry.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center justify-center text-slate-400 italic text-xs">No status distribution data</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Profile & Transactions */}
              <div className="lg:col-span-4 space-y-6">
                {/* Profile Overview Card */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl">
                  <h4 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-6 border-b border-white/10 pb-4">Partner Profile</h4>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-400 shrink-0"><Users size={18} /></div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Point of Contact</p>
                        <p className="text-sm font-semibold m-0">{profile.email || 'N/A'}</p>
                        <p className="text-xs text-slate-400 font-medium m-0">{profile.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400 shrink-0"><Award size={18} /></div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Fiscal ID (GSTIN)</p>
                        <p className="text-sm font-mono font-bold m-0">{profile.gstin || 'UNREGISTERED'}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-amber-400 shrink-0"><TrendingUp size={18} /></div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Alliance Start</p>
                        <p className="text-sm font-semibold m-0">{profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alliance Health</span>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${profile.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {profile.status || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Intel */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Logistics Infrastructure</h4>
                  <div className="space-y-6">
                    <div className="relative pl-6 border-l-2 border-blue-500/30">
                      <div className="absolute top-0 left-[-7px] w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-500/10" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Billing Nexus</p>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{profile.billing_address || 'Address not registered in database'}</p>
                    </div>
                    <div className="relative pl-6 border-l-2 border-emerald-500/30">
                      <div className="absolute top-0 left-[-7px] w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10" />
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Shipping Terminal</p>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">{profile.shipping_address || 'Using primary billing nexus'}</p>
                    </div>
                  </div>
                </div>

                {/* Strategic Transaction History */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] m-0">Recent Activity</h4>
                    <TrendingUp size={14} className="text-slate-300" />
                  </div>
                  <div className="p-2">
                    {detailedData?.recentOrders?.length > 0 ? (
                      <div className="space-y-1">
                        {detailedData.recentOrders.map((order) => (
                          <div key={order.id} className="p-3 hover:bg-slate-50 rounded-xl transition-colors group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">{order.id}</span>
                              <span className="text-xs font-black text-slate-900">₹{parseFloat(order.amount).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                order.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' : 
                                order.status === 'draft' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {order.status}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">{new Date(order.date).toLocaleDateString('en-GB')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-xs text-slate-400 italic">Zero transaction activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CustomerStatistics() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState('premium')
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [detailedData, setDetailedData] = useState(null)
  const [detailedLoading, setDetailedLoading] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await getCustomerStats()
      if (res.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Error fetching customer stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedStats = async (customer) => {
    try {
      setSelectedItem(customer)
      setDetailedLoading(true)
      setModalOpen(true)
      const res = await getCustomerDetailedStats(customer.id)
      if (res.success) {
        setDetailedData(res.data)
      }
    } catch (err) {
      console.error('Error fetching detailed stats:', err)
    } finally {
      setDetailedLoading(false)
    }
  }

  if (loading || !data) return (
    <div className="min-h-screen bg-slate-50 p-2 flex flex-col items-center justify-center p-3">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6" />
      <p className="text-slate-500   text-xs animate-pulse">Analyzing Customer Portfolios...</p>
    </div>
  )

  const currentCustomers = activeTab === 'premium' ? data.customers.premium : data.customers.regular
  const filteredCustomers = currentCustomers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toString().includes(searchTerm)
  )

  const segmentationData = [
    { name: 'Premium', value: data.customers.premium.length, color: '#fbbf24' },
    { name: 'Regular', value: data.customers.regular.length, color: '#3b82f6' }
  ]

  const top10 = [...data.customers.premium, ...data.customers.regular]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl  text-slate-900 m-0">Customer Intelligence</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Portfolio analysis and segmentation performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded text-[10px]  text-slate-700 hover:bg-slate-50 transition-all ">
            <Download size={14} /> Export
          </button>
          <button onClick={fetchStats} className="flex items-center gap-2 p-1.5 bg-blue-600 rounded text-[10px]  text-white hover:bg-blue-700 transition-all  shadow-blue-600/20">
            <Zap size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard 
          label="Total Customers" 
          value={data.totalCustomers} 
          icon={Users} 
          bgColor="bg-blue-50" 
          iconColor="text-blue-600" 
          trend={data.kpiTrends?.customers?.trend || 'up'} 
          trendValue={`${data.kpiTrends?.customers?.percent || 0}%`} 
        />
        <StatCard 
          label="Total Revenue" 
          value={`₹${(data.totalRevenue / 100000).toFixed(1)}L`} 
          icon={DollarSign} 
          bgColor="bg-emerald-50" 
          iconColor="text-emerald-600" 
          trend={data.kpiTrends?.revenue?.trend || 'up'} 
          trendValue={`${data.kpiTrends?.revenue?.percent || 0}%`} 
        />
        <StatCard 
          label="Premium Share" 
          value={data.totalCustomers > 0 ? `${Math.round((data.customers.premium.length / data.totalCustomers) * 100)}%` : '0%'} 
          icon={Award} 
          bgColor="bg-amber-50" 
          iconColor="text-amber-600" 
          trend={data.kpiTrends?.premiumShare?.trend || 'up'} 
          trendValue={`${data.kpiTrends?.premiumShare?.percent || 0}%`} 
        />
        <StatCard 
          label="Avg Customer LTV" 
          value={data.totalCustomers > 0 ? `₹${Math.round(data.totalRevenue / data.totalCustomers / 1000)}k` : '₹0k'} 
          icon={Target} 
          bgColor="bg-violet-50" 
          iconColor="text-violet-600" 
          trend={data.kpiTrends?.ltv?.trend || 'up'} 
          trendValue={`${data.kpiTrends?.ltv?.percent || 0}%`} 
        />
      </div>

      {/* Main Content Grid: Table + Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Customer List Table */}
        <div className="lg:col-span-9 bg-white rounded border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500/20 w-full md:w-48 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-0.5 p-0.5 bg-slate-50 rounded border border-slate-200">
                <button onClick={() => setActiveTab('premium')} className={`px-2 py-1 rounded text-[10px] transition-all font-medium ${activeTab === 'premium' ? 'bg-white text-amber-600  ' : 'text-slate-400 hover:text-slate-600'}`}>PREMIUM</button>
                <button onClick={() => setActiveTab('regular')} className={`px-2 py-1 rounded text-[10px] transition-all font-medium ${activeTab === 'regular' ? 'bg-white text-blue-600  ' : 'text-slate-400 hover:text-slate-600'}`}>REGULAR</button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{filteredCustomers.length} Entities identified</p>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left bg-white">
              <thead className="sticky top-0 z-10 bg-slate-50  ">
                <tr>
                  <th className="p-2 text-[10px]  text-slate-400 ">Customer Profile</th>
                  <th className="p-2 text-[10px]  text-slate-400  text-center">Orders</th>
                  <th className="p-2 text-[10px]  text-slate-400 ">Revenue</th>
                  <th className="p-2 text-[10px]  text-slate-400 ">Segment</th>
                  <th className="p-2 text-[10px]  text-slate-400  text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCustomers.map((customer, idx) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                          <Building2 size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px]  text-slate-900 m-0 truncate">{customer.name}</p>
                          <p className="text-[9px] text-slate-400 m-0">ID: {customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span className="text-[10px]  text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {customer.orders}
                      </span>
                    </td>
                    <td className="p-2">
                      <p className="text-[11px]  text-slate-900 m-0">₹{parseFloat(customer.revenue).toLocaleString()}</p>
                      <p className="text-[9px] text-emerald-600  ">VERIFIED</p>
                    </td>
                    <td className="p-2">
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px]  ${customer.segment === 'Premium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {customer.segment.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <button 
                        onClick={() => fetchDetailedStats(customer)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-[10px]  text-slate-700 transition-all"
                      >
                        <Eye size={12} /> VIEW
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Segmentation Pie */}
        <div className="lg:col-span-3 bg-white p-2 rounded border border-slate-200 flex flex-col">
          <h3 className="text-sm  text-slate-900 mb-2">Segmentation</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segmentationData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                  {segmentationData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-auto pt-2 border-t border-slate-50">
            {segmentationData.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px]  text-slate-700">{s.name}</span>
                </div>
                <span className="text-[10px]  text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 bg-white p-2 rounded  border border-slate-200 ">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm  text-slate-900">Revenue Trends: Segment Comparison</h3>
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-[10px]  text-slate-500"><div className="w-2 h-2 rounded-full bg-amber-400" /> PREMIUM</div>
              <div className="flex items-center gap-1.5 text-[10px]  text-slate-500"><div className="w-2 h-2 rounded-full bg-blue-500" /> REGULAR</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trends}>
                <defs>
                  <linearGradient id="colorPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRegular" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="premium" stroke="#fbbf24" strokeWidth={2} fill="url(#colorPremium)" />
                <Area type="monotone" dataKey="regular" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRegular)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Radar */}
        <div className="bg-white p-2 rounded border border-slate-200">
          <h3 className="text-sm  text-slate-900 mb-3">Segment Capabilities</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.capabilities}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                <Radar name="Premium" dataKey="A" stroke="#fbbf24" strokeWidth={2} fill="#fbbf24" fillOpacity={0.3} />
                <Radar name="Regular" dataKey="B" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.1} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 mb-4">
        {/* Top Customers Bar */}
        <div className="bg-white p-2 rounded border border-slate-200">
          <h3 className="text-sm  text-slate-900 mb-3">Top 10 Strategic Partners</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={15}>
                  {top10.map((entry, index) => (
                    <Cell key={index} fill={entry.segment === 'Premium' ? '#fbbf24' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DetailModal 
        isOpen={modalOpen} 
        item={selectedItem} 
        onClose={() => setModalOpen(false)} 
        detailedData={detailedData}
        loading={detailedLoading}
      />
    </div>
  )
}
