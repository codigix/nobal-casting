export default function Badge({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
  }

  return (
    <span className={`text-capitalize text-xs ${variants[variant]} ${className}`.trim()} {...props}>
      {children}
    </span>
  )
}
