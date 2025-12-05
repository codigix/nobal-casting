import api from './api'

export const toolroomService = {
  // ========== TOOL MASTER ==========
  getToolsList: () => api.get('/api/toolroom/tools'),
  getToolById: (id) => api.get(`/api/toolroom/tools/${id}`),
  createTool: (data) => api.post('/api/toolroom/tools', data),
  updateTool: (id, data) => api.put(`/api/toolroom/tools/${id}`, data),
  deleteTool: (id) => api.delete(`/api/toolroom/tools/${id}`),
  searchTools: (query) => api.get(`/api/toolroom/tools/search?q=${query}`),

  // ========== DIE REGISTER ==========
  getDieRegisterList: () => api.get('/api/toolroom/die-register'),
  getDieRegisterById: (id) => api.get(`/api/toolroom/die-register/${id}`),
  createDieRegister: (data) => api.post('/api/toolroom/die-register', data),
  updateDieRegister: (id, data) => api.put(`/api/toolroom/die-register/${id}`, data),
  deleteDieRegister: (id) => api.delete(`/api/toolroom/die-register/${id}`),

  // ========== DIE REWORK ==========
  getDieReworkLog: () => api.get('/api/toolroom/die-rework'),
  createDieRework: (data) => api.post('/api/toolroom/die-rework', data),
  getDieReworkById: (id) => api.get(`/api/toolroom/die-rework/${id}`),
  updateDieRework: (id, data) => api.put(`/api/toolroom/die-rework/${id}`, data),

  // ========== MAINTENANCE ==========
  getMaintenanceSchedule: () => api.get('/api/toolroom/maintenance-schedule'),
  getMaintenanceScheduleById: (id) => api.get(`/api/toolroom/maintenance-schedule/${id}`),
  createMaintenanceSchedule: (data) => api.post('/api/toolroom/maintenance-schedule', data),
  updateMaintenanceSchedule: (id, data) => api.put(`/api/toolroom/maintenance-schedule/${id}`, data),

  getMaintenanceHistory: () => api.get('/api/toolroom/maintenance-history'),
  createMaintenanceHistory: (data) => api.post('/api/toolroom/maintenance-history', data),
  updateMaintenanceHistory: (id, data) => api.put(`/api/toolroom/maintenance-history/${id}`, data),

  // ========== ANALYTICS ==========
  getDashboardAnalytics: () => api.get('/api/toolroom/analytics/dashboard'),
  getUtilizationReport: (startDate, endDate) => api.get(`/api/toolroom/analytics/utilization?start=${startDate}&end=${endDate}`),
  getCostAnalysis: () => api.get('/api/toolroom/analytics/cost-analysis'),
  getDowntimeAnalysis: () => api.get('/api/toolroom/analytics/downtime-analysis'),
}

export default toolroomService