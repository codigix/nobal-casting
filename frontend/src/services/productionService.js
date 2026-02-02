import api from './api'

// Work Orders
export const getWorkOrders = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/work-orders?${params}`)
  return response.data
}

export const createWorkOrder = async (data) => {
  const response = await api.post('/production/work-orders', data)
  return response.data
}

export const updateWorkOrder = async (wo_id, data) => {
  const response = await api.put(`/production/work-orders/${wo_id}`, data)
  return response.data
}

// Production Plans
export const getProductionPlans = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/plans?${params}`)
  return response.data
}

export const createProductionPlan = async (data) => {
  const response = await api.post('/production/plans', data)
  return response.data
}

// Production Entries (Daily Production)
export const getProductionEntries = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/entries?${params}`)
  return response.data
}

export const createProductionEntry = async (data) => {
  const response = await api.post('/production/entries', data)
  return response.data
}

// Rejections
export const recordRejection = async (data) => {
  const response = await api.post('/production/rejections', data)
  return response.data
}

export const getRejectionAnalysis = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/rejections/analysis?${params}`)
  return response.data
}

// Machines
export const getMachines = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/machines?${params}`)
  return response.data
}

export const createMachine = async (data) => {
  const response = await api.post('/production/machines', data)
  return response.data
}

// Operators
export const getOperators = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/operators?${params}`)
  return response.data
}

export const createOperator = async (data) => {
  const response = await api.post('/production/operators', data)
  return response.data
}

// BOMs
export const getBOMs = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/boms?${params}`)
  return response.data
}

export const getBOMDetails = async (bom_id) => {
  const response = await api.get(`/production/boms/${bom_id}`)
  return response.data
}

export const createBOM = async (data) => {
  const response = await api.post('/production/boms', data)
  return response.data
}

export const updateBOM = async (bom_id, data) => {
  const response = await api.put(`/production/boms/${bom_id}`, data)
  return response.data
}

export const syncBOMStatuses = async () => {
  const response = await api.post('/production/boms/sync-statuses')
  return response.data
}

export const deleteBOM = async (bom_id) => {
  const response = await api.delete(`/production/boms/${bom_id}`)
  return response.data
}

// Job Cards
export const getJobCards = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/job-cards?${params}`)
  return response.data
}

export const getJobCardDetails = async (jc_id) => {
  const response = await api.get(`/production/job-cards/${jc_id}`)
  return response.data
}

export const createJobCard = async (data) => {
  const response = await api.post('/production/job-cards', data)
  return response.data
}

export const updateJobCard = async (jc_id, data) => {
  const response = await api.put(`/production/job-cards/${jc_id}`, data)
  return response.data
}

export const updateJobCardStatus = async (jc_id, status) => {
  const response = await api.put(`/production/job-cards/${jc_id}/status`, { status })
  return response.data
}

export const deleteJobCard = async (jc_id) => {
  const response = await api.delete(`/production/job-cards/${jc_id}`)
  return response.data
}

export const generateJobCardsForWorkOrder = async (work_order_id) => {
  const response = await api.post(`/production/job-cards/${work_order_id}/generate-all`)
  return response.data
}

// Production Planning (extended)
export const getProductionPlanDetails = async (plan_id) => {
  const response = await api.get(`/production-planning/${plan_id}`)
  return response.data
}

export const createWorkOrdersFromPlan = async (plan_id) => {
  const response = await api.post(`/production-planning/${plan_id}/create-work-orders`)
  return response.data
}

// Production Plans (extended)
export const updateProductionPlan = async (plan_id, data) => {
  const response = await api.put(`/production/plans/${plan_id}`, data)
  return response.data
}

export const deleteProductionPlan = async (plan_id) => {
  const response = await api.delete(`/production/plans/${plan_id}`)
  return response.data
}

// Work Orders (extended)
export const getWorkOrder = async (wo_id) => {
  const response = await api.get(`/production/work-orders/${wo_id}`)
  return response.data
}

export const deleteWorkOrder = async (wo_id) => {
  const response = await api.delete(`/production/work-orders/${wo_id}`)
  return response.data
}

export const truncateWorkOrders = async () => {
  const response = await api.delete('/production/work-orders/truncate/all')
  return response.data
}

export const truncateBOMs = async () => {
  const response = await api.delete('/production/boms/truncate/all')
  return response.data
}

export const truncateJobCards = async () => {
  const response = await api.delete('/production/job-cards/truncate/all')
  return response.data
}

// Items Master
export const getItemsList = async () => {
  const response = await api.get('/items')
  return response.data
}

export const getItemDetails = async (itemCode) => {
  const response = await api.get(`/items/${itemCode}`)
  return response.data
}

