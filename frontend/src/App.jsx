import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/AuthContext'
import { ToastProvider } from './components/ToastContainer'
import ProtectedRoute from './components/ProtectedRoute'
import DepartmentProtectedRoute from './components/DepartmentProtectedRoute'
import DepartmentLayout from './components/DepartmentLayout'
import LoginPage from './pages/LoginPage'
import DepartmentDashboard from './pages/DepartmentDashboard'
import SupplierList from './pages/Suppliers/SupplierList'
import EmployeeList from './pages/Masters/EmployeeList'
import PurchaseOrderList from './pages/PurchaseOrder/PurchaseOrderList'


import {
  PurchaseOrders,
  PurchaseOrderForm,
  PurchaseReceipts,
  PurchaseInvoices,
  Items
} from './pages/Buying'
import GRNRequestDetail from './pages/Buying/GRNRequestDetail'
import MaterialRequests from './pages/Buying/MaterialRequests'
import MaterialRequestForm from './pages/Buying/MaterialRequestForm'
import RFQs from './pages/Buying/RFQs'
import RFQForm from './pages/Buying/RFQForm'
import SupplierQuotations from './pages/Buying/SupplierQuotations'
import QuotationForm from './pages/Buying/QuotationForm'
import ItemForm from './pages/Buying/ItemForm'
import BuyingAnalytics from './pages/Buying/BuyingAnalytics'
import {
  Quotation,
  SalesOrder,
  DeliveryNote,
  SalesInvoice,
  Customers,
  SellingAnalytics
} from './pages/Selling'
import SalesQuotationForm from './pages/Selling/SalesQuotationForm'
import SalesOrderForm from './pages/Selling/SalesOrderForm'
import {
  InventoryDashboard,
  Warehouses,
  StockBalance,
  StockEntries,
  StockLedger,
  StockTransfers,
  BatchTracking,
  Reconciliation,
  ReorderManagement,
  InventoryAnalytics,
  GRNRequests
} from './pages/Inventory'
import {
  ToolRoomDashboard,
  ToolMasterList,
  DieRegisterList,
  MaintenanceSchedule,
  ToolRoomAnalytics
} from './pages/ToolRoom'
import {
  ProductionOrders,
  ProductionSchedule,
  ProductionEntries,
  BatchTracking as ProductionBatchTracking,
  QualityRecords,
  ProductionAnalytics,
  BOM,
  ProductionPlan,
  ProductionPlanForm,
  WorkOrder,
  WorkOrderTracking,
  JobCard,
  BOMForm
} from './pages/Production'
import './App.css'
import WorkOrderForm from './pages/Production/WorkOrderForm'
import Operations from './pages/Production/Operations'
import OperationForm from './pages/Production/OperationForm'
import Workstations from './pages/Production/Workstations'
import WorkstationForm from './pages/Production/WorkstationForm'

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
                <DepartmentLayout>
                  <DepartmentDashboard />
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/production/operations/form" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><OperationForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
<Route path="/production/operations/form/:id" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><OperationForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />

<Route
  path="/production/operations"
  element={
    <ProtectedRoute>
      <DepartmentLayout>
        <DepartmentProtectedRoute departments={['production', 'admin']}>
          <Operations />
        </DepartmentProtectedRoute>
      </DepartmentLayout>
    </ProtectedRoute>
  }
/>

<Route path="/production/workstations/form" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><WorkstationForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
<Route path="/production/workstations/form/:id" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><WorkstationForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />

<Route
  path="/production/workstations"
  element={
    <ProtectedRoute>
      <DepartmentLayout>
        <DepartmentProtectedRoute departments={['production', 'admin']}>
          <Workstations />
        </DepartmentProtectedRoute>
      </DepartmentLayout>
    </ProtectedRoute>
  }
/>

          {/* Legacy Routes */}
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <SupplierList />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <PurchaseOrderList />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - Material Requests */}
          <Route
            path="/buying/material-requests"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <MaterialRequests />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/material-requests/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <MaterialRequestForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/production/work-orders/form" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><WorkOrderForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
