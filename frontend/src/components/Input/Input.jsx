import { forwardRef } from 'react'

const Input = forwardRef(({ 
  type = 'text',
  placeholder = '',
  label = '',
  error = '',
  className = '',
  ...props 
}, ref) => {
  return (
    <div className="form-group">
      {label && <label className="block mb-2 text-sm font-medium text-neutral-700">{label}</label>}
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        className={`input-base ${className}`.trim()}
        {...props}
      />
      {error && <span className="text-danger text-sm mt-1 block">{error}</span>}
    </div>
  )
})

Input.displayName = 'Input'

export default Input
