// Data table component with columns and data
function DataTable({ columns = [], data = [], onRowClick, className = '' }) {
  return (
    <div className="table-responsive">
      <table className={`table-base ${className}`.trim()}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
              style={onRowClick ? { transition: 'background-color 0.2s' } : {}}
              onMouseEnter={(e) => onRowClick && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={(e) => onRowClick && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.format ? column.format(row[column.key]) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Basic table building blocks (named exports)
export function Table({ children, className = '', columns, data, onRowClick, ...props }) {
  // If columns and data are provided, use data table mode
  if (columns && data) {
    return <DataTable columns={columns} data={data} onRowClick={onRowClick} className={className} />
  }
  
  // Otherwise use composable mode
  return (
    <div className="table-responsive">
      <table className={`table-base ${className}`.trim()} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children, ...props }) {
  return <thead {...props}>{children}</thead>
}

export function TableBody({ children, ...props }) {
  return <tbody {...props}>{children}</tbody>
}

export function TableRow({ children, ...props }) {
  return <tr {...props}>{children}</tr>
}

export function TableHeader({ children, ...props }) {
  return <th {...props}>{children}</th>
}

export function TableCell({ children, ...props }) {
  return <td {...props}>{children}</td>
}

// Default export for convenience
export default Table
