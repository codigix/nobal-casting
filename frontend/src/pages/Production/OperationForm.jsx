import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Save, X, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import Card from '../../components/Card/Card'

export default function OperationForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [workstations, setWorkstations] = useState([])
  const [qualityTemplates, setQualityTemplates] = useState([])
  const [workstationDropdownOpen, setWorkstationDropdownOpen] = useState(false)
  const [workstationDropdownSearch, setWorkstationDropdownSearch] = useState('')
  const [workstationManualEntry, setWorkstationManualEntry] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    is_corrective_operation: false,
    default_workstation: '',
    create_job_card_based_on_batch_size: false,
    batch_size: 1,
    quality_inspection_template: '',
    description: '',
    hourly_rate: 0
  })

  const [subOperations, setSubOperations] = useState([
    { _key: `row_${Date.now()}`, no: 1, operation: '', operation_time: 0 }
  ])

  useEffect(() => {
    fetchWorkstations()
    if (id) {
      fetchOperationDetails(id)
    }
  }, [id])

  useEffect(() => {
    const handleClickOutside = () => {
      setWorkstationDropdownOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const fetchWorkstations = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/workstations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setWorkstations(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch workstations:', err)
    }
  }

  const fetchOperationDetails = async (opId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/production/operations/${opId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setFormData(data)
        if (data.sub_operations && data.sub_operations.length > 0) {
          setSubOperations(data.sub_operations.map((op, idx) => ({
            ...op,
            _key: op._key || `row_${idx}`,
            no: idx + 1
          })))
        }
      }
    } catch (err) {
      setError('Failed to load operation details')
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError(null)
  }

  const handleAddSubOperation = () => {
    const newRow = {
      _key: `row_${Date.now()}`,
      no: subOperations.length + 1,
      operation: '',
      operation_time: 0
    }
    setSubOperations([...subOperations, newRow])
  }

  const handleUpdateSubOperation = (index, field, value) => {
    const updated = [...subOperations]
    updated[index][field] = field === 'operation_time' ? parseFloat(value) || 0 : value
    setSubOperations(updated)
  }

  const handleRemoveSubOperation = (index) => {
    if (subOperations.length > 1) {
      const updated = subOperations.filter((_, i) => i !== index).map((op, idx) => ({
        ...op,
        no: idx + 1
      }))
      setSubOperations(updated)
    }
  }

  const getTotalOperationTime = () => {
    return subOperations.reduce((sum, op) => sum + (op.operation_time || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!formData.name.trim()) throw new Error('Operation name is required')

      const cleanSubOps = subOperations.map(({ _key, ...rest }) => rest)

      const token = localStorage.getItem('token')
      const response = await fetch(
        id ? `${import.meta.env.VITE_API_URL}/production/operations/${id}` : `${import.meta.env.VITE_API_URL}/production/operations`,
        {
          method: id ? 'PUT' : 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, sub_operations: cleanSubOps })
        }
      )

      if (response.ok) {
        setSuccess('Operation saved successfully! Redirecting...')
        setTimeout(() => navigate('/manufacturing/operations'), 1500)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save operation')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3  ">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded flex items-center justify-center text-white text-xl">
              ⚙️
            </div>
            <div>
              <h1 className="text-xl  text-gray-900">{id ? 'Edit Operation' : 'Create Operation'}</h1>
              <p className="text-gray-600 font-medium text-xs">{id ? 'Update operation details' : 'Define a new production operation'}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded flex gap-3">
            <AlertCircle className="text-red-500" />
            <div className="flex-1">
              <p className="text-red-800 ">Error</p>
              <p className="text-red-700 text-xs font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded flex gap-3">
            <CheckCircle className="text-green-500" />
            <div className="flex-1">
              <p className="text-green-800 ">Success</p>
              <p className="text-green-700 text-xs font-medium">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2">
          
          {/* Basic Information Section */}
          <div className="bg-white rounded  border border-gray-200 p-3  ">
            <h2 className="text-lg  text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600">📋</div>
              Basic Information
            </h2>
            
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Operation Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Assembly, Welding, Painting, Machining"
                  required
                  className="w-full p-2.5 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Default Workstation</label>
                  <div className="flex gap-2">
                    {!workstationManualEntry ? (
                      <div className="flex-1 relative bg-white">
                        <input 
                          type="text" 
                          value={workstationDropdownOpen ? workstationDropdownSearch : (workstations.find(ws => ws.name === formData.default_workstation)?.workstation_name || formData.default_workstation || '')}
                          onChange={(e) => {
                            setWorkstationDropdownSearch(e.target.value)
                            if (!workstationDropdownOpen) setWorkstationDropdownOpen(true)
                          }}
                          onFocus={() => setWorkstationDropdownOpen(true)}
                          placeholder="Select workstation"
                          onClick={(e) => {e.stopPropagation(); setWorkstationDropdownOpen(true)}}
                          className="w-full p-2.5 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                        {workstationDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-xs  max-h-60 overflow-y-auto z-50">
                            {workstations.filter(ws => 
                              ws.name.toLowerCase().includes(workstationDropdownSearch.toLowerCase()) ||
                              ws.workstation_name.toLowerCase().includes(workstationDropdownSearch.toLowerCase())
                            ).map(ws => (
                              <div 
                                key={ws.name}
                                onClick={() => {
                                  setFormData({...formData, default_workstation: ws.name})
                                  setWorkstationDropdownOpen(false)
                                  setWorkstationDropdownSearch('')
                                }}
                                className="p-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition"
                              >
                                <div className="font-medium text-gray-900 text-xs">{ws.name}</div>
                                <div className="text-xs text-gray-500">{ws.workstation_name || ''}</div>
                              </div>
                            ))}
                            {workstations.filter(ws => 
                              ws.name.toLowerCase().includes(workstationDropdownSearch.toLowerCase()) ||
                              ws.workstation_name.toLowerCase().includes(workstationDropdownSearch.toLowerCase())
                            ).length === 0 && (
                              <div className="p-2 text-center text-gray-500 text-xs">No workstations found</div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        name="default_workstation" 
                        value={formData.default_workstation} 
                        onChange={handleInputChange} 
                        placeholder="e.g., Lathe, Press" 
                        className="flex-1 p-2.5 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setWorkstationManualEntry(!workstationManualEntry)
                        setWorkstationDropdownOpen(false)
                      }}
                      className="p-2  py-2  border border-gray-300 rounded-xs bg-gray-50 hover:bg-gray-100 transition font-medium text-xs"
                    >
                      {workstationManualEntry ? '📋' : '✏️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="is_corrective_operation"
                      checked={formData.is_corrective_operation}
                      onChange={handleInputChange}
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition"
                    />
                    <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Corrective Operation</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-8 mt-1">Mark if this is a corrective/rework operation</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Hourly Rate</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="hourly_rate"
                      value={formData.hourly_rate}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full p-2.5 pl-8 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cost per hour for this operation</p>
                </div>
              </div>
            </div>
          </div>

          {/* Job Card Settings Section */}
          <div className="bg-white rounded  border border-gray-200 p-3  ">
            <h2 className="text-lg  text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-purple-600">📊</div>
              Job Card Settings
            </h2>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  name="create_job_card_based_on_batch_size"
                  checked={formData.create_job_card_based_on_batch_size}
                  onChange={handleInputChange}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition"
                />
                <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">Create Job Card based on Batch Size</span>
              </label>

              {formData.create_job_card_based_on_batch_size && (
                <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-100 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Batch Size <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="batch_size"
                      value={formData.batch_size}
                      onChange={handleInputChange}
                      min="1"
                      step="1"
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Quality Inspection Template</label>
                    <select
                      name="quality_inspection_template"
                      value={formData.quality_inspection_template}
                      onChange={handleInputChange}
                      className="w-full p-2.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    >
                      <option value="">Select Template (Optional)</option>
                      {qualityTemplates.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub Operations Section */}
          <div className="bg-white rounded  border border-gray-200 p-3  ">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg  text-gray-900 flex items-center gap-2">
                <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center text-green-600">⚡</div>
                Sub Operations
              </h2>
              <button
                type="button"
                onClick={handleAddSubOperation}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xs flex items-center gap-2 font-medium transition"
              >
                <Plus size={18} /> Add Step
              </button>
            </div>

            {subOperations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">📝</div>
                <p className="text-gray-600">No sub-operations added yet</p>
                <p className="text-gray-500 text-xs">Click "Add Step" to add your first sub-operation</p>
              </div>
            ) : (
              <div className="">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="p-2 text-left text-xs  text-gray-700 w-12">No.</th>
                      <th className="p-2 text-left text-xs  text-gray-700">Operation Step</th>
                      <th className="p-2 text-center text-xs  text-gray-700 w-32">Time (hrs)</th>
                      <th className="p-2 text-center text-xs  text-gray-700 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subOperations.map((row, idx) => (
                      <tr key={row._key} className="hover:bg-gray-50 transition">
                        <td className="p-2 text-center  text-gray-600">{row.no}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.operation}
                            onChange={(e) => handleUpdateSubOperation(idx, 'operation', e.target.value)}
                            placeholder="e.g., Cut, Grind, Weld, Assemble"
                            className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={row.operation_time}
                            onChange={(e) => handleUpdateSubOperation(idx, 'operation_time', e.target.value)}
                            min="0"
                            step="0.1"
                            placeholder="0.0"
                            className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-center text-xs"
                          />
                        </td>
                        <td className="p-2 text-center">
                          {subOperations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubOperation(idx)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-xs transition"
                              title="Delete row"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 p-3 bg-gray-50 rounded-xs text-xs">
                  <span className="text-gray-700">Total Operation Time: </span>
                  <span className=" text-blue-600">{getTotalOperationTime().toFixed(2)} hrs</span>
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="bg-white rounded  border border-gray-200 p-3  ">
            <h2 className="text-lg  text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-6 h-6 bg-yellow-100 rounded flex items-center justify-center text-yellow-600">📝</div>
              Description & Notes
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Details</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Detailed description of the operation, process notes, safety guidelines, equipment requirements, etc."
                rows={6}
                className="w-full p-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/manufacturing/operations')}
              className="p-6  py-2  border border-gray-300 text-gray-700 rounded-xs hover:bg-gray-50 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="p-6  py-2  bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-xs flex items-center gap-2 font-medium transition"
            >
              <Save size={18} /> {loading ? 'Saving...' : 'Save Operation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
