import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Need,
  Transaction,
  WeeklyPeriod,
  FinancialEngineResult,
  DeficitTrimmingSuggestion
} from '../types';
import { api } from '../lib/api';
import { calculateHybridAllocation } from '../lib/engine';
import { getCurrentWeekPeriod, getWeekOptionByOffset, WeekOption } from '../lib/utils';
import { useAuth } from './AuthContext';

interface FinanceContextType {
  needs: Need[];
  transactions: Transaction[];
  periods: WeeklyPeriod[];
  selectedPeriod: WeeklyPeriod | null;
  incomeTarget: number;
  engineResult: FinancialEngineResult;
  isLoading: boolean;

  // Weekly filter navigation
  currentWeekOffset: number;
  isCurrentWeek: boolean;
  selectWeekByOffset: (offset: number) => Promise<void>;
  selectWeekByRange: (startDate: string, endDate: string, label: string) => Promise<void>;
  goToPreviousWeek: () => Promise<void>;
  goToNextWeek: () => Promise<void>;
  goToCurrentWeek: () => Promise<void>;

  // Actions
  refreshData: () => Promise<void>;
  setSelectedPeriod: (period: WeeklyPeriod) => void;
  updateIncomeTarget: (target: number) => Promise<void>;
  saveNeed: (needData: Partial<Need>) => Promise<Need>;
  deleteNeed: (id: string) => Promise<void>;
  toggleNeedActive: (id: string) => Promise<void>;
  saveTransaction: (txData: Partial<Transaction>) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  applyTrimmingAdvice: (suggestions: DeficitTrimmingSuggestion[]) => Promise<void>;
  resetData: () => Promise<void>;
  loadTemplate: () => Promise<void>;

  // Modals
  isTxModalOpen: boolean;
  editingTx: Transaction | null;
  preselectedNeedIdForTx: string | null;
  openCreateTx: (needId?: string) => void;
  openEditTx: (tx: Transaction) => void;
  closeTxModal: () => void;

  isNeedModalOpen: boolean;
  editingNeed: Need | null;
  openCreateNeed: () => void;
  openEditNeed: (need: Need) => void;
  closeNeedModal: () => void;

  isWhatIfOpen: boolean;
  openWhatIf: () => void;
  closeWhatIf: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [needs, setNeeds] = useState<Need[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periods, setPeriods] = useState<WeeklyPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<WeeklyPeriod | null>(null);
  const [incomeTarget, setIncomeTarget] = useState<number>(400000);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [preselectedNeedIdForTx, setPreselectedNeedIdForTx] = useState<string | null>(null);

