import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Plus, Edit2, Trash2, FolderOpen, Search, 
  Settings2, X, Activity, RefreshCw, ChevronRight,
  Layout, Grid3x3, List as ListIcon, Database, Info,
  Box, Tag, AlertTriangle
} from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import DataTable from '../../components/Table/DataTable'
import Button from '../../components/Button/Button'
import Alert from '../../components/Alert/Alert'
import Card from '../../components/Card/Card'
import Modal from '../../components/Modal/Modal'

export default function ItemGroups() {
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshTime, setRefreshTime] = useState(new Date())
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const fetchItemGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/item-groups')
      if (response.data.success) {
        setGroups(response.data.data || [])
      }
      setRefreshTime(new Date())
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch item groups')
      toast.addToast('Error fetching item groups', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchItemGroups()
  }, [fetchItemGroups])

  const handleOpenForm = (group = null) => {
    if (group) {
      setEditingGroup(group)
      setFormData({
        name: group.name || '',
        description: group.description || ''
      })
    } else {
      setEditingGroup(null)
      setFormData({
        name: '',
        description: ''
      })
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingGroup(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.addToast('Group name is required', 'warning')
      return
    }

    try {
      setLoading(true)
      if (editingGroup) {
        await api.put(`/item-groups/${editingGroup.id}`, formData)
        toast.addToast('Item Group updated successfully', 'success')
      } else {
        await api.post('/item-groups', formData)
        toast.addToast('Item Group created successfully', 'success')
      }
      handleCloseForm()
      fetchItemGroups()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to save item group', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this item group?')) return
    
    try {
      await api.delete(`/item-groups/${groupId}`)
      toast.addToast('Item Group deleted successfully', 'success')
      fetchItemGroups()
    } catch (err) {
      toast.addToast(err.response?.data?.error || 'Failed to delete item group', 'error')
    }
  }

  const filteredGroups = useMemo(() => {
    return groups.filter(group => 
      !searchTerm || 
      group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [groups, searchTerm])

  const stats = useMemo(() => {
    const total = groups.length
    const withDescription = groups.filter(g => g.description).length
    const recent = groups.length // Logic can be improved if created_at is available
    
    return { total, withDescription, recent }
  }, [groups])

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Group Name',
      render: (val) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Tag size={16} />
          </div>
          <span className=" text-slate-900 dark:text-white  tracking-wider">{val}</span>
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      render: (val) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">{val || '—'}</span>
      )
    }
  ], [])

  const StatCard = ({ label, value, icon: Icon, color, description }) => {
    const colorMap = {
      primary: 'from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400',
      success: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400',
      indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400'
    }
    
    return (
      <Card className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} p-4 border-2 transition-all hover:shadow-lg`}>
        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[10px]   tracking-widest text-slate-500 dark:text-slate-400">{label}</span>
            <p className="text-2xl font-black mt-1 text-slate-900 dark:text-white">{value}</p>
            {description && <p className="text-[10px] mt-1 text-slate-400 dark:text-slate-500">{description}</p>}
          </div>
          <div className="p-2 rounded  bg-white dark:bg-slate-900 shadow-sm border border-inherit">
            <Icon size={20} className="text-inherit" />
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-950 min-h-screen p-4 transition-colors duration-300">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded  shadow-lg shadow-indigo-600/20">
              <FolderOpen className="text-white" size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs  text-indigo-600 dark:text-indigo-400  tracking-widest">
                <span>Buying</span>
                <ChevronRight size={12} />
                <span>Classification</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Item Groups</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categorize items for better management and reporting</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={fetchItemGroups}
              className="p-3 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded  transition-all border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <Button 
              onClick={() => handleOpenForm()}
              variant="primary"
              className="flex items-center gap-2 px-6 py-2.5 rounded  text-xs font-black shadow  shadow-indigo-600/20 transition-all bg-indigo-600 hover:bg-indigo-700 border-none"
            >
              <Plus size={18} strokeWidth={3} /> NEW GROUP
            </Button>
          </div>
        </div>

        {error && <Alert type="danger" className="rounded  border-2">{error}</Alert>}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Groups"
            value={stats.total}
            icon={FolderOpen}
            color="indigo"
            description="Active categories"
          />
          <StatCard
            label="Documented"
            value={stats.withDescription}
            icon={Info}
            color="success"
            description="Groups with descriptions"
          />
          <StatCard
            label="System Health"
            value="Active"
            icon={Activity}
            color="primary"
            description="Syncing correctly"
          />
        </div>

        {/* Toolbar & Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative group flex-1 md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded  text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all dark:text-white"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded  border border-indigo-100 dark:border-indigo-800">
                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400  tracking-tighter">Live Database</span>
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredGroups}
            loading={loading}
            className="border-none"
            rowClassName="group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors"
            renderActions={(row) => (
              <div className="flex items-center gap-2 justify-end pr-4">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => handleOpenForm(row)}
                  className="p-2 rounded  border shadow-sm bg-white dark:bg-slate-800"
                >
                  <Edit2 size={14} className="text-slate-600 dark:text-slate-400" />
                </Button>
                <Button 
                  size="sm" 
                  variant="danger" 
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(row.id)
                  }}
                  className="p-2 rounded  border-2 shadow-sm"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
          />
        </div>

        {/* Modal Form */}
        <Modal
          isOpen={showForm}
          onClose={handleCloseForm}
          title={editingGroup ? 'Edit Item Group' : 'Create New Group'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400  tracking-widest">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Raw Materials"
                className="w-full p-2  bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded  text-xs  focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all dark:text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400  tracking-widest">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe the purpose of this group..."
                rows="4"
                className="w-full p-2  bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded  text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all dark:text-white resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseForm}
                className="px-6 py-2.5 rounded  text-xs  border-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="px-8 py-2.5 rounded  text-xs font-black shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 border-none"
              >
                {loading ? 'Processing...' : (editingGroup ? 'Update Group' : 'Create Group')}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}
