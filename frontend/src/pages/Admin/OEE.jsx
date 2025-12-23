import React, { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import { AlertTriangle, Eye, X, BarChart3, TrendingUp, Clipboard, Target, Rocket } from 'lucide-react'

const DetailModal = ({ isOpen, machine, onClose }) => {
  if (!isOpen || !machine) return null

  const performanceData = [
    { hour: '00:00', availability: 95, performance: 92, quality: 98 },
    { hour: '04:00', availability: 98, performance: 94, quality: 97 },
    { hour: '08:00', availability: 92, performance: 89, quality: 96 },
    { hour: '12:00', availability: 96, performance: 93, quality: 99 },
    { hour: '16:00', availability: 99, performance: 96, quality: 98 },
    { hour: '20:00', availability: 94, performance: 91, quality: 97 }
  ]

  const weeklyData = [
    { day: 'Mon', oee: 85, availability: 95, performance: 92, quality: 97 },
    { day: 'Tue', oee: 87, availability: 96, performance: 94, quality: 96 },
    { day: 'Wed', oee: 83, availability: 92, performance: 89, quality: 98 },
    { day: 'Thu', oee: 89, availability: 98, performance: 95, quality: 96 },
    { day: 'Fri', oee: 91, availability: 99, performance: 96, quality: 97 },
    { day: 'Sat', oee: 78, availability: 88, performance: 85, quality: 95 }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex items-center justify-between text-white z-10">
          <div>
            <h2 className="text-2xl font-bold m-0">{machine.name}</h2>
            <p className="text-slate-300 text-sm mt-1 m-0">OEE Breakdown Analysis</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 uppercase mb-2 m-0">OEE Score</p>
              <p className="text-xl font-bold text-blue-700 m-0">{machine.oee}%</p>
              <p className="text-xs text-slate-600 mt-2">Overall effectiveness</p>
            </div>
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <p className="text-xs font-semibold text-green-900 uppercase mb-2 m-0">Availability</p>
              <p className="text-xl font-bold text-green-700 m-0">{machine.availability}%</p>
              <p className="text-xs text-slate-600 mt-2">Equipment uptime</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <p className="text-xs font-semibold text-purple-900 uppercase mb-2 m-0">Performance</p>
              <p className="text-xl font-bold text-purple-700 m-0">{machine.performance}%</p>
              <p className="text-xs text-slate-600 mt-2">Actual output rate</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
              <p className="text-xs font-semibold text-amber-900 uppercase mb-2 m-0">Quality</p>
              <p className="text-xl font-bold text-amber-700 m-0">{machine.quality}%</p>
              <p className="text-xs text-slate-600 mt-2">Good product rate</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">24H OEE Components</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="availability" stroke="#10b981" strokeWidth={2} name="Availability" />
                  <Line type="monotone" dataKey="performance" stroke="#8b5cf6" strokeWidth={2} name="Performance" />
                  <Line type="monotone" dataKey="quality" stroke="#f59e0b" strokeWidth={2} name="Quality" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} className="text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 m-0">Weekly OEE Trend</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="oee" fill="#06b6d4" name="OEE" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Clipboard size={20} className="text-slate-600" />
              <h3 className="text-base font-bold text-slate-900 m-0">OEE Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Total Operating Hours:</span>
                <span className="font-bold text-slate-900">8,432 hrs</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Good Products:</span>
                <span className="font-bold text-slate-900">45,892 units</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Downtime:</span>
                <span className="font-bold text-slate-900">412 min</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Defective Products:</span>
                <span className="font-bold text-slate-900">1,254 units</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Theoretical Output:</span>
                <span className="font-bold text-slate-900">50,000 units</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-300">
                <span className="text-sm text-slate-600">Last Maintenance:</span>
                <span className="font-bold text-slate-900">{machine.lastMaintenance}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OEE() {
  const [oeeDistribution] = useState([
    { name: 'Excellent (>85%)', value: 8, color: '#10b981' },
    { name: 'Good (75-85%)', value: 10, color: '#3b82f6' },
    { name: 'Average (60-75%)', value: 4, color: '#f59e0b' },
    { name: 'Poor (<60%)', value: 2, color: '#ef4444' }
  ])

  const [oeeByLine] = useState([
    { line: 'Line-1', oee: 88, availability: 96, performance: 94, quality: 97 },
    { line: 'Line-2', oee: 82, availability: 92, performance: 88, quality: 96 },
    { line: 'Line-3', oee: 91, availability: 98, performance: 95, quality: 98 },
    { line: 'Line-4', oee: 75, availability: 88, performance: 82, quality: 94 },
    { line: 'Line-5', oee: 86, availability: 95, performance: 92, quality: 97 },
    { line: 'Line-6', oee: 79, availability: 90, performance: 86, quality: 95 }
  ])

  const [oeeOverTime] = useState([
    { month: 'Jan', oee: 82, availability: 94, performance: 90, quality: 96 },
    { month: 'Feb', oee: 84, performance: 92, quality: 97, availability: 95 },
    { month: 'Mar', oee: 87, availability: 96, performance: 93, quality: 97 },
    { month: 'Apr', oee: 85, availability: 94, performance: 91, quality: 96 },
    { month: 'May', oee: 89, availability: 97, performance: 95, quality: 97 },
    { month: 'Jun', oee: 88, availability: 96, performance: 94, quality: 97 }
  ])

  const [machineOEE] = useState([
    { id: 'M-001', name: 'CNC Lathe 1', status: 'Operational', oee: 88, availability: 96, performance: 94, quality: 97, downtime: 240, defects: 125, lastMaintenance: '2025-05-15' },
    { id: 'M-002', name: 'Milling Machine', status: 'Operational', oee: 82, availability: 92, performance: 88, quality: 96, downtime: 480, defects: 325, lastMaintenance: '2025-04-20' },
    { id: 'M-003', name: 'Stamping Press', status: 'Operational', oee: 91, availability: 98, performance: 95, quality: 98, downtime: 120, defects: 85, lastMaintenance: '2025-06-01' },
    { id: 'M-004', name: 'Assembly Robot', status: 'Maintenance', oee: 0, availability: 0, performance: 0, quality: 0, downtime: 2880, defects: 0, lastMaintenance: '2025-12-05' },
    { id: 'M-005', name: 'Polishing Unit', status: 'Operational', oee: 86, availability: 95, performance: 92, quality: 97, downtime: 300, defects: 215, lastMaintenance: '2025-05-10' },
    { id: 'M-006', name: 'Packaging Machine', status: 'Down', oee: 15, availability: 30, performance: 45, quality: 95, downtime: 2400, defects: 1200, lastMaintenance: '2025-04-01' }
  ])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState(null)

  const openModal = (machine) => {
    setSelectedMachine(machine)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedMachine(null)
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Operational':
        return 'bg-green-100 text-green-800'
      case 'Maintenance':
        return 'bg-amber-100 text-amber-800'
      case 'Down':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOEEColor = (oee) => {
    if (oee >= 85) return 'text-green-600'
    if (oee >= 75) return 'text-blue-600'
    if (oee >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="p-0 bg-slate-50 min-h-screen">
      <div className="bg-gradient-to-br from-white to-slate-100 px-2 py-2 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center text-white">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 m-0">
                OEE Analysis
              </h1>
              <p className="text-xs text-slate-500 mt-0 m-0">
                Monitor Overall Equipment Effectiveness across all production lines
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <Target size={20} className="text-slate-600" />
              <h3 className="text-base font-bold text-slate-900 m-0">OEE Distribution</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={oeeDistribution} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={({ name, value }) => `${name} (${value})`} 
                  outerRadius={80} 
                  fill="#8884d8" 
                  dataKey="value"
                >
                  {oeeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} machines`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={20} className="text-slate-600" />
              <h3 className="text-base font-bold text-slate-900 m-0">OEE by Production Line</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={oeeByLine} margin={{ left: 0, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="line" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#0f172a' }} formatter={(value) => `${value}%`} />
                <Legend />
                <Bar dataKey="oee" fill="#6366f1" name="OEE" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={20} className="text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 m-0">OEE Over Time (Monthly)</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={oeeOverTime}>
              <defs>
                <linearGradient id="colorOEE" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" domain={[0, 100]} />
              <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="oee" stroke="#6366f1" fillOpacity={1} fill="url(#colorOEE)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-2 border-b border-gray-200 flex items-center gap-2">
            <Rocket size={20} className="text-slate-600" />
            <h3 className="text-base font-bold text-slate-900 m-0">Machine OEE Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-gray-200">
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Machine ID</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Name</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Status</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">OEE</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Availability</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Performance</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Quality</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Defects</th>
                  <th className="text-left p-2 text-xs font-semibold text-slate-500 ">Action</th>
                </tr>
              </thead>
              <tbody>
                {machineOEE.map((machine, idx) => (
                  <tr key={machine.id} className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
                    <td className="p-2 text-xs text-gray-700 font-semibold">{machine.id}</td>
                    <td className="p-2 text-xs text-gray-700">{machine.name}</td>
                    <td className="p-4">
                      <span className={`p-2 rounded-lg text-xs font-semibold ${getStatusBadgeColor(machine.status)}`}>
                        {machine.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-sm font-bold ${getOEEColor(machine.oee)}`}>
                        {machine.oee}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {machine.availability}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {machine.performance}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-xs font-semibold text-slate-600">
                        {machine.quality}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {machine.defects > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                          <AlertTriangle size={14} /> {machine.defects}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-green-600">None</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => openModal(machine)}
                        className="inline-flex items-center gap-2 p-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye size={14} />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DetailModal
        isOpen={modalOpen}
        machine={selectedMachine}
        onClose={closeModal}
      />
    </div>
  )
}
