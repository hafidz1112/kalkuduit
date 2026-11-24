import React, { useState, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyInput } from './CurrencyInput';
import { formatIDR, getTodayDateString } from '../lib/utils';
import { X, ArrowDownRight, ArrowUpRight, Calendar, Tag, FileText, Check } from 'lucide-react';

export const QuickTransactionModal: React.FC = () => {
  const {
    isTxModalOpen,
    editingTx,
    preselectedNeedIdForTx,
    closeTxModal,
    saveTransaction,
    needs,
    engineResult,
  } = useFinance();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [needId, setNeedId] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (editingTx) {
      setType(editingTx.type);
      setAmount(editingTx.amount);
      setNeedId(editingTx.need_id || '');
      setDate(editingTx.date);
      setNote(editingTx.note || '');
    } else {
      setType('expense');
      setAmount(0);
      setNeedId(preselectedNeedIdForTx || (needs.length > 0 ? needs[0].id : ''));
      setDate(getTodayDateString());
      setNote('');
    }
    setError('');
  }, [editingTx, preselectedNeedIdForTx, isTxModalOpen, needs]);

  if (!isTxModalOpen) return null;

  const selectedNeedAllocation = engineResult.allocations.find((a) => a.need.id === needId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Nominal transaksi harus lebih dari Rp 0.');
      return;
    }
    if (!date) {
      setError('Pilih tanggal transaksi.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await saveTransaction({
        id: editingTx?.id,
        type,
        amount,
        need_id: type === 'expense' ? (needId || null) : null,
        date,
        note,
      });
      closeTxModal();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDatePreset = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDate(`${y}-${m}-${day}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {type === 'expense' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {editingTx ? 'Ubah Transaksi' : 'Catat Transaksi'}
              </h2>
              <p className="text-xs text-slate-500">Saldo dan sisa bujet langsung diperbarui.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeTxModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
              {error}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Pemasukan
            </button>
          </div>

          {/* Nominal */}
          <div>
            <CurrencyInput
              label="Nominal Transaksi"
              value={amount}
              onChange={setAmount}
              showQuickChips={true}
              placeholder="0"
            />
          </div>

          {/* Category Dropdown (if Expense) */}
          {type === 'expense' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Pos Kebutuhan
                </span>
                {selectedNeedAllocation && (
                  <span className="text-[11px] font-normal text-slate-500">
                    Sisa: <strong className={selectedNeedAllocation.remaining_amount < 0 ? 'text-rose-700' : 'text-slate-900'}>
                      {formatIDR(selectedNeedAllocation.remaining_amount)}
                    </strong>
                  </span>
                )}
              </label>

              <select
                value={needId}
                onChange={(e) => setNeedId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
              >
                {needs.filter((n) => n.is_active).map((n) => {
                  const alloc = engineResult.allocations.find((a) => a.need.id === n.id);
                  const remaining = alloc ? alloc.remaining_amount : 0;
                  return (
                    <option key={n.id} value={n.id}>
                      {n.name} (Sisa {formatIDR(remaining)})
                    </option>
                  );
                })}
              </select>

              {/* Dynamic Budget Impact Alert */}
              {selectedNeedAllocation && amount > 0 && (
                <div className={`mt-2 p-2.5 rounded-xl text-[11px] flex items-center justify-between ${
                  selectedNeedAllocation.remaining_amount - amount < 0
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  <span>Sisa setelah transaksi ini:</span>
                  <span className="font-bold">
                    {formatIDR(selectedNeedAllocation.remaining_amount - amount)}
                    {selectedNeedAllocation.remaining_amount - amount < 0 && ' (Melebihi Kuota)'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Date Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Tanggal Transaksi
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDatePreset(0)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Hari ini
                </button>
                <button
                  type="button"
                  onClick={() => setDatePreset(1)}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Kemarin
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Catatan
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Bensin pertalite, Gaji mingguan..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={closeTxModal}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5 ${
                type === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : editingTx ? 'Perbarui' : 'Simpan Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
