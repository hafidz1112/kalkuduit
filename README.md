# KalkuDuit - Sistem Manajemen Keuangan Mingguan Adaptif

Aplikasi web manajemen keuangan pribadi mingguan yang adaptif. Berbeda dari aplikasi pencatat keuangan biasa yang pasif, **KalkuDuit** secara otomatis menghitung ulang alokasi bujet dan memberikan saran rumus finansial setiap kali pemasukan berubah atau ada kebutuhan baru yang ditambahkan.

---

## 🌟 Fitur Utama Sesuai Spesifikasi

### 1. Manajemen Pemasukan & Pengeluaran (Transaksi Cepat)
* **Pencatatan Instan (Mobile-First):** Input transaksi dalam 1-2 klik lewat tombol floating (+) atau drawer modal.
* **Live Budget Impact:** Menampilkan sisa kuota pos dan peringatan overbudget secara real-time saat nominal diketik.
* **Riwayat & Multi-Filter:** Filter transaksi berdasarkan periode mingguan, kategori pos, jenis transaksi (Pemasukan/Pengeluaran), atau pencarian catatan.
* **Edit & Hapus Cepat:** Mengubah atau menghapus data transaksi dengan pembaruan otomatis ke saldo kas dan sisa bujet.

### 2. Manajemen Kebutuhan Custom (Dinamis)
* **Kebutuhan Tetap (*Fixed*):** Nominal dikunci per minggu (contoh: Bensin Rp30.000, Makan Rp150.000).
* **Kebutuhan Fleksibel (*Variable*):** Menyesuaikan persentase sisa surplus bersih $S = P - F$ (contoh: Tabungan 50%, Dana Darurat 30%, Uang Bebas 20%).
* **Konversi Siklus Otomatis:** Input tagihan bulanan (misal: WiFi Rp119.000/bulan) langsung dikonversi otomatis ke sisihan mingguan praktis (~Rp30.000/minggu).
* **Skala Prioritas:** Klasifikasi *Wajib*, *Penting*, atau *Keinginan* sebagai basis algoritma pemangkasan defisit.

### 3. Engine Saran Rumus Finansial (Hybrid Allocation)
1. **Total Pemasukan Mingguan ($P$):** Menjumlahkan pemasukan aktual atau target.
2. **Kunci Kebutuhan Tetap ($F$):** Mengunci pos tetap terlebih dahulu.
3. **Hitung Sisa Bersih:** $S = P - F$.
4. **Evaluasi Defisit vs Surplus:**
   * **Kondisi Defisit ($S < 0$):**
     * Sistem memberi peringatan status *Bahaya*.
     * Algoritma *Smart Trimming* menyarankan pemangkasan pos pengeluaran dimulai dari prioritas *Keinginan* tanpa menyentuh kebutuhan *Wajib*.
     * Menampilkan tombol **"Terapkan Saran Pemangkasan Otomatis"** dan target pemasukan tambahan yang harus dicari minggu itu.
   * **Kondisi Surplus ($S \ge 0$):**
     * Membagikan sisa bersih ke pos fleksibel (Tabungan, Dana Darurat, Bebas).
     * Mengevaluasi rasio tabungan & darurat terhadap target standar ideal 20%. Jika di bawah 15%, sistem menghitungkan target pemasukan tambahan untuk mencapai rasio 20%.

### 4. Simulasi "What-If" Interaktif (Sandbox)
* Uji coba skenario finansial sebelum diterapkan:
  * Menambah pos kebutuhan baru (misal: jajan Rp25.000/minggu).
  * Kenaikan atau penurunan pemasukan mingguan.
  * Mengubah nominal pos yang sudah ada.
* Menampilkan perbandingan *Sebelum vs. Sesudah* secara berdampingan lengkap dengan analisa kelayakan dan tombol **"Terapkan ke Bujet Nyata"**.

### 5. Dashboard & Rekap Bulanan
* **Progress Bar Rencana vs. Realisasi:** Warna dinamis (Hijau $\le 75\%$, Kuning $75\%-99\%$, Merah $\ge 100\%$ Overbudget).
* **Rekap 4 Minggu Bulanan:** Total tabungan terkumpul, rata-rata pengeluaran per minggu, tren mingguan, dan 5 kategori pengeluaran terbesar.
* **Export Data:** Unduh rekap mingguan, riwayat transaksi, dan rekap bulanan ke format file CSV / Excel kompatibel.

---

## 🚀 Cara Menjalankan Aplikasi

### Persyaratan:
* Node.js versi 18+ (disarankan versi 20 atau 24)
* npm versi 9+

### Menjalankan dalam Mode Pengembangan (Development):
```bash
npm run dev
```
Buka browser di: `http://localhost:3000`

### Menjalankan dalam Mode Produksi (Fullstack Single Server):
```bash
# 1. Build frontend
npm run build

# 2. Jalankan server
npm run server
```

---

## 👤 Akun Bawaan (Demo)

Aplikasi telah dilengkapi fitur **1-Klik Masuk sebagai Akun Demo**:
* **Email:** `demo@kalkuduit.id`
* **Password:** `password123`

User juga dapat mendaftarkan akun baru sendiri kapan saja.

---

## 📂 Struktur Data & Entitas Utama

| Entitas | Deskripsi | Field Kunci |
|---|---|---|
| `users` | Akun pengguna terotentikasi | `id`, `name`, `email`, `password_hash` |
| `needs` | Pos kebutuhan kustom | `id`, `user_id`, `name`, `type` (fixed/flexible), `priority` (wajib/penting/keinginan), `billing_cycle` (weekly/monthly), `target_amount`, `percentage`, `is_active` |
| `weekly_periods` | Periode minggu kerja & target | `id`, `user_id`, `start_date`, `end_date`, `total_income_target` |
| `transactions` | Catatan transaksi riil | `id`, `user_id`, `need_id`, `type` (income/expense), `amount`, `date`, `note` |
