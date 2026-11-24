import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatIDR, convertMonthlyToWeekly } from '../lib/utils';
import {
  Plus,
  Lock,
  Percent,
  Edit2,
  Trash2,
  Calendar,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const NeedsPage: React.FC = () => {
  const {
    needs,
    engineResult,
    openCreateNeed,
    openEditNeed,
    deleteNeed,
    toggleNeedActive,
  } = useFinance();

  const [filterType, setFilterType] = useState<'all' | 'fixed' | 'flexible'>('all');

  const filteredNeeds = needs.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const fixedNeeds = needs.filter((n) => n.type === 'fixed' && n.is_active);
  const flexibleNeeds = needs.filter((n) => n.type === 'flexible' && n.is_active);

  const totalFlexiblePercentage = flexibleNeeds.reduce((sum, n) => sum + (n.percentage || 0), 0);

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Daftar Pos Kebutuhan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola pos belanja tetap, pembagian tabungan fleksibel, dan siklus tagihan.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateNeed}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Pos
        </button>
      </div>

      {/* Commitment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fixed Commitment */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-800">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Kebutuhan Tetap
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {formatIDR(engineResult.fixed_total)} / minggu
              </div>
              <p className="text-[11px] text-slate-500">
                Dari {fixedNeeds.length} pos tetap aktif
              </p>
            </div>
          </div>
        </div>

        {/* Flexible Allocation */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-800">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pembagian Pos Fleksibel
              </span>
              <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                {totalFlexiblePercentage}% Terbagi
              </div>
              <p className="text-[11px] text-slate-500">
                Dari sisa bersih {formatIDR(engineResult.net_remainder)} ({flexibleNeeds.length} pos aktif)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'all', label: `Semua Pos (${needs.length})` },
          { id: 'fixed', label: `Pos Tetap (${fixedNeeds.length})` },
          { id: 'flexible', label: `Pos Fleksibel (${flexibleNeeds.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNeeds.map((need) => {
          const isFixed = need.type === 'fixed';
          const weeklyAmount = isFixed
            ? (need.billing_cycle === 'monthly' ? convertMonthlyToWeekly(need.target_amount) : need.target_amount)
            : 0;

          const allocationItem = engineResult.allocations.find((a) => a.need.id === need.id);
          const allocatedNow = allocationItem ? allocationItem.allocated_amount : 0;

          return (
            <div
              key={need.id}
              className={`p-5 rounded-3xl bg-white border transition-all space-y-4 shadow-xs relative ${
                need.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: need.color || '#10b981' }}
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      {need.name}
                      {!need.is_active && (
                        <span className="text-[10px] text-slate-400 font-normal">(Nonaktif)</span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {need.note || 'Tidak ada catatan'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleNeedActive(need.id)}
                  title={need.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {need.is_active ? (
                    <ToggleRight className="w-6 h-6 text-slate-900" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  {need.priority}
                </span>

                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {isFixed ? 'Tetap' : `Fleksibel (${need.percentage}%)`}
                </span>

                {isFixed && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {need.billing_cycle === 'monthly' ? 'Bulanan' : 'Mingguan'}
                  </span>
                )}
              </div>

              {/* Amount Box */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                {isFixed ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Alokasi Mingguan:</span>
                      <strong className="text-slate-900 font-bold">
                        {formatIDR(weeklyAmount)}
                      </strong>
                    </div>
                    {need.billing_cycle === 'monthly' && (
                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Dari {formatIDR(need.target_amount)}/bulan
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Alokasi Pekan Ini:</span>
                    <strong className="text-slate-900 font-bold">
                      {formatIDR(allocatedNow)}
                    </strong>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEditNeed(need)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Hapus pos "${need.name}"?`)) {
                      deleteNeed(need.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
