import { Transaction, NeedAllocationItem, FinancialEngineResult } from '../types';
import { formatDateIndo, formatIDR } from './utils';

/**
 * Trigger download of a text/csv file with BOM for Microsoft Excel compatibility
 */
export function downloadCSV(filename: string, csvContent: string): void {
  // UTF-8 BOM to make Excel render accents and formatting properly
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Weekly Recap & Allocation vs Actual to CSV
 */
export function exportWeeklyRecapToCSV(
  weekLabel: string,
  engineResult: FinancialEngineResult
): void {
  const lines: string[] = [];

  lines.push(`LAPORAN KEUANGAN MINGGUAN - KALKUDUIT`);
  lines.push(`Periode:,"${weekLabel}"`);
  lines.push(`Tanggal Cetak:,"${new Date().toLocaleString('id-ID')}"`);
  lines.push('');

  lines.push(`RINGKASAN EKSEKUTIF`);
  lines.push(`Total Pemasukan,${engineResult.total_income}`);
  lines.push(`Total Pengeluaran Aktual,${engineResult.total_expenses}`);
  lines.push(`Sisa Saldo Kas,${engineResult.actual_balance}`);
  lines.push(`Total Kebutuhan Tetap (Fixed),${engineResult.fixed_total}`);
  lines.push(`Sisa Bersih Fleksibel,${engineResult.net_remainder}`);
  lines.push(`Status Kesehatan Finansial,"${engineResult.status_label}"`);
  lines.push(`Rasio Tabungan,${engineResult.savings_ratio}%`);
  lines.push('');

  lines.push(`RINCIAN ALOKASI BUJET & REALISASI PENGELUARAN`);
  lines.push(`Nama Pos,Tipe,Prioritas,Siklus,Bujet Rencana (Rp),Realisasi (Rp),Sisa Kuota (Rp),Status Pengeluaran`);

  for (const item of engineResult.allocations) {
    const cycle = item.need.billing_cycle === 'monthly' ? 'Bulanan (dikonversi)' : 'Mingguan';
    const statusNote = item.is_overbudget
      ? `Overbudget (+Rp ${item.overbudget_amount.toLocaleString('id-ID')})`
      : 'Sesuai Bujet';

    lines.push(
      `"${item.need.name}","${item.need.type}","${item.need.priority}","${cycle}",${item.allocated_amount},${item.spent_amount},${item.remaining_amount},"${statusNote}"`
    );
  }

  if (engineResult.trimming_suggestions.length > 0) {
    lines.push('');
    lines.push(`SARAN PEMANGKASAN DEFISIT ENGINE`);
    lines.push(`Pos,Prioritas,Nominal Awal,Disarankan Pangkas,Nominal Baru,Alasan`);
    for (const s of engineResult.trimming_suggestions) {
      lines.push(
        `"${s.need_name}","${s.priority}",${s.original_amount},${s.suggested_cut},${s.new_amount},"${s.reason}"`
      );
    }
  }

  const csvContent = lines.join('\r\n');
  const safeFilename = `Rekap_Mingguan_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  downloadCSV(safeFilename, csvContent);
}

/**
 * Export Transactions list to CSV
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  needMap: Map<string, string>,
  title = 'Daftar_Transaksi'
): void {
  const lines: string[] = [];

  lines.push(`RIWAYAT TRANSAKSI - KALKUDUIT`);
  lines.push(`Tanggal Export:,"${new Date().toLocaleString('id-ID')}"`);
  lines.push('');
  lines.push(`Tanggal,Jenis,Kategori/Pos,Nominal (Rp),Catatan`);

  for (const t of transactions) {
    const categoryName = t.need_id ? (needMap.get(t.need_id) || 'Kebutuhan Terhapus') : 'Umum / Pemasukan';
    const typeLabel = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    lines.push(
      `"${t.date}","${typeLabel}","${categoryName}",${t.amount},"${(t.note || '').replace(/"/g, '""')}"`
    );
  }

  const csvContent = lines.join('\r\n');
  downloadCSV(`${title}_${new Date().toISOString().slice(0, 10)}.csv`, csvContent);
}

/**
 * Export Monthly Recap (4 Weeks) to CSV
 */
export function exportMonthlyRecapToCSV(
  monthLabel: string,
  weeklyBreakdown: { weekLabel: string; income: number; expense: number; balance: number; savings: number }[],
  topCategories: { categoryName: string; amount: number; percentage: number }[],
  summary: { totalIncome: number; totalExpense: number; netSavings: number; avgWeeklyExpense: number }
): void {
  const lines: string[] = [];

  lines.push(`REKAPITULASI BULANAN KEUANGAN (4 MINGGU) - KALKUDUIT`);
  lines.push(`Bulan:,"${monthLabel}"`);
  lines.push(`Tanggal Export:,"${new Date().toLocaleString('id-ID')}"`);
  lines.push('');

  lines.push(`RINGKASAN TOTAL BULANAN`);
  lines.push(`Total Pemasukan Bulan Ini,${summary.totalIncome}`);
  lines.push(`Total Pengeluaran Bulan Ini,${summary.totalExpense}`);
  lines.push(`Total Tabungan Terkumpul,${summary.netSavings}`);
  lines.push(`Rata-rata Pengeluaran Mingguan,${summary.avgWeeklyExpense}`);
  lines.push('');

  lines.push(`PERKEMBANGAN MINGGU KE MINGGU`);
  lines.push(`Minggu,Pemasukan (Rp),Pengeluaran (Rp),Tabungan (Rp),Sisa Kas (Rp)`);
  for (const w of weeklyBreakdown) {
    lines.push(`"${w.weekLabel}",${w.income},${w.expense},${w.savings},${w.balance}`);
  }
  lines.push('');

  lines.push(`KATEGORI PENGELUARAN TERBESAR BULAN INI`);
  lines.push(`Kategori/Pos,Total Terpakai (Rp),Porsi Dari Total Pengeluaran`);
  for (const cat of topCategories) {
    lines.push(`"${cat.categoryName}",${cat.amount},${cat.percentage.toFixed(1)}%`);
  }

  const csvContent = lines.join('\r\n');
  const safeFilename = `Rekap_Bulanan_${monthLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  downloadCSV(safeFilename, csvContent);
}
