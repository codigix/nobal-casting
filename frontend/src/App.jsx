import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthContext'
import { ToastProvider } from './components/ToastContainer'
import ProtectedRoute from './components/ProtectedRoute'
import DepartmentProtectedRoute from './components/DepartmentProtectedRoute'
import DepartmentLayout from './components/DepartmentLayout'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import DepartmentDashboard from './pages/DepartmentDashboard'

import {
  PurchaseReceipts,
  Items,
  ItemForm,
  ItemGroups,
  GRNRequestDetail,
  MaterialRequests
} from './pages/Buying'

import {
  InventoryDashboard,
  Warehouses,
  StockBalance,
  StockEntries,
  StockLedger,
  Suppliers,
  GRNManagement,
  StockMovements
} from './pages/Inventory'

import {
  BOM,
  ProductionDashboard,
  ProductionPlan,
  ProductionPlanning,
  ProductionPlanningForm,
  ProductionStages,
  WorkOrder,
  WorkOrderForm,
  JobCard,
  ProductionEntry,
  BOMForm,
  Customers,
  Operations,
  OperationForm,
  Workstations,
  WorkstationForm
} from './pages/Production'

import {
  SalesOrder,
  SalesOrderForm
} from './pages/Selling'

import './App.css'
import { ProjectAnalysis, MachineAnalysis, CustomerStatistics, OEE, EmployeesDesignations, AdminPanel } from './pages/Admin'

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected Routes with Department Layout */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/manufacturing/dashboard"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentDashboard />
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* ===================== */}
            {/* INVENTORY DEPARTMENT */}
            {/* ===================== */}

            {/* Inventory Dashboard */}
            <Route
              path="/inventory/dashboard"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <InventoryDashboard />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Purchase Receipts */}
            <Route
              path="/inventory/purchase-receipts"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <PurchaseReceipts />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Warehouses */}
            <Route
              path="/inventory/warehouses"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <Warehouses />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Stock Entries */}
            <Route
              path="/inventory/stock-entries"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <StockEntries />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Stock Balance */}
            <Route
              path="/inventory/stock-balance"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <StockBalance />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Stock Ledger */}
            <Route
              path="/inventory/stock-ledger"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <StockLedger />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Stock Movements */}
            <Route
              path="/inventory/stock-movements"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <StockMovements />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Suppliers */}
            <Route
              path="/inventory/suppliers"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <Suppliers />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* GRN Management */}
            <Route
              path="/inventory/grn-management"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <GRNManagement />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* GRN Request Detail */}
            <Route
              path="/inventory/grn/:grnNo"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <GRNRequestDetail />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Material Requests (Inventory View) */}
            <Route
              path="/inventory/material-requests"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                      <MaterialRequests />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* ========================== */}
            {/* MANUFACTURING DEPARTMENT */}
            {/* ========================== */}

            {/* Manufacturing Dashboard */}
            <Route
              path="/manufacturing/dashboard"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <DepartmentDashboard />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Production Stages */}
            <Route
              path="/manufacturing/production-stages"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ProductionStages />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Customers */}
            <Route
              path="/manufacturing/customers"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <Customers />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Items */}
            <Route
              path="/manufacturing/items"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <Items />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/items/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ItemForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/items/:item_code"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ItemForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Item Groups */}
            <Route
              path="/manufacturing/item-groups"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ItemGroups />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* BOM */}
            <Route
              path="/manufacturing/bom"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <BOM />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/bom/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <BOMForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/bom/:id"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <BOMForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Sales Order */}
            <Route
              path="/manufacturing/sales-orders"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <SalesOrder />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/sales-orders/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <SalesOrderForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/sales-orders/:id"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <SalesOrderForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Production Planning */}
            <Route
              path="/manufacturing/production-planning"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ProductionPlanning />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/production-planning/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ProductionPlanningForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/production-planning/:plan_id"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ProductionPlanningForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Work Order */}
            <Route
              path="/manufacturing/work-orders/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <WorkOrderForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/work-orders/:id"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <WorkOrderForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/work-orders"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <WorkOrder />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Job Card */}
            <Route
              path="/manufacturing/job-cards"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <JobCard />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Production Entry */}
            <Route
              path="/manufacturing/job-cards/:jobCardId/production-entry"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <ProductionEntry />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Workstations */}
            <Route
              path="/manufacturing/workstations"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <Workstations />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/workstations/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <WorkstationForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/workstations/:id"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <WorkstationForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Operations */}
            <Route
              path="/manufacturing/operations"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <Operations />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/operations/new"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <OperationForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/manufacturing/operations/:id"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['manufacturing', 'admin']}>
                      <OperationForm />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* ==================== */}
            {/* ADMIN DEPARTMENT */}
            {/* ==================== */}

            {/* Admin Dashboard */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <DepartmentDashboard />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Project Analysis */}
            <Route
              path="/admin/project-analysis"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <ProjectAnalysis />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Machine Analysis */}
            <Route
              path="/admin/machine-analysis"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <MachineAnalysis />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Customer Statistics */}
            <Route
              path="/admin/customer-statistics"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <CustomerStatistics />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* OEE Analysis */}
            <Route
              path="/admin/oee"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <OEE />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Employees & Designations */}
            <Route
              path="/admin/employees-designations"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <EmployeesDesignations />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin Panel */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <DepartmentLayout>
                    <DepartmentProtectedRoute departments={['admin']}>
                      <AdminPanel />
                    </DepartmentProtectedRoute>
                  </DepartmentLayout>
                </ProtectedRoute>
              }
            />

            {/* Catch-all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </Router>
  )
}

export default App
