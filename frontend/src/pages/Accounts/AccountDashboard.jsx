import React, { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, 
  Wallet, Receipt, ArrowUpRight, ArrowDownRight, 
  Clock, CheckCircle, AlertCircle, RefreshCw,
  FileText, Users, ShoppingCart, Briefcase, Activity,
  ChevronRight, Building2, History, List, IndianRupee,
  Plus, BookOpen, BarChart3
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const StatCard = ({ label, value, icon: Icon, color, trend, trendValue, trendDirection, onClick, isActive }) => {
  const colorMap = {
    primary: 'indigo',
    success: 'emerald',
    warning: 'amber',
    danger: 'rose',
    info: 'sky',
    rose: 'rose'
  }
  const theme = colorMap[color] || 'indigo'
  
  return (
    <div
      onClick={onClick}
      className={`bg-white p-2 rounded border transition-all duration-300 group cursor-pointer ${
        isActive 
          ? `border-${theme}-500   ring-1 ring-${theme}-500` 
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2.5 bg-neutral-50 rounded  border border-neutral-100 text-neutral-400 group-hover:text-${theme}-600 group-hover:border-${theme}-100 transition-colors`}>
          <Icon size={20} />
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-[10px]   ${
            trendDirection === 'up' ? 'text-emerald-600 bg-emerald-50/50 border-emerald-100' : 'text-rose-600 bg-rose-50/50 border-rose-100'
          } px-2 py-1 border`}>
            {trendDirection === 'up' ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />}
            {trendValue}
          </div>
        )}
      </div>
      <div>
        <p className="text-xl  text-neutral-900  leading-none mb-2 ">
          ₹{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>
        <p className="text-[10px]  text-neutral-400   ">{label}</p>
      </div>
    </div>
  )
}

export default function AccountDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState('overview')
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    cashInHand: 0,
    trends: {
      revenue: { percent: 12, trend: 'up' },
      expenses: { percent: 5, trend: 'down' },
      profit: { percent: 8, trend: 'up' }
    }
  })

  const [chartData, setChartData] = useState({
    revenueVsExpense: [],
    expenseDistribution: [],
    cashFlow: [],
    ageingReceivables: [],
    ageingPayables: []
  })

  useEffect(() => {
    fetchAccountData()
  }, [])

  const fetchAccountData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/finance/analytics/dashboard')
      
      if (response.data.success) {
        const d = response.data.data
        setStats({
          totalRevenue: d.revenue || 0,
          totalExpenses: d.expenses || 0,
          netProfit: (d.revenue || 0) - (d.expenses || 0) - (d.vendor_payments || 0),
          accountsReceivable: d.pending_customer_payments || 0,
          accountsPayable: d.pending_vendor_payments || 0,
          cashInHand: d.cash_balance || 0,
          trends: d.trends || stats.trends
        })

        setChartData({
          revenueVsExpense: d.revenue_expense_trend || [],
          expenseDistribution: d.expense_categories || [],
          cashFlow: d.cash_flow_trend || [],
          ageingReceivables: d.receivables_ageing || [],
          ageingPayables: d.payables_ageing || []
        })
      } else {
        generateMockData()
      }
      
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching account data:', error)
      toast.addToast('Failed to fetch real-time financial data. Showing estimates.', 'warning')
      generateMockData()
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = () => {
    setChartData({
      revenueVsExpense: [
        { month: 'Sep', revenue: 450000, expenses: 320000 },
        { month: 'Oct', revenue: 520000, expenses: 380000 },
        { month: 'Nov', revenue: 480000, expenses: 350000 },
        { month: 'Dec', revenue: 610000, expenses: 420000 },
        { month: 'Jan', revenue: 550000, expenses: 390000 },
        { month: 'Feb', revenue: 680000, expenses: 450000 },
      ],
      expenseDistribution: [
        { name: 'Raw Material', value: 450000 },
        { name: 'Labor', value: 200000 },
        { name: 'Utilities', value: 50000 },
        { name: 'Maintenance', value: 80000 },
        { name: 'Administrative', value: 120000 },
      ],
      cashFlow: [
        { date: '2025-02-01', balance: 1200000 },
        { date: '2025-02-05', balance: 1150000 },
        { date: '2025-02-10', balance: 1350000 },
        { date: '2025-02-15', balance: 1280000 },
        { date: '2025-02-20', balance: 1420000 },
      ],
      ageingReceivables: [
        { range: '0-30 Days', amount: 850000 },
        { range: '31-60 Days', amount: 420000 },
        { range: '61-90 Days', amount: 150000 },
        { range: '90+ Days', amount: 50000 },
      ],
      ageingPayables: [
        { range: '0-30 Days', amount: 600000 },
        { range: '31-60 Days', amount: 250000 },
        { range: '61-90 Days', amount: 100000 },
        { range: '90+ Days', amount: 30000 },
      ]
    })
  }

  if (loading && !chartData.revenueVsExpense.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <RefreshCw size={40} className="animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-neutral-900   text-xs ">Analyzing financial records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className=" mx-auto p-2">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px]   text-neutral-400 ">
                <Building2 size={12} strokeWidth={3} className="text-indigo-500" />
                <span>Accounts</span>
                <ChevronRight size={10} strokeWidth={3} />
                <span className="text-neutral-900">Financial Intelligence</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded ">
                  <Activity size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    Financial Dashboard
                  </h1>
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px]   mt-1">
                    <History size={12} strokeWidth={3} className="text-indigo-500" />
                    <span>Last Refreshed {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => { setLoading(true); fetchAccountData() }}
                className="flex items-center gap-2 p-2  rounded  border-neutral-200 text-[10px]   transition-all"
              >
                <RefreshCw size={16} strokeWidth={3} className={loading ? 'animate-spin' : ''} />
                SYNC DATA
              </Button>
              
              <div className="h-8 w-[1px] bg-neutral-200 mx-2 hidden lg:block" />

              <Button
                variant="primary"
                onClick={() => navigate('/accounts/payments')}
                className="flex items-center gap-2 p-2  rounded  bg-neutral-900 text-white hover:bg-neutral-800 text-[10px]   transition-all"
              >
                <Plus size={16} strokeWidth={3} />
                RECORD TRANSACTION
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            label="Total Revenue" 
            value={stats.totalRevenue}
            icon={TrendingUp}
            color="success"
            trendValue={`${stats.trends.revenue.percent}%`}
            trendDirection={stats.trends.revenue.trend}
          />
          <StatCard 
            label="Total Expenses" 
            value={stats.totalExpenses}
            icon={TrendingDown}
            color="danger"
            trendValue={`${stats.trends.expenses.percent}%`}
            trendDirection={stats.trends.expenses.trend}
          />
          <StatCard 
            label="Net Profit" 
            value={stats.netProfit}
            icon={Wallet}
            color="primary"
            trendValue={`${stats.trends.profit.percent}%`}
            trendDirection={stats.trends.profit.trend}
          />
        </div>

        {/* Secondary KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
          <div className="bg-white p-6 border border-neutral-200 flex items-center gap-4 group hover:border-neutral-300 transition-all">
            <div className="p-3 bg-amber-50 text-amber-600 rounded  border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px]  text-neutral-400  ">Receivables</p>
              <p className="text-xl  text-neutral-900 ">₹{stats.accountsReceivable.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white p-6 border border-neutral-200 flex items-center gap-4 group hover:border-neutral-300 transition-all">
            <div className="p-3 bg-rose-50 text-rose-600 rounded  border border-rose-100 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-[10px]  text-neutral-400  ">Payables</p>
              <p className="text-xl  text-neutral-900 ">₹{stats.accountsPayable.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="bg-white p-6 border border-neutral-200 flex items-center gap-4 group hover:border-neutral-300 transition-all">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded  border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-[10px]  text-neutral-400  ">Cash Balance</p>
              <p className="text-xl  text-neutral-900 ">₹{stats.cashInHand.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 border-b border-neutral-200">
          {[
            { id: 'overview', label: 'FINANCIAL TRENDS', icon: Activity },
            { id: 'ageing', label: 'AGEING ANALYSIS', icon: Clock },
            { id: 'quick_actions', label: 'QUICK ACTIONS', icon: List }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 text-[10px]   border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-neutral-400 hover:text-neutral-900'
              }`}
            >
              <tab.icon size={14} strokeWidth={3} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px]    text-neutral-900 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-600" /> Revenue vs Expenses
                  </h3>
                  <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200   rounded ">LAST 6 MONTHS</Badge>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData.revenueVsExpense}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} tickFormatter={(val) => `₹${val/1000}K`} />
                      <Tooltip 
                        contentStyle={{borderRadius: '0', border: '1px solid #e5e7eb', boxShadow: 'none', backgroundColor: '#fff'}}
                        itemStyle={{fontSize: '10px', fontWeight: '900', textTransform: ''}}
                        labelStyle={{fontSize: '10px', fontWeight: '900', marginBottom: '4px'}}
                        formatter={(val) => [`₹${val.toLocaleString()}`, '']}
                      />
                      <Legend iconType="rect" wrapperStyle={{fontSize: '10px', fontWeight: '900', paddingTop: '20px'}} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="REVENUE" />
                      <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" name="EXPENSES" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 border border-neutral-200">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-[11px]    text-neutral-900">Expense Distribution</h3>
                  <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100   rounded ">BY CATEGORY</Badge>
                </div>
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.expenseDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.expenseDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{borderRadius: '0', border: '1px solid #e5e7eb', boxShadow: 'none'}}
                        itemStyle={{fontSize: '10px', fontWeight: '900', textTransform: ''}}
                        formatter={(val) => [`₹${val.toLocaleString()}`, '']}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="rect" wrapperStyle={{fontSize: '10px', fontWeight: '900'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 border border-neutral-200">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px]    text-neutral-900 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-600" /> Daily Cash Flow Trend
                </h3>
                <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200   rounded ">LAST 30 DAYS</Badge>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.cashFlow}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 8, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} tickFormatter={(val) => `₹${val/1000}K`} />
                    <Tooltip 
                      contentStyle={{borderRadius: '0', border: '1px solid #e5e7eb', boxShadow: 'none'}}
                      itemStyle={{fontSize: '10px', fontWeight: '900', textTransform: ''}}
                      labelStyle={{fontSize: '10px', fontWeight: '900', marginBottom: '4px'}}
                    />
                    <Legend iconType="rect" wrapperStyle={{fontSize: '10px', fontWeight: '900', paddingTop: '10px'}} />
                    <Bar dataKey="inflow" fill="#10b981" name="INFLOW" />
                    <Bar dataKey="outflow" fill="#ef4444" name="OUTFLOW" />
                    <Line type="monotone" dataKey="balance" stroke="#4f46e5" strokeWidth={2} name="NET" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ageing' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 border border-neutral-200">
              <h3 className="text-[11px]    text-neutral-900 mb-8">Receivables Ageing</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.ageingReceivables}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} tickFormatter={(val) => `₹${val/1000}K`} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '0', border: '1px solid #e5e7eb'}} />
                    <Bar dataKey="amount" fill="#4f46e5" radius={0} name="AMOUNT" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 border border-neutral-200">
              <h3 className="text-[11px]    text-neutral-900 mb-8">Payables Ageing</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.ageingPayables}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 900}} tickFormatter={(val) => `₹${val/1000}K`} />
                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '0', border: '1px solid #e5e7eb'}} />
                    <Bar dataKey="amount" fill="#ef4444" radius={0} name="AMOUNT" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quick_actions' && (
          <div className="bg-white border border-neutral-200 divide-y divide-neutral-100">
            <div className="p-6 bg-neutral-50/50">
              <h3 className="text-[11px]    text-neutral-900">System Shortcuts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-neutral-100">
              {[
                { label: 'Sales Invoices', icon: FileText, color: 'text-indigo-600', path: '/selling/sales-invoices', desc: 'Manage customer billing and revenue tracking' },
                { label: 'Purchase Invoices', icon: Receipt, color: 'text-rose-600', path: '/buying/purchase-invoices', desc: 'Track supplier invoices and payables' },
                { label: 'Payments & Receipts', icon: CreditCard, color: 'text-emerald-600', path: '/accounts/payments', desc: 'Record incoming and outgoing funds' },
                { label: 'Expense Journal', icon: TrendingDown, color: 'text-amber-600', path: '/accounts/expenses', desc: 'Log operating and non-operating costs' },
                { label: 'General Ledger', icon: BookOpen, color: 'text-sky-600', path: '/accounts/ledger', desc: 'Complete audit trail of all transactions' },
                { label: 'Financial Reports', icon: BarChart3, color: 'text-indigo-600', path: '/accounts/reports/profit-loss', desc: 'P&L, Balance Sheet and Cash Flow' },
              ].map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className="flex items-start gap-4 p-8 hover:bg-neutral-50 transition-all group text-left"
                >
                  <div className={`p-4 bg-neutral-50 rounded  border border-neutral-100 ${action.color} group-hover:bg-neutral-900 group-hover:text-white transition-all`}>
                    <action.icon size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="text-sm  text-neutral-900  block mb-1 ">{action.label}</span>
                    <p className="text-[10px]  text-neutral-400 leading-relaxed  tracking-wider">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
