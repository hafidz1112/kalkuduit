# Buku Panduan Pengguna KalkuDuit

Panduan singkat ini menjelaskan fungsi setiap menu, rumus perhitungan, dan langkah memakai **KalkuDuit** dari awal agar kamu tidak bingung saat mengatur keuangan mingguan maupun bulanan di HP.

---

## 1. Cara Kerja KalkuDuit (`P - F = S`)

KalkuDuit membagi uang kamu secara otomatis menggunakan rumus:

- **P (Pemasukan):** Target pemasukan periode ini, atau total transaksi **Pemasukan** yang sudah kamu catat.
- **F (Kebutuhan Terencana):** Total jatah pos yang sifatnya tetap atau mengikuti persentase pemasukan.
- **S (Sisa Bersih):** `P - F`. Dana sisa ini otomatis dibagikan ke pos **Tabungan** atau **Dana Darurat** yang memakai rumus `% Sisa Kas`.

---

## 2. Langkah Memulai dari Rp 0

Saat baru membuat akun, seluruh angka dimulai dari **Rp 0** agar kamu bebas menyusunnya sesuai kondisi sendiri.

1. **Masuk atau Daftar Akun**
   - Pilih **Daftar Akun** untuk membuat akun pribadi baru, atau pilih **Coba Akun Demo** jika ingin melihat contoh data terlebih dahulu.
2. **Isi Target Pemasukan (P)**
   - Di halaman **Beranda**, lihat kartu hijau bagian atas.
   - Ketuk tombol **Ubah**, ketik nominal pemasukanmu (contoh: `400000`), lalu ketuk **Simpan**.
3. **Buat Pos Anggaran**
   - Ketuk tombol **Tambah Pos** di baris aksi cepat (atau buka tab **Pos**).
   - Jika ingin langsung pakai contoh pos yang sudah tersusun, ketuk tombol **Alur → Muat Template** (atau di tab **Profil → Muat Template Pos**).
4. **Catat Pemasukan & Pengeluaran**
   - Ketuk tombol bulat hijau **`⇄`** di tengah menu bawah (atau tombol **Catat** di Beranda).
   - Pilih **Pengeluaran** atau **Pemasukan**, isi nominal, pilih pos terkait, lalu simpan.

---

## 3. Memilih Mode Per Minggu & Per Bulan

Ketuk filter tanggal di pojok kanan atas Beranda (atau pill **Minggu / Bulan** di dalam kartu hijau):

- **Per Minggu:**
  - Cocok untuk mengontrol jatah jajan dan belanja harian per 7 hari.
  - Pos bertagihan **Bulanan** (misal WiFi Rp 120.000/bulan) otomatis dibagi 4 menjadi sisihan **Rp 30.000/pekan**.
- **Per Bulan:**
  - Cocok untuk melihat gambaran penuh satu bulan.
  - Pos **Mingguan** (misal Bensin Rp 30.000/pekan) otomatis dikali 4 menjadi **Rp 120.000/bulan**, dan semua transaksi sepanjang bulan tersebut otomatis digabung.

Gunakan tombol panah `<` dan `>` untuk berpindah ke pekan atau bulan sebelum/berikutnya.

---

## 4. Jenis Rumus & Prioritas Pos

Saat menekan **Tambah Pos**, kamu bebas memilih satu dari tiga rumus:

1. **Nominal Tetap (Rp):**
   Untuk pengeluaran dengan angka pasti (contoh: Bensin Rp 30.000/pekan atau WiFi Rp 120.000/bulan).
2. **% dari Pemasukan (P):**
   Untuk pos yang besarnya menyesuaikan penghasilan (contoh: Makan 35% dari pemasukan). Jika pemasukan naik atau turun, jatah pos ini ikut berubah otomatis.
3. **% dari Sisa Kas (S = P - F):**
   Khusus untuk **Tabungan**, **Investasi**, atau **Dana Darurat**. Mengambil persentase dari uang sisa setelah kebutuhan terencana terpenuhi.

### Skala Prioritas Pos
- **Wajib:** Kebutuhan pokok yang dilindungi saat kondisi defisit.
- **Penting:** Kebutuhan pendukung yang hanya disentuh jika pemangkasan pos Keinginan belum cukup.
- **Keinginan:** Belanja santai/hiburan (seperti ngopi atau jajan) yang paling pertama disarankan untuk dikurangi saat anggaran defisit.

---

## 5. Status Kesehatan Anggaran & Simulasi

Di bagian atas kartu saldo akan muncul salah satu status berikut:

- **Aman:** Pemasukan cukup menutup seluruh kebutuhan terencana dan masih ada sisa. Sistem juga menghitung apakah rasio tabunganmu sudah mencapai target ideal **20%**.
- **Ketat:** Pemasukan masih Rp 0, atau sisa kas bersih berada di bawah **10%** dari pemasukan.
- **Defisit:** Total kebutuhan terencana melebihi pemasukan (`S < 0`). Kamu bisa menekan tombol **Pangkas Otomatis** pada banner saran untuk menurunkan pos prioritas *Keinginan* secara instan.

### Fitur Simulasi (What-If)
Sebelum membeli barang baru atau saat pemasukan berubah, ketuk **Simulasi** di Beranda untuk menguji skenarionya dulu. Hasil simulasi menampilkan perbandingan **Sebelum vs Sesudah** tanpa mengubah data asli sampai kamu menekan **Terapkan ke Bujet**.

---

## 6. Penjelasan 4 Menu Bawah

- **Beranda:** Kartu saldo utama (dilengkapi ikon mata untuk menyembunyikan angka), 4 tombol cepat (**Catat**, **Tambah Pos**, **Simulasi**, **Alur**), ringkasan pos, dan transaksi terbaru.
- **Analitik:** Grafik donat pengeluaran per pos, tab **Pengeluaran / Pemasukan / Tabungan / Rincian Pos**, grafik batang tren 4 pekan dalam bulan aktif, dan tombol unduh **CSV**.
- **Tombol Tengah (`⇄`):** Jalan pintas 1 ketuk untuk mencatat transaksi baru kapan saja.
- **Pos:** Halaman penuh untuk mengelola seluruh pos anggaran, mengaktifkan/menonaktifkan pos sementara tanpa menghapusnya, edit, dan catat cepat ke pos tertentu.
- **Profil:** Pengaturan mode default (Mingguan/Bulanan), **Buku Panduan Lengkap**, putar ulang **Panduan Interaktif**, **Muat Template Pos**, **Ekspor Data CSV**, **Reset Data ke Nol**, dan **Keluar dari Akun**.
