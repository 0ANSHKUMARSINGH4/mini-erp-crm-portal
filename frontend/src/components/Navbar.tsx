import React from 'react';
import { useAuth } from '../context/AuthContext';
import appLogo from '../assets/Newlogo.png';
import { LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md sticky top-0 z-20 px-6 flex items-center justify-between transition-colors duration-300">
      {/* Search / Title info */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white p-1 shadow-md border border-slate-200 dark:border-transparent flex items-center justify-center flex-shrink-0">
          <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-slate-700 dark:text-slate-300 text-sm font-medium">
          Wholesale & Distribution Operations Portal
        </h2>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Pill */}
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/60">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-xs">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">{user?.email}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Logout"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
