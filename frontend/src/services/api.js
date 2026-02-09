import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL ;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Suppliers API
export const suppliersAPI = {
  list: () => api.get('/suppliers'),
  get: (id) => api.get(`/suppliers/${id}`),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),
}

// Employees API
export const employeesAPI = {
  list: () => api.get('/hr/employees'),
  get: (id) => api.get(`/hr/employees/${id}`),
  create: (data) => api.post('/hr/employees', data),
  update: (id, data) => api.put(`/hr/employees/${id}`, data),
  delete: (id) => api.delete(`/hr/employees/${id}`),
}

// Purchase Orders API
export const purchaseOrdersAPI = {
  list: () => api.get('/purchase-orders'),
  get: (id) => api.get(`/purchase-orders/${id}`),
  create: (data) => api.post('/purchase-orders', data),
  update: (id, data) => api.put(`/purchase-orders/${id}`, data),
  delete: (id) => api.delete(`/purchase-orders/${id}`),
}

// RFQ API
export const rfqsAPI = {
  list: () => api.get('/rfqs'),
  get: (id) => api.get(`/rfqs/${id}`),
  create: (data) => api.post('/rfqs', data),
  update: (id, data) => api.put(`/rfqs/${id}`, data),
}

// Quotations API
export const quotationsAPI = {
  list: (params) => api.get('/selling/quotations', { params }),
  get: (id) => api.get(`/selling/quotations/${id}`),
  create: (data) => api.post('/selling/quotations', data),
  update: (id, data) => api.put(`/selling/quotations/${id}`, data),
  delete: (id) => api.delete(`/selling/quotations/${id}`),
  send: (id) => api.put(`/selling/quotations/${id}/send`),
}

// GRN Requests API
export const grnRequestsAPI = {
  list: () => api.get('/grn-requests'),
  get: (id) => api.get(`/grn-requests/${id}`),
  create: (data) => api.post('/grn-requests', data),
  sendToInventory: (id, data) => api.post(`/grn-requests/${id}/send-to-inventory`, data),
  reject: (id, data) => api.post(`/grn-requests/${id}/reject`, data),
  inspectItem: (grnId, data) => api.post(`/grn-requests/${grnId}/items/inspect`, data),
  qcApprove: (id) => api.post(`/grn-requests/${id}/qc-approve`),
  inventoryApprove: (id, data) => api.post(`/grn-requests/${id}/inventory-approve`, data),
  sendBack: (id, data) => api.post(`/grn-requests/${id}/send-back`, data),
}

// Items API
export const itemsAPI = {
  list: () => api.get('/items'),
  get: (code) => api.get(`/items/${code}`),
  create: (data) => api.post('/items', data),
}

// Stock API
export const stockAPI = {
  list: () => api.get('/stock'),
  getByItem: (itemCode) => api.get(`/stock/item/${itemCode}`),
  warehouses: () => api.get('/stock/warehouses'),
}

// Tax Templates API
export const taxTemplatesAPI = {
  list: () => api.get('/tax-templates'),
  get: (id) => api.get(`/tax-templates/${id}`),
}

// Material Requests API
export const materialRequestsAPI = {
  list: () => api.get('/material-requests'),
  get: (id) => api.get(`/material-requests/${id}`),
  create: (data) => api.post('/material-requests', data),
  getApproved: () => api.get('/material-requests/approved'),
}

// Purchase Invoices API
export const purchaseInvoicesAPI = {
  list: () => api.get('/purchase-invoices'),
  get: (id) => api.get(`/purchase-invoices/${id}`),
  create: (data) => api.post('/purchase-invoices', data),
}

// Purchase Receipts API (GRN)
export const purchaseReceiptsAPI = {
  list: () => api.get('/purchase-receipts'),
  get: (id) => api.get(`/purchase-receipts/${id}`),
  create: (data) => api.post('/purchase-receipts', data),
}

// Customers API
export const customersAPI = {
  list: () => api.get('/customers'),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
}

// Sales Orders API
export const salesOrdersAPI = {
  list: () => api.get('/selling/sales-orders'),
  get: (id) => api.get(`/selling/sales-orders/${id}`),
  create: (data) => api.post('/selling/sales-orders', data),
  update: (id, data) => api.put(`/selling/sales-orders/${id}`, data),
  delete: (id) => api.delete(`/selling/sales-orders/${id}`),
}

