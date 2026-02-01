import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown, Save, X, Plus, Trash2, AlertCircle, Package, Boxes, Archive,
  Check, Factory, Zap, Layout, Info, ArrowLeft, ArrowRight, Activity, Calendar,
  ShieldCheck, AlertTriangle, Layers, TrendingUp, Settings, ClipboardCheck
} from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import Card from '../../components/Card/Card'

const SectionTitle = ({ title, icon: Icon, badge }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
        <Icon size={18} />
      </div>
      <h3 className="text-xs text-slate-900 ">{title}</h3>
    </div>
    {badge && (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs   rounded  border border-slate-200  ">
        {badge}
      </span>
    )}
  </div>
)

const SectionHeader = ({ title, icon: Icon, subtitle, isExpanded, onToggle, themeColor = 'indigo', id, badge, actions }) => {
  const themes = {
    blue: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      icon: 'bg-blue-600 text-white'
    },
    emerald: {
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      icon: 'bg-emerald-600 text-white'
    },
    amber: {
      text: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      icon: 'bg-amber-600 text-white'
    },
    rose: {
      text: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      icon: 'bg-rose-600 text-white'
    },
    indigo: {
      text: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      icon: 'bg-indigo-600 text-white'
    },
    slate: {
      text: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-100',
      icon: 'bg-slate-600 text-white'
    },
    cyan: {
      text: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100',
      icon: 'bg-cyan-600 text-white'
    }
  }

  const theme = themes[themeColor] || themes.indigo

  return (
    <div
      id={id}
      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50/50 transition-all border-b border-slate-100 ${isExpanded ? 'bg-slate-50/30' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded   transition-all duration-300 ${theme.icon} ${isExpanded ? 'scale-110 rotate-3' : ''}`}>
          <Icon size={18} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-xs  flex items-center gap-3">
            <span className={`${theme.text} tracking-wider`}>{title.split(' ')[0]}</span>
            <span className="text-slate-800">{title.split(' ').slice(1).join(' ')}</span>
          </h2>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className={`px-2 py-0.5 ${theme.bg} ${theme.text} text-xs   rounded-full border ${theme.border} `}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions && <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        <div className={`p-1.5 rounded-full transition-all duration-300 ${isExpanded ? `${theme.bg} ${theme.text}` : 'text-slate-300'}`}>
          <ChevronDown size={18} className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  )
}

const NavItem = ({ label, icon: Icon, section, isActive, onClick, themeColor = 'indigo' }) => {
  const themes = {
    blue: 'bg-blue-600 shadow-blue-100 hover:text-blue-600',
    emerald: 'bg-emerald-600 shadow-emerald-100 hover:text-emerald-600',
    amber: 'bg-amber-600 shadow-amber-100 hover:text-amber-600',
    rose: 'bg-rose-600 shadow-rose-100 hover:text-rose-600',
    indigo: 'bg-indigo-600 shadow-indigo-100 hover:text-indigo-600',
    slate: 'bg-slate-600 shadow-slate-100 hover:text-slate-600',
    cyan: 'bg-cyan-600 shadow-cyan-100 hover:text-cyan-600'
  }

  const themeClass = themes[themeColor] || themes.indigo
  const activeBg = themeClass.split(' ')[0]
  const activeShadow = themeClass.split(' ')[1]
  const hoverText = themeClass.split(' ')[2]

  return (
    <button
      type="button"
      onClick={() => onClick(section)}
      className={`flex items-center gap-3 p-2 rounded transition-all border border-slate-100 duration-300 ${isActive
        ? `${activeBg} text-white shadow-lg ${activeShadow} translate-y-[-2px]`
        : `text-slate-500 hover:bg-white ${hoverText} border border-transparent hover:border-slate-100`
        }`}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
        <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
      </div>
      <span className={` text-xs ${isActive ? '' : 'text-slate-400'}`}>{label.split(' ').slice(1).join(' ')}</span>
    </button>
  )
}

const FieldWrapper = ({ label, children, error, required }) => (
  <div className=".5">
    <div className="flex items-center justify-between">
      <label className="text-xs   text-slate-400  text-xs  flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {error && <span className="text-xs   text-rose-500 animate-pulse">{error}</span>}
    </div>
    {children}
  </div>
)

const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    planned: 'bg-blue-50 text-blue-600 border-blue-100',
    'in-progress': 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    cancelled: 'bg-rose-50 text-rose-600 border-rose-100'
  }
  return (
    <span className={`px-2 py-0.5  rounded  text-xs  border  text-xs   ${styles[status?.toLowerCase()] || styles.draft}`}>
      {status || 'DRAFT'}
    </span>
  )
}

const isSubAssemblyGroup = (itemGroup) => {
  if (!itemGroup) return false
  const normalized = itemGroup.toLowerCase().replace(/[-\s]/g, '').trim()
  return normalized === 'subassemblies' || normalized === 'subassembly'
}

export default function ProductionPlanningForm() {
  const navigate = useNavigate()
  const { plan_id } = useParams()
  const [activeSection, setActiveSection] = useState('parameters')
  const [expandedSections, setExpandedSections] = useState({
    parameters: true,
    scope: true,
    requirements: true,
    subassembly: true,
    rawmaterials: true,
    operations: true
  })
  const [expandedItemGroups, setExpandedItemGroups] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [fetchingBom, setFetchingBom] = useState(false)

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleItemGroup = (groupKey) => {
    setExpandedItemGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    
    // Ensure the section is expanded so we can scroll to its content
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: true
    }))

    const element = document.getElementById(sectionId)
    if (element) {
      const offset = 120 // Space for the sticky header
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  // Scroll spy to update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['parameters', 'scope', 'requirements', 'subassembly', 'operations']
      const scrollPosition = window.scrollY + 150 // Adjust offset for detection

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const groupItemsByItemGroup = (items) => {
    const grouped = {}
    items.forEach(item => {
      const groupName = item.item_group || 'Ungrouped'
      if (!grouped[groupName]) {
        grouped[groupName] = []
      }
      grouped[groupName].push(item)
    })
    return grouped
  }

  const [planHeader, setPlanHeader] = useState({
    plan_id: '',
    naming_series: 'PP',
    company: '',
    sales_order_id: '',
    status: 'draft'
  })

  const [selectedSalesOrders, setSelectedSalesOrders] = useState([])
  const [selectedBomId, setSelectedBomId] = useState(null)
  const [selectedSalesOrderDetails, setSelectedSalesOrderDetails] = useState(null)
  const [salesOrderQuantity, setSalesOrderQuantity] = useState(1)
  const [fgItems, setFGItems] = useState([])
  const [subAssemblyItems, setSubAssemblyItems] = useState([])
  const [rawMaterialItems, setRawMaterialItems] = useState([])
  const [operationItems, setOperationItems] = useState([])
  const [fgOperations, setFGOperations] = useState([])
  const [consolidateSubAssembly, setConsolidateSubAssembly] = useState(false)
  const [skipAvailableSubAssembly, setSkipAvailableSubAssembly] = useState(false)
  const [selectedSubAssemblyItems, setSelectedSubAssemblyItems] = useState(new Set())
  const [editingFGIndex, setEditingFGIndex] = useState(null)
  const [editingSubAsmIndex, setEditingSubAsmIndex] = useState(null)
  const [editingRawMatIndex, setEditingRawMatIndex] = useState(null)
  const [editBackupFG, setEditBackupFG] = useState(null)
  const [editBackupSubAsm, setEditBackupSubAsm] = useState(null)
  const [editBackupRawMat, setEditBackupRawMat] = useState(null)
  const [subAssemblyMaterials, setSubAssemblyMaterials] = useState({})
  const [expandedSubAssemblyMaterials, setExpandedSubAssemblyMaterials] = useState({})
  const [subAssemblyBomMaterials, setSubAssemblyBomMaterials] = useState([])
  const [fetchingSubAssemblyBoms, setFetchingSubAssemblyBoms] = useState(false)
  const [expandedMaterialDetails, setExpandedMaterialDetails] = useState({})
  const [nestedMaterialsData, setNestedMaterialsData] = useState({})
  const [expandedOperations, setExpandedOperations] = useState({})
  const [expandedMaterialOps, setExpandedMaterialOps] = useState({})
  const [materialOperationsData, setMaterialOperationsData] = useState({})
  const [expandedBomOps, setExpandedBomOps] = useState({})
  const [bomOperationsData, setBomOperationsData] = useState({})
  const [creatingWorkOrders, setCreatingWorkOrders] = useState(false)

  const [items, setItems] = useState([])
  const [boms, setBOMs] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [salesOrders, setSalesOrders] = useState([])
  const [bomFinishedGoods, setBomFinishedGoods] = useState([])
  const [bomRawMaterials, setBomRawMaterials] = useState([])
  const [bomOperations, setBomOperations] = useState([])
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false)
  const [creatingWorkOrder, setCreatingWorkOrder] = useState(false)
  const [workOrderData, setWorkOrderData] = useState(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const fetchProductionPlan = async (planId) => {
    try {
      setLoading(true)
      setError(null)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const plan = data.success ? data.data : null

        if (plan) {
          console.log('Loaded production plan data:', plan)
          console.log('Sales Order ID from plan:', plan.sales_order_id)
          console.log('Plan sales_order_id type:', typeof plan.sales_order_id)
          console.log('Plan sales_order_id value (JSON):', JSON.stringify(plan.sales_order_id))

          setPlanHeader({
            plan_id: plan.plan_id || '',
            naming_series: plan.naming_series || 'PP',
            company: plan.company || '',
            sales_order_id: plan.sales_order_id || '',
            status: plan.status || 'draft'
          })

          setFGItems(plan.fg_items || [])
          setSubAssemblyItems(plan.sub_assemblies || plan.sub_assembly_items || [])
          setRawMaterialItems(plan.raw_materials || [])
          setFGOperations(plan.fg_operations || [])
          setOperationItems(plan.operations || [])

          const planQty = plan.fg_items?.[0]?.planned_qty || plan.fg_items?.[0]?.quantity || 1
          setSalesOrderQuantity(planQty)

          if (plan.sales_order_id) {
            setSelectedSalesOrders([plan.sales_order_id])
            await processSalesOrderData(plan.sales_order_id, planQty)
          }
        } else {
          setError('Production plan not found')
        }
      } else {
        setError('Failed to fetch production plan')
      }
    } catch (err) {
      console.error('Error fetching production plan:', err)
      setError('Failed to load production plan')
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setItems(data.data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    }
  }

  const fetchBOMs = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setBOMs(data.data || [])
    } catch (err) {
      console.error('Error fetching BOMs:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/warehouses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setWarehouses(data.data || [])
    } catch (err) {
      console.error('Error fetching warehouses:', err)
    }
  }

  const fetchSalesOrders = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setSalesOrders(data.data || [])
    } catch (err) {
      console.error('Error fetching sales orders:', err)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    try {
      setFetchingBom(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      const bomData = data.data || data

      if (bomData) {
        setBomFinishedGoods(bomData.lines || bomData.finished_goods || bomData.bom_finished_goods || [])
        setBomRawMaterials(bomData.rawMaterials || bomData.bom_raw_materials || [])
        setBomOperations(bomData.operations || bomData.bom_operations || [])
        setOperationItems(bomData.operations || bomData.bom_operations || [])
      }

      return bomData
    } catch (err) {
      console.error('Error fetching BOM details:', err)
      return null
    } finally {
      setFetchingBom(false)
    }
  }

  const fetchSalesOrderDetails = async (salesOrderId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/selling/sales-orders/${salesOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      const soData = data.data || data

      try {
        if (soData.bom_raw_materials && typeof soData.bom_raw_materials === 'string') {
          soData.bom_raw_materials = JSON.parse(soData.bom_raw_materials)
        }
        if (soData.bom_operations && typeof soData.bom_operations === 'string') {
          soData.bom_operations = JSON.parse(soData.bom_operations)
        }
        if (soData.bom_finished_goods && typeof soData.bom_finished_goods === 'string') {
          soData.bom_finished_goods = JSON.parse(soData.bom_finished_goods)
        }
      } catch (parseErr) {
        console.warn('Error parsing BOM JSON fields:', parseErr)
      }

      return soData
    } catch (err) {
      console.error('Error fetching sales order details:', err)
      return null
    }
  }

  const fetchSubAssemblyBomMaterials = async (itemsToProcess, level = 0, allSubAsmMaterials = [], allDiscoveredSubAsms = []) => {
    if (!itemsToProcess || itemsToProcess.length === 0 || level > 5) {
      if (level === 0) console.warn('No items to process for BOM explosion');
      return { materials: allSubAsmMaterials, subAsms: allDiscoveredSubAsms };
    }

    try {
      if (level === 0) {
        console.log('=== STARTING RECURSIVE SUB-ASSEMBLY BOM EXPLOSION ===');
        setFetchingSubAssemblyBoms(true);
      }

      console.log(`\n--- Processing Level ${level} (${itemsToProcess.length} items) ---`);
      const token = localStorage.getItem('token');
      const nextLevelItems = [];

      for (let idx = 0; idx < itemsToProcess.length; idx++) {
        const item = itemsToProcess[idx];
        const itemCode = item.item_code || item.component_code;
        const itemName = item.item_name || item.component_description || itemCode;
        const itemQty = item.quantity || item.qty || 1;

        console.log(`Exploding item ${idx + 1}/${itemsToProcess.length}: ${itemCode} (Qty: ${itemQty})`);

        try {
          const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?item_code=${itemCode}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!bomRes.ok) continue;

          const bomListData = await bomRes.json();
          const bomList = bomListData.data || [];

          if (bomList.length === 0) continue;

          let selectedBom = bomList.find(b => (b.item_code || b.item || '').toLowerCase() === itemCode.toLowerCase());
          if (!selectedBom) selectedBom = bomList[0];

          const bomId = selectedBom.bom_id || selectedBom.id;
          const bomDetailsRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!bomDetailsRes.ok) continue;

          const bomDetailsData = await bomDetailsRes.json();
          const bomData = bomDetailsData.data || bomDetailsData;

          const rawMaterials = bomData.rawMaterials || bomData.bom_raw_materials || [];
          const operations = bomData.operations || bomData.bom_operations || [];

          rawMaterials.forEach(mat => {
            const matQty = (mat.qty || mat.quantity || 0) * itemQty;

            if (isSubAssemblyGroup(mat.item_group)) {
              const subAsmEntry = {
                item_code: mat.item_code || mat.component_code,
                item_name: mat.item_name || mat.component_description,
                quantity: matQty,
                qty: matQty,
                planned_qty: matQty,
                bom_no: mat.bom_no || mat.bom_id,
                bom_id: mat.bom_no || mat.bom_id,
                explosion_level: level + 1,
                parent_code: itemCode
              };
              nextLevelItems.push(subAsmEntry);
              allDiscoveredSubAsms.push(subAsmEntry);
            } else {
              allSubAsmMaterials.push({
                ...mat,
                sub_assembly_code: itemCode,
                sub_assembly_name: itemName,
                bom_id: bomId,
                quantity: matQty,
                qty: matQty,
                explosion_level: level
              });
            }
          });

          operations.forEach(op => {
            const opTime = (op.operation_time || op.time || 0) * itemQty;
            allSubAsmMaterials.push({
              ...op,
              sub_assembly_code: itemCode,
              sub_assembly_name: itemName,
              bom_id: bomId,
              is_operation: true,
              operation_qty: opTime,
              operation_time: opTime,
              explosion_level: level
            });
          });
        } catch (err) {
          console.error(`Error exploding ${itemCode}:`, err);
        }
      }

      // if (nextLevelItems.length > 0) {
      //   await fetchSubAssemblyBomMaterials(nextLevelItems, level + 1, allSubAsmMaterials, allDiscoveredSubAsms);
      // }

      if (level === 0) {
        console.log('=== RECURSIVE EXPLOSION COMPLETE ===');
        setSubAssemblyBomMaterials([...allSubAsmMaterials]);

        if (allDiscoveredSubAsms.length > 0) {
          setSubAssemblyItems(prev => {
            const existingCodes = new Set(prev.map(i => i.item_code));
            const newSubAsms = allDiscoveredSubAsms.filter(i => !existingCodes.has(i.item_code));

            // For those that already exist, we should probably add to their quantity
            const updated = prev.map(item => {
              const discovered = allDiscoveredSubAsms.find(d => d.item_code === item.item_code);
              if (discovered) {
                const newQty = (item.quantity || 0) + (discovered.quantity || 0);
                return { ...item, quantity: newQty, qty: newQty, planned_qty: newQty };
              }
              return item;
            });

            return [...updated, ...newSubAsms];
          });
        }
      }

      return { materials: allSubAsmMaterials, subAsms: allDiscoveredSubAsms };
    } catch (err) {
      console.error('Error in recursive explosion:', err);
      return { materials: allSubAsmMaterials, subAsms: allDiscoveredSubAsms };
    } finally {
      if (level === 0) setFetchingSubAssemblyBoms(false);
    }
  };

  const loadSubAssemblyMaterials = async (subAssemblySku) => {
    if (subAssemblyMaterials[subAssemblySku]) {
      return subAssemblyMaterials[subAssemblySku]
    }

    try {
      const bomItem = bomRawMaterials.find(rm => rm.item_code === subAssemblySku)
      if (!bomItem) return []

      const token = localStorage.getItem('token')
      const bomId = bomItem.bom_no || bomItem.bom_id
      if (!bomId) return []

      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) return []

      const data = await response.json()
      const bomData = data.data || data
      const materials = (bomData.rawMaterials || bomData.bom_raw_materials || []).filter(m => {
        const group = m.item_group || m.group || ''
        return !isSubAssemblyGroup(group)
      })

      setSubAssemblyMaterials(prev => ({ ...prev, [subAssemblySku]: materials }))
      return materials
    } catch (err) {
      console.error('Error loading sub-assembly materials:', err)
      return []
    }
  }

  const updateSubAssemblyMaterial = async (subAssemblySku, materialIndex, field, value) => {
    const materials = await loadSubAssemblyMaterials(subAssemblySku)
    if (materials && materials[materialIndex]) {
      const updatedMaterials = [...materials]
      updatedMaterials[materialIndex] = { ...updatedMaterials[materialIndex], [field]: value }
      setSubAssemblyMaterials(prev => ({ ...prev, [subAssemblySku]: updatedMaterials }))
    }
  }

  useEffect(() => {
    fetchItems()
    fetchBOMs()
    fetchWarehouses()
    fetchSalesOrders()

    if (plan_id) {
      fetchProductionPlan(plan_id)
    }
  }, [plan_id])

  useEffect(() => {
    console.log('=== rawMaterialItems CHANGED ===')
    console.log('rawMaterialItems count:', rawMaterialItems.length)
    console.log('rawMaterialItems data:', rawMaterialItems)
  }, [rawMaterialItems])

  const handleSalesOrderSelect = (soId) => {
    setPlanHeader(prev => ({ ...prev, sales_order_id: soId }))
    setSelectedSalesOrders([soId])
  }

  const processSalesOrderData = async (soId, salesOrderQty = 1) => {
    const soDetails = await fetchSalesOrderDetails(soId)
    if (!soDetails) return

    let itemCode = ''
    let itemName = ''

    const items = soDetails.items || []
    if (Array.isArray(items) && items.length > 0) {
      const firstItem = items[0]
      itemCode = firstItem.item_code || firstItem.item || firstItem.sku || ''
      itemName = firstItem.item_name || firstItem.name || firstItem.description || ''
    }

    if (!itemCode || !itemName) {
      const bomFGList = soDetails.bom_finished_goods || []
      if (Array.isArray(bomFGList) && bomFGList.length > 0) {
        const firstItem = bomFGList[0]
        itemCode = itemCode || firstItem.item_code || firstItem.component_code || firstItem.item || firstItem.sku || 'FG Item'
        itemName = itemName || firstItem.item_name || firstItem.component_description || firstItem.item_description || firstItem.description || firstItem.name || 'Finished Good'
      }
    }

    if (!itemCode) itemCode = 'FG Item'
    if (!itemName) itemName = 'Finished Good'

    let quantity = salesOrderQty || 1
    if (!quantity || quantity === 1) {
      const firstItemQty = items.length > 0 ? (items[0].qty || items[0].quantity || items[0].ordered_qty) : undefined
      if (firstItemQty) {
        quantity = parseFloat(firstItemQty) || 1
      }
    }

    setSalesOrderQuantity(quantity)

    const enrichedDetails = {
      ...soDetails,
      item_code: itemCode,
      item_name: itemName
    }
    setSelectedSalesOrderDetails(enrichedDetails)

    const fg = {
      item_code: itemCode,
      item_name: itemName,
      quantity: quantity,
      sales_order_quantity: quantity,
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }

    const bomId = soDetails.bom_id || soDetails.bom_no
    if (bomId) {
      setSelectedBomId(bomId)

      let bomData = null
      const bomFinishedGoodsFromSO = soDetails.bom_finished_goods || []
      const bomRawMaterialsFromSO = soDetails.bom_raw_materials || []
      const bomOperationsFromSO = soDetails.bom_operations || []

      if (bomFinishedGoodsFromSO.length === 0 || bomRawMaterialsFromSO.length === 0 || bomOperationsFromSO.length === 0) {
        bomData = await fetchBOMDetails(bomId)
      }

      // For a Finished Good BOM, the lines ARE sub-assemblies
      const bomLines = bomData?.lines || bomData?.items || []

      console.log('=== PRODUCTION PLANNING: FETCHING SUB-ASSEMBLIES ===')
      console.log('BOM ID:', bomId)
      console.log('BOM Lines (these are Sub-Assemblies for FG):', bomLines.length)
      bomLines.forEach((item, idx) => {
        const scrapPct = item.loss_percentage || item.item_loss_percentage || 0
        console.log(`Line ${idx + 1}: Code=${item.component_code || item.item_code}, Name=${item.component_description || item.item_name}, Qty=${item.quantity || item.qty}, Scrap%=${scrapPct}`)
      })

      // Set Finished Good from BOM metadata
      const fgFromBOM = {
        item_code: bomData?.item_code || itemCode,
        item_name: bomData?.product_name || itemName,
        quantity: quantity,
        sales_order_quantity: quantity,
        bom_id: bomId,
        planned_start_date: new Date().toISOString().split('T')[0],
        planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
      setFGItems([fgFromBOM])
      console.log('✓ Finished Good set:', fgFromBOM)

      // All lines in a FG BOM are Sub-Assemblies
      if (bomLines.length > 0) {
        const subAsmItemsFromBOM = bomLines.map(subAsmItem => {
          const baseQty = subAsmItem.quantity || subAsmItem.qty || subAsmItem.bom_qty || 1
          const totalQtyBeforeScrap = baseQty * quantity
          const scrapPercentage = parseFloat(subAsmItem.loss_percentage || subAsmItem.item_loss_percentage || 0)
          const qtyAfterScrap = totalQtyBeforeScrap + (totalQtyBeforeScrap * scrapPercentage / 100)

          return {
            item_code: subAsmItem.component_code || subAsmItem.item_code,
            item_name: subAsmItem.component_description || subAsmItem.item_name,
            bom_no: subAsmItem.bom_no || subAsmItem.bom_id,
            bom_id: subAsmItem.bom_no || subAsmItem.bom_id,
            quantity: qtyAfterScrap,
            qty_before_scrap: totalQtyBeforeScrap,
            scrap_percentage: scrapPercentage,
            qty_after_scrap: qtyAfterScrap,
            planned_qty_before_scrap: totalQtyBeforeScrap,
            planned_qty: qtyAfterScrap,
            sales_order_quantity: quantity,
            fg_sub_assembly: 'Sub-Assembly',
            component_type: subAsmItem.component_type || 'Sub-Assembly',
            planned_start_date: new Date().toISOString().split('T')[0],
            planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        })
        console.log('✓ Extracted Sub-Assemblies from BOM Lines:', subAsmItemsFromBOM.length)
        subAsmItemsFromBOM.forEach((item, idx) => {
          console.log(`  Sub-Assembly ${idx + 1}: ${item.item_code} | Qty Before Scrap: ${item.qty_before_scrap.toFixed(2)} | Scrap%: ${item.scrap_percentage}% | Qty After Scrap: ${item.qty_after_scrap.toFixed(2)}`)
        })
        console.log('Sub-Assemblies:', subAsmItemsFromBOM)
        setSubAssemblyItems(subAsmItemsFromBOM)

        await fetchSubAssemblyBomMaterials(subAsmItemsFromBOM)
      } else {
        console.warn('⚠️ No sub-assemblies found in BOM lines')
        setSubAssemblyItems([])
        setSubAssemblyBomMaterials([])
      }

      const allMaterials = bomRawMaterialsFromSO.length > 0 ? bomRawMaterialsFromSO : (bomData?.rawMaterials || bomData?.bom_raw_materials || [])
      const proportionalMaterials = allMaterials
        .filter(mat => mat.item_group !== 'Consumable')
        .map(mat => ({
          ...mat,
          quantity: (mat.qty || mat.quantity || 0) * quantity,
          rate: mat.rate || 0,
          bom_qty: mat.qty || mat.quantity || 0,
          sales_order_quantity: quantity
        }))

      setRawMaterialItems(proportionalMaterials)

      const allOperations = bomOperationsFromSO.length > 0 ? bomOperationsFromSO : (bomData?.operations || bomData?.bom_operations || [])

      const fgOpsData = bomData?.bom_operations_fg || bomData?.fg_operations || allOperations.filter(op => op.for_finished_goods === true) || []
      const fgOpsToDisplay = fgOpsData.length > 0 ? fgOpsData : allOperations

      const proportionalFGOperations = fgOpsToDisplay.map(op => ({
        ...op,
        proportional_time: (op.time || op.operation_time || 0) * quantity
      }))

      const proportionalOperations = allOperations.map(op => ({
        ...op,
        proportional_time: (op.time || op.operation_time || 0) * quantity
      }))

      setFGOperations(proportionalFGOperations)
      setOperationItems(proportionalOperations)
    } else {
      setFGItems([fg])
    }
  }

  const fetchNestedMaterialDetails = async (subAsmCode, bomId) => {
    const detailKey = `${subAsmCode}-${bomId}`

    if (nestedMaterialsData[detailKey]) {
      setExpandedMaterialDetails(prev => ({
        ...prev,
        [detailKey]: !prev[detailKey]
      }))
      return
    }

    try {
      const token = localStorage.getItem('token')
      const nestedMaterials = []

      let bomDetailsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (!bomDetailsResponse.ok && bomDetailsResponse.status === 404) {
        console.warn(`BOM ID ${bomId} not found, trying to fetch BOMs list...`)
        try {
          const bomListResponse = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?limit=1000`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (bomListResponse.ok) {
            const bomListData = await bomListResponse.json()
            const bomList = bomListData.data || []
            const foundBom = bomList.find(b => b.bom_id === bomId || b.item_code === bomId)
            if (foundBom) {
              bomDetailsResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/production/boms/${foundBom.bom_id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              )
            } else {
              console.warn(`No BOM found for ${bomId}`)
            }
          }
        } catch (fallbackErr) {
          console.error('Error in BOM fallback lookup:', fallbackErr)
        }
      }

      if (!bomDetailsResponse.ok) {
        console.warn(`BOM ${bomId} not found, skipping nested material details`)
        setNestedMaterialsData(prev => ({ ...prev, [detailKey]: [] }))
        setExpandedMaterialDetails(prev => ({ ...prev, [detailKey]: false }))
        return
      }

      const bomDetails = await bomDetailsResponse.json()
      let bom = bomDetails.data || bomDetails

      if (!bom) {
        console.warn(`No BOM data returned for ${bomId}`)
        setNestedMaterialsData(prev => ({ ...prev, [detailKey]: [] }))
        setExpandedMaterialDetails(prev => ({ ...prev, [detailKey]: false }))
        return
      }

      if (Array.isArray(bom)) {
        bom = bom[0]
      }
      console.log('BOM data fetched:', bom)

      const bomLines = bom.rawMaterials || bom.lines || bom.bom_raw_materials || []
      console.log('BOM raw materials:', bomLines)

      let bomList = boms && boms.length > 0 ? boms : []
      if (bomList.length === 0) {
        const bomListResponse = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (bomListResponse.ok) {
          const bomListData = await bomListResponse.json()
          bomList = bomListData.data || []
        } else {
          console.warn('Failed to fetch BOM list')
        }
      }
      console.log('Available BOMs:', bomList)

      for (const material of bomLines) {
        const itemCode = (material.item_code || material.component_code || '').trim()
        const itemName = material.item_name || material.component_description || ''

        if (!itemCode) continue

        const matchingBom = bomList.find(b => {
          const bomItemCode = (b.item_code || b.product_code || '').trim()
          return bomItemCode.toLowerCase() === itemCode.toLowerCase()
        })

        if (matchingBom) {
          console.log(`Found matching BOM for ${itemCode}:`, matchingBom)

          const subBomDetailsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/production/boms/${matchingBom.bom_id}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )

          if (!subBomDetailsResponse.ok) {
            console.warn(`Failed to fetch sub-BOM ${matchingBom.bom_id}`)
            continue
          }

          const subBomDetails = await subBomDetailsResponse.json()
          const subBom = subBomDetails.data || subBomDetails
          console.log(`Sub-BOM details for ${itemCode}:`, subBom)

          const subMaterials = subBom.rawMaterials || subBom.bom_raw_materials || []
          const operations = subBom.operations || subBom.bom_operations || []

          subMaterials.forEach(subMat => {
            if (subMat.item_group === 'Consumable') return

            const subBomQty = subMat.qty || subMat.quantity || 1
            const parentBomQty = material.qty || material.quantity || 1
            const actualQty = subBomQty * parentBomQty * salesOrderQuantity
            nestedMaterials.push({
              parent_code: itemCode,
              parent_name: itemName,
              parent_bom_id: matchingBom.bom_id,
              item_code: subMat.item_code || subMat.component_code,
              item_name: subMat.item_name || subMat.component_description,
              item_group: subMat.item_group || 'N/A',
              qty: actualQty,
              bom_qty: subBomQty,
              parent_bom_qty: parentBomQty,
              operations_qty: operations.length > 0 ? operations.reduce((sum, op) => sum + (op.operation_time || op.time || 0), 0) : 0,
              operations_count: operations.length
            })
          })
        } else {
          console.warn(`No matching BOM found for item code: ${itemCode}`)
        }
      }

      console.log('Nested materials collected:', nestedMaterials)

      setNestedMaterialsData(prev => ({
        ...prev,
        [detailKey]: nestedMaterials
      }))

      setExpandedMaterialDetails(prev => ({
        ...prev,
        [detailKey]: true
      }))
    } catch (err) {
      console.error('Error fetching nested material details:', err)
      setNestedMaterialsData(prev => ({ ...prev, [detailKey]: [] }))
      setExpandedMaterialDetails(prev => ({ ...prev, [detailKey]: false }))
    }
  }

  const fetchMaterialOperations = async (materialItemCode, subAsmCode, bomId) => {
    const opKey = `${subAsmCode}-${bomId}-${materialItemCode}-mat-ops`

    if (materialOperationsData[opKey]) {
      setExpandedMaterialOps(prev => ({
        ...prev,
        [opKey]: !prev[opKey]
      }))
      return
    }

    try {
      const token = localStorage.getItem('token')

      let bomList = boms && boms.length > 0 ? boms : []
      if (bomList.length === 0) {
        const bomListResponse = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?limit=1000`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (bomListResponse.ok) {
          const bomListData = await bomListResponse.json()
          bomList = bomListData.data || []
        } else {
          console.warn('Failed to fetch BOM list for material operations')
        }
      }

      const matchingBom = bomList.find(b => {
        const bomItemCode = (b.item_code || b.product_code || '').trim()
        return bomItemCode.toLowerCase() === materialItemCode.trim().toLowerCase()
      })

      let operations = []
      if (matchingBom) {
        console.log(`Found matching BOM for material ${materialItemCode}:`, matchingBom)
        const bomDetailsResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/production/boms/${matchingBom.bom_id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (!bomDetailsResponse.ok) {
          console.warn(`Failed to fetch BOM ${matchingBom.bom_id}`)
        } else {
          const bomDetails = await bomDetailsResponse.json()
          const bom = bomDetails.data || bomDetails
          operations = bom.operations || bom.bom_operations || []
          console.log(`Operations for ${materialItemCode}:`, operations)
        }
      } else {
        console.warn(`No matching BOM found for material: ${materialItemCode}`)
      }

      setMaterialOperationsData(prev => ({
        ...prev,
        [opKey]: operations
      }))

      setExpandedMaterialOps(prev => ({
        ...prev,
        [opKey]: true
      }))
    } catch (err) {
      console.error(`Error fetching operations for material ${materialItemCode}:`, err)
      alert('Failed to fetch material operations')
    }
  }

  const fetchBomOperations = async (bomId) => {
    if (bomOperationsData[bomId]) {
      setExpandedBomOps(prev => ({
        ...prev,
        [bomId]: !prev[bomId]
      }))
      return
    }

    try {
      const token = localStorage.getItem('token')

      const bomDetailsResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      let operations = []
      if (!bomDetailsResponse.ok) {
        console.warn(`Failed to fetch BOM ${bomId}`)
      } else {
        const bomDetails = await bomDetailsResponse.json()
        const bom = bomDetails.data || bomDetails
        operations = bom.operations || bom.bom_operations || []
        console.log(`Fetched operations for BOM ${bomId}:`, operations)
      }

      setBomOperationsData(prev => ({
        ...prev,
        [bomId]: operations
      }))

      setExpandedBomOps(prev => ({
        ...prev,
        [bomId]: true
      }))
    } catch (err) {
      console.error(`Error fetching operations for BOM ${bomId}:`, err)
      alert('Failed to fetch BOM operations')
    }
  }

  const createWorkOrders = async () => {
    try {
      setCreatingWorkOrders(true)
      const token = localStorage.getItem('token')

      if (subAssemblyBomMaterials.length === 0 && fgItems.length === 0) {
        alert('Please fetch sub-assembly materials and add finished goods first')
        return
      }

      const createdWorkOrders = []

      console.log('=== STEP 1: Creating work orders for sub-assemblies ===')

      const subAsmToProcess = subAssemblyItems.map(item => ({
        item_code: item.item_code,
        item_name: item.item_name,
        quantity: item.planned_qty || item.quantity,
        bom_id: item.bom_id || item.bom_no || (subAssemblyBomMaterials.find(m => m.sub_assembly_code === item.item_code)?.bom_id),
        operations: bomOperationsData[item.bom_id || item.bom_no] || []
      }))

      console.log(`Creating ${subAsmToProcess.length} sub-assembly work orders...`)

      for (const subAsm of subAsmToProcess) {
        try {
          console.log(`Creating work order for sub-assembly: ${subAsm.item_code} with quantity ${subAsm.quantity}`)

          let operations = subAsm.operations || []
          let finalBomId = subAsm.bom_id

          if (!finalBomId) {
            console.log(`No BOM ID found for sub-assembly ${subAsm.item_code}, fetching...`)
            try {
              const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?item_code=${subAsm.item_code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              if (bomRes.ok) {
                const bomData = await bomRes.json()
                const boms = bomData.data || []
                if (boms.length > 0) {
                  finalBomId = boms[0].bom_id || boms[0].id
                }
              }
            } catch (err) {
              console.warn(`Could not fetch BOM for sub-assembly ${subAsm.item_code}:`, err)
            }
          }

          if (operations.length === 0 && finalBomId) {
            console.log(`No operations found for BOM ${finalBomId}, fetching from API...`)
            try {
              const bomDetailsResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/production/boms/${finalBomId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              )
              if (bomDetailsResponse.ok) {
                const bomDetails = await bomDetailsResponse.json()
                const bom = bomDetails.data || bomDetails
                operations = bom.bom_operations || bom.operations || []
              }
            } catch (err) {
              console.warn(`Could not fetch operations for BOM ${finalBomId}:`, err)
            }
          }

          const woPayload = {
            item_code: subAsm.item_code,
            quantity: subAsm.quantity,
            bom_no: finalBomId,
            priority: 'medium',
            notes: `Sub-assembly for production plan ${planHeader.plan_id}`,
            sales_order_id: selectedSalesOrders[0] || null,
            planned_start_date: new Date().toISOString().split('T')[0],
            operations: operations.map(op => ({
              operation_name: op.operation_name || op.operation || '',
              workstation_type: op.workstation || op.machine_id || '',
              operation_time: op.time || op.operation_time || 0,
              notes: op.notes || ''
            }))
          }

          const woResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/production/work-orders`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(woPayload)
            }
          )

          if (woResponse.ok) {
            const woData = await woResponse.json()
            const jobCardsCount = woData.jobCardsCreated || 0
            createdWorkOrders.push({
              type: 'sub-assembly',
              work_order_id: woData.data?.wo_id,
              item_code: subAsm.item_code,
              item_name: subAsm.item_name,
              jobCardsCreated: jobCardsCount
            })
            console.log(`✓ Created work order ${woData.data?.wo_id} with ${jobCardsCount} job cards`)
          } else {
            const errorData = await woResponse.json()
            console.error(`Failed to create work order for ${subAsm.item_code}:`, errorData)
          }
        } catch (err) {
          console.error(`Error creating work order for sub-assembly ${subAsm.item_code}:`, err)
        }
      }

      console.log('=== STEP 2: Creating work orders for finished goods ===')
      console.log(`Creating ${fgItems.length} finished goods work orders...`)

      for (const fgItem of fgItems) {
        try {
          console.log(`Creating work order for finished good: ${fgItem.item_code}`)

          let bomIdForFG = fgItem.bom_id || selectedBomId
          let fgOpsToSend = fgOperations.length > 0 ? fgOperations : operationItems

          if (!bomIdForFG) {
            console.log(`No BOM ID found for ${fgItem.item_code}, attempting to fetch BOM...`)
            try {
              const bomRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms?item_code=${fgItem.item_code}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              if (bomRes.ok) {
                const bomData = await bomRes.json()
                const boms = bomData.data || []
                if (boms.length > 0) {
                  bomIdForFG = boms[0].bom_id || boms[0].id
                  console.log(`Found BOM for ${fgItem.item_code}: ${bomIdForFG}`)

                  const bomDetailsResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/production/boms/${bomIdForFG}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  )
                  if (bomDetailsResponse.ok) {
                    const bomDetails = await bomDetailsResponse.json()
                    const bom = bomDetails.data || bomDetails
                    const allOps = bom.bom_operations || bom.operations || []
                    fgOpsToSend = allOps
                  }
                }
              }
            } catch (err) {
              console.warn(`Could not fetch BOM for ${fgItem.item_code}:`, err)
            }
          }

          const fgWoPayload = {
            item_code: fgItem.item_code,
            quantity: fgItem.planned_qty || fgItem.quantity || salesOrderQuantity,
            bom_no: bomIdForFG || null,
            priority: 'high',
            notes: `Finished good for production plan ${planHeader.plan_id}`,
            sales_order_id: selectedSalesOrders[0] || null,
            planned_start_date: fgItem.planned_start_date || new Date().toISOString().split('T')[0],
            operations: fgOpsToSend.map(op => ({
              operation_name: op.operation_name || op.operation || '',
              workstation_type: op.workstation || op.machine_id || op.workstation_type || '',
              operation_time: op.time || op.operation_time || op.proportional_time || 0,
              notes: op.notes || ''
            }))
          }

          const fgWoResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/production/work-orders`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fgWoPayload)
            }
          )

          if (fgWoResponse.ok) {
            const fgWoData = await fgWoResponse.json()
            const jobCardsCount = fgWoData.jobCardsCreated || 0
            createdWorkOrders.push({
              type: 'finished-good',
              work_order_id: fgWoData.data?.wo_id,
              item_code: fgItem.item_code,
              item_name: fgItem.item_name,
              jobCardsCreated: jobCardsCount
            })
            console.log(`✓ Created work order ${fgWoData.data?.wo_id} with ${jobCardsCount} job cards`)
          } else {
            const errorData = await fgWoResponse.json()
            console.error(`Failed to create work order for ${fgItem.item_code}:`, errorData)
          }
        } catch (err) {
          console.error(`Error creating work order for finished good ${fgItem.item_code}:`, err)
        }
      }

      const subAsmCount = createdWorkOrders.filter(wo => wo.type === 'sub-assembly').length
      const fgCount = createdWorkOrders.filter(wo => wo.type === 'finished-good').length
      const totalJobCards = createdWorkOrders.reduce((sum, wo) => sum + (wo.jobCardsCreated || 0), 0)

      console.log('=== WORK ORDER CREATION COMPLETE ===')
      console.log(`✓ Sub-assembly work orders: ${subAsmCount}`)
      console.log(`✓ Finished goods work orders: ${fgCount}`)
      console.log(`✓ Total work orders: ${createdWorkOrders.length}`)
      console.log(`✓ Total job cards created: ${totalJobCards}`)

      setSuccess(`Created ${subAsmCount} sub-assembly + ${fgCount} finished goods = ${createdWorkOrders.length} work orders with ${totalJobCards} job cards`)

      setTimeout(() => {
        navigate('/manufacturing/work-orders')
      }, 2500)
    } catch (err) {
      console.error('Error creating work orders:', err)
      setError(`Failed to create work orders: ${err.message}`)
    } finally {
      setCreatingWorkOrders(false)
    }
  }

  const _oldFetchSubAssemblyBomMaterials = async () => {
    console.log('=== fetchSubAssemblyBomMaterials CALLED ===')
    console.log('rawMaterialItems:', rawMaterialItems)
    console.log('salesOrderQuantity:', salesOrderQuantity)
    try {
      setFetchingSubAssemblyBoms(true)
      const token = localStorage.getItem('token')
      console.log('Token retrieved:', !!token)

      if (rawMaterialItems.length === 0) {
        console.warn('No raw material items found, returning early')
        alert('No raw material items found')
        return
      }

      const allMaterials = []
      console.log('Processing raw materials with their BOMs...')

      for (const rawMat of rawMaterialItems) {
        const itemCode = rawMat.item_code
        const bomId = rawMat.bom_id
        console.log(`Processing raw material: ${itemCode}, BOM ID: ${bomId}`)

        if (!bomId) {
          console.warn(`No BOM ID found for ${itemCode}`)
          continue
        }

        try {
          console.log(`Fetching BOM details for ${bomId}...`)
          let bomDetailsResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          console.log(`BOM details response status: ${bomDetailsResponse.status}`)

          if (!bomDetailsResponse.ok && bomDetailsResponse.status === 404) {
            console.warn(`BOM ID ${bomId} not found, trying to fetch BOM by item code ${itemCode}...`)
            try {
              const bomListResponse = await fetch(
                `${import.meta.env.VITE_API_URL}/production/boms?item_code=${itemCode}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              )
              if (bomListResponse.ok) {
                const bomListData = await bomListResponse.json()
                const bomList = bomListData.data || []
                if (bomList.length > 0) {
                  console.log(`Found BOM for item ${itemCode}:`, bomList[0].bom_id)
                  bomDetailsResponse = await fetch(
                    `${import.meta.env.VITE_API_URL}/production/boms/${bomList[0].bom_id}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                  )
                } else {
                  console.warn(`No BOM found for item ${itemCode}`)
                }
              }
            } catch (fallbackErr) {
              console.error('Error in BOM fallback lookup:', fallbackErr)
            }
          }

          if (bomDetailsResponse.ok) {
            let bomDetails = await bomDetailsResponse.json()
            let bom = bomDetails.data || bomDetails

            if (Array.isArray(bom)) {
              bom = bom[0]
            }

            console.log(`BOM details for ${itemCode}:`, bom)

            const materials = bom.bom_raw_materials || bom.rawMaterials || bom.lines || []
            const operations = bom.bom_operations || bom.operations || []
            console.log(`Materials found: ${materials.length}, Operations found: ${operations.length}`)

            const actualBomId = bom.bom_id || bomId

            materials.forEach(material => {
              if (material.item_group === 'Consumable') {
                console.log(`Skipping consumable: ${material.item_code}`)
                return
              }

              const bomQty = material.qty || material.quantity || 1
              const actualQty = bomQty * salesOrderQuantity
              console.log(`Adding material: ${material.item_code}, BOM qty: ${bomQty}, Actual qty: ${actualQty}`)
              allMaterials.push({
                bom_id: actualBomId,
                sub_assembly_code: itemCode,
                sub_assembly_name: rawMat.item_name,
                item_code: material.item_code || material.component_code,
                item_name: material.item_name || material.component_description,
                item_group: material.item_group || 'N/A',
                qty: actualQty,
                bom_qty: bomQty,
                operations_qty: operations.length > 0 ? operations.reduce((sum, op) => sum + (op.operation_time || op.time || 0), 0) : 0,
                operations_count: operations.length,
                operations: operations
              })
            })
          } else {
            console.warn(`Failed to fetch BOM details for ${bomId}: ${bomDetailsResponse.status}`)
          }
        } catch (err) {
          console.error(`Error fetching BOM for ${itemCode}:`, err)
        }
      }

      console.log('All materials collected:', allMaterials.length)
      console.log('All materials data:', allMaterials)
      setSubAssemblyBomMaterials(allMaterials)
      console.log('State updated with sub-assembly materials')

      if (allMaterials.length > 0) {
        console.log('Expanding section 3.5 and fetching operations...')
        setExpandedSections(prev => ({ ...prev, 3.5: true }))

        const uniqueBomIds = new Set(allMaterials.map(m => m.bom_id))
        console.log('Unique BOM IDs to fetch operations for:', Array.from(uniqueBomIds))
        const bomOpsData = {}
        const expandedOpsState = {}

        for (const bomId of uniqueBomIds) {
          console.log(`Processing operations for BOM ${bomId}...`)
          try {
            const bomDetailsResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/production/boms/${bomId}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            )

            if (bomDetailsResponse.ok) {
              const bomDetails = await bomDetailsResponse.json()
              const bom = bomDetails.data || bomDetails
              const operations = bom.bom_operations || bom.operations || []

              bomOpsData[bomId] = operations
              expandedOpsState[bomId] = true
            }
          } catch (err) {
            console.error(`Error fetching operations for BOM ${bomId}:`, err)
          }
        }

        setBomOperationsData(prev => ({ ...prev, ...bomOpsData }))
        setExpandedBomOps(prev => ({ ...prev, ...expandedOpsState }))
      }
    } catch (err) {
      console.error('=== ERROR in fetchSubAssemblyBomMaterials ===')
      console.error('Error details:', err)
      console.error('Error message:', err.message)
      console.error('Error stack:', err.stack)
      alert('Failed to fetch sub-assembly BOM materials: ' + err.message)
    } finally {
      console.log('=== fetchSubAssemblyBomMaterials COMPLETED ===')
      setFetchingSubAssemblyBoms(false)
    }
  }

  const saveProductionPlan = async () => {
    try {
      setSavingPlan(true)
      setError(null)
      const token = localStorage.getItem('token')

      if (!selectedSalesOrders.length) {
        setError('Please select a sales order')
        return
      }

      if (!fgItems.length) {
        setError('Please add at least one finished good item')
        return
      }

      const payloadPlanId = planHeader.plan_id || `PP-${Date.now()}`

      const planPayload = {
        plan_id: payloadPlanId,
        naming_series: planHeader.naming_series || 'PP',
        company: planHeader.company || '',
        sales_order_id: selectedSalesOrders[0],
        status: planHeader.status || 'draft',
        bom_id: selectedBomId || '',
        plan_date: new Date().toISOString().split('T')[0],
        week_number: null
      }

      let planResponse
      if (plan_id) {
        planResponse = await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${plan_id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...planPayload,
            fg_items: fgItems,
            sub_assemblies: subAssemblyItems,
            raw_materials: rawMaterialItems,
            fg_operations: fgOperations,
            operations: operationItems
          })
        })
      } else {
        planResponse = await fetch(`${import.meta.env.VITE_API_URL}/production-planning`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(planPayload)
        })
      }

      if (!planResponse.ok) {
        const errorData = await planResponse.json()
        setError(errorData.message || 'Failed to save production plan')
        return
      }

      const planResult = await planResponse.json()
      const savedPlanId = planResult.data?.plan_id || payloadPlanId

      setPlanHeader(prev => ({
        ...prev,
        plan_id: savedPlanId
      }))

      if (fgItems.length > 0) {
        for (const item of fgItems) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${savedPlanId}/fg-items`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                item_code: item.item_code,
                item_name: item.item_name,
                planned_qty: item.quantity || item.planned_qty || 1,
                planned_start_date: item.planned_start_date,
                planned_end_date: item.planned_end_date
              })
            })
          } catch (err) {
            console.error('Error adding FG item:', err)
          }
        }
      }

      if (subAssemblyItems.length > 0) {
        for (const item of subAssemblyItems) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${savedPlanId}/sub-assembly-items`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                item_code: item.item_code,
                item_name: item.item_name,
                planned_qty: item.quantity || item.planned_qty || 1,
                scheduled_date: item.planned_start_date
              })
            })
          } catch (err) {
            console.error('Error adding sub-assembly item:', err)
          }
        }
      }

      if (rawMaterialItems.length > 0) {
        for (const item of rawMaterialItems) {
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/production-planning/${savedPlanId}/raw-material-items`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                item_code: item.item_code,
                item_name: item.item_name,
                qty: item.quantity || item.qty || 0,
                plan_to_request_qty: item.quantity || item.qty || 0,
                for_warehouse: item.for_warehouse || item.source_warehouse,
                rate: item.rate || 0
              })
            })
          } catch (err) {
            console.error('Error adding raw material item:', err)
          }
        }
      }

      setSuccess(`Production Plan ${savedPlanId} saved successfully!`)
      setTimeout(() => setSuccess(null), 3000)

      if (!plan_id) {
        setTimeout(() => {
          navigate(`/manufacturing/production-planning/${savedPlanId}`)
        }, 1000)
      }
    } catch (err) {
      console.error('Error saving production plan:', err)
      setError(`Failed to save production plan: ${err.message}`)
    } finally {
      setSavingPlan(false)
    }
  }

  const prepareWorkOrderData = async () => {
    if (!selectedSalesOrderDetails || !fgItems.length) {
      setError('Please select a sales order and ensure FG items are loaded')
      return null
    }

    try {
      const fgItem = fgItems[0]
      const salesOrderId = selectedSalesOrders[0]
      const soDetails = await fetchSalesOrderDetails(salesOrderId)

      const requiredItems = rawMaterialItems.map((item, idx) => {
        const baseBomQty = item.plan_to_request_qty || item.qty_as_per_bom || 0
        const proportionalQty = baseBomQty * salesOrderQuantity
        const itemRate = item.rate || 0
        return {
          item_code: item.item_code || '',
          source_warehouse: item.for_warehouse || '',
          required_qty: proportionalQty,
          rate: itemRate,
          sales_order_quantity: salesOrderQuantity,
          bom_qty: baseBomQty,
          sequence: idx + 1
        }
      })

      let operations = operationItems
      if (!operations || operations.length === 0) {
        const bomId = selectedBomId || fgItem.bom_no
        if (bomId) {
          const bomDetails = await fetchBOMDetails(bomId)
          operations = bomDetails?.operations || bomDetails?.bom_operations || []
        }
      }

      const soQty = fgItem.sales_order_quantity || salesOrderQuantity || 1
      const operationsPayload = operations.map((op, idx) => ({
        operation: op.operation || op.operation_name || op.name || '',
        workstation: op.workstation || op.workstation_type || op.default_workstation || '',
        time: op.proportional_time !== undefined ? op.proportional_time : (op.time || op.operation_time || 0),
        sequence: idx + 1
      }))

      const woData = {
        item_code: fgItem.item_code || fgItem.component_code || '',
        bom_no: selectedBomId || fgItem.bom_no || '',
        quantity: soQty,
        sales_order_quantity: soQty,
        priority: 'Medium',
        notes: `From Production Plan: ${planHeader.plan_id}`,
        sales_order_id: salesOrderId,
        planned_start_date: fgItem.planned_start_date || new Date().toISOString().split('T')[0],
        planned_end_date: fgItem.planned_end_date || new Date().toISOString().split('T')[0],
        actual_start_date: fgItem.actual_start_date || null,
        actual_end_date: fgItem.actual_end_date || null,
        expected_delivery_date: fgItem.expected_delivery_date || soDetails?.delivery_date || null,
        required_items: requiredItems,
        operations: operationsPayload,
        production_plan_id: planHeader.plan_id
      }

      setWorkOrderData(woData)
      setShowWorkOrderModal(true)
      return woData
    } catch (err) {
      console.error('Error preparing work order data:', err)
      setError('Failed to prepare work order data')
      return null
    }
  }

  const handleCreateWorkOrder = async () => {
    if (!workOrderData) return

    try {
      setCreatingWorkOrder(true)
      setError(null)
      const token = localStorage.getItem('token')

      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/work-orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workOrderData)
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess('Work Order created successfully!')
        setShowWorkOrderModal(false)
        setWorkOrderData(null)

        setTimeout(() => {
          navigate('/manufacturing/work-orders')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to create work order')
      }
    } catch (err) {
      console.error('Error creating work order:', err)
      setError(`Failed to create work order: ${err.message}`)
    } finally {
      setCreatingWorkOrder(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-2 gap-4">
        <div className="relative">
          <div className="w-6 h-6  border-4 border-indigo-100 border-t-indigo-600  rounded  animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <ClipboardCheck size={16} className="text-indigo-600" />
          </div>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-xs  text-slate-900  text-xs  ">Loading Plan</p>
          <p className="text-xs   text-slate-400  text-xs  ">Fetching strategic data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className=" px-4 sm:p-6  lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/manufacturing/production-planning')}
                className="p-2 hover:bg-slate-100 rounded transition-colors text-slate-500"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="h-8 w-px bg-slate-200"></div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs   text-indigo-600  text-xs   bg-indigo-50 px-2 py-0.5 rounded">
                    {planHeader.naming_series || 'PP'}
                  </span>
                  <span className="text-xs   text-slate-400">/</span>
                  <h1 className="text-xs  text-slate-900 text-xstracking-tight">
                    {plan_id ? plan_id : 'NEW PRODUCTION PLAN'}
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={planHeader.status} />
                  </div>
                  {planHeader.company && (
                    <>
                      <div className="w-1 h-1  rounded  bg-slate-300"></div>
                      <span className="text-xs   text-slate-400  text-xs   flex items-center gap-1">
                        <Factory size={10} />
                        {planHeader.company}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/manufacturing/production-planning')}
                className="p-2 text-xs   text-slate-500  text-xs   hover:bg-slate-100 rounded transition-all"
              >
                Discard Changes
              </button>
              <button
                onClick={saveProductionPlan}
                disabled={savingPlan || !selectedSalesOrders.length}
                className="flex items-center gap-2 p-2  py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all "
              >
                <Save size={16} />
                <span className="text-xs    text-xs  ">
                  {savingPlan ? 'Saving Plan...' : 'Save Strategic Plan'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className=" p-2">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-2 bg-rose-50 border border-rose-100 rounded flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="text-rose-600 mt-0.5" />
            <div>
              <p className="text-xs   text-rose-600  text-xs   mb-1">Error Encountered</p>
              <p className="text-xs  text-rose-500">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <X size={16} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-2 bg-emerald-50 border border-emerald-100 rounded flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <Check size={18} className="text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs   text-emerald-600  text-xs   mb-1">Success</p>
              <p className="text-xs  text-emerald-500">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Horizontal Top Navigation */}
          <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md p-2 border-b border-slate-200 ">
            <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-2">
              <NavItem
                label="01 STRATEGIC PARAMETERS"
                icon={Settings}
                section="parameters"
                isActive={activeSection === 'parameters'}
                onClick={scrollToSection}
                themeColor="indigo"
              />
              <NavItem
                label="02 PRODUCTION SCOPE"
                icon={Layout}
                section="scope"
                isActive={activeSection === 'scope'}
                onClick={scrollToSection}
                themeColor="blue"
              />
              <NavItem
                label="03 MATERIAL REQUIREMENTS"
                icon={Boxes}
                section="requirements"
                isActive={activeSection === 'requirements'}
                onClick={scrollToSection}
                themeColor="amber"
              />
              {subAssemblyItems.length > 0 && (
                <NavItem
                  label="04 SUB-ASSEMBLY MAPPING"
                  icon={Activity}
                  section="subassembly"
                  isActive={activeSection === 'subassembly'}
                  onClick={scrollToSection}
                  themeColor="rose"
                />
              )}
              {operationItems.length > 0 && (
                <NavItem
                  label="05 PRODUCTION OPERATIONS"
                  icon={Zap}
                  section="operations"
                  isActive={activeSection === 'operations'}
                  onClick={scrollToSection}
                  themeColor="emerald"
                />
              )}

              {/* Compact Planning Insight (moved to top bar) */}
              {(() => {
                const sectionThemes = {
                  parameters: 'bg-indigo-600 shadow-indigo-100 text-indigo-200',
                  scope: 'bg-blue-600 shadow-blue-100 text-blue-200',
                  requirements: 'bg-amber-600 shadow-amber-100 text-amber-200',
                  subassembly: 'bg-rose-600 shadow-rose-100 text-rose-200',
                  operations: 'bg-emerald-600 shadow-emerald-100 text-emerald-200'
                }
                const currentTheme = sectionThemes[activeSection] || sectionThemes.parameters
                const bgClass = currentTheme.split(' ')[0]
                const shadowClass = currentTheme.split(' ')[1]
                const iconClass = currentTheme.split(' ')[2]

                return (
                  <div className={`ml-auto flex items-center gap-4 ${bgClass} p-2 rounded text-white shadow-lg ${shadowClass} min-w-[200px] transition-all duration-500`}>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs   mb-1">
                        <span className="opacity-80 ">PLANNING PULSE</span>
                        <span>0%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-1">
                        <div className="bg-white rounded-full h-full w-0 transition-all duration-1000"></div>
                      </div>
                    </div>
                    <TrendingUp size={16} className={iconClass} />
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="space-y-4 min-w-0">
            {/* Strategic Parameters Section */}
            <div id="parameters" className={activeSection === 'parameters' ? 'block' : 'hidden lg:block'}>
              <Card>
                <SectionHeader
                  title="01 STRATEGIC PARAMETERS"
                  icon={Settings}
                  subtitle="Core planning identities and source selection"
                  isExpanded={expandedSections.parameters}
                  onToggle={() => toggleSection('parameters')}
                  themeColor="indigo"
                />

                {expandedSections.parameters && (
                  <div className="p-2 space-y-2 animate-in fade-in duration-300">


                    <div className="grid grid-cols-3 gap-4">
                      <FieldWrapper label="Plan Identity" required>
                        <input
                          type="text"
                          disabled
                          value={planHeader.plan_id || 'Auto Generated'}
                          className="w-full p-2  bg-slate-50 border border-slate-200 rounded text-xs text-slate-500 cursor-not-allowed  font-medium"
                        />
                      </FieldWrapper>
                      <FieldWrapper label="Naming Series">
                        <input
                          type="text"
                          value={planHeader.naming_series}
                          onChange={(e) => setPlanHeader(prev => ({ ...prev, naming_series: e.target.value }))}
                          className="w-full p-2  border border-slate-200 rounded text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all  font-medium"
                        />
                      </FieldWrapper>
                      <FieldWrapper label="OPERATIONAL STATUS">
                        <div className="relative">
                          <select
                            value={planHeader.status}
                            onChange={(e) => setPlanHeader(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full p-2  border border-slate-200 rounded text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all  appearance-none font-medium bg-white"
                          >
                            <option value="draft">Draft</option>
                            <option value="planned">Planned</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </FieldWrapper>
                       <FieldWrapper label="Source Sales Order" required>
                      <SearchableSelect
                        options={salesOrders.map(so => ({
                          value: so.sales_order_id || so.name,
                          label: `${so.sales_order_id || so.name} - ${so.customer_name || 'N/A'}`
                        }))}
                        value={selectedSalesOrders[0] || ''}
                        onChange={(value) => {
                          setSelectedSalesOrders([value])
                          handleSalesOrderSelect(value)
                          processSalesOrderData(value)
                        }}
                        placeholder="Select Sales Order..."
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Target Quantity" required>
                      <div className="relative">
                        <input
                          type="number"
                          value={salesOrderQuantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1
                            setSalesOrderQuantity(qty)
                            if (selectedSalesOrders[0]) {
                              processSalesOrderData(selectedSalesOrders[0], qty)
                            }
                          }}
                          min="1"
                          className="w-full pl-4 pr-12 py-2.5 border border-slate-200 rounded text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs    text-slate-400 ">UNIT</div>
                      </div>
                    </FieldWrapper>
                    </div>

                    <div className="h-px bg-slate-100 my-2"></div>

                   
                  </div>
                )}
              </Card>
            </div>

            {/* Production Scope Section */}
            <div id="scope" className={activeSection === 'scope' ? 'block' : 'hidden lg:block'}>
              <Card>
                <SectionHeader
                  title="02 PRODUCTION SCOPE"
                  icon={Layout}
                  subtitle="Finished goods and target fulfillment"
                  badge={`${fgItems.length} ITEMS`}
                  isExpanded={expandedSections.scope}
                  onToggle={() => toggleSection('scope')}
                  themeColor="blue"
                />

                {expandedSections.scope && (
                  <div className="p-2 animate-in fade-in duration-300">
                    {fgItems.length > 0 ? (
                      <div className="space-y-4">
                        {fgItems.map((item, idx) => (
                          <div key={idx} className="group p-2 bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 rounded transition-all duration-300 hover:shadow-lg">
                            <div className="grid grid-cols-12 gap-6">
                              <div className="col-span-12 md:col-span-5">
                                <p className="text-xs   text-blue-400  mb-1.5">FINISHED GOOD</p>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-100">
                                    <Package size={20} strokeWidth={2.5} />
                                  </div>
                                  <div>
                                    <p className="text-xs   text-slate-900 break-words leading-none mb-1">
                                      {item.item_code || selectedSalesOrderDetails?.item_code || 'N/A'}
                                    </p>
                                    <p className="text-xs font-medium text-slate-500 ">
                                      {item.item_name || selectedSalesOrderDetails?.item_name || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="col-span-6 md:col-span-3">
                                <p className="text-xs   text-blue-400  mb-1.5">BILL OF MATERIALS</p>
                                <div className="flex items-center gap-2 p-2  py-1.5 bg-white border border-blue-100 rounded text-xs   text-blue-700  ">
                                  <Layers size={14} className="text-blue-600" />
                                  <p className="font-mono truncate">
                                    {selectedBomId || item.bom_id || item.bom_no || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className="col-span-6 md:col-span-2">
                                <p className="text-xs   text-blue-400  mb-1.5">TARGET QTY</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg   text-blue-600">
                                    {item.planned_qty || item.quantity || item.qty}
                                  </span>
                                  <span className="text-xs   text-slate-400 ">PCS</span>
                                </div>
                              </div>
                              <div className="col-span-12 md:col-span-2">
                                <p className="text-xs    text-slate-400   mb-1.5">START DATE</p>
                                <div className="flex items-center gap-2 text-slate-700">
                                  <Calendar size={14} className="text-slate-400" />
                                  <p className="text-xs  ">
                                    {item.planned_start_date || 'TBD'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-100 rounded  bg-slate-50/50">
                        <div className=" p-2 bg-white    rounded  text-slate-300 mb-4 animate-bounce">
                          <Package size={40} />
                        </div>
                        <p className="text-xs   text-slate-400  ">No items selected</p>
                        <p className="text-xs text-slate-400 mt-2">Select a sales order to begin production planning</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Material Requirements Section */}
            <div id="requirements" className={activeSection === 'requirements' ? 'block' : 'hidden lg:block'}>
              {(rawMaterialItems.length > 0 || subAssemblyBomMaterials.length > 0) && (
                <Card>
                  <SectionHeader
                    title="03 MATERIAL REQUIREMENTS"
                    icon={Boxes}
                    subtitle="Consolidated material explosion across all levels"
                    badge={`${rawMaterialItems.length + subAssemblyBomMaterials.length} TOTAL`}
                    isExpanded={expandedSections.requirements}
                    onToggle={() => toggleSection('requirements')}
                    themeColor="amber"
                    actions={
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const subAsmFromRawMaterials = rawMaterialItems.filter(item =>
                              (item.item_code || '').startsWith('SA-') ||
                              (item.fg_sub_assembly || item.component_type || '').toLowerCase().includes('sub')
                            )
                            if (subAsmFromRawMaterials.length === 0) {
                              alert('No sub-assemblies found in raw materials')
                              return
                            }
                            setFetchingSubAssemblyBoms(true)
                            fetchSubAssemblyBomMaterials(subAsmFromRawMaterials).finally(() => {
                              setFetchingSubAssemblyBoms(false)
                            })
                          }}
                          disabled={fetchingSubAssemblyBoms}
                          className="flex items-center gap-2 p-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-all disabled:opacity-50 text-xs    "
                        >
                          <Zap size={14} />
                          {fetchingSubAssemblyBoms ? 'Exploding...' : 'Explode BOMs'}
                        </button>
                        {subAssemblyBomMaterials.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              createWorkOrders()
                            }}
                            disabled={creatingWorkOrders}
                            className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition-all disabled:opacity-50 text-xs    "
                          >
                            <Plus size={14} />
                            {creatingWorkOrders ? 'Executing...' : 'Generate Orders'}
                          </button>
                        )}
                      </div>
                    }
                  />

                  {expandedSections.requirements && (
                    <div className="p-3 space-y-4 animate-in fade-in duration-300">
                      {/* Primary Raw Materials */}
                      {rawMaterialItems.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs   text-amber-600 flex items-center gap-2 px-1">
                            <div className="w-1.5 h-1.5  rounded  bg-amber-500"></div>
                            CORE MATERIALS
                          </h4>
                          <div className="rounded  border border-amber-100 overflow-hidden bg-white  ">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-amber-50/50 border-b border-amber-100">
                                  <th className="p-2 text-left text-xs   text-amber-700  ">Item Specification</th>
                                  <th className="p-2 text-right text-xs   text-amber-700  ">Required Qty</th>
                                  <th className="p-2 text-left text-xs   text-amber-700  ">Warehouse</th>
                                  <th className="p-2 text-left text-xs   text-amber-700  ">BOM Ref</th>
                                  <th className="p-2 text-center text-xs   text-amber-700  ">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-amber-50">
                                {rawMaterialItems.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-amber-50/20 transition-colors group">
                                    <td className="p-2">
                                      <p className="text-xs   text-slate-900 group-hover:text-amber-600 transition-colors">{item.item_code}</p>
                                      <p className="text-xs  text-slate-400 mt-0.5 truncate max-w-[200px]">{item.item_name}</p>
                                    </td>
                                    <td className="p-2 text-right">
                                      <span className="text-xs   text-amber-600">
                                        {item.quantity || item.qty_as_per_bom}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      <span className="text-xs text-slate-400 tracking-tighter">
                                        {item.for_warehouse || '-'}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      <span className="font-mono text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                        {item.bom_id || item.bom_no || '-'}
                                      </span>
                                    </td>
                                    <td className="p-2">
                                      <div className="flex justify-center">
                                        {item.material_status ? (
                                          <span className={`px-2 py-1 rounded text-[10px] border 
                                            ${item.material_status === 'issued' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                              item.material_status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                              item.material_status === 'requested' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                            {item.material_status === 'issued' ? 'Issued' : 
                                             item.material_status === 'approved' ? 'Approved' : 
                                             item.material_status === 'requested' ? 'Requested' : 
                                             item.material_status}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-200">--</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Sub-Assembly Materials */}
                      
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Sub-Assembly Items Section */}
            <div id="subassembly" className={activeSection === 'subassembly' ? 'block' : 'hidden lg:block'}>
              {subAssemblyItems.length > 0 && (
                <Card>
                  <SectionHeader
                    title="04 SUB-ASSEMBLY MAPPING"
                    icon={Activity}
                    subtitle="Manufacturing breakdown of intermediate components"
                    badge={`${subAssemblyItems.length} ELEMENTS`}
                    isExpanded={expandedSections.subassembly}
                    onToggle={() => toggleSection('subassembly')}
                    themeColor="rose"
                  />

                  {expandedSections.subassembly && (
                    <div className="p-3 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {subAssemblyItems.map((item, idx) => (
                          <div key={idx} className=" p-2 bg-slate-50 rounded  border border-slate-100 group hover:border-indigo-200 hover:shadow-md transition-all duration-300">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-white border border-slate-100 flex items-center justify-center text-indigo-500  ">
                                  <Layers size={16} />
                                </div>
                                <div>
                                  <p className="text-xs    text-slate-400   mb-0.5">SPECIFICATION</p>
                                  <p className="text-xs   text-slate-900 leading-none">{item.item_code}</p>
                                  <p className="text-xs  text-slate-500 mt-1 ">{item.item_name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs    text-slate-400   mb-0.5">SCRAP %</p>
                                <div className="inline-flex items-center gap-1 text-xs   text-rose-500 bg-rose-50 px-2 py-0.5  rounded  border border-rose-100">
                                  <TrendingUp size={10} />
                                  {item.scrap_percentage || 0}%
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/50">
                              <div className="bg-white p-2 rounded border border-slate-100  ">
                                <p className="text-xs   text-slate-400  mb-1 tracking-wider">NET QTY</p>
                                <p className="text-sm   text-slate-700">{item.planned_qty_before_scrap || item.qty || '-'}</p>
                              </div>
                              <div className="bg-rose-50/50 p-2 rounded border border-rose-100  ">
                                <p className="text-xs   text-rose-400  mb-1 tracking-wider">FINAL QTY</p>
                                <p className="text-sm   text-rose-600">{item.planned_qty || item.qty || '-'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>

            {/* Operational Routing Section */}
            <div id="operations" className={activeSection === 'operations' ? 'block' : 'hidden lg:block'}>
              {(fgOperations.length > 0 || operationItems.length > 0) && (
                <Card>
                  <SectionHeader
                    title="05 PRODUCTION OPERATIONS"
                    icon={Zap}
                    subtitle="Sequence of production stages and workcenters"
                    badge={`${fgOperations.length || operationItems.length} STEPS`}
                    isExpanded={expandedSections.operations}
                    onToggle={() => toggleSection('operations')}
                    themeColor="emerald"
                  />

                  {expandedSections.operations && (
                    <div className="p-6 animate-in fade-in duration-300">
                      <div className="rounded  border border-slate-100 overflow-hidden bg-white  ">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100">
                              <th className="p-2 text-left text-xs    text-slate-500   w-16 text-center">Seq</th>
                              <th className="p-2 text-left text-xs    text-slate-500  ">Operation Details</th>
                              <th className="p-2 text-left text-xs    text-slate-500  ">Workstation</th>
                              <th className="p-2 text-right text-xs    text-slate-500  ">Time (Hrs)</th>
                              <th className="p-2 text-right text-xs    text-slate-500  ">Batch</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(fgOperations.length > 0 ? fgOperations : operationItems).map((op, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-2 text-center">
                                  <span className="inline-flex items-center justify-center w-6 h-6  rounded  bg-emerald-600 text-xs    text-white shadow-md shadow-emerald-100  ">
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="p-2">
                                  <p className="text-xs   text-slate-900 group-hover:text-emerald-600 transition-colors">{op.operation || op.operation_name}</p>
                                  {op.description && <p className="text-xs  text-slate-400 mt-1  leading-tight">{op.description}</p>}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                                      <Factory size={12} />
                                    </div>
                                    <span className="text-xs  text-slate-600  tracking-tighter">{op.workstation || op.workstation_type || '-'}</span>
                                  </div>
                                </td>
                                <td className="p-2 text-right">
                                  <span className="text-xs   text-emerald-600">{op.time || op.operation_time || 0}</span>
                                </td>
                                <td className="p-2 text-right">
                                  <span className="text-xs font-medium text-slate-500">{op.batch_size || 1}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showWorkOrderModal && workOrderData && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2">
          <div className="bg-white rounded shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded">
                  <Boxes size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xs  text-white  text-xs  ">CREATE WORK ORDER</h2>
                  <p className="text-xs   text-slate-400 ">Review execution details</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWorkOrderModal(false)
                  setWorkOrderData(null)
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-3 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-xs  text-slate-400  mb-1">ITEM CODE</p>
                  <p className="text-[11px]  text-slate-900 truncate">{workOrderData.item_code}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-xs  text-slate-400  mb-1">BOM REF</p>
                  <p className="text-[11px]  text-slate-900 truncate">{workOrderData.bom_no}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-xs  text-slate-400  mb-1">QUANTITY</p>
                  <p className="text-[11px]  text-indigo-600">{workOrderData.quantity}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-xs  text-slate-400  mb-1">PRIORITY</p>
                  <p className="text-[11px]  text-amber-600 ">{workOrderData.priority}</p>
                </div>
              </div>

              {workOrderData.operations && workOrderData.operations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs   text-slate-900  text-xs   flex items-center gap-2">
                    <Factory size={14} className="text-slate-400" />
                    OPERATIONAL ROUTING
                  </h3>
                  <div className="rounded border border-slate-100 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="p-2 text-left text-xs  text-slate-500 ">OPERATION</th>
                          <th className="p-2 text-left text-xs  text-slate-500 ">WORKSTATION</th>
                          <th className="p-2 text-right text-xs  text-slate-500 ">TIME (HRS)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs ">
                        {workOrderData.operations.map((op, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2  text-slate-700">{op.operation}</td>
                            <td className="p-2 text-slate-500  ">{op.workstation || '-'}</td>
                            <td className="p-2 text-right  text-slate-900">{op.time || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 ">
                <button
                  onClick={() => {
                    setShowWorkOrderModal(false)
                    setWorkOrderData(null)
                  }}
                  className="p-6  py-2 text-xs   text-slate-500  hover:bg-slate-50 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorkOrder}
                  disabled={creatingWorkOrder}
                  className="p-2  bg-indigo-600 text-white text-xs    rounded hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                  <Check size={16} />
                  {creatingWorkOrder ? 'Processing...' : 'Confirm & Create Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
