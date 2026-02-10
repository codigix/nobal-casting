import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown, Save, X, Plus, Trash2, AlertCircle, Package, Boxes, Archive,
  Check, Factory, Zap, Layout, Info, ArrowLeft, ArrowRight, Activity, Calendar,
  ShieldCheck, AlertTriangle, Layers, TrendingUp, Settings, ClipboardCheck, ClipboardList, Warehouse,
  Loader, Send, FileText
} from 'lucide-react'
import { useAuth } from '../../hooks/AuthContext'
import { useToast } from '../../components/ToastContainer'
import SearchableSelect from '../../components/SearchableSelect'
import Card from '../../components/Card/Card'
import * as productionService from '../../services/productionService'

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
            <span className={`${theme.text} `}>{title.split(' ')[0]}</span>
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
        ? `${activeTheme} border `
        : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-100'
        }`}
    >
      <div className={`p-1.5 rounded transition-all duration-300 ${isActive ? 'bg-white scale-110' : 'bg-slate-50 group-hover:bg-white'}`}>
        <Icon size={10} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : 'opacity-60'} />
      </div>
      <span className="text-xs ">{label.split(' ').slice(1).join(' ')}</span>
      {isActive && <div className="w-1 h-1 rounded-full bg-current animate-pulse ml-0.5" />}
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

const GroupBadge = ({ group }) => {
  const normalizedGroup = (group || 'Raw Material').toLowerCase().replace(/[-\s]/g, '').trim()

  const styles = {
    consumable: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    subassembly: 'bg-rose-50 text-rose-700 border-rose-200',
    subassemblies: 'bg-rose-50 text-rose-700 border-rose-200',
    rawmaterial: 'bg-amber-50 text-amber-700 border-amber-200',
    default: 'bg-slate-50 text-slate-600 border-slate-200'
  }

  const style = styles[normalizedGroup] || styles.default

  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${style}`}>
      {group || 'Raw Material'}
    </span>
  )
}

const isConsumableGroup = (itemGroup) => {
  if (!itemGroup) return false
  const normalized = itemGroup.toLowerCase().replace(/[-\s]/g, '').trim()
  return normalized === 'consumable'
}

const isSubAssemblyGroup = (itemGroup, itemCode = '') => {
  if (!itemGroup && !itemCode) return false

  const normalizedGroup = (itemGroup || '').toLowerCase().replace(/[-\s]/g, '').trim()
  if (normalizedGroup === 'consumable') return false

  const isSAGroup = normalizedGroup === 'subassemblies' || normalizedGroup === 'subassembly' || normalizedGroup === 'intermediates'
  const isSACode = (itemCode || '').toUpperCase().startsWith('SA-') || (itemCode || '').toUpperCase().startsWith('SA')

  return isSAGroup || isSACode
}

