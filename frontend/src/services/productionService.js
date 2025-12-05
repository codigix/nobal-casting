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

export const deleteJobCard = async (jc_id) => {
  const response = await api.delete(`/production/job-cards/${jc_id}`)
  return response.data
}

// Production Plans (extended)
export const getProductionPlanDetails = async (plan_id) => {
  const response = await api.get(`/production/plans/${plan_id}`)
  return response.data
}

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

// Items Master
export const getItemsList = async () => {
  const response = await api.get('/items')
  return response.data
}

// Operations
export const getOperationsList = async () => {
  const response = await api.get('/production/operations')
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
