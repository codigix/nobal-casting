import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Activity,
  ShoppingCart,
  Layers,
  Factory,
  ClipboardList,
  AlertCircle,
  ExternalLink,
  Target,
  User,
  Calendar,
  Box,
  Zap,
  ChevronDown,
  Maximize2,
  Minimize2,
  FileText,
  Download
} from 'lucide-react';
import api from '../../services/api';

// --- Styled Components ---

const StatusBadge = ({ status }) => {
  const s = (status || 'draft').toLowerCase();
  let colors = 'bg-slate-100 text-slate-600 border-slate-200';
  
  if (s.includes('complete') || s === 'finished' || s === 'approved' || s === 'released') {
    colors = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s.includes('progress') || s === 'started' || s === 'confirmed') {
    colors = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (s.includes('ready') || s === 'pending') {
    colors = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s.includes('cancel') || s === 'rejected' || s === 'stopped') {
    colors = 'bg-rose-50 text-rose-700 border-rose-200';
  }

  return (
    <div className={`px-2 py-0.5 rounded text-[10px]   tracking-wider border ${colors}`}>
      {status}
    </div>
  );
};

const JobCardItem = ({ jc }) => {
  const progress = jc.planned_quantity > 0 ? (jc.produced_quantity / jc.planned_quantity) * 100 : 0;
  
  return (
    <div className="flex flex-col gap-1 p-2 bg-white border border-slate-200 rounded shadow-sm hover:border-violet-300 transition-colors w-44">
      <div className="flex items-center gap-2">
        <div className="p-1 bg-violet-50 text-violet-600 rounded">
          <ClipboardList size={12} />
        </div>
        <div className="text-[10px]  text-slate-800 truncate">{jc.job_card_id}</div>
      </div>
      <div className="text-[9px] font-medium text-slate-500 text-center w-fit m-auto bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate">
        {jc.operation}
      </div>

      {/* Progress Section */}
      <div className="mt-1">
        <div className="flex justify-between text-[7px]  text-slate-400   mb-0.5">
          <span>Progress</span>
          <span>{jc.produced_quantity} / {jc.planned_quantity}</span>
        </div>
        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${progress >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 mt-1 border-t border-slate-50 pt-1">
        <div className="flex flex-col">
          <span className="text-[6px]   text-slate-300 leading-none">Machine</span>
          <span className="text-[8px]  text-slate-500 truncate">{jc.machine_id || 'N/A'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[6px]   text-slate-300 leading-none">Operator</span>
          <span className="text-[8px]  text-slate-500 truncate">{jc.operator_id || 'N/A'}</span>
        </div>
      </div>

      <div className="flex justify-center items-center mt-1">
        <div className="text-[8px]   text-slate-400">Execution</div>
        <div className={`text-[8px]  px-1.5 py-0.5 rounded-full ${
          jc.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 
          jc.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'
        }`}>
          {jc.status}
        </div>
      </div>
    </div>
  );
};

const Node = ({ type, id, status, title, subtitle, icon: Icon, metadata = {} }) => {
  const configs = {
    so: 'border-orange-200 bg-orange-50 text-orange-700 icon-bg-orange-100',
    pp: 'border-blue-200 bg-blue-50 text-blue-700 icon-bg-blue-100',
    wo: 'border-emerald-200 bg-emerald-50 text-emerald-700 icon-bg-emerald-100',
    jc: 'border-violet-200 bg-violet-50 text-violet-700 icon-bg-violet-100',
  };

  const config = configs[type] || configs.wo;
  const iconBg = config.split(' ').find(c => c.startsWith('icon-bg-')).replace('icon-bg-', 'bg-');

  return (
    <div className="flex flex-col items-center group">
      <div className={`w-52 bg-white rounded border-2 ${config.split(' ')[0]} overflow-hidden transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1`}>
        {/* Header */}
        <div className={`p-2 flex items-center gap-2 border-b ${config.split(' ')[0]}`}>
          <div className={`p-1.5 rounded ${iconBg} ${config.split(' ')[2]}`}>
            {Icon && <Icon size={14} />}
          </div>
          <div className="min-w-0">
            <div className="text-xs   text-slate-400 leading-none mb-0.5">{title}</div>
            <div className="text-xs  text-slate-800 truncate">{id}</div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 bg-white text-center">
          <div className="text-[11px]  text-slate-600 mb-2 truncate">
            {subtitle || 'No details available'}
          </div>
          
          {/* Metadata Row */}
          {Object.keys(metadata).length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {Object.entries(metadata).map(([key, val], idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-[7px]   text-slate-300  leading-none mb-0.5">{key}</span>
                  <span className="text-[9px]  text-slate-500 truncate">{val || 'N/A'}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center items-center">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
    </div>
  );
};

const TreeBranch = ({ children, label, showTopLine = true }) => {
  if (!children || React.Children.count(children) === 0) return null;
  const count = React.Children.count(children);
  
  return (
    <div className={`relative flex flex-col items-center ${showTopLine ? 'pt-6' : 'pt-0'}`}>
      {/* Label on the vertical line */}
      {showTopLine && label && (
        <div className="absolute top-4 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[8px]  text-blue-600  z-10">
          {label}
        </div>
      )}

      {/* Vertical line from parent down to the bridge */}
      {showTopLine && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 border-l-2 border-slate-200 h-12" />
      )}

      <div className="flex gap-4 items-start relative">
        {React.Children.map(children, (child, idx) => (
          <div key={idx} className="relative flex flex-col items-center pt-8">
            {/* Horizontal bridge segments */}
            {count > 1 && (
              <div className="absolute top-0 w-full h-0 border-t-2 border-slate-200"
                style={{
                  left: idx === 0 ? '50%' : '0',
                  right: idx === count - 1 ? '50%' : '0',
                  width: idx === 0 || idx === count - 1 ? '50%' : '100%'
                }}
              />
            )}
            
            {/* Vertical line down to the child node */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 border-l-2 border-slate-200 h-8" />
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};

const SvgConnector = ({ type = 'straight', height = 30, isDotted = false, label }) => {
  return (
    <div className="relative flex flex-col items-center w-full" style={{ height }}>
      <div className={`w-0 h-full border-l-2 ${isDotted ? 'border-dashed border-slate-300' : 'border-solid border-slate-200'}`} />
      {label && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 bg-white border border-slate-200 rounded text-[8px]  text-slate-400  z-10 whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
};

export default function ProductionHierarchy() {
  const { sales_order_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(0.85);

  useEffect(() => {
    fetchHierarchy();
  }, [sales_order_id]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/production-planning/hierarchy/sales-order/${sales_order_id}`);
      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError(res.data.error || 'Failed to fetch hierarchy');
      }
    } catch (err) {
      console.error('Error fetching hierarchy:', err);
      setError('Internal server error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Activity className="text-blue-600 animate-spin mb-4" size={48} />
          <h2 className="text-xl  text-slate-900 ">Initializing Crystal Map...</h2>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center border border-slate-100 max-w-md">
          <AlertCircle className="mx-auto text-rose-500 mb-6" size={64} />
          <h2 className="text-2xl  text-slate-900 mb-2 tracking-tight">Mapping Engine Halted</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">{error}</p>
          <button onClick={() => navigate(-1)} className="w-full py-4 bg-slate-900 text-black/50 rounded-xl  tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
            TERMINATE & RETURN
          </button>
        </div>
      </div>
    );
  }

  const { salesOrder, plans, workOrders, jobCards, dependencies } = data;

  // Manufacturing Logic Grouping
  const childWoIds = dependencies.map(d => d.child_wo_id);
  
  const renderWorkOrderNode = (wo, level = 0) => {
    const woJCs = jobCards.filter(jc => jc.work_order_id === wo.wo_id);
    
    // Combine children from parent_wo_id column and dependencies table
    const directChildren = workOrders.filter(w => w.parent_wo_id === wo.wo_id);
    const dependencyChildIds = dependencies.filter(d => d.parent_wo_id === wo.wo_id).map(d => d.child_wo_id);
    const dependencyChildren = workOrders.filter(w => dependencyChildIds.includes(w.wo_id));
    
    // Deduplicate children
    const combinedChildren = [...directChildren, ...dependencyChildren].reduce((acc, current) => {
      const exists = acc.find(item => item.wo_id === current.wo_id);
      if (!exists) acc.push(current);
      return acc;
    }, []);

    return (
      <div key={wo.wo_id} className="flex flex-col items-center">
        {/* Work Order Node */}
        <Node 
          type="wo"
          id={level === 0 ? wo.wo_id : (wo.item_name || wo.item_code)}
          status={wo.status}
          title={level === 0 ? "Final Work Order" : "Sub-Assembly WO"}
          icon={Factory}
          subtitle={level === 0 ? (wo.item_name || wo.item_code) : wo.wo_id}
          metadata={{
            "Item Code": wo.item_code,
            "Target Qty": wo.quantity,
            "Delivery": wo.expected_delivery_date ? new Date(wo.expected_delivery_date).toLocaleDateString() : 'N/A'
          }}
        />
        
        {/* Operations/Job Cards - Positioned BELOW */}
        {woJCs.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <SvgConnector type="straight" height={30} isDotted={true} label="Ops" />
            <div className="flex flex-col gap-2 items-center">
              {woJCs.map(jc => (
                <JobCardItem key={jc.job_card_id} jc={jc} />
              ))}
            </div>
            {/* If there are children, we need a connector from the last JC to the TreeBranch */}
            {combinedChildren.length > 0 && (
               <SvgConnector type="straight" height={30} isDotted={false} />
            )}
          </div>
        )}

        {/* Recursive Children with TreeBranch */}
        {combinedChildren.length > 0 && (
          <TreeBranch label="Component Parts" showTopLine={woJCs.length === 0}>
            {combinedChildren.map(child => renderWorkOrderNode(child, level + 1))}
          </TreeBranch>
        )}
      </div>
    );
  };

  const rootWOs = workOrders.filter(wo => !wo.parent_wo_id && !childWoIds.includes(wo.wo_id));
  const directWOs = rootWOs.filter(wo => !wo.production_plan_id);

  const handleDownloadPDF = () => {
    // We use a print-based approach which is robust for complex SVG hierarchies
    const originalZoom = zoom;
    setZoom(1.0); // Reset zoom for best print quality
    setTimeout(() => {
      window.print();
      setZoom(originalZoom); // Restore user zoom
    }, 500);
  };

  return (
    <div className="min-h-screen bg-white relative selection:bg-blue-100 flex flex-col">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            height: auto;
            display: flex !important;
            justify-content: center !important;
            padding: 20px !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
      
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none no-print" />

      {/* Header Bar - Not Fixed to avoid sidebar overlap */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 bg-white rounded  border border-slate-100 hover:bg-slate-50 transition-all group">
            <ArrowLeft size={18} className="text-slate-600 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-xl  text-slate-900  leading-none">Production Hierarchy</h1>
            <p className="text-[9px]  text-blue-600  mt-1">End-to-End Operational DNA</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 p-2 text-black/50 rounded bg-orange-100 transition-all ">
            <Download size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Download PDF</span>
          </button>
          <div className="flex bg-slate-50 rounded border border-slate-200 p-0.5">
            <button onClick={() => setZoom(Math.max(0.4, zoom - 0.1))} className="p-1.5 hover:bg-white hover: rounded-md text-slate-500 transition-all"><Minimize2 size={14} /></button>
            <div className="px-2 flex items-center text-[9px]  text-slate-400">{Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className="p-1.5 hover:bg-white hover: rounded-md text-slate-500 transition-all"><Maximize2 size={14} /></button>
          </div>
          <button onClick={fetchHierarchy} className="p-2 bg-white rounded  border border-slate-200 text-blue-600 hover:bg-slate-50 transition-all">
            <Activity size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div 
        className="flex-grow overflow-auto p-2 flex justify-center bg-transparent relative print-area"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div 
          className="flex flex-col items-center transition-transform duration-500 ease-out origin-top"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Node 0: Sales Order */}
          <Node 
            type="so" 
            id={salesOrder.sales_order_id} 
            status={salesOrder.status} 
            title="Sales Order"
            icon={ShoppingCart}
            subtitle={salesOrder.customer_name}
            metadata={{
              "Value": `₹${salesOrder.order_amount?.toLocaleString('en-IN')}`,
              "Delivery": salesOrder.delivery_date ? new Date(salesOrder.delivery_date).toLocaleDateString() : 'N/A'
            }}
          />

          <SvgConnector type="straight" height={30} />

          {/* Node 1: Production Plan(s) */}
          {plans.length > 0 ? plans.map((plan, pIdx) => {
            const planRootWOs = rootWOs.filter(wo => wo.production_plan_id === plan.plan_id);
            return (
              <React.Fragment key={plan.plan_id}>
                <Node 
                  type="pp" 
                  id={plan.plan_id} 
                  status={plan.status} 
                  title="Production Plan"
                  icon={Layers}
                  subtitle={`Plan Date: ${new Date(plan.plan_date).toLocaleDateString()}`}
                  metadata={{
                    "BOM": plan.bom_id || 'Not Specified'
                  }}
                />

                <SvgConnector type="straight" height={30} label="Manufacturing Execution Map" isDotted={true} />

                {/* Recursive Work Order Tree */}
                {planRootWOs.length > 0 ? (
                  <TreeBranch>
                    {planRootWOs.map((rootWo) => renderWorkOrderNode(rootWo, 0))}
                  </TreeBranch>
                ) : (
                  <div className="px-16 py-8 border-2 border-dashed border-slate-100 rounded-2xl text-[10px]  text-slate-200  tracking-[0.3em] flex flex-col items-center gap-4">
                    <Factory size={32} />
                    No Work Orders Linked to this Plan
                  </div>
                )}
                {pIdx < plans.length - 1 && <div className="h-24 w-px bg-slate-100 my-12" />}
              </React.Fragment>
            );
          }) : (
             <div className="flex flex-col items-center opacity-40">
                <div className="text-[10px]  text-slate-400  px-4 py-2 border-2 border-dashed border-slate-200 rounded-xl">No Production Plans Drafted</div>
                <SvgConnector type="straight" height={60} isDotted={true} />
             </div>
          )}

          {/* Node 2: Direct Work Orders (Not linked to any plan) */}
          {directWOs.length > 0 && (
            <div className="flex flex-col items-center mt-12 w-full">
              <div className="px-6 py-2 bg-amber-50 border border-amber-200 rounded-full text-[10px]  text-amber-600  mb-4">Direct Execution (No Plan)</div>
              <TreeBranch>
                {directWOs.map((rootWo) => renderWorkOrderNode(rootWo, 0))}
              </TreeBranch>
            </div>
          )}
        </div>
      </div>

      {/* Map Legend - Adjusted to be sticky at the bottom */}
      <div className="sticky bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md px-6 py-3 text-slate-500 text-xs  border border-slate-100 flex items-center gap-6 self-center shadow-lg rounded-2xl no-print">
        {[
          { color: 'bg-orange-600', label: 'Sales Order' },
          { color: 'bg-blue-600', label: 'Strategy (Plan)' },
          { color: 'bg-emerald-600', label: 'Execution (WO)' },
          { color: 'bg-violet-600', label: 'Ops Control (JC)' },
          { color: 'bg-slate-600', label: 'Field Action (Op)' }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
            <span className="text-[9px]   tracking-tight text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
