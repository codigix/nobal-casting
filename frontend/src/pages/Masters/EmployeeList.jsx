import { useState, useEffect } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Input from '../../components/Input/Input'
import Badge from '../../components/Badge/Badge'
import Modal, { useModal } from '../../components/Modal/Modal'
import Alert from '../../components/Alert/Alert'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../../components/Table/Table'
import DataTable from '../../components/Table/DataTable'
import AdvancedFilters from '../../components/AdvancedFilters'
import { employeesAPI } from '../../services/api'

export default function EmployeeList() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    department: ''
  })
  
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    department: '',
    designation: '',
    branch: '',
    reports_to: '',
    employee_number: '',
    date_of_joining: '',
    offer_date: '',
    confirmation_date: '',
    notice_period_days: '',
    contract_end_date: '',
    date_of_retirement: '',
    is_active: true
  })
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')

  const addModal = useModal()
  const editModal = useModal()
  const deleteModal = useModal()
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await employeesAPI.list()
      setEmployees(response.data.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch employees')
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterConfig = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Employee name, email, or ID...'
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: '', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    },
    {
      key: 'department',
      label: 'Department',
      type: 'select',
      options: [
        { value: '', label: 'All Departments' },
        { value: 'Buying', label: 'Buying' },
        { value: 'Selling', label: 'Selling' },
        { value: 'Production', label: 'Production' },
        { value: 'Inventory', label: 'Inventory' },
        { value: 'HR', label: 'HR' },
        { value: 'Finance', label: 'Finance' }
      ]
    }
  ]

  const columns = [
    {
      key: 'first_name',
      label: 'Name',
      width: '20%',
      render: (val, row) => {
        const fullName = [row.first_name, row.middle_name, row.last_name]
          .filter(Boolean)
          .join(' ') || '-'
        return fullName
      }
    },
    {
      key: 'email',
      label: 'Email',
      width: '20%',
      render: (val) => val ? <span className="font-mono text-sm">{val}</span> : '-'
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '15%',
      render: (val) => val || '-'
    },
    {
      key: 'department',
      label: 'Department',
      width: '15%',
      render: (val) => val || '-'
    },
    {
      key: 'designation',
      label: 'Designation',
      width: '15%',
      render: (val) => val || '-'
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (val) => {
        const isActive = val === 'active'
        return (
          <Badge variant={isActive ? 'success' : 'warning'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      }
    }
  ]

  const getFilteredEmployees = () => {
    return employees.filter(employee => {
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const fullName = [employee.first_name, employee.middle_name, employee.last_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        const matchesSearch = 
          fullName.includes(search) ||
          employee.email?.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      if (filters.status) {
        if (employee.status !== filters.status) return false
      }

      if (filters.department && employee.department !== filters.department) return false

      return true
    })
  }

  const filteredEmployees = getFilteredEmployees()

  const renderActions = (employee) => (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          handleEditClick(employee)
        }}
      >
        Edit
      </Button>
      <Button
        variant="danger"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          handleDeleteClick(employee)
        }}
      >
        Delete
      </Button>
    </div>
  )

  const handleResetForm = () => {
    setFormData({
      first_name: '',
      middle_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      gender: '',
      department: '',
      designation: '',
      branch: '',
      reports_to: '',
      employee_number: '',
      date_of_joining: '',
      offer_date: '',
      confirmation_date: '',
      notice_period_days: '',
      contract_end_date: '',
      date_of_retirement: '',
      is_active: true
    })
    setEditingId(null)
    setFormError('')
  }

  const handleAddClick = () => {
    handleResetForm()
    addModal.open()
  }

  const handleEditClick = (employee) => {
    setFormData({
      first_name: employee.first_name || '',
      middle_name: employee.middle_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      date_of_birth: employee.date_of_birth || '',
      gender: employee.gender || '',
      department: employee.department || '',
      designation: employee.designation || '',
      branch: employee.branch || '',
      reports_to: employee.reports_to || '',
      employee_number: employee.employee_number || '',
      date_of_joining: employee.joining_date || '',
      offer_date: employee.offer_date || '',
      confirmation_date: employee.confirmation_date || '',
      notice_period_days: employee.notice_period_days || '',
      contract_end_date: employee.contract_end_date || '',
      date_of_retirement: employee.date_of_retirement || '',
      is_active: employee.status === 'active'
    })
    setEditingId(employee.employee_id)
    editModal.open()
  }

  const handleDeleteClick = (employee) => {
    setSelectedEmployee(employee)
    deleteModal.open()
  }

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      setFormError('First name is required')
      return false
    }
    if (!formData.email.trim()) {
      setFormError('Email is required')
      return false
    }
    if (!formData.department.trim()) {
      setFormError('Department is required')
      return false
    }
    if (!formData.designation.trim()) {
      setFormError('Designation is required')
      return false
    }
    if (!formData.date_of_joining.trim()) {
      setFormError('Date of Joining is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setFormError('')
      const submitData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        department: formData.department,
        designation: formData.designation,
        joining_date: formData.date_of_joining,
        status: formData.is_active ? 'active' : 'inactive'
      }
      
      if (editingId) {
        await employeesAPI.update(editingId, submitData)
        setSuccess('Employee updated successfully')
        editModal.close()
      } else {
        await employeesAPI.create(submitData)
        setSuccess('Employee created successfully')
        addModal.close()
      }

      handleResetForm()
      fetchEmployees()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setFormError(err.response?.data?.message || err.response?.data?.error || 'Failed to save employee')
      console.error('Error saving employee:', err)
    }
  }

  const handleConfirmDelete = async () => {
    try {
      await employeesAPI.delete(selectedEmployee.employee_id)
      setSuccess('Employee deleted successfully')
      deleteModal.close()
      setSelectedEmployee(null)
      fetchEmployees()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete employee')
      deleteModal.close()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-[var(--text-secondary)] font-medium">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {success && (
        <Alert variant="success" className="mb-6">
          {success}
        </Alert>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Employees</h2>
          <Button variant="primary" onClick={handleAddClick}>
            + Add New Employee
          </Button>
        </div>
        <p className="text-[var(--text-secondary)]">Manage employee database with advanced filtering and search</p>
      </div>

      <div className="mb-6">
        <AdvancedFilters
          filters={filters}
          onFilterChange={setFilters}
          filterConfig={filterConfig}
          onReset={() => setFilters({ search: '', status: '', department: '' })}
          showPresets={true}
        />
      </div>

      <Card>
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)] text-lg mb-4">No employees found</p>
            <p className="text-[var(--text-secondary)] text-sm mb-4">Try adjusting your filters or create a new employee</p>
            <Button variant="primary" size="sm" onClick={handleAddClick}>
              Create First Employee
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredEmployees}
            renderActions={renderActions}
            sortable={true}
            filterable={true}
            pageSize={10}
          />
        )}
      </Card>

      <Modal
        isOpen={addModal.isOpen}
        onClose={() => {
          addModal.close()
          handleResetForm()
        }}
        title="Add New Employee"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              addModal.close()
              handleResetForm()
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Create Employee
            </Button>
          </>
        }
      >
        <EmployeeForm formData={formData} setFormData={setFormData} formError={formError} />
      </Modal>

      <Modal
        isOpen={editModal.isOpen}
        onClose={() => {
          editModal.close()
          handleResetForm()
        }}
        title="Edit Employee"
        footer={
          <>
            <Button variant="secondary" onClick={() => {
              editModal.close()
              handleResetForm()
            }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Update Employee
            </Button>
          </>
        }
      >
        <EmployeeForm formData={formData} setFormData={setFormData} formError={formError} />
      </Modal>

      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        title="Delete Employee"
        footer={
          <>
            <Button variant="secondary" onClick={deleteModal.close}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-neutral-700">
          Are you sure you want to delete <strong>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  )
}

