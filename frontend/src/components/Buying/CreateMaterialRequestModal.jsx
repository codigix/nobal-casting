import React, { useState, useEffect } from 'react'
import api, { 
  materialRequestsAPI, 
  employeesAPI, 
  itemsAPI, 
  stockAPI 
} from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, Warehouse, Package, Calendar, User, 
  FileText, RefreshCw, ArrowRight, Building, ClipboardList, 
  Clock, CheckCircle2, Trash2, Info
} from 'lucide-react'

export default function CreateMaterialRequestModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    series_no: '',
    transition_date: new Date().toISOString().split('T')[0],
    requested_by_id: '',
    department: '',
    purpose: 'purchase',
    required_by_date: '',
    target_warehouse: '',
    source_warehouse: '',
    items_notes: '',
    items: []
  })

  const [items, setItems] = useState([])
  const [stockItems, setStockItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [newItem, setNewItem] = useState({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      await Promise.all([
        fetchItems(),
        fetchDepartments(),
        fetchEmployees(),
        fetchWarehouses(),
        generateSeriesNumber()
      ])
    } catch (err) {
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.list()
      const itemsData = response.data.data || response.data || []
      setItems(itemsData)
      
      // Filtering for raw materials if purpose is issue
      const stockRes = itemsData.filter(item => item.item_type === 'Raw Material')
      setStockItems(stockRes.length > 0 ? stockRes : itemsData)
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/masters/departments')
      if (response.data.success) {
        setDepartments(response.data.data)
      } else {
        setDepartments(['Production', 'Maintenance', 'Store', 'Quality', 'Purchase'])
      }
    } catch (err) {
      setDepartments(['Production', 'Maintenance', 'Store', 'Quality', 'Purchase'])
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.list()
      setEmployees(response.data.data || response.data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await stockAPI.warehouses()
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const generateSeriesNumber = async () => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const seriesNo = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random}`
    setFormData(prev => ({ ...prev, series_no: seriesNo }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'department') {
      const isProduction = ['Production', 'Manufacturing'].includes(value)
      const purpose = isProduction ? 'material_issue' : 'purchase'
      setFormData(prev => ({ 
        ...prev, 
        department: value,
        purpose: purpose,
        requested_by_id: '',
        source_warehouse: '',
        target_warehouse: ''
      }))
    } else if (name === 'purpose') {
      setFormData(prev => ({ 
        ...prev, 
        purpose: value,
        source_warehouse: '',
        target_warehouse: ''
      }))
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.qty || newItem.qty <= 0) {
      setError('Please select item and enter valid quantity')
      return
    }

    const itemExists = formData.items.some((i, index) => 
      i.item_code === newItem.item_code && index !== editingItemIndex
    )

    if (itemExists) {
      setError('Item already added to the list')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = { ...newItem }
      setFormData({ ...formData, items: updatedItems })
      setEditingItemIndex(null)
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { ...newItem, id: Date.now() }]
      })
    }

    setNewItem({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
    setError(null)
  }

  const handleEditItem = (index) => {
    setEditingItemIndex(index)
    setNewItem(formData.items[index])
  }

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: updatedItems })
    if (editingItemIndex === index) {
      setEditingItemIndex(null)
      setNewItem({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
    }
  }

  const handleSubmit = async (status = 'draft') => {
    if (!formData.requested_by_id || !formData.department || formData.items.length === 0 || !formData.required_by_date) {
      setError('Please fill all required fields (*) and add at least one item')
      return
    }

    if (formData.purpose === 'material_issue' && !formData.source_warehouse) {
      setError('Source warehouse is required for Material Issue')
      return
    }

    if (formData.purpose === 'material_transfer' && (!formData.source_warehouse || !formData.target_warehouse)) {
      setError('Both source and target warehouses are required for Material Transfer')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        status,
        items: formData.items.map(({ id, ...item }) => item)
      }

      await materialRequestsAPI.create(submitData)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create material request')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      series_no: '',
      transition_date: new Date().toISOString().split('T')[0],
      requested_by_id: '',
      department: '',
      purpose: 'purchase',
      required_by_date: '',
      target_warehouse: '',
      source_warehouse: '',
      items_notes: '',
      items: []
    })
    setError(null)
    setNewItem({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
    setEditingItemIndex(null)
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create Material Request" 
      size="5xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={loading || formData.items.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />}
              Save as Draft
            </Button>
            <Button
              variant="primary"
              onClick={() => handleSubmit('pending')}
              disabled={loading || formData.items.length === 0}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Submit Request
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {error && <Alert type="danger">{error}</Alert>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Configuration */}
          <div className="lg:col-span-1 space-y-2">
            <div className="bg-neutral-50 rounded border border-neutral-200 p-2 space-y-2">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
                <div className="p-2 bg-blue-500 rounded  text-white">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h3 className="text-xs  text-neutral-800 ">Request Details</h3>
                  <p className="text-[10px] text-neutral-500 font-medium">Define MR basic parameters</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                    <Building size={12} /> Department <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                    <User size={12} /> Requested By <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="requested_by_id"
                    value={formData.requested_by_id}
                    onChange={handleChange}
                    disabled={!formData.department}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none disabled:bg-neutral-100 transition-all"
                  >
                    <option value="">{formData.department ? 'Select Requester' : 'Select Dept First'}</option>
                    {employees
                      .filter(emp => emp.department?.toLowerCase() === formData.department?.toLowerCase())
                      .map(emp => (
                        <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))
                    }
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                    <Calendar size={12} /> Required By <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    name="required_by_date"
                    value={formData.required_by_date}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>

                <div className="pt-2">
                  <label className="text-[11px]  text-neutral-500  mb-2 block">Purpose</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'purchase', label: 'Purchase Request', icon: <Package size={14} />, color: 'blue' },
                      { id: 'material_transfer', label: 'Internal Transfer', icon: <Warehouse size={14} />, color: 'purple' },
                      { id: 'material_issue', label: 'Material Issue', icon: <ArrowRight size={14} />, color: 'amber' }
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleChange({ target: { name: 'purpose', value: p.id } })}
                        className={`
                          flex items-center gap-3 p-3 border rounded  transition-all text-left
                          ${formData.purpose === p.id 
                            ? `border-${p.color}-500 bg-${p.color}-50 text-${p.color}-700  ` 
                            : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}
                        `}
                      >
                        <div className={`p-1.5 rounded  ${formData.purpose === p.id ? `bg-${p.color}-500 text-white` : 'bg-neutral-100'}`}>
                          {p.icon}
                        </div>
                        <span className="text-xs ">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {(formData.purpose === 'material_transfer' || formData.purpose === 'material_issue') && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                      <Warehouse size={12} /> Source Warehouse <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="source_warehouse"
                      value={formData.source_warehouse}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    >
                      <option value="">Select Source Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.warehouse_name}>{w.warehouse_name}</option>)}
                    </select>
                  </div>
                )}

                {(formData.purpose === 'material_transfer' || formData.purpose === 'purchase') && (
                  <div className="space-y-1.5">
                    <label className="text-[11px]  text-neutral-500  flex items-center gap-1">
                      <Warehouse size={12} /> Target Warehouse
                    </label>
                    <select 
                      name="target_warehouse"
                      value={formData.target_warehouse}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    >
                      <option value="">Select Target Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.warehouse_name}>{w.warehouse_name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Items Table */}
          <div className="lg:col-span-2 space-y-2">
            <div className="bg-white rounded  border border-neutral-200   overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded ">
                    <Package size={16} />
                  </div>
                  <h3 className="text-sm  text-neutral-800">Requested Items</h3>
                </div>
                <Badge variant="blue" className="px-2.5 py-1 text-[10px]">
                  {formData.items.length} Items Total
                </Badge>
              </div>

              <div className="p-5">
                {/* Item Entry Form */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-6 bg-neutral-50 p-4 rounded  border border-neutral-200">
                  <div className="md:col-span-5 space-y-1.5">
                    <label className="text-[10px]  text-neutral-400 ">Item <span className="text-red-500">*</span></label>
                    <select
                      value={newItem.item_code}
                      onChange={(e) => {
                        const item = items.find(i => i.item_code === e.target.value)
                        setNewItem({ 
                          ...newItem, 
                          item_code: e.target.value, 
                          item_name: item ? (item.item_name || item.name) : '',
                          uom: item ? item.uom : 'pcs'
                        })
                      }}
                      className="w-full p-2 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
                    >
                      <option value="">Select Item</option>
                      {(formData.purpose === 'material_issue' ? stockItems : items).map(i => (
                        <option key={i.item_code} value={i.item_code}>{i.item_code} - {i.item_name || i.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-[10px]  text-neutral-400 ">Quantity <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={newItem.qty}
                      onChange={(e) => setNewItem({ ...newItem, qty: parseFloat(e.target.value) })}
                      placeholder="Qty"
                      className="w-full p-2 bg-white border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px]  text-neutral-400 ">UOM</label>
                    <input
                      type="text"
                      value={newItem.uom}
                      readOnly
                      className="w-full p-2 bg-neutral-100 border border-neutral-200 rounded  text-sm text-neutral-500 font-medium"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded  flex items-center justify-center transition-colors  "
                    >
                      {editingItemIndex !== null ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-neutral-200 rounded  overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="p-2   text-neutral-600 text-xs  ">Item Info</th>
                        <th className="p-2   text-neutral-600 text-xs   text-center">Qty</th>
                        <th className="p-2   text-neutral-600 text-xs   text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {formData.items.length === 0 ? (
                        <tr>
                          <td colSpan="3" className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2 text-neutral-400">
                              <Package size={32} strokeWidth={1.5} />
                              <p className="text-xs font-medium italic">No items added yet</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        formData.items.map((item, index) => (
                          <tr key={item.id || index} className="group hover:bg-neutral-50/50 transition-colors">
                            <td className="p-2 ">
                              <div className="flex flex-col">
                                <span className=" text-neutral-800">{item.item_code}</span>
                                <span className="text-xs text-neutral-500 truncate max-w-[200px]">{item.item_name}</span>
                              </div>
                            </td>
                            <td className="p-2  text-center">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 rounded  text-neutral-700  text-xs">
                                {item.qty} {item.uom}
                              </div>
                            </td>
                            <td className="p-2  text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button 
                                  onClick={() => handleEditItem(index)}
                                  className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded  transition-all"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => handleRemoveItem(index)}
                                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded  transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <label className="text-[11px]  text-neutral-500  flex items-center gap-1 mb-2">
                    <FileText size={12} /> Notes & Special Instructions
                  </label>
                  <textarea 
                    name="items_notes"
                    value={formData.items_notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Add any additional notes for this material request..."
                    className="w-full p-3 border border-neutral-200 rounded  text-sm focus:ring-2 focus:ring-blue-500/10 outline-none transition-all resize-none"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="bg-blue-50 border border-blue-100 rounded  p-4 flex gap-3">
              <div className="text-blue-500 shrink-0">
                <Info size={18} />
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Pro Tip:</strong> Setting the department to <strong>Production</strong> will automatically switch the purpose to <strong>Material Issue</strong>. Use <strong>Internal Transfer</strong> for moving stock between warehouses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
