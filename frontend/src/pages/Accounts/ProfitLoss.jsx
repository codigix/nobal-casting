import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import { 
  Plus, Eye, CheckCircle, RefreshCw, 
  IndianRupee, Clock, AlertCircle, XCircle,
  LayoutGrid, List, ChevronRight, History, Building2,
  Calendar, ArrowUpRight, Filter, TrendingUp, CreditCard,
  Search, Layers, Tag, BookOpen, Download, PieChart, TrendingDown
} from 'lucide-react'

const ReportSection = ({ title, items, total, type = 'income' }) => {
  return (
    <div className="bg-white border border-neutral-200 rounded  overflow-hidden">
      <div className={`px-4 py-3 border-b border-neutral-100 flex items-center justify-between ${
        type === 'income' ? 'bg-emerald-50/30' : 'bg-rose-50/30'
      }`}>
        <h3 className="text-[11px]  text-neutral-900  ">{title}</h3>
        <span className={`text-sm   ${
          type === 'income' ? 'text-emerald-600' : 'text-rose-600'
        }`}>
          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="divide-y divide-neutral-50">
        {items.length > 0 ? items.map((item, idx) => (
          <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors">
            <div className="flex flex-col">
              <span className="text-[11px]  text-neutral-800  ">{item.name}</span>
              <span className="text-[9px] text-neutral-400 font-medium ">{item.description || 'General Account'}</span>
            </div>
            <span className="text-xs  text-neutral-900 ">
              ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )) : (
          <div className="px-4 py-8 text-center text-[10px] text-neutral-400   ">
            No entries for this section
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProfitLoss() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/finance/reports/profit-loss?date_from=${dateRange.from}&date_to=${dateRange.to}`)
      setData(res.data.data)
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching P&L:', error)
      toast.addToast('Error fetching Profit & Loss report', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Mocking sub-items for visualization as the backend returns totals
  const revenueItems = [
    { name: 'Product Sales', amount: data?.revenue || 0, description: 'Direct Sales Revenue' }
  ]
  const expenseItems = [
    { name: 'Cost of Goods Sold', amount: data?.cost_of_goods_sold || 0, description: 'Direct Production Costs' },
    { name: 'Operating Expenses', amount: (data?.expenses || 0) - (data?.cost_of_goods_sold || 0), description: 'Indirect & Admin Expenses' }
  ]

  const netProfit = data?.profit_loss || 0
  const isProfit = netProfit >= 0

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-4 w-full">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px]   text-neutral-400 ">
                <Building2 size={12} strokeWidth={3} className="text-indigo-500" />
                <span>Accounts</span>
                <ChevronRight size={10} strokeWidth={3} />
                <span className="text-neutral-900">Reports</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded ">
                  <PieChart size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    Profit & Loss Statement
                  </h1>
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px]   mt-1">
                    <History size={12} strokeWidth={3} className="text-indigo-500" />
                    <span>Updated {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="p-2 bg-neutral-50 border border-neutral-200 text-xs rounded "
                />
                <span className="text-neutral-400">to</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="p-2 bg-neutral-50 border border-neutral-200 text-xs rounded "
                />
              </div>
              <Button variant="primary" size="sm" className="rounded  px-6" onClick={fetchReport} disabled={loading}>
                {loading ? <RefreshCw size={14} className="animate-spin" /> : 'GENERATE'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Net Profit Summary */}
        <div className={`p-8 rounded  border-2 flex flex-col md:flex-row items-center justify-between gap-8 ${
          isProfit ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
        }`}>
          <div>
            <h2 className={`text-[11px]   tracking-[0.3em] mb-2 ${
              isProfit ? 'text-emerald-700' : 'text-rose-700'
            }`}>
              {isProfit ? 'Net Profit' : 'Net Loss'} for Period
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl  text-neutral-900 er">
                ₹{Math.abs(netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <Badge className={`${
                isProfit ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }  rounded  px-3`}>
                {data?.profit_margin_percentage || 0}% MARGIN
              </Badge>
            </div>
          </div>
          <div className={`p-4 rounded-full ${isProfit ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {isProfit ? <TrendingUp size={48} strokeWidth={2.5} /> : <TrendingDown size={48} strokeWidth={2.5} />}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ReportSection 
            title="Income / Revenue" 
            items={revenueItems} 
            total={data?.revenue || 0} 
            type="income" 
          />
          <ReportSection 
            title="Expenses & Costs" 
            items={expenseItems} 
            total={data?.expenses || 0} 
            type="expense" 
          />
        </div>

        <div className="bg-neutral-900 text-white p-6 rounded  flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-[10px]    text-neutral-400">Total Calculation</h3>
            <p className="text-sm ">Revenue (₹{data?.revenue?.toLocaleString()}) - Expenses (₹{data?.expenses?.toLocaleString()})</p>
          </div>
          <div className="text-right">
             <h3 className="text-[10px]    text-neutral-400">Closing Balance</h3>
             <p className={`text-xl  ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
               ₹{netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
             </p>
          </div>
        </div>
      </main>
    </div>
  )
}
