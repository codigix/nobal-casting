import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts'
import { Star, TrendingUp, DollarSign, Users, Award, Target, ArrowUpRight, ArrowDownRight, Zap, ChevronDown, Eye, X, Building2, Package, Search, Filter, Download } from 'lucide-react'
import { getCustomerStats, getCustomerDetailedStats } from '../../services/adminService'

const StatCard = ({ label, value, icon: Icon, trend, trendValue, bgColor, iconColor }) => (
  <div className="bg-white rounded p-3 border border-slate-200  hover:shadow-md transition-all group relative overflow-hidden">
    <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full ${bgColor} opacity-10 group-hover:scale-110 transition-transform duration-700`} />
    <div className="relative z-10">
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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-50 rounded   shadow-2xl max-w-4xl w-full  overflow-hidden flex flex-col border border-white/20">
        <div className="bg-slate-900 p-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6  bg-blue-600 rounded flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
              <Building2 />
            </div>
            <div>
              <h2 className="text-xl  m-0">{item.name}</h2>
              <p className="text-slate-400 text-xs m-0">Customer ID: {item.id} | Segment: <span className="text-blue-400 ">{item.segment}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-all">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center">
              <div className="w-6 h-6  border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-400   text-xs ">Retrieving Partner Intel...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <p className="text-xs   text-slate-400  mb-1">Total Revenue</p>
                  <h4 className="text-xl ftext-slate-900">₹{parseFloat(item.revenue).toLocaleString()}</h4>
                </div>
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <p className="text-xs   text-slate-400  mb-1">Total Orders</p>
                  <h4 className="text-xl ftext-slate-900">{item.orders}</h4>
                </div>
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <p className="text-xs   text-slate-400  mb-1">Avg Order Value</p>
                  <h4 className="text-xl ftext-slate-900">₹{item.orders > 0 ? Math.round(item.revenue / item.orders).toLocaleString() : 0}</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <h4 className="text-xs  text-slate-900 mb-6 ">Revenue Performance (6M)</h4>
                  <div className="h-64">
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={monthlyData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">No historical revenue data</div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <h4 className="text-xs  text-slate-900 mb-6 ">Order Velocity</h4>
                  <div className="h-64">
                    {monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="orders" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">No historical order data</div>
                    )}
                  </div>
                </div>
              </div>

              {detailedData?.recentOrders?.length > 0 && (
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <h4 className="text-xs  text-slate-900 mb-6 ">Recent Transactions</h4>
                  <div className="">
                    <table className="w-full text-left bg-white">
                      <thead>
                        <tr>
                          <th className="pb-4 text-xs   text-slate-400 ">Order ID</th>
                          <th className="pb-4 text-xs   text-slate-400  text-right">Amount</th>
                          <th className="pb-4 text-xs   text-slate-400  text-center">Status</th>
                          <th className="pb-4 text-xs   text-slate-400  text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {detailedData.recentOrders.map((order) => (
                          <tr key={order.id}>
                            <td className="py-2 text-xs  text-slate-700">{order.name}</td>
                            <td className="py-2 text-xs  text-slate-900 text-right">₹{parseFloat(order.amount).toLocaleString()}</td>
                            <td className="py-2 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs   bg-blue-50 text-blue-600 ">{order.status}</span>
                            </td>
                            <td className="py-2 text-xs text-slate-500 text-right">{new Date(order.date).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
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
    <div className="min-h-screen bg-slate-50 p-2 p-3 md:p-3">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl  text-slate-900 m-0">Customer Intelligence</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">Portfolio analysis and segmentation performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded text-xs  text-slate-700 hover:bg-slate-50 transition-all ">
            <Download size={18} /> Export Intel
          </button>
          <button onClick={fetchStats} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 rounded text-xs  text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <Zap size={18} /> Refresh Data
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Main Trend Chart */}
        <div className="lg:col-span-2 bg-white p-2 rounded  border border-slate-200 ">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg  text-slate-900">Revenue Trends: Segment Comparison</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs  text-slate-500"><div className="w-3 h-3 rounded-full bg-amber-400" /> Premium</div>
              <div className="flex items-center gap-2 text-xs  text-slate-500"><div className="w-3 h-3 rounded-full bg-blue-500" /> Regular</div>
            </div>
          </div>
          <div className="h-80">
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
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="premium" stroke="#fbbf24" strokeWidth={3} fill="url(#colorPremium)" />
                <Area type="monotone" dataKey="regular" stroke="#3b82f6" strokeWidth={3} fill="url(#colorRegular)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Segmentation Pie */}
        <div className="bg-white p-2 rounded  border border-slate-200 ">
          <h3 className="text-lg  text-slate-900 mb-3">Customer Segmentation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segmentationData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                  {segmentationData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4 mt-8">
            {segmentationData.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs  text-slate-700">{s.name} Clients</span>
                </div>
                <span className="text-xs  text-slate-900">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Performance Radar */}
        <div className="bg-white p-2 rounded  border border-slate-200 ">
          <h3 className="text-lg  text-slate-900 mb-3">Segment Capabilities</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.capabilities}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                <Radar name="Premium" dataKey="A" stroke="#fbbf24" strokeWidth={2} fill="#fbbf24" fillOpacity={0.3} />
                <Radar name="Regular" dataKey="B" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.1} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers Bar */}
        <div className="lg:col-span-2 bg-white p-2 rounded  border border-slate-200 ">
          <h3 className="text-lg  text-slate-900 mb-3">Top 10 Strategic Partners</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20}>
                  {top10.map((entry, index) => (
                    <Cell key={index} fill={entry.segment === 'Premium' ? '#fbbf24' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Customer List Table */}
      <div className="bg-white rounded   border border-slate-200  overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 my-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search customers by name or ID..." 
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full md:w-80 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-1 p-1 bg-slate-50 rounded border border-slate-200">
              <button onClick={() => setActiveTab('premium')} className={`px-4 py-1.5 rounded text-xs  transition-all ${activeTab === 'premium' ? 'bg-white text-amber-600 ' : 'text-slate-400'}`}>PREMIUM</button>
              <button onClick={() => setActiveTab('regular')} className={`px-4 py-1.5 rounded text-xs  transition-all ${activeTab === 'regular' ? 'bg-white text-blue-600 ' : 'text-slate-400'}`}>REGULAR</button>
            </div>
          </div>
          <p className="text-xs  text-slate-400 ">{filteredCustomers.length} Entities identified</p>
        </div>

        <div className="">
          <table className="w-full text-left bg-white">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-2 text-xs  text-slate-400 ">Customer Profile</th>
                <th className="p-2 text-xs  text-slate-400  text-center">Orders</th>
                <th className="p-2 text-xs  text-slate-400 ">Lifetime Revenue</th>
                <th className="p-2 text-xs  text-slate-400 ">Segment Status</th>
                <th className="p-2 text-xs  text-slate-400  text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map((customer, idx) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-2">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <p className="text-xs  text-slate-900 m-0">{customer.name}</p>
                        <p className="text-xs   text-slate-400 tracking-tighter m-0">ID: {customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 text-xs ">
                      {customer.orders}
                    </span>
                  </td>
                  <td className="p-2">
                    <p className="text-xs  text-slate-900 m-0">₹{parseFloat(customer.revenue).toLocaleString()}</p>
                    <p className="text-xs   text-emerald-600 tracking-tighter m-0">Revenue Verified</p>
                  </td>
                  <td className="p-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs    ${customer.segment === 'Premium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                      {customer.segment}
                    </span>
                  </td>
                  <td className="p-2 text-right">
                    <button 
                      onClick={() => fetchDetailedStats(customer)}
                      className="inline-flex items-center gap-2 p-2 bg-slate-100 hover:bg-blue-600 hover:text-white rounded text-xs  text-slate-700 transition-all"
                    >
                      <Eye size={14} /> View Analytics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
