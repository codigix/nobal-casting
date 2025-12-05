import React, { useState } from 'react'
import './AdvancedFilters.css'

export default function AdvancedFilters({ 
  filters, 
  onFilterChange, 
  filterConfig = [],
  onApply,
  onReset,
  showPresets = true 
}) {
  const [showFilters, setShowFilters] = useState(false)
  const [presets, setPresets] = useState(() => {
    const saved = localStorage.getItem('filter-presets')
    return saved ? JSON.parse(saved) : {}
  })
  const [presetName, setPresetName] = useState('')

  const handleFilterChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const savePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name')
      return
    }
    const newPresets = {
      ...presets,
      [presetName]: { ...filters }
    }
    setPresets(newPresets)
    localStorage.setItem('filter-presets', JSON.stringify(newPresets))
    setPresetName('')
    alert('Filter preset saved!')
  }

  const loadPreset = (name) => {
    onFilterChange(presets[name])
    setShowFilters(false)
  }

  const deletePreset = (name) => {
    if (window.confirm(`Delete preset "${name}"?`)) {
      const newPresets = { ...presets }
      delete newPresets[name]
      setPresets(newPresets)
      localStorage.setItem('filter-presets', JSON.stringify(newPresets))
    }
  }

  return (
    <div className="advanced-filters">
      <button 
        className="filter-toggle-btn"
        onClick={() => setShowFilters(!showFilters)}
      >
        🔍 {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>

      {showFilters && (
        <div className="filters-panel">
          <div className="filters-grid">
            {filterConfig.map(config => (
              <div key={config.key} className="filter-item">
                <label>{config.label}</label>
                {config.type === 'select' ? (
                  <select 
                    value={filters[config.key] || ''}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
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
                  />
                ) : config.type === 'dateRange' ? (
                  <div className="date-range">
                    <input 
                      type="date"
                      placeholder="From"
                      value={filters[`${config.key}_from`] || ''}
                      onChange={(e) => handleFilterChange(`${config.key}_from`, e.target.value)}
                    />
                    <input 
                      type="date"
                      placeholder="To"
                      value={filters[`${config.key}_to`] || ''}
                      onChange={(e) => handleFilterChange(`${config.key}_to`, e.target.value)}
                    />
                  </div>
                ) : (
                  <input 
                    type="text"
                    placeholder={config.placeholder || 'Search...'}
                    value={filters[config.key] || ''}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="filter-actions">
            {onApply && (
              <button className="btn-apply" onClick={onApply}>
                Apply Filters
              </button>
            )}
            {onReset && (
              <button className="btn-reset" onClick={onReset}>
                Clear All
              </button>
            )}
          </div>

          {showPresets && (
            <div className="presets-section">
              <div className="preset-save">
                <input 
                  type="text"
                  placeholder="Save this filter as..."
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && savePreset()}
                />
                <button onClick={savePreset} className="btn-save-preset">
                  💾 Save
                </button>
              </div>

              {Object.keys(presets).length > 0 && (
                <div className="presets-list">
                  <p className="presets-title">Saved Presets:</p>
                  <div className="presets">
                    {Object.keys(presets).map(name => (
                      <div key={name} className="preset-item">
                        <button 
                          onClick={() => loadPreset(name)}
                          className="preset-load"
                        >
                          {name}
                        </button>
                        <button 
                          onClick={() => deletePreset(name)}
                          className="preset-delete"
                          title="Delete preset"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}