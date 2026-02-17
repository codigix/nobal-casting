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
  Columns, Scale
} from 'lucide-react'

const BalanceSection = ({ title, items, total, theme = 'indigo' }) => {
  return (
    <div className="bg-white border border-neutral-200 rounded  overflow-hidden h-full">
      <div className={`px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-${theme}-50/30`}>
        <h3 className={`text-[11px]    text-${theme}-900`}>{title}</h3>
        <span className={`text-sm   text-${theme}-600`}>
          ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="divide-y divide-neutral-50">
        {items.map((item, idx) => (
          <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors">
            <span className="text-[11px]  text-neutral-800  ">{item.name}</span>
            <span className="text-xs  text-neutral-900 ">
              ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BalanceSheet() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get('/finance/analytics/balance-sheet')
      setData(res.data.data)
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching Balance Sheet:', error)
      toast.addToast('Error fetching Balance Sheet', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!data) return null

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
                  <Scale size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    Balance Sheet
                  </h1>
                  <div className="flex items-center gap-2 text-neutral-400 text-[10px]   mt-1">
                    <History size={12} strokeWidth={3} className="text-indigo-500" />
                    <span>Updated {refreshTime.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" className="rounded  gap-2" onClick={fetchReport} disabled={loading}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
              <Button variant="primary" size="sm" className="rounded  gap-2">
                <Download size={14} />
                EXPORT PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Balanced Status */}
        <div className="bg-neutral-900 text-white p-6 rounded  flex items-center justify-between">
           <div className="flex items-center gap-4">
             <div className="p-3 bg-indigo-500 rounded ">
               <Scale size={24} />
             </div>
             <div>
               <h3 className="text-[10px]    text-neutral-400">Equation Status</h3>
               <p className="text-lg  ">Assets = Liabilities + Equity</p>
             </div>
           </div>
           <div className="text-right">
             <Badge className="bg-emerald-500 text-white border-none   px-4 py-1.5 rounded ">
               BALANCED
             </Badge>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Assets */}
          <div className="space-y-2">
            <BalanceSection 
              title="Assets (What we own)" 
              items={data.assets.current_assets} 
              total={data.assets.total_assets}
              theme="indigo"
            />
          </div>

          {/* Right Side: Liabilities & Equity */}
          <div className="space-y-2">
            <BalanceSection 
              title="Liabilities (What we owe)" 
              items={data.liabilities.current_liabilities} 
              total={data.liabilities.total_liabilities}
              theme="rose"
            />
            
            <BalanceSection 
              title="Equity (Owner's interest)" 
              items={[
                { name: 'Retained Earnings', amount: data.equity.retained_earnings }
              ]} 
              total={data.equity.total_equity}
              theme="emerald"
            />
          </div>
        </div>

        {/* Grand Totals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-neutral-200">
          <div className="flex items-center justify-between px-4">
            <span className="text-sm  text-neutral-900  ">Total Assets</span>
            <span className="text-2xl  text-indigo-600">
              ₹{data.assets.total_assets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex items-center justify-between px-4">
            <span className="text-sm  text-neutral-900  ">Total Liabilities & Equity</span>
            <span className="text-2xl  text-neutral-900">
              ₹{(data.liabilities.total_liabilities + data.equity.total_equity).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
