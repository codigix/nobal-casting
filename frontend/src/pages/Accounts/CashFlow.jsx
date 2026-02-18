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
  Search, Layers, Tag, BookOpen, Download, PieChart, TrendingDown,
  Columns, Scale, ArrowDownLeft, Activity
} from 'lucide-react'

const CashFlowItem = ({ label, amount, type = 'inflow' }) => (
  <div className="px-4 py-4 flex items-center justify-between border-b border-neutral-50 last:border-0">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded  ${type === 'inflow' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
        {type === 'inflow' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
      </div>
      <span className="text-[11px]  text-neutral-800  ">{label}</span>
    </div>
    <span className={`text-sm   ${type === 'inflow' ? 'text-emerald-600' : 'text-rose-600'}`}>
      {type === 'inflow' ? '+' : '-'} ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
    </span>
  </div>
)

export default function CashFlow() {
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
      const res = await api.get(`/finance/analytics/cash-flow?date_from=${dateRange.from}&date_to=${dateRange.to}`)
      setData(res.data.data)
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching Cash Flow:', error)
      toast.addToast('Error fetching Cash Flow report', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-[1000px] mx-auto px-4 lg:px-8 py-4 w-full">
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
                  <Activity size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    Cash Flow Statement
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

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Net Cash Flow Card */}
        <div className="bg-white border border-neutral-200 rounded  p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-0">
            <h2 className="text-[11px]   tracking-[0.3em] text-neutral-400 mb-2">Net Cash Flow</h2>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl  er ${data.net_cash_flow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{data.net_cash_flow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <Badge className={`${data.net_cash_flow >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}  rounded `}>
                {data.net_cash_flow >= 0 ? 'SURPLUS' : 'DEFICIT'}
              </Badge>
            </div>
          </div>
          <div className="relative z-0 flex flex-col items-end gap-1">
             <div className="flex items-center gap-2 text-emerald-600">
               <TrendingUp size={20} />
               <span className="text-sm ">Inflow: ₹{data.cash_inflow.toLocaleString()}</span>
             </div>
             <div className="flex items-center gap-2 text-rose-600">
               <TrendingDown size={20} />
               <span className="text-sm ">Outflow: ₹{data.cash_outflow.toLocaleString()}</span>
             </div>
          </div>
        </div>

        <div className="space-y-2">
          <section className="bg-white border border-neutral-200 rounded  overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <h3 className="text-[11px]    text-neutral-900">Cash Inflows</h3>
            </div>
            <CashFlowItem label="Customer Receipts" amount={data.cash_inflow} type="inflow" />
            <div className="px-4 py-4 bg-emerald-50/30 flex justify-between items-center border-t border-emerald-100">
               <span className="text-xs    text-emerald-800">Total Inflow</span>
               <span className="text-lg  text-emerald-600">₹{data.cash_inflow.toLocaleString()}</span>
            </div>
          </section>

          <section className="bg-white border border-neutral-200 rounded  overflow-hidden">
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
              <h3 className="text-[11px]    text-neutral-900">Cash Outflows</h3>
            </div>
            <CashFlowItem label="Vendor Payments" amount={data.cash_outflow} type="outflow" />
            <CashFlowItem label="Operating Expenses" amount={0} type="outflow" /> 
            <div className="px-4 py-4 bg-rose-50/30 flex justify-between items-center border-t border-rose-100">
               <span className="text-xs    text-rose-800">Total Outflow</span>
               <span className="text-lg  text-rose-600">₹{data.cash_outflow.toLocaleString()}</span>
            </div>
          </section>
        </div>

        <div className="p-6 bg-indigo-600 text-white rounded  flex items-center justify-between shadow-xl shadow-indigo-200">
          <div>
            <h4 className="text-[10px]    text-indigo-200 mb-1">Final Movement</h4>
            <p className="text-sm ">The net cash flow represents your liquidity increase/decrease for this period.</p>
          </div>
          <div className="text-right">
             <span className="text-2xl ">₹{data.net_cash_flow.toLocaleString()}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
