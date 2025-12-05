import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './Inventory.css'

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  itemsPerPage, 
  totalItems,
  onItemsPerPageChange 
}) {
  const pageNumbers = []
  const maxPagesToShow = 5

  if (totalPages <= maxPagesToShow) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i)
    }
  } else {
    pageNumbers.push(1)
    
    if (currentPage > 3) {
      pageNumbers.push('...')
    }

    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pageNumbers.includes(i)) {
        pageNumbers.push(i)
      }
    }

    if (currentPage < totalPages - 2) {
      pageNumbers.push('...')
    }

    if (!pageNumbers.includes(totalPages)) {
      pageNumbers.push(totalPages)
    }
  }

  return (
    <div className="pagination-wrapper">
      <div className="pagination-info">
        <span>
          Showing {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
        </span>
        <select 
          value={itemsPerPage} 
          onChange={(e) => {
            onItemsPerPageChange(parseInt(e.target.value))
            onPageChange(1)
          }}
          className="items-per-page-select"
        >
          <option value={10}>10 items per page</option>
          <option value={25}>25 items per page</option>
          <option value={50}>50 items per page</option>
          <option value={100}>100 items per page</option>
        </select>
      </div>

      <div className="pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((page, index) => (
          page === '...' ? (
            <span key={`dots-${index}`} className="pagination-dots">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
              disabled={currentPage === page}
            >
              {page}
            </button>
          )
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}