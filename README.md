# Invenza — Sistem Inventaris Barang

## 1. Nama Proyek
**Invenza** — Aplikasi Sistem Inventaris Barang berbasis Progressive Web App (PWA).

## 2. Deskripsi
Invenza adalah aplikasi web sederhana untuk mengelola data inventaris barang toko. Aplikasi ini dibangun menggunakan **HTML, CSS, dan JavaScript (vanilla)** di sisi frontend, dengan **Supabase** sebagai backend (database, authentication, dan storage). Invenza menerapkan konsep **CRUD (Create, Read, Update, Delete)** secara nyata terhadap data barang yang tersimpan di database PostgreSQL milik Supabase.

## 3. Tujuan
Membantu pemilik toko, karyawan, atau administrator inventaris untuk:
- Membuat akun & login dengan aman
- Menambah, melihat, mencari, memfilter, mengubah, dan menghapus data barang
- Mengupload gambar barang
- Memantau statistik inventaris (total barang, total stok, kategori, stok menipis) secara real-time
- Menginstall aplikasi seperti aplikasi native lewat PWA

## 4. Fitur
| Fitur | Status |
|---|---|
| Sign Up (Daftar Akun) | ✅ |
| Login | ✅ |
| Logout | ✅ |
| Lupa Password (Reset via Email) | ✅ |
| Authentication Guard (proteksi halaman) | ✅ |
| **Isolasi data per akun (RLS + `user_id`)** | ✅ |
| Dashboard & Statistik Real-time (per akun) | ✅ |
| Tambah Barang (Create) | ✅ |
| Lihat Daftar Barang (Read) | ✅ |
| Detail Barang | ✅ |
| Edit Barang (Update) | ✅ |
| Hapus Barang (Delete) | ✅ |
| Pencarian Barang | ✅ |
| Filter Kategori & Status Stok | ✅ |
| Upload Gambar Barang | ✅ |
| Badge Status Stok (Aman/Menipis/Habis) | ✅ |
| Halaman About | ✅ |
| Download Data (JSON, SQL, Excel) | ✅ |
| Toast Notification | ✅ |
| Responsive (Desktop, Tablet, Mobile) | ✅ |
| Progressive Web App (installable) | ✅ |

## 5. Teknologi
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla, tanpa framework)
- **Backend:** Supabase (Database, Auth, Storage)
- **Database:** PostgreSQL (melalui Supabase)
- **Library:** `@supabase/supabase-js` v2 (dimuat via CDN)

## 6. Struktur Folder
```
invenza/
│
├── index.html              # Splash screen + pengecekan session
├── login.html               # Halaman login
├── signup.html               # Halaman daftar akun
├── reset-password.html       # Halaman lupa/reset password
├── dashboard.html             # Dashboard & statistik
├── products.html               # Data barang (list, search, filter, CRUD modal)
├── product-detail.html          # Detail satu barang
├── about.html                    # Tentang aplikasi & credit NexByte
├── download.html                  # Export data (JSON, SQL, Excel)
│
├── manifest.json               # Konfigurasi PWA
├── service-worker.js            # Caching asset PWA
├── supabase.sql                 # Script SQL lengkap (tabel, RLS per-user, storage, dummy data)
│
├── assets/
│   ├── images/
│   └── icons/                  # Icon aplikasi (192px, 512px, favicon)
│
├── css/
│   ├── style.css                # Style global (tombol, modal, sidebar, footer, dsb.)
│   ├── auth.css                 # Style login/signup/reset/splash
│   ├── dashboard.css             # Style dashboard
│   ├── products.css              # Style data barang & detail
│   ├── about.css                 # Style halaman About
│   └── download.css              # Style halaman Download Data
│
└── js/
    ├── config.js                 # Kredensial Supabase (WAJIB DIISI)
    ├── supabase.js                # Inisialisasi client Supabase
    ├── utils.js                   # Fungsi bantuan (toast, format, validasi, dsb.)
    ├── auth.js                     # requireAuth(), getCurrentUserId(), logout, session listener
    ├── login.js                    # Logika halaman login
    ├── signup.js                    # Logika halaman daftar
    ├── reset-password.js             # Logika lupa/reset password
    ├── dashboard.js                   # Logika statistik dashboard (per akun)
    ├── products.js                     # Logika CRUD data barang (per akun)
    ├── product-detail.js                # Logika halaman detail barang (per akun)
    └── download.js                       # Export data JSON/SQL/Excel (per akun)
```

