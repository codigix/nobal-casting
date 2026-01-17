import { useState } from 'react'
import { AlertCircle, Loader, Check, X } from 'lucide-react'

export default function ProductionPlanGenerationModal({ isOpen, onClose, salesOrderId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plan, setPlan] = useState(null)
  const [success, setSuccess] = useState(false)

  const generatePlan = async () => {
    try {
      setLoading(true)
      setError(null)
      setPlan(null)

      const token = localStorage.getItem('token')
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/production-planning/generate/sales-order/${salesOrderId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      const data = await response.json()

      if (data.success) {
        setPlan(data.data)
        setSuccess(true)
      } else {
        setError(data.error || 'Failed to generate production plan')
      }
    } catch (err) {
      console.error('Error generating production plan:', err)
      setError('Failed to generate production plan')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Generate Production Plan</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!plan && !success ? (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start gap-2">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  This will generate a correct production plan from the selected Sales Order using the following logic:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Extracts FG quantity from the Sales Order</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Explodes the BOM recursively to identify all sub-assemblies and raw materials</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Calculates scrap-adjusted quantities for each sub-assembly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Aggregates raw materials from all sub-assembly BOMs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Multiplies operation times by planned quantities (total hours, not per-unit)</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={generatePlan}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded font-medium transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Plan</span>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-start gap-3">
                  <Check size={20} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Production Plan Generated Successfully!</p>
                    <p className="text-sm mt-1">Plan ID: <strong>{plan.plan_id}</strong></p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {plan.finished_goods && plan.finished_goods.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Finished Goods</h3>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-blue-200">
                            <th className="text-left py-2 font-semibold text-gray-900">Item Code</th>
                            <th className="text-left py-2 font-semibold text-gray-900">Item Name</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Quantity</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.finished_goods.map((item, idx) => (
                            <tr key={idx} className="border-b border-blue-100">
                              <td className="py-2 text-gray-700">{item.item_code}</td>
                              <td className="py-2 text-gray-700">{item.item_name}</td>
                              <td className="py-2 text-right font-medium text-gray-900">{item.planned_qty || item.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {plan.sub_assemblies && plan.sub_assemblies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Sub-Assemblies (with Scrap)</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-orange-200">
                            <th className="text-left py-2 font-semibold text-gray-900">Item Code</th>
                            <th className="text-left py-2 font-semibold text-gray-900">Item Name</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Scrap %</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Qty (before scrap)</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Planned Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.sub_assemblies.map((item, idx) => (
                            <tr key={idx} className="border-b border-orange-100 hover:bg-orange-100">
                              <td className="py-2 text-gray-700">{item.item_code}</td>
                              <td className="py-2 text-gray-700">{item.item_name}</td>
                              <td className="py-2 text-right text-gray-600">{item.scrap_percentage.toFixed(2)}%</td>
                              <td className="py-2 text-right font-medium text-gray-900">
                                {item.planned_qty_before_scrap ? item.planned_qty_before_scrap.toFixed(3) : '-'}
                              </td>
                              <td className="py-2 text-right font-bold text-orange-700">{item.planned_qty.toFixed(3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {plan.raw_materials && plan.raw_materials.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Raw Materials (Aggregated)</h3>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-green-200">
                            <th className="text-left py-2 font-semibold text-gray-900">Item Code</th>
                            <th className="text-left py-2 font-semibold text-gray-900">Item Name</th>
                            <th className="text-left py-2 font-semibold text-gray-900">Group</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Total Qty</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Rate</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.raw_materials.map((item, idx) => (
                            <tr key={idx} className="border-b border-green-100 hover:bg-green-100">
                              <td className="py-2 text-gray-700">{item.item_code}</td>
                              <td className="py-2 text-gray-700">{item.item_name}</td>
                              <td className="py-2 text-gray-600 text-xs">{item.item_group}</td>
                              <td className="py-2 text-right font-medium text-gray-900">{item.total_qty.toFixed(3)}</td>
                              <td className="py-2 text-right text-gray-700">₹{item.rate.toFixed(2)}</td>
                              <td className="py-2 text-right font-semibold text-green-700">₹{item.total_amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {plan.operations && plan.operations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Operations (Total Hours)</h3>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-purple-200">
                            <th className="text-left py-2 font-semibold text-gray-900">Operation</th>
                            <th className="text-left py-2 font-semibold text-gray-900">Workstation</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Time (Minutes)</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Total Hours</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Hourly Rate</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.operations.map((item, idx) => (
                            <tr key={idx} className="border-b border-purple-100 hover:bg-purple-100">
                              <td className="py-2 text-gray-700">{item.operation_name}</td>
                              <td className="py-2 text-gray-700">{item.workstation_type || '-'}</td>
                              <td className="py-2 text-right font-medium text-gray-900">{item.total_time.toFixed(1)}</td>
                              <td className="py-2 text-right font-bold text-purple-700">{item.total_hours.toFixed(2)}</td>
                              <td className="py-2 text-right text-gray-700">₹{item.hourly_rate.toFixed(2)}</td>
                              <td className="py-2 text-right font-semibold text-purple-700">₹{item.total_cost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {plan.fg_operations && plan.fg_operations.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Finished Goods Operations</h3>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-indigo-200">
                            <th className="text-left py-2 font-semibold text-gray-900">Operation</th>
                            <th className="text-left py-2 font-semibold text-gray-900">Workstation</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Time per Unit (min)</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Total Time (min)</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Total Hours</th>
                            <th className="text-right py-2 font-semibold text-gray-900">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plan.fg_operations.map((item, idx) => (
                            <tr key={idx} className="border-b border-indigo-100 hover:bg-indigo-100">
                              <td className="py-2 text-gray-700">{item.operation_name}</td>
                              <td className="py-2 text-gray-700">{item.workstation_type || '-'}</td>
                              <td className="py-2 text-right text-gray-700">{item.operation_time_per_unit.toFixed(1)}</td>
                              <td className="py-2 text-right font-medium text-gray-900">{item.total_time.toFixed(1)}</td>
                              <td className="py-2 text-right font-bold text-indigo-700">{(item.total_time / 60).toFixed(2)}</td>
                              <td className="py-2 text-right font-semibold text-indigo-700">₹{item.total_cost.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => window.location.href = `/manufacturing/production-planning/${plan.plan_id}`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium transition"
                >
                  View Full Plan
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded font-medium transition"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
