import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatIDR } from '../lib/utils';
import { getNeedAllocationMode } from '../lib/engine';
import {
  Plus,
  Lock,
  Coins,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  WalletCards
} from 'lucide-react';

export const NeedsPage: React.FC = () => {
  const {
    needs,
    engineResult,
    periodMode,
    openCreateNeed,
    openEditNeed,
    openCreateTx,
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
  const unitLabel = periodMode === 'monthly' ? 'bulan' : 'pekan';

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-[#14221C]">Pos Anggaran</h1>
          <p className="text-[11px] text-[#68736E] leading-snug">
            Atur pos tetap, % pemasukan & tabungan ({periodMode === 'monthly' ? 'Bulanan' : 'Mingguan'}).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateNeed}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold text-white bg-[#113829] hover:bg-[#0D2D20] transition-colors shadow-xs shrink-0 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Tambah Pos</span>
        </button>
      </div>

      {/* 2 Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-3xl bg-[#113829] text-white space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#C8DFCE]">
            <Lock className="w-3 h-3" />
            <span>Terkunci (F)</span>
          </div>
          <div className="text-sm font-extrabold">{formatIDR(engineResult.fixed_total)}</div>
          <p className="text-[10px] text-[#B8DEC4]">/{unitLabel} · {fixedNeeds.length} pos</p>
        </div>

        <div className="p-3.5 rounded-3xl bg-[#EAEFE4] border border-[#DAE3D2] text-[#14221C] space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#4E5C54]">
            <Coins className="w-3 h-3 text-[#113829]" />
            <span>Sisa Tabungan</span>
          </div>
          <div className="text-sm font-extrabold text-[#113829]">
            {formatIDR(Math.max(0, engineResult.net_remainder))}
          </div>
          <p className="text-[10px] text-[#4E5C54]">/{unitLabel} · {flexibleNeeds.length} pos sisa</p>
        </div>
      </div>

      {/* Pill Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-[#EFEFE8] p-1 rounded-full">
        {[
          { id: 'all', label: `Semua (${needs.length})` },
          { id: 'fixed', label: `Terencana (${fixedNeeds.length})` },
          { id: 'flexible', label: `Tabungan (${flexibleNeeds.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id as 'all' | 'fixed' | 'flexible')}
            className={`flex-1 py-1.5 px-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
              filterType === tab.id
                ? 'bg-[#113829] text-white shadow-2xs'
                : 'text-[#68736E] hover:text-[#14221C]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Pos List */}
      {filteredNeeds.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white border border-[#E6E5DD] text-center space-y-2.5">
          <div className="w-11 h-11 rounded-full bg-[#EFEFE8] text-[#113829] flex items-center justify-center mx-auto">
            <WalletCards className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#14221C]">Belum ada pos di kategori ini</p>
          <button
            type="button"
            onClick={openCreateNeed}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#113829]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Pos</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredNeeds.map((need) => {
            const allocationItem = engineResult.allocations.find((a) => a.need.id === need.id);
            const allocatedNow = allocationItem ? allocationItem.allocated_amount : 0;
            const spentNow = allocationItem ? allocationItem.spent_amount : 0;
            const remainingNow = allocationItem ? allocationItem.remaining_amount : 0;
            const isOver = allocationItem ? allocationItem.is_overbudget : false;
            const usage = allocationItem ? Math.min(100, Math.round(allocationItem.usage_percentage)) : 0;
            const mode = getNeedAllocationMode(need);

            return (
              <div
                key={need.id}
                className={`p-4 rounded-3xl bg-white border transition-all space-y-3 ${
                  need.is_active ? 'border-[#E6E5DD]' : 'border-[#E6E5DD] opacity-55'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: need.color || '#113829' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs font-bold text-[#14221C] truncate">{need.name}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EFEFE8] text-[#4B5852]">
                          {mode === 'percent_income'
                            ? `${need.percentage}% P`
                            : mode === 'percent_remainder'
                              ? `${need.percentage}% Sisa`
                              : need.billing_cycle === 'monthly'
                                ? 'Bulanan'
                                : 'Mingguan'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-[#68736E]">
                          {need.priority}
                        </span>
                      </div>
                      {allocationItem?.formula_label && (
                        <p className="text-[10px] text-[#68736E] mt-0.5 truncate">
                          {allocationItem.formula_label}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleNeedActive(need.id)}
                      title={need.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className="p-1 text-[#68736E] hover:text-[#113829]"
                    >
                      {need.is_active ? (
                        <ToggleRight className="w-4 h-4 text-[#113829]" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditNeed(need)}
                      className="p-1 text-[#8E9691] hover:text-[#14221C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus pos "${need.name}"?`)) {
                          deleteNeed(need.id);
                        }
                      }}
                      className="p-1 text-[#8E9691] hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {need.is_active && (
                  <>
                    <div className="flex items-baseline justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-[#68736E] block">Jatah /{unitLabel}</span>
                        <strong className="text-sm font-extrabold text-[#14221C]">
                          {formatIDR(allocatedNow)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#68736E] block">
                          Terpakai {formatIDR(spentNow)}
                        </span>
                        <span className={`text-xs font-bold ${isOver ? 'text-rose-700' : 'text-[#113829]'}`}>
                          {isOver
                            ? `Over +${formatIDR(allocationItem?.overbudget_amount || 0)}`
                            : `Sisa ${formatIDR(remainingNow)}`}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-[#EFEFE8] rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isOver ? 'bg-rose-600' : 'bg-[#113829]'}`}
                        style={{ width: `${usage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#8E9691]">{usage}% terpakai</span>
                      <button
                        type="button"
                        onClick={() => openCreateTx(need.id)}
                        className="text-[11px] font-bold text-[#113829] hover:underline"
                      >
                        + Catat ke Pos Ini
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
