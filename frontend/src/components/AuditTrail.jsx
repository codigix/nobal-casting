import React from 'react'
import './AuditTrail.css'

export default function AuditTrail({ 
  createdAt, 
  createdBy, 
  updatedAt, 
  updatedBy,
  status,
  currentUser 
}) {
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return '-'
    }
  }

  return (
    <div className="audit-trail">
      <div className="audit-header">
        <h4>📋 Audit Trail & Tracking</h4>
      </div>

      <div className="audit-grid">
        <div className="audit-item">
          <label>Created Date</label>
          <p>{formatDate(createdAt)}</p>
        </div>

        <div className="audit-item">
          <label>Created By</label>
          <p>{createdBy || 'System'}</p>
        </div>

        {updatedAt && (
          <div className="audit-item">
            <label>Last Modified</label>
            <p>{formatDate(updatedAt)}</p>
          </div>
        )}

        {updatedBy && (
          <div className="audit-item">
            <label>Modified By</label>
            <p>{updatedBy}</p>
          </div>
        )}

        {status && (
          <div className="audit-item">
            <label>Current Status</label>
            <p>
              <span className={`status-badge status-${status}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="audit-note">
        <small>ℹ️ All dates are in your local timezone. Document tracking information helps maintain compliance and audit requirements.</small>
      </div>
    </div>
  )
}