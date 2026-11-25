import React, { useState } from 'react';
import { FinancialEngineResult } from '../types';
import { formatIDR } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import {
  AlertOctagon,
  AlertTriangle,
  Sprout,
  Scissors,
  CheckCircle2,
  ChevronRight,
  Calculator
} from 'lucide-react';

interface AdviceCardProps {
  engineResult: FinancialEngineResult;
}

export const AdviceCard: React.FC<AdviceCardProps> = ({ engineResult }) => {
  const { applyTrimmingAdvice, openWhatIf, periodMode } = useFinance();
  const periodPhrase = periodMode === 'monthly' ? 'bulan ini' : 'pekan ini';
  const periodUnit = periodMode === 'monthly' ? 'bulan' : 'minggu';
  const [isApplying, setIsApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  const handleApplyAdvice = async () => {
    if (engineResult.trimming_suggestions.length === 0) return;
    setIsApplying(true);
    try {
      await applyTrimmingAdvice(engineResult.trimming_suggestions);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  // 1. DEFICIT STATE
  if (engineResult.status === 'defisit') {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-rose-100 p-2 text-rose-700 shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[#14221C]">
                Defisit {formatIDR(engineResult.deficit_amount)}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                Perlu Penyesuaian
              </span>
            </div>
            <p className="text-[11px] text-[#5C6660] leading-relaxed">
              Kebutuhan tetap melebihi pemasukan {periodPhrase}. Pangkas pos keinginan atau tambah pemasukan {formatIDR(engineResult.target_additional_income)}.
            </p>
          </div>
        </div>

        {engineResult.trimming_suggestions.length > 0 && (
          <div className="space-y-1.5">
            {engineResult.trimming_suggestions.map((s) => (
              <div
                key={s.need_id}
                className="rounded-2xl bg-white border border-rose-100 px-3 py-2 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-[#14221C] block truncate">{s.need_name}</span>
                  <span className="text-[10px] text-[#6D7772]">Hemat {formatIDR(s.suggested_cut)}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[#8E9691] line-through block">{formatIDR(s.original_amount)}</span>
                  <span className="font-bold text-rose-700">{formatIDR(s.new_amount)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {engineResult.trimming_suggestions.length > 0 && (
            <button
              type="button"
              onClick={handleApplyAdvice}
              disabled={isApplying || appliedSuccess}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Diterapkan</span>
                </>
              ) : (
                <>
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{isApplying ? 'Menerapkan...' : 'Pangkas Otomatis'}</span>
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={openWhatIf}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-semibold text-[#14221C] bg-white border border-[#E6E5DD]"
          >
            <Calculator className="w-3 h-3" />
            <span>Simulasi</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. TIGHT / ZERO INCOME STATE
  if (engineResult.status === 'ketat') {
    const isEmptyIncome = engineResult.total_income === 0;
    return (
      <button
        type="button"
        onClick={openWhatIf}
        className="w-full text-left rounded-2xl bg-[#EFEFE8] border border-[#E4E3DA] px-4 py-3 flex items-center justify-between gap-3 hover:bg-[#E7E7DE] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#14221C] truncate">
              {isEmptyIncome ? 'Belum ada pemasukan' : `Sisa kas ketat: ${formatIDR(engineResult.net_remainder)}`}
            </p>
            <p className="text-[11px] text-[#68736E] leading-snug line-clamp-2">
              {isEmptyIncome
                ? `Ketuk "Ubah" di kartu hijau atas atau catat pemasukan ${periodPhrase}.`
                : `Sisa dana di bawah 10% pemasukan. Uji perubahan bujet di Simulasi.`}
            </p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#6D7772] shrink-0" />
      </button>
    );
  }

  // 3. HEALTHY (AMAN) STATE — matches Screen 2 & 3 Sage Insight Banner
  const advice = engineResult.surplus_advice;

  return (
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
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[#113829] truncate">
              {advice?.is_ideal
                ? `Bujet Sehat · Tabungan ${engineResult.savings_ratio}%`
                : `Sisa Bersih ${formatIDR(engineResult.net_remainder)}`}
            </p>
          </div>
          <p className="text-[11px] text-[#4E5C54] leading-snug line-clamp-2">
            {advice && !advice.is_ideal && advice.additional_income_for_ideal_savings
              ? `Rasio tabungan ${engineResult.savings_ratio}%. Tambah +${formatIDR(advice.additional_income_for_ideal_savings)}/${periodUnit} untuk capai 20%.`
              : advice?.note || 'Pemasukan menutup semua kebutuhan terencana.'}
          </p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#113829] shrink-0" />
    </button>
  );
};
