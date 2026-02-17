import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import '../Table/DataTable.css'

export default function DataTable({ 
  columns, 
  data, 
  renderActions,
  actions,
  sortable = true,
  pageSize = 10,
  disablePagination = false,
  defaultHiddenColumns = [],
  externalVisibleColumns = null,
  onVisibleColumnsChange = null
}) {
  const actualRenderActions = renderActions || actions;

  const [filters, setFilters] = useState({})
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  })
  const [currentPage, setCurrentPage] = useState(1)
  
  const [internalVisibleColumns, setInternalVisibleColumns] = useState(
    new Set(columns.map(col => col.key).filter(key => !defaultHiddenColumns.includes(key)))
  )
  
  const visibleColumns = externalVisibleColumns || internalVisibleColumns

  const filteredColumns = columns.filter(col => visibleColumns.has(col.key))

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

  return (
    <>
     
    <div className="data-table-wrapper">
     

      

      <div className="table-responsive overflow-x-auto">
        <table className="data-table ">
          <thead>
            <tr>
              {filteredColumns.map(col => (
                <th 
                  key={col.key}
                  onClick={() => sortable && handleSort(col.key)}
                  className={`${sortable && col.key !== 'actions' ? 'sortable' : ''} ${col.key}-col`}
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
              {actualRenderActions && <th className="actions-col p-2">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={filteredColumns.length + (actualRenderActions ? 1 : 0)} className="no-data">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr key={idx} className="data-row bg-white">
                  {filteredColumns.map(col => (
                    <td key={col.key} className={` p-2 ${col.key}-col ${col.key === 'status' || col.dropdown ? 'dropdown-col ' : ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                  {actualRenderActions && (
                    <td className="actions-col p-2">
                      {actualRenderActions(row)}
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
    </>
  )
}
