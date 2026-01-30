import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, Warehouse, Package, Calendar, User, 
  FileText, RefreshCw, CheckCircle, ArrowRightLeft, ArrowRight 
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
  const [contacts, setContacts] = useState([])
  const [departments, setDepartments] = useState(['Production', 'Maintenance', 'Store', 'Quality', 'Purchase'])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [newItem, setNewItem] = useState({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    if (isOpen) {
      const initializeModal = async () => {
        const itemsData = await fetchItems()
        await fetchStockItems(itemsData)
        fetchContacts()
        fetchWarehouses()
        generateSeriesNumber()
      }
      initializeModal()
    }
  }, [isOpen])

  const fetchItems = async () => {
    try {
      const response = await api.get('/items?limit=1000')
      const itemsData = response.data.data || response.data || []
      setItems(itemsData)
      return itemsData
    } catch (err) {
      console.error('Failed to fetch items:', err)
      return []
    }
  }

  const fetchStockItems = async (itemsData = null) => {
    try {
      const response = await api.get('/items?item_type=Raw Material&limit=1000')
      const rawMaterials = response.data.data || response.data || []
      setStockItems(rawMaterials.length > 0 ? rawMaterials : (itemsData || items))
    } catch (err) {
      console.error('Failed to fetch raw materials:', err)
      setStockItems(itemsData || items)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await api.get('/suppliers/contacts/all')
      setContacts(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
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

  const generateSeriesNumber = () => {
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const seriesNo = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random}`
    setFormData(prev => ({ ...prev, series_no: seriesNo }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    if (name === 'department') {
      if (value === 'Production') {
        setFormData(prev => ({ 
          ...prev, 
          department: value,
          purpose: 'material_issue',
          source_warehouse: '',
          target_warehouse: ''
        }))
      } else {
        setFormData(prev => ({ 
          ...prev, 
          department: value,
          purpose: 'purchase',
          source_warehouse: '',
          target_warehouse: ''
        }))
      }
    } else if (name === 'purpose') {
      if (value === 'purchase') {
        setFormData(prev => ({ 
          ...prev, 
          purpose: value,
          source_warehouse: '',
          target_warehouse: ''
        }))
      } else if (value === 'material_issue') {
        setFormData(prev => ({ 
          ...prev, 
          purpose: value,
          target_warehouse: ''
        }))
      } else if (value === 'material_transfer') {
        setFormData(prev => ({ 
          ...prev, 
          purpose: value
        }))
      }
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const getAvailableItems = () => {
    if (formData.purpose === 'purchase') {
      return items
    } else {
      return stockItems
    }
  }

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.qty) {
      setError('Please select item and enter quantity')
      return
    }

    const itemExists = formData.items.some(i => i.item_code === newItem.item_code && (editingItemIndex === null || formData.items.indexOf(i) !== editingItemIndex))
    if (itemExists) {
      setError('Item already added')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = { ...newItem, id: updatedItems[editingItemIndex].id }
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

    if (!formData.requested_by_id || !formData.department || formData.items.length === 0) {
      setError('Please fill all required fields')
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

  const getItemName = (code) => {
    const item = items.find(i => i.item_code === code)
    return item ? item.name : code
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
    <Modal isOpen={isOpen} onClose={handleClose} title="New Material Request" size="6xl">
      <div className="flex flex-col h-[85vh]">
        {error && <Alert type="danger" className="mx-4 mt-4 shadow-sm">{error}</Alert>}

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <form id="mr-form" onSubmit={handleSubmit}>
            {/* Section 1: Basic Information */}
            <div className="bg-white rounded border border-gray-200 ">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h3 className="text-sm  text-gray-800 ">Basic Information</h3>
              </div>
              
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="">
                  <label className="text-xs  text-gray-500 ">Series No</label>
                  <input 
                    type="text"
                    name="series_no"
                    value={formData.series_no}
                    readOnly
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 font-mono"
                  />
                </div>

                <div className="">
                  <label className="text-xs  text-gray-500  flex items-center gap-1">
                    <Calendar size={12} /> Transition Date
                  </label>
                  <input 
                    type="date"
                    name="transition_date"
                    value={formData.transition_date}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="">
                  <label className="text-xs  text-gray-500  flex items-center gap-1">
                    <User size={12} /> Requested By <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="requested_by_id"
                    value={formData.requested_by_id}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Select Requester</option>
                    {contacts.map(contact => (
                      <option key={contact.contact_id} value={contact.name || contact.contact_id}>
                        {contact.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="">
                  <label className="text-xs  text-gray-500 ">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="">
                  <label className="text-xs  text-gray-500 ">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="purpose"
                    value={formData.purpose}
                    onChange={handleChange}
                    disabled={formData.department === 'Production'}
                    required
                    className={`w-full p-2 border rounded text-xs transition-all ${
                      formData.department === 'Production' 
                        ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-white border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                  >
                    {formData.department === 'Production' ? (
                      <option value="material_issue">Material Issue (Inventory Release)</option>
                    ) : (
                      <>
                        <option value="purchase">Purchase (Vendor Procurement)</option>
                        <option value="material_transfer">Material Transfer (Wh-to-Wh)</option>
                        <option value="material_issue">Material Issue (Inventory Release)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="">
                  <label className="text-xs  text-gray-500  flex items-center gap-1">
                    <Calendar size={12} /> Required By Date <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date"
                    name="required_by_date"
                    value={formData.required_by_date}
                    onChange={handleChange}
                    required
                    className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Warehouses */}
            {formData.purpose !== 'purchase' && (
              <div className="bg-white rounded border border-gray-200  animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                  <Warehouse size={18} className="text-purple-600" />
                  <h3 className="text-sm  text-gray-800 ">
                    Warehouse Selection
                    <span className="ml-2 text-xs font-medium text-gray-400 normal-case">
                      {formData.purpose === 'material_issue' ? '(Specify Source Warehouse)' : '(Specify Transfer Route)'}
                    </span>
                  </h3>
                </div>
                
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="">
                    <label className="text-xs  text-gray-500  flex items-center gap-1">
                      <ArrowRightLeft size={12} className="text-orange-500" /> Source Warehouse <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="source_warehouse"
                      value={formData.source_warehouse}
                      onChange={handleChange}
                      required={formData.purpose !== 'purchase'}
                      className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                    >
                      <option value="">Select Source Warehouse</option>
                      {warehouses.map(wh => (
                        <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                      ))}
                    </select>
                  </div>

                  {formData.purpose === 'material_transfer' && (
                    <div className="">
                      <label className="text-xs  text-gray-500  flex items-center gap-1">
                        <ArrowRightLeft size={12} className="text-emerald-500" /> Target Warehouse <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="target_warehouse"
                        value={formData.target_warehouse}
                        onChange={handleChange}
                        required={formData.purpose === 'material_transfer'}
                        className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                      >
                        <option value="">Select Target Warehouse</option>
                        {warehouses.map(wh => (
                          <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.warehouse_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Items */}
            <div className="bg-white rounded border border-gray-200  mt-6">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-amber-600" />
                  <h3 className="text-sm  text-gray-800 ">Requested Items</h3>
                </div>
                <Badge color="info" className="text-xs er">
                  {formData.items.length} Items Added
                </Badge>
              </div>

              <div className="p-4">
                <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-2">
                  <h4 className="text-xs  text-gray-400  mb-3">Add New Item</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-6 ">
                      <label className="text-xs  text-gray-500 ">Select Item</label>
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
                        className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="">Choose an item...</option>
                        {getAvailableItems().map(item => (
                          <option key={item.item_code} value={item.item_code}>
                            {item.item_code} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 ">
                      <label className="text-xs  text-gray-500 ">Quantity</label>
                      <input 
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newItem.qty}
                        onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-xs text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500/20"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="md:col-span-2 ">
                      <label className="text-xs  text-gray-500 ">UOM</label>
                      <input 
                        type="text"
                        value={newItem.uom}
                        readOnly
                        className="w-full p-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-500 font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className={`w-full p-2 rounded text-xs   flex items-center justify-center gap-2 transition-all shadow-md ${
                          editingItemIndex !== null 
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' 
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/10'
                        }`}
                      >
                        {editingItemIndex !== null ? (
                          <><Edit size={14} /> Update</>
                        ) : (
                          <><Plus size={14} strokeWidth={3} /> Add</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {formData.items.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-100 border-b border-gray-200">
                          <th className="px-4 py-3  text-gray-600  text-[9px]">Item Details</th>
                          <th className="px-4 py-3  text-gray-600  text-[9px] text-center">Qty</th>
                          <th className="px-4 py-3  text-gray-600  text-[9px] text-center">UOM</th>
                          <th className="px-4 py-3  text-gray-600  text-[9px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {formData.items.map((item, index) => (
                          <tr key={item.id} className="hover:bg-blue-50/40 transition-colors group">
                            <td className="px-4 py-3">
                              <p className=" text-gray-900 group-hover:text-blue-700 transition-colors">{item.item_code}</p>
                              <p className="text-xs text-gray-500">{item.item_name || getItemName(item.item_code)}</p>
                            </td>
                            <td className="px-4 py-3 text-center font-mono  text-blue-600">{item.qty}</td>
                            <td className="px-4 py-3 text-center text-gray-500 uppercase font-medium">{item.uom}</td>
                            <td className="px-4 py-3 text-right space-x-1">
                              <button 
                                type="button"
                                onClick={() => handleEditItem(index)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded  bg-gray-50/50">
                    <Package size={48} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm font-medium italic">Your requisition items will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Notes */}
           
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-gray-200 bg-white flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2 text-xs  text-gray-400  hover:text-gray-700 transition-colors"
          >
            Cancel Request
          </button>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading || formData.items.length === 0}
              className="px-6 py-3 border border-gray-200 shadow-sm"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Save as Draft'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={(e) => handleSubmit(e, 'pending')}
              disabled={loading || formData.items.length === 0}
              className="px-10 py-3 shadow-xl shadow-blue-600/20 relative overflow-hidden bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" /> Submitting...
                </span>
              ) : (
                <span className="flex items-center gap-2 uppercase tracking-[0.2em] text-xs">
                  Send for Approval <ArrowRight size={16} />
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}