import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle, Plus, Trash2, X, ChevronRight, Save, RotateCcw, ChevronDown, ChevronUp, Check, FileText, Settings, Database, Layers, TrendingDown, Package, Users, DollarSign, AlertTriangle, Activity, ArrowLeft } from 'lucide-react'
import * as productionService from '../../services/productionService'
import { suppliersAPI } from '../../services/api'
import SearchableSelect from '../../components/SearchableSelect'
import DraftsList from '../../components/DraftsList'
import Card from '../../components/Card/Card'
import { useDraftSave } from '../../hooks/useDraftSave'

const SectionHeader = ({ title, icon: Icon, subtitle, isExpanded, onToggle, themeColor = 'blue', id, badge, actions }) => {
  const themes = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100/50', icon: 'bg-blue-600 text-white  shadow-blue-100' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100/50', icon: 'bg-emerald-600 text-white  shadow-emerald-100' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100/50', icon: 'bg-amber-600 text-white  shadow-amber-100' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100/50', icon: 'bg-rose-600 text-white  shadow-rose-100' },
    indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100/50', icon: 'bg-indigo-600 text-white  shadow-indigo-100' },
    slate: { text: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-100/50', icon: 'bg-slate-900 text-white  shadow-slate-200' },
    cyan: { text: 'text-cyan-600', bg: 'bg-cyan-50/50', border: 'border-cyan-100/50', icon: 'bg-cyan-600 text-white  shadow-cyan-100' },
    gray: { text: 'text-slate-600', bg: 'bg-slate-50/50', border: 'border-slate-100/50', icon: 'bg-slate-600 text-white  shadow-slate-100' }
  }

  const theme = themes[themeColor] || themes.blue

  return (
    <div
      id={id}
      className={`flex items-center justify-between  p-2 cursor-pointer hover:bg-white/40 transition-all border-b border-slate-100/50 backdrop-blur-sm ${isExpanded ? 'bg-white/20' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-2">
        <div className={` p-2 rounded transition-all duration-500 ${theme.icon} ${isExpanded ? 'scale-110 rotate-3 ' : 'scale-100 '}`}>
          <Icon size={10} strokeWidth={2.2} />
        </div>
        <div>
          <h2 className="text-base flex items-center gap-2">
            <span className={`${theme.text}  text-xs`}>{title.split(' ')[0]}</span>
            <span className="text-slate-900   ">{title.split(' ').slice(1).join(' ')}</span>
          </h2>
          {subtitle && <p className=" text-xs  font-medium text-slate-400  mt-1 opacity-80">{subtitle}</p>}
        </div>
        {badge && (
          <span className={`ml-2 px-3 py-1 ${theme.bg} ${theme.text}  text-xs    rounded border ${theme.border}  tracking-wider`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {actions && <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        <div className={`p-2 rounded  transition-all duration-300 ${isExpanded ? `${theme.bg} ${theme.text}` : 'text-slate-300 bg-slate-50'}`}>
          <ChevronDown size={18} className={`transform transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
    </div>
  )
}

