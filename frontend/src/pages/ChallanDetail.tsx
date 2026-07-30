import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { SalesChallan } from '../types';
import appLogo from '../assets/Newlogo.png';
import { ArrowLeft, Printer, CheckCircle, FileText, Building, Calendar, User, XCircle } from 'lucide-react';

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challan, setChallan] = useState<SalesChallan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchChallan();
  }, [id]);

  const fetchChallan = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/challans/${id}`);
      setChallan(res.data.challan);
    } catch (err) {
      console.error('Failed to load challan detail', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading sales challan...</div>;
  if (!challan) return <div className="p-8 text-center text-rose-400">Sales challan not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between print:hidden">
        <Link to="/challans" className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Challans
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl shadow-md transition-all"
        >
          <Printer className="w-4 h-4" /> Print Challan Invoice
        </button>
      </div>

      {/* Printable Challan Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 print:border-slate-300 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center flex-shrink-0 print:hidden">
                <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100 print:text-black">APEX WHOLESALE DISTRIBUTORS</h1>
            </div>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
              Industrial Estate Phase 2, Central Supply Hub | Phone: +91 800-ERP-WHOLESALE
            </p>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Sales Challan #</span>
            <span className="text-2xl font-mono font-extrabold text-sky-400 print:text-black">{challan.challanNumber}</span>
            <div className="mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                challan.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' :
                challan.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
              }`}>
                {challan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Issue Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-950/60 print:bg-slate-50 p-6 rounded-2xl border border-slate-800/80 print:border-slate-200">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Billed / Dispatched To:</span>
            <h3 className="text-base font-bold text-slate-100 print:text-black">{challan.customer?.name}</h3>
            <p className="text-xs font-semibold text-slate-300 print:text-slate-700">{challan.customer?.businessName}</p>
            <p className="text-xs text-slate-400 print:text-slate-600 mt-1">Phone: {challan.customer?.mobile}</p>
          </div>

          <div className="sm:text-right space-y-1 text-xs">
            <div>
              <span className="text-slate-400">Date Issued: </span>
              <span className="font-semibold text-slate-200 print:text-black">{new Date(challan.createdAt).toLocaleDateString()}</span>
            </div>
            {challan.confirmedAt && (
              <div>
                <span className="text-slate-400">Confirmed At: </span>
                <span className="font-semibold text-emerald-400 print:text-black">{new Date(challan.confirmedAt).toLocaleString()}</span>
              </div>
            )}
            <div>
              <span className="text-slate-400">Issued By: </span>
              <span className="font-semibold text-slate-200 print:text-black">{challan.createdBy}</span>
            </div>
          </div>
        </div>

        {/* Line Items Snapshot Table */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Itemized Dispatched Items (Snapshot)</h3>
          <div className="border border-slate-800 print:border-slate-300 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 print:bg-slate-100 text-slate-400 print:text-slate-700 font-bold border-b border-slate-800 print:border-slate-300">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Item Description</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price (₹)</th>
                  <th className="px-4 py-3 text-right">Subtotal (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {challan.items?.map((item, i) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-slate-100 print:text-black">{item.productName}</td>
                    <td className="px-4 py-3 font-mono text-sky-400 print:text-slate-800">{item.sku}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-100 print:text-black">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-slate-300 print:text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-100 print:text-black">
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800 print:border-slate-300">
          <div className="text-xs text-slate-400 italic">
            {challan.notes && <p>Notes: {challan.notes}</p>}
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Grand Total</span>
            <span className="text-3xl font-extrabold text-sky-400 print:text-black">₹{challan.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
