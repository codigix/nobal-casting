import React, { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import {
  Save, X, AlertCircle, CheckCircle, Package,
  Boxes, Edit2, Settings, Calendar,
  Database, Layers, Clock,
  ArrowRight, ShieldCheck, Zap, Activity, Filter, Info,
  Plus, Trash2, ChevronDown, User, Building, Landmark,
  MapPin, Phone, CreditCard, Printer, FileText, Calculator,
  Percent, Tag
} from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import Alert from '../../components/Alert/Alert'
import Button from '../../components/Button/Button'

// Helper Components for the Redesign
const SectionTitle = ({ title, icon: Icon, badge }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
        <Icon size={18} />
      </div>
      <h3 className="text-xs text-slate-900 ">{title}</h3>
    </div>
    {badge && (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px]  rounded-full border border-slate-200 ">
        {badge}
      </span>
    )}
  </div>
)

const FieldWrapper = ({ label, children, error, required }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-xs  text-slate-400 flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {error && <span className="text-[10px]  text-rose-500 animate-pulse">{error}</span>}
    </div>
    {children}
  </div>
)

const NavItem = ({ label, icon: Icon, section, isActive, onClick, themeColor = 'indigo' }) => {
  const themes = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    slate: 'text-slate-600 bg-slate-50 border-slate-100',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100'
  }

  const activeTheme = themes[themeColor] || themes.indigo

  return (
    <button
      type="button"
      onClick={() => onClick(section)}
      className={`flex items-center gap-2 p-2 rounded transition-all duration-300 group ${isActive
        ? `${activeTheme} border`
        : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-100'
        }`}
    >
      <div className={`p-1.5 rounded transition-all duration-300 ${isActive ? 'bg-white scale-110' : 'bg-slate-50 group-hover:bg-white'}`}>
        <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : 'opacity-60'} />
      </div>
      <span className="text-xs  tracking-tight uppercase">{label.split(' ').slice(1).join(' ')}</span>
      {isActive && <div className="w-1 h-1 rounded bg-current animate-pulse ml-0.5" />}
    </button>
  )
}

