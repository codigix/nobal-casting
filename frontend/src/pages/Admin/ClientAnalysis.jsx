import React, { useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Star, TrendingUp, DollarSign, Users } from 'lucide-react'

export default function ClientAnalysis() {
  const [clientSegmentation] = useState([
    { name: 'Premium', value: 12, color: '#fbbf24' },
    { name: 'Standard', value: 24, color: '#60a5fa' },
    { name: 'Startup', value: 18, color: '#34d399' },
    { name: 'Inactive', value: 6, color: '#f87171' }
  ])

  const [clientSatisfaction] = useState([
    { rating: '5 Star', count: 22, color: '#10b981' },
    { rating: '4 Star', count: 15, color: '#3b82f6' },
    { rating: '3 Star', count: 8, color: '#f59e0b' },
    { rating: '2 Star', count: 3, color: '#ef4444' },
    { rating: '1 Star', count: 2, color: '#7c3aed' }
  ])

  const [clientRevenue] = useState([
    { month: 'Jan', revenue: 45000, clients: 25 },
    { month: 'Feb', revenue: 52000, clients: 28 },
    { month: 'Mar', revenue: 58000, clients: 32 },
    { month: 'Apr', revenue: 61000, clients: 35 },
    { month: 'May', revenue: 67000, clients: 38 },
    { month: 'Jun', revenue: 72000, clients: 42 }
  ])

  const [topClients] = useState([
    { id: 1, name: 'Tech Solutions Inc', segment: 'Premium', orders: 45, revenue: 125000, satisfaction: 4.8 },
    { id: 2, name: 'Global Manufacturing Ltd', segment: 'Premium', orders: 38, revenue: 112000, satisfaction: 4.6 },
    { id: 3, name: 'AutoParts Co', segment: 'Standard', orders: 28, revenue: 62000, satisfaction: 4.2 },
    { id: 4, name: 'Precision Casting Group', segment: 'Standard', orders: 22, revenue: 48000, satisfaction: 4.0 },
    { id: 5, name: 'StartUp Industries', segment: 'Startup', orders: 12, revenue: 22000, satisfaction: 3.8 }
  ])

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Users size={32} style={{ color: '#3b82f6' }} />
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
            Client Analysis
          </h1>
          <p style={{ color: '#6b7280' }}>Analyze client segments, satisfaction, and revenue metrics</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        {/* Client Segmentation */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            Client Segmentation
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={clientSegmentation} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name} (${value})`} outerRadius={80} fill="#8884d8" dataKey="value">
                {clientSegmentation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Satisfaction Rating Distribution */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            Satisfaction Rating Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={clientSatisfaction} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="rating" type="category" width={70} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" name="Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trend */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          padding: '1.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
            Revenue & Client Growth Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={clientRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue ($)" />
              <Line yAxisId="right" type="monotone" dataKey="clients" stroke="#f59e0b" strokeWidth={2} name="Clients" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Clients Table */}
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '1.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>
          Top Clients
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Client Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Segment</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Orders</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Revenue</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Satisfaction</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((client) => (
                <tr key={client.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem', fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>{client.name}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: client.segment === 'Premium' ? '#fef3c7' : client.segment === 'Standard' ? '#dbeafe' : '#dcfce7',
                      color: client.segment === 'Premium' ? '#92400e' : client.segment === 'Standard' ? '#1e40af' : '#166534'
                    }}>
                      {client.segment}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '13px', color: '#1f2937' }}>{client.orders}</td>
                  <td style={{ padding: '0.75rem', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981' }}>
                    <DollarSign size={14} /> ${(client.revenue / 1000).toFixed(0)}k
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f59e0b' }}>
                    <Star size={14} fill="#f59e0b" /> {client.satisfaction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
