import { useState } from 'react'
import Card from '../../components/Card/Card'
import Button from '../../components/Button/Button'
import Input from '../../components/Input/Input'
import Badge from '../../components/Badge/Badge'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '../../components/Table/Table'

export default function PurchaseOrderList() {
  const [searchTerm, setSearchTerm] = useState('')

  const purchaseOrders = [
    { id: 'PO-2025-001', supplier: 'ABC Industries', date: '2025-01-15', amount: '₹1,50,000', status: 'Submitted' },
    { id: 'PO-2025-002', supplier: 'XYZ Components', date: '2025-01-14', amount: '₹85,000', status: 'To Receive' },
    { id: 'PO-2025-003', supplier: 'Steel Suppliers Ltd', date: '2025-01-13', amount: '₹2,25,000', status: 'Partially Received' },
    { id: 'PO-2025-004', supplier: 'Premium Alloys', date: '2025-01-10', amount: '₹95,000', status: 'Completed' },
  ]

  const filteredPOs = purchaseOrders.filter(po =>
    po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    po.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const statusColor = (status) => {
    if (status === 'Completed') return 'success'
    if (status === 'To Receive' || status === 'Partially Received') return 'warning'
    return 'primary'
  }

  return (
    <div>
      <div className="flex-between mb-8">
        <h2 className="text-3xl font-bold text-[var(--text-primary)]">Purchase Orders</h2>
        <Button variant="primary">Create New PO</Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Search by PO ID or Supplier"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select className="input-base">
            <option>All Status</option>
            <option>Draft</option>
            <option>Submitted</option>
            <option>To Receive</option>
            <option>Completed</option>
          </select>
          <select className="input-base">
            <option>All Dates</option>
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
          </select>
        </div>
      </Card>

      {/* PO Table */}
      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>PO Number</TableHeader>
              <TableHeader>Supplier</TableHeader>
              <TableHeader>Order Date</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Actions</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPOs.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium text-[var(--primary-600)]">{po.id}</TableCell>
                <TableCell>{po.supplier}</TableCell>
                <TableCell>{po.date}</TableCell>
                <TableCell className="font-medium text-[var(--text-primary)]">{po.amount}</TableCell>
                <TableCell>
                  <Badge variant={statusColor(po.status)}>
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button className="text-[var(--primary-600)] hover:text-[var(--primary-700)] text-sm">View</button>
                    <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">Download</button>
                    <button className="text-[var(--danger-600)] hover:text-[var(--danger-700)] text-sm">Cancel</button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
