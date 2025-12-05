import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

export default function SearchableSelect({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Search or type...',
  isLoading = false,
  error = '',
  required = false,
  onSearch = null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)

  useEffect(() => {
    if (onSearch) {
      onSearch(searchTerm)
    }
    setFilteredOptions(options)
    setHighlightedIndex(-1)
  }, [searchTerm, options, onSearch])

  useEffect(() => {
    if (isOpen && !searchTerm && onSearch && options.length === 0) {
      onSearch('')
    }
  }, [isOpen, searchTerm, onSearch, options.length])

  useEffect(() => {
    if (value) {
      const selectedOption = options.find(opt => opt.value === value)
      if (selectedOption && selectedOption.label !== searchTerm) {
        setSearchTerm(selectedOption.label)
      }
    }
  }, [value, options])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option) => {
    onChange(option.value)
    setSearchTerm(option.label)
    setIsOpen(false)
  }

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value)
    if (!onSearch) {
      onChange(e.target.value)
    }
    setIsOpen(true)
  }

  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div className="form-group" ref={containerRef}>
      {label && <label>{label}{required && ' *'}</label>}
      <div style={{ position: 'relative' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          background: 'white'
        }}>
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true)
              if (onSearch && !searchTerm) {
                onSearch('')
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '6px',
              border: 'none',
              outline: 'none',
              fontSize: '12px'
            }}
            disabled={isLoading}
          />
          <ChevronDown 
            size={18} 
            style={{
              marginRight: '8px',
              color: '#6b7280',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </div>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 10,
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {isLoading && (
              <div style={{ padding: '10px', color: '#9ca3af', textAlign: 'center' }}>
                Loading...
              </div>
            )}
            {!isLoading && filteredOptions.length === 0 && options.length === 0 && (
              <div style={{ padding: '10px', color: '#9ca3af', textAlign: 'center', fontSize: '10px' }}>
                No options found
              </div>
            )}
            {!isLoading && filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option)}
                style={{
                  padding: '6px',
                  cursor: 'pointer',
                  background: highlightedIndex === index ? '#f3f4f6' : 'white',
                  color: option.value === value ? '#2563eb' : '#1f2937',
                  fontWeight: option.value === value ? '600' : 'normal',
                  borderBottom: '1px solid #f3f3f3',
                  fontSize: '10px'
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>}
    </div>
  )
}
