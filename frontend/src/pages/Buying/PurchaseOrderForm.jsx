import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Input from '../../components/Input/Input'
import Badge from '../../components/Badge/Badge'
import SearchableSelect from '../../components/SearchableSelect'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import { 
  Trash2, Plus, ArrowLeft, Save, X, Package, 
  Truck, IndianRupee, CreditCard, Info, Calendar,
  Building2, MapPin, Calculator, FileText, CheckCircle, ChevronRight
} from 'lucide-react'
import './Buying.css'

export default function PurchaseOrderForm() {
  const { po_no } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const searchTimeoutRef = useRef(null)
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [itemSearchResults, setItemSearchResults] = useState([])
  const [itemSearchLoading, setItemSearchLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  
  const [po, setPo] = useState({
    supplier_id: '',
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    items: [],
    tax_category: 'GST',
    tax_rate: 18,
    shipping_rule: '',
    incoterm: 'EXW',
    advance_paid: 0,
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_pincode: '',
    shipping_country: 'India',
    payment_terms_description: '',
    due_date: '',
    invoice_portion: 100,
    payment_amount: 0
  })

  useEffect(() => {
    fetchSuppliers()
    fetchItems()
    if (po_no && po_no !== 'new') {
      setIsEdit(true)
      fetchPO()
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [po_no])

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers')
      const suppliersData = res.data.success ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      setSuppliers(suppliersData)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.supplier_id === supplierId)
    setPo({ ...po, supplier_id: supplierId, supplier_name: supplier?.name || '' })
  }

  const fetchItems = async () => {
    try {
      const res = await api.get('/items')
      const itemsData = res.data.success ? res.data.data : (Array.isArray(res.data) ? res.data : [])
      setItems(itemsData)
      setItemSearchResults(itemsData)
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const searchItems = (searchTerm) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!searchTerm.trim()) {
      setItemSearchResults(items)
      return
    }

    setItemSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchQuery = encodeURIComponent(searchTerm)
        const res = await api.get(`/items?search=${searchQuery}`)
        const itemsData = res.data.success && res.data.data ? res.data.data : []
        setItemSearchResults(itemsData.length > 0 ? itemsData : items.filter(item => 
          (item.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()))
        ))
      } catch (error) {
        console.error('Error searching items:', error)
      } finally {
        setItemSearchLoading(false)
      }
    }, 300)
  }

  const fetchPO = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/purchase-orders/${po_no}`)
      if (res.data.success) {
        setPo(res.data.data)
      }
    } catch (error) {
      console.error('Error fetching PO:', error)
      toast.addToast('Error fetching purchase order', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setPo({
      ...po,
      items: [...po.items, { item_code: '', item_name: '', qty: 1, uom: 'PCS', rate: 0, tax_rate: 0, description: '' }]
    })
  }

  const handleItemChange = async (value, index) => {
    const newItems = [...po.items]
    const selectedItem = items.find(i => i.item_code === value)
    
    if (selectedItem) {
      try {
        const res = await api.get(`/items/${value}`)
        if (res.data.success) {
          const itemDetails = res.data.data
          newItems[index] = {
            ...newItems[index],
            item_code: value,
            item_name: itemDetails.name || selectedItem.name || '',
            uom: itemDetails.uom || 'PCS',
            rate: itemDetails.standard_rate || itemDetails.rate || 0,
            tax_rate: itemDetails.tax_rate || 0,
            description: itemDetails.description || '',
            item_id: itemDetails.item_id || itemDetails.id || ''
          }
        }
      } catch (error) {
        newItems[index] = { ...newItems[index], item_code: value, item_name: selectedItem.name || '', uom: selectedItem.uom || 'PCS' }
      }
    } else {
      newItems[index] = { ...newItems[index], item_code: value }
    }
    setPo({ ...po, items: newItems })
  }

  const handleRemoveItem = (index) => {
    setPo({ ...po, items: po.items.filter((_, i) => i !== index) })
  }

  const calculateSubtotal = () => po.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
  const calculateTaxAmount = () => (calculateSubtotal() * (po.tax_rate || 0)) / 100
  const calculateTotal = () => calculateSubtotal() + calculateTaxAmount() - (po.advance_paid || 0)

  const validateForm = () => {
    if (!po.supplier_id) return 'Please select a supplier'
    if (!po.order_date) return 'Please select an order date'
    if (po.items.length === 0) return 'Please add at least one item'
    for (const item of po.items) {
      if (!item.item_code) return 'All items must have an item code selected'
      if (!item.qty || item.qty <= 0) return `Invalid quantity for item ${item.item_code}`
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errorMsg = validateForm()
    if (errorMsg) { 
      toast.addToast(errorMsg, 'error')
      return 
    }

    setLoading(true)
    try {
      const submitData = {
        ...po,
        subtotal: calculateSubtotal(),
        tax_amount: calculateTaxAmount(),
        final_amount: calculateTotal(),
        items: po.items.map(item => ({
          ...item,
          qty: parseFloat(item.qty) || 0,
          rate: parseFloat(item.rate) || 0,
          tax_rate: parseFloat(item.tax_rate) || 0,
          schedule_date: item.schedule_date || po.expected_date
        }))
      }

      const res = isEdit 
        ? await api.put(`/purchase-orders/${po_no}`, submitData)
        : await api.post('/purchase-orders', submitData)

      if (res.data.success) {
        const savedPoNo = res.data.data?.po_no || po_no
        toast.addToast(`Purchase Order ${isEdit ? 'updated' : 'created'} successfully`, 'success')
        navigate(`/buying/purchase-orders/${savedPoNo}`)
      } else {
        toast.addToast(res.data.error || 'Unknown error occurred', 'error')
      }
    } catch (error) {
      toast.addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <form onSubmit={handleSubmit} className="max-w-[1400px] mx-auto space-y-6">
        {/* Modern Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="icon"
              onClick={() => navigate(-1)}
              className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <span>Buying</span>
                <ChevronRight size={14} />
                <span>Purchase Orders</span>
                <ChevronRight size={14} />
                <span className="font-semibold text-indigo-600">{isEdit ? 'Edit Order' : 'New Order'}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isEdit ? `Edit ${po_no}` : 'Create Purchase Order'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              type="button"
              variant="ghost" 
              className="gap-2" 
              onClick={() => navigate(-1)}
            >
              <X size={16} /> Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="gap-2 shadow-lg shadow-indigo-100"
              loading={loading}
            >
              <Save size={16} /> {isEdit ? 'Update Order' : 'Create Order'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items Section */}
            <Card className="overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package size={18} className="text-indigo-600" /> Order Items
                </h2>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  variant="ghost"
                  className="gap-2 text-indigo-600 hover:bg-indigo-50 border-indigo-100 p-2"
                >
                  <Plus size={16} /> Add Item
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[11px] w-1/2">Item</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-center">Qty</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Rate</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Total</th>
                      <th className="px-4 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {po.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <SearchableSelect
                            value={item.item_code}
                            onChange={(value) => handleItemChange(value, index)}
                            options={itemSearchResults.map(itm => ({ value: itm.item_code, label: `${itm.item_code} - ${itm.name}` }))}
                            placeholder="Select item..."
                            onSearch={searchItems}
                            isLoading={itemSearchLoading}
                            className="text-xs"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={(e) => {
                              const newItems = [...po.items]
                              newItems[index].qty = parseFloat(e.target.value) || 0
                              setPo({ ...po, items: newItems })
                            }}
                            className="w-20 mx-auto px-2 py-1.5 border border-slate-200 rounded text-center text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => {
                              const newItems = [...po.items]
                              newItems[index].rate = parseFloat(e.target.value) || 0
                              setPo({ ...po, items: newItems })
                            }}
                            className="w-24 ml-auto px-2 py-1.5 border border-slate-200 rounded text-right text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-slate-900">
                          ₹{(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {po.items.length === 0 && (
                <div className="py-12 text-center text-slate-500 italic text-sm">
                  No items added to this order yet.
                </div>
              )}
            </Card>

            {/* Logistics & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-0 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <MapPin size={14} className="text-indigo-600" /> Shipping Address
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <Input
                    label="Address Line 1"
                    placeholder="Street address"
                    value={po.shipping_address_line1}
                    onChange={(e) => setPo({ ...po, shipping_address_line1: e.target.value })}
                    className="text-xs"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      placeholder="City"
                      value={po.shipping_city}
                      onChange={(e) => setPo({ ...po, shipping_city: e.target.value })}
                      className="text-xs"
                    />
                    <Input
                      label="Pincode"
                      placeholder="Pincode"
                      value={po.shipping_pincode}
                      onChange={(e) => setPo({ ...po, shipping_pincode: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Truck size={14} className="text-indigo-600" /> Logistics Details
                  </h3>
                </div>
                <div className="p-4 space-y-4">
                  <SearchableSelect
                    label="Incoterm"
                    value={po.incoterm}
                    onChange={(val) => setPo({ ...po, incoterm: val })}
                    options={[
                      { value: 'EXW', label: 'EXW - Ex Works' },
                      { value: 'FOB', label: 'FOB - Free on Board' },
                      { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
                      { value: 'DDP', label: 'DDP - Delivered Duty Paid' }
                    ]}
                    className="text-xs"
                  />
                  <Input
                    label="Shipping Rule"
                    placeholder="e.g., Courier, Freight"
                    value={po.shipping_rule}
                    onChange={(e) => setPo({ ...po, shipping_rule: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </Card>
            </div>
          </div>

          {/* Sidebar / Meta Information */}
          <div className="space-y-6">
            {/* General Info */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2 text-indigo-600 mb-2 border-b border-indigo-50 pb-3">
                <Info size={18} />
                <h3 className="text-sm font-bold">General Info</h3>
              </div>
              
              <div className="space-y-4">
                <SearchableSelect
                  label="Supplier *"
                  value={po.supplier_id}
                  onChange={handleSupplierChange}
                  options={suppliers.map(sup => ({ value: sup.supplier_id, label: sup.name }))}
                  placeholder="Select supplier..."
                  required
                />

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Order Date *</label>
                  <input
                    type="date"
                    value={po.order_date}
                    onChange={(e) => setPo({ ...po, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expected Delivery</label>
                  <input
                    type="date"
                    value={po.expected_date}
                    onChange={(e) => setPo({ ...po, expected_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>
            </Card>

            {/* Financial Summary */}
            <Card className="p-0 overflow-hidden border-indigo-100 bg-indigo-50/30">
              <div className="bg-indigo-600 px-4 py-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calculator size={18} /> Financial Summary
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold text-slate-900">₹{calculateSubtotal().toLocaleString('en-IN')}</span>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-indigo-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Tax Rate (%)</span>
                    <input
                      type="number"
                      value={po.tax_rate}
                      onChange={(e) => setPo({ ...po, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 border border-indigo-200 rounded text-right bg-white outline-none"
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tax Amount</span>
                    <span className="font-bold text-amber-600">+ ₹{calculateTaxAmount().toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-indigo-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Advance Paid</span>
                    <input
                      type="number"
                      value={po.advance_paid}
                      onChange={(e) => setPo({ ...po, advance_paid: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 border border-indigo-200 rounded text-right bg-white outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-indigo-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-indigo-600 uppercase">Grand Total</span>
                    <span className="text-xl font-black text-indigo-700">₹{calculateTotal().toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Terms */}
            <Card className="p-0 overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard size={14} className="text-indigo-600" /> Payment Terms
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <Input
                  label="Description"
                  placeholder="e.g., Net 30"
                  value={po.payment_terms_description}
                  onChange={(e) => setPo({ ...po, payment_terms_description: e.target.value })}
                  className="text-xs"
                />
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={po.due_date}
                    onChange={(e) => setPo({ ...po, due_date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
