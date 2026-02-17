import React, { useState, useEffect } from 'react'
import api, { itemsAPI, bomAPI, workstationsAPI } from '../../services/api'
import Modal from '../Modal/Modal'
import Button from '../Button/Button'
import Alert from '../Alert/Alert'
import Badge from '../Badge/Badge'
import SearchableSelect from '../SearchableSelect'
import { 
  Plus, X, Edit, Trash2, Package, Settings, 
  Recycle, Info, Globe, Layers, ListChecks,
  CheckCircle2, AlertTriangle, IndianRupee, Clock,
  History, Hammer, FlaskConical, ClipboardList,
  ChevronRight, ArrowRight
} from 'lucide-react'

export default function CreateBOMModal({ isOpen, onClose, onSuccess, editingId }) {
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [workstations, setWorkstations] = useState([])
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
    workstation_id: '',
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
      const [itemsRes, wsRes] = await Promise.all([
        itemsAPI.list(),
        workstationsAPI.list()
      ])
      
      setItems(itemsRes.data.data || itemsRes.data || [])
      setWorkstations(wsRes.data.data || wsRes.data || [])
      
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

  const addOperation = () => {
    if (!newOperation.operation_name) {
      setError('Please enter operation name')
      return
    }
    const ws = workstations.find(w => w.workstation_id === newOperation.workstation_id)
    setFormData(prev => ({
      ...prev,
      operations: [...prev.operations, { 
        ...newOperation, 
        workstation_name: ws?.workstation_name || ws?.name || '',
        id: Date.now() 
      }]
    }))
    setNewOperation({ operation_name: '', workstation_id: '', operation_time: 0, fixed_time: 0, operating_cost: 0, notes: '' })
  }

  const removeOperation = (id) => {
    setFormData(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== id)
    }))
  }

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
      <form onSubmit={handleSubmit} className="space-y-2">
        {error && <Alert type="error" message={error} />}

        {/* High-Fidelity Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded  border border-slate-200 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-xs   tracking-wider transition-all rounded  ${
                activeTab === tab.id 
                ? "bg-white text-blue-600   border border-slate-200" 
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'components' && formData.lines.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[10px]">
                  {formData.lines.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[480px]">
          {/* BOM Details Tab */}
          {activeTab === 'production-item' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="lg:col-span-2 space-y-2">
                <div className="bg-white p-2 rounded  border border-slate-200 ">
                  <div className="flex items-center gap-2 text-slate-800    pb-3 border-b border-slate-100">
                    <FlaskConical size={18} className="text-blue-500" />
                    Product Configuration
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2">
                      <label className="block text-[10px]  text-slate-400   mb-1.5">Finished Product *</label>
                      <SearchableSelect
                        value={formData.item_code}
                        onChange={(val) => {
                          const item = items.find(i => i.item_code === val)
                          setFormData(prev => ({ 
                            ...prev, 
                            item_code: val,
                            product_name: item?.item_name || '',
                            uom: item?.uom || prev.uom
                          }))
                        }}
                        options={items.map(i => ({ value: i.item_code, label: `${i.item_name} (${i.item_code})` }))}
                        placeholder="Select product to manufacture..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px]  text-slate-400  ">Base Quantity *</label>
                      <div className="relative">
                        <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          name="quantity"
                          value={formData.quantity}
                          onChange={handleInputChange}
                          step="0.01"
                          required
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded  focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px]  text-slate-400  ">UOM</label>
                      <input
                        type="text"
                        name="uom"
                        value={formData.uom}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded  focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded  border border-slate-200   space-y-4">
                  <div className="flex items-center gap-2 text-slate-800    pb-3 border-b border-slate-100">
                    <ClipboardList size={18} className="text-blue-500" />
                    Notes & Specifications
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Provide detailed assembly instructions or version notes..."
                    rows="4"
                    className="w-full p-2  bg-slate-50 border border-slate-200 rounded  focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all resize-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-blue-50/50 p-6 rounded  border border-blue-100   space-y-5">
                  <div className="flex items-center gap-2 text-blue-800    pb-3 border-b border-blue-100">
                    <History size={18} />
                    Status Control
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-[10px]  text-blue-600   mb-1.5">Lifecycle Stage</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2  bg-white border border-blue-200 rounded  text-sm font-semibold text-blue-800 outline-none   focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">🛠️ Draft / Development</option>
                        <option value="active">✅ Active / Production</option>
                        <option value="inactive">🚫 Inactive / Obsolete</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded  border border-blue-100  ">
                      <span className="text-sm  text-slate-700">Revision No.</span>
                      <input
                        type="number"
                        name="revision"
                        value={formData.revision}
                        onChange={handleInputChange}
                        className="w-16 px-2 py-1 text-center bg-blue-50 rounded   text-blue-600 outline-none"
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-blue-100">
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
                        <span className="text-sm  text-slate-600 group-hover:text-blue-600">BOM is Active</span>
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
                        <span className="text-sm  text-slate-600 group-hover:text-blue-600">Set as Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-amber-50 rounded  border border-amber-100 flex gap-3">
                  <Info className="text-amber-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    Changing the <strong>Active BOM</strong> will affect all future production planning and material requirement calculations for this product.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Components Tab */}
          {activeTab === 'components' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-slate-50 p-5 rounded  border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-inner">
                <div className="md:col-span-5">
                  <label className="block text-[10px]  text-slate-400   mb-1.5">Select Raw Material / Sub-Assembly</label>
                  <SearchableSelect
                    value={newLine.component_code}
                    onChange={(val) => {
                      const item = items.find(i => i.item_code === val)
                      setNewLine({ ...newLine, component_code: val, component_name: item?.item_name || '', uom: item?.uom || 'Kg' })
                    }}
                    options={items.map(i => ({ value: i.item_code, label: `${i.item_name} (${i.item_code})` }))}
                    placeholder="Search material..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px]  text-slate-400   mb-1.5">Qty</label>
                  <input
                    type="number"
                    value={newLine.qty}
                    onChange={(e) => setNewLine({...newLine, qty: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded  text-sm  outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px]  text-slate-400   mb-1.5">Type</label>
                  <select
                    value={newLine.type}
                    onChange={(e) => setNewLine({...newLine, type: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded  text-sm outline-none"
                  >
                    <option value="raw-material">Raw Material</option>
                    <option value="sub-assembly">Sub-Assembly</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <Button type="button" onClick={addBomLine} variant="primary" className="w-full h-[38px] rounded  " icon={<Plus size={16} />}>
                    Add Material
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded  overflow-hidden  ">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500  text-[10px]  ">
                    <tr>
                      <th className="p-2  text-left">Component Details</th>
                      <th className="p-2  text-center">Category</th>
                      <th className="p-2  text-center">Required Qty</th>
                      <th className="p-2  text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.lines.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-2 0 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Layers size={40} className="opacity-20" />
                            <p className="italic text-sm">No components added yet. Every BOM needs materials.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      formData.lines.map((line, idx) => (
                        <tr key={line.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2 ">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded  bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package size={16} />
                              </div>
                              <div>
                                <div className=" text-slate-900">{line.component_name}</div>
                                <div className="text-[10px] text-slate-400 font-mono er">{line.component_code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-2  text-center">
                            <Badge variant={line.type === 'sub-assembly' ? 'blue' : line.type === 'consumable' ? 'indigo' : 'gray'}>
                              {line.type.replace('-', ' ')}
                            </Badge>
                          </td>
                          <td className="p-2  text-center">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full  text-slate-700">
                              {line.qty} <span className="text-[10px] text-slate-400 font-normal">{line.uom}</span>
                            </div>
                          </td>
                          <td className="p-2  text-right">
                            <button 
                              type="button" 
                              onClick={() => removeBomLine(line.id)} 
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded  transition-all "
                            >
                              <Trash2 size={18} />
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
            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
              {!formData.with_operations && (
                <div className="bg-blue-50 p-4 rounded  border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Info size={18} className="text-blue-500" />
                    <p className="text-xs font-semibold text-blue-800">
                      Operations are currently disabled. Enable them in the <strong>Advanced</strong> tab to include routing and workstation costs.
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:bg-blue-100"
                    onClick={() => setActiveTab('advanced')}
                  >
                    Go to Advanced <ArrowRight size={14} className="ml-1" />
                  </Button>
                </div>
              )}

              <div className={`space-y-2 ${!formData.with_operations ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-slate-50 p-5 rounded  border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-inner">
                  <div className="md:col-span-4">
                    <label className="block text-[10px]  text-slate-400   mb-1.5">Operation Name</label>
                    <input
                      type="text"
                      value={newOperation.operation_name}
                      onChange={(e) => setNewOperation({...newOperation, operation_name: e.target.value})}
                      placeholder="e.g. Injection Molding"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded  text-sm outline-none"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px]  text-slate-400   mb-1.5">Target Workstation</label>
                    <SearchableSelect
                      value={newOperation.workstation_id}
                      onChange={(val) => setNewOperation({ ...newOperation, workstation_id: val })}
                      options={workstations.map(ws => ({ value: ws.workstation_id, label: ws.workstation_name || ws.name }))}
                      placeholder="Select workstation..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px]  text-slate-400   mb-1.5">Time (Min)</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="number"
                        value={newOperation.operation_time}
                        onChange={(e) => setNewOperation({...newOperation, operation_time: e.target.value})}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded  text-sm  outline-none"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <Button type="button" onClick={addOperation} variant="primary" className="w-full h-[38px] rounded  " icon={<Plus size={16} />}>
                      Add Step
                    </Button>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded  overflow-hidden  ">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500  text-[10px]  ">
                      <tr>
                        <th className="p-2  text-left w-16">Seq</th>
                        <th className="p-2  text-left">Operation Detail</th>
                        <th className="p-2  text-center">Workstation</th>
                        <th className="p-2  text-center">Duration</th>
                        <th className="p-2  text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.operations.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-2 0 text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-400">
                              <Settings size={40} className="opacity-20" />
                              <p className="italic text-sm">No operations defined. Enable "With Operations" to add routing.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        formData.operations.map((op, idx) => (
                          <tr key={op.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-2 ">
                              <span className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center  text-slate-400 text-xs">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="p-2   text-slate-900">{op.operation_name}</td>
                            <td className="p-2  text-center">
                              <Badge variant="blue">{op.workstation_name || 'General'}</Badge>
                            </td>
                            <td className="p-2  text-center  text-slate-700">
                              <div className="inline-flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400" />
                                {op.operation_time} <span className="text-[10px] font-normal text-slate-400 ">min</span>
                              </div>
                            </td>
                            <td className="p-2  text-right">
                              <button 
                                type="button" 
                                onClick={() => removeOperation(op.id)} 
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded  transition-all "
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Scrap Tab */}
          {activeTab === 'scrap' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-orange-50 p-6 rounded  border border-orange-100 flex items-center justify-between  ">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white rounded    text-orange-600 border border-orange-200">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm  text-orange-800  ">Process Loss Allowance</h4>
                    <p className="text-xs text-orange-600/80 font-medium">Define expected material loss or shrinkage during the process.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded  border border-orange-200 shadow-inner">
                  <input
                    type="number"
                    name="process_loss_percentage"
                    value={formData.process_loss_percentage}
                    onChange={handleInputChange}
                    className="w-16 px-2 py-1 bg-transparent text-center  text-orange-700 outline-none text-lg"
                  />
                  <span className=" text-orange-400 pr-2">%</span>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded  border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end shadow-inner">
                <div className="md:col-span-6">
                  <label className="block text-[10px]  text-slate-400   mb-1.5">By-Product / Scrap Item</label>
                  <SearchableSelect
                    value={newScrapItem.item_code}
                    onChange={(val) => {
                      const item = items.find(i => i.item_code === val)
                      setNewScrapItem({ ...newScrapItem, item_code: val, item_name: item?.item_name || '' })
                    }}
                    options={items.map(i => ({ value: i.item_code, label: `${i.item_name} (${i.item_code})` }))}
                    placeholder="Select material..."
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px]  text-slate-400   mb-1.5">Est. Qty</label>
                  <input
                    type="number"
                    placeholder="0.0"
                    value={newScrapItem.quantity}
                    onChange={(e) => setNewScrapItem({...newScrapItem, quantity: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded  text-sm  outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <Button type="button" onClick={addScrapItem} variant="primary" className="w-full h-[38px] rounded  " icon={<Plus size={16} />}>
                    Add Scrap
                  </Button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded  overflow-hidden  ">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500  text-[10px]  ">
                    <tr>
                      <th className="p-2  text-left">Scrap Material</th>
                      <th className="p-2  text-center">Expected Recovery</th>
                      <th className="p-2  text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formData.scrapItems.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="p-2 0 text-center">
                          <div className="flex flex-col items-center gap-3 text-slate-400">
                            <Recycle size={40} className="opacity-20" />
                            <p className="italic text-sm">No expected by-products or scrap defined.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      formData.scrapItems.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2   text-slate-900">{s.item_name}</td>
                          <td className="p-2  text-center">
                            <Badge variant="yellow">{s.quantity} recovered</Badge>
                          </td>
                          <td className="p-2  text-right">
                            <button 
                              type="button" 
                              onClick={() => removeScrapItem(s.id)} 
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded  transition-all "
                            >
                              <Trash2 size={18} />
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

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-2 rounded  border border-slate-200 ">
                <div className="flex items-center gap-2 text-slate-800    pb-3 border-b border-slate-100">
                  <Hammer size={18} className="text-blue-500" />
                  Engineering Rules
                </div>
                
                <div className="space-y-4">
                  <label className="flex items-start gap-4 p-4 rounded  border border-slate-50 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <div className="relative mt-1">
                      <input type="checkbox" name="with_operations" checked={formData.with_operations} onChange={handleInputChange} className="peer sr-only" />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <div>
                      <span className="block text-sm  text-slate-700">Enable Route Operations</span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">Include workstations, labor time, and energy costs.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-4 rounded  border border-slate-50 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <div className="relative mt-1">
                      <input type="checkbox" name="allow_alternative_item" checked={formData.allow_alternative_item} onChange={handleInputChange} className="peer sr-only" />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <div>
                      <span className="block text-sm  text-slate-700">Allow Alternatives</span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">Permit substitute materials if primary stock is unavailable.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-4 p-4 rounded  border border-slate-50 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <div className="relative mt-1">
                      <input type="checkbox" name="auto_sub_assembly_rate" checked={formData.auto_sub_assembly_rate} onChange={handleInputChange} className="peer sr-only" />
                      <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-600 transition-all"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <div>
                      <span className="block text-sm  text-slate-700">Recursive Rate Calc</span>
                      <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">Auto-calculate component rates from their own sub-BOMs.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-white p-2 rounded  border border-slate-200 ">
                <div className="flex items-center gap-2 text-slate-800    pb-3 border-b border-slate-100">
                  <IndianRupee size={18} className="text-blue-500" />
                  Costing Methodology
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px]  text-slate-400   mb-1.5">Valuation Strategy</label>
                    <select
                      name="cost_rate_based_on"
                      value={formData.cost_rate_based_on}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2  bg-slate-50 border border-slate-200 rounded  text-sm  outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                      <option value="Valuation Rate">Valuation Rate (Stock Avg)</option>
                      <option value="Last Purchase Rate">Last Purchase Price</option>
                      <option value="Standard Rate">Standard Engineering Cost</option>
                    </select>
                  </div>

                  <div className="p-4 bg-blue-50 rounded  border border-blue-100 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-800 font-medium">Estimated Material Cost</span>
                      <span className=" text-blue-900">₹0.00</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-blue-800 font-medium">Estimated Operating Cost</span>
                      <span className=" text-blue-900">₹0.00</span>
                    </div>
                    <div className="pt-2 border-t border-blue-200 flex justify-between items-center">
                      <span className="text-sm  text-blue-900">Total Unit Cost</span>
                      <span className="text-lg  text-blue-600">₹0.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 text-slate-400">
            <Info size={14} />
            <span className="text-[10px]   ">Total Items: {formData.lines.length} | Ops: {formData.operations.length}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="   text-xs"
            >
              Discard
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              className="px-10 rounded   shadow-blue-100    text-xs"
              icon={<CheckCircle2 size={16} />}
            >
              {editingId ? 'Save Revision' : 'Create BOM'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