function EmployeeForm({ formData, setFormData, formError }) {
  return (
    <div className="space-y-6 max-h-96 overflow-y-auto">
      {formError && (
        <Alert variant="danger">{formError}</Alert>
      )}

      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name *"
            placeholder="e.g., John"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          />

          <Input
            label="Middle Name"
            placeholder="e.g., Michael"
            value={formData.middle_name}
            onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
          />

          <Input
            label="Last Name"
            placeholder="e.g., Doe"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          />

          <Input
            label="Email *"
            type="email"
            placeholder="e.g., john@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Phone"
            placeholder="e.g., +1-234-567-8900"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <Input
            label="Date of Birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
          />

          <div className="form-group">
            <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">Gender</label>
            <select
              className="input-base"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Company Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="block mb-2 text-sm font-medium text-[var(--text-primary)]">Department *</label>
            <select
              className="input-base"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="">Select a department</option>
              <option value="Buying">Buying</option>
              <option value="Selling">Selling</option>
              <option value="Production">Production</option>
              <option value="Inventory">Inventory</option>
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
            </select>
          </div>

          <Input
            label="Designation *"
            placeholder="e.g., Manager"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
          />

          <Input
            label="Branch"
            placeholder="e.g., Main Branch"
            value={formData.branch}
            onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
          />

          <Input
            label="Reports To"
            placeholder="e.g., Manager Name"
            value={formData.reports_to}
            onChange={(e) => setFormData({ ...formData, reports_to: e.target.value })}
          />

          <Input
            label="Employee Number"
            placeholder="e.g., EMP-001"
            value={formData.employee_number}
            onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
          />
        </div>
      </div>

      <div className="border-b pb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Joining Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date of Joining *"
            type="date"
            value={formData.date_of_joining}
            onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
          />

          <Input
            label="Offer Date"
            type="date"
            value={formData.offer_date}
            onChange={(e) => setFormData({ ...formData, offer_date: e.target.value })}
          />

          <Input
            label="Confirmation Date"
            type="date"
            value={formData.confirmation_date}
            onChange={(e) => setFormData({ ...formData, confirmation_date: e.target.value })}
          />

          <Input
            label="Notice Period (days)"
            type="number"
            placeholder="e.g., 30"
            value={formData.notice_period_days}
            onChange={(e) => setFormData({ ...formData, notice_period_days: e.target.value })}
          />

          <Input
            label="Contract End Date"
            type="date"
            value={formData.contract_end_date}
            onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
          />

          <Input
            label="Date of Retirement"
            type="date"
            value={formData.date_of_retirement}
            onChange={(e) => setFormData({ ...formData, date_of_retirement: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-neutral-700">Active</span>
        </label>
      </div>
    </div>
  )
}