<Route path="/production/work-orders/form/:id" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><WorkOrderForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />

          <Route
            path="/buying/material-request/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <MaterialRequestForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - RFQs */}
          <Route
            path="/buying/rfqs"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <RFQs />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/rfqs/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <RFQForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/rfq/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <RFQForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - Supplier Quotations */}
          <Route
            path="/buying/quotations"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <SupplierQuotations />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/quotations/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <QuotationForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/quotation/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <QuotationForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - Purchase Orders */}
          <Route
            path="/buying/purchase-orders"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <PurchaseOrders />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/purchase-orders/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <PurchaseOrderForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buying/purchase-order/:po_no"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <PurchaseOrderForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - Purchase Receipts */}
          <Route
            path="/buying/purchase-receipts"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <PurchaseReceipts />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - GRN Request Detail */}
          <Route
            path="/buying/grn-requests/:grnNo"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'inventory', 'admin']}>
                    <GRNRequestDetail />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Buying Module - Purchase Invoices */}
          <Route
            path="/buying/purchase-invoices"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <PurchaseInvoices />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Masters */}
          <Route
            path="/buying/items"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <Items />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/masters/suppliers"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <SupplierList />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/masters/items"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <Items />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/masters/employees"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['admin']}>
                    <EmployeeList />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/buying/item/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <ItemForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/buying/item/:item_code"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <ItemForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/masters/item/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <ItemForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/masters/item/:item_code"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <ItemForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Analytics */}
          <Route
            path="/analytics/buying"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['buying', 'admin']}>
                    <BuyingAnalytics />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Selling Module - Quotations */}
          <Route
            path="/selling/quotations"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <Quotation />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/quotations/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesQuotationForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/quotations/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesQuotationForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Selling Module - Sales Orders */}
          <Route
            path="/selling/sales-orders"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesOrder />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/sales-orders/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesOrderForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/sales-orders/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesOrderForm />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Selling Module - Delivery Notes */}
          <Route
            path="/selling/delivery-notes"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <DeliveryNote />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/delivery-notes/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <DeliveryNote />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/delivery-notes/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <DeliveryNote />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Selling Module - Sales Invoices */}
          <Route
            path="/selling/sales-invoices"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesInvoice />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/sales-invoices/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesInvoice />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/sales-invoices/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SalesInvoice />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Selling Module - Customers */}
          <Route
            path="/selling/customers"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <Customers />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/customers/new"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <Customers />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/selling/customers/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <Customers />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Selling Analytics */}
          <Route
            path="/analytics/selling"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['selling', 'admin']}>
                    <SellingAnalytics />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Module - Dashboard */}
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

          {/* Inventory Module - Warehouses */}
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

          {/* Inventory Module - Stock Balance */}
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

          {/* Inventory Module - Stock Entries */}
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

          {/* Inventory Module - Stock Ledger */}
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

          {/* Inventory Module - Stock Transfers */}
          <Route
            path="/inventory/stock-transfers"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                    <StockTransfers />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Module - Batch Tracking */}
          <Route
            path="/inventory/batch-tracking"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                    <BatchTracking />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Module - Reconciliation */}
          <Route
            path="/inventory/reconciliation"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                    <Reconciliation />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Module - Reorder Management */}
          <Route
            path="/inventory/reorder-management"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                    <ReorderManagement />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Module - GRN Requests */}
          <Route
            path="/inventory/grn-requests"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                    <GRNRequests />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Inventory Analytics */}
          <Route
            path="/analytics/inventory"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['inventory', 'admin']}>
                    <InventoryAnalytics />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Tool Room Module - Dashboard */}
          <Route
            path="/toolroom/dashboard"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['toolroom', 'production', 'admin']}>
                    <ToolRoomDashboard />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Tool Room Module - Tool Master */}
          <Route
            path="/toolroom/tools"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['toolroom', 'production', 'admin']}>
                    <ToolMasterList />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Tool Room Module - Die Register */}
          <Route
            path="/toolroom/die-register"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['toolroom', 'production', 'admin']}>
                    <DieRegisterList />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Tool Room Module - Maintenance */}
          <Route
            path="/toolroom/maintenance"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['toolroom', 'production', 'admin']}>
                    <MaintenanceSchedule />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />

          {/* Tool Room Module - Analytics */}
          <Route
            path="/analytics/toolroom"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['toolroom', 'production', 'admin']}>
                    <ToolRoomAnalytics />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Production Module Routes */}
          <Route
            path="/production/orders"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <ProductionOrders />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/schedule"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <ProductionSchedule />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/entries"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <ProductionEntries />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/batch-tracking"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <ProductionBatchTracking />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/quality"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <QualityRecords />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/boms"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <BOM />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/production/boms/form" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><BOMForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
          <Route path="/production/boms/form/:id" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><BOMForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
          <Route
            path="/production/plans"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <ProductionPlan />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/production/plans/form" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><ProductionPlanForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
          <Route path="/production/plans/form/:id" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><ProductionPlanForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
          <Route
            path="/production/work-orders"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <WorkOrder />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/production/work-orders/form" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><WorkOrderForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
          <Route path="/production/work-orders/form/:id" element={<ProtectedRoute><DepartmentLayout><DepartmentProtectedRoute departments={['production', 'admin']}><WorkOrderForm /></DepartmentProtectedRoute></DepartmentLayout></ProtectedRoute>} />
          <Route
            path="/production/work-orders/track/:id"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <WorkOrderTracking />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/job-cards"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <JobCard />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics/production"
            element={
              <ProtectedRoute>
                <DepartmentLayout>
                  <DepartmentProtectedRoute departments={['production', 'admin']}>
                    <ProductionAnalytics />
                  </DepartmentProtectedRoute>
                </DepartmentLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </ToastProvider>
    </Router>
  )
}

export default App