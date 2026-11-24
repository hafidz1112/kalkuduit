import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatIDR, formatDateIndo } from '../lib/utils';
import { exportTransactionsToCSV } from '../lib/export';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Download,
  Edit2,
  Trash2
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    needs,
    periods,
    selectedPeriod,
    openCreateTx,
    openEditTx,
    deleteTransaction,
  } = useFinance();

  // Filters
  const [filterPeriod, setFilterPeriod] = useState<string>(selectedPeriod?.id || 'all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterNeed, setFilterNeed] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const needMap = useMemo(() => {
    const map = new Map<string, string>();
    needs.forEach((n) => map.set(n.id, n.name));
    return map;
  }, [needs]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterPeriod !== 'all') {
        const period = periods.find((p) => p.id === filterPeriod);
        if (period) {
          const matchPeriodId = t.period_id === period.id;
          const matchDateRange = t.date >= period.start_date && t.date <= period.end_date;
          if (!matchPeriodId && !matchDateRange) return false;
        }
      }

      if (filterType !== 'all' && t.type !== filterType) {
        return false;
      }

      if (filterNeed !== 'all') {
        if (filterNeed === 'unassigned' && t.need_id) return false;
        if (filterNeed !== 'unassigned' && t.need_id !== filterNeed) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = (t.note || '').toLowerCase().includes(q);
        const amountMatch = t.amount.toString().includes(q);
        const needName = t.need_id ? (needMap.get(t.need_id) || '').toLowerCase() : '';
        const categoryMatch = needName.includes(q);
        if (!noteMatch && !amountMatch && !categoryMatch) return false;
      }

      return true;
    });
  }, [transactions, filterPeriod, filterType, filterNeed, searchQuery, periods, needMap]);

  const totalFilteredIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleExport = () => {
    exportTransactionsToCSV(filteredTransactions, needMap, 'Riwayat_Transaksi');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan dan filter transaksi pemasukan dan pengeluaran mingguan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Unduh CSV
          </button>

          <button
            type="button"
            onClick={() => openCreateTx()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Catat Baru
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi berdasarkan catatan, kategori, atau nominal..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Period */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Periode
            </label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Periode</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Jenis
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Jenis</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Kategori Pos
            </label>
            <select
              value={filterNeed}
              onChange={(e) => setFilterNeed(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="unassigned">Tanpa Pos / Pemasukan Umum</option>
              {needs.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            {filteredTransactions.length} transaksi
          </span>
          <div className="flex items-center gap-3">
            <span className="text-emerald-700 font-bold">
              +{formatIDR(totalFilteredIncome)}
            </span>
            <span className="text-rose-700 font-bold">
              -{formatIDR(totalFilteredExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs space-y-2">
            <p>Tidak ada transaksi yang cocok.</p>
            <button
              onClick={() => {
                setFilterPeriod('all');
                setFilterType('all');
                setFilterNeed('all');
                setSearchQuery('');
              }}
              className="font-bold text-slate-900 hover:underline"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => {
              const need = tx.need_id ? needs.find((n) => n.id === tx.need_id) : null;
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {tx.note || (isIncome ? 'Pemasukan' : need?.name || 'Pengeluaran')}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                        <span>{formatDateIndo(tx.date)}</span>
                        {need && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-slate-700">
                              {need.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-bold ${
                          isIncome ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {isIncome ? `+${formatIDR(tx.amount)}` : `-${formatIDR(tx.amount)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                      <button
                        type="button"
                        onClick={() => openEditTx(tx)}
                        title="Ubah"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Hapus transaksi ini?')) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        title="Hapus"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
