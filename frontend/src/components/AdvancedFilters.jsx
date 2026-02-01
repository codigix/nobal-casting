import React, { useState } from 'react'

export default function AdvancedFilters({ 
  filters, 
  onFilterChange, 
  filterConfig = []
}) {
  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filterConfig.map(config => (
          <div key={config.key} className="flex flex-col">
            <label className="text-xs text-gray-700 ">{config.label}</label>
            {config.type === 'select' ? (
              <select 
                value={filters[config.key] || ''}
                onChange={(e) => handleFilterChange(config.key, e.target.value)}
                className="p-2 border border-gray-300 rounded-xs text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="">All</option>
                {config.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : config.type === 'date' ? (
              <input 
                type="date"
                value={filters[config.key] || ''}
                onChange={(e) => handleFilterChange(config.key, e.target.value)}
                className="p-2 border border-gray-300 rounded-xs text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            ) : config.type === 'dateRange' ? (
              <div className="flex gap-2">
                <input 
                  type="date"
                  placeholder="From"
                  value={filters[`${config.key}_from`] || ''}
                  onChange={(e) => handleFilterChange(`${config.key}_from`, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-xs text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <input 
                  type="date"
                  placeholder="To"
                  value={filters[`${config.key}_to`] || ''}
                  onChange={(e) => handleFilterChange(`${config.key}_to`, e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-xs text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            ) : (
              <input 
                type="text"
                placeholder={config.placeholder || 'Search...'}
                value={filters[config.key] || ''}
                onChange={(e) => handleFilterChange(config.key, e.target.value)}
                className="p-2 border border-gray-300 rounded-xs text-xs text-gray-700 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}