const SectionHeader = ({ title, icon: Icon, subtitle, isExpanded, onToggle, themeColor = 'indigo', id, badge, actions }) => {
  const themes = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-600 text-white' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-600 text-white' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-600 text-white' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', icon: 'bg-rose-600 text-white' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', icon: 'bg-indigo-600 text-white' },
    slate: { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', icon: 'bg-slate-600 text-white' },
    cyan: { text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', icon: 'bg-cyan-600 text-white' }
  }

  const theme = themes[themeColor] || themes.indigo

  return (
    <div
      id={id}
      className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-all border-b border-slate-100 ${isExpanded ? 'bg-slate-50/30' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded shadow-lg transition-all duration-300 ${theme.icon} ${isExpanded ? 'scale-110 rotate-3' : ''}`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-xs  flex items-center gap-3">
            <span className={`${theme.text} `}>{title.split(' ')[0]}</span>
            <span className="text-slate-800 ">{title.split(' ').slice(1).join(' ')}</span>
          </h2>
          {subtitle && <p className="text-xs font-medium text-slate-400">{subtitle}</p>}
        </div>
        {badge && (
          <span className={`px-2.5 py-1 ${theme.bg} ${theme.text} text-[10px]  rounded-full border ${theme.border} uppercase tracking-widest`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {actions && <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        <div className={`p-2 rounded-full transition-all duration-300 ${isExpanded ? `${theme.bg} ${theme.text}` : 'text-slate-300'}`}>
          <ChevronDown size={20} className={`transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={3} />
        </div>
      </div>
    </div>
  )
}

export default function SalesQuotationForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'
  const bomId = searchParams.get('bom_id')

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
  const [activeSection, setActiveSection] = useState('foundation')
  const [expandedSections, setExpandedSections] = useState({
    foundation: true,
    address: true,
    items: true,
    taxes: true,
    totals: true,
    terms: true
  })

  useEffect(() => {
    fetchRequiredData()
    if (isEditMode) {
      fetchQuotation()
    }

    const handleScroll = () => {
      const sections = ['foundation', 'address', 'items', 'taxes', 'totals', 'terms']
      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [id])

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
          amount: (item.qty || 1) * (item.rate || 0),
          id: Date.now() + Math.random()
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
      const baseUrl = 'http://localhost:5000/api'
      const [custRes, itemRes, contactRes, payRes, letterRes, campRes, terrRes, sourceRes, lostRes, taxRes, shipRes, incoRes, stRes, partRes, couponRes, accRes] = await Promise.all([
        axios.get(`${baseUrl}/customers`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/items?limit=1000`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/crm/contact-persons`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/payment-terms`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/letter-heads`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/campaigns`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/territories`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/lead-sources`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/lost-reasons`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/tax-categories`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/shipping-rules`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/incoterms`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/sales-taxes-charges-template`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/crm/sales-partners`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/selling/coupon-codes`).catch(() => ({ data: { data: [] } })),
        axios.get(`${baseUrl}/setup/account-heads`).catch(() => ({ data: { data: [] } }))
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
        valid_till: quotationData.validity_date?.split('T')[0] || '',
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

  const handleCustomerChange = (val) => {
    const customer = customers.find(c => c.customer_id === val)
    setFormData({
      ...formData,
      customer_id: val,
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
    if (e) e.preventDefault()

    if (!formData.customer_id || formData.items.length === 0 || !formData.valid_till) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        validity_date: formData.valid_till,
        total_value: calculateTotal(),
        items: formData.items.map(({ id, ...item }) => item),
        taxes_charges: formData.taxes_charges.map(({ id, ...tax }) => tax)
      }

      const baseUrl = 'http://localhost:5000/api/selling/quotations'
      if (isEditMode) {
        await axios.put(`${baseUrl}/${id}`, submitData)
        setSuccess('Quotation updated successfully')
      } else {
        await axios.post(baseUrl, submitData)
        setSuccess('Quotation created successfully')
      }

      setTimeout(() => navigate('/selling/quotations'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save quotation')
    } finally {
      setLoading(false)
    }
  }

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 120
      const bodyRect = document.body.getBoundingClientRect().top
      const elementRect = element.getBoundingClientRect().top
      const elementPosition = elementRect - bodyRect
      const offsetPosition = elementPosition - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Sticky Header Nav */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm px-6 py-3">
        <div className="flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                {isEditMode ? 'EDIT' : 'CREATE'} SALES QUOTATION
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px]  rounded border border-blue-100 uppercase tracking-widest">
                  {isEditMode ? id : 'DRAFT'}
                </span>
              </h1>
              <div className="flex items-center gap-4 text-[10px]  text-slate-400 uppercase tracking-widest mt-0.5">
                <span className="flex items-center gap-1"><Clock size={10} /> AUTO-SAVING...</span>
                <span className="w-1 h-1 rounded bg-slate-300" />
                <span className="flex items-center gap-1 text-blue-500"><Activity size={10} /> SYSTEM READY</span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center bg-slate-50 p-1 rounded-lg border border-slate-100 ml-4 overflow-x-auto max-w-[600px] no-scrollbar">
              <NavItem label="01 FOUNDATION" icon={Landmark} section="foundation" isActive={activeSection === 'foundation'} onClick={scrollToSection} themeColor="blue" />
              <NavItem label="02 LOGISTICS" icon={MapPin} section="address" isActive={activeSection === 'address'} onClick={scrollToSection} themeColor="emerald" />
              <NavItem label="03 ITEMS" icon={Boxes} section="items" isActive={activeSection === 'items'} onClick={scrollToSection} themeColor="amber" />
              <NavItem label="04 TAXES" icon={Calculator} section="taxes" isActive={activeSection === 'taxes'} onClick={scrollToSection} themeColor="rose" />
              <NavItem label="05 TOTALS" icon={Tag} section="totals" isActive={activeSection === 'totals'} onClick={scrollToSection} themeColor="cyan" />
              <NavItem label="06 TERMS" icon={Settings} section="terms" isActive={activeSection === 'terms'} onClick={scrollToSection} themeColor="slate" />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/selling/quotations')}
              className="px-4 py-2 text-[11px]  text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded text-[11px]  uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'PROCESSING...' : 'SAVE QUOTATION'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 mt-8">
        {error && (
          <div className="mb-6 animate-in slide-in-from-top duration-300">
            <Alert type="danger" icon={AlertCircle}>{error}</Alert>
          </div>
        )}
        {success && (
          <div className="mb-6 animate-in slide-in-from-top duration-300">
            <Alert type="success" icon={CheckCircle}>{success}</Alert>
          </div>
        )}

        {isEditMode && quotation && (
          <div className="mb-8">
            <AuditTrail createdAt={quotation.created_at} createdBy={quotation.created_by} updatedAt={quotation.updated_at} updatedBy={quotation.updated_by} status={quotation.status} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Foundation Section */}
          <div id="foundation">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="01 FOUNDATION"
                icon={Landmark}
                subtitle="Core identity and customer parameters"
                isExpanded={expandedSections.foundation}
                onToggle={() => toggleSection('foundation')}
                themeColor="blue"
                badge="MANDATORY"
              />
              {expandedSections.foundation && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper label="Customer" required>
                      <SearchableSelect
                        options={customers.map(c => ({ label: `${c.name} [${c.customer_id}]`, value: c.customer_id }))}
                        value={formData.customer_id}
                        onChange={handleCustomerChange}
                        placeholder="SELECT CUSTOMER"
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Valid Till" required>
                      <div className="relative group">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="date"
                          name="valid_till"
                          value={formData.valid_till}
                          onChange={handleChange}
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        />
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FieldWrapper label="Status">
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Open">Open</option>
                        <option value="Replied">Replied</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Lost">Lost</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </FieldWrapper>

                    <FieldWrapper label="Contact Person">
                      <SearchableSelect
                        options={contactPersons}
                        value={formData.contact_person}
                        onChange={(val) => setFormData({ ...formData, contact_person: val })}
                        placeholder="SELECT CONTACT"
                      />
                    </FieldWrapper>

                    <FieldWrapper label="GSTIN">
                      <input
                        type="text"
                        name="gst_in"
                        value={formData.gst_in}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all "
                      />
                    </FieldWrapper>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Logistics Section */}
          <div id="address">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="02 ADDRESS & CONTACT"
                icon={MapPin}
                subtitle="Shipping and billing configuration"
                isExpanded={expandedSections.address}
                onToggle={() => toggleSection('address')}
                themeColor="emerald"
                badge="LOGISTICS"
              />
              {expandedSections.address && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper label="Customer Address">
                      <textarea
                        name="customer_address"
                        value={formData.customer_address}
                        onChange={handleChange}
                        placeholder="ENTER BILLING ADDRESS..."
                        className="w-full p-4 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all min-h-[100px] "
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Shipping Address">
                      <textarea
                        name="shipping_address"
                        value={formData.shipping_address}
                        onChange={handleChange}
                        placeholder="ENTER SHIPPING ADDRESS..."
                        className="w-full p-4 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all min-h-[100px] "
                      />
                    </FieldWrapper>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper label="Company Address">
                      <textarea
                        name="company_address"
                        value={formData.company_address}
                        onChange={handleChange}
                        className="w-full p-4 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all min-h-[80px] "
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Company Contact Person">
                      <input
                        type="text"
                        name="company_contact_person"
                        value={formData.company_contact_person}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                      />
                    </FieldWrapper>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Items Section */}
          <div id="items">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="03 QUOTATION ITEMS"
                icon={Boxes}
                subtitle="Line Item  and pricing"
                isExpanded={expandedSections.items}
                onToggle={() => toggleSection('items')}
                themeColor="amber"
                badge={`${formData.items.length} ITEMS`}
                actions={
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded text-[10px] font-black uppercase tracking-[0.1em] hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} />
                    ADD ITEM
                  </button>
                }
              />
              {expandedSections.items && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  {formData.items.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item </th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[120px]">Quantity</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[150px]">Rate (₹)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[150px]">Amount (₹)</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[80px]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.items.map((item, idx) => {
                            const amount = (item.qty || 0) * (item.rate || 0)
                            return (
                              <tr key={item.id || idx} className="group hover:bg-slate-50/80 transition-all duration-300">
                                <td className="px-6 py-4">
                                  <SearchableSelect
                                    options={allItems.map(itm => ({ label: `${itm.name} [${itm.item_code}]`, value: itm.item_code }))}
                                    value={item.item_code}
                                    onChange={(val) => handleItemChange(idx, 'item_code', val)}
                                    placeholder="SELECT ITEM"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="number"
                                    value={item.qty || ''}
                                    onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="number"
                                    value={item.rate || ''}
                                    onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-xs font-black text-slate-900">₹{amount.toFixed(2)}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={16} strokeWidth={2.5} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50/50 font-black">
                            <td colSpan="3" className="px-6 py-4 text-[10px] text-slate-400 uppercase tracking-widest text-right">Net Total</td>
                            <td className="px-6 py-4 text-xs text-emerald-600">₹{calculateTotal().toFixed(2)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                      <div className="p-4 bg-white rounded-2xl shadow-xl shadow-slate-200/50 text-slate-200 mb-4">
                        <Package size={40} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No Items Added</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Taxes Section */}
          <div id="taxes">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="04 TAXES & CHARGES"
                icon={Calculator}
                subtitle="Compliance and taxation parameters"
                isExpanded={expandedSections.taxes}
                onToggle={() => toggleSection('taxes')}
                themeColor="rose"
                badge={`${formData.taxes_charges.length} ENTRIES`}
                actions={
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, taxes_charges: [...formData.taxes_charges, { type: 'Add', account_head: '', rate: 0, amount: 0, id: Date.now() }] })}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded text-[10px] font-black uppercase tracking-[0.1em] hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 active:scale-95"
                  >
                    <Plus size={14} strokeWidth={3} />
                    ADD TAX
                  </button>
                }
              />
              {expandedSections.taxes && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <FieldWrapper label="Tax Category">
                      <SearchableSelect
                        options={taxCategories}
                        value={formData.tax_category}
                        onChange={(val) => setFormData({ ...formData, tax_category: val })}
                        placeholder="SELECT CATEGORY"
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Taxes Template">
                      <SearchableSelect
                        options={salesTaxChargesTemplates}
                        value={formData.sales_taxes_charges_template}
                        onChange={(val) => setFormData({ ...formData, sales_taxes_charges_template: val })}
                        placeholder="SELECT TEMPLATE"
                      />
                    </FieldWrapper>
                  </div>

                  {formData.taxes_charges.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[150px]">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Head</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[120px]">Rate (%)</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[150px]">Amount (₹)</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[80px]">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.taxes_charges.map((tax, idx) => (
                            <tr key={tax.id || idx} className="group hover:bg-slate-50/80 transition-all duration-300">
                              <td className="px-6 py-4">
                                <SearchableSelect
                                  options={[{ label: 'ADD', value: 'Add' }, { label: 'DEDUCT', value: 'Deduct' }]}
                                  value={tax.type}
                                  onChange={(val) => {
                                    const updated = [...formData.taxes_charges]
                                    updated[idx].type = val
                                    setFormData({ ...formData, taxes_charges: updated })
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <SearchableSelect
                                  options={accountHeads}
                                  value={tax.account_head}
                                  onChange={(val) => {
                                    const updated = [...formData.taxes_charges]
                                    updated[idx].account_head = val
                                    setFormData({ ...formData, taxes_charges: updated })
                                  }}
                                  placeholder="SELECT ACCOUNT"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  type="number"
                                  value={tax.rate || ''}
                                  onChange={(e) => {
                                    const updated = [...formData.taxes_charges]
                                    updated[idx].rate = parseFloat(e.target.value) || 0
                                    updated[idx].amount = (calculateTotal() * updated[idx].rate) / 100
                                    setFormData({ ...formData, taxes_charges: updated })
                                  }}
                                  className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-black text-slate-900">₹{(tax.amount || 0).toFixed(2)}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = formData.taxes_charges.filter((_, i) => i !== idx)
                                    setFormData({ ...formData, taxes_charges: updated })
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Totals Section */}
          <div id="totals">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="05 TOTALS & DISCOUNTS"
                icon={Tag}
                subtitle="Final valuation and adjustment parameters"
                isExpanded={expandedSections.totals}
                onToggle={() => toggleSection('totals')}
                themeColor="cyan"
                badge="VALUATION"
              />
              {expandedSections.totals && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FieldWrapper label="Apply Discount On">
                      <select
                        name="apply_discount_on"
                        value={formData.apply_discount_on}
                        onChange={handleChange}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                      >
                        <option value="Grand Total">Grand Total</option>
                        <option value="Net Total">Net Total</option>
                      </select>
                    </FieldWrapper>

                    <FieldWrapper label="Coupon Code">
                      <SearchableSelect
                        options={couponCodes}
                        value={formData.coupon_code}
                        onChange={(val) => setFormData({ ...formData, coupon_code: val })}
                        placeholder="SELECT COUPON"
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Referral Partner">
                      <SearchableSelect
                        options={salesPartners}
                        value={formData.referral_sales_partner}
                        onChange={(val) => setFormData({ ...formData, referral_sales_partner: val })}
                        placeholder="SELECT PARTNER"
                      />
                    </FieldWrapper>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                    <div className="space-y-2">
                      <FieldWrapper label="Additional Discount %">
                        <div className="relative group">
                          <Percent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500" />
                          <input
                            type="number"
                            name="additional_discount_percentage"
                            value={formData.additional_discount_percentage}
                            onChange={handleChange}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                          />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Additional Discount Amount">
                        <input
                          type="number"
                          name="additional_discount_amount"
                          value={formData.additional_discount_amount}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                        />
                      </FieldWrapper>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Net Value</span>
                        <span className="text-sm font-black text-slate-900">₹{calculateTotal().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-500">
                        <span className="text-[10px] font-black uppercase tracking-widest">Discount Applied</span>
                        <span className="text-sm font-black">-₹{(formData.additional_discount_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-slate-200 my-2"></div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Grand Total</span>
                        <span className="text-xl font-black text-cyan-600">₹{(calculateTotal() - (formData.additional_discount_amount || 0) + formData.taxes_charges.reduce((s, t) => s + (t.amount || 0), 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Terms Section */}
          <div id="terms">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="06 TERMS & SETTINGS"
                icon={Settings}
                subtitle="Strategic configuration and print parameters"
                isExpanded={expandedSections.terms}
                onToggle={() => toggleSection('terms')}
                themeColor="slate"
                badge="CONFIG"
              />
              {expandedSections.terms && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FieldWrapper label="Payment Template">
                      <SearchableSelect
                        options={paymentTermsTemplates}
                        value={formData.payment_terms_template}
                        onChange={(val) => setFormData({ ...formData, payment_terms_template: val })}
                        placeholder="SELECT TEMPLATE"
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Letter Head">
                      <SearchableSelect
                        options={letterHeads}
                        value={formData.letter_head}
                        onChange={(val) => setFormData({ ...formData, letter_head: val })}
                        placeholder="SELECT LETTERHEAD"
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Shipping Rule">
                      <SearchableSelect
                        options={shippingRules}
                        value={formData.shipping_rule}
                        onChange={(val) => setFormData({ ...formData, shipping_rule: val })}
                        placeholder="SELECT RULE"
                      />
                    </FieldWrapper>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper label="Terms and Conditions">
                      <textarea
                        name="terms_and_conditions"
                        value={formData.terms_and_conditions}
                        onChange={handleChange}
                        className="w-full p-4 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all min-h-[150px] "
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Internal Notes">
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="ENTER INTERNAL SALES NOTES..."
                        className="w-full p-4 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-slate-500/10 focus:border-slate-500 outline-none transition-all min-h-[150px] "
                      />
                    </FieldWrapper>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
