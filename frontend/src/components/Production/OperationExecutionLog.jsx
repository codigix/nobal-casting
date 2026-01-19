import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import api from '../../services/api'

export default function OperationExecutionLog({ jobCardId }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (jobCardId) {
      fetchLogs()
    }
  }, [jobCardId])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await api.get(
        `/production/operation-logs/${jobCardId}`
      )
      if (response.data.success) {
        setLogs(response.data.data || [])
        setError(null)
      }
    } catch (err) {
      console.error('Failed to fetch operation logs:', err)
      setError('Failed to load operation logs')
    } finally {
      setLoading(false)
    }
  }

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'START':
        return <Zap className="text-blue-500" size={16} />
      case 'END':
        return <CheckCircle className="text-green-500" size={16} />
      case 'DELAY':
        return <AlertCircle className="text-amber-500" size={16} />
      default:
        return <Clock className="text-gray-500" size={16} />
    }
  }

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'START':
        return 'bg-blue-50 border-l-4 border-blue-500'
      case 'END':
        return 'bg-green-50 border-l-4 border-green-500'
      case 'DELAY':
        return 'bg-amber-50 border-l-4 border-amber-500'
      default:
        return 'bg-gray-50 border-l-4 border-gray-300'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading execution logs...</div>
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <Clock size={24} className="mx-auto mb-2 opacity-50" />
        <p className="text-xs">No execution events recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log, index) => (
        <div key={log.id || index} className={`p-3 rounded-xs ${getEventColor(log.event_type)}`}>
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {getEventIcon(log.event_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="font-semibold text-xs text-gray-900">
                    {log.event_type}
                  </span>
                  {log.workstation_id && (
                    <span className="ml-2 text-xs text-gray-600">
                      Workstation: {log.workstation_id}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">
                  {formatDate(log.event_timestamp)}
                </span>
              </div>
              {log.notes && (
                <p className="text-xs text-gray-700 mt-1">{log.notes}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
