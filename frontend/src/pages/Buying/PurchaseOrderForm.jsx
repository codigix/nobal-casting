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
  Building2, MapPin, Calculator, FileText, CheckCircle, ChevronRight,
  ChevronDown, LayoutGrid, User, Settings, CreditCard as PaymentIcon
} from 'lucide-react'
import './Buying.css'

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
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs  rounded-full border border-slate-200 ">
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
      {error && <span className="text-xs  text-rose-500 animate-pulse">{error}</span>}
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
      <span className="text-xs  tracking-tight uppercase">{label}</span>
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
        <div className={`p-2 rounded shadow-lg transition-all duration-300 ${theme.icon} ${isExpanded ? 'scale-110 rotate-3' : ''}`}>
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
          <span className={`px-2.5 py-1 ${theme.bg} ${theme.text} text-xs  rounded-full border ${theme.border} `}>
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

const InfoRow = ({ label, value, icon: Icon, className = "", color = "indigo" }) => {
  const themes = {
    blue: 'text-blue-600 bg-blue-50/50 border-blue-100/50',
    emerald: 'text-emerald-600 bg-emerald-50/50 border-emerald-100/50',
    amber: 'text-amber-600 bg-amber-50/50 border-amber-100/50',
    rose: 'text-rose-600 bg-rose-50/50 border-rose-100/50',
    indigo: 'text-indigo-600 bg-indigo-50/50 border-indigo-100/50',
    slate: 'text-slate-600 bg-slate-50/50 border-slate-100/50',
    cyan: 'text-cyan-600 bg-cyan-50/50 border-cyan-100/50'
  }
  const themeClass = themes[color] || themes.indigo

  return (
    <div className={`flex flex-col p-2 rounded border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${themeClass}`}>
          {Icon && <Icon size={12} />}
        </div>
        <span className="text-xs  text-slate-400 ">{label}</span>
      </div>
      <span className="text-xs  text-slate-700 truncate pl-1">
        {value || <span className="text-slate-300 font-normal italic">Not specified</span>}
      </span>
    </div>
  )
}

