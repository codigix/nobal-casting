import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Plus, Trash2, AlertCircle, CheckCircle, Package, Factory, Boxes, Edit2 } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import * as productionService from '../../services/productionService'
import api from '../../services/api'

export default function WorkOrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const searchParams = new URLSearchParams(window.location.search)
  const isReadOnly = searchParams.get('readonly') === 'true'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [items, setItems] = useState([])
  const [bomOperations, setBomOperations] = useState([])
  const [bomMaterials, setBomMaterials] = useState([])
  const [availableBoms, setAvailableBoms] = useState([])
  const [jobCards, setJobCards] = useState([])
  const [bomQuantity, setBomQuantity] = useState(1)
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [editingOperationId, setEditingOperationId] = useState(null)

  const [formData, setFormData] = useState({
    work_order_id: '',
    naming_series: 'MFG-WO-.YYYY.-',
    company: '',
    item_to_manufacture: '',
    qty_to_manufacture: 1,
    sales_order_id: '',
    bom_id: '',
    planned_start_date: new Date().toISOString().split('T')[0],
    planned_end_date: '',
    priority: 'medium',
    status: 'draft',
    notes: ''
  })

  useEffect(() => {
    fetchItems()
    if (id) {
      fetchWorkOrderDetails(id)
      fetchJobCards(id)
    }
  }, [id])

  const fetchJobCards = async (workOrderId) => {
    try {
      const response = await productionService.getJobCards({ work_order_id: workOrderId })
      setJobCards(response.data || [])
    } catch (err) {
      console.error('Failed to fetch job cards:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await productionService.getItems()
      const allItems = response.data || []
      
      const finishedGoodItems = allItems.filter(item => 
        item.item_group === 'Finished Good' || 
        item.item_group === 'Finished Goods' ||
        item.fg_sub_assembly === 'FG' ||
        item.item_group === 'Sub Assembly' ||
        item.item_group === 'Sub Assemblies' ||
        item.fg_sub_assembly === 'SA'
      )
      
      console.log(`Filtered ${finishedGoodItems.length} Finished Good items from ${allItems.length} total items`)
      setItems(finishedGoodItems)
    } catch (err) {
      console.error('Failed to fetch items:', err)
      setError('Failed to load items')
    }
  }

  const fetchWorkOrderDetails = async (workOrderId) => {
    try {
      setLoading(true)
      const response = await productionService.getWorkOrder(workOrderId)
      const woData = response.data || response
      
      console.log('Fetched Work Order Data:', woData)
      
      setFormData(prev => ({
        ...prev,
        work_order_id: woData.wo_id || woData.work_order_id || '',
        item_to_manufacture: woData.item_code || woData.item_to_manufacture || '',
        qty_to_manufacture: woData.quantity || woData.qty_to_manufacture || 1,
        sales_order_id: woData.sales_order_id || '',
        bom_id: woData.bom_id || woData.bom_no || '',
        planned_start_date: woData.planned_start_date ? woData.planned_start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        planned_end_date: woData.planned_end_date ? woData.planned_end_date.split('T')[0] : '',
        priority: woData.priority || 'medium',
        status: woData.status || 'draft',
        notes: woData.notes || ''
      }))
      
      if (woData.bom_id || woData.bom_no) {
        await fetchBOMDetails(woData.bom_id || woData.bom_no)
      }
      
      setError(null)
    } catch (err) {
      console.error('Failed to fetch work order:', err)
      setError(`Failed to load work order: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    if (!bomId || bomId.trim() === '') {
      setBomOperations([])
      setBomMaterials([])
      return
    }

    try {
      setLoading(true)
      const response = await productionService.getBOMDetails(bomId)
      const bomData = response.data || response

      console.log('BOM Data fetched:', bomData)
      setBomQuantity(bomData.quantity || 1)

      const operations = (bomData.operations || []).map((op, idx) => ({
        id: Date.now() + idx,
        operation_name: op.operation_name || op.operation || '',
        workstation: op.workstation || op.workstation_type || '',
        operation_time: op.operation_time || op.time_in_hours || 0,
        operating_cost: op.operating_cost || op.cost || 0
      }))

      const rawMaterials = (bomData.bom_raw_materials || bomData.rawMaterials || []).map((rm, idx) => ({
        id: Date.now() + idx,
        item_code: rm.item_code || '',
        item_name: rm.item_name || rm.description || '',
        quantity: rm.qty || rm.quantity || 0,
        uom: rm.uom || '',
        required_qty: rm.qty || rm.quantity || 0,
        source_warehouse: rm.source_warehouse || '',
        issued_qty: 0,
        consumed_qty: 0
      }))

      setBomOperations(operations)
      setBomMaterials(rawMaterials)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch BOM details:', err)
      setError(`Failed to fetch BOM ${bomId}: ${err.message}`)
      setBomOperations([])
      setBomMaterials([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = async (e) => {
    if (isReadOnly) return
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)

    if (name === 'bom_id' && value) {
      fetchBOMDetails(value)
    }

    if (name === 'sales_order_id' && value) {
      await fetchBOMFromSalesOrder(value)
    }
  }

  const fetchBOMFromSalesOrder = async (salesOrderId) => {
    if (!salesOrderId || salesOrderId.trim() === '') {
      setFormData(prev => ({
        ...prev,
        bom_id: ''
      }))
      setBomOperations([])
      setBomMaterials([])
      return
    }

    setLoading(true)
    try {
      console.log('Fetching BOM for Sales Order:', salesOrderId)
      
      const response = await api.get(`/selling/sales-orders/${salesOrderId}`)
      const soData = response.data?.data || response.data
      
      console.log('Sales Order data:', soData)

      const bomId = soData.bom_id || ''
      
      console.log('BOM ID from Sales Order:', bomId)

      if (bomId) {
        setFormData(prev => ({
          ...prev,
          bom_id: bomId
        }))
        await fetchBOMDetails(bomId)
        setSuccess(`BOM ${bomId} auto-fetched from Sales Order ${salesOrderId}`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        console.log('No BOM ID found in Sales Order')
        setError(`Sales Order ${salesOrderId} has no BOM ID. Please enter BOM ID manually.`)
        setFormData(prev => ({
          ...prev,
          bom_id: ''
        }))
      }
    } catch (err) {
      console.error('Error fetching Sales Order:', err)
      setError(`Failed to fetch Sales Order ${salesOrderId}`)
      setFormData(prev => ({
        ...prev,
        bom_id: ''
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleItemSelect = async (itemCode) => {
    setFormData(prev => ({
      ...prev,
      item_to_manufacture: itemCode
    }))
    setError(null)
    setAvailableBoms([])

    if (!itemCode) {
      setFormData(prev => ({
        ...prev,
        sales_order_id: '',
        bom_id: ''
      }))
      setBomOperations([])
      setBomMaterials([])
      return
    }

    setLoading(true)
    let fetchedSalesOrderId = ''

    try {
      // Fetch sales order by item code
      try {
        const soResponse = await api.get(`/selling/sales-orders/item/${itemCode}`)
        const soData = soResponse.data?.data || soResponse.data
        if (soData && soData.sales_order_id) {
          fetchedSalesOrderId = soData.sales_order_id
          console.log('Sales Order found for item:', fetchedSalesOrderId)
        }
      } catch (err) {
        console.error('Error fetching sales order by item:', err)
      }
      
      // Fetch all BOMs for the item
      let boms = []
      try {
        const bomResponse = await productionService.getBOMs({ item_code: itemCode })
        boms = bomResponse.data || []
        setAvailableBoms(boms)
      } catch (err) {
        console.error('Error fetching BOMs:', err)
      }
      
      console.log('Fetching data for item:', itemCode)
      
      const response = await api.get(`/production-planning/item/${itemCode}`)
      const data = response.data?.data || response.data
      
      console.log('Production plan data fetched:', data)

      if (data) {
        const plan = data
        const fgItem = plan.fg_items?.[0] || {}
        
        console.log('Plan full data:', plan)
        console.log('FG item data:', fgItem)
        
        let bomNo = fgItem.bom_no || plan.bom_id || ''
        
        if (!bomNo && boms.length > 0) {
          bomNo = boms[0].bom_id || boms[0].name || ''
          console.log('BOM fetched by item code:', bomNo)
        }
        
        console.log('Final resolved:', {
          sales_order_id: plan.sales_order_id,
          production_plan_id: plan.plan_id,
          bom_id: bomNo
        })

        const soId = fetchedSalesOrderId || plan.sales_order_id || ''
        setFormData(prev => ({
          ...prev,
          item_to_manufacture: itemCode,
          sales_order_id: soId,
          bom_id: bomNo
        }))

        if (bomNo) {
          await fetchBOMDetails(bomNo)
        }

        setSuccess(`Auto-filled: SO ${soId || 'N/A'} | BOM ${bomNo || 'N/A'}`)
        setTimeout(() => setSuccess(null), 4000)
      } else {
        console.log('No production plan found for item')
        
        let bomNo = ''
        if (boms.length > 0) {
          bomNo = boms[0].bom_id || boms[0].name || ''
        }

        const successMsg = `Item selected: ${itemCode}${fetchedSalesOrderId ? ` (SO: ${fetchedSalesOrderId})` : ''}. ${!fetchedSalesOrderId ? 'No sales order found. ' : ''}${bomNo ? 'BOM auto-selected' : 'Enter BOM ID manually'}`
        setSuccess(successMsg)
        setTimeout(() => setSuccess(null), 4000)
        setFormData(prev => ({
          ...prev,
          sales_order_id: fetchedSalesOrderId,
          bom_id: bomNo
        }))

        if (bomNo) {
          await fetchBOMDetails(bomNo)
        }
      }
    } catch (err) {
      console.error('Error fetching production plan data:', err)
      const successMsg = `Item selected: ${itemCode}${fetchedSalesOrderId ? ` (SO: ${fetchedSalesOrderId})` : ''}. Could not auto-fetch data - enter BOM ID manually`
      setSuccess(successMsg)
      setTimeout(() => setSuccess(null), 4000)
      if (fetchedSalesOrderId) {
        setFormData(prev => ({
          ...prev,
          sales_order_id: fetchedSalesOrderId
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  const updateMaterial = (id, field, value) => {
    setBomMaterials(prev => prev.map(mat => 
      mat.id === id ? { ...mat, [field]: value } : mat
    ))
  }

  const updateOperation = (id, field, value) => {
    setBomOperations(prev => prev.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ))
  }

  const createJobCardsFromOperations = async () => {
    if (!id) {
      setError('Please save the work order first before creating job cards')
      return
    }

    if (bomOperations.length === 0) {
      setError('No operations found in BOM')
      return
    }

    setLoading(true)
    try {
      const jobCardsToCreate = bomOperations.map((op, idx) => ({
        work_order_id: id,
        operation_name: op.operation_name,
        workstation_type: op.workstation,
        planned_quantity: formData.qty_to_manufacture,
        sequence: idx + 1
      }))

      const createdCards = []
      for (const jc of jobCardsToCreate) {
        const response = await productionService.createJobCard(jc)
        if (response.success || response.data) {
          createdCards.push(response.data || response)
        }
      }

      setSuccess(`Created ${createdCards.length} job cards successfully`)
      setTimeout(() => setSuccess(null), 3000)
      
      await fetchJobCards(id)
    } catch (err) {
      console.error('Error creating job cards:', err)
      setError(`Failed to create job cards: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.item_to_manufacture) {
      setError('Please select an item to manufacture')
      return
    }
    if (!formData.qty_to_manufacture || formData.qty_to_manufacture <= 0) {
      setError('Please enter a valid quantity')
      return
    }
    if (!formData.bom_id) {
      setError('Please enter a BOM ID')
      return
    }

    setLoading(true)
    try {
      const payload = {
        item_code: formData.item_to_manufacture,
        bom_no: formData.bom_id,
        quantity: parseFloat(formData.qty_to_manufacture),
        priority: formData.priority,
        notes: formData.notes,
        planned_start_date: formData.planned_start_date ? new Date(formData.planned_start_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        planned_end_date: formData.planned_end_date ? new Date(formData.planned_end_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        sales_order_id: formData.sales_order_id,
        operations: bomOperations.map(op => ({
          operation: op.operation_name,
          workstation: op.workstation,
          time: op.operation_time
        })),
        required_items: bomMaterials.map(mat => ({
          item_code: mat.item_code,
          source_warehouse: mat.source_warehouse || 'Stores - NC',
          required_qty: (mat.required_qty / bomQuantity) * parseFloat(formData.qty_to_manufacture)
        }))
      }

      let response
      if (id) {
        response = await productionService.updateWorkOrder(id, payload)
      } else {
        response = await productionService.createWorkOrder(payload)
      }

      if (response.success) {
        setSuccess(`Work order ${id ? 'updated' : 'created'} successfully`)
        setTimeout(() => {
          navigate('/manufacturing/work-orders')
        }, 2000)
      } else {
        setError(response.message || 'Failed to save work order')
      }
    } catch (err) {
      console.error('Error saving work order:', err)
      setError(`Failed to save work order: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Factory className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {isReadOnly ? 'View Work Order' : (id ? 'Edit Work Order' : 'Create Work Order')}
              </h1>
            </div>
            <button
              onClick={() => navigate('/manufacturing/work-orders')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-900">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">{success}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Item to Manufacture */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  Item to Manufacture *
                </label>
                <SearchableSelect
                  value={formData.item_to_manufacture}
                  onChange={isReadOnly ? undefined : handleItemSelect}
                  options={items.map(item => ({
                    value: item.item_code,
                    label: item.item_code
                  }))}
                  placeholder="Search and select item..."
                  isClearable={!isReadOnly}
                  isDisabled={isReadOnly}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  Quantity to Manufacture *
                </label>
                <input
                  type="number"
                  name="qty_to_manufacture"
                  value={formData.qty_to_manufacture}
                  onChange={handleInputChange}
                  placeholder="Enter quantity"
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Sales Order ID */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  Sales Order ID
                </label>
                <input
                  type="text"
                  name="sales_order_id"
                  value={formData.sales_order_id}
                  onChange={handleInputChange}
                  placeholder="e.g., SO-123456"
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* BOM ID */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  BOM ID *
                </label>
                {availableBoms.length > 0 ? (
                  <SearchableSelect
                    value={formData.bom_id}
                    onChange={isReadOnly ? undefined : (value) => {
                      handleInputChange({ target: { name: 'bom_id', value } })
                    }}
                    options={availableBoms.map(bom => ({
                      value: bom.bom_id,
                      label: `${bom.bom_id} (${bom.status})`
                    }))}
                    placeholder="Select BOM..."
                    isDisabled={isReadOnly}
                  />
                ) : (
                  <input
                    type="text"
                    name="bom_id"
                    value={formData.bom_id}
                    onChange={handleInputChange}
                    placeholder="e.g., BOM-123456"
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  />
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Planned Start Date */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  Planned Start Date
                </label>
                <input
                  type="date"
                  name="planned_start_date"
                  value={formData.planned_start_date}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* Planned End Date */}
              <div>
                <label className="block text-xs font-semibold  text-gray-700 mb-2">
                  Planned End Date
                </label>
                <input
                  type="date"
                  name="planned_end_date"
                  value={formData.planned_end_date}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold  text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Enter any additional notes..."
                rows="3"
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Operations Section */}
            {bomOperations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Factory size={20} className="text-blue-600" />
                  Operations
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border border-gray-200">
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">No.</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Operation <span className="text-red-500">*</span></th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Completed Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Process Loss Qty</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">BOM</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Workstation</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Time <span className="text-red-500">*</span></th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomOperations.map((op, idx) => (
                        <tr key={op.id} className={`border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-3 py-2 text-gray-900 font-medium">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-900 font-medium">{op.operation_name || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={op.completed_qty || 0}
                              onChange={(e) => updateOperation(op.id, 'completed_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              value={op.process_loss_qty || 0}
                              onChange={(e) => updateOperation(op.id, 'process_loss_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-gray-900">{formData.bom_id || '-'}</td>
                          <td className="px-3 py-2 text-gray-900">{op.workstation || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={op.operation_time || 0}
                              onChange={(e) => updateOperation(op.id, 'operation_time', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-20 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {!isReadOnly && (
                              <button
                                onClick={() => setEditingOperationId(editingOperationId === op.id ? null : op.id)}
                                className="p-1 hover:bg-blue-100 rounded transition"
                              >
                                <Edit2 size={14} className="text-blue-600" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Materials/Required Items Section */}
            {bomMaterials.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Boxes size={20} className="text-purple-600" />
                  Required Items
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border border-gray-200">
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-10">No.</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Item Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Source Warehouse</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Required Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Transferred Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Consumed Qty</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Returned Qty</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700 w-12">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomMaterials.map((mat, idx) => (
                        <tr key={mat.id} className={`border border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                          <td className="px-3 py-2 text-center text-gray-900 font-medium">{idx + 1}</td>
                          <td className="px-3 py-2 text-gray-900 font-medium">{mat.item_code || '-'}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={mat.source_warehouse || ''}
                              onChange={(e) => updateMaterial(mat.id, 'source_warehouse', e.target.value)}
                              disabled={isReadOnly}
                              placeholder="Warehouse"
                              className={`w-40 px-2 py-1 border border-gray-300 rounded text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              value={mat.required_qty || 0}
                              onChange={(e) => updateMaterial(mat.id, 'required_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              value={mat.transferred_qty || 0}
                              onChange={(e) => updateMaterial(mat.id, 'transferred_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              value={mat.consumed_qty || 0}
                              onChange={(e) => updateMaterial(mat.id, 'consumed_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              step="0.001"
                              value={mat.returned_qty || 0}
                              onChange={(e) => updateMaterial(mat.id, 'returned_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className={`w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm ${isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {!isReadOnly && (
                              <button
                                onClick={() => setEditingMaterialId(editingMaterialId === mat.id ? null : mat.id)}
                                className="p-1 hover:bg-blue-100 rounded transition"
                              >
                                <Edit2 size={14} className="text-blue-600" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
              <button
                onClick={() => navigate('/manufacturing/work-orders')}
                className={`px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition ${isReadOnly ? '' : ''}`}
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Save Work Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
