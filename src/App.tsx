import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { NeedModal } from './components/NeedModal';
import { WhatIfSimulatorModal } from './components/WhatIfSimulatorModal';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuthPage } from './pages/AuthPage';
import { FinanceProvider } from './context/FinanceContext';
import { Loader2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-slate-700 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
        {/* Top Navbar with WeekFilter */}
        <Navbar activeTab={activeTab} setActiveTab={(t) => setActiveTab(t as any)} />

        {/* Main Content Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-5">
          {activeTab === 'dashboard' && <DashboardPage />}
          {activeTab === 'reports' && <ReportsPage />}
        </main>

        {/* Mobile Navigation */}
        <MobileNav activeTab={activeTab} setActiveTab={(t) => setActiveTab(t as any)} />

        {/* Action Modals */}
        <QuickTransactionModal />
        <NeedModal />
        <WhatIfSimulatorModal />
      </div>
    </FinanceProvider>
  );
};

export const App: React.FC = () => {
  return <MainApp />;
};

export default App;
