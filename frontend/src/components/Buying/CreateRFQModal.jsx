import React, { useState, useEffect } from 'react'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Input from '../Input/Input'
import Badge from '../Badge/Badge'
import { Plus, X, Edit2, Trash2, AlertCircle, CheckCircle, Package, Users, Building2, Calendar, FileText } from 'lucide-react'
import { materialRequestsAPI, suppliersAPI, itemsAPI, companyAPI, rfqsAPI } from '../../services/api'

export default function CreateRFQModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    series_no: '',
    valid_till: '',
    items: [],
    suppliers: []
  })

  const [approvedMRs, setApprovedMRs] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [allItems, setAllItems] = useState([])
  const [companyInfo, setCompanyInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newSupplier, setNewSupplier] = useState('')
  const [showItemForm, setShowItemForm] = useState(false)
  const [itemForm, setItemForm] = useState({ item_code: '', qty: '', uom: '' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchRequiredData()
      generateSeriesNo()
    }
  }, [isOpen])

  const generateSeriesNo = () => {
    const today = new Date()
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
    const randomNum = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
    const seriesNo = `RFQ-${dateStr}-${randomNum}`
    setFormData(prev => ({ ...prev, series_no: seriesNo }))
  }

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      const [mrRes, supRes, itemRes, compRes] = await Promise.all([
        materialRequestsAPI.getApproved(),
        suppliersAPI.list(),
        itemsAPI.list(),
        companyAPI.get().catch(() => ({ data: { data: null } }))
      ])

      setApprovedMRs(mrRes.data.data || [])
      setSuppliers(supRes.data.data || [])
      setAllItems(itemRes.data.data || [])
      setCompanyInfo(compRes.data.data)
    } catch (err) {
      console.error('Failed to fetch required data:', err)
      setError('Failed to load required data')
    } finally {
      setDataLoading(false)
    }
  }

  const handleLoadFromMR = async (mrId) => {
    if (!mrId) return
    try {
      setLoading(true)
      const res = await materialRequestsAPI.get(mrId)
      const items = res.data.data.items || []
      setFormData(prev => ({
        ...prev,
        items: items.map(item => ({
          item_code: item.item_code,
          qty: item.qty,
          uom: item.uom,
          id: Date.now() + Math.random()
        }))
      }))
    } catch (err) {
      console.error('Failed to fetch MR details:', err)
      setError('Failed to load MR items')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    if (!itemForm.item_code || !itemForm.qty) {
      setError('Please select an item and enter quantity')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = {
        ...itemForm,
        id: updatedItems[editingItemIndex].id
      }
      setFormData(prev => ({ ...prev, items: updatedItems }))
      setEditingItemIndex(null)
    } else {
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { ...itemForm, id: Date.now() + Math.random() }]
      }))
    }
    setItemForm({ item_code: '', qty: '', uom: '' })
    setShowItemForm(false)
    setError(null)
  }

  const handleEditItem = (index) => {
    setItemForm(formData.items[index])
    setEditingItemIndex(index)
    setShowItemForm(true)
  }

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const handleCancelItemEdit = () => {
    setItemForm({ item_code: '', qty: '', uom: '' })
    setEditingItemIndex(null)
    setShowItemForm(false)
  }

  const handleAddSupplier = () => {
    if (!newSupplier) {
      setError('Please select a supplier')
      return
    }

    const supplierExists = formData.suppliers.some(s => s.supplier_id === newSupplier)
    if (supplierExists) {
      setError('Supplier already added')
      return
    }

    setFormData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, { supplier_id: newSupplier, id: Date.now() }]
    }))
    setNewSupplier('')
    setError(null)
  }

  const handleRemoveSupplier = (id) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== id)
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.valid_till) {
      setError('Please enter valid till date')
      return
    }
    if (formData.items.length === 0) {
      setError('Please add at least 1 item')
      return
    }
    if (formData.suppliers.length === 0) {
      setError('Please add at least 1 supplier')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        series_no: formData.series_no,
        valid_till: formData.valid_till,
        items: formData.items.map(({ id, ...item }) => item),
        suppliers: formData.suppliers.map(({ id, ...supplier }) => ({ supplier_id: supplier.supplier_id }))
      }

      await rfqsAPI.create(submitData)
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create RFQ')
    } finally {
      setLoading(false)
    }
  }

  const getItemName = (code) => {
    const item = allItems.find(i => i.item_code === code)
    return item ? item.name : code
  }

  const handleClose = () => {
    setFormData({
      series_no: '',
      valid_till: '',
      items: [],
      suppliers: []
    })
    setError(null)
    setNewSupplier('')
    setItemForm({ item_code: '', qty: '', uom: '' })
    setEditingItemIndex(null)
    setShowItemForm(false)
    onClose()
  }

  if (dataLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Create Request for Quotation" size="3xl">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-10 h-10 border-4 border-neutral-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-neutral-500">Loading required data...</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create Request for Quotation" 
      size="4xl"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            loading={loading}
            disabled={formData.items.length === 0 || formData.suppliers.length === 0}
          >
            <CheckCircle size={16} className="mr-2" />
            Create RFQ
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="danger">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info & Source */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                <h3 className="font-semibold text-neutral-800">Basic Information</h3>
              </div>
              <div className="p-4 space-y-4">
                <Input
                  label="RFQ Number"
                  value={formData.series_no}
                  readOnly
                  className="bg-neutral-50"
                />
                <Input
                  label="Valid Till *"
                  type="date"
                  name="valid_till"
                  value={formData.valid_till}
                  onChange={handleChange}
                  required
                />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center gap-2">
                <Building2 size={18} className="text-primary-600" />
                <h3 className="font-semibold text-neutral-800">Source MR</h3>
              </div>
              <div className="p-4">
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">Load from Approved MR</label>
                <select 
                  onChange={(e) => handleLoadFromMR(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                >
                  <option value="">Select Material Request...</option>
                  {approvedMRs.map(mr => (
                    <option key={mr.mr_id} value={mr.mr_id}>
                      {mr.mr_id} - {mr.purpose}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          </div>

          {/* Suppliers Selection */}
          <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col">
            <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary-600" />
                <h3 className="font-semibold text-neutral-800">Target Suppliers</h3>
              </div>
              <Badge variant="primary">{formData.suppliers.length} Selected</Badge>
            </div>
            <div className="p-4 flex-1 flex flex-col space-y-4">
              <div className="flex gap-2">
                <select 
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-neutral-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                >
                  <option value="">Choose Supplier...</option>
                  {suppliers.map(sup => (
                    <option key={sup.supplier_id} value={sup.supplier_id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleAddSupplier} className="h-10 px-4">
                  Add
                </Button>
              </div>
              
              <div className="flex-1 min-h-[150px] border border-neutral-100 rounded-lg p-2 bg-neutral-50/50 space-y-2 overflow-y-auto max-h-[200px]">
                {formData.suppliers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-8">
                    <Users size={24} className="mb-2 opacity-20" />
                    <p className="text-xs">No suppliers added yet</p>
                  </div>
                ) : (
                  formData.suppliers.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white p-2.5 rounded-md border border-neutral-200 shadow-sm transition-all hover:border-primary-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-800">
                          {suppliers.find(sup => sup.supplier_id === s.supplier_id)?.name || s.supplier_id}
                        </span>
                        <span className="text-[10px] text-neutral-500">{s.supplier_id}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveSupplier(s.id)}
                        className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Items Section */}
        <section className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-primary-600" />
              <h3 className="font-semibold text-neutral-800">Items for Quotation</h3>
            </div>
            <Button 
              variant={showItemForm ? "outline" : "primary"} 
              size="sm" 
              onClick={() => showItemForm ? handleCancelItemEdit() : setShowItemForm(true)}
              className="h-8"
            >
              {showItemForm ? <X size={14} className="mr-1" /> : <Plus size={14} className="mr-1" />}
              {showItemForm ? "Cancel" : "Add Item"}
            </Button>
          </div>

          {showItemForm && (
            <div className="p-4 bg-primary-50/30 border-b border-neutral-100 animate-in slide-in-from-top duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-neutral-700 mb-1.5">Item *</label>
                  <select 
                    value={itemForm.item_code}
                    onChange={(e) => {
                      const item = allItems.find(i => i.item_code === e.target.value)
                      setItemForm({ ...itemForm, item_code: e.target.value, uom: item?.uom || '' })
                    }}
                    className="w-full h-9 px-3 rounded-md border border-neutral-300 focus:ring-1 focus:ring-primary-500 outline-none text-sm bg-white"
                  >
                    <option value="">Select Item</option>
                    {allItems.map(item => (
                      <option key={item.item_code} value={item.item_code}>
                        {item.name} ({item.item_code})
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Quantity *"
                  type="number"
                  value={itemForm.qty}
                  onChange={(e) => setItemForm({ ...itemForm, qty: e.target.value })}
                  placeholder="0.00"
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Input
                    label="UOM"
                    value={itemForm.uom}
                    readOnly
                    className="bg-neutral-50 h-9 flex-1"
                  />
                  <Button onClick={handleAddItem} className="h-9 px-4">
                    {editingItemIndex !== null ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12 text-center">#</th>
                  <th className="px-4 py-3 font-semibold">Item Details</th>
                  <th className="px-4 py-3 font-semibold w-24 text-right">Qty</th>
                  <th className="px-4 py-3 font-semibold w-24">UOM</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {formData.items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-neutral-400 italic">
                      No items added to this RFQ yet.
                    </td>
                  </tr>
                ) : (
                  formData.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3 text-center text-neutral-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-neutral-900">{getItemName(item.item_code)}</div>
                        <div className="text-[10px] text-neutral-500 uppercase tracking-tight">{item.item_code}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-700">{item.qty}</td>
                      <td className="px-4 py-3 text-neutral-500 uppercase text-xs">{item.uom}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            type="button"
                            onClick={() => handleEditItem(idx)}
                            className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
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
        </section>
      </form>
    </Modal>
  )
}