const NavItem = ({ label, icon: Icon, section, isActive, onClick, themeColor = 'blue' }) => {
  const themes = {
    blue: 'text-blue-600 bg-blue-50/30 border-blue-100/50',
    emerald: 'text-emerald-600 bg-emerald-50/30 border-emerald-100/50',
    amber: 'text-amber-600 bg-amber-50/30 border-amber-100/50',
    rose: 'text-rose-600 bg-rose-50/30 border-rose-100/50',
    indigo: 'text-indigo-600 bg-indigo-50/30 border-indigo-100/50',
    slate: 'text-slate-600 bg-slate-50/30 border-slate-100/50',
    cyan: 'text-cyan-600 bg-cyan-50/30 border-cyan-100/50'
  }

  const activeTheme = themes[themeColor] || themes.blue

  return (
    <button
      type="button"
      onClick={() => onClick(section)}
      className={`flex items-center gap-2 p-1 rounded  transition-all duration-300 group relative border ${isActive
        ? `${activeTheme}  border-current/20 scale-[1.02]`
        : 'text-slate-500 hover:bg-white hover:text-slate-900 border-transparent hover:border-slate-100'
        }`}
    >
      <div className={`p-1.5 rounded transition-all duration-300 ${isActive ? 'bg-white ' : 'bg-slate-50 group-hover:bg-white'}`}>
        <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : 'opacity-60'} />
      </div>
      <span className={`text-xs   ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
        {label}
      </span>
      {isActive && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded bg-current opacity-40" />
      )}
    </button>
  )
}

const FieldWrapper = ({ label, children, error, required }) => (
  <div className="">
    <div className="flex items-center justify-between">
      <label className="text-[8px] text-slate-600  text-xs  flex items-center gap-1">
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

export default function BOMForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [formData, setFormData] = useState({
    bom_id: '',
    item_code: '',
    product_name: '',
    item_group: '',
    quantity: '1',
    uom: 'Kg',
    status: 'draft',
    revision: '1',
    is_active: true,
    is_default: false,
    allow_alternative_item: false,
    auto_sub_assembly_rate: false,
    project: '',
    cost_rate_based_on: 'Valuation Rate',
    valuation_rate_value: '',
    selling_rate: '0',
    currency: 'INR',
    with_operations: false,
    process_loss_percentage: '0',
    transfer_material_against: 'Work Order',
    routing: ''
  })
  const [bomLines, setBomLines] = useState([])
  const [rawMaterials, setRawMaterials] = useState([])
  const [operations, setOperations] = useState([])
  const [scrapItems, setScrapItems] = useState([])
  const [newLine, setNewLine] = useState({
    component_code: '',
    component_name: '',
    qty: '1',
    uom: 'Kg',
    item_group: '',
    rate: '0',
    selling_price: '0',
    notes: '',
    loss_percentage: '0',
    scrap_qty: '0'
  })
  const [editingRowId, setEditingRowId] = useState(null)
  const [editingRowData, setEditingRowData] = useState({})
  const [operationsList, setOperationsList] = useState([])
  const [workstationsList, setWorkstationsList] = useState([])
  const [warehousesList, setWarehousesList] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [newRawMaterial, setNewRawMaterial] = useState({
    item_code: '',
    item_name: '',
    item_group: '',
    qty: '1',
    uom: 'Kg',
    rate: '0',
    amount: '0',
    selling_price: '0',
    selling_amount: '0',
    source_warehouse: '',
    operation: ''
  })
  const [newOperation, setNewOperation] = useState({
    operation_name: '',
    workstation_type: '',
    operation_time: '0',
    setup_time: '0',
    fixed_time: '0',
    hourly_rate: '0',
    operating_cost: '0',
    operation_type: 'IN_HOUSE',
    execution_mode: 'IN_HOUSE',
    vendor_rate_per_unit: '0',
    vendor_name: '',
    subcontract_warehouse: '',
    target_warehouse: '',
    notes: ''
  })
  const [newScrapItem, setNewScrapItem] = useState({
    item_code: '',
    item_name: '',
    input_quantity: '0',
    loss_percentage: '0',
    scrap_qty: '0',
    rate: '0'
  })
  const [uomList, setUomList] = useState([
    { label: 'Unit', value: 'Unit' },
    { label: 'Box', value: 'Box' },
    { label: 'Pair', value: 'Pair' },
    { label: 'Set', value: 'Set' },
    { label: 'Meter', value: 'Meter' },
    { label: 'Barleycorn', value: 'Barleycorn' },
    { label: 'Calibre', value: 'Calibre' },
    { label: 'Cable Length (UK)', value: 'Cable Length (UK)' },
    { label: 'Cable Length (US)', value: 'Cable Length (US)' },
    { label: 'Cable Length', value: 'Cable Length' },
    { label: 'Centimeter', value: 'Centimeter' },
    { label: 'Chain', value: 'Chain' },
    { label: 'Decimeter', value: 'Decimeter' },
    { label: 'Ells (UK)', value: 'Ells (UK)' },
    { label: 'Ems(Pica)', value: 'Ems(Pica)' },
    { label: 'Fathom', value: 'Fathom' },
    { label: 'Foot', value: 'Foot' },
    { label: 'Furlong', value: 'Furlong' },
    { label: 'Hand', value: 'Hand' },
    { label: 'Hectometer', value: 'Hectometer' },
    { label: 'Inch', value: 'Inch' },
    { label: 'Kilometer', value: 'Kilometer' },
    { label: 'Link', value: 'Link' },
    { label: 'Micrometer', value: 'Micrometer' },
    { label: 'Mile', value: 'Mile' },
    { label: 'Mile (Nautical)', value: 'Mile (Nautical)' },
    { label: 'Millimeter', value: 'Millimeter' },
    { label: 'Nanometer', value: 'Nanometer' },
    { label: 'Rod', value: 'Rod' },
    { label: 'Vara', value: 'Vara' },
    { label: 'Versta', value: 'Versta' },
    { label: 'Yard', value: 'Yard' },
    { label: 'Arshin', value: 'Arshin' },
    { label: 'Sazhen', value: 'Sazhen' },
    { label: 'Medio Metro', value: 'Medio Metro' },
    { label: 'Square Meter', value: 'Square Meter' },
    { label: 'Centiarea', value: 'Centiarea' },
    { label: 'Area', value: 'Area' },
    { label: 'Manzana', value: 'Manzana' },
    { label: 'Caballeria', value: 'Caballeria' },
    { label: 'Square Kilometer', value: 'Square Kilometer' },
    { label: 'Are', value: 'Are' },
    { label: 'Acre', value: 'Acre' },
    { label: 'Acre (US)', value: 'Acre (US)' },
    { label: 'Hectare', value: 'Hectare' },
    { label: 'Square Yard', value: 'Square Yard' },
    { label: 'Square Foot', value: 'Square Foot' },
    { label: 'Square Inch', value: 'Square Inch' },
    { label: 'Square Centimeter', value: 'Square Centimeter' },
    { label: 'Square Mile', value: 'Square Mile' },
    { label: 'Meter/Second', value: 'Meter/Second' },
    { label: 'Inch/Minute', value: 'Inch/Minute' },
    { label: 'Foot/Minute', value: 'Foot/Minute' },
    { label: 'Inch/Second', value: 'Inch/Second' },
    { label: 'Kilometer/Hour', value: 'Kilometer/Hour' },
    { label: 'Foot/Second', value: 'Foot/Second' },
    { label: 'Mile/Hour', value: 'Mile/Hour' },
    { label: 'Knot', value: 'Knot' },
    { label: 'Mile/Minute', value: 'Mile/Minute' },
    { label: 'Mile/Second', value: 'Mile/Second' },
    { label: 'Carat', value: 'Carat' },
    { label: 'Cental', value: 'Cental' },
    { label: 'Dram', value: 'Dram' },
    { label: 'Grain', value: 'Grain' },
    { label: 'Gram', value: 'Gram' },
    { label: 'Hundredweight (UK)', value: 'Hundredweight (UK)' },
    { label: 'Hundredweight (US)', value: 'Hundredweight (US)' },
    { label: 'Quintal', value: 'Quintal' },
    { label: 'Microgram', value: 'Microgram' },
    { label: 'Milligram', value: 'Milligram' },
    { label: 'Ounce', value: 'Ounce' },
    { label: 'Pood', value: 'Pood' },
    { label: 'Pound', value: 'Pound' },
    { label: 'Slug', value: 'Slug' },
    { label: 'Stone', value: 'Stone' },
    { label: 'Tonne', value: 'Tonne' },
    { label: 'Kip', value: 'Kip' },
    { label: 'Barrel(Beer)', value: 'Barrel(Beer)' },
    { label: 'Barrel (Oil)', value: 'Barrel (Oil)' },
    { label: 'Bushel (UK)', value: 'Bushel (UK)' },
    { label: 'Bushel (US Dry Level)', value: 'Bushel (US Dry Level)' },
    { label: 'Centilitre', value: 'Centilitre' },
    { label: 'Cubic Centimeter', value: 'Cubic Centimeter' },
    { label: 'Cubic Decimeter', value: 'Cubic Decimeter' },
    { label: 'Cubic Foot', value: 'Cubic Foot' },
    { label: 'Cubic Inch', value: 'Cubic Inch' },
    { label: 'Cubic Meter', value: 'Cubic Meter' },
    { label: 'Cubic Millimeter', value: 'Cubic Millimeter' },
    { label: 'Cubic Yard', value: 'Cubic Yard' },
    { label: 'Cup', value: 'Cup' },
    { label: 'Decilitre', value: 'Decilitre' },
    { label: 'Fluid Ounce (UK)', value: 'Fluid Ounce (UK)' },
    { label: 'Fluid Ounce (US)', value: 'Fluid Ounce (US)' },
    { label: 'Gallon (UK)', value: 'Gallon (UK)' },
    { label: 'Gallon Dry (US)', value: 'Gallon Dry (US)' },
    { label: 'Gallon Liquid (US)', value: 'Gallon Liquid (US)' },
    { label: 'Litre', value: 'Litre' },
    { label: 'Millilitre', value: 'Millilitre' },
    { label: 'Peck', value: 'Peck' },
    { label: 'Pint (UK)', value: 'Pint (UK)' },
    { label: 'Pint, Dry (US)', value: 'Pint, Dry (US)' },
    { label: 'Pint, Liquid (US)', value: 'Pint, Liquid (US)' },
    { label: 'Quart (UK)', value: 'Quart (UK)' },
    { label: 'Quart Dry (US)', value: 'Quart Dry (US)' },
    { label: 'Quart Liquid (US)', value: 'Quart Liquid (US)' },
    { label: 'Tablespoon (US)', value: 'Tablespoon (US)' },
    { label: 'Teaspoon', value: 'Teaspoon' },
    { label: 'Day', value: 'Day' },
    { label: 'Hour', value: 'Hour' },
    { label: 'Minute', value: 'Minute' },
    { label: 'Second', value: 'Second' },
    { label: 'Millisecond', value: 'Millisecond' },
    { label: 'Microsecond', value: 'Microsecond' },
    { label: 'Nanosecond', value: 'Nanosecond' },
    { label: 'Week', value: 'Week' },
    { label: 'Atmosphere', value: 'Atmosphere' },
    { label: 'Pascal', value: 'Pascal' },
    { label: 'Bar', value: 'Bar' },
    { label: 'Foot Of Water', value: 'Foot Of Water' },
    { label: 'Hectopascal', value: 'Hectopascal' },
    { label: 'Inches Of Water', value: 'Inches Of Water' },
    { label: 'Inches Of Mercury', value: 'Inches Of Mercury' },
    { label: 'Kilopascal', value: 'Kilopascal' },
    { label: 'Meter Of Water', value: 'Meter Of Water' },
    { label: 'Microbar', value: 'Microbar' },
    { label: 'Millibar', value: 'Millibar' },
    { label: 'Millimeter Of Mercury', value: 'Millimeter Of Mercury' },
    { label: 'Millimeter Of Water', value: 'Millimeter Of Water' },
    { label: 'Technical Atmosphere', value: 'Technical Atmosphere' },
    { label: 'Torr', value: 'Torr' },
    { label: 'Dyne', value: 'Dyne' },
    { label: 'Gram-Force', value: 'Gram-Force' },
    { label: 'Joule/Meter', value: 'Joule/Meter' },
    { label: 'Kilogram-Force', value: 'Kilogram-Force' },
    { label: 'Kilopond', value: 'Kilopond' },
    { label: 'Kilopound-Force', value: 'Kilopound-Force' },
    { label: 'Newton', value: 'Newton' },
    { label: 'Ounce-Force', value: 'Ounce-Force' },
    { label: 'Pond', value: 'Pond' },
    { label: 'Pound-Force', value: 'Pound-Force' },
    { label: 'Poundal', value: 'Poundal' },
    { label: 'Tonne-Force(Metric)', value: 'Tonne-Force(Metric)' },
    { label: 'Ton-Force (UK)', value: 'Ton-Force (UK)' },
    { label: 'Ton-Force (US)', value: 'Ton-Force (US)' },
    { label: 'Btu (It)', value: 'Btu (It)' },
    { label: 'Btu (Th)', value: 'Btu (Th)' },
    { label: 'Btu (Mean)', value: 'Btu (Mean)' },
    { label: 'Calorie (It)', value: 'Calorie (It)' },
    { label: 'Calorie (Th)', value: 'Calorie (Th)' },
    { label: 'Calorie (Mean)', value: 'Calorie (Mean)' },
    { label: 'Calorie (Food)', value: 'Calorie (Food)' },
    { label: 'Erg', value: 'Erg' },
    { label: 'Horsepower-Hours', value: 'Horsepower-Hours' },
    { label: 'Inch Pound-Force', value: 'Inch Pound-Force' },
    { label: 'Joule', value: 'Joule' },
    { label: 'Kilojoule', value: 'Kilojoule' },
    { label: 'Kilocalorie', value: 'Kilocalorie' },
    { label: 'Kilowatt-Hour', value: 'Kilowatt-Hour' },
    { label: 'Litre-Atmosphere', value: 'Litre-Atmosphere' },
    { label: 'Megajoule', value: 'Megajoule' },
    { label: 'Watt-Hour', value: 'Watt-Hour' },
    { label: 'Btu/Hour', value: 'Btu/Hour' },
    { label: 'Btu/Minutes', value: 'Btu/Minutes' },
    { label: 'Btu/Seconds', value: 'Btu/Seconds' },
    { label: 'Calorie/Seconds', value: 'Calorie/Seconds' },
    { label: 'Horsepower', value: 'Horsepower' },
    { label: 'Kilowatt', value: 'Kilowatt' },
    { label: 'Megawatt', value: 'Megawatt' },
    { label: 'Volt-Ampere', value: 'Volt-Ampere' },
    { label: 'Watt', value: 'Watt' },
    { label: 'Centigram/Litre', value: 'Centigram/Litre' },
    { label: 'Decigram/Litre', value: 'Decigram/Litre' },
    { label: 'Dekagram/Litre', value: 'Dekagram/Litre' },
    { label: 'Hectogram/Litre', value: 'Hectogram/Litre' },
    { label: 'Gram/Cubic Meter', value: 'Gram/Cubic Meter' },
    { label: 'Gram/Cubic Centimeter', value: 'Gram/Cubic Centimeter' },
    { label: 'Gram/Cubic Millimeter', value: 'Gram/Cubic Millimeter' },
    { label: 'Gram/Litre', value: 'Gram/Litre' },
    { label: 'Grain/Gallon (US)', value: 'Grain/Gallon (US)' },
    { label: 'Grain/Gallon (UK)', value: 'Grain/Gallon (UK)' },
    { label: 'Grain/Cubic Foot', value: 'Grain/Cubic Foot' },
    { label: 'Kilogram/Cubic Meter', value: 'Kilogram/Cubic Meter' },
    { label: 'Kilogram/Cubic Centimeter', value: 'Kilogram/Cubic Centimeter' },
    { label: 'Kilogram/Litre', value: 'Kilogram/Litre' },
    { label: 'Milligram/Cubic Meter', value: 'Milligram/Cubic Meter' },
    { label: 'Milligram/Cubic Centimeter', value: 'Milligram/Cubic Centimeter' },
    { label: 'Milligram/Cubic Millimeter', value: 'Milligram/Cubic Millimeter' },
    { label: 'Megagram/Litre', value: 'Megagram/Litre' },
    { label: 'Milligram/Litre', value: 'Milligram/Litre' },
    { label: 'Microgram/Litre', value: 'Microgram/Litre' },
    { label: 'Nanogram/Litre', value: 'Nanogram/Litre' },
    { label: 'Ounce/Cubic Inch', value: 'Ounce/Cubic Inch' },
    { label: 'Ounce/Cubic Foot', value: 'Ounce/Cubic Foot' },
    { label: 'Ounce/Gallon (US)', value: 'Ounce/Gallon (US)' },
    { label: 'Ounce/Gallon (UK)', value: 'Ounce/Gallon (UK)' },
    { label: 'Pound/Cubic Inch', value: 'Pound/Cubic Inch' },
    { label: 'Pound/Cubic Foot', value: 'Pound/Cubic Foot' },
    { label: 'Pound/Cubic Yard', value: 'Pound/Cubic Yard' },
    { label: 'Pound/Gallon (US)', value: 'Pound/Gallon (US)' },
    { label: 'Pound/Gallon (UK)', value: 'Pound/Gallon (UK)' },
    { label: 'Nos', value: 'Nos' },
    { label: 'Kg', value: 'Kg' }
  ])
  const [itemGroups, setItemGroups] = useState([])
  const [expandedSections, setExpandedSections] = useState({
    product: true,
    components: true,
    raw_materials: true,
    operations: true,
    scrap: false,
    settings: true
  })
  const [expandedItemGroups, setExpandedItemGroups] = useState({})
  const [showDrafts, setShowDrafts] = useState(false)
  const [activeSection, setActiveSection] = useState('product')

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }))
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        const headerOffset = 100
        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  const { loadDraft, deleteDraft, clearCurrentDraft } = useDraftSave('BOM', {
    formData,
    bomLines,
    rawMaterials,
    operations,
    scrapItems
  })

  useEffect(() => {
    fetchItems()
    fetchOperations()
    fetchWorkstations()
    fetchWarehouses()
    fetchSuppliers()
    fetchUOMs()
    fetchItemGroups()
    if (id) {
      fetchBOMDetails(id)
    }
  }, [id])

  useEffect(() => {
    const updateSubAssemblyRates = async () => {
      const updatedMaterials = [...rawMaterials]
      let hasChanges = false

      for (let i = 0; i < updatedMaterials.length; i++) {
        const material = updatedMaterials[i]
        const item = items.find(it => it.item_code === material.item_code)

        if (item && (item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')) {
          try {
            const bomsResponse = await productionService.getBOMs({ item_code: material.item_code })
            if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
              const bom = bomsResponse.data[0]
              let totalCost = parseFloat(bom.total_cost || 0)
              const bomQuantity = parseFloat(bom.quantity || 1)

              if ((totalCost === 0 || !totalCost) && bom.bom_id) {
                try {
                  const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
                  const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
                  if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
                    totalCost = 0
                    for (const line of bomDetails.lines) {
                      try {
                        const itemResp = await productionService.getItemDetails(line.component_code)
                        if (itemResp && itemResp.data) {
                          const itemRate = parseFloat(itemResp.data.valuation_rate || 0)
                          const qty = parseFloat(line.quantity || 0)
                          totalCost += (itemRate * qty)
                        }
                      } catch (e) {
                        console.warn(`Failed to fetch cost for ${line.component_code}:`, e)
                      }
                    }
                  }
                } catch (detailErr) {
                  console.warn('Failed to fetch BOM details for', material.item_code, ':', detailErr.message)
                  totalCost = parseFloat(item.valuation_rate || 0)
                }
              }

              const costPerUnit = totalCost > 0 ? totalCost / bomQuantity : 0
              const newRate = costPerUnit.toFixed(2)

              if (newRate !== updatedMaterials[i].rate) {
                updatedMaterials[i] = { ...updatedMaterials[i], rate: newRate, amount: (parseFloat(updatedMaterials[i].qty || 0) * newRate).toFixed(2) }
                hasChanges = true
              }
            }
          } catch (bomErr) {
            console.warn('Failed to fetch BOM for sub-assembly', material.item_code, ':', bomErr.message)
          }
        }
      }

      if (hasChanges) {
        setRawMaterials(updatedMaterials)
      }
    }

    if (rawMaterials.length > 0 && items.length > 0) {
      updateSubAssemblyRates()
    }
  }, [id])

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['product', 'settings', 'components', 'raw_materials', 'operations', 'scrap', 'costing']
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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  const handleLoadDraft = (draftId, draftData) => {
    if (draftData) {
      setFormData(draftData.formData || {})
      setBomLines(draftData.bomLines || [])
      setRawMaterials(draftData.rawMaterials || [])
      setOperations(draftData.operations || [])
      setScrapItems(draftData.scrapItems || [])
      setShowDrafts(false)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await productionService.getItemsList()
      setItems(response.data || [])
    } catch (err) {
      console.error('Failed to fetch items:', err)
    }
  }

  const fetchOperations = async () => {
    try {
      const response = await productionService.getOperationsList()
      setOperationsList(response.data || [])
    } catch (err) {
      console.error('Failed to fetch operations:', err)
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await productionService.getWorkstationsList()
      setWorkstationsList(response.data || [])
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const response = await productionService.getWarehouses()
      const warehousesData = response.data?.data || response.data || []
      setWarehousesList(Array.isArray(warehousesData) ? warehousesData : [])
    } catch (err) {
      console.error('Failed to fetch warehouses:', err)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.list()
      const suppliersData = response.data?.data || response.data || []
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : [])
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    }
  }

  const fetchUOMs = async () => {
    try {
      const response = await productionService.getUOMList()
      setUomList(response.data || [])
    } catch (err) {
      console.error('Failed to fetch UOM list:', err)
    }
  }

  const fetchItemGroups = async () => {
    try {
      const response = await productionService.getItemGroups()
      if (response.data) {
        setItemGroups(response.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch item groups:', err)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    try {
      const response = await productionService.getBOMDetails(bomId)
      const bom = response.data

      let itemGroupValue = bom.item_group || bom.items_group || ''
      let productNameValue = bom.product_name || ''

      if (bom.item_code) {
        try {
          const itemResponse = await productionService.getItemDetails(bom.item_code)
          if (itemResponse.success && itemResponse.data) {
            const itemData = itemResponse.data
            itemGroupValue = itemData.item_group || itemGroupValue
            productNameValue = itemData.name || itemData.item_name || productNameValue
          }
        } catch (itemErr) {
          console.warn('Failed to fetch item details:', itemErr)
        }
      }

      setFormData({
        bom_id: bom.bom_id,
        item_code: bom.item_code,
        product_name: productNameValue,
        item_group: itemGroupValue,
        quantity: bom.quantity || 1,
        uom: bom.uom || 'Kg',
        status: bom.status || 'draft',
        revision: bom.revision || 1,
        is_active: bom.is_active !== false,
        is_default: bom.is_default === true,
        allow_alternative_item: bom.allow_alternative_item === true,
        auto_sub_assembly_rate: bom.auto_sub_assembly_rate === true,
        project: bom.project || '',
        cost_rate_based_on: bom.cost_rate_based_on || 'Valuation Rate',
        valuation_rate_value: bom.valuation_rate_value || '',
        currency: bom.currency || 'INR',
        with_operations: bom.with_operations === true,
        process_loss_percentage: bom.process_loss_percentage || 0
      })
      const linesWithIds = (bom.lines || []).map((l, idx) => ({
        ...l,
        id: l.id || `line-${Date.now()}-${idx}`,
        qty: l.qty || l.quantity || 0,
        component_name: l.component_name || l.component_description || ''
      }))
      setBomLines(linesWithIds)
      const materialsWithIds = (bom.rawMaterials || []).map((m, idx) => {
        const qty = parseFloat(m.qty || m.quantity || 0)
        const rate = parseFloat(m.rate || 0)
        const sellingPrice = parseFloat(m.selling_price || 0)
        return {
          ...m,
          id: m.id || `mat-${Date.now()}-${idx}`,
          qty,
          amount: m.amount || (qty * rate),
          selling_amount: m.selling_amount || (qty * sellingPrice)
        }
      })
      setRawMaterials(materialsWithIds)
      setOperations(bom.operations || [])
      setScrapItems(bom.scrapItems || [])
    } catch (err) {
      setError('Failed to load BOM details')
    }
  }

  const handleInputChange = async (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)

    if (name === 'item_code' && value) {
      try {
        const response = await productionService.getItemDetails(value)
        if (response.success && response.data) {
          const itemData = response.data
          setFormData(prev => ({
            ...prev,
            product_name: itemData.name || itemData.item_name || prev.product_name,
            item_group: itemData.item_group || prev.item_group,
            uom: itemData.uom || prev.uom,
            selling_rate: itemData.selling_rate || '0',
            valuation_rate_value: itemData.valuation_rate || '0',
            weight_per_unit: itemData.weight_per_unit || prev.weight_per_unit,
            weight_uom: itemData.weight_uom || prev.weight_uom
          }))
        }
      } catch (err) {
        console.error('Failed to fetch item details:', err)
      }
    }
  }

  const handleProductNameChange = async (value) => {
    setFormData(prev => ({
      ...prev,
      product_name: value
    }))
    setError(null)

    if (value) {
      const selectedItem = items.find(item =>
        (item.name === value || item.item_name === value) &&
        (item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
      )
      if (selectedItem) {
        setFormData(prev => ({
          ...prev,
          item_code: selectedItem.item_code,
          product_name: value,
          item_group: selectedItem.item_group || prev.item_group,
          uom: selectedItem.uom || prev.uom,
          selling_rate: selectedItem.selling_rate || '0',
          valuation_rate_value: selectedItem.valuation_rate || '0'
        }))
      }
    }
  }

  const handleItemCodeChange = (value) => {
    const selectedItem = items.find(item => item.item_code === value)
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        item_code: value,
        product_name: selectedItem.name || selectedItem.item_name || prev.product_name,
        item_group: selectedItem.item_group || prev.item_group,
        uom: selectedItem.uom || prev.uom,
        selling_rate: selectedItem.selling_rate || '0',
        valuation_rate_value: selectedItem.valuation_rate || '0'
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        item_code: value
      }))
    }
    setError(null)
  }

  const handleLineChange = async (e) => {
    const { name, value } = e.target
    setNewLine(prev => ({
      ...prev,
      [name]: value
    }))

    if (name === 'component_code' && value) {
      try {
        const response = await productionService.getItemDetails(value)
        if (response.success && response.data) {
          const itemData = response.data
          let sellingPrice = itemData.selling_rate || '0'
          let valuationRate = itemData.valuation_rate || '0'
          let rate = (valuationRate !== '0' && valuationRate !== 0) ? valuationRate : (itemData.selling_rate || '0')

          if (itemData.item_group === 'Sub Assemblies' || itemData.item_group === 'Sub-assembly') {
            try {
              const bomsResponse = await productionService.getBOMs({ item_code: value })
              if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
                const bom = bomsResponse.data[0]
                let totalCost = parseFloat(bom.total_cost || 0)
                const bomQuantity = parseFloat(bom.quantity || 1)

                if ((totalCost === 0 || !totalCost) && bom.bom_id) {
                  try {
                    const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
                    const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
                    if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
                      totalCost = 0
                      for (const line of bomDetails.lines) {
                        try {
                          const itemResp = await productionService.getItemDetails(line.component_code)
                          if (itemResp && itemResp.data) {
                            const rate = parseFloat(itemResp.data.valuation_rate || 0)
                            const qty = parseFloat(line.quantity || 0)
                            totalCost += (rate * qty)
                          }
                        } catch (e) {
                          console.warn(`Failed to fetch cost for ${line.component_code}:`, e)
                        }
                      }
                    }
                  } catch (detailErr) {
                    console.warn('Failed to fetch BOM details for', value, ':', detailErr.message)
                    totalCost = parseFloat(itemData.valuation_rate || 0)
                  }
                }

                const costPerUnit = totalCost / bomQuantity
                rate = costPerUnit.toFixed(2)
                if (bom.selling_rate && parseFloat(bom.selling_rate) > 0) {
                  sellingPrice = (parseFloat(bom.selling_rate) / bomQuantity).toFixed(2)
                }
              }
            } catch (bomErr) {
              console.warn('Failed to fetch BOM for sub-assembly:', bomErr)
              rate = itemData.valuation_rate || '0'
            }
          }

          setNewLine(prev => ({
            ...prev,
            component_name: itemData.name || itemData.item_name || prev.component_name,
            uom: itemData.uom || prev.uom,
            rate: rate,
            selling_price: sellingPrice,
            loss_percentage: itemData.loss_percentage || '0'
          }))
        }
      } catch (err) {
        console.error('Failed to fetch component item details:', err)
      }
    }
  }

  const handleScrapItemChange = async (value) => {
    setNewScrapItem(prev => ({
      ...prev,
      item_code: value
    }))

    if (value) {
      try {
        const response = await productionService.getItemDetails(value)
        if (response.success && response.data) {
          const itemData = response.data
          setNewScrapItem(prev => ({
            ...prev,
            item_name: itemData.name || itemData.item_name || prev.item_name,
            rate: itemData.valuation_rate || itemData.selling_rate || prev.rate || '0'
          }))
        }
      } catch (err) {
        console.error('Failed to fetch scrap item details:', err)
      }
    }
  }

  const handleComponentChange = async (value) => {
    let item = items.find(i => i.item_code === value)
    let valuationRate = item?.valuation_rate || '0'
    let sellingPrice = item?.selling_rate || '0'
    let rate = (valuationRate !== '0' && valuationRate !== 0) ? valuationRate : (item?.selling_rate || '0')
    let componentName = item?.name || ''

    if (!componentName) {
      try {
        const itemResp = await productionService.getItemDetails(value)
        if (itemResp && itemResp.data) {
          componentName = itemResp.data.name || itemResp.data.item_name || ''
          rate = itemResp.data.valuation_rate || itemResp.data.selling_rate || rate
          sellingPrice = itemResp.data.selling_rate || sellingPrice
          item = itemResp.data
        }
      } catch (e) {
        console.warn(`Failed to fetch item details for ${value}:`, e)
      }
    }

    const isFinishedGoods = item?.item_group === 'Finished Goods' || item?.item_group === 'Finished good'
    const isSubAssembly = item?.item_group === 'Sub Assemblies' || item?.item_group === 'Sub-assembly'

    if (isFinishedGoods || isSubAssembly) {
      try {
        const bomsResponse = await productionService.getBOMs({ item_code: value })
        if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
          const bom = bomsResponse.data[0]
          let totalCost = parseFloat(bom.total_cost || 0)
          const bomQuantity = parseFloat(bom.quantity || 1)

          if ((totalCost === 0 || !totalCost) && bom.bom_id) {
            try {
              const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
              const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
              if (bomDetails) {
                totalCost = 0
                // Sum up materials cost
                if (bomDetails.lines) {
                  for (const line of bomDetails.lines) {
                    const itemResp = await productionService.getItemDetails(line.component_code)
                    const itemRate = parseFloat(itemResp?.data?.valuation_rate || line.rate || 0)
                    totalCost += (itemRate * parseFloat(line.quantity || 0))
                  }
                }
                // Sum up operations cost
                if (bomDetails.operations) {
                  for (const op of bomDetails.operations) {
                    totalCost += parseFloat(op.operating_cost || 0)
                  }
                }
              }
            } catch (detailErr) {
              console.warn('Failed to fetch BOM details for cost calculation:', detailErr)
            }
          }

          rate = (totalCost / bomQuantity).toFixed(2)
          if (bom.selling_rate && parseFloat(bom.selling_rate) > 0) {
            sellingPrice = (parseFloat(bom.selling_rate) / bomQuantity).toFixed(2)
          } else if (bom.total_cost && parseFloat(bom.total_cost) > 0) {
            // Fallback: if no selling rate, use total cost as selling price for reference
            sellingPrice = (parseFloat(bom.total_cost) / bomQuantity).toFixed(2)
          }

          // Optional: Explosion logic for Finished Goods
          if (isFinishedGoods && window.confirm(`Explode BOM for ${componentName}? (Cancel to add as a single item)`)) {
            const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
            const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
            if (bomDetails && bomDetails.lines && bomDetails.lines.length > 0) {
              const newBomLines = []
              for (const line of bomDetails.lines) {
                try {
                  const itemResp = await productionService.getItemDetails(line.component_code)
                  const itemRate = itemResp?.data?.valuation_rate || 0
                  const qty = parseFloat(line.quantity || 0)
                  const amount = (itemRate * qty).toFixed(2)
                  
                  newBomLines.push({
                    id: Date.now() + Math.random(),
                    component_code: line.component_code,
                    component_name: line.component_name || itemResp?.data?.name || '',
                    qty: qty.toString(),
                    uom: line.uom || 'Kg',
                    item_group: line.item_group,
                    rate: itemRate.toString(),
                    amount: amount,
                    loss_percentage: itemResp?.data?.loss_percentage || '0',
                    scrap_qty: '0',
                    notes: line.notes || ''
                  })
                } catch (e) { console.warn(e) }
              }
              if (newBomLines.length > 0) {
                setBomLines([...bomLines, ...newBomLines])
                setNewLine({ component_code: '', component_name: '', qty: '1', uom: 'Kg', item_group: '', rate: '0', selling_price: '0', notes: '', loss_percentage: '0', scrap_qty: '0' })
                return
              }
            }
          }
        }
      } catch (bomErr) {
        console.warn('Failed to fetch BOM for component:', bomErr)
      }
    }

    const selectedItem = items.find(i => i.item_code === value) || item
    const lossPercentage = selectedItem?.loss_percentage || '0'
    setNewLine({
      ...newLine,
      component_code: value,
      component_name: componentName,
      rate,
      selling_price: sellingPrice,
      uom: selectedItem?.uom || newLine.uom,
      item_group: selectedItem?.item_group || newLine.item_group,
      loss_percentage: lossPercentage
    })
  }

  const handleRawMaterialItemChange = async (value) => {
    let item = items.find(i => i.item_code === value)
    let valuationRate = item?.valuation_rate || '0'
    let sellingPrice = item?.selling_rate || '0'
    let rate = (valuationRate !== '0' && valuationRate !== 0) ? valuationRate : (item?.selling_rate || '0')

    if (!item) {
      try {
        const itemResp = await productionService.getItemDetails(value)
        if (itemResp && itemResp.data) {
          item = itemResp.data
          rate = item.valuation_rate || item.selling_rate || rate
          sellingPrice = item.selling_rate || sellingPrice
        }
      } catch (e) {
        console.warn(`Failed to fetch item details for ${value}:`, e)
      }
    }

    if (item?.item_group === 'Sub Assemblies' || item?.item_group === 'Sub-assembly') {
      try {
        const bomsResponse = await productionService.getBOMs({ item_code: value })
        if (bomsResponse && bomsResponse.data && bomsResponse.data.length > 0) {
          const bom = bomsResponse.data[0]
          let totalCost = parseFloat(bom.total_cost || 0)
          const bomQuantity = parseFloat(bom.quantity || 1)

          if ((totalCost === 0 || !totalCost) && bom.bom_id) {
            try {
              const bomDetailsResponse = await productionService.getBOMDetails(bom.bom_id)
              const bomDetails = bomDetailsResponse && bomDetailsResponse.data ? bomDetailsResponse.data : bomDetailsResponse
              if (bomDetails) {
                totalCost = 0
                if (bomDetails.lines) {
                  for (const line of bomDetails.lines) {
                    const itemResp = await productionService.getItemDetails(line.component_code)
                    const itemRate = parseFloat(itemResp?.data?.valuation_rate || line.rate || 0)
                    totalCost += (itemRate * parseFloat(line.quantity || 0))
                  }
                }
                if (bomDetails.operations) {
                  for (const op of bomDetails.operations) {
                    totalCost += parseFloat(op.operating_cost || 0)
                  }
                }
              }
            } catch (detailErr) { console.warn(detailErr) }
          }

          rate = (totalCost / bomQuantity).toFixed(2)
          if (bom.selling_rate && parseFloat(bom.selling_rate) > 0) {
            sellingPrice = (parseFloat(bom.selling_rate) / bomQuantity).toFixed(2)
          } else if (bom.total_cost && parseFloat(bom.total_cost) > 0) {
            sellingPrice = (parseFloat(bom.total_cost) / bomQuantity).toFixed(2)
          }
        }
      } catch (bomErr) {
        console.warn('Failed to fetch BOM for sub-assembly:', bomErr)
      }
    }

    setNewRawMaterial({
      ...newRawMaterial,
      item_code: value,
      item_name: item?.name || item?.item_name || '',
      item_group: item?.item_group || '',
      uom: item?.uom || newRawMaterial.uom,
      rate,
      amount: (parseFloat(newRawMaterial.qty || 0) * parseFloat(rate || 0)).toFixed(2),
      selling_price: sellingPrice,
      selling_amount: (parseFloat(newRawMaterial.qty || 0) * parseFloat(sellingPrice || 0)).toFixed(2),
      source_warehouse: item?.stock?.[0]?.warehouse_code || item?.stock?.[0]?.warehouse_name || newRawMaterial.source_warehouse
    })
  }

  const handleNewRawMaterialChange = (field, value) => {
    setNewRawMaterial(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'qty' || field === 'rate' || field === 'selling_price') {
        const qty = parseFloat(updated.qty) || 0
        const rate = parseFloat(updated.rate) || 0
        const sellingPrice = parseFloat(updated.selling_price) || 0
        updated.amount = (qty * rate).toFixed(2)
        updated.selling_amount = (qty * sellingPrice).toFixed(2)
      }
      return updated
    })
  }

  const addBomLine = () => {
    if (!newLine.component_code || !newLine.qty) {
      setError('Please fill component code and quantity')
      return
    }
    const qty = parseFloat(newLine.qty) || 0
    const rate = parseFloat(newLine.rate) || 0
    const sellingPrice = parseFloat(newLine.selling_price) || 0
    const amount = qty * rate
    const selling_amount = qty * sellingPrice
    const lossPercentage = parseFloat(newLine.loss_percentage) || 0
    const scrapQty = (qty * lossPercentage) / 100
    setBomLines([...bomLines, {
      ...newLine,
      id: Date.now(),
      amount,
      selling_amount,
      loss_percentage: lossPercentage,
      scrap_qty: scrapQty
    }])
    setNewLine({
      component_code: '',
      component_name: '',
      qty: '1',
      uom: 'Kg',
      item_group: '',
      rate: '0',
      selling_price: '0',
      notes: '',
      loss_percentage: '0',
      scrap_qty: '0'
    })
  }

  const removeBomLine = (lineId) => {
    setBomLines(bomLines.filter(line => line.id !== lineId))
  }

  const updateBomLine = (lineId, field, value) => {
    setBomLines(bomLines.map(line => {
      if (line.id === lineId) {
        const updated = { ...line, [field]: value }
        if (field === 'qty' || field === 'rate' || field === 'selling_price' || field === 'loss_percentage') {
          const qty = parseFloat(updated.qty) || 0
          const rate = parseFloat(updated.rate) || 0
          const sellingPrice = parseFloat(updated.selling_price) || 0
          const lossPercentage = parseFloat(updated.loss_percentage) || 0

          updated.amount = (qty * rate).toFixed(2)
          updated.selling_amount = (qty * sellingPrice).toFixed(2)
          updated.scrap_qty = ((qty * lossPercentage) / 100).toFixed(2)
        }
        return updated
      }
      return line
    }))
  }

  const removeRawMaterial = (materialId) => {
    setRawMaterials(rawMaterials.filter(material => material.id !== materialId))
  }

  const updateRawMaterial = (materialId, field, value) => {
    setRawMaterials(rawMaterials.map(material => {
      if (material.id === materialId) {
        const updated = { ...material, [field]: value }
        if (field === 'qty' || field === 'rate' || field === 'selling_price') {
          const qty = parseFloat(updated.qty) || 0
          const rate = parseFloat(updated.rate) || 0
          const sellingPrice = parseFloat(updated.selling_price) || 0
          updated.amount = (qty * rate).toFixed(2)
          updated.selling_amount = (qty * sellingPrice).toFixed(2)
        }
        return updated
      }
      return material
    }))
  }

  const addNewRawMaterial = () => {
    if (!newRawMaterial.item_code || !newRawMaterial.qty) {
      setError('Please enter item code and quantity')
      return
    }
    const qty = parseFloat(newRawMaterial.qty) || 0
    const rate = parseFloat(newRawMaterial.rate) || 0
    const sellingPrice = parseFloat(newRawMaterial.selling_price) || 0
    const amount = qty * rate
    const selling_amount = qty * sellingPrice

    setRawMaterials([...rawMaterials, { ...newRawMaterial, id: Date.now(), amount, selling_amount }])
    setNewRawMaterial({
      item_code: '',
      item_name: '',
      item_group: '',
      qty: '1',
      uom: 'Kg',
      rate: '0',
      amount: '0',
      selling_price: '0',
      selling_amount: '0',
      source_warehouse: '',
      operation: ''
    })
    setError(null)
  }

  const calculateOperationCost = (cycleTime, setupTime, hourlyRate, executionMode, vendorRate) => {
    if (executionMode === 'OUTSOURCE') {
      // For outsource, cost is per unit (we assume quantity 1 for BOM base cost)
      return parseFloat(vendorRate) || 0
    }
    const cycleTimeMinutes = parseFloat(cycleTime) || 0
    const setupTimeMinutes = parseFloat(setupTime) || 0
    const totalTimeMinutes = cycleTimeMinutes + setupTimeMinutes
    const rate = parseFloat(hourlyRate) || 0
    return (totalTimeMinutes / 60) * rate
  }

  const addOperation = () => {
    if (!newOperation.operation_name) {
      setError('Please enter operation name')
      return
    }
    if (newOperation.execution_mode === 'OUTSOURCE' && !newOperation.vendor_name) {
      setError('Please select a vendor for outsourced operation')
      return
    }
    const calculatedCost = calculateOperationCost(
      newOperation.operation_time, 
      newOperation.setup_time, 
      newOperation.hourly_rate,
      newOperation.execution_mode,
      newOperation.vendor_rate_per_unit
    )
    setOperations([...operations, { ...newOperation, operating_cost: calculatedCost.toFixed(2), id: Date.now() }])
    setNewOperation({
      operation_name: '',
      workstation_type: '',
      operation_time: '0',
      setup_time: '0',
      fixed_time: '0',
      hourly_rate: '0',
      operating_cost: '0',
      operation_type: 'IN_HOUSE',
      execution_mode: 'IN_HOUSE',
      vendor_rate_per_unit: '0',
      vendor_name: '',
      subcontract_warehouse: '',
      target_warehouse: '',
      notes: ''
    })
  }

  const removeOperation = (opId) => {
    setOperations(operations.filter(op => op.id !== opId))
  }

  const addScrapItem = () => {
    if (!newScrapItem.input_quantity) {
      setError('Please fill Input Qty')
      return
    }
    setScrapItems([...scrapItems, { ...newScrapItem, id: Date.now() }])
    setNewScrapItem({
      item_code: '',
      item_name: '',
      input_quantity: '0',
      loss_percentage: '0',
      scrap_qty: '0',
      rate: '0'
    })
  }

  const updateScrapItemLoss = (itemId, lossPercent) => {
    setScrapItems(scrapItems.map(item =>
      item.id === itemId ? { ...item, loss_percentage: lossPercent } : item
    ))
  }

  const removeScrapItem = (itemId) => {
    setScrapItems(scrapItems.filter(item => item.id !== itemId))
  }

  const calculateRMConsumption = (quantity) => {
    return rawMaterials.map(rm => ({
      item_code: rm.item_code,
      item_name: rm.item_name,
      qty_required: (parseFloat(rm.qty) || 0) * (parseFloat(quantity) || 0),
      uom: rm.uom,
      source_warehouse: rm.source_warehouse,
      operation: rm.operation,
      cost: (parseFloat(rm.amount) || 0) * (parseFloat(quantity) || 0)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.item_code || !formData.quantity) {
        throw new Error('Please fill all required fields')
      }

      const payload = {
        ...formData,
        lines: bomLines.filter(line => line.component_code && line.component_code.trim()),
        rawMaterials: rawMaterials.filter(rm => rm.item_code && rm.item_code.trim()),
        operations: operations,
        scrapItems: scrapItems,
        quantity: parseFloat(formData.quantity),
        revision: parseInt(formData.revision),
        process_loss_percentage: parseFloat(formData.process_loss_percentage),
        total_cost: totalBOMCost
      }



      if (id) {
        await productionService.updateBOM(id, payload)
      } else {
        await productionService.createBOM(payload)
      }

      clearCurrentDraft()
      navigate('/manufacturing/bom', { state: { success: id ? 'BOM updated successfully' : 'BOM created successfully' } })
    } catch (err) {
      setError(err.message || 'Failed to save BOM')
    } finally {
      setLoading(false)
    }
  }

  const totalComponentCost = bomLines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0)
  const totalRawMaterialCost = rawMaterials.reduce((sum, rm) => sum + (parseFloat(rm.amount) || 0), 0)
  const totalOperationCost = operations.reduce((sum, op) => sum + (parseFloat(op.operating_cost) || 0), 0)
  const totalScrapQty = bomLines.reduce((sum, line) => sum + (parseFloat(line.scrap_qty) || 0), 0) +
    scrapItems.reduce((sum, item) => sum + (parseFloat(item.input_quantity) || 0), 0)
  const totalScrapLossCost = scrapItems.reduce((sum, item) => {
    const qty = parseFloat(item.input_quantity) || 0
    const rate = parseFloat(item.rate) || 0
    return sum + (qty * rate)
  }, 0)

  const materialCost = (totalComponentCost + totalRawMaterialCost) - totalScrapLossCost
  const labourCost = totalOperationCost
  const totalBOMCost = materialCost + labourCost

  const groupRawMaterialsByItemGroup = () => {
    const grouped = {}
    rawMaterials.forEach(material => {
      const group = material.item_group || 'Unclassified'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(material)
    })
    return grouped
  }

  const groupedRawMaterials = groupRawMaterialsByItemGroup()
  const itemGroupsInOrder = Object.keys(groupedRawMaterials).sort()

  const toggleItemGroup = (group) => {
    setExpandedItemGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }))
  }

  return (
    <div className="min-h-screen bg-slate-50 p-2/50 p-2">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className=" p-2bg-slate-900 rounded   shadow-slate-200">
              <Layers className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl  text-slate-900 leading-tight ">
                {id ? 'Strategic BOM' : 'New Formulation'}
              </h1>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-1">
                <Activity size={12} className="text-indigo-500" />
                <span>Manufacturing Intelligence</span>
                <span className="w-1.5 h-1.5 rounded bg-slate-200" />
                <span className="text-indigo-600 ">{formData.status?.toUpperCase() || 'DRAFT'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDrafts(true)}
              className="inline-flex items-center gap-2 rounded bg-white p-2.5 text-xs  text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95  "
            >
              <FileText size={18} className="text-indigo-600" />
              Intelligence Drafts
            </button>
            <button
              type="button"
              onClick={() => navigate('/manufacturing/bom')}
              className="inline-flex items-center gap-2 rounded bg-white p-2.5 text-xs  text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95  "
            >
              <ArrowLeft size={18} />
              Return
            </button>
          </div>
        </div>

        <form id="bom-form" onSubmit={handleSubmit} className="relative">
          <div className="space-y-2">
            {/* Horizontal Header Navigation */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
              {/* BOM Intelligence Widget */}
              <div className="md:w-1/3 bg-slate-900 rounded p-2 relative group overflow-hidden  shadow-slate-200/50">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000" />
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/5 rounded blur-3xl group-hover:bg-emerald-500/10 transition-all duration-1000" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-2 h-2 rounded bg-indigo-500 animate-ping absolute inset-0" />
                        <div className="w-2 h-2 rounded bg-indigo-500 relative z-10" />
                      </div>
                      <span className="text-white text-[10px] opacity-70   ">Neural Core</span>
                    </div>
                    <div className="flex -space-x-1.5">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded border border-slate-800 bg-slate-800/50 flex items-center justify-center backdrop-blur-sm">
                          <div className="w-1 h-1 rounded bg-indigo-400/40" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded p-2 border border-white/5 backdrop-blur-md">
                      <p className="text-slate-500 text-[8px]   mb-1 ">Protocol</p>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <Activity size={12} className="text-indigo-400 shrink-0" />
                        <p className="text-white text-[10px] truncate capitalize">
                          {activeSection.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded  p-2.5 border border-white/5 backdrop-blur-sm hover:border-indigo-500/20 transition-all">
                      <p className="text-slate-500 text-[8px]   mb-1 ">Nodes</p>
                      <div className="flex items-center gap-1.5">
                        <Database size={12} className="text-slate-400" />
                        <p className="text-white text-sm  ">
                          {rawMaterials.length + bomLines.length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded  p-2.5 border border-white/5 backdrop-blur-sm hover:border-emerald-500/20 transition-all">
                      <p className="text-slate-500 text-[8px]   mb-1 ">Ops</p>
                      <div className="flex items-center gap-1.5">
                        <Settings size={12} className="text-slate-400" />
                        <p className="text-white text-sm  ">
                          {operations.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Links - Horizontal */}
              <div className="md:w-2/3 flex flex-col justify-between gap-3">
                <div className="bg-white/70 backdrop-blur-2xl rounded border border-slate-200/60  p-1.5 flex flex-wrap items-center gap-1.5">
                  <NavItem
                    label="Product"
                    icon={Database}
                    section="product"
                    isActive={activeSection === 'product'}
                    onClick={scrollToSection}
                    themeColor="blue"
                  />

                  <NavItem
                    label="Components"
                    icon={Layers}
                    section="components"
                    isActive={activeSection === 'components'}
                    onClick={scrollToSection}
                    themeColor="indigo"
                  />
                  <NavItem
                    label="Materials"
                    icon={Database}
                    section="raw_materials"
                    isActive={activeSection === 'raw_materials'}
                    onClick={scrollToSection}
                    themeColor="amber"
                  />
                  <NavItem
                    label="Operations"
                    icon={Settings}
                    section="operations"
                    isActive={activeSection === 'operations'}
                    onClick={scrollToSection}
                    themeColor="emerald"
                  />
                  <NavItem
                    label="Scrap"
                    icon={Trash2}
                    section="scrap"
                    isActive={activeSection === 'scrap'}
                    onClick={scrollToSection}
                    themeColor="rose"
                  />
                  <NavItem
                    label="BOM Cost"
                    icon={TrendingDown}
                    section="costing"
                    isActive={activeSection === 'costing'}
                    onClick={scrollToSection}
                    themeColor="cyan"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative bg-indigo-600 text-white rounded p-2 text-xs shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-600  transition-opacity" />
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded animate-spin" />
                    ) : (
                      <Save size={16} className="group-hover:rotate-12 transition-transform" />
                    )}
                    <span>Initialize Production formulation</span>
                  </div>
                </button>
              </div>
            </div>

            <div className="w-full">
              {error && (
                <div className="flex items-center gap-4 rounded border border-rose-100 bg-rose-50/50  p-2 text-rose-800 animate-in fade-in slide-in-from-top-2 backdrop-blur-sm">
                  <div className="p-2 bg-rose-100 rounded ">
                    <AlertCircle className="h-5 w-5 text-rose-600" />
                  </div>
                  <p className="text-xs   tracking-wide">{error}</p>
                </div>
              )}

              {/* Formulation Cards */}
              <div className="  space-y-2">
                <Card className=" border border-slate-200/50 p-2   shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded">
                  <SectionHeader
                    id="product"
                    title="Formulation Target"
                    icon={Database}
                    subtitle="Primary Specification Details"
                    isExpanded={expandedSections.product}
                    onToggle={() => toggleSection('product')}
                    themeColor="blue"
                  />
                  {expandedSections.product && (
                    <div className=" p-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                       <div className='col-span-3'>
                         <FieldWrapper label="Item Name" required>
                          <SearchableSelect
                            value={formData.product_name}
                            onChange={handleProductNameChange}
                            options={items
                              .filter(item => item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
                              .map(item => ({
                                label: `${item.name || item.item_name || 'No Name'} [${item.item_code}]`,
                                value: item.name || item.item_name
                              }))}
                            placeholder="Identify formulation target..."
                            className="glass-input"
                          />
                        </FieldWrapper>
                       </div>

                        <div className='col-span-3'>
                          <FieldWrapper label=" Item Code" required>
                          <SearchableSelect
                            value={formData.item_code}
                            onChange={handleItemCodeChange}
                            options={items
                              .filter(item => item.item_group === 'Finished Goods' || item.item_group === 'Finished Good' || item.item_group === 'Sub Assemblies' || item.item_group === 'Sub-assembly')
                              .map(item => ({
                                label: `${item.name || item.item_name || 'No Name'} [${item.item_code}]`,
                                value: item.item_code
                              }))}
                            placeholder="Item code identification..."
                            className="glass-input"
                          />
                        </FieldWrapper>
                        </div>

                        <div className='col-span-3'>
                          <FieldWrapper label="Item Group">
                          <SearchableSelect
                            value={formData.item_group}
                            onChange={(value) => setFormData({ ...formData, item_group: value })}
                            options={itemGroups.map(ig => ({
                              label: ig.name || ig.item_group,
                              value: ig.name || ig.item_group
                            }))}
                            placeholder="Strategic classification..."
                            className="glass-input"
                          />
                        </FieldWrapper>
                        </div>

                        <div className='col-span-3'>
                          <FieldWrapper label="Quantity" required>
                          <div className="rounded  border border-slate-200 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all bg-white">
                            <input
                              type="number"
                              name="quantity"
                              value={formData.quantity}
                              onChange={handleInputChange}
                              step="0.01"
                              className="w-full bg-transparent  p-2 text-xs    focus:outline-none border-none"
                            />

                          </div>
                        </FieldWrapper>
                        </div>
                        <div className='col-span-3'>
                          <FieldWrapper label="UOM">
                          <div className=" border-l border-slate-100 bg-slate-50/50">
                            <SearchableSelect
                              value={formData.uom}
                              onChange={(value) => setFormData({ ...formData, uom: value })}
                              options={uomList.map(uom => ({
                                label: uom,
                                value: uom
                              }))}
                              placeholder="UOM"
                              className="border-none"
                            />
                          </div>

                        </FieldWrapper>
                        </div>
                        <div className='col-span-2'>
                          <FieldWrapper label="Revision Protocol">
                            <div className="relative group/input">
                              <input
                                type="number"
                                name="revision"
                                value={formData.revision}
                                onChange={handleInputChange}
                                step="1"
                                className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all focus:outline-none  "
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2  text-xs    text-slate-300    group-focus-within/input:text-blue-500 transition-colors">VER</div>
                            </div>
                          </FieldWrapper>
                        </div>


                        <div className='col-span-2'>
                          <FieldWrapper label="Item Valuation Rate (₹)">
                          <div className="relative group/input">
                            <input
                              type="number"
                              name="valuation_rate_value"
                              value={formData.valuation_rate_value}
                              onChange={handleInputChange}
                              step="0.01"
                              className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-xs focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all focus:outline-none"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-300 group-focus-within/input:text-blue-500 transition-colors">INR</div>
                          </div>
                        </FieldWrapper>
                        </div>

                        <div className='col-span-2'>
                          <FieldWrapper label="Selling Rate (₹)">
                          <div className="relative group/input">
                            <input
                              type="number"
                              name="selling_rate"
                              value={formData.selling_rate}
                              onChange={handleInputChange}
                              step="0.01"
                              className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all focus:outline-none  "
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2  text-xs    text-slate-300    group-focus-within/input:text-emerald-500 transition-colors">INR</div>
                          </div>
                        </FieldWrapper>
                        </div>

                        <div className='col-span-2'>
                          <FieldWrapper label="Total Target Value (₹)">
                          <div className="relative group/input">
                            <input
                              type="text"
                              readOnly
                              value={(parseFloat(formData.quantity || 0) * parseFloat(formData.selling_rate || 0)).toLocaleString()}
                              className="w-full rounded border border-slate-100 bg-slate-50  p-2 text-xs    text-slate-500 cursor-not-allowed outline-none font-medium"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2  text-xs    text-slate-300">AUTO</div>
                          </div>
                        </FieldWrapper>
                        </div>

                        <div className="flex col-span-12 items-center gap-2 pt-4">
                          <label className="flex items-center gap-4 cursor-pointer group">
                            <div className={`w-12 h-7 rounded transition-all duration-500 relative ${formData.is_active ? 'bg-emerald-500  shadow-emerald-100' : 'bg-slate-200'}`}>
                              <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="hidden"
                              />
                              <div className={`absolute top-1 w-5 h-5 rounded bg-white   transition-all duration-500 ${formData.is_active ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className=" text-xs    text-slate-500    group-hover:text-slate-900 transition-colors">Active</span>
                          </label>

                          <label className="flex items-center gap-4 cursor-pointer group">
                            <div className={`w-12 h-7 rounded transition-all duration-500 relative ${formData.is_default ? 'bg-blue-600  shadow-blue-100' : 'bg-slate-200'}`}>
                              <input
                                type="checkbox"
                                checked={formData.is_default}
                                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                                className="hidden"
                              />
                              <div className={`absolute top-1 w-5 h-5 rounded bg-white   transition-all duration-500 ${formData.is_default ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className=" text-xs    text-slate-500    group-hover:text-slate-900 transition-colors">Default</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Settings Card */}
                {/* <Card className=" border border-slate-200/50 p-2  shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded">
                  <SectionHeader
                    id="settings"
                    title="BOM Settings"
                    icon={Settings}
                    subtitle="Configuration & Rules"
                    isExpanded={expandedSections.settings}
                    onToggle={() => toggleSection('settings')}
                    themeColor="slate"
                  />
                  {expandedSections.settings && (
                    <div className=" p-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <FieldWrapper label="Cost Rate Based On">
                          <SearchableSelect
                            value={formData.cost_rate_based_on}
                            onChange={(value) => setFormData({ ...formData, cost_rate_based_on: value })}
                            options={[
                              { label: 'Valuation Rate', value: 'Valuation Rate' },
                              { label: 'Last Purchase Rate', value: 'Last Purchase Rate' },
                              { label: 'Price List', value: 'Price List' }
                            ]}
                            className="glass-input"
                          />
                        </FieldWrapper>

                        <FieldWrapper label="Routing">
                          <div className="relative group/input">
                            <input
                              type="text"
                              name="routing"
                              value={formData.routing}
                              onChange={handleInputChange}
                              placeholder="Select Routing..."
                              className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all focus:outline-none  "
                            />
                          </div>
                        </FieldWrapper>

                        <FieldWrapper label="Project">
                          <div className="relative group/input">
                            <input
                              type="text"
                              name="project"
                              value={formData.project}
                              onChange={handleInputChange}
                              placeholder="Link to Project..."
                              className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all focus:outline-none  "
                            />
                          </div>
                        </FieldWrapper>

                        <FieldWrapper label="Currency">
                          <div className="relative group/input">
                            <input
                              type="text"
                              name="currency"
                              value={formData.currency}
                              onChange={handleInputChange}
                              className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all focus:outline-none  "
                            />
                          </div>
                        </FieldWrapper>

                        <FieldWrapper label="Transfer Material Against">
                          <SearchableSelect
                            value={formData.transfer_material_against}
                            onChange={(value) => setFormData({ ...formData, transfer_material_against: value })}
                            options={[
                              { label: 'Work Order', value: 'Work Order' },
                              { label: 'Job Card', value: 'Job Card' },
                              { label: 'Manual', value: 'Manual' }
                            ]}
                            className="glass-input"
                          />
                        </FieldWrapper>

                        <FieldWrapper label="Process Loss %">
                          <div className="relative group/input">
                            <input
                              type="number"
                              name="process_loss_percentage"
                              value={formData.process_loss_percentage}
                              onChange={handleInputChange}
                              step="0.01"
                              className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all focus:outline-none  "
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs   text-slate-300 group-focus-within/input:text-slate-500 transition-colors">%</div>
                          </div>
                        </FieldWrapper>

                        
                      </div>
                      <div className="flex flex-wrap items-center col-span-2 gap-6 pt-4">
                          <label className="flex items-center gap-4 cursor-pointer group">
                            <div className={`w-12 h-7 rounded transition-all duration-500 relative ${formData.with_operations ? 'bg-indigo-600  shadow-indigo-100' : 'bg-slate-200'}`}>
                              <input
                                type="checkbox"
                                checked={formData.with_operations}
                                onChange={(e) => setFormData({ ...formData, with_operations: e.target.checked })}
                                className="hidden"
                              />
                              <div className={`absolute top-1 w-5 h-5 rounded bg-white   transition-all duration-500 ${formData.with_operations ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className=" text-xs    text-slate-500    group-hover:text-slate-900 transition-colors">With Operations</span>
                          </label>

                          <label className="flex items-center gap-4 cursor-pointer group">
                            <div className={`w-12 h-7 rounded transition-all duration-500 relative ${formData.allow_alternative_item ? 'bg-indigo-600  shadow-indigo-100' : 'bg-slate-200'}`}>
                              <input
                                type="checkbox"
                                checked={formData.allow_alternative_item}
                                onChange={(e) => setFormData({ ...formData, allow_alternative_item: e.target.checked })}
                                className="hidden"
                              />
                              <div className={`absolute top-1 w-5 h-5 rounded bg-white   transition-all duration-500 ${formData.allow_alternative_item ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className=" text-xs    text-slate-500    group-hover:text-slate-900 transition-colors">Allow Alternatives</span>
                          </label>

                          <label className="flex items-center gap-4 cursor-pointer group">
                            <div className={`w-12 h-7 rounded transition-all duration-500 relative ${formData.auto_sub_assembly_rate ? 'bg-indigo-600  shadow-indigo-100' : 'bg-slate-200'}`}>
                              <input
                                type="checkbox"
                                checked={formData.auto_sub_assembly_rate}
                                onChange={(e) => setFormData({ ...formData, auto_sub_assembly_rate: e.target.checked })}
                                className="hidden"
                              />
                              <div className={`absolute top-1 w-5 h-5 rounded bg-white   transition-all duration-500 ${formData.auto_sub_assembly_rate ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className=" text-xs    text-slate-500    group-hover:text-slate-900 transition-colors">Auto Set Sub-assembly Rate</span>
                          </label>
                        </div>
                    </div>
                  )}
                </Card> */}

                {/* Components Section */}
                <Card className=" border border-slate-200/50 p-2  shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded">
                  <SectionHeader
                    id="components"
                    title="Components & Sub-Assemblies"
                    icon={Layers}
                    subtitle={`${bomLines.length} Strategic Items • Total: ₹${totalComponentCost.toLocaleString()}`}
                    isExpanded={expandedSections.components}
                    onToggle={() => toggleSection('components')}
                    themeColor="indigo"
                  />
                  {expandedSections.components && (
                    <div className=" p-2   space-y-2">
                      <div className="p-2 bg-slate-50/50 rounded border border-slate-200/50 relative  group/add">
                        <div className="absolute -right-6 -top-6 p-2 opacity-[0.03] group-hover/add:opacity-[0.08] transition-all duration-700 rotate-12">
                          <Plus size={120} className="text-indigo-600" />
                        </div>

                        <h4 className=" text-xs    text-indigo-600     mb-3 flex items-center gap-3">
                          <div className="w-6 h-6 rounded  bg-indigo-100 flex items-center justify-center">
                            <Plus size={12} strokeWidth={3} />
                          </div>
                          Add Component Specification
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 relative z-10">
                          <div className="md:col-span-3">
                            <FieldWrapper label="Subassemblies Name" required>
                              <SearchableSelect
                                value={newLine.component_code}
                                onChange={handleComponentChange}
                                options={items.filter(item => item && item.item_code && item.name).map(item => ({
                                  label: `${item.item_code} - ${item.name}`,
                                  value: item.item_code
                                }))}
                                placeholder="Search protocol components..."
                                className="glass-input"
                              />
                            </FieldWrapper>
                          </div>
                          <div className="md:col-span-3">
                            <FieldWrapper label="Item Group">
                              <SearchableSelect
                                value={newLine.item_group}
                                onChange={(value) => setNewLine({ ...newLine, item_group: value })}
                                options={itemGroups.map(ig => ({
                                  label: ig.name || ig.item_group,
                                  value: ig.name || ig.item_group
                                }))}
                                placeholder="Select"
                                className="glass-input"
                              />
                            </FieldWrapper>
                          </div>
                          <div className="md:col-span-1">
                            <FieldWrapper label="Qty" required>
                              <div className="relative group/input">
                                <input
                                  type="number"
                                  value={newLine.qty}
                                  onChange={(e) => setNewLine({ ...newLine, qty: e.target.value })}
                                  onKeyDown={handleKeyDown}
                                  step="0.01"
                                  className="w-full bg-white border border-slate-200 rounded p-2 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                          <div className="md:col-span-3">
                            <FieldWrapper label="UOM">
                              <SearchableSelect
                                value={newLine.uom}
                                onChange={(value) => setNewLine({ ...newLine, uom: value })}
                                options={uomList.map(uom => ({
                                  label: uom,
                                  value: uom
                                }))}
                                placeholder="Select"
                                className="glass-input"
                              />
                            </FieldWrapper>
                          </div>

                          <div className="md:col-span-2">
                            <FieldWrapper label="Valuation (₹)">
                              <input
                                type="number"
                                value={newLine.rate}
                                onChange={(e) => setNewLine({ ...newLine, rate: e.target.value })}
                                onKeyDown={handleKeyDown}
                                step="0.01"
                                className="w-full bg-white border border-slate-200 rounded p-2 text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                              />
                            </FieldWrapper>
                          </div>



                          <div className="md:col-span-2 flex items-end">
                            <button
                              type="button"
                              onClick={addBomLine}
                              className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white rounded p-2 text-xs   hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95"
                            >
                              <Plus size={14} strokeWidth={3} />
                              Add
                            </button>
                          </div>
                        </div>
                      </div>

                      {bomLines.length > 0 ? (
                        <div className="rounded border border-slate-100    shadow-slate-200/20 bg-white">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/80 border-b border-slate-100/50">
                                <th className="p-2   text-xs    text-slate-400  w-16 text-center">#</th>
                                <th className="p-2   text-xs    text-slate-400 ">Component Specification</th>
                                <th className="p-2   text-xs    text-slate-400  text-right">Qty</th>
                                <th className="p-2   text-xs    text-slate-400  text-right">Valuation</th>
                                <th className="p-2   text-xs    text-slate-400  text-right">Selling Price</th>
                                <th className="p-2   text-xs    text-slate-400  text-right">Value</th>
                                <th className="p-2   text-xs    text-slate-400  text-center w-32">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {bomLines.map((line, index) => {
                                const isEditing = editingRowId === line.id
                                const data = isEditing ? editingRowData : line
                                return (
                                  <tr key={line.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-2  text-center">
                                      <span className=" text-xs    text-slate-200 group-hover:text-indigo-300 transition-colors">{String(index + 1).padStart(2, '0')}</span>
                                    </td>
                                    <td className="p-2 ">
                                      <div className="  text-slate-900 text-xs  ">{line.component_name}</div>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px]   rounded   ">{line.component_code}</span>
                                        {parseFloat(line.loss_percentage) > 0 && (
                                          <span className="flex items-center gap-1 text-[9px]   text-rose-500">
                                            <TrendingDown size={10} />
                                            {line.loss_percentage}% LOSS
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2  text-right">
                                      {isEditing ? (
                                        <input type="number" value={data.qty || ''} onChange={(e) => setEditingRowData({ ...data, qty: e.target.value })} className="w-20 bg-white border border-indigo-200 rounded  p-2 text-xs   text-right focus:ring-4 focus:ring-indigo-500/10 outline-none  " />
                                      ) : (
                                        <div className="text-xs   text-slate-700">{parseFloat(line.qty || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className=" text-xs    text-slate-400 ml-1.5   ">{line.uom}</span></div>
                                      )}
                                    </td>
                                    <td className="p-2  text-right">
                                      {isEditing ? (
                                        <input type="number" value={data.rate || ''} onChange={(e) => setEditingRowData({ ...data, rate: e.target.value })} className="w-24 bg-white border border-indigo-200 rounded  p-2 text-xs   text-right focus:ring-4 focus:ring-indigo-500/10 outline-none  " />
                                      ) : (
                                        <div className="text-xs   text-slate-500 italic">₹{parseFloat(line.rate || 0).toLocaleString()}</div>

                                      )}
                                    </td>
                                    <td className="p-2  text-right">
                                      {isEditing ? (
                                        <input type="number" value={data.selling_price || ''} onChange={(e) => setEditingRowData({ ...data, selling_price: e.target.value })} className="w-24 bg-white border border-indigo-200 rounded  p-2 text-xs   text-right focus:ring-4 focus:ring-indigo-500/10 outline-none  " />
                                      ) : (
                                        <div className="text-xs   text-slate-500 italic">₹{parseFloat(line.selling_price || 0).toLocaleString()}</div>
                                      )}
                                    </td>
                                    <td className="p-2  text-right">
                                      <span className="  text-indigo-600 text-xs ">₹{parseFloat(isEditing ? (parseFloat(data.qty || 0) * parseFloat(data.rate || 0)) : (line.amount || 0)).toLocaleString()}</span>
                                    </td>
                                    <td className="p-2 ">
                                      <div className="flex items-center justify-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <button type="button" onClick={async () => {
                                              const qty = parseFloat(editingRowData.qty) || 0
                                              const rate = parseFloat(editingRowData.rate) || 0
                                              const sellingPrice = parseFloat(editingRowData.selling_price) || 0
                                              const lossPercentage = parseFloat(editingRowData.loss_percentage) || 0

                                              const updatedData = {
                                                ...editingRowData,
                                                amount: (qty * rate).toFixed(2),
                                                selling_amount: (qty * sellingPrice).toFixed(2),
                                                scrap_qty: ((qty * lossPercentage) / 100).toFixed(2)
                                              }
                                              const updated = bomLines.map(l => l.id === line.id ? updatedData : l)
                                              setBomLines(updated)
                                              setEditingRowId(null)
                                            }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded  transition-all"><Check size={16} strokeWidth={3} /></button>
                                            <button type="button" onClick={() => setEditingRowId(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded  transition-all"><X size={16} strokeWidth={3} /></button>
                                          </>
                                        ) : (
                                          <>
                                            <button type="button" onClick={() => { setEditingRowId(line.id); setEditingRowData({ ...line }); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all "><Settings size={16} /></button>
                                            <button type="button" onClick={() => removeBomLine(line.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all duration-300 hover:scale-110"><Trash2 size={16} strokeWidth={2.5} /></button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-indigo-50/30 border-t border-indigo-100/30">
                                <td colSpan="5" className="p-2 text-right  text-xs    text-indigo-900/50  ">Aggregate Component Value</td>
                                <td className="p-2 text-right">
                                  <span className="p-2 bg-indigo-600 text-white rounded    text-xs   shadow-indigo-100">
                                    ₹{totalComponentCost.toLocaleString()}
                                  </span>
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center p-2 border-2 border-dashed border-slate-100 rounded bg-slate-50/30 group/empty">
                          <div className="w-10 h-10 rounded bg-white  shadow-slate-200/50 flex items-center justify-center mx-auto mb-6 group-hover/empty:scale-110 group-hover/empty:rotate-6 transition-all duration-700">
                            <Layers size={16} className="text-indigo-400" />
                          </div>
                          <p className="    ">No components identified</p>
                          <p className="text-xs text-slate-400 mt-3 font-medium    opacity-60">Initialize specifications to build intelligence</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* Raw Materials Section */}
                <Card className=" border border-slate-200/50  p-2 shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded">
                  <SectionHeader
                    id="raw_materials"
                    title="Materials "
                    icon={Database}
                    subtitle={`${rawMaterials.length}  Assets • Total Material Cost: ₹${rawMaterials.reduce((sum, rm) => sum + (parseFloat(rm.amount) || 0), 0).toLocaleString()}`}
                    isExpanded={expandedSections.raw_materials}
                    onToggle={() => toggleSection('raw_materials')}
                    themeColor="amber"
                  />
                  {expandedSections.raw_materials && (
                    <div className=" p-2">
                      <div className="  space-y-2">
                        {/* RM Consumption Preview */}
                        {rawMaterials.length > 0 && (
                          <div className="bg-amber-500/5 rounded border border-amber-200/30 p-2 relative  group">
                            <div className="absolute -right-10 -to p-2 w-40 h-40 bg-amber-500/5 rounded blur-3xl group-hover:bg-amber-500/10 transition-all duration-1000" />
                            <h4 className=" text-xs    text-amber-600     mb-6 flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded bg-amber-500 animate-pulse" />
                              Intelligence Forecast (for {formData.quantity} {formData.uom})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 relative z-10">
                              {calculateRMConsumption(formData.quantity).map((consumption, idx) => (
                                <div key={idx} className="flex items-center justify-between  p-2 bg-white/80 backdrop-blur-md rounded border border-amber-100   hover: hover:shadow-amber-100/30 hover:-translate-y-1 transition-all group/item">
                                  <div className=".5">
                                    <div className=" text-xs    text-slate-400 group-hover/item:text-amber-600 transition-colors   ">{consumption.item_code}</div>
                                    <div className="text-sm   text-slate-900">{consumption.qty_required.toFixed(2)} <span className=" text-xs    text-slate-400   ">{consumption.uom}</span></div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm   text-amber-600">₹{consumption.cost.toLocaleString()}</div>
                                    <div className="text-[9px]   text-slate-400  mt-1">Est. Value</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Add Raw Material Interface */}
                        <div className="p-2 bg-slate-50/50 rounded border border-slate-200/50 relative ">
                          <h4 className=" text-xs    text-slate-500     mb-6 flex items-center gap-3">
                            <Plus size={14} className="text-amber-500" strokeWidth={3} />
                            Add Raw Material
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 relative z-10">
                            <div className="md:col-span-3">
                              <FieldWrapper label="Material Name" required>
                                <SearchableSelect
                                  value={newRawMaterial.item_code}
                                  onChange={handleRawMaterialItemChange}
                                  options={items.filter(item => item && item.item_code && item.name && item.item_group !== 'Finished Goods').map(item => ({
                                    label: `${item.name || item.item_name || 'No Name'} [${item.item_code}]`,
                                    value: item.item_code
                                  }))}
                                  placeholder="Search by name.."
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-3">
                              <FieldWrapper label="Item Group">
                                <SearchableSelect
                                  value={newRawMaterial.item_group}
                                  onChange={(value) => setNewRawMaterial({ ...newRawMaterial, item_group: value })}
                                  options={itemGroups.map(ig => ({
                                    label: ig.name || ig.item_group,
                                    value: ig.name || ig.item_group
                                  }))}
                                  placeholder="Select"
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-3">
                              <FieldWrapper label="Warehouse">
                                <SearchableSelect
                                  value={newRawMaterial.source_warehouse}
                                  onChange={(value) => setNewRawMaterial({ ...newRawMaterial, source_warehouse: value })}
                                  options={warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => ({
                                    label: wh.warehouse_name || wh.name,
                                    value: wh.warehouse_name || wh.name
                                  }))}
                                  placeholder="Select"
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-3">
                              <FieldWrapper label="Operation">
                                <SearchableSelect
                                  value={newRawMaterial.operation}
                                  onChange={(value) => setNewRawMaterial({ ...newRawMaterial, operation: value })}
                                  options={operationsList.filter(op => op && op.name).map(op => ({
                                    label: op.name,
                                    value: op.name
                                  }))}
                                  placeholder="Select"
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-2">
                              <FieldWrapper label="Qty" required>
                                <input
                                  type="number"
                                  value={newRawMaterial.qty}
                                  onChange={(e) => handleNewRawMaterialChange('qty', e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  step="0.01"
                                  className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all focus:outline-none  "
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-3">
                              <FieldWrapper label="UOM">
                                <SearchableSelect
                                  value={newRawMaterial.uom}
                                  onChange={(value) => setNewRawMaterial({ ...newRawMaterial, uom: value })}
                                  options={uomList.map(uom => ({
                                    label: uom,
                                    value: uom
                                  }))}
                                  placeholder="Select"
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>

                            <div className="md:col-span-2">
                              <FieldWrapper label="Rate (₹)">
                                <input
                                  type="number"
                                  value={newRawMaterial.rate}
                                  onChange={(e) => handleNewRawMaterialChange('rate', e.target.value)}
                                  onKeyDown={handleKeyDown}
                                  step="0.01"
                                  className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all focus:outline-none  "
                                />
                              </FieldWrapper>
                            </div>

                            <div className="md:col-span-2">
                              <FieldWrapper label="Amount (₹)">
                                <input
                                  type="number"
                                  value={newRawMaterial.amount}
                                  readOnly
                                  className="w-full rounded border border-slate-100 bg-slate-50  p-2 text-xs    text-slate-500 cursor-not-allowed outline-none font-medium"
                                />
                              </FieldWrapper>
                            </div>

                            
                            <div className="md:col-span-3 flex items-end">
                              <button
                                type="button"
                                onClick={addNewRawMaterial}
                                className="w-full flex items-center justify-center gap-1 bg-rose-600 text-white rounded p-2 text-xs   hover:bg-rose-700 transition-all hover:-translate-y-1 active:scale-95"
                              >
                                <Plus size={14} strokeWidth={3} />
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        {rawMaterials.length > 0 ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-amber-500 rounded" />
                                <span className="">Material Intelligence Matrix</span>
                              </div>
                              <span className=" text-xs    text-slate-400   ">{rawMaterials.length} Total Nodes</span>
                            </div>

                            <div className="space-y-2">
                              {itemGroupsInOrder.map((groupName) => {
                                const groupItems = groupedRawMaterials[groupName]
                                const isExpanded = expandedItemGroups[groupName]
                                const groupCost = groupItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
                                const groupMarketValue = groupItems.reduce((sum, item) => sum + (parseFloat(item.selling_amount || 0)), 0)

                                return (
                                  <div key={groupName} className="rounded border border-slate-200/60  bg-white   hover:border-amber-200 transition-all duration-500">
                                    <button
                                      type="button"
                                      onClick={() => toggleItemGroup(groupName)}
                                      className={`w-full flex items-center justify-between p-2 transition-all duration-500 ${isExpanded ? 'bg-amber-50/40' : 'hover:bg-slate-50'}`}
                                    >
                                      <div className="flex items-center gap-6">
                                        <div className={`w-6 h-6 rounded flex items-center justify-center text-lg   transition-all duration-700 ${isExpanded ? 'bg-amber-600 text-white   shadow-amber-200 scale-110 rotate-3' : 'bg-slate-100 text-slate-400'}`}>
                                          {groupName.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                          <h3 className="text-sm   text-slate-900 ">{groupName}</h3>
                                          <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[9px]   text-slate-400   ">{groupItems.length} Strategic Nodes</p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-8">
                                        <div className="text-right hidden sm:block">
                                          <div className="text-sm   text-amber-600">₹{groupCost.toLocaleString()}</div>
                                          <div className="text-[8px]   text-slate-400  mt-1">Sub-Total Value</div>
                                        </div>
                                        <div className={`w-10 h-10 rounded  flex items-center justify-center transition-all duration-500 ${isExpanded ? 'bg-amber-600 text-white rotate-180 shadow-lg' : 'bg-slate-100 text-slate-300'}`}>
                                          <ChevronDown size={20} />
                                        </div>
                                      </div>
                                    </button>

                                    {isExpanded && (
                                      <div className="p-2 border-t border-slate-100/50">
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left border-collapse">
                                            <thead>
                                              <tr>
                                                <th className="p-2 text-xs   text-slate-400 ">Asset Index</th>
                                                <th className="p-2 text-xs   text-slate-400 ">Neural Node</th>
                                                <th className="p-2 text-xs   text-slate-400  text-right">Quantity</th>
                                                <th className="p-2 text-xs   text-slate-400  text-right">Valuation</th>
                                                <th className="p-2 text-xs   text-slate-400  text-right">Selling Price</th>
                                                <th className="p-2 text-xs   text-slate-400  text-right">Sub-Total</th>
                                                <th className="p-2 text-xs   text-slate-400  text-center w-32">Control</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {groupItems.map((material, index) => {
                                                const isEditing = editingRowId === material.id
                                                const data = isEditing ? editingRowData : material
                                                return (
                                                  <tr key={material.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-2 ">
                                                      <span className=" text-xs    text-slate-300">{(index + 1).toString().padStart(2, '0')}</span>
                                                    </td>
                                                    <td className="p-2 ">
                                                      <div className="text-xs   text-slate-900 ">{material.item_name}</div>
                                                      <div className="text-[9px]   text-amber-600    mt-1">{material.item_code}</div>
                                                    </td>
                                                    <td className="p-2  text-right">
                                                      {isEditing ? (
                                                        <input type="number" value={data.qty || ''} onChange={(e) => setEditingRowData({ ...data, qty: e.target.value })} className="w-24 bg-white border border-amber-200 rounded  p-2 text-xs   text-right focus:ring-4 focus:ring-amber-500/10 outline-none  " />
                                                      ) : (
                                                        <div className="text-xs   text-slate-900">{material.qty} <span className="text-[9px]   text-slate-400  ml-1  ">{material.uom}</span></div>
                                                      )}
                                                    </td>
                                                    <td className="p-2  text-right">
                                                      {isEditing ? (
                                                        <input type="number" value={data.rate || ''} onChange={(e) => setEditingRowData({ ...data, rate: e.target.value })} className="w-28 bg-white border border-amber-200 rounded  p-2 text-xs   text-right focus:ring-4 focus:ring-amber-500/10 outline-none  " />
                                                      ) : (
                                                        <div className="text-xs   text-slate-700">₹{parseFloat(material.rate).toLocaleString()}</div>
                                                      )}
                                                    </td>
                                                    <td className="p-2  text-right">
                                                      {isEditing ? (
                                                        <input type="number" value={data.selling_price || ''} onChange={(e) => setEditingRowData({ ...data, selling_price: e.target.value })} className="w-28 bg-white border border-amber-200 rounded  p-2 text-xs   text-right focus:ring-4 focus:ring-amber-500/10 outline-none  " />
                                                      ) : (
                                                        <div className="text-xs   text-slate-700">₹{parseFloat(material.selling_price || 0).toLocaleString()}</div>
                                                      )}
                                                    </td>
                                                    <td className="p-2  text-right">
                                                      <div className="text-xs   text-amber-600">₹{parseFloat(isEditing ? (parseFloat(data.qty || 0) * parseFloat(data.rate || 0)) : (material.amount || 0)).toLocaleString()}</div>
                                                    </td>
                                                    <td className="p-2 ">
                                                      <div className="flex items-center justify-center gap-2">
                                                        {isEditing ? (
                                                          <>
                                                            <button type="button" onClick={async () => {
                                                              const qty = parseFloat(editingRowData.qty || 0);
                                                              const rate = parseFloat(editingRowData.rate || 0);
                                                              const sellingPrice = parseFloat(editingRowData.selling_price || 0);
                                                              const updatedData = {
                                                                ...editingRowData,
                                                                amount: (qty * rate),
                                                                selling_amount: (qty * sellingPrice)
                                                              };
                                                              const updated = rawMaterials.map(m => m.id === material.id ? updatedData : m);
                                                              setRawMaterials(updated);
                                                              if (id) {
                                                                try {
                                                                  setLoading(true);
                                                                  const payload = { ...formData, lines: bomLines, rawMaterials: updated, operations, scrapItems, quantity: parseFloat(formData.quantity), revision: parseInt(formData.revision), process_loss_percentage: parseFloat(formData.process_loss_percentage) };
                                                                  await productionService.updateBOM(id, payload);
                                                                  setEditingRowId(null);
                                                                } catch (err) {
                                                                  setError('Failed to update material node');
                                                                } finally {
                                                                  setLoading(false);
                                                                }
                                                              } else {
                                                                setEditingRowId(null);
                                                              }
                                                            }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded  transition-all"><Check size={16} strokeWidth={3} /></button>
                                                            <button type="button" onClick={() => setEditingRowId(null)} className="p-2 text-slate-400 hover:bg-slate-50 rounded  transition-all"><X size={16} strokeWidth={3} /></button>
                                                          </>
                                                        ) : (
                                                          <>
                                                            <button type="button" onClick={() => { setEditingRowId(material.id); setEditingRowData({ ...material }); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all "><Settings size={16} /></button>
                                                            <button type="button" onClick={() => removeRawMaterial(material.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all "><Trash2 size={16} /></button>
                                                          </>
                                                        )}
                                                      </div>
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
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center  py-2 border-2 border-dashed border-slate-200 rounded bg-slate-50/50 group/empty">
                            <div className="w-10 h-10 rounded bg-white border border-slate-100  flex items-center justify-center mx-auto mb-6 group-hover/empty:scale-110 group-hover/empty:rotate-6 transition-all duration-700">
                              <Database size={10} className="text-slate-300 group-hover/empty:text-amber-400 transition-colors" />
                            </div>
                            <p className="    ">Awaiting Asset Integration</p>
                            <p className=" text-xs  text-slate-400 mt-3     ">Define strategic materials to initialize neural consumption matrix</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Operations Section */}
                <Card className=" border border-slate-200/50 p-2  shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded">
                  <SectionHeader
                    id="operations"
                    title="Operations "
                    icon={Settings}
                    subtitle={`${operations.length} Operation Selected • Total Operation Cost: ₹${operations.reduce((sum, op) => sum + (parseFloat(op.operating_cost) || 0), 0).toLocaleString()}`}
                    isExpanded={expandedSections.operations}
                    onToggle={() => toggleSection('operations')}
                    themeColor="emerald"
                  />
                  {expandedSections.operations && (
                    <div className=" p-2">
                      <div className="  space-y-2">
                        {/* Add Operation Interface */}
                        <div className="p-2 bg-slate-50/50 rounded border border-slate-200/50 relative ">
                          <h4 className=" text-xs    text-slate-500     mb-6 flex items-center gap-3">
                            <Plus size={14} className="text-emerald-500" strokeWidth={3} />
                            Operations
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 relative z-10">
                            <div className="md:col-span-3">
                              <FieldWrapper label="Operation *" required>
                                <SearchableSelect
                                  value={newOperation.operation_name}
                                  onChange={(value) => {
                                    const op = operationsList.find(o => o.name === value)
                                    const cost = calculateOperationCost(newOperation.operation_time, newOperation.setup_time, op?.hourly_rate || '0')
                                    setNewOperation({
                                      ...newOperation,
                                      operation_name: value,
                                      workstation_type: op?.workstation_type || '',
                                      hourly_rate: op?.hourly_rate || '0',
                                      operating_cost: cost.toFixed(2)
                                    })
                                  }}
                                  options={operationsList.filter(op => op && op.name).map(op => ({
                                    label: op.name,
                                    value: op.name
                                  }))}
                                  placeholder="Search operator"
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-3">
                              <FieldWrapper label="Execution Mode">
                                <select
                                  value={newOperation.execution_mode}
                                  onChange={(e) => {
                                    const mode = e.target.value
                                    const cost = calculateOperationCost(
                                      newOperation.operation_time, 
                                      newOperation.setup_time, 
                                      newOperation.hourly_rate,
                                      mode,
                                      newOperation.vendor_rate_per_unit
                                    )
                                    setNewOperation({ ...newOperation, execution_mode: mode, operating_cost: cost.toFixed(2) })
                                  }}
                                  className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all focus:outline-none   appearance-none"
                                >
                                  <option value="IN_HOUSE">In-House</option>
                                  <option value="OUTSOURCE">Outsource</option>
                                </select>
                              </FieldWrapper>
                            </div>

                            {newOperation.execution_mode === 'IN_HOUSE' ? (
                              <>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Workstation">
                                    <SearchableSelect
                                      value={newOperation.workstation_type}
                                      onChange={(value) => setNewOperation({ ...newOperation, workstation_type: value })}
                                      options={workstationsList.filter(ws => ws && ws.name).map(ws => ({
                                        label: ws.name,
                                        value: ws.name
                                      }))}
                                      placeholder="Select"
                                      className="glass-input"
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Target Warehouse">
                                    <SearchableSelect
                                      value={newOperation.target_warehouse}
                                      onChange={(value) => setNewOperation({ ...newOperation, target_warehouse: value })}
                                      options={warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => ({
                                        label: wh.warehouse_name || wh.name,
                                        value: wh.warehouse_name || wh.name
                                      }))}
                                      placeholder="Select"
                                      className="glass-input"
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Cycle Time (min)">
                                    <input
                                      type="number"
                                      value={newOperation.operation_time}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        const cost = calculateOperationCost(val, newOperation.setup_time, newOperation.hourly_rate)
                                        setNewOperation({ ...newOperation, operation_time: val, operating_cost: cost.toFixed(2) })
                                      }}
                                      onKeyDown={handleKeyDown}
                                      className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all focus:outline-none  "
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-2">
                                  <FieldWrapper label="Setup Time (min)">
                                    <input
                                      type="number"
                                      value={newOperation.setup_time}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        const cost = calculateOperationCost(newOperation.operation_time, val, newOperation.hourly_rate)
                                        setNewOperation({ ...newOperation, setup_time: val, operating_cost: cost.toFixed(2) })
                                      }}
                                      onKeyDown={handleKeyDown}
                                      className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all focus:outline-none  "
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-2">
                                  <FieldWrapper label="Hourly Rate (₹)">
                                    <input
                                      type="number"
                                      value={newOperation.hourly_rate}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        const cost = calculateOperationCost(newOperation.operation_time, newOperation.setup_time, val)
                                        setNewOperation({ ...newOperation, hourly_rate: val, operating_cost: cost.toFixed(2) })
                                      }}
                                      onKeyDown={handleKeyDown}
                                      className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all focus:outline-none  "
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-2">
                                  <FieldWrapper label="Cost (₹)">
                                    <input
                                      type="number"
                                      value={newOperation.operating_cost}
                                      readOnly
                                      className="w-full rounded border border-slate-200 bg-slate-50  p-2 text-xs focus:outline-none "
                                    />
                                  </FieldWrapper>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Vendor Name">
                                    <SearchableSelect
                                      value={newOperation.vendor_name}
                                      onChange={(value) => setNewOperation({ ...newOperation, vendor_name: value })}
                                      options={suppliers.map(s => ({
                                        label: s.customer_name || s.name,
                                        value: s.customer_name || s.name
                                      }))}
                                      placeholder="Select Vendor"
                                      className="glass-input"
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Vendor Rate / Unit (₹)">
                                    <input
                                      type="number"
                                      value={newOperation.vendor_rate_per_unit}
                                      onChange={(e) => {
                                        const val = e.target.value
                                        const cost = calculateOperationCost(
                                          newOperation.operation_time, 
                                          newOperation.setup_time, 
                                          newOperation.hourly_rate,
                                          newOperation.execution_mode,
                                          val
                                        )
                                        setNewOperation({ ...newOperation, vendor_rate_per_unit: val, operating_cost: cost.toFixed(2) })
                                      }}
                                      onKeyDown={handleKeyDown}
                                      className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all focus:outline-none  "
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Subcontract Warehouse">
                                    <SearchableSelect
                                      value={newOperation.subcontract_warehouse}
                                      onChange={(value) => setNewOperation({ ...newOperation, subcontract_warehouse: value })}
                                      options={warehousesList.filter(wh => wh && (wh.warehouse_name || wh.name)).map(wh => ({
                                        label: wh.warehouse_name || wh.name,
                                        value: wh.warehouse_name || wh.name
                                      }))}
                                      placeholder="Select"
                                      className="glass-input"
                                    />
                                  </FieldWrapper>
                                </div>
                                <div className="md:col-span-3">
                                  <FieldWrapper label="Cost (₹)">
                                    <input
                                      type="number"
                                      value={newOperation.operating_cost}
                                      readOnly
                                      className="w-full rounded border border-slate-200 bg-slate-50  p-2 text-xs focus:outline-none "
                                    />
                                  </FieldWrapper>
                                </div>
                              </>
                            )}
                           
                            <div className="md:col-span-3 flex items-end pb-1">
                              <button
                                type="button"
                                onClick={addOperation}
                                className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white rounded p-2 text-xs  hover:bg-indigo-700 transition-all hover:-translate-y-1 active:scale-95"
                              >
                                <Plus size={14} strokeWidth={3} />
                                Add
                              </button>
                            </div>
                          </div>
                        </div>

                        {operations.length > 0 ? (
                          <div className="rounded border border-slate-200/60  bg-white  ">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr>
                                    <th className="p-2 text-xs   text-slate-400  w-12">#</th>
                                    <th className="p-2 text-xs   text-slate-400 ">Operation</th>
                                    <th className="p-2 text-xs   text-slate-400 ">Mode</th>
                                    <th className="p-2 text-xs   text-slate-400 ">Workstation/Vendor</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Cycle (min)</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Setup (min)</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Rate (₹)</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Cost (₹)</th>
                                    <th className="p-2 text-xs   text-slate-400 ">Warehouse</th>
                                    <th className="p-2 text-xs   text-slate-400  text-center w-12">Del</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {operations.map((op, index) => (
                                    <tr key={op.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="p-2 ">
                                        <span className=" text-xs    text-slate-300">{index + 1}</span>
                                      </td>
                                      <td className="p-2 ">
                                        <div className="text-xs   text-slate-900 ">{op.operation_name}</div>
                                      </td>
                                      <td className="p-2  text-center">
                                        <span className={`inline-flex items-center px-3 py-1 rounded text-[9px]      ${op.execution_mode === 'OUTSOURCE' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                          {op.execution_mode === 'OUTSOURCE' ? 'Outsource' : 'In-House'}
                                        </span>
                                      </td>
                                      <td className="p-2 ">
                                        <div className="text-xs   text-slate-700">
                                          {op.execution_mode === 'OUTSOURCE' ? (op.vendor_name || '-') : (op.workstation_type || '-')}
                                        </div>
                                      </td>
                                      <td className="p-2  text-right">
                                        <div className="text-xs   text-slate-900">{op.execution_mode === 'OUTSOURCE' ? '-' : parseFloat(op.operation_time || 0).toFixed(2)}</div>
                                      </td>
                                      <td className="p-2  text-right">
                                        <div className="text-xs   text-slate-900">{op.execution_mode === 'OUTSOURCE' ? '-' : parseFloat(op.setup_time || 0).toFixed(2)}</div>
                                      </td>
                                      <td className="p-2  text-right">
                                        <div className="text-xs   text-slate-700">
                                          ₹{op.execution_mode === 'OUTSOURCE' 
                                            ? parseFloat(op.vendor_rate_per_unit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })
                                            : parseFloat(op.hourly_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                      </td>
                                      <td className="p-2  text-right">
                                        <div className="text-xs   text-slate-900  bg-slate-100 rounded px-2 py-0.5 inline-block min-w-[60px]">₹{parseFloat(op.operating_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                      </td>
                                      <td className="p-2 ">
                                        <div className="text-xs   text-slate-700">
                                          {op.execution_mode === 'OUTSOURCE' ? (op.subcontract_warehouse || '-') : (op.target_warehouse || '-')}
                                        </div>
                                      </td>
                                      <td className="p-2  text-center">
                                        <button
                                          type="button"
                                          onClick={() => removeOperation(op.id)}
                                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all "
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center  py-2 border-2 border-dashed border-slate-200 rounded bg-slate-50/50 group/empty">
                            <div className="w-10 h-10 rounded bg-white border border-slate-100  flex items-center justify-center mx-auto mb-6 group-hover/empty:scale-110 group-hover/empty:rotate-6 transition-all duration-700">
                              <Settings size={10} className="text-slate-300 group-hover/empty:text-emerald-400 transition-colors" />
                            </div>
                            <p className="    ">Awaiting Process Definition</p>
                            <p className=" text-xs  text-slate-400 mt-3     ">Define production protocols to initialize neural costing engine</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
                {/* Scrap Section */}
                <Card className=" border border-slate-200/50  p-2 shadow-slate-200/40 bg-white/90 backdrop-blur-xl rounded">
                  <SectionHeader
                    id="scrap"
                    title="Loss Mitigation"
                    icon={Trash2}
                    subtitle={`${scrapItems.length} Strategic Nodes • Recovery Valuation: ₹${totalScrapLossCost.toLocaleString()}`}
                    isExpanded={expandedSections.scrap}
                    onToggle={() => toggleSection('scrap')}
                    themeColor="rose"
                  />
                  {expandedSections.scrap && (
                    <div className=" p-2">
                      <div className="  space-y-2">
                        {/* Add Scrap Interface */}
                        <div className="p-2 bg-slate-50/50 rounded border border-slate-200/50 relative ">
                          <h4 className=" text-xs    text-slate-500     mb-6 flex items-center gap-3">
                            <Plus size={14} className="text-rose-500" strokeWidth={3} />
                            Register Material Loss Node
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 relative z-10">
                            <div className="md:col-span-5">
                              <FieldWrapper label="Scrap Specification" required>
                                <SearchableSelect
                                  value={newScrapItem.item_code}
                                  onChange={handleScrapItemChange}
                                  options={items.filter(item => item && item.item_code && item.name).map(item => ({
                                    label: item.name,
                                    value: item.item_code
                                  }))}
                                  placeholder="Identify loss item..."
                                  className="glass-input"
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-2">
                              <FieldWrapper label="Quantity">
                                <input
                                  type="number"
                                  name="input_quantity"
                                  value={newScrapItem.input_quantity}
                                  onChange={(e) => setNewScrapItem({ ...newScrapItem, input_quantity: e.target.value })}
                                  onKeyDown={handleKeyDown}
                                  className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all focus:outline-none  "
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-2">
                              <FieldWrapper label="Recovery (₹)">
                                <input
                                  type="number"
                                  name="rate"
                                  value={newScrapItem.rate}
                                  onChange={(e) => setNewScrapItem({ ...newScrapItem, rate: e.target.value })}
                                  onKeyDown={handleKeyDown}
                                  className="w-full rounded border border-slate-200 bg-white  p-2 text-xs    focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all focus:outline-none  "
                                />
                              </FieldWrapper>
                            </div>
                            <div className="md:col-span-3 flex items-end">
                              <button
                                type="button"
                                onClick={addScrapItem}
                                className="w-full flex items-center justify-center gap-2 bg-rose-600 text-white rounded p-2  text-xs        shadow-rose-100 hover:bg-rose-700 transition-all hover:-translate-y-1 active:scale-95"
                              >
                                <Plus size={18} strokeWidth={2.5} />
                                Record Loss
                              </button>
                            </div>
                          </div>
                        </div>

                        {scrapItems.length > 0 ? (
                          <div className="rounded border border-slate-200/60  bg-white  ">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr>
                                    <th className="p-2 text-xs   text-slate-400  w-20">Index</th>
                                    <th className="p-2 text-xs   text-slate-400 ">Loss Item</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Quantity</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Recovery Rate</th>
                                    <th className="p-2 text-xs   text-slate-400  text-right">Credit Value</th>
                                    <th className="p-2 text-xs   text-slate-400  text-center w-32">Control</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {scrapItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="p-2 ">
                                        <span className=" text-xs    text-slate-300">{(index + 1).toString().padStart(2, '0')}</span>
                                      </td>
                                      <td className="p-2 ">
                                        <div className="text-xs   text-slate-900 ">{item.item_name}</div>
                                        <div className="text-[9px]   text-rose-600    mt-1">{item.item_code}</div>
                                      </td>
                                      <td className="p-2  text-right">
                                        <span className="text-xs   text-slate-900">{parseFloat(item.input_quantity || 0).toFixed(2)}</span>
                                      </td>
                                      <td className="p-2  text-right">
                                        <div className="text-xs   text-slate-700">₹{parseFloat(item.rate || 0).toLocaleString()}</div>
                                      </td>
                                      <td className="p-2  text-right">
                                        <div className="text-xs   text-rose-600">₹{(parseFloat(item.input_quantity || 0) * parseFloat(item.rate || 0)).toLocaleString()}</div>
                                      </td>
                                      <td className="p-2  text-center">
                                        <button
                                          type="button"
                                          onClick={() => removeScrapItem(item.id)}
                                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all "
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center  py-2 border-2 border-dashed border-slate-200 rounded bg-slate-50/50 group/empty">
                            <div className="w-10 h-10 rounded bg-white border border-slate-100  flex items-center justify-center mx-auto mb-6 group-hover/empty:scale-110 group-hover/empty:rotate-6 transition-all duration-700">
                              <Trash2 size={10} className="text-slate-300 group-hover/empty:text-rose-400 transition-colors" />
                            </div>
                            <p className="    ">No Loss Recorded</p>
                            <p className=" text-xs  text-slate-400 mt-3     ">Record material loss or by-products for accurate production intelligence</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
                <Card className="bg-white border-slate-200 rounded  mb-4   shadow-slate-200/50 mt-3">
                  <SectionHeader
                    id="costing"
                    title="Manufacturing Costing Intelligence"
                    icon={TrendingDown}
                    subtitle={`Strategic Valuation • Total Production Cost: ₹${totalBOMCost.toLocaleString()}`}
                    isExpanded={true}
                    onToggle={() => { }}
                    themeColor="cyan"
                  />
                  <div className="p-6">
                    {/* Primary Metrics High-Fidelity Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      <div className="relative group bg-blue-50/40 rounded p-2 border border-blue-100/50 transition-all hover: hover:shadow-blue-100/20">
                        <div className="flex items-center gap-2 relative z-10">
                          <div className="p-2 bg-white  shadow-blue-100/50 text-blue-600 rounded  group-hover:scale-110 transition-transform duration-500">
                            <Package size={14} />
                          </div>
                          <div>
                            <p className="text-xs  text-blue-400    mb-1">Material Valuation</p>
                            <h4 className="text-xl  text-slate-800 ">₹{materialCost.toLocaleString()}</h4>
                            <p className="text-xs  text-blue-600/60 mt-1 ">Net Raw Consumption</p>
                          </div>
                        </div>
                      </div>

                      <div className="relative group bg-emerald-50/40 rounded p-2 border border-emerald-100/50 transition-all hover: hover:shadow-emerald-100/20">
                        <div className="flex items-center gap-2 relative z-10">
                          <div className="p-2 bg-white  shadow-emerald-100/50 text-emerald-600 rounded  group-hover:scale-110 transition-transform duration-500">
                            <Users size={14} />
                          </div>
                          <div>
                            <p className="text-xs  text-emerald-400    mb-1">Labour & Ops</p>
                            <h4 className="text-xl  text-slate-800 ">₹{labourCost.toLocaleString()}</h4>
                            <p className="text-xs  text-emerald-600/60 mt-1 ">Process Intelligence</p>
                          </div>
                        </div>
                      </div>

                      <div className="relative group bg-cyan-50/40 rounded p-2 border border-cyan-100/50 transition-all hover: hover:shadow-cyan-100/20">
                        <div className="flex items-center gap-2 relative z-10">
                          <div className="p-2 bg-white  shadow-cyan-100/50 text-cyan-600 rounded  group-hover:scale-110 transition-transform duration-500">
                            <TrendingDown size={14} />
                          </div>
                          <div>
                            <p className="text-xs  text-cyan-400    mb-1">Strategic Total</p>
                            <h4 className="text-xl  text-slate-800 ">₹{totalBOMCost.toLocaleString()}</h4>
                            <p className="text-xs  text-cyan-600/60 mt-1 ">Per {formData.quantity} {formData.uom} Batch</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Breakdown Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-blue-500 rounded" />
                          <h5 className="text-xs  text-slate-400 ">Material Resource Breakdown</h5>
                        </div>
                        <div className="space-y-3 bg-slate-50/50 rounded p-2 border border-slate-100">
                          <div className="flex items-center justify-between  p-2 rounded  hover:bg-white hover:  transition-all group">
                            <span className="text-xs  text-slate-500 group-hover:text-slate-800">Primary Components Cost</span>
                            <span className="text-sm  text-slate-900">₹{totalComponentCost.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between  p-2 rounded  hover:bg-white hover:  transition-all group">
                            <span className="text-xs  text-slate-500 group-hover:text-slate-800">Raw Materials Valuation</span>
                            <span className="text-sm  text-slate-900">₹{totalRawMaterialCost.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between  p-2 rounded  bg-rose-50/50 border border-rose-100/50 group">
                            <span className="text-xs  text-rose-600">Scrap Recovery (Deduction)</span>
                            <span className="text-sm  text-rose-600">-₹{totalScrapLossCost.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-4 bg-emerald-500 rounded" />
                          <h5 className="text-xs  text-slate-400 ">Operational Efficiency</h5>
                        </div>
                        <div className="space-y-3 bg-slate-50/50 rounded p-2 border border-slate-100">
                          <div className="flex items-center justify-between  p-2 rounded  hover:bg-white hover:  transition-all group">
                            <span className="text-xs  text-slate-500 group-hover:text-slate-800">Production Process Cost</span>
                            <span className="text-sm  text-slate-900">₹{totalOperationCost.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between  p-2 rounded  bg-amber-50/50 border border-amber-100/50 group">
                            <div className="flex items-center gap-2">
                              <span className="text-xs  text-amber-700">Total Material Loss</span>
                              <AlertTriangle size={12} className="text-amber-500" />
                            </div>
                            <span className="text-sm  text-amber-700">{totalScrapQty.toFixed(2)} {formData.uom}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prominent Unit Cost Strategic Footer */}
                    <div className="mt-5 flex flex-col md:flex-row items-center justify-between bg-slate-900 rounded p-2   shadow-slate-300 text-white gap-2 relative">
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layers size={80} className="text-indigo-400" />
                      </div>
                      <div className="flex items-center gap-2 relative z-10">
                        <div className="w-10 h-10 bg-indigo-500/20 backdrop-blur-xl rounded flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-700">
                          <Layers size={36} className="text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-xs  text-indigo-400 mb-2">Net Formulation Cost</p>
                          <p className="text-sm font-medium text-slate-400 leading-relaxed">Intelligence based on batch size of <span className="text-white ">{formData.quantity} {formData.uom}</span></p>
                        </div>
                      </div>
                      <div className="text-center md:text-right relative z-10">
                        <h3 className="text-xl  text-white er mb-2">
                          <span className="text-xl  text-indigo-500 mr-2">₹</span>
                          {(formData.quantity && formData.quantity !== '0' ? (totalBOMCost / parseFloat(formData.quantity)) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                        <p className="text-xs  text-slate-500 ">Estimated Strategic Cost / {formData.uom}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 rounded p-2 border border-slate-200/50 mb-6">
                    <div className="flex items-center gap-3">
                      <div className=" p-2bg-white rounded  text-slate-400 border border-slate-100">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <p className="text-xs  text-slate-700">Final Verification</p>
                        <p className="text-xs text-slate-400 font-medium text-xs">Ensure all specifications meet manufacturing standards</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => navigate('/manufacturing/bom')}
                        className="inline-flex items-center gap-2 rounded bg-white p-2 text-xs  text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95  "
                      >
                        <RotateCcw size={18} />
                        Discard
                      </button>
                      <button
                        type="submit"
                        form="bom-form"
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded bg-indigo-600 p-2 text-xs  text-white  shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded animate-spin" />
                        ) : (
                          <>
                            <Save size={18} />
                            {id ? 'Commit Changes' : 'Initialize Formulation'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Card>
              </div> {/* END OF space-y-2 */}

            </div>
            {/* BOM Costing Intelligence - Strategic Summary */}


            {/* Form Footer Actions - Strategic Placement */}

          </div>


        </form>


        {
          showDrafts && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-2">
              <div className="bg-white rounded w-full max-w-md shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100  animate-in zoom-in-95 fade-in duration-300">
                <div className="flex justify-between items-center p-2 border-b border-slate-50 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                  <div className="flex items-center gap-4">
                    <div className=" p-2bg-indigo-50 rounded text-indigo-600   shadow-indigo-100/50 border border-indigo-100">
                      <FileText size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-lg  text-slate-800 ">Formulation Drafts</h2>
                      <p className="text-xs text-slate-400     mt-0.5">Recover Strategic Specifications</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDrafts(false)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded  transition-all active:scale-90"
                  >
                    <X size={20} strokeWidth={3} />
                  </button>
                </div>
                <div className="p-2 max-h-[60vh] overflow-y-auto">
                  <DraftsList
                    formName="BOM"
                    onLoadDraft={handleLoadDraft}
                    onDeleteDraft={deleteDraft}
                    onClose={() => setShowDrafts(false)}
                  />
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                  <p className="text-[9px]  text-slate-400   ">Select a draft to initialize formulation</p>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  )
}
