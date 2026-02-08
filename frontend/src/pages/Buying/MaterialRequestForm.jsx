import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import {
  Save, X, AlertCircle, CheckCircle, Package,
  Boxes, Edit2, Settings, Calendar,
  Database, Layers, Clock,
  ArrowRight, ShieldCheck, Zap, Activity, Filter, Info,
  Plus, Trash2, ChevronDown, User, Building, Landmark
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

export default function MaterialRequestForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditMode = id && id !== 'new'

  const [formData, setFormData] = useState({
    series_no: '',
    transition_date: new Date().toISOString().split('T')[0],
    requested_by_id: '',
    department: '',
    purpose: 'purchase',
    required_by_date: '',
    target_warehouse: '',
    source_warehouse: '',
    items_notes: '',
    items: []
  })

  const [materialRequest, setMaterialRequest] = useState(null)
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState(['Production', 'Maintenance', 'Store', 'Quality', 'Purchase', 'Sales'])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [newItem, setNewItem] = useState({ item_code: '', qty: 1, uom: 'pcs' })
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [activeSection, setActiveSection] = useState('foundation')
  const [expandedSections, setExpandedSections] = useState({
    foundation: true,
    logistics: true,
    items: true
  })
  
  const isFormDisabled = isEditMode && materialRequest && materialRequest.status !== 'draft'

  useEffect(() => {
    fetchItems()
    fetchEmployees()
    fetchWarehouses()
    fetchDepartments()
    if (!isEditMode) {
      generateSeriesNumber()
    }
    if (isEditMode) {
      fetchMaterialRequest()
    }

    const handleScroll = () => {
      const sections = ['foundation', 'logistics', 'items']
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

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/hr/employees')
      const data = response.data.data || response.data || []
      setEmployees(data)
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const fetchMaterialRequest = async () => {
    try {
      const response = await api.get(`/material-requests/${id}`)
      const mr = response.data.data
      setMaterialRequest(mr)
      setFormData({
        series_no: mr.series_no,
        transition_date: mr.transition_date?.split('T')[0],
        requested_by_id: mr.requested_by_id,
        department: mr.department,
        required_by_date: mr.required_by_date?.split('T')[0],
        purpose: mr.purpose,
        items: mr.items || [],
        items_notes: mr.items_notes || '',
        source_warehouse: mr.source_warehouse || '',
        target_warehouse: mr.target_warehouse || ''
      })
    } catch (err) {
      setError('Failed to fetch material request')
    }
  }

  const fetchItems = async () => {
    try {
      const response = await api.get('/items?limit=1000')
      setItems(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/masters/departments')
      if (response.data.success) {
        setDepartments(response.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses?limit=1000')
      setWarehouses(response.data.data || [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const generateSeriesNumber = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const seriesNo = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${random}`
    setFormData(prev => ({ ...prev, series_no: seriesNo }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAddItem = () => {
    if (!newItem.item_code || !newItem.qty) {
      setError('Please select item and enter quantity')
      return
    }

    const itemExists = formData.items.some(i => i.item_code === newItem.item_code && (editingItemIndex === null || formData.items.indexOf(i) !== editingItemIndex))
    if (itemExists) {
      setError('Item already added')
      return
    }

    if (editingItemIndex !== null) {
      const updatedItems = [...formData.items]
      updatedItems[editingItemIndex] = { ...newItem, id: updatedItems[editingItemIndex].id }
      setFormData({ ...formData, items: updatedItems })
      setEditingItemIndex(null)
    } else {
      setFormData({
        ...formData,
        items: [...formData.items, { ...newItem, id: Date.now() }]
      })
    }

    setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
    setError(null)
  }

  const handleEditItem = (index) => {
    setEditingItemIndex(index)
    setNewItem(formData.items[index])
    scrollToSection('items')
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
    if (editingItemIndex === index) {
      setEditingItemIndex(null)
      setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
    }
  }

  const handleCancelEdit = () => {
    setEditingItemIndex(null)
    setNewItem({ item_code: '', qty: 1, uom: 'pcs' })
  }

  const handleSubmit = async (e, status = 'draft') => {
    if (e) e.preventDefault()

    if (isFormDisabled) {
      setError('Cannot edit an approved material request. Only draft requests can be edited.')
      return
    }

    if (!formData.requested_by_id || !formData.department || formData.items.length === 0) {
      setError('Please fill all required fields')
      return
    }

    try {
      setLoading(true)
      const submitData = {
        ...formData,
        status,
        items: formData.items.map(({ id, ...item }) => item)
      }

      if (isEditMode) {
        await api.put(`/material-requests/${id}`, submitData)
        setSuccess('Material request updated successfully')
      } else {
        await api.post('/material-requests', submitData)
        setSuccess('Material request created successfully')
      }

      setTimeout(() => navigate('/buying/material-requests'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save material request')
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
                {isEditMode ? 'EDIT' : 'CREATE'} MATERIAL REQUEST
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px]  rounded border border-indigo-100 uppercase tracking-widest">
                  {formData.series_no || 'DRAFT'}
                </span>
              </h1>
              <div className="flex items-center gap-4 text-[10px]  text-slate-400 uppercase tracking-widest mt-0.5">
                <span className="flex items-center gap-1"><Clock size={10} /> AUTO-SAVING...</span>
                <span className="w-1 h-1 rounded bg-slate-300" />
                <span className="flex items-center gap-1 text-indigo-500"><Activity size={10} /> SYSTEM READY</span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center bg-slate-50 p-1 rounded  border border-slate-100 ml-4">
              <NavItem
                label="01 FOUNDATION"
                icon={Landmark}
                section="foundation"
                isActive={activeSection === 'foundation'}
                onClick={scrollToSection}
                themeColor="indigo"
              />
              <NavItem
                label="02 LOGISTICS"
                icon={Database}
                section="logistics"
                isActive={activeSection === 'logistics'}
                onClick={scrollToSection}
                themeColor="emerald"
              />
              <NavItem
                label="03 ITEMS"
                icon={Boxes}
                section="items"
                isActive={activeSection === 'items'}
                onClick={scrollToSection}
                themeColor="amber"
              />
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/buying/material-requests')}
              className="px-4 py-2 text-[11px]  text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded uppercase tracking-widest transition-all hover:bg-slate-50 shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading || isFormDisabled}
              className="px-4 py-2 text-[11px]  text-indigo-600 bg-indigo-50 border border-indigo-100 rounded uppercase tracking-widest transition-all hover:bg-indigo-100 shadow-sm disabled:opacity-50"
            >
              {loading ? 'SAVING...' : 'SAVE DRAFT'}
            </button>
            <button
              onClick={(e) => handleSubmit(e, 'pending')}
              disabled={loading || isFormDisabled || formData.items.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded text-[11px]  uppercase tracking-widest transition-all hover:bg-slate-800 shadow-lg shadow-slate-200 active:scale-95 disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'PROCESSING...' : 'SUBMIT REQUEST'}
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

        {isEditMode && materialRequest && (
          <div className="mb-8">
            <AuditTrail
              createdAt={materialRequest.created_at}
              createdBy={materialRequest.created_by}
              updatedAt={materialRequest.updated_at}
              updatedBy={materialRequest.updated_by}
              status={materialRequest.status}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Foundation Section */}
          <div id="foundation">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="01 FOUNDATION"
                icon={Landmark}
                subtitle="Core identity and requester details"
                isExpanded={expandedSections.foundation}
                onToggle={() => toggleSection('foundation')}
                themeColor="indigo"
                badge="MANDATORY"
              />
              {expandedSections.foundation && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FieldWrapper label="Series Number">
                      <input
                        type="text"
                        value={formData.series_no}
                        readOnly
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs  text-slate-500 cursor-not-allowed "
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Transition Date" required>
                      <div className="relative group">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="date"
                          name="transition_date"
                          value={formData.transition_date}
                          onChange={handleChange}
                          disabled={isFormDisabled}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </FieldWrapper>

                    <FieldWrapper label="Required By Date" required>
                      <div className="relative group">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                          type="date"
                          name="required_by_date"
                          value={formData.required_by_date}
                          onChange={handleChange}
                          disabled={isFormDisabled}
                          required
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                        />
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldWrapper label="Department" required>
                      <SearchableSelect
                        options={departments.map(dept => ({ label: dept.name || dept, value: dept.name || dept }))}
                        value={formData.department}
                        onChange={(val) => setFormData({ ...formData, department: val, requested_by_id: '' })}
                        placeholder="SELECT DEPARTMENT"
                        disabled={isFormDisabled}
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Requested By" required>
                      <SearchableSelect
                        options={employees
                          .filter(emp => !formData.department || emp.department === formData.department)
                          .map(emp => ({ 
                            label: `${emp.first_name} ${emp.last_name} [${emp.employee_id || emp.id}]`, 
                            value: emp.employee_id || emp.id 
                          }))}
                        value={formData.requested_by_id}
                        onChange={(val) => setFormData({ ...formData, requested_by_id: val })}
                        placeholder={formData.department ? "SELECT EMPLOYEE" : "SELECT DEPARTMENT FIRST"}
                        disabled={isFormDisabled || !formData.department}
                      />
                    </FieldWrapper>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Logistics Section */}
          <div id="logistics">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="02 LOGISTICS"
                icon={Database}
                subtitle="Fulfillment strategy and warehouse routing"
                isExpanded={expandedSections.logistics}
                onToggle={() => toggleSection('logistics')}
                themeColor="emerald"
                badge="EXECUTION"
              />
              {expandedSections.logistics && (
                <div className="p-6 space-y-6 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FieldWrapper label="Purpose" required>
                      <SearchableSelect
                        options={[
                          { label: 'PURCHASE', value: 'purchase' },
                          { label: 'MATERIAL TRANSFER', value: 'material_transfer' },
                          { label: 'MATERIAL ISSUE', value: 'material_issue' }
                        ]}
                        value={formData.purpose}
                        onChange={(val) => setFormData({ ...formData, purpose: val })}
                        disabled={isFormDisabled}
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Target Warehouse">
                      <SearchableSelect
                        options={warehouses.map(wh => ({ 
                          label: `${wh.warehouse_name || wh.name} [${wh.warehouse_id || wh.id}]`, 
                          value: wh.warehouse_id || wh.id 
                        }))}
                        value={formData.target_warehouse}
                        onChange={(val) => setFormData({ ...formData, target_warehouse: val })}
                        placeholder="SELECT TARGET"
                        disabled={isFormDisabled}
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Source Warehouse">
                      <SearchableSelect
                        options={warehouses.map(wh => ({ 
                          label: `${wh.warehouse_name || wh.name} [${wh.warehouse_id || wh.id}]`, 
                          value: wh.warehouse_id || wh.id 
                        }))}
                        value={formData.source_warehouse}
                        onChange={(val) => setFormData({ ...formData, source_warehouse: val })}
                        placeholder="SELECT SOURCE"
                        disabled={isFormDisabled}
                      />
                    </FieldWrapper>
                  </div>

                  <FieldWrapper label="Additional Notes">
                    <textarea
                      name="items_notes"
                      value={formData.items_notes}
                      onChange={handleChange}
                      disabled={isFormDisabled}
                      placeholder="ENTER ANY ADDITIONAL STRATEGIC NOTES..."
                      className="w-full p-4 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all min-h-[100px] "
                    />
                  </FieldWrapper>
                </div>
              )}
            </Card>
          </div>

          {/* Items Section */}
          <div id="items">
            <Card className="overflow-hidden border-none shadow-xl shadow-slate-200/50">
              <SectionHeader
                title="03 ITEMS"
                icon={Boxes}
                subtitle="Material specification and quantification"
                isExpanded={expandedSections.items}
                onToggle={() => toggleSection('items')}
                themeColor="amber"
                badge={`${formData.items.length} ITEMS`}
              />
              {expandedSections.items && (
                <div className="p-6 space-y-8 animate-in fade-in duration-300">
                  {/* Add/Edit Item Interface */}
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-1.5 bg-amber-500 text-white rounded">
                        <Plus size={16} strokeWidth={3} />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest">
                        {editingItemIndex !== null ? 'UPDATE MATERIAL ITEM' : 'ADD MATERIAL ITEM'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                      <div className="md:col-span-6">
                        <FieldWrapper label="Item " required>
                          <SearchableSelect
                            options={items.map(item => ({ 
                              label: `${item.name || item.item_name} [${item.item_code}]`, 
                              value: item.item_code 
                            }))}
                            value={newItem.item_code}
                            onChange={(val) => {
                              const item = items.find(i => i.item_code === val)
                              setNewItem({ ...newItem, item_code: val, uom: item?.uom || 'pcs' })
                            }}
                            placeholder="SEARCH BY NAME OR CODE..."
                            disabled={isFormDisabled}
                          />
                        </FieldWrapper>
                      </div>

                      <div className="md:col-span-3">
                        <FieldWrapper label="Quantity" required>
                          <div className="relative group">
                            <input
                              type="number"
                              value={newItem.qty}
                              onChange={(e) => setNewItem({ ...newItem, qty: parseFloat(e.target.value) || 0 })}
                              disabled={isFormDisabled}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded text-xs  text-slate-900 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all "
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-amber-500 transition-colors uppercase tracking-widest">
                              {newItem.uom}
                            </div>
                          </div>
                        </FieldWrapper>
                      </div>

                      <div className="md:col-span-3 flex gap-2">
                        <button
                          type="button"
                          onClick={handleAddItem}
                          disabled={isFormDisabled}
                          className="flex-1 p-2.5 bg-amber-500 text-white rounded text-[11px]  uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95 disabled:opacity-50"
                        >
                          {editingItemIndex !== null ? 'UPDATE' : 'ADD ITEM'}
                        </button>
                        {editingItemIndex !== null && (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-2.5 bg-white text-slate-500 border border-slate-200 rounded text-[11px]  uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {formData.items.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No.</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Material Specification</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quantity</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {formData.items.map((item, index) => (
                            <tr
                              key={item.id}
                              className={`group hover:bg-slate-50/80 transition-all duration-300 ${editingItemIndex === index ? 'bg-amber-50/50' : ''}`}
                            >
                              <td className="px-6 py-4 text-xs  text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                                    <Package size={16} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-900 ">{item.item_code}</p>
                                    <p className="text-[10px]  text-slate-400 uppercase tracking-tight mt-0.5">
                                      {items.find(i => i.item_code === item.item_code)?.name || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-slate-900">{item.qty}</span>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">{item.uom}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button
                                    type="button"
                                    onClick={() => handleEditItem(index)}
                                    disabled={isFormDisabled}
                                    className="p-2 text-indigo-500 hover:bg-indigo-50 rounded transition-all disabled:opacity-30"
                                  >
                                    <Edit2 size={14} strokeWidth={3} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={isFormDisabled}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded transition-all disabled:opacity-30"
                                  >
                                    <Trash2 size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                      <div className="p-4 bg-white rounded-2xl shadow-xl shadow-slate-200/50 text-slate-200 mb-6 scale-110">
                        <Boxes size={48} strokeWidth={1} />
                      </div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Payload Empty</h3>
                      <p className="text-[10px]  text-slate-400 uppercase tracking-widest mt-2">Add items above to initialize material request</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
