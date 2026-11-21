LOPPOMART 3.1 — KEUANGAN & OPERASIONAL WARUNG

YANG BARU DI 3.1:
- Tampilan responsif: HP, tablet, dan desktop (menu samping + daftar belanja dua kolom).
- Teks lebih besar, tombol lebih mudah diketuk, input angka tidak memicu zoom di iPhone.
- Saldo kas akhir menempel di atas saat mengisi catatan, plus petunjuk nilai Rupiah di tiap kolom.
- Tombol Kemarin / Hari ini, peringatan jika HPP > omzet atau saldo minus.
- Saldo awal catatan berikutnya ikut menyesuaikan saat catatan sebelumnya diubah/dihapus.
- Hapus bisa diurungkan (tombol Urungkan), tidak lagi pakai kotak konfirmasi.
- Daftar belanja: centang cepat, edit barang, cari, bagikan ke WhatsApp, bersihkan yang sudah dibeli.
- Laporan: tombol bulan sebelumnya/berikutnya, grafik omzet harian, CSV berjudul bahasa Indonesia.
- Pengingat backup (titik di ikon atas jika lebih dari 7 hari), impor backup lebih aman.
- Tombol Back di HP kini berpindah antar menu, bukan keluar aplikasi.
- Service worker mengambil versi terbaru lebih dulu, jadi update langsung terlihat.

Isi paket:
- index.html: struktur aplikasi
- styles.css: tampilan responsif hijau, dashboard, kartu, dan navigasi bawah
- app.js: fungsi catatan harian, daftar belanja, laporan, backup/pemulihan
- manifest.webmanifest: pengaturan instalasi PWA
- icon.svg: ikon aplikasi
- launchericon-*.png: ikon PNG untuk install ke layar utama
- sw.js: cache offline

CARA UPDATE GITHUB DARI HP:
1. Ekstrak ZIP.
2. Buka repository LoppoMart di GitHub.
3. Pastikan branch yang dipilih adalah main.
4. Add file > Upload files.
5. Unggah file yang berubah ke folder utama repository (root):
   index.html, styles.css, app.js, manifest.webmanifest, sw.js, README.txt
   (icon.svg dan launchericon-*.png tidak berubah)
6. Pilih Commit directly to main branch > Commit changes.
7. Tunggu GitHub Pages selesai menerbitkan perubahan.
8. Buka ulang website LoppoMart.

PENTING TENTANG DATA:
- Versi ini mempertahankan kunci penyimpanan browser yang dipakai versi 2:
  loppomart_v2_records dan loppomart_v2_shopping.
- Migrasi cadangan dari kunci loppomart_v1 juga dicoba.
- Jangan hapus data browser / site data.
- Buat backup JSON dari menu Lainnya sebelum update jika memungkinkan.
- Data tersimpan lokal di browser/perangkat; belum tersinkron otomatis ke cloud.
- Setelah update, buka website yang sama di browser yang sama agar data lokal tetap terbaca.

RUMUS:
Saldo akhir = saldo awal + omzet - belanja stok - tagihan sales - gaji - operasional - pengambilan pribadi - cicilan.
Laba kotor = omzet - HPP.
Laba operasional = omzet - HPP - gaji - operasional.
HPP tidak dikurangkan lagi dari kas karena pembelian stok dan pembayaran tagihan dicatat terpisah.
