import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, Warehouse, Package, Calendar, User, 
  FileText, RefreshCw, ArrowRight, Building, ClipboardList, Clock
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
      const response = await api.get('/items?limit=1000')
      const itemsData = response.data.data || response.data || []
      setItems(itemsData)
      
      const stockRes = await api.get('/items?item_type=Raw Material&limit=1000')
      setStockItems(stockRes.data.data || stockRes.data || itemsData)
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/masters/departments')
      if (response.data.success) {
        setDepartments(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
      setDepartments(['Production', 'Maintenance', 'Store', 'Quality', 'Purchase'])
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees')
      if (response.data.success) {
        setEmployees(response.data.data)
      } else if (Array.isArray(response.data)) {
        setEmployees(response.data)
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses?limit=1000')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const generateSeriesNumber = async () => {
    // In a real app, this should come from backend sequence
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
        requested_by_id: '', // Reset requester when dept changes
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

  const getAvailableItems = () => {
    return formData.purpose === 'purchase' ? items : stockItems
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
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
    if (editingItemIndex === index) {
      setEditingItemIndex(null)
      setNewItem({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
    }
  }

  const handleSubmit = async (e, status = 'draft') => {
    if (e) e.preventDefault()

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

      await api.post('/material-requests', submitData)
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Material Request" size="4xl">
      <div className="flex flex-col h-[85vh] bg-gray-50/30">
        {error && <Alert type="danger" className="mx-6 mt-4  border-l-4">{error}</Alert>}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <form id="mr-form" onSubmit={handleSubmit}>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {/* Left Column: General Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded   border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Building size={16} className="text-blue-500" />
                    <h3 className="text-xs  text-gray-700">General Information</h3>
                  </div>
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-[11px]  text-gray-400   flex items-center gap-1">
                        Series Number
                      </label>
                      <input 
                        type="text"
                        value={formData.series_no}
                        readOnly
                        className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px]  text-gray-400   flex items-center gap-1">
                        <Calendar size={12} /> Date
                      </label>
                      <input 
                        type="date"
                        name="transition_date"
                        value={formData.transition_date}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px]  text-gray-400   flex items-center gap-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        required
                        className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none bg-white"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px]  text-gray-400   flex items-center gap-1">
                        Requested By <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="requested_by_id"
                        value={formData.requested_by_id}
                        onChange={handleChange}
                        required
                        disabled={!formData.department}
                        className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none bg-white disabled:bg-gray-50"
                      >
                        <option value="">{formData.department ? 'Select Requester' : 'Select Department First'}</option>
                        {employees
                          .filter(emp => emp.department && emp.department.toLowerCase() === formData.department.toLowerCase())
                          .map(emp => (
                            <option key={emp.employee_id || emp.id} value={emp.employee_id || emp.id}>
                              {emp.first_name} {emp.last_name}
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px]  text-gray-400   flex items-center gap-1">
                        Request Purpose <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['purchase', 'material_transfer', 'material_issue'].map((p) => (
                          <label 
                            key={p}
                            className={`
                              flex flex-col items-center justify-center p-3 border-2 rounded  cursor-pointer transition-all gap-2
                              ${formData.purpose === p 
                                ? 'border-blue-500 bg-blue-50/50 text-blue-700' 
                                : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}
                              ${formData.department === 'Production' && p !== 'material_issue' ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                            `}
                          >
                            <input 
                              type="radio"
                              name="purpose"
                              value={p}
                              checked={formData.purpose === p}
                              onChange={handleChange}
                              className="hidden"
                              disabled={formData.department === 'Production' && p !== 'material_issue'}
                            />
                            {p === 'purchase' && <ClipboardList size={20} />}
                            {p === 'material_transfer' && <Warehouse size={20} />}
                            {p === 'material_issue' && <Package size={20} />}
                            <span className="text-[10px]   text-center leading-tight">
                              {p.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Schedule & Warehouses */}
              <div className="space-y-6">
                <div className="bg-white rounded   border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Clock size={16} className="text-orange-500" />
                    <h3 className="text-xs  text-gray-700">Schedule</h3>
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="space-y-1.5">
                      <label className="text-[11px]  text-gray-400   flex items-center gap-1">
                         Required By Date <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="date"
                        name="required_by_date"
                        value={formData.required_by_date}
                        onChange={handleChange}
                        required
                        className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {formData.purpose !== 'purchase' && (
                  <div className="bg-white rounded   border border-gray-200 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                      <Warehouse size={16} className="text-purple-500" />
                      <h3 className="text-xs  text-gray-700">Fulfillment</h3>
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="space-y-1.5">
                        <label className="text-[11px]  text-gray-400  ">
                          Source Warehouse <span className="text-red-500">*</span>
                        </label>
                        <select 
                          name="source_warehouse"
                          value={formData.source_warehouse}
                          onChange={handleChange}
                          required={formData.purpose !== 'purchase'}
                          className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none bg-white"
                        >
                          <option value="">Select Warehouse</option>
                          {warehouses.map(wh => (
                            <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                          ))}
                        </select>
                      </div>

                      {formData.purpose === 'material_transfer' && (
                        <div className="space-y-1.5">
                          <label className="text-[11px]  text-gray-400  ">
                            Target Warehouse <span className="text-red-500">*</span>
                          </label>
                          <select 
                            name="target_warehouse"
                            value={formData.target_warehouse}
                            onChange={handleChange}
                            required={formData.purpose === 'material_transfer'}
                            className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none bg-white"
                          >
                            <option value="">Select Warehouse</option>
                            {warehouses.map(wh => (
                              <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Section */}
            <div className="bg-white rounded   border border-gray-200 overflow-hidden mt-6">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-amber-500" />
                  <h3 className="text-xs  text-gray-700">Material Items</h3>
                </div>
                <Badge color="info" className="px-3 py-1 rounded-full text-[10px] ">
                  {formData.items.length} ITEMS
                </Badge>
              </div>

              <div className="p-6">
                <div className="bg-gray-50/50 p-4 rounded  border border-gray-100 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6 space-y-1.5">
                      <label className="text-[10px]  text-gray-400  tracking-widest px-1">Select Item</label>
                      <select 
                        value={newItem.item_code}
                        onChange={(e) => {
                          const availableItems = getAvailableItems()
                          const item = availableItems.find(i => i.item_code === e.target.value)
                          setNewItem({ 
                            ...newItem, 
                            item_code: e.target.value,
                            item_name: item?.name || '',
                            uom: item?.uom || 'pcs'
                          })
                        }}
                        className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700 bg-white  focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                      >
                        <option value="">Search or choose item...</option>
                        {getAvailableItems().map(item => (
                          <option key={item.item_code} value={item.item_code}>
                            {item.item_code} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px]  text-gray-400  tracking-widest px-1">Quantity</label>
                      <input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newItem.qty}
                        onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 rounded text-xs text-gray-700  focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px]  text-gray-400  tracking-widest px-1">UOM</label>
                      <input 
                        type="text"
                        value={newItem.uom}
                        readOnly
                        className="w-full p-2.5 bg-white border border-gray-200 rounded text-xs text-gray-400 font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className={`w-full py-2.5 rounded text-xs    flex items-center justify-center gap-2 transition-all  ${
                          editingItemIndex !== null 
                            ? 'bg-amber-500 text-white hover:bg-amber-600' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {editingItemIndex !== null ? <><Edit size={14} /> Update</> : <><Plus size={14} strokeWidth={2.5} /> Add Item</>}
                      </button>
                    </div>
                  </div>
                </div>

                {formData.items.length > 0 ? (
                  <div className="border border-gray-100 rounded  overflow-hidden ">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px]  text-gray-400  tracking-widest">Item Description</th>
                          <th className="px-6 py-4 text-[10px]  text-gray-400  tracking-widest text-center">Qty</th>
                          <th className="px-6 py-4 text-[10px]  text-gray-400  tracking-widest text-center">UOM</th>
                          <th className="px-6 py-4 text-[10px]  text-gray-400  tracking-widest text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {formData.items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-4">
                              <p className=" text-gray-800 group-hover:text-blue-600 transition-colors">{item.item_code}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{item.item_name}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-mono  text-blue-600 bg-blue-50/20">{item.qty}</td>
                            <td className="px-6 py-4 text-center text-gray-500 font-medium italic">{item.uom}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button 
                                type="button"
                                onClick={() => handleEditItem(index)}
                                className="p-2 text-blue-500 hover:bg-blue-50 rounded transition-all"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded transition-all"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-3 text-center border-2 border-dashed border-gray-100 rounded bg-gray-50/30">
                    <div className="bg-white w-8 h-8 rounded-full  flex items-center justify-center mx-auto mb-4 border border-gray-50">
                      <Package size={32} className="text-gray-200" />
                    </div>
                    <h4 className="text-xs  text-gray-400">No items added yet</h4>
                    <p className="text-xs text-gray-300 mt-1 italic">Add raw materials or components to your request</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="px-8 py-5 border-t border-gray-100 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="text-xs  text-gray-400 hover:text-gray-600  tracking-widest transition-colors"
          >
            Cancel Request
          </button>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading || formData.items.length === 0}
              className="px-6 py-2.5 rounded border-gray-200 text-xs   tracking-widest"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Draft'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={(e) => handleSubmit(e, 'pending')}
              disabled={loading || formData.items.length === 0}
              className="px-8 py-2.5 rounded bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-xs   tracking-[0.2em]"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Working...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Submit Request <ArrowRight size={14} />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
