import {
  Need,
  NeedAllocationMode,
  PeriodMode,
  Transaction,
  FinancialEngineResult,
  NeedAllocationItem,
  DeficitTrimmingSuggestion,
  FinancialHealthStatus,
  WhatIfScenario,
  WhatIfSimulationResult
} from '../types';
import { convertMonthlyToWeekly, convertWeeklyToMonthly } from './utils';

/**
 * Determine the active allocation mode of a need
 */
export function getNeedAllocationMode(need: Need): NeedAllocationMode {
  if (need.allocation_mode) return need.allocation_mode;
  if (need.type === 'flexible') return 'percent_remainder';
  return 'nominal';
}

/**
 * Helper to get the period-adjusted nominal amount of a fixed need (weekly or monthly)
 */
export function getNeedPeriodTarget(need: Need, periodMode: PeriodMode = 'weekly'): number {
  const mode = getNeedAllocationMode(need);
  if (mode !== 'nominal') {
    return 0;
  }
  const amount = need.target_amount || 0;
  if (periodMode === 'monthly') {
    return need.billing_cycle === 'monthly' ? amount : convertWeeklyToMonthly(amount);
  }
  if (need.billing_cycle === 'monthly') {
    return convertMonthlyToWeekly(amount);
  }
  return amount;
}

/**
 * Helper to get the weekly equivalent nominal amount of a fixed need
 */
export function getNeedWeeklyTarget(need: Need): number {
  return getNeedPeriodTarget(need, 'weekly');
}

/**
 * Check if a need is considered savings or emergency fund
 */
export function isSavingsOrEmergencyNeed(need: Need): boolean {
  const name = need.name.toLowerCase();
  return (
    name.includes('tabung') ||
    name.includes('darurat') ||
    name.includes('invest') ||
    name.includes('emas') ||
    name.includes('deposito') ||
    name.includes('saham')
  );
}

/**
 * Core Financial Formula Engine - Hybrid Adaptive Allocation
 * 
 * Supports user-customizable formulas per need:
 * 1. Nominal Tetap (Rp): Fixed weekly or monthly converted to weekly (bensin, wifi)
 * 2. Persentase Pemasukan (% dari P): e.g. 25% of 160k = 40k (makan, belanja)
 * 3. Persentase Sisa Kas (% dari S = P - F): e.g. 50% of remainder to savings
 */
