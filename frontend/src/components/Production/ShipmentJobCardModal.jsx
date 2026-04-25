import React, { useState, useEffect } from 'react'
import api, { jobCardsAPI, employeesAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import {
  Truck,
  User,
  Calendar,
  Package,
  MapPin,
  Hash,
  Info,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  CheckCircle2,
  FileText
} from 'lucide-react'

export default function ShipmentJobCardModal({
  isOpen,
  onClose,
  onSuccess,
  jobCardId
}) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [jobCard, setJobCard] = useState(null)
  const [salesOrder, setSalesOrder] = useState(null)
  const [operators, setOperators] = useState([])

  const [formData, setFormData] = useState({
    operator_id: '',
    dispatch_date: '',
    notes: '',
    customer_name: '',
    shipping_address: ''
  })

  useEffect(() => {
    if (isOpen && jobCardId) {
      loadData()
    }
  }, [isOpen, jobCardId])

  const loadData = async () => {
    setFetchingData(true)
    setError(null)
    try {
      const [jcRes, empRes] = await Promise.all([
        jobCardsAPI.get(jobCardId),
        employeesAPI.list()
      ])

      const jc = jcRes.data.data || jcRes.data
      setJobCard(jc)
      setOperators(empRes.data.data || empRes.data || [])

      // Try to fetch Sales Order details for customer and address
      if (jc.sales_order_id) {
        try {
          const soRes = await api.get(`/selling/sales-orders/${jc.sales_order_id}`)
          const so = soRes.data.data || soRes.data
          setSalesOrder(so)
          
          setFormData(prev => ({
            ...prev,
            customer_name: so.customer_name || '',
            shipping_address: so.shipping_address || so.billing_address || ''
          }))
        } catch (soErr) {
          console.warn('Failed to fetch sales order details:', soErr)
        }
      }

      setFormData(prev => ({
        ...prev,
        operator_id: jc.operator_id || '',
        dispatch_date: jc.dispatch_date ? jc.dispatch_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: jc.notes || ''
      }))
    } catch (err) {
      console.error('Failed to load job card data:', err)
      setError('Failed to load shipment details')
    } finally {
      setFetchingData(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const payload = {
        operator_id: formData.operator_id,
        dispatch_date: formData.dispatch_date || null,
        status: 'shipped',
        notes: formData.notes,
        is_shipment: true
      }

      await jobCardsAPI.update(jobCardId, payload)
      setSuccess('Shipment updated successfully')
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(null)
      }, 1500)
    } catch (err) {
      console.error('Update failed:', err)
      setError(err.response?.data?.error || err.message || 'Failed to update shipment')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const operatorOptions = operators.map(op => ({
    value: op.employee_id,
    label: `${op.first_name} ${op.last_name}`
  }))

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Shipment Assignment: ${jobCard?.job_card_id}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="p-2">
        {error && <Alert variant="error" className="mb-2">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">{success}</Alert>}

        <div className="space-y-2">
          {/* Read-only Context */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-2 rounded border border-slate-100">
            <div className="col-span-2">
              <h3 className="text-xs  text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Info size={14} />
                Order Context
              </h3>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 ">Customer</label>
              <p className="text-sm font-medium text-slate-900">{formData.customer_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-400 ">Planned Qty</label>
              <p className="text-sm font-medium text-slate-900">{jobCard?.planned_quantity} {jobCard?.uom || 'Nos'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 ">Shipping Address</label>
              <p className="text-xs text-slate-600 line-clamp-2">{formData.shipping_address || 'N/A'}</p>
            </div>
          </div>

          {/* Primary Inputs: Operator and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="block text-sm  text-slate-700 mb-1 flex items-center gap-2">
                <User size={15} className="text-indigo-500" />
                Assigned Operator (Dispatch)
              </label>
              <SearchableSelect
                options={operatorOptions}
                value={formData.operator_id}
                onChange={val => setFormData(prev => ({ ...prev, operator_id: val }))}
                placeholder="Select dispatch operator..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm  text-slate-700 mb-1 flex items-center gap-2">
                <Calendar size={15} className="text-indigo-500" />
                Dispatch Date
              </label>
              <input
                type="date"
                name="dispatch_date"
                value={formData.dispatch_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            icon={<Truck size={18} />}
          >
            Confirm Dispatch
          </Button>
        </div>
      </form>
    </Modal>
  )
}
