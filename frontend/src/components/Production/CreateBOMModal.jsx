import React, { useState, useEffect } from 'react'
import api, { itemsAPI, bomAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import { 
  Plus, X, Edit, Trash2, Package, Settings, 
  Recycle, Info, Globe, Layers, ListChecks,
  CheckCircle2, AlertTriangle, IndianRupee, Clock,
  History, Hammer, FlaskConical, ClipboardList
} from 'lucide-react'

export default function CreateBOMModal({ isOpen, onClose, onSuccess, editingId }) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [activeTab, setActiveTab] = useState('production-item')
  
  const [formData, setFormData] = useState({
    bom_id: '',
    item_code: '',
    product_name: '',
    quantity: 1,
    uom: 'Kg',
    status: 'draft',
    revision: 1,
    description: '',
    is_active: true,
    is_default: false,
    allow_alternative_item: false,
    auto_sub_assembly_rate: false,
    project: '',
    cost_rate_based_on: 'Valuation Rate',
    currency: 'INR',
    with_operations: false,
    process_loss_percentage: 0,
    lines: [],
    operations: [],
    scrapItems: []
  })

  // Local state for new entries
  const [newLine, setNewLine] = useState({
    component_code: '',
    component_name: '',
    qty: 1,
    uom: 'Kg',
    type: 'raw-material',
    notes: ''
  })
  const [newOperation, setNewOperation] = useState({
    operation_name: '',
    workstation_type: '',
    operation_time: 0,
    fixed_time: 0,
    operating_cost: 0,
    notes: ''
  })
  const [newScrapItem, setNewScrapItem] = useState({
    item_code: '',
    item_name: '',
    quantity: 0,
    rate: 0
  })

  useEffect(() => {
    if (isOpen) {
      initializeModal()
    }
  }, [isOpen, editingId])

  const initializeModal = async () => {
    setFetchingData(true)
    setError(null)
    try {
      const itemsRes = await itemsAPI.list()
      setItems(itemsRes.data.data || itemsRes.data || [])
      
      if (editingId) {
        const bomRes = await bomAPI.get(editingId)
        if (bomRes.data.success) {
          setFormData({
            ...bomRes.data.data,
            lines: bomRes.data.data.lines || [],
            operations: bomRes.data.data.operations || [],
            scrapItems: bomRes.data.data.scrapItems || []
          })
        }
      }
    } catch (err) {
      console.error('Failed to initialize BOM modal:', err)
      setError('Failed to load initial data')
    } finally {
      setFetchingData(false)
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

  // BOM Lines Management
  const addBomLine = () => {
    if (!newLine.component_code || newLine.qty <= 0) {
      setError('Please select a component and enter quantity')
      return
    }
    const item = items.find(i => i.item_code === newLine.component_code)
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { ...newLine, component_name: item?.item_name || '', id: Date.now() }]
    }))
    setNewLine({ component_code: '', component_name: '', qty: 1, uom: 'Kg', type: 'raw-material', notes: '' })
  }

  const removeBomLine = (id) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter(l => l.id !== id)
    }))
  }

  // Operations Management
  const addOperation = () => {
    if (!newOperation.operation_name) {
      setError('Please enter operation name')
      return
    }
    setFormData(prev => ({
      ...prev,
      operations: [...prev.operations, { ...newOperation, id: Date.now() }]
    }))
    setNewOperation({ operation_name: '', workstation_type: '', operation_time: 0, fixed_time: 0, operating_cost: 0, notes: '' })
  }

  const removeOperation = (id) => {
    setFormData(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== id)
    }))
  }

  // Scrap Management
  const addScrapItem = () => {
    if (!newScrapItem.item_code || newScrapItem.quantity <= 0) {
      setError('Please select item and quantity')
      return
    }
    const item = items.find(i => i.item_code === newScrapItem.item_code)
    setFormData(prev => ({
      ...prev,
      scrapItems: [...prev.scrapItems, { ...newScrapItem, item_name: item?.item_name || '', id: Date.now() }]
    }))
    setNewScrapItem({ item_code: '', item_name: '', quantity: 0, rate: 0 })
  }

  const removeScrapItem = (id) => {
    setFormData(prev => ({
      ...prev,
      scrapItems: prev.scrapItems.filter(s => s.id !== id)
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.item_code || formData.lines.length === 0) {
      setError('Item code and at least one component are required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = editingId 
        ? await bomAPI.update(editingId, formData) 
        : await bomAPI.create(formData)
      
      if (res.data.success) {
        onSuccess?.()
        onClose()
      } else {
        throw new Error(res.data.error || 'Failed to save BOM')
      }
    } catch (err) {
      setError(err.message || 'Failed to save BOM')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'production-item', label: 'BOM Details', icon: Package },
    { id: 'components', label: 'Components', icon: ListChecks },
    { id: 'operations', label: 'Operations', icon: Settings },
    { id: 'scrap', label: 'Scrap & Loss', icon: Recycle },
    { id: 'advanced', label: 'Advanced', icon: Layers }
  ]

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingId ? `Edit BOM: ${formData.bom_id}` : "Create New BOM"} 
      size="5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}

        {/* Custom Tab Navigation */}
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-all border-b-2 ${
                activeTab === tab.id 
                ? "border-blue-500 text-blue-600 bg-blue-50/30" 
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
              {tab.id === 'components' && formData.lines.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px]">
                  {formData.lines.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[450px]">
          {/* BOM Details Tab */}
          {activeTab === 'production-item' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight pb-2 border-b border-slate-200">
                    <FlaskConical size={18} className="text-blue-500" />
                    Core Product
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Production Item *</label>
                      <select
                        name="item_code"
                        value={formData.item_code}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                      >
                        <option value="">Select Finished Good / Sub-Assembly</option>
                        {items.map(i => (
                          <option key={i.item_code} value={i.item_code}>{i.item_name} ({i.item_code})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Production Qty *</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        step="0.01"
                        required
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UOM</label>
                      <input
                        type="text"
                        name="uom"
                        value={formData.uom}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight pb-2 border-b border-slate-200">
                    <ClipboardList size={18} className="text-blue-500" />
                    Additional Metadata
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide a detailed description of this version of the BOM..."
                    rows="4"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 space-y-4">
                  <div className="flex items-center gap-2 text-blue-800 font-bold uppercase tracking-tight pb-2 border-b border-blue-200">
                    <History size={18} />
                    Status & Version
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Lifecycle Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm outline-none"
                      >
                        <option value="draft">Draft (Development)</option>
                        <option value="active">Active (Production Ready)</option>
                        <option value="inactive">Inactive (Obsolete)</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700">Revision</label>
                      <input
                        type="number"
                        name="revision"
                        value={formData.revision}
                        onChange={handleInputChange}
                        className="w-20 px-2 py-1 text-center border border-blue-200 rounded-lg font-bold text-blue-600 outline-none"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-blue-200">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            name="is_active" 
                            checked={formData.is_active} 
                            onChange={handleInputChange}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Active BOM</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            name="is_default" 
                            checked={formData.is_default} 
                            onChange={handleInputChange}
                            className="peer sr-only"
                          />
                          <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600">Default BOM</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Component</label>
                  <select
                    value={newLine.component_code}
                    onChange={(e) => setNewLine({...newLine, component_code: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                  >
                    <option value="">Select Material</option>
                    {items.map(i => (
                      <option key={i.item_code} value={i.item_code}>{i.item_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newLine.qty}
                    onChange={(e) => setNewLine({...newLine, qty: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UOM</label>
                  <input
                    type="text"
                    value={newLine.uom}
                    onChange={(e) => setNewLine({...newLine, uom: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Type</label>
                  <select
                    value={newLine.type}
                    onChange={(e) => setNewLine({...newLine, type: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                  >
                    <option value="raw-material">Raw Material</option>
                    <option value="sub-assembly">Sub-Assembly</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </div>
                <Button type="button" onClick={addBomLine} variant="primary" className="h-10" icon={Plus}>Add</Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-3 text-left">Component</th>
                      <th className="px-6 py-3 text-center">Type</th>
                      <th className="px-6 py-3 text-center">Qty</th>
                      <th className="px-6 py-3 text-center">UOM</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.lines.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No components added. At least one is required.</td>
                      </tr>
                    ) : (
                      formData.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{line.component_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{line.component_code}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Badge variant={line.type === 'sub-assembly' ? 'blue' : 'gray'}>{line.type}</Badge>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{line.qty}</td>
                          <td className="px-6 py-4 text-center text-slate-500">{line.uom}</td>
                          <td className="px-6 py-4 text-right">
                            <button type="button" onClick={() => removeBomLine(line.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Operations Tab */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center gap-3 mb-4">
                <AlertTriangle size={18} className="text-blue-500" />
                <p className="text-xs text-blue-800">
                  Enable <strong>"With Operations"</strong> in Advanced tab to include these in costing and production planning.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Operation Name</label>
                  <input
                    type="text"
                    value={newOperation.operation_name}
                    onChange={(e) => setNewOperation({...newOperation, operation_name: e.target.value})}
                    placeholder="e.g. Casting, Grinding, Polishing"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Time (Mins)</label>
                  <input
                    type="number"
                    value={newOperation.operation_time}
                    onChange={(e) => setNewOperation({...newOperation, operation_time: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none"
                  />
                </div>
                <Button type="button" onClick={addOperation} variant="primary" className="h-10" icon={Plus}>Add Operation</Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Step / Operation</th>
                      <th className="px-6 py-3 text-center">Workstation</th>
                      <th className="px-6 py-3 text-center">Time</th>
                      <th className="px-6 py-3 text-right">Cost (Est)</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.operations.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">No manufacturing operations defined.</td>
                      </tr>
                    ) : (
                      formData.operations.map((op, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-[10px]">{idx + 1}</span>
                            {op.operation_name}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-500">{op.workstation_type || 'General'}</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700">{op.operation_time} m</td>
                          <td className="px-6 py-4 text-right text-green-600 font-medium">₹{op.operating_cost || 0}</td>
                          <td className="px-6 py-4 text-right">
                            <button type="button" onClick={() => removeOperation(op.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Scrap Tab */}
          {activeTab === 'scrap' && (
            <div className="space-y-6">
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                    <FlaskConical size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-orange-800 uppercase tracking-tight">Process Loss Allowance</h4>
                    <p className="text-xs text-orange-600 opacity-80">Define expected material loss during the production process.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="process_loss_percentage"
                    value={formData.process_loss_percentage}
                    onChange={handleInputChange}
                    className="w-20 px-3 py-2 border border-orange-200 rounded-lg text-center font-bold text-orange-700 outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="font-bold text-orange-800">%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Scrap Item</label>
                  <select
                    value={newScrapItem.item_code}
                    onChange={(e) => setNewScrapItem({...newScrapItem, item_code: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                  >
                    <option value="">Select Scrap Item</option>
                    {items.map(i => (
                      <option key={i.item_code} value={i.item_code}>{i.item_name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  placeholder="Qty"
                  value={newScrapItem.quantity}
                  onChange={(e) => setNewScrapItem({...newScrapItem, quantity: e.target.value})}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                />
                <Button type="button" onClick={addScrapItem} variant="primary" className="h-10" icon={Plus}>Add Scrap</Button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Scrap Material</th>
                      <th className="px-6 py-3 text-center">Expected Qty</th>
                      <th className="px-6 py-3 text-right">Recovery Rate</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.scrapItems.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400 italic">No expected scrap items defined.</td>
                      </tr>
                    ) : (
                      formData.scrapItems.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-900">{s.item_name}</td>
                          <td className="px-6 py-4 text-center font-bold text-orange-600">{s.quantity}</td>
                          <td className="px-6 py-4 text-right text-slate-500">₹{s.rate || 0}</td>
                          <td className="px-6 py-4 text-right">
                            <button type="button" onClick={() => removeScrapItem(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight pb-2 border-b border-slate-200">
                  <Hammer size={18} className="text-blue-500" />
                  Manufacturing Rules
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" name="with_operations" checked={formData.with_operations} onChange={handleInputChange} className="mt-1" />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">With Operations</span>
                      <span className="text-[10px] text-slate-400 leading-tight block">Include workstations and time-based costing in this BOM.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" name="allow_alternative_item" checked={formData.allow_alternative_item} onChange={handleInputChange} className="mt-1" />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Allow Alternative Items</span>
                      <span className="text-[10px] text-slate-400 leading-tight block">Permit the use of substitutes if primary components are out of stock.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" name="auto_sub_assembly_rate" checked={formData.auto_sub_assembly_rate} onChange={handleInputChange} className="mt-1" />
                    <div>
                      <span className="block text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Auto-Calc Sub-Assembly Rate</span>
                      <span className="text-[10px] text-slate-400 leading-tight block">Recalculate component costs based on their respective BOMs.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-tight pb-2 border-b border-slate-200">
                  <IndianRupee size={18} className="text-blue-500" />
                  Costing Settings
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costing Method</label>
                    <select
                      name="cost_rate_based_on"
                      value={formData.cost_rate_based_on}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    >
                      <option value="Valuation Rate">Valuation Rate (Store Avg)</option>
                      <option value="Standard Rate">Standard Rate (Fixed)</option>
                      <option value="Average Rate">Moving Average Rate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project Linkage</label>
                    <input
                      type="text"
                      name="project"
                      value={formData.project}
                      onChange={handleInputChange}
                      placeholder="e.g. Project-2024-X"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading}
            icon={CheckCircle2}
          >
            {editingId ? "Update BOM" : "Create BOM"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
