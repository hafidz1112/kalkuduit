import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { exportWeeklyRecapToCSV } from '../lib/export';
import {
  HelpCircle,
  BookOpen,
  Download,
  RotateCcw,
  Layers,
  LogOut,
  Calendar,
  CalendarDays,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface ProfilePageProps {
  onStartTutorial: () => void;
  onOpenGuidebook: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onStartTutorial,
  onOpenGuidebook,
}) => {
  const { user, logout } = useAuth();
  const {
    periodMode,
    switchPeriodMode,
    selectedPeriod,
    engineResult,
    loadTemplate,
    resetData,
  } = useFinance();

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-lg font-extrabold text-[#14221C]">Profil & Pengaturan</h1>
        <p className="text-xs text-[#68736E]">Kelola akun, periode hitung, dan data keuanganmu.</p>
      </div>

      {/* User Card */}
      <div className="p-4 rounded-3xl bg-[#113829] text-white flex items-center gap-3.5 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-[#22533E] text-[#D7F0E0] font-extrabold text-lg flex items-center justify-center shrink-0">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold truncate">{user?.name || 'Pengguna'}</h2>
            <ShieldCheck className="w-3.5 h-3.5 text-[#B8DEC4] shrink-0" />
          </div>
          <p className="text-[11px] text-[#B8DEC4] truncate">{user?.email}</p>
        </div>
      </div>

      {/* Mode Periode */}
      <div className="p-4 rounded-3xl bg-white border border-[#E6E5DD] space-y-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#68736E] block">
          Mode Perhitungan Default
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => switchPeriodMode('weekly')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-colors ${
              periodMode === 'weekly'
                ? 'bg-[#113829] text-white'
                : 'bg-[#EFEFE8] text-[#14221C] hover:bg-[#E5E5DC]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Per Minggu</span>
          </button>
          <button
            type="button"
            onClick={() => switchPeriodMode('monthly')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs font-bold transition-colors ${
              periodMode === 'monthly'
                ? 'bg-[#113829] text-white'
                : 'bg-[#EFEFE8] text-[#14221C] hover:bg-[#E5E5DC]'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Per Bulan</span>
          </button>
        </div>
      </div>

      {/* Menu Actions */}
      <div className="rounded-3xl bg-white border border-[#E6E5DD] divide-y divide-[#EFEFE8] overflow-hidden">
        <button
          type="button"
          onClick={onOpenGuidebook}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EAEFE4] text-[#113829] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#14221C] block">Buku Panduan Pengguna</span>
              <span className="text-[11px] text-[#68736E]">Penjelasan lengkap menu, rumus & FAQ</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E9691]" />
        </button>

        <button
          type="button"
          onClick={onStartTutorial}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EFEFE8] text-[#113829] flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#14221C] block">Panduan Interaktif</span>
              <span className="text-[11px] text-[#68736E]">Putar ulang tutorial langkah demi langkah</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E9691]" />
        </button>

        <button
          type="button"
          onClick={async () => {
            if (confirm('Muat template rekomendasi pos kebutuhan awal (Bensin Rp 30rb, Makan 35%, WiFi bulanan, Jajan 10%, Tabungan 60%, Darurat 40%)?')) {
              await loadTemplate();
            }
          }}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EFEFE8] text-[#113829] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#14221C] block">Muat Template Pos</span>
              <span className="text-[11px] text-[#68736E]">Isi pos belanja & tabungan rekomendasi</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E9691]" />
        </button>

        <button
          type="button"
          onClick={() => selectedPeriod && exportWeeklyRecapToCSV(selectedPeriod.label, engineResult)}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[#FAF8F5] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#EFEFE8] text-[#113829] flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#14221C] block">Ekspor Data CSV</span>
              <span className="text-[11px] text-[#68736E]">Unduh ringkasan {selectedPeriod?.label || 'periode ini'}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E9691]" />
        </button>

        <button
          type="button"
          onClick={async () => {
            if (confirm('Reset semua pos kebutuhan, target, dan transaksi kembali ke nol?')) {
              await resetData();
            }
          }}
          className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-rose-50/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-rose-700 block">Reset Data ke Nol</span>
              <span className="text-[11px] text-[#68736E]">Bersihkan semua pos & catatan transaksi</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8E9691]" />
        </button>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={logout}
        className="w-full py-3 rounded-full bg-white border border-[#E6E5DD] text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span>Keluar dari Akun</span>
      </button>
    </div>
  );
};
