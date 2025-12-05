import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import SearchableSelect from '../../components/SearchableSelect'
import './Selling.css'

const styles = {
  mainContainer: {
    maxWidth: '100%',
    margin: '2rem',
    padding: '0'
  },
  header: {
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e5e7eb'
  },
  tabsContainer: {
    marginBottom: '20px',
    borderBottom: '2px solid #e5e7eb'
  },
  tabsList: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '0',
    borderBottom: 'none'
  },
  tab: {
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#666',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  },
  tabActive: {
    color: '#007bff',
    borderBottomColor: '#007bff'
  },
  tabContent: {
    padding: '20px 0'
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px',
    marginBottom: '12px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '4px',
    color: '#374151'
  },
  input: {
    padding: '8px',
    fontSize: '13px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontFamily: 'inherit'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    marginTop: '8px'
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: '600',
    padding: '8px',
    textAlign: 'left',
    borderBottom: '2px solid #d1d5db'
  },
  tableCell: {
    padding: '8px',
    borderBottom: '1px solid #e5e7eb'
  },
  totalsBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '4px',
    padding: '12px',
    marginTop: '12px'
  },
  wizardNav: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  wizardProgress: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  progressDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    transition: 'all 0.3s'
  },
  progressDotActive: {
    backgroundColor: '#007bff',
    width: '24px',
    borderRadius: '4px'
  }
}

