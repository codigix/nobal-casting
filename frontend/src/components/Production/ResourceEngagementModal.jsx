import React from 'react';
import { Clock, ClipboardList, Activity, Zap, ArrowRight, CheckCircle, Bell, Layers, Cpu, Users, Calendar as CalendarIcon } from 'lucide-react';
import Modal from '../Modal/Modal';

const parseUTCDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;

  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr);
};

const formatToLocalDisplay = (dateStr) => {
  if (!dateStr) return 'N/A'
  let d = new Date(dateStr)

  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const utcDate = new Date(dateStr.replace(' ', 'T') + 'Z')
    if (!isNaN(utcDate.getTime())) {
      d = utcDate
    }
  } else if (dateStr instanceof Date) {
    d = dateStr;
  }

  if (isNaN(d.getTime())) return 'N/A'

  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).toUpperCase()
}

const getWaitTimeText = (endTime) => {
  if (!endTime) return null;
  const end = parseUTCDate(endTime);
  const now = new Date();
  const diffMs = end - now;
  if (diffMs <= 0) return "Becoming free now";

  const diffMins = Math.ceil(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} mins`;

  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${diffHours}h ${remainingMins}m`;
};

const StatusBadge = ({ status }) => {
    const configs = {
      draft: { color: 'text-slate-600 bg-slate-50', label: 'Draft' },
      ready: { color: 'text-blue-600 bg-blue-50', label: 'Ready' },
      planned: { color: 'text-indigo-600 bg-indigo-50', label: 'Planned' },
      'in-progress': { color: 'text-amber-600 bg-amber-50', label: 'In-Progress' },
      in_progress: { color: 'text-amber-600 bg-amber-50', label: 'In-Progress' },
      completed: { color: 'text-emerald-600 bg-emerald-50', label: 'Completed' },
      cancelled: { color: 'text-rose-600 bg-rose-50', label: 'Cancelled' }
    }
    const normalized = (status || 'draft').toLowerCase()
    const s = normalized.replace('_', '-')
    const config = configs[normalized] || configs[s] || configs.draft

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
        {config.label || status}
      </span>
    )
  }

