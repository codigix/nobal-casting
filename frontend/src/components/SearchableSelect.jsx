import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, X } from 'lucide-react'

export default function SearchableSelect({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Search or type...',
  isLoading = false,
  error = '',
  required = false,
  onSearch = null,
  isClearable = true,
  isDisabled = false,
  containerClassName = "",
  width = "w-full"
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef(null)
  const optionsListRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (onSearch) {
      onSearch(searchTerm)
    } else {
      const filtered = options.filter(opt => 
        String(opt.label || '').toLowerCase().includes((searchTerm || '').toLowerCase())
      )
      setFilteredOptions(filtered)
    }
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
      if (selectedOption) {
        if (selectedOption.label !== searchTerm) {
          setSearchTerm(selectedOption.label)
        }
      } else {
        setSearchTerm(value)
      }
    } else {
      setSearchTerm('')
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

  useEffect(() => {
    const handleScroll = (e) => {
      if (!isOpen) return
      if (optionsListRef.current && optionsListRef.current.contains(e.target)) return
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return
      setIsOpen(false)
    }

    const handleResize = () => {
      if (isOpen) setIsOpen(false)
    }

    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  const handleSelect = (option) => {
    onChange(option.value)
    setSearchTerm(option.label)
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange('')
    setSearchTerm('')
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
    <div className={`${width} relative ${isOpen ? 'z-50' : 'z-0'}`} ref={containerRef}>
      {label && <label className="block text-xs  text-slate-400  mb-1">{label}{required && ' *'}</label>}
      <div className="relative">
        <div className={`flex  items-center border transition-all  rounded ${containerClassName || ' bg-white border-gray-300'} ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : 'focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500'}`}>
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
            className={`flex-1 h-full border-none w-[100%] p-2 pr-8 outline-none text-xs bg-transparent ${
              isDisabled ? 'cursor-not-allowed' : 'cursor-text'
            }`}
            disabled={isLoading || isDisabled}
          />
          <div className="absolute right-0 top-0 h-full flex items-center pr-1 pointer-events-none">
            {isClearable && searchTerm && !isDisabled && (
              <button
                type="button"
                onClick={handleClear}
                className="pointer-events-auto mr-1 bg-none border-none cursor-pointer text-gray-500 p-0.5 flex items-center hover:text-gray-700 transition"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown 
              size={18} 
              className={`text-gray-500 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </div>
        </div>

        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded  z-[999] max-h-48 overflow-y-auto">
            {isLoading && (
              <div className="p-2 text-gray-400 text-center text-xs">
                Loading...
              </div>
            )}
            {!isLoading && filteredOptions.length === 0 && options.length === 0 && (
              <div className="p-2 text-gray-400 text-center text-xs">
                No options found
              </div>
            )}
            <div ref={optionsListRef}>
              {!isLoading && filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`px-1.5 py-1.5 cursor-pointer border-b border-gray-100 text-xs transition ${
                    highlightedIndex === index ? 'bg-gray-100' : 'bg-white'
                  } ${
                    option.value === value ? 'text-blue-600 ' : 'text-gray-900'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {option.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  )
}
