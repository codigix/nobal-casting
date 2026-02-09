import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save, X, AlertCircle, CheckCircle, Factory,
  Boxes, Edit2, Settings, Calendar,
  Database, Layers, Clock,
  ArrowRight, ShieldCheck, Zap, Activity, Filter, Info,
  BarChart3, TrendingUp, FileText, ChevronRight
} from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import Card from '../../components/Card/Card'

// Helper Components for the Redesign
const SectionTitle = ({ title, icon: Icon, badge }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
        <Icon size={18} />
      </div>
      <h3 className="text-xs text-slate-900 text-xs">{title}</h3>
    </div>
    {badge && (
      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs   rounded-full border border-slate-200 text-xs">
        {badge}
      </span>
    )}
  </div>
)

const FieldWrapper = ({ label, children, error, required }) => (
  <div className=".5">
    <div className="flex items-center justify-between">
      <label className="text-xs   text-slate-400 text-xs flex items-center gap-1">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {error && <span className="text-xs   text-rose-500 animate-pulse">{error}</span>}
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
        <Icon size={10} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : 'opacity-60'} />
      </div>
      <span className="text-xs font-medium ">{label.split(' ').slice(1).join(' ')}</span>
      {isActive && <div className="w-1 h-1 rounded bg-current animate-pulse ml-0.5" />}
    </button>
  )
}

