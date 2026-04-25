import React, { useState, useEffect } from 'react'
import { Truck, Search, Download, RefreshCcw, Package, CheckCircle, Clock, AlertTriangle, List, LayoutGrid } from 'lucide-react'
import { getProjectDispatchReport, getIndividualDispatches } from '../../services/adminService'
import DataTable from '../../components/Table/DataTable'

export default function Dispatched() {
  const [data, setData] = useState([])
  const [individualData, setIndividualDispatches] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('summary')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [summaryRes, individualRes] = await Promise.all([
        getProjectDispatchReport(),
        getIndividualDispatches()
      ])
      
      if (summaryRes.success) {
        setData(summaryRes.data)
      }
      if (individualRes.success) {
        setIndividualDispatches(individualRes.data)
      }
    } catch (err) {
      console.error('Error fetching dispatch report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const sourceData = activeTab === 'summary' ? data : individualData
    let filtered = sourceData

    if (activeTab === 'summary') {
      if (statusFilter !== 'all') {
        filtered = filtered.filter(item => item.dispatch_status === statusFilter)
      }
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase()
        filtered = filtered.filter(item => 
          (item.project_name || '').toLowerCase().includes(lowerSearch) ||
          (item.customer_name || '').toLowerCase().includes(lowerSearch) ||
          (item.sales_order_id || '').toLowerCase().includes(lowerSearch)
        )
      }
    } else {
      if (statusFilter !== 'all') {
        // Map project status filter to delivery note status if needed, 
        // but for now let's keep status filter simple or only for summary
        // filtered = filtered.filter(item => item.status === statusFilter)
      }
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase()
        filtered = filtered.filter(item => 
          (item.delivery_note_id || '').toLowerCase().includes(lowerSearch) ||
          (item.project_name || '').toLowerCase().includes(lowerSearch) ||
          (item.customer_name || '').toLowerCase().includes(lowerSearch) ||
          (item.sales_order_id || '').toLowerCase().includes(lowerSearch) ||
          (item.driver_name || '').toLowerCase().includes(lowerSearch)
        )
      }
    }
    setFilteredData(filtered)
  }, [searchTerm, statusFilter, data, individualData, activeTab])

  const getStatusColor = (status) => {
    switch (status) {
      case 'Fully Dispatched':
      case 'delivered': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'Partially Dispatched':
      case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const summaryColumns = [
    {
      label: 'Project Details',
      key: 'project_name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.project_name || 'N/A'}</span>
          <span className="text-[10px] text-slate-500">SO: {row.sales_order_id}</span>
        </div>
      )
    },
    {
      label: 'Customer',
      key: 'customer_name',
      render: (val) => <span className="text-slate-600">{val}</span>
    },
    {
      label: 'Order Qty',
      key: 'total_qty',
      render: (val) => <span className="font-medium text-slate-900">{val}</span>
    },
    {
      label: 'Dispatched Qty',
      key: 'dispatched_qty',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-600">{val}</span>
          <div className="w-16 h-1.5 bg-slate-100 rounded overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ width: `${Math.min(100, (val / row.total_qty) * 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'dispatch_status',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-medium ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    },
    {
      label: 'Last Dispatch',
      key: 'last_dispatch_date',
      render: (val) => (
        <span className="text-slate-500 text-xs">
          {val ? new Date(val).toLocaleDateString() : 'No dispatch yet'}
        </span>
      )
    }
  ]

  const individualColumns = [
    {
      label: 'Dispatch ID',
      key: 'delivery_note_id',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs  text-slate-700">{val}</span>
          {row.job_card_id && <span className="text-[9px] text-slate-400">JC: {row.job_card_id}</span>}
        </div>
      )
    },
    {
      label: 'Project / SO',
      key: 'project_name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.project_name || 'N/A'}</span>
          <span className="text-[10px] text-slate-500">SO: {row.sales_order_id}</span>
        </div>
      )
    },
    {
      label: 'Date',
      key: 'delivery_date',
      render: (val) => <span className="text-xs text-slate-600">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      label: 'Quantity',
      key: 'quantity',
      render: (val) => <span className=" text-indigo-600">{val}</span>
    },
    {
      label: 'Logistics',
      key: 'driver_name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs text-slate-700">{val || 'N/A'}</span>
          <span className="text-[10px] text-slate-400">{row.vehicle_info}</span>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] border font-medium ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    }
  ]

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl  text-slate-900 flex items-center gap-2">
            <Truck className="text-blue-600" size={24} />
            Dispatch Intelligence
          </h1>
          <p className="text-xs text-slate-500">Monitor production-to-inventory dispatch workflows</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
          <button className="flex items-center gap-2 p-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 shadow-sm">
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <CheckCircle size={15} />
            </div>
            <span className="text-sm text-slate-500">Fully Dispatched</span>
          </div>
          <h3 className="text-xl  text-slate-900">
            {data.filter(p => p.dispatch_status === 'Fully Dispatched').length}
          </h3>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded">
              <Package size={15} />
            </div>
            <span className="text-sm text-slate-500">Partially Dispatched</span>
          </div>
          <h3 className="text-xl  text-slate-900">
            {data.filter(p => p.dispatch_status === 'Partially Dispatched').length}
          </h3>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-50 text-slate-600 rounded">
              <Clock size={15} />
            </div>
            <span className="text-sm text-slate-500">Units in Transit</span>
          </div>
          <h3 className="text-xl  text-slate-900">
            {individualData.reduce((sum, d) => sum + (parseFloat(d.quantity) || 0), 0).toFixed(0)}
          </h3>
        </div>
      </div>

      <div className="">
        <div className="p-2 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded ">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 p-2 rounded text-xs  transition-all ${
                activeTab === 'summary' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={14} />
              Project Summary
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 p-2 rounded text-xs  transition-all ${
                activeTab === 'individual' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
              All Dispatch Units
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="text" 
                placeholder={activeTab === 'summary' ? "Search by project, customer or SO#" : "Search by Dispatch ID, SO, Driver..."}
                className="w-full pl-9 pr-4 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {activeTab === 'summary' && (
              <div className="flex gap-1 bg-slate-50 p-1 rounded border border-slate-200">
                {['all', 'Fully Dispatched', 'Partially Dispatched'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded text-[10px]  uppercase tracking-wider transition-all ${
                      statusFilter === status 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-200/50'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.replace(' Dispatched', '')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DataTable 
          columns={activeTab === 'summary' ? summaryColumns : individualColumns}
          data={filteredData}
          loading={loading}
          pagination={true}
          pageSize={10}
        />
      </div>
    </div>
  )
}
