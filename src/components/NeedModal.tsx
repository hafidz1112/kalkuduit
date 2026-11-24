import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyInput } from './CurrencyInput';
import { NeedType, NeedAllocationMode, NeedPriority, BillingCycle } from '../types';
import { formatIDR, convertMonthlyToWeekly } from '../lib/utils';
import {
  X,
  Lock,
  Percent,
  Coins,
  Check,
  Calendar,
  Shield,
  HelpCircle
} from 'lucide-react';

const ICON_OPTIONS = [
  { id: 'Fuel', label: 'Bensin' },
  { id: 'Utensils', label: 'Makan' },
  { id: 'Wifi', label: 'WiFi' },
  { id: 'Smartphone', label: 'Pulsa' },
  { id: 'Coffee', label: 'Jajan' },
  { id: 'PiggyBank', label: 'Tabungan' },
  { id: 'ShieldAlert', label: 'Darurat' },
  { id: 'Sparkles', label: 'Bebas' },
  { id: 'ShoppingBag', label: 'Belanja' },
  { id: 'Heart', label: 'Kesehatan' },
  { id: 'Home', label: 'Tempat Tinggal' },
];

export const NeedModal: React.FC = () => {
  const { isNeedModalOpen, editingNeed, closeNeedModal, saveNeed, engineResult } = useFinance();

  const [name, setName] = useState('');
  const [allocationMode, setAllocationMode] = useState<NeedAllocationMode>('nominal');
  const [priority, setPriority] = useState<NeedPriority>('penting');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('weekly');
  const [targetAmount, setTargetAmount] = useState<number>(30000);
  const [percentage, setPercentage] = useState<number>(20);
  const [color, setColor] = useState<string>('#3b82f6');
  const [icon, setIcon] = useState<string>('Fuel');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingNeed) {
      setName(editingNeed.name);
      const mode = editingNeed.allocation_mode || (editingNeed.type === 'flexible' ? 'percent_remainder' : 'nominal');
      setAllocationMode(mode);
      setPriority(editingNeed.priority);
      setBillingCycle(editingNeed.billing_cycle || 'weekly');
      setTargetAmount(editingNeed.target_amount || 0);
      setPercentage(editingNeed.percentage || 20);
      setColor(editingNeed.color || '#3b82f6');
      setIcon(editingNeed.icon || 'Fuel');
      setNote(editingNeed.note || '');
    } else {
      setName('');
      setAllocationMode('nominal');
      setPriority('penting');
      setBillingCycle('weekly');
      setTargetAmount(30000);
      setPercentage(20);
      setColor('#3b82f6');
      setIcon('Fuel');
      setNote('');
    }
    setError('');
  }, [editingNeed, isNeedModalOpen]);

  if (!isNeedModalOpen) return null;

  const currentIncome = engineResult.total_income || 0;
  const currentNetRemainder = Math.max(0, engineResult.net_remainder || 0);

  // Live preview calculation
  let previewWeeklyAmount = 0;
  if (allocationMode === 'nominal') {
    previewWeeklyAmount = billingCycle === 'monthly'
      ? convertMonthlyToWeekly(targetAmount)
      : targetAmount;
  } else if (allocationMode === 'percent_income') {
    previewWeeklyAmount = Math.round(currentIncome * (percentage / 100));
  } else {
    // percent_remainder
    previewWeeklyAmount = Math.round(currentNetRemainder * (percentage / 100));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama pos kebutuhan wajib diisi.');
      return;
    }
    if (allocationMode === 'nominal' && targetAmount <= 0) {
      setError('Nominal kebutuhan tetap harus lebih dari Rp 0.');
      return;
    }
    if ((allocationMode === 'percent_income' || allocationMode === 'percent_remainder') && (percentage <= 0 || percentage > 100)) {
      setError('Persentase harus berada di antara 1% sampai 100%.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const calculatedType: NeedType = allocationMode === 'percent_remainder' ? 'flexible' : 'fixed';

    try {
      await saveNeed({
        id: editingNeed?.id,
        name: name.trim(),
        type: calculatedType,
        allocation_mode: allocationMode,
        priority,
        billing_cycle: billingCycle,
        target_amount: allocationMode === 'nominal' ? targetAmount : 0,
        percentage: allocationMode !== 'nominal' ? percentage : 0,
        color,
        icon,
        note: note.trim(),
        is_active: editingNeed ? editingNeed.is_active : true,
      });
      closeNeedModal();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan kebutuhan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {editingNeed ? 'Ubah Pos Pengeluaran / Kebutuhan' : 'Tambah Pos Pengeluaran / Kebutuhan'}
            </h2>
            <p className="text-xs text-slate-500">
              Tentukan rumus alokasi: nominal tetap (Rp) atau persentase dari pemasukan (% dari P).
            </p>
          </div>
          <button
            type="button"
            onClick={closeNeedModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pos Kebutuhan
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Makan Harian, Bensin, WiFi, Ngopi, Kuota, Tabungan..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Rumus Alokasi (3 Mode) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Rumus & Cara Hitung Alokasi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Mode 1: Nominal Tetap */}
              <button
                type="button"
                onClick={() => setAllocationMode('nominal')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  allocationMode === 'nominal'
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Lock className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">Nominal Tetap</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Nominal Rp pasti per minggu/bulan (Bensin, WiFi, Kuota).
                </p>
              </button>

              {/* Mode 2: % dari Total Pemasukan */}
              <button
                type="button"
                onClick={() => setAllocationMode('percent_income')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  allocationMode === 'percent_income'
                    ? 'border-slate-900 bg-blue-50/50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Percent className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">% Pemasukan</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  % dari total pemasukan P (Makan 40%, Jajan 15%).
                </p>
              </button>

              {/* Mode 3: % dari Sisa Kas Bersih */}
              <button
                type="button"
                onClick={() => setAllocationMode('percent_remainder')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  allocationMode === 'percent_remainder'
                    ? 'border-slate-900 bg-emerald-50/50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">% Sisa Kas</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Membagi sisa kas S = P - F (Tabungan 50%, Darurat 30%).
                </p>
              </button>
            </div>
          </div>

          {/* Configuration Box based on Selected Mode */}
          {allocationMode === 'nominal' && (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              {/* Billing Cycle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Siklus Pengeluaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('weekly')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      billingCycle === 'weekly'
                        ? 'bg-white border-slate-900 text-slate-900 shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Mingguan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-white border-slate-900 text-slate-900 shadow-xs'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Bulanan
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <CurrencyInput
                  label={billingCycle === 'monthly' ? 'Nominal Tagihan Bulanan' : 'Nominal Mingguan'}
                  value={targetAmount}
                  onChange={setTargetAmount}
                  showQuickChips={true}
                  placeholder="0"
                />
              </div>

              {/* Feedback */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700">
                {billingCycle === 'monthly' ? (
                  <span>
                    Tagihan bulanan {formatIDR(targetAmount)} otomatis dialokasikan menjadi{' '}
                    <strong className="text-slate-900">{formatIDR(previewWeeklyAmount)} / pekan</strong> (dibagi 4 pekan).
                  </span>
                ) : (
                  <span>
                    Jatah belanja pos ini dikunci sebesar{' '}
                    <strong className="text-slate-900">{formatIDR(targetAmount)} / pekan</strong>.
                  </span>
                )}
              </div>
            </div>
          )}

          {allocationMode === 'percent_income' && (
            <div className="space-y-3 p-4 rounded-2xl bg-blue-50/40 border border-blue-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-800">
                    Berapa Persen dari Total Pemasukan?
                  </label>
                  <span className="text-sm font-black text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    {percentage}%
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {[5, 10, 15, 20, 25, 30, 40, 50].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPercentage(val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        percentage === val
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-blue-200 text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Calculation Feedback */}
              <div className="p-3 rounded-xl bg-white border border-blue-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Pemasukan pekan ini:</span>
                  <span className="font-semibold text-slate-800">{formatIDR(currentIncome)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Jatah otomatis pos ini ({percentage}%):</span>
                  <span className="text-blue-700 text-sm">{formatIDR(previewWeeklyAmount)} / pekan</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Jika pemasukan berubah (misal naik atau turun), nominal pos ini otomatis ikut menyesuaikan.
                </p>
              </div>
            </div>
          )}

          {allocationMode === 'percent_remainder' && (
            <div className="space-y-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-800">
                    Berapa Persen dari Sisa Kas Bersih?
                  </label>
                  <span className="text-sm font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    {percentage}%
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                />

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {[10, 20, 30, 40, 50, 60, 70].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPercentage(val)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        percentage === val
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-emerald-200 text-slate-700 hover:bg-emerald-50'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Calculation Feedback */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Sisa kas bersih saat ini (S = P - F):</span>
                  <span className="font-semibold text-slate-800">{formatIDR(currentNetRemainder)}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Jatah estimasi pos ini ({percentage}%):</span>
                  <span className="text-emerald-700 text-sm">{formatIDR(previewWeeklyAmount)} / pekan</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Pos ini membagi sisa kas bersih yang tersisa setelah kebutuhan tetap dan pos persentase pemasukan terpenuhi.
                </p>
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                Skala Prioritas (Dasar Pemangkasan saat Defisit)
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'wajib', label: 'Wajib', desc: 'Pokok utama, tidak dipangkas.' },
                { id: 'penting', label: 'Penting', desc: 'Pendukung, dipangkas kedua.' },
                { id: 'keinginan', label: 'Keinginan', desc: 'Dipangkas pertama saat defisit.' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as NeedPriority)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    priority === p.id
                      ? 'border-slate-900 bg-slate-50 font-bold text-slate-900 ring-1 ring-slate-900'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{p.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Ikon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIcon(opt.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    icon === opt.id
                      ? 'border-slate-900 bg-slate-900 text-white font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Singkat (Opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Keterangan tambahan untuk pos ini..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={closeNeedModal}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : editingNeed ? 'Simpan Perubahan' : 'Tambah Pos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
