import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SalesChallan, ChallanStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, FileText, CheckCircle, XCircle, Eye, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Challans: React.FC = () => {
  const { user } = useAuth();
  const [challans, setChallans] = useState<SalesChallan[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallans();
  }, [search, statusFilter, page]);

  const fetchChallans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {})
      });
      const res = await api.get(`/challans?${params.toString()}`);
      setChallans(res.data.challans);
      setTotalPages(res.data.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch sales challans', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmChallan = async (id: string, challanNumber: string) => {
    if (!window.confirm(`Are you sure you want to CONFIRM Sales Challan ${challanNumber}? This will deduct product stock atomically.`)) return;
    setActionError(null);
    try {
      await api.post(`/challans/${id}/confirm`);
      fetchChallans();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to confirm challan';
      setActionError(msg);
    }
  };

  const handleCancelChallan = async (id: string, challanNumber: string) => {
    if (!window.confirm(`Are you sure you want to CANCEL Sales Challan ${challanNumber}? If confirmed, stock will be reversed.`)) return;
    setActionError(null);
    try {
      await api.post(`/challans/${id}/cancel`);
      fetchChallans();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to cancel challan';
      setActionError(msg);
    }
  };

  const canManageChallan = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'ACCOUNTS';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Sales Challans Portal</h1>
          <p className="text-slate-400 text-sm">Issue wholesale challans, confirm stock deduction, or process reversals.</p>
        </div>

        {canManageChallan && (
          <Link
            to="/challans/new"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-2xl text-sm shadow-lg shadow-sky-500/25 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Sales Challan
          </Link>
        )}
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Transaction Rejected</p>
            <p className="text-xs text-rose-300">{actionError}</p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Challan # (e.g. CH-2026-0001) or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-sky-500"
        >
          <option value="">All Statuses (DRAFT / CONFIRMED / CANCELLED)</option>
          <option value="DRAFT">DRAFT</option>
          <option value="CONFIRMED">CONFIRMED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Challans Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Challan Number</th>
                <th className="px-6 py-4">Customer / Business</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading sales challans...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No sales challans found.
                  </td>
                </tr>
              ) : (
                challans.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-sky-400">
                      <Link to={`/challans/${ch.id}`} className="hover:underline">
                        {ch.challanNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-100">{ch.customer?.name}</div>
                      <div className="text-xs text-slate-400">{ch.customer?.businessName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                        ch.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ch.status === 'DRAFT' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {ch.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-extrabold text-slate-100">
                      ₹{ch.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(ch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/challans/${ch.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Invoice
                      </Link>

                      {canManageChallan && ch.status === 'DRAFT' && (
                        <button
                          onClick={() => handleConfirmChallan(ch.id, ch.challanNumber)}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Confirm Stock
                        </button>
                      )}

                      {canManageChallan && ch.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleCancelChallan(ch.id, ch.challanNumber)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl bg-slate-800 disabled:opacity-40 hover:bg-slate-700 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
