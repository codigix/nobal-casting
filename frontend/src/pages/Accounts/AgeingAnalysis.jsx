import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Button from '../../components/Button/Button'
import Badge from '../../components/Badge/Badge'
import DataTable from '../../components/Table/DataTable'
import { 
  Plus, Eye, CheckCircle, RefreshCw, 
  IndianRupee, Clock, AlertCircle, XCircle,
  LayoutGrid, List, ChevronRight, History, Building2,
  Calendar, ArrowUpRight, Filter, TrendingUp, CreditCard,
  Search, Layers, Tag, BookOpen, Download, PieChart, TrendingDown,
  Columns, Scale, ArrowDownLeft, Activity, User
} from 'lucide-react'

export default function AgeingAnalysis() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await api.get('/finance/analytics/ageing-analysis')
      setData(res.data.data || [])
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching Ageing Analysis:', error)
      toast.addToast('Error fetching Ageing Analysis', 'error')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    { 
      key: 'customer_name', 
      label: 'Customer Name', 
      width: '20%',
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-neutral-100 rounded  text-neutral-400">
            <User size={14} />
          </div>
          <span className="  text-neutral-900 text-xs ">{val}</span>
        </div>
      )
    },
    { 
      key: 'current', 
      label: '0-30 Days', 
      width: '15%',
      render: (val) => (
        <span className=" text-neutral-700 text-xs">
          ₹{(parseFloat(val) || 0).toLocaleString()}
        </span>
      )
    },
    { 
      key: 'thirty_to_sixty', 
      label: '31-60 Days', 
      width: '15%',
      render: (val) => (
        <span className=" text-amber-600 text-xs">
          ₹{(parseFloat(val) || 0).toLocaleString()}
        </span>
      )
    },
    { 
      key: 'sixty_to_ninety', 
      label: '61-90 Days', 
      width: '15%',
      render: (val) => (
        <span className=" text-orange-600 text-xs">
          ₹{(parseFloat(val) || 0).toLocaleString()}
        </span>
      )
    },
    { 
      key: 'over_ninety', 
      label: '90+ Days', 
      width: '15%',
      render: (val) => (
        <span className=" text-rose-600 text-xs">
          ₹{(parseFloat(val) || 0).toLocaleString()}
        </span>
      )
    },
    { 
      key: 'total', 
      label: 'Total Outstanding', 
      width: '20%',
      render: (val) => (
        <span className="  text-neutral-900 text-sm">
          ₹{(parseFloat(val) || 0).toLocaleString()}
        </span>
      )
    }
  ]

  const totals = useMemo(() => {
    return data.reduce((acc, row) => ({
      current: acc.current + parseFloat(row.current || 0),
      thirty_to_sixty: acc.thirty_to_sixty + parseFloat(row.thirty_to_sixty || 0),
      sixty_to_ninety: acc.sixty_to_ninety + parseFloat(row.sixty_to_ninety || 0),
      over_ninety: acc.over_ninety + parseFloat(row.over_ninety || 0),
      total: acc.total + parseFloat(row.total || 0)
    }), { current: 0, thirty_to_sixty: 0, sixty_to_ninety: 0, over_ninety: 0, total: 0 })
  }, [data])

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-4 w-full">
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
                  <Clock size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    Accounts Receivable Ageing
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
                EXPORT
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 border border-neutral-200">
            <p className="text-[10px]  text-neutral-400   mb-1">0-30 Days</p>
            <p className="text-xl  text-neutral-900">₹{totals.current.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 border border-neutral-200">
            <p className="text-[10px]  text-neutral-400   mb-1">31-60 Days</p>
            <p className="text-xl  text-amber-600">₹{totals.thirty_to_sixty.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 border border-neutral-200">
            <p className="text-[10px]  text-neutral-400   mb-1">61-90 Days</p>
            <p className="text-xl  text-orange-600">₹{totals.sixty_to_ninety.toLocaleString()}</p>
          </div>
          <div className="bg-white p-4 border border-neutral-200">
            <p className="text-[10px]  text-neutral-400   mb-1">90+ Days</p>
            <p className="text-xl  text-rose-600">₹{totals.over_ninety.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-900 p-4 text-white">
            <p className="text-[10px]  text-neutral-400   mb-1">Total Due</p>
            <p className="text-xl  text-white">₹{totals.total.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded    overflow-hidden">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
          />
        </div>

        <section className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex gap-3">
             <AlertCircle className="text-amber-600 shrink-0" size={20} />
             <div>
               <h4 className="text-xs   tracking-wider text-amber-900">Credit Control Note</h4>
               <p className="text-[11px] text-amber-800 mt-1">
                 Customers in the "90+ Days" and "61-90 Days" columns should be prioritized for follow-up to ensure healthy cash flow. 
                 Total overdue amount is <span className="">₹{(totals.sixty_to_ninety + totals.over_ninety).toLocaleString()}</span>.
               </p>
             </div>
          </div>
        </section>
      </main>
    </div>
  )
}
