import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { MobileNav, AppTab } from './components/MobileNav';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { NeedModal } from './components/NeedModal';
import { WhatIfSimulatorModal } from './components/WhatIfSimulatorModal';
import { OnboardingTour } from './components/OnboardingTour';
import { GuidebookModal } from './components/GuidebookModal';
import { DashboardPage } from './pages/DashboardPage';
import { ReportsPage } from './pages/ReportsPage';
import { NeedsPage } from './pages/NeedsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';
import { FinanceProvider } from './context/FinanceContext';
import { Loader2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [tutorialTriggerCount, setTutorialTriggerCount] = useState(0);
  const [isGuidebookOpen, setIsGuidebookOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#113829] animate-spin" />
          <p className="text-xs font-semibold text-[#68736E]">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <FinanceProvider>
      <div className="min-h-screen bg-[#F3F1EC] flex justify-center font-sans text-[#14221C]">
        {/* Mobile App Viewport Shell */}
        <div className="w-full max-w-[440px] min-h-screen bg-[#FAF8F5] flex flex-col sm:border-x sm:border-[#E6E5DD] sm:shadow-xl relative">
          <main className="flex-1 px-4 pt-3">
            {activeTab === 'dashboard' && (
              <DashboardPage
                onNavigateTab={setActiveTab}
                onStartTutorial={() => setTutorialTriggerCount((c) => c + 1)}
                onOpenGuidebook={() => setIsGuidebookOpen(true)}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsPage
                onBack={() => setActiveTab('dashboard')}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === 'needs' && <NeedsPage />}
            {activeTab === 'profile' && (
              <ProfilePage
                onStartTutorial={() => setTutorialTriggerCount((c) => c + 1)}
                onOpenGuidebook={() => setIsGuidebookOpen(true)}
              />
            )}
          </main>

          {/* Bottom Mobile Navigation with Center Action FAB */}
          <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* Action Modals */}
          <QuickTransactionModal />
          <NeedModal />
          <WhatIfSimulatorModal />

          {/* Interactive Onboarding Tutorial */}
          <OnboardingTour
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            manualTriggerCount={tutorialTriggerCount}
          />

          {/* User Guidebook Modal */}
          <GuidebookModal
            isOpen={isGuidebookOpen}
            onClose={() => setIsGuidebookOpen(false)}
            onStartInteractiveTour={() => setTutorialTriggerCount((c) => c + 1)}
          />
        </div>
      </div>
    </FinanceProvider>
  );
};

export const App: React.FC = () => {
  return <MainApp />;
};

export default App;
