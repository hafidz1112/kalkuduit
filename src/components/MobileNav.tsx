import React from 'react';
import {
  LayoutDashboard,
  BarChart3
} from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Bujet', icon: LayoutDashboard },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-md py-1 px-4 safe-area-pb">
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