// Delivery Notes API
export const deliveryNotesAPI = {
  list: (params) => api.get('/selling/delivery-notes', { params }),
  get: (id) => api.get(`/selling/delivery-notes/${id}`),
  create: (data) => api.post('/selling/delivery-notes', data),
  update: (id, data) => api.put(`/selling/delivery-notes/${id}`, data),
  delete: (id) => api.delete(`/selling/delivery-notes/${id}`),
}

// Sales Invoices API
export const salesInvoicesAPI = {
  list: (params) => api.get('/selling/invoices', { params }),
  get: (id) => api.get(`/selling/invoices/${id}`),
  create: (data) => api.post('/selling/invoices', data),
  update: (id, data) => api.put(`/selling/invoices/${id}`, data),
  delete: (id) => api.delete(`/selling/invoices/${id}`),
}

// BOM API
export const bomAPI = {
  list: () => api.get('/production/boms'),
  get: (id) => api.get(`/production/boms/${id}`),
  create: (data) => api.post('/production/boms', data),
}

// Work Orders API
export const workOrdersAPI = {
  list: (params) => api.get('/production/work-orders', { params }),
  get: (id) => api.get(`/production/work-orders/${id}`),
  create: (data) => api.post('/production/work-orders', data),
  update: (id, data) => api.put(`/production/work-orders/${id}`, data),
  delete: (id) => api.delete(`/production/work-orders/${id}`),
}

// Job Cards API
export const jobCardsAPI = {
  list: (params) => api.get('/production/job-cards', { params }),
  get: (id) => api.get(`/production/job-cards/${id}`),
  create: (data) => api.post('/production/job-cards', data),
  update: (id, data) => api.put(`/production/job-cards/${id}`, data),
  updateStatus: (id, status) => api.put(`/production/job-cards/${id}/status`, { status }),
  delete: (id) => api.delete('/production/job-cards/' + id),
  generateAll: (woId) => api.post(`/production/job-cards/${woId}/generate-all`),
}

// Production Plans API
export const productionPlansAPI = {
  list: (params) => api.get('/production/plans', { params }),
  get: (id) => api.get(`/production/plans/${id}`),
  create: (data) => api.post('/production/plans', data),
  update: (id, data) => api.put(`/production/plans/${id}`, data),
  delete: (id) => api.delete(`/production/plans/${id}`),
  createWorkOrders: (id) => api.post(`/production-planning/${id}/create-work-orders`),
}

// Production Entries API
export const productionEntriesAPI = {
  list: (params) => api.get('/production/entries', { params }),
  get: (id) => api.get(`/production/entries/${id}`),
  create: (data) => api.post('/production/entries', data),
}

// Workstations API
export const workstationsAPI = {
  list: (params) => api.get('/production/workstations', { params }),
  get: (id) => api.get(`/production/workstations/${id}`),
  create: (data) => api.post('/production/workstations', data),
  update: (id, data) => api.put(`/production/workstations/${id}`, data),
  delete: (id) => api.delete(`/production/workstations/${id}`),
}

// Operations API
export const operationsAPI = {
  list: (params) => api.get('/production/operations', { params }),
  create: (data) => api.post('/production/operations', data),
  update: (id, data) => api.put(`/production/operations/${id}`, data),
  delete: (id) => api.delete(`/production/operations/${id}`),
}

// Rejections API
export const rejectionsAPI = {
  list: (params) => api.get('/production/rejections', { params }),
  create: (data) => api.post('/production/rejections', data),
  delete: (id) => api.delete(`/production/rejections/${id}`),
}

// Downtimes API
export const downtimesAPI = {
  list: (params) => api.get('/production/downtimes', { params }),
  create: (data) => api.post('/production/downtimes', data),
  delete: (id) => api.delete(`/production/downtimes/${id}`),
}

// Time Logs API
export const timeLogsAPI = {
  list: (params) => api.get('/production/time-logs', { params }),
  create: (data) => api.post('/production/time-logs', data),
  delete: (id) => api.delete(`/production/time-logs/${id}`),
}

// Company Info API
export const companyAPI = {
  get: () => api.get('/company-info'),
}

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
}

export default api
