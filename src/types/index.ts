export type NeedType = 'fixed' | 'flexible';
export type NeedAllocationMode = 'nominal' | 'percent_income' | 'percent_remainder';
export type NeedPriority = 'wajib' | 'penting' | 'keinginan';
export type BillingCycle = 'weekly' | 'monthly';
export type PeriodMode = 'weekly' | 'monthly';
export type TransactionType = 'income' | 'expense';
export type FinancialHealthStatus = 'aman' | 'ketat' | 'defisit';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
}

export interface Need {
  id: string;
  user_id: string;
  name: string;
  type: NeedType; // 'fixed' (terencana) or 'flexible' (sisa kas)
  allocation_mode?: NeedAllocationMode; // 'nominal' | 'percent_income' | 'percent_remainder'
  priority: NeedPriority; // 'wajib' | 'penting' | 'keinginan'
  billing_cycle: BillingCycle; // 'weekly' | 'monthly'
  target_amount: number; // For nominal: weekly amount or monthly amount (converted).
  percentage: number; // For percent_income: % of total income (e.g. 25 for 25%). For percent_remainder: % of surplus.
  is_active: boolean;
  icon?: string;
  color?: string;
  note?: string;
  created_at: string;
}

export interface WeeklyPeriod {
  id: string;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  label: string; // e.g. "24 Nov - 30 Nov 2026"
  total_income_target: number;
  notes?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  period_id?: string;
  need_id?: string | null; // null if general income or unassigned
  type: TransactionType; // 'income' | 'expense'
  amount: number;
  date: string; // YYYY-MM-DD
  note: string;
  created_at: string;
}

export interface NeedAllocationItem {
  need: Need;
  weekly_target: number; // Weekly equivalent (converted if monthly)
  allocated_amount: number; // Budget allocated for this week by engine
  spent_amount: number; // Actual spent from transactions
  remaining_amount: number; // allocated_amount - spent_amount
  usage_percentage: number; // (spent_amount / allocated_amount) * 100
  is_overbudget: boolean;
  overbudget_amount: number;
  formula_label?: string; // Human-friendly formula explanation
}

export interface DeficitTrimmingSuggestion {
  need_id: string;
  need_name: string;
  priority: NeedPriority;
  original_amount: number;
  suggested_cut: number;
  new_amount: number;
  reason: string;
}

export interface FinancialEngineResult {
  total_income: number;
  total_expenses: number;
  actual_balance: number; // total_income - total_expenses
  fixed_total: number;
  net_remainder: number; // total_income - fixed_total
  status: FinancialHealthStatus;
  status_label: string;
  status_description: string;
  allocations: NeedAllocationItem[];
  deficit_amount: number;
  trimming_suggestions: DeficitTrimmingSuggestion[];
  target_additional_income: number;
  savings_total_allocated: number;
  savings_ratio: number; // (savings + emergency) / total_income * 100
  surplus_advice?: {
    current_savings_ratio: number;
    is_ideal: boolean;
    additional_income_for_ideal_savings?: number;
    recommended_savings_boost?: number;
    note: string;
  };
}

export interface WhatIfScenario {
  added_or_modified_need?: Partial<Need> & { id?: string };
  simulated_income_change?: number; // delta to income (+ or -)
  removed_need_id?: string;
}

export interface WhatIfSimulationResult {
  before: {
    total_income: number;
    fixed_total: number;
    net_remainder: number;
    savings_amount: number;
    status: FinancialHealthStatus;
  };
  after: {
    total_income: number;
    fixed_total: number;
    net_remainder: number;
    savings_amount: number;
    status: FinancialHealthStatus;
  };
  impact_summary: string;
  difference_savings: number;
  difference_remainder: number;
  is_viable: boolean;
  recommendation: string;
}
