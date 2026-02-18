import React, { useState, useEffect, useMemo } from 'react'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  Trophy,
  Briefcase
} from 'lucide-react'
import api from '../../services/api'
import CreateCustomersModal from '../../components/Production/CreateCustomersModal'
import Card from '../../components/Card/Card'

const StatCard = ({ label, value, icon: Icon, color, trend }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 ',
    amber: 'text-amber-600',
    slate: 'text-slate-600 bg-slate-50 border-slate-100'
  }
  
  return (
    <div className="bg-white p-2 rounded border border-slate-200/60  flex items-start justify-between">
      <div>
        <p className="text-xs   text-slate-400 text-xs mb-1">{label}</p>
        <h3 className="text-xl   text-slate-900">{value}</h3>
        {trend && (
          <p className="text-xs  font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <span>↑ {trend}</span>
            <span className="text-slate-400">vs last month</span>
          </p>
        )}
      </div>
      <div className={`p-2 rounded ${colorMap[color] || colorMap.blue}`}>
        <Icon size={18} />
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: ''
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('tata')

  useEffect(() => {
    fetchCustomers()
  }, []) // Remove filters from dependency if we want to filter locally or only on explicit search

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/customers')
      setCustomers(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch customers')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleDelete = async (customer_id) => {
    if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await api.delete(`/customers/${customer_id}`)
        setSuccess('Customer deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchCustomers()
      } catch (err) {
        setError(err.response?.data?.error || err.message || 'Failed to delete customer')
      }
    }
  }

  const handleEdit = (customer) => {
    setEditingId(customer.customer_id)
    setShowCreateModal(true)
  }

  const handleCreateSuccess = () => {
    setSuccess('Customer information updated successfully')
    setTimeout(() => setSuccess(null), 3000)
    setEditingId(null)
    setShowCreateModal(false)
    fetchCustomers()
  }

  const stats = useMemo(() => {
    const total = customers.length
    const active = customers.filter(c => c.status === 'active').length
    const tata = customers.filter(c => c.customer_type?.toLowerCase() === 'tata').length
    const others = total - tata
    return { total, active, tata, others }
  }, [customers])

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = 
        customer.customer_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        customer.customer_id?.toString().includes(filters.search) ||
        customer.email?.toLowerCase().includes(filters.search.toLowerCase())
      
      const matchesStatus = !filters.status || customer.status === filters.status
      
      const matchesTab = activeTab === 'tata' 
        ? customer.customer_type?.toLowerCase() === 'tata'
        : customer.customer_type?.toLowerCase() !== 'tata'
        
      return matchesSearch && matchesStatus && matchesTab
    })
  }, [customers, filters, activeTab])

  const getStatusBadge = (status) => {
    const configs = {
      active: { color: 'text-emerald-700 ', icon: CheckCircle2 },
      inactive: { color: 'text-rose-700 bg-rose-50 border-rose-100', icon: XCircle },
      pending: { color: 'text-amber-700', icon: Clock }
    }
    const config = configs[status] || configs.pending
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs   text-xs border ${config.color}`}>
        <Icon size={12} />
        {status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 pb-12">
      {/* Sticky Top Header */}
      <div className="sticky top-0  bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className=" p-2 ">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg  text-slate-900">Customer Directory</h1>
                <div className="flex items-center gap-2 text-xs  text-slate-500 font-medium text-xs ">
                  <span>Manufacturing</span>
                  <ChevronRight size={10} />
                  <span className="text-blue-600">Relationships</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingId(null)
                  setShowCreateModal(true)
                }}
                className="flex items-center gap-2 p-2 bg-slate-900 text-white rounded hover:bg-slate-800  transition-all text-xs "
              >
                <Plus size={18} />
                New Customer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2">
        {/* Alerts */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-xs  text-emerald-900">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <XCircle className="w-5 h-5 text-rose-500" />
            <p className="text-xs  text-rose-900">{error}</p>
          </div>
        )}

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
          <StatCard label="Total Partnerships" value={stats.total} icon={Briefcase} color="blue" trend="12%" />
          <StatCard label="Active Accounts" value={stats.active} icon={CheckCircle2} color="emerald" />
          <StatCard label="Tata Projects" value={stats.tata} icon={Trophy} color="amber" />
          <StatCard label="Other Clients" value={stats.others} icon={Building2} color="slate" />
        </div>

        <Card className=" ">
          <div className="p-0">
            {/* Tabs Header */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1 p-1 bg-slate-50 rounded">
                <button
                  onClick={() => setActiveTab('tata')}
                  className={`flex items-center gap-2 p-2  py-2 rounded text-xs  transition-all ${
                    activeTab === 'tata'
                      ? 'bg-white text-blue-600 '
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Trophy size={14} />
                  Tata Projects
                </button>
                <button
                  onClick={() => setActiveTab('others')}
                  className={`flex items-center gap-2 p-2  py-2 rounded text-xs  transition-all ${
                    activeTab === 'others'
                      ? 'bg-white text-blue-600 '
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Building2 size={14} />
                  Global Clients
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    name="search"
                    placeholder="Search directory..."
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none w-64 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFilterChange}
                    className="bg-slate-50 border border-slate-200 rounded p-2 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending Review</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30">
                  <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
                  <p className="text-xs  text-slate-500 ">Synchronizing Directory...</p>
                </div>
              ) : filteredCustomers.length > 0 ? (
                <table className="w-full text-left bg-white border-collapse bg-white">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="p-2 text-xs  text-slate-500  border-b border-slate-100 nowrap">
                        Entity Profile
                      </th>
                      <th className="p-2 text-xs  text-slate-500  border-b border-slate-100 nowrap">
                        Contact Details
                      </th>
                      <th className="p-2 text-xs  text-slate-500  border-b border-slate-100 nowrap text-center">
                        Account Status
                      </th>
                      <th className="p-2 text-xs  text-slate-500  border-b border-slate-100 nowrap text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.customer_id} className="group hover:bg-blue-50/30 transition-colors">
                        <td className="p-2">
                          <div className="flex items-center gap-4">
                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500  group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                              {customer.customer_name?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <p className="text-xs text-slate-900">{customer.customer_name}</p>
                              <p className="text-xs  text-slate-500  text-xs">ID: {customer.customer_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className=".5">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Mail size={12} className="text-slate-400" />
                              <span className="font-medium">{customer.email || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Phone size={12} className="text-slate-400" />
                              <span className="font-medium">{customer.phone || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          {getStatusBadge(customer.status)}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1 ">
                            <button
                              onClick={() => handleEdit(customer)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                              title="Modify Profile"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(customer.customer_id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-slate-900 rounded">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-22 text-center">
                  <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                    <Users size={32} />
                  </div>
                  <h3 className="text-xs text-slate-900 text-xs">No Connections Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[250px] font-medium leading-relaxed">
                    We couldn't find any customers matching your current search or filter criteria.
                  </p>
                  <button 
                    onClick={() => {
                      setFilters({ search: '', status: '' })
                      setActiveTab('tata')
                    }}
                    className="mt-6 text-xs  text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Pagination Footer (Placeholder) */}
            <div className="p-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs   text-slate-400 ">
                Showing {filteredCustomers.length} of {customers.length} Entries
              </p>
              <div className="flex items-center gap-1">
                {/* Pagination buttons would go here */}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <CreateCustomersModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingId(null)
        }}
        onSuccess={handleCreateSuccess}
        editingId={editingId}
      />
    </div>
  )
}
