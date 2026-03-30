import React, { useState, useEffect } from 'react'
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

  if (typeof dateInput === 'string') {
    // 1. Handle YYYY-MM-DD directly to avoid Date object overhead/parsing issues
    const isoMatch = dateInput.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    // 2. Handle DD-MM-YYYY or MM-DD-YYYY with smart month/day detection
    const dmyMatch = dateInput.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      let v1 = parseInt(dmyMatch[1]);
      let v2 = parseInt(dmyMatch[2]);
      let y = parseInt(dmyMatch[3]);

      let d, m;
      // Heuristic: if v2 > 12, it must be the day (MM/DD/YYYY)
      if (v2 > 12) {
        m = v1;
        d = v2;
      } else if (v1 > 12) {
        // if v1 > 12, it must be the day (DD/MM/YYYY)
        d = v1;
        m = v2;
      } else {
        // Ambiguous. Default to DD/MM/YYYY for consistency with most inputs
        d = v1;
        m = v2;
      }

      return `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
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
  // Handle 24-hour format from browser time pickers (e.g., "16:20" with PM)
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const getEntryDateTime = (dateStr, timeStr, period) => {
  if (!dateStr || !timeStr) return null;

  // Use formatDateForMatch to normalize the date to YYYY-MM-DD in LOCAL time
  const normalizedDate = formatDateForMatch(dateStr);
  if (!normalizedDate) return null;

  const parts = normalizedDate.split('-');
  if (parts.length !== 3) return null;

  // Create date using local constructor to ensure consistency with time parts
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const minutes = parseTimeToMinutes(timeStr, period);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};

const addMinutesToTime = (fromTime, fromPeriod, addMins) => {
  let [h, m] = fromTime.split(':').map(Number);
  if (fromPeriod === 'PM' && h !== 12) h += 12;
  if (fromPeriod === 'AM' && h === 12) h = 0;

  let totalMins = h * 60 + m + addMins;
  let newH = Math.floor(totalMins / 60) % 24;
  let newM = Math.round(totalMins % 60);

  let newPeriod = newH >= 12 ? 'PM' : 'AM';
  if (newH > 12) newH -= 12;
  if (newH === 0) newH = 12;

  return {
    time: `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`,
    period: newPeriod
  };
};

const formatTime12H = (t, p) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${String(hh).padStart(2, '0')}:${String(m || 0).substring(0, 2).padStart(2, '0')} ${p}`;
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

    const scheduledStart = jobCard?.scheduled_start_date ? new Date(jobCard.scheduled_start_date) : null;
    const startDate = scheduledStart ? formatDateForMatch(scheduledStart) : (jobCard?.actual_start_date ? formatDateForMatch(jobCard.actual_start_date) : getLocalDate());

    let initialShift = 'A';
    if (scheduledStart) {
      const hours = scheduledStart.getHours();
      // Assume Shift A is 08:00 AM - 08:00 PM, Shift B is 08:00 PM - 08:00 AM
      if (hours >= 20 || hours < 8) {
        initialShift = 'B';
      }
    }

    return { date: startDate, shift: initialShift, day: 1 };
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

// Helper Components
const formatDuration = (totalMinutes) => {
  if (!totalMinutes || isNaN(totalMinutes)) return '0 Min';

  if (totalMinutes < 1440) { // Less than 24 hours
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);

    if (hours === 0) return `${mins} Min`;
    if (mins === 0) return `${hours} Hrs`;
    return `${hours} Hrs ${mins} Min`;
  } else { // 24 hours or more
    const days = Math.floor(totalMinutes / 1440);
    const remainingMinutesAfterDays = totalMinutes % 1440;
    const hours = Math.floor(remainingMinutesAfterDays / 60);
    const mins = Math.round(remainingMinutesAfterDays % 60);

    let result = `${days} Day${days > 1 ? 's' : ''}`;
    if (hours > 0) result += ` ${hours} Hrs`;
    if (mins > 0) result += ` ${mins} Min`;
    return result;
  }
};

const SectionTitle = ({ title, icon: Icon, badge, subtitle }) => (
  <div className="mb-4">
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-3">

        <h3 className="text-sm  text-black">{title}</h3>
      </div>
      {badge && (
        <span className=" bg-slate-100 text-slate-600 text-xs  rounded  border border-slate-200">
          {badge}
        </span>
      )}
    </div>
    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
  </div>
)

