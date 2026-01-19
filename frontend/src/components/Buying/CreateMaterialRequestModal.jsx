import React, { useState, useEffect } from 'react'
import api from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import { Plus, X, Edit, Warehouse, Package, Calendar, User, FileText } from 'lucide-react'

export default function CreateMaterialRequestModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    series_no: '',
    transition_date: '',
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
  const [departments, setDepartments] = useState(['Production', 'Maintenance', 'Store'])
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
      const itemsData = response.data.data || []
      setItems(itemsData)
      return itemsData
    } catch (err) {
      console.error('Failed to fetch items:', err)
      return []
    }
  }

  const fetchStockItems = async (itemsData = null) => {
    try {
      const allItems = itemsData && itemsData.length > 0 ? itemsData : items
      const response = await api.get('/stock/stock-balance')
      const balances = response.data.data || response.data || []
      
      const uniqueItemCodes = new Set()
      balances.forEach(balance => {
        if (balance.item_code && (balance.available_qty || 0) > 0) {
          uniqueItemCodes.add(balance.item_code)
        }
      })

      const itemsWithStock = allItems.filter(item => uniqueItemCodes.has(item.item_code))
      setStockItems(itemsWithStock)
    } catch (err) {
      console.error('Failed to fetch stock items:', err)
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
    const timestamp = Date.now()
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

    if (formData.purpose === 'material_issue' && formData.items.length > 0 && !formData.source_warehouse) {
      setError('Source warehouse is required for Material Issue')
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

  const handleCancelEdit = () => {
    setEditingItemIndex(null)
    setNewItem({ item_code: '', item_name: '', qty: 1, uom: 'pcs' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

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
      transition_date: '',
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Material Request" size="xl">
      <div className="p-2">
        {error && <Alert type="danger">{error}</Alert>}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Information */}
          <div className="mb-2 p-[10px] bg-white rounded-sm border border-gray-200 ">
            <div className="flex items-center mb-4">
              <FileText size={20} className="text-blue-500 mr-2.5" />
              <h5 className="m-0 text-gray-900 text-base font-bold">Basic Information</h5>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-semibold text-xs text-gray-500">Series No</label>
                <input 
                  type="text"
                  name="series_no"
                  value={formData.series_no}
                  readOnly
                  className="w-full p-2 rounded-xs border border-gray-200 bg-gray-50 text-xs text-gray-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-xs text-gray-500">Transition Date</label>
                <input 
                  type="date"
                  name="transition_date"
                  value={formData.transition_date}
                  onChange={handleChange}
                  className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block font-semibold text-xs text-gray-500">
                  Requested By <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text"
                  name="requested_by_id"
                  value={formData.requested_by_id}
                  onChange={handleChange}
                  placeholder="Select from list"
                  list="requestedByList"
                  required
                  className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 transition-all"
                />
                <datalist id="requestedByList">
                  {contacts.map(contact => (
                    <option key={contact.contact_id} value={contact.name || contact.contact_id}>
                      {contact.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-semibold text-xs text-gray-500">
                  Department <span className="text-red-500">*</span>
                </label>
                <select 
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 bg-white transition-all"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-xs text-gray-500">
                  Purpose <span className="text-red-500">*</span>
                  {formData.department === 'Production' && (
                    <span className="text-[10px] text-gray-400 font-normal ml-2 block mt-0.5">
                      (Auto-set to Material Issue)
                    </span>
                  )}
                </label>
                <select 
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  disabled={formData.department === 'Production'}
                  required
                  className={`w-full p-2 rounded-xs border text-xs transition-all text-xs ${
                    formData.department === 'Production' 
                      ? 'bg-gray-50 border-gray-300 text-gray-700 cursor-not-allowed' 
                      : 'bg-white border-gray-300 text-gray-700 cursor-pointer'
                  }`}
                >
                  {formData.department === 'Production' ? (
                    <option value="material_issue">Material Issue (Release from Inventory)</option>
                  ) : (
                    <>
                      <option value="purchase">Purchase (From Vendor)</option>
                      <option value="material_transfer">Material Transfer (Between Warehouses)</option>
                      <option value="material_issue">Material Issue (Release from Inventory)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-xs text-gray-500">
                  Required By Date <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date"
                  name="required_by_date"
                  value={formData.required_by_date}
                  onChange={handleChange}
                  placeholder="dd-mm-yyyy"
                  required
                  className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Warehouses */}
          {formData.purpose !== 'purchase' && (
            <div className="mb-2 p-[10px] bg-white rounded-sm border border-gray-200 ">
              <div className="flex items-center mb-4">
                <Warehouse size={20} className="text-purple-500 mr-2.5" />
                <h5 className="m-0 text-gray-900 text-base font-bold">
                  Warehouse Details
                  {formData.purpose === 'material_issue' && <span className="text-xs font-normal text-gray-500"> (Source for Release)</span>}
                  {formData.purpose === 'material_transfer' && <span className="text-xs font-normal text-gray-500"> (Transfer Details)</span>}
                </h5>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {formData.purpose === 'material_transfer' && (
                  <>
                    <div>
                      <label className="block font-semibold text-xs text-gray-500">
                        Source Warehouse <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="source_warehouse"
                        value={formData.source_warehouse}
                        onChange={handleChange}
                        required={formData.purpose === 'material_transfer'}
                        className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 bg-white transition-all"
                      >
                        <option value="">Select Source Warehouse</option>
                        {warehouses.map(wh => (
                          <option key={wh.warehouse_id} value={wh.warehouse_code || wh.warehouse_name}>{wh.warehouse_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-xs text-gray-500">
                        Target Warehouse <span className="text-red-500">*</span>
                      </label>
                      <select 
                        name="target_warehouse"
                        value={formData.target_warehouse}
                        onChange={handleChange}
                        required={formData.purpose === 'material_transfer'}
                        className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 bg-white transition-all"
                      >
                        <option value="">Select Target Warehouse</option>
                        {warehouses.map(wh => (
                          <option key={wh.warehouse_id} value={wh.warehouse_code || wh.warehouse_name}>{wh.warehouse_name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {formData.purpose === 'material_issue' && (
                  <div className="col-span-2">
                    <label className="block font-semibold text-xs text-gray-500">
                      Source Warehouse (Release From) <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="source_warehouse"
                      value={formData.source_warehouse}
                      onChange={handleChange}
                      required={formData.purpose === 'material_issue'}
                      className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 bg-white transition-all"
                    >
                      <option value="">Select Source Warehouse (Items will be released from here)</option>
                      {warehouses.map(wh => (
                        <option key={wh.warehouse_id} value={wh.warehouse_code || wh.warehouse_name}>{wh.warehouse_name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Add Items */}
          <div className="mb-2 p-[10px] bg-white rounded-sm border border-gray-200 ">
            <div className="flex items-center mb-4">
              <Package size={20} className="text-amber-500 mr-2.5" />
              <h5 className="m-0 text-gray-900 text-base font-bold">
                {editingItemIndex !== null ? 'Edit Material Item' : 'Add Material Items'}
              </h5>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-3">
              <div className="col-span-2">
                <label className="text-xs block  font-semibold text-gray-500">Item Code <span className="text-red-500">*</span></label>
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
                  className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 bg-white transition-all"
                >
                  <option value="">
                    Select Item {formData.purpose === 'material_issue' ? '(Only items with stock shown)' : ''}
                  </option>
                  {getAvailableItems().length > 0 ? (
                    getAvailableItems().map(item => (
                      <option key={item.item_code} value={item.item_code}>
                        {item.item_code} - {item.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>
                      {formData.purpose === 'material_issue' ? 'No items with stock available' : 'No items available'}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs block  font-semibold text-gray-500">Quantity <span className="text-red-500">*</span></label>
                <input 
                  type="number"
                  value={newItem.qty}
                  onChange={(e) => setNewItem({...newItem, qty: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full p-2 rounded-sm border border-gray-300 text-xs text-gray-700 transition-all"
                />
              </div>

              <div>
                <label className="text-xs block  font-semibold text-gray-500">UOM</label>
                <input 
                  type="text"
                  value={newItem.uom}
                  readOnly
                  disabled
                  className="w-full p-2 rounded-xs border border-gray-200 text-xs text-gray-400 bg-gray-50"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <Button 
                onClick={handleAddItem}
                variant="success"
                type="button"
              >
                <Plus size={16} className="mr-1.5" /> {editingItemIndex !== null ? 'Update Item' : 'Add Item'}
              </Button>
              {editingItemIndex !== null && (
                <Button 
                  onClick={handleCancelEdit}
                  variant="secondary"
                  type="button"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Items List */}
          {formData.items.length > 0 && (
            <div className="mb-2 p-[10px] bg-white rounded-sm border border-gray-200 ">
              <h5 className="m-0 mb-4 text-gray-900 text-xs font-bold">Selected Items ({formData.items.length})</h5>
              <div className="overflow-x-auto border border-gray-200 rounded-md">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-gray-100 border-b-2 border-gray-200">
                    <tr>
                      <th className="p-3 text-center w-12 font-semibold text-gray-500 text-xs uppercase tracking-wide">No.</th>
                      <th className="p-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Item Code</th>
                      <th className="p-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Item Name</th>
                      <th className="p-3 text-left w-24 font-semibold text-gray-500 text-xs uppercase tracking-wide">Qty</th>
                      <th className="p-3 text-left w-24 font-semibold text-gray-500 text-xs uppercase tracking-wide">UOM</th>
                      <th className="p-3 text-center w-20 font-semibold text-gray-500 text-xs uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr 
                        key={item.id} 
                        className={`border-b border-gray-200 transition-colors ${
                          editingItemIndex === index 
                            ? 'bg-yellow-50' 
                            : index % 2 === 0 
                            ? 'bg-white' 
                            : 'bg-gray-50'
                        }`}
                      >
                        <td className="p-3 text-center text-gray-500">{index + 1}</td>
                        <td className="p-3 text-gray-900 font-medium">{item.item_code}</td>
                        <td className="p-3 text-gray-700">{item.item_name || '-'}</td>
                        <td className="p-3 text-gray-900 font-semibold">{item.qty}</td>
                        <td className="p-3 text-gray-500">{item.uom}</td>
                        <td className="p-3 text-center">
                          <div className="flex gap-1.5 justify-center">
                            <button 
                              type="button"
                              onClick={() => handleEditItem(index)}
                              className="text-blue-500 p-1 flex items-center rounded transition-colors hover:bg-blue-100"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-500 p-1 flex items-center rounded transition-colors hover:bg-red-100"
                              title="Delete"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end mt-6 pt-5 border-t border-gray-200">
            <Button 
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Material Request'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}