export function calculateHybridAllocation(
  incomeInput: number,
  needs: Need[],
  transactions: Transaction[] = [],
  periodMode: PeriodMode = 'weekly'
): FinancialEngineResult {
  // Only evaluate active needs
  const activeNeeds = needs.filter((n) => n.is_active);

  // Filter actual transactions
  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  // Total Income: if income transactions exist, sum them. Otherwise use incomeInput
  const transactionIncomeSum = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);
  const total_income = transactionIncomeSum > 0 ? transactionIncomeSum : (incomeInput || 0);

  // Total actual expenses
  const total_expenses = expenseTransactions.reduce((acc, t) => acc + t.amount, 0);
  const actual_balance = total_income - total_expenses;

  // 1. Separate needs by calculation mode
  // Committed needs = nominal + percent_income (budget locked before evaluating surplus)
  // Remainder needs = percent_remainder (shares whatever surplus S is left)
  const committedNeeds: Need[] = [];
  const remainderNeeds: Need[] = [];
  const committedTargets = new Map<string, number>();
  const formulaLabels = new Map<string, string>();

  let fixed_total = 0;

  for (const need of activeNeeds) {
    const mode = getNeedAllocationMode(need);
    if (mode === 'percent_remainder') {
      remainderNeeds.push(need);
    } else {
      committedNeeds.push(need);
      let target = 0;
      let label = '';

      if (mode === 'percent_income') {
        const pct = need.percentage || 0;
        target = Math.round(total_income * (pct / 100));
        label = `${pct}% dari pemasukan (Rp ${total_income.toLocaleString('id-ID')})`;
      } else {
        // mode === 'nominal'
        target = getNeedPeriodTarget(need, periodMode);
        if (periodMode === 'monthly') {
          label = need.billing_cycle === 'monthly'
            ? `Tagihan bulanan Rp ${target.toLocaleString('id-ID')}/bln`
            : `Mingguan Rp ${(need.target_amount || 0).toLocaleString('id-ID')}/pekan (total ~Rp ${target.toLocaleString('id-ID')}/bln)`;
        } else {
          label = need.billing_cycle === 'monthly'
            ? `Tagihan Rp ${need.target_amount.toLocaleString('id-ID')}/bln (sisihan ~Rp ${target.toLocaleString('id-ID')}/pekan)`
            : `Nominal tetap Rp ${target.toLocaleString('id-ID')}/pekan`;
        }
      }

      committedTargets.set(need.id, target);
      formulaLabels.set(need.id, label);
      fixed_total += target;
    }
  }

  // 2. Net Remainder (S = P - F)
  const net_remainder = total_income - fixed_total;

  // 3. Status determination & Deficit Trimming
  let status: FinancialHealthStatus = 'aman';
  let status_label = 'Bujet Aman';
  let status_description = 'Pemasukan menutup semua kebutuhan terencana dan menyisakan dana untuk pos tabungan/fleksibel.';

  let deficit_amount = 0;
  const trimming_suggestions: DeficitTrimmingSuggestion[] = [];
  let target_additional_income = 0;

  if (net_remainder < 0) {
    status = 'defisit';
    deficit_amount = Math.abs(net_remainder);
    target_additional_income = deficit_amount;
    status_label = 'Defisit';
    status_description = `Pengeluaran terencana melebihi pemasukan sebesar Rp ${deficit_amount.toLocaleString('id-ID')}. Pangkas pos keinginan atau tambah pemasukan.`;

    // Smart Trimming Engine:
    // Suggest cuts prioritized by: Keinginan -> Penting. Wajib is protected.
    let remainingDeficitToCut = deficit_amount;

    // First pass: Keinginan (both nominal & percent_income)
    const keinginanCommitted = committedNeeds.filter((n) => n.priority === 'keinginan');
    for (const item of keinginanCommitted) {
      if (remainingDeficitToCut <= 0) break;
      const amount = committedTargets.get(item.id) || 0;
      if (amount > 0) {
        const cut = Math.min(amount, remainingDeficitToCut);
        trimming_suggestions.push({
          need_id: item.id,
          need_name: item.name,
          priority: item.priority,
          original_amount: amount,
          suggested_cut: cut,
          new_amount: amount - cut,
          reason: `Pos keinginan. Pangkas Rp ${cut.toLocaleString('id-ID')} untuk menutup defisit.`
        });
        remainingDeficitToCut -= cut;
      }
    }

    // Second pass: Penting (if deficit still remains)
    if (remainingDeficitToCut > 0) {
      const pentingCommitted = committedNeeds.filter((n) => n.priority === 'penting');
      for (const item of pentingCommitted) {
        if (remainingDeficitToCut <= 0) break;
        const amount = committedTargets.get(item.id) || 0;
        if (amount > 0) {
          const cut = Math.min(amount, remainingDeficitToCut);
          trimming_suggestions.push({
            need_id: item.id,
            need_name: item.name,
            priority: item.priority,
            original_amount: amount,
            suggested_cut: cut,
            new_amount: amount - cut,
            reason: `Pos penting. Pangkas Rp ${cut.toLocaleString('id-ID')} karena pemangkasan pos keinginan belum menutup seluruh defisit.`
          });
          remainingDeficitToCut -= cut;
        }
      }
    }

    if (remainingDeficitToCut > 0) {
      target_additional_income = deficit_amount;
    }
  } else if (total_income > 0 && net_remainder / total_income < 0.10) {
    status = 'ketat';
    status_label = 'Bujet Ketat';
    status_description = 'Sisa dana setelah kebutuhan terencana di bawah 10% pemasukan. Tunda belanja non-pokok.';
  } else if (total_income === 0) {
    status = 'ketat';
    status_label = 'Belum Ada Pemasukan';
    status_description = 'Masukkan target atau catat pemasukan untuk menghitung alokasi bujet.';
  }

  // 4. Distribute Net Remainder to Remainder Needs (% dari Sisa Kas)
  const remainderAllocations = new Map<string, number>();
  let totalRemainderPercent = remainderNeeds.reduce((acc, n) => acc + (n.percentage || 0), 0);
  if (totalRemainderPercent === 0 && remainderNeeds.length > 0) {
    totalRemainderPercent = 100;
  }

  if (net_remainder > 0) {
    for (const rn of remainderNeeds) {
      const weight = rn.percentage || (100 / (remainderNeeds.length || 1));
      const normalizedRatio = totalRemainderPercent > 0 ? weight / totalRemainderPercent : 0;
      const allocated = Math.round(net_remainder * normalizedRatio);
      remainderAllocations.set(rn.id, allocated);
      formulaLabels.set(
        rn.id,
        `${rn.percentage}% dari sisa kas (Rp ${net_remainder.toLocaleString('id-ID')})`
      );
    }
  } else {
    for (const rn of remainderNeeds) {
      remainderAllocations.set(rn.id, 0);
      formulaLabels.set(rn.id, `${rn.percentage}% dari sisa kas (Rp 0 saat defisit)`);
    }
  }

  // 5. Build Need Allocation items with actual spent comparison
  const allocations: NeedAllocationItem[] = [];
  let savings_total_allocated = 0;

  for (const need of activeNeeds) {
    const mode = getNeedAllocationMode(need);
    const isCommitted = mode !== 'percent_remainder';

    const weekly_target = isCommitted
      ? (committedTargets.get(need.id) || 0)
      : (remainderAllocations.get(need.id) || 0);

    const allocated_amount = isCommitted
      ? weekly_target
      : (remainderAllocations.get(need.id) || 0);

    const spent_amount = expenseTransactions
      .filter((t) => t.need_id === need.id)
      .reduce((acc, t) => acc + t.amount, 0);

    const remaining_amount = allocated_amount - spent_amount;
    const usage_percentage = allocated_amount > 0
      ? (spent_amount / allocated_amount) * 100
      : (spent_amount > 0 ? 100 : 0);

    const is_overbudget = spent_amount > allocated_amount;
    const overbudget_amount = is_overbudget ? spent_amount - allocated_amount : 0;

    if (isSavingsOrEmergencyNeed(need)) {
      savings_total_allocated += allocated_amount;
    }

    allocations.push({
      need,
      weekly_target,
      allocated_amount,
      spent_amount,
      remaining_amount,
      usage_percentage,
      is_overbudget,
      overbudget_amount,
      formula_label: formulaLabels.get(need.id) || 'Alokasi disesuaikan',
    });
  }

  // Sort allocations: Overbudget first, then Wajib -> Penting -> Keinginan
  allocations.sort((a, b) => {
    if (a.is_overbudget && !b.is_overbudget) return -1;
    if (!a.is_overbudget && b.is_overbudget) return 1;
    const aMode = getNeedAllocationMode(a.need);
    const bMode = getNeedAllocationMode(b.need);
    if (aMode !== 'percent_remainder' && bMode === 'percent_remainder') return -1;
    if (aMode === 'percent_remainder' && bMode !== 'percent_remainder') return 1;
    const pOrder = { wajib: 0, penting: 1, keinginan: 2 };
    return pOrder[a.need.priority] - pOrder[b.need.priority];
  });

  // 6. Savings Ratio & Surplus Advice
  const savings_ratio = total_income > 0
    ? (savings_total_allocated / total_income) * 100
    : 0;

  let surplus_advice: FinancialEngineResult['surplus_advice'] = undefined;

  if (status === 'aman' && total_income > 0) {
    const is_ideal = savings_ratio >= 20;
    let additional_income_for_ideal_savings = 0;
    if (!is_ideal) {
      const savingsShortfall = (0.20 * total_income) - savings_total_allocated;
      additional_income_for_ideal_savings = Math.max(0, Math.round(savingsShortfall));
    }

    const unitPerPeriod = periodMode === 'monthly' ? 'bulan' : 'minggu';
    surplus_advice = {
      current_savings_ratio: Math.round(savings_ratio * 10) / 10,
      is_ideal,
      additional_income_for_ideal_savings: !is_ideal ? additional_income_for_ideal_savings : undefined,
      recommended_savings_boost: is_ideal ? Math.round(net_remainder * 0.10) : undefined,
      note: is_ideal
        ? `Rasio tabungan dan darurat ${Math.round(savings_ratio)}%, memenuhi target 20%.`
        : `Rasio tabungan ${Math.round(savings_ratio)}%, di bawah target 20%. Tambah pemasukan Rp ${additional_income_for_ideal_savings.toLocaleString('id-ID')}/${unitPerPeriod} atau pangkas pos keinginan untuk menutup selisih.`
    };
  }

  return {
    total_income,
    total_expenses,
    actual_balance,
    fixed_total,
    net_remainder,
    status,
    status_label,
    status_description,
    allocations,
    deficit_amount,
    trimming_suggestions,
    target_additional_income,
    savings_total_allocated,
    savings_ratio: Math.round(savings_ratio * 10) / 10,
    surplus_advice,
  };
}