  const [isNeedModalOpen, setIsNeedModalOpen] = useState(false);
  const [editingNeed, setEditingNeed] = useState<Need | null>(null);

  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);

  // Load all initial data for the user
  const refreshData = useCallback(async () => {
    if (!user) {
      setNeeds([]);
      setTransactions([]);
      setPeriods([]);
      setSelectedPeriod(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [fetchedNeeds, fetchedTx, fetchedPeriods] = await Promise.all([
        api.getNeeds(),
        api.getTransactions(),
        api.getPeriods(),
      ]);

      setNeeds(fetchedNeeds);
      setTransactions(fetchedTx);
      setPeriods(fetchedPeriods);

      // Setup current period
      const currentWeekInfo = getCurrentWeekPeriod();
      let active = fetchedPeriods.find(
        (p) => p.start_date === currentWeekInfo.startDate && p.end_date === currentWeekInfo.endDate
      );

      if (!active && fetchedPeriods.length > 0) {
        active = fetchedPeriods[0];
      } else if (!active) {
        try {
          const created = await api.createPeriod({
            start_date: currentWeekInfo.startDate,
            end_date: currentWeekInfo.endDate,
            label: currentWeekInfo.label,
            total_income_target: 400000,
          });
          active = created;
          setPeriods([created]);
        } catch {
          active = {
            id: 'temp-period',
            user_id: user.id,
            start_date: currentWeekInfo.startDate,
            end_date: currentWeekInfo.endDate,
            label: currentWeekInfo.label,
            total_income_target: 400000,
          };
        }
      }

      if (active) {
        setSelectedPeriod(active);
        setIncomeTarget(active.total_income_target || 400000);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Compute offset from current week
  const currentWeekOffset = useMemo(() => {
    if (!selectedPeriod) return 0;
    const currentWeekInfo = getCurrentWeekPeriod();
    const d1 = new Date(selectedPeriod.start_date + 'T00:00:00');
    const d2 = new Date(currentWeekInfo.startDate + 'T00:00:00');
    const diffTime = d1.getTime() - d2.getTime();
    return Math.round(diffTime / (7 * 24 * 60 * 60 * 1000));
  }, [selectedPeriod]);

  const isCurrentWeek = currentWeekOffset === 0;

  // Filter transactions belonging to the selected weekly period
  const periodTransactions = useMemo(() => {
    if (!selectedPeriod) return transactions;
    return transactions.filter((t) => {
      if (t.period_id && t.period_id === selectedPeriod.id) return true;
      return t.date >= selectedPeriod.start_date && t.date <= selectedPeriod.end_date;
    });
  }, [transactions, selectedPeriod]);

  // Run the Financial Suggestion Engine instantly in real-time
  const engineResult = useMemo(() => {
    return calculateHybridAllocation(incomeTarget, needs, periodTransactions);
  }, [incomeTarget, needs, periodTransactions]);

  // Income Target update
  const updateIncomeTarget = async (target: number) => {
    setIncomeTarget(target);
    if (selectedPeriod) {
      const updatedPeriod = { ...selectedPeriod, total_income_target: target };
      setSelectedPeriod(updatedPeriod);
      setPeriods((prev) => prev.map((p) => (p.id === selectedPeriod.id ? updatedPeriod : p)));
    }
  };

  // Weekly Navigation Handlers
  const selectWeekByOffset = useCallback(async (offset: number) => {
    const weekOption: WeekOption = getWeekOptionByOffset(offset);
    let target = periods.find(
      (p) => p.start_date === weekOption.startDate && p.end_date === weekOption.endDate
    );

    if (!target) {
      target = {
        id: `period-${weekOption.startDate}`,
        user_id: user?.id || 'demo',
        start_date: weekOption.startDate,
        end_date: weekOption.endDate,
        label: weekOption.label,
        total_income_target: incomeTarget || 400000,
      };
      try {
        const created = await api.createPeriod(target);
        target = created;
        setPeriods((prev) => [...prev, created]);
      } catch {
        setPeriods((prev) => [...prev, target!]);
      }
    }

    setSelectedPeriod(target);
    setIncomeTarget(target.total_income_target || 400000);
  }, [periods, user, incomeTarget]);

  const selectWeekByRange = useCallback(async (startDate: string, endDate: string, label: string) => {
    let target = periods.find(
      (p) => p.start_date === startDate && p.end_date === endDate
    );

    if (!target) {
      target = {
        id: `period-${startDate}`,
        user_id: user?.id || 'demo',
        start_date: startDate,
        end_date: endDate,
        label: label,
        total_income_target: incomeTarget || 400000,
      };
      try {
        const created = await api.createPeriod(target);
        target = created;
        setPeriods((prev) => [...prev, created]);
      } catch {
        setPeriods((prev) => [...prev, target!]);
      }
    }

    setSelectedPeriod(target);
    setIncomeTarget(target.total_income_target || 400000);
  }, [periods, user, incomeTarget]);

  const goToPreviousWeek = useCallback(async () => {
    await selectWeekByOffset(currentWeekOffset - 1);
  }, [selectWeekByOffset, currentWeekOffset]);

  const goToNextWeek = useCallback(async () => {
    await selectWeekByOffset(currentWeekOffset + 1);
  }, [selectWeekByOffset, currentWeekOffset]);

  const goToCurrentWeek = useCallback(async () => {
    await selectWeekByOffset(0);
  }, [selectWeekByOffset]);

  // Need CRUD
  const saveNeed = async (needData: Partial<Need>): Promise<Need> => {
    if (needData.id) {
      const updated = await api.updateNeed(needData.id, needData);
      setNeeds((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      return updated;
    } else {
      const created = await api.createNeed(needData);
      setNeeds((prev) => [...prev, created]);
      return created;
    }
  };

  const deleteNeed = async (id: string): Promise<void> => {
    await api.deleteNeed(id);
    setNeeds((prev) => prev.filter((n) => n.id !== id));
  };

  const toggleNeedActive = async (id: string): Promise<void> => {
    const target = needs.find((n) => n.id === id);
    if (!target) return;
    const updated = await api.updateNeed(id, { is_active: !target.is_active });
    setNeeds((prev) => prev.map((n) => (n.id === id ? updated : n)));
  };

  // Apply Trimming Advice automatically to save user time during deficit
  const applyTrimmingAdvice = async (suggestions: DeficitTrimmingSuggestion[]) => {
    for (const s of suggestions) {
      const need = needs.find((n) => n.id === s.need_id);
      if (need) {
        await saveNeed({
          ...need,
          target_amount: s.new_amount,
        });
      }
    }
  };

  // Transaction CRUD
  const saveTransaction = async (txData: Partial<Transaction>): Promise<Transaction> => {
    const payload = {
      ...txData,
      period_id: txData.period_id || selectedPeriod?.id,
    };

    if (txData.id) {
      const updated = await api.updateTransaction(txData.id, payload);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      return updated;
    } else {
      const created = await api.createTransaction(payload);
      setTransactions((prev) => [created, ...prev]);
      return created;
    }
  };

  const deleteTransaction = async (id: string): Promise<void> => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // Modal helpers
  const openCreateTx = (needId?: string) => {
    setEditingTx(null);
    setPreselectedNeedIdForTx(needId || null);
    setIsTxModalOpen(true);
  };

  const openEditTx = (tx: Transaction) => {
    setEditingTx(tx);
    setPreselectedNeedIdForTx(tx.need_id || null);
    setIsTxModalOpen(true);
  };

  const closeTxModal = () => {
    setIsTxModalOpen(false);
    setEditingTx(null);
    setPreselectedNeedIdForTx(null);
  };

  const openCreateNeed = () => {
    setEditingNeed(null);
    setIsNeedModalOpen(true);
  };

  const openEditNeed = (need: Need) => {
    setEditingNeed(need);
    setIsNeedModalOpen(true);
  };

  const closeNeedModal = () => {
    setIsNeedModalOpen(false);
    setEditingNeed(null);
  };

  const openWhatIf = () => setIsWhatIfOpen(true);
  const closeWhatIf = () => setIsWhatIfOpen(false);

  const resetData = async () => {
    await api.resetData();
    await refreshData();
  };

  const loadTemplate = async () => {
    await api.loadTemplate();
    await refreshData();
  };

  return (
    <FinanceContext.Provider
      value={{
        needs,
        transactions,
        periods,
        selectedPeriod,
        incomeTarget,
        engineResult,
        isLoading,

        currentWeekOffset,
        isCurrentWeek,
        selectWeekByOffset,
        selectWeekByRange,
        goToPreviousWeek,
        goToNextWeek,
        goToCurrentWeek,

        refreshData,
        setSelectedPeriod,
        updateIncomeTarget,
        saveNeed,
        deleteNeed,
        toggleNeedActive,
        saveTransaction,
        deleteTransaction,
        applyTrimmingAdvice,
        resetData,
        loadTemplate,

        isTxModalOpen,
        editingTx,
        preselectedNeedIdForTx,
        openCreateTx,
        openEditTx,
        closeTxModal,

        isNeedModalOpen,
        editingNeed,
        openCreateNeed,
        openEditNeed,
        closeNeedModal,

        isWhatIfOpen,
        openWhatIf,
        closeWhatIf,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
