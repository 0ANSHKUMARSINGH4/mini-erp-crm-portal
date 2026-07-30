import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Users, Package, AlertTriangle, FileText, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    challans: 0,
    drafts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [custRes, prodRes, challanRes] = await Promise.all([
        api.get('/customers?limit=1'),
        api.get('/products?limit=100'),
        api.get('/challans?limit=100')
      ]);

      const prods = prodRes.data.products || [];
      const lowStockCount = prods.filter((p: any) => p.isLowStock || p.currentStock <= p.minStockAlert).length;
      const challans = challanRes.data.challans || [];
      const draftCount = challans.filter((c: any) => c.status === 'DRAFT').length;

      setStats({
        customers: custRes.data.pagination.total || 0,
        products: prods.length,
        lowStock: lowStockCount,
        challans: challans.length,
        drafts: draftCount
      });
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-white via-sky-50 to-sky-100 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm dark:shadow-none">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome back, {user?.name} 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Role: <span className="font-semibold text-sky-600 dark:text-sky-400">{user?.role}</span> — Operations & Wholesale Overview
          </p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'ACCOUNTS') && (
          <Link
            to="/challans/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-lg shadow-sky-600/30 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Sales Challan
          </Link>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl glass-card space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Customers</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.customers}</p>
          <Link to="/customers" className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1">
            Manage CRM leads <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl glass-card space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total SKUs</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.products}</p>
          <Link to="/products" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            View Inventory <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl glass-card space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Low Stock Alerts</span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{loading ? '...' : stats.lowStock}</p>
          <Link to="/products?lowStock=true" className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
            Review short stock <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="p-5 rounded-2xl glass-card space-y-3 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sales Challans</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{loading ? '...' : stats.challans}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">({stats.drafts} Drafts)</span>
          </div>
          <Link to="/challans" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
            Process orders <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Module Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Customer CRM</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage wholesale leads, active distributors, GST details, and record structured follow-up call history notes.
          </p>
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Open CRM Module &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Product & Inventory</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Track product stock levels, locations, unit prices, min stock alert thresholds, and log stock movements (IN/OUT).
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Open Inventory &rarr;
          </Link>
        </div>

        <div className="p-6 rounded-3xl glass-panel space-y-4 shadow-sm dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sales Challan Portal</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate sequential challans (e.g. CH-2026-0001), snapshot line item pricing, and execute atomic stock deduction.
          </p>
          <Link
            to="/challans"
            className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Open Challan Portal &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