## 7. Cara Membuat Project Supabase
1. Buka [https://supabase.com](https://supabase.com) lalu buat akun / login.
2. Klik **New Project**.
3. Isi nama project (misalnya `invenza`), buat password database yang kuat, pilih region terdekat.
4. Tunggu beberapa menit hingga project selesai dibuat.

## 8. Cara Mendapatkan Supabase URL
1. Masuk ke project Anda di Supabase Dashboard.
2. Buka menu **Project Settings** (ikon gear) → **API**.
3. Salin nilai **Project URL**.

## 9. Cara Mendapatkan Anon/Publishable Key
1. Masih di halaman **Project Settings → API**.
2. Salin nilai pada bagian **Project API Keys → anon public**.
3. **Jangan pernah menyalin `service_role` key** — key tersebut hanya untuk backend rahasia, bukan untuk frontend.

## 10. Cara Membuat Database & Menjalankan SQL
1. Di Supabase Dashboard, buka menu **SQL Editor**.
2. Klik **New Query**.
3. Buka file `supabase.sql` pada project ini, salin seluruh isinya.
4. Tempel ke SQL Editor, lalu klik **Run**.
5. Script ini akan otomatis membuat:
   - Tabel `profiles` dan `products`
   - Trigger otomatis pembuatan profil saat sign up
   - Trigger `updated_at` otomatis
   - Row Level Security (RLS) & policy
   - Bucket Storage `product-images`
   - Data dummy untuk testing

## 11. SQL Database
Seluruh SQL (pembuatan tabel, trigger, RLS, storage) tersedia lengkap pada file [`supabase.sql`](./supabase.sql) dan dapat langsung dijalankan di Supabase SQL Editor.

## 12. Cara Membuat Storage
Storage bucket `product-images` sudah otomatis dibuat oleh `supabase.sql` (bagian 7 pada file tersebut). Jika ingin membuatnya secara manual lewat UI:
1. Buka menu **Storage** di Supabase Dashboard.
2. Klik **New Bucket**.
3. Beri nama `product-images`, aktifkan opsi **Public bucket**.
4. Klik **Create bucket**.

## 13. Cara Mengatur RLS (Row Level Security)
RLS sudah otomatis diaktifkan dan policy-nya sudah dibuat oleh `supabase.sql`. Ringkasan policy yang digunakan:

**Tabel `profiles`:**
- Pengguna hanya dapat melihat dan mengubah profilnya sendiri (`auth.uid() = id`).

**Tabel `products`:**
- Setiap baris barang memiliki kolom `user_id` yang mengarah ke akun pemiliknya.
- Pengguna yang **belum login** (anon) **tidak memiliki akses sama sekali**.
- Pengguna yang **sudah login** (`authenticated`) **hanya** dapat **SELECT, INSERT, UPDATE, DELETE** baris yang `user_id`-nya sama dengan `auth.uid()` miliknya sendiri — data antar akun **terisolasi sepenuhnya**, baik di query JavaScript maupun di level database (RLS).
- Kolom `code` bersifat unik **per akun** (`unique (user_id, code)`), sehingga dua akun berbeda boleh memakai kode barang yang sama.

**Storage `product-images`:**
- Siapa saja dapat **melihat** gambar (agar gambar tampil di halaman meski diakses langsung), tetapi hanya pengguna yang **login** yang dapat **upload, update, dan menghapus** gambar.

Jika ingin memverifikasi, buka menu **Authentication → Policies** atau **Database → Tables → products → RLS Policies** di Supabase Dashboard.

## 14. Cara Mengatur Authentication
1. Buka menu **Authentication → Providers**.
2. Pastikan provider **Email** dalam keadaan **Enabled**.
3. (Opsional) Pada **Authentication → Settings**, Anda dapat mengaktifkan/menonaktifkan **"Confirm email"**:
   - Jika **aktif**: pengguna baru harus memverifikasi email sebelum bisa login.
   - Jika **nonaktif**: pengguna langsung bisa login setelah mendaftar (lebih mudah untuk demo/ujian).
4. Untuk fitur **Lupa Password**, pastikan **Site URL** dan **Redirect URLs** pada **Authentication → URL Configuration** sudah menyertakan alamat tempat Invenza di-deploy (misalnya `https://namadomain.com/reset-password.html`), agar link email reset password mengarah ke halaman yang benar.

## 15. Cara Memasukkan Konfigurasi Supabase
1. Buka file `js/config.js`.
2. Ganti nilai berikut dengan milik project Anda:
   ```javascript
   const SUPABASE_URL = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```
3. Simpan file. Aplikasi siap terhubung ke Supabase Anda.

> ⚠️ **PENTING:** Jangan pernah memasukkan **Service Role Key**, **Database Password**, atau **Secret Key** apa pun ke dalam file frontend manapun. Aplikasi ini hanya menggunakan **anon public key**, yang aman digunakan di sisi client karena seluruh akses data tetap dibatasi oleh RLS.

## 16. Cara Menjalankan Aplikasi
Karena aplikasi ini berbasis file statis (HTML/CSS/JS), Anda cukup menjalankannya lewat local web server (tidak bisa dibuka langsung lewat `file://` karena fitur PWA/Service Worker membutuhkan HTTP/HTTPS).

**Opsi 1 — VS Code Live Server:**
1. Install ekstensi **Live Server** di VS Code.
2. Klik kanan pada `index.html` → **Open with Live Server**.

**Opsi 2 — Python:**
```bash
cd invenza
python -m http.server 8000
```
Lalu buka `http://localhost:8000` di browser.

**Opsi 3 — Node.js (npx serve):**
```bash
cd invenza
npx serve .
```

## 17. Cara Melakukan Testing CRUD
1. **Sign Up** akun baru lewat `signup.html`.
2. **Login** menggunakan akun tersebut.
3. Di **Dashboard**, perhatikan statistik awal.
4. Buka **Data Barang**, coba:
   - **Create**: klik "Tambah Barang", isi form, upload gambar, simpan → data baru muncul di daftar & di tabel Supabase.
   - **Read**: refresh halaman, data tetap tampil dari Supabase.
   - **Detail**: klik salah satu baris/kartu barang → informasi lengkap tampil.
   - **Update**: klik ikon edit, ubah data, simpan → perubahan tersimpan di database.
   - **Delete**: klik ikon hapus, konfirmasi → data hilang dari daftar dan dari database.
   - **Search & Filter**: coba cari berdasarkan kode/nama/kategori/supplier, dan filter berdasarkan kategori/status stok.
5. Verifikasi langsung di Supabase Dashboard → **Table Editor → products** untuk memastikan data benar-benar berubah di database.

## 17b. Cara Menguji Isolasi Data Antar Akun
Karena setiap akun sekarang memiliki data inventarisnya sendiri, uji dengan minimal 2 akun berbeda:
1. **Login** sebagai Akun A → tambahkan beberapa barang.
2. **Logout**.
3. **Login** sebagai Akun B (akun baru/berbeda) → pastikan barang milik Akun A **tidak muncul** di Dashboard maupun Data Barang.
4. Tambahkan barang dari Akun B.
5. **Logout**, lalu **Login** kembali sebagai Akun A → pastikan barang milik Akun B **tidak muncul**.
6. Ulangi pengecekan yang sama untuk: Search, Filter, Detail Barang, Edit, Delete, dan Download Data (JSON/SQL/Excel) — semua harus hanya menampilkan/mengunduh data milik akun yang sedang login.
7. Sebagai pemeriksaan keamanan tambahan, buka **Table Editor → products** di Supabase dan pastikan kolom `user_id` terisi dengan benar untuk setiap baris, lalu cek **Authentication → Policies** untuk memastikan policy `products_select_own`, `products_insert_own`, `products_update_own`, dan `products_delete_own` aktif.

## 18. Cara Deployment
Invenza dapat di-deploy ke layanan static hosting apa pun, misalnya:

**Netlify / Vercel:**
1. Push folder project ini ke repository GitHub.
2. Hubungkan repository ke Netlify/Vercel.
3. Deploy tanpa build command khusus (karena murni HTML/CSS/JS statis).

**GitHub Pages:**
1. Push project ke repository GitHub.
2. Masuk ke **Settings → Pages**, pilih branch dan folder root.
3. Aplikasi akan tersedia di `https://username.github.io/nama-repo/`.

Setelah deploy, jangan lupa tambahkan URL deployment ke **Authentication → URL Configuration** di Supabase agar fitur reset password berfungsi dengan benar.

## 19. Cara Install sebagai PWA
1. Buka Invenza yang sudah di-deploy (harus HTTPS, atau `localhost` untuk testing).
2. Di Chrome/Edge desktop: klik ikon **install** (⊕) pada address bar, atau menu **⋮ → Install Invenza**.
3. Di Android Chrome: menu **⋮ → Add to Home screen / Install app**.
4. Di iOS Safari: tombol **Share → Add to Home Screen**.
5. Aplikasi akan muncul sebagai ikon tersendiri di layar utama/desktop, dan dapat dibuka tanpa membuka browser secara manual.

---

## Alur Demonstrasi Ujian (Ringkas)
1. Buka Invenza → tampil Splash Screen
2. Login dengan akun demo
3. Masuk ke Dashboard → tunjukkan statistik
4. Buka Data Barang → tunjukkan pencarian & filter
5. Tambah barang baru (dengan gambar)
6. Tunjukkan barang baru muncul di daftar
7. Buka Detail barang tersebut
8. Edit barang → tunjukkan perubahan tersimpan
9. Hapus barang → tunjukkan data hilang
10. Buka Supabase Table Editor → tunjukkan data yang sama persis
11. Logout

---

**Dikembangkan sebagai proyek pembelajaran Aplikasi Sistem Inventaris Barang dengan konsep CRUD menggunakan Supabase.**
