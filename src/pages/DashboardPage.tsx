import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { AdviceCard } from '../components/AdviceCard';
import { StatusBadge } from '../components/StatusBadge';
import { formatIDR, formatDateIndo } from '../lib/utils';
import { exportWeeklyRecapToCSV } from '../lib/export';
import { getNeedAllocationMode } from '../lib/engine';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  Layers,
  Lock,
  Percent,
  Coins,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const {
    selectedPeriod,
    incomeTarget,
    updateIncomeTarget,
    engineResult,
    needs,
    transactions,
    deleteTransaction,
    openCreateTx,
    openEditTx,
    openCreateNeed,
    openEditNeed,
    deleteNeed,
    openWhatIf,
    goToPreviousWeek,
    goToNextWeek,
    resetData,
    loadTemplate,
  } = useFinance();

  // Income target editing
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(incomeTarget);

  const handleSaveIncome = async () => {
    await updateIncomeTarget(tempIncome);
    setIsEditingIncome(false);
  };

  // Transactions in current week
  const periodTransactions = transactions.filter((t) => {
    if (!selectedPeriod) return true;
    if (t.period_id === selectedPeriod.id) return true;
    return t.date >= selectedPeriod.start_date && t.date <= selectedPeriod.end_date;
  });

  // Allocations grouped by calculation mode
  const plannedAllocations = engineResult.allocations.filter(
    (a) => getNeedAllocationMode(a.need) !== 'percent_remainder'
  );
  const surplusAllocations = engineResult.allocations.filter(
    (a) => getNeedAllocationMode(a.need) === 'percent_remainder'
  );

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* 1. TOP HEADER: Week Navigation, Income Target & Main Action */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Periode Keuangan
              </span>
              <StatusBadge status={engineResult.status} size="sm" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goToPreviousWeek}
                title="Pekan Sebelumnya"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {selectedPeriod?.label || 'Pekan Ini'}
              </h1>

              <button
                type="button"
                onClick={goToNextWeek}
                title="Pekan Berikutnya"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Bujet otomatis membagi uang ke setiap pos belanja dan tabungan.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCreateTx()}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Transaksi</span>
            </button>

            <button
              type="button"
              onClick={openCreateNeed}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>Tambah Pos</span>
            </button>

            <button
              type="button"
              onClick={openWhatIf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Calculator className="w-4 h-4 text-slate-500" />
              Simulasi
            </button>

            <button
              type="button"
              onClick={() => selectedPeriod && exportWeeklyRecapToCSV(selectedPeriod.label, engineResult)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-500" />
              CSV
            </button>

            <button
              type="button"
              onClick={async () => {
                if (confirm('Reset semua data kebutuhan dan transaksi kembali ke nol?')) {
                  await resetData();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-xl"
              title="Reset data ke nol"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data</span>
            </button>
          </div>
        </div>

        {/* 3 Formula Numbers (Hybrid Allocation: P - F = S) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-5 pt-4 border-t border-slate-100 text-center sm:text-left">
          {/* P: Pemasukan */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block">
              1. Pemasukan Pekan Ini (P)
            </span>
            <div className="text-base sm:text-xl font-extrabold text-slate-900 mt-0.5">
              {formatIDR(engineResult.total_income)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">
              {isEditingIncome ? (
                <div className="flex items-center gap-1 mt-1 justify-center sm:justify-start">
                  <input
                    type="number"
                    value={tempIncome}
                    onChange={(e) => setTempIncome(Number(e.target.value))}
                    className="w-20 px-1 py-0.5 text-xs border rounded bg-white"
                  />
                  <button
                    onClick={handleSaveIncome}
                    className="text-[10px] font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <span>
                  Target: {formatIDR(incomeTarget)}{' '}
                  <button
                    onClick={() => {
                      setTempIncome(incomeTarget);
                      setIsEditingIncome(true);
                    }}
                    className="text-slate-900 underline font-semibold ml-0.5"
                  >
                    Ubah
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* F: Kebutuhan Terencana */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 block">
              2. Kebutuhan Terencana (F)
            </span>
            <div className="text-base sm:text-xl font-extrabold text-slate-900 mt-0.5">
              {formatIDR(engineResult.fixed_total)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Nominal tetap & % pemasukan
            </p>
          </div>

          {/* S: Sisa Bersih Fleksibel */}
          <div className={`p-3 sm:p-4 rounded-2xl border ${
            engineResult.net_remainder < 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
            <span className="text-[10px] sm:text-xs font-semibold text-slate-600 block">
              3. Sisa Bersih (S = P - F)
            </span>
            <div className={`text-base sm:text-xl font-extrabold mt-0.5 ${
              engineResult.net_remainder < 0 ? 'text-rose-700' : 'text-emerald-800'
            }`}>
              {formatIDR(engineResult.net_remainder)}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {engineResult.net_remainder < 0 ? 'Kekurangan dana' : 'Dibagi ke tabungan & darurat'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. ADVICE CARD (Hanya muncul jika ada defisit atau saran tabungan) */}
      <AdviceCard engineResult={engineResult} />

      {/* PANDUAN MULAI DARI NOL (Muncul jika belum ada pos kebutuhan) */}
      {needs.length === 0 && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Alur Penyusunan Keuangan Mingguan (Mulai dari Nol)
              </h3>
              <p className="text-xs text-slate-500">
                Data saat ini telah bersih. Ikuti 3 langkah berikut untuk memahami alur perhitungan sistem:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-extrabold text-slate-900 block">1. Masukkan Pemasukan (P)</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Klik tombol <strong>Ubah</strong> pada kartu Pemasukan di atas. Masukkan target mingguan Anda (misal <strong>Rp 160.000</strong>).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-extrabold text-slate-900 block">2. Buat Pos Custom</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Pilih rumus bebas: nominal tetap (Bensin Rp 30.000) atau persentase (Makan 40% = Rp 64.000).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-extrabold text-slate-900 block">3. Catat & Lihat Sisa Jatah</span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Setiap kali Anda belanja, catat via tombol popup. Sisa jatah pos dan sisa saldo kas langsung diperbarui secara instan.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={openCreateNeed}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pos Kebutuhan Pertama</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                if (confirm('Muat template rekomendasi pos kebutuhan awal (Bensin Rp 30rb, Makan 35%, WiFi bulanan, Jajan 10%, Tabungan 60%, Darurat 40%)?')) {
                  await loadTemplate();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Layers className="w-4 h-4 text-slate-500" />
              <span>Muat Template Rekomendasi</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. JATAH UANG & REALISASI BELANJA PER POS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700" />
              Jatah Uang & Realisasi Belanja
            </h2>
            <p className="text-xs text-slate-500">
              Bebas tentukan rumus pengeluaran per pos: nominal tetap (Rp) atau persentase dari pemasukan (% dari P).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateNeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pos Baru
            </button>
          </div>
        </div>

        {/* KELOMPOK 1: Pos Terencana & Belanja Pokok (Nominal Tetap & % Pemasukan) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              Pos Terencana & Belanja Pokok (Terkunci {formatIDR(engineResult.fixed_total)})
            </span>
          </div>

          {plannedAllocations.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-300 text-center bg-white text-xs text-slate-500">
              Belum ada pos belanja terencana. Klik "Tambah Pos Baru" untuk menambahkan pos kebutuhan Anda.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plannedAllocations.map((item) => {
                const isOver = item.is_overbudget;
                const usage = Math.min(100, Math.round(item.usage_percentage));
                const mode = getNeedAllocationMode(item.need);

                return (
                  <div
                    key={item.need.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isOver
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.need.color || '#10b981' }}
                          />
                          <h3 className="text-xs font-bold text-slate-900">
                            {item.need.name}
                          </h3>

                          {/* Mode Badge */}
                          {mode === 'percent_income' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                              {item.need.percentage}% Pemasukan
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {item.need.billing_cycle === 'monthly' ? 'Bulanan' : 'Tetap Rp'}
                            </span>
                          )}

                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                            {item.need.priority}
                          </span>
                        </div>

                        {/* Formula Label */}
                        <p className="text-[11px] text-slate-500 mt-1">
                          {item.formula_label}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditNeed(item.need)}
                          title="Ubah Pos"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus pos "${item.need.name}"?`)) {
                              deleteNeed(item.need.id);
                            }
                          }}
                          title="Hapus Pos"
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Jatah vs Terpakai vs Sisa */}
                    <div className="mt-3 flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px] block">Jatah Pekan Ini:</span>
                        <strong className="text-slate-900 font-extrabold text-sm">
                          {formatIDR(item.allocated_amount)}
                        </strong>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 text-[11px] block">Terpakai: {formatIDR(item.spent_amount)}</span>
                        {isOver ? (
                          <span className="text-rose-700 font-bold text-xs">
                            Overbudget +{formatIDR(item.overbudget_amount)}
                          </span>
                        ) : (
                          <span className="text-slate-900 font-bold text-xs">
                            Sisa: {formatIDR(item.remaining_amount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOver ? 'bg-rose-600' : 'bg-slate-900'}`}
                        style={{ width: `${usage}%` }}
                      />
                    </div>

                    {/* 1-Click to open popup pre-filled with this need */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {usage}% terpakai
                      </span>
                      <button
                        type="button"
                        onClick={() => openCreateTx(item.need.id)}
                        className="font-bold text-slate-900 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Catat ke Pos Ini
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KELOMPOK 2: Alokasi Pos Tabungan & Sisa Kas (% dari Sisa Kas Bersih) */}
        <div className="space-y-2.5 pt-3">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-600" />
            Alokasi Tabungan & Pos Sisa Kas (Dari Sisa Bersih {formatIDR(Math.max(0, engineResult.net_remainder))})
          </span>

          {surplusAllocations.length === 0 ? (
            <div className="p-5 rounded-2xl border border-dashed border-slate-300 text-center bg-white text-xs text-slate-500">
              Belum ada pos tabungan atau pembagian sisa kas. Tambahkan pos dengan rumus "% Sisa Kas".
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {surplusAllocations.map((item) => (
                <div
                  key={item.need.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.need.color || '#3b82f6' }}
                      />
                      <h3 className="text-xs font-bold text-slate-900 truncate">
                        {item.need.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditNeed(item.need)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Hapus pos "${item.need.name}"?`)) {
                            deleteNeed(item.need.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-tight">
                    {item.formula_label}
                  </p>

                  <div className="pt-1">
                    <span className="text-slate-500 text-[10px] block">Jatah ({item.need.percentage}%):</span>
                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                      {formatIDR(item.allocated_amount)}
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Terpakai: {formatIDR(item.spent_amount)}</span>
                    <button
                      type="button"
                      onClick={() => openCreateTx(item.need.id)}
                      className="font-bold text-slate-900 hover:underline"
                    >
                      + Catat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. RIWAYAT TRANSAKSI PEKAN INI */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Transaksi Pekan Ini ({periodTransactions.length})
            </h2>
            <p className="text-xs text-slate-500">Catatan pengeluaran dan pemasukan pekan ini.</p>
          </div>

          <button
            type="button"
            onClick={() => openCreateTx()}
            className="text-xs font-bold text-slate-900 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Catat Transaksi
          </button>
        </div>

        {periodTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada transaksi di pekan ini. Klik "Catat Transaksi" untuk memasukkan catatan baru.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {periodTransactions.map((tx) => {
              const need = needs.find((n) => n.id === tx.need_id);
              const isIncome = tx.type === 'income';

              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
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

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-bold ${isIncome ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {isIncome ? `+${formatIDR(tx.amount)}` : `-${formatIDR(tx.amount)}`}
                    </span>

                    <button
                      onClick={() => openEditTx(tx)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Hapus transaksi ini?')) {
                          deleteTransaction(tx.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
