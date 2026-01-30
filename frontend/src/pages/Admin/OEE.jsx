import React, { useState, useMemo, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Line, AreaChart, Area,
  ComposedChart
} from 'recharts'
import {
  AlertTriangle, X, TrendingUp, Clipboard,
  Rocket, Filter, Download, Calendar, Clock, Settings, Layers,
  Activity, ArrowDownCircle, ArrowUpCircle, CheckCircle2,
  Zap, Gauge, Box, Cpu, RefreshCcw, ChevronRight,
  Monitor, Thermometer, ZapOff, AlertCircle, Loader2
} from 'lucide-react'
import Badge from '../../components/Badge/Badge'
import { getOEEDashboardData, getMachineHistoricalMetrics } from '../../services/productionService'

// --- Advanced Mock Data Removed for Real-time Integration ---


// --- Sub-components ---

const OEEGauge = ({ value, label }) => {
  const color = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';
  const data = [
    { name: 'OEE', value: value },
    { name: 'Remaining', value: 100 - value }
  ];

  return (
    <div className="relative flex flex-col items-center justify-center">
      <ResponsiveContainer width={240} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="100%"
            startAngle={180} endAngle={0}
            innerRadius={80} outerRadius={110}
            paddingAngle={0} dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[65%] flex flex-col items-center">
        <span className="text-5xl  text-slate-900 leading-none">{value.toFixed(1)}%</span>
        <span className="text-xs   text-slate-400 tracking-[0.2em] mt-3">{label}</span>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, subValue, icon: Icon, color, trend, unit = "%" }) => (
  <div className="bg-white rounded p-3 border border-slate-200  hover:shadow-md transition-all group relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-[0.03] rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-150`}></div>
    <div className="flex flex-col items-center text-center relative z-10">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon size={16} className="text-slate-400" />}
        <span className="text-xs font-medium text-slate-500 ">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <h3 className={`text-xl  m-0 ${color.replace('bg-', 'text-')}`}>{value}</h3>
        {unit && <span className={`text-xl font-semibold ${color.replace('bg-', 'text-')}`}>{unit}</span>}
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        {trend === 'up' ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingUp size={14} className="text-rose-500 rotate-180" />}
        <span className={`text-xs font-semibold ${trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>{subValue}</span>
      </div>
    </div>
  </div>
);

const MachineCard = ({ machine, onClick }) => {
  const statusColors = {
    'Running': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    'Minor Stop': { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    'Down': { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
    'Maintenance': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    'Offline': { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' }
  };
  const config = statusColors[machine.status] || statusColors.Running;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded p-3 border border-slate-200  hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6  rounded bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            <Cpu size={24} />
          </div>
          <div>
            <h4 className="text-base  text-slate-800 m-0 group-hover:text-indigo-600 transition-colors">{machine.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-slate-400 ">{machine.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-xs font-semibold text-indigo-500 ">{machine.line}</span>
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-2 p-2  py-1.5 rounded ${config.bg}`}>
          <span className={`w-2 h-2 rounded-full ${config.dot} ${machine.status === 'Running' ? 'animate-pulse' : ''}`}></span>
          <span className={`text-xs    ${config.text}`}>{machine.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'AVAIL', val: machine.a, color: 'text-indigo-600' },
          { label: 'PERF', val: machine.p, color: 'text-blue-600' },
          { label: 'QUAL', val: machine.q, color: 'text-emerald-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50/50 rounded p-3 border border-slate-100 flex flex-col items-center">
            <span className="text-[9px] text-slate-400   mb-1">{stat.label}</span>
            <span className={`text-xs  ${stat.color}`}>{stat.val}%</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-xs  text-slate-400   uppercase">Engagement</span>
          <span className="text-xs   text-slate-700">{machine.entries > 0 ? 'ACTIVE PRODUCTION' : 'IDLE / NO ENTRIES'}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ${machine.entries > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`} 
            style={{ width: machine.entries > 0 ? '100%' : '0%' }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex flex-col">
          <span className="text-xs  text-slate-400   leading-none mb-1">Overall OEE</span>
          <span className={`text-xl   ${machine.oee >= 85 ? 'text-emerald-600' : machine.oee >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>{machine.oee}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-indigo-600 transition-colors">
          <span className="text-xs    uppercase">Details</span>
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
};

export default function OEE() {
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [modalTab, setModalTab] = useState('Overview');
  const [machineHistory, setMachineHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Executive Overview');
  const [filters, setFilters] = useState({
    range: 'Today',
    line: 'All Lines',
    shift: 'All Shifts',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(new Date());
  const [realData, setRealData] = useState({
    summary: null,
    trends: [],
    downtimeReasons: [],
    machineOEE: []
  });
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    updateDateRange();
  }, [filters.range]);

  useEffect(() => {
    fetchData();
  }, [filters.startDate, filters.endDate, filters.line, filters.shift]);
  
  useEffect(() => {
    if (selectedMachine) {
      fetchMachineHistory(selectedMachine.id);
    } else {
      setModalTab('Overview');
      setMachineHistory([]);
    }
  }, [selectedMachine]);

  const fetchMachineHistory = async (machineId) => {
    try {
      setHistoryLoading(true);
      const response = await getMachineHistoricalMetrics(machineId);
      if (response.success) {
        setMachineHistory(response.data.daily || []);
      }
    } catch (err) {
      console.error('Error fetching machine history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateDateRange = () => {
    const end = new Date();
    let start = new Date();

    if (filters.range === 'Yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (filters.range === 'Weekly') {
      start.setDate(start.getDate() - 7);
    } else if (filters.range === 'Monthly') {
      start.setMonth(start.getMonth() - 1);
    }

    setFilters(prev => ({
      ...prev,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    }));
  };

  const fetchData = async (isSync = false) => {
    try {
      if (isSync) {
        setSyncLoading(true);
      } else {
        setLoading(true);
      }
      const apiFilters = {};
      if (filters.startDate) apiFilters.startDate = filters.startDate;
      if (filters.endDate) apiFilters.endDate = filters.endDate;
      if (filters.line !== 'All Lines') apiFilters.lineId = filters.line;
      if (filters.shift !== 'All Shifts') apiFilters.shift = filters.shift;

      const response = await getOEEDashboardData(apiFilters);
      if (response.success) {
        setRealData(response.data);
        setLastSync(new Date());
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching OEE data:', err);
      setError('Failed to fetch real-time data. Using offline data.');
    } finally {
      setLoading(false);
      setSyncLoading(false);
    }
  };

  const handleExportData = () => {
    try {
      // Prepare data for export
      const exportData = [];

      // Add summary data
      if (realData.summary) {
        exportData.push({
          'Type': 'Summary',
          'Date': new Date().toISOString().split('T')[0],
          'OEE': realData.summary.oee,
          'Availability': realData.summary.availability,
          'Performance': realData.summary.performance,
          'Quality': realData.summary.quality,
          'Total Units': realData.summary.total_units,
          'Operating Time (mins)': realData.summary.operating_time_mins
        });
      }

      // Add machine data
      filteredMachines.forEach(machine => {
        exportData.push({
          'Type': 'Machine',
          'Machine ID': machine.id,
          'Machine Name': machine.name,
          'Line': machine.line,
          'Status': machine.status,
          'OEE': machine.oee,
          'Availability': machine.a,
          'Performance': machine.p,
          'Quality': machine.q,
          'Total Units': machine.total_units,
          'Rejected Units': machine.rejected_units,
          'Downtime (mins)': machine.downtime_mins,
          'Entries': machine.entries
        });
      });

      // Add trends data
      if (realData.trends && realData.trends.length > 0) {
        realData.trends.forEach(trend => {
          exportData.push({
            'Type': 'Trend',
            'Date': trend.date,
            'OEE': trend.oee,
            'Availability': trend.availability,
            'Performance': trend.performance,
            'Quality': trend.quality
          });
        });
      }

      // Convert to CSV
      if (exportData.length === 0) {
        alert('No data available to export');
        return;
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `OEE_Data_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleSyncDashboard = () => {
    fetchData(true);
  };

  const filteredMachines = useMemo(() => {
    if (realData.machineOEE && realData.machineOEE.length > 0) {
      // Group by machine_id to have one card per asset
      const grouped = realData.machineOEE.reduce((acc, m) => {
        if (!acc[m.machine_id]) {
          acc[m.machine_id] = {
            id: m.machine_id,
            name: m.machine_name,
            line: m.line_id,
            status: m.machine_status || 'Offline',
            availability: [],
            performance: [],
            quality: [],
            oee: [],
            total_units: 0,
            rejected_units: 0,
            downtime_mins: 0,
            entries: 0,
            ideal_cycle_time: m.ideal_cycle_time_mins || 1
          };
        }
        
        // Only include metrics if there's production data
        if (m.entry_date) {
          acc[m.machine_id].availability.push(m.availability);
          acc[m.machine_id].performance.push(m.performance);
          acc[m.machine_id].quality.push(m.quality);
          acc[m.machine_id].oee.push(m.oee);
          acc[m.machine_id].total_units += m.total_units;
          acc[m.machine_id].rejected_units += m.rejected_units;
          acc[m.machine_id].downtime_mins += (m.downtime_mins || 0);
          acc[m.machine_id].entries += 1;
          acc[m.machine_id].ideal_cycle_time = m.ideal_cycle_time_mins || 1;
        }
        
        return acc;
      }, {});

      return Object.values(grouped)
        .filter(m => filters.line === 'All Lines' || m.line === filters.line)
        .map(m => {
          const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
          
          const machineDowntime = (realData.downtimeReasons || [])
            .filter(dr => dr.machine_id === m.id)
            .map(dr => ({ reason: dr.reason, minutes: dr.duration }));

          return {
            ...m,
            a: Number(avg(m.availability).toFixed(1)),
            p: Number(avg(m.performance).toFixed(1)),
            q: Number(avg(m.quality).toFixed(1)),
            oee: Number(avg(m.oee).toFixed(1)),
            load: m.entries > 0 ? 85 : 0,
            temp: m.entries > 0 ? 42 : 22,
            health: m.status === 'Running' ? 98 : m.status === 'Down' ? 45 : 85,
            throughput: m.total_units,
            rejects: m.rejected_units,
            planned: m.entries > 0 ? Math.round((m.entries * 480) / m.ideal_cycle_time) : 0,
            actual: m.total_units,
            downtime: machineDowntime.length > 0 ? machineDowntime : [{ reason: 'No Specific Downtime Recorded', minutes: m.downtime_mins || 0 }],
            rejectDistribution: [
              { label: 'Rejects', val: 100, color: 'bg-rose-500' }
            ]
          };
        });
    }

    return []; // Return empty instead of mock data to ensure real-time focus
  }, [filters.line, realData.machineOEE]);

  const plantOEE = useMemo(() => {
    if (realData.summary) return realData.summary.oee;
    return filteredMachines.length > 0 
      ? filteredMachines.reduce((acc, m) => acc + m.oee, 0) / filteredMachines.length 
      : 0;
  }, [filteredMachines, realData.summary]);

  const plantMetrics = useMemo(() => {
    const activeMachines = filteredMachines.filter(m => m.entries > 0).length;
    const totalMachines = filteredMachines.length || 1;
    const engagement = ((activeMachines / totalMachines) * 100).toFixed(1);

    const metrics = {
      production: "0",
      throughput: "0/hr",
      quality: "0.0",
      availability: "0.0",
      performance: "0.0",
      engagement: engagement,
      trends: {
        availability: { val: "+0.0%", trend: 'up' },
        performance: { val: "+0.0%", trend: 'up' },
        quality: { val: "+0.0%", trend: 'up' },
        oee: { val: "+0.0%", trend: 'up' }
      }
    };

    if (realData.summary) {
      const operatingHours = realData.summary.operating_time_mins / 60 || 1;
      metrics.production = realData.summary.total_units.toLocaleString();
      metrics.throughput = `${Math.round(realData.summary.total_units / operatingHours)}/hr`;
      metrics.quality = realData.summary.quality.toFixed(1);
      metrics.availability = realData.summary.availability.toFixed(1);
      metrics.performance = realData.summary.performance.toFixed(1);
    } else if (filteredMachines.length > 0) {
      const totalProduction = filteredMachines.reduce((acc, m) => acc + m.actual, 0);
      const avgThroughput = filteredMachines.reduce((acc, m) => acc + (m.actual / (m.planned/60) || 0), 0) / filteredMachines.length;
      const avgQuality = filteredMachines.reduce((acc, m) => acc + m.q, 0) / filteredMachines.length;
      const avgAvailability = filteredMachines.reduce((acc, m) => acc + m.a, 0) / filteredMachines.length;
      const avgPerformance = filteredMachines.reduce((acc, m) => acc + m.p, 0) / filteredMachines.length;
      
      metrics.production = totalProduction.toLocaleString();
      metrics.throughput = `${Math.round(avgThroughput)}/hr`;
      metrics.quality = avgQuality.toFixed(1);
      metrics.availability = avgAvailability.toFixed(1);
      metrics.performance = avgPerformance.toFixed(1);
    }

    // Dynamic Trend Calculation
    if (realData.trends && realData.trends.length >= 2) {
      const latest = realData.trends[realData.trends.length - 1];
      const previous = realData.trends[realData.trends.length - 2];
      
      const calcTrend = (l, p) => {
        const diff = l - p;
        return {
          val: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`,
          trend: diff >= 0 ? 'up' : 'down'
        };
      };

      metrics.trends.availability = calcTrend(latest.availability, previous.availability);
      metrics.trends.performance = calcTrend(latest.performance, previous.performance);
      metrics.trends.quality = calcTrend(latest.quality, previous.quality);
      metrics.trends.oee = calcTrend(latest.oee, previous.oee);
    }

    return metrics;
  }, [filteredMachines, realData.summary, realData.trends]);

  const downtimePareto = useMemo(() => {
    if (realData.downtimeReasons && realData.downtimeReasons.length > 0) {
      // Group by reason since backend now returns per machine/line
      const groupedByReason = realData.downtimeReasons.reduce((acc, curr) => {
        acc[curr.reason] = (acc[curr.reason] || 0) + curr.duration;
        return acc;
      }, {});

      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#6366f1', '#10b981', '#64748b'];
      return Object.entries(groupedByReason)
        .sort((a, b) => b[1] - a[1])
        .map(([reason, minutes], i) => ({
          reason,
          minutes,
          color: colors[i % colors.length]
        }));
    }

    const allDowntime = filteredMachines.flatMap(m => m.downtime).filter(d => d.reason !== 'None');
    const grouped = allDowntime.reduce((acc, d) => {
      acc[d.reason] = (acc[d.reason] || 0) + d.minutes;
      return acc;
    }, {});
    
    const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#6366f1', '#10b981', '#64748b'];
    
    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, minutes], i) => ({
        reason,
        minutes,
        color: colors[i % colors.length]
      }));
  }, [filteredMachines, realData.downtimeReasons]);

  const trendsData = useMemo(() => {
    if (realData.trends && realData.trends.length > 0) {
      return realData.trends.map(t => ({
        time: t.date,
        oee: t.oee,
        a: t.availability,
        p: t.performance,
        q: t.quality
      }));
    }
    return [];
  }, [realData.trends]);

const lineMetrics = useMemo(() => {
  const dataSource = filteredMachines;
  if (dataSource.length === 0) return [];
  
  const lines = [...new Set(dataSource.map(m => m.line))].sort();
    
    const metrics = lines.map(line => {
      const machinesInLine = dataSource.filter(m => m.line === line);
      const avgOee = machinesInLine.reduce((acc, m) => acc + m.oee, 0) / machinesInLine.length;
      const avgA = machinesInLine.reduce((acc, m) => acc + m.a, 0) / machinesInLine.length;
      const avgP = machinesInLine.reduce((acc, m) => acc + m.p, 0) / machinesInLine.length;
      const avgQ = machinesInLine.reduce((acc, m) => acc + m.q, 0) / machinesInLine.length;
      
      const status = avgOee >= 80 ? 'On Track' : avgOee >= 60 ? 'Warning' : 'Critical';
      const statusColor = avgOee >= 80 ? 'bg-emerald-100 text-emerald-700' : avgOee >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
      
      return {
        name: line,
        oee: avgOee,
        a: avgA,
        p: avgP,
        q: avgQ,
        status,
        statusColor
      };
    });
    return metrics.filter(m => filters.line === 'All Lines' || m.name === filters.line);
  }, [filters.line, filteredMachines]);

  const topLosses = useMemo(() => {
    const allDowntime = filteredMachines.flatMap(m => 
      m.downtime.map(d => ({ ...d, line: m.line, machine: m.name }))
    ).filter(d => d.reason !== 'None');
    
    const grouped = allDowntime.reduce((acc, d) => {
      const key = `${d.reason}-${d.line}`;
      if (!acc[key]) {
        acc[key] = { name: d.reason, line: d.line, loss: 0 };
      }
      acc[key].loss += d.minutes;
      return acc;
    }, {});
    
    return Object.values(grouped)
      .sort((a, b) => b.loss - a.loss)
      .slice(0, 3)
      .map(d => ({
        ...d,
        loss: `${d.loss}m`,
        impact: d.loss > 60 ? 'High' : 'Medium',
        color: d.loss > 60 ? 'bg-rose-500' : 'bg-amber-500'
      }));
  }, [filteredMachines]);

  const aiInsights = useMemo(() => {
    const insights = [];
    
    const criticalMachine = [...filteredMachines].sort((a, b) => a.oee - b.oee)[0];
    if (criticalMachine && criticalMachine.oee < 75 && criticalMachine.entries > 0) {
      insights.push({
        type: 'Critical',
        message: `${criticalMachine.id} performance is trending ${Math.round(85 - criticalMachine.oee)}% below target. ${criticalMachine.status === 'Down' ? 'Critical failure detected.' : 'Check for material feed issues.'}`,
        color: 'text-amber-500',
        icon: AlertTriangle
      });
    }

    const highRejectMachine = [...filteredMachines].sort((a, b) => (b.rejects / (b.actual || 1)) - (a.rejects / (a.actual || 1)))[0];
    if (highRejectMachine && highRejectMachine.rejects > 0 && (highRejectMachine.rejects / (highRejectMachine.actual || 1)) > 0.05) {
       insights.push({
         type: 'Quality',
         message: `Machine ${highRejectMachine.id} showing ${(highRejectMachine.rejects / highRejectMachine.actual * 100).toFixed(1)}% reject rate. Tooling calibration recommended.`,
         color: 'text-rose-500',
         icon: AlertCircle
       });
    }

    const topMachine = [...filteredMachines].sort((a, b) => b.oee - a.oee)[0];
    if (topMachine && topMachine.oee > 85 && !insights.find(i => i.type === 'Critical' && i.message.includes(topMachine.id))) {
      insights.push({
        type: 'Strategy',
        message: `Machine ${topMachine.id} reached peak OEE of ${topMachine.oee}%. Current cycle parameters are optimal for ${topMachine.line}.`,
        color: 'text-emerald-500',
        icon: CheckCircle2
      });
    }

    if (downtimePareto.length > 0 && downtimePareto[0].minutes > 60) {
       insights.push({
         type: 'Maintenance',
         message: `Top loss reason "${downtimePareto[0].reason}" has caused ${downtimePareto[0].minutes}m downtime. Schedule preventive check.`,
         color: 'text-indigo-400',
         icon: Clock
       });
    }

    if (insights.length < 2) {
      insights.push({
        type: 'System',
        message: 'Neural engine analyzing shift patterns. No immediate corrective actions required.',
        color: 'text-indigo-400',
        icon: Activity
      });
    }

    return insights.slice(0, 2);
  }, [filteredMachines, downtimePareto]);

  const renderExecutiveOverview = () => (
    <>
      {/* Hero Section: Large Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        <StatCard label="Availability" value={plantMetrics.availability} subValue={plantMetrics.trends.availability.val} color="bg-indigo-600" trend={plantMetrics.trends.availability.trend} icon={Clock} />
        <StatCard label="Performance" value={plantMetrics.performance} subValue={plantMetrics.trends.performance.val} color="bg-blue-600" trend={plantMetrics.trends.performance.trend} icon={Activity} />
        <StatCard label="Quality" value={plantMetrics.quality} subValue={plantMetrics.trends.quality.val} color="bg-emerald-600" trend={plantMetrics.trends.quality.trend} icon={CheckCircle2} />
        <StatCard label="Engagement" value={plantMetrics.engagement} subValue="Active Assets" color="bg-purple-600" trend="up" icon={Zap} />
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded p-3 border border-amber-200 shadow-md relative overflow-hidden group col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex flex-col items-center text-center relative z-10">
            <span className="text-xs font-medium text-white  mb-4">Overall OEE</span>
            <div className="flex items-baseline gap-1">
              <h3 className="text-xl  text-white m-0">{Math.round(plantOEE)}</h3>
              <span className="text-xl font-semibold text-white">%</span>
            </div>
            <div className="w-full h-2.5 bg-white/20 rounded-full mt-6 overflow-hidden">
              <div className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]" style={{ width: `${plantOEE}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insight Bar */}
      <div className="bg-slate-900 rounded p-1 mb-3 overflow-hidden shadow-2xl shadow-slate-900/20">
        <div className="bg-slate-800 rounded p-3 flex flex-col md:flex-row items-center justify-between gap-3 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white  shadow-indigo-500/40 relative">
              <Rocket size={32} />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-800"></div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-base  text-white m-0  uppercase">AI Optimization Engine</h4>
                <span className="p-2  py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs    border border-indigo-500/30 uppercase">Active</span>
              </div>
              <div className="flex flex-col md:flex-row gap-4 mt-4">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded bg-slate-900/50 border border-slate-700/50 max-w-md">
                    <insight.icon size={18} className={`${insight.color} mt-0.5 shrink-0`} />
                    <p className="text-xs font-medium text-slate-300 m-0 leading-relaxed">
                      <span className={`${insight.color} `}>{insight.type}:</span> {insight.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button className="whitespace-nowrap px-8 py-4 bg-white text-slate-900 text-xs  rounded hover:bg-indigo-50 transition-all tracking-[0.2em]  uppercase">
            Optimize All Lines
          </button>
        </div>
      </div>

      {/* Performance Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-12">
        {/* Main Performance Trend */}
        <div className="lg:col-span-7 bg-white rounded p-3 border border-slate-200  relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg  text-slate-900 m-0 tracking-tight uppercase">OEE Trend Analysis</h3>
              <span className="text-xs   text-slate-400  mt-1 block">Real-time Performance Indexing</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trendsData}>
              <defs>
                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                domain={[0, 100]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="oee" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOee)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Production Summary (Planned vs Actual) */}
        <div className="lg:col-span-5 bg-white rounded-md p-3 border border-slate-200 ">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base  text-slate-900 m-0 tracking-tight uppercase">Production Summary</h3>
              <span className="text-xs   text-slate-400  mt-1 block">Output against target</span>
            </div>
          </div>

          <div className="space-y-8 h-[320px] flex flex-col justify-center">
            {[
              { label: 'Planned Production', val: filteredMachines.reduce((acc, m) => acc + m.planned, 0), color: 'bg-slate-200', text: 'text-slate-500' },
              { label: 'Actual Production', val: filteredMachines.reduce((acc, m) => acc + m.actual, 0), color: 'bg-emerald-500', text: 'text-emerald-600' }
            ].map((item, i) => {
              const totalPlanned = filteredMachines.reduce((acc, m) => acc + m.planned, 0);
              const max = totalPlanned > 0 ? totalPlanned * 1.1 : 100;
              const width = max > 0 ? (item.val / max) * 100 : 0;
              return (
                <div key={i}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs  text-slate-500 uppercase">{item.label}</span>
                    <span className={`text-lg  ${item.text}`}>{item.val.toLocaleString()}</span>
                  </div>
                  <div className="h-10 w-full bg-slate-50 rounded-md overflow-hidden border border-slate-100 p-1">
                    <div 
                      className={`h-full rounded-sm ${item.color} transition-all duration-1000 `} 
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs   text-slate-400 ">Target Achievement</span>
            <span className="text-xl  text-indigo-600">
              {filteredMachines.reduce((acc, m) => acc + m.planned, 0) > 0 
                ? ((filteredMachines.reduce((acc, m) => acc + m.actual, 0) / filteredMachines.reduce((acc, m) => acc + m.planned, 0)) * 100).toFixed(1)
                : "0.0"}%
            </span>
          </div>
        </div>
      </div>
    </>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Executive Overview':
        return renderExecutiveOverview();
      case 'Line Analytics':
        return (
          <div className="bg-white rounded p-3 border border-slate-200  min-h-[400px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center text-indigo-600">
                <Layers size={28} />
              </div>
              <div>
                <h3 className="text-xl  text-slate-800 tracking-tight m-0 uppercase">Line Performance Analytics</h3>
                <p className="text-slate-500 text-xs font-semibold m-0 mt-1 ">Granular breakdown of production line efficiency and cycle times</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {lineMetrics.map(line => (
                <div key={line.name} className="p-3 bg-slate-50/50 rounded border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs  text-slate-800  uppercase">{line.name}</h4>
                    <span className={`p-2  py-1.5 rounded text-xs    ${line.statusColor}`}>{line.status}</span>
                  </div>
                  
                  <div className="space-y-8">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs   text-slate-400  uppercase">Efficiency Index</span>
                        <span className={`text-xs  ${line.oee >= 80 ? 'text-emerald-600' : line.oee >= 60 ? 'text-amber-600' : 'text-rose-600'}`}>{line.oee.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${line.oee >= 80 ? 'bg-emerald-500' : line.oee >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                          style={{ width: `${line.oee}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col">
                        <span className="text-[9px]  text-slate-400  uppercase">Availability</span>
                        <span className="text-xs  text-slate-700">{line.a.toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px]  text-slate-400  uppercase">Performance</span>
                        <span className="text-xs  text-slate-700">{line.p.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <button className="w-full mt-8 py-4 bg-white border border-slate-200 text-slate-500 text-xs   rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all  uppercase">
                    Line Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Machine Health':
        return (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white  shadow-indigo-600/20">
                  <Monitor size={28} />
                </div>
                <div>
                  <h2 className="text-xl   text-slate-800 m-0 tracking-tight uppercase">Asset Monitoring</h2>
                  <p className="text-xs  text-slate-400  mt-1 uppercase">Real-time telemetry and health status</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 rounded ">
                {[
                  { label: 'Running', count: filteredMachines.filter(m => m.status === 'Running').length, color: 'bg-emerald-500' },
                  { label: 'Stop', count: filteredMachines.filter(m => m.status === 'Minor Stop').length, color: 'bg-amber-500' },
                  { label: 'Down', count: filteredMachines.filter(m => m.status === 'Down').length, color: 'bg-rose-500' },
                  { label: 'Offline', count: filteredMachines.filter(m => m.status === 'Offline' || !m.status).length, color: 'bg-slate-400' }
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.color}`}></span>
                    <span className="text-xs   text-slate-600  uppercase">{s.count} {s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredMachines.map(m => (
                <MachineCard key={m.id} machine={m} onClick={() => setSelectedMachine(m)} />
              ))}
            </div>
          </div>
        );
      case 'Loss Analysis':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-white rounded p-3 border border-slate-200 ">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-6 h-6  bg-indigo-50 rounded flex items-center justify-center text-indigo-600">
                  <PieChart size={24} />
                </div>
                <h3 className="text-base  text-slate-800 tracking-tight m-0 uppercase">Loss Category Distribution</h3>
              </div>
              
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={downtimePareto}
                    cx="50%" cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="minutes"
                    stroke="none"
                  >
                    {downtimePareto.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded p-3 border border-slate-200 ">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-6 h-6  bg-rose-50 rounded flex items-center justify-center text-rose-600">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-base  text-slate-800 tracking-tight m-0 uppercase">Top Bottleneck Insights</h3>
              </div>
              
              <div className="space-y-4">
                {topLosses.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-12 rounded-full ${item.color}`}></div>
                      <div>
                        <h4 className="text-xs  m-0  text-slate-800 uppercase">{item.name}</h4>
                        <span className="text-xs  font-semibold text-slate-400  uppercase">{item.line}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs  text-slate-800">{item.loss}</div>
                      <span className={`text-[9px]  px-2 py-1 rounded-md tracking-tighter ${item.impact === 'High' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                        {item.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-8 py-4 bg-slate-800 text-white text-xs   rounded hover:bg-slate-700 transition-all  shadow-lg shadow-slate-800/20 uppercase">
                Full Loss Report
              </button>
            </div>
          </div>
        );
      default:
        return renderExecutiveOverview();
    }
  };

  return (
    <div className="p-3 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-100 rounded">
              <Gauge size={20} className="text-indigo-600" />
            </div>
            <h1 className="text-xl  text-slate-800 m-0 tracking-tight uppercase">OEE Intelligence</h1>
          </div>
          <p className="text-slate-500 text-xs font-semibold ">Real-time manufacturing performance & optimization engine</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleExportData}
            className="flex items-center gap-2 p-2  py-2 bg-white border border-slate-200 text-slate-600 text-xs  rounded hover:bg-slate-50 transition-all  "
          >
            <Download size={18} />
            Export Data
          </button>
          <button
            onClick={handleSyncDashboard}
            disabled={syncLoading}
            className={`flex items-center gap-2 px-8 py-4 text-xs  rounded  transition-all tracking-[0.2em] ${
              syncLoading
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
            } text-white`}
          >
            <RefreshCcw size={18} className={syncLoading ? 'animate-spin' : ''} />
            {syncLoading ? 'Syncing...' : 'Sync Dashboard'}
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/50 rounded border border-slate-200 mb-3 w-fit">
        {['Executive Overview', 'Line Analytics', 'Machine Health', 'Loss Analysis'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`p-6  py-2 text-xs  rounded transition-all  ${
              activeTab === tab 
                ? 'bg-white text-indigo-600 shadow-md' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="text-red-700 text-xs font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Global Filter Bar */}
      <div className="bg-white rounded border border-slate-200  p-3 mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500">
              <Filter size={18} />
            </div>
            <span className="text-xs  text-slate-400  uppercase">Global Filters</span>
          </div>
          
          <div className="h-12 w-[1px] bg-slate-100 hidden md:block"></div>

          {[
            { label: 'Time Period', icon: Calendar, value: filters.range, options: ['Today', 'Yesterday', 'Weekly', 'Monthly'] },
            { 
              label: 'Production Line', 
              icon: Layers, 
              value: filters.line, 
              options: ['All Lines', ...new Set(filteredMachines.map(m => m.line).filter(Boolean))] 
            },
            { label: 'Shift', icon: Clock, value: filters.shift, options: ['All Shifts', 'Day Shift', 'Night Shift'] }
          ].map((f, i) => (
            <div key={i} className="flex flex-col min-w-[160px]">
              <span className="text-xs   text-slate-400  mb-2 flex items-center gap-2 uppercase">
                <f.icon size={14} />
                {f.label}
              </span>
              <select 
                className="bg-slate-50 text-xs  text-slate-800 border border-slate-200 rounded p-2.5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none cursor-pointer appearance-none"
                value={f.value}
                onChange={(e) => setFilters({...filters, [f.label === 'Time Period' ? 'range' : f.label === 'Production Line' ? 'line' : 'shift']: e.target.value})}
              >
                {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 bg-indigo-50 p-6  py-2 rounded border border-indigo-100">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs   text-indigo-600  uppercase">
            Last Sync: {lastSync.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <main>
        {renderTabContent()}
      </main>

      {/* Modern High-End Detail Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 lg:p-3">
          <div className="bg-white rounded-md shadow-2xl max-w-[1300px] w-full  overflow-hidden flex flex-col relative animate-in fade-in zoom-in duration-300 border border-white/20">
            {/* Close Button */}
            <button 
              onClick={() => setSelectedMachine(null)}
              className="absolute top-3 right-8 p-3 bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-500 rounded transition-all z-20  border border-slate-200"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col lg:flex-row h-full overflow-hidden">
              {/* --- Sidebar: Asset Identity --- */}
              <div className="lg:w-[360px] bg-slate-50/80 border-r border-slate-200 p-4 flex flex-col overflow-y-auto">
                <div className="relative mb-3 w-fit">
                  <div className="w-10 h-10 rounded-md bg-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                    <Cpu size={20} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white border-4 border-slate-50 flex items-center justify-center">
                    <div className={`w-1 h-1 rounded-full ${selectedMachine.status === 'Running' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  </div>
                </div>

                <div>
                  <h2 className="text-xl   text-slate-900 m-0 tracking-tight leading-tight uppercase">{selectedMachine.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 bg-slate-200 rounded text-[9px]  text-slate-600 ">{selectedMachine.id}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-[9px]  text-indigo-500  uppercase">{selectedMachine.line}</span>
                  </div>
                </div>
                
                <div className="mt-5">
                  {/* Health Widget */}
                  <div className="p-2 rounded-md bg-white border border-slate-200  relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs   text-slate-400 ">Health Index</span>
                      <span className="text-xs  text-emerald-600">{selectedMachine.health}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${selectedMachine.health}%` }}></div>
                    </div>
                    <div className="mt-4 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs   text-slate-500 leading-relaxed m-0">
                        Calibration recommended in <span className="text-slate-900">12h</span>.
                      </p>
                    </div>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-1 mt-3 gap-3">
                    {[
                      { label: 'Core Temp', val: `${selectedMachine.temp}°C`, icon: Thermometer, color: 'text-rose-500', bg: 'bg-rose-50' },
                      { label: 'Current Load', val: `${selectedMachine.load}%`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
                      { label: 'Velocity', val: `${selectedMachine.throughput}/h`, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded bg-white border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${item.bg}`}>
                            <item.icon size={16} className={item.color} />
                          </div>
                          <span className="text-xs   text-slate-400  uppercase">{item.label}</span>
                        </div>
                        <span className="text-xs  text-slate-900">{item.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Strategy Card */}
                <div className="mt-auto pt-8">
                  <div className="p-2 rounded-md bg-slate-900 text-white  relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket size={16} className="text-indigo-400" />
                      <span className="text-[9px]  tracking-[0.2em] uppercase">AI Insight</span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-300 leading-relaxed mb-4">
                      Increase <span className="text-white ">Pressure</span> to <span className="text-indigo-400 ">185 PSI</span> for <span className="text-white ">+4.2%</span> gain.
                    </p>
                    <button className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px]  rounded transition-all ">
                      Execute Optimization
                    </button>
                  </div>
                </div>
              </div>

              {/* --- Main Content: Deep-Dive --- */}
              <div className="flex-1 p-4 lg:p-4 overflow-y-auto bg-white">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-12">
                  <div>
                    <h3 className="text-xl  text-slate-900 tracking-tight m-0">Analytics Hub</h3>
                    <p className="text-xs text-slate-400 mt-2">Correlation & Loss Decomposition</p>
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded">
                    <button 
                      onClick={() => setModalTab('Overview')}
                      className={`p-6  py-2 text-xs  rounded   transition-all ${modalTab === 'Overview' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Overview
                    </button>
                    <button 
                      onClick={() => setModalTab('History')}
                      className={`p-6  py-2 text-xs  rounded   transition-all ${modalTab === 'History' ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      History
                    </button>
                  </div>
                </div>

                {/* KPI Bento Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
                  {[
                    { label: 'Availability', val: selectedMachine.a, trend: '+1.2%', color: 'text-indigo-600' },
                    { label: 'Performance', val: selectedMachine.p, trend: '-0.5%', color: 'text-blue-600' },
                    { label: 'Quality', val: selectedMachine.q, trend: 'Stable', color: 'text-emerald-600' },
                    { label: 'OEE Index', val: selectedMachine.oee, trend: '+0.8%', color: 'text-indigo-600', highlight: true }
                  ].map((stat, i) => (
                    <div key={i} className={`p-2 rounded ${stat.highlight ? 'bg-indigo-50/50 border-2 border-indigo-100' : 'bg-slate-50/50 border border-slate-100'}`}>
                      <span className="text-xs   text-slate-400  block mb-3">{stat.label}</span>
                      <div className="text-xl   text-slate-900 tracking-tighter mb-2">{stat.val}%</div>
                      <span className={`text-xs   px-2 py-1 rounded-md tracking-tighter ${
                        stat.trend.includes('+') ? 'bg-emerald-100 text-emerald-600' : 
                        stat.trend.includes('-') ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {stat.trend}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Correlation Area */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-6">
                    <h4 className="text-[11px]  text-slate-900  uppercase">
                      {modalTab === 'Overview' ? 'Cycle Correlation Trend' : 'Historical OEE Trend'}
                    </h4>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                        <span className="text-xs   text-slate-400 ">OEE</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                        <span className="text-xs   text-slate-400 ">Quality</span>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={modalTab === 'Overview' ? (realData.trends.length > 0 ? realData.trends.map(t => ({ ...t, time: t.date })) : []) : (machineHistory.length > 0 ? machineHistory : [])}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey={modalTab === 'Overview' ? 'time' : 'date'} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                        formatter={(value) => `${value}%`}
                      />
                      <Bar dataKey="oee" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={modalTab === 'Overview' ? 24 : 12} />
                      <Line type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} name="Quality %" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  {((modalTab === 'History' && machineHistory.length === 0) || (modalTab === 'Overview' && realData.trends.length === 0)) && !historyLoading && (
                    <p className="text-center text-[11px]  text-slate-400 mt-6 italic ">No tracking data found for this analysis.</p>
                  )}
                  {historyLoading && (
                    <p className="text-center text-[11px]  text-indigo-500 mt-6 animate-pulse ">Fetching machine intelligence...</p>
                  )}
                </div>

                {/* Bottom Sections: Loss & Rejects */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {/* Loss Breakdown */}
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <h5 className="text-[11px]  text-slate-900  mb-3 flex items-center gap-3">
                      <Layers size={16} className="text-indigo-500" />
                      Downtime Analytics
                    </h5>
                    <div className="space-y-4">
                      {selectedMachine.downtime.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded border border-slate-100 hover:border-indigo-200 transition-all">
                          <div>
                            <span className="text-[9px]  text-slate-400  mb-1 block">Event ID-202{i+1}</span>
                            <span className="text-xs  text-slate-800 uppercase">{d.reason}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-base  text-slate-900 block">{d.minutes}m</span>
                            <span className="text-xs   text-rose-500 tracking-tighter">Impact Critical</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reject Distro */}
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <h5 className="text-[11px]  text-slate-900  mb-3 flex items-center gap-3">
                      <AlertCircle size={16} className="text-rose-500" />
                      Yield Intelligence
                    </h5>
                    <div className="space-y-8">
                      {selectedMachine.rejectDistribution.map((r, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px]  text-slate-600 tracking-tight">{r.label}</span>
                            <span className="text-[11px]  text-slate-900">{r.val}%</span>
                          </div>
                          <div className="h-2.5 w-full bg-white rounded-full overflow-hidden border border-slate-100 p-0.5">
                            <div className={`h-full ${r.color} rounded-full transition-all duration-1000`} style={{ width: `${r.val}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-10 p-3 bg-emerald-50 rounded border border-emerald-100 flex items-center gap-4">
                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                      <p className="text-[11px]  text-emerald-700 m-0 leading-relaxed tracking-wide">
                        Precision stability confirmed. Variance within <span className="">±0.02%</span> tolerance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
