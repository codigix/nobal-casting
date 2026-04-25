import React, { useState, useEffect } from 'react'
import { Package, Search, Download, RefreshCcw, Box, PieChart, Info, AlertTriangle, CheckCircle } from 'lucide-react'
import { getProjectMaterialReport } from '../../services/adminService'
import DataTable from '../../components/Table/DataTable'

export default function ConsumeMaterial() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await getProjectMaterialReport()
      if (res.success) {
        setData(res.data)
        setFilteredData(res.data)
      }
    } catch (err) {
      console.error('Error fetching material report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = data
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        (item.project_name || '').toLowerCase().includes(lowerSearch) ||
        (item.customer_name || '').toLowerCase().includes(lowerSearch) ||
        (item.sales_order_id || '').toLowerCase().includes(lowerSearch)
      )
    }
    setFilteredData(filtered)
  }, [searchTerm, data])

  const getConsumptionStatus = (consumed, allocated) => {
    if (allocated === 0) return 'No Allocation'
    const percent = (consumed / allocated) * 100
    if (percent >= 100) return 'Fully Consumed'
    if (percent > 0) return 'Partially Consumed'
    return 'Not Consumed'
  }

  const columns = [
    {
      label: 'Project Details',
      key: 'project_name',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.project_name || 'N/A'}</span>
          <span className="text-xs text-slate-500">SO: {row.sales_order_id}</span>
        </div>
      )
    },
    {
      label: 'Customer',
      key: 'customer_name',
      render: (val) => <span className="text-slate-600">{val}</span>
    },
    {
      label: 'Allocated Material',
      key: 'allocated_qty',
      render: (val) => <span className="font-medium text-slate-700">{(val || 0).toLocaleString()} units</span>
    },
    {
      label: 'Consumed Material',
      key: 'consumed_qty',
      render: (val, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs">
            <span className=" text-indigo-600">{(val || 0).toLocaleString()} units</span>
            <span className="text-slate-400">{row.allocated_qty > 0 ? Math.round((val / row.allocated_qty) * 100) : 0}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500" 
              style={{ width: `${Math.min(100, row.allocated_qty > 0 ? (val / row.allocated_qty) * 100 : 0)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      label: 'Remaining Material',
      key: 'remaining_qty',
      render: (val) => (
        <span className={`font-medium ${(val || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          {(val || 0).toLocaleString()} units
        </span>
      )
    },
    {
      label: 'Status',
      key: 'consumed_qty',
      render: (val, row) => {
        const status = getConsumptionStatus(val, row.allocated_qty)
        let colors = 'bg-slate-100 text-slate-600'
        if (status === 'Fully Consumed') colors = 'bg-emerald-100 text-emerald-700 border-emerald-200'
        if (status === 'Partially Consumed') colors = 'bg-blue-100 text-blue-700 border-blue-200'
        
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${colors}`}>
            {status}
          </span>
        )
      }
    }
  ]

  const totalAllocated = data.reduce((sum, item) => sum + item.allocated_qty, 0)
  const totalConsumed = data.reduce((sum, item) => sum + item.consumed_qty, 0)
  const totalRemaining = data.reduce((sum, item) => sum + item.remaining_qty, 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl  text-slate-900 flex items-center gap-2">
            <Package className="text-indigo-600" size={24} />
            Project Material Consumption
          </h1>
          <p className="text-sm text-slate-500">Monitor material allocation vs actual usage across projects</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={15} />
            Refresh
          </button>
          <button className="flex items-center gap-2 p-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 shadow-indigo-100">
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded">
              <Box size={15} />
            </div>
            <span className="text-sm text-slate-500">Total Allocated</span>
          </div>
          <h3 className="text-xl  text-slate-900">{totalAllocated.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1  ">Gross planned material</p>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
              <RefreshCcw size={15} />
            </div>
            <span className="text-sm text-slate-500">Total Consumed</span>
          </div>
          <h3 className="text-xl  text-slate-900">{totalConsumed.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1  ">{totalAllocated > 0 ? Math.round((totalConsumed / totalAllocated) * 100) : 0}% Overall utilization</p>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded">
              <PieChart size={15} />
            </div>
            <span className="text-sm text-slate-500">Total Remaining</span>
          </div>
          <h3 className="text-xl  text-slate-900">{totalRemaining.toLocaleString()}</h3>
          <p className="text-xs text-slate-400 mt-1  ">Pending for issuance</p>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
              <CheckCircle size={15} />
            </div>
            <span className="text-sm text-slate-500">Efficiency</span>
          </div>
          <h3 className="text-xl  text-slate-900">{totalAllocated > 0 ? Math.round((totalConsumed / totalAllocated) * 100) : 100}%</h3>
          <p className="text-xs text-slate-400 mt-1  ">Consumption index</p>
        </div>
      </div>

      <div className="">
        <div className=" border-b border-slate-100 flex my-5 flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by project, customer or SO#"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 italic">
            <Info size={14} className="text-indigo-400" />
            Consumption based on completed material issues
          </div>
        </div>

        <DataTable 
          columns={columns}
          data={filteredData}
          loading={loading}
          pagination={true}
          pageSize={10}
        />
      </div>
      
      {totalRemaining > (totalAllocated * 0.5) && (
        <div className="mt-4 p-2 bg-amber-50 border border-amber-200 rounded flex items-center gap-3 text-amber-700 text-xs">
          <AlertTriangle size={18} />
          <span>High volume of allocated material remains unconsumed. Ensure production plans are updated and material issues are being recorded.</span>
        </div>
      )}
    </div>
  )
}
