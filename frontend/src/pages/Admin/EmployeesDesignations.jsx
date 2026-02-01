import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Users, Briefcase, Save, X } from 'lucide-react'
import * as productionService from '../../services/productionService'
import { useToast } from '../../components/ToastContainer'

export default function EmployeesDesignations() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('employees')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [employees, setEmployees] = useState([])
  const [designations, setDesignations] = useState([])
  const [searchEmployee, setSearchEmployee] = useState('')
  const [searchDesignation, setSearchDesignation] = useState('')

  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showDesignationForm, setShowDesignationForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [editingDesignation, setEditingDesignation] = useState(null)

  const [employeeFormData, setEmployeeFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    joining_date: '',
    is_active: true
  })

  const [designationFormData, setDesignationFormData] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees()
    } else {
      fetchDesignations()
    }
  }, [activeTab])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setEmployees(data.data || [])
        setError(null)
      } else {
        setError('Failed to fetch employees')
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err)
      setError('Failed to load employees')
    } finally {
      setLoading(false)
    }
  }

  const fetchDesignations = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/designations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setDesignations(data.data || [])
        setError(null)
      } else {
        setError('Failed to fetch designations')
      }
    } catch (err) {
      console.error('Failed to fetch designations:', err)
      setError('Failed to load designations')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setEmployeeFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      designation: '',
      department: '',
      joining_date: new Date().toISOString().split('T')[0],
      is_active: true
    })
    setShowEmployeeForm(true)
  }

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee)
    setEmployeeFormData({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      designation: employee.designation || '',
      department: employee.department || '',
      joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : '',
      is_active: employee.status === 'active' || employee.is_active !== false
    })
    setShowEmployeeForm(true)
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    if (!employeeFormData.first_name || !employeeFormData.email) {
      toast.addToast('First name and email are required', 'error')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const method = editingEmployee ? 'PUT' : 'POST'
      const url = editingEmployee
        ? `${import.meta.env.VITE_API_URL}/hr/employees/${editingEmployee.employee_id || editingEmployee.id}`
        : `${import.meta.env.VITE_API_URL}/hr/employees`

      // Prepare data for backend (map is_active to status)
      const { is_active, ...rest } = employeeFormData
      const payload = {
        ...rest,
        status: is_active ? 'active' : 'inactive'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.addToast(editingEmployee ? 'Employee updated successfully' : 'Employee created successfully', 'success')
        setShowEmployeeForm(false)
        fetchEmployees()
      } else {
        throw new Error(data.message || 'Failed to save employee')
      }
    } catch (err) {
      console.error('Failed to save employee:', err)
      toast.addToast(err.message || 'Failed to save employee', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEmployee = async (employee) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/employees/${employee.employee_id || employee.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.addToast('Employee deleted successfully', 'success')
        fetchEmployees()
      } else {
        throw new Error('Failed to delete employee')
      }
    } catch (err) {
      console.error('Failed to delete employee:', err)
      toast.addToast(err.message || 'Failed to delete employee', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDesignation = () => {
    setEditingDesignation(null)
    setDesignationFormData({
      name: '',
      description: ''
    })
    setShowDesignationForm(true)
  }

  const handleEditDesignation = (designation) => {
    setEditingDesignation(designation)
    setDesignationFormData({
      name: designation.name || '',
      description: designation.description || ''
    })
    setShowDesignationForm(true)
  }

  const handleSaveDesignation = async (e) => {
    e.preventDefault()
    if (!designationFormData.name) {
      toast.addToast('Designation name is required', 'error')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const method = editingDesignation ? 'PUT' : 'POST'
      const id = editingDesignation?.designation_id || editingDesignation?.id || editingDesignation?.name
      const url = editingDesignation 
        ? `${import.meta.env.VITE_API_URL}/hr/designations/${encodeURIComponent(id)}`
        : `${import.meta.env.VITE_API_URL}/hr/designations`

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(designationFormData)
      })

      const data = await response.json()

      if (response.ok) {
        toast.addToast(editingDesignation ? 'Designation updated' : 'Designation created', 'success')
        setShowDesignationForm(false)
        fetchDesignations()
      } else {
        throw new Error(data.message || 'Failed to save designation')
      }
    } catch (err) {
      console.error('Failed to save designation:', err)
      toast.addToast(err.message || 'Failed to save designation', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDesignation = async (designation) => {
    if (!window.confirm('Are you sure you want to delete this designation?')) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const id = designation.designation_id || designation.id || designation.name
      const response = await fetch(`${import.meta.env.VITE_API_URL}/hr/designations/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        toast.addToast('Designation deleted successfully', 'success')
        fetchDesignations()
      } else {
        throw new Error(data.message || 'Failed to delete designation')
      }
    } catch (err) {
      console.error('Failed to delete designation:', err)
      toast.addToast(err.message || 'Failed to delete designation', 'error')
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
    emp.designation?.toLowerCase().includes(searchEmployee.toLowerCase())
  )

  const filteredDesignations = designations.filter(des =>
    des.name?.toLowerCase().includes(searchDesignation.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6  py-6">
      <div className=" mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xs bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg  ">
                👥
              </div>
              <div>
                <h1 className="text-xl  text-gray-900">Employees & Designations</h1>
                <p className="text-xs text-gray-600 mt-0">Manage employees and job designations</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 pl-4 bg-red-50 border-l-4 border-red-400 rounded text-xs text-red-800 flex gap-2">
            <span>✕</span>
            <span>{error}</span>
          </div>
        )}

        <div className="mb-4 bg-white rounded-xs  flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 p-2 font-medium flex items-center gap-2 justify-center transition ${
              activeTab === 'employees'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={18} />
            Employees
          </button>
          <button
            onClick={() => setActiveTab('designations')}
            className={`flex-1 p-2 font-medium flex items-center gap-2 justify-center transition ${
              activeTab === 'designations'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Briefcase size={18} />
            Designations
          </button>
        </div>

        {activeTab === 'employees' ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  placeholder="Search by name, email or designation..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddEmployee}
                className="p-2 bg-blue-600 text-white font-medium rounded-xs hover:bg-blue-700 flex items-center gap-2 transition text-xs"
              >
                <Plus size={16} /> Add Employee
              </button>
            </div>

            {showEmployeeForm && (
              <div className="mb-4 bg-white rounded-xs  p-2 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg  text-gray-900">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h3>
                  <button
                    onClick={() => setShowEmployeeForm(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveEmployee}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        value={employeeFormData.first_name}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={employeeFormData.last_name}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={employeeFormData.email}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={employeeFormData.phone}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Designation</label>
                      <select
                        value={employeeFormData.designation}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, designation: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Designation</option>
                        {designations.map(des => (
                          <option key={des.designation_id || des.id || des.name} value={des.name || des.designation_id || des.id}>
                            {des.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Department</label>
                      <select
                        value={employeeFormData.department}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Department</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Sales">Sales</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs  text-gray-700 mb-1">Date of Joining</label>
                      <input
                        type="date"
                        value={employeeFormData.joining_date}
                        onChange={(e) => setEmployeeFormData(prev => ({ ...prev, joining_date: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={employeeFormData.is_active}
                          onChange={(e) => setEmployeeFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="rounded"
                        />
                        <span className="text-xs font-medium text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowEmployeeForm(false)}
                      className="p-2 border border-gray-300 text-gray-700 font-medium rounded-xs hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="p-2 bg-blue-600 text-white font-medium rounded-xs hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-2"
                    >
                      <Save size={16} />
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-xs p-3 text-center ">
                <div className="text-xl  mb-2">⏳</div>
                <div className="text-xs text-gray-600">Loading employees...</div>
              </div>
            ) : filteredEmployees.length > 0 ? (
              <div className="bg-white rounded-xs ">
                <div className="">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 text-left text-gray-700 font-semibold">Name</th>
                        <th className="p-2 text-left text-gray-700 font-semibold">Email</th>
                        <th className="p-2 text-left text-gray-700 font-semibold">Phone</th>
                        <th className="p-2 text-left text-gray-700 font-semibold">Designation</th>
                        <th className="p-2 text-left text-gray-700 font-semibold">Department</th>
                        <th className="p-2 text-center text-gray-700 font-semibold">Status</th>
                        <th className="p-2 text-center text-gray-700 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp, idx) => (
                        <tr key={emp.employee_id || emp.id} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-2 font-medium text-gray-900">
                            {emp.first_name} {emp.last_name}
                          </td>
                          <td className="p-2 text-gray-700">{emp.email || '-'}</td>
                          <td className="p-2 text-gray-700">{emp.phone || '-'}</td>
                          <td className="p-2 text-gray-700">{emp.designation || '-'}</td>
                          <td className="p-2 text-gray-700">{emp.department || '-'}</td>
                          <td className="p-2 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              emp.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {emp.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleEditEmployee(emp)}
                                title="Edit"
                                className="p-1 hover:bg-blue-50 rounded transition"
                              >
                                <Edit2 size={14} className="text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(emp)}
                                title="Delete"
                                className="p-1 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xs p-3 text-center ">
                <div className="text-xl  mb-2">📭</div>
                <div className="text-xs font-semibold  text-gray-900">
                  {searchEmployee ? 'No employees found' : 'No employees created yet'}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex-1 mr-4">
                <input
                  type="text"
                  placeholder="Search designations..."
                  value={searchDesignation}
                  onChange={(e) => setSearchDesignation(e.target.value)}
                  className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddDesignation}
                className="p-2 bg-blue-600 text-white font-medium rounded-xs hover:bg-blue-700 flex items-center gap-2 transition text-xs"
              >
                <Plus size={16} /> Add Designation
              </button>
            </div>

            {showDesignationForm && (
              <div className="mb-4 bg-white rounded-xs p-2 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg  text-gray-900">
                    {editingDesignation ? 'Edit Designation' : 'Add New Designation'}
                  </h3>
                  <button
                    onClick={() => setShowDesignationForm(false)}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveDesignation}>
                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Designation Name *</label>
                      <input
                        type="text"
                        value={designationFormData.name}
                        onChange={(e) => setDesignationFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-gray-700 mb-1">Description</label>
                      <textarea
                        value={designationFormData.description}
                        onChange={(e) => setDesignationFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows="3"
                        className="w-full p-2  py-2 border border-gray-300 rounded-xs text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDesignationForm(false)}
                      className="p-2 border border-gray-300 text-gray-700 font-medium rounded-xs hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="p-2 bg-blue-600 text-white font-medium rounded-xs hover:bg-blue-700 disabled:bg-gray-400 transition flex items-center gap-2"
                    >
                      <Save size={16} />
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="bg-white rounded-xs p-3 text-center ">
                <div className="text-xl  mb-2">⏳</div>
                <div className="text-xs text-gray-600">Loading designations...</div>
              </div>
            ) : filteredDesignations.length > 0 ? (
              <div className="bg-white rounded-xs ">
                <div className="">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="p-2 text-left text-gray-700 font-semibold">Name</th>
                        <th className="p-2 text-left text-gray-700 font-semibold">Description</th>
                        <th className="p-2 text-center text-gray-700 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDesignations.map((des, idx) => (
                        <tr key={des.designation_id || des.id || des.name} className={`border-b border-gray-200 hover:bg-gray-50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="p-2 font-medium text-gray-900">{des.name}</td>
                          <td className="p-2 text-gray-700">{des.description || '-'}</td>
                          <td className="p-2 text-center">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => handleEditDesignation(des)}
                                title="Edit"
                                className="p-1 hover:bg-blue-50 rounded transition"
                              >
                                <Edit2 size={14} className="text-blue-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteDesignation(des)}
                                title="Delete"
                                className="p-1 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 size={14} className="text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xs p-3 text-center ">
                <div className="text-xl  mb-2">📭</div>
                <div className="text-xs font-semibold  text-gray-900">
                  {searchDesignation ? 'No designations found' : 'No designations created yet'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
