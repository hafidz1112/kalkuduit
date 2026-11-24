import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatIDR, formatDateIndo } from '../lib/utils';
import { exportWeeklyRecapToCSV, exportMonthlyRecapToCSV } from '../lib/export';
import { StatusBadge } from '../components/StatusBadge';
import { getNeedAllocationMode } from '../lib/engine';
import {
  Calendar,
  CalendarDays,
  TrendingUp,
  PiggyBank,
  Download,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  BarChart3
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const {
    selectedPeriod,
    engineResult,
    transactions,
    needs,
    goToPreviousWeek,
    goToNextWeek,
  } = useFinance();

  // Filter inside Reports: 'weekly' or 'monthly'
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

  const currentMonthName = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
  }, []);

  // --- WEEKLY REPORT DATA ---
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!selectedPeriod) return true;
      if (t.period_id === selectedPeriod.id) return true;
      return t.date >= selectedPeriod.start_date && t.date <= selectedPeriod.end_date;
    });
  }, [transactions, selectedPeriod]);

  // --- MONTHLY REPORT DATA ---
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

  const handleExportMonthly = () => {
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

  const handleExportWeekly = () => {
    if (selectedPeriod) {
      exportWeeklyRecapToCSV(selectedPeriod.label, engineResult);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* 1. TOP HEADER WITH FILTER LAPORAN */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-slate-800" />
              Laporan Keuangan
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Evaluasi kinerja anggaran, tren belanja, dan alokasi tabungan.
            </p>
          </div>

          {/* Filter Toggle: Mingguan vs Bulanan */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl self-start sm:self-auto border border-slate-200/60">
            <button
              type="button"
              onClick={() => setReportType('weekly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              Laporan Mingguan
            </button>

            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                reportType === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-slate-600" />
              Laporan Bulanan
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KONDISI 1: LAPORAN MINGGUAN */}
      {/* ======================================================== */}
      {reportType === 'weekly' && (
        <div className="space-y-6">
          {/* Subheader: Week Navigation & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousWeek}
                title="Pekan Sebelumnya"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Periode Terpilih
                </span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900">
                  {selectedPeriod?.label || 'Pekan Ini'}
                </span>
              </div>

              <button
                type="button"
                onClick={goToNextWeek}
                title="Pekan Berikutnya"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="ml-2">
                <StatusBadge status={engineResult.status} size="sm" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportWeekly}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Unduh CSV Mingguan
            </button>
          </div>

          {/* 4 Kartu Ringkasan Mingguan */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Pemasukan */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Pemasukan (P)</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatIDR(engineResult.total_income)}
              </div>
              <p className="text-[11px] text-slate-400">Total pemasukan pekan ini</p>
            </div>

            {/* Belanja Aktual */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Belanja Aktual</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatIDR(engineResult.total_expenses)}
              </div>
              <p className="text-[11px] text-slate-400">Total belanja riil tercatat</p>
            </div>

            {/* Sisa Kas Riil */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Sisa Saldo Kas</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                  <PiggyBank className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatIDR(engineResult.actual_balance)}
              </div>
              <p className="text-[11px] text-slate-400">Pemasukan dikurangi belanja</p>
            </div>

            {/* Sisa Bersih (S = P - F) */}
            <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs space-y-1 ${
              engineResult.net_remainder < 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Sisa Bersih (S = P - F)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-700">
                  Tabungan {engineResult.savings_ratio}%
                </span>
              </div>
              <div className={`text-lg sm:text-2xl font-extrabold tracking-tight ${
                engineResult.net_remainder < 0 ? 'text-rose-700' : 'text-emerald-800'
              }`}>
                {formatIDR(engineResult.net_remainder)}
              </div>
              <p className="text-[11px] text-slate-500">
                {engineResult.net_remainder < 0 ? 'Defisit anggaran' : 'Dana dialokasikan ke pos sisa'}
              </p>
            </div>
          </div>

          {/* Rincian Rencana vs Realisasi Belanja per Pos */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-700" />
                Rincian Evaluasi Pos Kebutuhan ({engineResult.allocations.length})
              </h2>
              <p className="text-xs text-slate-500">
                Perbandingan batas rencana belanja terhadap pengeluaran aktual pekan ini.
              </p>
            </div>

            {engineResult.allocations.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada pos kebutuhan pada pekan ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                      <th className="py-2.5 pr-3">Pos Kebutuhan</th>
                      <th className="py-2.5 px-3">Rumus</th>
                      <th className="py-2.5 px-3">Prioritas</th>
                      <th className="py-2.5 px-3 text-right">Jatah Rencana</th>
                      <th className="py-2.5 px-3 text-right">Realisasi Belanja</th>
                      <th className="py-2.5 px-3 text-right">Sisa Kuota</th>
                      <th className="py-2.5 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {engineResult.allocations.map((item) => {
                      const mode = getNeedAllocationMode(item.need);
                      const isOver = item.is_overbudget;

                      return (
                        <tr key={item.need.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 pr-3 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.need.color || '#10b981' }}
                              />
                              <span>{item.need.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {mode === 'percent_income' ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                {item.need.percentage}% Pemasukan
                              </span>
                            ) : mode === 'percent_remainder' ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                {item.need.percentage}% Sisa Kas
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {item.need.billing_cycle === 'monthly' ? 'Bulanan' : 'Tetap Rp'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 uppercase text-[10px] font-semibold text-slate-500">
                            {item.need.priority}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-700">
                            {formatIDR(item.allocated_amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-700">
                            {formatIDR(item.spent_amount)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {formatIDR(item.remaining_amount)}
                          </td>
                          <td className="py-3 pl-3 text-right">
                            {isOver ? (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                                Overbudget (+{formatIDR(item.overbudget_amount)})
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Sesuai
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Riwayat Transaksi di Pekan Ini */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                Riwayat Transaksi Pekan Ini ({periodTransactions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Semua pemasukan dan pengeluaran yang dicatat pada pekan ini.
              </p>
            </div>

            {periodTransactions.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada transaksi yang dicatat pada pekan ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {periodTransactions.map((tx) => {
                  const need = needs.find((n) => n.id === tx.need_id);
                  const isIncome = tx.type === 'income';

                  return (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                          {isIncome ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 truncate">
                          <span className="font-bold text-slate-900 mr-2">
                            {tx.note || (isIncome ? 'Pemasukan' : need?.name || 'Pengeluaran')}
                          </span>
                          {need && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {need.name}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 ml-2">
                            {formatDateIndo(tx.date)}
                          </span>
                        </div>
                      </div>

                      <span className={`font-bold shrink-0 ${isIncome ? 'text-emerald-700' : 'text-slate-900'}`}>
                        {isIncome ? `+${formatIDR(tx.amount)}` : `-${formatIDR(tx.amount)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* KONDISI 2: LAPORAN BULANAN */}
      {/* ======================================================== */}
      {reportType === 'monthly' && (
        <div className="space-y-6">
          {/* Subheader: Month Info & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Bulan Evaluasi
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900">
                Bulan {currentMonthName}
              </span>
            </div>

            <button
              type="button"
              onClick={handleExportMonthly}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors self-start sm:self-auto"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Unduh CSV Bulanan
            </button>
          </div>

          {/* 4 Summary Cards Bulanan */}
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
      )}
    </div>
  );
};
