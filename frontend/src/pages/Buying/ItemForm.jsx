import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import AuditTrail from '../../components/AuditTrail'
import SearchableSelect from '../../components/SearchableSelect'
import { ChevronLeft, ChevronRight, X, Edit, Trash2, Check } from 'lucide-react'
import './Buying.css'


const TABS = [
  { id: 'details', label: 'Details' }
]

export default function ItemForm() {
  const { item_code } = useParams()
  const navigate = useNavigate()
  const isEditMode = item_code && item_code !== 'new'

  const [activeTab, setActiveTab] = useState('details')
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editingDimension, setEditingDimension] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [editingBarcode, setEditingBarcode] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [barcodeEditData, setBarcodeEditData] = useState({})
  const [supplierEditData, setSupplierEditData] = useState({})
  const [generatedBarcode, setGeneratedBarcode] = useState(null)


  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    item_group: '',
    uom: 'Nos',
    hsn_code: '',
    disabled: false,
    allow_alternative_item: false,
    maintain_stock: true,
    has_variants: false,
    opening_stock: 0,
    valuation_rate: 0,
    valuation_method: 'FIFO',
    standard_selling_rate: 0,
    selling_rate: 0,
    is_fixed_asset: false,
    shelf_life_in_days: '',
    warranty_period_in_days: '',
    end_of_life: '',
    weight_per_unit: '',
    weight_uom: '',
    allow_negative_stock: false,
    barcode_list: [],
    has_batch_no: false,
    has_serial_no: false,
    automatically_create_batch: false,
    batch_number_series: '',
    has_expiry_date: false,
    retain_sample: false,
    max_sample_quantity: '',
    default_purchase_uom: 'Nos',
    lead_time_days: 0,
    minimum_order_qty: 1,
    safety_stock: 0,
    is_customer_provided_item: false,
    suppliers_list: [],
    default_sales_uom: 'Nos',
    max_discount_percentage: 0,
    grant_commission: false,
    allow_sales: true,
    customer_details: [],
    gst_rate: 0,
    cess_rate: 0,
    inclusive_tax: false,
    supply_raw_materials_for_purchase: false,
    include_item_in_manufacturing: false,
    description: '',
    hsncode: '',
    no_of_cavities: 1,
    family_mould: false,
    mould_number: '',
    drawing_no: '',
    revision: '',
    material_grade: '',
    gdc_dimensional_parameters: [],
    pdi_dimensional_parameters: [],
    visual_parameters: [],
    machining_dimensional_parameters: [],
    machining_process_parameters: []
  })

  const [itemGroups, setItemGroups] = useState([
    { label: 'SET', value: 'SET' },
    { label: 'Mould', value: 'Mould' },
    { label: 'EF; 1.5" UNIV TRUN RTV FREE', value: 'EF; 1.5" UNIV TRUN RTV FREE' },
    { label: 'Finished Goods', value: 'Finished Goods' },
    { label: 'Consumable', value: 'Consumable' },
    { label: 'Sub Assemblies', value: 'Sub Assemblies' },
    { label: 'Services', value: 'Services' },
    { label: 'Raw Material', value: 'Raw Material' },
    { label: 'Products', value: 'Products' },
    { label: 'All Item Groups', value: 'All Item Groups' }
  ])
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
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
  const [valuationMethods, setValuationMethods] = useState([
    { label: 'FIFO', value: 'FIFO' },
    { label: 'Moving Average', value: 'Moving Average' },
    { label: 'LIFO', value: 'LIFO' }
  ])
  const [barcodeTypes, setBarcodeTypes] = useState([
    { label: 'EAN', value: 'EAN' },
    { label: 'CODE128', value: 'CODE128' },
    { label: 'CODE39', value: 'CODE39' },
    { label: 'QR', value: 'QR' },
    { label: 'UPC', value: 'UPC' }
  ])
  const [statusOptions, setStatusOptions] = useState([
    { label: 'Match', value: 'Match' },
    { label: 'No Match', value: 'No Match' },
    { label: 'Pending', value: 'Pending' }
  ])
  const [itemGroupInput, setItemGroupInput] = useState('')
  const [showItemGroupDropdown, setShowItemGroupDropdown] = useState(false)

  useEffect(() => {
    fetchDropdownData()
    if (isEditMode) {
      fetchItem()
    }
  }, [])

  useEffect(() => {
    if (!isEditMode && formData.item_name) {
      const isAutoGenerated = !formData.item_code || formData.item_code.startsWith('ITEM-') || Object.values(getGroupPrefixMap()).some(prefix => formData.item_code?.startsWith(prefix + '-'))
      if (isAutoGenerated) {
        const generatedCode = generateItemCode(formData.item_name, formData.item_group)
        setFormData(prev => ({
          ...prev,
          item_code: generatedCode
        }))
      }
    }
  }, [formData.item_name, isEditMode, formData.item_group])

  useEffect(() => {
    if (!isEditMode && formData.item_code && !formData.item_name) {
      fetchItemNameByCode(formData.item_code)
    }
  }, [formData.item_code, isEditMode])


  const getGroupPrefixMap = () => ({
    'Finished Goods': 'FG',
    'Raw Material': 'RM',
    'Sub Assemblies': 'SA',
    'Services': 'SVC',
    'Mould': 'MLD',
    'Consumable': 'CON',
    'Products': 'PRD',
    'SET': 'SET'
  })

  const getItemGroupPrefix = (itemGroup) => {
    const prefixMap = getGroupPrefixMap()
    if (itemGroup && prefixMap[itemGroup]) {
      return prefixMap[itemGroup]
    }
    if (itemGroup) {
      return itemGroup.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '')
    }
    return 'ITEM'
  }

  const generateItemCode = (itemName, itemGroup = '') => {
    const cleaned = itemName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 25)

    const prefix = getItemGroupPrefix(itemGroup)
    return cleaned ? `${prefix}-${cleaned}` : `${prefix}-${Date.now()}`
  }

  const fetchItemNameByCode = async (itemCode) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/items/${itemCode}`)
      const itemData = response.data.data
      if (itemData && itemData.item_name) {
        setFormData(prev => ({
          ...prev,
          item_name: itemData.item_name
        }))
      }
    } catch (err) {
      console.log('Item code not found in system')
    }
  }

  const handleSelectItemGroup = (groupName) => {
    const isAutoGenerated = !formData.item_code || formData.item_code.startsWith('ITEM-') || Object.values(getGroupPrefixMap()).some(prefix => formData.item_code?.startsWith(prefix + '-'))
    
    const newFormData = {
      ...formData,
      item_group: groupName
    }
    
    if (!isEditMode && formData.item_name && isAutoGenerated) {
      const generatedCode = generateItemCode(formData.item_name, groupName)
      newFormData.item_code = generatedCode
    }
    
    setFormData(newFormData)
    setItemGroupInput(groupName)
    setShowItemGroupDropdown(false)
  }

  const filteredItemGroups = itemGroups.filter(group => {
    const groupLabel = typeof group === 'string' ? group : (group?.label || group?.value || '')
    return String(groupLabel).toLowerCase().includes((itemGroupInput || '').toLowerCase())
  })

  const fetchDropdownData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL
      const [groupsRes, suppliersRes, customersRes, uomRes] = await Promise.all([
        axios.get(`${apiUrl}/item-groups`).catch(() => ({ data: { data: [] } })),
        axios.get(`${apiUrl}/suppliers?limit=1000`),
        axios.get(`${apiUrl}/customers?limit=1000`),
        axios.get(`${apiUrl}/uom?limit=1000`).catch(() => ({ data: { data: [] } }))
      ])

      const groups = groupsRes.data.data || []
      if (groups.length > 0) {
        const mappedGroups = Array.isArray(groups) && typeof groups[0] === 'object'
          ? groups.map(g => ({ label: g.name || g.item_group || '', value: g.name || g.item_group || '' }))
          : groups.map(g => ({ label: g, value: g }))
        setItemGroups(mappedGroups)
      }

      setSuppliers(suppliersRes.data.data || [])
      setCustomers(customersRes.data.data || [])

      const uoms = uomRes.data.data || []
      if (uoms.length > 0) {
        const mappedUoms = Array.isArray(uoms) && typeof uoms[0] === 'object'
          ? uoms.map(u => ({ label: u.name || u.uom || '', value: u.name || u.uom || '' }))
          : uoms.map(u => ({ label: u, value: u }))
        setUomList(mappedUoms)
      }
    } catch (err) {
      console.error('Failed to fetch dropdown data:', err)
    }
  }


  const fetchItem = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/items/${item_code}`)
      const itemData = response.data.data
      
      if (!itemData) {
        setError('Item not found')
        return
      }
      
      setItem(itemData)
      setFormData(prev => ({
        ...prev,
        item_code: itemData.item_code || prev.item_code,
        item_name: itemData.item_name || itemData.name || prev.item_name,
        item_group: itemData.item_group || prev.item_group,
        ...itemData
      }))
    } catch (err) {
      console.error('Error fetching item:', err)
      setError(`Failed to fetch item details: ${err.response?.data?.error || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  const handleAddBarcode = () => {
    setFormData({
      ...formData,
      barcode_list: [...(formData.barcode_list || []), { barcode: '', barcode_name: '', barcode_type: '' }]
    })
  }

  const handleRemoveBarcode = (index) => {
    setFormData({
      ...formData,
      barcode_list: formData.barcode_list.filter((_, i) => i !== index)
    })
  }

  const handleEditBarcode = (index, barcode) => {
    setEditingBarcode(index)
    setBarcodeEditData({ ...barcode })
  }

  const handleSaveBarcode = () => {
    const updated = [...formData.barcode_list]
    updated[editingBarcode] = barcodeEditData
    setFormData({
      ...formData,
      barcode_list: updated
    })
    setEditingBarcode(null)
    setBarcodeEditData({})
  }

  const handleBarcodeCheckboxChange = (index) => {
    const rows = formData.barcode_list.map((row, i) => ({
      ...row,
      selected: i === index ? !row.selected : row.selected
    }))
    setFormData({
      ...formData,
      barcode_list: rows
    })
  }

  const handleDeleteSelectedBarcodes = () => {
    const updated = formData.barcode_list.filter(row => !row.selected)
    setFormData({
      ...formData,
      barcode_list: updated
    })
  }

  const handleAddSupplier = () => {
    setFormData({
      ...formData,
      suppliers_list: [...(formData.suppliers_list || []), { supplier_name: '', supplier_code: '' }]
    })
  }

  const handleEditSupplier = (index, supplier) => {
    setEditingSupplier(index)
    setSupplierEditData({ ...supplier })
  }

  const handleSaveSupplier = () => {
    const updated = [...formData.suppliers_list]
    updated[editingSupplier] = supplierEditData
    setFormData({
      ...formData,
      suppliers_list: updated
    })
    setEditingSupplier(null)
    setSupplierEditData({})
  }

  const handleRemoveSupplier = (index) => {
    setFormData({
      ...formData,
      suppliers_list: formData.suppliers_list.filter((_, i) => i !== index)
    })
  }

  const handleSupplierCheckboxChange = (index) => {
    const rows = formData.suppliers_list.map((row, i) => ({
      ...row,
      selected: i === index ? !row.selected : row.selected
    }))
    setFormData({
      ...formData,
      suppliers_list: rows
    })
  }

  const handleDeleteSelectedSuppliers = () => {
    const updated = formData.suppliers_list.filter(row => !row.selected)
    setFormData({
      ...formData,
      suppliers_list: updated
    })
  }

  const handleAddCustomerDetail = () => {
    setFormData({
      ...formData,
      customer_details: [...(formData.customer_details || []), { customer_name: '', customer_group: '', ref_code: '' }]
    })
  }

  const handleRemoveCustomerDetail = (index) => {
    setFormData({
      ...formData,
      customer_details: formData.customer_details.filter((_, i) => i !== index)
    })
  }

  const handleUpdateCustomerDetail = (index, field, value) => {
    const updated = [...formData.customer_details]
    updated[index][field] = value
    setFormData({
      ...formData,
      customer_details: updated
    })
  }

  const handleAddAutoReorder = () => {
    setFormData({
      ...formData,
      auto_reorder: [...(formData.auto_reorder || []), { warehouse: '', reorder_level: 0, reorder_qty: 0 }]
    })
  }

  const handleRemoveAutoReorder = (index) => {
    setFormData({
      ...formData,
      auto_reorder: formData.auto_reorder.filter((_, i) => i !== index)
    })
  }

  const handleUpdateAutoReorder = (index, field, value) => {
    const updated = [...formData.auto_reorder]
    updated[index][field] = field === 'warehouse' ? value : parseFloat(value) || 0
    setFormData({
      ...formData,
      auto_reorder: updated
    })
  }

  const handleAddDimensionRow = (type) => {
    setFormData({
      ...formData,
      [type]: [...(formData[type] || []), { id: Date.now(), name: '', value: '', status: '' }]
    })
  }

  const handleEditDimension = (type, index, row) => {
    setEditingType(type)
    setEditingDimension(index)
    setEditFormData({ ...row })
  }

  const handleSaveDimension = () => {
    const updated = [...formData[editingType]]
    updated[editingDimension] = editFormData
    setFormData({
      ...formData,
      [editingType]: updated
    })
    setEditingDimension(null)
    setEditingType(null)
    setEditFormData({})
  }

  const handleDeleteDimension = (type, index) => {
    const updated = formData[type].filter((_, i) => i !== index)
    setFormData({
      ...formData,
      [type]: updated
    })
  }

  const handleDimensionCheckboxChange = (type, index) => {
    const rows = formData[type].map((row, i) => ({
      ...row,
      selected: i === index ? !row.selected : row.selected
    }))
    setFormData({
      ...formData,
      [type]: rows
    })
  }

  const handleDeleteSelectedDimensions = (type) => {
    const updated = formData[type].filter(row => !row.selected)
    setFormData({
      ...formData,
      [type]: updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.item_code || !formData.item_name || !formData.item_group) {
      setError('Item Code, Name, and Group are required in Details tab')
      setActiveTab('details')
      return
    }

    try {
      setLoading(true)
      const apiUrl = import.meta.env.VITE_API_URL
      if (isEditMode) {
        await axios.put(`${apiUrl}/items/${item_code}`, formData)
        setSuccess('Item updated successfully')
      } else {
        await axios.post(`${apiUrl}/items`, formData)
        setSuccess('Item created successfully')
      }

      setTimeout(() => navigate('/manufacturing/items'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save item')
    } finally {
      setLoading(false)
    }
  }

  const handleTabClick = (tabId) => {
    setActiveTab(tabId)
  }

  const generateEANBarcode = () => {
    if (!formData.item_code) {
      setError('Please generate Item Code first')
      return
    }
    
    const barcodeValue = formData.item_code.replace(/[^0-9]/g, '').substring(0, 12).padEnd(12, '0')
    const barcodeUrl = `https://barcodeapi.com/api/generate?type=ean&value=${barcodeValue}&width=200&height=100`
    
    setGeneratedBarcode({
      barcode: barcodeValue,
      barcode_name: formData.item_code,
      barcode_type: 'EAN',
      image_url: barcodeUrl
    })

    const updatedBarcodes = [
      ...formData.barcode_list,
      {
        barcode: barcodeValue,
        barcode_name: formData.item_code,
        barcode_type: 'EAN'
      }
    ]
    setFormData({
      ...formData,
      barcode_list: updatedBarcodes
    })

    setSuccess('EAN barcode generated successfully')
    setTimeout(() => setSuccess(null), 3000)
  }

  const currentTabIndex = TABS.findIndex(t => t.id === activeTab)

  const renderDimensionTable = (type, title) => (
    <div className="dimension-section">
      <h3>{title}</h3>
      <div className="dimension-table-wrapper">
        {formData[type] && formData[type].length > 0 ? (
          <table className="dimension-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={() => { }} />
                </th>
                <th style={{ width: '60px' }}>No.</th>
                <th>Parameter</th>
                <th>Value</th>
                <th>Status</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {formData[type].map((row, index) => {
                const isEditing = editingDimension === index && editingType === type;
                return (
                  <tr
                    key={index}
                    className={row.selected ? 'selected' : ''}
                    style={isEditing ? {
                      backgroundColor: '#e3f2fd',
                      border: '2px solid #2196F3'
                    } : {}}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={row.selected || false}
                        onChange={() => handleDimensionCheckboxChange(type, index)}
                        disabled={isEditing}
                      />
                    </td>
                    <td>{index + 1}</td>
                    <td style={{ padding: '0' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', width: '100%' }}>
                          <SearchableSelect
                            value={editFormData.name || editFormData.parameter || ''}
                            onChange={(val) => setEditFormData({
                              ...editFormData,
                              name: val,
                              parameter: val
                            })}
                            options={[
                              { label: 'Parameter 1', value: 'Parameter 1' },
                              { label: 'Parameter 2', value: 'Parameter 2' },
                              { label: 'Parameter 3', value: 'Parameter 3' },
                              { label: 'Dimension A', value: 'Dimension A' },
                              { label: 'Dimension B', value: 'Dimension B' }
                            ]}
                            placeholder="Select parameter"
                          />
                        </div>
                      ) : (
                        row.name || row.parameter || '-'
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.value || ''}
                          onChange={(e) => setEditFormData({
                            ...editFormData,
                            value: e.target.value
                          })}
                          placeholder="Enter value"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #2196F3',
                            borderRadius: '4px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      ) : (
                        row.value || '-'
                      )}
                    </td>

                    <td style={{ padding: '0' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', width: '100%' }}>
                          <SearchableSelect
                            value={editFormData.value || ''}
                            onChange={(val) => setEditFormData({
                              ...editFormData,
                              value: val
                            })}
                            options={[
                              { label: '10 mm', value: '10 mm' },
                              { label: '15 mm', value: '15 mm' },
                              { label: '20 mm', value: '20 mm' },
                              { label: '25 mm', value: '25 mm' },
                              { label: '30 mm', value: '30 mm' }
                            ]}
                            placeholder="Select value"
                          />
                        </div>
                      ) : (
                        row.value || '-'
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveDimension}
                              title="Save"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDimension(null)
                                setEditingType(null)
                                setEditFormData({})
                              }}
                              title="Cancel"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#da190b'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-icon-edit"
                            onClick={() => handleEditDimension(type, index, row)}
                            title="Edit"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#2196F3',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="no-data-message">No parameters added</div>
        )}
      </div>
      <div className="dimension-actions">
        {formData[type] && formData[type].some(r => r.selected) && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => handleDeleteSelectedDimensions(type)}
          >
            Delete Selected
          </Button>
        )}
        <Button
          type="button"
          variant="success"
          size="sm"
          onClick={() => handleAddDimensionRow(type)}
        >
          Add Row
        </Button>
      </div>
    </div>
  )


  const renderDetailsTab = () => (
    <div className="form-section">
      <div className="form-row grid grid-cols-3">
        <div className="form-group">
          <label>Item Code *</label>
          <input
            type="text"
            className='p-2  border border-gray-300 rounded bg-white'
            name="item_code"
            value={formData.item_code}
            onChange={(e) => {
              handleChange(e)
              if (!formData.item_name && e.target.value) {
                fetchItemNameByCode(e.target.value)
              }
            }}
            disabled={isEditMode || (formData.item_code && formData.item_code.startsWith('ITEM-'))}
            placeholder={isEditMode ? 'Item Code' : 'Auto-generated or enter to fetch'}
            required
          />
        </div>
        <div className="form-group">
          <label>Item Name *</label>
          <input
            type="text"
            name="item_name"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.item_name}
            onChange={(e) => {
              handleChange(e)
              if (!isEditMode && !formData.item_code && e.target.value) {
                const generatedCode = generateItemCode(e.target.value, formData.item_group)
                setFormData(prev => ({
                  ...prev,
                  item_code: generatedCode
                }))
              }
            }}
            placeholder="Enter item name (item code auto-generated)"
            required
          />
        </div>
        <div className="form-group">
          <label>Item Group *</label>
          <SearchableSelect
            value={formData.item_group}
            onChange={(val) => {
              const isAutoGenerated = !formData.item_code || formData.item_code.startsWith('ITEM-') || Object.values(getGroupPrefixMap()).some(prefix => formData.item_code?.startsWith(prefix + '-'))
              const newFormData = { ...formData, item_group: val }
              if (!isEditMode && formData.item_name && isAutoGenerated) {
                const generatedCode = generateItemCode(formData.item_name, val)
                newFormData.item_code = generatedCode
              }
              setFormData(newFormData)
            }}
            options={itemGroups}
            placeholder="Select item group"
          />
        </div>
        <div className="form-group">
          <label>Default UOM *</label>
          <SearchableSelect
            value={formData.uom}
            onChange={(val) => setFormData({ ...formData, uom: val })}
            options={uomList}
            placeholder="Select UOM"
          />
        </div>
        <div className="form-group">
          <label>Valuation Rate</label>
          <input
            type="number"
            name="valuation_rate"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.valuation_rate}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>Selling Rate</label>
          <input
            type="number"
            name="selling_rate"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.selling_rate}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>No. of Cavity (for mould items)</label>
          <input
            type="number"
            className='p-2  border border-gray-300 rounded bg-white'
            name="no_of_cavities"
            value={formData.no_of_cavities}
            onChange={handleChange}
            placeholder="1"
            min="1"
          />
        </div>
         <div className="form-group">
          <label>Weight per Unit</label>
          <input
            type="number"
            name="weight_per_unit"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.weight_per_unit}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>Weight UOM</label>
          <SearchableSelect
            value={formData.weight_uom}
            onChange={(val) => setFormData({ ...formData, weight_uom: val })}
            options={uomList}
            placeholder="Select weight UOM"
          />
        </div>
         <div className="form-group">
          <label>Drawing No (Optional)</label>
          <input
            type="text"
            name="drawing_no"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.drawing_no}
            onChange={handleChange}
            placeholder="Enter drawing number"
          />
        </div>
        <div className="form-group">
          <label>Revision (Optional)</label>
          <input
            type="text"
            name="revision"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.revision}
            onChange={handleChange}
            placeholder="Enter revision"
          />
        </div>
         <div className="form-group">
          <label>Material Grade (Optional)</label>
          <input
            type="text"
            name="material_grade"
            className='p-2  border border-gray-300 rounded bg-white'
            value={formData.material_grade}
            onChange={handleChange}
            placeholder="Enter material grade"
          />
        </div>
         <Button
          type="button"
          onClick={generateEANBarcode}
          variant="info"
          style={{ marginBottom: '12px' }}
        >
          Generate EAN Barcode
        </Button>
      </div>

     
     

      {generatedBarcode && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: '4px'
        }}>
          <h4 style={{ marginTop: 0 }}>Generated Barcode</h4>
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <img
              src={generatedBarcode.image_url}
              alt="EAN Barcode"
              style={{ maxWidth: '100%', height: 'auto' }}
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
          </div>
          <p><strong>Code:</strong> {generatedBarcode.barcode}</p>
          <p><strong>Type:</strong> {generatedBarcode.barcode_type}</p>
          <p><strong>Name:</strong> {generatedBarcode.barcode_name}</p>
        </div>
      )}
    </div>
  )

  const renderTabContent = () => {
    return renderDetailsTab()
  }

  const PLACEHOLDER = () => (
    <div className="form-section">
      <h3>Inventory Settings</h3>

      <div className="form-row">
        <div className="form-group">
                   <label>Valuation Method</label>
          <SearchableSelect
            value={formData.valuation_method}
            onChange={(val) => setFormData({ ...formData, valuation_method: val })}
            options={valuationMethods}
            placeholder="Select valuation method"
          />

        </div>
        
        <div className="form-group">
          <label>Shelf Life In Days</label>
          <input
            type="number"
            name="shelf_life_in_days"
            value={formData.shelf_life_in_days}
            onChange={handleChange}
            placeholder="Days"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Warranty Period (in days)</label>
          <input
            type="number"
            name="warranty_period_in_days"
            value={formData.warranty_period_in_days}
            onChange={handleChange}
            placeholder="Days"
          />
        </div>
        <div className="form-group">
          <label>End of Life</label>
          <input
            type="date"
            name="end_of_life"
            value={formData.end_of_life}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Weight Per Unit</label>
          <input
            type="number"
            name="weight_per_unit"
            value={formData.weight_per_unit}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
        <div className="form-group">
                   <label>Weight UOM</label>
          <SearchableSelect
            value={formData.weight_uom}
            onChange={(val) => setFormData({ ...formData, weight_uom: val })}
            options={uomList}
            placeholder="Select weight UOM"
          />

        </div>
      </div>

      <div className="form-row">
        <div className="form-group checkbox">
          <input
            type="checkbox"
            name="allow_negative_stock"
            id="allow_negative_stock"
            checked={formData.allow_negative_stock}
            onChange={handleChange}
          />
          <label htmlFor="allow_negative_stock">Allow Negative Stock</label>
        </div>
      </div>

    
      <h3 className='mt-5'>Barcodes</h3>

      <div className="items-section">
        {formData.barcode_list.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" />
                </th>
                <th style={{ width: '60px' }}>No.</th>
                <th>Barcode Name</th>
                <th>Barcode Type</th>
                <th style={{ width: '150px' }}>Barcode Preview</th>
                <th style={{ width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.barcode_list.map((barcode, index) => {
                const isEditing = editingBarcode === index;
                return (
                  <tr
                    key={index}
                    className={barcode.selected ? 'selected' : ''}
                    style={isEditing ? {
                      backgroundColor: '#e3f2fd',
                      border: '2px solid #2196F3'
                    } : {}}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={barcode.selected || false}
                        onChange={() => handleBarcodeCheckboxChange(index)}
                        disabled={isEditing}
                      />
                    </td>
                    <td>{index + 1}</td>
                    <td style={{ padding: '1rem' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={barcodeEditData.barcode_name || ''}
                          onChange={(e) => setBarcodeEditData({
                            ...barcodeEditData,
                            barcode_name: e.target.value
                          })}
                          placeholder="Enter barcode name"
                          autoFocus
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #2196F3',
                            borderRadius: '4px',
                            fontFamily: 'inherit',
                            fontSize: '12px',
                            boxSizing: 'border-box'
                          }}
                        />
                      ) : (
                        barcode.barcode_name || '-'
                      )}
                    </td>
                                       <td style={{ padding: '0' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', width: '100%' }}>
                          <SearchableSelect
                            value={barcodeEditData.barcode_type || ''}
                            onChange={(val) => setBarcodeEditData({
                              ...barcodeEditData,
                              barcode_type: val
                            })}
                            options={barcodeTypes}
                            placeholder="Select barcode type"
                          />
                        </div>
                      ) : (
                        barcode.barcode_type || '-'
                      )}
                    </td>

                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      {barcode.barcode && barcode.barcode_type ? (
                        <img
                          src={`https://barcodeapi.com/api/generate?type=${barcode.barcode_type.toLowerCase()}&value=${barcode.barcode}&width=100&height=50`}
                          alt="Barcode preview"
                          style={{ maxWidth: '100%', height: 'auto', maxHeight: '50px' }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        '-'
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveBarcode}
                              title="Save"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBarcode(null)
                                setBarcodeEditData({})
                              }}
                              title="Cancel"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#da190b'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-icon-edit"
                            onClick={() => handleEditBarcode(index, barcode)}
                            title="Edit"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#2196F3',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {formData.barcode_list && formData.barcode_list.some(r => r.selected) && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteSelectedBarcodes}
            >
              Delete Selected
            </Button>
          )}
          <Button
            type="button"
            onClick={handleAddBarcode}
            variant="success"
            size="sm"
          >
            Add Row
          </Button>
        </div>
      </div>

      
      <h3 className='mt-5'>
        <input
          type="checkbox"
          id="has_batch_no"
          name="has_batch_no"
          checked={formData.has_batch_no}
          onChange={handleChange}
          style={{ marginRight: '8px' }}
        />
        <label htmlFor="has_batch_no" style={{ display: 'inline', cursor: 'pointer' }}>Serial Nos and Batches</label>
      </h3>

      {formData.has_batch_no && (
        <div className="form-section" style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <div className="form-row">
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="has_batch_no_opt"
                name="has_batch_no"
                checked={formData.has_batch_no}
                onChange={handleChange}
              />
              <label htmlFor="has_batch_no_opt">Has Batch No</label>
            </div>
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="has_serial_no"
                name="has_serial_no"
                checked={formData.has_serial_no}
                onChange={handleChange}
              />
              <label htmlFor="has_serial_no">Has Serial No</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="automatically_create_batch"
                name="automatically_create_batch"
                checked={formData.automatically_create_batch}
                onChange={handleChange}
              />
              <label htmlFor="automatically_create_batch">Automatically Create New Batch</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Batch Number Series</label>
              <input
                type="text"
                name="batch_number_series"
                value={formData.batch_number_series}
                onChange={handleChange}
                placeholder="Example: ABCD.##### . If series is set and Batch No is not mentioned in transactions, then automatic batch number will be created based on this series."
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="has_expiry_date"
                name="has_expiry_date"
                checked={formData.has_expiry_date}
                onChange={handleChange}
              />
              <label htmlFor="has_expiry_date">Has Expiry Date</label>
            </div>
            <div className="form-group checkbox">
              <input
                type="checkbox"
                id="retain_sample"
                name="retain_sample"
                checked={formData.retain_sample}
                onChange={handleChange}
              />
              <label htmlFor="retain_sample">Retain Sample</label>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Sample Quantity</label>
              <input
                type="number"
                name="max_sample_quantity"
                value={formData.max_sample_quantity}
                onChange={handleChange}
                placeholder="Maximum sample quantity that can be retained"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderPurchasingTab = () => (
    <div className="form-section">
      <div className="form-row">
        <div className="form-group">
                    <label>Default Purchase Unit of Measure</label>
          <SearchableSelect
            value={formData.default_purchase_uom}
            onChange={(val) => setFormData({ ...formData, default_purchase_uom: val })}
            options={uomList}
            placeholder="Select purchase UOM"
          />

        </div>
        <div className="form-group">
          <label>Lead Time in days</label>
          <input
            type="number"
            name="lead_time_days"
            value={formData.lead_time_days}
            onChange={handleChange}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Minimum Order Qty</label>
          <input
            type="number"
            name="minimum_order_qty"
            value={formData.minimum_order_qty}
            onChange={handleChange}
            placeholder="1"
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group checkbox">
          <input
            type="checkbox"
            name="is_customer_provided_item"
            id="is_customer_provided_item"
            checked={formData.is_customer_provided_item}
            onChange={handleChange}
          />
          <label htmlFor="is_customer_provided_item">Is Customer Provided Item</label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Safety Stock</label>
          <input
            type="number"
            name="safety_stock"
            value={formData.safety_stock}
            onChange={handleChange}
            placeholder="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="form-group checkbox mt-5">
        <input
          type="checkbox"
          name="supply_raw_materials_for_purchase"
          id="supply_raw_materials"
          checked={formData.supply_raw_materials_for_purchase}
          onChange={handleChange}
        />
        <label htmlFor="supply_raw_materials">Supply Raw Materials for Purchase - If subcontracted to a vendor</label>
      </div>

      <h3 className='mt-5'>Suppliers</h3>

      <div className="items-section">
        {formData.suppliers_list.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" />
                </th>
                <th style={{ width: '60px' }}>No.</th>
                <th>Supplier Name</th>
                <th>Supplier Code</th>
                <th style={{ width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.suppliers_list.map((supplier, index) => {
                const isEditing = editingSupplier === index;
                return (
                  <tr
                    key={index}
                    className={supplier.selected ? 'selected' : ''}
                    style={isEditing ? {
                      backgroundColor: '#e3f2fd',
                      border: '2px solid #2196F3'
                    } : {}}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={supplier.selected || false}
                        onChange={() => handleSupplierCheckboxChange(index)}
                        disabled={isEditing}
                      />
                    </td>
                    <td>{index + 1}</td>
                                       <td style={{ padding: '0' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', width: '100%' }}>
                          <SearchableSelect
                            value={supplierEditData.supplier_name || ''}
                            onChange={(val) => setSupplierEditData({
                              ...supplierEditData,
                              supplier_name: val
                            })}
                            options={suppliers.map(s => ({ label: s.supplier_name, value: s.supplier_name }))}
                            placeholder="Select supplier"
                          />
                        </div>
                      ) : (
                        supplier.supplier_name || '-'
                      )}
                    </td>

                    <td style={{ padding: '0' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={supplierEditData.supplier_code || ''}
                          onChange={(e) => setSupplierEditData({
                            ...supplierEditData,
                            supplier_code: e.target.value
                          })}
                          placeholder="Enter supplier code"
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #2196F3',
                            borderRadius: '4px',
                            fontFamily: 'inherit',
                            fontSize: 'inherit',
                            boxSizing: 'border-box'
                          }}
                        />
                      ) : (
                        supplier.supplier_code || '-'
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveSupplier}
                              title="Save"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#45a049'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#4CAF50'}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSupplier(null)
                                setSupplierEditData({})
                              }}
                              title="Cancel"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#da190b'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#f44336'}
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-icon-edit"
                            onClick={() => handleEditSupplier(index, supplier)}
                            title="Edit"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#2196F3',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#1976D2'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#2196F3'}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {formData.suppliers_list && formData.suppliers_list.some(r => r.selected) && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDeleteSelectedSuppliers}
            >
              Delete Selected
            </Button>
          )}
          <Button
            type="button"
            onClick={handleAddSupplier}
            variant="success"
            size="sm"
          >
            Add Row
          </Button>
        </div>
      </div>
    </div>
  )

  const renderSalesTab = () => (
    <div className="form-section">
      <div className="form-row">
        <div className="form-group">
                   <label>Default Sales Unit of Measure</label>
          <SearchableSelect
            value={formData.default_sales_uom}
            onChange={(val) => setFormData({ ...formData, default_sales_uom: val })}
            options={uomList}
            placeholder="Select sales UOM"
          />

        </div>
        <div className="form-group">
          <label>Max Discount (%)</label>
          <input
            type="number"
            name="max_discount_percentage"
            value={formData.max_discount_percentage}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="100"
            step="0.01"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group checkbox">
          <input
            type="checkbox"
            name="grant_commission"
            id="grant_commission"
            checked={formData.grant_commission}
            onChange={handleChange}
          />
          <label htmlFor="grant_commission">Grant Commission</label>
        </div>
        <div className="form-group checkbox">
          <input
            type="checkbox"
            name="allow_sales"
            id="allow_sales"
            checked={formData.allow_sales}
            onChange={handleChange}
          />
          <label htmlFor="allow_sales">Allow Sales</label>
        </div>
      </div>
    </div>
  )

  const renderAccountingTab = () => (
    <div className="form-section">
      <div className="form-row">
        <div className="form-group">
          <label>Opening Stock</label>
          <input
            type="number"
            name="opening_stock"
            value={formData.opening_stock}
            onChange={handleChange}
            placeholder="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>Valuation Rate</label>
          <input
            type="number"
            name="valuation_rate"
            value={formData.valuation_rate}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Standard Selling Rate</label>
          <input
            type="number"
            name="standard_selling_rate"
            value={formData.standard_selling_rate}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>
    </div>
  )

  const renderTaxTab = () => (
    <div className="form-section">
      <div className="form-row">
        <div className="form-group">
          <label>GST Rate (%)</label>
          <input
            type="number"
            name="gst_rate"
            value={formData.gst_rate}
            onChange={handleChange}
            placeholder="0"
            min="0"
            max="100"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label>Cess Rate (%)</label>
          <input
            type="number"
            name="cess_rate"
            value={formData.cess_rate}
            onChange={handleChange}
            placeholder="0"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div className="form-group checkbox">
        <input
          type="checkbox"
          name="inclusive_tax"
          id="inclusive_tax"
          checked={formData.inclusive_tax}
          onChange={handleChange}
        />
        <label htmlFor="inclusive_tax">Inclusive Tax</label>
      </div>
    </div>
  )

  const renderQualityTab = () => (
    <div className="form-section">
      <div className="form-row">
        <div className="form-group">
          <label>Quality Control Required</label>
          <input
            type="checkbox"
            id="quality_control"
            placeholder="Quality control settings"
          />
        </div>
      </div>
      <p className="text-neutral-500 text-xs">Quality control features can be configured here</p>
    </div>
  )

  const renderManufacturingTab = () => (
    <div className="form-section">
      <div className="form-group checkbox">
        <input
          type="checkbox"
          name="include_item_in_manufacturing"
          id="include_item_in_manufacturing"
          checked={formData.include_item_in_manufacturing}
          onChange={handleChange}
        />
        <label htmlFor="include_item_in_manufacturing">Include Item In Manufacturing</label>
      </div>

      <div className="form-group checkbox mt-4">
        <input
          type="checkbox"
          name="supply_raw_materials_for_purchase"
          id="supply_raw_materials_mfg"
          checked={formData.supply_raw_materials_for_purchase}
          onChange={handleChange}
        />
        <label htmlFor="supply_raw_materials_mfg">Supply Raw Materials for Purchase - If subcontracted to a vendor</label>
      </div>
    </div>
  )

  return (
    <div className="buying-container">
      <Card>
        <div className="page-header">
          <h2>{isEditMode ? 'Edit Item' : 'Create Item'}</h2>
          <Button
            onClick={() => navigate('/manufacturing/items')}
            variant="secondary"
          >
            Back
          </Button>
        </div>

        {error && <Alert type="danger">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {isEditMode && loading && !item && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin inline-block mb-3">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
              </div>
              <p className="text-slate-600">Loading item details...</p>
            </div>
          </div>
        )}

        {isEditMode && item && (
          <AuditTrail
            createdAt={item.created_at}
            createdBy={item.created_by}
            updatedAt={item.updated_at}
            updatedBy={item.updated_by}
          />
        )}

        {(!isEditMode || item) && (
        <form onSubmit={handleSubmit} className="form-container">
          {renderTabContent()}

          <div className="form-actions">
            <div></div>
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/manufacturing/items')}
              >
                Cancel
              </Button>
            </div>
            <div></div>
          </div>
        </form>
        )}
      </Card>
    </div>
  )
}
