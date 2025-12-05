import React, { useState, useEffect } from 'react'
import { Plus, Calendar, BarChart3, AlertTriangle } from 'lucide-react'
import * as productionService from '../../services/productionService'
import CreateProductionEntryModal from '../../components/Production/CreateProductionEntryModal'
import RecordRejectionModal from '../../components/Production/RecordRejectionModal'
import './Production.css'

export default function ProductionEntries() {
  const [entries, setEntries] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMachine, setSelectedMachine] = useState('')

  useEffect(() => {
    fetchEntries()
    fetchMachines()
  }, [selectedDate, selectedMachine])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await productionService.getProductionEntries({
        entry_date: selectedDate,
        machine_id: selectedMachine
      })
      setEntries(response.data || [])
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to fetch production entries')
      setEntries([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMachines = async () => {
    try {
      const response = await productionService.getMachines()
      setMachines(response.data || [])
    } catch (err) {
      console.error('Failed to fetch machines:', err)
    }
  }



  const calculateEfficiency = (entry) => {
    if (!entry.quantity_produced || !entry.hours_worked) return 0
    return (entry.quantity_produced / entry.hours_worked).toFixed(2)
  }

  const calculateQualityRate = (entry) => {
    if (!entry.quantity_produced) return 0
    const accepted = entry.quantity_produced - (entry.quantity_rejected || 0)
    return ((accepted / entry.quantity_produced) * 100).toFixed(2)
  }

  return (
    <div className="production-container">
      <div className="production-header">
        <div>
          <h1>📊 Daily Production Entries</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Record daily production and performance data</p>
        </div>
        <button 
          onClick={() => setShowEntryModal(true)}
          className="btn-submit w-auto"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> New Entry
        </button>
      </div>

      {/* Modals */}
      <CreateProductionEntryModal 
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSuccess={fetchEntries}
      />
      <RecordRejectionModal 
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onSuccess={fetchEntries}
      />

      {/* Filters */}
      <div className="filter-section">
        <div className="filter-group">
          <label>📅 Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>🔧 Machine</label>
          <select value={selectedMachine} onChange={(e) => setSelectedMachine(e.target.value)}>
            <option value="">All Machines</option>
            {machines.map(m => (
              <option key={m.machine_id} value={m.machine_id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>



      {/* Production Entries Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading production entries...</p>
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '20px', color: '#dc2626' }}>
          {error}
        </div>
      ) : entries.length > 0 ? (
        <div className="production-entries-container">
          <table className="entries-table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Work Order</th>
                <th>Machine</th>
                <th>Shift</th>
                <th>Produced</th>
                <th>Rejected</th>
                <th>Efficiency</th>
                <th>Quality %</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.entry_id}>
                  <td><strong>{entry.entry_id}</strong></td>
                  <td>{entry.wo_id}</td>
                  <td>{entry.machine_name}</td>
                  <td>Shift {entry.shift_no}</td>
                  <td>{entry.quantity_produced}</td>
                  <td>{entry.quantity_rejected || 0}</td>
                  <td>{calculateEfficiency(entry)} u/h</td>
                  <td>
                    <span style={{
                      background: calculateQualityRate(entry) >= 95 ? '#dcfce7' : '#fef3c7',
                      color: calculateQualityRate(entry) >= 95 ? '#16a34a' : '#d97706',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {calculateQualityRate(entry)}%
                    </span>
                  </td>
                  <td>
                    <div className="entry-actions">
                      <button className="btn-view">View</button>
                      <button className="btn-edit">Edit</button>
                      <button 
                        className="btn-reject"
                        onClick={() => setShowRejectionModal(true)}
                        title="Record issue for this entry"
                        style={{
                          background: '#fecaca',
                          color: '#dc2626',
                          padding: '6px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Issue
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
          <BarChart3 size={48} style={{ color: '#ccc', margin: '0 auto 15px' }} />
          <p style={{ color: '#666', fontSize: '1.1rem' }}>No production entries for this date</p>
        </div>
      )}
    </div>
  )
}