const ProductionRibbon = ({
  jobCardData,
  itemName,
  maxAllowedQty,
  operationCycleTime,
  totalProducedQty,
  totalAcceptedQty,
  totalActualMinutes,
  totalOperationCost,
  transferableQty,
  previousOperationData
}) => {
  return (
    <>
      <div className="bg-white rounded  border border-slate-100 p-2 mb-2 flex flex-wrap items-center gap-y-2">
        {/* Target Item Info */}
        <div className="flex items-center gap-5 p-2 border-r border-slate-100 flex-1 ">

          <div className="min-w-0">
            <p className="text-xs   text-slate-400  mb-1">Target Item</p>
            <h2 className="text-md  text-slate-900 truncate leading-tight mb-1" title={itemName || jobCardData?.item_name}>
              {itemName || jobCardData?.item_name || 'N/A'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-slate-100 text-slate-600 text-xs  rounded border border-slate-200  ">
                {jobCardData?.item_code || '---'}
              </span>
              {jobCardData?.execution_mode && (
                <span className={`p-1 text-xs  rounded border   ${jobCardData.execution_mode === 'INHOUSE'
                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                  : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                  {jobCardData.execution_mode}
                </span>
              )}
              {jobCardData?.scheduled_start_date && (
                <div className="flex  gap-1">
                  <span className="p-1 bg-indigo-50 text-indigo-600 text-xs rounded border border-indigo-100 flex items-center gap-1 font-medium">
                    <Calendar size={10} />
                    S: {new Date(jobCardData.scheduled_start_date).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                  {jobCardData?.scheduled_end_date && (
                    <span className="p-1 bg-slate-50 text-slate-500 text-xs rounded border border-slate-100 flex items-center gap-1 font-medium">
                      <Clock size={10} />
                      E: {new Date(jobCardData.scheduled_end_date).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Group 2: Actuals */}
      <div className='grid grid-cols-3 justify-between'>
        <div className="flex items-center col-span-2 justify-between gap-2 p-2 border-r border-slate-100">
          <div className="">
            <p className="text-xs   text-slate-400  mb-2">Planned</p>
            <div className="flex items-baseline  gap-1.5">
              <span className="text-md  text-slate-900 ">
                {parseFloat(maxAllowedQty || 0).toLocaleString()}
              </span>
              <span className="text-xs  text-slate-400 ">Units</span>
            </div>
          </div>
          <div className="">
            <p className="text-xs   text-slate-400  mb-2">Total Exp. Time</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-violet-600 ">
                {formatDuration((operationCycleTime || 0) * (parseFloat(maxAllowedQty || 0)))}
              </span>
            </div>
          </div>
          <div className="">
            <p className="text-xs   text-indigo-400  mb-2">Total Actual Time</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-indigo-600 ">
                {formatDuration(totalActualMinutes)}
              </span>
            </div>
          </div>
          <div className="">
            <p className="text-xs   text-amber-500  mb-2">Total Cost</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-amber-600 ">
                ₹{totalOperationCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="">
            <p className="text-xs   text-rose-500  mb-2">Remaining</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-rose-600 ">
                {Math.max(0, maxAllowedQty - totalAcceptedQty).toLocaleString()}
              </span>
              <span className="text-xs  text-rose-400 ">Units</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 border-r border-slate-100">
          <div className="">
            <p className="text-xs   text-slate-400  mb-2">Produced</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-slate-600 ">
                {totalProducedQty.toLocaleString()}
              </span>
              <span className="text-xs  text-slate-400 ">Units</span>
            </div>
          </div>
          <div className="">
            <p className="text-xs   text-emerald-500  mb-2">Accepted</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-emerald-600 ">
                {totalAcceptedQty.toLocaleString()}
              </span>
              <span className="text-xs  text-emerald-400 ">Units</span>
            </div>
          </div>
          <div className="">
            <p className="text-xs   text-indigo-500  mb-2">Transferred</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md  text-indigo-600 ">
                {parseFloat(jobCardData?.transferred_quantity || 0).toLocaleString()}
              </span>
              <span className="text-xs  text-indigo-400 ">Units</span>
            </div>
          </div>
           <div className="">
            <p className="text-xs   text-amber-500  mb-2">Balance WIP</p>
            <div className="flex items-baseline justify-left gap-1.5">
              <span className="text-md text-amber-600 ">
                {transferableQty.toLocaleString()}
              </span>
              <span className="text-xs  text-amber-400 ">Units</span>
            </div>
          </div>
        </div>
        {/* Metrics Group 3: WIP */}
       
        {/* Current Operation & Assignee */}
        <div className="flex items-center gap-6 px-4">
          <div>
            <p className="text-xs   text-slate-400  mb-2">Current Op</p>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded  bg-violet-500 animate-pulse shrink-0 ring-4 ring-violet-50" />
              <span className="text-xs  text-violet-600 truncate font-medium">
                {jobCardData?.operation || 'N/A'}
              </span>
            </div>
          </div>

          <div className="border-l border-slate-100 pl-6">
            <p className="text-xs   text-slate-400  mb-2">Assignee</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-indigo-50 rounded  flex items-center justify-left text-xs text-indigo-600  border border-indigo-100">
                {(jobCardData?.assignee_name || jobCardData?.operator_name || 'U').charAt(0)}
              </div>
              <span className="text-xs  text-slate-700 font-medium">
                {jobCardData?.assignee_name || jobCardData?.operator_name || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

const FieldWrapper = ({ label, children, error, required }) => (
  <div className="">
    <div className="flex items-center justify-between">
      <label className="text-xs text-slate-900 flex items-center gap-1 font-medium">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {error && <span className="text-xs text-rose-500 animate-pulse">{error}</span>}
    </div>
    {children}
  </div>
)

const calculateDurationMinutes = (fromTime, fromPeriod, toTime, toPeriod) => {
  let start = parseTimeToMinutes(fromTime, fromPeriod);
  let end = parseTimeToMinutes(toTime, toPeriod);

  if (end < start) {
    // Spans across midnight
    end += 24 * 60;
  }

  return end - start;
};

const StatCard = ({ label, value, icon: Icon, color, subtitle }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100/50',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100/50',
    amber: 'text-amber-600 bg-amber-50 border-amber-100/50',
    rose: 'text-rose-600 bg-rose-50 border-rose-100/50',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100/50',
    violet: 'text-violet-600 bg-violet-50 border-violet-100/50'
  }

  return (
    <Card className="p-2 border-none flex items-center gap-4 transition-all hover:shadow-slate-200/50 bg-white rounded group">
      <div className={`p-2 rounded ${colorMap[color] || colorMap.blue} border border-transparent transition-transform group-hover:scale-110 duration-300`}>
        <Icon size={15} strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg text-slate-900 ">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-400 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

const checkTimeOverlap = (newStart, newEnd, existingEntries, resourceId = null, workstationName = null, excludeId = null) => {
  if (!newStart || !newEnd) return null;

  const startA = newStart.getTime();
  const endA = newEnd.getTime();

  console.log(`Checking overlap for window: ${newStart.toLocaleString()} - ${newEnd.toLocaleString()}`);

  const conflict = existingEntries.find(entry => {
    // If editing, don't check against self
    if (excludeId && (entry.time_log_id === excludeId || entry.downtime_id === excludeId)) return false;

    // Resource-specific check: Only overlap if SAME Operator or SAME Workstation
    if (resourceId || workstationName) {
      const entryEmpId = String(entry.employee_id || '').trim();
      const targetEmpId = String(resourceId || '').trim();
      const entryWs = String(entry.workstation_name || '').trim();
      const targetWs = String(workstationName || '').trim();

      const isSameOperator = targetEmpId && entryEmpId === targetEmpId;
      const isSameWorkstation = targetWs && entryWs === targetWs;

      // If neither operator nor workstation matches, there is no resource conflict
      if (!isSameOperator && !isSameWorkstation) return false;
    }

    const start = getEntryDateTime(entry.log_date, entry.from_time, entry.from_period);
    let end = getEntryDateTime(entry.log_date, entry.to_time, entry.to_period);

    if (!start || !end) return false;

    // Handle midnight wrap for Shift B logs
    if (end <= start && normalizeShift(entry.shift) === 'B') {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    const startB = start.getTime();
    const endB = end.getTime();

    // Standard exclusive overlap check: (StartA < EndB) and (EndA > StartB)
    // This correctly ALLOWS touching shifts (where startA === endB)
    const overlaps = (startA < endB) && (endA > startB);
    if (overlaps) {
      console.warn(`Overlap detected with Log ${entry.time_log_id || entry.downtime_id}: ${start.toLocaleString()} - ${end.toLocaleString()}`);
    }
    return overlaps;
  });

  return conflict || null;
};

const StatusBadge = ({ status }) => {
  const config = {
    draft: { color: 'text-slate-600', icon: Clock, label: 'Draft' },
    ready: { color: 'text-blue-700', icon: CheckCircle2, label: 'Ready' },
    pending: { color: 'text-indigo-700', icon: Calendar, label: 'Pending' },
    'in-progress': { color: 'text-amber-700', icon: Activity, label: 'In-Progress' },
    in_progress: { color: 'text-amber-700', icon: Activity, label: 'In-Progress' },
    completed: { color: 'text-emerald-700', icon: CheckCircle2, label: 'Completed' },
    cancelled: { color: 'text-rose-700', icon: AlertCircle, label: 'Cancelled' }
  }
  const s = normalizeStatus(status)
  const statusKey = s.replace('-', '_')
  const { color, icon: Icon, label } = config[s] || config[statusKey] || config.draft

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon size={14} />
      {label || s.to()}
    </span>
  )
}

const NavItem = ({ label, icon: Icon, section, isActive, onClick, color = 'indigo' }) => {
  const colors = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'text-amber-600 bg-amber-50 border-amber-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100'
  }

  return (
    <button
      onClick={() => onClick(section)}
      className={`flex items-center gap-3 w-full p-2 rounded transition-all duration-200 border ${isActive
        ? `${colors[color]} translate-x-1`
        : 'text-slate-500 hover:bg-slate-50 border-transparent'
        }`}
    >
      <div className={`p-1.5 rounded ${isActive ? 'bg-white' : 'bg-slate-100'}`}>
        <Icon size={15} />
      </div>
      <span className="text-xs font-medium">{label}</span>
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
  const [isContinueModalOpen, setIsContinueModalOpen] = useState(false)
  const [additionalTimeMins, setAdditionalTimeMins] = useState(0)
  const [remainingQtyForModal, setRemainingQtyForModal] = useState(0)
  const [hasPromptedContinue, setHasPromptedContinue] = useState(false)

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
    next_operation_date: getLocalDate(),
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

  const handleInlineEditFieldChange = (field, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-calculation for rejections
      if (editingType === 'rejection') {
        if (['rejected_qty', 'scrap_qty', 'log_date', 'shift', 'day_number'].includes(field)) {
          const stats = getShiftStats(
            field === 'log_date' ? value : updated.log_date,
            field === 'shift' ? value : updated.shift,
            field === 'day_number' ? value : updated.day_number,
            timeLogs,
            rejections,
            editingId
          );

          const p = stats.produced;
          const i = stats.totalInspected;
          const r = parseFloat(field === 'rejected_qty' ? value : updated.rejected_qty) || 0;
          const s = parseFloat(field === 'scrap_qty' ? value : updated.scrap_qty) || 0;

          updated.accepted_qty = Math.max(0, p - i - r - s);
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
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium">
          {val || '-'}
        </span>
      )
    },
    {
      label: 'Date / Shift',
      key: 'log_date',
      render: (val, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <div className="flex gap-1">
          <input
            type="date"
            value={formatDateForMatch(editForm.log_date) || ''}
            onChange={(e) => handleInlineEditFieldChange('log_date', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-xs outline-none"
          />
          <select
            value={editForm.shift || ''}
            onChange={(e) => handleInlineEditFieldChange('shift', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-xs outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-slate-900 text-xs font-medium">{new Date(val).toLocaleDateString()}</p>
          <p className="text-xs text-slate-400">Shift {normalizeShift(row.shift)}</p>
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
          className="w-full p-1 border border-indigo-300 rounded text-xs outline-none"
        >
          {operators.map(op => (
            <option key={op.employee_id} value={op.employee_id}>{op.first_name} {op.last_name}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-slate-100 rounded  flex items-center justify-center text-xs text-slate-500 ">
            {val?.charAt(0) || 'U'}
          </div>
          <span className="truncate max-w-[80px] text-xs font-medium">{val || 'N/A'}</span>
        </div>
      )
    },
    {
      label: 'Time Interval',
      key: 'time_interval',
      render: (_, row) => editingId === row.time_log_id && editingType === 'timeLog' ? (
        <div className="flex gap-1">
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.from_time?.substring(0, 5)}
              onChange={(e) => handleInlineEditFieldChange('from_time', e.target.value)}
              className="w-16 p-0.5 border border-indigo-200 rounded text-xs"
            />
            <select
              value={editForm.from_period || 'AM'}
              onChange={(e) => handleInlineEditFieldChange('from_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-xs"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.to_time?.substring(0, 5)}
              onChange={(e) => handleInlineEditFieldChange('to_time', e.target.value)}
              className="w-16 p-0.5 border border-indigo-200 rounded text-xs"
            />
            <select
              value={editForm.to_period || 'PM'}
              onChange={(e) => handleInlineEditFieldChange('to_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-xs"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      ) : (
        (() => {
          const shiftDowntime = downtimes
            .filter(dt =>
              formatDateForMatch(dt.log_date) === formatDateForMatch(row.log_date) &&
              normalizeShift(dt.shift) === normalizeShift(row.shift) &&
              (parseInt(dt.day_number) || 1) === (parseInt(row.day_number) || 1)
            )
            .reduce((sum, dt) => sum + (parseFloat(dt.duration_minutes) || 0), 0);

          const totalLogTime = (parseFloat(row.time_in_minutes) || 0) + shiftDowntime;

          return (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={12} className="text-slate-300" />
              <div className="flex flex-col">
                <span className="text-xs font-medium">
                  {formatTime12H(row.from_time, row.from_period)} - {formatTime12H(row.to_time, row.to_period)}
                </span>
                <div className="flex items-center gap-1 mt-0.5 whitespace-nowrap">
                  <span className="text-xs text-indigo-500 font-semibold" title="Production Time">
                    {row.time_in_minutes || 0}
                  </span>
                  {shiftDowntime > 0 && (
                    <span className="text-xs text-amber-500 font-semibold" title="Machine Breakdown (Downtime)">
                      + {shiftDowntime}
                    </span>
                  )}
                  <span className="text-xs text-slate-700  border-l border-slate-300 pl-1.5 ml-0.5" title="Total Shift Time">
                    = {totalLogTime} mins
                  </span>
                </div>
              </div>
            </div>
          );
        })()
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
          className="w-16 p-1 border border-indigo-300 rounded text-xs outline-none "
        />
      ) : (
        <div className="">
          <span className="text-indigo-600  text-xs">{parseFloat(val || 0).toLocaleString()}</span>
          <span className="ml-1 text-xs text-slate-400  ">Units</span>
        </div>
      )
    }
  ], [editingId, editingType, editForm, operators, downtimes])

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
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium">
          {val || '-'}
        </span>
      )
    },
    {
      label: 'Date / Shift',
      key: 'log_date',
      render: (val, row) => editingId === row.rejection_id && editingType === 'rejection' ? (
        <div className="flex gap-1">
          <input
            type="date"
            value={formatDateForMatch(editForm.log_date) || ''}
            onChange={(e) => handleInlineEditFieldChange('log_date', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-xs outline-none"
          />
          <select
            value={editForm.shift || ''}
            onChange={(e) => handleInlineEditFieldChange('shift', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-xs outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-slate-900 text-xs font-medium">{new Date(val).toLocaleDateString()}</p>
          <p className="text-xs text-slate-400">Shift {normalizeShift(row.shift)}</p>
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      render: (val) => val === 'Approved' ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs border border-emerald-100  ">
          <ShieldCheck size={10} /> Approved
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs border border-amber-100 animate-pulse  ">
          <Clock size={10} /> Pending
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
          className="w-full p-1 border border-indigo-300 rounded text-xs outline-none"
        >
          <option value="">Select Reason</option>
          {rejectionReasons.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      ) : (
        <div className="flex items-center gap-1">
          {parseFloat(row.rejected_qty || 0) > 0 ? (
            <span className="p-1 bg-rose-50 text-rose-600 rounded text-xs   border border-rose-100">Defect</span>
          ) : (
            <span className="p-1 bg-emerald-50 text-emerald-600 rounded text-xs   border border-emerald-100">Passed</span>
          )}
          <span className="text-slate-500 truncate max-w-[100px] text-xs">{val || 'No notes'}</span>
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
          className="w-14 p-1 border border-indigo-300 rounded text-xs outline-none text-center"
        />
      ) : (
        <div className="text-center  text-emerald-600 text-xs">{parseFloat(val || 0).toLocaleString()}</div>
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
          className="w-14 p-1 border border-indigo-300 rounded text-xs outline-none text-center"
        />
      ) : (
        <div className="text-center  text-rose-600 text-xs">{parseFloat(val || 0).toLocaleString()}</div>
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
          className="w-14 p-1 border border-indigo-300 rounded text-xs outline-none text-center"
        />
      ) : (
        <div className="text-center  text-slate-600 text-xs">{parseFloat(val || 0).toLocaleString()}</div>
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
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium">
          {val || '-'}
        </span>
      )
    },
    {
      label: 'Date / Shift',
      key: 'log_date',
      render: (val, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <div className="flex gap-1">
          <input
            type="date"
            value={formatDateForMatch(editForm.log_date) || ''}
            onChange={(e) => handleInlineEditFieldChange('log_date', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-xs outline-none"
          />
          <select
            value={editForm.shift || ''}
            onChange={(e) => handleInlineEditFieldChange('shift', e.target.value)}
            className="p-1 border border-indigo-300 rounded text-xs outline-none"
          >
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
      ) : (
        <div>
          <p className="text-slate-900 text-xs font-medium">{new Date(val).toLocaleDateString()}</p>
          <p className="text-xs text-slate-400">Shift {normalizeShift(row.shift)}</p>
        </div>
      )
    },
    {
      label: 'Category / Reason',
      key: 'downtime_type',
      render: (val, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <div className="flex gap-1">
          <select
            value={editForm.downtime_type || ''}
            onChange={(e) => handleInlineEditFieldChange('downtime_type', e.target.value)}
            className="w-full p-1 border border-indigo-300 rounded text-xs outline-none"
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
            className="w-full p-1 border border-indigo-300 rounded text-xs outline-none"
          />
        </div>
      ) : (
        <div>
          <p className="text-slate-900 text-xs font-medium">{val}</p>
          <p className="text-slate-500 text-xs">{row.downtime_reason}</p>
        </div>
      )
    },
    {
      label: 'Interval',
      key: 'interval',
      render: (_, row) => editingId === row.downtime_id && editingType === 'downtime' ? (
        <div className="flex gap-1">
          <div className="flex gap-1">
            <input
              type="time"
              value={editForm.from_time || ''}
              onChange={(e) => handleInlineEditFieldChange('from_time', e.target.value)}
              className="w-14 p-0.5 border border-indigo-200 rounded text-xs"
            />
            <select
              value={editForm.from_period || 'AM'}
              onChange={(e) => handleInlineEditFieldChange('from_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-xs"
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
              className="w-14 p-0.5 border border-indigo-200 rounded text-xs"
            />
            <select
              value={editForm.to_period || 'PM'}
              onChange={(e) => handleInlineEditFieldChange('to_period', e.target.value)}
              className="p-0.5 border border-indigo-200 rounded text-xs"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      ) : (
        <div className="text-slate-600 text-xs font-medium">
          {row.from_time?.substring(0, 5)} {row.from_period} - {row.to_time?.substring(0, 5)} {row.to_period}
        </div>
      )
    },
    {
      label: 'Duration',
      key: 'duration_minutes',
      render: (val, row) => (
        <div className="">
          <span className="text-amber-600  text-xs">
            {editingId === row.downtime_id && editingType === 'downtime' ? editForm.duration_minutes : val}
          </span>
          <span className="ml-1 text-xs text-slate-400  ">Mins</span>
        </div>
      )
    }
  ], [editingId, editingType, editForm])

  const dailyReportColumns = React.useMemo(() => [
    {
      label: 'Date',
      key: 'date',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input
            type="date"
            className="w-24 p-1 border border-indigo-300 rounded text-xs outline-none"
            value={editFormData.date}
            onChange={(e) => handleEditChange('date', e.target.value)}
          />
        ) : (
          <span className="text-slate-900 text-xs">{val ? val.split('-').reverse().join('-') : 'N/A'}</span>
        );
      }
    },
    {
      label: 'Shift',
      key: 'shift',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key;

        return (
          <div className="flex flex-col gap-1">
            <span className="p-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 w-fit">
              Shift {val}
            </span>
            {isEditing ? (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex gap-1">
                  <input
                    type="time"
                    className="w-16 p-0.5 border border-indigo-200 rounded text-[10px]"
                    value={editFormData.from_time?.substring(0, 5)}
                    onChange={(e) => handleEditChange('from_time', e.target.value)}
                  />
                  <select
                    className="p-0.5 border border-indigo-200 rounded text-[10px]"
                    value={editFormData.from_period}
                    onChange={(e) => handleEditChange('from_period', e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <div className="flex gap-1">
                  <input
                    type="time"
                    className="w-16 p-0.5 border border-indigo-200 rounded text-[10px]"
                    value={editFormData.to_time?.substring(0, 5)}
                    onChange={(e) => handleEditChange('to_time', e.target.value)}
                  />
                  <select
                    className="p-0.5 border border-indigo-200 rounded text-[10px]"
                    value={editFormData.to_period}
                    onChange={(e) => handleEditChange('to_period', e.target.value)}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            ) : (
              row.startTimeStr && (
                <span className="text-xs text-slate-400 font-medium">
                  {row.startTimeStr} - {row.endTimeStr}
                </span>
              )
            )}
          </div>
        )
      }
    },
    {
      label: 'Operator',
      key: 'operator_name',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <select
            value={editFormData.employee_id || ''}
            onChange={(e) => {
              const op = operators.find(o => o.employee_id === e.target.value);
              handleEditChange('employee_id', e.target.value);
              handleEditChange('operator_name', op ? `${op.first_name} ${op.last_name}` : '');
            }}
            className="w-full p-1 border border-indigo-300 rounded text-xs outline-none"
          >
            {operators.map(op => (
              <option key={op.employee_id} value={op.employee_id}>{op.first_name} {op.last_name}</option>
            ))}
          </select>
        ) : (
          <span className="text-slate-600 text-xs font-medium">{val || 'N/A'}</span>
        );
      }
    },
    {
      label: 'Exp. Time',
      key: 'expected_mins',
      align: 'right',
      render: (val, row) => (
        <div className="flex flex-col items-end">
          <span className="text-slate-600 font-medium text-xs">{(val || 0).toFixed(1)}</span>
          <span className="text-[8px] text-slate-400  tracking-tighter">Expected</span>
        </div>
      )
    },
    {
      label: 'Actual Time',
      key: 'total_mins',
      align: 'right',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded  text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.total_mins}
            onChange={(e) => handleEditChange('total_mins', e.target.value)}
          />
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-indigo-600 font-semibold text-xs">{val || 0}</span>
            <span className="text-[8px] text-slate-400  tracking-tighter">Minutes</span>
          </div>
        );
      }
    },
    {
      label: 'Variance',
      key: 'variance_mins',
      align: 'right',
      render: (val, row) => (
        <div className="flex flex-col items-end">
          <span className={`font-medium text-xs ${val > 5 ? 'text-rose-600' : val < -5 ? 'text-emerald-600' : 'text-slate-600'}`}>
            {val > 0 ? '+' : ''}{(val || 0).toFixed(1)}
          </span>
          <span className="text-[8px] text-slate-400  tracking-tighter">+/- Mins</span>
        </div>
      )
    },
    {
      label: 'Produced',
      key: 'produced',
      align: 'right',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key;
        return isEditing ? (
          <input
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded  text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.produced}
            onChange={(e) => handleEditChange('produced', e.target.value)}
          />
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-slate-900 font-semibold text-xs">{parseFloat(val || 0).toLocaleString()}</span>
            <span className="text-[8px] text-slate-400  tracking-tighter font-medium">Gross Total</span>
          </div>
        );
      }
    },
    {
      label: 'Accepted',
      key: 'accepted',
      align: 'right',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key && row.isShiftPrimary;
        if (!row.isShiftPrimary && !isEditing) return <span className="text-slate-300">-</span>;

        return isEditing ? (
          <input
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded  text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.accepted}
            onChange={(e) => handleEditChange('accepted', e.target.value)}
          />
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-emerald-600  text-xs">{parseFloat(val || 0).toLocaleString()}</span>
            <span className="text-[8px] text-emerald-400  tracking-tighter">Accepted</span>
          </div>
        );
      }
    },
    {
      label: 'Rejected',
      key: 'rejected',
      align: 'right',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key && row.isShiftPrimary;
        if (!row.isShiftPrimary && !isEditing) return <span className="text-slate-300">-</span>;

        return isEditing ? (
          <input
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded  text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.rejected}
            onChange={(e) => handleEditChange('rejected', e.target.value)}
          />
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-rose-600  text-xs">{parseFloat(val || 0).toLocaleString()}</span>
            <span className="text-[8px] text-rose-400  tracking-tighter font-medium">Rejected</span>
          </div>
        );
      }
    },
    {
      label: 'Scrap',
      key: 'scrap',
      align: 'right',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key && row.isShiftPrimary;
        if (!row.isShiftPrimary && !isEditing) return <span className="text-slate-300">-</span>;

        return isEditing ? (
          <input
            type="number"
            className="w-16 p-1 border border-indigo-300 rounded  text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            value={editFormData.scrap}
            onChange={(e) => handleEditChange('scrap', e.target.value)}
          />
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-amber-600  text-xs">{parseFloat(val || 0).toLocaleString()}</span>
            <span className="text-[8px] text-amber-500  tracking-tighter">Scrap</span>
          </div>
        );
      }
    },
    {
      label: 'Op. Cost',
      key: 'operation_cost',
      align: 'right',
      render: (val) => (
        <div className="flex flex-col items-end">
          <span className="text-amber-600 font-semibold text-xs">
            ₹{(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[8px] text-slate-400  tracking-tighter">Production Cost</span>
        </div>
      )
    },
    {
      label: 'Cost Var.',
      key: 'cost_variance',
      align: 'right',
      render: (val) => (
        <div className="flex flex-col items-end">
          <span className={`font-semibold text-xs ${val > 0 ? 'text-rose-600' : val < 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
            {val > 0 ? '+' : ''}₹{Math.abs(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-[8px] text-slate-400  tracking-tighter">+/- Cost</span>
        </div>
      )
    },
    {
      label: 'Performance',
      key: 'performance',
      align: 'center',
      render: (_, row) => (
        <div className="flex flex-col gap-1.5 min-w-[100px] items-center">
          <div className="flex justify-between items-center text-xs w-full">
            <span className="text-slate-400  tracking-tight font-medium">Yield</span>
            <span className={` p-1 rounded border ${parseFloat(row.yieldPercentage) >= 95 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                parseFloat(row.yieldPercentage) >= 85 ? 'text-blue-600 bg-blue-50 border-blue-100' :
                  'text-rose-600 bg-rose-50 border-rose-100'
              }`}>
              {row.yieldPercentage}%
            </span>
          </div>
          <div className="flex justify-between items-center text-xs w-full">
            <span className="text-slate-400  tracking-tight font-medium">UPH</span>
            <span className=" text-indigo-600 bg-indigo-50 p-1 rounded border border-indigo-100">
              {row.uph}
            </span>
          </div>
        </div>
      )
    },
    {
      label: 'Downtime',
      key: 'downtime',
      align: 'right',
      render: (val, row) => {
        const key = row.uniqueKey;
        const isEditing = editingRowKey === key && row.isShiftPrimary;
        if (!row.isShiftPrimary && !isEditing) return <span className="text-slate-300">-</span>;

        return isEditing ? (
          <div className="flex items-center  gap-1">
            <input
              type="number"
              className="w-16 p-1 border border-indigo-300 rounded  text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={editFormData.downtime}
              onChange={(e) => handleEditChange('downtime', e.target.value)}
            />
            <span className="text-xs text-slate-400  ">min</span>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <span className={` text-xs ${val > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{val || 0}</span>
              <span className="text-xs text-slate-400  ">min</span>
            </div>
            <span className="text-[8px] text-slate-400  tracking-tighter">Total Loss</span>
          </div>
        );
      }
    }
  ], [editingRowKey, editFormData, operators])

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
    inspected_qty: 0,
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
    to_period: 'PM',
    autoCalculated: false
  })

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [jobCardId])

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
    const mins = calculateDurationMinutes(
      downtimeForm.from_time,
      downtimeForm.from_period,
      downtimeForm.to_time,
      downtimeForm.to_period
    );
    setDowntimeForm(prev => ({ ...prev, duration_minutes: mins }));
  }, [downtimeForm.from_time, downtimeForm.from_period, downtimeForm.to_time, downtimeForm.to_period]);

  // Automatically fetch produced quantity when Date, Shift or Day changes in Rejection Form
  useEffect(() => {
    const stats = getShiftStats(rejectionForm.log_date, rejectionForm.shift, rejectionForm.day_number, timeLogs, rejections);
    if (rejectionForm.produce_qty !== stats.produced || rejectionForm.inspected_qty !== stats.totalInspected) {
      setRejectionForm(prev => ({
        ...prev,
        produce_qty: stats.produced,
        inspected_qty: stats.totalInspected
      }));
    }
  }, [rejectionForm.log_date, rejectionForm.shift, rejectionForm.day_number, timeLogs, rejections]);

  useEffect(() => {
    setRejectionForm(prev => {
      const p = parseFloat(prev.produce_qty) || 0;
      const r = parseFloat(prev.rejected_qty) || 0;
      const s = parseFloat(prev.scrap_qty) || 0;
      const i = parseFloat(prev.inspected_qty) || 0;
      const expected = Math.max(0, p - r - s - i);

      if (prev.accepted_qty !== expected) {
        return {
          ...prev,
          accepted_qty: expected
        };
      }
      return prev;
    });
  }, [rejectionForm.produce_qty, rejectionForm.rejected_qty, rejectionForm.scrap_qty, rejectionForm.inspected_qty]);

  // Automatically calculate downtime based on production shortfall
  useEffect(() => {
    if (operationCycleTime > 0) {
      const stats = getShiftStats(downtimeForm.log_date, downtimeForm.shift, downtimeForm.day_number, timeLogs, rejections);
      const produced = parseFloat(stats.totalProduced) || 0;
      const shiftDuration = 720; // 12 hours shift capacity

      const productionTimeMins = produced * operationCycleTime;
      const shortfallMins = Math.max(0, shiftDuration - productionTimeMins);

      if (shortfallMins > 0) {
        // Find if there's already downtime for this shift to avoid overriding user manual entries too aggressively
        // but for now we follow the user's request to show it automatically
        setDowntimeForm(prev => {
          // Only auto-update if duration is 0 or if we are just switching shifts
          if (prev.duration_minutes === 0 || prev.autoCalculated) {
            // Calculate to_time based on from_time + shortfall
            const toTimeResult = addMinutesToTime(prev.from_time, prev.from_period, shortfallMins);
            return {
              ...prev,
              duration_minutes: shortfallMins,
              to_time: toTimeResult.time,
              to_period: toTimeResult.period,
              downtime_reason: prev.downtime_reason || 'Production Shortfall',
              downtime_type: prev.downtime_type || 'Unplanned Downtime',
              autoCalculated: true
            };
          }
          return prev;
        });
      }
    }
  }, [downtimeForm.log_date, downtimeForm.shift, downtimeForm.day_number, timeLogs, rejections, operationCycleTime]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)

      // Check if machine allocation time is over but production still not done
      if (jobCardData?.scheduled_end_date && !hasPromptedContinue && !loading) {
        const scheduledEnd = new Date(jobCardData.scheduled_end_date)
        const totalAcc = calculateTotalAccepted(timeLogs, rejections)
        const maxQty = jobCardData?.max_allowed_quantity !== undefined
          ? parseFloat(jobCardData.max_allowed_quantity)
          : (previousOperationData
            ? parseFloat(previousOperationData.transferred_quantity || 0)
            : parseFloat(jobCardData?.planned_quantity || 0));

        const remaining = maxQty - totalAcc

        if (now > scheduledEnd && remaining > 0.1) {
          const estimatedRemainingMins = Math.ceil(remaining * (operationCycleTime || 0))
          setRemainingQtyForModal(remaining)
          setAdditionalTimeMins(estimatedRemainingMins)
          setIsContinueModalOpen(true)
          setHasPromptedContinue(true) // Only prompt once per session/data load
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(timer)
  }, [jobCardData, timeLogs, rejections, loading, hasPromptedContinue, operationCycleTime, previousOperationData])

  const handleContinueProduction = async () => {
    try {
      setFormLoading(true)
      const newScheduledEnd = new Date(new Date().getTime() + additionalTimeMins * 60000)

      await productionService.updateJobCard(jobCardId, {
        scheduled_end_date: newScheduledEnd.toISOString(),
        status: 'in-progress'
      })

      toast.addToast(`Machine allocation extended by ${additionalTimeMins} mins based on ${remainingQtyForModal.toFixed(0)} units remaining.`, 'success')
      setIsContinueModalOpen(false)
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to extend allocation time', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleStopProduction = async () => {
    try {
      setFormLoading(true)
      setIsContinueModalOpen(false)

      // If user says NO, stop production and send completed items to next operation
      await handleSubmitProduction()
    } catch (err) {
      toast.addToast(err.message || 'Failed to stop production', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const fetchAllData = async () => {
    try {
      setLoading(true)
      // 1. Fetch Job Card Details and basic master data
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

      // 2. Auto-start the job card if needed
      const jobCardStatus = normalizeStatus(jobCard?.status)
      if (jobCardStatus === 'draft' || jobCardStatus === 'pending' || jobCardStatus === 'ready') {
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

      // 3. Fetch Work Order and Item details to get Cycle Time
      let currentCycleTime = 0;
      let soQty = 0;
      const woId = jobCard.work_order_id;

      if (woId) {
        try {
          const woRes = await productionService.getWorkOrder(woId)
          const woData = woRes?.data || woRes
          soQty = parseFloat(woData?.qty_to_manufacture || woData?.quantity || woData?.planned_quantity || 0)
          setSalesOrderQuantity(soQty)
          setItemName(woData.item_name || '')

          // BOM Explosion for Cycle Time
          if (woData.item_code) {
            const bomRes = await productionService.getBOMs({ item_code: woData.item_code })
            const boms = bomRes.data || []
            if (boms.length > 0) {
              const details = await productionService.getBOMDetails(boms[0].bom_id)
              const bom = details.data || details
              const currentOp = bom.operations?.find(op =>
                op.operation_name === jobCard.operation ||
                op.name === jobCard.operation
              )

              if (currentOp) {
                const bomQty = parseFloat(bom.quantity || 1)
                const opTime = parseFloat(currentOp.operation_time || currentOp.time || 0)
                currentCycleTime = opTime / bomQty;
                setOperationCycleTime(currentCycleTime);
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch Work Order/BOM for cycle time:', err)
        }
      }

      // 4. Load related Job Cards and previous logs
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

      // 5. Load Operations List
      let allOperations = opsRes.data || []
      const globalOps = opsRes.data || []
      const enrichedOperations = allOperations.map(op => {
        const matchingJobCard = jobCards.find(jc =>
          String(jc.operation_id) === String(op.operation_id || op.id) ||
          parseInt(jc.operation_sequence) === parseInt(op.sequence || op.seq || op.operation_seq)
        )
        let opName = op.operation_name || op.name || matchingJobCard?.operation
        if (!opName && (op.operation_id || op.id)) {
          const globalOp = globalOps.find(g => String(g.operation_id) === String(op.operation_id || op.id))
          opName = globalOp?.name || globalOp?.operation_name
        }
        return { ...op, name: opName, operation_name: opName }
      })
      const sortedOperations = enrichedOperations.sort((a, b) =>
        parseInt(a.sequence || 0) - parseInt(b.sequence || 0)
      )
      setOperations(sortedOperations)

      // 6. Fetch Logs, Rejections, Downtimes
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

      setTimeLogs(logs)
      setRejections(rejs)
      setDowntimes(down)

      // 7. Calculate Next Shift and Auto-fill form
      const next = getNextLogicalShiftAndDate(logs, rejs, jobCard, previousLogs);
      const shiftTimings = getShiftTimings(next.shift);

      // Default start time to scheduled start if it's the first log
      if (logs.length === 0 && jobCard.scheduled_start_date) {
        const schStart = new Date(jobCard.scheduled_start_date);
        let h = schStart.getHours();
        const p = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        shiftTimings.from_time = `${String(h).padStart(2, '0')}:${String(schStart.getMinutes()).padStart(2, '0')}`;
        shiftTimings.from_period = p;
      }

      // Auto-calculation based on Expected Time
      const totalAcc = calculateTotalAccepted(logs, rejs);
      const maxQty = jobCard?.max_allowed_quantity !== undefined
        ? parseFloat(jobCard.max_allowed_quantity)
        : (currentSequence > 0 && jobCards.find(c => parseInt(c.operation_sequence) === currentSequence - 1)?.transferred_quantity
          ? parseFloat(jobCards.find(c => parseInt(c.operation_sequence) === currentSequence - 1).transferred_quantity)
          : parseFloat(jobCard?.planned_quantity || 0));

      const remainingQty = Math.max(0, maxQty - totalAcc);
      let autoFillData = {};

      if (remainingQty > 0 && currentCycleTime > 0) {
        const remainingTimeMinutes = remainingQty * currentCycleTime;
        let durationMinutes, completedQty;

        if (remainingTimeMinutes < 720) {
          // If expected time is less than 12 hours, mention the time period properly
          durationMinutes = remainingTimeMinutes;
          completedQty = remainingQty;
        } else {
          // If expected time is greater than 12 hours, take time for one full shift (12 hours)
          durationMinutes = 720;
          completedQty = Math.floor(720 / currentCycleTime);
        }

        const toTimeResult = addMinutesToTime(shiftTimings.from_time, shiftTimings.from_period, durationMinutes);
        autoFillData = {
          to_time: toTimeResult.time,
          to_period: toTimeResult.period,
          completed_qty: completedQty,
          time_in_minutes: Math.round(durationMinutes)
        };
      }

      syncAllForms({
        employee_id: jobCard.operator_id || '',
        operator_name: jobCard.assignee_name || jobCard.operator_name || '',
        machine_id: jobCard.machine_id || '',
        shift: next.shift,
        log_date: next.date,
        day_number: next.day,
        ...shiftTimings,
        ...autoFillData
      }, true, logs, rejs);


    } catch (err) {
      toast.addToast(err.message || 'Failed to load operational data', 'error')
    } finally {
      setLoading(false)
    }
  }


  const getShiftStats = (date, shift, dayNumber, logs = timeLogs, rejs = rejections, excludeId = null) => {
    const targetDate = formatDateForMatch(date);
    const targetShift = normalizeShift(shift);
    const targetDay = dayNumber ? String(dayNumber) : null;

    console.log('--- Shift Stats Debug ---', { targetDate, targetShift, targetDay, excludeId });

    const isMatch = (entry) => {
      const entryShift = normalizeShift(entry.shift);
      const entryDay = entry.day_number ? String(entry.day_number) : null;
      const entryDate = formatDateForMatch(entry.log_date);

      const shiftMatch = entryShift === targetShift;
      const dayMatch = targetDay && entryDay ? entryDay === targetDay : true;

      // Smart date matching for Shift B (PM starts on targetDate, AM ends on nextDate)
      let dateMatch = entryDate === targetDate;
      if (targetShift === 'B') {
        const parts = targetDate.split('-');
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setDate(d.getDate() + 1);
        const nextDate = formatDateForMatch(d);

        // Match if (targetDate PM) OR (nextDate AM)
        dateMatch = (entryDate === targetDate && entry.from_period === 'PM') ||
          (entryDate === nextDate && entry.from_period === 'AM');
      }

      return shiftMatch && dayMatch && dateMatch;
    };

    const shiftTimeLogs = (logs || []).filter(isMatch);
    const shiftRejections = (rejs || []).filter(r => isMatch(r) && r.rejection_id !== excludeId);

    const totalTimeLogProduced = shiftTimeLogs.reduce((sum, log) => sum + (parseFloat(log.completed_qty) || 0), 0);
    const totalInspected = shiftRejections.reduce((sum, rej) =>
      sum + (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0), 0);

    console.log('Result:', { totalTimeLogProduced, totalInspected, excludeId });

    return {
      produced: totalTimeLogProduced,
      remaining: Math.max(0, totalTimeLogProduced - totalInspected),
      totalProduced: totalTimeLogProduced,
      totalInspected: totalInspected
    };
  };

  const calculateTotalProduced = (logs, rejs) => {
    const shiftMap = {};
    logs.forEach(log => {
      const key = `day_${log.day_number || 1}_${normalizeShift(log.shift)}_${formatDateForMatch(log.log_date)}`;
      if (!shiftMap[key]) shiftMap[key] = { produced: 0, rejections: 0, accepted: 0 };
      shiftMap[key].produced += (parseFloat(log.completed_qty) || 0);
    });
    rejs.forEach(rej => {
      const key = `day_${rej.day_number || 1}_${normalizeShift(rej.shift)}_${formatDateForMatch(rej.log_date)}`;
      if (!shiftMap[key]) shiftMap[key] = { produced: 0, rejections: 0, accepted: 0 };
      const accepted = (parseFloat(rej.accepted_qty) || 0);
      const rejected = (parseFloat(rej.rejected_qty) || 0);
      const scrap = (parseFloat(rej.scrap_qty) || 0);
      shiftMap[key].rejections += accepted + rejected + scrap;
      shiftMap[key].accepted += accepted;
    });

    // Total Produced is the sum of total units processed in each shift
    return Object.values(shiftMap).reduce((sum, s) => sum + Math.max(s.produced, s.rejections), 0);
  };

  const calculateTotalAccepted = (logs, rejs) => {
    const shiftMap = {};
    logs.forEach(log => {
      const key = `day_${log.day_number || 1}_${normalizeShift(log.shift)}_${formatDateForMatch(log.log_date)}`;
      if (!shiftMap[key]) shiftMap[key] = { produced: 0, rejections: 0, accepted: 0, hasRejection: false };
      shiftMap[key].produced += (parseFloat(log.completed_qty) || 0);
    });
    rejs.forEach(rej => {
      const key = `day_${rej.day_number || 1}_${normalizeShift(rej.shift)}_${formatDateForMatch(rej.log_date)}`;
      if (!shiftMap[key]) shiftMap[key] = { produced: 0, rejections: 0, accepted: 0, hasRejection: false };
      shiftMap[key].accepted += (parseFloat(rej.accepted_qty) || 0);
      shiftMap[key].rejections += (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0);
      shiftMap[key].hasRejection = true;
    });

    return Object.values(shiftMap).reduce((sum, s) => {
      // If a shift has rejection entries, count only the accepted ones
      if (s.hasRejection) {
        return sum + s.accepted;
      }
      // If no rejection entry yet, assume everything produced is currently "accepted" (optimistic)
      return sum + s.produced;
    }, 0);
  };

  const syncAllForms = (data, skipTimings = false, logs = timeLogs, rejs = rejections) => {
    let shift = data.shift !== undefined ? data.shift : timeLogForm.shift;
    let log_date = data.log_date !== undefined ? data.log_date : timeLogForm.log_date;
    let day_number = data.day_number !== undefined ? data.day_number : timeLogForm.day_number;

    // Auto-detect correct day number from existing logs if we changed date/shift but not day
    if (data.day_number === undefined && (data.log_date !== undefined || data.shift !== undefined)) {
      const targetDate = formatDateForMatch(log_date);
      const targetShift = normalizeShift(shift);

      const match = [...logs, ...rejs].find(entry =>
        formatDateForMatch(entry.log_date) === targetDate &&
        normalizeShift(entry.shift) === targetShift &&
        entry.day_number
      );

      if (match) {
        day_number = match.day_number;
      }
    }

    const timings = skipTimings ? {} : getShiftTimings(shift || 'A');

    // Auto-calculation based on Expected Time
    let autoFill = {};
    if (!skipTimings && operationCycleTime > 0) {
      // Calculate current shift downtime to deduct it from the 720 mins
      const currentShiftDowntime = downtimes
        .filter(dt =>
          formatDateForMatch(dt.log_date) === formatDateForMatch(log_date) &&
          normalizeShift(dt.shift) === normalizeShift(shift) &&
          (parseInt(dt.day_number) || 1) === (parseInt(day_number) || 1)
        )
        .reduce((sum, dt) => sum + (parseFloat(dt.duration_minutes) || 0), 0);

      const totalAcc = calculateTotalAccepted(logs, rejs);
      const maxQty = jobCardData?.max_allowed_quantity !== undefined
        ? parseFloat(jobCardData.max_allowed_quantity)
        : (previousOperationData
          ? parseFloat(previousOperationData.transferred_quantity || 0)
          : parseFloat(jobCardData?.planned_quantity || 0));

      const remainingQty = Math.max(0, maxQty - totalAcc);

      // User wants strictly 12 hours (720 mins) for shift timings
      const durationMinutes = 720;
      // Actual production time is total shift time minus any downtime in that shift
      const productionMinutes = Math.max(0, 720 - currentShiftDowntime);

      // Completed quantity based on production minutes, capped by remaining quantity
      const completedQty = Math.min(remainingQty, Math.floor(productionMinutes / operationCycleTime));

      const from_time = data.from_time || timings.from_time;
      const from_period = data.from_period || timings.from_period;
      const toTimeResult = addMinutesToTime(from_time, from_period, durationMinutes);

      autoFill = {
        to_time: toTimeResult.time,
        to_period: toTimeResult.period,
        completed_qty: completedQty,
        time_in_minutes: Math.round(productionMinutes)
      };
    }

    const updates = {
      ...timings,
      ...autoFill,
      ...data,
      shift,
      log_date,
      day_number
    };

    setTimeLogForm(prev => ({ ...prev, ...updates }));
    setRejectionForm(prev => {
      const updated = { ...prev, ...updates };
      const stats = getShiftStats(updated.log_date, updated.shift, updated.day_number, logs, rejs);
      updated.produce_qty = stats.produced;
      updated.inspected_qty = stats.totalInspected;
      return updated;
    });
    setDowntimeForm(prev => {
      const updated = { ...prev, ...updates };
      // Auto-calculate downtime shortfall if switching shift/date
      if (!skipTimings && operationCycleTime > 0) {
        const stats = getShiftStats(updated.log_date, updated.shift, updated.day_number, logs, rejs);
        const produced = parseFloat(stats.totalProduced) || 0;
        const capacity = 720;
        const shortfallMins = Math.max(0, capacity - (produced * operationCycleTime));

        if (shortfallMins > 0) {
          const timings = getShiftTimings(updated.shift);
          const toTimeRes = addMinutesToTime(timings.from_time, timings.from_period, shortfallMins);
          updated.from_time = timings.from_time;
          updated.from_period = timings.from_period;
          updated.to_time = toTimeRes.time;
          updated.to_period = toTimeRes.period;
          updated.duration_minutes = shortfallMins;
          updated.downtime_reason = 'Production Shortfall';
          updated.downtime_type = 'Unplanned Downtime';
          updated.autoCalculated = true;
        } else {
          updated.autoCalculated = false;
        }
      }
      return updated;
    });

    if (updates.log_date) {
      setNextOperationForm(prev => ({
        ...prev,
        next_operation_date: updates.log_date
      }));
    }
  };

  const handleDayChange = (val, formType) => {
    const dayNum = parseInt(val) || 1;
    const currentForm = formType === 'rejection' ? rejectionForm : formType === 'downtime' ? downtimeForm : timeLogForm;
    let anchorDateStr = jobCardData?.actual_start_date;

    if (!anchorDateStr) {
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
      const parts = anchorDateStr.split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + (dayNum - 1));
        if (currentForm.shift === 'B' && currentForm.from_period === 'AM') {
          d.setDate(d.getDate() + 1);
        }
        newDate = formatDateForMatch(d);
      }
    }

    syncAllForms({ day_number: val, log_date: newDate, shift: currentForm.shift }, true, timeLogs, rejections);
  }

  const handleDateChange = (val, formType) => {
    const currentForm = formType === 'rejection' ? rejectionForm : formType === 'downtime' ? downtimeForm : timeLogForm;
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
        if (currentForm.shift === 'B' && currentForm.from_period === 'AM') {
          diffDays = Math.max(1, diffDays - 1);
        }
        if (diffDays >= 1) newDayNumber = String(diffDays);
      }
    }
    syncAllForms({ log_date: val, shift: currentForm.shift, day_number: newDayNumber }, true, timeLogs, rejections);
  }

  const handleShiftChange = (val, formType) => {
    const currentForm = formType === 'rejection' ? rejectionForm : formType === 'downtime' ? downtimeForm : timeLogForm;
    const nextData = getNextLogicalShiftAndDate(timeLogs, rejections, jobCardData, previousOperationLogs);
    if (val === nextData.shift) {
      syncAllForms({ shift: val, log_date: nextData.date, day_number: nextData.day }, false, timeLogs, rejections);
    } else {
      syncAllForms({ shift: val, log_date: currentForm.log_date, day_number: currentForm.day_number }, false, timeLogs, rejections);
    }
  }

  const handleTimeFieldChange = (field, value, formType) => {
    const isTimeLog = formType === 'timeLog';
    const isDowntime = formType === 'downtime';
    const form = isTimeLog ? timeLogForm : (isDowntime ? downtimeForm : rejectionForm);

    let processedValue = value;
    let periodUpdate = {};

    // Auto-convert 24h format from time picker to 12h format + AM/PM
    if (field === 'from_time' || field === 'to_time') {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h)) {
        const period = h >= 12 ? 'PM' : 'AM';
        let displayH = h % 12;
        if (displayH === 0) displayH = 12;
        processedValue = `${String(displayH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
        periodUpdate = { [field === 'from_time' ? 'from_period' : 'to_period']: period };
      }
    }

    if (form.shift === 'B' && (field === 'from_period' || field === 'to_period' || Object.keys(periodUpdate).length > 0)) {
      const parts = (form.log_date || getLocalDate()).split('-');
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const prevPeriod = form[field];
      const nextPeriod = periodUpdate[field] || value;

      if (prevPeriod === 'PM' && nextPeriod === 'AM') {
        d.setDate(d.getDate() + 1);
        syncAllForms({ day_number: form.day_number, log_date: formatDateForMatch(d), shift: 'B', [field]: processedValue, ...periodUpdate }, true, timeLogs, rejections);
        return;
      } else if (prevPeriod === 'AM' && nextPeriod === 'PM') {
        d.setDate(d.getDate() - 1);
        syncAllForms({ day_number: form.day_number, log_date: formatDateForMatch(d), shift: 'B', [field]: processedValue, ...periodUpdate }, true, timeLogs, rejections);
        return;
      }
    }

    if (isDowntime && (field === 'from_time' || field === 'from_period') && form.duration_minutes > 0) {
      const { time, period } = addMinutesToTime(
        field === 'from_time' ? processedValue : form.from_time,
        field === 'from_period' ? (periodUpdate.from_period || value) : form.from_period,
        form.duration_minutes
      );
      syncAllForms({ [field]: processedValue, ...periodUpdate, to_time: time, to_period: period }, true, timeLogs, rejections);
      return;
    }

    syncAllForms({ [field]: processedValue, ...periodUpdate }, true, timeLogs, rejections);
  };

  const handleOperatorChange = (val) => {
    const op = operators.find(o => o.employee_id === val)
    const operator_name = op ? `${op.first_name} ${op.last_name}` : ''
    syncAllForms({ employee_id: val, operator_name }, true);
  }

  const handleAddTimeLog = async (e) => {
    e.preventDefault()

    const entryStart = getEntryDateTime(timeLogForm.log_date, timeLogForm.from_time, timeLogForm.from_period);
    let entryEnd = getEntryDateTime(timeLogForm.log_date, timeLogForm.to_time, timeLogForm.to_period);

    // Handle midnight wrap for Shift B
    if (entryEnd && entryStart && entryEnd <= entryStart && timeLogForm.shift === 'B') {
      entryEnd = new Date(entryEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // Validation: 12-hour limit check
    const durationMins = calculateDurationMinutes(timeLogForm.from_time, timeLogForm.from_period, timeLogForm.to_time, timeLogForm.to_period);
    if (durationMins > 720) {
      toast.addToast('A single production log cannot exceed 12 hours. Please split it into multiple shifts.', 'error');
      return;
    }

    // Validation: Scheduled Time Range Check
    if (jobCardData?.scheduled_start_date) {
      const scheduledStart = new Date(jobCardData.scheduled_start_date);
      const scheduledEnd = jobCardData?.scheduled_end_date ? new Date(jobCardData.scheduled_end_date) : null;

      const isJobActive = ['ready', 'pending', 'in-progress', 'open', 'completed'].includes(normalizeStatus(jobCardData?.status));

      // Allow entries before/after schedule if job is active/started, just log a warning
      if (entryStart && entryStart < scheduledStart) {
        if (!isJobActive) {
          toast.addToast(`Entry start time (${entryStart.toLocaleString('en-IN')}) cannot be before the scheduled start (${scheduledStart.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })})`, 'error');
          return;
        } else {
          console.warn(`Production entry before schedule: ${entryStart.toLocaleString()} < ${scheduledStart.toLocaleString()}`);
        }
      }

      if (scheduledEnd && entryEnd && entryEnd > scheduledEnd) {
        if (!isJobActive) {
          toast.addToast(`Entry end time (${entryEnd.toLocaleString('en-IN')}) cannot be after the scheduled end (${scheduledEnd.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })})`, 'error');
          return;
        } else {
          console.warn(`Production entry after schedule: ${entryEnd.toLocaleString()} > ${scheduledEnd.toLocaleString()}`);
        }
      }
    }

    if (entryEnd <= entryStart) {
      toast.addToast('End time must be after start time', 'error');
      return;
    }

    // Check overlap with existing time logs (Resource-Specific)
    const conflict = checkTimeOverlap(entryStart, entryEnd, timeLogs, timeLogForm.employee_id, timeLogForm.machine_id);
    if (conflict) {
      toast.addToast(`Time slot overlaps with an existing log: ${conflict.shift} Shift on ${new Date(conflict.log_date).toLocaleDateString()} (${conflict.from_time} ${conflict.from_period} - ${conflict.to_time} ${conflict.to_period})`, 'error');
      return;
    }

    // Check overlap with existing downtime logs
    // NOTE: Production log CAN overlap with downtime logs as the downtime duration will be deducted
    let actualProductionMinutes = durationMins;
    const overlappingDowntimes = downtimes.filter(dt => {
      const dtStart = getEntryDateTime(dt.log_date, dt.from_time, dt.from_period);
      let dtEnd = getEntryDateTime(dt.log_date, dt.to_time, dt.to_period);
      if (dtEnd && dtStart && dtEnd <= dtStart && normalizeShift(dt.shift) === 'B') {
        dtEnd = new Date(dtEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      return (entryStart < dtEnd) && (entryEnd > dtStart);
    });

    if (overlappingDowntimes.length > 0) {
      overlappingDowntimes.forEach(dt => {
        actualProductionMinutes -= parseFloat(dt.duration_minutes || 0);
      });
      actualProductionMinutes = Math.max(0, actualProductionMinutes);
    }

    try {
      setFormLoading(true)
      await productionService.createTimeLog({
        ...timeLogForm,
        time_in_minutes: actualProductionMinutes,
        workstation_name: timeLogForm.machine_id,
        accepted_qty: timeLogForm.completed_qty,
        job_card_id: jobCardId
      })
      toast.addToast(`Time log added successfully.${overlappingDowntimes.length > 0 ? ` Deducted ${durationMins - actualProductionMinutes} mins downtime.` : ''}`, 'success')
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add time log', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddRejection = async (e) => {
    e.preventDefault()

    // Validation: Scheduled Date Range Check
    if (jobCardData?.scheduled_start_date) {
      const scheduledStart = new Date(jobCardData.scheduled_start_date);
      scheduledStart.setHours(0, 0, 0, 0);

      const scheduledEnd = jobCardData?.scheduled_end_date ? new Date(jobCardData.scheduled_end_date) : null;
      if (scheduledEnd) scheduledEnd.setHours(0, 0, 0, 0);

      const entryDate = new Date(rejectionForm.log_date);
      entryDate.setHours(0, 0, 0, 0);

      if (entryDate < scheduledStart) {
        const isJobInProgress = normalizeStatus(jobCardData?.status) === 'in-progress';
        if (!isJobInProgress) {
          toast.addToast(`Quality entry date cannot be before scheduled start date (${scheduledStart.toLocaleDateString()})`, 'error');
          return;
        } else {
          console.warn(`Quality entry before schedule: ${entryDate.toLocaleDateString()} < ${scheduledStart.toLocaleDateString()}`);
        }
      }

      if (scheduledEnd && entryDate > scheduledEnd) {
        const isJobInProgress = normalizeStatus(jobCardData?.status) === 'in-progress';
        if (!isJobInProgress) {
          toast.addToast(`Quality entry date cannot be after scheduled end date (${scheduledEnd.toLocaleDateString()})`, 'error');
          return;
        } else {
          console.warn(`Quality entry after schedule: ${entryDate.toLocaleDateString()} > ${scheduledEnd.toLocaleDateString()}`);
        }
      }
    }

    try {
      setFormLoading(true)
      await productionService.createRejection({
        ...rejectionForm,
        job_card_id: jobCardId,
        rejection_reason: rejectionForm.reason
      })
      toast.addToast('Quality entry added successfully', 'success')
      setRejectionForm(prev => ({
        ...prev,
        rejected_qty: 0,
        scrap_qty: 0,
        reason: '',
        notes: ''
      }));
      fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to add quality entry', 'error')
    } finally {
      setFormLoading(false)
    }
  }

  const handleAddDowntime = async (e) => {
    e.preventDefault()

    const entryStart = getEntryDateTime(downtimeForm.log_date, downtimeForm.from_time, downtimeForm.from_period);
    let entryEnd = getEntryDateTime(downtimeForm.log_date, downtimeForm.to_time, downtimeForm.to_period);

    // Handle midnight wrap for Shift B
    if (entryEnd && entryStart && entryEnd <= entryStart && downtimeForm.shift === 'B') {
      entryEnd = new Date(entryEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // Validation: Scheduled Time Range Check
    if (jobCardData?.scheduled_start_date) {
      const scheduledStart = new Date(jobCardData.scheduled_start_date);
      const scheduledEnd = jobCardData?.scheduled_end_date ? new Date(jobCardData.scheduled_end_date) : null;

      if (entryStart && entryStart < scheduledStart) {
        const isJobInProgress = normalizeStatus(jobCardData?.status) === 'in-progress';
        if (!isJobInProgress) {
          toast.addToast(`Downtime start time (${entryStart.toLocaleString('en-IN')}) cannot be before the scheduled start (${scheduledStart.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })})`, 'error');
          return;
        } else {
          console.warn(`Downtime entry before schedule: ${entryStart.toLocaleString()} < ${scheduledStart.toLocaleString()}`);
        }
      }

      if (scheduledEnd && entryEnd && entryEnd > scheduledEnd) {
        const isJobInProgress = normalizeStatus(jobCardData?.status) === 'in-progress';
        if (!isJobInProgress) {
          toast.addToast(`Downtime end time (${entryEnd.toLocaleString('en-IN')}) cannot be after the scheduled end (${scheduledEnd.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })})`, 'error');
          return;
        } else {
          // Allow as warning for downtimes during in-progress jobs after schedule
          console.warn(`Downtime entry after schedule: ${entryEnd.toLocaleString()} > ${scheduledEnd.toLocaleString()}`);
        }
      }
    }

    if (entryEnd <= entryStart) {
      toast.addToast('End time must be after start time', 'error');
      return;
    }

    // Check overlap with existing time logs
    // NOTE: Downtime CAN overlap with production log as it will be deducted from it
    // No error toast needed for production log overlap

    // Check overlap with existing downtime logs (Resource-Specific)
    if (checkTimeOverlap(entryStart, entryEnd, downtimes, null, jobCardData?.machine_id || jobCardData?.workstation_id)) {
      toast.addToast('Downtime overlaps with an existing downtime log for this Workstation', 'error');
      return;
    }

    try {
      setFormLoading(true)
      const duration_minutes = calculateDurationMinutes(
        downtimeForm.from_time,
        downtimeForm.from_period,
        downtimeForm.to_time,
        downtimeForm.to_period
      );

      // Find all production logs that overlap with this downtime to deduct time
      const overlappingTimeLogs = timeLogs.filter(log => {
        const logStart = getEntryDateTime(log.log_date, log.from_time, log.from_period);
        let logEnd = getEntryDateTime(log.log_date, log.to_time, log.to_period);
        if (logEnd && logStart && logEnd <= logStart && normalizeShift(log.shift) === 'B') {
          logEnd = new Date(logEnd.getTime() + 24 * 60 * 60 * 1000);
        }
        return (entryStart < logEnd) && (entryEnd > logStart);
      });

      if (overlappingTimeLogs.length > 0) {
        for (const log of overlappingTimeLogs) {
          // Calculate the actual overlap duration in minutes
          const overlapStart = new Date(Math.max(entryStart.getTime(), getEntryDateTime(log.log_date, log.from_time, log.from_period).getTime()));
          let logEnd = getEntryDateTime(log.log_date, log.to_time, log.to_period);
          if (logEnd <= getEntryDateTime(log.log_date, log.from_time, log.from_period) && normalizeShift(log.shift) === 'B') {
            logEnd = new Date(logEnd.getTime() + 24 * 60 * 60 * 1000);
          }
          const overlapEnd = new Date(Math.min(entryEnd.getTime(), logEnd.getTime()));
          const overlapMins = Math.max(0, Math.round((overlapEnd.getTime() - overlapStart.getTime()) / 60000));

          const newMins = Math.max(0, (parseFloat(log.time_in_minutes) || 0) - overlapMins);
          await productionService.updateTimeLog(log.time_log_id, {
            ...log,
            time_in_minutes: newMins
          });
          console.log(`Deducted ${overlapMins} mins from production log ${log.time_log_id}`);
        }
      }

      await productionService.createDowntime({
        ...downtimeForm,
        duration_minutes,
        job_card_id: jobCardId
      })
      toast.addToast(`Downtime added. ${overlappingTimeLogs.length > 0 ? 'Production time updated.' : ''}`, 'success')
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
        const entryStart = getEntryDateTime(editForm.log_date, editForm.from_time, editForm.from_period);
        let entryEnd = getEntryDateTime(editForm.log_date, editForm.to_time, editForm.to_period);

        if (entryEnd && entryStart && entryEnd <= entryStart && normalizeShift(editForm.shift) === 'B') {
          entryEnd = new Date(entryEnd.getTime() + 24 * 60 * 60 * 1000);
        }

        const conflict = checkTimeOverlap(entryStart, entryEnd, timeLogs, editForm.employee_id, editForm.machine_id, editingId);
        if (conflict) {
          toast.addToast(`Conflict with: ${conflict.shift} Shift (${conflict.from_time} ${conflict.from_period} - ${conflict.to_time} ${conflict.to_period})`, 'error');
          return;
        }

        await productionService.updateTimeLog(editingId, editForm);
      } else if (editingType === 'rejection') {
        await productionService.updateRejection(editingId, editForm);
      } else if (editingType === 'downtime') {
        const entryStart = getEntryDateTime(editForm.log_date, editForm.from_time, editForm.from_period);
        let entryEnd = getEntryDateTime(editForm.log_date, editForm.to_time, editForm.to_period);

        if (entryEnd && entryStart && entryEnd <= entryStart && normalizeShift(editForm.shift) === 'B') {
          entryEnd = new Date(entryEnd.getTime() + 24 * 60 * 60 * 1000);
        }

        const conflict = checkTimeOverlap(entryStart, entryEnd, downtimes, null, editForm.machine_id, editingId);
        if (conflict) {
          toast.addToast(`Updated downtime overlaps with: ${conflict.from_time} ${conflict.from_period} - ${conflict.to_time} ${conflict.to_period}`, 'error');
          return;
        }

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

  const handleEditRow = (row) => {
    const key = row.uniqueKey;
    setEditingRowKey(key);
    setEditFormData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRowKey(null);
    setEditFormData({});
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => {
      let val = value;
      if (['produced', 'total_mins', 'accepted', 'rejected', 'scrap', 'downtime'].includes(field)) {
        val = parseFloat(value) || 0;
      }
      const updated = { ...prev, [field]: val };

      // Auto-recalculate total_mins if time changes
      if (['from_time', 'from_period', 'to_time', 'to_period'].includes(field)) {
        const fromT = field === 'from_time' ? value : prev.from_time;
        const fromP = field === 'from_period' ? value : prev.from_period;
        const toT = field === 'to_time' ? value : prev.to_time;
        const toP = field === 'to_period' ? value : prev.to_period;
        updated.total_mins = calculateDurationMinutes(fromT, fromP, toT, toP);
      }

      // Update shift produced if individual log production changes
      if (field === 'produced') {
        const diff = (parseFloat(val) || 0) - (parseFloat(prev.produced) || 0);
        updated.shiftProduced = (parseFloat(prev.shiftProduced) || 0) + diff;
      }

      // Re-calculate accepted quantity only on the shift primary row (where quality info is shown)
      if (prev.isShiftPrimary && (field === 'rejected' || field === 'scrap' || field === 'produced')) {
        const sProd = parseFloat(updated.shiftProduced) || 0;
        const rej = parseFloat(updated.rejected) || 0;
        const scr = parseFloat(updated.scrap) || 0;
        updated.accepted = Math.max(0, sProd - rej - scr);
      }
      return updated;
    });
  };

  const handleSaveRow = async () => {
    try {
      setIsSubmitting(true);
      const {
        timeLogIds, rejectionIds, downtimeIds, produced, total_mins,
        accepted, rejected, scrap, downtime,
        from_time, from_period, to_time, to_period,
        date, operator_name, employee_id
      } = editFormData;

      if (timeLogIds?.[0]) {
        await productionService.updateTimeLog(timeLogIds[0], {
          completed_qty: produced,
          time_in_minutes: total_mins,
          from_time,
          from_period,
          to_time,
          to_period,
          log_date: date,
          operator_name,
          employee_id
        });
      }
      if (rejectionIds?.[0]) {
        await productionService.updateRejection(rejectionIds[0], { accepted_qty: accepted, rejected_qty: rejected, scrap_qty: scrap });
      }
      if (downtimeIds?.[0]) {
        await productionService.updateDowntime(downtimeIds[0], { duration_minutes: downtime });
      }

      toast.addToast('Production report updated successfully', 'success');
      setEditingRowKey(null);
      setEditFormData({});
      fetchAllData();
    } catch (error) {
      toast.addToast(error.message || 'Failed to update production report', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalProducedQty = calculateTotalProduced(timeLogs, rejections);
  const totalAcceptedQty = calculateTotalAccepted(timeLogs, rejections);
  const productionMinutes = timeLogs.reduce((sum, log) => sum + (parseFloat(log.time_in_minutes) || 0), 0);
  const totalDowntimeMinutes = downtimes.reduce((sum, d) => sum + (parseFloat(d.duration_minutes) || 0), 0)
  const totalActualMinutes = productionMinutes + totalDowntimeMinutes;
  const totalOperationCost = totalProducedQty * (parseFloat(jobCardData?.hourly_rate || 0) * (operationCycleTime || 0) / 60);
  const approvedRejections = rejections.filter(rej => rej.status === 'Approved');
  const totalRejectedQty = approvedRejections.reduce((sum, rej) => sum + (parseFloat(rej.rejected_qty) || 0), 0)
  const totalScrapQty = approvedRejections.reduce((sum, rej) => sum + (parseFloat(rej.scrap_qty) || 0), 0)
  const transferredQty = parseFloat(jobCardData?.transferred_quantity || 0);
  const transferableQty = Math.max(0, totalAcceptedQty - transferredQty);
  const qualityInspectedTotal = approvedRejections.reduce((sum, rej) =>
    sum + (parseFloat(rej.accepted_qty) || 0) + (parseFloat(rej.rejected_qty) || 0) + (parseFloat(rej.scrap_qty) || 0), 0)
  const qualityScore = qualityInspectedTotal > 0 ? ((totalAcceptedQty / qualityInspectedTotal) * 100).toFixed(1) : 0
  const hasPendingApproval = rejections.some(rej => rej.status !== 'Approved')

  const maxAllowedQty = jobCardData?.max_allowed_quantity !== undefined
    ? parseFloat(jobCardData.max_allowed_quantity)
    : (previousOperationData
      ? parseFloat(previousOperationData.transferred_quantity || 0)
      : parseFloat(jobCardData?.planned_quantity || 0));

  const isOperationFinished = totalAcceptedQty >= (maxAllowedQty - 0.1);
  const canTransfer = transferableQty > 0 || isOperationFinished;

  const handleSubmitProduction = async () => {
    try {
      setIsSubmitting(true)
      const shouldComplete = isOperationFinished
      const updatePayload = {
        produced_quantity: totalProducedQty,
        accepted_quantity: totalAcceptedQty,
        rejected_quantity: totalRejectedQty,
        scrap_quantity: totalScrapQty
      }

      if (nextOperationForm.next_operation_id) {
        updatePayload.transfer_to_next_op = true;
        const selectedOp = operations.find(op => (op.operation_id || op.id || op.operation_name || op.name) === nextOperationForm.next_operation_id);
        const selectedSeq = selectedOp ? parseInt(selectedOp.sequence || selectedOp.seq || selectedOp.operation_seq || 0) : 0;
        const nextJobCard = allJobCards.find(c => {
          const isOpMatch = c.operation_id === nextOperationForm.next_operation_id || c.operation === nextOperationForm.next_operation_id || c.operation === (selectedOp?.operation_name || selectedOp?.name);
          const isSeqMatch = parseInt(c.operation_sequence) === selectedSeq;
          return isOpMatch && isSeqMatch;
        });
        if (nextJobCard) {
          updatePayload.next_job_card_id = nextJobCard.job_card_id;
          updatePayload.next_operator_id = nextOperationForm.next_operator_id;
          updatePayload.next_machine_id = nextOperationForm.next_warehouse_id; // In UI it's called target warehouse but it's used for machine assignment in Job Card
        }
      }

      if (shouldComplete) {
        updatePayload.status = 'completed'
        updatePayload.actual_end_date = new Date().toISOString()
      } else {
        updatePayload.status = 'in-progress'
      }

      await productionService.updateJobCard(jobCardId, updatePayload)
      toast.addToast(shouldComplete ? 'Production stage completed successfully' : 'Partial quantity transferred successfully', 'success')
      if (shouldComplete) navigate('/manufacturing/job-cards')
      else fetchAllData()
    } catch (err) {
      toast.addToast(err.message || 'Failed to complete production', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateDailyReport = () => {
    const reportRows = [];
    const shiftSummary = {};

    // 1. Group shift-level rejections and downtimes
    rejections.forEach(rej => {
      if (rej.status !== 'Approved') return;
      const key = `${rej.day_number || 1}_${normalizeShift(rej.shift)}`;
      if (!shiftSummary[key]) {
        shiftSummary[key] = {
          accepted: 0, rejected: 0, scrap: 0, downtime: 0, produced: 0,
          rejectionIds: [], downtimeIds: [], date: formatDateForMatch(rej.log_date)
        };
      }
      shiftSummary[key].accepted += parseFloat(rej.accepted_qty || 0);
      shiftSummary[key].rejected += parseFloat(rej.rejected_qty || 0);
      shiftSummary[key].scrap += parseFloat(rej.scrap_qty || 0);
      if (rej.rejection_id) shiftSummary[key].rejectionIds.push(rej.rejection_id);
    });

    downtimes.forEach(down => {
      const key = `${down.day_number || 1}_${normalizeShift(down.shift)}`;
      if (!shiftSummary[key]) {
        shiftSummary[key] = {
          accepted: 0, rejected: 0, scrap: 0, downtime: 0, produced: 0,
          rejectionIds: [], downtimeIds: [], date: formatDateForMatch(down.log_date)
        };
      }
      shiftSummary[key].downtime += parseFloat(down.duration_minutes || 0);
      if (down.downtime_id) shiftSummary[key].downtimeIds.push(down.downtime_id);
    });

    timeLogs.forEach(log => {
      const key = `${log.day_number || 1}_${normalizeShift(log.shift)}`;
      if (!shiftSummary[key]) {
        shiftSummary[key] = {
          accepted: 0, rejected: 0, scrap: 0, downtime: 0, produced: 0,
          rejectionIds: [], downtimeIds: [], date: formatDateForMatch(log.log_date)
        };
      }
      shiftSummary[key].produced += parseFloat(log.completed_qty || 0);
    });

    // 2. Create entries for each individual Time Log
    const sortedLogs = [...timeLogs].sort((a, b) => {
      const dayA = parseInt(a.day_number) || 0;
      const dayB = parseInt(b.day_number) || 0;
      if (dayA !== dayB) return dayB - dayA;

      const dateA = formatDateForMatch(a.log_date) || '';
      const dateB = formatDateForMatch(b.log_date) || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);

      const shiftA = normalizeShift(a.shift);
      const shiftB = normalizeShift(b.shift);
      if (shiftA !== shiftB) return shiftB.localeCompare(shiftA);

      const timeA = parseTimeToMinutes(a.from_time, a.from_period);
      const timeB = parseTimeToMinutes(b.from_time, b.from_period);
      return timeB - timeA;
    });

    const shiftSeen = new Set();

    sortedLogs.forEach(log => {
      const shiftKey = `${log.day_number || 1}_${normalizeShift(log.shift)}`;
      const metrics = shiftSummary[shiftKey];
      const isFirstOfShift = !shiftSeen.has(shiftKey);
      shiftSeen.add(shiftKey);

      const produced = parseFloat(log.completed_qty || 0);
      const totalMins = parseFloat(log.time_in_minutes || 0);

      const expectedMins = produced * (operationCycleTime || 0);
      const varianceMins = totalMins - expectedMins;
      const hourlyRate = parseFloat(jobCardData?.hourly_rate || 0);
      const opCost = produced * (hourlyRate * (operationCycleTime || 0) / 60);
      const costVariance = varianceMins * (hourlyRate / 60);

      reportRows.push({
        uniqueKey: `log_${log.time_log_id}`,
        id: log.time_log_id,
        type: 'log',
        date: formatDateForMatch(log.log_date),
        shift: normalizeShift(log.shift),
        day: log.day_number || 1,
        employee_id: log.employee_id,
        operator_name: log.operator_name,
        from_time: log.from_time,
        from_period: log.from_period,
        to_time: log.to_time,
        to_period: log.to_period,
        startTimeStr: formatTime12H(log.from_time, log.from_period),
        endTimeStr: formatTime12H(log.to_time, log.to_period),
        total_mins: totalMins,
        expected_mins: expectedMins,
        variance_mins: varianceMins,
        operation_cost: opCost,
        cost_variance: costVariance,
        produced: produced,
        shiftProduced: metrics.produced,
        accepted: isFirstOfShift ? metrics.accepted : 0,
        rejected: isFirstOfShift ? metrics.rejected : 0,
        scrap: isFirstOfShift ? metrics.scrap : 0,
        downtime: isFirstOfShift ? metrics.downtime : 0,
        isShiftPrimary: isFirstOfShift,
        yieldPercentage: metrics.produced > 0 ? ((metrics.accepted / metrics.produced) * 100).toFixed(1) : '0.0',
        uph: totalMins > 0 ? (produced / (totalMins / 60)).toFixed(1) : '0.0',
        timeLogIds: [log.time_log_id],
        rejectionIds: metrics.rejectionIds,
        downtimeIds: metrics.downtimeIds
      });
    });

    // 3. Add entries for shifts that have rejections/downtimes but NO logs
    Object.entries(shiftSummary).forEach(([key, metrics]) => {
      if (!shiftSeen.has(key)) {
        const [day, shift] = key.split('_');
        reportRows.push({
          uniqueKey: `shift_${key}`,
          type: 'inspection_only',
          date: metrics.date,
          shift: shift,
          day: day,
          operator: 'N/A',
          startTimeStr: '',
          endTimeStr: '',
          total_mins: 0,
          expected_mins: 0,
          variance_mins: 0,
          operation_cost: 0,
          produced: 0,
          shiftProduced: metrics.produced,
          accepted: metrics.accepted,
          rejected: metrics.rejected,
          scrap: metrics.scrap,
          downtime: metrics.downtime,
          isShiftPrimary: true,
          yieldPercentage: '0.0',
          uph: '0.0',
          timeLogIds: [],
          rejectionIds: metrics.rejectionIds,
          downtimeIds: metrics.downtimeIds
        });
      }
    });

    return reportRows.sort((a, b) => {
      if (a.day !== b.day) return parseInt(b.day) - parseInt(a.day);
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.shift !== b.shift) return b.shift.localeCompare(a.shift);
      return 0; // Maintain inner log sorting
    });
  };

  const downloadReport = () => {
    const data = generateDailyReport();
    const headers = ['Date', 'Shift', 'Operator', 'Expected Mins', 'Actual Mins', 'Variance', 'Produced', 'Accepted', 'Rejected', 'Scrap', 'Downtime (min)', 'Operation Cost', 'Cost Variance'];
    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.date.split('-').reverse().join('-'),
        row.shift,
        `"${row.operator_name || 'N/A'}"`,
        (row.expected_mins || 0).toFixed(2),
        (row.total_mins || 0).toFixed(2),
        (row.variance_mins || 0).toFixed(2),
        row.produced.toFixed(2),
        row.accepted.toFixed(2),
        row.rejected.toFixed(2),
        row.scrap.toFixed(2),
        row.downtime.toFixed(0),
        (row.operation_cost || 0).toFixed(2),
        (row.cost_variance || 0).toFixed(2)
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Daily_Production_Report_${jobCardId}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const renderTableActions = (row, type) => {
    const idField = type === 'timeLog' ? 'time_log_id' : (type === 'rejection' ? 'rejection_id' : 'downtime_id');
    const isEditing = editingId === row[idField] && editingType === type;

    return (
      <div className="flex items-center justify-center gap-1">
        {isEditing ? (
          <>
            <button onClick={handleSaveInlineEdit} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Save"><Save size={14} /></button>
            <button onClick={handleCancelInlineEdit} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all" title="Cancel"><X size={14} /></button>
          </>
        ) : (
          <>
            <button onClick={() => { setModalItem(row); setModalType(type); setIsViewModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="View Details"><Eye size={14} /></button>
            <button onClick={() => handleEditItem(row, type)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Edit Entry"><Edit2 size={14} /></button>
            {type === 'rejection' && row.status !== 'Approved' && (
              <button onClick={() => handleApproveRejection(row.rejection_id)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all" title="Approve Inspection"><ShieldCheck size={14} /></button>
            )}
            <button onClick={() => { if (type === 'timeLog') handleDeleteTimeLog(row.time_log_id); else if (type === 'rejection') handleDeleteRejection(row.rejection_id); else if (type === 'downtime') handleDeleteDowntime(row.downtime_id); }} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all" title="Delete Entry"><Trash2 size={14} /></button>
          </>
        )}
      </div>
    );
  }

  const renderViewModalContent = () => {
    if (!modalItem) return null;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-400   ">Date & Shift</p>
            <p className="text-xs  text-slate-700">{new Date(modalItem.log_date).toLocaleDateString()} - Shift {modalItem.shift}</p>
          </div>
          {modalType === 'timeLog' && (
            <>
              <div><p className="text-xs text-slate-400   ">Operator</p><p className="text-xs  text-slate-700">{modalItem.operator_name || 'N/A'}</p></div>
              <div><p className="text-xs text-slate-400   ">Time Interval</p><p className="text-xs  text-slate-700">{modalItem.from_time} {modalItem.from_period} - {modalItem.to_time} {modalItem.to_period}</p></div>
              <div><p className="text-xs text-slate-400   ">Produced Quantity</p><p className="text-xs  text-indigo-600">{parseFloat(modalItem.completed_qty || 0).toLocaleString()} Units</p></div>
            </>
          )}
          {modalType === 'rejection' && (
            <>
              <div><p className="text-xs text-slate-400   ">Status</p><p className="text-xs  text-slate-700">{modalItem.status}</p></div>
              <div><p className="text-xs text-slate-400   ">Accepted Qty</p><p className="text-xs  text-emerald-600">{parseFloat(modalItem.accepted_qty || 0).toLocaleString()} Units</p></div>
              <div><p className="text-xs text-slate-400   ">Rejected Qty</p><p className="text-xs  text-rose-600">{parseFloat(modalItem.rejected_qty || 0).toLocaleString()} Units</p></div>
              <div><p className="text-xs text-slate-400   ">Scrap Qty</p><p className="text-xs  text-slate-600">{parseFloat(modalItem.scrap_qty || 0).toLocaleString()} Units</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-400   ">Reason / Notes</p><p className="text-xs  text-slate-700">{modalItem.rejection_reason || 'No notes provided'}</p></div>
            </>
          )}
          {modalType === 'downtime' && (
            <>
              <div><p className="text-xs text-slate-400   ">Duration</p><p className="text-xs  text-amber-600">{modalItem.duration_minutes} Minutes</p></div>
              <div><p className="text-xs text-slate-400   ">Type</p><p className="text-xs  text-slate-700">{modalItem.downtime_type}</p></div>
              <div className="col-span-2"><p className="text-xs text-slate-400   ">Reason</p><p className="text-xs  text-slate-700">{modalItem.downtime_reason || 'No reason provided'}</p></div>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded  animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Syncing Production Environment...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans antialiased text-slate-900">
      <div className="mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl  text-slate-900">Production Entry</h1>
                <StatusBadge status={jobCardData?.status} />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span className=" text-slate-700">{jobCardData?.job_card_id || 'LOADING...'}</span>
                <span className="text-slate-300">•</span>
                <span className="font-medium">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/manufacturing/job-cards')}
              className="flex items-center gap-2 px-4 py-2 text-xs  text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded transition-all"
            >
              <ArrowLeft size={15} />
              Back
            </button>
            {isOperationFinished && normalizeStatus(jobCardData?.status) !== 'completed' && (
              <button
                onClick={handleSubmitProduction}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200 transition-all text-xs "
              >
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded  animate-spin" /> : <CheckCircle size={15} />}
                Complete Production
              </button>
            )}
          </div>
        </div>

        {jobCardData?.execution_mode === 'OUTSOURCE' && (
          <div className="mb-6 p-8 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded text-center">
            <div className="w-16 h-16 bg-white rounded  flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-100">
              <Package className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-xl  text-slate-900 mb-2">Outsource Operation</h2>
            <p className="text-slate-600 max-w-lg mx-auto mb-6 font-medium">
              This operation is handled by an external vendor. Production tracking and stock movements are managed via Subcontract Dispatch/Receipt.
            </p>
            <button
              onClick={() => navigate('/manufacturing/job-cards')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded  shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2 mx-auto"
            >
              <ArrowLeft size={18} />
              Back to Job Cards
            </button>
          </div>
        )}

        <div className={jobCardData?.execution_mode === 'OUTSOURCE' ? 'opacity-50 pointer-events-none grayscale' : ''}>
          <ProductionRibbon
            jobCardData={jobCardData}
            itemName={itemName}
            maxAllowedQty={maxAllowedQty}
            operationCycleTime={operationCycleTime}
            totalProducedQty={totalProducedQty}
            totalAcceptedQty={totalAcceptedQty}
            totalActualMinutes={totalActualMinutes}
            totalOperationCost={totalOperationCost}
            transferableQty={transferableQty}
            previousOperationData={previousOperationData}
          />

          <div className="grid grid-cols-12 gap-2 my-3">
            <div className="col-span-12">
              {(() => {
                const expectedMinutes = (operationCycleTime || 0) * (totalProducedQty || 0)
                const productionMinutes = timeLogs.reduce((sum, log) => sum + (parseFloat(log.time_in_minutes) || 0), 0)
                const actualMinutes = productionMinutes + totalDowntimeMinutes
                const efficiency = actualMinutes > 0 ? ((expectedMinutes / actualMinutes) * 100).toFixed(0) : 0

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard label="Efficiency" value={`${efficiency}%`} icon={Activity} color={efficiency >= 90 ? 'emerald' : efficiency >= 75 ? 'amber' : 'rose'} subtitle={`${actualMinutes.toFixed(0)} / ${expectedMinutes.toFixed(0)} MIN`} />
                    <StatCard label="Quality Yield" value={`${qualityScore}%`} icon={ShieldCheck} color={hasPendingApproval ? 'amber' : (qualityScore >= 98 ? 'emerald' : 'amber')} subtitle={hasPendingApproval ? "PENDING APPROVAL" : "ACCEPTANCE RATE"} />
                    <StatCard label="Productivity" value={actualMinutes > 0 ? ((totalAcceptedQty / (actualMinutes / 60)).toFixed(1)) : '0'} icon={Boxes} color="indigo" subtitle="UNITS PER HOUR" />
                  </div>
                )
              })()}
            </div>

            <div className="col-span-12 space-y-8 pb-20">
              {previousOperationData && (
                <div className="bg-emerald-50/20 border border-emerald-100 rounded p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center"><CheckCircle size={20} /></div>
                    <div>
                      <p className="text-xs   text-emerald-600 ">Previous Phase Complete</p>
                      <h3 className="text-xs  text-slate-900">{previousOperationData.operation}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="">
                      <p className="text-xs   text-slate-400 ">Accepted</p>
                      <p className="text-xs  text-emerald-600">{parseFloat(previousOperationData.accepted_quantity || 0).toLocaleString()} Units</p>
                    </div>
                    <div className="">
                      <p className="text-xs   text-slate-400 ">Transferred</p>
                      <p className="text-xs  text-indigo-600">{parseFloat(previousOperationData.transferred_quantity || 0).toLocaleString()} Units</p>
                    </div>
                  </div>
                </div>
              )}

              <div id="time-logs" className="bg-white rounded  border border-slate-100 p-4 scroll-mt-6">
                <div className="flex items-center justify-between">
                  <SectionTitle title="Production Logging" icon={Plus} subtitle="Record production output per operator and shift" />
                  {(() => {
                    const shiftDowntime = downtimes
                      .filter(dt =>
                        formatDateForMatch(dt.log_date) === formatDateForMatch(timeLogForm.log_date) &&
                        normalizeShift(dt.shift) === normalizeShift(timeLogForm.shift) &&
                        (parseInt(dt.day_number) || 1) === (parseInt(timeLogForm.day_number) || 1)
                      )
                      .reduce((sum, dt) => sum + (parseFloat(dt.duration_minutes) || 0), 0);

                    if (shiftDowntime === 0) return null;

                    return (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded  text-amber-700 animate-in fade-in slide-in-from-right-4 duration-500">
                        <AlertTriangle size={14} className="animate-pulse" />
                        <span className="text-xs   tracking-tight">Shift Downtime:</span>
                        <span className="text-xs font-black">{shiftDowntime} mins</span>
                      </div>
                    );
                  })()}
                </div>
                <div className="bg-slate-50/50 rounded mb-2">
                  <form onSubmit={handleAddTimeLog} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Day" required>
                        <input
                          type="number"
                          value={timeLogForm.day_number}
                          onChange={(e) => handleDayChange(e.target.value, 'timeLog')}
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all "
                          min="1"
                          required
                        />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Shift" required>
                        <select value={timeLogForm.shift} onChange={(e) => handleShiftChange(e.target.value, 'timeLog')} className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all">{shifts.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-2">
                      <FieldWrapper label="Date" required>
                        <input type="date" value={timeLogForm.log_date} onChange={(e) => handleDateChange(e.target.value, 'timeLog')} className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" required />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-2"><FieldWrapper label="Operator" required><SearchableSelect value={timeLogForm.employee_id} onChange={handleOperatorChange} options={operators.map(op => ({ value: op.employee_id, label: `${op.first_name} ${op.last_name}` }))} placeholder="Select Operator" /></FieldWrapper></div>
                    <div className="col-span-12 lg:col-span-1"><FieldWrapper label="Produced" required><div className="relative"><input type="number" step="0.01" value={timeLogForm.completed_qty} onChange={(e) => setTimeLogForm({ ...timeLogForm, completed_qty: e.target.value })} className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" required /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs  text-slate-400">units</span></div></FieldWrapper></div>
                    <div className="col-span-12 lg:col-span-5"><div className="flex gap-2 items-end"><div className="flex-1"><FieldWrapper label="Start Time" required><div className="flex gap-1"><input type="time" value={timeLogForm.from_time} onChange={(e) => handleTimeFieldChange('from_time', e.target.value, 'timeLog')} className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none" /><select value={timeLogForm.from_period} onChange={(e) => handleTimeFieldChange('from_period', e.target.value, 'timeLog')} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs"><option value="AM">AM</option><option value="PM">PM</option></select></div></FieldWrapper></div><div className="flex-1"><FieldWrapper label="End Time" required><div className="flex gap-1"><input type="time" value={timeLogForm.to_time} onChange={(e) => handleTimeFieldChange('to_time', e.target.value, 'timeLog')} className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none" /><select value={timeLogForm.to_period} onChange={(e) => handleTimeFieldChange('to_period', e.target.value, 'timeLog')} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs"><option value="AM">AM</option><option value="PM">PM</option></select></div></FieldWrapper></div><button type="submit" disabled={formLoading} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 p-2"><Plus size={15} /><span className="text-xs   ">Log</span></button></div></div>
                  </form>
                </div>
                <DataTable columns={timeLogColumns} data={timeLogs} renderActions={(row) => renderTableActions(row, 'timeLog')} />
              </div>

              <div id="quality-control" className="bg-white rounded  border border-slate-100 p-4 scroll-mt-6">
                <SectionTitle title="Quality & Inspection" icon={ShieldCheck} subtitle="Verify production quality and log rejections" />
                <div className="bg-emerald-50/30 rounded p-2 mb-2 border border-emerald-100/50">
                  <form onSubmit={handleAddRejection} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Day" required>
                        <div className="relative">
                          <input
                            type="number"
                            value={rejectionForm.day_number}
                            onChange={(e) => handleDayChange(e.target.value, 'rejection')}
                            className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all "
                            min="1"
                            required
                          />
                        </div>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Shift" required>
                        <select value={rejectionForm.shift} onChange={(e) => handleShiftChange(e.target.value, 'rejection')} className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all">{shifts.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-2">
                      <FieldWrapper label="Date" required>
                        <input type="date" value={rejectionForm.log_date} onChange={(e) => handleDateChange(e.target.value, 'rejection')} className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" required />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Produced">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const stats = getShiftStats(rejectionForm.log_date, rejectionForm.shift, rejectionForm.day_number);
                              setRejectionForm(prev => ({ ...prev, produce_qty: stats.produced }));
                              toast.addToast(`Re-synchronized production statistics: ${stats.produced} units found`, 'info');
                            }}
                            className="p-1.5 bg-slate-50 border border-slate-200 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors group"
                            title="Refresh statistics"
                          >
                            <Clock size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                          </button>
                          <input
                            type="number"
                            value={rejectionForm.produce_qty}
                            onChange={(e) => setRejectionForm(prev => ({ ...prev, produce_qty: e.target.value }))}
                            className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Rejected" required>
                        <input
                          type="number"
                          value={rejectionForm.rejected_qty}
                          onChange={(e) => setRejectionForm({ ...rejectionForm, rejected_qty: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-rose-600  outline-none focus:ring-2 focus:ring-rose-500/20"
                          required
                        />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Scrap">
                        <input
                          type="number"
                          value={rejectionForm.scrap_qty}
                          onChange={(e) => setRejectionForm({ ...rejectionForm, scrap_qty: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-amber-600  outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Accepted">
                        <input
                          type="number"
                          value={rejectionForm.accepted_qty}
                          className="w-full p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700  outline-none cursor-not-allowed"
                          readOnly
                        />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-2">
                      <FieldWrapper label="Reason" required={parseFloat(rejectionForm.rejected_qty || 0) > 0 || parseFloat(rejectionForm.scrap_qty || 0) > 0}>
                        <select
                          value={rejectionForm.reason}
                          onChange={(e) => setRejectionForm({ ...rejectionForm, reason: e.target.value })}
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
                          required={parseFloat(rejectionForm.rejected_qty || 0) > 0 || parseFloat(rejectionForm.scrap_qty || 0) > 0}
                        >
                          <option value="">Select Reason</option>
                          {rejectionReasons.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-2">
                      <button type="submit" disabled={formLoading} className="w-full p-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100 h-[34px] flex items-center justify-center gap-2">
                        <ShieldCheck size={18} />
                        <span className="text-xs ">Log</span>
                      </button>
                    </div>
                  </form>
                </div>
                <DataTable columns={rejectionColumns} data={rejections} renderActions={(row) => renderTableActions(row, 'rejection')} />
              </div>

              <div id="downtime" className="bg-white rounded  border border-slate-100 p-4 scroll-mt-6">
                <SectionTitle title="Downtime Tracking" icon={AlertTriangle} subtitle="Log machine downtime and maintenance periods" />
                <div className="bg-amber-50/30 rounded p-2 mb-2 border border-amber-100/50">
                  {/* Shift Capacity Info */}
                  {operationCycleTime > 0 && (
                    <div className="mb-3 flex items-center gap-4 px-3 py-2 bg-white/60 rounded border border-amber-100 flex-wrap">
                      {(() => {
                        const stats = getShiftStats(downtimeForm.log_date, downtimeForm.shift, downtimeForm.day_number);
                        const produced = parseFloat(stats.totalProduced) || 0;
                        const capacity = Math.floor(720 / operationCycleTime);
                        const shortfall = Math.max(0, capacity - produced);
                        const shortfallMins = shortfall * operationCycleTime;

                        return (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400   ">Shift Capacity:</span>
                              <span className="text-xs font-black text-slate-700">{capacity} Units</span>
                            </div>
                            <div className="w-px h-3 bg-amber-200" />
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400   ">Produced:</span>
                              <span className="text-xs font-black text-emerald-600">{produced} Units</span>
                            </div>
                            <div className="w-px h-3 bg-amber-200" />
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400   ">Shortfall:</span>
                              <span className={`text-xs font-black ${shortfall > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                {shortfall} Units ({formatDuration(shortfallMins)})
                              </span>
                            </div>
                            {shortfall > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const timings = getShiftTimings(downtimeForm.shift);

                                  // Logic to find the last production entry for this shift to avoid overlap
                                  const targetDate = formatDateForMatch(downtimeForm.log_date);
                                  const targetShift = normalizeShift(downtimeForm.shift);
                                  const targetDay = downtimeForm.day_number ? String(downtimeForm.day_number) : null;

                                  const shiftLogs = (timeLogs || []).filter(log => {
                                    const entryShift = normalizeShift(log.shift);
                                    const entryDay = log.day_number ? String(log.day_number) : null;
                                    const entryDate = formatDateForMatch(log.log_date);
                                    return entryShift === targetShift && entryDate === targetDate && (targetDay ? entryDay === targetDay : true);
                                  });

                                  let startTime = timings.from_time;
                                  let startPeriod = timings.from_period;

                                  if (shiftLogs.length > 0) {
                                    // Sort by end time and get the latest one (shift-wrap aware)
                                    const sortedByEnd = [...shiftLogs].sort((a, b) => {
                                      let valA = parseTimeToMinutes(a.to_time, a.to_period);
                                      let valB = parseTimeToMinutes(b.to_time, b.to_period);

                                      // For Shift B (8 PM - 8 AM), AM times (0-480) are later than PM times (1200-1440)
                                      if (targetShift === 'B') {
                                        if (a.to_period === 'AM' && b.to_period === 'PM') return 1;
                                        if (a.to_period === 'PM' && b.to_period === 'AM') return -1;
                                      }
                                      return valA - valB;
                                    });
                                    const latestLog = sortedByEnd[sortedByEnd.length - 1];
                                    startTime = latestLog.to_time;
                                    startPeriod = latestLog.to_period;
                                  }

                                  const toTimeResult = addMinutesToTime(startTime, startPeriod, shortfallMins);

                                  // Shift B boundary check (8 AM limit)
                                  let finalEndTime = toTimeResult.time;
                                  let finalEndPeriod = toTimeResult.period;

                                  if (targetShift === 'B') {
                                    const endMins = parseTimeToMinutes(finalEndTime, finalEndPeriod);
                                    // If end time goes beyond 8 AM (480 mins) and we started in AM or wrap
                                    if (finalEndPeriod === 'AM' && endMins > 480) {
                                      finalEndTime = '08:00';
                                      finalEndPeriod = 'AM';
                                      toast.addToast('Downtime capped at shift end (08:00 AM)', 'warning');
                                    }
                                  }

                                  setDowntimeForm(prev => ({
                                    ...prev,
                                    from_time: startTime,
                                    from_period: startPeriod,
                                    to_time: finalEndTime,
                                    to_period: finalEndPeriod,
                                    duration_minutes: shortfallMins,
                                    downtime_reason: 'Production Shortfall',
                                    downtime_type: 'Unplanned Downtime',
                                    autoCalculated: true
                                  }));
                                  toast.addToast(`Automatically calculated downtime: ${shortfallMins} mins for ${shortfall} units shortfall`, 'info');
                                }}
                                className="ml-auto flex items-center gap-1.5 px-2 py-1 bg-amber-600 text-white rounded text-xs   hover:bg-amber-700 transition-colors shadow-sm"
                              >
                                <Activity size={12} />
                                Auto-Fill
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <form onSubmit={handleAddDowntime} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Day" required>
                        <input
                          type="number"
                          value={downtimeForm.day_number}
                          onChange={(e) => handleDayChange(e.target.value, 'downtime')}
                          className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all "
                          min="1"
                          required
                        />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Shift" required>
                        <select value={downtimeForm.shift} onChange={(e) => handleShiftChange(e.target.value, 'downtime')} className="w-full p-2 bg-white border border-slate-200 rounded text-xs  text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all">{shifts.map(s => <option key={s} value={s}>{s}</option>)}</select>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1">
                      <FieldWrapper label="Date" required>
                        <input type="date" value={downtimeForm.log_date} onChange={(e) => handleDateChange(e.target.value, 'downtime')} className="w-full p-2 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all" required />
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-2"><FieldWrapper label="Downtime Type" required><select value={downtimeForm.downtime_type} onChange={(e) => setDowntimeForm({ ...downtimeForm, downtime_type: e.target.value })} className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20" required><option value="">Select Type</option>{downtimeTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></FieldWrapper></div>
                    <div className="col-span-12 lg:col-span-2"><FieldWrapper label="Reason" required><input type="text" value={downtimeForm.downtime_reason} onChange={(e) => setDowntimeForm({ ...downtimeForm, downtime_reason: e.target.value })} className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none" placeholder="e.g., Power Outage" required /></FieldWrapper></div>
                    <div className="col-span-12 lg:col-span-4">
                      <FieldWrapper label="Period" required>
                        <div className="flex gap-2">
                          <div className="flex-1 flex gap-1">
                            <input
                              type="time"
                              value={downtimeForm.from_time}
                              onChange={(e) => handleTimeFieldChange('from_time', e.target.value, 'downtime')}
                              className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none"
                            />
                            <select
                              value={downtimeForm.from_period}
                              onChange={(e) => handleTimeFieldChange('from_period', e.target.value, 'downtime')}
                              className="p-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                          <div className="flex-1 flex gap-1">
                            <input
                              type="time"
                              value={downtimeForm.to_time}
                              onChange={(e) => handleTimeFieldChange('to_time', e.target.value, 'downtime')}
                              className="flex-1 p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none"
                            />
                            <select
                              value={downtimeForm.to_period}
                              onChange={(e) => handleTimeFieldChange('to_period', e.target.value, 'downtime')}
                              className="p-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700"
                            >
                              <option value="AM">AM</option>
                              <option value="PM">PM</option>
                            </select>
                          </div>
                        </div>
                      </FieldWrapper>
                    </div>
                    <div className="col-span-12 lg:col-span-1"><button type="submit" className="w-full p-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"><AlertTriangle size={18} /><span className="text-xs   ">Log</span></button></div>
                  </form>
                </div>
                <DataTable columns={downtimeColumns} data={downtimes} renderActions={(row) => renderTableActions(row, 'downtime')} />
              </div>

              <div id="next-operation" className="bg-white rounded  border border-slate-100 p-4 scroll-mt-6">
                <SectionTitle title="Next Stage Configuration" icon={ArrowRight} subtitle="Specify destination and operational parameters for the next manufacturing phase" />
                {(() => {
                  const currentSequence = parseInt(jobCardData?.operation_sequence || 0);
                  const nextOps = operations.filter(op => {
                    const opSeq = parseInt(op.sequence || op.seq || op.operation_seq || 0);
                    if (opSeq <= currentSequence) return false;
                    const isCompleted = allJobCards.some(jc => (jc.operation_id === op.operation_id || jc.operation === op.operation_name || jc.operation === op.name) && normalizeStatus(jc.status) === 'completed');
                    return !isCompleted;
                  });

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      <div className="col-span-12 md:col-span-3"><FieldWrapper label="Next Operation" required><SearchableSelect value={nextOperationForm.next_operation_id} onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_operation_id: val })} options={nextOps.map(op => ({ value: op.operation_id || op.id || op.operation_name || op.name, label: op.operation_name || op.name }))} placeholder="Select Next Op" /></FieldWrapper></div>
                      <div className="col-span-12 md:col-span-3"><FieldWrapper label="Target Warehouse" required><SearchableSelect value={nextOperationForm.next_warehouse_id} onChange={(val) => setNextOperationForm({ ...nextOperationForm, next_warehouse_id: val })} options={warehouses.map(w => ({ value: w.warehouse_id, label: w.warehouse_name || w.name }))} placeholder="Select Destination" /></FieldWrapper></div>
                      <div className="col-span-12 md:col-span-3">
                        <FieldWrapper label="Next Op Date" required>
                          <input
                            type="date"
                            value={nextOperationForm.next_operation_date}
                            onChange={(e) => setNextOperationForm({ ...nextOperationForm, next_operation_date: e.target.value })}
                            className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                            required
                          />
                        </FieldWrapper>
                      </div>
                      <div className="col-span-12 md:col-span-3">
                        <FieldWrapper label="Execution Mode">
                          <div className="flex gap-4 mt-2">
                            <button onClick={() => setNextOperationForm({ ...nextOperationForm, inhouse: true, outsource: false })} className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${nextOperationForm.inhouse ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'}`}><span className="text-xs ">In-house</span></button>
                            <button onClick={() => setNextOperationForm({ ...nextOperationForm, outsource: true, inhouse: false })} className={`flex items-center gap-2 px-4 py-2 rounded border-2 transition-all ${nextOperationForm.outsource ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}><span className="text-xs ">Outsource</span></button>
                          </div>
                        </FieldWrapper>
                      </div>
                    </div>
                  );
                })()}

                <div className="p-2 border-t border-slate-100 flex justify-end">
                  {canTransfer && (
                    <button
                      onClick={handleSubmitProduction}
                      disabled={isSubmitting || (hasPendingApproval && totalAcceptedQty === 0)}
                      className={`flex items-center gap-3 px-8 py-3 rounded  transition-all shadow-lg active:scale-95 text-white ${isOperationFinished ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                    >
                      {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded  animate-spin" /> : (isOperationFinished ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />)}
                      {isOperationFinished ? 'Finalize & Dispatch' : `Transfer ${transferableQty.toFixed(0)} Units`}
                    </button>
                  )}
                </div>
              </div>

              <div id="production-history" className="bg-white rounded  border border-slate-100 p-4 scroll-mt-6">
                <div className="flex items-center justify-between mb-6">
                  <SectionTitle title="Detailed Production Report" icon={FileText} subtitle="Comprehensive log-level production metrics and shift quality results" />
                  <button onClick={downloadReport} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100  text-xs hover:bg-indigo-100 transition-all"><FileText size={14} />Download CSV</button>
                </div>
                <DataTable
                  columns={dailyReportColumns}
                  data={generateDailyReport()}
                  renderActions={(row) => {
                    const key = row.uniqueKey;
                    const isEditing = editingRowKey === key;
                    return (
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button onClick={handleSaveRow} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Save"><Save size={14} /></button>
                            <button onClick={handleCancelEdit} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-all" title="Cancel"><X size={14} /></button>
                          </>
                        ) : (
                          <button onClick={() => handleEditRow(row)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all" title="Edit Row"><Edit2 size={14} /></button>
                        )}
                      </div>
                    )
                  }}
                />

                {/* Production Summary Section */}
                {(() => {
                  const reportData = generateDailyReport();
                  const totalExpected = reportData.reduce((sum, row) => sum + (row.expected_mins || 0), 0);
                  const productionMinutes = reportData.reduce((sum, row) => sum + (row.total_mins || 0), 0);
                  const totalDowntime = reportData.reduce((sum, row) => sum + (row.downtime || 0), 0);
                  const totalActual = productionMinutes + totalDowntime;
                  const totalOpCost = reportData.reduce((sum, row) => sum + (row.operation_cost || 0), 0);
                  const totalVariance = totalActual - totalExpected;
                  const costVariance = totalVariance * (parseFloat(jobCardData?.hourly_rate || 0) / 60);

                  return (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-2 p-2 bg-slate-50 rounded border border-slate-100">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-400   ">Total Expected Time</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-md  text-slate-700">{formatDuration(totalExpected)}</span>
                          <span className="text-xs text-slate-400">({totalExpected.toFixed(0)} mins)</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-400   ">Total Actual Time</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-md  text-indigo-600">{formatDuration(totalActual)}</span>
                          <span className="text-xs text-slate-400">({totalActual.toFixed(0)} mins)</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-indigo-400 font-medium">Prod: {productionMinutes}m</span>
                          {totalDowntime > 0 && <span className="text-xs text-amber-400 font-medium">+ Loss: {totalDowntime}m</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-slate-400   ">Production Variance</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-lg  ${totalVariance > 5 ? 'text-rose-600' : totalVariance < -5 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(1)} mins
                          </span>
                          <span className="text-xs text-slate-400">({((totalVariance / (totalExpected || 1)) * 100).toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 border-l border-slate-200 pl-4">
                        <span className="text-xs text-amber-500   ">Total Operation Cost</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg  text-amber-600">
                            ₹{totalOpCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 border-l border-slate-200 pl-4">
                        <span className={`text-xs ${costVariance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>{costVariance > 0 ? 'Cost Increase' : 'Cost Saving'}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-lg ${costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {costVariance > 0 ? '+' : ''}₹{Math.abs(costVariance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title={`View ${modalType === 'timeLog' ? 'Time Log' : modalType === 'rejection' ? 'Quality Entry' : 'Downtime Entry'}`}
        size="md"
        footer={<button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 bg-slate-100 text-slate-600 rounded  hover:bg-slate-200 transition-all text-xs">Close</button>}
      >
        {renderViewModalContent()}
      </Modal>
      {/* Modal for Incomplete Production after Allocation Time */}
      <Modal
        isOpen={isContinueModalOpen}
        onClose={() => setIsContinueModalOpen(false)}
        title="Production Allocation Over"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-amber-50 rounded border border-amber-200">
            <div className="p-2 bg-amber-200 rounded text-amber-700 mt-1">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className=" text-amber-900">Machine allocation time has passed!</h4>
              <p className="text-sm text-amber-800 mt-1">
                The scheduled end time for this machine allocation was **{jobCardData?.scheduled_end_date ? new Date(jobCardData.scheduled_end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}**.
                However, production is still incomplete with **{remainingQtyForModal.toFixed(0)} units** remaining.
              </p>
            </div>
          </div>

          <div className="p-4 bg-indigo-50 rounded border border-indigo-200">
            <h5 className=" text-indigo-900">Do you want to continue this operation?</h5>
            <p className="text-sm text-indigo-800 mt-1">
              Estimated additional time to complete remaining units: **{additionalTimeMins} minutes**.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleContinueProduction}
              className="flex-1 p-3 bg-indigo-600 text-white rounded  hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
              disabled={formLoading}
            >
              YES, Extend Allocation
            </button>
            <button
              onClick={handleStopProduction}
              className="flex-1 p-3 bg-white border border-slate-300 text-slate-700 rounded  hover:bg-slate-50 transition-all"
              disabled={formLoading}
            >
              NO, Stop & Transfer
            </button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
