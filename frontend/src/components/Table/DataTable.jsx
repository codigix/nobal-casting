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
  pageSizeOptions = [10, 20, 50, 100],
  disablePagination = false,
  pagination = true, // for backwards compatibility or toggle
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
  const [internalPageSize, setInternalPageSize] = useState(pageSize)

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

  const totalPages = (disablePagination || !pagination) ? 1 : Math.ceil(sortedData.length / internalPageSize)
  const paginatedData = useMemo(() => {
    if (disablePagination || !pagination) {
      return sortedData
    }
    const start = (currentPage - 1) * internalPageSize
    return sortedData.slice(start, start + internalPageSize)
  }, [sortedData, currentPage, internalPageSize, disablePagination, pagination])

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
            <thead className='p-2'>
              <tr>
                {filteredColumns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => sortable && handleSort(col.key)}
                    className={`${sortable && col.key !== 'actions' ? 'sortable' : ''} ${col.key}-col`}
                    title={sortable ? 'Click to sort' : ''}
                  >
                    <div className="th-content" title={col.label}>
                      <span className="th-label">{col.label}</span>
                      {sortable && sortConfig.key === col.key && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {actualRenderActions && <th className="actions-col bg-[#eff6ff] p-2">Actions</th>}
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
                      <td className="actions-col bg-[#eff6ff] p-2">
                        {actualRenderActions(row)}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


      </div>
      {!disablePagination && pagination && (
        <div className="table-pagination">
          <div className="page-size-selector flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows per page:</span>
            <select
              value={internalPageSize}
              onChange={(e) => {
                setInternalPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          
          <div className="pagination-controls flex items-center gap-4">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              ← Prev
            </button>
            
            <div className="page-info text-xs text-gray-600 font-medium">
              Page {currentPage} of {totalPages} 
              <span className="text-gray-400 font-normal ml-2">({sortedData.length} total)</span>
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs border border-gray-200 rounded disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  )
}
