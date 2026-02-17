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
  Search, Layers, Tag, Receipt
} from 'lucide-react'
import CreateExpenseModal from '../../components/Accounts/CreateExpenseModal'

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

export default function Expenses() {
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshTime, setRefreshTime] = useState(new Date())

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const response = await api.get('/finance/expenses')
      setExpenses(response.data.data || [])
      setRefreshTime(new Date())
    } catch (error) {
      console.error('Error fetching expenses:', error)
      toast.addToast('Error fetching expenses', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (expenseId, status) => {
    try {
      await api.put(`/finance/expenses/${expenseId}/status`, { status })
      toast.addToast(`Expense marked as ${status}`, 'success')
      fetchExpenses()
    } catch (error) {
      toast.addToast(error.response?.data?.error || 'Failed to update expense', 'error')
    }
  }

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const searchStr = searchQuery.toLowerCase()
      return (
        e.expense_id?.toLowerCase().includes(searchStr) ||
        e.category?.toLowerCase().includes(searchStr) ||
        e.description?.toLowerCase().includes(searchStr) ||
        e.department?.toLowerCase().includes(searchStr)
      )
    })
  }, [expenses, searchQuery])

  const stats = useMemo(() => {
    const total_count = expenses.length
    const draft = expenses.filter(e => e.status === 'draft').length
    const paid = expenses.filter(e => e.status === 'paid' || e.status === 'approved').length
    const total_amount = expenses.reduce((acc, e) => acc + parseFloat(e.amount || 0), 0)

    return { total_count, draft, paid, total_amount }
  }, [expenses])

  const columns = [
    { 
      key: 'expense_id', 
      label: 'ID', 
      width: '12%',
      render: (val) => <span className="  text-indigo-600">{val}</span>
    },
    { 
      key: 'category', 
      label: 'Category', 
      width: '15%',
      render: (val) => (
        <div className="flex items-center gap-2   text-neutral-900">
          <Tag size={12} className="text-indigo-400" />
          {val}
        </div>
      )
    },
    { 
      key: 'expense_date', 
      label: 'Date', 
      width: '12%',
      render: (val) => (
        <div className="flex items-center gap-2 text-neutral-400  ">
          <Calendar size={14} strokeWidth={3} />
          {val ? new Date(val).toLocaleDateString() : 'N/A'}
        </div>
      )
    },
    { 
      key: 'department', 
      label: 'Department', 
      width: '15%',
      render: (val) => (
        <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200   rounded ">
          {val}
        </Badge>
      )
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      width: '15%',
      render: (val) => (
        <span className="  text-neutral-900">
          ₹{(parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status', 
      width: '12%',
      render: (val) => {
        const isPaid = val === 'paid' || val === 'approved'
        return (
          <Badge className={`${
            isPaid 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }   rounded  px-3 py-1.5`}>
            {val.toUpperCase()}
          </Badge>
        )
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '10%',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.status === 'draft' && (
            <Button
              size="sm"
              variant="icon"
              onClick={() => handleUpdateStatus(row.expense_id, 'paid')}
              className="h-8 w-8 rounded  bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
              title="Mark as Paid"
            >
              <CheckCircle size={14} strokeWidth={3} />
            </Button>
          )}
          <Button
            size="sm"
            variant="icon"
            className="h-8 w-8 rounded  border-neutral-200 text-neutral-400 hover:text-indigo-600 hover:border-indigo-200"
            title="View Details"
          >
            <Eye size={14} strokeWidth={3} />
          </Button>
        </div>
      )
    }
  ]

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
                <span className="text-neutral-900">Expense Management</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-neutral-900 text-white rounded ">
                  <Receipt size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-xl  text-neutral-900  leading-none">
                    Company Expenses
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
                variant="primary"
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 p-2  rounded  bg-neutral-900 text-white hover:bg-neutral-800 text-[10px]   transition-all"
              >
                <Plus size={16} strokeWidth={3} />
                RECORD EXPENSE
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="TOTAL TRANSACTIONS"
            value={stats.total_count}
            icon={List}
            color="primary"
          />
          <StatCard
            label="DRAFT EXPENSES"
            value={stats.draft}
            icon={Clock}
            color="warning"
          />
          <StatCard
            label="TOTAL PAID"
            value={stats.paid}
            icon={CheckCircle}
            color="success"
          />
          <StatCard
            label="TOTAL EXPENSE VOLUME"
            value={`₹${stats.total_amount.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            color="rose"
          />
        </div>

        <div className="bg-white border border-neutral-200 rounded   ">
          <div className="p-4 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search by ID, Category, Description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all rounded "
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="rounded  gap-2" onClick={fetchExpenses}>
                <RefreshCw size={14} />
                Refresh
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredExpenses}
            loading={loading}
          />
        </div>
      </main>

      <CreateExpenseModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchExpenses}
      />
    </div>
  )
}
