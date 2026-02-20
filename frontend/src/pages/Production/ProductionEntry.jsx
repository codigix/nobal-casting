import React, { useState, useEffect } from 'react'
// Rebuild trigger
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Clock, AlertCircle, ArrowLeft, CheckCircle,
  Activity, CheckCircle2, Calendar, Layout, ChevronRight, Settings, Info, FileText,
  Package, Boxes, ArrowRight, Save, ShieldCheck, AlertTriangle, XCircle,
  Edit2, X, Eye
} from 'lucide-react'
import SearchableSelect from '../../components/SearchableSelect'
import DataTable from '../../components/Table/DataTable'
import Modal from '../../components/Modal/Modal'
import * as productionService from '../../services/productionService'
import api from '../../services/api'
import { useToast } from '../../components/ToastContainer'
import Card from '../../components/Card/Card'

const normalizeStatus = (status) => String(status || '').toLowerCase().trim()
const normalizeShift = (s) => String(s || '').trim().toUpperCase().replace(/^SHIFT\s+/, '');

const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForMatch = (dateInput) => {
  if (!dateInput) return null;
  
  // 1. Handle YYYY-MM-DD directly to avoid Date object overhead/parsing issues
  if (typeof dateInput === 'string') {
    const isoMatch = dateInput.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    // 2. Handle DD-MM-YYYY or D-M-YYYY
    const dmyMatch = dateInput.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (!d || isNaN(d.getTime())) return String(dateInput);

  // ALWAYS use local parts for Date objects to avoid "yesterday" shift in positive timezones
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getShiftTimings = (shift) => {
  const shiftTimings = {
    'A': { from_time: '08:00', from_period: 'AM', to_time: '08:00', to_period: 'PM' },
    'B': { from_time: '08:00', from_period: 'PM', to_time: '08:00', to_period: 'AM' }
  }
  return shiftTimings[shift] || shiftTimings['A']
}

const parseTimeToMinutes = (time, period) => {
  if (!time) return 0;
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getNextLogicalShiftAndDate = (logs = [], rejs = [], jobCard = null, previousLogs = []) => {
  const allEntries = [
    ...logs.map(l => ({ 
      date: formatDateForMatch(l.log_date), 
      shift: normalizeShift(l.shift), 
      day: parseInt(l.day_number) || 1,
      period: l.from_period,
      time: parseTimeToMinutes(l.from_time, l.from_period)
    })),
    ...rejs.map(r => ({ 
      date: formatDateForMatch(r.log_date), 
      shift: normalizeShift(r.shift), 
      day: parseInt(r.day_number) || 1,
      period: 'PM',
      time: 1200 
    }))
  ];

  if (allEntries.length === 0) {
    if (previousLogs && previousLogs.length > 0) {
      const getLogSortValue = (l) => {
        const dateValue = (formatDateForMatch(l.log_date) || '').replace(/-/g, '');
        const shiftWeight = normalizeShift(l.shift) === 'A' ? 0 : 1;
        let timeInDay = parseTimeToMinutes(l.to_time, l.to_period) || 0;
        if (normalizeShift(l.shift) === 'B' && l.to_period === 'AM') timeInDay += 1440;
        return (parseInt(dateValue || 0) * 1e4) + (shiftWeight * 2000) + timeInDay;
      };

      const sortedPrev = [...previousLogs].sort((a, b) => getLogSortValue(a) - getLogSortValue(b));
      const latestPrev = sortedPrev[sortedPrev.length - 1];
      const latestShift = normalizeShift(latestPrev.shift);
      const latestDate = formatDateForMatch(latestPrev.log_date);

      if (latestShift === 'A') {
        return { date: latestDate, shift: 'B', day: 1 };
      } else {
        const parts = latestDate.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (latestPrev.to_period !== 'AM') {
          d.setDate(d.getDate() + 1);
        }
        return { date: formatDateForMatch(d), shift: 'A', day: 1 };
      }
    }

    const startDate = jobCard?.actual_start_date ? formatDateForMatch(jobCard.actual_start_date) : getLocalDate();
    return { date: startDate, shift: 'A', day: 1 };
  }

  // Composite sorting key: Production Day (primary) > Calendar Date (secondary) > Shift (tertiary)
  const getSortValue = (e) => {
    const dateValue = (e.date || '').replace(/-/g, '');
    const shiftWeight = e.shift === 'A' ? 0 : 1;
    let timeInDay = e.time || 0;
    // Add 24 hours to Shift B AM entries for correct sequential sorting within the production day
    if (e.shift === 'B' && e.period === 'AM') timeInDay += 1440; 
    
    return (parseInt(e.day) * 1e12) + (parseInt(dateValue || 0) * 1e4) + (shiftWeight * 2000) + timeInDay;
  };

  allEntries.sort((a, b) => getSortValue(a) - getSortValue(b));
  const latest = allEntries[allEntries.length - 1];
  
  if (latest.shift === 'A') {
    // If latest was A, next is B on the same production day and same calendar date
    return { date: latest.date, shift: 'B', day: latest.day };
  } else {
    // If latest was B, next is A on next production day
    const parts = latest.date.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    
    // If Shift B ended in PM, Shift A is tomorrow
    // If Shift B ended in AM, we are already on tomorrow's calendar date, so Shift A is today
    if (latest.period !== 'AM') {
      d.setDate(d.getDate() + 1);
    }
    
    return { 
      date: formatDateForMatch(d), 
      shift: 'A', 
      day: latest.day + 1 
    };
  }
};

// Helper Components for the Redesign
const SectionTitle = ({ title, icon: Icon, badge, subtitle }) => (
  <div className="mb-2">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded">
          <Icon size={15} />
        </div>
        <h3 className="text-xs  text-slate-900 ">{title}</h3>
      </div>
      {badge && (
        <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px]   rounded-full border border-slate-200">
          {badge}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-slate-500 ml-11">{subtitle}</p>}
  </div>
)

const FieldWrapper = ({ label, children, error, required }) => (
  <div className="">
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-900  flex items-center gap-1 font-thin">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {error && <span className="text-xs text-rose-500 animate-pulse">{error}</span>}
    </div>
    {children}
  </div>
)

const calculateDurationMinutes = (fromTime, fromPeriod, toTime, toPeriod) => {
  const parseTime = (time, period) => {
    if (!time) return 0;
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  let start = parseTime(fromTime, fromPeriod);
  let end = parseTime(toTime, toPeriod);

  if (end < start) {
    // Spans across midnight
    end += 24 * 60;
  }

  return end - start;
};

const StatCard = ({ label, value, icon: Icon, color, subtitle }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100/50',
    emerald: 'text-emerald-600 /50',
    amber: 'text-amber-600  /50',
    rose: 'text-rose-600 bg-rose-50 border-rose-100/50',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100/50',
    violet: 'text-violet-600 bg-violet-50 border-violet-100/50'
  }

  return (
    <Card className="p-2 border-none flex items-center gap-4 transition-all hover: hover:shadow-slate-200/50 bg-white rounded group">
      <div className={`p-2 rounded  ${colorMap[color] || colorMap.blue} border border-transparent transition-transform group-hover:scale-110 duration-300`}>
        <Icon size={15} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs  text-slate-400 ">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg text-slate-900 ">{value}</h3>
          {subtitle && (
            <p className="text-[9px]  text-slate-400  truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

const StatusBadge = ({ status }) => {
  const config = {
    draft: { color: ' text-slate-600', icon: Clock, label: 'Draft' },
    ready: { color: ' text-blue-700 ', icon: CheckCircle2, label: 'Ready' },
    pending: { color: ' text-indigo-700 ', icon: Calendar, label: 'Pending' },
    'in-progress': { color: ' text-amber-700 ', icon: Activity, label: 'In-Progress' },
    in_progress: { color: ' text-amber-700 ', icon: Activity, label: 'In-Progress' },
    completed: { color: ' text-emerald-700 ', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: ' text-rose-700', icon: AlertCircle, label: 'Cancelled' }
  }
  const s = normalizeStatus(status)
  const statusKey = s.replace('-', '_')
  const { color, icon: Icon, label } = config[s] || config[statusKey] || config.draft

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm ${color}`}>
      <Icon size={10} />
      {label || s.toUpperCase()}
    </span>
  )
}

const NavItem = ({ label, icon: Icon, section, isActive, onClick, color = 'indigo' }) => {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 ',
    amber: 'text-amber-600  ',
    rose: 'text-rose-600 bg-rose-50 border-rose-100'
  }

  return (
    <button
      onClick={() => onClick(section)}
      className={`flex items-center gap-3 w-full p-2 rounded transition-all duration-200 border ${isActive
        ? `${colors[color]}  translate-x-1`
        : 'text-slate-500 hover:bg-slate-50 border-transparent'
        }`}
    >
      <div className={`p-1.5 rounded ${isActive ? 'bg-white ' : 'bg-slate-100'}`}>
        <Icon size={15} />
      </div>
      <span className="text-xs ">{label}</span>
    </button>
  )
}

export default function ProductionEntry() {
  const { jobCardId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [jobCardData, setJobCardData] = useState(null)
  const [allJobCards, setAllJobCards] = useState([])
  const [previousOperationData, setPreviousOperationData] = useState(null)
  const [previousOperationLogs, setPreviousOperationLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [itemName, setItemName] = useState('')
  const [operationCycleTime, setOperationCycleTime] = useState(0)
  const [salesOrderQuantity, setSalesOrderQuantity] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  const [timeLogs, setTimeLogs] = useState([])
  const [rejections, setRejections] = useState([])
  const [downtimes, setDowntimes] = useState([])

  const [shifts] = useState(['A', 'B'])
  const [warehouses, setWarehouses] = useState([])
  const [workstations, setWorkstations] = useState([])
  const [operators, setOperators] = useState([])
  const [operations, setOperations] = useState([])

  const [nextOperationForm, setNextOperationForm] = useState({
    next_operator_id: '',
    next_warehouse_id: '',
    next_operation_id: '',
    inhouse: false,
    outsource: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingRowKey, setEditingRowKey] = useState(null)
  const [editFormData, setEditFormData] = useState({})

  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState(null)
  const [modalType, setModalType] = useState(null) // 'timeLog', 'rejection', 'downtime'

  const [editingId, setEditingId] = useState(null)
  const [editingType, setEditingType] = useState(null) // 'timeLog', 'rejection', 'downtime'
  const [editForm, setEditForm] = useState({})

  const handleInlineEditFieldChange = (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculation for rejections
      if (editingType === 'rejection') {
        // If critical fields change, re-calculate accepted_qty
        if (['rejected_qty', 'scrap_qty', 'log_date', 'shift', 'day_number'].includes(field)) {
          const stats = getShiftStats(
            field === 'log_date' ? value : updated.log_date,
            field === 'shift' ? value : updated.shift,
            field === 'day_number' ? value : updated.day_number
          );
          
          const p = stats.produced;
          const r = parseFloat(field === 'rejected_qty' ? value : updated.rejected_qty) || 0;
          const s = parseFloat(field === 'scrap_qty' ? value : updated.scrap_qty) || 0;
          
          updated.accepted_qty = Math.max(0, p - r - s);
        }
      }
      
      // Auto-calculation for downtime duration if times change
      if (editingType === 'downtime' || editingType === 'timeLog') {
        if (field === 'from_time' || field === 'from_period' || field === 'to_time' || field === 'to_period') {
          const mins = calculateDurationMinutes(
            field === 'from_time' ? value : updated.from_time,
            field === 'from_period' ? value : updated.from_period,
            field === 'to_time' ? value : updated.to_time,
            field === 'to_period' ? value : updated.to_period
          );
          if (editingType === 'timeLog') updated.time_in_minutes = mins;
          else updated.duration_minutes = mins;
        }
      }
      
      return updated;
    });
  }

  const timeLogColumns = React.useMemo(() => [
    {
      label: 'Day',
      key: 'day_number',
      render: (val, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <input
          type="number"
          value={editForm.day_number || ''}
          onChange={(e) => handleInlineEditFieldChange('day_number', e.target.value)}
          className="w-16 p-1 border border-indigo-300 rounded text-xs outline-none"
        />
      ) : (
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          {val || '-'}
        </span>
      )
    },
    {
      label: 'Date / Shift',
      key: 'log_date',
      render: (val, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <div className="flex  gap-1">
          <input
            type="date"
            value={formatDateForMatch(editForm.log_date) || ''}
            onChange={(e) => handleInlineEditFieldChange('log_date', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-[10px] outline-none"
          />
          <select
            value={editForm.shift || ''}
            onChange={(e) => handleInlineEditFieldChange('shift', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-[10px] outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-slate-900">{new Date(val).toLocaleDateString()}</p>
          <p className="text-[10px] text-slate-400">Shift {normalizeShift(row.shift)}</p>
        </div>
      )
    },
    {
      label: 'Operator',
      key: 'operator_name',
      render: (val, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <select
          value={editForm.employee_id || ''}
          onChange={(e) => {
            const op = operators.find(o => o.employee_id === e.target.value);
            handleInlineEditFieldChange('employee_id', e.target.value);
            handleInlineEditFieldChange('operator_name', op ? `${op.first_name} ${op.last_name}` : '');
          }}
          className="w-full p-1 border border-indigo-300 rounded text-[10px] outline-none"
        >
          {operators.map(op => (
            <option key={op.employee_id} value={op.employee_id}>{op.first_name} {op.last_name}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500">
            {val?.charAt(0) || 'U'}
          </div>
          <span className="truncate max-w-[80px]">{val || 'N/A'}</span>
        </div>
      )
    },
    {
      label: 'Time Interval',
      key: 'time_interval',
      render: (_, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <div className="flex  gap-1">
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.from_time || ''}
              onChange={(e) => handleInlineEditFieldChange('from_time', e.target.value)}
              className="w-16 p-0.5 border border-indigo-200 rounded text-[9px]"
            />
            <select
              value={editForm.from_period || 'AM'}
              onChange={(e) => handleInlineEditFieldChange('from_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-[9px]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.to_time || ''}
              onChange={(e) => handleInlineEditFieldChange('to_time', e.target.value)}
              className="w-16 p-0.5 border border-indigo-200 rounded text-[9px]"
            />
            <select
              value={editForm.to_period || 'PM'}
              onChange={(e) => handleInlineEditFieldChange('to_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-[9px]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={12} className="text-slate-300" />
          <div className="flex flex-col">
            <span className="text-[10px]">{row.from_time} {row.from_period} - {row.to_time} {row.to_period}</span>
            <span className="text-[10px] text-indigo-500 font-medium">
              {row.time_in_minutes || 0} mins
            </span>
          </div>
        </div>
      )
    },
    {
      label: 'Produced Qty',
      key: 'completed_qty',
      render: (val, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <input
          type="number"
          value={editForm.completed_qty || 0}
          onChange={(e) => handleInlineEditFieldChange('completed_qty', parseFloat(e.target.value) || 0)}
          className="w-16 p-1 border border-indigo-300 rounded text-xs outline-none text-right"
        />
      ) : (
        <div className="text-right">
          <span className="text-indigo-600 font-medium">{parseFloat(val || 0).toLocaleString()}</span>
          <span className="ml-1 text-[10px] text-slate-400">Units</span>
        </div>
      )
    }
  ], [editingId, editingType, editForm, operators])

  const rejectionColumns = React.useMemo(() => [
    {
      label: 'Day',
      key: 'day_number',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <input
          type="number"
          value={editForm.day_number || ''}
          onChange={(e) => handleInlineEditFieldChange('day_number', e.target.value)}
          className="w-14 p-1 border border-indigo-300 rounded text-xs outline-none"
        />
      ) : (
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          {val || '-'}
        </span>
      )
    },
    {
      label: 'Date / Shift',
      key: 'log_date',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <div className="flex  gap-1">
          <input
            type="date"
            value={formatDateForMatch(editForm.log_date) || ''}
            onChange={(e) => handleInlineEditFieldChange('log_date', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-[10px] outline-none"
          />
          <select
            value={editForm.shift || ''}
            onChange={(e) => handleInlineEditFieldChange('shift', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-[10px] outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-slate-900">{new Date(val).toLocaleDateString()}</p>
          <p className="text-[10px] text-slate-400">Shift {normalizeShift(row.shift)}</p>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (val) => val === 'Approved' ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] border border-emerald-100">
          <ShieldCheck size={10} /> Approved
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-600 px-2 py-1 rounded text-[10px] border animate-pulse">
          <Clock size={10} /> Pending Approval
        </span>
      )
    },
    {
      label: 'Notes',
      key: 'rejection_reason',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <select
          value={editForm.rejection_reason || ''}
          onChange={(e) => handleInlineEditFieldChange('rejection_reason', e.target.value)}
          className="w-full p-1 border border-indigo-300 rounded text-[10px] outline-none"
        >
          <option value="">Select Reason</option>
          {rejectionReasons.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      ) : (
        <div className="flex  gap-1">
          {parseFloat(row.rejected_qty) > 0 ? (
            <span className="p-1 bg-rose-50 text-rose-600 rounded text-[10px] w-fit">Defect Found</span>
          ) : (
            <span className="p-1 bg-emerald-50 text-emerald-600 rounded text-[10px] w-fit">Passed</span>
          )}
          <span className="text-slate-500 truncate max-w-[100px]">{val || 'No notes'}</span>
        </div>
      )
    },
    {
      label: 'Accepted',
      key: 'accepted_qty',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <input
          type="number"
          value={editForm.accepted_qty || 0}
          onChange={(e) => handleInlineEditFieldChange('accepted_qty', parseFloat(e.target.value) || 0)}
          className="w-14 p-1 border border-indigo-300 rounded text-[10px] outline-none text-center"
        />
      ) : (
        <div className="text-center font-medium text-emerald-600">{parseFloat(val || 0).toLocaleString()}</div>
      )
    },
    {
      label: 'Rejected',
      key: 'rejected_qty',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <input
          type="number"
          value={editForm.rejected_qty || 0}
          onChange={(e) => handleInlineEditFieldChange('rejected_qty', parseFloat(e.target.value) || 0)}
          className="w-14 p-1 border border-indigo-300 rounded text-[10px] outline-none text-center"
        />
      ) : (
        <div className="text-center font-medium text-rose-600">{parseFloat(val || 0).toLocaleString()}</div>
      )
    },
    {
      label: 'Scrap',
      key: 'scrap_qty',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <input
          type="number"
          value={editForm.scrap_qty || 0}
          onChange={(e) => handleInlineEditFieldChange('scrap_qty', parseFloat(e.target.value) || 0)}
          className="w-14 p-1 border border-indigo-300 rounded text-[10px] outline-none text-center"
        />
      ) : (
        <div className="text-center font-medium text-slate-600">{parseFloat(val || 0).toLocaleString()}</div>
      )
    }
  ], [editingId, editingType, editForm])

  const downtimeColumns = React.useMemo(() => [
    {
      label: 'Day',
      key: 'day_number',
      render: (val, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <input
          type="number"
          value={editForm.day_number || ''}
          onChange={(e) => handleInlineEditFieldChange('day_number', e.target.value)}
          className="w-14 p-1 border border-indigo-300 rounded text-xs outline-none"
        />
      ) : (
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
          {val || '-'}
        </span>
      )
    },
    {
      label: 'Date / Shift',
      key: 'log_date',
      render: (val, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <div className="flex  gap-1">
          <input
            type="date"
            value={formatDateForMatch(editForm.log_date) || ''}
            onChange={(e) => handleInlineEditFieldChange('log_date', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-[10px] outline-none"
          />
          <select
            value={editForm.shift || ''}
            onChange={(e) => handleInlineEditFieldChange('shift', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-[10px] outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-slate-900">{new Date(val).toLocaleDateString()}</p>
          <p className="text-[10px] text-slate-400">Shift {normalizeShift(row.shift)}</p>
        </div>
      )
    },
    {
      label: 'Category / Reason',
      key: 'downtime_type',
      render: (val, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <div className="flex  gap-1">
          <select
            value={editForm.downtime_type || ''}
            onChange={(e) => handleInlineEditFieldChange('downtime_type', e.target.value)}
            className="w-full p-1 border border-indigo-300 rounded text-[10px] outline-none"
          >
            <option value="">Select Type</option>
            {downtimeTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="text"
            value={editForm.downtime_reason || ''}
            onChange={(e) => handleInlineEditFieldChange('downtime_reason', e.target.value)}
            placeholder="Reason"
            className="w-full p-1 border border-indigo-300 rounded text-[10px] outline-none"
          />
        </div>
      ) : (
        <div>
          <p className="text-slate-900">{val}</p>
          <p className="text-slate-500 text-[10px]">{row.downtime_reason}</p>
        </div>
      )
    },
    {
      label: 'Interval',
      key: 'interval',
      render: (_, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <div className="flex  gap-1">
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.from_time || ''}
              onChange={(e) => handleInlineEditFieldChange('from_time', e.target.value)}
              className="w-14 p-0.5 border border-indigo-200 rounded text-[9px]"
            />
            <select
              value={editForm.from_period || 'AM'}
              onChange={(e) => handleInlineEditFieldChange('from_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-[9px]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.to_time || ''}
              onChange={(e) => handleInlineEditFieldChange('to_time', e.target.value)}
              className="w-14 p-0.5 border border-indigo-200 rounded text-[9px]"
            />
            <select
              value={editForm.to_period || 'PM'}
              onChange={(e) => handleInlineEditFieldChange('to_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-[9px]"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="text-slate-600 text-[10px]">{row.from_time} - {row.to_time}</div>
      )
    },
    {
      label: 'Duration',
      key: 'duration_minutes',
      render: (val, row) => (
        <div className="text-right">
          <span className="text-amber-600 font-medium">
            {editingId === row.downtime_id && editingType === 'downtime' ? editForm.duration_minutes : val}
          </span>
          <span className="ml-1 text-[10px] text-slate-400">Mins</span>
        </div>
      )
    }
  ], [editingId, editingType, editForm])

  const handleViewItem = (item, type) => {
    setModalItem(item)
    setModalType(type)
    setIsViewModalOpen(true)
  }

  const handleEditItem = (item, type) => {
    const idField = type === 'timeLog' ? 'time_log_id' : (type === 'rejection' ? 'rejection_id' : 'downtime_id');
    setEditingId(item[idField]);
    setEditingType(type);
    setEditForm({ ...item });
  }

  const handleCancelInlineEdit = () => {
    setEditingId(null);
    setEditingType(null);
    setEditForm({});
  }

  const handleSaveInlineEdit = async () => {
    try {
      setIsSubmitting(true);
      if (editingType === 'timeLog') {
        await productionService.updateTimeLog(editingId, editForm);
      } else if (editingType === 'rejection') {
        await productionService.updateRejection(editingId, editForm);
      } else if (editingType === 'downtime') {
        await productionService.updateDowntime(editingId, editForm);
      }
      toast.addToast('Entry updated successfully', 'success');
      handleCancelInlineEdit();
      fetchAllData();
    } catch (err) {
      toast.addToast(err.message || 'Failed to update entry', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderTableActions = (row, type) => {
    const idField = type === 'timeLog' ? 'time_log_id' : (type === 'rejection' ? 'rejection_id' : 'downtime_id');
    const isEditing = editingId === row[idField] && editingType === type;

    return (
      <div className="flex items-center justify-center gap-1">
        {isEditing ? (
          <>
            <button
              onClick={handleSaveInlineEdit}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all"
              title="Save"
            >
              <Save size={14} />
            </button>
            <button
              onClick={handleCancelInlineEdit}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => handleViewItem(row, type)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
              title="View Details"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => handleEditItem(row, type)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
              title="Edit Entry"
            >
              <Edit2 size={14} />
            </button>
            {type === 'rejection' && row.status !== 'Approved' && (
              <button
                onClick={() => handleApproveRejection(row.rejection_id)}
                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                title="Approve Inspection"
              >
                <ShieldCheck size={14} />
              </button>
            )}
            <button
              onClick={() => {
                if (type === 'timeLog') handleDeleteTimeLog(row.time_log_id)
                else if (type === 'rejection') handleDeleteRejection(row.rejection_id)
                else if (type === 'downtime') handleDeleteDowntime(row.downtime_id)
              }}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
              title="Delete Entry"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    );
  }



  const handleEditRow = (row) => {
    const key = `${row.day}_${row.shift}`;
    setEditingRowKey(key);
    setEditFormData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRowKey(null);
    setEditFormData({});
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => {
      const updated = { ...prev, [field]: parseFloat(value) || 0 };
      
      // Auto-calculation logic: Accepted = Produced - Rejected - Scrap
      // Follows summary: "updating rejected or scrap quantities now automatically recalculates the 'Accepted Quantity' based on shift production stats"
      if (field === 'rejected' || field === 'scrap') {
        updated.accepted = Math.max(0, (parseFloat(updated.produced) || 0) - 
                          (parseFloat(updated.rejected) || 0) - 
                          (parseFloat(updated.scrap) || 0));
      } else if (field === 'accepted') {
        // If accepted is changed, we might need to adjust produced if we want to maintain the sum,
        // but typically produced is the reporting constant. 
        // For flexibility, we allow editing accepted, but we don't force a change in produced here
        // unless we want to maintain Produced = A + R + S.
        // Given the read-only nature of produced in the UI, we should probably update produced
        // if the user somehow manages to edit accepted to a value that exceeds current produced.
        if (updated.accepted > updated.produced) {
          updated.produced = updated.accepted + (parseFloat(updated.rejected) || 0) + (parseFloat(updated.scrap) || 0);
        }
      }
      
      return updated;
    });
  };

  const handleSaveRow = async () => {
    try {
      setIsSubmitting(true);
      
      const { timeLogIds, rejectionIds, downtimeIds, produced, total_mins, accepted, rejected, scrap, downtime } = editFormData;

      // Update Time Logs
      if (timeLogIds && timeLogIds.length > 0) {
        // Update the first log with the new total
        await productionService.updateTimeLog(timeLogIds[0], {
          completed_qty: produced,
          time_in_minutes: total_mins
        });
        
        // Zero out any other logs in this shift to ensure the total matches
        if (timeLogIds.length > 1) {
          for (let i = 1; i < timeLogIds.length; i++) {
            await productionService.updateTimeLog(timeLogIds[i], {
              completed_qty: 0,
              time_in_minutes: 0
            });
          }
        }
      }

      // Update Rejections
      if (rejectionIds && rejectionIds.length > 0) {
        await productionService.updateRejection(rejectionIds[0], {
          accepted_qty: accepted,
          rejected_qty: rejected,
          scrap_qty: scrap
        });
        
        if (rejectionIds.length > 1) {
          for (let i = 1; i < rejectionIds.length; i++) {
            await productionService.updateRejection(rejectionIds[i], {
              accepted_qty: 0,
              rejected_qty: 0,
              scrap_qty: 0
            });
          }
        }
      }

      // Update Downtimes
      if (downtimeIds && downtimeIds.length > 0) {
        await productionService.updateDowntime(downtimeIds[0], {
          duration_minutes: downtime
        });
        
        if (downtimeIds.length > 1) {
          for (let i = 1; i < downtimeIds.length; i++) {
            await productionService.updateDowntime(downtimeIds[i], {
              duration_minutes: 0
            });
          }
        }
      }

      toast.addToast('Production report updated successfully', 'success');
      setEditingRowKey(null);
      setEditFormData({});
      
      // Refresh data
      fetchAllData();
    } catch (error) {
      toast.addToast(error.message || 'Failed to update production report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dailyReportColumns = React.useMemo(() => [
    {
      label: 'Date',
      key: 'date',
      render: (val) => <span className="text-slate-900 font-medium">{val.split('-').reverse().join('-')}</span>
    },
    {
      label: 'Shift',
      key: 'shift',
      render: (val) => (
        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded border border-slate-200">
          Shift {val}
        </span>
      )
    },
    {
      label: 'Operator',
      key: 'operator',
      render: (val) => <span className="text-slate-600">{val || 'N/A'}</span>
    },
    {
      label: 'Mins',
      key: 'total_mins',
      align: 'right',
      render: (val, row) => {
        const key = `${row.day}_${row.shift}`;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input 
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded text-right text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.total_mins}
            onChange={(e) => handleEditChange('total_mins', e.target.value)}
          />
        ) : (
          <span className="text-indigo-600 font-medium">{val || 0}</span>
        );
      }
    },
    {
      label: 'Produced',
      key: 'produced',
      align: 'right',
      render: (val, row) => {
        const key = `${row.day}_${row.shift}`;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input 
            type="number"
            className="w-16 p-1 border border-slate-200 rounded text-right text-xs bg-slate-50 outline-none"
            value={editFormData.produced}
            readOnly
          />
        ) : (
          <span className="font-semibold text-slate-900">{val.toLocaleString()}</span>
        );
      }
    },
    {
      label: 'Accepted',
      key: 'accepted',
      align: 'right',
      render: (val, row) => {
        const key = `${row.day}_${row.shift}`;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input 
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded text-right text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.accepted}
            onChange={(e) => handleEditChange('accepted', e.target.value)}
          />
        ) : (
          <span className="text-emerald-600 font-medium">{val.toLocaleString()}</span>
        );
      }
    },
    {
      label: 'Rejected',
      key: 'rejected',
      align: 'right',
      render: (val, row) => {
        const key = `${row.day}_${row.shift}`;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input 
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded text-right text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.rejected}
            onChange={(e) => handleEditChange('rejected', e.target.value)}
          />
        ) : (
          <span className="text-rose-500 font-medium">{val.toLocaleString()}</span>
        );
      }
    },
    {
      label: 'Scrap',
      key: 'scrap',
      align: 'right',
      render: (val, row) => {
        const key = `${row.day}_${row.shift}`;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input 
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded text-right text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.scrap}
            onChange={(e) => handleEditChange('scrap', e.target.value)}
          />
        ) : (
          <span className="text-slate-500 font-medium">{val.toLocaleString()}</span>
        );
      }
    },
    {
      label: 'Downtime',
      key: 'downtime',
      align: 'right',
      render: (val, row) => {
        const key = `${row.day}_${row.shift}`;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <input 
              type="number"
              className="w-16 p-1 border border-indigo-300 rounded text-right text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={editFormData.downtime}
              onChange={(e) => handleEditChange('downtime', e.target.value)}
            />
            <span className="text-[10px] text-slate-400 font-medium">min</span>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <span className="text-amber-600 font-medium">{val || 0}</span>
            <span className="text-[10px] text-slate-400 font-medium">min</span>
          </div>
        );
      }
    }
  ], [editingRowKey, editFormData, handleEditChange])

  // Derive summary stats exclusively from Approved Quality & Rejection Entries
  const approvedRejections = rejections.filter(rej => rej.status === 'Approved');
  
  // Helper to calculate total production matching backend logic (Sum of Max(Logged, Inferred) per shift)
  const calculateTotalProduced = (logs, rejs) => {
    const shiftMap = {};
    logs.forEach(log => {
      const key = `day_${log.day_number || 1}_${normalizeShift(log.shift)}`;
      if (!shiftMap[key]) shiftMap[key] = { produced: 0, rejections: 0 };
      shiftMap[key].produced += (parseFloat(log.completed_qty) || 0);
    });
    rejs.forEach(rej => {
      const key = `day_${rej.day_number || 1}_${normalizeShift(rej.shift)}`;
      if (!shiftMap[key]) shiftMap[key] = { produced: 0, rejections: 0 };
      shiftMap[key].rejections += (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0);
    });
    return Object.values(shiftMap).reduce((sum, s) => sum + Math.max(s.produced, s.rejections), 0);
  };

  const totalProducedQty = calculateTotalProduced(timeLogs, rejections);
  
  const totalAcceptedQty = approvedRejections.reduce((sum, rej) => 
    sum + (parseFloat(rej.accepted_qty) || 0), 0)
    
  const totalRejectedQty = approvedRejections.reduce((sum, rej) => 
    sum + (parseFloat(rej.rejected_qty) || 0), 0)
    
  const totalScrapQty = approvedRejections.reduce((sum, rej) => 
    sum + (parseFloat(rej.scrap_qty) || 0), 0)

  const transferredQty = parseFloat(jobCardData?.transferred_quantity || 0);
  const transferableQty = Math.max(0, totalAcceptedQty - transferredQty);

  const qualityInspectedTotal = approvedRejections.reduce((sum, rej) => 
    sum + (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0), 0)
  
  const qualityScore = qualityInspectedTotal > 0 ? ((totalAcceptedQty / qualityInspectedTotal) * 100).toFixed(1) : 0
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (parseFloat(d.duration_minutes) || 0), 0)
  const hasPendingApproval = rejections.some(rej => rej.status !== 'Approved')

  const maxAllowedQty = previousOperationData
    ? parseFloat(previousOperationData.transferred_quantity || 0)
    : parseFloat(jobCardData?.planned_quantity || 0);

  const isOperationFinished = totalProducedQty >= (maxAllowedQty - 0.1);
  const canTransfer = transferableQty > 0 || isOperationFinished;

  const rejectionReasons = [
    'Size/Dimension Error',
    'Surface Finish Poor',
    'Material Defect',
    'Machining Error',
    'Assembly Issue',
    'Quality Check Failed',
    'Damage in Handling',
    'Other'
  ]

  const downtimeTypes = [
    'Planned Downtime',
    'Unplanned Downtime'
  ]

  const [timeLogForm, setTimeLogForm] = useState({
    employee_id: '',
    operator_name: '',
    machine_id: '',
    shift: 'A',
    day_number: '',
    log_date: getLocalDate(),
    from_time: '08:00',
    from_period: 'AM',
    to_time: '08:00',
    to_period: 'PM',
    time_in_minutes: 0,
    completed_qty: 0,
    inhouse: false,
    outsource: false
  })

  const [rejectionForm, setRejectionForm] = useState({
    reason: '',
    day_number: '',
    log_date: getLocalDate(),
    shift: 'A',
    produce_qty: 0,
    accepted_qty: 0,
    rejected_qty: 0,
    scrap_qty: 0,
    notes: ''
  })

  const [downtimeForm, setDowntimeForm] = useState({
    downtime_type: '',
    downtime_reason: '',
    day_number: '',
    log_date: getLocalDate(),
    shift: 'A',
    from_time: '08:00',
    from_period: 'AM',
    to_time: '08:00',
    to_period: 'PM'
  })

  const [activeSection, setActiveSection] = useState('time-logs')

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId)
    const element = document.getElementById(sectionId)
    if (element) {
      const headerOffset = 20
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [jobCardId])
  
  useEffect(() => {
    const stats = getShiftStats(rejectionForm.log_date, rejectionForm.shift, rejectionForm.day_number);
    const baseProduced = stats.produced;
    
    setRejectionForm(prev => {
      if (prev.produce_qty !== baseProduced) {
        return {
          ...prev,
          produce_qty: baseProduced
        };
      }
      return prev;
    });
  }, [rejectionForm.log_date, rejectionForm.shift, rejectionForm.day_number, timeLogs, rejections]);

  // Automatically fetch produced units for time log form when date/shift changes
  useEffect(() => {
    const stats = getShiftStats(timeLogForm.log_date, timeLogForm.shift, timeLogForm.day_number);
    if (stats.timeLogProduced > 0 && (parseFloat(timeLogForm.completed_qty) === 0 || !timeLogForm.completed_qty)) {
      setTimeLogForm(prev => ({
        ...prev,
        completed_qty: stats.timeLogProduced
      }));
    }
  }, [timeLogForm.log_date, timeLogForm.shift, timeLogForm.day_number, timeLogs]);

  useEffect(() => {
    const mins = calculateDurationMinutes(
      timeLogForm.from_time,
      timeLogForm.from_period,
      timeLogForm.to_time,
      timeLogForm.to_period
    );
    setTimeLogForm(prev => ({ ...prev, time_in_minutes: mins }));
  }, [timeLogForm.from_time, timeLogForm.from_period, timeLogForm.to_time, timeLogForm.to_period]);

  useEffect(() => {
    setRejectionForm(prev => {
      const p = parseFloat(prev.produce_qty) || 0;
      const r = parseFloat(prev.rejected_qty) || 0;
      const s = parseFloat(prev.scrap_qty) || 0;
      const expected = Math.max(0, p - r - s);
      
      if (prev.accepted_qty !== expected) {
        return {
          ...prev,
          accepted_qty: expected
        };
      }
      return prev;
    });
  }, [rejectionForm.produce_qty, rejectionForm.rejected_qty, rejectionForm.scrap_qty]);

  useEffect(() => {
    if (jobCardData && operators.length > 0 && workstations.length > 0) {
      setTimeLogForm(prev => {
        let matchingOperatorId = prev.employee_id
        let matchingOperatorName = prev.operator_name
        let matchingMachineId = prev.machine_id
        let hasChanges = false

        if (!prev.employee_id && jobCardData.operator_id) {
          const matchingOperator = operators.find(op =>
            op.employee_id === jobCardData.operator_id ||
            op.name === jobCardData.operator_id ||
            `${op.first_name} ${op.last_name}` === jobCardData.operator_id
          )
          if (matchingOperator) {
            matchingOperatorId = matchingOperator.employee_id
            matchingOperatorName = `${matchingOperator.first_name} ${matchingOperator.last_name}`
            hasChanges = true
          }
        }

        if (!prev.machine_id && jobCardData.machine_id) {
          const matchingWorkstation = workstations.find(ws =>
            ws.name === jobCardData.machine_id ||
            ws.workstation_name === jobCardData.machine_id ||
            ws.id === jobCardData.machine_id
          )
          if (matchingWorkstation) {
            matchingMachineId = matchingWorkstation.name || matchingWorkstation.workstation_name || matchingWorkstation.id
            hasChanges = true
          }
        }

        if (hasChanges) {
          return {
            ...prev,
            employee_id: matchingOperatorId,
            operator_name: matchingOperatorName,
            machine_id: matchingMachineId
          }
        }
        return prev
      })
    }
  }, [jobCardData, operators, workstations])

  useEffect(() => {
    if (jobCardData && operations.length > 0 && warehouses.length > 0) {
      const currentOperation = jobCardData.operation

      if (currentOperation) {
        const currentOpIndex = operations.findIndex(op =>
          op.operation_name === currentOperation ||
          op.name === currentOperation ||
          op.operation_id === currentOperation ||
          op.id === currentOperation
        )

        if (currentOpIndex !== -1 && currentOpIndex < operations.length - 1) {
          const nextOp = operations[currentOpIndex + 1]

          // Find if there is already a job card for this next operation to get its details
          const nextJobCard = allJobCards.find(jc => 
            String(jc.operation_id) === String(nextOp.operation_id || nextOp.id) || 
            String(jc.operation) === String(nextOp.operation_name || nextOp.name) ||
            parseInt(jc.operation_sequence) === parseInt(nextOp.sequence || nextOp.seq || nextOp.operation_seq)
          )

          const executionMode = nextJobCard?.execution_mode || nextOp.execution_mode || 'IN_HOUSE'
          const isOutsource = executionMode === 'OUTSOURCE'

          const newNextOperationForm = {
            next_operator_id: nextJobCard?.operator_id || '',
            next_warehouse_id: nextJobCard?.warehouse_id || (isOutsource ? nextOp.subcontract_warehouse : nextOp.target_warehouse) || '',
            next_operation_id: nextOp.operation_id || nextOp.id || nextOp.operation_name || nextOp.name,
            inhouse: executionMode === 'IN_HOUSE',
            outsource: isOutsource
          }

          setNextOperationForm(newNextOperationForm)
        }
      }
    }
  }, [jobCardData, operations, warehouses, allJobCards])

  const fetchAllData = async () => {
    try {
      setLoading(true)
      const [jobCardRes, wsRes, empRes, opsRes, whRes] = await Promise.all([
        productionService.getJobCardDetails(jobCardId),
        productionService.getWorkstationsList(),
        productionService.getEmployees(),
        productionService.getOperationsList(),
        productionService.getWarehouses()
      ])

      let jobCard = jobCardRes.data || jobCardRes

      if (!jobCard?.job_card_id) {
        toast.addToast('Job card not found', 'error')
        setTimeout(() => navigate('/manufacturing/job-cards'), 1500)
        return
      }

      const jobCardStatus = normalizeStatus(jobCard?.status)

      if (jobCardStatus === 'draft' || jobCardStatus === 'pending') {
        const updateData = { status: 'in-progress' };
        if (!jobCard.actual_start_date) {
          updateData.actual_start_date = getLocalDate();
          jobCard.actual_start_date = updateData.actual_start_date;
        }
        await productionService.updateJobCard(jobCard.job_card_id, updateData)
        jobCard.status = 'in-progress'
      }

      setWorkstations(wsRes.data || [])
      setOperators(empRes.data || [])
      setWarehouses(whRes.data || [])
      setJobCardData(jobCard)

      // Handle Outsource Operations: Redirect or show restricted view
      if (jobCard.execution_mode === 'OUTSOURCE') {
        toast.addToast('Outsource operation detected. Production should be recorded via Subcontract Receipt.', 'info')
        // We could either navigate away or just let the render handle the restriction
        // For now, let's just let the render handle it if we want to show a specialized message
      }

      const woId = jobCard.work_order_id
      const currentSequence = parseInt(jobCard.operation_sequence || 0)
      let jobCards = []
      let previousLogs = []

      if (woId) {
        const jcResponse = await productionService.getJobCards({ work_order_id: woId })
        jobCards = jcResponse.data || []
        setAllJobCards(jobCards)

        if (currentSequence > 0) {
          const prevCard = jobCards.find(c => parseInt(c.operation_sequence || 0) === currentSequence - 1)
          if (prevCard) {
            setPreviousOperationData(prevCard)
            try {
              const prevLogsRes = await productionService.getTimeLogs({ job_card_id: prevCard.job_card_id })
              previousLogs = prevLogsRes.data || prevLogsRes || []
              setPreviousOperationLogs(previousLogs)
            } catch (err) {
              console.error('Failed to fetch previous operation logs:', err)
            }
          }
        }
      }

      let allOperations = []
      let woData = null

      if (jobCard?.work_order_id) {
        try {
          const woRes = await productionService.getWorkOrder(jobCard.work_order_id)
          woData = woRes?.data || woRes

          const soQty = woData?.qty_to_manufacture || woData?.quantity || woData?.planned_quantity || 0
          setSalesOrderQuantity(parseFloat(soQty) || 0)

          allOperations = woData?.operations || []

          if (allOperations.length === 0 && woData?.item_code) {
            const bomResponse = await productionService.getBOMs({ item_code: woData.item_code })
            const boms = bomResponse.data || []

            if (boms.length > 0) {
              const bomDetails = await productionService.getBOMDetails(boms[0].bom_id)
              const bomData = bomDetails.data || bomDetails

              allOperations = bomData?.operations || []
            }
          }
        } catch (err) {
          console.error('Failed to fetch work order/BOM operations:', err)
        }
      }

      if (allOperations.length === 0) {
        allOperations = opsRes.data || []
      }

      const globalOps = opsRes.data || []

      const enrichedOperations = allOperations.map(op => {
        // Try to find the name from job cards first
        const matchingJobCard = jobCards.find(jc => 
          String(jc.operation_id) === String(op.operation_id || op.id) || 
          parseInt(jc.operation_sequence) === parseInt(op.sequence || op.seq || op.operation_seq)
        )

        let opName = op.operation_name || op.name || matchingJobCard?.operation

        if (!opName && (op.operation_id || op.id)) {
          const globalOp = globalOps.find(g => 
            String(g.operation_id) === String(op.operation_id || op.id) || 
            String(g.id) === String(op.operation_id || op.id)
          )
          opName = globalOp?.name || globalOp?.operation_name
        }

        return {
          ...op,
          name: opName || `Operation ${op.operation_id || op.id}`,
          operation_name: opName || `Operation ${op.operation_id || op.id}`
        }
      })

      const sortedOperations = enrichedOperations.sort((a, b) => {
        const seqA = parseInt(a.sequence || a.seq || a.operation_seq || 0)
        const seqB = parseInt(b.sequence || b.seq || b.operation_seq || 0)
        return seqA - seqB
      })

      setOperations(sortedOperations)

      if (jobCard?.work_order_id) {
        fetchItemName(jobCard.work_order_id)
      }

      const [logsRes, rejsRes, downRes] = await Promise.all([
        productionService.getTimeLogs({ job_card_id: jobCardId }),
        productionService.getRejections({ job_card_id: jobCardId }),
        productionService.getDowntimes({ job_card_id: jobCardId })
      ])

      const logs = (logsRes.data || logsRes || []).sort((a, b) => {
        const dateA = formatDateForMatch(a.log_date);
        const dateB = formatDateForMatch(b.log_date);
        const dateCompare = (dateA || '').localeCompare(dateB || '');
        if (dateCompare !== 0) return dateCompare;
        
        const shiftCompare = normalizeShift(a.shift).localeCompare(normalizeShift(b.shift));
        if (shiftCompare !== 0) return shiftCompare;
        
        return parseTimeToMinutes(a.from_time, a.from_period) - parseTimeToMinutes(b.from_time, b.from_period);
      })
      const rejs = (rejsRes.data || rejsRes || []).sort((a, b) => {
        const dayA = parseInt(a.day_number) || 0;
        const dayB = parseInt(b.day_number) || 0;
        if (dayA !== dayB) return dayA - dayB;

        const dateA = formatDateForMatch(a.log_date);
        const dateB = formatDateForMatch(b.log_date);
        const dateCompare = (dateA || '').localeCompare(dateB || '');
        if (dateCompare !== 0) return dateCompare;

        return normalizeShift(a.shift).localeCompare(normalizeShift(b.shift));
      })
      const down = downRes.data || downRes || []

      setTimeLogs(Array.isArray(logs) ? logs : [])
      setRejections(Array.isArray(rejs) ? rejs : [])
      setDowntimes(Array.isArray(down) ? down : [])

      // Auto-populate next shift/date
      const next = getNextLogicalShiftAndDate(Array.isArray(logs) ? logs : [], Array.isArray(rejs) ? rejs : [], jobCard, previousLogs);
      const shiftTimings = getShiftTimings(next.shift);

      setTimeLogForm(prev => ({
        ...prev,
        shift: next.shift,
        log_date: next.date,
        day_number: next.day,
        ...shiftTimings
      }));

      setRejectionForm(prev => ({
        ...prev,
        shift: next.shift,
        log_date: next.date,
        day_number: next.day
      }));

      setDowntimeForm(prev => ({
        ...prev,
        shift: next.shift,
        log_date: next.date,
        day_number: next.day,
        ...shiftTimings
      }));

    } catch (err) {
      toast.addToast(err.message || 'Failed to load operational data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchItemName = async (woId) => {
    try {
      const response = await productionService.getWorkOrder(woId)
      const data = response.data || response
      setItemName(data.item_name || '')

      if (data.item_code) {
        const bomRes = await productionService.getBOMs({ item_code: data.item_code })
        const boms = bomRes.data || []
        if (boms.length > 0) {
          const details = await productionService.getBOMDetails(boms[0].bom_id)
          const bom = details.data || details

          const currentOp = bom.operations?.find(op =>
            op.operation_name === jobCardData?.operation ||
            op.name === jobCardData?.operation
          )

          if (currentOp) {
            setOperationCycleTime(parseFloat(currentOp.operation_time || 0))
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch item name:', err)
    }
  }

  const getNextShiftData = (currentShift, currentDate, currentDay, currentPeriod) => {
    // Leverage the robust logic in getNextLogicalShiftAndDate by simulating a virtual log
    const virtualLog = {
      log_date: currentDate,
      shift: currentShift,
      day_number: currentDay,
      from_period: currentPeriod,
      from_time: currentShift === 'A' ? '10:00' : '06:00' // Base times
    };

    const next = getNextLogicalShiftAndDate([...timeLogs, virtualLog], rejections, jobCardData, previousOperationLogs);
    
    return {
      shift: next.shift,
      log_date: next.date,
      day_number: next.day
    };
  };

  const syncAllForms = (data, skipTimings = false) => {
    const { shift, log_date, day_number } = data;
    const timings = skipTimings ? {} : getShiftTimings(shift || 'A');

    setTimeLogForm(prev => ({
      ...prev,
      shift: shift || prev.shift,
      log_date: log_date || prev.log_date,
      day_number: day_number || prev.day_number,
      ...timings
    }));

    setRejectionForm(prev => {
      const updated = {
        ...prev,
        shift: shift || prev.shift,
        log_date: log_date || prev.log_date,
        day_number: day_number || prev.day_number
      };
      
      // Also update produce_qty based on the new shift/date
      const stats = getShiftStats(updated.log_date, updated.shift, updated.day_number);
      updated.produce_qty = stats.produced;
      
      return updated;
    });

    setDowntimeForm(prev => ({
      ...prev,
      shift: shift || prev.shift,
      log_date: log_date || prev.log_date,
      day_number: day_number || prev.day_number,
      ...timings
    }));
  };

  const handleDayChange = (val, formType) => {
    const dayNum = parseInt(val) || 1;
    
    // Get current state based on formType
    const currentForm = formType === 'rejection' ? rejectionForm : 
                        formType === 'downtime' ? downtimeForm : timeLogForm;
    
    // Anchor for "Day 1"
    let anchorDateStr = jobCardData?.actual_start_date;
    
    if (!anchorDateStr) {
      // If no actual_start_date, infer anchor from current state
      const currentDay = parseInt(currentForm.day_number) || 1;
      const parts = (currentForm.log_date || getLocalDate()).split('-');
      const currentLogDate = new Date(parts[0], parts[1] - 1, parts[2]);
      
      if (!isNaN(currentLogDate.getTime())) {
        currentLogDate.setDate(currentLogDate.getDate() - (currentDay - 1));
        anchorDateStr = formatDateForMatch(currentLogDate);
      }
    }

    let newDate = anchorDateStr || getLocalDate();

    if (anchorDateStr) {
      // Use parts parsing to avoid UTC shift
      const parts = anchorDateStr.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + (dayNum - 1));
        
        // If Shift B and period is AM, the calendar date is one day ahead of the production day start
        if (currentForm.shift === 'B' && currentForm.from_period === 'AM') {
          d.setDate(d.getDate() + 1);
        }
        
        newDate = formatDateForMatch(d);
      }
    }

    syncAllForms({ day_number: val, log_date: newDate, shift: currentForm.shift }, true);

    // Explicitly update produce_qty for rejection form
    if (formType === 'rejection') {
      const stats = getShiftStats(newDate, currentForm.shift, val);
      setRejectionForm(prev => ({ ...prev, produce_qty: stats.produced }));
    }
  }

  const handleDateChange = (val, formType) => {
    const currentForm = formType === 'rejection' ? rejectionForm : 
                        formType === 'downtime' ? downtimeForm : timeLogForm;
    
    // Calculate new day number based on date if possible
    let newDayNumber = currentForm.day_number;
    const anchorDateStr = jobCardData?.actual_start_date;
    
    if (anchorDateStr && val) {
      const anchorParts = anchorDateStr.split('-');
      const anchorDate = new Date(anchorParts[0], anchorParts[1] - 1, anchorParts[2]);
      const newParts = val.split('-');
      const newDate = new Date(newParts[0], newParts[1] - 1, newParts[2]);
      
      if (!isNaN(anchorDate.getTime()) && !isNaN(newDate.getTime())) {
        const diffTime = newDate.getTime() - anchorDate.getTime();
        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        // If Shift B and period is AM, the calendar date is one day ahead of the production day
        if (currentForm.shift === 'B' && currentForm.from_period === 'AM') {
          diffDays = Math.max(1, diffDays - 1);
        }
        
        // Only update if it's a reasonable day number (>= 1)
        if (diffDays >= 1) {
          newDayNumber = String(diffDays);
        }
      }
    }
    
    syncAllForms({ log_date: val, shift: currentForm.shift, day_number: newDayNumber }, true);

    // Explicitly update produce_qty for rejection form
    if (formType === 'rejection') {
      const stats = getShiftStats(val, currentForm.shift, newDayNumber);
      setRejectionForm(prev => ({ ...prev, produce_qty: stats.produced }));
    }
  }

  const handleShiftChange = (val, formType) => {
    const isRejection = formType === 'rejection';
    const isDowntime = formType === 'downtime';
    const currentForm = isRejection ? rejectionForm : (isDowntime ? downtimeForm : timeLogForm);
    
    // When manually changing shift, try to see if we should also change the day/date
    // to match the logical manufacturing sequence
    const nextData = getNextLogicalShiftAndDate(timeLogs, rejections, jobCardData, previousOperationLogs);
    
    // If the user manually selected the "logical next shift", use the logical date/day too
    if (val === nextData.shift) {
      syncAllForms({ shift: val, log_date: nextData.date, day_number: nextData.day }, false);
    } else {
      syncAllForms({ shift: val, log_date: currentForm.log_date, day_number: currentForm.day_number }, false);
    }

    // Explicitly update produce_qty for rejection form
    if (isRejection) {
      const targetDate = val === nextData.shift ? nextData.date : currentForm.log_date;
      const targetDay = val === nextData.shift ? nextData.day : currentForm.day_number;
      const stats = getShiftStats(targetDate, val, targetDay);
      setRejectionForm(prev => ({ ...prev, produce_qty: stats.produced }));
    }
  }

  const handleTimeFieldChange = (field, value, formType) => {
    const isTimeLog = formType === 'timeLog';
    const isDowntime = formType === 'downtime';
    const form = isTimeLog ? timeLogForm : (isDowntime ? downtimeForm : rejectionForm);
    const setForm = isTimeLog ? setTimeLogForm : (isDowntime ? setDowntimeForm : setRejectionForm);

    let updatedForm = { ...form, [field]: value };
    
    // Handle Shift B date transitions (PM to AM)
    if (updatedForm.shift === 'B' && (field === 'from_period' || field === 'to_period')) {
      const parts = (form.log_date || getLocalDate()).split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      
      const prevPeriod = form[field];
      const nextPeriod = value;

      if (prevPeriod === 'PM' && nextPeriod === 'AM') {
        d.setDate(d.getDate() + 1);
        const newDate = formatDateForMatch(d);
        syncAllForms({ day_number: form.day_number, log_date: newDate, shift: 'B' }, true);
        return;
      } else if (prevPeriod === 'AM' && nextPeriod === 'PM') {
        d.setDate(d.getDate() - 1);
        const newDate = formatDateForMatch(d);
        syncAllForms({ day_number: form.day_number, log_date: newDate, shift: 'B' }, true);
        return;
      }
    }
    
    setForm(updatedForm);
  };

  const handleOperatorChange = (val) => {
    const op = operators.find(o => o.employee_id === val)
    setTimeLogForm(prev => ({
      ...prev,
      employee_id: val,
      operator_name: op ? `${op.first_name} ${op.last_name}` : ''
    }))
  }

  const calculatePotentialIncrease = (formType, formData) => {
    const enteringQty = formType === 'timeLog' 
      ? (parseFloat(formData.completed_qty) || 0)
      : (parseFloat(formData.accepted_qty) || 0) + (parseFloat(formData.rejected_qty) || 0) + (parseFloat(formData.scrap_qty) || 0);
    
    // Simulate new state to calculate the hypothetical total
    const simulatedLogs = formType === 'timeLog' ? [...timeLogs, formData] : timeLogs;
    const simulatedRejs = formType === 'rejection' ? [...rejections, formData] : rejections;
    
    const nextTotalProduced = calculateTotalProduced(simulatedLogs, simulatedRejs);
    const increase = nextTotalProduced - totalProducedQty;

    // BUSINESS RULE: Quality entries should NOT increase the total production count 
    // if the units are already accounted for in Time Logs (even in different shifts).
    // This allows decoupling production from inspection timing.
    if (formType === 'rejection') {
      const globalTimeLogProduced = timeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0);
      const globalRejectionInspected = rejections.reduce((sum, rej) => 
        sum + (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0), 0);
      
      const newGlobalRejectionInspected = globalRejectionInspected + enteringQty;
      
      if (globalTimeLogProduced > 0) {
        const currentEffectiveTotal = Math.max(globalTimeLogProduced, globalRejectionInspected);
        const nextEffectiveTotal = Math.max(globalTimeLogProduced, newGlobalRejectionInspected);
        return Math.max(0, nextEffectiveTotal - currentEffectiveTotal);
      }
    }

    return increase;
  };

  const getShiftStats = (date, shift, dayNumber) => {
    const targetDate = formatDateForMatch(date);
    const targetShift = normalizeShift(shift);
    const targetDay = dayNumber ? String(dayNumber) : null;

    const isMatch = (entry) => {
      const entryShift = normalizeShift(entry.shift);
      const entryDay = entry.day_number ? String(entry.day_number) : null;
      
      if (entryShift !== targetShift) return false;
      
      // If we have day numbers, they are the most reliable link for a shift
      if (targetDay && entryDay) {
        return entryDay === targetDay;
      }
      
      // Fallback to date match if day numbers are missing or for older records
      const entryDate = formatDateForMatch(entry.log_date);
      return entryDate === targetDate;
    };

    const shiftTimeLogs = timeLogs.filter(isMatch);
    const shiftRejections = rejections.filter(isMatch);

    const produced = shiftTimeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0);
    const rejectionProduced = shiftRejections.reduce((sum, rej) => sum + (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0), 0);

    return {
      produced: Math.max(produced, rejectionProduced),
      timeLogProduced: produced,
      rejectionProduced: rejectionProduced
    };
  };

  const handleAddTimeLog = async (e) => {
    e.preventDefault()
    
    // Frontend validation
    const increase = calculatePotentialIncrease('timeLog', timeLogForm);
    if (totalProducedQty + increase > maxAllowedQty + 0.0001) {
      toast.addToast(`Quantity exceeds limit. Current: ${totalProducedQty.toFixed(2)}, Increase: ${increase.toFixed(2)}, Allowed: ${maxAllowedQty.toFixed(2)}`, 'error');
      return;
    }

    try {
      setFormLoading(true)
      
      const response = await productionService.createTimeLog({
        ...timeLogForm,
        accepted_qty: timeLogForm.completed_qty, // Sync accepted_qty with completed_qty
        job_card_id: jobCardId
      })
      toast.addToast('Time log added successfully', 'success')
      const nextData = getNextShiftData(timeLogForm.shift, timeLogForm.log_date, timeLogForm.day_number, timeLogForm.from_period);
      syncAllForms(nextData);
      setTimeLogForm(prev => ({ ...prev, completed_qty: 0 }));
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add time log', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddRejection = async (e) => {
    e.preventDefault()

    // Frontend validation
    const increase = calculatePotentialIncrease('rejection', rejectionForm);
    if (totalProducedQty + increase > maxAllowedQty + 0.0001) {
      toast.addToast(`Quantity exceeds limit. Current: ${totalProducedQty.toFixed(2)}, Increase: ${increase.toFixed(2)}, Allowed: ${maxAllowedQty.toFixed(2)}`, 'error');
      return;
    }

    try {
      setFormLoading(true)
      await productionService.createRejection({
        ...rejectionForm,
        job_card_id: jobCardId,
        rejection_reason: rejectionForm.reason
      })
      toast.addToast('Quality entry added successfully', 'success')
      setRejectionForm({ ...rejectionForm, accepted_qty: 0, rejected_qty: 0, scrap_qty: 0, reason: '' })
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add quality entry', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddDowntime = async (e) => {
    e.preventDefault()
    try {
      setFormLoading(true)
      
      const duration_minutes = calculateDurationMinutes(
        downtimeForm.from_time,
        downtimeForm.from_period,
        downtimeForm.to_time,
        downtimeForm.to_period
      );

      await productionService.createDowntime({
        ...downtimeForm,
        duration_minutes,
        job_card_id: jobCardId
      })
      toast.addToast('Downtime entry added successfully', 'success')
      setDowntimeForm({ 
        ...downtimeForm, 
        downtime_reason: '',
        ...getShiftTimings(downtimeForm.shift)
      })
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add downtime entry', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteTimeLog = async (id) => {
    if (window.confirm('Remove this time log?')) {
      try {
        await productionService.deleteTimeLog(id)
        toast.addToast('Entry removed', 'success')
        fetchAllData()
      } catch (err) {
        toast.addToast(err.message || 'Failed to remove entry', 'error')
      }
    }
  }

  const handleDeleteRejection = async (id) => {
    if (window.confirm('Remove this quality entry?')) {
      try {
        await productionService.deleteRejection(id)
        toast.addToast('Entry removed', 'success')
        fetchAllData()
      } catch (err) {
        toast.addToast(err.message || 'Failed to remove entry', 'error')
      }
    }
  }

  const handleApproveRejection = async (id) => {
    try {
      setFormLoading(true)
      await productionService.approveRejection(id)
      toast.addToast('Quality inspection approved', 'success')
      await fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to approve inspection', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteDowntime = async (id) => {
    if (window.confirm('Remove this downtime entry?')) {
      try {
        await productionService.deleteDowntime(id)
        toast.addToast('Entry removed', 'success')
        fetchAllData()
      } catch (err) {
        toast.addToast(err.message || 'Failed to remove entry', 'error')
      }
    }
  }

  const handleSubmitProduction = async () => {
    try {
      setIsSubmitting(true)

      const totalAccepted = totalAcceptedQty
      const shouldComplete = isOperationFinished

      const updatePayload = {
        produced_quantity: totalProducedQty,
        accepted_quantity: totalAcceptedQty,
        rejected_quantity: totalRejectedQty,
        scrap_quantity: totalScrapQty
      }

      // Handle Next Operation Transfer
      if (nextOperationForm.next_operation_id) {
        updatePayload.transfer_to_next_op = true;
        
        const selectedOp = operations.find(op => 
          (op.operation_id || op.id || op.operation_name || op.name) === nextOperationForm.next_operation_id
        );
        const selectedSeq = selectedOp ? parseInt(selectedOp.sequence || selectedOp.seq || selectedOp.operation_seq || 0) : 0;
        
        // Find if there's a specific job card for this operation/sequence
        const nextJobCard = allJobCards.find(c => {
          const isOpMatch = c.operation_id === nextOperationForm.next_operation_id || 
                           c.operation === nextOperationForm.next_operation_id ||
                           c.operation === (selectedOp?.operation_name || selectedOp?.name);
          
          const isSeqMatch = parseInt(c.operation_sequence) === selectedSeq;
          
          return isOpMatch && isSeqMatch;
        });

        if (nextJobCard) {
          updatePayload.next_job_card_id = nextJobCard.job_card_id;
          updatePayload.next_operator_id = nextOperationForm.next_operator_id;
          updatePayload.next_machine_id = nextOperationForm.next_machine_id;
        }
      }

      // Only update status and actual_end_date if finishing or if not already in-progress
      const currentStatusNormalized = normalizeStatus(jobCardData?.status)
      if (shouldComplete) {
        updatePayload.status = 'completed'
        updatePayload.actual_end_date = new Date().toISOString()
      } else if (currentStatusNormalized !== 'in-progress') {
        updatePayload.status = 'in-progress'
      }

      await productionService.updateJobCard(jobCardId, updatePayload)

      toast.addToast(shouldComplete ? 'Production stage completed successfully' : 'Partial quantity transferred successfully', 'success')
      
      if (shouldComplete) {
        navigate('/manufacturing/job-cards')
      } else {
        await fetchAllData()
      }
    } catch (err) {
      toast.addToast(err.message || 'Failed to complete production', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateDailyReport = () => {
    const reportData = {};

    // Process time logs for produced quantity
    timeLogs.forEach(log => {
      const dateKey = formatDateForMatch(log.log_date);
      const shiftKey = normalizeShift(log.shift);
      const dayNum = log.day_number || 1;
      const key = `${dayNum}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          day: dayNum,
          operator: log.operator_name,
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0,
          total_mins: 0,
          timeLogIds: [],
          rejectionIds: [],
          downtimeIds: []
        };
      } else if (!reportData[key].operator && log.operator_name) {
        reportData[key].operator = log.operator_name;
      }
      reportData[key].produced += parseFloat(log.completed_qty || 0);
      reportData[key].total_mins += parseFloat(log.time_in_minutes || 0);
      if (log.time_log_id) reportData[key].timeLogIds.push(log.time_log_id);
    });

    // Process rejections for quality data
    rejections.forEach(rej => {
      const dateKey = formatDateForMatch(rej.log_date);
      const shiftKey = normalizeShift(rej.shift);
      const dayNum = rej.day_number || 1;
      const key = `${dayNum}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          day: dayNum,
          operator: 'N/A',
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0,
          total_mins: 0,
          timeLogIds: [],
          rejectionIds: [],
          downtimeIds: []
        };
      }
      
      // We only include accepted/rejected/scrap if the quality entry is APPROVED
      // to match the "Quality Gate" business logic
      if (rej.status === 'Approved') {
        reportData[key].accepted += parseFloat(rej.accepted_qty || 0);
        reportData[key].rejected += parseFloat(rej.rejected_qty || 0);
        reportData[key].scrap += parseFloat(rej.scrap_qty || 0);
        reportData[key].isApproved = true;
        if (rej.rejection_id) reportData[key].rejectionIds.push(rej.rejection_id);
      }
    });

    // Process downtimes
    downtimes.forEach(down => {
      const dateKey = formatDateForMatch(down.log_date);
      const shiftKey = normalizeShift(down.shift);
      const dayNum = down.day_number || 1;
      const key = `${dayNum}_${shiftKey}`;

      if (!reportData[key]) {
        reportData[key] = {
          date: dateKey,
          shift: shiftKey,
          day: dayNum,
          operator: 'N/A',
          produced: 0,
          accepted: 0,
          rejected: 0,
          scrap: 0,
          downtime: 0,
          total_mins: 0,
          timeLogIds: [],
          rejectionIds: [],
          downtimeIds: []
        };
      }
      reportData[key].downtime += parseFloat(down.duration_minutes || 0);
      if (down.downtime_id) reportData[key].downtimeIds.push(down.downtime_id);
    });

    return Object.values(reportData)
      .filter(row => row.isApproved)
      .sort((a, b) => (parseInt(b.day) - parseInt(a.day)) || b.shift.localeCompare(a.shift));
  };

  const downloadReport = () => {
    const data = generateDailyReport();
    const headers = ['Date', 'Shift', 'Operator', 'Total Mins', 'Produced', 'Accepted', 'Rejected', 'Scrap', 'Downtime (min)'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date.split('-').reverse().join('-'),
        row.shift,
        `"${row.operator || 'N/A'}"`,
        row.total_mins || 0,
        row.produced.toFixed(2),
        row.accepted.toFixed(2),
        row.rejected.toFixed(2),
        row.scrap.toFixed(2),
        row.downtime.toFixed(0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Production_Report_${jobCardId}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderViewModalContent = () => {
    if (!modalItem) return null;

    if (modalType === 'timeLog') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Date & Shift</p>
              <p className="text-sm font-medium">{new Date(modalItem.log_date).toLocaleDateString()} - Shift {modalItem.shift}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Operator</p>
              <p className="text-sm font-medium">{modalItem.operator_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Time Interval</p>
              <p className="text-sm font-medium">{modalItem.from_time} {modalItem.from_period} - {modalItem.to_time} {modalItem.to_period}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Produced Quantity</p>
              <p className="text-sm font-medium text-indigo-600">{parseFloat(modalItem.completed_qty || 0).toLocaleString()} Units</p>
            </div>
          </div>
        </div>
      );
    }

    if (modalType === 'rejection') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Date & Shift</p>
              <p className="text-sm font-medium">{new Date(modalItem.log_date).toLocaleDateString()} - Shift {modalItem.shift}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Status</p>
              <p className="text-sm font-medium">{modalItem.status}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Accepted Qty</p>
              <p className="text-sm font-medium text-emerald-600">{parseFloat(modalItem.accepted_qty || 0).toLocaleString()} Units</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Rejected Qty</p>
              <p className="text-sm font-medium text-rose-600">{parseFloat(modalItem.rejected_qty || 0).toLocaleString()} Units</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Scrap Qty</p>
              <p className="text-sm font-medium text-slate-600">{parseFloat(modalItem.scrap_qty || 0).toLocaleString()} Units</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Reason / Notes</p>
              <p className="text-sm font-medium">{modalItem.rejection_reason || 'No notes provided'}</p>
            </div>
          </div>
        </div>
      );
    }

    if (modalType === 'downtime') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Date & Shift</p>
              <p className="text-sm font-medium">{new Date(modalItem.log_date).toLocaleDateString()} - Shift {modalItem.shift}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Duration</p>
              <p className="text-sm font-medium text-amber-600">{modalItem.duration_minutes} Minutes</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Type</p>
              <p className="text-sm font-medium">{modalItem.downtime_type}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">Reason</p>
              <p className="text-sm font-medium">{modalItem.downtime_reason || 'No reason provided'}</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-slate-500  animate-pulse">Syncing Production Environment...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-2 font-sans antialiased text-slate-900">

      <div className="w-full mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl  text-slate-900 ">
                  Production Entry
                </h1>
                <StatusBadge status={jobCardData?.status} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span className=" text-slate-700">{jobCardData?.job_card_id || 'LOADING...'}</span>
                <span className="text-slate-300">•</span>
                <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manufacturing/job-cards')}
              className="flex items-center gap-2 p-2 text-xs  text-slate-600 bg-slate-50 hover:bg-slate-100 rounded transition-all"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            {isOperationFinished && normalizeStatus(jobCardData?.status) !== 'completed' && (
              <button
                onClick={handleSubmitProduction}
                disabled={isSubmitting}
                className="flex items-center gap-2 p-2  bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50  shadow-emerald-200 transition-all text-sm  animate-bounce"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle size={15} />
                )}
                {normalizeStatus(jobCardData?.status) === 'completed' ? 'Update & Sync Stage' : 'Complete Production'}
              </button>
            )}
          </div>
        </div>

        {jobCardData?.execution_mode === 'OUTSOURCE' && (
          <div className="mb-6 p-8 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded  text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4  shadow-indigo-100">
              <Package className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-xl  text-slate-900 mb-2">Outsource Operation</h2>
            <p className="text-slate-600 max-w-lg mx-auto mb-6">
              This operation is handled by an external vendor. 
              Production tracking and stock movements for outsourced tasks are managed via 
              <strong> Subcontract Dispatch</strong> and <strong>Receipt</strong> in the Job Card list.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/manufacturing/job-cards')}
                className="p-2   bg-indigo-600 text-white rounded  font-semibold  shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"
              >
                <ArrowLeft size={18} />
                Back to Job Cards
              </button>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-12 gap-4 mb28 ${jobCardData?.execution_mode === 'OUTSOURCE' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          {/* Target Item Card - Horizontal Layout */}
          <Card className="col-span-12  border-slate-100 bg-white p-2 flex flex-col md:flex-row items-start md:items-center gap-6 ">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-6 h-6 bg-slate-50 rounded flex items-center justify-center border border-slate-100 shrink-0">
                <Package className="text-slate-400" size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px]  tracking-wider text-slate-400 mb-1 font-semibold">Target Item</p>
                <h2 className="text-base text-slate-900 truncate " title={itemName || jobCardData?.item_name}>
                  {itemName || jobCardData?.item_name || 'N/A'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{jobCardData?.item_code || '---'}</p>
              </div>
            </div>

            <div className="h-10 w-px bg-slate-100 hidden md:block" />

            <div className="flex items-center gap-8 px-2">
              <div>
                <p className="text-[10px]  tracking-wider text-slate-400 mb-1 font-semibold">Planned</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-md text-slate-900 ">
                    {parseFloat(maxAllowedQty || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">Units</span>
                </div>
              </div>
              {previousOperationData && (
                <div>
                  <p className="text-[10px]  tracking-wider text-indigo-400 mb-1 font-semibold">Received</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-indigo-600 font-bold">
                      {parseFloat(previousOperationData.transferred_quantity || 0).toLocaleString()}
                    </span>
                    <span className="text-xs text-indigo-400">Units</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-[10px]  tracking-wider text-slate-400 mb-1 font-semibold">Produced</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-slate-900 ">
                    {totalProducedQty.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px]  tracking-wider text-slate-400 mb-1 font-semibold">Accepted</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-emerald-600 ">
                    {totalAcceptedQty.toLocaleString()}
                  </span>
                  <span className="text-xs text-emerald-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px]  tracking-wider text-slate-400 mb-1 font-semibold">Transferred</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-indigo-600 ">
                    {parseFloat(jobCardData?.transferred_quantity || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-indigo-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px]  tracking-wider text-amber-500 mb-1 font-bold uppercase">Balance WIP</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg text-amber-600 font-bold">
                    {transferableQty.toLocaleString()}
                  </span>
                  <span className="text-xs text-amber-400">Units</span>
                </div>
              </div>
              <div>
                <p className="text-[10px]  tracking-wider text-slate-400 mb-1 font-semibold">Current Op</p>
                <div className="flex items-center gap-2 text-indigo-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span className="text-sm  truncate max-w-[120px]" title={jobCardData?.operation}>
                    {jobCardData?.operation || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Stats Section - Horizontal Layout */}
          <div className="col-span-12">
            {(() => {
              const expectedMinutes = (operationCycleTime || 0) * (totalProducedQty || 0)
              const actualMinutes = timeLogs.reduce((sum, log) => sum + (parseFloat(log.time_in_minutes) || 0), 0)

              const efficiency = actualMinutes > 0 ? ((expectedMinutes / actualMinutes) * 100).toFixed(0) : 0

              return (
                <div className="grid grid-cols-3 gap-4 h-full">
                  <StatCard
                    label="Efficiency"
                    value={`${efficiency}%`}
                    icon={Activity}
                    color={efficiency >= 90 ? 'emerald' : efficiency >= 75 ? 'amber' : 'rose'}
                    subtitle={`${actualMinutes.toFixed(0)} / ${expectedMinutes.toFixed(0)} MIN`}
                  />
                  <StatCard
                    label="Quality Yield"
                    value={`${qualityScore}%`}
                    icon={ShieldCheck}
                    color={hasPendingApproval ? 'amber' : (qualityScore >= 98 ? 'emerald' : 'amber')}
                    subtitle={hasPendingApproval ? "PENDING APPROVAL" : "ACCEPTANCE RATE"}
                  />
                  <StatCard
                    label="Productivity"
                    value={actualMinutes > 0 ? ((totalAcceptedQty / (actualMinutes / 60)).toFixed(1)) : '0'}
                    icon={Boxes}
                    color="indigo"
                    subtitle="UNITS PER HOUR"
                  />
                </div>
              )
            })()}
          </div>
          
        </div>
        
        <div className="grid grid-cols-12 gap-2">
          {/* Left Column: Navigation Only */}
          <div className="col-span-12 lg:col-span-2">
            <div className="sticky top-8 space-y-2">
              {/* Quick Navigation Card */}


              {previousOperationData && (
                <Card className="p-0 border-none bg-emerald-50/20 rounded  overflow-hidden border border-emerald-100/50 ">
                  <div className="p-3 bg-emerald-600 text-white flex items-center gap-2">
                    <CheckCircle size={14} />
                    <h3 className="text-[10px]  tracking-wider  text-white/90">Previous Phase</h3>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <p className="text-[9px]  tracking-wider text-emerald-600/70 mb-1 font-semibold">Operation</p>
                      <p className="text-xs text-slate-900 ">{previousOperationData.operation}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-100">
                      <div>
                        <p className="text-[9px]  tracking-wider text-slate-400 mb-1 font-semibold">Accepted</p>
                        <p className="text-sm text-emerald-600 ">
                          {parseFloat(parseFloat(previousOperationData.accepted_quantity) || ((parseFloat(previousOperationData.produced_quantity) || 0) - (parseFloat(previousOperationData.rejected_quantity) || 0))).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px]  tracking-wider text-slate-400 mb-1 font-semibold">Rejected</p>
                        <p className="text-sm text-rose-500 ">
                          {parseFloat(previousOperationData.rejected_quantity || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>

          <div className="col-span-12 lg:col-span-12 ">
            {/* Time Logs Section */}
            <div id="time-logs" className="animate-in fade-in slide-in-from-bottom-2 bg-blue-50/50 duration-300 rounded  p-4">
              <Card className=" border-none  overflow-visible">
                <SectionTitle title="Add Time Log" icon={Plus} />
                <form onSubmit={handleAddTimeLog} className="grid grid-cols-12 gap-2  items-end items-end">
                  <div className='col-span-3'>
                    <FieldWrapper label="Day & Date" required >
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder='1'
                          value={timeLogForm.day_number}
                          onChange={(e) => handleDayChange(e.target.value, 'timeLog')}
                          className="w-14 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          required
                        />
                        <input
                          type="date"
                          value={timeLogForm.log_date}
                          onChange={(e) => handleDateChange(e.target.value, 'timeLog')}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          required
                        />
                      </div>
                      {(() => {
                        const stats = getShiftStats(timeLogForm.log_date, timeLogForm.shift);
                        return stats.maxProduced > 0 ? (
                          <p className="text-[9px] text-indigo-600 mt-1  italic">
                            Already logged in this shift: {stats.maxProduced.toFixed(0)} units
                          </p>
                        ) : null;
                      })()}
                    </FieldWrapper>
                  </div>

                  <div className='col-span-3'>
                    <FieldWrapper label="Operator" required>
                      <SearchableSelect
                        value={timeLogForm.employee_id}
                        onChange={handleOperatorChange}
                        options={operators.map(op => ({
                          value: op.employee_id,
                          label: `${op.first_name} ${op.last_name}`
                        }))}
                        placeholder="Select Operator"
                        containerClassName=" rounded bg-slate-50 border-slate-200 transition-all"
                      />
                    </FieldWrapper>
                  </div>
                  <div className='col-span-3'>
                    <FieldWrapper label="Workstation" required>
                      <SearchableSelect
                        value={timeLogForm.machine_id}
                        onChange={(value) => setTimeLogForm({ ...timeLogForm, machine_id: value })}
                        options={workstations.map(ws => ({
                          value: ws.name || ws.workstation_name || ws.id,
                          label: ws.workstation_name || ws.name || ws.id
                        }))}
                        placeholder="Select Machine"
                        containerClassName=" rounded bg-slate-50 border-slate-200 transition-all"
                      />
                    </FieldWrapper>
                  </div>
                  <div className='col-span-1'>
                    <FieldWrapper label="Shift" required>
                      <div className="flex gap-1">
                        <select
                          value={timeLogForm.shift}
                          onChange={(e) => handleShiftChange(e.target.value, 'timeLog')}
                          className="flex-1 p-2  bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                          {shifts.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const nextData = getNextShiftData(timeLogForm.shift, timeLogForm.log_date, timeLogForm.day_number, timeLogForm.from_period);
                            syncAllForms(nextData);
                          }}
                          className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 text-indigo-600 transition-colors"
                          title="Next Shift"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-2'>
                    <FieldWrapper label="Produce Qty" required>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={timeLogForm.completed_qty}
                          onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px]  text-slate-400 ">UNITS</span>
                      </div>
                      {(() => {
                        const stats = getShiftStats(timeLogForm.log_date, timeLogForm.shift, timeLogForm.day_number);
                        return stats.timeLogProduced > 0 ? (
                          <p className="text-[9px] text-indigo-600 mt-1  italic">
                            Already recorded: {stats.timeLogProduced.toFixed(0)} units
                          </p>
                        ) : null;
                      })()}
                    </FieldWrapper>
                  </div>

                  <div className="col-span-4">
                    <FieldWrapper label="Production Period" required>
                      <div className="flex gap-2 items-center">
                        <div className="flex flex-1 gap-1">
                          <input
                            type="time"
                            value={timeLogForm.from_time}
                            onChange={(e) => handleTimeFieldChange('from_time', e.target.value, 'timeLog')}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                          />
                          <select
                            value={timeLogForm.from_period}
                            onChange={(e) => handleTimeFieldChange('from_period', e.target.value, 'timeLog')}
                            className="p-2 bg-slate-100 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 shrink-0" />
                        <div className="flex flex-1 gap-1">
                          <input
                            type="time"
                            value={timeLogForm.to_time}
                            onChange={(e) => handleTimeFieldChange('to_time', e.target.value, 'timeLog')}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            required
                          />
                          <select
                            value={timeLogForm.to_period}
                            onChange={(e) => handleTimeFieldChange('to_period', e.target.value, 'timeLog')}
                            className="p-2 bg-slate-100 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className="col-span-1">
                    <FieldWrapper label="Total Mins" required>
                      <input
                        type="number"
                        value={timeLogForm.time_in_minutes}
                        onChange={(e) => setTimeLogForm({ ...timeLogForm, time_in_minutes: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                    </FieldWrapper>
                  </div>



                  <div className="col-span-1 flex items-end flex-1 col-span-3">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50 transition-all  shadow-indigo-100 flex items-center justify-center gap-2"
                    >
                      {formLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      Record Time
                    </button>
                  </div>
                </form>

                {/* Logs Table */}
                <div className="mt-8">
                  <DataTable 
                    columns={timeLogColumns} 
                    data={timeLogs} 
                    renderActions={(row) => renderTableActions(row, 'timeLog')}
                  />
                </div>
              </Card>
            </div>

            <div id="quality-entry" className="animate-in fade-in slide-in-from-bottom-2 bg-emerald-50/50 duration-300 rounded  p-4">
              <Card className="p-3 border-none ">
                <SectionTitle title="Quality & Rejection Entry" icon={ShieldCheck} />
                <form onSubmit={handleAddRejection} className="grid grid-cols-12 gap-2  items-end">
                  <div className='col-span-3'>
                    <div className="flex items-center gap-10 mb-1 ml-1">
                      <label className="text-xs text-slate-900 font-thin flex items-center gap-1">
                        Day <span className="text-rose-500">*</span>
                      </label>
                      <label className="text-xs text-slate-900 font-thin flex items-center gap-1">
                        Date <span className="text-rose-500">*</span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={rejectionForm.day_number}
                        onChange={(e) => handleDayChange(e.target.value, 'rejection')}
                        className="w-14 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                      <input
                        type="date"
                        value={rejectionForm.log_date}
                        onChange={(e) => handleDateChange(e.target.value, 'rejection')}
                        className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                    </div>
                    {(() => {
                      const stats = getShiftStats(rejectionForm.log_date, rejectionForm.shift, rejectionForm.day_number);
                      return stats.produced > 0 ? (
                        <p className="text-[9px] text-indigo-600 mt-1  italic">
                          Produced units in this shift: {stats.produced.toFixed(0)} units
                        </p>
                      ) : null;
                    })()}
                  </div>

                  <div className='col-span-1'>
                    <FieldWrapper label="Shift" required>
                      <div className="flex gap-1">
                        <select
                          value={rejectionForm.shift}
                          onChange={(e) => handleShiftChange(e.target.value, 'rejection')}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                          {shifts.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const nextData = getNextShiftData(rejectionForm.shift, rejectionForm.log_date, rejectionForm.day_number, 'PM');
                            syncAllForms(nextData);
                          }}
                          className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 text-indigo-600 transition-colors"
                          title="Next Shift"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-1'>
                    <FieldWrapper label="Produce Qty">
                      <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-700  h-[34px] flex items-center justify-center">
                        {rejectionForm.produce_qty || 0}
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-2'>
                    <FieldWrapper label="Rejection Reason">
                      <select
                        value={rejectionForm.reason}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                      >
                        <option value="">Select Reason</option>
                        {rejectionReasons.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>


                  <div className='col-span-1'>
                    <FieldWrapper label="Accepted" required>
                      <input
                        type="number"
                        step="0.01"
                        value={rejectionForm.accepted_qty}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, accepted_qty: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-emerald-50/50 border border-emerald-100 rounded text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-emerald-700 "
                        required
                      />
                    </FieldWrapper>
                  </div>
                  <div className='col-span-1'>
                    <FieldWrapper label="Rejected (Scrap)" required>
                      <input
                        type="number"
                        step="0.01"
                        value={rejectionForm.rejected_qty}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-rose-50/50 border border-rose-100 rounded text-xs outline-none focus:ring-2 focus:ring-rose-500/20 transition-all text-rose-700 "
                        required
                      />
                    </FieldWrapper>
                  </div>
                  <div className='col-span-1'>
                    <FieldWrapper label="Scrap" required>
                      <input
                        type="number"
                        step="0.01"
                        value={rejectionForm.scrap_qty}
                        onChange={(e) => setRejectionForm({ ...rejectionForm, scrap_qty: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-slate-500/20 transition-all "
                        required
                      />
                    </FieldWrapper>
                  </div>


                  <div className="col-span-2 ">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700 disabled:opacity-50 transition-all  shadow-emerald-100 flex items-center justify-center gap-2"
                    >
                      {formLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      Save Entry
                    </button>
                  </div>
                </form>

                <div className="mt-4 p-3  border  rounded  flex items-start gap-3">
                  <div className="p-1.5 bg-amber-100 text-amber-600 rounded">
                    <Info size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px]  text-amber-900  ">Quality Gate Active</p>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      Only <strong>Approved</strong> quality inspection records contribute to the <strong>Accepted Quantity</strong> of this job card.
                      Pending records will block the progression to subsequent operations.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <DataTable 
                    columns={rejectionColumns} 
                    data={rejections} 
                    renderActions={(row) => renderTableActions(row, 'rejection')}
                  />
                </div>
              </Card>
            </div>

            {/* Downtime Section */}
            <div id="downtime" className="animate-in fade-in slide-in-from-bottom-2 bg-rose-50/50 duration-300 rounded  p-4">
              <Card className="p-3 border-none ">
                <SectionTitle title="Operational Downtime" icon={AlertTriangle} />
                <form onSubmit={handleAddDowntime} className="grid grid-cols-12 gap-2">
                  <div className='col-span-3'>
                    <FieldWrapper label="Day & Date" required>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={downtimeForm.day_number}
                          onChange={(e) => handleDayChange(e.target.value, 'downtime')}
                          className="w-14 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          required
                        />
                        <input
                          type="date"
                          value={downtimeForm.log_date}
                          onChange={(e) => handleDateChange(e.target.value, 'downtime')}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          required
                        />
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-1'>
                    <FieldWrapper label="Shift" required>
                      <div className="flex gap-1">
                        <select
                          value={downtimeForm.shift}
                          onChange={(e) => handleShiftChange(e.target.value, 'downtime')}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        >
                          {shifts.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const nextData = getNextShiftData(downtimeForm.shift, downtimeForm.log_date, downtimeForm.day_number, downtimeForm.from_period);
                            syncAllForms(nextData);
                          }}
                          className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-100 text-indigo-600 transition-colors"
                          title="Next Shift"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </FieldWrapper>
                  </div>

                  <div className='col-span-2'>
                    <FieldWrapper label="Downtime Type" required>
                      <select
                        value={downtimeForm.downtime_type}
                        onChange={(e) => setDowntimeForm({ ...downtimeForm, downtime_type: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                        required
                      >
                        <option value="">Select Type</option>
                        {downtimeTypes.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </FieldWrapper>
                  </div>

                  <div className="col-span-4 flex flex-1 gap-2 ">
                    <FieldWrapper label="Start Time" required>
                      <div className="flex gap-1">
                        <input
                          type="time"
                          value={downtimeForm.from_time}
                          onChange={(e) => handleTimeFieldChange('from_time', e.target.value, 'downtime')}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                          required
                        />
                        <select
                          value={downtimeForm.from_period}
                          onChange={(e) => handleTimeFieldChange('from_period', e.target.value, 'downtime')}
                          className="p-2 bg-slate-100 border border-slate-200 rounded text-xs"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </FieldWrapper>
                    <FieldWrapper label="End Time" required>
                      <div className="flex gap-1">
                        <input
                          type="time"
                          value={downtimeForm.to_time}
                          onChange={(e) => handleTimeFieldChange('to_time', e.target.value, 'downtime')}
                          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded text-xs outline-none"
                          required
                        />
                        <select
                          value={downtimeForm.to_period}
                          onChange={(e) => handleTimeFieldChange('to_period', e.target.value, 'downtime')}
                          className="p-2 bg-slate-100 border border-slate-200 rounded text-xs"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </FieldWrapper>
                  </div>



                  <div className="flex items-end col-span-2 ">
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="w-full p-2 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 disabled:opacity-50 transition-all  shadow-amber-100 flex items-center justify-center gap-2"
                    >
                      {formLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                      Record Downtime
                    </button>
                  </div>
                </form>

                <div className="mt-8">
                  <DataTable 
                    columns={downtimeColumns} 
                    data={downtimes} 
                    renderActions={(row) => renderTableActions(row, 'downtime')}
                  />
                </div>
              </Card>
            </div>

            {/* Next Operation Section */}
            <div id="next-operation" className="animate-in fade-in slide-in-from-bottom-2 /50 duration-300 rounded  p-4">
              <Card className="p-0 border-none  relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                <div className="p-2 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-md  text-slate-900 flex items-center gap-2">
                        Next Stage Configuration
                        <span className="p-1 bg-emerald-50 text-emerald-600 text-xs rounded border border-emerald-100 ">Active</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Specify destination and operational parameters for the next manufacturing phase</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="hidden sm:flex items-center gap-2 text-emerald-600 bg-emerald-50 p-2  py-1.5 rounded border border-emerald-100">
                        <Activity size={14} className="animate-pulse" />
                        <span className="text-xs ">Ready for Dispatch</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Package size={10} />
                        Transferred so far: <span className="font-bold text-slate-700">{transferredQty.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const currentSequence = parseInt(jobCardData?.operation_sequence || 0);
                    const nextOps = operations.filter(op => {
                      const opSeq = parseInt(op.sequence || op.seq || op.operation_seq || 0);
                      // Only show subsequent operations
                      if (opSeq <= currentSequence) return false;
                      
                      // Filter out already completed operations from allJobCards
                      const isCompleted = allJobCards.some(jc => 
                        (jc.operation_id === op.operation_id || jc.operation === op.operation_name || jc.operation === op.name) && 
                        normalizeStatus(jc.status) === 'completed'
                      );
                      
                      return !isCompleted;
                    });

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className='col-span-3'>
                          <FieldWrapper label="Next Operation" required>
                            <div className="group relative">
                              <SearchableSelect
                                value={nextOperationForm.next_operation_id}
                                onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operation_id: val })}
                                options={nextOps.map(op => ({
                                  value: op.operation_id || op.id || op.operation_name || op.name,
                                  label: op.operation_name || op.name
                                }))}
                                placeholder="Select Next Op"
                                containerClassName="  rounded bg-slate-50 border-slate-200 transition-all"
                              />
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-emerald-500 rounded-full transition-all duration-300"></div>
                            </div>
                          </FieldWrapper>
                        </div>

                        <div className='col-span-3'>
                          <FieldWrapper label="Assign Operator">
                            <div className="group relative">
                              <SearchableSelect
                                value={nextOperationForm.next_operator_id}
                                onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operator_id: val })}
                                options={operators.map(op => ({
                                  value: op.employee_id,
                                  label: `${op.first_name} ${op.last_name}`
                                }))}
                                placeholder="Search Operator..."
                                containerClassName="  rounded bg-slate-50 border-slate-200 transition-all"
                              />
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 bg-indigo-500 rounded-full transition-all duration-300"></div>
                            </div>
                          </FieldWrapper>
                        </div>

                        <div className='col-span-3'>
                          <FieldWrapper label="Target Warehouse" required>
                            <div className="group relative">
                              <SearchableSelect
                                value={nextOperationForm.next_warehouse_id}
                                onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: val })}
                                options={warehouses.map(w => ({
                                  value: w.warehouse_id || w.id || w.name,
                                  label: w.warehouse_name || w.name
                                }))}
                                placeholder="Select Destination"
                                containerClassName="  rounded bg-slate-50 border-slate-200 transition-all"
                              />
                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-0 group-focus-within:h-6 0 rounded-full transition-all duration-300"></div>
                            </div>
                          </FieldWrapper>
                        </div>
                        <div className=" items-center gap-6 col-span-3">
                          <p className="text-xs text-slate-400 ">Execution Mode:</p>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={() => setNextOperationForm({ ...nextOperationForm, inhouse: !nextOperationForm.inhouse, outsource: false })}
                              className={`flex items-center gap-2 p-2 rounded border-2 transition-all duration-300 ${nextOperationForm.inhouse ? 'bg-emerald-50 border-emerald-500 text-emerald-700  shadow-emerald-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${nextOperationForm.inhouse ? 'border-emerald-500 bg-white' : 'border-slate-300'}`}>
                                {nextOperationForm.inhouse && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                              </div>
                              <span className="text-xs ">In-house</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setNextOperationForm({ ...nextOperationForm, outsource: !nextOperationForm.outsource, inhouse: false })}
                              className={`flex items-center gap-2 p-2 rounded border-2 transition-all duration-300 ${nextOperationForm.outsource ? 'bg-indigo-50 border-indigo-500 text-indigo-700  shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                            >
                              <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${nextOperationForm.outsource ? 'border-indigo-500 bg-white' : 'border-slate-300'}`}>
                                {nextOperationForm.outsource && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                              </div>
                              <span className="text-xs ">Outsource</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-2 border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">


                    {canTransfer && (
                      <div className="flex flex-col gap-2">
                        {hasPendingApproval && (
                          <div className="flex items-center gap-2 text-amber-600  px-3 py-2 rounded  border  animate-pulse">
                            <AlertTriangle size={14} />
                            <span className="text-[10px]  ">Pending Quality Approvals - Accepted Quantity may be incomplete</span>
                          </div>
                        )}
                        <button
                          onClick={handleSubmitProduction}
                          disabled={isSubmitting || (hasPendingApproval && totalAcceptedQty === 0)}
                          className={`relative group overflow-hidden p-2 rounded hover:shadow-emerald-200 transition-all duration-500 disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95 ${isOperationFinished ? 'bg-emerald-600 animate-pulse' : 'bg-indigo-600'}`}
                        >
                          <div className={`absolute inset-0 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500 ${isOperationFinished ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-indigo-600 to-indigo-400'}`}></div>
                          <div className="relative flex items-center gap-4">
                            {isSubmitting ? (
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded animate-spin" />
                            ) : (
                              <div className="p-1.5 bg-white/10 text-white rounded group-hover:bg-white/20 transition-colors">
                                {isOperationFinished ? <CheckCircle size={10} /> : <ArrowRight size={10} />}
                              </div>
                            )}
                            <div className="text-left">
                              <p className="text-xs text-white/50 leading-none">
                                {normalizeStatus(jobCardData?.status) === 'completed' 
                                  ? 'Synchronize Next Stage' 
                                  : isOperationFinished ? 'Finalize & Dispatch' : 'Partial Transfer to Next Stage'}
                              </p>
                              <p className="text-xs text-white">
                                {normalizeStatus(jobCardData?.status) === 'completed' 
                                  ? 'Update Stage' 
                                  : isOperationFinished ? 'Complete Production' : `Transfer ${transferableQty.toFixed(0)} Units`}
                              </p>
                            </div>
                            <ChevronRight size={10} className="group-hover:translate-x-1 text-white transition-transform" />
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Daily Production Report Section */}
            <div id="daily-report" className=" animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="p-4 border-slate-200 bg-white rounded   ">
                <div className="flex items-center justify-between mb-6">
                  <SectionTitle 
                    title="Daily Production Report" 
                    icon={FileText} 
                    subtitle="Consolidated daily and shift-wise production metrics"
                  />
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-2 p-2 bg-indigo-50 text-indigo-600 rounded  hover:bg-indigo-100 transition-all text-xs  border border-indigo-100"
                  >
                    <FileText size={12} />
                    Download CSV
                  </button>
                </div>

                <div className=" rounded border border-slate-100">
                  <DataTable
                    columns={dailyReportColumns}
                    data={generateDailyReport()}
                    renderActions={(row) => {
                      const key = `${row.day}_${row.shift}`;
                      const isEditing = editingRowKey === key;
                      return (
                        <div className="flex items-center justify-center gap-2">
                          {isEditing ? (
                            <>
                              <button 
                                onClick={handleSaveRow}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Save"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button 
                                onClick={handleCancelEdit}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleEditRow(row)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                              title="Edit Row"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                      )
                    }}
                    emptyMessage="No production data available to generate report"
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`View ${modalType === 'timeLog' ? 'Time Log' : modalType === 'rejection' ? 'Quality Entry' : 'Downtime Entry'}`}
        size="md"
        footer={(
          <button
            onClick={() => setIsViewModalOpen(false)}
            className="px-4 py-2 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
          >
            Close
          </button>
        )}
      >
        {renderViewModalContent()}
      </Modal>

    </div>


  )
}