export default function ProductionPlanningForm() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { plan_id } = useParams()
  const [activeSection, setActiveSection] = useState('parameters')
  const [expandedSections, setExpandedSections] = useState({
    parameters: true,
    scope: true,
    requirements: true,
    subassembly: true,
    rawmaterials: true
  })
  const [expandedItemGroups, setExpandedItemGroups] = useState({})
  const [expandedSubAsms, setExpandedSubAsms] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [fetchingBom, setFetchingBom] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)

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
      const offset = 160 // Space for the sticky header
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
      const sections = ['parameters', 'scope', 'requirements', 'subassembly']
      const scrollPosition = window.scrollY + 200 // Adjust offset for detection

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

  const buildSubAssemblyTree = (items) => {
    if (!items || items.length === 0) return [];

    // Create map for easy lookup
    const itemMap = {};
    items.forEach((item, index) => {
      const key = `${item.item_code}-${item.parent_item_code || item.parent_code || 'root'}`;
      itemMap[key] = { ...item, children: [], id: index };
    });

    const tree = [];
    Object.values(itemMap).forEach(item => {
      const parentCode = item.parent_item_code || item.parent_code;
      if (!parentCode || parentCode === 'top' || parentCode === 'root') {
        tree.push(item);
      } else {
        // Try to find parent. Since we don't have parent's parent, 
        // we might have multiple items with same item_code but different parents.
        // We look for any item that matches the parentCode
        const parents = Object.values(itemMap).filter(i => i.item_code === parentCode);
        if (parents.length > 0) {
          // If multiple potential parents (same item code in different branches), 
          // we'd need more data to be perfect. For now, add to all or first.
          parents[0].children.push(item);
        } else {
          // Orphan - add to root
          tree.push(item);
        }
      }
    });

    return tree;
  };

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
  const [creatingMaterialRequest, setCreatingMaterialRequest] = useState(false)
  const [showMaterialRequestModal, setShowMaterialRequestModal] = useState(false)
  const [materialRequestData, setMaterialRequestData] = useState(null)
  const [materialStockData, setMaterialStockData] = useState({})
  const [checkingStock, setCheckingStock] = useState(false)

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
  const [existingWorkOrders, setExistingWorkOrders] = useState([])

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
          setIsReadOnly(true)

          const planQty = plan.fg_items?.[0]?.planned_qty || plan.fg_items?.[0]?.quantity || 1
          setSalesOrderQuantity(planQty)

          if (plan.sales_order_id) {
            setSelectedSalesOrders([plan.sales_order_id])
            await processSalesOrderData(plan.sales_order_id, planQty)
          }

          // Fetch existing work orders for this plan
          try {
            const woRes = await fetch(`${import.meta.env.VITE_API_URL}/production/work-orders?production_plan_id=${planId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (woRes.ok) {
              const woData = await woRes.json()
              const workOrders = woData.data || woData || []
              setExistingWorkOrders(Array.isArray(workOrders) ? workOrders : [])
            }
          } catch (woErr) {
            console.error('Error fetching existing work orders:', woErr)
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

          // Update the item being processed with the correct BOM ID
          item.bom_id = bomId;
          item.bom_no = bomId;

          const bomDetailsRes = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!bomDetailsRes.ok) continue;

          const bomDetailsData = await bomDetailsRes.json();
          const bomData = bomDetailsData.data || bomDetailsData;

          const rawMaterials = [
            ...(bomData.rawMaterials || []),
            ...(bomData.bom_raw_materials || []),
            ...(bomData.lines || [])
          ];
          const operations = bomData.operations || bomData.bom_operations || [];

          // Store base operations for this BOM
          setBomOperationsData(prev => ({
            ...prev,
            [bomId]: operations
          }));

          rawMaterials.forEach(mat => {
            const matQty = (mat.qty || mat.quantity || 0) * itemQty;
            const group = (mat.item_group || '').toLowerCase();
            const matCode = mat.item_code || mat.component_code;

            if (isSubAssemblyGroup(mat.item_group, matCode)) {
              const subAsmEntry = {
                item_code: mat.item_code || mat.component_code,
                item_name: mat.item_name || mat.component_description,
                quantity: matQty,
                qty: matQty,
                planned_qty: matQty,
                bom_no: mat.bom_no || null,
                bom_id: mat.bom_no || null,
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

      if (nextLevelItems.length > 0) {
        await fetchSubAssemblyBomMaterials(nextLevelItems, level + 1, allSubAsmMaterials, allDiscoveredSubAsms);
      }

      if (level === 0) {
        console.log('=== RECURSIVE EXPLOSION COMPLETE ===');

        setSubAssemblyBomMaterials([...allSubAsmMaterials]);

        if (allDiscoveredSubAsms.length > 0) {
          // Aggregate all discovered sub-assemblies by item_code AND parent_code to preserve hierarchy
          const aggregatedSubAsms = allDiscoveredSubAsms.reduce((acc, curr) => {
            const key = `${curr.item_code}-${curr.parent_code || 'top'}`;
            if (!acc[key]) {
              acc[key] = { ...curr };
            } else {
              acc[key].quantity += curr.quantity;
              acc[key].qty += curr.qty;
              acc[key].planned_qty += curr.planned_qty;
            }
            return acc;
          }, {});

          setSubAssemblyItems(prev => {
            const updated = [...prev];
            Object.values(aggregatedSubAsms).forEach(discovered => {
              const existingIdx = updated.findIndex(i =>
                i.item_code === discovered.item_code &&
                (i.parent_code === discovered.parent_code || i.parent_item_code === discovered.parent_code)
              );
              if (existingIdx !== -1) {
                const newQty = (updated[existingIdx].quantity || 0) + discovered.quantity;
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  quantity: newQty,
                  qty: newQty,
                  planned_qty: newQty,
                  bom_id: discovered.bom_id || updated[existingIdx].bom_id,
                  bom_no: discovered.bom_no || updated[existingIdx].bom_no
                };
              } else {
                updated.push(discovered);
              }
            });
            return updated;
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

  const handleExplodeBoms = () => {
    const subAsmFromRawMaterials = rawMaterialItems.filter(item => {
      return isSubAssemblyGroup(item.item_group, item.item_code || item.component_code) ||
        (item.fg_sub_assembly || item.component_type || '').toLowerCase().includes('sub')
    })
    if (subAsmFromRawMaterials.length === 0) {
      toast.addToast('No sub-assemblies found in raw materials', 'info')
      return
    }
    setFetchingSubAssemblyBoms(true)
    fetchSubAssemblyBomMaterials(subAsmFromRawMaterials).finally(() => {
      setFetchingSubAssemblyBoms(false)
    })
  }

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
      // Show all components including sub-assemblies
      const materials = [
        ...(bomData.rawMaterials || []),
        ...(bomData.bom_raw_materials || []),
        ...(bomData.lines || [])
      ]

      setSubAssemblyMaterials(prev => ({ ...prev, [subAssemblySku]: materials }))
      return materials
    } catch (err) {
      console.error('Error loading sub-assembly materials:', err)
      return []
    }
  }

  const toggleItemMaterials = async (item) => {
    const itemSku = item.item_code
    if (expandedSubAssemblyMaterials[itemSku]) {
      setExpandedSubAssemblyMaterials(prev => ({ ...prev, [itemSku]: false }))
      return
    }

    setFetchingSubAssemblyBoms(true)
    try {
      const token = localStorage.getItem('token')
      let bomId = item.bom_no || item.bom_id

      if (!bomId) {
        const foundBom = boms.find(b => b.item_code === itemSku)
        if (foundBom) {
          bomId = foundBom.bom_id
        }
      }

      if (!bomId) {
        console.warn('No BOM ID found for item:', itemSku)
        setFetchingSubAssemblyBoms(false)
        return
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/boms/${bomId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const bomData = data.data || data
        // Show all components including sub-assemblies
        const materials = [
          ...(bomData.rawMaterials || []),
          ...(bomData.bom_raw_materials || []),
          ...(bomData.lines || [])
        ]

        setSubAssemblyMaterials(prev => ({ ...prev, [itemSku]: materials }))
        setExpandedSubAssemblyMaterials(prev => ({ ...prev, [itemSku]: true }))
      }
    } catch (err) {
      console.error('Error loading materials:', err)
    } finally {
      setFetchingSubAssemblyBoms(false)
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

  const processSalesOrderData = async (soId, salesOrderQty = null) => {
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

    // Prioritize passed qty, then SO header qty, then SO item qty, then default to 1
    let quantity = salesOrderQty
    if (quantity === null || quantity === undefined) {
      const firstItemQty = items.length > 0 ? (items[0].qty || items[0].quantity || items[0].ordered_qty) : null
      quantity = soDetails.qty || soDetails.quantity || firstItemQty || 1
    }

    quantity = parseFloat(quantity) || 1
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
      uom: items[0]?.uom || 'Nos',
      warehouse: items[0]?.warehouse || 'Finished Goods - NC',
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
        uom: bomData?.uom || items[0]?.uom || 'Nos',
        warehouse: items[0]?.warehouse || 'Finished Goods - NC',
        quantity: quantity,
        sales_order_quantity: quantity,
        bom_id: bomId,
        planned_start_date: new Date().toISOString().split('T')[0],
        planned_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
      setFGItems([fgFromBOM])
      console.log('✓ Finished Good set:', fgFromBOM)

      // Split BOM lines into sub-assemblies and materials
      const trueSubAsmLines = bomLines.filter(line => isSubAssemblyGroup(line.item_group, line.component_code || line.item_code) || (line.component_type || '').toLowerCase().includes('sub'))
      const materialLinesFromBOM = bomLines.filter(line => !isSubAssemblyGroup(line.item_group, line.component_code || line.item_code) && !(line.component_type || '').toLowerCase().includes('sub'))

      // All lines in a FG BOM that are sub-assemblies
      if (trueSubAsmLines.length > 0) {
        const subAsmItemsFromBOM = trueSubAsmLines
          .map(subAsmItem => {
            const baseQty = subAsmItem.quantity || subAsmItem.qty || subAsmItem.bom_qty || 1
            const totalQtyBeforeScrap = baseQty * quantity
            const scrapPercentage = parseFloat(subAsmItem.loss_percentage || subAsmItem.item_loss_percentage || 0)
            const qtyAfterScrap = totalQtyBeforeScrap + (totalQtyBeforeScrap * scrapPercentage / 100)

            return {
              item_code: subAsmItem.component_code || subAsmItem.item_code,
              item_name: subAsmItem.component_description || subAsmItem.item_name,
              uom: subAsmItem.uom || 'Nos',
              warehouse: subAsmItem.warehouse || 'Work In Progress - NC',
              manufacturing_type: 'In House',
              bom_no: subAsmItem.bom_no || null,
              bom_id: subAsmItem.bom_no || null,
              quantity: qtyAfterScrap,
              qty_before_scrap: totalQtyBeforeScrap,
              scrap_percentage: scrapPercentage,
              qty_after_scrap: qtyAfterScrap,
              planned_qty_before_scrap: totalQtyBeforeScrap,
              planned_qty: qtyAfterScrap,
              sales_order_quantity: quantity,
              fg_sub_assembly: 'Sub-Assembly',
              component_type: subAsmItem.component_type || 'Sub-Assembly',
              item_group: subAsmItem.item_group,
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

      const allMaterials = bomRawMaterialsFromSO.length > 0 ? bomRawMaterialsFromSO : [
        ...(bomData?.rawMaterials || []),
        ...(bomData?.bom_raw_materials || [])
      ]

      // Combine with material lines found in BOM lines
      const combinedMaterials = [...allMaterials, ...materialLinesFromBOM]

      const proportionalMaterials = combinedMaterials
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

      const bomLines = [
        ...(bom.rawMaterials || []),
        ...(bom.bom_raw_materials || []),
        ...(bom.lines || [])
      ]
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

          const subMaterials = [
            ...(subBom.rawMaterials || []),
            ...(subBom.bom_raw_materials || []),
            ...(subBom.lines || [])
          ]
          const operations = subBom.operations || subBom.bom_operations || []

          subMaterials.forEach(subMat => {
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
      toast.addToast('Failed to fetch material operations', 'error')
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
      toast.addToast('Failed to fetch BOM operations', 'error')
    }
  }

  const createWorkOrders = async () => {
    if (existingWorkOrders && existingWorkOrders.length > 0) {
      toast.addToast(`Work orders already exist for this plan (${plan_id}). Duplicate creation is not allowed.`, 'warning')
      return
    }

    try {
      setCreatingWorkOrders(true)
      setError(null)

      const response = await productionService.createWorkOrdersFromPlan(plan_id)

      if (response.success) {
        const workOrderIds = response.data?.work_orders || []
        setSuccess(`Successfully generated ${workOrderIds.length} work orders from production plan.`)
        toast.addToast(`Generated ${workOrderIds.length} work orders successfully`, 'success')

        // Refresh local state
        setPlanHeader(prev => ({ ...prev, status: 'in-progress' }))

        setTimeout(() => {
          navigate('/manufacturing/work-orders')
        }, 2000)
      } else {
        setError(response.message || 'Failed to create work orders from plan')
      }
    } catch (err) {
      console.error('Error creating work orders from plan:', err)
      setError(`Error creating work orders: ${err.message}`)
    } finally {
      setCreatingWorkOrders(false)
    }
  }

  const consolidateMaterials = () => {
    const consolidated = {}

    // 1. Process primary raw materials (skip sub-assemblies if they are listed here)
    rawMaterialItems.forEach(item => {
      const isSubAsm = (item.item_code || '').startsWith('SA-') ||
        (item.fg_sub_assembly || item.component_type || '').toLowerCase().includes('sub')

      if (!isSubAsm) {
        const code = item.item_code
        const qty = parseFloat(item.quantity || item.qty_as_per_bom || 0)
        if (!consolidated[code]) {
          consolidated[code] = {
            item_code: code,
            item_name: item.item_name,
            quantity: 0,
            uom: item.uom || 'Nos',
            warehouse: item.for_warehouse
          }
        }
        consolidated[code].quantity += qty
      }
    })

    // 2. Process exploded sub-assembly materials
    subAssemblyBomMaterials.forEach(item => {
      if (item.is_operation) return

      const code = item.item_code || item.component_code
      const qty = parseFloat(item.quantity || item.qty || 0)
      if (!consolidated[code]) {
        consolidated[code] = {
          item_code: code,
          item_name: item.item_name || item.component_description,
          quantity: 0,
          uom: item.uom || 'Nos',
          warehouse: item.warehouse || 'Stores - NC'
        }
      }
      consolidated[code].quantity += qty
    })

    return Object.values(consolidated)
  }

  const checkItemsStock = async (itemsToCheck) => {
    try {
      setCheckingStock(true)
      const token = localStorage.getItem('token')
      const stockInfo = {}

      const stockRes = await fetch(`${import.meta.env.VITE_API_URL}/stock/stock-balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (stockRes.ok) {
        const stockData = await stockRes.json()
        const balances = Array.isArray(stockData) ? stockData : (stockData.data || [])

        for (const item of itemsToCheck || []) {
          const itemBalances = balances.filter(b => b.item_code === item.item_code)
          const totalAvailable = itemBalances.reduce((sum, b) => sum + parseFloat(b.available_qty || b.current_qty || 0), 0)

          stockInfo[item.item_code] = {
            available: totalAvailable,
            requested: item.qty || item.quantity || 0,
            isAvailable: totalAvailable >= (item.qty || item.quantity || 0),
            hasStock: totalAvailable > 0,
            warehouse: itemBalances.length > 0 ? itemBalances[0].warehouse_name || itemBalances[0].warehouse : '-'
          }
        }
      }
      setMaterialStockData(stockInfo)
    } catch (err) {
      console.error('Error checking stock:', err)
    } finally {
      setCheckingStock(false)
    }
  }

  // Automatically check stock when materials are calculated
  useEffect(() => {
    const materials = consolidateMaterials()
    if (materials.length > 0 && planHeader.status !== 'completed' && planHeader.status !== 'cancelled') {
      checkItemsStock(materials)
    }
  }, [rawMaterialItems, subAssemblyBomMaterials])

  const handleSendMaterialRequestConfirm = async () => {
    if (!materialRequestData) return

    const unavailableItems = materialRequestData.items.filter(item => {
      const stock = materialStockData[item.item_code]
      return !stock || !stock.isAvailable
    })

    if (unavailableItems.length > 0) {
      const confirmProceed = window.confirm(
        `${unavailableItems.length} items have insufficient stock for immediate issue. \n\n` +
        `Proceeding with "Material Issue" may result in approval failure unless stock is added later. \n\n` +
        `Do you still want to create this Material Request?`
      )
      if (!confirmProceed) return
    }

    try {
      setCreatingMaterialRequest(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${import.meta.env.VITE_API_URL}/material-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(materialRequestData)
      })

      if (res.ok) {
        const data = await res.json()
        setSuccess(`Material Request ${data.data?.mr_id || ''} created successfully`)
        setShowMaterialRequestModal(false)
        setMaterialRequestData(null)
      } else {
        const errData = await res.json()
        setError(`Failed to create Material Request: ${errData.error || errData.message || res.statusText}`)
      }
    } catch (err) {
      console.error('Error creating material request:', err)
      setError(`Error: ${err.message}`)
    } finally {
      setCreatingMaterialRequest(false)
    }
  }

  const createMaterialRequest = async (filterType = 'all') => {
    try {
      const allMaterials = consolidateMaterials()
      let materials = []

      if (filterType === 'in_stock') {
        materials = allMaterials.filter(m => materialStockData[m.item_code]?.isAvailable)
      } else if (filterType === 'out_of_stock') {
        materials = allMaterials.filter(m => !materialStockData[m.item_code]?.isAvailable)
      } else {
        materials = allMaterials
      }

      if (materials.length === 0) {
        toast.addToast(`No ${filterType === 'out_of_stock' ? 'out-of-stock' : filterType === 'in_stock' ? 'in-stock' : 'matching'} materials found to process`, 'info')
        return
      }

      const fgItem = fgItems[0] || {}
      const seriesNo = `MR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

      const mrData = {
        series_no: seriesNo,
        transition_date: new Date().toISOString().split('T')[0],
        requested_by_id: user?.employee_id || user?.user_id || user?.full_name || 'System',
        department: 'Production',
        purpose: filterType === 'out_of_stock' ? 'purchase' : 'material_issue',
        required_by_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        company: planHeader.company || 'Nobal Casting',
        production_plan_id: planHeader.plan_id,
        created_by: user?.full_name || 'System',
        items_notes: `${filterType === 'out_of_stock' ? 'Purchase Request' : 'Material Request'} for Production Plan: ${planHeader.plan_id}\nBOM: ${selectedBomId || 'N/A'}\nItem: ${fgItem.item_code || fgItem.item_name || ''}\nPlanned Quantity: ${salesOrderQuantity}\nIncludes raw materials from all sub-assemblies`,
        items: materials.map(m => ({
          item_code: m.item_code,
          item_name: m.item_name,
          qty: m.quantity,
          uom: m.uom,
          warehouse: m.warehouse || 'Stores - NC',
          purpose: filterType === 'out_of_stock' ? 'purchase' : 'material_issue'
        }))
      }

      setMaterialRequestData(mrData)
      setShowMaterialRequestModal(true)
    } catch (err) {
      console.error('Error preparing material request:', err)
      setError('Error preparing material request')
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
        toast.addToast('No raw material items found', 'info')
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

            const materials = [
              ...(bom.bom_raw_materials || []),
              ...(bom.rawMaterials || []),
              ...(bom.lines || [])
            ]
            const operations = bom.bom_operations || bom.operations || []
            console.log(`Materials found: ${materials.length}, Operations found: ${operations.length}`)

            const actualBomId = bom.bom_id || bomId

            materials.forEach(material => {
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
      toast.addToast('Failed to fetch sub-assembly BOM materials: ' + err.message, 'error')
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
                bom_no: item.bom_id || item.bom_no,
                planned_qty: item.quantity || item.planned_qty || 1,
                planned_start_date: item.planned_start_date,
                planned_end_date: item.planned_end_date,
                fg_warehouse: item.warehouse || item.fg_warehouse
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
                parent_item_code: item.parent_code || item.parent_item_code,
                bom_no: item.bom_id || item.bom_no,
                planned_qty: item.quantity || item.planned_qty || 1,
                scheduled_date: item.planned_start_date,
                target_warehouse: item.warehouse || item.target_warehouse
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
    <div className="min-h-screen bg-slate-50 p-2 pb-3">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="">
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
              {!isReadOnly && (
                <button
                  onClick={() => navigate('/manufacturing/production-planning')}
                  className="p-2 text-xs   text-slate-500  text-xs   hover:bg-slate-100 rounded transition-all"
                >
                  Discard Changes
                </button>
              )}
              {isReadOnly ? (
                <button
                  onClick={() => setIsReadOnly(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs font-medium"
                >
                  <FileText size={16} />
                  <span>Edit Plan</span>
                </button>
              ) : (
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
              )}
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
          <div className="sticky top-[80px] z-30 bg-white/80 border border-slate-200/60 rounded p-2  flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
              <NavItem
                label="01 Basic Info"
                icon={Settings}
                section="parameters"
                isActive={activeSection === 'parameters'}
                onClick={scrollToSection}
                themeColor="indigo"
              />
              <NavItem
                label="02 Finished Goods"
                icon={Layout}
                section="scope"
                isActive={activeSection === 'scope'}
                onClick={scrollToSection}
                themeColor="blue"
              />
              <NavItem
                label="03 Materials"
                icon={Boxes}
                section="requirements"
                isActive={activeSection === 'requirements'}
                onClick={scrollToSection}
                themeColor="amber"
              />
              {subAssemblyItems.length > 0 && (
                <NavItem
                  label="04 Sub Assemblies"
                  icon={Activity}
                  section="subassembly"
                  isActive={activeSection === 'subassembly'}
                  onClick={scrollToSection}
                  themeColor="rose"
                />
              )}
            </div>

            {/* Compact Planning Insight (moved to top bar) */}
            {(() => {
              const sectionThemes = {
                parameters: 'bg-indigo-600 shadow-indigo-100 text-indigo-200',
                scope: 'bg-blue-600 shadow-blue-100 text-blue-200',
                requirements: 'bg-amber-600 shadow-amber-100 text-amber-200',
                subassembly: 'bg-rose-600 shadow-rose-100 text-rose-200'
              }
              const currentTheme = sectionThemes[activeSection] || sectionThemes.parameters
              const bgClass = currentTheme.split(' ')[0]
              const shadowClass = currentTheme.split(' ')[1]
              const iconClass = currentTheme.split(' ')[2]

              return (
                <div className={`hidden lg:flex items-center gap-4 ${bgClass} p-2 rounded shadow-xl shrink-0 transition-all duration-500`}>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="opacity-80 text-white">Production Progress</span>
                    </div>
                    <div className="w-24 bg-white/20 rounded-full h-1">
                      <div className="bg-white rounded-full h-full w-0 transition-all duration-1000"></div>
                    </div>
                  </div>
                  <TrendingUp size={16} className="text-white" />
                </div>
              )
            })()}
          </div>

          {/* Main Content Area */}
          <div className="space-y-6 min-w-0">
            {/* Strategic Parameters Section */}
            <div id="parameters" className="block bg-white">
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
                          disabled={isReadOnly}
                          onChange={(e) => setPlanHeader(prev => ({ ...prev, naming_series: e.target.value }))}
                          className={`w-full p-2 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'text-slate-900 bg-white'}`}
                        />
                      </FieldWrapper>
                      <FieldWrapper label="Operational Status">
                        <div className="relative">
                          <select
                            value={planHeader.status}
                            disabled={isReadOnly}
                            onChange={(e) => setPlanHeader(prev => ({ ...prev, status: e.target.value }))}
                            className={`w-full p-2 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none font-medium ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'text-slate-900 bg-white'}`}
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
                            label: `${so.customer_name || 'N/A'} [${so.sales_order_id || so.name}]`
                          }))}
                          value={selectedSalesOrders[0] || ''}
                          isDisabled={isReadOnly}
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
                            disabled={isReadOnly}
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 1
                              setSalesOrderQuantity(qty)
                              if (selectedSalesOrders[0]) {
                                processSalesOrderData(selectedSalesOrders[0], qty)
                              }
                            }}
                            min="1"
                            className={`w-full pl-4 pr-12 py-2.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium ${isReadOnly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'text-slate-900 bg-white'}`}
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
            <div id="scope" className="block bg-white">
              <Card>
                <SectionHeader
                  title="02 Finished Goods "
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
                      <div className="overflow-x-auto rounded border border-slate-100">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                              <th className="p-2 text-[10px]  text-slate-500  w-8">No.</th>
                              <th className="p-2 text-[10px]  text-slate-500 ">Item Code</th>
                              <th className="p-2 text-[10px]  text-slate-500  text-center">BOM No</th>
                              <th className="p-2 text-[10px]  text-slate-500  text-right">Planned Qty</th>
                              <th className="p-2 text-[10px]  text-slate-500  text-center">UOM</th>
                              <th className="p-2 text-[10px]  text-slate-500 ">Finished Goods Warehouse</th>
                              <th className="p-2 text-[10px]  text-slate-500  text-center">Planned Start Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {fgItems.map((item, idx) => (
                              <React.Fragment key={idx}>
                                <tr
                                  className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                                  onClick={() => toggleItemMaterials(item)}
                                >
                                  <td className="p-2 text-[10px] text-slate-400 font-medium">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                                        <Package size={14} />
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-slate-900 leading-tight">
                                          {item.item_code || selectedSalesOrderDetails?.item_code || 'N/A'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate max-w-[150px]">
                                          {item.item_name || selectedSalesOrderDetails?.item_name || 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center justify-center gap-1.5 text-blue-700 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 w-fit mx-auto">
                                      <Layers size={12} className="text-blue-500" />
                                      <span className="font-mono text-[10px]">
                                        {selectedBomId || item.bom_id || item.bom_no || 'N/A'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <span className="text-sm  text-blue-600">
                                      {item.planned_qty || item.quantity || item.qty}
                                    </span>
                                  </td>
                                  <td className="p-2 text-center">
                                    <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-50 rounded border border-slate-100">
                                      {item.uom || 'Nos'}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <Warehouse size={12} className="text-slate-400" />
                                      <span className="text-[10px] font-medium truncate max-w-[120px]">
                                        {item.warehouse || 'Finished Goods - NC'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="flex items-center justify-center gap-1.5 text-slate-600">
                                      <Calendar size={12} className="text-slate-400" />
                                      <span className="text-[11px] font-medium">
                                        {item.planned_start_date || 'TBD'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {expandedSubAssemblyMaterials[item.item_code] && subAssemblyMaterials[item.item_code] && (
                                  <tr>
                                    <td colSpan="7" className="p-0 bg-blue-50/10">
                                      <div className="p-4 border-l-4 border-blue-500 m-3 bg-white shadow-sm rounded-sm border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-2 mb-3">
                                          <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                            <Boxes size={14} />
                                          </div>
                                          <h4 className="text-[11px]  text-slate-800 ">Raw Materials from BOM</h4>
                                        </div>
                                        <table className="w-full text-[10px] border-collapse">
                                          <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                              <th className="p-2 text-left  text-slate-500 uppercase w-8">No.</th>
                                              <th className="p-2 text-left  text-slate-500 uppercase">Item</th>
                                              <th className="p-2 text-left  text-slate-500 uppercase">Group</th>
                                              <th className="p-2 text-right  text-slate-500 uppercase">Qty per Unit</th>
                                              <th className="p-2 text-right  text-slate-500 uppercase">Total Required Qty</th>
                                              <th className="p-2 text-center  text-slate-500 uppercase">UOM</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-50">
                                            {subAssemblyMaterials[item.item_code].map((m, mIdx) => {
                                              const plannedQty = item.planned_qty || item.quantity || item.qty || 1;
                                              const perUnitQty = parseFloat(m.qty || m.quantity || 0);
                                              const totalQty = perUnitQty * plannedQty;
                                              return (
                                                <tr key={mIdx} className="hover:bg-slate-50 transition-colors">
                                                  <td className="p-2 text-slate-400 font-medium">{mIdx + 1}</td>
                                                  <td className="p-2">
                                                    <div className="font-medium text-slate-900">{m.item_code || m.component_code}</div>
                                                    <div className="text-slate-400 text-[9px]">{m.item_name || m.component_description || m.description}</div>
                                                  </td>
                                                  <td className="p-2">
                                                    <GroupBadge group={m.item_group} />
                                                  </td>
                                                  <td className="p-2 text-right text-slate-600">{perUnitQty.toFixed(4)}</td>
                                                  <td className="p-2 text-right  text-blue-600">{totalQty.toFixed(4)}</td>
                                                  <td className="p-2 text-center text-slate-500">{m.uom || 'Nos'}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
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


            {/* Sub-Assembly Items Section */}

          </div>
          <div id="subassembly" className="block bg-white">
            {subAssemblyItems.length > 0 && (
              <Card>
                <SectionHeader
                  title="04 Sub Assemblies"
                  icon={Activity}
                  subtitle="Manufacturing breakdown of intermediate components"
                  badge={`${subAssemblyItems.length} ITEMS`}
                  isExpanded={expandedSections.subassembly}
                  onToggle={() => toggleSection('subassembly')}
                  themeColor="rose"
                />

                {expandedSections.subassembly && (
                  <div className="p-2 animate-in fade-in duration-300">
                    <div className="overflow-x-auto rounded border border-slate-100">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="p-2 text-[10px]  text-slate-500  w-8">No.</th>
                            <th className="p-2 text-[10px]  text-slate-500 ">Sub Assembly Item Code</th>
                            <th className="p-2 text-[10px]  text-slate-500 ">Group</th>
                            <th className="p-2 text-[10px]  text-slate-500 ">Target Warehouse</th>
                            <th className="p-2 text-[10px]  text-slate-500  text-center">Scheduled Date</th>
                            <th className="p-2 text-[10px]  text-slate-500  text-right">Required Qty</th>
                            <th className="p-2 text-[10px]  text-slate-500  text-center">Bom No</th>
                            <th className="p-2 text-[10px]  text-slate-500  text-center">Manufacturing Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const tree = buildSubAssemblyTree(subAssemblyItems);

                            const renderSubAssembly = (item, level = 0, path = '') => {
                              const currentPath = path ? `${path}.${item.item_code}` : item.item_code;
                              const isExpanded = expandedSubAsms[currentPath];
                              const hasChildren = item.children && item.children.length > 0;

                              return (
                                <React.Fragment key={currentPath}>
                                  <tr
                                    className={`hover:bg-rose-50/30 transition-colors group cursor-pointer ${level > 0 ? 'bg-slate-50/30' : ''}`}
                                    onClick={() => {
                                      if (hasChildren) {
                                        setExpandedSubAsms(prev => ({ ...prev, [currentPath]: !prev[currentPath] }));
                                      }
                                    }}
                                  >
                                    <td className="p-2 text-[10px] text-slate-400 font-medium">
                                      <div className="flex items-center gap-1">
                                        {hasChildren ? (
                                          <ChevronDown
                                            size={12}
                                            className={`transform transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                                          />
                                        ) : <div className="w-3" />}
                                        {level + 1}
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 16}px` }}>
                                        <div className={`w-7 h-7 rounded flex items-center justify-center border ${level === 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                          <Layers size={14} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-slate-900 leading-tight">
                                            {item.item_code}
                                          </p>
                                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                            {item.item_name}
                                          </p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-2">
                                      <GroupBadge group={item.item_group || 'Sub Assembly'} />
                                    </td>
                                    <td className="p-2">
                                      <div className="flex items-center gap-1.5 text-slate-600">
                                        <Warehouse size={12} className="text-slate-400" />
                                        <span className="text-[10px] font-medium truncate max-w-[120px]">
                                          {item.warehouse || 'Work In Progress - NC'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5 text-slate-600">
                                        <Calendar size={12} className="text-slate-400" />
                                        <span className="text-[11px] font-medium">
                                          {item.planned_start_date || 'TBD'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-right">
                                      <div className="flex flex-col items-end">
                                        <span className="text-sm  text-rose-600">
                                          {item.planned_qty || item.quantity || item.qty || '-'}
                                        </span>
                                        <span className="text-[9px] text-slate-400 uppercase">{item.uom || 'PCS'}</span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <div className="flex items-center justify-center gap-1.5 text-rose-700 bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/50 w-fit mx-auto">
                                        <Layers size={12} className="text-rose-500" />
                                        <span className="font-mono text-[10px]">
                                          {item.bom_no || item.bom_id || 'N/A'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleItemMaterials(item);
                                        }}
                                        className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${expandedSubAssemblyMaterials[item.item_code]
                                            ? 'bg-rose-100 text-rose-700 border-rose-200'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                                          }`}
                                      >
                                        Materials
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Sub-assembly materials (raw materials) */}
                                  {expandedSubAssemblyMaterials[item.item_code] && subAssemblyMaterials[item.item_code] && (
                                    <tr>
                                      <td colSpan="8" className="p-0 bg-rose-50/10">
                                        <div className="p-4 border-l-4 border-rose-500 m-3 bg-white shadow-sm rounded-sm border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="p-1.5 bg-rose-50 text-rose-600 rounded">
                                              <Layers size={14} />
                                            </div>
                                            <h4 className="text-[11px]  text-slate-800 ">BOM Components & Materials</h4>
                                          </div>
                                          <table className="w-full text-[10px] border-collapse">
                                            <thead>
                                              <tr className="bg-slate-50 border-b border-slate-100">
                                                <th className="p-2 text-left  text-slate-500 uppercase w-8">No.</th>
                                                <th className="p-2 text-left  text-slate-500 uppercase">Item</th>
                                                <th className="p-2 text-left  text-slate-500 uppercase">Group</th>
                                                <th className="p-2 text-right  text-slate-500 uppercase">Qty per Unit</th>
                                                <th className="p-2 text-right  text-rose-600 uppercase">Total Required Qty</th>
                                                <th className="p-2 text-center  text-slate-500 uppercase">UOM</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                              {subAssemblyMaterials[item.item_code].map((m, mIdx) => {
                                                const plannedQty = item.planned_qty || item.quantity || item.qty || 1;
                                                const perUnitQty = parseFloat(m.qty || m.quantity || 0);
                                                const totalQty = perUnitQty * plannedQty;
                                                const mCode = m.item_code || m.component_code;
                                                const isSubAsm = isSubAssemblyGroup(m.item_group, mCode);

                                                return (
                                                  <tr key={mIdx} className={`hover:bg-slate-50 transition-colors ${isSubAsm ? 'bg-rose-50/20' : ''}`}>
                                                    <td className="p-2 text-slate-400 font-medium">{mIdx + 1}</td>
                                                    <td className="p-2">
                                                      <div className="flex items-center gap-2">
                                                        {isSubAsm && <Layers size={10} className="text-rose-500" />}
                                                        <div className={`font-medium ${isSubAsm ? 'text-rose-700' : 'text-slate-900'}`}>{mCode}</div>
                                                        {isSubAsm && (
                                                          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[8px] font-bold uppercase tracking-wider">
                                                            Sub-Assembly
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="text-slate-400 text-[9px]">{m.item_name || m.component_description || m.description}</div>
                                                    </td>
                                                    <td className="p-2">
                                                      <GroupBadge group={m.item_group} />
                                                    </td>
                                                    <td className="p-2 text-right text-slate-600">{perUnitQty.toFixed(4)}</td>
                                                    <td className="p-2 text-right font-medium text-rose-600">{totalQty.toFixed(4)}</td>
                                                    <td className="p-2 text-center text-slate-500">{m.uom || 'Nos'}</td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}

                                  {/* Recursive child sub-assemblies */}
                                  {isExpanded && hasChildren && item.children.map(child => renderSubAssembly(child, level + 1, currentPath))}
                                </React.Fragment>
                              );
                            };

                            return tree.map(rootItem => renderSubAssembly(rootItem));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
          <div id="requirements" className="block bg-white">
            {(rawMaterialItems.length > 0 || subAssemblyBomMaterials.length > 0) && (
              <Card>
                <SectionHeader
                  title="03 Materials"
                  icon={Boxes}
                  subtitle="Consolidated material explosion across all levels"
                  badge={`${rawMaterialItems.length + subAssemblyBomMaterials.length} ITEMS`}
                  isExpanded={expandedSections.requirements}
                  onToggle={() => toggleSection('requirements')}
                  themeColor="amber"
                  actions={
                    <div className="flex items-center gap-2">
                      {/* Buttons moved to bottom sticky bar */}
                    </div>
                  }
                />

                {expandedSections.requirements && (
                  <div className="p-3 space-y-2 animate-in fade-in duration-300">
                    {/* Primary Raw Materials */}
                    {rawMaterialItems.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs   text-amber-600 flex items-center gap-2 px-1">
                          <div className="w-1.5 h-1.5  rounded  bg-amber-500"></div>
                          CORE MATERIALS
                        </h4>
                        <div className="rounded border border-amber-100 overflow-hidden bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-amber-50/50 border-b border-amber-100">
                              <tr>
                                <th className="p-2 text-[10px]  text-amber-700 ">Item </th>
                                <th className="p-2 text-[10px]  text-amber-700 ">Group</th>
                                <th className="p-2 text-[10px]  text-amber-700  text-right">Required Qty</th>
                                <th className="p-2 text-[10px]  text-amber-700 ">Warehouse</th>
                                <th className="p-2 text-[10px]  text-amber-700  text-center">BOM Ref</th>
                                <th className="p-2 text-[10px]  text-amber-700  text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-50">
                              {rawMaterialItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-amber-50/20 transition-colors group">
                                  <td className="p-2">
                                    <p className="text-xs font-medium text-slate-900 group-hover:text-amber-600 transition-colors">
                                      {item.item_code}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                      {item.item_name}
                                    </p>
                                  </td>
                                  <td className="p-2">
                                    <GroupBadge group={item.item_group || 'Raw Material'} />
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs  text-amber-600">
                                        {item.quantity || item.qty_as_per_bom}
                                      </span>
                                      <span className="text-[9px] text-slate-400 uppercase">{item.uom || 'PCS'}</span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-1.5 text-slate-600">
                                      <Warehouse size={12} className="text-slate-400" />
                                      <span className="text-[10px] font-medium truncate max-w-[120px]">
                                        {item.for_warehouse || '-'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center justify-center gap-1.5 text-amber-700 bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100/50 w-fit mx-auto">
                                      <Layers size={12} className="text-amber-500" />
                                      <span className="font-mono text-[10px]">
                                        {item.bom_id || item.bom_no || '-'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex justify-center">
                                      {item.material_status ? (
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border 
                                            ${item.material_status === 'issued' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                            item.material_status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                              item.material_status === 'requested' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                          {item.material_status.charAt(0).toUpperCase() + item.material_status.slice(1)}
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
                    {subAssemblyBomMaterials.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs  text-rose-600 flex items-center gap-2 px-1">
                          <div className="w-1.5 h-1.5 rounded bg-rose-500"></div>
                          EXPLODED COMPONENTS
                        </h4>
                        <div className="rounded border border-rose-100 overflow-hidden bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-rose-50/50 border-b border-rose-100">
                              <tr>
                                <th className="p-2 text-[10px]  text-rose-700 ">Component Specification</th>
                                <th className="p-2 text-[10px]  text-rose-700 ">Group</th>
                                <th className="p-2 text-[10px]  text-rose-700  text-right">Required Qty</th>
                                <th className="p-2 text-[10px]  text-rose-700  text-center">Source Assembly</th>
                                <th className="p-2 text-[10px]  text-rose-700  text-center">BOM Ref</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-50">
                              {subAssemblyBomMaterials.filter(m => !m.is_operation).map((item, idx) => (
                                <tr key={idx} className="hover:bg-rose-50/20 transition-colors group">
                                  <td className="p-2">
                                    <p className="text-xs font-medium text-slate-900 group-hover:text-rose-600 transition-colors">
                                      {item.item_code || item.component_code}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                      {item.item_name || item.component_description}
                                    </p>
                                  </td>
                                  <td className="p-2">
                                    <GroupBadge group={item.item_group || 'Raw Material'} />
                                  </td>
                                  <td className="p-2 text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs  text-rose-600">
                                        {(item.quantity || item.qty || 0).toFixed(2)}
                                      </span>
                                      <span className="text-[9px] text-slate-400 uppercase">{item.uom || 'PCS'}</span>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                      <Activity size={10} />
                                      <span className="text-[10px] font-medium">{item.sub_assembly_code}</span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center justify-center gap-1.5 text-rose-700 bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100/50 w-fit mx-auto">
                                      <Layers size={12} className="text-rose-500" />
                                      <span className="font-mono text-[10px]">
                                        {item.bom_id || item.bom_no || '-'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </Card>
            )}
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

      {showMaterialRequestModal && materialRequestData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-gray-100 max-h-[90vh]">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-2 rounded shadow-lg shadow-emerald-200">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl text-gray-900">Material Request</h2>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <Boxes size={12} className="text-emerald-500" />
                    Resource Acquisition Phase
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMaterialRequestModal(false)
                  setMaterialRequestData(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded transition-all border border-transparent hover:border-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px]  text-slate-400  mb-1">Request Identifier</p>
                  <p className="text-sm  text-slate-900">{materialRequestData.series_no}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px]  text-slate-400  mb-1">Originating Dept</p>
                  <p className="text-sm  text-slate-900">{materialRequestData.department}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <p className="text-[10px]  text-slate-400  mb-1">SLA Target Date</p>
                  <p className="text-sm  text-slate-900">
                    {new Date(materialRequestData.required_by_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-4 rounded-r shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-indigo-600" />
                  <h3 className="text-xs  text-indigo-900 ">Intelligence Strategy Notes</h3>
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed whitespace-pre-line">
                  {materialRequestData.items_notes}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-xs  text-slate-900 ">Requested Components ({materialRequestData.items.length})</h3>
                </div>
                <div className="rounded border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-3 text-xs  text-slate-500 ">Component Intelligence</th>
                        <th className="p-3 text-right text-xs  text-slate-500 ">Required</th>
                        <th className="p-3 text-right text-xs  text-slate-500 ">Inventory</th>
                        <th className="p-3 text-center text-xs  text-slate-500 ">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materialRequestData.items.map((item, idx) => {
                        const stock = materialStockData[item.item_code]
                        const isAvailable = stock?.isAvailable
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3">
                              <p className="text-xs  text-slate-900">{item.item_code}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">{item.item_name}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] text-slate-400 uppercase font-medium">Warehouse:</span>
                                <span className="text-[9px] text-emerald-600 ">{stock?.warehouse || item.warehouse || 'Stores - NC'}</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className="text-xs  text-slate-900">{item.qty}</span>
                              <span className="text-[10px] text-slate-400 ml-1 uppercase">{item.uom}</span>
                            </td>
                            <td className="p-3 text-right">
                              {checkingStock ? (
                                <Loader size={12} className="animate-spin ml-auto text-slate-400" />
                              ) : (
                                <span className="text-xs font-medium text-slate-600">{stock?.available?.toFixed(2) || '0.00'}</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {checkingStock ? (
                                <span className="inline-block w-16 h-4 bg-slate-100 animate-pulse rounded" />
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px]  border transition-all ${isAvailable
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                  }`}>
                                  {isAvailable ? <Check size={10} /> : <AlertCircle size={10} />}
                                  {isAvailable ? 'Fully Stocked' : 'Low Inventory'}
                                </span>
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

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-4">
              <button
                onClick={() => {
                  setShowMaterialRequestModal(false)
                  setMaterialRequestData(null)
                }}
                className="p-2 text-xs font-medium text-slate-500 hover:text-slate-900 transition-all"
              >
                Abort Request
              </button>
              <button
                onClick={handleSendMaterialRequestConfirm}
                disabled={creatingMaterialRequest || checkingStock}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded  shadow-lg shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all text-xs"
              >
                {creatingMaterialRequest ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
                {creatingMaterialRequest ? 'SYNCHRONIZING...' : 'Material Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <div className=" z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-lg shadow-slate-200/50">
        <div className=" flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium ">Plan Status</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={planHeader.status} />
                <span className="text-xs font-mono text-slate-500">{plan_id || 'Draft'}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-100 mx-2"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-medium ">Materials</span>
              <span className="text-xs  text-slate-700">{rawMaterialItems.length + subAssemblyBomMaterials.length} Items Calculated</span>
            </div>
          </div>

          <div className="flex items-center gap-3">


            {(subAssemblyBomMaterials.length > 0 || fgItems.length > 0) && (
              <>
                <button
                  onClick={createWorkOrders}
                  disabled={creatingWorkOrders || (existingWorkOrders && existingWorkOrders.length > 0) || isReadOnly || !plan_id || fetchingSubAssemblyBoms}
                  className={`flex items-center gap-2 p-2 rounded transition-all text-xs border ${(existingWorkOrders && existingWorkOrders.length > 0) || isReadOnly || !plan_id || fetchingSubAssemblyBoms
                      ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-70'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                    }`}
                  title={
                    existingWorkOrders && existingWorkOrders.length > 0
                      ? `Work orders already exist for this plan (${plan_id})`
                      : !plan_id
                        ? "Save the plan first to generate Work Orders"
                        : fetchingSubAssemblyBoms
                          ? "BOM explosion in progress..."
                          : isReadOnly
                            ? "Switch to Edit mode to generate Work Orders"
                            : "Generate Work Orders"
                  }
                >
                  <Plus size={14} />
                  {creatingWorkOrders ? 'Executing...' : (existingWorkOrders && existingWorkOrders.length > 0 ? 'Work Orders Created' : 'Work Orders')}
                </button>
                <button
                  onClick={createMaterialRequest}
                  disabled={creatingMaterialRequest || isReadOnly || !plan_id || fetchingSubAssemblyBoms}
                  className={`flex items-center gap-2 p-2 rounded transition-all text-xs border ${isReadOnly || !plan_id || fetchingSubAssemblyBoms
                      ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed opacity-70'
                      : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
                    }`}
                  title={
                    !plan_id
                      ? "Save the plan first to create Material Request"
                      : fetchingSubAssemblyBoms
                        ? "BOM explosion in progress..."
                        : "Create Material Request"
                  }
                >
                  <ClipboardList size={14} />
                  {creatingMaterialRequest ? 'Creating...' : 'Material Request'}
                </button>
              </>
            )}

            <div className="h-8 w-px bg-slate-100 mx-2"></div>

            {isReadOnly ? (
              <button
                onClick={() => setIsReadOnly(false)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-xs font-medium"
              >
                <FileText size={16} />
                <span>Edit Strategic Plan</span>
              </button>
            ) : (
              <button
                onClick={saveProductionPlan}
                disabled={savingPlan || !selectedSalesOrders.length || fetchingSubAssemblyBoms}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200  text-xs"
                title={fetchingSubAssemblyBoms ? "BOM explosion in progress..." : "Save Strategic Plan"}
              >
                <Save size={16} />
                {savingPlan ? 'Saving Plan...' : (fetchingSubAssemblyBoms ? 'Exploding BOM...' : 'Save Strategic Plan')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
