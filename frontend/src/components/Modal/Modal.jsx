import { useState } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-5xl',
    'full': 'max-w-[65vw]'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className={`bg-white rounded-lg shadow  max-h-[90vh] overflow-hidden ${sizes[size] || sizes.md} w-full flex flex-col `}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-2 border-b border-neutral-200">
          <h3 className="text-lg ">{title}</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700 p-1 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 p-2 border-t border-neutral-200 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState)
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(!isOpen)

  return { isOpen, open, close, toggle }
}
