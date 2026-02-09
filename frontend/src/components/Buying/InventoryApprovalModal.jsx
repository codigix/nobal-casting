import { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { CheckCircle, AlertCircle, Truck, User, Package, XCircle, TrendingUp, Info, MapPin, ClipboardCheck, Save } from 'lucide-react'
import { grnRequestsAPI, itemsAPI } from '../../services/api'

export default function InventoryApprovalModal({ grn, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [itemRates, setItemRates] = useState({})
  const [approvalItems, setApprovalItems] = useState([])
  const [storageData, setStorageData] = useState({})

  useEffect(() => {
    if (grn?.items?.length > 0) {
      const fetchValuationRates = async () => {
        try {
          const itemCodes = grn.items.map(i => i.item_code).join(',')
          const response = await itemsAPI.list({ item_codes: itemCodes })
          if (response.data.success) {
            const ratesMap = {}
            response.data.data.forEach(item => {
              ratesMap[item.item_code] = item.valuation_rate || 0
            })
            setItemRates(ratesMap)
            
            // Initialize storage data with fetched rates
            const initialStorage = {}
            grn.items.forEach(item => {
              initialStorage[item.id] = {
                valuation_rate: ratesMap[item.item_code] || item.rate || 0,
                bin_rack: item.bin_rack || '',
                batch_no: item.batch_no || ''
              }
            })
            setStorageData(initialStorage)
          }
        } catch (err) {
          console.error('Error fetching valuation rates:', err)
        }
      }
      fetchValuationRates()

      // Initialize approval items
      setApprovalItems(grn.items.map(item => ({
        id: item.id,
        accepted_qty: parseFloat(item.accepted_qty || item.received_qty || 0),
        rejected_qty: parseFloat(item.rejected_qty || 0),
        qc_status: item.qc_status || 'pass'
      })))
    }
  }, [grn])

  const handleApprovalItemChange = (itemId, field, value) => {
    setApprovalItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, [field]: field === 'qc_status' ? value : parseFloat(value || 0) } : item
    ))
  }

  const handleStorageDataChange = (itemId, field, value) => {
    setStorageData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === 'valuation_rate' ? parseFloat(value || 0) : value
      }
    }))
  }

  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      const approvedItems = approvalItems.map(item => {
        const storage = storageData[item.id] || {}
        const grnItem = grn.items.find(gi => gi.id === item.id)
        
        return {
          id: item.id,
          accepted_qty: item.accepted_qty,
          rejected_qty: item.rejected_qty,
          qc_status: item.qc_status,
          warehouse_name: grnItem?.warehouse_name || 'Main Warehouse',
          valuation_rate: storage.valuation_rate || 0,
          bin_rack: storage.bin_rack || null,
          batch_no: storage.batch_no || null
        }
      })

      const response = await grnRequestsAPI.inventoryApprove(grn.id, { approvedItems })

      if (response.data.success) {
        onSuccess?.(response.data.data)
        onClose()
      } else {
        setError(response.data.error || 'Failed to approve GRN')
      }
    } catch (err) {
      console.error('Inventory approval error:', err)
      setError(err.response?.data?.error || 'Error approving GRN')
    } finally {
      setLoading(false)
    }
  }

  const totalAccepted = approvalItems.reduce((sum, item) => sum + (item.accepted_qty || 0), 0)
  const totalRejected = approvalItems.reduce((sum, item) => sum + (item.rejected_qty || 0), 0) || 0
  const totalValuation = approvalItems.reduce((sum, item) => {
    const rate = storageData[item.id]?.valuation_rate || 0
    return sum + (item.accepted_qty * rate)
  }, 0)

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title={`Inventory Storage Approval - ${grn.grn_no}`} 
      size="5xl"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="success"
            onClick={handleApprove}
            loading={loading}
          >
            <Save size={16} className="mr-2" />
            Approve & Store Stock
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <Alert variant="danger">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        {/* GRN Summary & Valuation */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-neutral-400" />
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Reference</p>
            </div>
            <p className="text-sm font-bold text-neutral-800">PO: {grn.po_no}</p>
            <p className="text-[10px] text-neutral-500 truncate" title={grn.supplier_name}>{grn.supplier_name}</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-emerald-500" />
              <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Total Accepted</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">{totalAccepted}</p>
          </div>

          <div className="md:col-span-2 p-4 bg-primary-600 rounded-xl text-white shadow-lg shadow-primary-100 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-primary-100" />
                <p className="text-[10px] text-primary-100 uppercase tracking-wider">Total Valuation Value</p>
              </div>
              <p className="text-2xl font-bold">
                ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-primary-700/50 px-3 py-1 rounded-full text-[10px] uppercase font-bold">
              {approvalItems.length} Items Ready
            </div>
          </div>
        </div>

        {/* Unified Items Table */}
        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
          <div className="p-2  bg-neutral-50 border-b border-neutral-200 flex justify-between items-center">
            <h4 className="font-bold text-neutral-800 flex items-center gap-2 text-sm">
              <ClipboardCheck size={16} className="text-primary-600" /> 
              Material Receipt & Storage Assignment
            </h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="p-2  min-w-[180px]">Item Details</th>
                  <th className="px-2 py-3 text-center w-20">Recv.</th>
                  <th className="px-2 py-3 text-center w-24">Accept</th>
                  <th className="px-2 py-3 text-center w-24">Reject</th>
                  <th className="px-2 py-3 text-center w-28">QC Status</th>
                  <th className="px-2 py-3 w-32">Warehouse</th>
                  <th className="px-2 py-3 w-32">Bin/Rack</th>
                  <th className="px-2 py-3 w-32">Batch #</th>
                  <th className="p-2  text-right w-32">Rate (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {approvalItems.length > 0 ? (
                  approvalItems.map((item) => {
                    const grnItem = grn.items.find(gi => gi.id === item.id) || {}
                    const storage = storageData[item.id] || {}
                    return (
                      <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-2 ">
                          <div className="font-bold text-neutral-900">{grnItem.item_code}</div>
                          <div className="text-[10px] text-neutral-400 font-medium truncate max-w-[150px]">{grnItem.item_name}</div>
                        </td>
                        <td className="px-2 py-3 text-center font-bold text-neutral-700 bg-neutral-50/30">
                          {grnItem.received_qty}
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min="0"
                            max={grnItem.received_qty}
                            value={item.accepted_qty || 0}
                            onChange={(e) => handleApprovalItemChange(item.id, 'accepted_qty', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-center font-bold text-primary-600 focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="number"
                            min="0"
                            max={grnItem.received_qty}
                            value={item.rejected_qty || 0}
                            onChange={(e) => handleApprovalItemChange(item.id, 'rejected_qty', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-center font-bold text-red-500 focus:ring-2 focus:ring-red-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <select
                            value={item.qc_status || 'pass'}
                            onChange={(e) => handleApprovalItemChange(item.id, 'qc_status', e.target.value)}
                            className={`w-full px-2 py-1.5 border rounded text-[10px] font-bold outline-none cursor-pointer transition-colors ${
                              item.qc_status === 'fail' ? 'bg-red-50 border-red-200 text-red-600' : 
                              item.qc_status === 'rework' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                              'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}
                          >
                            <option value="pass">PASS</option>
                            <option value="fail">FAIL</option>
                            <option value="rework">REWORK</option>
                          </select>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 w-fit text-[10px] font-bold">
                            <MapPin size={10} />
                            {grnItem.warehouse_name || 'Main'}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            placeholder="Bin/Rack"
                            value={storage.bin_rack || ''}
                            onChange={(e) => handleStorageDataChange(item.id, 'bin_rack', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-[10px] focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input
                            type="text"
                            placeholder="Batch #"
                            value={storage.batch_no || grnItem.batch_no || ''}
                            onChange={(e) => handleStorageDataChange(item.id, 'batch_no', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-[10px] focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </td>
                        <td className="p-2  text-right">
                          <input
                            type="number"
                            placeholder="0.00"
                            value={storage.valuation_rate || ''}
                            onChange={(e) => handleStorageDataChange(item.id, 'valuation_rate', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded text-right font-bold text-neutral-700 focus:ring-2 focus:ring-primary-500 outline-none"
                          />
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-4 py-12 text-center text-neutral-400 italic">
                      No items found for storage.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Info Banner */}
        <div className="flex gap-4 p-4 bg-sky-50 border border-sky-100 rounded-xl items-start">
          <div className="p-2 bg-sky-100 rounded-lg">
            <Info size={20} className="text-sky-700" />
          </div>
          <div>
            <p className="font-bold text-sky-900 text-sm">Automated Stock Updates</p>
            <p className="text-xs text-sky-800 leading-relaxed mt-1">
              Approving this storage will automatically create <strong>Stock Ledger</strong> entries and update the <strong>Stock Balance</strong> for {approvalItems.length} item{approvalItems.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

