import React, { useState, useEffect } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, Calendar, Package, Zap, User, Layers, Activity, Warehouse, Boxes, Factory } from 'lucide-react'
import Modal from '../Modal'
import * as productionService from '../../services/productionService'

export default function ViewProductionPlanModal({ isOpen, onClose, planId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [jobCardsByWO, setJobCardsByWO] = useState({})
  const [expandedWOs, setExpandedWOs] = useState({})
  const [expandedSubAsms, setExpandedSubAsms] = useState({})
  const [expandedSections, setExpandedSections] = useState({
    items: true,
    materials: false,
    operations: false,
    workOrders: true
  })

  const buildSubAssemblyTree = (items) => {
    if (!items || items.length === 0) return [];
    
    // Create map for easy lookup using unique ID
    const itemMap = {};
    items.forEach((item) => {
      itemMap[item.id] = { ...item, children: [] };
    });

    const tree = [];
    Object.values(itemMap).forEach(item => {
      const parentCode = item.parent_item_code || item.parent_code;
      if (!parentCode || parentCode === 'top' || parentCode === 'root') {
        tree.push(item);
      } else {
        // Find parent by item_code (since children only know parent's code)
        // If multiple items have same code, we look for one that is a "likely" parent
        // In a real tree, we'd have parent_id, but here we have parent_item_code
        const parents = Object.values(itemMap).filter(i => i.item_code === parentCode);
        if (parents.length > 0) {
          parents[0].children.push(item);
        } else {
          tree.push(item);
        }
      }
    });

    return tree;
  };

  useEffect(() => {
    if (isOpen && planId) {
      fetchPlanDetails()
    }
  }, [isOpen, planId])

  const fetchPlanDetails = async () => {
    try {
      setLoading(true)
      const response = await productionService.getProductionPlanDetails(planId)
      setPlan(response.data)
      
      const woResponse = await productionService.getWorkOrders({ status: '' })
      setWorkOrders(woResponse.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load plan details')
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }

  const toggleWOExpand = async (wo_id) => {
    if (expandedWOs[wo_id]) {
      setExpandedWOs(prev => ({ ...prev, [wo_id]: false }))
      return
    }

    if (!jobCardsByWO[wo_id]) {
      try {
        const response = await productionService.getJobCards({ work_order_id: wo_id })
        setJobCardsByWO(prev => ({
          ...prev,
          [wo_id]: response.data || []
        }))
      } catch (err) {
        console.error('Failed to fetch job cards:', err)
      }
    }

    setExpandedWOs(prev => ({ ...prev, [wo_id]: true }))
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: '#fef3c7',
      pending: '#dbeafe',
      'in-progress': '#feca57',
      completed: '#dcfce7',
      cancelled: '#fee2e2',
      planned: '#dbeafe'
    }
    return colors[status] || '#f3f4f6'
  }

  const getStatusBorder = (status) => {
    const borders = {
      draft: '#f59e0b',
      pending: '#3b82f6',
      'in-progress': '#f97316',
      completed: '#10b981',
      cancelled: '#ef4444',
      planned: '#3b82f6'
    }
    return borders[status] || '#d1d5db'
  }

  const calculateCompletion = (jobCards) => {
    if (!jobCards || jobCards.length === 0) return 0
    const completed = jobCards.filter(jc => jc.status === 'completed').length
    return Math.round((completed / jobCards.length) * 100)
  }

  if (!plan && !loading) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📅 Production Plan Details" size="xl">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading plan details...</div>
      ) : (
        <>
          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
            <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', borderLeft: `4px solid ${getStatusBorder(plan?.status)}` }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '4px' }}>Plan ID</label>
              <p style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>{plan?.plan_id}</p>
            </div>
            <div style={{ padding: '15px', background: '#f9fafb', borderRadius: '6px', borderLeft: `4px solid ${getStatusBorder(plan?.status)}` }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#666', marginBottom: '4px' }}>Status</label>
              <span style={{
                display: 'inline-block',
                padding: '4px 12px',
                background: getStatusColor(plan?.status),
                border: `1px solid ${getStatusBorder(plan?.status)}`,
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: plan?.status === 'completed' ? '#10b981' : plan?.status === 'in-progress' ? '#f97316' : '#666'
              }}>
                {plan?.status}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Calendar size={16} style={{ color: '#f59e0b' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>Planning Date</label>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>
                {plan?.plan_date ? new Date(plan.plan_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Zap size={16} style={{ color: '#3b82f6' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>Week Number</label>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{plan?.week_number || 'N/A'}</p>
            </div>
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Package size={16} style={{ color: '#10b981' }} />
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#666' }}>Company</label>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{plan?.company || 'N/A'}</p>
            </div>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div 
              onClick={() => setExpandedSections(prev => ({ ...prev, items: !prev.items }))}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '15px', 
                cursor: 'pointer',
                background: '#f8fafc',
                padding: '10px 15px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} style={{ color: '#6366f1' }} />
                📦 Planned Items & Sub-Assemblies
              </h3>
              {expandedSections.items ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {expandedSections.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Finished Goods Section */}
                {plan?.fg_items?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                      Finished Goods
                    </h4>
                    <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '10px 15px', color: '#475569', fontWeight: '600' }}>Item Code</th>
                            <th style={{ padding: '10px 15px', color: '#475569', fontWeight: '600' }}>BOM No</th>
                            <th style={{ padding: '10px 15px', color: '#475569', fontWeight: '600', textAlign: 'right' }}>Planned Qty</th>
                          </tr>
                        </thead>
                        <tbody style={{ divideY: '1px solid #e2e8f0' }}>
                          {plan.fg_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: idx === plan.fg_items.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 15px' }}>
                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.item_code}</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.item_name}</div>
                              </td>
                              <td style={{ padding: '10px 15px' }}>
                                <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>
                                  {item.bom_no || 'N/A'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '600', color: '#0f172a' }}>
                                {item.planned_qty} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.uom || 'PCS'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-Assemblies Section */}
                {plan?.sub_assemblies?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '600', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                      Sub-Assembly Hierarchy
                    </h4>
                    <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead style={{ background: '#fff1f2', borderBottom: '1px solid #fecdd3' }}>
                          <tr>
                            <th style={{ padding: '10px 15px', color: '#9f1239', fontWeight: '600' }}>Sub Assembly Item</th>
                            <th style={{ padding: '10px 15px', color: '#9f1239', fontWeight: '600' }}>BOM No</th>
                            <th style={{ padding: '10px 15px', color: '#9f1239', fontWeight: '600', textAlign: 'right' }}>Planned Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const tree = buildSubAssemblyTree(plan.sub_assemblies);
                            
                            const renderRows = (item, level = 0) => {
                              const isExpanded = expandedSubAsms[item.id];
                              const hasChildren = item.children && item.children.length > 0;
                              
                              return (
                                <React.Fragment key={item.id}>
                                  <tr 
                                    style={{ 
                                      borderBottom: '1px solid #f1f5f9',
                                      background: level > 0 ? '#fcfcfc' : '#fff',
                                      cursor: hasChildren ? 'pointer' : 'default'
                                    }}
                                    onClick={() => {
                                      if (hasChildren) {
                                        setExpandedSubAsms(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                                      }
                                    }}
                                  >
                                    <td style={{ padding: '10px 15px', paddingLeft: `${15 + (level * 20)}px` }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {hasChildren ? (
                                          isExpanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />
                                        ) : (
                                          <div style={{ width: 14 }} />
                                        )}
                                        <div style={{ width: 24, height: 24, borderRadius: '4px', background: level === 0 ? '#fff1f2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                                          <Layers size={14} color={level === 0 ? '#e11d48' : '#64748b'} />
                                        </div>
                                        <div>
                                          <div style={{ fontWeight: '600', color: level === 0 ? '#1e293b' : '#475569' }}>{item.item_code}</div>
                                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.item_name}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ padding: '10px 15px' }}>
                                      <span style={{ padding: '2px 6px', background: '#fef2f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500' }}>
                                        {item.bom_no || 'N/A'}
                                      </span>
                                    </td>
                                    <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '600', color: '#e11d48' }}>
                                      {item.planned_qty} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.uom || 'PCS'}</span>
                                    </td>
                                  </tr>
                                  {isExpanded && hasChildren && item.children.map(child => renderRows(child, level + 1))}
                                </React.Fragment>
                              );
                            };
                            
                            return tree.map(rootItem => renderRows(rootItem));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Materials Section */}
          <div style={{ marginBottom: '25px' }}>
            <div 
              onClick={() => setExpandedSections(prev => ({ ...prev, materials: !prev.materials }))}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '15px', 
                cursor: 'pointer',
                background: '#f8fafc',
                padding: '10px 15px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={18} style={{ color: '#f59e0b' }} />
                📦 Materials & Components
              </h3>
              {expandedSections.materials ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {expandedSections.materials && (
              <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#fffbeb', borderBottom: '1px solid #fef3c7' }}>
                    <tr>
                      <th style={{ padding: '10px 15px', color: '#b45309', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '10px 15px', color: '#b45309', fontWeight: '600' }}>Group</th>
                      <th style={{ padding: '10px 15px', color: '#b45309', fontWeight: '600', textAlign: 'right' }}>Total Qty</th>
                      <th style={{ padding: '10px 15px', color: '#b45309', fontWeight: '600', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan?.raw_materials?.length > 0 ? (
                      plan.raw_materials.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: idx === plan.raw_materials.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 15px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.item_code}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.item_name}</div>
                          </td>
                          <td style={{ padding: '10px 15px' }}>
                            <span style={{ padding: '2px 8px', background: '#f8fafc', color: '#64748b', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}>
                              {item.item_group || 'Raw Material'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '600', color: '#b45309' }}>
                            {item.qty || item.plan_to_request_qty} <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.uom || 'Kg'}</span>
                          </td>
                          <td style={{ padding: '10px 15px', textAlign: 'center' }}>
                            {item.material_status ? (
                              <span style={{ 
                                padding: '2px 8px', 
                                background: item.material_status === 'issued' ? '#e0e7ff' : item.material_status === 'requested' ? '#dbeafe' : '#f1f5f9',
                                color: item.material_status === 'issued' ? '#4338ca' : item.material_status === 'requested' ? '#1d4ed8' : '#64748b',
                                borderRadius: '4px', 
                                fontSize: '0.75rem', 
                                fontWeight: '600',
                                textTransform: 'capitalize'
                              }}>
                                {item.material_status}
                              </span>
                            ) : '--'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No materials found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Operations Section */}
          <div style={{ marginBottom: '25px' }}>
            <div 
              onClick={() => setExpandedSections(prev => ({ ...prev, operations: !prev.operations }))}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '15px', 
                cursor: 'pointer',
                background: '#f8fafc',
                padding: '10px 15px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Factory size={18} style={{ color: '#10b981' }} />
                ⚙️ Operational Routing
              </h3>
              {expandedSections.operations ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>

            {expandedSections.operations && (
              <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                    <tr>
                      <th style={{ padding: '10px 15px', color: '#15803d', fontWeight: '600' }}>Operation</th>
                      <th style={{ padding: '10px 15px', color: '#15803d', fontWeight: '600' }}>Workstation</th>
                      <th style={{ padding: '10px 15px', color: '#15803d', fontWeight: '600', textAlign: 'right' }}>Total Time (Hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan?.operations?.length > 0 ? (
                      plan.operations.map((op, idx) => (
                        <tr key={idx} style={{ borderBottom: idx === plan.operations.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 15px' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{op.operation_name || op.operation}</div>
                            <span style={{ fontSize: '0.7rem', padding: '1px 4px', background: op.operation_type === 'FG' ? '#e0e7ff' : '#fef2f2', color: op.operation_type === 'FG' ? '#4338ca' : '#9f1239', borderRadius: '3px' }}>
                              {op.operation_type || 'SA'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 15px' }}>
                            <div style={{ color: '#475569' }}>{op.workstation_type || op.workstation || 'N/A'}</div>
                          </td>
                          <td style={{ padding: '10px 15px', textAlign: 'right', fontWeight: '600', color: '#15803d' }}>
                            {(parseFloat(op.total_hours) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No operations found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '25px' }}>
            <div 
              onClick={() => setExpandedSections(prev => ({ ...prev, workOrders: !prev.workOrders }))}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                marginBottom: '15px', 
                cursor: 'pointer',
                background: '#f8fafc',
                padding: '10px 15px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}
            >
              <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} style={{ color: '#10b981' }} />
                📋 Associated Work Orders & Job Cards
              </h3>
              {expandedSections.workOrders ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
            
            {expandedSections.workOrders && (
              <div style={{ background: '#f9fafb', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e7eb', maxHeight: '400px', overflowY: 'auto' }}>
              {workOrders.length > 0 ? (
                workOrders.map(wo => (
                  <div key={wo.wo_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <div
                      onClick={() => toggleWOExpand(wo.wo_id)}
                      style={{
                        padding: '12px 15px',
                        background: '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.background = '#ffffff'}
                    >
                      <span>
                        {expandedWOs[wo.wo_id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: '600', margin: 0, fontSize: '0.9rem' }}>
                          {wo.wo_id}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                          {wo.item_name || wo.item_code || 'N/A'} • Qty: {wo.quantity}
                        </p>
                      </div>
                      <span style={{
                        padding: '2px 8px',
                        background: getStatusColor(wo.status),
                        border: `1px solid ${getStatusBorder(wo.status)}`,
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        color: '#666'
                      }}>
                        {wo.status}
                      </span>
                    </div>

                    {expandedWOs[wo.wo_id] && (
                      <div style={{ background: '#fafafa', padding: '10px 0' }}>
                        {jobCardsByWO[wo.wo_id]?.length > 0 ? (
                          jobCardsByWO[wo.wo_id].map(jc => (
                            <div key={jc.job_card_id} style={{
                              padding: '10px 15px 10px 45px',
                              borderTop: '1px solid #e5e7eb',
                              background: '#fffbeb'
                            }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '0.85rem' }}>
                                <div>
                                  <p style={{ margin: 0, color: '#666', fontWeight: '500' }}>{jc.job_card_id}</p>
                                  <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: '0.8rem' }}>Operation: {jc.operation || 'N/A'}</p>
                                </div>
                                <div>
                                  <p style={{ margin: 0, color: '#666', fontWeight: '500' }}>
                                    Qty: {jc.planned_quantity} / {jc.produced_quantity || 0}
                                  </p>
                                  <p style={{ margin: '2px 0 0 0', color: '#999', fontSize: '0.8rem' }}>Progress: {calculateCompletion([jc])}%</p>
                                </div>
                                <div>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    background: getStatusColor(jc.status),
                                    border: `1px solid ${getStatusBorder(jc.status)}`,
                                    borderRadius: '3px',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: jc.status === 'completed' ? '#10b981' : jc.status === 'in-progress' ? '#f97316' : '#666'
                                  }}>
                                    {jc.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '10px 15px 10px 45px', color: '#999', fontSize: '0.85rem' }}>
                            No job cards
                          </div>
                        )}
                        {jobCardsByWO[wo.wo_id] && jobCardsByWO[wo.wo_id].length > 0 && (
                          <div style={{
                            padding: '10px 15px 10px 45px',
                            background: '#f3f4f6',
                            borderTop: '1px solid #e5e7eb',
                            fontSize: '0.85rem'
                          }}>
                            <strong>Completion: {calculateCompletion(jobCardsByWO[wo.wo_id])}%</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                  No work orders found
                </div>
              )}
            </div>
          )}
        </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button 
              onClick={onClose}
              style={{ 
                padding: '8px 16px', 
                border: '1px solid #ddd', 
                borderRadius: '4px', 
                background: '#f3f4f6', 
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Close
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
