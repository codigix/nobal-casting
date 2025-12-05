import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import * as productionService from '../../services/productionService'
import SearchableSelect from '../../components/SearchableSelect'
import './Production.css'
import './ProductionPlanForm.css'

export default function ProductionPlanForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [boms, setBOMs] = useState([])
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [expandedSections, setExpandedSections] = useState({
    sales_orders: true,
    material_request_detail: true
  })
  const [formData, setFormData] = useState({
    naming_series: 'MFG-PP-.YYYY.-',
    posting_date: new Date().toISOString().split('T')[0],
    company: 'Codigix Infotech',
    get_items_from: '',
    warehouse_name: '',
    planned_quantity: '',
    status: 'Draft',
    priority: 'Medium',
    notes: '',
    assembly_items: [],
    sub_assembly_items: [],
    raw_materials: [],
    include_non_stock: true,
    include_subcontracted: true,
    consider_minimum_order_qty: false,
    include_safety_stock: false,
    ignore_available_stock: false
  })
  const [filters, setFilters] = useState({
    sales_order: {
      item_code: '',
      customer: '',
      project: '',
      sales_order_status: '',
      from_date: '',
      to_date: '',
      from_delivery_date: '',
      to_delivery_date: ''
    },
    material_request: {
      item_code: '',
      warehouse: '',
      from_date: '',
      to_date: '',
      from_delivery_date: '',
      to_delivery_date: ''
    }
  })
  const [materialRequests, setMaterialRequests] = useState([])
  const [salesOrders, setSalesOrders] = useState([])
  const [availableSalesOrders, setAvailableSalesOrders] = useState([])
  const [companies, setCompanies] = useState([])
  const [customers, setCustomers] = useState([])
  const [itemCodes, setItemCodes] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(false)
  const [itemCodesLoading, setItemCodesLoading] = useState(false)
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [salesOrdersLoading, setSalesOrdersLoading] = useState(false)
  const [itemDetailsMap, setItemDetailsMap] = useState({})
  const [bomDetailsMap, setBomDetailsMap] = useState({})
  const [salesOrderDetailsMap, setSalesOrderDetailsMap] = useState({})

  useEffect(() => {
    fetchBOMs()
    fetchCompanies()
    fetchCustomers()
    fetchItemCodes()
    fetchWarehouses()
    fetchAvailableSalesOrders()
    if (id) {
      fetchPlanDetails(id)
    }
  }, [id])

  const fetchBOMs = async () => {
    try {
      const response = await productionService.getBOMs({ status: 'active' })
      setBOMs(response.data || [])
    } catch (err) {
      console.error('Failed to fetch BOMs:', err)
    }
  }

  const fetchCompanies = async () => {
    setCompanies([
      { value: 'Codigix Infotech', label: 'Codigix Infotech' }
    ])
  }

  const fetchCustomers = async () => {
    try {
      setCustomersLoading(true)
      const response = await productionService.getCustomers()
      const data = (response.data || []).map(item => ({
        value: item.name,
        label: `${item.name}${item.email ? ' (' + item.email + ')' : ''}`
      }))
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setCustomersLoading(false)
    }
  }

  const fetchItemCodes = async () => {
    try {
      setItemCodesLoading(true)
      const response = await productionService.getItems()
      const data = (response.data || []).map(item => ({
        value: item.item_code,
        label: `${item.item_code} - ${item.item_name || ''}`
      }))
      setItemCodes(data)

      const detailsMap = {};
      (response.data || []).forEach(item => {
        detailsMap[item.item_code] = {
          uom: item.uom || 'Nos',
          item_name: item.item_name
        }
      })
      setItemDetailsMap(detailsMap)
    } catch (err) {
      console.error('Failed to fetch items:', err)
    } finally {
      setItemCodesLoading(false)
    }
  }

  const fetchWarehouses = async () => {
    try {
      setWarehousesLoading(true)
      const response = await productionService.getWarehouses()
      const data = (response.data || [])
        .filter(item => item.is_active !== false)
        .map(item => ({
          value: item.warehouse_name,
          label: item.warehouse_name
        }))
      setWarehouses(data)
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    } finally {
      setWarehousesLoading(false)
    }
  }

  const fetchAvailableSalesOrders = async () => {
    try {
      setSalesOrdersLoading(true)
      const response = await fetch('/api/selling/sales-orders')
      const data = await response.json()
      const salesOrderList = (data.data || [])
        .filter(item => item.status !== 'Cancelled')
        .map(item => ({
          value: item.name,
          label: `${item.name} - ${item.customer_name || 'N/A'}`,
          id: item.name,
          customer_name: item.customer_name || '',
          posting_date: item.posting_date || '',
          grand_total: item.grand_total || 0
        }))
      setAvailableSalesOrders(salesOrderList)

      const detailsMap = {}
      salesOrderList.forEach(so => {
        detailsMap[so.id] = {
          customer_name: so.customer_name,
          posting_date: so.posting_date,
          grand_total: so.grand_total
        }
      })
      setSalesOrderDetailsMap(detailsMap)
    } catch (err) {
      console.error('Failed to fetch sales orders:', err)
    } finally {
      setSalesOrdersLoading(false)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    try {
      if (bomDetailsMap[bomId]) {
        return bomDetailsMap[bomId]
      }
      const response = await productionService.getBOMDetails(bomId)
      const bomData = response.data
      const details = {
        qty: bomData.qty || 0,
        uom: bomData.uom || 'Nos'
      }
      setBomDetailsMap(prev => ({
        ...prev,
        [bomId]: details
      }))
      return details
    } catch (err) {
      console.error('Failed to fetch BOM details:', err)
      return null
    }
  }

  const fetchPlanDetails = async (planId) => {
    try {
      setLoading(true)
      const response = await productionService.getProductionPlanDetails(planId)
      const plan = response.data
      setFormData(prev => ({
        ...prev,
        naming_series: plan.naming_series || 'MFG-PP-.YYYY.-',
        posting_date: plan.posting_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        company: plan.company || 'Codigix Infotech',
        get_items_from: plan.get_items_from || '',
        planned_quantity: plan.planned_quantity || '',
        status: plan.status || 'Draft',
        priority: plan.priority || 'Medium',
        notes: plan.notes || '',
        assembly_items: plan.assembly_items || [],
        sub_assembly_items: plan.sub_assembly_items || [],
        raw_materials: plan.raw_materials || [],
        include_non_stock: plan.include_non_stock !== false,
        include_subcontracted: plan.include_subcontracted !== false,
        consider_minimum_order_qty: plan.consider_minimum_order_qty === true,
        include_safety_stock: plan.include_safety_stock === true,
        ignore_available_stock: plan.ignore_available_stock === true
      }))
    } catch (err) {
      setError('Failed to load plan details')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)
  }

  const handleFilterChange = (source, field, value) => {
    setFilters(prev => ({
      ...prev,
      [source]: {
        ...prev[source],
        [field]: value
      }
    }))
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const addAssemblyItem = () => {
    setFormData(prev => ({
      ...prev,
      assembly_items: [...prev.assembly_items, { item_code: '', bom_no: '', planned_qty: 0, uom: 'Nos', planned_start_date: '' }]
    }))
  }

  const removeAssemblyItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      assembly_items: prev.assembly_items.filter((_, i) => i !== idx)
    }))
  }

  const updateAssemblyItem = async (idx, field, value) => {
    setFormData(prev => {
      const items = [...prev.assembly_items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, assembly_items: items }
    })

    if (field === 'item_code' && value) {
      const itemDetail = itemDetailsMap[value]
      if (itemDetail) {
        setFormData(prev => {
          const items = [...prev.assembly_items]
          items[idx] = {
            ...items[idx],
            uom: itemDetail.uom || 'Nos',
            planned_start_date: formData.start_date || new Date().toISOString().split('T')[0]
          }
          return { ...prev, assembly_items: items }
        })
      }
    }

    if (field === 'bom_no' && value) {
      const bomDetail = await fetchBOMDetails(value)
      if (bomDetail) {
        setFormData(prev => {
          const items = [...prev.assembly_items]
          items[idx] = {
            ...items[idx],
            planned_qty: bomDetail.qty || 0,
            uom: bomDetail.uom || 'Nos',
            planned_start_date: formData.start_date || new Date().toISOString().split('T')[0]
          }
          return { ...prev, assembly_items: items }
        })
      }
    }
  }

  const addMaterialRequest = () => {
    setMaterialRequests(prev => [...prev, { material_request: '', material_request_date: '' }])
  }

  const removeMaterialRequest = (idx) => {
    setMaterialRequests(prev => prev.filter((_, i) => i !== idx))
  }

  const updateMaterialRequest = (idx, field, value) => {
    setMaterialRequests(prev => {
      const items = [...prev]
      items[idx] = { ...items[idx], [field]: value }
      return items
    })
  }

  const addSalesOrder = () => {
    setSalesOrders(prev => [...prev, { sales_order: '', sales_order_date: '', customer: '', grand_total: 0 }])
  }

  const removeSalesOrder = (idx) => {
    setSalesOrders(prev => prev.filter((_, i) => i !== idx))
  }

  const updateSalesOrder = (idx, field, value) => {
    setSalesOrders(prev => {
      const items = [...prev]
      items[idx] = { ...items[idx], [field]: value }

      if (field === 'sales_order' && value) {
        const soDetails = salesOrderDetailsMap[value]
        if (soDetails) {
          items[idx] = {
            ...items[idx],
            customer: soDetails.customer_name,
            sales_order_date: soDetails.posting_date?.split('T')[0] || '',
            grand_total: soDetails.grand_total || 0
          }
        }
      }

      return items
    })
  }

  const addSubAssemblyItem = () => {
    setFormData(prev => ({
      ...prev,
      sub_assembly_items: [...prev.sub_assembly_items, { item_code: '', target_warehouse: '', schedule_date: '', required_qty: 0, bom_no: '', manufacturing_type: '' }]
    }))
  }

  const removeSubAssemblyItem = (idx) => {
    setFormData(prev => ({
      ...prev,
      sub_assembly_items: prev.sub_assembly_items.filter((_, i) => i !== idx)
    }))
  }

  const updateSubAssemblyItem = (idx, field, value) => {
    setFormData(prev => {
      const items = [...prev.sub_assembly_items]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, sub_assembly_items: items }
    })
  }

  const addRawMaterial = () => {
    setFormData(prev => ({
      ...prev,
      raw_materials: [...prev.raw_materials, { item_code: '', warehouse: '', type: '', plan_to_request_qty: 0, qty_as_per_bom: 0, required_by: '' }]
    }))
  }

  const removeRawMaterial = (idx) => {
    setFormData(prev => ({
      ...prev,
      raw_materials: prev.raw_materials.filter((_, i) => i !== idx)
    }))
  }

  const updateRawMaterial = (idx, field, value) => {
    setFormData(prev => {
      const items = [...prev.raw_materials]
      items[idx] = { ...items[idx], [field]: value }
      return { ...prev, raw_materials: items }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.posting_date || !formData.company) {
        throw new Error('Please fill all required fields')
      }

      const payload = {
        ...formData,
        planned_quantity: parseFloat(formData.planned_quantity) || 0
      }

      if (id) {
        await productionService.updateProductionPlan(id, payload)
        setSuccess('Production plan updated successfully')
      } else {
        await productionService.createProductionPlan(payload)
        setSuccess('Production plan created successfully')
      }

      setTimeout(() => {
        navigate('/production/plans', { state: { success: 'Plan saved successfully' } })
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to save production plan')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 'basic', label: '📋 Basic Info', icon: '📋' },
    { id: 'assembly', label: '🏗️ Assembly', icon: '🏗️' },
    { id: 'subassembly', label: '⚙️ Sub Assembly', icon: '⚙️' },
    { id: 'materials', label: '📦 Raw Materials', icon: '📦' },
    { id: 'details', label: '📝 Details', icon: '📝' }
  ]

  const validateStep = (stepId) => {
    switch (stepId) {
      case 'basic':
        if (!formData.posting_date) return 'Posting Date is required'
        if (!formData.company) return 'Company is required'
        return null
      case 'assembly':
        return null
      case 'subassembly':
        return null
      case 'materials':
        return null
      case 'details':
        return null
      default:
        return null
    }
  }

  const handleNext = () => {
    const validation = validateStep(steps[currentStep].id)
    if (validation) {
      setError(validation)
      return
    }
    setError(null)
    setCompletedSteps([...new Set([...completedSteps, currentStep])])
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    setError(null)
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📅 {id ? 'Edit' : 'Create'} Production Plan</h1>
          <p className="header-subtitle">Design and schedule your production plan</p>
        </div>
        <button
          onClick={() => navigate('/production/plans')}
          className="btn-cancel"
        >
          <X size={18} /> Back
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="pp-form">
        <div className="tabs-container">
          <div className="tabs-header" style={{ flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
              {steps.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      backgroundColor: idx === currentStep ? '#3b82f6' : completedSteps.includes(idx) ? '#10b981' : '#e5e7eb',
                      color: idx === currentStep || completedSteps.includes(idx) ? 'white' : '#6b7280',
                      fontSize: '14px'
                    }}
                  >
                    {completedSteps.includes(idx) ? '✓' : idx + 1}
                  </div>
                  <div style={{ marginLeft: '10px', flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: idx === currentStep ? '#3b82f6' : '#6b7280' }}>
                      {step.label}
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{ flex: 1, height: '2px', backgroundColor: completedSteps.includes(idx) ? '#10b981' : '#e5e7eb', marginLeft: '10px' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
              Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
            </div>
          </div>

          <div className="tabs-content">
            {currentStep === 0 && (
              <div className="tab-pane">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Naming Series *</label>
                    <input
                      type="text"
                      name="naming_series"
                      value={formData.naming_series}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Posting Date *</label>
                    <input
                      type="date"
                      name="posting_date"
                      value={formData.posting_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <SearchableSelect
                    label="Company"
                    value={formData.company}
                    onChange={(val) => setFormData(prev => ({ ...prev, company: val }))}
                    options={companies}
                    placeholder="Search or select company"
                    isLoading={companiesLoading}
                    required={true}
                  />
                  <div className="form-group">
                    <label>Get Items From</label>
                    <select
                      name="get_items_from"
                      value={formData.get_items_from}
                      onChange={handleInputChange}
                    >
                      <option value="">Select</option>
                      <option value="sales_order">Sales Order</option>
                      <option value="material_request">Material Request</option>
                    </select>
                  </div>
                </div>

                {formData.get_items_from === 'sales_order' && (
                  <>
                    <div style={{ marginTop: '30px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>📋 Filters</h3>
                      <div className="form-grid-2">
                        <SearchableSelect
                          label="Item Code"
                          value={filters.sales_order.item_code}
                          onChange={(val) => handleFilterChange('sales_order', 'item_code', val)}
                          options={itemCodes}
                          placeholder="Search or select item code"
                          isLoading={itemCodesLoading}
                        />
                        <div className="form-group">
                          <label>From Date</label>
                          <input
                            type="date"
                            value={filters.sales_order.from_date}
                            onChange={(e) => handleFilterChange('sales_order', 'from_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <SearchableSelect
                          label="Customer"
                          value={filters.sales_order.customer}
                          onChange={(val) => handleFilterChange('sales_order', 'customer', val)}
                          options={customers}
                          placeholder="Search or select customer"
                          isLoading={customersLoading}
                        />
                        <div className="form-group">
                          <label>To Date</label>
                          <input
                            type="date"
                            value={filters.sales_order.to_date}
                            onChange={(e) => handleFilterChange('sales_order', 'to_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Project</label>
                          <input
                            type="text"
                            value={filters.sales_order.project}
                            onChange={(e) => handleFilterChange('sales_order', 'project', e.target.value)}
                            placeholder="Search project"
                          />
                        </div>
                        <div className="form-group">
                          <label>From Delivery Date</label>
                          <input
                            type="date"
                            value={filters.sales_order.from_delivery_date}
                            onChange={(e) => handleFilterChange('sales_order', 'from_delivery_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Sales Order Status</label>
                          <select
                            value={filters.sales_order.sales_order_status}
                            onChange={(e) => handleFilterChange('sales_order', 'sales_order_status', e.target.value)}
                          >
                            <option value="">Select Status</option>
                            <option value="To Delivered and Bill">To Delivered and Bill</option>
                            <option value="To Bill">To Bill</option>
                            <option value="To Delivered">To Delivered</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>To Delivery Date</label>
                          <input
                            type="date"
                            value={filters.sales_order.to_delivery_date}
                            onChange={(e) => handleFilterChange('sales_order', 'to_delivery_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '30px', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expandedSections.sales_orders ? '20px' : '0px' }} onClick={() => toggleSection('sales_orders')}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0px' }}>Sales Orders</h3>
                        {expandedSections.sales_orders ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>

                      {expandedSections.sales_orders && (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ marginBottom: '20px' }}
                          >
                            Get Sales Orders
                          </button>

                          <div className="table-wrapper">
                            <table className="editable-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}><input type="checkbox" /></th>
                                  <th>No.</th>
                                  <th>Sales Order *</th>
                                  <th>Sales Order Date</th>
                                  <th>Customer</th>
                                  <th>Grand Total</th>
                                  <th style={{ width: '60px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {salesOrders.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>No sales orders added yet</td>
                                  </tr>
                                ) : (
                                  salesOrders.map((item, idx) => (
                                    <tr key={idx}>
                                      <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                                      <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                                      <td>
                                        <div style={{ width: "100%" }}>
                                          {availableSalesOrders.length > 0 ? (
                                            <select
                                              className="table-input"
                                              value={item.sales_order}
                                              onChange={(e) => updateSalesOrder(idx, 'sales_order', e.target.value)}
                                              style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                            >
                                              <option value="">Select Sales Order</option>
                                              {availableSalesOrders.map((so) => (
                                                <option key={so.id} value={so.id}>{so.label}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <input
                                              type="text"
                                              className="table-input"
                                              value={item.sales_order}
                                              onChange={(e) => updateSalesOrder(idx, 'sales_order', e.target.value)}
                                              placeholder={salesOrdersLoading ? 'Loading...' : 'No sales orders'}
                                            />
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="date"
                                          className="table-input"
                                          value={item.sales_order_date}
                                          onChange={(e) => updateSalesOrder(idx, 'sales_order_date', e.target.value)}
                                          disabled
                                          style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                                        />
                                      </td>
                                      <td>
                                        <div style={{ width: "100%" }}>
                                          {customers.length > 0 ? (
                                            <select
                                              className="table-input"
                                              value={item.customer}
                                              onChange={(e) => updateSalesOrder(idx, 'customer', e.target.value)}
                                              style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                            >
                                              <option value="">Select customer</option>
                                              {customers.map((cust) => (
                                                <option key={cust.value} value={cust.value}>{cust.label}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <input
                                              type="text"
                                              className="table-input"
                                              value={item.customer}
                                              onChange={(e) => updateSalesOrder(idx, 'customer', e.target.value)}
                                              placeholder="Customer"
                                            />
                                          )}
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="number"
                                          className="table-input"
                                          value={item.grand_total}
                                          onChange={(e) => updateSalesOrder(idx, 'grand_total', e.target.value)}
                                          placeholder="0.00"
                                          step="0.01"
                                          disabled
                                          style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                                        />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => removeSalesOrder(idx)}
                                          className="btn-table-delete"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          <button
                            type="button"
                            onClick={addSalesOrder}
                            className="btn-secondary btn-add-row"
                            style={{ marginTop: '10px' }}
                          >
                            <Plus size={16} /> Add Row
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {formData.get_items_from === 'material_request' && (
                  <>
                    <div style={{ marginTop: '30px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>📋 Filters</h3>
                      <div className="form-grid-2">
                        <SearchableSelect
                          label="Item Code"
                          value={filters.material_request.item_code}
                          onChange={(val) => handleFilterChange('material_request', 'item_code', val)}
                          options={itemCodes}
                          placeholder="Search or select item code"
                          isLoading={itemCodesLoading}
                        />
                        <div className="form-group">
                          <label>From Date</label>
                          <input
                            type="date"
                            value={filters.material_request.from_date}
                            onChange={(e) => handleFilterChange('material_request', 'from_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <SearchableSelect
                          label="Warehouse"
                          value={filters.material_request.warehouse}
                          onChange={(val) => handleFilterChange('material_request', 'warehouse', val)}
                          options={warehouses}
                          placeholder="Search or select warehouse"
                          isLoading={warehousesLoading}
                        />
                        <div className="form-group">
                          <label>To Date</label>
                          <input
                            type="date"
                            value={filters.material_request.to_date}
                            onChange={(e) => handleFilterChange('material_request', 'to_date', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>From Delivery Date</label>
                          <input
                            type="date"
                            value={filters.material_request.from_delivery_date}
                            onChange={(e) => handleFilterChange('material_request', 'from_delivery_date', e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label>To Delivery Date</label>
                          <input
                            type="date"
                            value={filters.material_request.to_delivery_date}
                            onChange={(e) => handleFilterChange('material_request', 'to_delivery_date', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '30px', padding: '20px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: expandedSections.material_request_detail ? '20px' : '0px' }} onClick={() => toggleSection('material_request_detail')}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: '0px' }}>Material Request Detail</h3>
                        {expandedSections.material_request_detail ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>

                      {expandedSections.material_request_detail && (
                        <>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ marginBottom: '20px' }}
                          >
                            Get Material Request
                          </button>

                          <div className="table-wrapper">
                            <table className="editable-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '40px' }}><input type="checkbox" /></th>
                                  <th>No.</th>
                                  <th>Material Request *</th>
                                  <th>Material Request Date</th>
                                  <th style={{ width: '60px' }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {materialRequests.length === 0 ? (
                                  <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>No material requests added yet</td>
                                  </tr>
                                ) : (
                                  materialRequests.map((item, idx) => (
                                    <tr key={idx}>
                                      <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                                      <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                                      <td>
                                        <input
                                          type="text"
                                          className="table-input"
                                          value={item.material_request}
                                          onChange={(e) => updateMaterialRequest(idx, 'material_request', e.target.value)}
                                          placeholder="Enter material request"
                                        />
                                      </td>
                                      <td>
                                        <input
                                          type="date"
                                          className="table-input"
                                          value={item.material_request_date}
                                          onChange={(e) => updateMaterialRequest(idx, 'material_request_date', e.target.value)}
                                        />
                                      </td>
                                      <td style={{ textAlign: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => removeMaterialRequest(idx)}
                                          className="btn-table-delete"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          <button
                            type="button"
                            onClick={addMaterialRequest}
                            className="btn-secondary btn-add-row"
                            style={{ marginTop: '10px' }}
                          >
                            <Plus size={16} /> Add Row
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 1 && (
              <div className="tab-pane">
                <div className="table-wrapper">
                  <table className="editable-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Item Code</th>
                        <th>BOM No</th>
                        <th>Planned Qty</th>
                        <th>UOM</th>
                        <th>Planned Start Date</th>
                        <th style={{ width: '60px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.assembly_items.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>No assembly items added yet</td>
                        </tr>
                      ) : (
                        formData.assembly_items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <div style={{ width: "100%", minHeight: "42px" }}>
                                <SearchableSelect
                                  value={item.item_code}
                                  onChange={(val) => updateAssemblyItem(idx, 'item_code', val)}
                                  options={itemCodes}
                                  placeholder="Search or select item"
                                  isLoading={false}
                                />
                              </div>
                            </td>

                            <td>
                              <div style={{ width: "100%", minHeight: "42px" }}>
                                <SearchableSelect
                                  value={item.bom_no}
                                  onChange={(val) => updateAssemblyItem(idx, 'bom_no', val)}
                                  options={boms.map(b => ({ value: b.bom_id, label: b.bom_id }))}
                                  placeholder="Search or select BOM"
                                  isLoading={false}
                                />
                              </div>
                            </td>

                            <td>
                              <input
                                type="number"
                                className="table-input"
                                value={item.planned_qty}
                                onChange={(e) => updateAssemblyItem(idx, 'planned_qty', e.target.value)}
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="table-input"
                                value={item.uom}
                                onChange={(e) => updateAssemblyItem(idx, 'uom', e.target.value)}
                                placeholder="Nos"
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="table-input"
                                value={item.planned_start_date}
                                onChange={(e) => updateAssemblyItem(idx, 'planned_start_date', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeAssemblyItem(idx)}
                                className="btn-table-delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addAssemblyItem}
                  className="btn-secondary btn-add-row"
                >
                  <Plus size={16} /> Add Row
                </button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="tab-pane">
                <div style={{ marginBottom: '30px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '20px' }}>Sub Assembly Items</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '20px' }}>
                    <div>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            name="consolidate_sub_assembly"
                            checked={formData.consolidate_sub_assembly || false}
                            onChange={handleInputChange}
                          />
                          <span>Consolidate Sub Assembly Items</span>
                        </label>
                      </div>
                      <div className="form-group" style={{ marginTop: '20px' }}>
                        <label>Sub Assembly Warehouse *</label>
                        <SearchableSelect
                          value={formData. warehouse_name}
                          onChange={(val) => setFormData(prev => ({ ...prev,  warehouse_name: val }))}
                          options={warehouses}
                          placeholder="Search or select warehouse"
                          isLoading={warehousesLoading}
                        />
                      </div>

                      <p className="helper-text" style={{ marginTop: '20px' }}>When a parent warehouse is chosen, the system conducts stock checks against the associated child warehouses</p>
                    </div>

                    <div>
                      <div className="checkbox-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            name="skip_available_sub_assembly"
                            checked={formData.skip_available_sub_assembly || false}
                            onChange={handleInputChange}
                          />
                          <span>Skip Available Sub Assembly Items</span>
                        </label>
                      </div>
                      <p className="helper-text" style={{ marginTop: '20px' }}>If this checkbox is enabled, then the system won't run the MRP for the available sub-assembly items.</p>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ marginTop: '30px' }}
                      >
                        Get Sub Assembly Items
                      </button>
                    </div>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="editable-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}><input type="checkbox" /></th>
                        <th>No.</th>
                        <th>Sub Assembly Item Code</th>
                        <th>Target Warehouse</th>
                        <th>Schedule D...</th>
                        <th>Required Qty</th>
                        <th>Bom No</th>
                        <th>Manufacturing Type</th>
                        <th style={{ width: '60px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.sub_assembly_items.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                              <div>No Data</div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        formData.sub_assembly_items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center' }}><input type="checkbox" /></td>
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <div style={{ width: "100%", minHeight: "42px" }}>
                                <SearchableSelect
                                  value={item.item_code}
                                  onChange={(val) => updateAssemblyItem(idx, 'item_code', val)}
                                  options={itemCodes}
                                  placeholder="Search or select item"
                                  isLoading={false}
                                />
                              </div>
                            </td>

                            <td>
                              <div style={{ width: "100%" }}>
                                {warehouses.length > 0 ? (
                                  <select
                                    className="table-input"
                                    value={item.target_warehouse}
                                    onChange={(e) => updateSubAssemblyItem(idx, 'target_warehouse', e.target.value)}
                                    style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                                  >
                                    <option value="">Select warehouse</option>
                                    {warehouses.map((wh) => (
                                      <option key={wh.value} value={wh.value}>{wh.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    className="table-input"
                                    value={item.target_warehouse}
                                    onChange={(e) => updateSubAssemblyItem(idx, 'target_warehouse', e.target.value)}
                                    placeholder="Warehouse"
                                  />
                                )}
                              </div>
                            </td>
                            <td>
                              <input
                                type="date"
                                className="table-input"
                                value={item.schedule_date}
                                onChange={(e) => updateSubAssemblyItem(idx, 'schedule_date', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="table-input"
                                value={item.required_qty}
                                onChange={(e) => updateSubAssemblyItem(idx, 'required_qty', e.target.value)}
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <div style={{ width: "100%", minHeight: "42px" }}>
                                <SearchableSelect
                                  value={item.bom_no}
                                  onChange={(val) => updateSubAssemblyItem(idx, 'bom_no', val)}
                                  options={boms.map(b => ({ value: b.bom_id, label: b.bom_id }))}
                                  placeholder="Search or select BOM"
                                  isLoading={false}
                                />
                              </div>
                            </td>
                            <td>
                              <select
                                className="table-input"
                                value={item.manufacturing_type}
                                onChange={(e) => updateSubAssemblyItem(idx, 'manufacturing_type', e.target.value)}
                                style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                              >
                                <option value="">Select type</option>
                                <option value="In-house">In-house</option>
                                <option value="Outsource">Outsource</option>
                                <option value="Subcontract">Subcontract</option>
                                <option value="Material Request">Material Request</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeSubAssemblyItem(idx)}
                                className="btn-table-delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addSubAssemblyItem}
                  className="btn-secondary btn-add-row"
                >
                  <Plus size={16} /> Add Row
                </button>
              </div>
            )}

            {currentStep === 3 && (
              <div className="tab-pane">
                <div className="planning-grid">
                  <div>
                    <h4 className="subsection-title">Planning Options</h4>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="include_non_stock"
                          checked={formData.include_non_stock}
                          onChange={handleInputChange}
                        />
                        <span>Include Non Stock Items</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="include_subcontracted"
                          checked={formData.include_subcontracted}
                          onChange={handleInputChange}
                        />
                        <span>Include Subcontracted Items</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="consider_minimum_order_qty"
                          checked={formData.consider_minimum_order_qty}
                          onChange={handleInputChange}
                        />
                        <span>Consider Minimum Order Qty</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="include_safety_stock"
                          checked={formData.include_safety_stock}
                          onChange={handleInputChange}
                        />
                        <span>Include Safety Stock in Required Qty Calculation</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="subsection-title">Warehouse</h4>
                    <div className="form-group">
                      <label>Raw Materials Warehouse</label>
                      <div style={{ width: "100%" }}>
                        {warehouses.length > 0 ? (
                          <select
                            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                          >
                            <option value="">Select warehouse</option>
                            {warehouses.map((wh) => (
                              <option key={wh.value} value={wh.value}>{wh.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder="Select warehouse"
                            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                          />
                        )}
                      </div>
                    </div>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="ignore_available_stock"
                        checked={formData.ignore_available_stock}
                        onChange={handleInputChange}
                      />
                      <span>Ignore Available Stock</span>
                    </label>
                    <p className="helper-text">If enabled, the system will create material requests even if the stock exists in the Raw Materials Warehouse</p>
                  </div>
                </div>

                <div className="action-buttons">
                  <button type="button" className="btn-secondary">Get Raw Materials for Purchase</button>
                  <button type="button" className="btn-secondary">Get Raw Materials for Transfer</button>
                </div>
                <div className="table-wrapper mt-3">
                  <table className="editable-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Item Code</th>
                        <th>Warehouse</th>
                        <th>Type</th>
                        <th>Plan to Request Qty</th>
                        <th>Qty As Per BOM</th>
                        <th>Required By</th>
                        <th style={{ width: '60px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.raw_materials.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>No raw materials added yet</td>
                        </tr>
                      ) : (
                        formData.raw_materials.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <div style={{ width: "100%", minHeight: "42px" }}>
                                <SearchableSelect
                                  value={item.item_code}
                                  onChange={(val) => updateAssemblyItem(idx, 'item_code', val)}
                                  options={itemCodes}
                                  placeholder="Search or select item"
                                  isLoading={false}
                                />
                              </div>
                            </td>

                            <td>
                              <div style={{ width: "100%", minHeight: "42px" }}>
                                <SearchableSelect
                                  value={item.warehouse}
                                  onChange={(val) => updateRawMaterial(idx, 'warehouse', val)}
                                  options={warehouses}
                                  placeholder="Search or select warehouse"
                                  isLoading={warehousesLoading}
                                />
                              </div>
                            </td>

                            <td>
                              <select
                                className="table-input"
                                value={item.type}
                                onChange={(e) => updateRawMaterial(idx, 'type', e.target.value)}
                                style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                              >
                                <option value="">Select type</option>
                                <option value="Purchase">Purchase</option>
                                <option value="Material Issue">Material Issue</option>
                                <option value="Material Transfer">Material Transfer</option>
                                <option value="Customer Provided">Customer Provided</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                className="table-input"
                                value={item.plan_to_request_qty}
                                onChange={(e) => updateRawMaterial(idx, 'plan_to_request_qty', e.target.value)}
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="table-input"
                                value={item.qty_as_per_bom}
                                onChange={(e) => updateRawMaterial(idx, 'qty_as_per_bom', e.target.value)}
                                step="0.01"
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <input
                                type="date"
                                className="table-input"
                                value={item.required_by}
                                onChange={(e) => updateRawMaterial(idx, 'required_by', e.target.value)}
                              />
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeRawMaterial(idx)}
                                className="btn-table-delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addRawMaterial}
                  className="btn-secondary btn-add-row"
                >
                  <Plus size={16} /> Add Row
                </button>
              </div>
            )}



            {currentStep === 4 && (
              <div className="tab-pane">
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>Total Planned Qty</label>
                    <input
                      type="number"
                      name="planned_quantity"
                      value={formData.planned_quantity}
                      onChange={handleInputChange}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Submitted">Submitted</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Production plan notes"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => navigate('/production/plans')}
            className="btn-cancel"
          >
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="btn-secondary"
              style={{ opacity: currentStep === 0 ? 0.5 : 1, cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}
            >
              ← Previous
            </button>
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-submit"
              >
                Next →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-submit"
              >
                <Save size={18} /> {loading ? 'Saving...' : id ? 'Update Plan' : 'Create Plan'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
