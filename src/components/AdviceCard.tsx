import React, { useState } from 'react';
import { FinancialEngineResult } from '../types';
import { formatIDR } from '../lib/utils';
import { useFinance } from '../context/FinanceContext';
import {
  AlertOctagon,
  AlertTriangle,
  TrendingUp,
  Scissors,
  CheckCircle2,
  ArrowRight,
  Calculator
} from 'lucide-react';

interface AdviceCardProps {
  engineResult: FinancialEngineResult;
}

export const AdviceCard: React.FC<AdviceCardProps> = ({ engineResult }) => {
  const { applyTrimmingAdvice, openWhatIf } = useFinance();
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
      <div className="rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-rose-100 p-2 text-rose-700 shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Defisit {formatIDR(engineResult.deficit_amount)}
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                Perlu Penyesuaian
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pengeluaran tetap melebihi pemasukan pekan ini. Pangkas pos keinginan atau cari pemasukan tambahan sebesar {formatIDR(engineResult.target_additional_income)} untuk menutup selisih.
            </p>

            {/* Trimming Suggestions */}
            {engineResult.trimming_suggestions.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-rose-600" />
                  Saran Pemangkasan:
                </span>

                <div className="space-y-1.5">
                  {engineResult.trimming_suggestions.map((s) => (
                    <div
                      key={s.need_id}
                      className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{s.need_name}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 uppercase">
                            {s.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{s.reason}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-slate-400 line-through text-[11px]">
                          {formatIDR(s.original_amount)}
                        </div>
                        <div className="font-bold text-rose-700">
                          {formatIDR(s.new_amount)}
                        </div>
                        <span className="text-[10px] text-emerald-700 font-semibold">
                          Hemat {formatIDR(s.suggested_cut)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              {engineResult.trimming_suggestions.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyAdvice}
                  disabled={isApplying || appliedSuccess}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
                >
                  {appliedSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pemangkasan Diterapkan
                    </>
                  ) : (
                    <>
                      <Scissors className="w-3.5 h-3.5" />
                      {isApplying ? 'Menerapkan...' : 'Terapkan Pemangkasan'}
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={openWhatIf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5" />
                Uji Skenario
              </button>

              <span className="text-xs text-slate-500 ml-auto">
                Target tambahan: <strong>{formatIDR(engineResult.target_additional_income)}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. TIGHT STATE
  if (engineResult.status === 'ketat') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Sisa Kas Terbatas: {formatIDR(engineResult.net_remainder)}
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Ketat
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sisa dana setelah kebutuhan tetap berada di bawah 10% dari pemasukan. Batasi belanja non-pokok pekan ini agar saldo tidak defisit.
            </p>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={openWhatIf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors"
              >
                <Calculator className="w-3.5 h-3.5" />
                Uji Perubahan Bujet
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. HEALTHY (AMAN) STATE
  const advice = engineResult.surplus_advice;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-start gap-3.5">
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700 shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Sisa Bersih Fleksibel: {formatIDR(engineResult.net_remainder)}
            </h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              Rasio Tabungan: {engineResult.savings_ratio}%
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {advice?.note || 'Pemasukan menutup semua kebutuhan tetap. Dana sisa dialokasikan ke tabungan dan pos fleksibel.'}
          </p>

          {advice && !advice.is_ideal && advice.additional_income_for_ideal_savings && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2">
              <span>
                Target pemasukan tambahan untuk mencapai rasio 20%: <strong>+{formatIDR(advice.additional_income_for_ideal_savings)}/minggu</strong>
              </span>
              <button
                type="button"
                onClick={openWhatIf}
                className="font-bold text-brand-600 hover:text-brand-800 flex items-center gap-1"
              >
                Simulasikan
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={openWhatIf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Calculator className="w-3.5 h-3.5" />
              Uji Skenario Bujet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
