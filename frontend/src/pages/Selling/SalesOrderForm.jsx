import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import * as productionService from '../../services/productionService'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import SearchableSelect from '../../components/SearchableSelect'
import './Selling.css'

const isSubAssemblyType = (itemType) => {
  if (!itemType) return false
  const normalized = itemType.toLowerCase().replace(/[-\s]/g, '').trim()
  return normalized === 'subassemblies' || normalized === 'subassembly'
}

export default function SalesOrderForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(window.location.search)
  const isReadOnly = searchParams.get('readonly') === 'true'
  const isEditMode = id && id !== 'new' && !isReadOnly

  const tabs = [
    { id: 'basicDetails', label: 'Basic Details' },
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
    source_warehouse: '',
    delivery_date: '',
    order_type: 'Sales',
    qty: 1,
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
  const [bomComponentQties, setBomComponentQties] = useState({})

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
      
      const finishedGoodsBoms = bomsData.filter(b => 
        !b.items_group || b.items_group === 'Finished Goods' || b.item_code?.startsWith('FG-')
      )
      
      console.log('BOMs Data:', bomsData)
      console.log('Filtered Finished Goods BOMs:', finishedGoodsBoms)
      
      setBoms(finishedGoodsBoms.map(b => ({
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
      const orderDate = orderData.created_at 
        ? new Date(orderData.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      const orderQty = orderData.qty || 1
      setFormData(prev => ({
        ...prev,
        series: orderData.series || '',
        date: orderDate,
        customer_id: orderData.customer_id || '',
        customer_name: orderData.customer_name || '',
        customer_email: orderData.customer_email || '',
        customer_phone: orderData.customer_phone || '',
        bom_id: orderData.bom_id || '',
        bom_name: orderData.bom_name || '',
        source_warehouse: orderData.source_warehouse || '',
        delivery_date: orderData.delivery_date || '',
        order_type: orderData.order_type || 'Sales',
        items: orderData.items || [],
        status: orderData.status || 'Draft',
        qty: orderQty
      }))

      try {
        const rawMaterials = typeof orderData.bom_raw_materials === 'string' 
          ? JSON.parse(orderData.bom_raw_materials) 
          : (orderData.bom_raw_materials || [])
        const operations = typeof orderData.bom_operations === 'string'
          ? JSON.parse(orderData.bom_operations)
          : (orderData.bom_operations || [])
        const finishedGoods = typeof orderData.bom_finished_goods === 'string'
          ? JSON.parse(orderData.bom_finished_goods)
          : (orderData.bom_finished_goods || [])

        setBomRawMaterials(rawMaterials)
        setBomOperations(operations)
        setBomFinishedGoods(finishedGoods)

        if ((finishedGoods.length === 0 || rawMaterials.length === 0 || operations.length === 0) && orderData.bom_id) {
          console.log('BOM data is incomplete, refetching from API...')
          await fetchBomDetails(orderData.bom_id, orderQty)
        }
      } catch (err) {
        console.warn('Error parsing BOM data from saved order, refetching...', err)
        if (orderData.bom_id) {
          await fetchBomDetails(orderData.bom_id, orderQty)
        }
      }
    } catch (err) {
      setError('Failed to fetch sales order')
    }
  }

  const fetchSubAssemblyItems = async (itemCode, parentQty, salesQty) => {
    try {
      console.log('Fetching sub-assembly items for:', itemCode, 'parentQty:', parentQty, 'salesQty:', salesQty)
      const subBomsRes = await api.get(`/production/boms?item_code=${itemCode}`)
      const subBoms = subBomsRes.data.data || []
      console.log('Sub-assembly BOMs found:', subBoms)
      if (!subBoms || subBoms.length === 0) {
        console.log('No sub-assembly BOM found for:', itemCode)
        return []
      }
      
      const subBom = subBoms[0]
      console.log('Selected sub-assembly BOM:', subBom)
      const subBomDetails = await api.get(`/production/boms/${subBom.bom_id}`)
      console.log('Sub-assembly BOM Details Response:', subBomDetails)
      const subBomData = subBomDetails.data && subBomDetails.data.data ? subBomDetails.data.data : subBomDetails.data
      const subBomLines = subBomData.lines || subBomData.items || []
      console.log('Sub-assembly BOM Lines:', subBomLines)
      
      const items = []
      console.log(`Processing ${subBomLines.length} sub-assembly components`)
      
      for (const subItem of subBomLines) {
        const subItemCode = subItem.component_code || subItem.item_code || ''
        const subBomQty = subItem.quantity || subItem.qty || 1
        const subTotalQty = (subBomQty * parentQty) * salesQty
        
        console.log(`Sub-item - Code: ${subItemCode}, BomQty: ${subBomQty}, ParentQty: ${parentQty}, SalesQty: ${salesQty}, TotalQty: ${subTotalQty}`)

        let subItemName = subItem.component_description || subItem.item_name || ''
        let subItemDescription = subItem.component_description || subItem.field_description || ''
        
        if (!subItemName && subItemCode) {
          try {
            const itemDetails = await productionService.getItemDetails(subItemCode)
            if (itemDetails && itemDetails.data) {
              subItemName = itemDetails.data.name || itemDetails.data.item_name || subItemCode
              subItemDescription = itemDetails.data.description || subItemName
              console.log(`Fetched sub-item details: ${subItemCode} = ${subItemName}`)
            }
          } catch (err) {
            console.warn(`Failed to fetch item details for ${subItemCode}:`, err)
            subItemName = subItemCode
          }
        }

        const subItemObj = {
          item_code: subItemCode,
          item_name: subItemName,
          field_description: subItemDescription,
          fg_sub_assembly: subItem.component_type || subItem.fg_sub_assembly || 'Component',
          delivery_date: '',
          commit_date: subItem.commit_date || '',
          qty: subTotalQty,
          ordered_qty: subBomQty,
          rate: subItem.rate || 0,
          amount: subTotalQty * (subItem.rate || 0),
          input_group: subItem.input_group || '',
          source_warehouse: subItem.source_warehouse || '',
          bom_qty: subBomQty,
          parent_item: itemCode,
          id: Date.now() + Math.random()
        }
        
        items.push(subItemObj)
        console.log('Added sub-item:', subItemObj)
      }
      console.log(`Returning ${items.length} sub-assembly items for ${itemCode}:`, items)
      return items
    } catch (err) {
      console.warn(`Could not fetch BOM for ${itemCode}:`, err)
      return []
    }
  }

  const fetchBomDetails = async (bomId, quantity) => {
    try {
      setRefreshingBom(true)
      console.log('Fetching BOM details for:', bomId)
      const response = await api.get(`/production/boms/${bomId}`)
      console.log('BOM API Response:', response)
      
      const bomData = response.data && response.data.data ? response.data.data : response.data
      console.log('BOM Data extracted:', bomData)
      setSelectedBomData(bomData)

      const bomLines = bomData.lines || bomData.items || []
      const rawMaterials = bomData.rawMaterials || []
      const operations = bomData.operations || []
      const salesQty = parseFloat(quantity !== undefined ? quantity : formData.qty) || 1
      
      console.log('BOM Lines:', bomLines)
      console.log('Sales Qty:', salesQty)
      
      const componentQties = {}
      let allItems = []
      let idCounter = 0

      for (const item of bomLines) {
        const itemCode = item.component_code || item.item_code || ''
        const bomQty = item.quantity || item.qty || 1
        const totalQty = bomQty * salesQty
        const itemType = item.component_type || item.fg_sub_assembly || 'Sub-Assembly'
        
        componentQties[itemCode] = bomQty
        
        console.log(`Processing BOM line - Code: ${itemCode}, Type: ${itemType}, Qty: ${bomQty}`)

        let itemName = item.component_description || item.item_name || ''
        let itemDescription = item.component_description || item.field_description || ''
        
        if (!itemName && itemCode) {
          try {
            const itemDetails = await productionService.getItemDetails(itemCode)
            if (itemDetails && itemDetails.data) {
              itemName = itemDetails.data.name || itemDetails.data.item_name || itemCode
              itemDescription = itemDetails.data.description || itemName
              console.log(`Fetched item details for ${itemCode}: ${itemName}`)
            }
          } catch (err) {
            console.warn(`Failed to fetch item details for ${itemCode}:`, err)
            itemName = itemCode
          }
        }

        const itemObj = {
          item_code: itemCode,
          item_name: itemName,
          field_description: itemDescription,
          fg_sub_assembly: itemType,
          delivery_date: '',
          commit_date: item.commit_date || '',
          qty: totalQty,
          ordered_qty: item.ordered_qty || item.quantity || 1,
          rate: item.rate || 0,
          amount: totalQty * (item.rate || 0),
          input_group: item.input_group || '',
          source_warehouse: item.source_warehouse || '',
          bom_qty: bomQty,
          id: Date.now() + Math.random() + idCounter++
        }
        
        allItems.push(itemObj)
        console.log('Added item to allItems:', itemObj)

        if (isSubAssemblyType(itemType)) {
          console.log(`Fetching sub-assembly items for: ${itemCode}`)
          const subItems = await fetchSubAssemblyItems(itemCode, bomQty, salesQty)
          console.log(`Got ${subItems.length} sub-items for ${itemCode}:`, subItems)
          allItems = allItems.concat(subItems)
          
          for (const subItem of subItems) {
            if (!componentQties[subItem.item_code]) {
              componentQties[subItem.item_code] = 0
            }
            componentQties[subItem.item_code] += subItem.ordered_qty
          }
        }
      }

      console.log('Final allItems array:', allItems)
      console.log('Total items to display:', allItems.length)
      
      if (allItems.length === 0) {
        console.warn('WARNING: No items were processed from BOM lines!')
        console.warn('bomLines:', bomLines)
        console.warn('bomLines.length:', bomLines.length)
      }
      
      setBomComponentQties(componentQties)
      setBomRawMaterials(rawMaterials)
      setBomOperations(operations)
      setBomFinishedGoods(bomLines)
      
      const groupedMaterials = {}
      rawMaterials.forEach(material => {
        const group = material.item_group || 'Unclassified'
        if (!groupedMaterials[group]) {
          groupedMaterials[group] = true
        }
      })
      setExpandedItemGroups(groupedMaterials)

      console.log('Setting formData.items to:', allItems)
      setFormData(prev => {
        console.log('Previous formData:', prev)
        const newData = {
          ...prev,
          items: allItems
        }
        console.log('New formData being set:', newData)
        return newData
      })
      
      console.log('After setFormData call - items should be populated')
    } catch (err) {
      setError('Failed to fetch BOM details')
      console.error('Error fetching BOM:', err)
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
    } finally {
      setRefreshingBom(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let finalValue = type === 'checkbox' ? checked : value
    
    setFormData({
      ...formData,
      [name]: finalValue
    })
  }

  const handleSearchableChange = (fieldName, value) => {
    setFormData({ ...formData, [fieldName]: value })
  }

  const handleBomChange = (value) => {
    console.log('BOM Changed to:', value)
    const selectedBom = boms.find(b => b.value === value)
    console.log('Selected BOM:', selectedBom)
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
      const bomQty = formData.qty || 1
      console.log('Calling fetchBomDetails with:', value, 'Qty:', bomQty)
      fetchBomDetails(value, bomQty)
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
          bom_qty: 1,
          id: Date.now() + Math.random()
        }
      ]
    })
  }

  const handleRemoveItem = (idx) => {
    const updatedItems = formData.items.filter((_, i) => i !== idx)
    setFormData({ ...formData, items: updatedItems })
  }

  const handleItemChange = async (idx, field, value) => {
    const updatedItems = [...formData.items]
    updatedItems[idx] = {
      ...updatedItems[idx],
      [field]: field === 'rate' || field === 'qty' || field === 'ordered_qty' ? parseFloat(value) || 0 : value
    }
    if (field === 'item_code' && value) {
      const selectedItem = itemsList.find(i => i.value === value)
      if (selectedItem) {
        updatedItems[idx].item_name = selectedItem.fullData.item_name || ''
        updatedItems[idx].field_description = selectedItem.fullData.description || ''
        updatedItems[idx].rate = selectedItem.fullData.standard_rate || 0
      }

      fetchStockAvailability(value).then(stock => {
        const itemsWithStock = [...formData.items]
        itemsWithStock[idx].stock_available = stock
        setFormData({ ...formData, items: itemsWithStock })
      })

      try {
        const bomsData = await productionService.getBOMs({ item_code: value })
        const bomList = bomsData.data || []
        if (bomList.length > 0) {
          const defaultBom = bomList[0]
          setFormData(prev => ({
            ...prev,
            bom_id: defaultBom.bom_id,
            bom_name: defaultBom.bom_id
          }))
          await fetchBomDetails(defaultBom.bom_id)
          setSuccess(`BOM ${defaultBom.bom_id} auto-selected for item ${value}`)
          setTimeout(() => setSuccess(null), 3000)
        }
      } catch (err) {
        console.log('No BOMs found for item:', value)
      }
    }
    setFormData({ ...formData, items: updatedItems })
  }

  const calculateTotalQuantity = () => {
    return formData.items.reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0)
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      const itemAmount = (parseFloat(item.qty) || 0) * (item.rate || 0)
      return sum + itemAmount
    }, 0)
  }

  const calculateGrandTotal = () => {
    return calculateSubtotal()
  }

  const handleQuantityChange = (e) => {
    const newQty = e.target.value === '' ? '' : (parseFloat(e.target.value) || 1)
    const oldQty = parseFloat(formData.qty) || 1
    
    setFormData(prev => ({
      ...prev,
      qty: newQty
    }))
    
    if (newQty !== '' && formData.bom_id) {
      if (formData.items.length === 0) {
        console.log('No items found, fetching BOM details with new qty:', newQty)
        fetchBomDetails(formData.bom_id, newQty)
      } else {
        const updatedItems = formData.items.map(item => {
          const newItemQty = (item.qty / oldQty) * newQty
          return {
            ...item,
            qty: newItemQty,
            amount: newItemQty * (item.rate || 0)
          }
        })
        setFormData(prev => ({
          ...prev,
          items: updatedItems
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    
    if (loading) return

    if (!formData.customer_id) {
      setError('Please select a customer')
      return
    }

    const totalBomItems = bomFinishedGoods.length + bomRawMaterials.length + bomOperations.length
    if (totalBomItems === 0) {
      setError('Please select a BOM to populate items')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        ...formData,
        order_amount: (bomFinishedGoods.length > 0 || bomRawMaterials.length > 0 || bomOperations.length > 0) ? calculateBomGrandTotal() : calculateGrandTotal(),
        items: formData.items.map(({ id, ...item }) => item),
        bom_raw_materials: bomRawMaterials,
        bom_operations: bomOperations,
        bom_finished_goods: bomFinishedGoods
      }

      console.log('Payload being sent:', payload)

      if (isEditMode) {
        await api.put(`/production/sales-orders/${id}`, payload)
        setSuccess('Sales order updated successfully')
      } else {
        await api.post('/production/sales-orders', payload)
        setSuccess('Sales order created successfully')
      }

      setTimeout(() => {
        navigate('/manufacturing/sales-orders')
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

  const formatQty = (qty) => {
    return parseFloat(qty || 0).toString()
  }

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

  const handleBomItemEdit = (itemIndex, field, value) => {
    const updatedItems = [...bomRawMaterials]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: field === 'qty' || field === 'rate' ? parseFloat(value) || 0 : value
    }
    setBomRawMaterials(updatedItems)
  }

  const handleBomFinishedGoodEdit = (itemIndex, field, value) => {
    const updatedItems = [...bomFinishedGoods]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: field === 'quantity' || field === 'qty' || field === 'rate' ? parseFloat(value) || 0 : value
    }
    setBomFinishedGoods(updatedItems)
  }

  const handleBomOperationEdit = (itemIndex, field, value) => {
    const updatedItems = [...bomOperations]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: field === 'operation_time' || field === 'time_in_hours' || field === 'hours' || field === 'operating_cost' || field === 'cost' ? parseFloat(value) || 0 : value
    }
    setBomOperations(updatedItems)
  }

  const calculateBomGrandTotal = () => {
    const qty = parseFloat(formData.qty) || 1

    const finishedGoodsTotal = bomFinishedGoods.reduce((sum, item) => {
      const bomQty = parseFloat(item.quantity || item.qty || 1)
      const itemAmount = bomQty * qty * (parseFloat(item.rate) || 0)
      return sum + itemAmount
    }, 0)

    const materialsTotal = bomRawMaterials.reduce((sum, item) => {
      const bomQty = parseFloat(item.qty || 1)
      const itemAmount = bomQty * qty * (parseFloat(item.rate) || 0)
      return sum + itemAmount
    }, 0)

    const operationsTotal = bomOperations.reduce((sum, op) => {
      const costPerUnit = parseFloat(op.operating_cost || op.cost || 0)
      const totalCost = costPerUnit * qty
      return sum + totalCost
    }, 0)

    return finishedGoodsTotal + materialsTotal + operationsTotal
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
        <div className="mb-6 pb-4 border-b-2 border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="m-0 text-3xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-blue-600">📋</span>
              {isReadOnly ? 'View Sales Order' : isEditMode ? 'Edit Sales Order' : 'New Sales Order'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{isReadOnly ? 'Review order details' : 'Create and manage sales orders'}</p>
          </div>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <form onSubmit={(e) => e.preventDefault()}>
          <div className="mb-6">
            <div className="flex gap-1 overflow-x-auto ">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabIndex(idx)}
                  className={`p-2 text-sm font-semibold cursor-pointer  transition-all whitespace-nowrap ${activeTabIndex === idx
                      ? 'bg-white text-blue-700  border-b-2 border-blue-200'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-white hover:bg-opacity-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {currentTab.id === 'basicDetails' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                  Order Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Series</label>
                    <input
                      className="p-2 text-sm border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed text-xs"
                      type="text"
                      name="series"
                      value={formData.series || 'Auto-generated'}
                      onChange={handleChange}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Order Date *</label>
                    <input
                      className={`p-2 text-xs border border-gray-300ed focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Delivery Date</label>
                    <input
                      className={`p-2 text-xs border border-gray-300ed focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="date"
                      name="delivery_date"
                      value={formData.delivery_date}
                      onChange={handleChange}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Order Type</label>
                    <select className={`p-2 text-xs border border-gray-300ed focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`} name="order_type" value={formData.order_type} onChange={handleChange} disabled={isReadOnly}>
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-amber-600 rounded-full"></div>
                  Customer Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Customer *</label>
                    <SearchableSelect
                      value={formData.customer_id}
                      onChange={(val) => handleCustomerChange(val)}
                      options={customers.filter(c => c && c.customer_id && c.customer_name).map(c => ({ label: c.customer_name, value: c.customer_id }))}
                      placeholder="Search customer..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      className="p-2 text-sm border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed text-xs"
                      type="email"
                      value={formData.customer_email}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      className="p-2 text-sm border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed text-xs"
                      type="text"
                      value={formData.customer_phone}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-green-600 rounded-full"></div>
                  BOM & Inventory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Select BOM *</label>
                    <SearchableSelect
                      value={formData.bom_id}
                      onChange={(val) => handleBomChange(val)}
                      options={boms}
                      placeholder="Search BOM..."
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Order Quantity *</label>
                    <input
                      className={`p-2 text-xs border border-gray-300ed focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="number"
                      name="quantity"
                      value={formData.qty === '' ? '' : parseFloat(formData.qty) || ''}
                      onChange={handleQuantityChange}
                      min="1"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Warehouse</label>
                    <SearchableSelect
                      value={formData.source_warehouse}
                      onChange={(val) => setFormData({ ...formData, source_warehouse: val })}
                      options={warehouses}
                      placeholder="Select warehouse..."
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-1 h-5 bg-purple-600 rounded-full"></div>
                  Order Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-700 mb-2">Status</label>
                    <SearchableSelect
                      value={formData.status}
                      onChange={(val) => handleSearchableChange('status', val)}
                      options={statuses}
                      placeholder="Select status..."
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}


          {currentTab.id === 'bomDetails' && (
            <div className="space-y-6">
              {console.log('BOM Details tab is active. formData.items count:', formData.items.length)}
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900 mb-1">BOM Details Status</p>
                    <p className="text-xs text-blue-800">
                      <strong>{bomFinishedGoods.length + bomRawMaterials.length + bomOperations.length}</strong> items loaded • 
                      <strong className="ml-1">{bomFinishedGoods.length}</strong> Finished Goods • 
                      <strong className="ml-1">{bomRawMaterials.length}</strong> Materials • 
                      <strong className="ml-1">{bomOperations.length}</strong> Operations
                    </p>
                    {formData.bom_id && <p className="text-xs text-blue-700 mt-2">BOM ID: <strong>{formData.bom_id}</strong></p>}
                  </div>
                  {formData.bom_id && !isReadOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Refresh BOM Details button clicked. Current qty:', formData.qty)
                        fetchBomDetails(formData.bom_id, formData.qty)
                      }}
                      disabled={refreshingBom}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition disabled:bg-gray-400"
                    >
                      {refreshingBom ? '⏳ Refreshing...' : '🔄 Refresh'}
                    </button>
                  )}
                </div>
              </div>
              {bomFinishedGoods.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-3.5 border-b border-blue-200 flex items-center gap-2">
                      <span className="text-lg">📦</span>
                      <h3 className="font-bold text-sm text-gray-900">Finished Goods <span className="font-normal text-gray-600">({bomFinishedGoods.length})</span></h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700">Item Code</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Description</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Type</th>
                            <th className=" p-2 font-semibold text-gray-700">Qty</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Rate</th>
                            <th className=" p-2 font-semibold text-gray-700">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomFinishedGoods.map((item, idx) => {
                            const bomQty = (parseFloat(item.quantity || item.qty) || 1)
                            const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                            const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                            return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition">
                              <td className="p-2 font-medium text-gray-900">{item.component_code || item.item_code || '-'}</td>
                              <td className="p-2 text-gray-700">{item.component_description || item.item_name || '-'}</td>
                              <td className="p-2 text-gray-600 text-xs">{item.component_type || item.fg_sub_assembly || '-'}</td>
                              <td className="p-2 text-right font-medium text-gray-900">
                                {isReadOnly ? (
                                  formatQty(multipliedQty)
                                ) : (
                                  <input
                                    type="number"
                                    step="0.001"
                                    value={multipliedQty}
                                    onChange={(e) => handleBomFinishedGoodEdit(idx, 'qty', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-right text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                )}
                              </td>
                              <td className="p-2">
                                {isReadOnly ? (
                                  <span className="text-gray-900 font-medium">₹ {parseFloat(item.rate || 0).toFixed(2)}</span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.rate || 0}
                                      onChange={(e) => handleBomFinishedGoodEdit(idx, 'rate', e.target.value)}
                                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-right font-bold text-green-700">₹ {itemAmount.toFixed(2)}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {bomRawMaterials.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white rounded-lg border border-amber-200 overflow-hidden shadow-xs">
                    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-5 py-4 border-b border-amber-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <span className="text-lg">📦</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">Raw Materials</h3>
                          <p className="text-xs text-gray-600 mt-0.5">{bomRawMaterials.length} items required</p>
                        </div>
                      </div>
                    </div>
                    {isReadOnly ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-amber-50 border-b border-amber-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700">Item Group</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Item Code</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Item Name</th>
                            <th className=" p-2 font-semibold text-gray-700">Qty</th>
                            <th className="text-left p-2 font-semibold text-gray-700">UOM</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Rate</th>
                            <th className=" p-2 font-semibold text-gray-700">Amount</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Warehouse</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomRawMaterials.map((item, idx) => {
                            const bomQty = (parseFloat(item.qty) || 1)
                            const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                            const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                            return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-amber-50 transition">
                              <td className="p-2 text-xs font-medium text-blue-700 bg-blue-50 rounded">{item.item_group || 'Unclassified'}</td>
                              <td className="p-2 font-medium text-gray-900">{item.item_code || '-'}</td>
                              <td className="p-2 text-gray-700">{item.item_name || '-'}</td>
                              <td className="p-2 text-right font-medium text-gray-900">{formatQty(multipliedQty)}</td>
                              <td className="p-2 text-gray-600 text-sm">{item.uom || '-'}</td>
                              <td className="p-2 font-medium text-gray-900">₹ {parseFloat(item.rate || 0).toFixed(2)}</td>
                              <td className="p-2 text-right font-bold text-green-700">₹ {itemAmount.toFixed(2)}</td>
                              <td className="p-2 text-gray-600">{item.source_warehouse || '-'}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    ) : (
                    <div className="border-t border-amber-100">
                      {itemGroupsInOrder.map((groupName) => {
                        const groupItems = groupedRawMaterials[groupName]
                        const isExpanded = expandedItemGroups[groupName]
                        
                        return (
                          <div key={groupName} className="border-b border-amber-100 last:border-b-0">
                            <button
                              type="button"
                              onClick={() => toggleItemGroup(groupName)}
                              className="w-full flex items-center justify-between bg-amber-50 hover:bg-orange-50 transition p-4 group"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 bg-amber-100 rounded group-hover:bg-orange-100 transition">
                                  <span className="text-sm">📋</span>
                                </div>
                                <div className="text-left">
                                  <h4 className="text-sm font-semibold text-gray-900">{groupName}</h4>
                                  <p className="text-xs text-gray-500 mt-0.5">{groupItems.length} item(s)</p>
                                </div>
                              </div>
                              <div className="text-amber-600 flex-shrink-0 font-semibold">
                                {isExpanded ? '▲' : '▼'}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="overflow-x-auto bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-amber-200 bg-amber-50">
                                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Item Code</th>
                                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Item Name</th>
                                      <th className="text-right py-3 px-3 font-semibold text-gray-700">Qty</th>
                                      <th className="text-center py-3 px-3 font-semibold text-gray-700">UOM</th>
                                      <th className="text-right py-3 px-3 font-semibold text-gray-700">Rate (₹)</th>
                                      <th className="text-right py-3 px-3 font-semibold text-gray-700">Amount (₹)</th>
                                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Warehouse</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {groupItems.map((item, itemIdx) => {
                                      const actualIdx = bomRawMaterials.findIndex(m => m.item_code === item.item_code && m.item_group === item.item_group)
                                      const bomQty = (parseFloat(item.qty) || 1)
                                      const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                                      const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                                      return (
                                      <tr key={itemIdx} className="border-b border-amber-100 hover:bg-amber-50 transition">
                                        <td className="py-2.5 px-3 font-medium text-gray-900">{item.item_code || '-'}</td>
                                        <td className="py-2.5 px-3 text-gray-700">{item.item_name || '-'}</td>
                                        <td className="py-2.5 px-3 text-right font-semibold text-gray-900">
                                          {isEditMode && !isReadOnly ? (
                                            <input
                                              type="number"
                                              step="0.001"
                                              value={multipliedQty}
                                              onChange={(e) => handleBomItemEdit(actualIdx, 'qty', e.target.value)}
                                              className="w-20 px-2 py-1 border border-amber-300 rounded text-right text-xs focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                          ) : (
                                            formatQty(multipliedQty)
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center text-gray-600">{item.uom || '-'}</td>
                                        <td className="py-2.5 px-3 text-right">
                                          {isEditMode && !isReadOnly ? (
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={item.rate || 0}
                                              onChange={(e) => handleBomItemEdit(actualIdx, 'rate', e.target.value)}
                                              className="w-20 px-2 py-1 border border-amber-300 rounded text-right text-xs focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                          ) : (
                                            parseFloat(item.rate || 0).toFixed(2)
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-semibold text-green-600">₹{itemAmount.toFixed(2)}</td>
                                        <td className="py-2.5 px-3 text-xs text-gray-500">{item.source_warehouse || '-'}</td>
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
                  )}
                </div>
              </div>
              )}

              {bomOperations.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-5 py-3.5 border-b border-purple-200 flex items-center gap-2">
                      <span className="text-lg">⚙️</span>
                      <h3 className="font-bold text-sm text-gray-900">Operations <span className="font-normal text-gray-600">({bomOperations.length})</span></h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700">Operation</th>
                            <th className="text-left p-2 font-semibold text-gray-700">Workstation</th>
                            <th className=" p-2 font-semibold text-gray-700">Time (Hours)</th>
                            <th className=" p-2 font-semibold text-gray-700">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomOperations.map((op, idx) => {
                            const operationCostPerUnit = (parseFloat(op.operating_cost || op.cost || 0))
                            const totalOperationCost = operationCostPerUnit * (parseFloat(formData.qty) || 1)
                            return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-purple-50 transition">
                              <td className="p-2 font-medium text-gray-900">{op.operation || op.operation_name || '-'}</td>
                              <td className="p-2 text-gray-700">{op.workstation_type || op.workstation || op.default_workstation || '-'}</td>
                              <td className="p-2 text-left text-gray-900">
                                {isEditMode && !isReadOnly ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={op.operation_time || op.time_in_hours || op.hours || 0}
                                    onChange={(e) => handleBomOperationEdit(idx, 'operation_time', e.target.value)}
                                    className="w-fit px-2 py-1.5 border border-gray-300 rounded text-right text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                ) : (
                                  <span className="font-medium">{op.operation_time || op.time_in_hours || op.hours || '-'}</span>
                                )}
                              </td>
                              <td className="p-2 text-right font-bold text-green-700">
                                {isEditMode && !isReadOnly ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-gray-600">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={op.operating_cost || op.cost || 0}
                                      onChange={(e) => handleBomOperationEdit(idx, 'operating_cost', e.target.value)}
                                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                  </div>
                                ) : (
                                  <>₹ {totalOperationCost.toFixed(2)}</>
                                )}
                              </td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {(bomFinishedGoods.length > 0 || bomRawMaterials.length > 0 || bomOperations.length > 0) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <div className="bg-white border-2 border-gray-300 rounded-lg p-5 min-w-80 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 mb-4">Cost Breakdown</h4>
                      <div className="space-y-3">
                        {bomFinishedGoods.length > 0 && (() => {
                          const fgTotal = bomFinishedGoods.reduce((sum, item) => {
                            const bomQty = parseFloat(item.quantity || item.qty || 1)
                            const itemAmount = bomQty * (parseFloat(formData.qty) || 1) * (parseFloat(item.rate) || 0)
                            return sum + itemAmount
                          }, 0)
                          return (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Finished Goods ({bomFinishedGoods.length}):</span>
                              <span className="font-semibold text-gray-900">₹{fgTotal.toFixed(2)}</span>
                            </div>
                          )
                        })()}
                        {bomRawMaterials.length > 0 && (() => {
                          const matTotal = bomRawMaterials.reduce((sum, item) => {
                            const bomQty = parseFloat(item.qty || 1)
                            const itemAmount = bomQty * (parseFloat(formData.qty) || 1) * (parseFloat(item.rate) || 0)
                            return sum + itemAmount
                          }, 0)
                          return (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Raw Materials ({bomRawMaterials.length}):</span>
                              <span className="font-semibold text-gray-900">₹{matTotal.toFixed(2)}</span>
                            </div>
                          )
                        })()}
                        {bomOperations.length > 0 && (() => {
                          const opTotal = bomOperations.reduce((sum, op) => {
                            const costPerUnit = parseFloat(op.operating_cost || op.cost || 0)
                            const totalCost = costPerUnit * (parseFloat(formData.qty) || 1)
                            return sum + totalCost
                          }, 0)
                          return (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Operations ({bomOperations.length}):</span>
                              <span className="font-semibold text-gray-900">₹{opTotal.toFixed(2)}</span>
                            </div>
                          )
                        })()}
                        <div className="border-t-2 border-gray-300 pt-3 mt-3 flex justify-between items-center">
                          <span className="font-bold text-gray-900">Grand Total:</span>
                          <span className="font-bold text-2xl text-green-600">₹{calculateBomGrandTotal().toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bomFinishedGoods.length === 0 && bomRawMaterials.length === 0 && bomOperations.length === 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
                  <p className="text-blue-900 font-semibold mb-1">📦 No BOM Selected</p>
                  <p className="text-blue-700 text-sm">Select a BOM in the <strong>Basic Details</strong> tab to view materials, operations, and finished goods here.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 justify-between items-center mt-8 pt-6 border-t border-gray-200">
            {!isReadOnly && (
              <Button
                type="button"
                variant="secondary"
                onClick={prevTab}
                disabled={activeTabIndex === 0}
                className="px-6 py-2.5 text-sm font-semibold"
              >
                ← Previous
              </Button>
            )}

            <span className="text-sm font-medium text-gray-600">
              Step <span className="font-bold text-gray-900">{activeTabIndex + 1}</span> of <span className="font-bold text-gray-900">{tabs.length}</span>
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