export default function SalesOrderForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'

  const tabs = [
    { id: 'basicDetails', label: 'Basic Details' },
    { id: 'accountingDimensions', label: 'Accounting Dimensions' },
    { id: 'currencyPriceList', label: 'Currency & Price List' },
    { id: 'items', label: 'Items' },
    { id: 'paymentTerms', label: 'Payment Terms' },
    { id: 'additionalInfo', label: 'Additional Info' },
    { id: 'printSettings', label: 'Print Settings' },
    { id: 'totals', label: 'Totals & Discounts' }
  ]

  const [activeTabIndex, setActiveTabIndex] = useState(0)

  const [formData, setFormData] = useState({
    series: '',
    date: new Date().toISOString().split('T')[0],
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    delivery_date: '',
    order_type: 'Sales',
    cost_center: '',
    project: '',
    currency: 'INR',
    price_list: '',
    ignore_pricing_rule: false,
    items: [],
    payment_terms_template: '',
    payment_schedule: [],
    status: 'Draft',
    is_internal_customer: false,
    source: '',
    campaign: '',
    territory: '',
    letter_head: '',
    print_heading: '',
    group_same_items: false,
    terms_and_conditions: '',
    notes: '',
    tax_category: '',
    shipping_rule: '',
    incoterm: '',
    sales_taxes_charges_template: '',
    taxes_charges: [],
    rounding_adjustment: 0,
    disable_rounded_total: false,
    apply_discount_on: 'Grand Total',
    coupon_code: '',
    additional_discount_percentage: 0,
    additional_discount_amount: 0,
    sales_partner: '',
    commission_rate: 0,
    amount_eligible_for_commission: 0,
    total_commission: 0,
    sales_team: [],
    auto_repeat: '',
    from_date: '',
    to_date: ''
  })

  const [customers, setCustomers] = useState([])
  const [allItems, setAllItems] = useState([])
  const [orderTypes, setOrderTypes] = useState([{ label: 'Sales', value: 'Sales' }])
  const [costCenters, setCostCenters] = useState([])
  const [projects, setProjects] = useState([])
  const [currencies, setCurrencies] = useState([{ label: 'INR', value: 'INR' }])
  const [priceLists, setPriceLists] = useState([])
  const [statuses, setStatuses] = useState([{ label: 'Draft', value: 'Draft' }, { label: 'Submitted', value: 'Submitted' }, { label: 'Confirmed', value: 'Confirmed' }])
  const [sources, setSources] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [territories, setTerritories] = useState([])
  const [letterHeads, setLetterHeads] = useState([])
  const [taxCategories, setTaxCategories] = useState([])
  const [shippingRules, setShippingRules] = useState([])
  const [incoterms, setIncoterms] = useState([])
  const [taxChargesTemplates, setTaxChargesTemplates] = useState([])
  const [salesPartners, setSalesPartners] = useState([])
  const [couponCodes, setCouponCodes] = useState([])
  const [accountHeads, setAccountHeads] = useState([])
  const [paymentTermsTemplates, setPaymentTermsTemplates] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [order, setOrder] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    fetchRequiredData()
    if (isEditMode) {
      fetchOrder()
    }
  }, [])

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      const [custRes, itemRes, costRes, projRes, priceRes, sourceRes, campRes, terrRes, letterRes, taxRes, shipRes, incoRes, stRes, partRes, couponRes, accRes, payRes] = await Promise.all([
        axios.get('http://localhost:5000/api/selling/customers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/items?limit=1000').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/cost-centers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/projects').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/price-lists').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/lead-sources').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/campaigns').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/territories').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/letter-heads').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/tax-categories').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/shipping-rules').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/incoterms').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/sales-taxes-charges-template').catch(() => ({ data: { data: [] } })),
        axios.get('/api/crm/sales-partners').catch(() => ({ data: { data: [] } })),
        axios.get('/api/selling/coupon-codes').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/account-heads').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/payment-terms').catch(() => ({ data: { data: [] } }))
      ])

      setCustomers(custRes.data.data || [])
      setAllItems(itemRes.data.data || [])
      setCostCenters((costRes.data.data || []).map(c => ({ label: c.name || c.cost_center || '', value: c.id || c.name || '' })))
      setProjects((projRes.data.data || []).map(p => ({ label: p.name || p.project || '', value: p.id || p.name || '' })))
      setPriceLists((priceRes.data.data || []).map(p => ({ label: p.name || p.price_list || '', value: p.id || p.name || '' })))
      setSources((sourceRes.data.data || []).map(s => ({ label: s.name || s.source_name || '', value: s.id || s.name || '' })))
      setCampaigns((campRes.data.data || []).map(c => ({ label: c.name || c.campaign_name || '', value: c.id || c.name || '' })))
      setTerritories((terrRes.data.data || []).map(t => ({ label: t.name || t.territory_name || '', value: t.id || t.name || '' })))
      setLetterHeads((letterRes.data.data || []).map(l => ({ label: l.name || l.letter_head_name || '', value: l.id || l.name || '' })))
      setTaxCategories((taxRes.data.data || []).map(t => ({ label: t.name || t.tax_category || '', value: t.id || t.name || '' })))
      setShippingRules((shipRes.data.data || []).map(s => ({ label: s.name || s.shipping_rule || '', value: s.id || s.name || '' })))
      setIncoterms((incoRes.data.data || []).map(i => ({ label: i.name || i.incoterm || '', value: i.id || i.name || '' })))
      setTaxChargesTemplates((stRes.data.data || []).map(s => ({ label: s.name || s.sales_taxes_charges_template || '', value: s.id || s.name || '' })))
      setSalesPartners((partRes.data.data || []).map(p => ({ label: p.name || p.sales_partner || '', value: p.id || p.name || '' })))
      setCouponCodes((couponRes.data.data || []).map(c => ({ label: c.name || c.coupon_code || '', value: c.id || c.name || '' })))
      setAccountHeads((accRes.data.data || []).map(a => ({ label: a.name || a.account_head || '', value: a.id || a.name || '' })))
      setPaymentTermsTemplates((payRes.data.data || []).map(p => ({ label: p.name || p.payment_terms || '', value: p.id || p.name || '' })))
    } catch (err) {
      console.error('Failed to fetch required data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/selling/sales-orders/${id}`)
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
        delivery_date: orderData.delivery_date || '',
        order_type: orderData.order_type || 'Sales',
        cost_center: orderData.cost_center || '',
        project: orderData.project || '',
        currency: orderData.currency || 'INR',
        price_list: orderData.price_list || '',
        ignore_pricing_rule: orderData.ignore_pricing_rule || false,
        items: orderData.items || [],
        payment_terms_template: orderData.payment_terms_template || '',
        payment_schedule: orderData.payment_schedule || [],
        status: orderData.status || 'Draft',
        is_internal_customer: orderData.is_internal_customer || false,
        source: orderData.source || '',
        campaign: orderData.campaign || '',
        territory: orderData.territory || '',
        letter_head: orderData.letter_head || '',
        print_heading: orderData.print_heading || '',
        group_same_items: orderData.group_same_items || false,
        terms_and_conditions: orderData.terms_and_conditions || '',
        notes: orderData.notes || '',
        tax_category: orderData.tax_category || '',
        shipping_rule: orderData.shipping_rule || '',
        incoterm: orderData.incoterm || '',
        sales_taxes_charges_template: orderData.sales_taxes_charges_template || '',
        taxes_charges: orderData.taxes_charges || [],
        rounding_adjustment: orderData.rounding_adjustment || 0,
        disable_rounded_total: orderData.disable_rounded_total || false,
        apply_discount_on: orderData.apply_discount_on || 'Grand Total',
        coupon_code: orderData.coupon_code || '',
        additional_discount_percentage: orderData.additional_discount_percentage || 0,
        additional_discount_amount: orderData.additional_discount_amount || 0,
        sales_partner: orderData.sales_partner || '',
        commission_rate: orderData.commission_rate || 0,
        amount_eligible_for_commission: orderData.amount_eligible_for_commission || 0,
        total_commission: orderData.total_commission || 0,
        sales_team: orderData.sales_team || [],
        auto_repeat: orderData.auto_repeat || '',
        from_date: orderData.from_date || '',
        to_date: orderData.to_date || ''
      }))
    } catch (err) {
      setError('Failed to fetch sales order')
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

  const handleCustomerChange = (value) => {
    const customer = customers.find(c => c.customer_id === value)
    setFormData({
      ...formData,
      customer_id: value,
      customer_name: customer?.name || '',
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
          delivery_date: '',
          qty: 1,
          rate: 0,
          amount: 0,
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
      [field]: field === 'rate' || field === 'qty' ? parseFloat(value) || 0 : value
    }
    if (field === 'qty' || field === 'rate') {
      updatedItems[idx].amount = updatedItems[idx].qty * updatedItems[idx].rate
    }
    setFormData({ ...formData, items: updatedItems })
  }

  const handleAddPaymentScheduleRow = () => {
    setFormData({
      ...formData,
      payment_schedule: [
        ...formData.payment_schedule,
        {
          payment_term: '',
          description: '',
          due_date: '',
          invoice_portion: 0,
          payment_amount: 0,
          id: Date.now() + Math.random()
        }
      ]
    })
  }

  const handleRemovePaymentScheduleRow = (idx) => {
    const updatedSchedule = formData.payment_schedule.filter((_, i) => i !== idx)
    setFormData({ ...formData, payment_schedule: updatedSchedule })
  }

  const handlePaymentScheduleChange = (idx, field, value) => {
    const updatedSchedule = [...formData.payment_schedule]
    updatedSchedule[idx] = {
      ...updatedSchedule[idx],
      [field]: value
    }
    setFormData({ ...formData, payment_schedule: updatedSchedule })
  }

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.amount || 0), 0)
  }

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal()
    const discountAmount = formData.discount_type === 'percentage'
      ? (subtotal * (formData.additional_discount_percentage || 0)) / 100
      : formData.additional_discount_amount || 0
    const taxAmount = (subtotal - discountAmount) * 0.18
    return subtotal - discountAmount + taxAmount
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.customer_id || formData.items.length === 0 || !formData.delivery_date) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        items: formData.items.map(({ id, ...item }) => item),
        payment_schedule: formData.payment_schedule.map(({ id, ...row }) => row)
      }

      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/selling/sales-orders/${id}`, submitData)
        setSuccess('Sales order updated successfully')
      } else {
        await axios.post('http://localhost:5000/api/selling/sales-orders', submitData)
        setSuccess('Sales order created successfully')
      }

      setTimeout(() => navigate('/selling/sales-orders'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save sales order')
    } finally {
      setLoading(false)
    }
  }

  const currentTab = tabs[activeTabIndex]

  const nextTab = () => {
    if (activeTabIndex < tabs.length - 1) {
      setActiveTabIndex(activeTabIndex + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevTab = () => {
    if (activeTabIndex > 0) {
      setActiveTabIndex(activeTabIndex - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div style={styles.mainContainer}>
      <Card>
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{isEditMode ? 'Edit Sales Order' : 'New Sales Order'} <span style={{ color: '#ef4444', fontSize: '0.8em' }}>Not Saved</span></h2>
            <Button
              onClick={() => navigate('/selling/sales-orders')}
              variant="secondary"
            >
              Back
            </Button>
          </div>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {isEditMode && order && (
          <AuditTrail
            createdAt={order.created_at}
            createdBy={order.created_by}
            updatedAt={order.updated_at}
            updatedBy={order.updated_by}
            status={order.status}
          />
        )}

        <div style={styles.wizardProgress}>
          {tabs.map((_, idx) => (
            <div
              key={idx}
              style={{
                ...styles.progressDot,
                ...(idx === activeTabIndex ? styles.progressDotActive : {})
              }}
              onClick={() => {
                setActiveTabIndex(idx)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          ))}
        </div>

        <div style={styles.tabsContainer}>
          <div style={styles.tabsList}>
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTabIndex(idx)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                style={{
                  ...styles.tab,
                  ...(idx === activeTabIndex ? styles.tabActive : {})
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {currentTab.id === 'basicDetails' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Series</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="series"
                    value={formData.series}
                    onChange={handleChange}
                    placeholder="SAL-ORD-YYYY-"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Date *</label>
                  <input
                    style={styles.input}
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Customer's Purchase Order</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="customer_po"
                    placeholder="Enter PO number"
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Customer *"
                    value={formData.customer_id}
                    onChange={handleCustomerChange}
                    options={customers.map(c => ({ label: c.name, value: c.customer_id }))}
                    placeholder="Search customer..."
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Delivery Date *</label>
                  <input
                    style={styles.input}
                    type="date"
                    name="delivery_date"
                    value={formData.delivery_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Order Type</label>
                  <select style={styles.input} name="order_type" value={formData.order_type} onChange={handleChange}>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'accountingDimensions' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Cost Center"
                    value={formData.cost_center}
                    onChange={(val) => handleSearchableChange('cost_center', val)}
                    options={costCenters}
                    placeholder="Search cost center..."
                  />
                </div>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Project"
                    value={formData.project}
                    onChange={(val) => handleSearchableChange('project', val)}
                    options={projects}
                    placeholder="Search project..."
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'currencyPriceList' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Currency"
                    value={formData.currency}
                    onChange={(val) => handleSearchableChange('currency', val)}
                    options={currencies}
                    placeholder="Search currency..."
                  />
                </div>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Price List"
                    value={formData.price_list}
                    onChange={(val) => handleSearchableChange('price_list', val)}
                    options={priceLists}
                    placeholder="Search price list..."
                  />
                </div>
              </div>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <input
                    style={{ ...styles.input, cursor: 'pointer' }}
                    type="checkbox"
                    name="ignore_pricing_rule"
                    checked={formData.ignore_pricing_rule}
                    onChange={handleChange}
                    id="ignore_pricing_rule"
                  />
                  <label style={styles.label} htmlFor="ignore_pricing_rule">Ignore Pricing Rule</label>
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'items' && (
            <div style={styles.tabContent}>
              <Button
                type="button"
                variant="primary"
                onClick={handleAddItem}
                style={{ marginBottom: '15px', fontSize: '0.85rem', padding: '6px 12px' }}
              >
                + Add Row
              </Button>

              {formData.items.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Item Code</th>
                        <th style={styles.tableHeader}>Item Name</th>
                        <th style={styles.tableHeader}>Delivery Date</th>
                        <th style={styles.tableHeader}>Qty</th>
                        <th style={styles.tableHeader}>Rate (INR)</th>
                        <th style={styles.tableHeader}>Amount (INR)</th>
                        <th style={styles.tableHeader}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="text"
                              value={item.item_code}
                              onChange={(e) => handleItemChange(idx, 'item_code', e.target.value)}
                              placeholder="Item code"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                              placeholder="Item name"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="date"
                              value={item.delivery_date}
                              onChange={(e) => handleItemChange(idx, 'delivery_date', e.target.value)}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="number"
                              value={item.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              placeholder="0"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="number"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            {(item.qty * item.rate).toFixed(2)}
                          </td>
                          <td style={styles.tableCell}>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => handleRemoveItem(idx)}
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f9f9f9', borderRadius: '6px', color: '#999' }}>
                  No items added yet
                </div>
              )}
            </div>
          )}

          {currentTab.id === 'paymentTerms' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Payment Terms Template"
                    value={formData.payment_terms_template}
                    onChange={(val) => handleSearchableChange('payment_terms_template', val)}
                    options={paymentTermsTemplates}
                    placeholder="Search payment terms..."
                  />
                </div>
              </div>

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Payment Schedule</h4>
              <Button
                type="button"
                variant="primary"
                onClick={handleAddPaymentScheduleRow}
                style={{ marginBottom: '15px', fontSize: '0.85rem', padding: '6px 12px' }}
              >
                + Add Row
              </Button>

              {formData.payment_schedule.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.tableHeader}>Payment Term</th>
                        <th style={styles.tableHeader}>Description</th>
                        <th style={styles.tableHeader}>Due Date</th>
                        <th style={styles.tableHeader}>Invoice Portion (%)</th>
                        <th style={styles.tableHeader}>Payment Amount</th>
                        <th style={styles.tableHeader}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.payment_schedule.map((row, idx) => (
                        <tr key={idx}>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="text"
                              value={row.payment_term}
                              onChange={(e) => handlePaymentScheduleChange(idx, 'payment_term', e.target.value)}
                              placeholder="Payment term"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="text"
                              value={row.description}
                              onChange={(e) => handlePaymentScheduleChange(idx, 'description', e.target.value)}
                              placeholder="Description"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="date"
                              value={row.due_date}
                              onChange={(e) => handlePaymentScheduleChange(idx, 'due_date', e.target.value)}
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.invoice_portion}
                              onChange={(e) => handlePaymentScheduleChange(idx, 'invoice_portion', e.target.value)}
                              placeholder="0"
                              step="0.01"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <input
                              style={styles.input}
                              type="number"
                              value={row.payment_amount}
                              onChange={(e) => handlePaymentScheduleChange(idx, 'payment_amount', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          </td>
                          <td style={styles.tableCell}>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => handleRemovePaymentScheduleRow(idx)}
                              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f9f9f9', borderRadius: '6px', color: '#999' }}>
                  No payment schedule added yet
                </div>
              )}

              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Terms & Conditions</h4>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <textarea
                    style={{ ...styles.input, resize: 'vertical', minHeight: '100px' }}
                    name="terms_and_conditions"
                    value={formData.terms_and_conditions}
                    onChange={handleChange}
                    placeholder="Add terms and conditions..."
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'additionalInfo' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Status"
                    value={formData.status}
                    onChange={(val) => handleSearchableChange('status', val)}
                    options={statuses}
                    placeholder="Select status..."
                  />
                </div>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Source"
                    value={formData.source}
                    onChange={(val) => handleSearchableChange('source', val)}
                    options={sources}
                    placeholder="Search source..."
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Campaign"
                    value={formData.campaign}
                    onChange={(val) => handleSearchableChange('campaign', val)}
                    options={campaigns}
                    placeholder="Search campaign..."
                  />
                </div>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Territory"
                    value={formData.territory}
                    onChange={(val) => handleSearchableChange('territory', val)}
                    options={territories}
                    placeholder="Search territory..."
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <input
                    style={{ ...styles.input, cursor: 'pointer' }}
                    type="checkbox"
                    name="is_internal_customer"
                    checked={formData.is_internal_customer}
                    onChange={handleChange}
                    id="is_internal_customer"
                  />
                  <label style={styles.label} htmlFor="is_internal_customer">Is Internal Customer</label>
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Notes</label>
                  <textarea
                    style={{ ...styles.input, resize: 'vertical', minHeight: '80px' }}
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Add notes..."
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'printSettings' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Letter Head"
                    value={formData.letter_head}
                    onChange={(val) => handleSearchableChange('letter_head', val)}
                    options={letterHeads}
                    placeholder="Search letter head..."
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Print Heading</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="print_heading"
                    value={formData.print_heading}
                    onChange={handleChange}
                    placeholder="Enter print heading"
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <input
                    style={{ ...styles.input, cursor: 'pointer' }}
                    type="checkbox"
                    name="group_same_items"
                    checked={formData.group_same_items}
                    onChange={handleChange}
                    id="group_same_items"
                  />
                  <label style={styles.label} htmlFor="group_same_items">Group same items</label>
                </div>
              </div>
            </div>
          )}

          {currentTab.id === 'totals' && (
            <div style={styles.tabContent}>
              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Tax Category"
                    value={formData.tax_category}
                    onChange={(val) => handleSearchableChange('tax_category', val)}
                    options={taxCategories}
                    placeholder="Search tax category..."
                  />
                </div>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Shipping Rule"
                    value={formData.shipping_rule}
                    onChange={(val) => handleSearchableChange('shipping_rule', val)}
                    options={shippingRules}
                    placeholder="Search shipping rule..."
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Incoterm"
                    value={formData.incoterm}
                    onChange={(val) => handleSearchableChange('incoterm', val)}
                    options={incoterms}
                    placeholder="Search incoterm..."
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <SearchableSelect
                    label="Taxes & Charges Template"
                    value={formData.sales_taxes_charges_template}
                    onChange={(val) => handleSearchableChange('sales_taxes_charges_template', val)}
                    options={taxChargesTemplates}
                    placeholder="Search taxes & charges template..."
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Apply Discount On</label>
                  <select style={styles.input} name="apply_discount_on" value={formData.apply_discount_on} onChange={handleChange}>
                    <option value="Grand Total">Grand Total</option>
                    <option value="Pre Tax Total">Pre Tax Total</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Additional Discount Percentage (%)</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="additional_discount_percentage"
                    value={formData.additional_discount_percentage}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Additional Discount Amount (₹)</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="additional_discount_amount"
                    value={formData.additional_discount_amount}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Rounding Adjustment</label>
                  <input
                    style={styles.input}
                    type="number"
                    name="rounding_adjustment"
                    value={formData.rounding_adjustment}
                    onChange={handleChange}
                    placeholder="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div style={styles.gridRow}>
                <div style={styles.formGroup}>
                  <input
                    style={{ ...styles.input, cursor: 'pointer' }}
                    type="checkbox"
                    name="disable_rounded_total"
                    checked={formData.disable_rounded_total}
                    onChange={handleChange}
                    id="disable_rounded_total"
                  />
                  <label style={styles.label} htmlFor="disable_rounded_total">Disable Rounded Total</label>
                </div>
              </div>

              {formData.items.length > 0 && (
                <div style={styles.totalsBox}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Subtotal:</span>
                        <strong>₹{calculateSubtotal().toFixed(2)}</strong>
                      </div>
                      {formData.additional_discount_percentage > 0 && (
                        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Discount ({formData.additional_discount_percentage}%):</span>
                          <strong>-₹{(calculateSubtotal() * formData.additional_discount_percentage / 100).toFixed(2)}</strong>
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#007bff', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Grand Total:</span>
                        <strong>₹{calculateGrandTotal().toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={styles.wizardNav}>
            <Button
              type="button"
              variant="secondary"
              onClick={prevTab}
              disabled={activeTabIndex === 0}
            >
              ← Previous
            </Button>

            <span style={{ fontSize: '12px', color: '#666', alignSelf: 'center' }}>
              Step {activeTabIndex + 1} of {tabs.length}
            </span>

            {activeTabIndex === tabs.length - 1 ? (
              <Button
                type="submit"
                variant="primary"
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
