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
  Search, Layers, Tag, BookOpen, Download
} from 'lucide-react'

const StatCard = ({ label, value, icon: Icon, color }) => {
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
    <div className="bg-white p-6 rounded  border border-neutral-200 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2.5 bg-neutral-50 rounded  border border-neutral-100 text-neutral-400 group-hover:text-${theme}-600 group-hover:border-${theme}-100 transition-colors`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <p className="text-xl  text-neutral-900  leading-none mb-2 ">{value}</p>
        <p className="text-[10px]  text-neutral-400  ">{label}</p>
      </div>
    </div>
  )
}

export default function Ledger() {
  const toast = useToast()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    account_type: '',
    date_from: '',
    date_to: ''
  })

  useEffect(() => {
    fetchLedger()
  }, [filters])

  const fetchLedger = async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (filters.account_type) queryParams.append('account_type', filters.account_type)
      if (filters.date_from) queryParams.append('date_from', filters.date_from)
      if (filters.date_to) queryParams.append('date_to', filters.date_to)

      const response = await api.get(`/finance/ledger?${queryParams.toString()}`)
      setEntries(response.data.data || [])
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching ledger:', error)
      toast.addToast('Error fetching ledger entries', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const searchStr = searchQuery.toLowerCase()
      return (
        e.entry_id?.toLowerCase().includes(searchStr) ||
        e.account_id?.toLowerCase().includes(searchStr) ||
        e.description?.toLowerCase().includes(searchStr) ||
        e.reference_id?.toLowerCase().includes(searchStr)
      )
    })
  }, [entries, searchQuery])

  const stats = useMemo(() => {
    const total_debit = entries.reduce((acc, e) => acc + parseFloat(e.debit || 0), 0)
    const total_credit = entries.reduce((acc, e) => acc + parseFloat(e.credit || 0), 0)
    const transaction_count = entries.length
    const balance = total_debit - total_credit

    return { total_debit, total_credit, transaction_count, balance }
  }, [entries])

  const columns = [
    { 
      key: 'transaction_date', 
      label: 'Date', 
      width: '10%',
      render: (val) => (
        <div className="flex items-center gap-2 text-neutral-400   text-[11px]">
          <Calendar size={12} strokeWidth={3} />
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    { 
      key: 'account_id', 
      label: 'Account / Party', 
      width: '15%',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="  text-neutral-900 text-xs ">{val}</span>
          <span className="text-[10px] text-neutral-400   er">{row.account_type}</span>
        </div>
      )
    },
    { 
      key: 'description', 
      label: 'Description', 
      width: '25%',
      render: (val) => <span className="text-xs text-neutral-600 font-medium">{val}</span>
    },
    { 
      key: 'reference', 
      label: 'Reference', 
      width: '15%',
      render: (_, row) => row.reference_id ? (
        <div className="flex flex-col">
          <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200   rounded  text-[9px] w-fit">
            {row.reference_id}
          </Badge>
          <span className="text-[9px] text-neutral-400  mt-1">{row.reference_doctype}</span>
        </div>
      ) : '---'
    },
    { 
      key: 'debit', 
      label: 'Debit (In)', 
      width: '12%',
      render: (val) => val > 0 ? (
        <span className="  text-emerald-600">
          ₹{parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ) : <span className="text-neutral-300">---</span>
    },
    { 
      key: 'credit', 
      label: 'Credit (Out)', 
      width: '12%',
      render: (val) => val > 0 ? (
        <span className="  text-rose-600">
          ₹{parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ) : <span className="text-neutral-300">---</span>
    },
    {
      key: 'balance',
      label: 'Balance',
      width: '11%',
      render: (_, row, idx) => {
        // Simple running balance logic (note: this only works if entries are sorted by date)
        const currentBalance = filteredEntries.slice(idx).reduce((acc, e) => acc + (parseFloat(e.debit) - parseFloat(e.credit)), 0)
        return (
          <span className="  text-neutral-900">
            ₹{currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        )
      }
    }
  ]

  const accountTypes = ['customer', 'vendor', 'expense', 'income', 'asset', 'liability']

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
                <span className="text-neutral-900">General Ledger</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded ">
                  <BookOpen size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    General Ledger
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
                className="flex items-center gap-2 p-2  rounded  border-neutral-200 text-[10px]   transition-all"
              >
                <Download size={16} strokeWidth={3} />
                EXPORT LEDGER
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="TOTAL DEBITS"
            value={`₹${stats.total_debit.toLocaleString('en-IN')}`}
            icon={ArrowUpRight}
            color="success"
          />
          <StatCard
            label="TOTAL CREDITS"
            value={`₹${stats.total_credit.toLocaleString('en-IN')}`}
            icon={TrendingUp}
            color="rose"
          />
          <StatCard
            label="NET MOVEMENT"
            value={`₹${stats.balance.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            color={stats.balance >= 0 ? 'primary' : 'rose'}
          />
          <StatCard
            label="TOTAL ENTRIES"
            value={stats.transaction_count}
            icon={List}
            color="info"
          />
        </div>

        <div className="bg-white border border-neutral-200 rounded   ">
          <div className="p-4 border-b border-neutral-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search by ID, Account, Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all rounded "
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px]  text-neutral-400  ">Type:</span>
                <select
                  value={filters.account_type}
                  onChange={(e) => setFilters(prev => ({ ...prev, account_type: e.target.value }))}
                  className="p-2 bg-neutral-50 border border-neutral-200 text-xs rounded  outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Accounts</option>
                  {accountTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px]  text-neutral-400  ">From:</span>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                  className="p-2 bg-neutral-50 border border-neutral-200 text-xs rounded  outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px]  text-neutral-400  ">To:</span>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                  className="p-2 bg-neutral-50 border border-neutral-200 text-xs rounded  outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <Button variant="secondary" size="sm" className="rounded  gap-2" onClick={fetchLedger}>
                <RefreshCw size={14} />
                Refresh
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredEntries}
            loading={loading}
          />
        </div>
      </main>
    </div>
  )
}
