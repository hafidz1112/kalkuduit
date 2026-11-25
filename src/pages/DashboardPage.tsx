import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { AdviceCard } from '../components/AdviceCard';
import { StatusBadge } from '../components/StatusBadge';
import { WeekFilter } from '../components/WeekFilter';
import { formatIDR, formatDateIndo } from '../lib/utils';
import { exportWeeklyRecapToCSV } from '../lib/export';
import { getNeedAllocationMode } from '../lib/engine';
import { AppTab } from '../components/MobileNav';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  Layers,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  Wallet
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateTab?: (tab: AppTab) => void;
  onStartTutorial?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateTab,
  onStartTutorial,
}) => {
  const { user } = useAuth();
  const {
    selectedPeriod,
    periodMode,
    switchPeriodMode,
    incomeTarget,
    updateIncomeTarget,
    engineResult,
    needs,
    periodTransactions,
    deleteTransaction,
    openCreateTx,
    openEditTx,
    openCreateNeed,
    openEditNeed,
    deleteNeed,
    openWhatIf,
    goToPreviousPeriod,
    goToNextPeriod,
    loadTemplate,
  } = useFinance();

  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(incomeTarget);
  const [isFlowModalOpen, setIsFlowModalOpen] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);

  const periodNoun = periodMode === 'monthly' ? 'Bulan Ini' : 'Pekan Ini';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Kamu';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 19) return 'Selamat sore';
    return 'Selamat malam';
  };

  const displayMoney = (val: number) => (hideAmounts ? 'Rp ••••••' : formatIDR(val));

  const handleSaveIncome = async () => {
    await updateIncomeTarget(tempIncome);
    setIsEditingIncome(false);
  };

  const displayedTransactions = showAllTx ? periodTransactions : periodTransactions.slice(0, 5);

  return (
    <div className="space-y-4 pb-28">
      {/* 1. MOBILE TOP HEADER (Screen 2 Greeting + Period & Help Actions) */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold text-[#14221C] truncate">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[11px] text-[#68736E] truncate">
            Atur bujet {periodMode === 'monthly' ? 'bulanan' : 'mingguan'} dengan rapi
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div data-tour="week-filter">
            <WeekFilter compact />
          </div>
          {onStartTutorial && (
            <button
              type="button"
              onClick={onStartTutorial}
              title="Panduan Penggunaan"
              className="w-8 h-8 rounded-full bg-[#EFEFE8] hover:bg-[#E5E5DC] text-[#14221C] flex items-center justify-center transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. HERO FOREST-GREEN BALANCE CARD (Screen 2 Balance Card) */}
      <div
        data-tour="income-card"
        className="p-5 rounded-[26px] bg-[#113829] text-white shadow-lg shadow-[#113829]/15 space-y-4 relative overflow-hidden"
      >
        {/* Subtle decorative circle */}
        <div className="absolute -right-8 -top-10 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        {/* Top row: Label + Eye toggle + Mingguan/Bulanan pill */}
        <div className="flex items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2 min-w-0">
            <StatusBadge status={engineResult.status} size="sm" onDark />
            <span className="text-[11px] font-medium text-[#C8DFCE] truncate">
              Pemasukan {periodNoun}
            </span>
            <button
              type="button"
              onClick={() => setHideAmounts(!hideAmounts)}
              title={hideAmounts ? 'Tampilkan nominal' : 'Sembunyikan nominal'}
              className="text-[#B8DEC4] hover:text-white transition-colors"
            >
              {hideAmounts ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="inline-flex items-center rounded-full bg-[#1C4D3A] p-0.5 text-[10px] font-bold shrink-0">
            <button
              type="button"
              onClick={() => switchPeriodMode('weekly')}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                periodMode === 'weekly' ? 'bg-white text-[#113829]' : 'text-[#C8DFCE]'
              }`}
            >
              Minggu
            </button>
            <button
              type="button"
              onClick={() => switchPeriodMode('monthly')}
              className={`px-2 py-0.5 rounded-full transition-colors ${
                periodMode === 'monthly' ? 'bg-white text-[#113829]' : 'text-[#C8DFCE]'
              }`}
            >
              Bulan
            </button>
          </div>
        </div>

        {/* Main Income Figure + Target Ubah */}
        <div className="flex items-end justify-between gap-3 relative z-10">
          <div>
            <div className="text-[28px] font-extrabold tracking-tight leading-none text-white">
              {displayMoney(engineResult.total_income)}
            </div>

            <div className="mt-2 text-[11px] text-[#B8DEC4]">
              {isEditingIncome ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={tempIncome === 0 ? '' : tempIncome}
                    onChange={(e) => setTempIncome(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-28 px-2.5 py-1 text-xs font-bold rounded-full bg-white text-[#14221C] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveIncome}
                    className="text-[11px] font-bold text-[#113829] bg-[#B8DEC4] hover:bg-white px-2.5 py-1 rounded-full transition-colors"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span>Target: {displayMoney(incomeTarget)}</span>
                  <button
                    type="button"
                    data-tour="income-edit-btn"
                    onClick={() => {
                      setTempIncome(incomeTarget);
                      setIsEditingIncome(true);
                    }}
                    className="px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-[10px] transition-colors"
                  >
                    Ubah
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Period Stepper inside card */}
          <div className="flex items-center gap-1 bg-[#1C4D3A] rounded-full px-1.5 py-1 shrink-0">
            <button
              type="button"
              onClick={goToPreviousPeriod}
              title={periodMode === 'monthly' ? 'Bulan Sebelumnya' : 'Pekan Sebelumnya'}
              className="p-0.5 rounded-full text-[#C8DFCE] hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-semibold text-white max-w-[78px] truncate text-center">
              {selectedPeriod?.label || periodNoun}
            </span>
            <button
              type="button"
              onClick={goToNextPeriod}
              title={periodMode === 'monthly' ? 'Bulan Berikutnya' : 'Pekan Berikutnya'}
              className="p-0.5 rounded-full text-[#C8DFCE] hover:text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom 2 Metrics: Terencana (F) & Sisa Bersih (S) */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 relative z-10">
          <div className="rounded-2xl bg-white/10 px-3 py-2">
            <span className="text-[10px] text-[#C8DFCE] block">Terencana (F)</span>
            <span className="text-xs font-bold text-white">{displayMoney(engineResult.fixed_total)}</span>
          </div>
          <div className={`rounded-2xl px-3 py-2 ${engineResult.net_remainder < 0 ? 'bg-rose-500/25' : 'bg-[#22533E]'}`}>
            <span className="text-[10px] text-[#C8DFCE] block">Sisa Bersih (S)</span>
            <span className={`text-xs font-extrabold ${engineResult.net_remainder < 0 ? 'text-rose-200' : 'text-[#D7F0E0]'}`}>
              {displayMoney(engineResult.net_remainder)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FOUR QUICK ACTION ICON TILES (Screen 2 Action Row) */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          data-tour="add-tx-btn"
          onClick={() => openCreateTx()}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-full h-13 py-3.5 rounded-2xl bg-[#EFEFE8] group-hover:bg-[#E4E4DA] text-[#14221C] flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-[#14221C] whitespace-nowrap">Catat</span>
        </button>

        <button
          type="button"
          data-tour="add-need-btn"
          onClick={openCreateNeed}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-full h-13 py-3.5 rounded-2xl bg-[#EFEFE8] group-hover:bg-[#E4E4DA] text-[#14221C] flex items-center justify-center transition-colors">
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-[#14221C] whitespace-nowrap">Tambah Pos</span>
        </button>

        <button
          type="button"
          data-tour="simulasi-btn"
          onClick={openWhatIf}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-full h-13 py-3.5 rounded-2xl bg-[#EFEFE8] group-hover:bg-[#E4E4DA] text-[#14221C] flex items-center justify-center transition-colors">
            <Calculator className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-[#14221C] whitespace-nowrap">Simulasi</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFlowModalOpen(true)}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-full h-13 py-3.5 rounded-2xl bg-[#EFEFE8] group-hover:bg-[#E4E4DA] text-[#113829] flex items-center justify-center transition-colors">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-semibold text-[#14221C] whitespace-nowrap">Alur</span>
        </button>
      </div>

      {/* 4. COMPACT INSIGHT / ADVICE BANNER */}
      <AdviceCard engineResult={engineResult} />

      {/* 5. POS ANGGARAN RINGKAS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#14221C]">
            Pos Anggaran ({engineResult.allocations.length})
          </h2>
          <button
            type="button"
            onClick={() => (onNavigateTab ? onNavigateTab('needs') : openCreateNeed())}
            className="text-xs font-semibold text-[#68736E] hover:text-[#113829] flex items-center gap-0.5"
          >
            <span>Kelola</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {engineResult.allocations.length === 0 ? (
          <div className="p-5 rounded-3xl bg-white border border-[#E6E5DD] text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-[#EFEFE8] text-[#113829] flex items-center justify-center mx-auto">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#14221C]">Belum ada pos anggaran</p>
              <p className="text-[11px] text-[#68736E] mt-0.5">
                Buat pos belanja atau tabungan agar jatah uang terbagi otomatis.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateNeed}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#113829] hover:bg-[#0D2D20] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Pos Pertama</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {engineResult.allocations.slice(0, 4).map((item) => {
              const isOver = item.is_overbudget;
              const usage = Math.min(100, Math.round(item.usage_percentage));
              const mode = getNeedAllocationMode(item.need);

              return (
                <div
                  key={item.need.id}
                  className={`p-3.5 rounded-2xl bg-white border transition-colors ${
                    isOver ? 'border-rose-200 bg-rose-50/30' : 'border-[#E6E5DD]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.need.color || '#113829' }}
                      />
                      <span className="text-xs font-bold text-[#14221C] truncate">
                        {item.need.name}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EFEFE8] text-[#5C6660] shrink-0">
                        {mode === 'percent_income'
                          ? `${item.need.percentage}% P`
                          : mode === 'percent_remainder'
                            ? `${item.need.percentage}% Sisa`
                            : item.need.billing_cycle === 'monthly'
                              ? 'Bulanan'
                              : 'Tetap'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCreateTx(item.need.id)}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#EFEFE8] hover:bg-[#113829] hover:text-white text-[#14221C] transition-colors shrink-0 whitespace-nowrap"
                      >
                        + Catat
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditNeed(item.need)}
                        className="p-1 text-[#8E9691] hover:text-[#14221C]"
                        title="Ubah Pos"
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
                        className="p-1 text-[#8E9691] hover:text-rose-600"
                        title="Hapus Pos"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-[#68736E]">
                      Jatah: <strong className="text-[#14221C]">{displayMoney(item.allocated_amount)}</strong>
                    </span>
                    <span className={isOver ? 'font-bold text-rose-700' : 'font-bold text-[#113829]'}>
                      {isOver
                        ? `Lebih ${displayMoney(item.overbudget_amount)}`
                        : `Sisa ${displayMoney(item.remaining_amount)}`}
                    </span>
                  </div>

                  <div className="w-full bg-[#EFEFE8] rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isOver ? 'bg-rose-600' : 'bg-[#113829]'}`}
                      style={{ width: `${usage}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {engineResult.allocations.length > 4 && onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('needs')}
                className="w-full py-2.5 rounded-2xl bg-[#EFEFE8] hover:bg-[#E5E5DC] text-xs font-bold text-[#113829] transition-colors"
              >
                Lihat Semua {engineResult.allocations.length} Pos →
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. TRANSAKSI TERBARU (Screen 2 Recent Transactions List) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#14221C]">
            Transaksi Terbaru
          </h2>
          {periodTransactions.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllTx(!showAllTx)}
              className="text-xs font-semibold text-[#68736E] hover:text-[#113829]"
            >
              {showAllTx ? 'Ringkas' : `Lihat semua (${periodTransactions.length}) →`}
            </button>
          )}
        </div>

        <div className="rounded-3xl bg-white border border-[#E6E5DD] overflow-hidden">
          {displayedTransactions.length === 0 ? (
            <div className="text-center py-8 px-4 text-[#8E9691] text-xs">
              Belum ada transaksi {periodMode === 'monthly' ? 'bulan ini' : 'pekan ini'}. Tekan tombol tengah untuk mencatat.
            </div>
          ) : (
            <div className="divide-y divide-[#EFEFE8]">
              {displayedTransactions.map((tx) => {
                const need = needs.find((n) => n.id === tx.need_id);
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          isIncome
                            ? 'bg-[#E5F2E8] text-[#113829]'
                            : 'bg-[#EFEFE8] text-[#14221C]'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#14221C] truncate">
                          {tx.note || (isIncome ? 'Pemasukan' : need?.name || 'Pengeluaran')}
                        </p>
                        <p className="text-[11px] text-[#68736E] truncate">
                          {isIncome ? 'Pemasukan' : need?.name || 'Pengeluaran'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`text-xs font-extrabold block ${
                            isIncome ? 'text-[#113829]' : 'text-[#14221C]'
                          }`}
                        >
                          {hideAmounts
                            ? '•••••'
                            : isIncome
                              ? `+${formatIDR(tx.amount)}`
                              : `-${formatIDR(tx.amount)}`}
                        </span>
                        <span className="text-[10px] text-[#8E9691]">
                          {formatDateIndo(tx.date)}
                        </span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEditTx(tx)}
                          className="p-1 text-[#9AA39E] hover:text-[#14221C]"
                          title="Ubah"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Hapus transaksi ini?')) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1 text-[#9AA39E] hover:text-rose-600"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* POPUP ALUR & TEMPLATE */}
      {isFlowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs">
          <div className="relative w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl bg-[#FAF8F5] shadow-2xl border border-[#E6E5DD] overflow-hidden animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 bg-[#113829] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-[#B8DEC4]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Alur Keuangan (Mulai dari Nol)</h3>
                  <p className="text-[11px] text-[#C8DFCE]">3 langkah mudah pakai KalkuDuit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFlowModalOpen(false)}
                className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E5DD] space-y-0.5">
                <span className="text-xs font-extrabold text-[#113829] block">1. Masukkan Pemasukan (P)</span>
                <p className="text-[11px] text-[#68736E] leading-relaxed">
                  Ketuk <strong>Ubah</strong> di kartu hijau atas untuk menentukan target pemasukan mingguan/bulanan.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E5DD] space-y-0.5">
                <span className="text-xs font-extrabold text-[#113829] block">2. Buat Pos Custom</span>
                <p className="text-[11px] text-[#68736E] leading-relaxed">
                  Atur pos dengan nominal tetap, % pemasukan, atau % sisa kas (tabungan).
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white border border-[#E6E5DD] space-y-0.5">
                <span className="text-xs font-extrabold text-[#113829] block">3. Catat & Pantau Analitik</span>
                <p className="text-[11px] text-[#68736E] leading-relaxed">
                  Gunakan tombol tengah untuk mencatat transaksi dan lihat grafik pengeluaran di tab Analitik.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFlowModalOpen(false);
                    openCreateNeed();
                  }}
                  className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-[#113829] hover:bg-[#0D2D20] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Pos Kebutuhan</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Muat template rekomendasi pos kebutuhan awal?')) {
                        await loadTemplate();
                        setIsFlowModalOpen(false);
                      }
                    }}
                    className="py-2.5 px-3 rounded-full text-[11px] font-bold text-[#14221C] bg-[#EFEFE8] hover:bg-[#E4E4DA] flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Muat Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPeriod) exportWeeklyRecapToCSV(selectedPeriod.label, engineResult);
                      setIsFlowModalOpen(false);
                    }}
                    className="py-2.5 px-3 rounded-full text-[11px] font-bold text-[#14221C] bg-[#EFEFE8] hover:bg-[#E4E4DA] flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Ekspor CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
