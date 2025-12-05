import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, TrendingUp, DollarSign, Truck, FileText, Package, Calendar } from 'lucide-react';
import Card from '../../components/Card/Card';
import Alert from '../../components/Alert/Alert';
import Button from '../../components/Button/Button';
import { API_BASE_URL } from '../../services/api';
import './Buying.css';

export default function BuyingAnalytics() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [poTrends, setPoTrends] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [invoiceAnalytics, setInvoiceAnalytics] = useState(null);
  const [agingAnalysis, setAgingAnalysis] = useState(null);
  const [overduePOs, setOverduePOs] = useState([]);
  const [pendingGRNs, setPendingGRNs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, trendsRes, suppliersRes, invoiceRes, agingRes, overdueRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/buying/summary`),
        fetch(`${API_BASE_URL}/analytics/buying/po-trends?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        fetch(`${API_BASE_URL}/analytics/buying/top-suppliers?limit=10`),
        fetch(`${API_BASE_URL}/analytics/buying/invoices`),
        fetch(`${API_BASE_URL}/analytics/buying/aging`),
        fetch(`${API_BASE_URL}/analytics/buying/overdue-pos`),
        fetch(`${API_BASE_URL}/analytics/buying/pending-grns`)
      ]);

      const summaryData = await summaryRes.json();
      const trendsData = await trendsRes.json();
      const suppliersData = await suppliersRes.json();
      const invoiceData = await invoiceRes.json();
      const agingData = await agingRes.json();
      const overdueData = await overdueRes.json();
      const pendingData = await pendingRes.json();

      setSummary(summaryData.data);
      setPoTrends(trendsData.data || []);
      setTopSuppliers(suppliersData.data || []);
      setInvoiceAnalytics(invoiceData.data);
      setAgingAnalysis(agingData.data);
      setOverduePOs(overdueData.data || []);
      setPendingGRNs(pendingData.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="buying-container">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Buying Analytics</h2>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">Real-time insights and performance metrics for procurement</p>
      </div>

      {/* Date Range Selector */}
      <Card className="mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">From Date</label>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-neutral-500" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">To Date</label>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-neutral-500" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Total POs</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">{summary?.purchase_orders?.total_pos || 0}</p>
            </div>
            <Truck className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
          <p className="text-green-600 dark:text-green-400 text-sm mt-4 font-medium">✓ {summary?.purchase_orders?.completed_count || 0} Completed</p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Total PO Value</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">₹{summary?.purchase_orders?.total_value?.toLocaleString() || 0}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-500 opacity-20" />
          </div>
          <p className="text-blue-600 dark:text-blue-400 text-sm mt-4 font-medium">Avg: ₹{summary?.purchase_orders?.avg_value?.toLocaleString()}</p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Total Invoices</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">{summary?.invoices?.total_invoices || 0}</p>
            </div>
            <FileText className="w-12 h-12 text-orange-500 opacity-20" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-4 font-medium">⚠ ₹{summary?.invoices?.pending_amount?.toLocaleString()} Pending</p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 border-l-4 border-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">Paid Amount</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mt-2">₹{summary?.invoices?.paid_amount?.toLocaleString() || 0}</p>
            </div>
            <Package className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-4 font-medium">{summary?.invoices?.paid_count || 0} Invoices Paid</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'suppliers', label: 'Top Suppliers' },
          { id: 'trends', label: 'Trends' },
          { id: 'alerts', label: 'Alerts' },
          { id: 'aging', label: 'Aging Analysis' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content by Tab */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6">PO Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Draft', value: summary?.purchase_orders?.draft_count || 0 },
                      { name: 'Submitted', value: summary?.purchase_orders?.submitted_count || 0 },
                      { name: 'Completed', value: summary?.purchase_orders?.completed_count || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6">Invoice Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { status: 'Draft', count: summary?.invoices?.draft_count || 0 },
                    { status: 'Submitted', count: summary?.invoices?.submitted_count || 0 },
                    { status: 'Paid', count: summary?.invoices?.paid_count || 0 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="status" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <Card>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6">Top 10 Suppliers by PO Value</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100">Supplier</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100">POs</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100">Total Value</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100">Avg Value</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {topSuppliers.map((supplier) => (
                    <tr key={supplier.supplier_id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
                      <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100 font-medium">{supplier.supplier_name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{supplier.po_count}</td>
                      <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100 font-semibold">₹{supplier.total_value?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">₹{supplier.avg_po_value?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-semibold">
                          {supplier.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <Card>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6">PO Trends (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={poTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis yAxisId="left" stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="po_count" stroke="#3B82F6" name="PO Count" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="total_value" stroke="#10B981" name="Total Value (₹)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg font-bold text-red-900 dark:text-red-300">Overdue POs ({overduePOs.length})</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {overduePOs.length > 0 ? (
                  overduePOs.map((po) => (
                    <div key={po.po_id} className="text-sm text-red-800 dark:text-red-200 bg-white dark:bg-neutral-800 p-3 rounded border border-red-100 dark:border-red-800">
                      <p className="font-semibold">{po.po_number} - {po.supplier_name}</p>
                      <p>Overdue by {po.days_overdue} days</p>
                      <p className="text-xs">Value: ₹{po.po_value?.toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-red-600 dark:text-red-400">No overdue POs</p>
                )}
              </div>
            </Card>

            <Card className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-500">
              <div className="flex items-center gap-3 mb-6">
                <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300">Pending GRNs ({pendingGRNs.length})</h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingGRNs.length > 0 ? (
                  pendingGRNs.map((grn) => (
                    <div key={grn.po_id} className="text-sm text-amber-800 dark:text-amber-200 bg-white dark:bg-neutral-800 p-3 rounded border border-amber-100 dark:border-amber-800">
                      <p className="font-semibold">{grn.po_number} - {grn.supplier_name}</p>
                      <p>Pending Qty: {grn.pending_qty}</p>
                      <p className="text-xs">Value: ₹{grn.po_value?.toLocaleString()}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-600 dark:text-amber-400">No pending GRNs</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Aging Analysis Tab */}
        {activeTab === 'aging' && (
          <Card>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-6">Invoice Aging Analysis</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={[
                  { period: 'Current (0-30)', amount: agingAnalysis?.current || 0 },
                  { period: '30-60 Days', amount: agingAnalysis?.thirty_to_sixty || 0 },
                  { period: '60-90 Days', amount: agingAnalysis?.sixty_to_ninety || 0 },
                  { period: '90+ Days', amount: agingAnalysis?.above_ninety || 0 }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip formatter={(value) => `₹${value?.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Current (0-30)</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">₹{agingAnalysis?.current?.toLocaleString() || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">30-60 Days</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">₹{agingAnalysis?.thirty_to_sixty?.toLocaleString() || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">60-90 Days</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">₹{agingAnalysis?.sixty_to_ninety?.toLocaleString() || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">90+ Days</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">₹{agingAnalysis?.above_ninety?.toLocaleString() || 0}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}