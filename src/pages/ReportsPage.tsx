import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatIDR, getCurrentMonthPeriod } from '../lib/utils';
import { exportWeeklyRecapToCSV, exportMonthlyRecapToCSV } from '../lib/export';
import { WeekFilter } from '../components/WeekFilter';
import { getNeedAllocationMode } from '../lib/engine';
import { AppTab } from '../components/MobileNav';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Sprout
} from 'lucide-react';

interface ReportsPageProps {
  onBack?: () => void;
  onNavigateTab?: (tab: AppTab) => void;
}

const CHART_PALETTE = ['#113829', '#3D8B68', '#78AD8F', '#B8D4BE', '#D6D9D1'];

export const ReportsPage: React.FC<ReportsPageProps> = ({ onBack }) => {
  const {
    selectedPeriod,
    periodMode,
    switchPeriodMode,
    engineResult,
    transactions,
    periodTransactions,
    needs,
    openWhatIf,
  } = useFinance();

  const [activeMetric, setActiveMetric] = useState<'spending' | 'income' | 'savings' | 'needs'>('spending');
  const [selectedBarIdx, setSelectedBarIdx] = useState<number | null>(null);

  const activeMonthPeriod = useMemo(() => {
    if (periodMode === 'monthly' && selectedPeriod) {
      return {
        startDate: selectedPeriod.start_date,
        endDate: selectedPeriod.end_date,
        label: selectedPeriod.label,
      };
    }
    return getCurrentMonthPeriod();
  }, [periodMode, selectedPeriod]);

  // Real data for active period (weekly or monthly)
  const analyticsData = useMemo(() => {
    const expenseTx = periodTransactions.filter((t) => t.type === 'expense');
    const incomeTx = periodTransactions.filter((t) => t.type === 'income');

    const totalExpense = expenseTx.reduce((s, t) => s + t.amount, 0);
    const totalIncomeActual = incomeTx.reduce((s, t) => s + t.amount, 0);
    const totalBudget = engineResult.total_income;

    // Group expenses by category (need)
    const categoryTotals = new Map<string, number>();
    for (const tx of expenseTx) {
      const key = tx.need_id || 'unassigned';
      categoryTotals.set(key, (categoryTotals.get(key) || 0) + tx.amount);
    }

    const needMap = new Map<string, string>();
    needs.forEach((n) => needMap.set(n.id, n.name));

    const spendingCategories: { name: string; amount: number; percentage: number; color: string }[] = [];
    let idx = 0;
    for (const [key, amount] of Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])) {
      const name = key === 'unassigned' ? 'Lain-lain' : needMap.get(key) || 'Pos Terhapus';
      const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      spendingCategories.push({
        name,
        amount,
        percentage: pct,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      });
      idx++;
    }

    // Monthly 4-week breakdown for Bar Chart
    const monthTx = transactions.filter(
      (t) => t.date >= activeMonthPeriod.startDate && t.date <= activeMonthPeriod.endDate
    );
    const weekRanges = [
      { label: 'Pkn 1', minDay: 1, maxDay: 7 },
      { label: 'Pkn 2', minDay: 8, maxDay: 14 },
      { label: 'Pkn 3', minDay: 15, maxDay: 21 },
      { label: 'Pkn 4', minDay: 22, maxDay: 31 },
    ];

    const weeklyBars = weekRanges.map((r) => {
      let expense = 0;
      let income = 0;
      for (const tx of monthTx) {
        const day = Number(tx.date.split('-')[2] || 0);
        if (day >= r.minDay && day <= r.maxDay) {
          if (tx.type === 'expense') expense += tx.amount;
          else income += tx.amount;
        }
      }
      return {
        label: r.label,
        expense,
        income,
        savings: Math.max(0, income - expense),
      };
    });

    return {
      totalExpense,
      totalIncomeActual,
      totalBudget,
      spendingCategories,
      weeklyBars,
    };
  }, [periodTransactions, engineResult, needs, transactions, activeMonthPeriod]);

  // SVG Donut segments
  const donutSegments = useMemo(() => {
    const cats = analyticsData.spendingCategories.slice(0, 5);
    const total = cats.reduce((s, c) => s + c.amount, 0);
    if (total <= 0) return [];

    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return cats.map((cat) => {
      const ratio = cat.amount / total;
      const dashLength = Math.max(0, ratio * circumference - 4);
      const seg = {
        ...cat,
        strokeDasharray: `${dashLength} ${circumference}`,
        strokeDashoffset: -offset,
      };
      offset += ratio * circumference;
      return seg;
    });
  }, [analyticsData.spendingCategories]);

  const bars = analyticsData.weeklyBars;
  const activeBarIndex =
    selectedBarIdx !== null
      ? selectedBarIdx
      : bars.reduce((bestIdx, b, i, arr) => (b.expense > arr[bestIdx].expense ? i : bestIdx), 0);

  const maxBarValue = Math.max(
    ...bars.map((b) => (activeMetric === 'income' ? b.income : activeMetric === 'savings' ? b.savings : b.expense)),
    1
  );

  const budgetUsagePct =
    engineResult.total_income > 0
      ? Math.round((engineResult.total_expenses / engineResult.total_income) * 100)
      : 0;
  const underBudgetPct = Math.max(0, 100 - budgetUsagePct);

  const handleExport = () => {
    if (periodMode === 'monthly') {
      const totalInc = bars.reduce((s, b) => s + b.income, 0);
      const totalExp = bars.reduce((s, b) => s + b.expense, 0);
      exportMonthlyRecapToCSV(
        activeMonthPeriod.label,
        bars.map((b) => ({
          weekLabel: b.label,
          income: b.income,
          expense: b.expense,
          balance: b.income - b.expense,
          savings: b.savings,
        })),
        analyticsData.spendingCategories.map((c) => ({
          categoryName: c.name,
          amount: c.amount,
          percentage: c.percentage,
        })),
        {
          totalIncome: totalInc,
          totalExpense: totalExp,
          netSavings: Math.max(0, totalInc - totalExp),
          avgWeeklyExpense: Math.round(totalExp / 4),
        }
      );
    } else if (selectedPeriod) {
      exportWeeklyRecapToCSV(selectedPeriod.label, engineResult);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* 1. MOBILE TOP HEADER (Screen 3: Back < | Title | Period Filter) */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full bg-[#EFEFE8] hover:bg-[#E4E4DA] text-[#14221C] flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <h1 className="text-base font-extrabold text-[#14221C]">Analitik</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <WeekFilter compact />
          <button
            type="button"
            onClick={handleExport}
            title="Unduh CSV"
            className="w-8 h-8 rounded-full bg-[#EFEFE8] hover:bg-[#E4E4DA] text-[#14221C] flex items-center justify-center transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. HORIZONTAL PILL TABS (Screen 3: Spending / Income / Savings / Pos) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {[
          { id: 'spending', label: 'Pengeluaran' },
          { id: 'income', label: 'Pemasukan' },
          { id: 'savings', label: 'Tabungan' },
          { id: 'needs', label: 'Rincian Pos' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveMetric(tab.id as any)}
            className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              activeMetric === tab.id
                ? 'bg-[#113829] text-white'
                : 'bg-[#EFEFE8] text-[#5C6660] hover:text-[#14221C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. DONUT CHART CARD (Screen 3: Your Spending + Ring + 2-Col Legend) */}
      {activeMetric !== 'needs' ? (
        <div className="p-5 rounded-3xl bg-white border border-[#E6E5DD] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-[#14221C]">
              {activeMetric === 'spending'
                ? 'Pengeluaranmu'
                : activeMetric === 'income'
                  ? 'Pemasukanmu'
                  : 'Sisa & Tabungan'}
            </h2>
            <div className="inline-flex items-center gap-1 bg-[#EFEFE8] rounded-full p-0.5 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => switchPeriodMode('weekly')}
                className={`px-2 py-0.5 rounded-full ${
                  periodMode === 'weekly' ? 'bg-[#113829] text-white' : 'text-[#68736E]'
                }`}
              >
                Minggu
              </button>
              <button
                type="button"
                onClick={() => switchPeriodMode('monthly')}
                className={`px-2 py-0.5 rounded-full ${
                  periodMode === 'monthly' ? 'bg-[#113829] text-white' : 'text-[#68736E]'
                }`}
              >
                Bulan
              </button>
            </div>
          </div>

          {/* Center Donut Ring */}
          <div className="flex flex-col items-center justify-center py-1">
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r="56"
                  fill="none"
                  stroke="#EFEFE8"
                  strokeWidth="16"
                />
                {activeMetric === 'spending' &&
                  donutSegments.map((seg, i) => (
                    <circle
                      key={i}
                      cx="70"
                      cy="70"
                      r="56"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                    />
                  ))}
                {activeMetric === 'income' && analyticsData.totalBudget > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    fill="none"
                    stroke="#113829"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                  />
                )}
                {activeMetric === 'savings' && engineResult.savings_ratio > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r="56"
                    fill="none"
                    stroke="#3D8B68"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min(1, engineResult.savings_ratio / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                  />
                )}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span className="text-base font-extrabold text-[#14221C] leading-tight">
                  {activeMetric === 'spending'
                    ? formatIDR(analyticsData.totalExpense)
                    : activeMetric === 'income'
                      ? formatIDR(engineResult.total_income)
                      : formatIDR(Math.max(0, engineResult.net_remainder))}
                </span>
                <span className="text-[10px] font-medium text-[#68736E] mt-0.5">
                  {activeMetric === 'spending'
                    ? 'Total Belanja'
                    : activeMetric === 'income'
                      ? 'Total Pemasukan'
                      : `Rasio ${engineResult.savings_ratio}%`}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Category Legend */}
          {activeMetric === 'spending' && (
            analyticsData.spendingCategories.length === 0 ? (
              <p className="text-center text-[11px] text-[#8E9691]">
                Belum ada pengeluaran tercatat pada {selectedPeriod?.label || 'periode ini'}.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-1">
                {analyticsData.spendingCategories.slice(0, 6).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-[#4B5852] font-medium truncate">{cat.name}</span>
                    </div>
                    <span className="font-bold text-[#14221C] ml-1 shrink-0">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      ) : (
        /* Rincian Pos Mode */
        <div className="p-4 rounded-3xl bg-white border border-[#E6E5DD] space-y-3">
          <h2 className="text-xs font-extrabold text-[#14221C]">
            Evaluasi Pos ({engineResult.allocations.length})
          </h2>
          {engineResult.allocations.length === 0 ? (
            <p className="text-center py-6 text-xs text-[#8E9691]">Belum ada pos kebutuhan.</p>
          ) : (
            <div className="divide-y divide-[#EFEFE8]">
              {engineResult.allocations.map((item) => {
                const mode = getNeedAllocationMode(item.need);
                return (
                  <div key={item.need.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-[#14221C] block truncate">{item.need.name}</span>
                      <span className="text-[10px] text-[#68736E]">
                        {mode === 'percent_income'
                          ? `${item.need.percentage}% Pemasukan`
                          : mode === 'percent_remainder'
                            ? `${item.need.percentage}% Sisa`
                            : 'Nominal Tetap'}
                        {' · '}Jatah {formatIDR(item.allocated_amount)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#14221C] block">{formatIDR(item.spent_amount)}</span>
                      <span className={`text-[10px] font-bold ${item.is_overbudget ? 'text-rose-600' : 'text-[#3D8B68]'}`}>
                        {item.is_overbudget ? 'Overbudget' : `Sisa ${formatIDR(item.remaining_amount)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. SAGE INSIGHT BANNER (Screen 3: "You're X% under budget!") */}
      <button
        type="button"
        onClick={openWhatIf}
        className="w-full text-left rounded-2xl bg-[#EAEFE4] border border-[#DAE3D2] px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#E1E8D9] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#D7E6CE] text-[#113829] flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#113829]">
              {engineResult.total_income === 0
                ? 'Atur target pemasukan untuk mulai evaluasi'
                : engineResult.total_expenses <= engineResult.total_income
                  ? `Hemat ${underBudgetPct}% dari total bujet!`
                  : 'Pengeluaran melebihi pemasukan'}
            </p>
            <p className="text-[11px] text-[#4E5C54] truncate">
              {engineResult.status_description}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#113829] shrink-0" />
      </button>

      {/* 5. SPENDING TREND BAR CHART (Screen 3: Rounded Sage Bars + Dark Active Bar + Pill Tooltip) */}
      <div className="p-5 rounded-3xl bg-white border border-[#E6E5DD] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold text-[#14221C]">
              {activeMetric === 'income'
                ? 'Tren Pemasukan'
                : activeMetric === 'savings'
                  ? 'Tren Sisa Kas'
                  : 'Tren Pengeluaran'}
            </h2>
            <p className="text-[10px] text-[#68736E]">{activeMonthPeriod.label}</p>
          </div>
          <span className="text-[10px] font-bold text-[#113829] bg-[#EAEFE4] px-2.5 py-1 rounded-full">
            Ketuk batang
          </span>
        </div>

        <div className="grid grid-cols-4 gap-3 items-end h-36 pt-7">
          {bars.map((bar, i) => {
            const val =
              activeMetric === 'income'
                ? bar.income
                : activeMetric === 'savings'
                  ? bar.savings
                  : bar.expense;
            const heightPct = maxBarValue > 0 ? Math.max(10, Math.round((val / maxBarValue) * 100)) : 10;
            const isSelected = i === activeBarIndex;

            return (
              <button
                key={bar.label}
                type="button"
                onClick={() => setSelectedBarIdx(i)}
                className="flex flex-col items-center justify-end h-full gap-2 group relative"
              >
                {isSelected && (
                  <span className="absolute -top-6 px-2 py-0.5 rounded-full bg-[#113829] text-white text-[10px] font-bold whitespace-nowrap shadow-xs">
                    {formatIDR(val)}
                  </span>
                )}
                <div className="w-full flex items-end justify-center h-24">
                  <div
                    className={`w-9 rounded-t-xl transition-all ${
                      isSelected ? 'bg-[#113829]' : 'bg-[#A6BDA9] group-hover:bg-[#78AD8F]'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-bold ${
                    isSelected ? 'text-[#113829]' : 'text-[#8E9691]'
                  }`}
                >
                  {bar.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
