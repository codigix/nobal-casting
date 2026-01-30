import api from './api'

export const getProjectAnalysis = async () => {
  const response = await api.get('/masters/project-analysis')
  return response.data
}

export const getSalesOrdersAsProjects = async () => {
  const response = await api.get('/masters/sales-orders-analysis')
  return response.data
}

export const getProjectStats = async () => {
  const response = await api.get('/masters/project-stats')
  return response.data
}

export const getDetailedProjectAnalysis = async (id) => {
  // This might need a specific endpoint in MastersController or similar
  const response = await api.get(`/masters/project-analysis/${id}`)
  return response.data
}

export const getCustomerStats = async () => {
  const response = await api.get('/masters/customer-stats')
  return response.data
}

export const getCustomerDetailedStats = async (id) => {
  const response = await api.get(`/masters/customer-stats/${id}`)
  return response.data
}

export const getInventoryAnalytics = async () => {
  const response = await api.get('/analytics/inventory')
  return response.data
}
