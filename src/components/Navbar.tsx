import React from 'react';
import { useAuth } from '../context/AuthContext';
import { WeekFilter } from './WeekFilter';
import {
  Wallet,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Bujet & Catat' },
    { id: 'reports', label: 'Laporan' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 flex-nowrap">
        {/* Brand Logo & Tab Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
              KalkuDuit
            </span>
          </div>

          {/* Simple 2-Tab Navigation */}
          <nav className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl ml-2 text-xs font-semibold">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Section: Weekly Filter & User Profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Week Filter (Segmented < Pekan Ini > with clean popover) */}
          <WeekFilter />

          {/* User profile & logout */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
            <div
              title={user?.name || 'User'}
              className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200"
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              type="button"
              onClick={logout}
              title="Keluar"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
