import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Plus, Trash2, AlertCircle, CheckCircle, Package, Factory, Boxes, Edit2, BarChart3, ChevronRight } from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import * as productionService from '../../services/productionService'
import api from '../../services/api'

export default function WorkOrderForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const searchParams = new URLSearchParams(window.location.search)
  const isReadOnly = searchParams.get('readonly') === 'true'
  const prefillItem = searchParams.get('item_to_manufacture')
  const prefillItemName = searchParams.get('item_name')
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
  const [editingMaterialId, setEditingMaterialId] = useState(null)
  const [editingOperationId, setEditingOperationId] = useState(null)
  const [workstations, setWorkstations] = useState([])

  const [productionStages, setProductionStages] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingJobCardId, setEditingJobCardId] = useState(null)
  const [modifiedJobCards, setModifiedJobCards] = useState({})
  const [completionMetrics, setCompletionMetrics] = useState({
    totalPlanned: 0,
    totalCompleted: 0,
    allCompleted: false,
    firstTimeLogDate: null,
    lastTimeLogDate: null,
    totalActualTime: 0,
    expectedTime: 0,
    efficiency: 0,
    qualityScore: 0
  })
  
  const [formData, setFormData] = useState({
    work_order_id: '',
    naming_series: 'MFG-WO-.YYYY.-',
    company: '',
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
    if (jobCards.length > 0) {
      calculateCompletionMetrics(jobCards)
      if (bomOperations.length > 0) {
        populateWorkstationsForJobCards(jobCards, bomOperations)
      }
    }
  }, [jobCards.length, bomOperations.length])

  useEffect(() => {
    if (formData.sales_order_id && formData.bom_id && jobCards.length > 0 && bomOperations.length > 0) {
      console.log('Auto-populating workstations from Sales Order and BOM')
      populateWorkstationsForJobCards(jobCards, bomOperations)
    }
  }, [formData.sales_order_id, formData.bom_id])

  const fetchProductionStages = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/production-stages/active`)
      if (response.data.success) {
        setProductionStages(response.data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch production stages:', err)
    }
  }

  const fetchWorkstations = async () => {
    try {
      const response = await productionService.getWorkstationsList()
      const allWorkstations = response.data || []
      setWorkstations(allWorkstations)
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchProductionPlanData = async (planId) => {
    try {
      const response = await api.get(`/production-planning/${planId}`)
      const planData = response.data?.data || response.data
      
      console.log('Production plan data fetched:', planData)
      
      if (planData) {
        let bomId = planData.bom_id || ''
        
        if (!bomId && planData.raw_materials && planData.raw_materials.length > 0) {
          bomId = planData.raw_materials[0].bom_no || ''
        }
        
        if (!bomId && planData.fg_items && planData.fg_items.length > 0) {
          bomId = planData.fg_items[0].bom_no || ''
        }
        
        if (bomId) {
          setFormData(prev => ({
            ...prev,
            bom_id: bomId
          }))
          console.log('BOM ID set from production plan:', bomId)
          await fetchBOMDetails(bomId)
        }
      }
    } catch (err) {
      console.error('Failed to fetch production plan data:', err)
    }
  }

  const fetchJobCards = async (workOrderId) => {
    try {
      const response = await productionService.getJobCards({ work_order_id: workOrderId })
      setJobCards(response.data || [])
      await calculateCompletionMetrics(response.data || [])
    } catch (err) {
      console.error('Failed to fetch job cards:', err)
    }
  }

  const calculateCompletionMetrics = async (cards) => {
    try {
      const totalPlanned = cards.reduce((sum, jc) => sum + (parseFloat(jc.planned_quantity) || 0), 0)
      const totalCompleted = cards.reduce((sum, jc) => sum + (parseFloat(jc.completed_quantity) || jc.actual_qty || 0), 0)
      const allCompleted = cards.length > 0 && cards.every(jc => (jc.status || '').toLowerCase() === 'completed')
      
      let firstTimeLogDate = null
      let lastTimeLogDate = null
      let totalActualTime = 0
      let totalAccepted = 0
      
      for (const jc of cards) {
        try {
          const timeLogs = await productionService.getTimeLogs({ job_card_id: jc.job_card_id || jc.id })
          const logs = timeLogs.data || []
          
          if (logs.length > 0) {
            const dates = logs.map(log => new Date(log.created_at || log.date)).filter(d => !isNaN(d))
            if (dates.length > 0) {
              const minDate = new Date(Math.min(...dates))
              const maxDate = new Date(Math.max(...dates))
              
              if (!firstTimeLogDate || minDate < firstTimeLogDate) {
                firstTimeLogDate = minDate
              }
              if (!lastTimeLogDate || maxDate > lastTimeLogDate) {
                lastTimeLogDate = maxDate
              }
            }
            
            logs.forEach(log => {
              if (log.from_time && log.to_time) {
                totalActualTime += log.time_in_minutes || 0
              }
              totalAccepted += parseFloat(log.accepted_qty) || 0
            })
          }
        } catch (err) {
          console.error('Failed to fetch time logs for job card:', jc.job_card_id || jc.id)
        }
      }
      
      const expectedTime = (bomOperations || []).reduce((sum, op) => sum + (parseFloat(op.operation_time) || 0), 0) * 60
      const efficiency = expectedTime > 0 ? ((expectedTime / totalActualTime) * 100).toFixed(0) : 0
      const qualityScore = totalCompleted > 0 ? ((totalAccepted / totalCompleted) * 100).toFixed(1) : 0
      
      setCompletionMetrics({
        totalPlanned,
        totalCompleted,
        allCompleted,
        firstTimeLogDate,
        lastTimeLogDate,
        totalActualTime,
        expectedTime,
        efficiency,
        qualityScore
      })
      
      if (allCompleted && firstTimeLogDate && lastTimeLogDate) {
        setFormData(prev => ({
          ...prev,
          actual_start_date: firstTimeLogDate.toISOString().split('T')[0],
          actual_end_date: lastTimeLogDate.toISOString().split('T')[0],
          status: 'completed'
        }))
      }
    } catch (err) {
      console.error('Failed to calculate completion metrics:', err)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await productionService.getItems()
      const allItems = response.data || []
      
      const finishedGoodItems = allItems.filter(item => 
        item.item_group === 'Finished Good' || 
        item.item_group === 'Finished Goods' ||
        item.fg_sub_assembly === 'FG' ||
        item.item_group === 'Sub Assembly' ||
        item.item_group === 'Sub Assemblies' ||
        item.fg_sub_assembly === 'SA'
      )
      
      console.log(`Filtered ${finishedGoodItems.length} Finished Good items from ${allItems.length} total items`)
      setItems(finishedGoodItems)
    } catch (err) {
      console.error('Failed to fetch items:', err)
      setError('Failed to load items')
    }
  }

  const fetchWorkOrderDetails = async (workOrderId) => {
    try {
      setLoading(true)
      const response = await productionService.getWorkOrder(workOrderId)
      const woData = response.data || response
      
      console.log('Fetched Work Order Data:', woData)
      
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
      
      if (woData.bom_id || woData.bom_no) {
        await fetchBOMDetails(woData.bom_id || woData.bom_no)
      }
      
      setError(null)
    } catch (err) {
      console.error('Failed to fetch work order:', err)
      setError(`Failed to load work order: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchBOMDetails = async (bomId) => {
    if (!bomId || bomId.trim() === '') {
      setBomOperations([])
      setBomMaterials([])
      return
    }

    try {
      setLoading(true)
      const response = await productionService.getBOMDetails(bomId)
      const bomData = response.data || response

      console.log('BOM Data fetched:', bomData)
      setBomQuantity(bomData.quantity || 1)

      const workOrderQty = parseFloat(formData.qty_to_manufacture) || 1

      const operations = (bomData.operations || []).map((op, idx) => ({
        id: Date.now() + idx,
        operation_name: op.operation_name || op.operation || '',
        workstation: op.workstation || op.workstation_type || '',
        operation_time: op.operation_time || op.time_in_hours || 0,
        operating_cost: op.operating_cost || op.cost || 0
      }))

      const rawMaterials = (bomData.bom_raw_materials || bomData.rawMaterials || []).map((rm, idx) => {
        const baseQty = rm.qty || rm.quantity || 0
        const multipliedQty = baseQty * workOrderQty
        return {
          id: Date.now() + idx,
          item_code: rm.item_code || '',
          item_name: rm.item_name || rm.description || '',
          quantity: multipliedQty,
          uom: rm.uom || '',
          required_qty: multipliedQty,
          source_warehouse: rm.source_warehouse || '',
          issued_qty: 0,
          consumed_qty: 0
        }
      })

      setBomOperations(operations)
      setBomMaterials(rawMaterials)
      setError(null)

      if (jobCards.length > 0 && operations.length > 0) {
        setTimeout(() => {
          populateWorkstationsForJobCards(jobCards, operations)
        }, 100)
      }
    } catch (err) {
      console.error('Failed to fetch BOM details:', err)
      setError(`Failed to fetch BOM ${bomId}: ${err.message}`)
      setBomOperations([])
      setBomMaterials([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = async (e) => {
    if (isReadOnly) return
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)

    if (name === 'bom_id' && value) {
      fetchBOMDetails(value)
    }

    if (name === 'sales_order_id' && value) {
      await fetchBOMFromSalesOrder(value)
    }
  }

  const fetchBOMFromSalesOrder = async (salesOrderId) => {
    if (!salesOrderId || salesOrderId.trim() === '') {
      setFormData(prev => ({
        ...prev,
        bom_id: ''
      }))
      setBomOperations([])
      setBomMaterials([])
      return
    }

    setLoading(true)
    try {
      console.log('Fetching BOM for Sales Order:', salesOrderId)
      
      const response = await api.get(`/selling/sales-orders/${salesOrderId}`)
      const soData = response.data?.data || response.data
      
      console.log('Sales Order data:', soData)

      const bomId = soData.bom_id || ''
      
      console.log('BOM ID from Sales Order:', bomId)

      if (bomId) {
        setFormData(prev => ({
          ...prev,
          bom_id: bomId
        }))
        await fetchBOMDetails(bomId)
        
        if (jobCards.length > 0) {
          setTimeout(() => {
            setSuccess(`BOM ${bomId} auto-fetched from Sales Order ${salesOrderId} - Workstations updated for job cards`)
          }, 200)
        } else {
          setSuccess(`BOM ${bomId} auto-fetched from Sales Order ${salesOrderId}`)
        }
        setTimeout(() => setSuccess(null), 3000)
      } else {
        console.log('No BOM ID found in Sales Order')
        setError(`Sales Order ${salesOrderId} has no BOM ID. Please enter BOM ID manually.`)
        setFormData(prev => ({
          ...prev,
          bom_id: ''
        }))
      }
    } catch (err) {
      console.error('Error fetching Sales Order:', err)
      setError(`Failed to fetch Sales Order ${salesOrderId}`)
      setFormData(prev => ({
        ...prev,
        bom_id: ''
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleItemSelect = async (itemCode) => {
    setFormData(prev => ({
      ...prev,
      item_to_manufacture: itemCode
    }))
    setError(null)
    setAvailableBoms([])

    if (!itemCode) {
      setFormData(prev => ({
        ...prev,
        sales_order_id: '',
        bom_id: ''
      }))
      setBomOperations([])
      setBomMaterials([])
      return
    }

    setLoading(true)
    let fetchedSalesOrderId = ''

    try {
      // Fetch sales order by item code
      try {
        const soResponse = await api.get(`${import.meta.env.VITE_API_URL}/selling/sales-orders/item/${itemCode}`)
        const soData = soResponse.data?.data || soResponse.data
        if (soData && soData.sales_order_id) {
          fetchedSalesOrderId = soData.sales_order_id
          console.log('Sales Order found for item:', fetchedSalesOrderId)
        }
      } catch (err) {
        console.error('Error fetching sales order by item:', err)
      }
      
      // Fetch all BOMs for the item
      let boms = []
      try {
        const bomResponse = await productionService.getBOMs({ item_code: itemCode })
        boms = bomResponse.data || []
        setAvailableBoms(boms)
      } catch (err) {
        console.error('Error fetching BOMs:', err)
      }
      
      console.log('Fetching data for item:', itemCode)
      
      const response = await api.get(`/production-planning/item/${itemCode}`)
      const data = response.data?.data || response.data
      
      console.log('Production plan data fetched:', data)

      if (data) {
        const plan = data
        const fgItem = plan.fg_items?.[0] || {}
        
        console.log('Plan full data:', plan)
        console.log('FG item data:', fgItem)
        
        let bomNo = fgItem.bom_no || plan.bom_id || ''
        
        if (!bomNo && boms.length > 0) {
          bomNo = boms[0].bom_id || boms[0].name || ''
          console.log('BOM fetched by item code:', bomNo)
        }
        
        console.log('Final resolved:', {
          sales_order_id: plan.sales_order_id,
          production_plan_id: plan.plan_id,
          bom_id: bomNo
        })

        const soId = fetchedSalesOrderId || plan.sales_order_id || ''
        setFormData(prev => ({
          ...prev,
          item_to_manufacture: itemCode,
          sales_order_id: soId,
          bom_id: bomNo
        }))

        if (bomNo) {
          await fetchBOMDetails(bomNo)
        }

        setSuccess(`Auto-filled: SO ${soId || 'N/A'} | BOM ${bomNo || 'N/A'}`)
        setTimeout(() => setSuccess(null), 4000)
      } else {
        console.log('No production plan found for item')
        
        let bomNo = ''
        if (boms.length > 0) {
          bomNo = boms[0].bom_id || boms[0].name || ''
        }

        const successMsg = `Item selected: ${itemCode}${fetchedSalesOrderId ? ` (SO: ${fetchedSalesOrderId})` : ''}. ${!fetchedSalesOrderId ? 'No sales order found. ' : ''}${bomNo ? 'BOM auto-selected' : 'Enter BOM ID manually'}`
        setSuccess(successMsg)
        setTimeout(() => setSuccess(null), 4000)
        setFormData(prev => ({
          ...prev,
          sales_order_id: fetchedSalesOrderId,
          bom_id: bomNo
        }))

        if (bomNo) {
          await fetchBOMDetails(bomNo)
        }
      }
    } catch (err) {
      console.error('Error fetching production plan data:', err)
      const successMsg = `Item selected: ${itemCode}${fetchedSalesOrderId ? ` (SO: ${fetchedSalesOrderId})` : ''}. Could not auto-fetch data - enter BOM ID manually`
      setSuccess(successMsg)
      setTimeout(() => setSuccess(null), 4000)
      if (fetchedSalesOrderId) {
        setFormData(prev => ({
          ...prev,
          sales_order_id: fetchedSalesOrderId
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  const updateMaterial = (id, field, value) => {
    setBomMaterials(prev => prev.map(mat => 
      mat.id === id ? { ...mat, [field]: value } : mat
    ))
  }

  const updateOperation = (id, field, value) => {
    setBomOperations(prev => prev.map(op => 
      op.id === id ? { ...op, [field]: value } : op
    ))
  }

  const updateJobCard = (jcIdentifier, field, value) => {
    setJobCards(prev => prev.map((jc, idx) => {
      const uniqueId = jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`
      return uniqueId === jcIdentifier ? { ...jc, [field]: value } : jc
    }))
    setModifiedJobCards(prev => ({
      ...prev,
      [jcIdentifier]: true
    }))
  }

  const saveJobCard = async (jcIdentifier) => {
    const jobCard = jobCards.find((jc, idx) => {
      const uniqueId = jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`
      return uniqueId === jcIdentifier
    })
    if (!jobCard) return

    try {
      setLoading(true)
      const updateData = {
        completed_quantity: jobCard.completed_quantity || jobCard.actual_qty || 0,
        workstation_type: jobCard.workstation_type || jobCard.workstation || '',
        status: jobCard.status || 'pending'
      }
      const apiId = jobCard.jc_id || jobCard.id
      await productionService.updateJobCard(apiId, updateData)
      setModifiedJobCards(prev => {
        const updated = { ...prev }
        delete updated[jcIdentifier]
        return updated
      })
      setSuccess('Job card saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error('Failed to save job card:', err)
      setError('Failed to save job card changes')
    } finally {
      setLoading(false)
    }
  }

  const getWorkstationName = (workstationId) => {
    if (!workstationId) return '-'
    const ws = workstations.find(w => 
      (w.workstation_id || w.id) === workstationId || 
      w.workstation_name === workstationId ||
      w.name === workstationId ||
      w.machine_id === workstationId
    )
    return ws ? (ws.workstation_name || ws.name || ws.machine_id || ws.workstation_id || ws.id || '-') : workstationId
  }

  const moveToNextWorkstation = (jcIdentifier) => {
    const currentJc = jobCards.find((jc, idx) => {
      const uniqueId = jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`
      return uniqueId === jcIdentifier
    })
    if (!currentJc || workstations.length === 0) return

    const currentWsId = currentJc.workstation_type || currentJc.workstation
    const currentIndex = workstations.findIndex(ws => 
      (ws.workstation_id || ws.id) === currentWsId
    )

    if (currentIndex === -1) {
      if (workstations.length > 0) {
        updateJobCard(jcIdentifier, 'workstation_type', workstations[0].workstation_id || workstations[0].id)
      }
    } else if (currentIndex < workstations.length - 1) {
      const nextWs = workstations[currentIndex + 1]
      updateJobCard(jcIdentifier, 'workstation_type', nextWs.workstation_id || nextWs.id)
    }
  }

  const populateWorkstationsForJobCards = async (cardsToUpdate, opsToUse) => {
    if (!cardsToUpdate || cardsToUpdate.length === 0 || !opsToUse || opsToUse.length === 0) {
      console.log('Cannot populate: cardsToUpdate=', cardsToUpdate?.length, 'opsToUse=', opsToUse?.length)
      return
    }

    try {
      console.log('Populating workstations for', cardsToUpdate.length, 'job cards from', opsToUse.length, 'operations')
      
      const updatedCards = cardsToUpdate.map((jc, idx) => {
        const jobOp = jc.operation_name || jc.operation
        const operation = opsToUse.find(op => op.operation_name === jobOp)
        
        if (operation && operation.workstation) {
          if (!jc.workstation_type && !jc.workstation) {
            console.log(`  ✓ Assigning workstation ${operation.workstation} to job card: ${jobOp}`)
            return {
              ...jc,
              workstation_type: operation.workstation,
              workstation: operation.workstation
            }
          }
        } else if (operation) {
          console.log(`  ⚠ No workstation found for operation: ${jobOp}`)
        }
        return jc
      })

      const hasChanges = updatedCards.some((card, idx) => 
        card.workstation_type !== cardsToUpdate[idx].workstation_type || 
        card.workstation !== cardsToUpdate[idx].workstation
      )

      if (hasChanges) {
        console.log('Found workstation changes, saving to database...')
        setJobCards(updatedCards)

        for (const card of updatedCards) {
          if (card.workstation_type || card.workstation) {
            const apiId = card.jc_id || card.id
            if (apiId) {
              await productionService.updateJobCard(apiId, {
                workstation_type: card.workstation_type || card.workstation
              }).catch(err => console.error('Failed to update workstation:', err))
            }
          }
        }
      } else {
        console.log('No workstation changes needed')
      }
    } catch (err) {
      console.error('Failed to populate workstations:', err)
    }
  }

  const createJobCardsFromOperations = async () => {
    if (!id) {
      setError('Please save the work order first before creating job cards')
      return
    }

    if (bomOperations.length === 0) {
      setError('No operations found in BOM')
      return
    }

    setLoading(true)
    try {
      const jobCardsToCreate = bomOperations.map((op, idx) => ({
        work_order_id: id,
        operation_name: op.operation_name,
        workstation_type: op.workstation,
        planned_quantity: formData.qty_to_manufacture,
        sequence: idx + 1
      }))

      const createdCards = []
      for (const jc of jobCardsToCreate) {
        const response = await productionService.createJobCard(jc)
        if (response.success || response.data) {
          createdCards.push(response.data || response)
        }
      }

      setSuccess(`Created ${createdCards.length} job cards successfully`)
      setTimeout(() => setSuccess(null), 3000)
      
      await fetchJobCards(id)
    } catch (err) {
      console.error('Error creating job cards:', err)
      setError(`Failed to create job cards: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.item_to_manufacture) {
      setError('Please select an item to manufacture')
      return
    }
    if (!formData.qty_to_manufacture || formData.qty_to_manufacture <= 0) {
      setError('Please enter a valid quantity')
      return
    }
    if (!formData.bom_id) {
      setError('Please enter a BOM ID')
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
        planned_start_date: formData.planned_start_date ? new Date(formData.planned_start_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        planned_end_date: formData.planned_end_date ? new Date(formData.planned_end_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        actual_start_date: formData.actual_start_date ? new Date(formData.actual_start_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        actual_end_date: formData.actual_end_date ? new Date(formData.actual_end_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        expected_delivery_date: formData.expected_delivery_date ? new Date(formData.expected_delivery_date).toISOString().slice(0, 19).replace('T', ' ') : null,
        sales_order_id: formData.sales_order_id,
        operations: bomOperations.map(op => ({
          operation: op.operation_name,
          workstation: op.workstation,
          time: op.operation_time
        })),
        required_items: bomMaterials.map(mat => ({
          item_code: mat.item_code,
          source_warehouse: mat.source_warehouse || 'Stores - NC',
          required_qty: (mat.required_qty / bomQuantity) * parseFloat(formData.qty_to_manufacture)
        }))
      }

      let response
      if (id) {
        response = await productionService.updateWorkOrder(id, payload)
      } else {
        response = await productionService.createWorkOrder(payload)
      }

      if (response.success) {
        const jobCardMsg = !id && response.jobCardsCreated ? ` + ${response.jobCardsCreated} job card(s) created` : ''
        setSuccess(`Work order ${id ? 'updated' : 'created'} successfully${jobCardMsg}`)
        setTimeout(() => {
          navigate('/manufacturing/work-orders')
        }, 2000)
      } else {
        setError(response.message || 'Failed to save work order')
      }
    } catch (err) {
      console.error('Error saving work order:', err)
      setError(`Failed to save work order: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-3">
      <div className="w-full mx-auto">
        <div className="bg-white rounded-xs shadow">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Factory className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-bold text-gray-900">
                {isReadOnly ? 'View Work Order' : (id ? 'Edit Work Order' : 'Create Work Order')}
              </h1>
              {id && <span className="text-xs text-gray-500 ml-2">{id}</span>}
            </div>
            <button
              onClick={() => navigate('/manufacturing/work-orders')}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-red-900">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs font-medium text-green-900">{success}</p>
              </div>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-gray-600 font-semibold">Item Code</p>
                <p className="text-xs font-bold text-blue-900 mt-1">{formData.item_to_manufacture || 'N/A'}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-xs text-gray-600 font-semibold">Quantity to Produce</p>
                <p className="text-xs font-bold text-green-900 mt-1">{formData.qty_to_manufacture || 1}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <p className="text-xs text-gray-600 font-semibold">Priority</p>
                <p className="text-xs font-bold text-purple-900 mt-1 capitalize">{formData.priority || 'N/A'}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded p-3">
                <p className="text-xs text-gray-600 font-semibold">Status</p>
                <p className="text-xs font-bold text-amber-900 mt-1 capitalize">{formData.status || 'N/A'}</p>
              </div>
            </div>

            {/* Completion Summary - Shows when work order is completed */}
            {completionMetrics.allCompleted && (
              <div className="border-2 border-green-300 rounded-xs p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" />
                  Production Completion Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Total Planned</p>
                    <p className="text-lg font-bold text-blue-600">{completionMetrics.totalPlanned.toFixed(0)}</p>
                    <p className="text-xs text-gray-500 mt-1">units</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-green-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Total Completed</p>
                    <p className="text-lg font-bold text-green-600">{completionMetrics.totalCompleted.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">units</p>
                  </div>
                  <div className={`bg-white p-3 rounded border ${completionMetrics.efficiency >= 100 ? 'border-green-200' : completionMetrics.efficiency >= 80 ? 'border-yellow-200' : 'border-red-200'}`}>
                    <p className="text-xs text-gray-600 font-semibold mb-1">⚡ Efficiency</p>
                    <p className={`text-lg font-bold ${completionMetrics.efficiency >= 100 ? 'text-green-600' : completionMetrics.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{completionMetrics.efficiency}%</p>
                    <p className="text-xs text-gray-500 mt-1">vs expected</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">✓ Quality Score</p>
                    <p className="text-lg font-bold text-blue-600">{completionMetrics.qualityScore}%</p>
                    <p className="text-xs text-gray-500 mt-1">acceptance rate</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-orange-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Actual Duration</p>
                    <p className="text-lg font-bold text-orange-600">{(completionMetrics.totalActualTime / 60).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500 mt-1">{completionMetrics.totalActualTime}m</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-purple-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Expected Duration</p>
                    <p className="text-lg font-bold text-purple-600">{(completionMetrics.expectedTime / 60).toFixed(1)}h</p>
                    <p className="text-xs text-gray-500 mt-1">{completionMetrics.expectedTime}m</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-indigo-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">Start Date</p>
                    <p className="text-sm font-bold text-indigo-600">{completionMetrics.firstTimeLogDate ? new Date(completionMetrics.firstTimeLogDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-indigo-200">
                    <p className="text-xs text-gray-600 font-semibold mb-1">End Date</p>
                    <p className="text-sm font-bold text-indigo-600">{completionMetrics.lastTimeLogDate ? new Date(completionMetrics.lastTimeLogDate).toLocaleDateString() : '-'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Details Table */}
            <div className="border rounded-xs overflow-hidden">
              <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                <h3 className="text-xs font-bold text-gray-900">Work Order Details</h3>
                {!isReadOnly && (
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition ${
                      isEditMode
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Edit2 size={12} />
                    {isEditMode ? 'Done Editing' : 'Edit Details'}
                  </button>
                )}
              </div>
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {/* Item */}
                  <tr className="border-b border-gray-200 bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Item *</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <SearchableSelect
                          value={formData.item_to_manufacture}
                          onChange={handleItemSelect}
                          options={items.map(item => ({
                            value: item.item_code,
                            label: item.item_code
                          }))}
                          placeholder="Select item..."
                          isClearable={true}
                        />
                      ) : (
                        formData.item_to_manufacture || '-'
                      )}
                    </td>
                  </tr>

                  {/* Quantity */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Quantity *</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="number"
                          name="qty_to_manufacture"
                          value={formData.qty_to_manufacture}
                          onChange={handleInputChange}
                          className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.qty_to_manufacture || '-'
                      )}
                    </td>
                  </tr>

                  {/* Sales Order ID */}
                  <tr className="border-b border-gray-200 bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Sales Order ID</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="text"
                          name="sales_order_id"
                          value={formData.sales_order_id}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.sales_order_id || '-'
                      )}
                    </td>
                  </tr>

                  {/* BOM ID */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">BOM ID *</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        availableBoms.length > 0 ? (
                          <SearchableSelect
                            value={formData.bom_id}
                            onChange={(value) => {
                              handleInputChange({ target: { name: 'bom_id', value } })
                            }}
                            options={availableBoms.map(bom => ({
                              value: bom.bom_id,
                              label: bom.bom_id
                            }))}
                            placeholder="Select BOM..."
                          />
                        ) : (
                          <input
                            type="text"
                            name="bom_id"
                            value={formData.bom_id}
                            onChange={handleInputChange}
                            className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        )
                      ) : (
                        formData.bom_id || '-'
                      )}
                    </td>
                  </tr>

                  {/* Priority */}
                  <tr className="border-b border-gray-200 bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Priority</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          className="w-32 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      ) : (
                        <span className="capitalize">{formData.priority || '-'}</span>
                      )}
                    </td>
                  </tr>

                  {/* Planned Start Date */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Planned Start Date</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="date"
                          name="planned_start_date"
                          value={formData.planned_start_date}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.planned_start_date || '-'
                      )}
                    </td>
                  </tr>

                  {/* Planned End Date */}
                  <tr className="border-b border-gray-200 bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Planned End Date</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="date"
                          name="planned_end_date"
                          value={formData.planned_end_date}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.planned_end_date || '-'
                      )}
                    </td>
                  </tr>

                  {/* Actual Start Date */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Actual Start Date</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="date"
                          name="actual_start_date"
                          value={formData.actual_start_date}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.actual_start_date || '-'
                      )}
                    </td>
                  </tr>

                  {/* Actual End Date */}
                  <tr className="border-b border-gray-200 bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Actual End Date</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="date"
                          name="actual_end_date"
                          value={formData.actual_end_date}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.actual_end_date || '-'
                      )}
                    </td>
                  </tr>

                  {/* Expected Delivery Date */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Expected Delivery Date</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <input
                          type="date"
                          name="expected_delivery_date"
                          value={formData.expected_delivery_date}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formData.expected_delivery_date || '-'
                      )}
                    </td>
                  </tr>

                  {/* Production Stage */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Production Stage</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <select
                          name="production_stage_id"
                          value={formData.production_stage_id || ''}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select stage</option>
                          {productionStages.map(stage => (
                            <option key={stage.id} value={stage.id}>
                              {stage.stage_sequence}. {stage.stage_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        formData.production_stage_id
                          ? productionStages.find(s => s.id === formData.production_stage_id)?.stage_name || '-'
                          : '-'
                      )}
                    </td>
                  </tr>

                  {/* Status */}
                  <tr className="border-b border-gray-200 bg-gray-50 hover:bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50">Status</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                          className="w-40 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="draft">Draft</option>
                          <option value="planned">Planned</option>
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span className="capitalize">{formData.status || '-'}</span>
                      )}
                    </td>
                  </tr>

                  {/* Notes */}
                  <tr className="bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 font-semibold text-gray-700 w-40 bg-gray-50 align-top">Notes</td>
                    <td className="px-3 py-2 text-gray-900">
                      {isEditMode && !isReadOnly ? (
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          rows="2"
                        />
                      ) : (
                        <div className="whitespace-pre-wrap break-words">{formData.notes || '-'}</div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Operations Section */}
            {bomOperations.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Factory size={16} className="text-blue-600" />
                  Operations ({bomOperations.length})
                </h3>
                <div className=" border rounded">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">No</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Operation</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Completed</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Loss</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Workstation</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Time (hrs)</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Cost/Unit</th>
                        {!isReadOnly && <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-8">Act</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {bomOperations.map((op, idx) => (
                        <tr key={op.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-2 py-1 text-gray-900 font-medium">{idx + 1}</td>
                          <td className="px-2 py-1 text-gray-900 text-xs">{op.operation_name || '-'}</td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              value={op.completed_qty || 0}
                              onChange={(e) => updateOperation(op.id, 'completed_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              value={op.process_loss_qty || 0}
                              onChange={(e) => updateOperation(op.id, 'process_loss_qty', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <SearchableSelect
                              value={op.workstation || ''}
                              onChange={(value) => updateOperation(op.id, 'workstation', value)}
                              options={workstations.map(ws => ({
                                value: ws.workstation_id || ws.id,
                                label: ws.machine_id || ws.name
                              }))}
                              placeholder="Select WS"
                              isDisabled={isReadOnly}
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={op.operation_time || 0}
                              onChange={(e) => updateOperation(op.id, 'operation_time', parseFloat(e.target.value) || 0)}
                              disabled={isReadOnly}
                              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            {isReadOnly ? (
                              <span className="text-gray-700">₹{(parseFloat(op.operating_cost) || 0).toFixed(2)}</span>
                            ) : (
                              <input
                                type="number"
                                step="0.01"
                                value={op.operating_cost || 0}
                                onChange={(e) => updateOperation(op.id, 'operating_cost', parseFloat(e.target.value) || 0)}
                                className="w-20 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                              />
                            )}
                          </td>
                          {!isReadOnly && (
                            <td className="px-2 py-1 text-center">
                              <button
                                onClick={() => setEditingOperationId(editingOperationId === op.id ? null : op.id)}
                                className="p-0.5 hover:bg-blue-100 rounded transition"
                              >
                                <Edit2 size={12} className="text-blue-600" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Materials/Required Items Section */}
            {bomMaterials.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Boxes size={16} className="text-purple-600" />
                  Required Items ({bomMaterials.length})
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2 text-xs">
                  <p className="text-gray-700 font-semibold">Material Tracking Logic:</p>
                  <ul className="text-gray-600 mt-1 space-y-1 ml-4 list-disc">
                    <li><strong>Req Qty</strong>: Required quantity from BOM</li>
                    <li><strong>Trans Qty</strong>: Transferred from warehouse to production (usually = Req Qty or more)</li>
                    <li><strong>Cons Qty</strong>: Actually consumed in production (≤ Trans Qty)</li>
                    <li><strong>Ret Qty</strong>: Returned to warehouse unused (≤ Trans Qty)</li>
                    <li><strong>Wastage</strong>: Trans Qty - Cons Qty - Ret Qty (process loss)</li>
                  </ul>
                </div>
                <div className=" border rounded overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-8">No</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700 min-w-20">Item Code</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Item Name</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">WH</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Req Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-12">UOM</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700 bg-blue-100" title="Transferred to production">Trans Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700 bg-green-100" title="Used in production">Cons Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700 bg-amber-100" title="Returned unused">Ret Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700 bg-red-100" title="Process loss">Wastage</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700 bg-red-100" title="Wastage %">Waste %</th>
                        {!isReadOnly && <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-8">Act</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {bomMaterials.map((mat, idx) => {
                        const transQty = parseFloat(mat.transferred_qty) || 0
                        const consQty = parseFloat(mat.consumed_qty) || 0
                        const retQty = parseFloat(mat.returned_qty) || 0
                        const wastage = Math.max(0, transQty - consQty - retQty)
                        const wastePercent = transQty > 0 ? ((wastage / transQty) * 100).toFixed(1) : '0.0'
                        const isValidated = transQty >= (consQty + retQty)
                        
                        return (
                          <tr key={mat.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!isValidated ? 'border-l-4 border-l-red-500' : ''}`}>
                            <td className="px-2 py-1 text-center text-gray-900 font-medium">{idx + 1}</td>
                            <td className="px-2 py-1 text-gray-900 font-medium text-xs">{mat.item_code || '-'}</td>
                            <td className="px-2 py-1 text-gray-700 text-xs">{mat.item_name || mat.description || '-'}</td>
                            <td className="px-2 py-1">
                              <input
                                type="text"
                                value={mat.source_warehouse || ''}
                                onChange={(e) => updateMaterial(mat.id, 'source_warehouse', e.target.value)}
                                disabled={isReadOnly}
                                placeholder="WH"
                                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              />
                            </td>
                            <td className="px-2 py-1 text-right font-medium text-gray-900">
                              <input
                                type="number"
                                step="0.001"
                                value={mat.required_qty || 0}
                                onChange={(e) => updateMaterial(mat.id, 'required_qty', parseFloat(e.target.value) || 0)}
                                disabled={isReadOnly}
                                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                              />
                            </td>
                            <td className="px-2 py-1 text-right text-xs text-gray-700">
                              {mat.uom || '-'}
                            </td>
                            <td className="px-2 py-1 text-right bg-blue-50">
                              <input
                                type="number"
                                step="0.001"
                                value={mat.transferred_qty || 0}
                                onChange={(e) => updateMaterial(mat.id, 'transferred_qty', parseFloat(e.target.value) || 0)}
                                disabled={isReadOnly}
                                className="w-16 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                                title="Material issued to production"
                              />
                            </td>
                            <td className="px-2 py-1 text-right bg-green-50">
                              <input
                                type="number"
                                step="0.001"
                                value={mat.consumed_qty || 0}
                                onChange={(e) => updateMaterial(mat.id, 'consumed_qty', parseFloat(e.target.value) || 0)}
                                disabled={isReadOnly}
                                className={`w-16 px-1 py-0.5 border rounded text-right text-xs ${consQty > transQty ? 'border-red-500 bg-red-100' : 'border-gray-300'}`}
                                title="Material used in production"
                              />
                            </td>
                            <td className="px-2 py-1 text-right bg-amber-50">
                              <input
                                type="number"
                                step="0.001"
                                value={mat.returned_qty || 0}
                                onChange={(e) => updateMaterial(mat.id, 'returned_qty', parseFloat(e.target.value) || 0)}
                                disabled={isReadOnly}
                                className={`w-16 px-1 py-0.5 border rounded text-right text-xs ${retQty > transQty ? 'border-red-500 bg-red-100' : 'border-gray-300'}`}
                                title="Material returned unused"
                              />
                            </td>
                            <td className="px-2 py-1 text-right bg-red-50 font-medium text-gray-900">
                              {wastage.toFixed(3)}
                            </td>
                            <td className={`px-2 py-1 text-right font-bold w-12 ${parseFloat(wastePercent) > 5 ? 'bg-red-100 text-red-700' : 'bg-red-50 text-gray-900'}`}>
                              {wastePercent}%
                            </td>
                            {!isReadOnly && (
                              <td className="px-2 py-1 text-center">
                                <button
                                  onClick={() => setEditingMaterialId(editingMaterialId === mat.id ? null : mat.id)}
                                  className="p-0.5 hover:bg-blue-100 rounded transition"
                                  title="Edit material"
                                >
                                  <Edit2 size={12} className="text-blue-600" />
                                </button>
                              </td>
                            )}
                          </tr>
                        )
                      })}
                      <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                        <td colSpan="4" className="px-2 py-1.5 text-right">TOTAL:</td>
                        <td className="px-2 py-1.5 text-right text-gray-900">
                          {bomMaterials.reduce((sum, m) => sum + (parseFloat(m.required_qty) || 0), 0).toFixed(3)}
                        </td>
                        <td></td>
                        <td className="px-2 py-1.5 text-right text-gray-900 bg-blue-100">
                          {bomMaterials.reduce((sum, m) => sum + (parseFloat(m.transferred_qty) || 0), 0).toFixed(3)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-900 bg-green-100">
                          {bomMaterials.reduce((sum, m) => sum + (parseFloat(m.consumed_qty) || 0), 0).toFixed(3)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-900 bg-amber-100">
                          {bomMaterials.reduce((sum, m) => sum + (parseFloat(m.returned_qty) || 0), 0).toFixed(3)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-900 bg-red-100">
                          {bomMaterials.reduce((sum, m) => {
                            const t = parseFloat(m.transferred_qty) || 0
                            const c = parseFloat(m.consumed_qty) || 0
                            const r = parseFloat(m.returned_qty) || 0
                            return sum + Math.max(0, t - c - r)
                          }, 0).toFixed(3)}
                        </td>
                        <td className="px-2 py-1.5 text-right text-gray-900 bg-red-100">
                          {(() => {
                            const totalTrans = bomMaterials.reduce((sum, m) => sum + (parseFloat(m.transferred_qty) || 0), 0)
                            const totalWaste = bomMaterials.reduce((sum, m) => {
                              const t = parseFloat(m.transferred_qty) || 0
                              const c = parseFloat(m.consumed_qty) || 0
                              const r = parseFloat(m.returned_qty) || 0
                              return sum + Math.max(0, t - c - r)
                            }, 0)
                            return totalTrans > 0 ? ((totalWaste / totalTrans) * 100).toFixed(1) : '0.0'
                          })()}%
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Job Cards Section */}
            {jobCards.length > 0 && (
              <div className="border rounded-xs overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1">
                    <BarChart3 size={16} className="text-indigo-600" />
                    Job Cards ({jobCards.length})
                  </h3>
                </div>
                <div className=" border-t border-gray-200">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">JC ID</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Operation</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty Planned</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Qty Completed</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Workstation</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobCards.map((jc, idx) => {
                        const jcId = jc.jc_id || jc.id || `${jc.operation_name || jc.operation}-${idx}`
                        const isEditing = editingJobCardId === jcId && !isReadOnly
                        return (
                          <tr key={jcId} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-2 py-1 text-gray-900 font-medium text-xs">{jc.job_card_id || jc.id || '-'}</td>
                            <td className="px-2 py-1 text-gray-700 text-xs">{jc.operation_name || jc.operation || '-'}</td>
                            <td className="px-2 py-1 text-right text-gray-700">{jc.planned_quantity || '-'}</td>
                            <td className="px-2 py-1 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.001"
                                  value={jc.completed_quantity || jc.actual_qty || 0}
                                  onChange={(e) => updateJobCard(jcId, 'completed_quantity', parseFloat(e.target.value) || 0)}
                                  className="w-16 px-1 py-0.5 border border-gray-300 rounded text-right text-xs"
                                />
                              ) : (
                                <span className="text-gray-700">{jc.completed_quantity || jc.actual_qty || 0}</span>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              {isEditing ? (
                                <SearchableSelect
                                  value={jc.workstation_type || jc.workstation || ''}
                                  onChange={(value) => updateJobCard(jcId, 'workstation_type', value)}
                                  options={workstations.map(ws => ({
                                    value: ws.workstation_id || ws.id,
                                    label: ws.workstation_name || ws.name || ws.machine_id || ws.id
                                  }))}
                                  placeholder="Select WS"
                                  isClearable={false}
                                />
                              ) : (
                                <span className="text-gray-700 text-xs font-medium">{getWorkstationName(jc.workstation_type || jc.workstation)}</span>
                              )}
                            </td>
                            <td className="px-2 py-1">
                              {isEditing ? (
                                <select
                                  value={jc.status || 'pending'}
                                  onChange={(e) => updateJobCard(jcId, 'status', e.target.value)}
                                  className="w-20 px-1 py-0.5 border border-gray-300 rounded text-xs"
                                >
                                  <option value="pending">Pending</option>
                                  <option value="open">Open</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium inline-block ${
                                  jc.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  jc.status === 'in-progress' ? 'bg-amber-100 text-amber-800' :
                                  jc.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {jc.status || 'pending'}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {!isReadOnly && (
                                <div className="flex items-center gap-1 justify-center">
                                  {isEditing ? (
                                    <>
                                      <button
                                        onClick={() => {
                                          saveJobCard(jcId)
                                          setEditingJobCardId(null)
                                        }}
                                        disabled={loading}
                                        className="inline-flex items-center justify-center px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 rounded transition text-xs font-medium"
                                        title="Save changes"
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        onClick={() => setEditingJobCardId(null)}
                                        className="inline-flex items-center justify-center px-2 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition text-xs"
                                        title="Cancel"
                                      >
                                        <X size={14} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => setEditingJobCardId(jcId)}
                                        className="inline-flex items-center justify-center px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition text-xs font-medium"
                                        title="Edit row"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => moveToNextWorkstation(jcId)}
                                        className="inline-flex items-center justify-center px-2 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded transition text-xs"
                                        title="Move to next workstation"
                                      >
                                        <ChevronRight size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sub-Assemblies Section (separate from raw materials) */}
            {bomMaterials.length > 0 && bomMaterials.some(mat => mat.item_code?.startsWith('SA-')) && (
              <div className="border-t pt-3 mt-3">
                <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Package size={16} className="text-orange-600" />
                  Sub-Assemblies
                </h3>
                <div className=" border rounded">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-8">No</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Sub-Assembly Code</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">Required Qty</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-700">UOM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomMaterials.filter(mat => mat.item_code?.startsWith('SA-')).map((mat, idx) => (
                        <tr key={mat.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-2 py-1 text-center text-gray-900 font-medium">{idx + 1}</td>
                          <td className="px-2 py-1 text-gray-900 font-medium text-xs">{mat.item_code || '-'}</td>
                          <td className="px-2 py-1 text-right text-gray-700">{mat.required_qty || mat.quantity || 0}</td>
                          <td className="px-2 py-1 text-right text-gray-700 text-xs">{mat.uom || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cost Summary Section */}
            {(bomOperations.length > 0 || bomMaterials.length > 0) && (
              <div className="border-t pt-3 mt-3">
                <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <BarChart3 size={16} className="text-green-600" />
                  Cost Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {bomMaterials.length > 0 && (
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-xs text-gray-600">Raw Materials (Qty)</p>
                      <p className="text-xs font-bold text-blue-900">{bomMaterials.length}</p>
                    </div>
                  )}
                  {bomOperations.length > 0 && (
                    <div className="bg-purple-50 rounded p-2 border border-purple-200">
                      <p className="text-xs text-gray-600">Operations (Qty)</p>
                      <p className="text-xs font-bold text-purple-900">{bomOperations.length}</p>
                    </div>
                  )}
                  {bomOperations.length > 0 && (
                    <div className="bg-orange-50 rounded p-2 border border-orange-200">
                      <p className="text-xs text-gray-600">Total Operation Hours</p>
                      <p className="text-xs font-bold text-orange-900">
                        {bomOperations.reduce((sum, op) => sum + (parseFloat(op.operation_time) || 0), 0).toFixed(2)} hrs
                      </p>
                    </div>
                  )}
                  {bomOperations.length > 0 && (
                    <div className="bg-green-50 rounded p-2 border border-green-200">
                      <p className="text-xs text-gray-600">Total Operation Cost</p>
                      <p className="text-xs font-bold text-green-900">
                        ₹{bomOperations.reduce((sum, op) => sum + (parseFloat(op.operating_cost) || 0) * (formData.qty_to_manufacture || 1), 0).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={() => navigate('/manufacturing/work-orders')}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
              {!isReadOnly && (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-1"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
