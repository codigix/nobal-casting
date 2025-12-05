import { AlertCircle, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'

export default function Alert({ children, variant = 'info', title = '', className = '', showIcon = true, ...props }) {
  const variants = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    danger: 'alert-danger',
  }

  const icons = {
    info: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
    danger: XCircle,
  }

  const IconComponent = icons[variant]

  return (
    <div className={`alert ${variants[variant]} ${className}`} {...props}>
      <div className="alert-content">
        {showIcon && IconComponent && (
          <IconComponent size={20} className="alert-icon" />
        )}
        <div>
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          {children}
        </div>
      </div>
    </div>
  )
}
