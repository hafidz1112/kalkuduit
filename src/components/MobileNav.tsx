import React from 'react';
import {
  Home,
  BarChart2,
  ArrowLeftRight,
  WalletCards,
  User
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export type AppTab = 'dashboard' | 'reports' | 'needs' | 'profile';

interface MobileNavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setActiveTab }) => {
  const { openCreateTx } = useFinance();

  const leftItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Beranda', icon: Home },
    { id: 'reports', label: 'Analitik', icon: BarChart2 },
  ];

  const rightItems: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'needs', label: 'Pos', icon: WalletCards },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  const renderNavBtn = (item: { id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveTab(item.id)}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-colors ${
          isActive
            ? 'text-[#113829] font-bold'
            : 'text-[#7C8580] hover:text-[#14221C] font-medium'
        }`}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
        <span className="text-[10px] leading-none mt-0.5">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-40 bg-white/95 backdrop-blur-md border-t border-[#E6E5DD] px-3 pt-1.5 pb-2.5">
      <div className="grid grid-cols-5 items-center">
        {leftItems.map(renderNavBtn)}

        {/* Center Floating Action Button (Catat Transaksi) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => openCreateTx()}
            title="Catat Transaksi"
            className="w-12 h-12 -mt-6 rounded-full bg-[#113829] hover:bg-[#0D2D20] text-white shadow-lg shadow-[#113829]/30 flex items-center justify-center transition-transform active:scale-95 ring-4 ring-[#FAF8F5]"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>

        {rightItems.map(renderNavBtn)}
      </div>
    </div>
  );
};