export const getUOMList = async () => {
  const response = await api.get('/items/uoms')
  return response.data
}

// Operations
export const getOperationsList = async () => {
  const response = await api.get('/production/operations')
  return response.data
}

export const deleteOperation = async (operation_id) => {
  const response = await api.delete(`/production/operations/${operation_id}`)
  return response.data
}

// Workstations
export const getWorkstationsList = async () => {
  const response = await api.get('/production/workstations')
  return response.data
}

export const getWorkstationDetails = async (wsId) => {
  const response = await api.get(`/production/workstations/${wsId}`)
  return response.data
}

export const createWorkstation = async (data) => {
  const response = await api.post('/production/workstations', data)
  return response.data
}

export const updateWorkstation = async (wsId, data) => {
  const response = await api.put(`/production/workstations/${wsId}`, data)
  return response.data
}

export const deleteWorkstation = async (wsId) => {
  const response = await api.delete(`/production/workstations/${wsId}`)
  return response.data
}

// Analytics
export const getProductionDashboard = async (date) => {
  const response = await api.get(`/production/analytics/dashboard?date=${date}`)
  return response.data
}

export const getMachineUtilization = async (date_from, date_to) => {
  const response = await api.get(
    `/production/analytics/machine-utilization?date_from=${date_from}&date_to=${date_to}`
  )
  return response.data
}

export const getOperatorEfficiency = async (date_from, date_to) => {
  const response = await api.get(
    `/production/analytics/operator-efficiency?date_from=${date_from}&date_to=${date_to}`
  )
  return response.data
}

// Master Data for Searchable Selects
export const getCompanies = async () => {
  const response = await api.get('/company-info')
  return response.data
}

export const getCustomers = async () => {
  const response = await api.get('/selling/customers')
  return response.data
}

export const getItems = async () => {
  const response = await api.get('/items')
  return response.data
}

export const getWarehouses = async () => {
  const response = await api.get('/stock/warehouses')
  return response.data
}

export const createWarehouse = async (data) => {
  const response = await api.post('/stock/warehouses', data)
  return response.data
}

export const updateWarehouse = async (id, data) => {
  const response = await api.put(`/stock/warehouses/${id}`, data)
  return response.data
}

export const deleteWarehouse = async (name) => {
  const response = await api.delete(`/stock/warehouses/${name}`)
  return response.data
}

// Employees
export const getEmployees = async () => {
  const response = await api.get('/hr/employees')
  return response.data
}

// Sales Orders
export const getSalesOrders = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/selling/sales-orders?${params}`)
  return response.data
}

// Time Logs
export const getTimeLogs = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/time-logs?${params}`)
  return response.data
}

export const createTimeLog = async (data) => {
  const response = await api.post('/production/time-logs', data)
  return response.data
}

export const deleteTimeLog = async (id) => {
  const response = await api.delete(`/production/time-logs/${id}`)
  return response.data
}

// Rejections
export const getRejections = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/rejections?${params}`)
  return response.data
}

export const createRejection = async (data) => {
  const response = await api.post('/production/rejections', data)
  return response.data
}

export const deleteRejection = async (id) => {
  const response = await api.delete(`/production/rejections/${id}`)
  return response.data
}

// Downtimes
export const getDowntimes = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/production/downtimes?${params}`)
  return response.data
}

export const createDowntime = async (data) => {
  const response = await api.post('/production/downtimes', data)
  return response.data
}

export const deleteDowntime = async (id) => {
  const response = await api.delete(`/production/downtimes/${id}`)
  return response.data
}

export const createOutwardChallan = async (data) => {
  const response = await api.post('/production/outward-challans', data)
  return response.data
}

export const getOutwardChallans = async (jobCardId) => {
  const response = await api.get(`/production/outward-challans?job_card_id=${jobCardId}`)
  return response.data
}

export const createInwardChallan = async (data) => {
  const response = await api.post('/production/inward-challans', data)
  return response.data
}

export const getInwardChallans = async (jobCardId) => {
  const response = await api.get(`/production/inward-challans?job_card_id=${jobCardId}`)
  return response.data
}

// OEE Analytics
export const getOEEDashboardData = async (filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/oee/dashboard?${params}`)
  return response.data
}

export const getMachineOEEMetrics = async (machineId, filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/oee/machine/${machineId}?${params}`)
  return response.data
}

export const getMachineHistoricalMetrics = async (machineId, filters = {}) => {
  const params = new URLSearchParams(filters)
  const response = await api.get(`/oee/machine/${machineId}/historical-metrics?${params}`)
  return response.data
}

export const getItemGroups = async () => {
  const response = await api.get('/item-groups')
  return response.data
}