export default function WorkOrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const searchParams = new URLSearchParams(window.location.search)
  const isReadOnly = searchParams.get('readonly') === 'true'
  const prefillItem = searchParams.get('item_to_manufacture')
  const prefillQty = searchParams.get('qty_to_manufacture')
  const prefillBom = searchParams.get('bom_no') || searchParams.get('bom_id')
  const prefillStartDate = searchParams.get('planned_start_date')
  const productionPlanId = searchParams.get('production_plan_id')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [items, setItems] = useState([])
  const [bomOperations, setBomOperations] = useState([])
  const [bomMaterials, setBomMaterials] = useState([])
  const [availableBoms, setAvailableBoms] = useState([])
  const [jobCards, setJobCards] = useState([])
  const [bomQuantity, setBomQuantity] = useState(1)
  const [workstations, setWorkstations] = useState([])
  const [productionStages, setProductionStages] = useState([])
  const [isEditMode, setIsEditMode] = useState(!id)
  const [editingJobCardId, setEditingJobCardId] = useState(null)
  const [activeSection, setActiveSection] = useState('foundation')

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
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
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['foundation', 'timeline', 'operations', 'inventory']
      const scrollPosition = window.scrollY + 200

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

  const [completionMetrics, setCompletionMetrics] = useState({
    totalPlanned: 0,
    totalCompleted: 0,
    allCompleted: false,
    efficiency: 0,
    totalActualTime: 0,
    qualityScore: 0
  })

  const [allTimeLogs, setAllTimeLogs] = useState([])
  const [allRejections, setAllRejections] = useState([])
  const [allDowntimes, setAllDowntimes] = useState([])

  const [formData, setFormData] = useState({
    work_order_id: '',
    naming_series: 'MFG-WO-.YYYY.-',
    item_to_manufacture: prefillItem || '',
    qty_to_manufacture: prefillQty ? parseInt(prefillQty) : 1,
    sales_order_id: '',
    bom_id: prefillBom || '',
    planned_start_date: prefillStartDate || new Date().toISOString().split('T')[0],
    planned_end_date: '',
    actual_start_date: '',
    actual_end_date: '',
    expected_delivery_date: '',
    priority: 'medium',
    status: 'draft',
    notes: '',
    production_stage_id: null
  })

  // Data Fetching Logic (Same as before)
  useEffect(() => {
    fetchItems()
    fetchProductionStages()
    fetchWorkstations()
    if (id) {
      fetchWorkOrderDetails(id)
      fetchJobCards(id)
    } else if (productionPlanId) {
      fetchProductionPlanData(productionPlanId)
    } else if (prefillItem) {
      handleItemSelect(prefillItem)
    } else if (prefillBom) {
      fetchBOMDetails(prefillBom)
    }
  }, [id, productionPlanId, prefillItem, prefillBom])

  useEffect(() => {
    if (id && bomOperations.length > 0 && jobCards.length === 0 && !loading && !error && !success) {
      console.log('No job cards found for existing work order. Auto-generating...')
      createJobCardsFromOperations(true)
    }
  }, [id, bomOperations.length, jobCards.length, loading, error, success])

  useEffect(() => {
    if (jobCards.length > 0) {
      calculateCompletionMetrics(jobCards).then(enriched => {
        // Enrichment only happens here if the cards don't already have real-time data
        // We use setJobCards to make sure the table renders the latest quantities
        setJobCards(enriched)
      })
      if (bomOperations.length > 0) {
        populateWorkstationsForJobCards(jobCards, bomOperations)
      }
    }
  }, [jobCards.length, bomOperations.length])

  // Reactive update for materials and operations when quantity changes
  useEffect(() => {
    if (!id) {
      const workOrderQty = parseFloat(formData.qty_to_manufacture) || 0
      
      if (bomMaterials.length > 0) {
        setBomMaterials(prev => prev.map(mat => {
          if (mat.base_qty !== undefined) {
            const newQty = mat.base_qty * workOrderQty
            return {
              ...mat,
              quantity: newQty,
              required_qty: newQty
            }
          }
          return mat
        }))
      }

      if (bomOperations.length > 0) {
        setBomOperations(prev => prev.map(op => {
          if (op.base_time !== undefined) {
            const newTime = op.base_time * workOrderQty
            return {
              ...op,
              operation_time: newTime,
              operating_cost: newTime * (parseFloat(op.hourly_rate) || 0)
            }
          }
          return op
        }))
      }
    }
  }, [formData.qty_to_manufacture, id])

  const fetchProductionStages = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/production-stages/active`)
      if (response.data.success) setProductionStages(response.data.data || [])
    } catch (err) { console.error('Failed to fetch production stages:', err) }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await productionService.getWorkstationsList()
      setWorkstations(response.data || [])
    } catch (err) { console.error('Failed to fetch workstations:', err) }
  }

  const fetchProductionPlanData = async (planId) => {
    try {
      const response = await api.get(`/production-planning/${planId}`)
      const planData = response.data?.data || response.data
      if (planData) {
        let bomId = planData.bom_id || planData.raw_materials?.[0]?.bom_no || planData.fg_items?.[0]?.bom_no || ''
        if (bomId) {
          setFormData(prev => ({ ...prev, bom_id: bomId }))
          await fetchBOMDetails(bomId)
        }
      }
    } catch (err) { console.error('Failed to fetch production plan data:', err) }
  }

  const fetchJobCards = async (workOrderId) => {
    try {
      setLoading(true)
      const response = await productionService.getJobCards({ work_order_id: workOrderId })
      const rawCards = response.data || []
      const enrichedCards = await calculateCompletionMetrics(rawCards)
      setJobCards(enrichedCards)
    } catch (err) { 
      console.error('Failed to fetch job cards:', err) 
    } finally {
      setLoading(false)
    }
  }

  const calculateCompletionMetrics = async (cards) => {
    try {
      const totalPlanned = cards.reduce((sum, jc) => sum + (parseFloat(jc.planned_quantity) || 0), 0)
      let totalActualTime = 0
      let totalAccepted = 0
      
      const combinedTimeLogs = []
      const combinedRejections = []
      const combinedDowntimes = []
      const updatedCards = []

      for (const jc of cards) {
        try {
          const jcId = jc.job_card_id || jc.id
          let jcAccepted = 0
          
          // Fetch Time Logs - These represent production attempts
          const timeLogsRes = await productionService.getTimeLogs({ job_card_id: jcId })
          const logs = timeLogsRes.data || []
          combinedTimeLogs.push(...logs)
          
          logs.forEach(log => {
            if (log.from_time && log.to_time) totalActualTime += log.time_in_minutes || 0
            // We use completed_qty from time logs as the base production
            // If accepted_qty is populated, use that
            const accepted = parseFloat(log.accepted_qty || log.completed_qty) || 0
            jcAccepted += accepted
          })

          // Fetch Rejections - These are finalized quality entries
          const rejectionsRes = await productionService.getRejections({ job_card_id: jcId })
          const rejs = rejectionsRes.data || []
          combinedRejections.push(...rejs)
          
          // If we have rejection entries, they represent the definitive "Accepted" count for that stage
          // over and above (or instead of) simple time log entries
          let rejAccepted = 0
          rejs.forEach(rej => {
            const accepted = parseFloat(rej.accepted_qty) || 0
            rejAccepted += accepted
          })

          // Industry logic: Use Rejection Entry Accepted Qty if it exists, 
          // otherwise fallback to Time Log Qty
          let finalJcAccepted = Math.max(jcAccepted, rejAccepted)

          // Fallback to Job Card summary if no logs/rejections are found but the card has data
          // This ensures that "Sync Progress" doesn't zero out data for cards without detailed logs
          if (logs.length === 0 && rejs.length === 0 && (parseFloat(jc.accepted_quantity) > 0 || parseFloat(jc.produced_quantity) > 0)) {
            finalJcAccepted = parseFloat(jc.accepted_quantity) || (parseFloat(jc.produced_quantity) || 0)
          }

          totalAccepted += finalJcAccepted

          // Update job card with real-time quantity
          updatedCards.push({
            ...jc,
            completed_quantity: finalJcAccepted
          })

          // Fetch Downtimes
          const downtimesRes = await productionService.getDowntimes({ job_card_id: jcId })
          combinedDowntimes.push(...(downtimesRes.data || []))

        } catch (err) { console.error('Failed to fetch logs for job card:', jc.job_card_id || jc.id) }
      }

      setAllTimeLogs(combinedTimeLogs)
      setAllRejections(combinedRejections)
      setAllDowntimes(combinedDowntimes)

      // Use the last operation's completed quantity for work order completion rate
      // or use totalAccepted / totalPlanned for an aggregate view
      // Industry standard for WO completion is often the last operation's output
      const sortedCards = [...updatedCards].sort((a, b) => (a.operation_sequence || 0) - (b.operation_sequence || 0))
      const lastOpCompleted = sortedCards.length > 0 ? sortedCards[sortedCards.length - 1].completed_quantity : 0
      const totalCompleted = lastOpCompleted

      const allCompleted = updatedCards.length > 0 && updatedCards.every(jc => (jc.status || '').toLowerCase() === 'completed')

      // Earned Value Analysis for Efficiency
      let earnedMinutes = 0
      updatedCards.forEach(jc => {
        const op = bomOperations.find(o => 
          (o.operation_name === (jc.operation_name || jc.operation)) || 
          (o.operation === (jc.operation_name || jc.operation))
        )
        if (op) {
          // Standard time is stored in minutes in BOM
          const stdTimeMinutes = parseFloat(op.operation_time) || 0
          earnedMinutes += (parseFloat(jc.completed_quantity) || 0) * stdTimeMinutes
        }
      })

      const efficiency = totalActualTime > 0 ? ((earnedMinutes / totalActualTime) * 100).toFixed(0) : 0
      
      const totalRejected = combinedRejections.reduce((s, r) => s + (parseFloat(r.rejected_qty) || 0), 0)
      const totalScrap = combinedRejections.reduce((s, r) => s + (parseFloat(r.scrap_qty) || 0), 0)
      
      // Quality Score (Yield): Accepted / (Accepted + Rejected + Scrap)
      const totalInputAtQuality = totalAccepted + totalRejected + totalScrap
      const qualityScore = totalInputAtQuality > 0 
        ? ((totalAccepted / totalInputAtQuality) * 100).toFixed(1) 
        : 0
      
      const scrapRate = totalInputAtQuality > 0
        ? ((totalScrap / totalInputAtQuality) * 100).toFixed(1)
        : 0

      setCompletionMetrics({ 
        totalPlanned, 
        totalCompleted, 
        allCompleted, 
        efficiency, 
        totalActualTime, 
        qualityScore,
        totalScrap,
        scrapRate
      })
      
      return updatedCards
    } catch (err) { 
      console.error('Failed to calculate metrics:', err)
      return cards
    }
  }

  const generateDailyReport = () => {
    const reportData = {};

    // Process time logs for produced quantity
    allTimeLogs.forEach(log => {
      const dateKey = new Date(log.log_date || log.from_time).toISOString().split('T')[0];
      const shiftKey = log.shift || 'A';
      const key = `${dateKey}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          operator: log.operator_name || log.operator_id,
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0
        };
      }
      reportData[key].produced += parseFloat(log.completed_qty || 0);
    });

    // Process rejections for quality data
    allRejections.forEach(rej => {
      const dateKey = new Date(rej.log_date || rej.created_at).toISOString().split('T')[0];
      const shiftKey = rej.shift || '1';
      const key = `${dateKey}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          operator: 'N/A',
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0
        };
      }
      reportData[key].accepted += parseFloat(rej.accepted_qty || 0);
      reportData[key].rejected += parseFloat(rej.rejected_qty || 0);
      reportData[key].scrap += parseFloat(rej.scrap_qty || 0);
    });

    // Process downtimes
    allDowntimes.forEach(down => {
      const dateKey = new Date(down.log_date || down.start_time).toISOString().split('T')[0];
      const shiftKey = down.shift || '1';
      const key = `${dateKey}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          operator: 'N/A',
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0
        };
      }
      reportData[key].downtime += parseFloat(down.duration_minutes || 0);
    });

    return Object.values(reportData).sort((a, b) => new Date(b.date) - new Date(a.date) || b.shift.localeCompare(a.shift));
  };

  const downloadReport = () => {
    const data = generateDailyReport();
    const headers = ['Date', 'Shift', 'Operator', 'Produced', 'Accepted', 'Rejected', 'Scrap', 'Downtime (min)'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date,
        row.shift,
        `"${row.operator || 'N/A'}"`,
        row.produced.toFixed(2),
        row.accepted.toFixed(2),
        row.rejected.toFixed(2),
        row.scrap.toFixed(2),
        row.downtime.toFixed(0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Production_Report_${id || 'New'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchItems = async () => {
    try {
      const response = await productionService.getItems()
      const allItems = response.data || []
      const fgItems = allItems.filter(item =>
        ['Finished Good', 'Finished Goods', 'Sub Assembly', 'Sub Assemblies'].includes(item.item_group) ||
        ['FG', 'SA'].includes(item.fg_sub_assembly)
      )
      setItems(fgItems)
    } catch (err) { console.error('Failed to fetch items:', err); setError('Failed to load items') }
  }

  const fetchWorkOrderDetails = async (workOrderId) => {
    try {
      setLoading(true)
      const response = await productionService.getWorkOrder(workOrderId)
      const woData = response.data || response
      setFormData(prev => ({
        ...prev,
        work_order_id: woData.wo_id || woData.work_order_id || '',
        item_to_manufacture: woData.item_code || woData.item_to_manufacture || '',
        qty_to_manufacture: woData.quantity || woData.qty_to_manufacture || 1,
        sales_order_id: woData.sales_order_id || '',
        bom_id: woData.bom_id || woData.bom_no || '',
        planned_start_date: woData.planned_start_date ? woData.planned_start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        planned_end_date: woData.planned_end_date ? woData.planned_end_date.split('T')[0] : '',
        actual_start_date: woData.actual_start_date ? woData.actual_start_date.split('T')[0] : '',
        actual_end_date: woData.actual_end_date ? woData.actual_end_date.split('T')[0] : '',
        expected_delivery_date: woData.expected_delivery_date ? woData.expected_delivery_date.split('T')[0] : '',
        priority: woData.priority || 'medium',
        status: woData.status || 'draft',
        notes: woData.notes || ''
      }))
      if (woData.operations && woData.operations.length > 0) {
        setBomOperations(woData.operations.map((op, idx) => ({
          id: op.id || idx,
          operation_name: op.operation || op.operation_name || '',
          workstation: op.workstation || op.workstation_type || '',
          operation_time: op.time || op.operation_time || 0,
          operating_cost: op.operating_cost || 0,
          operation_type: op.operation_type || 'FG',
          hourly_rate: op.hourly_rate || 0
        })))
      } else if (woData.bom_id || woData.bom_no) {
        await fetchBOMDetails(woData.bom_id || woData.bom_no)
      }

      if (woData.items && woData.items.length > 0) {
        setBomMaterials(woData.items.map((item, idx) => ({
          id: item.id || idx,
          item_code: item.item_code,
          item_name: item.item_name || '',
          quantity: item.required_qty,
          uom: item.uom || '',
          required_qty: item.required_qty,
          source_warehouse: item.source_warehouse,
          transferred_qty: item.transferred_qty,
          consumed_qty: item.consumed_qty,
          returned_qty: item.returned_qty
        })))
      }
    } catch (err) { console.error('Failed to fetch work order:', err); setError(`Failed to load work order: ${err.message}`) }
    finally { setLoading(false) }
  }

  const fetchBOMDetails = async (bomId) => {
    if (!bomId) return
    try {
      setLoading(true)
      const response = await productionService.getBOMDetails(bomId)
      const bomData = response.data || response
      setBomQuantity(bomData.quantity || 1)
      const workOrderQty = parseFloat(formData.qty_to_manufacture) || 1

      const operations = (bomData.operations || []).map((op, idx) => {
        const baseTime = (op.operation_time || op.time_in_hours || 0) / (bomData.quantity || 1)
        const multipliedTime = baseTime * workOrderQty
        return {
          id: Date.now() + idx,
          operation_name: op.operation_name || op.operation || '',
          workstation: op.workstation || op.workstation_type || '',
          base_time: baseTime, // Store base ratio
          operation_time: multipliedTime,
          operating_cost: (op.operating_cost || op.cost || 0) * (workOrderQty / (bomData.quantity || 1)),
          operation_type: op.operation_type || 'FG',
          hourly_rate: op.hourly_rate || 0
        }
      })

      const rawMaterials = (bomData.bom_raw_materials || bomData.rawMaterials || []).map((rm, idx) => {
        const baseQty = (rm.qty || rm.quantity || 0) / (bomData.quantity || 1)
        const multipliedQty = baseQty * workOrderQty
        return {
          id: Date.now() + idx,
          item_code: rm.item_code || '',
          item_name: rm.item_name || rm.description || '',
          base_qty: baseQty, // Store base ratio
          quantity: multipliedQty,
          uom: rm.uom || '',
          required_qty: multipliedQty,
          source_warehouse: rm.source_warehouse || '',
          transferred_qty: rm.transferred_qty || 0,
          consumed_qty: rm.consumed_qty || 0,
          returned_qty: rm.returned_qty || 0
        }
      })

      setBomOperations(operations)
      setBomMaterials(rawMaterials)
      if (jobCards.length > 0 && operations.length > 0) populateWorkstationsForJobCards(jobCards, operations)
    } catch (err) { console.error('Failed to fetch BOM details:', err) }
    finally { setLoading(false) }
  }

  const handleInputChange = (e) => {
    if (isReadOnly) return
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'bom_id') {
      if (value) fetchBOMDetails(value)
      else {
        setBomOperations([])
        setBomMaterials([])
      }
    }
  }

  const handleItemSelect = async (itemCode) => {
    if (isReadOnly) return
    
    if (!itemCode) {
      setFormData(prev => ({
        ...prev,
        item_to_manufacture: '',
        sales_order_id: '',
        bom_id: ''
      }))
      setAvailableBoms([])
      setBomOperations([])
      setBomMaterials([])
      return
    }

    setLoading(true)
    try {
      const bomResponse = await productionService.getBOMs({ item_code: itemCode })
      const boms = bomResponse.data || []
      setAvailableBoms(boms)

      const response = await api.get(`/production-planning/item/${itemCode}`)
      const plan = response.data?.data || response.data

      let bomNo = plan?.fg_items?.[0]?.bom_no || plan?.bom_id || (boms.length > 0 ? (boms[0].bom_id || boms[0].name) : '')

      setFormData(prev => ({
        ...prev,
        item_to_manufacture: itemCode,
        sales_order_id: plan?.sales_order_id || '',
        bom_id: bomNo
      }))
      if (bomNo) await fetchBOMDetails(bomNo)
    } catch (err) { console.error('Error selecting item:', err) }
    finally { setLoading(false) }
  }

  const updateMaterial = (id, field, value) => {
    setBomMaterials(prev => prev.map(mat => mat.id === id ? { ...mat, [field]: value } : mat))
  }

  const updateJobCard = (jcIdentifier, field, value) => {
    setJobCards(prev => prev.map((jc, idx) => {
      const uniqueId = jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`
      return uniqueId === jcIdentifier ? { ...jc, [field]: value } : jc
    }))
  }

  const saveJobCard = async (jcIdentifier) => {
    const jobCard = jobCards.find((jc, idx) => (jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`) === jcIdentifier)
    if (!jobCard) return
    try {
      setLoading(true)
      await productionService.updateJobCard(jobCard.jc_id || jobCard.id, {
        completed_quantity: jobCard.completed_quantity || jobCard.actual_qty || 0,
        workstation_type: jobCard.workstation_type || jobCard.workstation || '',
        status: jobCard.status || 'pending'
      })
      setSuccess('Job card saved')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) { console.error('Failed to save job card:', err) }
    finally { setLoading(false) }
  }

  const populateWorkstationsForJobCards = async (cardsToUpdate, opsToUse) => {
    if (!cardsToUpdate?.length || !opsToUse?.length) return
    try {
      const updatedCards = cardsToUpdate.map(jc => {
        const op = opsToUse.find(o => o.operation_name === (jc.operation_name || jc.operation))
        if (op?.workstation && !jc.workstation_type && !jc.workstation) {
          return { ...jc, workstation_type: op.workstation, workstation: op.workstation }
        }
        return jc
      })
      const hasChanges = updatedCards.some((card, idx) => card.workstation_type !== cardsToUpdate[idx].workstation_type)
      if (hasChanges) {
        setJobCards(updatedCards)
        for (const card of updatedCards) {
          if ((card.workstation_type || card.workstation) && (card.jc_id || card.id)) {
            await productionService.updateJobCard(card.jc_id || card.id, { workstation_type: card.workstation_type || card.workstation })
          }
        }
      }
    } catch (err) { console.error('Failed to populate workstations:', err) }
  }

  const createJobCardsFromOperations = async (quiet = false) => {
    if (!id) {
      if (!quiet) setError('Please save the work order first before generating job cards')
      return
    }
    if (!quiet) setLoading(true)
    try {
      const response = await productionService.generateJobCardsForWorkOrder(id)
      if (response.success) {
        if (!quiet) setSuccess('Job cards generated successfully')
        await fetchJobCards(id)
      } else {
        if (!quiet) setError(response.message || 'Failed to generate job cards')
      }
    } catch (err) {
      if (!quiet) setError(`Error generating job cards: ${err.message}`)
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.item_to_manufacture) {
      setError('Please fill required fields (Item)')
      return
    }
    setLoading(true)
    try {
      const payload = {
        item_code: formData.item_to_manufacture,
        bom_no: formData.bom_id,
        quantity: parseFloat(formData.qty_to_manufacture),
        priority: formData.priority,
        notes: formData.notes,
        planned_start_date: formData.planned_start_date,
        planned_end_date: formData.planned_end_date,
        sales_order_id: formData.sales_order_id,
        required_items: bomMaterials.map(mat => ({
          item_code: mat.item_code,
          source_warehouse: mat.source_warehouse || 'Stores - NC',
          required_qty: mat.required_qty
        })),
        operations: bomOperations.map(op => ({
          operation_name: op.operation_name,
          workstation_type: op.workstation,
          operation_time: op.operation_time,
          operating_cost: op.operating_cost,
          operation_type: op.operation_type,
          hourly_rate: op.hourly_rate
        }))
      }
      const response = id ? await productionService.updateWorkOrder(id, payload) : await productionService.createWorkOrder(payload)
      if (response.success) {
        // Automatically generate job cards if it's a new work order
        // Note: Backend now handles this automatically in createWorkOrderRecursive
        /*
        if (!id) {
          const newWoId = response.data?.wo_id || response.wo_id
          if (newWoId) {
            console.log(`Automatically generating job cards for Work Order: ${newWoId}`)
            try {
              await productionService.generateJobCardsForWorkOrder(newWoId)
            } catch (jcErr) {
              console.warn('Failed to auto-generate job cards:', jcErr)
            }
          }
        }
        */
        setSuccess(`Work order ${id ? 'updated' : 'created'}`)
        setTimeout(() => navigate('/manufacturing/work-orders'), 1500)
      } else { setError(response.message || 'Save failed') }
    } catch (err) { setError(`Failed: ${err.message}`) }
    finally { setLoading(false) }
  }

  const getWorkstationName = (id) => {
    const ws = workstations.find(w => w.workstation_id === id || w.id === id || w.name === id)
    return ws ? (ws.workstation_name || ws.name) : (id || '-')
  }

  const getPriorityColor = (p) => {
    if (p === 'high') return 'bg-rose-50 text-rose-600 border-rose-100'
    if (p === 'medium') return 'bg-amber-50 text-amber-600 border-amber-100'
    return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  }

  const getStatusColor = (s) => {
    const status = (s || 'draft').toLowerCase()
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (status === 'in-progress') return 'bg-indigo-50 text-indigo-700 border-indigo-100'
    if (status === 'planned') return 'bg-blue-50 text-blue-700 border-blue-100'
    return 'bg-slate-50 text-slate-600 border-slate-200'
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 pb-20">

      <div className="sticky top-0 z-40 bg-white/80 ">
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 rounded shadow-lg shadow-indigo-200">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg  text-slate-900 ">
                  {id ? (isReadOnly ? 'Work Order Record' : 'Edit Work Order') : 'Create Manufacturing Order'}
                </h1>
                <span className={`p-2 rounded  text-xs border ${getStatusColor(formData.status)}`}>
                  {formData.status}
                </span>
              </div>
              <p className="text-xs   text-slate-400 text-xs">
                {id || 'DRAFT-NEW'} • {new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manufacturing/work-orders')}
              className="p-2 text-xs  text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-all"
            >
              Close
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 p-2 bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50  hover:shadow-lg hover:-translate-y-0.5 transition-all text-xs "
              >
                {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {id ? 'Update Order' : 'Release to Production'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="sticky top-[80px] z-30 bg-white/80  border border-slate-200/60 rounded p-2  mt-4 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <NavItem
            label="01 Foundation"
            icon={Settings}
            section="foundation"
            isActive={activeSection === 'foundation'}
            onClick={scrollToSection}
            themeColor="indigo"
          />
          <NavItem
            label="02 Timeline"
            icon={Calendar}
            section="timeline"
            isActive={activeSection === 'timeline'}
            onClick={scrollToSection}
            themeColor="blue"
          />
          <NavItem
            label="03 Operations"
            icon={Layers}
            section="operations"
            isActive={activeSection === 'operations'}
            onClick={scrollToSection}
            themeColor="emerald"
          />
          <NavItem
            label="04 Inventory"
            icon={Boxes}
            section="inventory"
            isActive={activeSection === 'inventory'}
            onClick={scrollToSection}
            themeColor="amber"
          />
          <NavItem
            label="05 Daily Report"
            icon={FileText}
            section="daily-report"
            isActive={activeSection === 'daily-report'}
            onClick={scrollToSection}
            themeColor="cyan"
          />
        </div>

        <div className="hidden lg:flex items-center gap-4 bg-slate-900 p-2 rounded shadow-xl shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-widest text-slate-400  mb-1">
              <span className="opacity-60 ">Execution Pulse</span>
              <span className="text-indigo-400 ml-2">{((completionMetrics.totalCompleted / (formData.qty_to_manufacture || 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-24 bg-white/10 rounded-full h-1 overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                style={{ width: `${Math.min(100, (completionMetrics.totalCompleted / (formData.qty_to_manufacture || 1)) * 100)}%` }}
              />
            </div>
          </div>
          <TrendingUp size={14} className="text-indigo-400" />
        </div>
      </div>

      <div className=" p-2">

        <div className="grid grid-cols-1 gap-4 mb-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              <p className="text-xs  text-rose-800">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <p className="text-xs  text-emerald-800">{success}</p>
            </div>
          )}
        </div>

        <div className=" min-w-0">
          {/* 01 Foundation Section */}
          <div id="foundation" className="block">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-12">
                <Card className="p-2 bg-white border-none overflow-visible">
                  <SectionTitle title="01 Foundation Setup" icon={Settings} />
                  <div className="grid grid-cols-3 md:grid-cols-3 gap-3 mt-2">
                    <FieldWrapper label="Target Item to Manufacture" required>
                      <SearchableSelect
                        value={formData.item_to_manufacture}
                        onChange={handleItemSelect}
                        options={items.map(item => ({ value: item.item_code, label: `${item.name || item.item_name || 'No Name'} [${item.item_code}]` }))}
                        placeholder="Search Products..."
                        isDisabled={isReadOnly || (id && !isEditMode)}
                      />
                    </FieldWrapper>

                    <FieldWrapper label="Bill of Materials (BOM)">
                      <SearchableSelect
                        value={formData.bom_id}
                        onChange={(val) => handleInputChange({ target: { name: 'bom_id', value: val } })}
                        options={availableBoms.map(bom => ({ value: bom.bom_id || bom.name, label: bom.bom_id || bom.name }))}
                        placeholder="Select BOM..."
                        isDisabled={isReadOnly || (id && !isEditMode)}
                      />
                    </FieldWrapper>

                    <div className="grid grid-cols-2 gap-4">
                      <FieldWrapper label="Quantity to Produce" required>
                        <div className="relative">
                          <input
                            type="number"
                            name="qty_to_manufacture"
                            value={formData.qty_to_manufacture}
                            onChange={handleInputChange}
                            disabled={isReadOnly || (id && !isEditMode)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all "
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px]  text-slate-400">UNIT</span>
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Priority Level">
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          disabled={isReadOnly || (id && !isEditMode)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                      </FieldWrapper>
                    </div>

                    <FieldWrapper label="Sales Order Reference">
                      <div className="relative">
                        <input
                          type="text"
                          name="sales_order_id"
                          value={formData.sales_order_id}
                          onChange={handleInputChange}
                          disabled={isReadOnly || (id && !isEditMode)}
                          placeholder="SO-REFERENCE"
                          className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none font-mono"
                        />
                        <Database size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </FieldWrapper>
                  </div>
                </Card>
              </div>


            </div>
          </div>

          {/* 02 Timeline Section */}
          <div id="timeline" className="block">
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 lg:col-span-12">
                <Card className="p-2 bg-white border-none">
                  <SectionTitle title="02 Production Timeline" icon={Calendar} />
                  <div className="grid grid-cols-12 gap-3">
                    <div className='col-span-4'>
                      <FieldWrapper label="Planned Start Date" required>
                        <div className="relative">
                          <input
                            type="date"
                            name="planned_start_date"
                            value={formData.planned_start_date}
                            onChange={handleInputChange}
                            disabled={isReadOnly || (id && !isEditMode)}
                            className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium"
                          />
                          <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </FieldWrapper>
                    </div>

                    <div className='col-span-4'>
                      <FieldWrapper label="Planned Completion Date" required>
                        <div className="relative">
                          <input
                            type="date"
                            name="planned_end_date"
                            value={formData.planned_end_date}
                            onChange={handleInputChange}
                            disabled={isReadOnly || (id && !isEditMode)}
                            className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-medium"
                          />
                          <Clock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                      </FieldWrapper>
                    </div>

                    <div className="col-span-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs  text-slate-400 ">Delivery Commitment</span>
                        <div className="p-1 bg-amber-50 text-amber-600 rounded text-[10px]  border border-amber-100">Parget</div>
                      </div>
                      <p className="text-xs  text-slate-900">{formData.expected_delivery_date || 'Pending Schedule'}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="col-span-12">
                <div className="grid grid-cols-12 gap-3 mt-2 h-full">
                  <div className="p-2 rounded col-span-6  bg-white border border-slate-200   flex flex-col">
                    <div className="flex items-center gap-3  text-emerald-600">
                      <div className="p-2 bg-emerald-50 rounded">
                        <Activity size={18} />
                      </div>
                      <h4 className="text-xs  ">Efficiency Projection</h4>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-xl  text-slate-900 mb-1">{completionMetrics.efficiency}%</div>
                      <p className="text-xs text-slate-500 font-medium">Predicted production efficiency based on workstation load.</p>
                    </div>
                  </div>

                  <div className="p-2 rounded col-span-6  bg-slate-900 text-white shadow  flex flex-col">
                    <div className="flex items-center gap-3 text-amber-400">
                      <div className="p-2 bg-white/5 rounded border border-white/10">
                        <Clock size={18} />
                      </div>
                      <h4 className="text-xs  ">Time Expenditure</h4>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="text-xl  text-white mb-1">{(completionMetrics.totalActualTime / 60).toFixed(1)}h</div>
                      <p className="text-xs text-slate-400 font-medium text-xs">Cumulative machine hours logged against this order.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 03 Operations Section */}
          <div id="operations" className="block mt-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-9 ">
                <Card className="border-none bg-white ">
                  <div className="p-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white text-indigo-600 rounded border border-slate-100  ">
                        <Layers size={16} />
                      </div>
                      <h3 className="text-xs  text-slate-900  ">03 Operation Sequence</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {jobCards.length > 0 && (
                        <button
                          onClick={() => fetchJobCards(id)}
                          className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors border border-indigo-100"
                        >
                          <Activity size={12} className={loading ? 'animate-spin' : ''} />
                          Sync Progress
                        </button>
                      )}
                      {jobCards.length > 0 && (
                        <div className="flex items-center gap-2 p-2  py-1 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-100">
                          <Activity size={12} className="animate-pulse" />
                          <span className="text-xs ">{jobCards.length} Tasks active</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {jobCards.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left bg-white">
                        <thead>
                          <tr className="bg-slate-50/30">
                            <th className="p-2  text-xs  text-slate-400  ">Phase</th>
                            <th className="p-2  text-xs  text-slate-400  ">Workstation</th>
                            <th className="p-2  text-xs  text-slate-400  text-center">Status</th>
                            <th className="p-2  text-xs  text-slate-400  text-right">Time & Cost</th>
                            <th className="p-2  text-xs  text-slate-400  text-right">Progress</th>
                            {!isReadOnly && <th className="p-2  w-10"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {jobCards.map((jc, idx) => {
                            const jcId = jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`
                            const isEditing = editingJobCardId === jcId
                            return (
                              <tr key={jcId} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="p-2 ">
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs ">
                                      0{idx + 1}
                                    </span>
                                    <div>
                                      <p className="text-xs  text-slate-900">{jc.operation_name || jc.operation}</p>
                                      <p className="text-xs text-slate-400 font-medium text-xs">Sequence Point</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-2 ">
                                  {isEditing ? (
                                    <SearchableSelect
                                      value={jc.workstation_type || jc.workstation || ''}
                                      onChange={(v) => updateJobCard(jcId, 'workstation_type', v)}
                                      options={workstations.map(ws => ({ value: ws.workstation_id || ws.id, label: ws.workstation_name || ws.name }))}
                                      placeholder="Select Workstation..."
                                    />
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
                                      <span className="text-xs font-medium text-slate-600">{getWorkstationName(jc.workstation_type || jc.workstation)}</span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 ">
                                  <div className="flex justify-center">
                                    <span className={`p-2  py-1 rounded-full text-xs  border   ${getStatusColor(jc.status)}`}>
                                      {(jc.status || 'pending').toUpperCase()}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2  text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-xs text-slate-900 font-medium">{jc.operation_time || 0}m</span>
                                    <span className="text-[10px] text-slate-400">₹{parseFloat(jc.operating_cost || 0).toLocaleString()}</span>
                                  </div>
                                </td>
                                <td className="p-2  text-right">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs  text-slate-900">
                                      {jc.completed_quantity || 0} <span className="text-slate-400 font-medium text-xs">/ {jc.planned_quantity}</span>
                                    </span>
                                    <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden">
                                      <div
                                        className="bg-indigo-500 h-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, ((jc.completed_quantity || 0) / jc.planned_quantity) * 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                {!isReadOnly && (
                                  <td className="p-2 ">
                                    {isEditing ? (
                                      <button onClick={() => { saveJobCard(jcId); setEditingJobCardId(null) }} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                                        <Save size={14} />
                                      </button>
                                    ) : (
                                      <button onClick={() => setEditingJobCardId(jcId)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded  transition-all">
                                        <Edit2 size={14} />
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : bomOperations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <div className="p-2 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs flex items-center gap-2">
                        <Info size={14} />
                        Planned operations from BOM. Generate job cards to start production.
                      </div>
                      <table className="w-full text-left bg-white">
                        <thead>
                          <tr className="bg-slate-50/30">
                            <th className="p-2 text-xs text-slate-400">Operation</th>
                            <th className="p-2 text-xs text-slate-400">Workstation</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Time (Mins)</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bomOperations.map((op, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-2 text-xs text-slate-900">{op.operation_name}</td>
                              <td className="p-2 text-xs text-slate-600">{getWorkstationName(op.workstation)}</td>
                              <td className="p-2 text-xs text-slate-900 text-right">{op.operation_time}</td>
                              <td className="p-2 text-xs text-slate-900 text-right">{op.operating_cost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!isReadOnly && (
                        <div className="p-4 flex justify-center border-t border-slate-100">
                          <button
                            onClick={createJobCardsFromOperations}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs shadow-lg shadow-indigo-100"
                          >
                            <Zap size={14} />
                            Generate Job Cards
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 text-center">
                      <div className="w-8 h-8 bg-slate-50 text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                        <Activity size={16} />
                      </div>
                      <h4 className="text-sm  text-slate-900 mb-2 ">Production Logic Not Found</h4>
                      <p className="text-xs text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
                        Release job cards or link a BOM to define the manufacturing operations for this order.
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-3 space-y-6">
                <Card className="bg-slate-900 border-none shadow  overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BarChart3 size={100} className="text-white" />
                  </div>
                  <div className="p-2 relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                        <TrendingUp size={18} />
                      </div>
                      <h3 className="text-xs  text-white  ">Execution Health</h3>
                    </div>
                    <div className="">
                      <div>
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-xs  text-slate-400  ">Completion Rate</span>
                          <span className="text-xl   text-white">
                            {((completionMetrics.totalCompleted / (formData.qty_to_manufacture || 1)) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                            style={{ width: `${Math.min(100, (completionMetrics.totalCompleted / (formData.qty_to_manufacture || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid mt-2 grid-cols-2 gap-2">
                        <div className="bg-white/5 p-2 rounded  border border-white/10 hover:bg-white/[0.08] transition-colors group/card">
                          <p className="text-[10px] text-slate-500 mb-1 group-hover/card:text-indigo-400 transition-colors">Yield</p>
                          <p className="text-sm font-semibold text-white">{completionMetrics.qualityScore}%</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded  border border-white/10 hover:bg-white/[0.08] transition-colors group/card">
                          <p className="text-[10px] text-slate-500 mb-1 group-hover/card:text-amber-400 transition-colors">Actual Hrs</p>
                          <p className="text-sm font-semibold text-white">{(completionMetrics.totalActualTime / 60).toFixed(1)}h</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded  border border-white/10 hover:bg-white/[0.08] transition-colors group/card">
                          <p className="text-[10px] text-slate-500 mb-1 group-hover/card:text-rose-400 transition-colors">Scrap Rate</p>
                          <p className="text-sm font-semibold text-white">{completionMetrics.scrapRate}%</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded  border border-white/10 hover:bg-white/[0.08] transition-colors group/card">
                          <p className="text-[10px] text-slate-500 mb-1 group-hover/card:text-emerald-400 transition-colors">Efficiency</p>
                          <p className="text-sm font-semibold text-white">{completionMetrics.efficiency}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>


              </div>
            </div>
          </div>

          {/* 04 Inventory Section */}
          <div id="inventory" className="block mt-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12 lg:col-span-9">
                <Card className="border-none bg-white">
                  <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white text-emerald-600 rounded border border-slate-100  ">
                        <Boxes size={16} />
                      </div>
                      <h3 className="text-xs  text-slate-900  ">04 Required Inventory</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 transition-all bg-white rounded border border-slate-100  ">
                        <Filter size={14} />
                      </button>
                    </div>
                  </div>

                  {bomMaterials.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left bg-white">
                        <thead>
                          <tr className="bg-slate-50/30">
                            <th className="p-2  text-xs  text-slate-400  ">Raw Material</th>
                            <th className="p-2  text-xs  text-slate-400  text-right">Required</th>
                            <th className="p-2  text-xs  text-slate-400  text-right">Transferred</th>
                            <th className="p-2  text-xs  text-slate-400  text-right">Consumed</th>
                            <th className="p-2  text-xs  text-slate-400  text-right">Yield Loss</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bomMaterials.map((mat) => {
                            const loss = Math.max(0, (parseFloat(mat.transferred_qty) || 0) - (parseFloat(mat.consumed_qty) || 0) - (parseFloat(mat.returned_qty) || 0))
                            const isShortage = (parseFloat(mat.transferred_qty) || 0) < (parseFloat(mat.required_qty) || 0)

                            return (
                              <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-2 ">
                                  <div className="flex flex-col">
                                    <span className="text-xs  text-slate-900">{mat.item_code}</span>
                                    <span className="text-xs text-slate-400 font-medium text-xs truncate max-w-[240px]">{mat.item_name || mat.description}</span>
                                  </div>
                                </td>
                                <td className="p-2  text-right">
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs  text-slate-900">{mat.required_qty}</span>
                                    <span className="text-[9px]  text-slate-400 ">{mat.uom}</span>
                                  </div>
                                </td>
                                <td className="p-2  text-right">
                                  <div className="relative inline-block">
                                    <input
                                      type="number"
                                      value={mat.transferred_qty || 0}
                                      onChange={(e) => updateMaterial(mat.id, 'transferred_qty', parseFloat(e.target.value) || 0)}
                                      disabled={isReadOnly}
                                      className={`w-24 p-2  py-1.5 rounded text-right text-xs  outline-none border transition-all ${isShortage ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
                                        }`}
                                    />
                                    {isShortage && (
                                      <div className="absolute -top-2 -right-2">
                                        <AlertCircle size={12} className="text-amber-500 fill-white" />
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2  text-right">
                                  <input
                                    type="number"
                                    value={mat.consumed_qty || 0}
                                    onChange={(e) => updateMaterial(mat.id, 'consumed_qty', parseFloat(e.target.value) || 0)}
                                    disabled={isReadOnly}
                                    className="w-24 p-2  py-1.5 bg-emerald-50 border border-emerald-100 rounded text-right text-xs  text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  />
                                </td>
                                <td className="p-2  text-right">
                                  <span className={`text-xs  ${loss > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {loss > 0 ? `-${loss.toFixed(2)}` : '0.00'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-2 text-center bg-slate-50/10">
                      <div className="w-8 h-8 bg-white border border-slate-100 text-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6  ">
                        <Boxes size={16} />
                      </div>
                      <h4 className="text-sm  text-slate-900 mb-2">Stock Requirements Empty</h4>
                      <p className="text-xs text-slate-500 font-medium max-w-[280px] mx-auto leading-relaxed">
                        Associate a Bill of Materials (BOM) to generate the required material consumption list.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
              <Card className="p-2 border-none  col-span-12 lg:col-span-3 space-y-6 ">
                <SectionTitle title="Operational Panel" icon={Zap} />
                <div className="space-y-3">
                  <button
                    onClick={handleSubmit}
                    disabled={loading || isReadOnly}
                    className="w-full flex items-center justify-between p-2  bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 rounded  border border-indigo-100 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Save size={16} />
                      <span className="text-xs  ">Commit Progress</span>
                    </div>
                    <ArrowRight size={14} className=" group-hover:translate-x-1 transition-all" />
                  </button>

                  <button
                    onClick={createJobCardsFromOperations}
                    disabled={loading || jobCards.length > 0 || isReadOnly}
                    className="w-full flex items-center justify-between p-2  bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 rounded  transition-all group shadow-lg shadow-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <Layers size={16} />
                      <span className="text-xs  ">Release job cards</span>
                    </div>
                    <Zap size={14} className="text-amber-400" />
                  </button>

                  {isReadOnly && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded text-center">
                      <p className="text-xs text-slate-500 font-medium">Read-only Mode</p>
                      <p className="text-[10px] text-slate-400 mt-1">Actions are disabled in view mode</p>
                    </div>
                  )}
                </div>
              </Card>
              <div className="col-span-12 lg:col-span-6 space-y-6">
                <div className="p-2 rounded bg-indigo-600 text-white shadow  shadow-indigo-100 relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <Database size={160} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2  text-indigo-100">
                      <ShieldCheck size={20} />
                      <h4 className="text-xs text-white  ">Inventory Advisory</h4>
                    </div>
                    <p className="text-xs text-indigo-50 font-medium leading-relaxed mb-3">
                      System tracks real-time material transfers. Ensure all raw materials are transferred from "Stores" to "Production" before consumption.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs   text-indigo-200">
                        <span>Transfer Status</span>
                        <span>{((bomMaterials.filter(m => (m.transferred_qty || 0) >= (m.required_qty || 0)).length / (bomMaterials.length || 1)) * 100).toFixed(0)}%</span>
                      </div>
                      <div className=" bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-1000"
                          style={{ width: `${(bomMaterials.filter(m => (m.transferred_qty || 0) >= (m.required_qty || 0)).length / (bomMaterials.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

               
              </div>
              <div className='col-span-12 lg:col-span-6 space-y-6'>
                 <div className="p-2 rounded bg-white border border-slate-200   relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
                    <Info size={80} className="text-slate-900" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 text-slate-900">
                      <Info size={16} />
                      <h4 className="text-xs  ">Yield Note</h4>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Yield loss is automatically calculated as the delta between transferred and consumed quantities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 05 Daily Report Section */}
          <div id="daily-report" className="block mt-4">
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-12">
                <Card className="border-none bg-white">
                  <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-white text-cyan-600 rounded border border-slate-100">
                        <FileText size={16} />
                      </div>
                      <h3 className="text-xs text-slate-900">05 Daily Production History</h3>
                    </div>
                    <button
                      onClick={downloadReport}
                      className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs font-medium shadow-sm"
                    >
                      <FileText size={14} />
                      Export CSV
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white">
                      <thead>
                        <tr className="bg-slate-50/30">
                          <th className="p-2 text-xs text-slate-400">Date</th>
                          <th className="p-2 text-xs text-slate-400">Shift</th>
                          <th className="p-2 text-xs text-slate-400">Operator</th>
                          <th className="p-2 text-xs text-slate-400 text-right">Produced</th>
                          <th className="p-2 text-xs text-slate-400 text-right">Accepted</th>
                          <th className="p-2 text-xs text-slate-400 text-right">Rejected</th>
                          <th className="p-2 text-xs text-slate-400 text-right">Scrap</th>
                          <th className="p-2 text-xs text-slate-400 text-right">Downtime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {generateDailyReport().length > 0 ? (
                          generateDailyReport().map((row, idx) => (
                            <tr key={`${row.date}-${row.shift}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-2 text-xs text-slate-900 font-medium">{row.date}</td>
                              <td className="p-2 text-xs text-slate-600">Shift {row.shift}</td>
                              <td className="p-2 text-xs text-slate-600">{row.operator || 'N/A'}</td>
                              <td className="p-2 text-xs text-slate-900 text-right">{row.produced.toFixed(2)}</td>
                              <td className="p-2 text-xs text-emerald-600 text-right font-medium">{row.accepted.toFixed(2)}</td>
                              <td className="p-2 text-xs text-rose-500 text-right">{row.rejected.toFixed(2)}</td>
                              <td className="p-2 text-xs text-amber-600 text-right">{row.scrap.toFixed(2)}</td>
                              <td className="p-2 text-xs text-slate-500 text-right">{row.downtime} min</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">
                              No production logs found for this work order yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
