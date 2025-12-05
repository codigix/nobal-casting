import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
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

export default function SalesQuotationForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'
  const bomId = searchParams.get('bom_id')

  const tabs = [
    { id: 'basicDetails', label: 'Basic Details' },
    { id: 'items', label: 'Quotation Items' },
    { id: 'addressContact', label: 'Address & Contact' },
    { id: 'paymentTerms', label: 'Payment Terms' },
    { id: 'printSettings', label: 'Print Settings' },
    { id: 'additionalInfo', label: 'Additional Info' },
    { id: 'taxesCharges', label: 'Taxes & Charges' },
    { id: 'totals', label: 'Totals & Discounts' }
  ]

  const [activeTabIndex, setActiveTabIndex] = useState(0)

  const [formData, setFormData] = useState({
    customer_id: '',
    items: [],
    notes: '',
    valid_till: '',
    customer_name: '',
    status: 'Draft',
    contact_person: '',
    customer_address: '',
    gst_in: '',
    shipping_address: '',
    company_address: '',
    company_contact_person: '',
    payment_terms_template: '',
    terms_and_conditions: '',
    term_details: '',
    letter_head: '',
    print_heading: '',
    group_same_items: false,
    campaign: '',
    supplier_quotation: '',
    territory: '',
    source: '',
    lost_reason: '',
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
    referral_sales_partner: ''
  })

  const [customers, setCustomers] = useState([])
  const [allItems, setAllItems] = useState([])
  const [contactPersons, setContactPersons] = useState([])
  const [paymentTermsTemplates, setPaymentTermsTemplates] = useState([])
  const [letterHeads, setLetterHeads] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [territories, setTerritories] = useState([])
  const [sources, setSources] = useState([])
  const [lostReasons, setLostReasons] = useState([])
  const [taxCategories, setTaxCategories] = useState([])
  const [shippingRules, setShippingRules] = useState([])
  const [incoterms, setIncoterms] = useState([])
  const [salesTaxChargesTemplates, setSalesTaxChargesTemplates] = useState([])
  const [salesPartners, setSalesPartners] = useState([])
  const [couponCodes, setCouponCodes] = useState([])
  const [accountHeads, setAccountHeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [quotation, setQuotation] = useState(null)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    fetchRequiredData()
    if (isEditMode) {
      fetchQuotation()
    }
  }, [])

  useEffect(() => {
    if (bomId) {
      loadBOMData()
    }
  }, [bomId])

  const loadBOMData = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`)
      const bom = response.data.data || response.data
      
      if (bom && bom.items) {
        const quotationItems = bom.items.map(item => ({
          item_code: item.item_code || item.name || '',
          item_name: item.item_name || item.name || '',
          description: item.description || '',
          qty: item.qty || 1,
          uom: item.uom || '',
          rate: item.rate || 0,
          amount: (item.qty || 1) * (item.rate || 0)
        }))
        
        setFormData(prev => ({
          ...prev,
          items: quotationItems
        }))
      }
    } catch (err) {
      console.error('Error loading BOM:', err)
    }
  }

  const fetchRequiredData = async () => {
    try {
      setDataLoading(true)
      const [custRes, itemRes, contactRes, payRes, letterRes, campRes, terrRes, sourceRes, lostRes, taxRes, shipRes, incoRes, stRes, partRes, couponRes, accRes] = await Promise.all([
        axios.get('http://localhost:5000/api/selling/customers').catch(() => ({ data: { data: [] } })),
        axios.get('/api/items?limit=1000').catch(() => ({ data: { data: [] } })),
        axios.get('/api/crm/contact-persons').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/payment-terms').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/letter-heads').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/campaigns').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/territories').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/lead-sources').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/lost-reasons').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/tax-categories').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/shipping-rules').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/incoterms').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/sales-taxes-charges-template').catch(() => ({ data: { data: [] } })),
        axios.get('/api/crm/sales-partners').catch(() => ({ data: { data: [] } })),
        axios.get('/api/selling/coupon-codes').catch(() => ({ data: { data: [] } })),
        axios.get('/api/setup/account-heads').catch(() => ({ data: { data: [] } }))
      ])

      setCustomers(custRes.data.data || [])
      setAllItems(itemRes.data.data || [])
      setContactPersons((contactRes.data.data || []).map(c => ({ label: c.first_name ? `${c.first_name} ${c.last_name || ''}` : c.name || '', value: c.id || c.name || '' })))
      setPaymentTermsTemplates((payRes.data.data || []).map(p => ({ label: p.name || p.payment_terms || '', value: p.id || p.name || '' })))
      setLetterHeads((letterRes.data.data || []).map(l => ({ label: l.name || l.letter_head_name || '', value: l.id || l.name || '' })))
      setCampaigns((campRes.data.data || []).map(c => ({ label: c.name || c.campaign_name || '', value: c.id || c.name || '' })))
      setTerritories((terrRes.data.data || []).map(t => ({ label: t.name || t.territory_name || '', value: t.id || t.name || '' })))
      setSources((sourceRes.data.data || []).map(s => ({ label: s.name || s.source_name || '', value: s.id || s.name || '' })))
      setLostReasons((lostRes.data.data || []).map(l => ({ label: l.name || l.lost_reason || '', value: l.id || l.name || '' })))
      setTaxCategories((taxRes.data.data || []).map(t => ({ label: t.name || t.tax_category || '', value: t.id || t.name || '' })))
      setShippingRules((shipRes.data.data || []).map(s => ({ label: s.name || s.shipping_rule || '', value: s.id || s.name || '' })))
      setIncoterms((incoRes.data.data || []).map(i => ({ label: i.name || i.incoterm || '', value: i.id || i.name || '' })))
      setSalesTaxChargesTemplates((stRes.data.data || []).map(s => ({ label: s.name || s.sales_taxes_charges_template || '', value: s.id || s.name || '' })))
      setSalesPartners((partRes.data.data || []).map(p => ({ label: p.name || p.sales_partner || '', value: p.id || p.name || '' })))
      setCouponCodes((couponRes.data.data || []).map(c => ({ label: c.name || c.coupon_code || '', value: c.id || c.name || '' })))
      setAccountHeads((accRes.data.data || []).map(a => ({ label: a.name || a.account_head || '', value: a.id || a.name || '' })))
    } catch (err) {
      console.error('Failed to fetch required data:', err)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchQuotation = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/selling/quotations/${id}`)
      const quotationData = response.data.data
      setQuotation(quotationData)
      setFormData({
        customer_id: quotationData.customer_id,
        items: quotationData.items || [],
        notes: quotationData.notes || '',
        valid_till: quotationData.validity_date || '',
        customer_name: quotationData.customer_name || '',
        status: quotationData.status || 'Draft',
        contact_person: quotationData.contact_person || '',
        customer_address: quotationData.customer_address || '',
        gst_in: quotationData.gst_in || '',
        shipping_address: quotationData.shipping_address || '',
        company_address: quotationData.company_address || '',
        company_contact_person: quotationData.company_contact_person || '',
        payment_terms_template: quotationData.payment_terms_template || '',
        terms_and_conditions: quotationData.terms_and_conditions || '',
        term_details: quotationData.term_details || '',
        letter_head: quotationData.letter_head || '',
        print_heading: quotationData.print_heading || '',
        group_same_items: quotationData.group_same_items || false,
        campaign: quotationData.campaign || '',
        supplier_quotation: quotationData.supplier_quotation || '',
        territory: quotationData.territory || '',
        source: quotationData.source || '',
        lost_reason: quotationData.lost_reason || '',
        tax_category: quotationData.tax_category || '',
        shipping_rule: quotationData.shipping_rule || '',
        incoterm: quotationData.incoterm || '',
        sales_taxes_charges_template: quotationData.sales_taxes_charges_template || '',
        taxes_charges: quotationData.taxes_charges || [],
        rounding_adjustment: quotationData.rounding_adjustment || 0,
        disable_rounded_total: quotationData.disable_rounded_total || false,
        apply_discount_on: quotationData.apply_discount_on || 'Grand Total',
        coupon_code: quotationData.coupon_code || '',
        additional_discount_percentage: quotationData.additional_discount_percentage || 0,
        additional_discount_amount: quotationData.additional_discount_amount || 0,
        referral_sales_partner: quotationData.referral_sales_partner || ''
      })
    } catch (err) {
      setError('Failed to fetch quotation')
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleCustomerChange = (e) => {
    const customerId = e.target.value
    const customer = customers.find(c => c.customer_id === customerId)
    setFormData({
      ...formData,
      customer_id: customerId,
      customer_name: customer?.name || ''
    })
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { item_code: '', qty: 1, rate: 0, id: Date.now() + Math.random() }
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
    setFormData({ ...formData, items: updatedItems })
  }

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const qty = item.qty || 0
      const rate = item.rate || 0
      return sum + (qty * rate)
    }, 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.customer_id || formData.items.length === 0 || !formData.valid_till) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        items: formData.items.map(({ id, ...item }) => item),
        total_value: calculateTotal(),
        notes: formData.notes,
        validity_date: formData.valid_till,
        status: 'draft',
        contact_person: formData.contact_person,
        customer_address: formData.customer_address,
        gst_in: formData.gst_in,
        shipping_address: formData.shipping_address,
        company_address: formData.company_address,
        company_contact_person: formData.company_contact_person,
        payment_terms_template: formData.payment_terms_template,
        terms_and_conditions: formData.terms_and_conditions,
        term_details: formData.term_details,
        letter_head: formData.letter_head,
        print_heading: formData.print_heading,
        group_same_items: formData.group_same_items,
        campaign: formData.campaign,
        supplier_quotation: formData.supplier_quotation,
        territory: formData.territory,
        source: formData.source,
        lost_reason: formData.lost_reason,
        tax_category: formData.tax_category,
        shipping_rule: formData.shipping_rule,
        incoterm: formData.incoterm,
        sales_taxes_charges_template: formData.sales_taxes_charges_template,
        taxes_charges: formData.taxes_charges.map(({ id, ...tax }) => tax),
        rounding_adjustment: formData.rounding_adjustment,
        disable_rounded_total: formData.disable_rounded_total,
        apply_discount_on: formData.apply_discount_on,
        coupon_code: formData.coupon_code,
        additional_discount_percentage: formData.additional_discount_percentage,
        additional_discount_amount: formData.additional_discount_amount,
        referral_sales_partner: formData.referral_sales_partner
      }

      if (isEditMode) {
        await axios.put(`http://localhost:5000/api/selling/quotations/${id}`, submitData)
        setSuccess('Quotation updated successfully')
      } else {
        await axios.post('http://localhost:5000/api/selling/quotations', submitData)
        setSuccess('Quotation created successfully')
      }

      setTimeout(() => navigate('/selling/quotations'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quotation')
    } finally {
      setLoading(false)
    }
  }

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

  const isLastTab = activeTabIndex === tabs.length - 1
  const currentTab = tabs[activeTabIndex]

  return (
    <div style={styles.mainContainer}>
      <Card>
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>{isEditMode ? 'Edit Sales Quotation' : 'Create Sales Quotation'}</h2>
            <Button onClick={() => navigate('/selling/quotations')} variant="secondary">Back</Button>
          </div>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {isEditMode && quotation && <AuditTrail createdAt={quotation.created_at} createdBy={quotation.created_by} updatedAt={quotation.updated_at} updatedBy={quotation.updated_by} status={quotation.status} />}

        <div style={styles.wizardProgress}>
          {tabs.map((tab, idx) => (
            <div key={tab.id} style={{...styles.progressDot, ...(idx <= activeTabIndex ? styles.progressDotActive : {})}} />
          ))}
        </div>

        <div style={styles.tabsContainer}>
          <div style={styles.tabsList}>
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                style={{...styles.tab, ...(activeTabIndex === idx ? styles.tabActive : {})}}
                onClick={() => setActiveTabIndex(idx)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.tabContent}>
            {currentTab.id === 'basicDetails' && (
              <div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Customer *</label>
                    <select name="customer_id" value={formData.customer_id} onChange={handleCustomerChange} required style={styles.input}>
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.customer_id} value={customer.customer_id}>{customer.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Valid Till *</label>
                    <input type="date" name="valid_till" value={formData.valid_till} onChange={handleChange} required style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange} style={styles.input}>
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Notes & Comments</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Add notes..." rows="3" style={{ ...styles.input, width: '100%', minHeight: '70px' }} />
                  </div>
                </div>
              </div>
            )}

            {currentTab.id === 'items' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>Quotation Items</h3>
                  <Button type="button" variant="primary" onClick={handleAddItem} style={{ fontSize: '12px', padding: '6px 12px' }}>+ Add Item</Button>
                </div>
                {bomId && formData.items.length > 0 && (
                  <div style={{ backgroundColor: '#e3f2fd', border: '1px solid #2196f3', color: '#1976d2', padding: '12px', borderRadius: '4px', marginBottom: '12px', fontSize: '13px' }}>
                    ✓ BOM items have been loaded. You can modify quantities and rates as needed.
                  </div>
                )}
                {formData.items.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.tableHeader}>Item</th>
                          <th style={styles.tableHeader}>Qty</th>
                          <th style={styles.tableHeader}>Rate</th>
                          <th style={styles.tableHeader}>Amount</th>
                          <th style={{ ...styles.tableHeader, width: '60px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item, idx) => {
                          const amount = (item.qty || 0) * (item.rate || 0)
                          return (
                            <tr key={idx}>
                              <td style={styles.tableCell}>
                                <select value={item.item_code} onChange={(e) => handleItemChange(idx, 'item_code', e.target.value)} style={{ ...styles.input, width: '100%' }}>
                                  <option value="">Select Item</option>
                                  {allItems.map(itm => (
                                    <option key={itm.item_code} value={itm.item_code}>{itm.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td style={styles.tableCell}>
                                <input type="number" value={item.qty || ''} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} placeholder="0" min="0" step="0.01" style={{ ...styles.input, width: '100%' }} />
                              </td>
                              <td style={styles.tableCell}>
                                <input type="number" value={item.rate || ''} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} placeholder="0.00" step="0.01" min="0" style={{ ...styles.input, width: '100%' }} />
                              </td>
                              <td style={styles.tableCell}>₹{amount.toFixed(2)}</td>
                              <td style={styles.tableCell}>
                                <Button type="button" variant="danger" onClick={() => handleRemoveItem(idx)} style={{ fontSize: '11px', padding: '4px 6px', width: '100%' }}>Remove</Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#999', fontSize: '13px' }}>
                    <p style={{ margin: '0' }}>No items added yet. Click "Add Item" to get started.</p>
                  </div>
                )}
                {formData.items.length > 0 && (
                  <div style={{ marginTop: '12px', textAlign: 'right' }}>
                    <p style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>Total: <span style={{ color: '#28a745' }}>₹{calculateTotal().toFixed(2)}</span></p>
                  </div>
                )}
              </div>
            )}

            {currentTab.id === 'addressContact' && (
              <div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Customer Address</label>
                    <textarea name="customer_address" value={formData.customer_address} onChange={handleChange} placeholder="Enter customer address" rows="2" style={{ ...styles.input, width: '100%', minHeight: '60px' }} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Contact Person</label>
                    <SearchableSelect options={contactPersons} value={formData.contact_person} onChange={(val) => setFormData({ ...formData, contact_person: val })} placeholder="Select Contact Person" />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>GST IN</label>
                    <input type="text" name="gst_in" value={formData.gst_in} onChange={handleChange} placeholder="Enter GST IN" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Shipping Address</label>
                    <textarea name="shipping_address" value={formData.shipping_address} onChange={handleChange} placeholder="Enter shipping address" rows="2" style={{ ...styles.input, width: '100%', minHeight: '60px' }} />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Company Address</label>
                    <input type="text" name="company_address" value={formData.company_address} onChange={handleChange} placeholder="Enter company address" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Company Contact Person</label>
                    <input type="text" name="company_contact_person" value={formData.company_contact_person} onChange={handleChange} placeholder="Enter company contact person" style={styles.input} />
                  </div>
                </div>
              </div>
            )}

            {currentTab.id === 'paymentTerms' && (
              <div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Payment Terms Template</label>
                    <SearchableSelect options={paymentTermsTemplates} value={formData.payment_terms_template} onChange={(val) => setFormData({ ...formData, payment_terms_template: val })} placeholder="Select Payment Terms Template" />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Terms and Conditions</label>
                    <textarea name="terms_and_conditions" value={formData.terms_and_conditions} onChange={handleChange} placeholder="Enter terms and conditions..." rows="2" style={{ ...styles.input, width: '100%', minHeight: '60px' }} />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Term Details</label>
                    <textarea name="term_details" value={formData.term_details} onChange={handleChange} placeholder="Enter term details..." rows="2" style={{ ...styles.input, width: '100%', minHeight: '60px' }} />
                  </div>
                </div>
              </div>
            )}

            {currentTab.id === 'printSettings' && (
              <div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Letter Head</label>
                    <SearchableSelect options={letterHeads} value={formData.letter_head} onChange={(val) => setFormData({ ...formData, letter_head: val })} placeholder="Select Letter Head" />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Print Heading</label>
                    <input type="text" name="print_heading" value={formData.print_heading} onChange={handleChange} placeholder="Enter print heading" style={styles.input} />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', ...styles.label }}>
                      <input type="checkbox" name="group_same_items" checked={formData.group_same_items} onChange={(e) => setFormData({ ...formData, group_same_items: e.target.checked })} />
                      Group same items
                    </label>
                  </div>
                </div>
              </div>
            )}

            {currentTab.id === 'additionalInfo' && (
              <div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Campaign</label>
                    <SearchableSelect options={campaigns} value={formData.campaign} onChange={(val) => setFormData({ ...formData, campaign: val })} placeholder="Select Campaign" />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Supplier Quotation</label>
                    <input type="text" name="supplier_quotation" value={formData.supplier_quotation} onChange={handleChange} placeholder="Enter supplier quotation reference" style={styles.input} />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Territory</label>
                    <SearchableSelect options={territories} value={formData.territory} onChange={(val) => setFormData({ ...formData, territory: val })} placeholder="Select Territory" />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Source</label>
                    <SearchableSelect options={sources} value={formData.source} onChange={(val) => setFormData({ ...formData, source: val })} placeholder="Select Source" />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Lost Reason</label>
                    <SearchableSelect options={lostReasons} value={formData.lost_reason} onChange={(val) => setFormData({ ...formData, lost_reason: val })} placeholder="Select Lost Reason" />
                  </div>
                </div>
              </div>
            )}

            {currentTab.id === 'taxesCharges' && (
              <div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tax Category</label>
                    <SearchableSelect options={taxCategories} value={formData.tax_category} onChange={(val) => setFormData({ ...formData, tax_category: val })} placeholder="Select Tax Category" />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Shipping Rule</label>
                    <SearchableSelect options={shippingRules} value={formData.shipping_rule} onChange={(val) => setFormData({ ...formData, shipping_rule: val })} placeholder="Select Shipping Rule" />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Incoterm</label>
                    <SearchableSelect options={incoterms} value={formData.incoterm} onChange={(val) => setFormData({ ...formData, incoterm: val })} placeholder="Select Incoterm" />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Sales Taxes Template</label>
                    <SearchableSelect options={salesTaxChargesTemplates} value={formData.sales_taxes_charges_template} onChange={(val) => setFormData({ ...formData, sales_taxes_charges_template: val })} placeholder="Select Template" />
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={styles.label}>Sales Taxes and Charges</label>
                    <Button type="button" variant="primary" onClick={() => setFormData({ ...formData, taxes_charges: [...formData.taxes_charges, { id: Date.now(), type: '', account_head: '', tax_rate: 0, amount: 0 }] })} style={{ fontSize: '11px', padding: '4px 10px' }}>+ Add</Button>
                  </div>
                  {formData.taxes_charges.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ ...styles.tableHeader, width: '40px' }}>No.</th>
                            <th style={styles.tableHeader}>Type</th>
                            <th style={styles.tableHeader}>Account Head</th>
                            <th style={styles.tableHeader}>Tax Rate</th>
                            <th style={styles.tableHeader}>Amount</th>
                            <th style={styles.tableHeader}>Total</th>
                            <th style={{ ...styles.tableHeader, width: '50px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.taxes_charges.map((tax, idx) => {
                            const total = (tax.amount || 0) + ((tax.amount || 0) * (tax.tax_rate || 0) / 100)
                            return (
                              <tr key={idx}>
                                <td style={styles.tableCell}>{idx + 1}</td>
                                <td style={styles.tableCell}>
                                  <SearchableSelect options={[{ label: 'Add', value: 'Add' }, { label: 'Deduct', value: 'Deduct' }]} value={tax.type || ''} onChange={(val) => { const updated = [...formData.taxes_charges]; updated[idx].type = val; setFormData({ ...formData, taxes_charges: updated }) }} placeholder="Select Type" />
                                </td>
                                <td style={styles.tableCell}>
                                  <SearchableSelect options={accountHeads} value={tax.account_head || ''} onChange={(val) => { const updated = [...formData.taxes_charges]; updated[idx].account_head = val; setFormData({ ...formData, taxes_charges: updated }) }} placeholder="Select Account Head" />
                                </td>
                                <td style={styles.tableCell}>
                                  <input type="number" value={tax.tax_rate || ''} onChange={(e) => { const updated = [...formData.taxes_charges]; updated[idx].tax_rate = parseFloat(e.target.value) || 0; setFormData({ ...formData, taxes_charges: updated }) }} placeholder="0" step="0.01" style={{ ...styles.input, width: '100%' }} />
                                </td>
                                <td style={styles.tableCell}>
                                  <input type="number" value={tax.amount || ''} onChange={(e) => { const updated = [...formData.taxes_charges]; updated[idx].amount = parseFloat(e.target.value) || 0; setFormData({ ...formData, taxes_charges: updated }) }} placeholder="0.00" step="0.01" style={{ ...styles.input, width: '100%' }} />
                                </td>
                                <td style={styles.tableCell}>₹{total.toFixed(2)}</td>
                                <td style={styles.tableCell}>
                                  <Button type="button" variant="danger" onClick={() => { const updated = formData.taxes_charges.filter((_, i) => i !== idx); setFormData({ ...formData, taxes_charges: updated }) }} style={{ fontSize: '10px', padding: '2px 4px', width: '100%' }}>Remove</Button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '12px', color: '#999', fontSize: '12px' }}>
                      <p style={{ margin: '0' }}>No taxes/charges added yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentTab.id === 'totals' && (
              <div>
                <div style={styles.totalsBox}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Item Total</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>₹{calculateTotal().toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Taxes</div>
                      <div style={{ fontSize: '16px', fontWeight: '600' }}>₹{formData.taxes_charges.reduce((sum, t) => sum + (t.amount || 0), 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>Grand Total</div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#28a745' }}>₹{(calculateTotal() + (formData.taxes_charges.reduce((sum, t) => sum + (t.amount || 0), 0))).toFixed(2)}</div>
                    </div>
                    <div>
                      <label style={styles.label}>Rounding Adjustment</label>
                      <input type="number" value={formData.rounding_adjustment} onChange={(e) => setFormData({ ...formData, rounding_adjustment: parseFloat(e.target.value) || 0 })} placeholder="0.00" step="0.01" style={{ ...styles.input, width: '100%' }} />
                    </div>
                  </div>
                  <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={styles.label}>Rounded Total</label>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>₹{(calculateTotal() + (formData.taxes_charges.reduce((sum, t) => sum + (t.amount || 0), 0)) + formData.rounding_adjustment).toFixed(2)}</span>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                      <input type="checkbox" checked={formData.disable_rounded_total} onChange={(e) => setFormData({ ...formData, disable_rounded_total: e.target.checked })} />
                      Disable Rounded Total
                    </label>
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Apply Discount On</label>
                    <select value={formData.apply_discount_on} onChange={(e) => setFormData({ ...formData, apply_discount_on: e.target.value })} style={styles.input}>
                      <option value="Grand Total">Grand Total</option>
                      <option value="Net Total">Net Total</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Coupon Code</label>
                    <SearchableSelect options={couponCodes} value={formData.coupon_code} onChange={(val) => setFormData({ ...formData, coupon_code: val })} placeholder="Select Coupon Code" />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Discount %</label>
                    <input type="number" value={formData.additional_discount_percentage} onChange={(e) => setFormData({ ...formData, additional_discount_percentage: parseFloat(e.target.value) || 0 })} placeholder="0" step="0.01" min="0" style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Discount Amount (₹)</label>
                    <input type="number" value={formData.additional_discount_amount} onChange={(e) => setFormData({ ...formData, additional_discount_amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" step="0.01" min="0" style={styles.input} />
                  </div>
                </div>
                <div style={styles.gridRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Referral Sales Partner</label>
                    <SearchableSelect options={salesPartners} value={formData.referral_sales_partner} onChange={(val) => setFormData({ ...formData, referral_sales_partner: val })} placeholder="Select Referral Sales Partner" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={styles.wizardNav}>
            <Button type="button" variant="secondary" onClick={prevTab} disabled={activeTabIndex === 0}>
              ← Previous
            </Button>
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              Step {activeTabIndex + 1} of {tabs.length}
            </div>
            {isLastTab ? (
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Quotation'}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={nextTab}>
                Next →
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
