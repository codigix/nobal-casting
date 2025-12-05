import React, { useState, useMemo } from 'react'
import { Eye, ChevronDown } from 'lucide-react'
import '../Table/DataTable.css'

export default function DataTable({ 
  columns, 
  data, 
  renderActions,
  filterable = true,
  sortable = true,
  pageSize = 10,
  disablePagination = false,
  hideColumnToggle = false
}) {
  const [filters, setFilters] = useState({})
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState(
    new Set(columns.map(col => col.key))
  )
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  const filteredColumns = columns.filter(col => visibleColumns.has(col.key))

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev)
      if (newSet.has(columnKey)) {
        newSet.delete(columnKey)
      } else {
        newSet.add(columnKey)
      }
      return newSet
    })
  }

  const showAllColumns = () => {
    setVisibleColumns(new Set(columns.map(col => col.key)))
  }

  const hideAllColumns = () => {
    setVisibleColumns(new Set())
  }

  const filteredData = useMemo(() => {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true
        const rowValue = String(row[key]).toLowerCase()
        return rowValue.includes(String(value).toLowerCase())
      })
    })
  }, [data, filters])

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData

    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal === null) return 1
      if (bVal === null) return -1

      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortConfig.direction === 'asc' 
        ? aVal - bVal
        : bVal - aVal
    })

    return sorted
  }, [filteredData, sortConfig])

  const totalPages = disablePagination ? 1 : Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    if (disablePagination) {
      return sortedData
    }
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize, disablePagination])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  return (
    <div className="data-table-wrapper">
      {!hideColumnToggle && (
        <div className="table-toolbar">
          <div className="column-toggle-container">
            <button
              className="column-toggle-btn"
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              title="Toggle column visibility"
            >
              <Eye size={18} />
              <span>Columns ({visibleColumns.size}/{columns.length})</span>
              <ChevronDown size={16} />
            </button>
            {showColumnMenu && (
              <div className="column-menu">
                <div className="column-menu-header">
                  <button onClick={showAllColumns} className="column-menu-action">Show All</button>
                  <button onClick={hideAllColumns} className="column-menu-action">Hide All</button>
                </div>
                <div className="column-menu-items">
                  {columns.map(col => (
                    <label key={col.key} className="column-menu-item">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumnVisibility(col.key)}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {filterable && filteredColumns.length > 0 && (
        <div className="table-filters">
          {filteredColumns.map(col => (
            <div key={col.key} className="filter-input">
              <label>{col.label}</label>
              <input 
                type="text"
                placeholder={`Filter ${col.label}...`}
                value={filters[col.key] || ''}
                onChange={(e) => handleFilterChange(col.key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {filteredColumns.map(col => (
                <th 
                  key={col.key}
                  style={{ width: col.width }}
                  onClick={() => sortable && handleSort(col.key)}
                  className={sortable && col.key !== 'actions' ? 'sortable' : ''}
                  title={sortable ? 'Click to sort' : ''}
                >
                  <div className="th-content">
                    {col.label}
                    {sortable && sortConfig.key === col.key && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {renderActions && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={filteredColumns.length + (renderActions ? 1 : 0)} className="no-data">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="data-row">
                  {filteredColumns.map(col => (
                    <td key={col.key} style={{ width: col.width }}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {renderActions && (
                    <td className="actions-col">
                      {renderActions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!disablePagination && totalPages > 1 && (
        <div className="table-pagination">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            ← Prev
          </button>
          
          <div className="page-info">
            Page {currentPage} of {totalPages} 
            ({sortedData.length} total records)
          </div>

          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
