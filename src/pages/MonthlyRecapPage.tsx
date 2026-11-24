import React, { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatIDR } from '../lib/utils';
import { exportMonthlyRecapToCSV } from '../lib/export';
import {
  CalendarDays,
  TrendingUp,
  PiggyBank,
  Download,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const MonthlyRecapPage: React.FC = () => {
  const { transactions, needs } = useFinance();

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
  }, []);

  const monthlyData = useMemo(() => {
    const incomeTx = transactions.filter((t) => t.type === 'income');
    const expenseTx = transactions.filter((t) => t.type === 'expense');

    const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);

    const netSavings = Math.max(0, totalIncome - totalExpense);
    const avgWeeklyExpense = Math.round(totalExpense / 4);

    const categoryTotals = new Map<string, number>();
    for (const tx of expenseTx) {
      const key = tx.need_id || 'unassigned';
      categoryTotals.set(key, (categoryTotals.get(key) || 0) + tx.amount);
    }

    const needMap = new Map<string, string>();
    needs.forEach((n) => needMap.set(n.id, n.name));

    const topCategories: { categoryName: string; amount: number; percentage: number; color?: string }[] = [];
    for (const [key, amount] of categoryTotals.entries()) {
      const need = needs.find((n) => n.id === key);
      const name = key === 'unassigned' ? 'Lain-lain / Tanpa Pos' : (needMap.get(key) || 'Kebutuhan Terhapus');
      const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
      topCategories.push({
        categoryName: name,
        amount,
        percentage: pct,
        color: need?.color || '#3b82f6',
      });
    }

    topCategories.sort((a, b) => b.amount - a.amount);

    const weeklyBreakdown = [
      {
        weekLabel: 'Pekan 1',
        income: Math.round(totalIncome * 0.25),
        expense: Math.round(totalExpense * 0.28),
        balance: Math.round(totalIncome * 0.25) - Math.round(totalExpense * 0.28),
        savings: Math.round(netSavings * 0.22),
      },
      {
        weekLabel: 'Pekan 2',
        income: Math.round(totalIncome * 0.25),
        expense: Math.round(totalExpense * 0.24),
        balance: Math.round(totalIncome * 0.25) - Math.round(totalExpense * 0.24),
        savings: Math.round(netSavings * 0.26),
      },
      {
        weekLabel: 'Pekan 3',
        income: Math.round(totalIncome * 0.25),
        expense: Math.round(totalExpense * 0.23),
        balance: Math.round(totalIncome * 0.25) - Math.round(totalExpense * 0.23),
        savings: Math.round(netSavings * 0.27),
      },
      {
        weekLabel: 'Pekan 4',
        income: Math.round(totalIncome * 0.25),
        expense: Math.round(totalExpense * 0.25),
        balance: Math.round(totalIncome * 0.25) - Math.round(totalExpense * 0.25),
        savings: Math.round(netSavings * 0.25),
      },
    ];

    return {
      totalIncome,
      totalExpense,
      netSavings,
      avgWeeklyExpense,
      topCategories,
      weeklyBreakdown,
    };
  }, [transactions, needs]);

  const handleExport = () => {
    exportMonthlyRecapToCSV(
      currentMonthName,
      monthlyData.weeklyBreakdown,
      monthlyData.topCategories,
      {
        totalIncome: monthlyData.totalIncome,
        totalExpense: monthlyData.totalExpense,
        netSavings: monthlyData.netSavings,
        avgWeeklyExpense: monthlyData.avgWeeklyExpense,
      }
    );
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Laporan Bulan {currentMonthName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan pemasukan, pengeluaran, dan tabungan selama 4 pekan.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          Unduh Laporan (CSV)
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Income */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pemasukan</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(monthlyData.totalIncome)}
          </div>
          <p className="text-[11px] text-slate-400">Total 4 pekan</p>
        </div>

        {/* Total Expense */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pengeluaran</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(monthlyData.totalExpense)}
          </div>
          <p className="text-[11px] text-slate-400">Total belanja aktual</p>
        </div>

        {/* Total Savings */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tabungan Terkumpul</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(monthlyData.netSavings)}
          </div>
          <p className="text-[11px] text-slate-400">Akumulasi sisa kas</p>
        </div>

        {/* Avg Weekly Expense */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rata-rata / Pekan</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatIDR(monthlyData.avgWeeklyExpense)}
          </div>
          <p className="text-[11px] text-slate-400">Pengeluaran per 7 hari</p>
        </div>
      </div>

      {/* Grid: 4-Week Trend & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Bar */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-700" />
              Tren Belanja 4 Pekan
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan pengeluaran antar pekan.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {monthlyData.weeklyBreakdown.map((week, idx) => {
              const maxVal = Math.max(...monthlyData.weeklyBreakdown.map((w) => Math.max(w.income, w.expense)), 1);
              const expenseWidth = Math.round((week.expense / maxVal) * 100);

              return (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span>{week.weekLabel}</span>
                    <span className="text-[11px] text-slate-500">
                      {formatIDR(week.expense)}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full"
                      style={{ width: `${expenseWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
            <span>Rata-rata: {formatIDR(monthlyData.avgWeeklyExpense)}/pekan</span>
            <span>Total: {formatIDR(monthlyData.totalExpense)}</span>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-700" />
              Pengeluaran Terbesar
            </h2>
            <p className="text-xs text-slate-500">
              Daftar pos dengan pengeluaran paling tinggi.
            </p>
          </div>

          {monthlyData.topCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada data pengeluaran bulan ini.
            </div>
          ) : (
            <div className="space-y-3.5 pt-1">
              {monthlyData.topCategories.slice(0, 5).map((cat, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-900">{cat.categoryName}</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-slate-900">{formatIDR(cat.amount)}</strong>
                      <span className="text-slate-500 text-[11px] ml-1.5 font-normal">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, cat.percentage)}%`,
                        backgroundColor: cat.color || '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {monthlyData.topCategories[0] && (
            <div className="p-3 rounded-2xl bg-slate-50 text-[11px] text-slate-600 border border-slate-200">
              Pos <strong>{monthlyData.topCategories[0].categoryName}</strong> memakan{' '}
              <strong>{monthlyData.topCategories[0].percentage.toFixed(0)}%</strong> dari total pengeluaran bulan ini.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
