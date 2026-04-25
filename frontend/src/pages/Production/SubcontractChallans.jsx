import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  ChevronDown, 
  ExternalLink, 
  FileText, 
  ArrowUpRight, 
  ArrowDownLeft,
  Calendar,
  User,
  Package,
  Activity,
  Maximize2,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import * as productionService from '../../services/productionService';
import { useNotification } from '../../hooks/useNotification';
import SubcontractReceiptModal from '../../components/Production/SubcontractReceiptModal';

const SubcontractChallans = () => {
  const [outwardChallans, setOutwardChallans] = useState([]);
  const [inwardChallans, setInwardChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('outward');
  const [filters, setFilters] = useState({
    project_name: '',
    operation: '',
    vendor_id: ''
  });
  const [availableFilters, setAvailableFilters] = useState({
    project_names: [],
    operations: []
  });
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [challanItems, setChallanItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedChallanForReceipt, setSelectedChallanForReceipt] = useState(null);

  const { notifySuccess, notifyError } = useNotification();

  useEffect(() => {
    fetchFilters();
    fetchChallans();
  }, []);

  const handleDeleteOutward = async (id) => {
    if (!window.confirm('Are you sure you want to delete this outward challan? This will also update the job card sent quantity.')) {
      return;
    }

    try {
      const res = await productionService.deleteOutwardChallan(id);
      if (res.success) {
        notifySuccess('Challan deleted successfully');
        fetchChallans();
      } else {
        notifyError(res.message || 'Failed to delete challan');
      }
    } catch (error) {
      notifyError(error.response?.data?.message || 'Error deleting challan');
    }
  };

  const handleDeleteInward = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inward challan? This will reverse the production progress on the job card.')) {
      return;
    }

    try {
      const res = await productionService.deleteInwardChallan(id);
      if (res.success) {
        notifySuccess('Challan deleted successfully');
        fetchChallans();
      } else {
        notifyError(res.message || 'Failed to delete challan');
      }
    } catch (error) {
      notifyError(error.response?.data?.message || 'Error deleting challan');
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await productionService.getChallanFilters();
      if (response.success) {
        setAvailableFilters(response.data);
      }
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const [outResponse, inResponse] = await Promise.all([
        productionService.getAllOutwardChallans(filters),
        productionService.getAllInwardChallans(filters)
      ]);

      if (outResponse.success) setOutwardChallans(outResponse.data);
      if (inResponse.success) setInwardChallans(inResponse.data);
    } catch (error) {
      notifyError('Error fetching challans');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    fetchChallans();
  };

  const resetFilters = () => {
    setFilters({
      project_name: '',
      operation: '',
      vendor_id: ''
    });
    // fetchChallans will be called by useEffect if I trigger it
  };

  useEffect(() => {
    if (!loading) fetchChallans();
  }, [filters.project_name === '' && filters.operation === '' && filters.vendor_id === '']);

  const viewChallanDetails = async (challan) => {
    setSelectedChallan(challan);
    setLoadingItems(true);
    try {
      const response = activeTab === 'outward' 
        ? await productionService.getOutwardChallanItems(challan.id)
        : await productionService.getInwardChallanItems(challan.id);
        
      if (response.success) {
        setChallanItems(response.data);
      }
    } catch (error) {
      notifyError('Error fetching challan items');
    } finally {
      setLoadingItems(false);
    }
  };

  const closeDetails = () => {
    setSelectedChallan(null);
    setChallanItems([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          
          <h1 className="text-xl  text-slate-800">Subcontract Challans</h1>
        </div>
      </div>

      {/* Filters */}
      <div className=" flex gap-2 items-end">
        <div className="flex-1 ">
          <label className="block text-xs  text-slate-500 mb-1  ">Project Name</label>
          <div className="relative">
            <select
              name="project_name"
              value={filters.project_name}
              onChange={handleFilterChange}
              className="w-full pl-3 pr-10 p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="">All Projects</option>
              {availableFilters.project_names.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        <div className="">
          <label className="block text-xs  text-slate-500 mb-1  ">Operation</label>
          <div className="relative">
            <select
              name="operation"
              value={filters.operation}
              onChange={handleFilterChange}
              className="w-full pl-3 pr-10 p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="">All Operations</option>
              {availableFilters.operations.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        <button
          onClick={applyFilters}
          className=" p-2 bg-slate-800 text-white rounded text-xs  hover:bg-slate-700 transition-colors flex items-center gap-2"
        >
          <Search size={16} />
          Apply Filters
        </button>

        <button
          onClick={() => {
            resetFilters();
            fetchChallans();
          }}
          className="px-4 p-2 bg-slate-100 text-slate-600 rounded text-xs  hover:bg-slate-200 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Tabs */}
      <div className="flex my-3">
        <button
          onClick={() => setActiveTab('outward')}
          className={`p-2 text-xs  transition-all relative ${
            activeTab === 'outward' 
              ? 'text-blue-600' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowUpRight size={15} />
            Outward Challans
            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
              activeTab === 'outward' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {outwardChallans.length}
            </span>
          </div>
          {activeTab === 'outward' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('inward')}
          className={`p-2 text-xs  transition-all relative ${
            activeTab === 'inward' 
              ? 'text-emerald-600' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ArrowDownLeft size={15} />
            Inward Challans
            <span className={`ml-2 p-2 rounded text-xs ${
              activeTab === 'inward' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {inwardChallans.length}
            </span>
          </div>
          {activeTab === 'inward' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600"></div>
          )}
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded border border-slate-200">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-slate-500">Loading challans...</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-2 text-xs  text-slate-500 ">Challan Info</th>
                <th className="p-2 text-xs  text-slate-500 ">Project / Operation</th>
                <th className="p-2 text-xs  text-slate-500 ">Vendor</th>
                <th className="p-2 text-xs  text-slate-500 ">
                  {activeTab === 'outward' ? 'Dispatch Qty' : 'Accepted / Rejected'}
                </th>
                <th className="p-2 text-xs  text-slate-500  text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(activeTab === 'outward' ? outwardChallans : inwardChallans).map((challan) => (
                <tr key={challan.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span className="text-xs  text-slate-800">{challan.challan_number}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        {formatDate(activeTab === 'outward' ? challan.challan_date : challan.received_date)}
                      </div>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span className="text-xs  text-slate-700">{challan.project_name || 'No Project'}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{challan.operation}</span>
                    </div>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col">
                      <span className="text-xs  text-slate-700">{challan.vendor_name}</span>
                      <span className="text-xs text-slate-400 mt-0.5">ID: {challan.vendor_id}</span>
                    </div>
                  </td>
                  <td className="p-2">
                    {activeTab === 'outward' ? (
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs  text-blue-600">{challan.dispatch_quantity}</span>
                          <span className="text-xs text-slate-400">units</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-16 h-1.5 bg-slate-100 rounded overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500" 
                              style={{ width: `${Math.min(100, (challan.total_received / challan.dispatch_quantity) * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-slate-500">
                            {challan.total_received} received
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-xs  text-emerald-600">{challan.quantity_accepted}</span>
                          <span className="text-xs text-slate-400  ">Accepted</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div className="flex flex-col">
                          <span className="text-sm  text-rose-600">{challan.quantity_rejected}</span>
                          <span className="text-xs text-slate-400  ">Rejected</span>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      {activeTab === 'outward' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedChallanForReceipt({
                              ...challan,
                              outward_challan_id: challan.id,
                              sent_qty: challan.dispatch_quantity,
                              received_qty: challan.total_received
                            });
                            setReceiptModalOpen(true);
                          }}
                          disabled={challan.inward_challan_count > 0 || challan.total_received >= challan.dispatch_quantity}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Create Inward Challan"
                        >
                          <Plus size={15} />
                        </button>
                      )}
                      <button 
                        onClick={() => viewChallanDetails(challan)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                        title="View Details"
                      >
                        <Maximize2 size={15} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (activeTab === 'outward') {
                            handleDeleteOutward(challan.id);
                          } else {
                            handleDeleteInward(challan.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                        title="Delete Challan"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(activeTab === 'outward' ? outwardChallans : inwardChallans).length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No {activeTab} challans found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {selectedChallan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className={`p-2 text-white flex justify-between items-center ${activeTab === 'outward' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              <div>
                <h3 className="text-xl text-white">{selectedChallan.challan_number}</h3>
                <p className="text-blue-100/80 text-xs">{activeTab === 'outward' ? 'Outward' : 'Inward'} Subcontract Challan</p>
              </div>
              <button onClick={closeDetails} className="p-2 hover:bg-white/20 rounded transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-2 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs  text-slate-400 ">Vendor Information</label>
                    <p className="textsm  text-slate-800 mt-1">{selectedChallan.vendor_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">ID: {selectedChallan.vendor_id}</p>
                  </div>
                  <div>
                    <label className="text-xs  text-slate-400 ">Project / Operation</label>
                    <p className="textsm  text-slate-800 mt-1">{selectedChallan.project_name || 'N/A'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedChallan.operation}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs  text-slate-400 ">Date Information</label>
                    <p className="textsm  text-slate-800 mt-1">
                      {formatDate(activeTab === 'outward' ? selectedChallan.challan_date : selectedChallan.received_date)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Reference: {selectedChallan.job_card_id}</p>
                  </div>
                  <div>
                    <label className="text-xs  text-slate-400 ">Status</label>
                    <div className="mt-1">
                      <span className={`p-1 rounded text-xs  ${
                        selectedChallan.status === 'issued' || selectedChallan.status === 'received' 
                        ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {selectedChallan.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {activeTab === 'outward' && (
                <div className="border border-slate-200 rounded overflow-hidden">
                  <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs   text-slate-600 ">Dispatched Components</span>
                    <span className="text-xs   text-blue-600 bg-blue-50 px-2 py-1 rounded">Total: {selectedChallan.dispatch_quantity} units</span>
                  </div>
                  {loadingItems ? (
                    <div className="p-8 text-center text-slate-500">Loading items...</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white border-b border-slate-100">
                          <th className="p-2 text-xs  text-slate-400 ">Item Code</th>
                          <th className="p-2 text-xs  text-slate-400  text-right">Required</th>
                          <th className="p-2 text-xs  text-slate-400  text-right">Released</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {challanItems.map(item => (
                          <tr key={item.id}>
                            <td className="p-2 text-xs  text-slate-700">{item.item_code}</td>
                            <td className="p-2 text-xs text-slate-500 text-right">{item.required_qty} {item.uom}</td>
                            <td className="p-2 text-xs  text-blue-600 text-right">{item.release_qty} {item.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'inward' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-2 rounded border border-slate-100 text-center">
                      <span className="text-xs text-slate-400 block mb-1">Received</span>
                      <span className="text-xl text-slate-800">{selectedChallan.quantity_received}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                      <span className="text-xs text-emerald-400 block mb-1">Accepted</span>
                      <span className="text-xl text-emerald-600">{selectedChallan.quantity_accepted}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-rose-100 text-center">
                      <span className="text-xs text-rose-400 block mb-1">Rejected</span>
                      <span className="text-xl text-rose-600">{selectedChallan.quantity_rejected}</span>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded overflow-hidden">
                    <div className="bg-slate-50 p-2 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-xs text-slate-600">Received Items Breakdown</span>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Accepted: {selectedChallan.quantity_accepted}</span>
                    </div>
                    {loadingItems ? (
                      <div className="p-8 text-center text-slate-500">Loading items...</div>
                    ) : (
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-white border-b border-slate-100">
                            <th className="p-2 text-xs text-slate-400">Item</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Received</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Accepted</th>
                            <th className="p-2 text-xs text-slate-400 text-right">Rejected</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {challanItems.map(item => (
                            <tr key={item.id}>
                              <td className="p-2 text-xs text-slate-700">
                                {item.item_name || item.item_code}
                                <p className="text-[10px] text-slate-400">{item.item_code}</p>
                              </td>
                              <td className="p-2 text-xs text-slate-600 text-right">{item.received_qty} {item.uom}</td>
                              <td className="p-2 text-xs text-emerald-600 text-right font-medium">{item.accepted_qty} {item.uom}</td>
                              <td className="p-2 text-xs text-rose-600 text-right">{item.rejected_qty} {item.uom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {selectedChallan.notes && (
                <div className="mt-6">
                  <label className="text-xs  text-slate-400 ">Notes</label>
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 italic">
                    "{selectedChallan.notes}"
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-between">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTab === 'outward') {
                    handleDeleteOutward(selectedChallan.id);
                  } else {
                    handleDeleteInward(selectedChallan.id);
                  }
                  closeDetails();
                }}
                className="p-2 flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 rounded text-xs hover:bg-red-100 transition-colors"
              >
                <Trash2 size={14} />
                Delete Challan
              </button>

              <button 
                onClick={closeDetails}
                className=" p-2 bg-slate-800 text-white rounded text-xs  hover:bg-slate-700 transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptModalOpen && selectedChallanForReceipt && (
        <SubcontractReceiptModal
          isOpen={receiptModalOpen}
          onClose={() => {
            setReceiptModalOpen(false);
            setSelectedChallanForReceipt(null);
          }}
          jobCard={selectedChallanForReceipt}
          onReceiptSuccess={() => {
            fetchChallans();
          }}
        />
      )}
    </div>
  );
};

export default SubcontractChallans;
