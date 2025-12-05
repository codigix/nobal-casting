export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  type = 'button',
  onClick,
  className = '',
  loading = false,
  ...props 
}) {
  const baseStyles = 'font-medium rounded transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 dark:bg-secondary-700 dark:hover:bg-secondary-600',
    success: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
    warning: 'bg-yellow-600 text-white hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600',
    info: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
    outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20',
    ghost: 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20',
    icon: 'text-primary-600 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-900/20',
    'icon-success': 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
    'icon-warning': 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20',
    'icon-info': 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
    'icon-danger': 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
  }

  const sizes = {
    sm: 'px-2 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
      onClick={onClick}
      {...props}
    >
      {loading ? '...' : children}
    </button>
  )
}
