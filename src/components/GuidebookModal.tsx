import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Wallet,
  Layers,
  Calculator,
  HelpCircle,
  ArrowLeftRight,
  BarChart2,
  WalletCards,
  User,
  Home,
  Sparkles
} from 'lucide-react';

interface GuidebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartInteractiveTour: () => void;
}

type GuideSection = 'start' | 'needs' | 'actions' | 'faq';

export const GuidebookModal: React.FC<GuidebookModalProps> = ({
  isOpen,
  onClose,
  onStartInteractiveTour,
}) => {
  const [section, setSection] = useState<GuideSection>('start');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl bg-[#FAF8F5] shadow-2xl border border-[#E6E5DD] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#113829] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-[#B8DEC4]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">Buku Panduan KalkuDuit</h2>
              <p className="text-[11px] text-[#C8DFCE]">Panduan ringkas biar tidak bingung pakai</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-4 pt-3 pb-2 bg-white border-b border-[#E6E5DD] shrink-0">
          <div className="grid grid-cols-4 gap-1 bg-[#EFEFE8] p-1 rounded-2xl text-[11px] font-bold">
            {[
              { id: 'start', label: 'Mulai' },
              { id: 'needs', label: 'Pos & Rumus' },
              { id: 'actions', label: 'Catat & Uji' },
              { id: 'faq', label: 'Menu & FAQ' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSection(tab.id as GuideSection)}
                className={`py-2 px-1 rounded-xl transition-all whitespace-nowrap ${
                  section === tab.id
                    ? 'bg-[#113829] text-white shadow-2xs'
                    : 'text-[#68736E] hover:text-[#14221C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs text-[#14221C]">
          {section === 'start' && (
            <>
              <div className="p-4 rounded-2xl bg-[#EAEFE4] border border-[#DAE3D2] space-y-1.5">
                <span className="text-[11px] font-extrabold text-[#113829] uppercase tracking-wider block">
                  Konsep Dasar: P - F = S
                </span>
                <p className="text-[11px] text-[#35463D] leading-relaxed">
                  KalkuDuit bekerja otomatis dengan rumus <strong>Pemasukan (P) - Kebutuhan Terencana (F) = Sisa Bersih (S)</strong>. Setiap kamu ubah pemasukan atau tambah pos, seluruh jatah langsung terhitung ulang.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2.5">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#113829]" />
                  <span>3 Langkah Awal dari Rp 0</span>
                </h3>
                <div className="space-y-2 text-[11px] text-[#4B5852] leading-relaxed">
                  <p>
                    <strong>1. Atur Pemasukan (P):</strong> Di kartu hijau pada Beranda, ketuk tombol <strong>Ubah</strong>, masukkan target pemasukanmu (misal 400000), lalu tekan <strong>Simpan</strong>.
                  </p>
                  <p>
                    <strong>2. Buat Pos Anggaran:</strong> Ketuk tombol <strong>Tambah Pos</strong>. Bagi uangmu ke pos belanja (misal Bensin, Makan) dan pos tabungan. Jika ingin cepat, ketuk <strong>Alur → Muat Template</strong>.
                  </p>
                  <p>
                    <strong>3. Catat Transaksi Nyata:</strong> Setiap ada uang masuk atau belanja, tekan tombol tengah <strong>(⇄)</strong> atau <strong>Catat</strong>. Sisa jatah tiap pos langsung berkurang otomatis.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-1.5">
                <h3 className="text-xs font-extrabold">Filter Per Minggu vs Per Bulan</h3>
                <p className="text-[11px] text-[#4B5852] leading-relaxed">
                  Ketuk pill tanggal di kanan atas atau tombol <strong>Minggu / Bulan</strong> di kartu hijau untuk ganti mode:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#4B5852]">
                  <li><strong>Per Minggu:</strong> Tagihan bulanan otomatis dibagi 4 agar kamu tahu sisihan mingguannya.</li>
                  <li><strong>Per Bulan:</strong> Pos mingguan otomatis dikali 4 dan seluruh transaksi selama satu bulan digabung.</li>
                </ul>
              </div>
            </>
          )}

          {section === 'needs' && (
            <>
              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2.5">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#113829]" />
                  <span>3 Rumus Alokasi Pos</span>
                </h3>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEFE8] space-y-1">
                  <span className="font-bold text-[#113829] block">1. Nominal Tetap (Rp)</span>
                  <p className="text-[11px] text-[#5C6660] leading-relaxed">
                    Cocok untuk biaya yang angkanya pasti, seperti bensin atau tagihan WiFi. Bisa pilih siklus <strong>Mingguan</strong> atau <strong>Bulanan</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEFE8] space-y-1">
                  <span className="font-bold text-[#113829] block">2. % dari Pemasukan (P)</span>
                  <p className="text-[11px] text-[#5C6660] leading-relaxed">
                    Cocok untuk makan atau jajan yang ikut naik/turun sesuai besar pemasukan (misal 35% dari P).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#EFEFE8] space-y-1">
                  <span className="font-bold text-[#113829] block">3. % dari Sisa Kas (S)</span>
                  <p className="text-[11px] text-[#5C6660] leading-relaxed">
                    Cocok untuk <strong>Tabungan</strong> dan <strong>Dana Darurat</strong>. Membagi sisa uang bersih setelah semua pos terencana tertutup.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2">
                <h3 className="text-xs font-extrabold">Arti Prioritas Pos</h3>
                <div className="space-y-1.5 text-[11px] text-[#4B5852]">
                  <p>
                    <strong>• Wajib:</strong> Pengeluaran utama (bensin, makan pokok, tagihan). Tidak akan disentuh oleh saran pemangkasan defisit.
                  </p>
                  <p>
                    <strong>• Penting:</strong> Kebutuhan pendukung yang dipangkas hanya jika pemangkasan pos Keinginan belum cukup menutup defisit.
                  </p>
                  <p>
                    <strong>• Keinginan:</strong> Pos santai (ngopi, jajan, hiburan) yang paling dulu disarankan untuk dikurangi saat bujet defisit.
                  </p>
                </div>
              </div>
            </>
          )}

          {section === 'actions' && (
            <>
              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-[#113829]" />
                  <span>Mencatat Transaksi (Pengeluaran & Pemasukan)</span>
                </h3>
                <p className="text-[11px] text-[#4B5852] leading-relaxed">
                  Tekan tombol bulat hijau di tengah menu bawah untuk mencatat transaksi baru. Bisa juga tekan <strong>+ Catat</strong> langsung di salah satu kartu pos agar pos tersebut otomatis terpilih.
                </p>
                <div className="p-2.5 rounded-xl bg-[#EAEFE4] text-[11px] text-[#113829]">
                  <strong>Penting:</strong> Jika kamu sudah mencatat transaksi <strong>Pemasukan</strong>, angka Pemasukan (P) otomatis memakai jumlah pemasukan nyata. Jika belum ada, sistem memakai angka <strong>Target</strong>.
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2">
                <h3 className="text-xs font-extrabold">Arti Status Keuangan</h3>
                <div className="space-y-1.5 text-[11px] text-[#4B5852]">
                  <p>
                    <strong>• Aman:</strong> Pemasukan menutup seluruh pos terencana dan masih menyisakan dana untuk tabungan (target rasio tabungan ideal 20%).
                  </p>
                  <p>
                    <strong>• Ketat:</strong> Pemasukan masih Rp 0, atau sisa kas setelah pos terencana kurang dari 10% pemasukan.
                  </p>
                  <p>
                    <strong>• Defisit:</strong> Total pos terencana melebihi pemasukan. Muncul tombol <strong>Pangkas Otomatis</strong> untuk menyesuaikan pos Keinginan.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-1.5">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-[#113829]" />
                  <span>Fitur Simulasi (What-If)</span>
                </h3>
                <p className="text-[11px] text-[#4B5852] leading-relaxed">
                  Mau coba nambah pos jajan baru atau cek dampak kalau pemasukan turun? Buka <strong>Simulasi</strong> di Beranda. Kamu bisa lihat perbandingan <em>Sebelum vs Sesudah</em> tanpa merusak data asli, lalu tekan <strong>Terapkan ke Bujet</strong> jika cocok.
                </p>
              </div>
            </>
          )}

          {section === 'faq' && (
            <>
              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2.5">
                <h3 className="text-xs font-extrabold">Fungsi 4 Menu Bawah</h3>
                <div className="space-y-2 text-[11px] text-[#4B5852]">
                  <p className="flex items-start gap-2">
                    <Home className="w-4 h-4 text-[#113829] shrink-0 mt-0.5" />
                    <span><strong>Beranda:</strong> Ringkasan saldo, tombol cepat, saran bujet, dan transaksi terbaru.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <BarChart2 className="w-4 h-4 text-[#113829] shrink-0 mt-0.5" />
                    <span><strong>Analitik:</strong> Grafik donat pengeluaran per kategori, tren 4 pekan dalam bulan aktif, dan evaluasi pos.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <WalletCards className="w-4 h-4 text-[#113829] shrink-0 mt-0.5" />
                    <span><strong>Pos:</strong> Daftar lengkap seluruh pos, sakelar aktif/nonaktif sementara, dan edit nominal.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <User className="w-4 h-4 text-[#113829] shrink-0 mt-0.5" />
                    <span><strong>Profil:</strong> Ganti mode Mingguan/Bulanan, ekspor CSV, muat template, reset data, dan panduan.</span>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E6E5DD] space-y-2.5">
                <h3 className="text-xs font-extrabold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#113829]" />
                  <span>Pertanyaan Umum (FAQ)</span>
                </h3>
                <div className="space-y-2 text-[11px] text-[#4B5852] leading-relaxed">
                  <div>
                    <strong className="text-[#14221C] block">Kenapa saldo awal saya Rp 0?</strong>
                    Akun baru sengaja dimulai dari Rp 0 agar kamu bebas mengisi target pemasukan dan pos sesuai kondisimu sendiri.
                  </div>
                  <div>
                    <strong className="text-[#14221C] block">Bagaimana menyembunyikan angka di tempat umum?</strong>
                    Ketuk ikon mata di samping tulisan <em>Pemasukan Pekan/Bulan Ini</em> pada kartu hijau Beranda.
                  </div>
                  <div>
                    <strong className="text-[#14221C] block">Bagaimana cara mengulang dari awal lagi?</strong>
                    Buka tab <strong>Profil → Reset Data ke Nol</strong>. Jika ingin contoh susunan pos siap pakai, pilih <strong>Muat Template Pos</strong>.
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E6E5DD] flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartInteractiveTour();
            }}
            className="flex-1 py-2.5 px-3 rounded-full text-xs font-bold text-[#113829] bg-[#EAEFE4] hover:bg-[#DCE4D5] transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Putar Panduan Klik</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-full text-xs font-bold text-white bg-[#113829] hover:bg-[#0D2D20] transition-colors"
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
