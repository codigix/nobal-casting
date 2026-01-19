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
    status: 'Draft',
    cgst_rate: 9,
    sgst_rate: 9,
    profit_margin_percentage: 0
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
  const [bomSubAssemblies, setBomSubAssemblies] = useState([])
  const [refreshingBom, setRefreshingBom] = useState(false)
  const [expandedItemGroups, setExpandedItemGroups] = useState({})
  const [bomName, setBomName] = useState('')
  const [customersLastUpdated, setCustomersLastUpdated] = useState(localStorage.getItem('customersUpdatedAt'))

  const SectionHeader = ({ title, icon }) => (
    <div className="flex items-center gap-3 mb-6 pt-6 border-t border-gray-200">
      <span className="text-2xl">{icon}</span>
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
    </div>
  )

  useEffect(() => {
    fetchRequiredData()
    fetchWarehouses()
    if (isEditMode || isReadOnly) {
      fetchOrder()
    }
  }, [])

  useEffect(() => {
    const checkCustomersUpdate = () => {
      const updatedTime = localStorage.getItem('customersUpdatedAt')
      if (updatedTime && updatedTime !== customersLastUpdated) {
        setCustomersLastUpdated(updatedTime)
        fetchCustomersOnly()
      }
    }

    const interval = setInterval(checkCustomersUpdate, 1000)
    return () => clearInterval(interval)
  }, [customersLastUpdated])

  const fetchCustomersOnly = async () => {
    try {
      const custRes = await api.get('/customers').catch(() => ({ data: { data: [] } }))
      const customersData = custRes.data.data || custRes.data || []
      console.log('API Response:', custRes)
      console.log('Customers data:', customersData)
      console.log('Customers refreshed:', customersData.length)
      setCustomers(customersData)
    } catch (err) {
      console.error('Failed to refresh customers:', err)
    }
  }

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      const [custRes, bomRes, itemsRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: { data: [] } })),
        api.get('/production/boms?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/items').catch(() => ({ data: { data: [] } }))
      ])

      const customersData = custRes.data.data || custRes.data || []
      setCustomers(customersData)
      console.log('Customers API Response:', custRes)
      console.log('Customers Data:', customersData)
      console.log('Total customers:', customersData.length)
      
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
        qty: orderQty,
        cgst_rate: orderData.cgst_rate || 9,
        sgst_rate: orderData.sgst_rate || 9,
        profit_margin_percentage: orderData.profit_margin_percentage || 0
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

        if ((finishedGoods.length === 0 || operations.length === 0) && orderData.bom_id) {
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
        return { items: [], operations: [], rawMaterials: [] }
      }
      
      const subBom = subBoms[0]
      console.log('Selected sub-assembly BOM:', subBom)
      const subBomDetails = await api.get(`/production/boms/${subBom.bom_id}`)
      console.log('Sub-assembly BOM Details Response:', subBomDetails)
      const subBomData = subBomDetails.data && subBomDetails.data.data ? subBomDetails.data.data : subBomDetails.data
      const subBomLines = subBomData.lines || subBomData.items || []
      const subBomOperations = subBomData.operations || []
      const subBomRawMaterials = subBomData.rawMaterials || []
      console.log('Sub-assembly BOM Lines:', subBomLines)
      console.log('Sub-assembly BOM Operations:', subBomOperations)
      console.log('Sub-assembly Raw Materials:', subBomRawMaterials)
      
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
          item_group: subItem.item_group || '',
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
      console.log(`Returning ${subBomOperations.length} sub-assembly operations for ${itemCode}:`, subBomOperations)
      console.log(`Returning ${subBomRawMaterials.length} sub-assembly raw materials for ${itemCode}:`, subBomRawMaterials)
      return { items, operations: subBomOperations, rawMaterials: subBomRawMaterials }
    } catch (err) {
      console.warn(`Could not fetch BOM for ${itemCode}:`, err)
      return { items: [], operations: [], rawMaterials: [] }
    }
  }

  const fetchBomDetails = async (bomId, quantity) => {
    try {
      setRefreshingBom(true)
      console.log('Fetching BOM details for:', bomId)
      const response = await api.get(`/production/boms/${bomId}`)
      console.log('BOM API Response:', response)
      
      if (!response.data) {
        throw new Error('No data in BOM API response')
      }
      
      const bomData = response.data && response.data.data ? response.data.data : response.data
      console.log('BOM Data extracted:', bomData)
      
      if (!bomData) {
        throw new Error('BOM data is null or undefined')
      }
      
      setSelectedBomData(bomData)
      
      const formatItemCodeAsName = (itemCode) => {
        if (!itemCode) return 'Finished Good'
        return itemCode
          .replace(/[-_]/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .trim()
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      }
      
      const finishedGoodName = bomData.product_name || bomData.name || formatItemCodeAsName(bomData.item_code)
      setBomName(finishedGoodName)
      console.log('BOM Name:', finishedGoodName)

      const finishedGoodItem = {
        item_code: bomData.item_code,
        item_name: finishedGoodName,
        field_description: finishedGoodName,
        fg_sub_assembly: 'Finished Good',
        item_group: 'Finished Goods',
        delivery_date: '',
        commit_date: '',
        qty: 1,
        ordered_qty: 1,
        rate: parseFloat(bomData.total_cost) || 0,
        amount: parseFloat(bomData.total_cost) || 0,
        input_group: '',
        source_warehouse: '',
        bom_qty: 1,
        bom_id: bomData.bom_id,
        id: Date.now()
      }

      console.log('✓ Finished Good Item:', finishedGoodItem)
      
      const finishedGoodsItems = [finishedGoodItem]
      
      setBomComponentQties({})
      setBomRawMaterials([])
      setBomOperations([])
      setBomFinishedGoods(finishedGoodsItems)
      setBomSubAssemblies([])
      setExpandedItemGroups({})

      console.log('Setting formData.items to:', finishedGoodsItems)
      setFormData(prev => ({
        ...prev,
        items: finishedGoodsItems
      }))
      
      console.log('✓ BOM Details loaded - Finished Good only')
    } catch (err) {
      setError('Failed to fetch BOM details')
      console.error('Error fetching BOM:', err)
    } finally {
      setRefreshingBom(false)
    }
  }

  const fetchSubAssemblyMaterials = async () => {
    if (!bomSubAssemblies || bomSubAssemblies.length === 0) {
      console.warn('No sub-assemblies to fetch materials for')
      return
    }

    try {
      setRefreshingBom(true)
      console.log('=== STARTING SUB-ASSEMBLY MATERIALS FETCH ===')
      console.log('Total sub-assemblies to process:', bomSubAssemblies.length)
      
      let aggregatedRawMaterials = [...bomRawMaterials]
      let aggregatedOperations = [...bomOperations]
      
      for (let idx = 0; idx < bomSubAssemblies.length; idx++) {
        const subAsm = bomSubAssemblies[idx]
        const subAsmCode = subAsm.item_code
        const subAsmName = subAsm.item_name || subAsmCode
        
        console.log(`\n--- Processing Sub-Assembly ${idx + 1}/${bomSubAssemblies.length} ---`)
        console.log('Sub-Assembly Code:', subAsmCode)
        console.log('Sub-Assembly Name:', subAsmName)
        
        try {
          const bomsRes = await api.get(`/production/boms?item_code=${subAsmCode}`)
          const boms = bomsRes.data.data || []
          console.log(`BOMs found for ${subAsmCode}:`, boms.length)
          console.log(`API Response structure:`, JSON.stringify(bomsRes.data, null, 2).substring(0, 500))
          boms.forEach((bom, i) => {
            console.log(`  BOM ${i + 1}: ${bom.bom_id || bom.id} | item: ${bom.item || bom.item_code || 'N/A'} | name: ${bom.bom_name || 'N/A'}`)
          })
          
          if (!boms || boms.length === 0) {
            console.warn(`No BOM found for sub-assembly: ${subAsmCode}`)
            continue
          }
          
          let selectedBom = null
          let bomData = null
          
          for (const bom of boms) {
            try {
              const bomDetailsRes = await api.get(`/production/boms/${bom.bom_id || bom.id}`)
              const bomDetail = bomDetailsRes.data && bomDetailsRes.data.data ? bomDetailsRes.data.data : bomDetailsRes.data
              const bomItemCode = bomDetail.item_code || bomDetail.item || ''
              const bomName = bomDetail.bom_name || bomDetail.name || ''
              
              console.log(`Testing BOM ${bom.bom_id || bom.id}:`)
              console.log(`  Detail item_code: "${bomItemCode}"`)
              console.log(`  Detail name: "${bomName}"`)
              console.log(`  Looking for: "${subAsmCode}"`)
              
              if (bomItemCode.toLowerCase() === subAsmCode.toLowerCase()) {
                console.log(`✓✓ MATCHED! Found correct sub-assembly BOM: ${bom.bom_id || bom.id}`)
                selectedBom = bom
                bomData = bomDetail
                break
              } else {
                console.log(`✗ No match (expected "${subAsmCode}", got "${bomItemCode}")`)
              }
            } catch (e) {
              console.warn(`Failed to check BOM for ${subAsmCode}`)
            }
          }
          
          if (!selectedBom) {
            selectedBom = boms[0]
            console.log(`Using first available BOM as fallback`)
            const bomDetailsRes = await api.get(`/production/boms/${selectedBom.bom_id || selectedBom.id}`)
            bomData = bomDetailsRes.data && bomDetailsRes.data.data ? bomDetailsRes.data.data : bomDetailsRes.data
          }
          
          const bomId = selectedBom.bom_id || selectedBom.id
          console.log(`BOM ID selected: ${bomId}`)
          
          const subAsmRawMaterials = bomData.rawMaterials || bomData.raw_materials || []
          const subAsmOperations = bomData.operations || []
          
          console.log(`Raw Materials in ${subAsmCode} BOM:`, subAsmRawMaterials.length)
          subAsmRawMaterials.forEach((mat, i) => {
            console.log(`  Material ${i + 1}: ${mat.item_code || mat.component_code} - Qty: ${mat.quantity || mat.qty}`)
          })
          
          console.log(`Operations in ${subAsmCode} BOM:`, subAsmOperations.length)
          subAsmOperations.forEach((op, i) => {
            console.log(`  Operation ${i + 1}: ${op.operation_name || op.name} - Time: ${op.operation_time}`)
          })
          
          const filteredMaterials = subAsmRawMaterials.filter(m => !isSubAssemblyType(m.component_type || m.fg_sub_assembly || m.item_group))
          
          console.log(`Filtered Materials (after removing sub-assemblies): ${filteredMaterials.length}`)
          
          filteredMaterials.forEach(material => {
            const matCode = material.item_code || material.component_code
            const existingIdx = aggregatedRawMaterials.findIndex(
              m => (m.item_code || m.component_code) === matCode
            )
            
            if (existingIdx >= 0) {
              const existing = aggregatedRawMaterials[existingIdx]
              const oldQty = parseFloat(existing.quantity || existing.qty || 0) || 0
              const addQty = parseFloat(material.quantity || material.qty || 0) || 0
              const newQty = oldQty + addQty
              
              console.log(`  Material ${matCode}: Updated qty from ${oldQty} to ${newQty}`)
              
              aggregatedRawMaterials[existingIdx] = {
                ...existing,
                quantity: newQty,
                qty: newQty
              }
            } else {
              console.log(`  Material ${matCode}: Added (new)`)
              aggregatedRawMaterials.push(material)
            }
          })
          
          subAsmOperations.forEach(operation => {
            const opName = operation.operation_name || operation.name
            const existingIdx = aggregatedOperations.findIndex(
              o => (o.operation_name || o.name) === opName
            )
            
            if (existingIdx >= 0) {
              const existing = aggregatedOperations[existingIdx]
              const oldTime = parseFloat(existing.operation_time || 0) || 0
              const addTime = parseFloat(operation.operation_time || 0) || 0
              const newTime = oldTime + addTime
              
              console.log(`  Operation ${opName}: Updated time from ${oldTime} to ${newTime}`)
              
              aggregatedOperations[existingIdx] = {
                ...existing,
                operation_time: newTime
              }
            } else {
              console.log(`  Operation ${opName}: Added (new)`)
              aggregatedOperations.push(operation)
            }
          })
          
          console.log(`✓ Sub-assembly ${subAsmCode} processed successfully`)
        } catch (err) {
          console.error(`✗ Error processing sub-assembly ${subAsmCode}:`, err)
        }
      }
      
      console.log('\n=== FETCH COMPLETE ===')
      console.log('Final Raw Materials Count:', aggregatedRawMaterials.length)
      console.log('Final Operations Count:', aggregatedOperations.length)
      
      setBomRawMaterials(aggregatedRawMaterials)
      setBomOperations(aggregatedOperations)
      
      setSuccess(`Fetched materials and operations from ${bomSubAssemblies.length} sub-assemblies`)
    } catch (err) {
      console.error('Error fetching sub-assembly materials:', err)
      setError('Failed to fetch sub-assembly materials')
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
    const qty = parseFloat(formData.qty) || 1
    const profitMarginPct = parseFloat(formData.profit_margin_percentage) || 0
    
    const fgUnitCost = bomFinishedGoods.reduce((sum, item) => {
      const itemRate = parseFloat(item.rate) || 0
      return sum + itemRate
    }, 0)
    
    const baseCost = fgUnitCost * qty
    const profitAmount = baseCost * (profitMarginPct / 100)
    const costWithProfit = baseCost + profitAmount
    
    const cgstRate = parseFloat(formData.cgst_rate) || 0
    const sgstRate = parseFloat(formData.sgst_rate) || 0
    const totalGstRate = (cgstRate + sgstRate) / 100
    const gstAmount = costWithProfit * totalGstRate
    return costWithProfit + gstAmount
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

    const totalBomItems = bomFinishedGoods.length + bomSubAssemblies.length + bomRawMaterials.length + bomOperations.length
    if (totalBomItems === 0) {
      setError('Please select a BOM to populate items')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        ...formData,
        order_amount: (bomFinishedGoods.length > 0 || bomOperations.length > 0) ? calculateBomGrandTotal() : calculateGrandTotal(),
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
    if (field === 'qty' || field === 'rate') {
      updatedItems[itemIndex].amount = (parseFloat(updatedItems[itemIndex].qty) || 0) * (parseFloat(updatedItems[itemIndex].rate) || 0)
    }
    setBomRawMaterials(updatedItems)
  }

  const handleBomFinishedGoodEdit = (itemIndex, field, value) => {
    const updatedItems = [...bomFinishedGoods]
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      [field]: field === 'quantity' || field === 'qty' || field === 'rate' ? parseFloat(value) || 0 : value
    }
    if (field === 'qty' || field === 'quantity' || field === 'rate') {
      const qty = parseFloat(updatedItems[itemIndex].qty || updatedItems[itemIndex].quantity) || 0
      const rate = parseFloat(updatedItems[itemIndex].rate) || 0
      updatedItems[itemIndex].amount = qty * rate
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
    const profitMarginPct = parseFloat(formData.profit_margin_percentage) || 0

    const finishedGoodUnitCost = bomFinishedGoods.reduce((sum, item) => {
      const itemRate = parseFloat(item.rate) || 0
      return sum + itemRate
    }, 0)

    const baseCost = finishedGoodUnitCost * qty
    const profitAmount = baseCost * (profitMarginPct / 100)
    const costWithProfit = baseCost + profitAmount
    
    const cgstRate = parseFloat(formData.cgst_rate) || 0
    const sgstRate = parseFloat(formData.sgst_rate) || 0
    const totalGstRate = (cgstRate + sgstRate) / 100
    const gstAmount = costWithProfit * totalGstRate
    
    return costWithProfit + gstAmount
  }

  const groupedRawMaterials = groupRawMaterialsByItemGroup()
  const itemGroupsInOrder = Object.keys(groupedRawMaterials).sort()
  const groupedItems = groupItemsByItemGroup()
  const itemsGroupsInOrder = Object.keys(groupedItems).sort()

  if (dataLoading) {
    return <div className="max-w-full m-8 p-0">Loading form data...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className=" mx-auto p-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-100 rounded-xs">
              <span className="text-xl">📋</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isReadOnly ? 'Sales Order Details' : isEditMode ? 'Edit Sales Order' : 'New Sales Order'}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {isReadOnly ? 'View and manage order information' : 'Create and configure sales orders'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition"
          >
            ✕
          </button>
        </div>
      </div>

      <div className=" mx-auto px-6 py-8">
        <Card>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <form onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              <SectionHeader title="Order Information" icon="📅" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Series</label>
                    <input
                      className="p-2 text-xs border border-gray-300  bg-gray-50 text-gray-600 cursor-not-allowed focus:outline-none"
                      type="text"
                      name="series"
                      value={formData.series || 'Auto-generated'}
                      onChange={handleChange}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Order Date *</label>
                    <input
                      className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Delivery Date</label>
                    <input
                      className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="date"
                      name="delivery_date"
                      value={formData.delivery_date}
                      onChange={handleChange}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Order Type</label>
                    <select className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`} name="order_type" value={formData.order_type} onChange={handleChange} disabled={isReadOnly}>
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                </div>

              <SectionHeader title="Customer Details" icon="👥" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2 flex flex-col">
                    <label className="text-xs  text-gray-700">Customer * ({customers.length} available)</label>
                    <SearchableSelect
                      value={formData.customer_id}
                      onChange={(val) => handleCustomerChange(val)}
                      options={customers.filter(c => c && c.customer_id && c.customer_name).map(c => ({ label: c.customer_name, value: c.customer_id }))}
                      placeholder="Search customer..."
                      isDisabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Email</label>
                    <input
                      className="p-2 text-xs border border-gray-300  bg-gray-50 text-gray-600 cursor-not-allowed focus:outline-none"
                      type="email"
                      value={formData.customer_email}
                      disabled
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Phone</label>
                    <input
                      className="p-2 text-xs border border-gray-300  bg-gray-50 text-gray-600 cursor-not-allowed focus:outline-none"
                      type="text"
                      value={formData.customer_phone}
                      disabled
                    />
                  </div>
                </div>

              <SectionHeader title="BOM & Inventory" icon="📦" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-2 flex flex-col">
                    <label className="text-xs  text-gray-700">Select BOM *</label>
                    <SearchableSelect
                      value={formData.bom_id}
                      onChange={(val) => handleBomChange(val)}
                      options={boms}
                      placeholder="Search BOM..."
                      isDisabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Order Quantity *</label>
                    <input
                      className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="number"
                      name="qty"
                      value={formData.qty || ''}
                      onChange={handleQuantityChange}
                      min="1"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="Qty"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Warehouse</label>
                    <SearchableSelect
                      value={formData.source_warehouse}
                      onChange={(val) => setFormData({ ...formData, source_warehouse: val })}
                      options={warehouses}
                      placeholder="Select warehouse..."
                      isDisabled={isReadOnly}
                    />
                  </div>
                </div>

              <SectionHeader title="Order Status & Taxes" icon="⚙️" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Status</label>
                    <SearchableSelect
                      value={formData.status}
                      onChange={(val) => handleSearchableChange('status', val)}
                      options={statuses}
                      placeholder="Select status..."
                      isDisabled={isReadOnly}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">CGST Rate (%)</label>
                    <input
                      className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="number"
                      name="cgst_rate"
                      value={formData.cgst_rate || 0}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">SGST Rate (%)</label>
                    <input
                      className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="number"
                      name="sgst_rate"
                      value={formData.sgst_rate || 0}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs  text-gray-700">Profit Margin (%)</label>
                    <input
                      className={`p-2 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${isReadOnly ? 'bg-gray-50' : 'bg-white'}`}
                      type="number"
                      name="profit_margin_percentage"
                      value={formData.profit_margin_percentage || 0}
                      onChange={handleChange}
                      min="0"
                      max="1000"
                      step="0.01"
                      disabled={isReadOnly}
                      placeholder="0"
                    />
                  </div>
                </div>

              <SectionHeader title="BOM Details" icon="📋" />
                <div className="space-y-6">
              {bomFinishedGoods.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white rounded-xs border border-gray-200 shadow-xs">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2 border-b border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📦</span>
                        <h3 className="font-bold text-xs text-gray-900">Finished Goods <span className="font-normal text-gray-600">({bomFinishedGoods.length})</span></h3>
                      </div>
                      {bomName && (
                        <div className="pl-6 text-xs text-blue-700">
                          <p><strong>Product:</strong> {bomName}</p>
                          {formData.bom_id && <p className="text-blue-600"><strong>BOM ID:</strong> {formData.bom_id}</p>}
                        </div>
                      )}
                    </div>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Item Code</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Type</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Qty</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Rate</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomFinishedGoods.map((item, idx) => {
                            const bomQty = (parseFloat(item.quantity || item.qty) || 1)
                            const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                            const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                            return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-blue-50 transition">
                              <td className="p-2 font-medium text-gray-900 text-xs text-xs">{item.component_code || item.item_code || '-'}</td>
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
                              <td className="p-2 text-left font-bold text-green-700">₹ {itemAmount.toFixed(2)}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {bomSubAssemblies.length > 0 && (
                <div className="mb-5">
                  <div className="bg-white rounded-xs border border-gray-200 shadow-xs">
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-5 py-3.5 border-b border-orange-200 flex items-center gap-2">
                      <span className="text-lg">🔧</span>
                      <h3 className="font-bold text-xs text-gray-900">Sub-Assemblies <span className="font-normal text-gray-600">({bomSubAssemblies.length})</span></h3>
                    </div>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Item Code</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Description</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Type</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Qty</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Rate</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomSubAssemblies.map((item, idx) => {
                            const bomQty = (parseFloat(item.quantity || item.qty || item.bom_qty) || 1)
                            const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                            const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                            return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-orange-50 transition">
                              <td className="p-2 font-medium text-gray-900 text-xs text-xs">{item.component_code || item.item_code || '-'}</td>
                              <td className="p-2 text-gray-700 text-xs">{item.component_description || item.item_name || '-'}</td>
                              <td className="p-2 text-gray-600 text-xs">{item.component_type || item.fg_sub_assembly || '-'}</td>
                              <td className="p-2 text-right font-medium text-gray-900">
                                {formatQty(multipliedQty)}
                              </td>
                              <td className="p-2 text-gray-900 font-medium">₹ {parseFloat(item.rate || 0).toFixed(2)}</td>
                              <td className="p-2 text-left font-bold text-orange-700">₹ {itemAmount.toFixed(2)}</td>
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
                  <div className="bg-white rounded-xs border border-gray-200 shadow-xs">
                    <div className="bg-gradient-to-r from-green-50 to-green-100 px-5 py-3.5 border-b border-green-200 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        <h3 className="font-bold text-xs text-gray-900">Raw Materials <span className="font-normal text-gray-600">({bomRawMaterials.length})</span></h3>
                      </div>
                      {bomSubAssemblies.length > 0 && !isReadOnly && (
                        <button
                          type="button"
                          onClick={fetchSubAssemblyMaterials}
                          disabled={refreshingBom}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-xs font-semibold rounded transition"
                        >
                          {refreshingBom ? '⏳ Fetching...' : 'Get Sub-Asm Materials'}
                        </button>
                      )}
                    </div>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Item Code</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Item Name</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Item Group</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">BOM ID</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Qty</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">UOM</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Rate</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomRawMaterials.map((material, idx) => {
                            const itemQty = parseFloat(material.quantity || material.qty || 0) * (parseFloat(formData.qty) || 1)
                            const itemAmount = itemQty * (parseFloat(material.rate || 0))
                            return (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-green-50 transition">
                              <td className="p-2 font-medium text-gray-900 text-xs text-xs">{material.item_code || material.component_code || '-'}</td>
                              <td className="p-2 text-gray-700 text-xs">{material.item_name || material.component_description || '-'}</td>
                              <td className="p-2 text-gray-600 text-xs">{material.item_group || '-'}</td>
                              <td className="p-2 text-gray-700 text-xs font-mono text-xs">{material.bom_id || material.bom_no || '-'}</td>
                              <td className="p-2 text-right font-medium text-gray-900">{formatQty(itemQty)}</td>
                              <td className="p-2 text-center text-xs text-gray-700">{material.uom || material.unit || '-'}</td>
                              <td className="p-2 text-gray-900 font-medium">₹ {parseFloat(material.rate || 0).toFixed(2)}</td>
                              <td className="p-2 text-left font-bold text-green-700">₹ {itemAmount.toFixed(2)}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {bomOperations.length > 0 && (
                <div className="mb-5">
                  {bomOperations.some(op => !op.hourly_rate || parseFloat(op.hourly_rate) === 0) && (
                    <div className="mb-3 bg-yellow-50 border border-yellow-300 rounded-xs p-3 flex gap-2">
                      <span className="text-yellow-600 font-bold">⚠️</span>
                      <div>
                        <p className="text-yellow-800 font-semibold text-xs">Missing Hourly Rates</p>
                        <p className="text-yellow-700 text-xs">Some operations don't have hourly rates set. Please add hourly rates to calculate operation costs correctly.</p>
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-xs border border-gray-200 shadow-xs">
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-5 py-3.5 border-b border-purple-200 flex items-center gap-2">
                      <span className="text-lg">⚙️</span>
                      <h3 className="font-bold text-xs text-gray-900">Operations <span className="font-normal text-gray-600">({bomOperations.length})</span></h3>
                    </div>
                    <div className="">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Operation</th>
                            <th className="text-left p-2 font-semibold text-gray-700 text-left">Workstation</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Cycle Time (min)</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Hourly Rate (₹)</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Time (Hours)</th>
                            <th className=" p-2 font-semibold text-gray-700 text-left">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomOperations.map((op, idx) => {
                            const cycleTime = parseFloat(op.operation_time || 0)
                            const setupTime = parseFloat(op.fixed_time || 0)
                            const hourlyRate = parseFloat(op.hourly_rate || 0)
                            const qty = parseFloat(formData.qty) || 1
                            const totalTimeMinutes = (cycleTime * qty) + setupTime
                            const totalTimeHours = totalTimeMinutes / 60
                            const operationCostPerUnit = (cycleTime / 60) * hourlyRate
                            const totalOperationCost = operationCostPerUnit * qty
                            const isMissingRate = hourlyRate === 0 || !op.hourly_rate
                            return (
                            <tr key={idx} className={`border-b border-gray-100 hover:bg-purple-50 transition ${isMissingRate ? 'bg-yellow-50' : ''}`}>
                              <td className="p-2 font-medium text-gray-900 text-xs text-xs">{op.operation || op.operation_name || '-'}</td>
                              <td className="p-2 text-gray-700 text-xs">{op.workstation_type || op.workstation || op.default_workstation || '-'}</td>
                              <td className="p-2 text-left text-gray-700 font-medium">{cycleTime}</td>
                              <td className="p-2 text-left text-gray-700 font-medium">
                                {isEditMode && !isReadOnly && isMissingRate ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Set rate"
                                      value={op.hourly_rate || ''}
                                      onChange={(e) => handleBomOperationEdit(idx, 'hourly_rate', e.target.value)}
                                      className="w-20 px-2 py-1.5 border border-yellow-400 rounded text-xs bg-yellow-100 font-semibold focus:border-orange-500 focus:ring-1 focus:ring-orange-200"
                                    />
                                  </div>
                                ) : (
                                  <>₹{hourlyRate.toFixed(2)}</>
                                )}
                              </td>
                              <td className="p-2 text-left text-gray-900">
                                {isEditMode && !isReadOnly ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={totalTimeHours.toFixed(2)}
                                    readOnly
                                    className="w-fit px-2 py-1.5 border border-gray-300 rounded text-right text-xs bg-gray-100 cursor-not-allowed"
                                    title={`Calculated: (${cycleTime} × ${qty}) + ${setupTime} = ${totalTimeMinutes} min = ${totalTimeHours.toFixed(2)} hrs`}
                                  />
                                ) : (
                                  <span className="font-medium">{totalTimeHours.toFixed(2)} hrs</span>
                                )}
                              </td>
                              <td className="p-2 text-left font-bold text-green-700">
                                {isEditMode && !isReadOnly ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">₹</span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={totalOperationCost.toFixed(2)}
                                      readOnly
                                      className="w-20 px-2 py-1.5 border border-gray-300 rounded text-xs bg-gray-100 cursor-not-allowed"
                                      title={`Calculated: (${cycleTime} ÷ 60) × ${hourlyRate} × ${qty} = ₹${totalOperationCost.toFixed(2)}`}
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

              {(bomFinishedGoods.length > 0 || bomSubAssemblies.length > 0 || bomRawMaterials.length > 0 || bomOperations.length > 0) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <div className="bg-white border-2 border-gray-300 rounded-xs p-5 min-w-96 shadow-sm">
                      <h4 className="text-xs font-bold text-gray-900 mb-4">Cost Breakdown</h4>
                      <div className="space-y-2">
                        {(() => {
                          const qty = parseFloat(formData.qty) || 1
                          const profitMarginPct = parseFloat(formData.profit_margin_percentage) || 0
                          
                          const fgUnitCost = bomFinishedGoods.reduce((sum, item) => {
                            const itemRate = parseFloat(item.rate) || 0
                            return sum + itemRate
                          }, 0)

                          const baseCost = fgUnitCost * qty
                          const profitAmount = baseCost * (profitMarginPct / 100)
                          const costWithProfit = baseCost + profitAmount
                          const cgstRate = parseFloat(formData.cgst_rate) || 0
                          const sgstRate = parseFloat(formData.sgst_rate) || 0
                          const totalGstRate = (cgstRate + sgstRate) / 100
                          const gstAmount = costWithProfit * totalGstRate
                          const grandTotal = costWithProfit + gstAmount
                          return (
                            <>
                              <div className="flex justify-between text-xs border-b border-gray-200 pb-2 mb-2">
                                <span className="text-gray-700">Finished Goods Total Cost (Unit):</span>
                                <span className="font-semibold text-gray-900">₹{fgUnitCost.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-gray-200 pt-3 space-y-2">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Finished Goods Cost × Sales Quantity ({qty}):</span>
                                  <span className="font-semibold text-gray-900">₹{baseCost.toFixed(2)}</span>
                                </div>
                                {profitMarginPct > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Profit Margin ({profitMarginPct.toFixed(2)}%):</span>
                                    <span className="font-semibold text-green-600">₹{profitAmount.toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs border-t border-gray-200 pt-2">
                                  <span className="text-gray-700 font-semibold">Cost with Profit:</span>
                                  <span className="font-semibold text-gray-900">₹{costWithProfit.toFixed(2)}</span>
                                </div>
                                {(cgstRate + sgstRate) > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">GST ({(cgstRate + sgstRate).toFixed(1)}%):</span>
                                    <span className="font-semibold text-gray-900">₹{gstAmount.toFixed(2)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="border-t-2 border-gray-300 pt-3 mt-3 flex justify-between items-center">
                                <span className="font-bold text-gray-900">Sales Order Price:</span>
                                <span className="font-bold text-2xl text-green-600">₹{grandTotal.toFixed(2)}</span>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bomFinishedGoods.length === 0 && bomSubAssemblies.length === 0 && bomOperations.length === 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xs p-6 text-center">
                  <p className="text-blue-900 font-semibold mb-1">📦 No BOM Selected</p>
                  <p className="text-blue-700 text-xs">Select a BOM in the <strong>Basic Details</strong> tab to view materials, operations, and finished goods here.</p>
                </div>
              )}
                </div>
            </div>

          <div className="flex gap-4 justify-end items-center mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              ← Back
            </Button>
            {!isReadOnly && (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? '⏳ Saving...' : '💾 Save Sales Order'}
              </Button>
            )}
          </div>
        </form>
      </Card>
      </div>
    </div>
  )
}