export default function PurchaseOrderForm() {
  const { po_no } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const searchTimeoutRef = useRef(null)
  
  const [activeSection, setActiveSection] = useState('foundation')
  const [expandedSections, setExpandedSections] = useState({
    foundation: true,
    vendor: true,
    items: true,
    logistics: true,
    finance: true
  })

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
      setActiveSection(sectionId)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['foundation', 'vendor', 'items', 'logistics', 'finance']
      const currentSection = sections.find(section => {
        const element = document.getElementById(section)
        if (element) {
          const rect = element.getBoundingClientRect()
          return rect.top <= 150 && rect.bottom >= 150
        }
        return false
      })
      if (currentSection) setActiveSection(currentSection)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
            <div>
              <div className="flex items-center gap-2 text-xs  text-slate-400 ">
                <LayoutGrid size={10} />
                <span>Buying</span>
                <ChevronRight size={10} />
                <span>Purchase Order</span>
              </div>
              <h1 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                {isEdit ? po_no : 'Draft Purchase Order'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              className="hidden sm:flex items-center gap-2 text-xs  "
            >
              <X size={14} /> Discard
            </Button>
            <Button
              type="submit"
              form="po-form"
              variant="primary"
              disabled={loading}
              className="flex items-center gap-2 px-6 shadow-lg shadow-indigo-200 text-xs   h-10"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isEdit ? 'Update Order' : 'Complete Order'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-28 space-y-1">
              <NavItem
                label="Foundation"
                icon={Settings}
                section="foundation"
                isActive={activeSection === 'foundation'}
                onClick={scrollToSection}
                themeColor="slate"
              />
              <NavItem
                label="Vendor"
                icon={User}
                section="vendor"
                isActive={activeSection === 'vendor'}
                onClick={scrollToSection}
                themeColor="indigo"
              />
              <NavItem
                label="Order Items"
                icon={Package}
                section="items"
                isActive={activeSection === 'items'}
                onClick={scrollToSection}
                themeColor="emerald"
              />
              <NavItem
                label="Logistics"
                icon={Truck}
                section="logistics"
                isActive={activeSection === 'logistics'}
                onClick={scrollToSection}
                themeColor="amber"
              />
              <NavItem
                label="Finance & Terms"
                icon={PaymentIcon}
                section="finance"
                isActive={activeSection === 'finance'}
                onClick={scrollToSection}
                themeColor="rose"
              />

              <div className="mt-8 p-4 bg-white rounded border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-xs  text-slate-400 ">Order Summary</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Items</span>
                    <span className=" text-slate-700">{po.items.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-50 pt-2">
                    <span className="text-slate-500 font-medium">Total</span>
                    <span className=" text-indigo-600">₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Form Content */}
          <main className="flex-1 min-w-0 pb-24">
            <form id="po-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Foundation Section */}
              <div id="foundation" className="scroll-mt-28 bg-white rounded border border-slate-200  ">
                <SectionHeader
                  title="Foundation SETTINGS"
                  subtitle="Core order parameters and identification"
                  icon={Settings}
                  isExpanded={expandedSections.foundation}
                  onToggle={() => toggleSection('foundation')}
                  themeColor="slate"
                />
                {expandedSections.foundation && (
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-2 bg-gradient-to-b from-slate-50/50 to-white">
                    <FieldWrapper label="Order Date" required>
                      <input
                        type="date"
                        value={po.order_date}
                        onChange={(e) => setPo({ ...po, order_date: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all"
                        required
                      />
                    </FieldWrapper>
                    <FieldWrapper label="Expected Delivery Date">
                      <input
                        type="date"
                        value={po.expected_date}
                        onChange={(e) => setPo({ ...po, expected_date: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-slate-500/10 focus:border-slate-400 outline-none transition-all"
                      />
                    </FieldWrapper>
                  </div>
                )}
              </div>

              {/* Vendor Section */}
              <div id="vendor" className="scroll-mt-28 bg-white rounded border border-slate-200  ">
                <SectionHeader
                  title="Vendor PARTNER"
                  subtitle="Supplier selection and profile information"
                  icon={User}
                  isExpanded={expandedSections.vendor}
                  onToggle={() => toggleSection('vendor')}
                  themeColor="indigo"
                />
                {expandedSections.vendor && (
                  <div className="p-8 bg-gradient-to-b from-indigo-50/30 to-white">
                    <div className="max-w-xl">
                      <FieldWrapper label="Select Supplier" required>
                        <SearchableSelect
                          value={po.supplier_id}
                          onChange={handleSupplierChange}
                          options={suppliers.map(sup => ({ 
                            value: sup.supplier_id, 
                            label: `${sup.name} [${sup.supplier_id}]` 
                          }))}
                          placeholder="Search by name or code..."
                          required
                        />
                      </FieldWrapper>
                    </div>

                    {po.supplier_id && (
                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <InfoRow 
                          label="Supplier Name" 
                          value={po.supplier_name} 
                          icon={User} 
                          color="indigo" 
                        />
                        <InfoRow 
                          label="Supplier ID" 
                          value={po.supplier_id} 
                          icon={FileText} 
                          color="indigo" 
                        />
                        <InfoRow 
                          label="Type" 
                          value="Standard Vendor" 
                          icon={CheckCircle} 
                          color="indigo" 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Section */}
              <div id="items" className="scroll-mt-28 bg-white rounded border border-slate-200  ">
                <SectionHeader
                  title="Order ITEMS"
                  subtitle="Line items and technical specifications"
                  icon={Package}
                  isExpanded={expandedSections.items}
                  onToggle={() => toggleSection('items')}
                  themeColor="emerald"
                  actions={
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      variant="ghost"
                      className="text-xs   bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded border border-emerald-100 h-auto"
                    >
                      <Plus size={12} className="mr-1" strokeWidth={3} /> Add Item
                    </Button>
                  }
                />
                {expandedSections.items && (
                  <div className="overflow-x-auto bg-white">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="p-2  text-xs  text-slate-400  w-[40%]">Item </th>
                          <th className="px-4 py-4 text-xs  text-slate-400  text-center">Quantity</th>
                          <th className="px-4 py-4 text-xs  text-slate-400  text-right">Unit Rate</th>
                          <th className="px-4 py-4 text-xs  text-slate-400  text-right">Row Total</th>
                          <th className="p-2  w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {po.items.map((item, index) => (
                          <tr key={index} className="group hover:bg-emerald-50/30 transition-colors">
                            <td className="p-2 ">
                              <SearchableSelect
                                value={item.item_code}
                                onChange={(value) => handleItemChange(value, index)}
                                options={itemSearchResults.map(itm => ({ 
                                  value: itm.item_code, 
                                  label: `${itm.name} [${itm.item_code}]` 
                                }))}
                                placeholder="Select item..."
                                onSearch={searchItems}
                                isLoading={itemSearchLoading}
                                className="text-xs "
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-center">
                                <input
                                  type="number"
                                  value={item.qty}
                                  onChange={(e) => {
                                    const newItems = [...po.items]
                                    newItems[index].qty = parseFloat(e.target.value) || 0
                                    setPo({ ...po, items: newItems })
                                  }}
                                  className="w-24 px-3 py-1.5 bg-white border border-slate-200 rounded text-center text-xs  focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs  text-slate-400">₹</span>
                                  <input
                                    type="number"
                                    value={item.rate}
                                    onChange={(e) => {
                                      const newItems = [...po.items]
                                      newItems[index].rate = parseFloat(e.target.value) || 0
                                      setPo({ ...po, items: newItems })
                                    }}
                                    className="w-32 pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded text-right text-xs  focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-400 outline-none transition-all"
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className="text-xs font-extrabold text-slate-700 tracking-tight">
                                ₹{(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="p-2  text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all "
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {po.items.length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2 bg-slate-50/30">
                        <div className="p-4 bg-white rounded-full border border-slate-100 shadow-sm">
                          <Package size={32} strokeWidth={1.5} />
                        </div>
                        <p className="text-xs  uppercase tracking-[0.2em]">No Items Configured</p>
                        <Button type="button" onClick={handleAddItem} variant="ghost" className="text-indigo-600  uppercase text-xs">
                          Click here to add items
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Logistics Section */}
              <div id="logistics" className="scroll-mt-28 bg-white rounded border border-slate-200  ">
                <SectionHeader
                  title="Shipping LOGISTICS"
                  subtitle="Delivery coordinates and trade conditions"
                  icon={Truck}
                  isExpanded={expandedSections.logistics}
                  onToggle={() => toggleSection('logistics')}
                  themeColor="amber"
                />
                {expandedSections.logistics && (
                  <div className="p-8 space-y-8 bg-gradient-to-b from-amber-50/30 to-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin size={16} className="text-amber-500" />
                          <h4 className="text-xs font-extrabold text-slate-400 ">Shipping Address</h4>
                        </div>
                        <FieldWrapper label="Street Address">
                          <input
                            type="text"
                            value={po.shipping_address_line1}
                            onChange={(e) => setPo({ ...po, shipping_address_line1: e.target.value })}
                            className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all"
                            placeholder="Unit / Street / Landmark"
                          />
                        </FieldWrapper>
                        <div className="grid grid-cols-2 gap-4">
                          <FieldWrapper label="City">
                            <input
                              type="text"
                              value={po.shipping_city}
                              onChange={(e) => setPo({ ...po, shipping_city: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all"
                            />
                          </FieldWrapper>
                          <FieldWrapper label="Pincode">
                            <input
                              type="text"
                              value={po.shipping_pincode}
                              onChange={(e) => setPo({ ...po, shipping_pincode: e.target.value })}
                              className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all"
                            />
                          </FieldWrapper>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Settings size={16} className="text-amber-500" />
                          <h4 className="text-xs font-extrabold text-slate-400 ">Trade Controls</h4>
                        </div>
                        <FieldWrapper label="Incoterm">
                          <SearchableSelect
                            value={po.incoterm}
                            onChange={(val) => setPo({ ...po, incoterm: val })}
                            options={[
                              { value: 'EXW', label: 'EXW - Ex Works' },
                              { value: 'FOB', label: 'FOB - Free on Board' },
                              { value: 'CIF', label: 'CIF - Cost, Insurance & Freight' },
                              { value: 'DDP', label: 'DDP - Delivered Duty Paid' }
                            ]}
                          />
                        </FieldWrapper>
                        <FieldWrapper label="Shipping Rule">
                          <input
                            type="text"
                            value={po.shipping_rule}
                            onChange={(e) => setPo({ ...po, shipping_rule: e.target.value })}
                            className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 outline-none transition-all"
                            placeholder="e.g. Courier, Freight Forwarder"
                          />
                        </FieldWrapper>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Finance & Terms Section */}
              <div id="finance" className="scroll-mt-28 bg-white rounded border border-slate-200  ">
                <SectionHeader
                  title="Revenue FINANCE"
                  subtitle="Taxation, payment terms and commercial summary"
                  icon={PaymentIcon}
                  isExpanded={expandedSections.finance}
                  onToggle={() => toggleSection('finance')}
                  themeColor="rose"
                />
                {expandedSections.finance && (
                  <div className="p-2 bg-gradient-to-b from-rose-50/30 to-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <div>
                          <div className="flex items-center gap-2 mb-6">
                            <CreditCard size={16} className="text-rose-500" />
                            <h4 className="text-xs font-extrabold text-slate-400 ">Payment Strategy</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FieldWrapper label="Payment Terms">
                              <input
                                type="text"
                                value={po.payment_terms_description}
                                onChange={(e) => setPo({ ...po, payment_terms_description: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all"
                                placeholder="e.g. 100% Advance"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Payment Due Date">
                              <input
                                type="date"
                                value={po.due_date}
                                onChange={(e) => setPo({ ...po, due_date: e.target.value })}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all"
                              />
                            </FieldWrapper>
                          </div>
                        </div>

                        <div className="p-2 bg-rose-50/50 rounded border border-rose-100/50 border-dashed">
                          <h5 className="text-xs  text-rose-600  mb-4">Financial Modifiers</h5>
                          <div className="grid grid-cols-2 gap-6">
                            <FieldWrapper label="Tax Rate (%)">
                              <input
                                type="number"
                                value={po.tax_rate}
                                onChange={(e) => setPo({ ...po, tax_rate: parseFloat(e.target.value) || 0 })}
                                className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-rose-600 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all"
                              />
                            </FieldWrapper>
                            <FieldWrapper label="Advance Paid">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs  text-slate-400">₹</span>
                                <input
                                  type="number"
                                  value={po.advance_paid}
                                  onChange={(e) => setPo({ ...po, advance_paid: parseFloat(e.target.value) || 0 })}
                                  className="w-full pl-7 pr-4 p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 outline-none transition-all"
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 rounded p-2 text-white  relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-rose-500/20 transition-all duration-700" />
                        
                        <div className="relative space-y-6">
                          <div className="flex items-center justify-between">
                            <span className="text-xs  text-slate-400 ">Purchase Valuation</span>
                            <Calculator size={20} className="text-rose-400" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                              <span>Subtotal</span>
                              <span>₹{calculateSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-medium text-rose-400">
                              <span className="flex items-center gap-2">
                                GST Component <span className="text-xs p-2 bg-rose-500/20 rounded border border-rose-500/30">{po.tax_rate}%</span>
                              </span>
                              <span>+ ₹{calculateTaxAmount().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-medium text-emerald-400">
                              <span>Advance Deduction</span>
                              <span>- ₹{(po.advance_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>

                          <div className="p-2 border-t border-white/10 mt-2">
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="text-xs  text-slate-500  mb-1">Payable Balance</p>
                                <p className="text-xl ">
                                  ₹{calculateTotal().toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs  text-emerald-400  mb-1">Currency</p>
                                <p className="">INR (₹)</p>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <div className="flex items-center gap-3 p-2 bg-white/5 rounded border border-white/10 group-hover:bg-white/10 transition-colors">
                              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded">
                                <CreditCard size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs  text-slate-400 ">Payment Channel</p>
                                <p className="text-xs  truncate">Bank Transfer / NEFT</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </main>
        </div>
      </div>
    </div>
  )
}
