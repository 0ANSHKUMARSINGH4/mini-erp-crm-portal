import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import appLogo from '../assets/Newlogo.png';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  History, 
  FileText, 
  PlusCircle, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Check
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SALES';
  const { theme, setTheme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('minierp_sidebar_collapsed') === 'true';
  });

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('minierp_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isRole = (allowed: string[]) => allowed.includes(role);

  return (
    <aside className={`${
      isCollapsed ? 'w-20' : 'w-64'
    } bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out`}>
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-lg shadow-sky-500/20 border border-slate-200 dark:border-transparent flex items-center justify-center flex-shrink-0">
            <img 
              src={appLogo} 
              alt="Mini ERP Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 truncate">
              <h1 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight truncate">Mini ERP Portal</h1>
              <p className="text-xs text-sky-600 dark:text-sky-400 font-medium truncate">Wholesale Ops</p>
            </div>
          )}
        </div>

        <button
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Role Pill */}
      <div className="px-3 py-3 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Active Role</span>
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
              role === 'ADMIN' ? 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border border-purple-500/30' :
              role === 'SALES' ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30' :
              role === 'WAREHOUSE' ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/30' :
              'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/30'
            }`}>
              {role}
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title={`Role: ${role}`}>
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
              role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
              role === 'SALES' ? 'bg-emerald-500/20 text-emerald-400' :
              role === 'WAREHOUSE' ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {role.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <NavLink
          to="/dashboard"
          title={isCollapsed ? 'Dashboard' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isCollapsed ? 'justify-center px-0' : 'px-3'
            } ${
              isActive
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="truncate">Dashboard</span>}
        </NavLink>

        {isRole(['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']) && (
          <NavLink
            to="/customers"
            title={isCollapsed ? 'Customer CRM' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`
            }
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Customer CRM</span>}
          </NavLink>
        )}

        {isRole(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']) && (
          <NavLink
            to="/products"
            title={isCollapsed ? 'Product Inventory' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`
            }
          >
            <Package className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Product Inventory</span>}
          </NavLink>
        )}

        {isRole(['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']) && (
          <NavLink
            to="/stock-movements"
            title={isCollapsed ? 'Stock Movements' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`
            }
          >
            <History className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Stock Movements</span>}
          </NavLink>
        )}

        {isRole(['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']) && (
          <NavLink
            to="/challans"
            title={isCollapsed ? 'Sales Challans' : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isCollapsed ? 'justify-center px-0' : 'px-3'
              } ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`
            }
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">Sales Challans</span>}
          </NavLink>
        )}
      </nav>

      {/* Theme Mode Dropdown Section */}
      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 relative" ref={themeRef}>
        <button
          onClick={() => setIsThemeOpen(!isThemeOpen)}
          title={isCollapsed ? `Theme Mode: ${theme}` : undefined}
          className={`flex items-center justify-between w-full py-2.5 rounded-xl font-medium text-xs transition-all duration-200 ${
            isCollapsed ? 'px-0 justify-center' : 'px-3'
          } bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {theme === 'light' && <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />}
            {theme === 'dark' && <Moon className="w-4 h-4 text-sky-400 flex-shrink-0" />}
            {theme === 'system' && <Monitor className="w-4 h-4 text-sky-500 flex-shrink-0" />}
            {!isCollapsed && (
              <span className="truncate">
                {theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'Auto System'}
              </span>
            )}
          </div>
          {!isCollapsed && (
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ease-in-out ${
              isThemeOpen ? 'rotate-180' : ''
            }`} />
          )}
        </button>

        {/* Dropdown Menu */}
        {isThemeOpen && (
          <div className={`absolute bottom-full mb-2 ${
            isCollapsed ? 'left-14 w-44' : 'left-3 right-3'
          } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200`}>
            <p className="px-3 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Select Theme
            </p>
            <button
              onClick={() => { setTheme('system'); setIsThemeOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                theme === 'system'
                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-sky-500" />
                <span>Auto System</span>
              </div>
              {theme === 'system' && <Check className="w-4 h-4 text-sky-500" />}
            </button>

            <button
              onClick={() => { setTheme('light'); setIsThemeOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </div>
              {theme === 'light' && <Check className="w-4 h-4 text-sky-500" />}
            </button>

            <button
              onClick={() => { setTheme('dark'); setIsThemeOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-sky-400" />
                <span>Dark Mode</span>
              </div>
              {theme === 'dark' && <Check className="w-4 h-4 text-sky-500" />}
            </button>
          </div>
        )}
      </div>

      {/* Quick Action */}
      {isRole(['ADMIN', 'SALES', 'ACCOUNTS']) && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <NavLink
            to="/challans/new"
            title={isCollapsed ? 'New Sales Challan' : undefined}
            className={`flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-sky-500/20 ${
              isCollapsed ? 'px-0' : 'px-4'
            }`}
          >
            <PlusCircle className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="truncate">New Sales Challan</span>}
          </NavLink>
        </div>
      )}
    </aside>
  );
};
