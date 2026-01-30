import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react'
import axios from 'axios'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Badge from '../../components/Badge/Badge'

const STAGE_DEFAULTS = [
  { stage_code: 'PLAN', stage_name: 'Planning', stage_sequence: 1, description: 'Project planning and resource allocation' },
  { stage_code: 'DESIGN', stage_name: 'Design & BOM Creation', stage_sequence: 2, description: 'Design and BOM preparation' },
  { stage_code: 'WO', stage_name: 'Work Order Creation', stage_sequence: 3, description: 'Work order and material request' },
  { stage_code: 'EXEC', stage_name: 'Job Card Execution', stage_sequence: 4, description: 'Manufacturing and operation execution' },
  { stage_code: 'QC', stage_name: 'QC & Verification', stage_sequence: 5, description: 'Quality check and verification' },
  { stage_code: 'DELIVER', stage_name: 'Delivery', stage_sequence: 6, description: 'Product delivery' }
]

export default function ProductionStages() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    stage_code: '',
    stage_name: '',
    stage_sequence: '',
    description: '',
    is_active: true
  })
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchStages()
  }, [])

  const fetchStages = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/production-stages`)
      if (response.data.success) {
        setStages(response.data.data || [])
        setError(null)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load production stages')
      setStages([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      stage_code: '',
      stage_name: '',
      stage_sequence: '',
      description: '',
      is_active: true
    })
    setEditingId(null)
    setShowModal(false)
  }

  const handleOpenModal = (stage = null) => {
    if (stage) {
      setFormData(stage)
      setEditingId(stage.id)
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      if (!formData.stage_code || !formData.stage_name || !formData.stage_sequence) {
        setError('Please fill all required fields')
        return
      }

      const url = editingId 
        ? `${import.meta.env.VITE_API_URL}/production-stages/${editingId}`
        : `${import.meta.env.VITE_API_URL}/production-stages`
      
      const method = editingId ? 'put' : 'post'
      const response = await axios[method](url, formData)

      if (response.data.success) {
        setSuccess(editingId ? 'Stage updated successfully' : 'Stage created successfully')
        setTimeout(() => setSuccess(null), 3000)
        resetForm()
        fetchStages()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save stage')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this stage?')) return

    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/production-stages/${id}`)
      if (response.data.success) {
        setSuccess('Stage deleted successfully')
        setTimeout(() => setSuccess(null), 3000)
        fetchStages()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete stage')
    }
  }

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create the default 6-stage production workflow. Continue?')) return

    try {
      setLoading(true)
      for (const stage of STAGE_DEFAULTS) {
        try {
          await axios.post(`${import.meta.env.VITE_API_URL}/production-stages`, stage)
        } catch (err) {
          if (!err.response?.data?.error?.includes('already exists')) {
            throw err
          }
        }
      }
      setSuccess('Default stages initialized successfully')
      setTimeout(() => setSuccess(null), 3000)
      fetchStages()
    } catch (err) {
      setError('Failed to initialize default stages')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6  py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl  text-gray-900">Production Stages</h1>
            <p className="text-xs text-gray-600 mt-1">Define production workflow stages</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleInitializeDefaults}
              className="p-2 bg-blue-50 text-blue-600 rounded-xs border border-blue-200 hover:bg-blue-100 transition text-xs font-medium"
            >
              Load Defaults
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2 bg-gradient-to-br from-blue-400 to-blue-600"
            >
              <Plus size={16} /> New Stage
            </button>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Loading stages...</div>
          </div>
        ) : stages.length === 0 ? (
          <Card className="p-3 text-center">
            <AlertCircle className="mx-auto mb-3 text-gray-400" size={32} />
            <p className="text-gray-600 mb-4">No production stages defined</p>
            <button 
              onClick={handleInitializeDefaults}
              className="p-2 bg-blue-500 text-white rounded-xs hover:bg-blue-600 transition"
            >
              Create Default Stages
            </button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {stages.sort((a, b) => a.stage_sequence - b.stage_sequence).map(stage => (
              <Card key={stage.id} className="p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center  text-blue-600 text-xs">
                        {stage.stage_sequence}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{stage.stage_name}</h3>
                        <p className="text-xs text-gray-600 mt-0.5">{stage.description || 'No description'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge text={stage.stage_code} color="blue" />
                          {stage.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600">
                              <CheckCircle size={14} /> Active
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(stage)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-xs transition"
                      title="Edit stage"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(stage.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-xs transition"
                      title="Delete stage"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50p-2">
            <Card className="w-full max-w-md">
              <div className="flex justify-between items-centerp-2 border-b">
                <h2 className="text-lg ">
                  {editingId ? 'Edit Stage' : 'New Production Stage'}
                </h2>
                <button 
                  onClick={resetForm}
                  className="p-1 hover:bg-gray-100 rounded-xs transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs  text-gray-700 mb-1">
                    Stage Code *
                  </label>
                  <input 
                    type="text"
                    value={formData.stage_code}
                    onChange={(e) => setFormData({ ...formData, stage_code: e.target.value.toUpperCase() })}
                    className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., PLAN"
                  />
                </div>

                <div>
                  <label className="block text-xs  text-gray-700 mb-1">
                    Stage Name *
                  </label>
                  <input 
                    type="text"
                    value={formData.stage_name}
                    onChange={(e) => setFormData({ ...formData, stage_name: e.target.value })}
                    className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Planning"
                  />
                </div>

                <div>
                  <label className="block text-xs  text-gray-700 mb-1">
                    Sequence *
                  </label>
                  <input 
                    type="number"
                    value={formData.stage_sequence}
                    onChange={(e) => setFormData({ ...formData, stage_sequence: parseInt(e.target.value) || '' })}
                    className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-xs  text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-2  py-2 border border-gray-300 rounded-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows="3"
                    placeholder="Stage description..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="text-xs font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-2p-2 border-t">
                <button 
                  onClick={resetForm}
                  className="flex-1 p-2 text-gray-700 bg-gray-100 rounded-xs hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 p-2 bg-blue-500 text-white rounded-xs hover:bg-blue-600 transition font-medium"
                >
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
