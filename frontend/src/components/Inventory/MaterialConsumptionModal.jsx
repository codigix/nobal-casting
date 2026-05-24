import React, { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import { 
  Package, Info, AlertTriangle, CheckCircle, 
  Search, Download, RefreshCcw, Box
} from 'lucide-react'
import { getProjectDetailedMaterialReport } from '../../services/adminService'
import DataTable from '../Table/DataTable'

export default function MaterialConsumptionModal({ project, onClose }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchData = async () => {
    if (!project?.sales_order_id) return
    try {
      setLoading(true)
      const res = await getProjectDetailedMaterialReport(project.sales_order_id)
      if (res.success) {
        setData(res.data)
      }
    } catch (err) {
      console.error('Error fetching detailed material report:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [project])

  const filteredData = data.filter(item => 
    (item.item_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const columns = [
    {
      label: 'Item Details',
      key: 'item_code',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.item_name || 'N/A'}</span>
          <span className="text-xs text-slate-500 font-mono">{val}</span>
        </div>
      )
    },
    {
      label: 'Allocated',
      key: 'allocated_qty',
      render: (val) => <span className="font-medium text-slate-700">{parseFloat(val || 0).toLocaleString()}</span>
    },
    {
      label: 'Consumed',
      key: 'consumed_qty',
      render: (val, row) => (
        <div className="flex flex-col gap-1 min-w-[120px]">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-indigo-600">{parseFloat(val || 0).toLocaleString()}</span>
            <span className="text-slate-400">{row.allocated_qty > 0 ? Math.round((val / row.allocated_qty) * 100) : 0}%</span>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500" 
              style={{ width: `${Math.min(100, row.allocated_qty > 0 ? (val / row.allocated_qty) * 100 : 0)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      label: 'Remaining',
      key: 'remaining_qty',
      render: (val) => (
        <span className={`font-medium ${(val || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
          {parseFloat(val || 0).toLocaleString()}
        </span>
      )
    },
    {
      label: 'Status',
      key: 'consumed_qty',
      render: (val, row) => {
        const percent = row.allocated_qty > 0 ? (val / row.allocated_qty) * 100 : 0
        if (percent >= 100) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">COMPLETE</span>
        if (percent > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 border border-blue-200 font-medium">IN PROGRESS</span>
        return <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-500 border border-slate-200 font-medium">PENDING</span>
      }
    }
  ]

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Material Consumption: ${project?.project_name || project?.sales_order_id}`}
      size="xl"
      footer={
        <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
                <Info size={14} className="text-indigo-400" />
                Actual consumption tracks received material issues
            </div>
            <Button variant="secondary" onClick={onClose}>Close Report</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-blue-50 rounded border border-blue-100">
            <div className="text-[10px] text-blue-600 uppercase font-bold tracking-wider mb-1">Total Allocated</div>
            <div className="text-lg font-bold text-blue-900">{parseFloat(project?.allocated_qty || 0).toLocaleString()} units</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded border border-indigo-100">
            <div className="text-[10px] text-indigo-600 uppercase font-bold tracking-wider mb-1">Total Consumed</div>
            <div className="text-lg font-bold text-indigo-900">{parseFloat(project?.consumed_qty || 0).toLocaleString()} units</div>
          </div>
          <div className="p-3 bg-amber-50 rounded border border-amber-100">
            <div className="text-[10px] text-amber-600 uppercase font-bold tracking-wider mb-1">Total Remaining</div>
            <div className="text-lg font-bold text-amber-900">{parseFloat(project?.remaining_qty || 0).toLocaleString()} units</div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center justify-between gap-4 py-2">
            <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Search items..."
                    className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2">
                <button onClick={fetchData} className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600">
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
        </div>

        {/* Detailed Table */}
        <div className="border border-slate-100 rounded overflow-hidden">
            <DataTable 
                columns={columns}
                data={filteredData}
                loading={loading}
                pagination={true}
                pageSize={8}
            />
        </div>

        {filteredData.some(d => d.allocated_qty === 0 && d.consumed_qty > 0) && (
            <div className="p-2 bg-rose-50 border border-rose-100 rounded flex items-center gap-2 text-rose-700 text-[10px]">
                <AlertTriangle size={14} />
                <span>Found items consumed without prior allocation. Please review the material issue records.</span>
            </div>
        )}
      </div>
    </Modal>
  )
}
