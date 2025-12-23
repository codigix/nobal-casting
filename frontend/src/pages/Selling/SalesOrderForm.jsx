import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import SearchableSelect from '../../components/SearchableSelect'
import './Selling.css'

export default function SalesOrderForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const isReadOnly = searchParams.get('readonly') === 'true'
  const isEditMode = id && id !== 'new' && !isReadOnly

  const tabs = [
    { id: 'basicDetails', label: 'Basic Details' },
    { id: 'items', label: 'Items' },
    { id: 'bomDetails', label: 'BOM Details' }
  ]

  const [activeTabIndex, setActiveTabIndex] = useState(0)

  const [formData, setFormData] = useState({
    series: '',
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    bom_id: '',
    bom_name: '',
    quantity: 1,
    source_warehouse: '',
    delivery_date: '',
    order_type: 'Sales',
    items: [],
    status: 'Draft'
  })

  const [customers, setCustomers] = useState([])
  const [boms, setBoms] = useState([])
  const [itemsList, setItemsList] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [selectedBomData, setSelectedBomData] = useState(null)
  const [stockAvailability, setStockAvailability] = useState({})
  const [orderTypes, setOrderTypes] = useState([{ label: 'Sales', value: 'Sales' }])
  const [statuses, setStatuses] = useState([{ label: 'Draft', value: 'Draft' }, { label: 'Submitted', value: 'Submitted' }, { label: 'Confirmed', value: 'Confirmed' }])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [order, setOrder] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [canSave, setCanSave] = useState(true)
  const [bomRawMaterials, setBomRawMaterials] = useState([])
  const [bomOperations, setBomOperations] = useState([])
  const [bomFinishedGoods, setBomFinishedGoods] = useState([])
  const [refreshingBom, setRefreshingBom] = useState(false)
  const [expandedItemGroups, setExpandedItemGroups] = useState({})

  useEffect(() => {
    if (activeTabIndex === tabs.length - 1) {
      setCanSave(false)
      const timer = setTimeout(() => setCanSave(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [activeTabIndex])

  useEffect(() => {
    fetchRequiredData()
    fetchWarehouses()
    if (isEditMode || isReadOnly) {
      fetchOrder()
    }
  }, [])

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      const [custRes, bomRes, itemsRes] = await Promise.all([
        api.get('/selling/customers').catch(() => ({ data: { data: [] } })),
        api.get('/production/boms?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/items').catch(() => ({ data: { data: [] } }))
      ])

      setCustomers(custRes.data.data || [])
      const bomsData = bomRes.data.data || []
      setBoms(bomsData.map(b => ({
        label: `${b.bom_id} - ${b.product_name || b.name || ''}`,
        value: b.bom_id || b.id || '',
        fullData: b
      })))

      const itemsData = itemsRes.data.data || []
      setItemsList(itemsData.map(item => ({
        label: item.item_code,
        value: item.item_code,
        fullData: item
      })))
    } catch (err) {
      console.error('Failed to fetch required data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/stock/warehouses')
      const warehousesData = response.data.data || []
      setWarehouses(warehousesData.filter(w => w && w.warehouse_name).map(w => ({
        label: w.warehouse_name || '',
        value: w.warehouse_name || ''
      })))
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchStockAvailability = async (itemCode) => {
    try {
      const response = await api.get(`/stock/${itemCode}`)
      return response.data.data || 0
    } catch (err) {
      console.error('Failed to fetch stock:', err)
      return 0
    }
  }

  const formatCurrency = (value) => {
    return parseFloat(value || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/production/sales-orders/${id}`)
      const orderData = response.data.data
      setOrder(orderData)
      setFormData(prev => ({
        ...prev,
        series: orderData.series || '',
        date: orderData.date || new Date().toISOString().split('T')[0],
        customer_id: orderData.customer_id || '',
        customer_name: orderData.customer_name || '',
        customer_email: orderData.customer_email || '',
        customer_phone: orderData.customer_phone || '',
        bom_id: orderData.bom_id || '',
        bom_name: orderData.bom_name || '',
        quantity: orderData.quantity || 1,
        source_warehouse: orderData.source_warehouse || '',
        delivery_date: orderData.delivery_date || '',
        order_type: orderData.order_type || 'Sales',
        items: orderData.items || [],
        status: orderData.status || 'Draft'
      }))
    } catch (err) {
      setError('Failed to fetch sales order')
    }
  }

  const fetchBomDetails = async (bomId) => {
    try {
      setRefreshingBom(true)
      const response = await api.get(`/production/boms/${bomId}`)
      const bomData = response.data.data
      setSelectedBomData(bomData)

      const bomLines = bomData.lines || bomData.items || []
      const rawMaterials = bomData.rawMaterials || []
      const operations = bomData.operations || []
      
      const allItems = [
        ...bomLines.map((item, idx) => ({
          item_code: item.component_code || item.item_code || '',
          item_name: item.component_description || item.item_name || '',
          field_description: item.component_description || item.field_description || '',
          fg_sub_assembly: item.component_type || item.fg_sub_assembly || 'FG',
          delivery_date: '',
          commit_date: item.commit_date || '',
          qty: item.quantity || item.qty || 1,
          ordered_qty: item.ordered_qty || item.quantity || 1,
          rate: item.rate || 0,
          amount: (item.quantity || item.qty || 1) * (item.rate || 0),
          input_group: item.input_group || '',
          source_warehouse: item.source_warehouse || '',
          id: Date.now() + Math.random() + idx
        })),
        ...rawMaterials.map((item, idx) => ({
          item_code: item.item_code || '',
          item_name: item.item_name || '',
          field_description: item.item_name || '',
          fg_sub_assembly: 'Raw Material',
          delivery_date: '',
          commit_date: '',
          qty: item.qty || 1,
          ordered_qty: item.qty || 1,
          rate: item.rate || 0,
          amount: (item.qty || 1) * (item.rate || 0),
          input_group: '',
          source_warehouse: item.source_warehouse || '',
          id: Date.now() + Math.random() + 1000 + idx
        }))
      ]

      setBomRawMaterials(rawMaterials)
      setBomOperations(operations)
      setBomFinishedGoods(bomLines)

      setFormData(prev => ({
        ...prev,
        items: allItems
      }))
    } catch (err) {
      setError('Failed to fetch BOM details')
      console.error('Error fetching BOM:', err)
    } finally {
      setRefreshingBom(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleSearchableChange = (fieldName, value) => {
    setFormData({ ...formData, [fieldName]: value })
  }

  const handleBomChange = (value) => {
    const selectedBom = boms.find(b => b.value === value)
    const updatedData = {
      ...formData,
      bom_id: value,
      bom_name: selectedBom?.label || ''
    }
    if (selectedBom?.fullData?.source_warehouse) {
      updatedData.source_warehouse = selectedBom.fullData.source_warehouse
    }
    setFormData(updatedData)
    if (value) {
      fetchBomDetails(value)
    }
  }

  const handleCustomerChange = (value) => {
    const customer = customers.find(c => c.customer_id === value)
    setFormData({
      ...formData,
      customer_id: value,
      customer_name: customer?.customer_name || '',
      customer_email: customer?.email || '',
      customer_phone: customer?.phone || ''
    })
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          item_code: '',
          item_name: '',
          field_description: '',
          fg_sub_assembly: 'FG',
          delivery_date: '',
          commit_date: '',
          qty: 1,
          ordered_qty: 1,
          rate: 0,
          amount: 0,
          stock_available: 0,
          input_group: '',
          id: Date.now() + Math.random()
        }
      ]
    })
  }

  const handleRemoveItem = (idx) => {
    const updatedItems = formData.items.filter((_, i) => i !== idx)
    setFormData({ ...formData, items: updatedItems })
  }

  const handleItemChange = (idx, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: field === 'rate' || field === 'qty' || field === 'ordered_qty' ? parseFloat(value) || 0 : value
    }
    if (field === 'qty' || field === 'rate') {
      updatedItems[idx].amount = updatedItems[idx].qty * updatedItems[idx].rate
    }
    if (field === 'item_code' && value) {
      const selectedItem = itemsList.find(i => i.value === value)
      if (selectedItem) {
        updatedItems[idx].item_name = selectedItem.fullData.item_name || ''
        updatedItems[idx].field_description = selectedItem.fullData.description || ''
        updatedItems[idx].rate = selectedItem.fullData.standard_rate || 0
        updatedItems[idx].amount = updatedItems[idx].qty * (selectedItem.fullData.standard_rate || 0)
      }

      fetchStockAvailability(value).then(stock => {
        const itemsWithStock = [...formData.items]
        itemsWithStock[idx].stock_available = stock
        setFormData({ ...formData, items: itemsWithStock })
      })
    }
    setFormData({ ...formData, items: updatedItems })
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0)
  }

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal()
    const quantity = parseFloat(formData.quantity) || 1
    return subtotal * quantity
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    
    if (loading) return

    if (!formData.customer_id) {
      setError('Please select a customer')
      return
    }

    if (formData.items.length === 0 || calculateGrandTotal() === 0) {
      setError('Please add at least one item with a non-zero amount')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        ...formData,
        order_amount: calculateGrandTotal(),
        items: formData.items.map(({ id, ...item }) => item),
        bom_raw_materials: bomRawMaterials,
        bom_operations: bomOperations,
        bom_finished_goods: bomFinishedGoods
      }

      if (isEditMode) {
        await api.put(`/production/sales-orders/${id}`, payload)
        setSuccess('Sales order updated successfully')
      } else {
        await api.post('/production/sales-orders', payload)
        setSuccess('Sales order created successfully')
      }

      setTimeout(() => {
        navigate('/selling/sales-orders')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save sales order')
      setLoading(false)
    }
  }

  const nextTab = () => {
    if (activeTabIndex < tabs.length - 1) {
      setActiveTabIndex(activeTabIndex + 1)
    }
  }

  const prevTab = () => {
    if (activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1)
    }
  }

  const currentTab = tabs[activeTabIndex]

  const groupRawMaterialsByItemGroup = () => {
    const grouped = {}
    bomRawMaterials.forEach(material => {
      const group = material.item_group || 'Unclassified'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(material)
    })
    return grouped
  }

  const groupItemsByItemGroup = () => {
    const grouped = {}
    formData.items.forEach(item => {
      const group = item.item_group || 'Unclassified'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(item)
    })
    return grouped
  }

  const toggleItemGroup = (group) => {
    setExpandedItemGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  const groupedRawMaterials = groupRawMaterialsByItemGroup()
  const itemGroupsInOrder = Object.keys(groupedRawMaterials).sort()
  const groupedItems = groupItemsByItemGroup()
  const itemsGroupsInOrder = Object.keys(groupedItems).sort()

  if (dataLoading) {
    return <div className="max-w-full m-8 p-0">Loading form data...</div>
  }

  return (
    <div className="max-w-full m-8 p-0">
      <Card>
        <div className="mb-5 pb-3 border-b-2 border-gray-200">
          <h2 className="m-0 text-2xl font-bold text-gray-900">
            {isReadOnly ? 'View Sales Order' : isEditMode ? 'Edit Sales Order' : 'New Sales Order'}
          </h2>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="mb-5 border-b-2 border-gray-200">
            <div className="flex gap-2 overflow-x-auto pb-0 border-b-0">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabIndex(idx)}
                  className={`px-5 py-3 text-xs font-medium cursor-pointer border-b-4 border-transparent transition-all whitespace-nowrap ${activeTabIndex === idx
                      ? 'text-blue-600 border-b-blue-600'
                      : 'text-gray-600 hover:text-gray-700'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {currentTab.id === 'basicDetails' && (
            <div className="py-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Series</label>
                  <input
                    className="px-2 py-2 text-xs border border-gray-300 rounded bg-gray-100"
                    type="text"
                    name="series"
                    value={formData.series}
                    onChange={handleChange}
                    placeholder="Auto-generated"
                    disabled
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Date</label>
                  <input
                    className={`px-2 py-2 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`}
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex flex-col">
                  <SearchableSelect
                    label="Customer"
                    value={formData.customer_id}
                    onChange={(val) => handleCustomerChange(val)}
                    options={customers.filter(c => c && c.customer_id && c.customer_name).map(c => ({ label: c.customer_name, value: c.customer_id }))}
                    placeholder="Search customer..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Customer Name</label>
                  <input
                    className="px-2 py-2 text-xs border border-gray-300 rounded bg-gray-100"
                    type="text"
                    value={formData.customer_name}
                    disabled
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Email</label>
                  <input
                    className="px-2 py-2 text-xs border border-gray-300 rounded bg-gray-100"
                    type="email"
                    value={formData.customer_email}
                    disabled
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Phone</label>
                  <input
                    className="px-2 py-2 text-xs border border-gray-300 rounded bg-gray-100"
                    type="text"
                    value={formData.customer_phone}
                    disabled
                  />
                </div>
                <div className="flex flex-col">
                  <SearchableSelect
                    label="BOM"
                    value={formData.bom_id}
                    onChange={(val) => handleBomChange(val)}
                    options={boms}
                    placeholder="Search BOM..."
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Quantity</label>
                  <input
                    className={`px-2 py-2 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`}
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex flex-col">
                  <SearchableSelect
                    label="Source Warehouse"
                    value={formData.source_warehouse}
                    onChange={(val) => setFormData({ ...formData, source_warehouse: val })}
                    options={warehouses}
                    placeholder="Select warehouse..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Delivery Date</label>
                  <input
                    className={`px-2 py-2 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`}
                    type="date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleChange}
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1 text-gray-700">Order Type</label>
                  <select className={`px-2 py-2 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`} name="order_type" value={formData.order_type} onChange={handleChange} disabled={isReadOnly}>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mb-3">
                <div className="flex flex-col">
                  <SearchableSelect
                    label="Status"
                    value={formData.status}
                    onChange={(val) => handleSearchableChange('status', val)}
                    options={statuses}
                    placeholder="Select status..."
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'items' && (
            <div className="py-5">
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddItem}
                  className="mb-4 text-xs py-1 px-3"
                >
                  + Add Row
                </Button>
              )}

              {formData.items.length > 0 ? (
                <div className="space-y-2">
                  {itemsGroupsInOrder.map((groupName) => {
                    const groupItems = groupedItems[groupName]
                    const isExpanded = expandedItemGroups[groupName]
                    
                    return (
                      <div key={groupName} className="border border-gray-200 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleItemGroup(groupName)}
                          className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition p-3 group"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-left">
                              <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-700">{groupName}</h3>
                              <p className="text-xs text-gray-600 mt-0">{groupItems.length} items</p>
                            </div>
                          </div>
                          <div className="text-gray-600 flex-shrink-0">
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                  <th className="text-left py-2 px-2 font-semibold">Item Code</th>
                                  <th className="text-left py-2 px-2 font-semibold">Item Name</th>
                                  <th className="text-left py-2 px-2 font-semibold">Description</th>
                                  <th className="text-right py-2 px-2 font-semibold">Qty</th>
                                  <th className="text-left py-2 px-2 font-semibold">Rate (₹)</th>
                                  <th className="text-left py-2 px-2 font-semibold">Amount (₹)</th>
                                  <th className="text-left py-2 px-2 font-semibold">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupItems.map((item, idx) => {
                                  const globalIdx = formData.items.findIndex(i => 
                                    i.item_code === item.item_code && i.qty === item.qty
                                  )
                                  
                                  return (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-2 px-2">
                                        <SearchableSelect
                                          value={item.item_code}
                                          onChange={(val) => handleItemChange(globalIdx, 'item_code', val)}
                                          options={itemsList}
                                          placeholder="Select Item"
                                          disabled={isReadOnly}
                                        />
                                      </td>
                                      <td className="py-2 px-2">
                                        <input
                                          className={`w-full px-2 py-1 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`}
                                          type="text"
                                          value={item.item_name}
                                          onChange={(e) => handleItemChange(globalIdx, 'item_name', e.target.value)}
                                          placeholder="Item name"
                                          disabled={isReadOnly}
                                        />
                                      </td>
                                      <td className="py-2 px-2">
                                        <input
                                          className={`w-full px-2 py-1 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`}
                                          type="text"
                                          value={item.field_description}
                                          onChange={(e) => handleItemChange(globalIdx, 'field_description', e.target.value)}
                                          placeholder="Description"
                                          disabled={isReadOnly}
                                        />
                                      </td>
                                      <td className="py-2 px-2 text-right">
                                        <input
                                          className={`w-full px-2 py-1 text-xs border border-gray-300 rounded text-right ${isReadOnly ? 'bg-gray-100' : ''}`}
                                          type="number"
                                          value={item.qty}
                                          onChange={(e) => handleItemChange(globalIdx, 'qty', e.target.value)}
                                          placeholder="0"
                                          step="0.01"
                                          min="0"
                                          disabled={isReadOnly}
                                        />
                                      </td>
                                      <td className="py-2 px-2">
                                        <input
                                          className={`w-full px-2 py-1 text-xs border border-gray-300 rounded ${isReadOnly ? 'bg-gray-100' : ''}`}
                                          type="number"
                                          value={item.rate}
                                          onChange={(e) => handleItemChange(globalIdx, 'rate', e.target.value)}
                                          placeholder="0"
                                          step="0.01"
                                          min="0"
                                          disabled={isReadOnly}
                                        />
                                      </td>
                                      <td className="py-2 px-2">
                                        {parseFloat(item.amount || (item.qty * item.rate) || 0).toFixed(2)}
                                      </td>
                                      <td className="py-2 px-2">
                                        {!isReadOnly && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveItem(globalIdx)}
                                            className="px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded text-xs font-medium hover:bg-red-200"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-gray-100 p-5 rounded text-center text-gray-500 text-xs">
                  No items added. Click "Add Row" to add items or select a BOM in Basic Details tab.
                </div>
              )}

              {formData.items.length > 0 && (
                <div className="bg-blue-50 border border-gray-200 rounded  px-6 py-6 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="mb-2 text-xs text-gray-600 flex justify-between">
                        <span>Subtotal:</span>
                        <strong>{formatCurrency(calculateSubtotal())}</strong>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-bold text-blue-600 flex justify-between">
                        <span>Grand Total:</span>
                        <strong>{formatCurrency(calculateGrandTotal())}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTab.id === 'bomDetails' && (
            <div className="py-5">
              {formData.bom_id && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => fetchBomDetails(formData.bom_id)}
                  disabled={refreshingBom}
                  className="mb-4 px-4 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {refreshingBom ? '⏳ Refreshing...' : '🔄 Refresh BOM Details'}
                </button>
              )}
              {bomFinishedGoods.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white border border-gray-200 rounded">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-800">
                      📦 Finished Goods ({bomFinishedGoods.length})
                    </div>
                    <div className="p-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-semibold">Item Code</th>
                            <th className="text-left py-2 px-2 font-semibold">Description</th>
                            <th className="text-left py-2 px-2 font-semibold">Type</th>
                            <th className="text-right py-2 px-2 font-semibold">Qty</th>
                            <th className="text-left py-2 px-2 font-semibold">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomFinishedGoods.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-2">{item.component_code || item.item_code || '-'}</td>
                              <td className="py-2 px-2">{item.component_description || item.item_name || '-'}</td>
                              <td className="py-2 px-2">{item.component_type || item.fg_sub_assembly || '-'}</td>
                              <td className="py-2 px-2 text-right">{item.quantity || item.qty || 1}</td>
                              <td className="py-2 px-2">₹{parseFloat(item.rate || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {bomRawMaterials.length > 0 && (
                <div className="mb-5 space-y-2">
                  <div className="bg-white border border-gray-200 rounded px-4 py-3 font-semibold text-sm text-gray-800">
                    🔧 Materials ({bomRawMaterials.length})
                  </div>
                  {itemGroupsInOrder.map((groupName) => {
                    const groupItems = groupedRawMaterials[groupName]
                    const isExpanded = expandedItemGroups[groupName]
                    
                    return (
                      <div key={groupName} className="border border-gray-200 rounded overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleItemGroup(groupName)}
                          className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition p-3 group"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-left">
                              <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-700">{groupName}</h3>
                              <p className="text-xs text-gray-600 mt-0">{groupItems.length} items</p>
                            </div>
                          </div>
                          <div className="text-gray-600 flex-shrink-0">
                            {isExpanded ? '▲' : '▼'}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200 bg-gray-50">
                                  <th className="text-left py-2 px-2 font-semibold">Item Code</th>
                                  <th className="text-left py-2 px-2 font-semibold">Item Name</th>
                                  <th className="text-right py-2 px-2 font-semibold">Qty</th>
                                  <th className="text-left py-2 px-2 font-semibold">UOM</th>
                                  <th className="text-left py-2 px-2 font-semibold">Rate</th>
                                  <th className="text-left py-2 px-2 font-semibold">Warehouse</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupItems.map((item, idx) => (
                                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-2 px-2">{item.item_code || '-'}</td>
                                    <td className="py-2 px-2">{item.item_name || '-'}</td>
                                    <td className="py-2 px-2 text-right">{item.qty || item.quantity || 1}</td>
                                    <td className="py-2 px-2">{item.uom || '-'}</td>
                                    <td className="py-2 px-2">₹{parseFloat(item.rate || 0).toFixed(2)}</td>
                                    <td className="py-2 px-2">{item.source_warehouse || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {bomOperations.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white border border-gray-200 rounded">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-semibold text-sm text-gray-800">
                      ⚙️ Operations ({bomOperations.length})
                    </div>
                    <div className="p-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-semibold">Operation</th>
                            <th className="text-left py-2 px-2 font-semibold">Workstation</th>
                            <th className="text-right py-2 px-2 font-semibold">Time (Hours)</th>
                            <th className="text-right py-2 px-2 font-semibold">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomOperations.map((op, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 px-2">{op.operation || op.operation_name || '-'}</td>
                              <td className="py-2 px-2">{op.workstation_type || op.workstation || op.default_workstation || '-'}</td>
                              <td className="py-2 px-2 text-right">{op.operation_time || op.time_in_hours || op.hours || '-'}</td>
                              <td className="py-2 px-2 text-right">₹{parseFloat(op.operating_cost || op.cost || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {bomFinishedGoods.length === 0 && bomRawMaterials.length === 0 && bomOperations.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4 text-center text-blue-700 text-sm">
                  Select a BOM in Basic Details tab to view BOM details here.
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2.5 justify-between mt-7 pt-5 border-t border-gray-200">
            {!isReadOnly && (
              <Button
                type="button"
                variant="secondary"
                onClick={prevTab}
                disabled={activeTabIndex === 0}
              >
                ← Previous
              </Button>
            )}

            <span className="text-xs text-gray-600 self-center">
              Step {activeTabIndex + 1} of {tabs.length}
            </span>

            {isReadOnly ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/selling/sales-orders')}
              >
                ← Back
              </Button>
            ) : activeTabIndex === tabs.length - 1 ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Sales Order'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={nextTab}
              >
                Next →
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
