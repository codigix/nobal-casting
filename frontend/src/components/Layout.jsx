import React from 'react'
import '../styles/Layout.css'

export default function Layout({ children }) {
  return (
    <div className="layout-wrapper">
      <main className="layout-content">
        {children}
      </main>
    </div>
  )
}
