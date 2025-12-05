import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Input from '../../components/Input/Input'
import Badge from '../../components/Badge/Badge'
import SearchableSelect from '../../components/SearchableSelect'
import { Trash2, Plus } from 'lucide-react'
import './Buying.css'

export default function PurchaseOrderForm() {
  const { po_no } = useParams()
  const navigate = useNavigate()
  const searchTimeoutRef = useRef(null)
  const [suppliers, setSuppliers] = useState([])
  const [items, setItems] = useState([])
  const [itemSearchResults, setItemSearchResults] = useState([])
  const [itemSearchLoading, setItemSearchLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [po, setPo] = useState({
    supplier_id: '',
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    items: [],
    tax_category: '',
    tax_rate: 0,
    shipping_rule: '',
    incoterm: '',
    advance_paid: 0,
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_pincode: '',
    shipping_country: '',
    payment_terms_description: '',
    due_date: '',
    invoice_portion: 100,
    payment_amount: 0
  })

  useEffect(() => {
    fetchSuppliers()
    fetchItems()
    if (po_no && po_no !== 'new') {
      fetchPO()
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [po_no])

  useEffect(() => {
    if (items.length === 0) {
      fetchItems()
    }
  }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/suppliers`)
      const data = await res.json()
      
      if (!res.ok) {
        console.error('API Error fetching suppliers:', data)
        return
      }
      
      const suppliersData = data.success ? data.data : (Array.isArray(data) ? data : [])
      if (suppliersData && suppliersData.length > 0) {
        setSuppliers(suppliersData)
        console.log('Suppliers fetched successfully:', suppliersData.length)
      }
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/items`)
      const data = await res.json()
      
      if (!res.ok) {
        console.error('API Error fetching items:', data)
        return
      }

      const itemsData = data.success ? data.data : (Array.isArray(data) ? data : [])
      if (itemsData && itemsData.length > 0) {
        setItems(itemsData)
        setItemSearchResults(itemsData)
        console.log('Items fetched successfully:', itemsData.length)
      } else {
        console.warn('No items found in response:', data)
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const searchItems = (searchTerm) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchTerm.trim()) {
      const itemsToShow = items.length > 0 ? items : itemSearchResults
      setItemSearchResults(itemsToShow)
      setItemSearchLoading(false)
      console.log('Showing all items:', itemsToShow.length)
      return
    }

    setItemSearchLoading(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const searchQuery = encodeURIComponent(searchTerm)
        const res = await fetch(`${import.meta.env.VITE_API_URL}/items?search=${searchQuery}`)
        const data = await res.json()
        
        const itemsData = data.success && data.data ? data.data : []
        if (itemsData.length > 0) {
          setItemSearchResults(itemsData)
        } else {
          const localFiltered = items.filter(item => 
            (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.item_code && item.item_code.toLowerCase().includes(searchTerm.toLowerCase()))
          )
          setItemSearchResults(localFiltered)
        }
      } catch (error) {
        console.error('Error searching items:', error)
        const localFiltered = items.filter(item => 
          (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.item_code && item.item_code.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        setItemSearchResults(localFiltered)
      } finally {
        setItemSearchLoading(false)
      }
    }, 300)
  }

  const fetchPO = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/purchase-orders/${po_no}`)
      const data = await res.json()
      if (data.success) {
        setPo(data.data)
      }
    } catch (error) {
      console.error('Error fetching PO:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setPo({
      ...po,
      items: [...po.items, { item_code: '', item_name: '', qty: 0, uom: 'PCS', rate: 0, tax_rate: 0, description: '' }]
    })
  }

  const handleItemChange = async (value, index) => {
    const newItems = [...po.items]
    const selectedItem = items.find(i => i.item_code === value)
    
    if (selectedItem) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/items/${value}`)
        const data = await res.json()
        
        if (data.success) {
          const itemDetails = data.data
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
        console.error('Error fetching item details:', error)
        newItems[index] = {
          ...newItems[index],
          item_code: value,
          item_name: selectedItem.name || '',
          uom: selectedItem.uom || 'PCS'
        }
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        item_code: value
      }
    }
    
    setPo({ ...po, items: newItems })
  }

  const handleRemoveItem = (index) => {
    setPo({
      ...po,
      items: po.items.filter((_, i) => i !== index)
    })
  }

  const calculateSubtotal = () => {
    return po.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
  }

  const calculateTaxAmount = () => {
    const subtotal = calculateSubtotal()
    return (subtotal * (po.tax_rate || 0)) / 100
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const taxAmount = calculateTaxAmount()
    return subtotal + taxAmount - (po.advance_paid || 0)
  }

  const getTotalQty = () => {
    return po.items.reduce((total, item) => total + (item.qty || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const method = po_no ? 'PUT' : 'POST'
      const url = po_no ? `${import.meta.env.VITE_API_URL}/purchase-orders/${po_no}` : `${import.meta.env.VITE_API_URL}/purchase-orders`
      
      const submitData = {
        ...po,
        subtotal: calculateSubtotal(),
        tax_amount: calculateTaxAmount(),
        final_amount: calculateTotal(),
        accounting_emails: ['accounts@company.com']
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })
      
      const data = await res.json()
      if (data.success) {
        alert('Purchase Order saved successfully!')
        navigate('/buying/purchase-orders')
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='p-6'>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          {po_no ? '✏️ Edit Purchase Order' : '➕ Create Purchase Order'}
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          {po_no ? `Update purchase order details` : `Create a new purchase order for your suppliers`}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Section 1: Basic Information */}
        <Card className="mb-6 ">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-neutral-200 dark:border-neutral-700">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 m-0">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <SearchableSelect
                label="Supplier *"
                value={po.supplier_id}
                onChange={handleSupplierChange}
                options={suppliers.map(sup => ({ value: sup.supplier_id, label: `${sup.supplier_id || sup.id || ''} - ${sup.name}` }))}
                placeholder="Search supplier..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Order Date *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.order_date}
                onChange={(e) => setPo({ ...po, order_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Expected Delivery Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.expected_date}
                onChange={(e) => setPo({ ...po, expected_date: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Items */}
        <Card className="mb-6 ">
          <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 m-0">Purchase Items</h2>
            </div>
            <Button
              type="button"
              onClick={handleAddItem}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800"
            >
              <Plus size={18} /> Add Item
            </Button>
          </div>

          {po.items.length === 0 ? (
            <div className="py-10 px-5 text-center bg-neutral-50 dark:bg-neutral-800 rounded-lg border-2 border-dashed border-neutral-300 dark:border-neutral-600">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">📋 No items added yet</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 m-0">Click "Add Item" button above to start adding items to this purchase order</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-700 border-b-2 border-neutral-200 dark:border-neutral-600">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100">Item Name</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-900 dark:text-neutral-100 w-24">Qty</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-900 dark:text-neutral-100 w-20">UOM</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100 w-28">Rate</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-neutral-100 w-32">Amount</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-900 dark:text-neutral-100 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map((item, index) => (
                    <tr key={index} className={`border-b border-neutral-200 dark:border-neutral-600 ${index % 2 === 0 ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-750'}`}>
                      <td className="px-4 py-3">
                        <SearchableSelect
                          value={item.item_code}
                          onChange={(value) => handleItemChange(value, index)}
                          options={(itemSearchResults.length > 0 ? itemSearchResults : items).map(itm => ({ value: itm.item_code, label: `${itm.item_code} - ${itm.name}` }))}
                          placeholder="Search item..."
                          onSearch={searchItems}
                          isLoading={itemSearchLoading}
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          placeholder="0"
                          value={item.qty}
                          onChange={(e) => {
                            const newItems = [...po.items]
                            newItems[index].qty = parseFloat(e.target.value) || 0
                            setPo({ ...po, items: newItems })
                          }}
                          className="w-full px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded text-center text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="text"
                          placeholder="UOM"
                          value={item.uom}
                          onChange={(e) => {
                            const newItems = [...po.items]
                            newItems[index].uom = e.target.value
                            setPo({ ...po, items: newItems })
                          }}
                          className={`w-full px-2 py-1 border rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${item.item_code ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-neutral-100' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-neutral-100'}`}
                          disabled
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => {
                            const newItems = [...po.items]
                            newItems[index].rate = parseFloat(e.target.value) || 0
                            setPo({ ...po, items: newItems })
                          }}
                          className={`w-full px-2 py-1 border rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${item.item_code && item.rate > 0 ? 'border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-neutral-100' : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 dark:text-neutral-100'}`}
                        />
                      </td>

                      <td className="px-4 py-3 text-right font-bold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        ₹{(item.qty * item.rate).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded border border-red-200 dark:border-red-800 transition-colors inline-flex items-center justify-center"
                          title="Delete item"
                        >
                          <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Section 3: Item Summary */}
        <Card className="mb-6 ">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2">📋 Total Items</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 m-0">
                {po.items.length}
              </p>
            </div>
            <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2">⚖️ Total Quantity</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 m-0">
                {getTotalQty().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-2">💰 Subtotal</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 m-0">
                ₹{calculateSubtotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        {/* Section 4: Tax & Charges */}
        <Card className="mb-6 ">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-neutral-200 dark:border-neutral-700">
            <span className="text-2xl">💳</span>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 m-0">Tax & Charges</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
            <div>
              <SearchableSelect
                label="Tax Category"
                value={po.tax_category}
                onChange={(value) => setPo({ ...po, tax_category: value })}
                options={[
                  { value: 'GST', label: 'GST' },
                  { value: 'VAT', label: 'VAT' },
                  { value: 'ST', label: 'Service Tax' },
                  { value: 'Other', label: 'Other' }
                ]}
                placeholder="Search tax category..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.tax_rate}
                onChange={(e) => setPo({ ...po, tax_rate: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Tax Amount
              </label>
              <div className="px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-300 font-semibold text-sm">
                ₹{calculateTaxAmount().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Advance Paid (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.advance_paid}
                onChange={(e) => setPo({ ...po, advance_paid: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t-2 border-neutral-200 dark:border-neutral-700">
            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Shipping Rule
              </label>
              <input
                type="text"
                placeholder="e.g., FOB, CIF"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_rule}
                onChange={(e) => setPo({ ...po, shipping_rule: e.target.value })}
              />
            </div>

            <div>
              <SearchableSelect
                label="Incoterm"
                value={po.incoterm}
                onChange={(value) => setPo({ ...po, incoterm: value })}
                options={[
                  { value: 'EXW', label: 'EXW - Ex Works' },
                  { value: 'FCA', label: 'FCA - Free Carrier' },
                  { value: 'FAS', label: 'FAS - Free Alongside Ship' },
                  { value: 'FOB', label: 'FOB - Free on Board' },
                  { value: 'CFR', label: 'CFR - Cost and Freight' },
                  { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
                  { value: 'DAP', label: 'DAP - Delivered at Place' },
                  { value: 'DDP', label: 'DDP - Delivered Duty Paid' }
                ]}
                placeholder="Search incoterm..."
              />
            </div>
          </div>
        </Card>

        {/* Section 5: Final Amount Summary */}
        <Card className="mb-6  bg-emerald-50 dark:bg-emerald-900/10">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-emerald-200 dark:border-emerald-800">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 m-0">Final Amount Summary</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-neutral-800 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Subtotal Amount</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 m-0">
                ₹{calculateSubtotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-neutral-800 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Tax ({po.tax_rate || 0}%)</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 m-0">
                ₹{calculateTaxAmount().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-neutral-800 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-2">Advance Paid</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 m-0">
                ₹{(po.advance_paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-5 bg-emerald-600 dark:bg-emerald-700 rounded-lg border-2 border-emerald-700 dark:border-emerald-600">
              <p className="text-xs font-semibold text-emerald-50 uppercase mb-2">💵 Final Amount (After Advance)</p>
              <p className="text-3xl font-bold text-white m-0">
                ₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        {/* Section 6: Shipping Address */}
        <Card className="mb-6 ">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-neutral-200 dark:border-neutral-700">
            <span className="text-2xl">📍</span>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 m-0">Shipping Address</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Address Line 1
              </label>
              <input
                type="text"
                placeholder="Street address"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_address_line1}
                onChange={(e) => setPo({ ...po, shipping_address_line1: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Address Line 2
              </label>
              <input
                type="text"
                placeholder="Apartment, suite, etc."
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_address_line2}
                onChange={(e) => setPo({ ...po, shipping_address_line2: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                City
              </label>
              <input
                type="text"
                placeholder="City"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_city}
                onChange={(e) => setPo({ ...po, shipping_city: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                State/Province
              </label>
              <input
                type="text"
                placeholder="State/Province"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_state}
                onChange={(e) => setPo({ ...po, shipping_state: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Pincode
              </label>
              <input
                type="text"
                placeholder="Postal code"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_pincode}
                onChange={(e) => setPo({ ...po, shipping_pincode: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Country
              </label>
              <input
                type="text"
                placeholder="Country"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.shipping_country}
                onChange={(e) => setPo({ ...po, shipping_country: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Section 7: Payment Terms */}
        <Card className="mb-8 ">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-neutral-200 dark:border-neutral-700">
            <span className="text-2xl">📅</span>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 m-0">Payment Terms</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Payment Terms Description
              </label>
              <input
                type="text"
                placeholder="e.g., Net 30, Net 60, etc."
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.payment_terms_description}
                onChange={(e) => setPo({ ...po, payment_terms_description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Due Date
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.due_date}
                onChange={(e) => setPo({ ...po, due_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Invoice Portion (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="100"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.invoice_portion}
                onChange={(e) => setPo({ ...po, invoice_portion: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-700 dark:text-neutral-100 transition-colors hover:border-primary-400 dark:hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                value={po.payment_amount}
                onChange={(e) => setPo({ ...po, payment_amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-4">
            <p className="text-sm text-amber-900 dark:text-amber-300 m-0 flex items-center gap-2">
              <span>💡</span>
              <span>
                <strong>Payment Reminder:</strong> Due date {po.due_date ? `(${new Date(po.due_date).toLocaleDateString('en-IN')})` : '(not set)'} - Reminders will be sent to Accounts Department
              </span>
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-start">
          <Button
            type="submit"
            disabled={loading}
            variant="primary"
            className="px-8 py-3 font-semibold"
          >
            {loading ? '⏳ Saving...' : '✓ Save Purchase Order'}
          </Button>
          <Button
            type="button"
            onClick={() => navigate('/buying/purchase-orders')}
            variant="outline"
            className="px-8 py-3 font-semibold"
          >
            ✕ Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