/**
 * Interactive What-If Simulation
 */
export function simulateWhatIf(
  currentIncome: number,
  currentNeeds: Need[],
  scenario: WhatIfScenario,
  periodMode: PeriodMode = 'weekly'
): WhatIfSimulationResult {
  const beforeResult = calculateHybridAllocation(currentIncome, currentNeeds, [], periodMode);

  let simulatedIncome = currentIncome;
  if (scenario.simulated_income_change !== undefined) {
    simulatedIncome = Math.max(0, currentIncome + scenario.simulated_income_change);
  }

  let simulatedNeeds = currentNeeds.map((n) => ({ ...n }));

  if (scenario.removed_need_id) {
    simulatedNeeds = simulatedNeeds.filter((n) => n.id !== scenario.removed_need_id);
  }

  if (scenario.added_or_modified_need) {
    const mod = scenario.added_or_modified_need;
    if (mod.id) {
      simulatedNeeds = simulatedNeeds.map((n) =>
        n.id === mod.id ? ({ ...n, ...mod } as Need) : n
      );
    } else {
      const dummyNewNeed: Need = {
        id: 'hypothetical-new-need',
        user_id: 'hypothetical',
        name: mod.name || 'Pos Tambahan Baru',
        type: mod.type || (mod.allocation_mode === 'percent_remainder' ? 'flexible' : 'fixed'),
        allocation_mode: mod.allocation_mode || 'nominal',
        priority: mod.priority || 'keinginan',
        billing_cycle: mod.billing_cycle || 'weekly',
        target_amount: mod.target_amount || 0,
        percentage: mod.percentage || 0,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      simulatedNeeds.push(dummyNewNeed);
    }
  }

  const afterResult = calculateHybridAllocation(simulatedIncome, simulatedNeeds, [], periodMode);

  const diffSavings = afterResult.savings_total_allocated - beforeResult.savings_total_allocated;
  const diffRemainder = afterResult.net_remainder - beforeResult.net_remainder;
  const is_viable = afterResult.status !== 'defisit';

  let impact_summary = '';
  let recommendation = '';

  if (afterResult.status === 'defisit') {
    impact_summary = `Bujet defisit Rp ${afterResult.deficit_amount.toLocaleString('id-ID')}.`;
    recommendation = `Tambah pemasukan Rp ${afterResult.deficit_amount.toLocaleString('id-ID')} atau pangkas pos keinginan sebelum menerapkan skenario ini.`;
  } else if (beforeResult.status === 'defisit') {
    impact_summary = `Status bujet berubah dari defisit menjadi ${afterResult.status}.`;
    recommendation = `Skenario ini aman untuk diterapkan.`;
  } else {
    const savingsChangeText = diffSavings < 0
      ? `mengurangi alokasi tabungan sebesar Rp ${Math.abs(diffSavings).toLocaleString('id-ID')}`
      : diffSavings > 0
      ? `menambah alokasi tabungan sebesar Rp ${diffSavings.toLocaleString('id-ID')}`
      : `tidak mengubah alokasi tabungan`;

    impact_summary = `Status bujet ${afterResult.status}. Skenario ini ${savingsChangeText} per ${periodMode === 'monthly' ? 'bulan' : 'minggu'}. Sisa dana bersih menjadi Rp ${afterResult.net_remainder.toLocaleString('id-ID')}.`;
    
    if (afterResult.savings_ratio >= 15) {
      recommendation = `Rasio tabungan tetap di angka ${afterResult.savings_ratio}%.`;
    } else {
      recommendation = `Rasio tabungan turun menjadi ${afterResult.savings_ratio}%, di bawah target 20%.`;
    }
  }

  return {
    before: {
      total_income: beforeResult.total_income,
      fixed_total: beforeResult.fixed_total,
      net_remainder: beforeResult.net_remainder,
      savings_amount: beforeResult.savings_total_allocated,
      status: beforeResult.status,
    },
    after: {
      total_income: afterResult.total_income,
      fixed_total: afterResult.fixed_total,
      net_remainder: afterResult.net_remainder,
      savings_amount: afterResult.savings_total_allocated,
      status: afterResult.status,
    },
    impact_summary,
    difference_savings: diffSavings,
    difference_remainder: diffRemainder,
    is_viable,
    recommendation,
  };
}
