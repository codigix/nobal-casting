import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Filter, Activity, FileText } from 'lucide-react';
import * as productionService from '../../services/productionService';
import Button from '../Button/Button';
import Badge from '../Badge/Badge';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(dateStr);
};

const getLocalDateString = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SchedulingGanttView({ onJobClick, onSlotClick }) {
  const [currentDate, setCurrentDate] = useState(getLocalDateString());
  const [workstations, setWorkstations] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTimePos, setCurrentTimePos] = useState(null);

  const containerRef = React.useRef(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const today = getLocalDateString(now);
      if (today === currentDate) {
        const hours = now.getHours() + now.getMinutes() / 60;
        setCurrentTimePos((hours / 24) * 100);
      } else {
        setCurrentTimePos(null);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [currentDate]);

  useEffect(() => {
    if (containerRef.current && currentDate === getLocalDateString()) {
      const now = new Date();
      const hour = now.getHours();
      const scrollPos = (hour / 24) * containerRef.current.scrollWidth - 100;
      containerRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  }, [loading, currentDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [wsRes, jcRes] = await Promise.all([
        productionService.getWorkstationsList(),
        productionService.getJobCards({ day: currentDate.split('-')[2], month: currentDate.split('-')[1], year: currentDate.split('-')[0] })
      ]);
      setWorkstations(wsRes.data || []);
      setJobCards(jcRes.data || []);
    } catch (err) {
      console.error('Failed to fetch scheduling data:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (days) => {
    const d = new Date(currentDate + 'T00:00:00'); // Ensure it parses as local
    d.setDate(d.getDate() + days);
    setCurrentDate(getLocalDateString(d));
  };

  const getJobStyle = (job, workstation, allJobsOnWorkstation) => {
    const start = parseDate(job.scheduled_start_date);
    const end = parseDate(job.scheduled_end_date);
    
    // Check if job is on current day
    const dayStart = new Date(currentDate + 'T00:00:00');
    const dayEnd = new Date(currentDate + 'T23:59:59');
    
    if (!start || !end || start > dayEnd || end < dayStart) return { display: 'none' };
    
    const displayStart = Math.max(start.getTime(), dayStart.getTime());
    const displayEnd = Math.min(end.getTime(), dayEnd.getTime());
    
    const startHour = (displayStart - dayStart.getTime()) / (1000 * 60 * 60);
    const durationHours = (displayEnd - displayStart) / (1000 * 60 * 60);

    // Calculate vertical stacking for parallel jobs
    const capacity = workstation.parallel_capacity || 1;
    let stackIndex = 0;
    
    // Find overlaps that started before this job or have a lower ID
    const overlaps = allJobsOnWorkstation
      .filter(other => {
        if (other.job_card_id === job.job_card_id) return false;
        const otherStart = parseDate(other.scheduled_start_date);
        const otherEnd = parseDate(other.scheduled_end_date);
        if (!otherStart || !otherEnd) return false;
        return otherStart < end && otherEnd > start;
      })
      .sort((a, b) => {
        const aStart = parseDate(a.scheduled_start_date).getTime();
        const bStart = parseDate(b.scheduled_start_date).getTime();
        if (aStart !== bStart) return aStart - bStart;
        return a.job_card_id.localeCompare(b.job_card_id);
      });

    // Simple greedy stacking
    const occupiedIndices = new Set();
    overlaps.forEach(other => {
      // This is a simplified stacking logic
      // In a real Gantt we'd need to assign fixed indices to all jobs
    });
    
    // For now, let's just use a simple offset if there are overlaps
    const totalOverlaps = overlaps.length;
    const height = Math.max(20, 80 / capacity);
    
    // Determine this job's position among overlaps
    const myIndex = overlaps.filter(other => {
      const otherStart = parseDate(other.scheduled_start_date).getTime();
      const myStart = start.getTime();
      if (otherStart < myStart) return true;
      if (otherStart === myStart) return other.job_card_id < job.job_card_id;
      return false;
    }).length;

    return {
      left: `${(startHour / 24) * 100}%`,
      width: `${(durationHours / 24) * 100}%`,
      position: 'absolute',
      height: `${height}%`,
      top: `${10 + (myIndex * height)}%`,
      minWidth: '2px',
      zIndex: 10 + myIndex
    };
  };

  const statusColors = {
    draft: 'bg-slate-400',
    ready: 'bg-blue-500',
    'in-progress': 'bg-amber-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-rose-500'
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Machine Timelines</h3>
            <p className="text-xs text-slate-500">Resource allocation & scheduling</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setCurrentDate(new Date().toISOString().split('T')[0])} 
            className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border-r border-slate-100"
          >
            Today
          </button>
          <button onClick={() => navigateDate(-1)} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 font-medium text-sm text-slate-700 min-w-[140px] text-center">
            {new Date(currentDate).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <button onClick={() => navigateDate(1)} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-600 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex gap-4">
          {['Ready', 'In-Progress', 'Completed'].map(status => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${statusColors[status.toLowerCase().replace('-', '_')]}`} />
              <span className="text-xs font-medium text-slate-600">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Grid */}
      <div className="overflow-x-auto overflow-y-hidden" ref={containerRef}>
        <div className="min-w-[1200px] relative">
          {/* Time Header */}
          <div className="flex border-b border-slate-100 bg-slate-50/30 sticky top-0 z-20">
            <div className="w-56 p-3 border-r border-slate-200 sticky left-0 bg-slate-50/50 z-30 font-bold text-[11px] text-slate-500 uppercase tracking-widest shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
              Workstation / Machine
            </div>
            <div className="flex-1 flex bg-slate-50/30">
              {HOURS.map(hour => (
                <div key={hour} className="flex-1 p-2 text-[10px] text-slate-400 text-center border-r border-slate-100 last:border-r-0 font-medium">
                  {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </div>
              ))}
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto relative">
            {/* Current Time Marker */}
            {currentTimePos && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none" 
                style={{ left: `calc(14rem + (100% - 14rem) * ${currentTimePos / 100})` }}
              >
                <div className="absolute top-0 -translate-x-1/2 bg-red-400 text-white text-[8px] px-1 rounded-b font-bold uppercase tracking-tighter">Now</div>
              </div>
            )}

            {workstations.map(ws => {
              const wsJobs = jobCards.filter(jc => jc.machine_id === ws.name || jc.machine_id === ws.workstation_id);
              return (
                <div key={ws.name} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                  <div className="w-56 p-3 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-20 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                    <div className="font-bold text-xs text-slate-800 truncate mb-1">{ws.workstation_name || ws.name}</div>
                    <div className="flex items-center gap-1.5">
                       <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-tighter border border-slate-200">
                         CAP: {ws.parallel_capacity || 1}
                       </span>
                       {wsJobs.length > 0 && (
                         <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded border border-indigo-100">
                           {wsJobs.length} JOBS
                         </span>
                       )}
                    </div>
                  </div>
                  <div className="flex-1 flex relative h-16 group/row">
                    {/* Hour Grids */}
                    {HOURS.map(hour => (
                      <div 
                        key={hour} 
                        className="flex-1 border-r border-slate-100/50 last:border-r-0 cursor-crosshair hover:bg-slate-100/30 transition-colors relative"
                        onClick={() => {
                          const start = new Date(`${currentDate}T${hour.toString().padStart(2, '0')}:00:00`);
                          onSlotClick?.(ws.workstation_id || ws.name, start);
                        }}
                      >
                        {/* Half-hour marker */}
                        <div className="absolute inset-y-0 left-1/2 w-px border-l border-slate-100 border-dashed pointer-events-none" />
                      </div>
                    ))}
                    
                    {/* Job Bars */}
                    {wsJobs.map(jc => (
                      <div
                        key={jc.job_card_id}
                        onClick={() => onJobClick?.(jc.job_card_id)}
                        className={`${statusColors[(jc.status || 'draft').toLowerCase()] || 'bg-slate-400'} rounded-[4px] opacity-90 hover:opacity-100 cursor-pointer transition-all border border-white/30 shadow-[0_2px_4px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden px-2 group/job hover:ring-2 hover:ring-white/50 active:scale-[0.98]`}
                        style={getJobStyle(jc, ws, wsJobs)}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <Clock size={10} className="text-white/70 flex-shrink-0" />
                          <span className="text-[10px] text-white font-bold truncate tracking-tight">
                            {jc.operation}
                          </span>
                        </div>

                        {/* Professional Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-slate-900/95 backdrop-blur-sm text-white text-[11px] p-3 rounded-lg hidden group-hover/job:block z-50 shadow-2xl border border-white/10 ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                             <span className="font-bold text-indigo-400 uppercase tracking-widest text-[9px]">{jc.job_card_id}</span>
                             <Badge status={jc.status} size="xs" />
                          </div>
                          
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-white/90">
                              <Activity size={12} className="text-white/40" />
                              <span className="font-semibold">{jc.operation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/70">
                              <Clock size={12} className="text-white/40" />
                              <span>{parseDate(jc.scheduled_start_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: true})} - {parseDate(jc.scheduled_end_date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: true})}</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/70">
                              <FileText size={12} className="text-white/40" />
                              <span className="truncate">WO: {jc.work_order_id}</span>
                            </div>
                            {jc.project_name && (
                              <div className="pt-1 text-[9px] text-indigo-300 font-bold uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded w-fit">
                                Project: {jc.project_name}
                              </div>
                            )}
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900/95" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Empty State */}
      {workstations.length === 0 && !loading && (
        <div className="p-12 text-center">
          <Activity size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">No workstations found</p>
        </div>
      )}
    </div>
  );
}
