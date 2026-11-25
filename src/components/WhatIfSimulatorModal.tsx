import React, { useState, useMemo } from 'react';
import { useFinance } from '../context/FinanceContext';
import { simulateWhatIf } from '../lib/engine';
import { CurrencyInput } from './CurrencyInput';
import { StatusBadge } from './StatusBadge';
import { formatIDR } from '../lib/utils';
import { NeedPriority } from '../types';
import {
  X,
  Calculator,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Layers
} from 'lucide-react';

export const WhatIfSimulatorModal: React.FC = () => {
  const {
    isWhatIfOpen,
    closeWhatIf,
    needs,
    incomeTarget,
    periodMode,
    saveNeed,
    updateIncomeTarget,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'add_need' | 'adjust_income' | 'modify_existing'>('add_need');

  // Scenario 1: Add new need
  const [newNeedName, setNewNeedName] = useState('Ngemil dan Jajan');
  const [newNeedAmount, setNewNeedAmount] = useState<number>(25000);
  const [newNeedPriority, setNewNeedPriority] = useState<NeedPriority>('keinginan');

  // Scenario 2: Income change
  const [incomeDelta, setIncomeDelta] = useState<number>(50000);

  // Scenario 3: Modify existing need
  const [selectedNeedId, setSelectedNeedId] = useState<string>(needs[0]?.id || '');
  const [modifiedAmount, setModifiedAmount] = useState<number>(45000);

  // Run simulation reactively
  const simulationResult = useMemo(() => {
    if (activeTab === 'add_need') {
      return simulateWhatIf(incomeTarget, needs, {
        added_or_modified_need: {
          name: newNeedName,
          type: 'fixed',
          allocation_mode: 'nominal',
          target_amount: newNeedAmount,
          priority: newNeedPriority,
          billing_cycle: 'weekly',
          is_active: true,
        },
      }, periodMode);
    } else if (activeTab === 'adjust_income') {
      return simulateWhatIf(incomeTarget, needs, {
        simulated_income_change: incomeDelta,
      }, periodMode);
    } else {
      const targetNeed = needs.find((n) => n.id === selectedNeedId);
      return simulateWhatIf(incomeTarget, needs, {
        added_or_modified_need: targetNeed
          ? {
              ...targetNeed,
              target_amount: modifiedAmount,
            }
          : undefined,
      }, periodMode);
    }
  }, [activeTab, incomeTarget, needs, newNeedName, newNeedAmount, newNeedPriority, incomeDelta, selectedNeedId, modifiedAmount, periodMode]);

  const [applied, setApplied] = useState(false);

  const handleApplyToRealBudget = async () => {
    if (activeTab === 'add_need') {
      await saveNeed({
        name: newNeedName,
        type: 'fixed',
        allocation_mode: 'nominal',
        priority: newNeedPriority,
        billing_cycle: 'weekly',
        target_amount: newNeedAmount,
        percentage: 0,
        is_active: true,
        icon: 'Sparkles',
        color: '#ec4899',
        note: 'Hasil simulasi bujet',
      });
    } else if (activeTab === 'adjust_income') {
      await updateIncomeTarget(incomeTarget + incomeDelta);
    } else {
      const targetNeed = needs.find((n) => n.id === selectedNeedId);
      if (targetNeed) {
        await saveNeed({
          ...targetNeed,
          target_amount: modifiedAmount,
        });
      }
    }
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      closeWhatIf();
    }, 1200);
  };

  if (!isWhatIfOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/45 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl bg-[#FAF8F5] shadow-2xl border border-[#E6E5DD] overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E5DD] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Simulasi Perubahan Bujet
              </h2>
              <p className="text-xs text-slate-500">
                Periksa dampak skenario terhadap tabungan dan sisa kas sebelum menyimpannya.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeWhatIf}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('add_need')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'add_need'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Tambah Pos
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('adjust_income')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'adjust_income'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Ubah Pemasukan
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('modify_existing')}
              className={`py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'modify_existing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Ubah Pos Lama
            </button>
          </div>

          {/* Tab Inputs */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            {activeTab === 'add_need' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Pos Baru
                    </label>
                    <input
                      type="text"
                      value={newNeedName}
                      onChange={(e) => setNewNeedName(e.target.value)}
                      placeholder="Nama pos..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prioritas Pos
                    </label>
                    <select
                      value={newNeedPriority}
                      onChange={(e) => setNewNeedPriority(e.target.value as NeedPriority)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    >
                      <option value="keinginan">Keinginan (Dipangkas pertama saat defisit)</option>
                      <option value="penting">Penting (Dipangkas kedua saat defisit)</option>
                      <option value="wajib">Wajib (Kebutuhan pokok)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <CurrencyInput
                    label="Target Mingguan Pos Baru"
                    value={newNeedAmount}
                    onChange={setNewNeedAmount}
                    showQuickChips={true}
                    placeholder="25000"
                  />
                </div>
              </>
            )}

            {activeTab === 'adjust_income' && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Perubahan Pemasukan Mingguan
                </label>
                <div className="flex flex-wrap gap-2">
                  {[-100000, -50000, 25000, 50000, 100000, 200000].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => setIncomeDelta(delta)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                        incomeDelta === delta
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {delta > 0 ? `+${formatIDR(delta)}` : formatIDR(delta)}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-600">
                  Pemasukan saat ini: <strong>{formatIDR(incomeTarget)}</strong> menjadi{' '}
                  <strong className="text-slate-900">{formatIDR(Math.max(0, incomeTarget + incomeDelta))}</strong>
                </div>
              </div>
            )}

            {activeTab === 'modify_existing' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilih Pos yang Ingin Diubah
                    </label>
                    <select
                      value={selectedNeedId}
                      onChange={(e) => {
                        setSelectedNeedId(e.target.value);
                        const n = needs.find((item) => item.id === e.target.value);
                        if (n) setModifiedAmount(n.target_amount);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-500"
                    >
                      {needs.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.name} ({formatIDR(n.target_amount)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <CurrencyInput
                      label="Nominal Baru"
                      value={modifiedAmount}
                      onChange={setModifiedAmount}
                      showQuickChips={true}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Before vs After Matrix */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Perbandingan Angka
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* BEFORE */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-500">Kondisi Sekarang</span>
                  <StatusBadge status={simulationResult.before.status} size="sm" />
                </div>

                <div className="space-y-1.5 pt-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Pemasukan:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.before.total_income)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Kebutuhan Tetap:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.before.fixed_total)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sisa Bersih:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.before.net_remainder)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Alokasi Tabungan:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.before.savings_amount)}</strong>
                  </div>
                </div>
              </div>

              {/* AFTER */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                simulationResult.after.status === 'defisit'
                  ? 'border-rose-200 bg-rose-50/40'
                  : 'border-slate-300 bg-white ring-1 ring-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-900">Hasil Simulasi</span>
                  <StatusBadge status={simulationResult.after.status} size="sm" />
                </div>

                <div className="space-y-1.5 pt-1 text-slate-600">
                  <div className="flex justify-between">
                    <span>Pemasukan:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.after.total_income)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Kebutuhan Tetap:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.after.fixed_total)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sisa Bersih:</span>
                    <strong className={simulationResult.after.net_remainder < 0 ? 'text-rose-700' : 'text-slate-900'}>
                      {formatIDR(simulationResult.after.net_remainder)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Alokasi Tabungan:</span>
                    <strong className="text-slate-900">{formatIDR(simulationResult.after.savings_amount)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verdict Box */}
          <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
            simulationResult.after.status === 'defisit'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-slate-200 bg-slate-50 text-slate-800'
          }`}>
            <div className="font-bold flex items-center gap-1.5">
              {simulationResult.after.status === 'defisit' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>Analisa Skenario:</span>
            </div>
            <p className="leading-relaxed text-[11px]">{simulationResult.impact_summary}</p>
            <p className="leading-relaxed text-[11px] text-slate-600">{simulationResult.recommendation}</p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={closeWhatIf}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleApplyToRealBudget}
              disabled={applied || simulationResult.after.status === 'defisit'}
              className="flex-1 py-3 rounded-full text-xs font-bold text-white bg-[#113829] hover:bg-[#0D2D20] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {applied ? 'Tersimpan' : 'Terapkan ke Bujet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
