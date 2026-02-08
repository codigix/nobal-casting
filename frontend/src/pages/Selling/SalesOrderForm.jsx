import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  AlertCircle, Plus, Trash2, X, ChevronRight, Save, RotateCcw, ChevronDown, 
  ChevronUp, Check, FileText, Settings, Database, Layers, TrendingDown, 
  Package, Users, DollarSign, AlertTriangle, Activity, ArrowLeft,
  Calendar, ShoppingCart, Truck, Factory, Search, CreditCard
} from 'lucide-react'
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
  if (normalized === 'consumable') return false
  return normalized === 'subassemblies' || normalized === 'subassembly'
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
          <Icon size={15} strokeWidth={2.5} />
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

const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    submitted: 'bg-blue-50 text-blue-600 border-blue-100',
    confirmed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    cancelled: 'bg-rose-50 text-rose-600 border-rose-100'
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px]  border  ${styles[status?.toLowerCase()] || styles.draft}`}>
      {status || 'DRAFT'}
    </span>
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
        <div className={`p-1.5 rounded  ${themeClass}`}>
          {Icon && <Icon size={12} />}
        </div>
        <span className="text-[10px]  text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-xs  text-slate-700 truncate pl-1">
        {value || <span className="text-slate-300 font-normal italic">Not specified</span>}
      </span>
    </div>
  )
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

  const [expandedSections, setExpandedSections] = useState({
    foundation: true,
    client: true,
    operational: true,
    engineering: true,
    taxation: true
  })
  const [activeSection, setActiveSection] = useState('foundation')

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }))
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 160
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['foundation', 'client', 'operational', 'engineering', 'taxation']
      const scrollPosition = window.scrollY + 150

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

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
        label: `${b.product_name || b.name || b.bom_id} [${b.bom_id || b.id}]`,
        value: b.bom_id || b.id || '',
        fullData: b
      })))

      const itemsData = itemsRes.data.data || []
      setItemsList(itemsData.map(item => ({
        label: `${item.name || item.item_name || 'No Name'} [${item.item_code}]`,
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

  const renderBOMSections = () => {
    if (bomFinishedGoods.length === 0 && bomSubAssemblies.length === 0 && bomRawMaterials.length === 0 && bomOperations.length === 0) {
      return (
        <div className="bg-slate-50/50 border border-slate-100 rounded p-3 text-center ">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center mx-auto mb-4   border border-slate-100">
            <Database size={16} className="text-slate-300" />
          </div>
          <h3 className="text-slate-900  text-lg mb-2 ">No Engineering Data</h3>
          <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed  opacity-70">
            Select a Bill of Materials to initialize the manufacturing intelligence protocol and breakdown requirements.
          </p>
        </div>
      )
    }

    return (
      <div className="0">
        {/* 1. Finished Goods Section */}
        {bomFinishedGoods.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded  shadow-lg shadow-blue-100">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="text-xs  text-slate-800 ">Finished Goods</h3>
                  <p className="text-xs text-slate-400 ">Output Configuration</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs  rounded-full border border-blue-100">
                {bomFinishedGoods.length} Specification
              </span>
            </div>

            <div className="bg-white/50 backdrop-blur-md rounded border border-slate-100 overflow-hidden   hover:shadow-md transition-all duration-500">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-xs  text-slate-600  font-thin">Item Intelligence</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Target Qty</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Unit Rate</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bomFinishedGoods.map((item, idx) => {
                    const bomQty = (parseFloat(item.quantity || item.qty) || 1)
                    const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                    const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                    return (
                      <tr key={idx} className="group hover:bg-blue-50/30 transition-all duration-300">
                        <td className="p-2">
                          <div className="flex flex-col">
                            <span className="text-xs  text-slate-900 group-hover:text-blue-600 transition-colors">
                              {item.component_code || item.item_code || '-'}
                            </span>
                            <span className="text-xs text-slate-400  truncate max-w-[250px]">
                              {item.item_name || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs   text-slate-700 bg-slate-50/50 px-3 py-1.5 border border-slate-100 rounded min-w-[6rem] inline-block text-right">
                              {multipliedQty}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          {isReadOnly ? (
                            <span className="text-xs  text-slate-600">{formatCurrency(item.rate)}</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs  text-slate-300">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.rate || 0}
                                onChange={(e) => handleBomFinishedGoodEdit(idx, 'rate', e.target.value)}
                                className="w-24 px-3 py-1.5 text-xs   text-right border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="text-xs  text-blue-600">{formatCurrency(itemAmount)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Sub-Assemblies Section */}
        {bomSubAssemblies.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded  shadow-lg shadow-amber-100">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-xs  text-slate-800 ">Sub-Assemblies</h3>
                  <p className="text-xs text-slate-400 ">Intermediate Protocol</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs  rounded-full border border-amber-100">
                {bomSubAssemblies.length} NODES
              </span>
            </div>

            <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100 overflow-hidden   hover:shadow-md transition-all duration-500">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-xs  text-slate-600  font-thin">Assembly Identifier</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Required Qty</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Node Rate</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Extension</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bomSubAssemblies.map((item, idx) => {
                    const bomQty = (parseFloat(item.quantity || item.qty || item.bom_qty) || 1)
                    const multipliedQty = bomQty * (parseFloat(formData.qty) || 1)
                    const itemAmount = multipliedQty * (parseFloat(item.rate) || 0)
                    return (
                      <tr key={idx} className="group hover:bg-amber-50/30 transition-all duration-300">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs  text-slate-900 group-hover:text-amber-600 transition-colors">
                              {item.component_code || item.item_code || '-'}
                            </span>
                            <span className="text-xs text-slate-400  truncate max-w-[250px]">
                              {item.component_description || item.item_name || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs   text-slate-700 bg-amber-50/50 px-2 py-1 rounded  border border-amber-100/50">
                            {formatQty(multipliedQty)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs  text-slate-600">{formatCurrency(item.rate)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs  text-amber-600">{formatCurrency(itemAmount)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Raw Materials Section */}
        {bomRawMaterials.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded  shadow-lg shadow-emerald-100">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-xs  text-slate-800 ">Strategic Materials</h3>
                  <p className="text-xs text-slate-400 ">Inventory Requirements</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isReadOnly && bomSubAssemblies.length > 0 && (
                  <button
                    type="button"
                    onClick={fetchSubAssemblyMaterials}
                    disabled={refreshingBom}
                    className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 text-xs  text-slate-600  rounded-full hover:bg-slate-50 transition-all  "
                  >
                    {refreshingBom ? <RotateCcw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    {refreshingBom ? 'Syncing...' : 'Sync Protocol'}
                  </button>
                )}
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs  rounded-full border border-emerald-100">
                  {bomRawMaterials.length} RESOURCES
                </span>
              </div>
            </div>

            <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100 overflow-hidden   hover:shadow-md transition-all duration-500">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-xs  text-slate-600  font-thin">Resource Matrix</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin">Metadata</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Consolidated Qty</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Spot Rate</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Cost Extension</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bomRawMaterials.map((material, idx) => {
                    const itemQty = parseFloat(material.quantity || material.qty || 0) * (parseFloat(formData.qty) || 1)
                    const itemAmount = itemQty * (parseFloat(material.rate || 0))
                    return (
                      <tr key={idx} className="group hover:bg-emerald-50/30 transition-all duration-300">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs  text-slate-900 group-hover:text-emerald-600 transition-colors">
                              {material.item_code || material.component_code || '-'}
                            </span>
                            <span className="text-xs text-slate-400  truncate max-w-[200px]">
                              {material.item_name || material.component_description || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px]  text-slate-400 ">{material.item_group || '-'}</span>
                            {material.bom_id && (
                              <span className="text-[8px]  bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                                {material.bom_id}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs   text-slate-700 bg-emerald-50/50 px-2 py-1 rounded  border border-emerald-100/50">
                              {formatQty(itemQty)}
                            </span>
                            <span className="text-[9px]  text-emerald-600  mt-1">{material.uom || material.unit || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs  text-slate-600">{formatCurrency(material.rate)}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs  text-emerald-700">{formatCurrency(itemAmount)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Operations Section */}
        {bomOperations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded  shadow-lg shadow-indigo-100">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="text-xs  text-slate-800 ">Process Workflows</h3>
                  <p className="text-xs text-slate-400 ">Operational Sequence</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs  rounded-full border border-indigo-100">
                {bomOperations.length} STEPS
              </span>
            </div>

            <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100 overflow-hidden   hover:shadow-md transition-all duration-500">
              {bomOperations.some(op => !op.hourly_rate || parseFloat(op.hourly_rate) === 0) && (
                <div className="bg-rose-50 border-b border-rose-100 p-3 flex items-center gap-3">
                  <AlertTriangle size={14} className="text-rose-500" />
                  <p className="text-rose-600 text-xs  ">Critical: Undefined hourly rates detected in workflow.</p>
                </div>
              )}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="p-2 text-xs  text-slate-600  font-thin">Operation Protocol</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Temporal Data</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Resource Rate</th>
                    <th className="p-2 text-xs  text-slate-600  font-thin text-right">Total Overhead</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bomOperations.map((op, idx) => {
                    const cycleTime = parseFloat(op.operation_time || 0)
                    const setupTime = parseFloat(op.fixed_time || 0)
                    const hourlyRate = parseFloat(op.hourly_rate || 0)
                    const qty = parseFloat(formData.qty) || 1
                    const totalTimeMinutes = (cycleTime * qty) + setupTime
                    const totalTimeHours = totalTimeMinutes / 60
                    const opTotalCost = totalTimeHours * hourlyRate

                    return (
                      <tr key={idx} className="group hover:bg-indigo-50/30 transition-all duration-300">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-xs  text-slate-900 group-hover:text-indigo-600 transition-colors">{op.operation_name || '-'}</span>
                            <span className="text-xs text-slate-400 ">{op.workstation || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs   text-slate-700 bg-indigo-50/50 px-2 py-1 rounded  border border-indigo-100/50">
                              {totalTimeHours.toFixed(2)} HRS
                            </span>
                            <span className="text-[9px]  text-indigo-400  mt-1">
                              {cycleTime}m cycle + {setupTime}m fixed
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          {isReadOnly ? (
                            <span className="text-xs  text-slate-600">{formatCurrency(hourlyRate)}/hr</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs  text-slate-300">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                value={op.hourly_rate || 0}
                                onChange={(e) => handleBomOperationEdit(idx, 'hourly_rate', e.target.value)}
                                className="w-24 px-3 py-1.5 text-xs   text-right border border-slate-200 rounded  focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                              />
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs  text-indigo-700">{formatCurrency(opTotalCost)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }


  const renderCostBreakdown = () => {
    const qty = parseFloat(formData.qty) || 1
    const profitMarginPct = parseFloat(formData.profit_margin_percentage) || 0
    const fgUnitCost = bomFinishedGoods.reduce((sum, item) => sum + (parseFloat(item.rate) || 0), 0)
    const baseCost = fgUnitCost * qty
    const profitAmount = baseCost * (profitMarginPct / 100)
    const costWithProfit = baseCost + profitAmount
    const cgstRate = parseFloat(formData.cgst_rate) || 0
    const sgstRate = parseFloat(formData.sgst_rate) || 0
    const totalGstRate = (cgstRate + sgstRate) / 100
    const gstAmount = costWithProfit * totalGstRate
    const grandTotal = costWithProfit + gstAmount

    return (
      <div className=" animate-in fade-in slide-in-from-right-8 duration-700">
        <div className="bg-white/40 backdrop-blur-xl border border-slate-100 rounded p-2   shadow-slate-200/50 relative overflow-hidden group">
          {/* Neural Core Decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-500/10 transition-all duration-1000"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-emerald-500/10 transition-all duration-1000"></div>
          
          <div className="flex items-center justify-between mb-4 border-b border-slate-100/50 pb-3">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-900 text-white rounded ">
                <FileText size={15} />
              </div>
              <div>
                <h4 className="text-xs  text-slate-900 ">Financial Summary</h4>
                <p className="text-xs text-slate-400 ">Neural Diagnostic Output</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[9px]  text-slate-400  block mb-1">Total Volume</span>
              <span className="p-1 bg-blue-50 text-blue-600 text-xs  rounded border border-blue-100">
                {qty} UNITS
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center group/row">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/row:bg-blue-400 transition-all"></div>
                <span className="text-[11px]  text-slate-500  group-hover/row:text-slate-700 transition-colors">Unit Manufacturing Cost</span>
              </div>
              <span className="text-xs   text-slate-600">{formatCurrency(fgUnitCost)}</span>
            </div>

            <div className="flex justify-between items-center p-2 border-y border-dashed border-slate-100">
              <span className="text-xs  text-slate-900 ">Production Subtotal</span>
              <span className="text-sm   text-slate-900">{formatCurrency(baseCost)}</span>
            </div>

            {profitMarginPct > 0 && (
              <div className="flex justify-between items-center bg-emerald-50/50p-2  rounded-3xl border border-emerald-100/50 group/profit transition-all hover:bg-emerald-50">
                <div className="flex flex-col">
                  <span className="text-xs  text-emerald-600 ">Strategic Margin</span>
                  <span className="text-[9px] text-emerald-500  ">{profitMarginPct}% added to base</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingDown size={14} className="text-emerald-400 rotate-180" />
                  <span className="text-xs   text-emerald-700">+{formatCurrency(profitAmount)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px]  text-slate-500  text-right">Taxable Protocol Value</span>
              <span className="text-xs   text-slate-900">{formatCurrency(costWithProfit)}</span>
            </div>

            {(cgstRate + sgstRate) > 0 && (
              <div className="flex justify-between items-center bg-blue-50/50 p-2 rounded border border-blue-100/50 group/tax transition-all hover:bg-blue-50">
                <div className="flex flex-col">
                  <span className="text-xs  text-blue-600 ">Applied Taxation</span>
                  <span className="text-[9px] text-blue-500  ">{cgstRate}% CGST + {sgstRate}% SGST</span>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard size={14} className="text-blue-400" />
                  <span className="text-xs   text-blue-700">+{formatCurrency(gstAmount)}</span>
                </div>
              </div>
            )}

            <div className="mt-3 pt-4 border-t-2 border-slate-900 relative">
              <div className="absolute -top-1 right-0 w-24 h-1 bg-blue-600"></div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-xs  text-slate-400 mb-2">Grand Total Payable</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px]  rounded">
                      FINAL INVOICE
                    </span>
                    <div className="flex -space-x-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-75"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse delay-150"></div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xl  text-slate-900 tracking-tighter drop- ">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-2/50 flex flex-col items-center justify-center p-8">
        <div className="w-8 h-8 bg-white rounded shadow  flex items-center justify-center mb-4 animate-bounce">
          <Database size={16} className="text-blue-600" />
        </div>
        <div className="text-xs  text-slate-400 animate-pulse">
          Initializing Intelligence Protocol...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2 pb-3">
      {/* 1. Global Command Header */}
      <div className="sticky top-0 z-[40] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate('/manufacturing/sales-orders')}
                className="group flex items-center justify-center w-12 h-12 rounded bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all duration-500   hover:shadow  hover:-translate-x-1"
              >
                <ArrowLeft size={20} className="transition-transform group-hover:scale-110" />
              </button>
              
              <div className="h-10 w-px bg-slate-200/60 hidden md:block" />
              
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl  text-slate-900 ">
                    {formData.series || 'New Protocol'}
                  </h1>
                  <StatusBadge status={formData.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs  text-slate-400">Sales Order</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-xs  text-blue-600 ">
                    {isReadOnly ? 'Neural View' : isEditMode ? 'Configuration Mode' : 'Initialization Phase'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isReadOnly ? (
                <>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded  bg-white border border-slate-200 text-slate-600 text-xs   hover:bg-slate-50 transition-all  "
                  >
                    <FileText size={16} />
                    Print
                  </button>
                  <button
                    onClick={() => navigate(`/manufacturing/sales-orders/${id}`)}
                    className="flex items-center gap-2 p-2 rounded  bg-slate-900 text-white text-xs   hover:bg-slate-800 transition-all shadow  hover:shadow-slate-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <Settings size={16} />
                    Edit Order
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 text-xs  text-slate-600  font-thin hover:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 p-2  rounded bg-blue-600 text-white text-xs   hover:bg-blue-700 disabled:bg-slate-300 transition-all shadow-lg shadow-blue-100 hover:shadow-blue-200 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {loading ? (
                      <RotateCcw size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {loading ? 'Processing...' : 'Save Protocol'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mt-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 2. Horizontal Navigation & Metrics Bar */}
          <div className="sticky top-[80px] z-30 bg-white/80 backdrop-blur-md border border-slate-200/60 rounded p-2  flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
              <NavItem 
                label="01 FOUNDATION" 
                icon={Database} 
                section="foundation" 
                isActive={activeSection === 'foundation'} 
                onClick={scrollToSection}
                themeColor="blue"
              />
              <NavItem 
                label="02 CLIENT" 
                icon={Users} 
                section="client" 
                isActive={activeSection === 'client'} 
                onClick={scrollToSection}
                themeColor="indigo"
              />
              <NavItem 
                label="03 OPS" 
                icon={Activity} 
                section="operational" 
                isActive={activeSection === 'operational'} 
                onClick={scrollToSection}
                themeColor="emerald"
              />
              <NavItem 
                label="04 ENGINEERING" 
                icon={Layers} 
                section="engineering" 
                isActive={activeSection === 'engineering'} 
                onClick={scrollToSection}
                themeColor="amber"
              />
              <NavItem 
                label="05 REVENUE" 
                icon={CreditCard} 
                section="taxation" 
                isActive={activeSection === 'taxation'} 
                onClick={scrollToSection}
                themeColor="rose"
              />
            </div>

            {/* Quick Metrics Integrated */}
            <div className="hidden lg:flex items-center gap-4 bg-slate-900 p-2 rounded shrink-0 shadow-lg shadow-slate-900/20">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px]  text-slate-400 uppercase tracking-widest">Order Valuation</span>
                </div>
                <div className="text-sm font-black text-white tracking-tight">
                  {formatCurrency(calculateBomGrandTotal())}
                </div>
              </div>
            </div>
          </div>

          {/* 3. High-Fidelity Content Area */}
          <div className="space-y-6">
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            {/* A. Order Foundation Section */}
            <Card className="!p-0 border-slate-200/60  bg-white group ">
              <SectionHeader 
                title="01 FOUNDATION" 
                icon={Database} 
                subtitle="Core Identity & Scheduling" 
                isExpanded={expandedSections.foundation}
                onToggle={() => toggleSection('foundation')}
                id="foundation"
                themeColor="blue"
              />
              
              {expandedSections.foundation && (
                <div className="p-4 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {isReadOnly ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <InfoRow label="Protocol Series" value={formData.series} icon={FileText} />
                      <InfoRow label="Initialization Date" value={formData.date} icon={Calendar} />
                      <InfoRow label="Promised Delivery" value={formData.delivery_date} icon={Truck} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <FieldWrapper label="Customer Selection" required>
                        <SearchableSelect
                          value={formData.customer_id}
                          onChange={handleCustomerChange}
                          options={customers.map(c => ({ label: `${c.customer_name} [${c.customer_id}]`, value: c.customer_id }))}
                          placeholder="Choose a customer..."
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Order Date" required>
                        <input
                          className="w-full p-2 text-xs  border border-slate-200 rounded  focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50 transition-all outline-none"
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleChange}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Promised Delivery" required>
                        <input
                          className="w-full p-2 text-xs  border border-slate-200 rounded  focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-slate-50/50 transition-all outline-none"
                          type="date"
                          name="delivery_date"
                          value={formData.delivery_date}
                          onChange={handleChange}
                        />
                      </FieldWrapper>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* B. Client Intelligence Section */}
            <Card className="!p-0 border-slate-200/60  bg-white group ">
              <SectionHeader 
                title="02 CLIENT INTELLIGENCE" 
                icon={Users} 
                subtitle="Customer Metadata & Contact" 
                isExpanded={expandedSections.client}
                onToggle={() => toggleSection('client')}
                id="client"
                themeColor="indigo"
              />
              
              {expandedSections.client && (
                <div className="p-4 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoRow label="Customer ID" value={formData.customer_id} icon={Users} color="indigo" />
                    <InfoRow label="Full Name" value={formData.customer_name} icon={Users} color="indigo" />
                    <InfoRow label="Contact Email" value={formData.customer_email} icon={FileText} color="indigo" />
                    <InfoRow label="Phone Protocol" value={formData.customer_phone} icon={Activity} color="indigo" />
                  </div>
                </div>
              )}
            </Card>

            {/* C. Operational Section */}
            <Card className="!p-0 border-slate-200/60  bg-white group ">
              <SectionHeader 
                title="03 OPERATIONAL METADATA" 
                icon={Activity} 
                subtitle="Logistics & Production Metrics" 
                isExpanded={expandedSections.operational}
                onToggle={() => toggleSection('operational')}
                id="operational"
                themeColor="emerald"
              />
              
              {expandedSections.operational && (
                <div className="p-4 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {isReadOnly ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <InfoRow label="Order Type" value={formData.order_type} icon={ShoppingCart} color="emerald" />
                      <InfoRow label="Source Warehouse" value={formData.source_warehouse} icon={Factory} color="emerald" />
                      <InfoRow label="Protocol Status" value={formData.status} icon={Settings} color="emerald" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <FieldWrapper label="Order Type" required>
                        <SearchableSelect
                          value={formData.order_type}
                          onChange={(val) => handleSearchableChange('order_type', val)}
                          options={orderTypes}
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Warehouse" required>
                        <SearchableSelect
                          value={formData.source_warehouse}
                          onChange={(val) => handleSearchableChange('source_warehouse', val)}
                          options={warehouses}
                          placeholder="Select origin warehouse..."
                        />
                      </FieldWrapper>

                      <FieldWrapper label="Operational Status">
                        <div className="w-full p-2 flex items-center text-[11px]  border border-slate-200 rounded  bg-slate-100 text-slate-500 ">
                          {formData.production_plan_status || formData.status || 'DRAFT PROTOCOL'}
                        </div>
                      </FieldWrapper>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* D. Engineering Section */}
            <Card className="!p-0 border-slate-200/60  bg-white group ">
              <SectionHeader 
                title="04 PRODUCT ENGINEERING" 
                icon={Layers} 
                subtitle="BOM & Manufacturing Specs" 
                isExpanded={expandedSections.engineering}
                onToggle={() => toggleSection('engineering')}
                id="engineering"
                themeColor="amber"
                badge={formData.bom_id}
              />
              
              {expandedSections.engineering && (
                <div className="p-4 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {!isReadOnly && (
                      <FieldWrapper label="Manufacturing BOM" required>
                        <SearchableSelect
                          value={formData.bom_id}
                          onChange={(val) => handleBomChange(val)}
                          options={boms}
                          placeholder="Select manufacturing blueprint..."
                          isDisabled={isEditMode && formData.items?.length > 0}
                        />
                      </FieldWrapper>
                    )}

                    <FieldWrapper label="Production Volume" required>
                      <div className="relative group/input">
                        <input
                          className="w-full p-2 text-xs text-blue-600 border border-slate-200 rounded  focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 bg-white transition-all outline-none"
                          type="number"
                          name="qty"
                          value={formData.qty}
                          onChange={handleChange}
                          min="1"
                          disabled={isReadOnly}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs  text-slate-400 ">PCS</span>
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className="">
                    {renderBOMSections()}
                  </div>
                </div>
              )}
            </Card>

            {/* E. Taxation Section */}
            <Card className="!p-0 border-slate-200/60  bg-white group ">
              <SectionHeader 
                title="05 TAXATION & REVENUE" 
                icon={CreditCard} 
                subtitle="GST Configuration & Margins" 
                isExpanded={expandedSections.taxation}
                onToggle={() => toggleSection('taxation')}
                id="taxation"
                themeColor="rose"
              />
              
              {expandedSections.taxation && (
                <div className="p-4 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                  {isReadOnly ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <InfoRow label="CGST Rate" value={`${formData.cgst_rate}%`} icon={DollarSign} color="rose" />
                      <InfoRow label="SGST Rate" value={`${formData.sgst_rate}%`} icon={DollarSign} color="rose" />
                      <InfoRow label="Profit Margin" value={`${formData.profit_margin_percentage}%`} icon={TrendingDown} color="rose" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <FieldWrapper label="CGST Rate (%)">
                        <div className="relative">
                          <input
                            className="w-full p-2 text-xs  border border-slate-200 rounded  focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white transition-all outline-none"
                            type="number"
                            name="cgst_rate"
                            value={formData.cgst_rate || 0}
                            onChange={handleChange}
                            step="0.01"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 ">%</span>
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="SGST Rate (%)">
                        <div className="relative">
                          <input
                            className="w-full p-2 text-xs  border border-slate-200 rounded  focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-white transition-all outline-none"
                            type="number"
                            name="sgst_rate"
                            value={formData.sgst_rate || 0}
                            onChange={handleChange}
                            step="0.01"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 ">%</span>
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Profit Margin (%)">
                        <div className="relative">
                          <input
                            className="w-full p-2 text-xs  border border-slate-200 rounded  focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white transition-all outline-none text-emerald-600"
                            type="number"
                            name="profit_margin_percentage"
                            value={formData.profit_margin_percentage || 0}
                            onChange={handleChange}
                            step="0.01"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 ">%</span>
                        </div>
                      </FieldWrapper>
                    </div>
                  )}

                  <div className=" border-t border-slate-100">
                    {renderCostBreakdown()}
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