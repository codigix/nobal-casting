import React from 'react'

export default function CommonHeaderButton({ 
  children, 
  onClick, 
  title, 
  className = '', 
  isActive = false 
}) {
  return (
    <button
      className={`header-icon-btn ${className} ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}
