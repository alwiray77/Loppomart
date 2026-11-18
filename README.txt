LOPPOMART 3.0 — KEUANGAN & OPERASIONAL WARUNG

Isi paket:
- index.html: struktur aplikasi
- styles.css: tampilan responsif hijau, dashboard, kartu, dan navigasi bawah
- app.js: fungsi catatan harian, daftar belanja, laporan, backup/pemulihan
- manifest.webmanifest: pengaturan instalasi PWA
- icon.svg: ikon aplikasi
- sw.js: cache offline

CARA UPDATE GITHUB DARI HP:
1. Ekstrak ZIP.
2. Buka repository loppomart-keuangan.
3. Pastikan branch yang dipilih adalah main.
4. Add file > Upload files.
5. Unggah keenam file ke folder utama repository (root):
   index.html, styles.css, app.js, manifest.webmanifest, icon.svg, sw.js
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
