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
}

// Health check
export const healthAPI = {
  check: () => api.get('/health'),
}

export default api
