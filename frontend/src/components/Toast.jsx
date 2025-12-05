import React, { useEffect } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react'

const styles = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .toast-enter {
    animation: slideIn 0.3s ease-out;
  }

  .toast-exit {
    animation: slideOut 0.3s ease-out;
  }
`

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type]

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: AlertCircle
  }[type]

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-3 toast-enter`}>
      <Icon size={20} />
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="hover:opacity-75 transition"
      >
        <X size={18} />
      </button>
    </div>
  )
}