export default function ResourceEngagementModal({ 
  isOpen, 
  onClose, 
  conflictData, 
  onApplyNextAvailable, 
  onApplyAlternative, 
  onNotifyWhenAvailable,
  onViewAllSchedules,
  notifyingResourceId 
}) {
  if (!conflictData) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={conflictData.conflict_with ? "Resource Engagement Info" : "Scheduling Alert"}
      size="lg"
    >
      <div className="p-2 space-y-2">
        {/* Header Engagement Section */}
        <div className='flex gap-2'>
          <div className={`flex flex-col items-start gap-2 p-2 w-full ${conflictData.conflict_with ? 'bg-indigo-50/40 border-indigo-100' : 'bg-amber-50 border-amber-100'} border rounded overflow-hidden relative`}>
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded ${conflictData.conflict_with ? 'bg-indigo-500/5' : 'bg-amber-500/5'}`} />

            <div className='grid grid-cols-2 items-center w-full'>
              <div className="col-span-1 ">
                <div>
                  <h3 className={`${conflictData.conflict_with ? 'text-indigo-900' : 'text-amber-900'} text-sm leading-none font-bold mb-1`}>
                    {conflictData.conflict_with
                      ? `${conflictData.resource_type === 'machine' ? 'Machine' : 'Operator'} is Already Engaged`
                      : "Scheduling Sequence Alert"
                    }
                  </h3>
                  <p className={`${conflictData.conflict_with ? 'text-indigo-600/80' : 'text-amber-700'} text-xs leading-relaxed `}>
                    {conflictData.conflict_with
                      ? `Conflict with ${conflictData.conflict_with} (${conflictData.conflict_operation || 'Operation'}) from ${formatToLocalDisplay(conflictData.start)} to ${formatToLocalDisplay(conflictData.end)}`
                      : conflictData.message
                    }
                  </p>
                </div>
              </div>
              <div className="col-span-1">
                {conflictData.conflict_with && (
                  <div className='grid grid-cols-2 gap-2' >
                    <div className="bg-white/90 p-2 rounded border border-indigo-100 flex items-center gap-3 group hover:border-indigo-200 transition-colors">
                      <div className="p-1.5 bg-indigo-50 rounded text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Clock size={15} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-400">Next available in:</span>
                        <span className="text-xs text-indigo-600 font-bold">{getWaitTimeText(conflictData.end)}</span>
                      </div>
                    </div>

                    <div className="bg-indigo-600 p-2 rounded flex items-center gap-3 shadow-md shadow-indigo-100 group hover:bg-indigo-700 transition-colors">
                      <div className="p-1.5 bg-white/20 rounded text-white">
                        <ClipboardList size={15} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-200">Engaged with:</span>
                        <span className="text-xs text-white font-bold">{conflictData.conflict_with}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Job Details Section - Only show if there's a specific conflicting job */}
        {conflictData.conflict_with && (
          <div className="bg-white border border-slate-100 rounded overflow-hidden">
            <div className="bg-slate-50/50 p-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1 bg-white rounded border border-slate-100 text-slate-400">
                  <ClipboardList size={15} />
                </div>
                <h4 className="text-xs text-slate-500 font-bold">Currently Engaged Job Details</h4>
              </div>
            </div>

            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Work Order</span>
                <p className="text-xs text-slate-700 break-all leading-tight font-medium">
                  {conflictData.conflict_work_order || 'N/A'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Operation</span>
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-indigo-500" />
                  <span className="text-xs text-indigo-600 font-bold">
                    {conflictData.conflict_operation || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Item</span>
                <p className="text-xs text-slate-800 line-clamp-2 font-medium" title={conflictData.conflict_item}>
                  {conflictData.conflict_item || 'N/A'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Planned Qty</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-slate-900 font-bold">
                    {conflictData.conflict_planned_qty ? parseFloat(conflictData.conflict_planned_qty).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Units</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Status</span>
                <div className="inline-flex mt-0.5">
                  <StatusBadge status={conflictData.conflict_status} />
                </div>
              </div>
            </div>
          </div>
        )}

        {conflictData.conflict_with && (
          <div className="grid grid-cols-1 gap-2">
            {/* Suggested Solution Section */}
            <div className="">
              <div className="flex items-center gap-2 px-1">
                <Zap size={15} className="text-amber-500" />
                <h4 className="text-sm text-slate-800 font-bold">Easiest Fix</h4>
              </div>

              <div className="bg-white border border-grey-200 my-2 rounded overflow-hidden group">
                <div className="bg-indigo-600 p-2 border-b border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs text-white font-bold">Automatic Reschedule</span>
                  </div>
                  <span className="text-[10px] bg-white text-indigo-600 px-2 py-0.5 rounded-md font-bold">Recommended</span>
                </div>
                <div className="p-2">
                  {conflictData.next_available_slots && conflictData.next_available_slots.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {conflictData.next_available_slots.map((slot, idx) => (
                        <div key={idx} className="flex-shrink-0 flex flex-col gap-1.5 p-2 rounded  border border-indigo-100 bg-indigo-50/30 hover:border-indigo-300 hover:bg-white transition-all shadow-sm">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="text-center">
                                <p className="text-[9px] text-indigo-400 font-bold uppercase">Start</p>
                                <p className="text-xs font-bold text-indigo-900">{formatToLocalDisplay(slot.start)}</p>
                              </div>
                              <div className="text-indigo-200">
                                <ArrowRight size={14} strokeWidth={2.5} />
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-indigo-400 font-bold uppercase">End</p>
                                <p className="text-xs font-bold text-indigo-900">{formatToLocalDisplay(slot.end)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => onApplyNextAvailable(slot)}
                              className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-[10px] font-bold shadow-sm flex items-center gap-1"
                            >
                              <CheckCircle size={12} />
                              USE THIS
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : conflictData.next_available_slot ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-indigo-50/50 p-2 rounded border border-indigo-100 group-hover:border-indigo-300 transition-colors relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-indigo-400 font-bold uppercase">Start Time</p>
                          <p className="text-xs font-bold text-indigo-900">{formatToLocalDisplay(conflictData.next_available_slot.start)}</p>
                        </div>
                        <div className="px-5 text-indigo-200">
                          <ArrowRight size={15} strokeWidth={3} />
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-[10px] text-indigo-400 font-bold uppercase">End Time</p>
                          <p className="text-xs font-bold text-indigo-900">{formatToLocalDisplay(conflictData.next_available_slot.end)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onApplyNextAvailable(conflictData.next_available_slot)}
                        className="w-full p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group/btn"
                      >
                        <CheckCircle size={15} />
                        Update to This Slot
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded border border-dashed border-slate-200 font-medium">
                      No free slots found for today.
                    </div>
                  )}
                </div>
              </div>

              {/* Notification Section */}
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 border border-indigo-700 rounded p-2 flex items-center justify-between shadow-indigo-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/10 rounded text-indigo-100 backdrop-blur-sm">
                    <Bell size={15} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h5 className="text-xs text-white font-bold leading-tight">Don't want to wait?</h5>
                    <p className="text-[10px] text-indigo-200">We'll alert you when it's free.</p>
                  </div>
                </div>
                <button
                  disabled={notifyingResourceId === (conflictData.resource_id || conflictData.resource_name)}
                  onClick={() => onNotifyWhenAvailable(conflictData.resource_id || conflictData.resource_name)}
                  className={`p-1 rounded text-[10px] font-bold transition-all ${notifyingResourceId === (conflictData.resource_id || conflictData.resource_name)
                    ? 'bg-indigo-700/50 text-indigo-300 cursor-not-allowed flex items-center gap-1.5'
                    : 'bg-white text-indigo-900 hover:bg-indigo-50 active:scale-95 shadow-sm'
                    }`}
                >
                  {notifyingResourceId === (conflictData.resource_id || conflictData.resource_name) ? (
                    <><CheckCircle size={12} /> Alert Set</>
                  ) : 'Set Alert'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 px-1">
            <Layers size={15} className="text-slate-500" />
            <h4 className="text-sm text-slate-800 font-bold">Try Another {conflictData.resource_type === 'machine' ? 'Machine' : 'Operator'}</h4>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-2 flex flex-col min-h-[100px]">
            {conflictData.alternatives && conflictData.alternatives.length > 0 ? (
              <div className="space-y-2 flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 px-1">
                  Free {conflictData.resource_type === 'machine' ? 'machines of same type' : 'operators in same dept'}
                </p>
                {conflictData.alternatives.map(alt => (
                  <div key={alt.name} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 hover:border-indigo-300 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 rounded text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        {conflictData.resource_type === 'machine' ? <Cpu size={18} /> : <Users size={18} />}
                      </div>
                      <div>
                        <p className="text-xs text-slate-800 font-bold group-hover:text-indigo-900">{alt.workstation_name || alt.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{alt.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onApplyAlternative(alt.name)}
                      className="p-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded transition-all border border-indigo-100 active:scale-95"
                    >
                      Switch
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center space-y-2 opacity-70 py-4">
                <div className="p-2 bg-white rounded shadow-inner border border-slate-100">
                  <Layers size={15} className="text-slate-200" />
                </div>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  No other similar {conflictData.resource_type === 'machine' ? 'machines' : 'operators'} are available right now.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {onViewAllSchedules && (
                <button
                  onClick={onViewAllSchedules}
                  className="flex items-center justify-center gap-2 w-full p-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition-all text-xs font-bold shadow-sm active:scale-[0.98]"
                >
                  <CalendarIcon size={14} />
                  View All Schedules
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full p-2 text-slate-500 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-all text-xs font-medium"
              >
                Close & Choose Time Manually
              </button>
            </div>
          </div>
        </div>

        {!conflictData.conflict_with && (
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition-all text-xs font-bold"
            >
              Understood
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
