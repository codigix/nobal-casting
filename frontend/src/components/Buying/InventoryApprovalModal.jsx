import { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { CheckCircle, AlertCircle, Truck, User, Package, XCircle, TrendingUp, Info } from 'lucide-react'
import { grnRequestsAPI, itemsAPI } from '../../services/api'

export default function InventoryApprovalModal({ grn, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [itemRates, setItemRates] = useState({})

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
          }
        } catch (err) {
          console.error('Error fetching valuation rates:', err)
        }
      }
      fetchValuationRates()
    }
  }, [grn])

  const handleApprove = async () => {
    setLoading(true)
    setError(null)

    try {
      const approvedItems = (grn.items || []).filter(item => item.accepted_qty > 0).map(item => ({
        id: item.id,
        accepted_qty: parseFloat(item.accepted_qty || 0),
        rejected_qty: parseFloat(item.rejected_qty || 0),
        warehouse_name: item.warehouse_name || 'Main Warehouse',
        valuation_rate: parseFloat(item.valuation_rate || itemRates[item.item_code] || item.rate || 0),
        qc_status: item.qc_status || 'pass',
        bin_rack: item.bin_rack || null
      }))

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

  const acceptedItems = grn.items?.filter(item => parseFloat(item.accepted_qty || 0) > 0) || []
  const totalAccepted = acceptedItems.reduce((sum, item) => sum + (parseFloat(item.accepted_qty) || 0), 0)
  const totalRejected = grn.items?.reduce((sum, item) => sum + (parseFloat(item.rejected_qty) || 0), 0) || 0

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Inventory Storage Approval" 
      size="3xl"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="success"
            onClick={handleApprove}
            loading={loading}
          >
            <CheckCircle size={16} className="mr-2" />
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

        {/* GRN Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-neutral-400" />
              <p className="text-[10px] text-neutral-500  uppercase tracking-wider">PO Number</p>
            </div>
            <p className=" text-neutral-800">{grn.po_no}</p>
          </div>

          <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <User size={14} className="text-neutral-400" />
              <p className="text-[10px] text-neutral-500  uppercase tracking-wider">Supplier</p>
            </div>
            <p className=" text-neutral-800 truncate" title={grn.supplier_name}>{grn.supplier_name}</p>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} className="text-emerald-500" />
              <p className="text-[10px] text-emerald-600  uppercase tracking-wider">Accepted</p>
            </div>
            <p className=" text-emerald-700">{totalAccepted}</p>
          </div>

          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <XCircle size={14} className="text-red-500" />
              <p className="text-[10px] text-red-600  uppercase tracking-wider">Rejected</p>
            </div>
            <p className=" text-red-700">{totalRejected}</p>
          </div>
        </div>

        {/* Total Valuation */}
        <div className="bg-primary-600 rounded p-2 text-white flex justify-between items-center shadow-md shadow-primary-100">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary-700 rounded-lg">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-primary-100 text-xs  uppercase tracking-wider">Total Valuation Value</p>
              <p className="text-xl text-white">
                ₹{acceptedItems.reduce((sum, item) => sum + (parseFloat(item.accepted_qty || 0) * parseFloat(item.valuation_rate || itemRates[item.item_code] || item.rate || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="bg-primary-700 text-primary-50 px-3 py-1 rounded-full text-[10px]  uppercase tracking-wider">
              {acceptedItems.length} Items Ready
            </span>
          </div>
        </div>

        {/* Items Table */}
        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
            <h4 className="font-semibold text-neutral-800 flex items-center gap-2 text-sm">
              <Package size={16} className="text-primary-600" /> Items for Storage
            </h4>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Item Details</th>
                  <th className="px-4 py-3 font-semibold text-center w-32">Accepted</th>
                  <th className="px-4 py-3 font-semibold text-right w-40">Valuation Rate</th>
                  <th className="px-4 py-3 font-semibold w-48">Warehouse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {acceptedItems.length > 0 ? (
                  acceptedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{item.item_code}</div>
                        <div className="text-[10px] text-neutral-500 uppercase truncate max-w-[250px]">{item.item_name}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs  bg-emerald-100 text-emerald-700">
                          {item.accepted_qty}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-700">
                        ₹{parseFloat(item.valuation_rate || itemRates[item.item_code] || item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs  border border-blue-100 w-fit">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          {item.warehouse_name}
                        </div>
                        {item.batch_no && (
                          <div className="text-[10px] text-neutral-400 mt-1 italic">
                            Batch: {item.batch_no}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-neutral-400 italic">
                      No items accepted for storage.
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
            <p className=" text-sky-900 text-sm">Automated Stock Updates</p>
            <p className="text-xs text-sky-800 leading-relaxed mt-1">
              Approving this storage will automatically create <strong>Stock Ledger</strong> entries and update the <strong>Stock Balance</strong> for {acceptedItems.length} item{acceptedItems.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}
