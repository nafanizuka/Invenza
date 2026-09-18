/* ==========================================================================
   INVENZA — Supabase Configuration
   ==========================================================================
   GANTI dua nilai di bawah ini dengan milik project Supabase Anda sendiri.

   Cara mendapatkan:
   1. Buka https://supabase.com/dashboard lalu pilih project Anda.
   2. Masuk ke menu "Project Settings" -> "API".
   3. Salin "Project URL" ke SUPABASE_URL.
   4. Salin "anon public" key ke SUPABASE_ANON_KEY.

   PENTING:
   - Gunakan HANYA anon/public key di sini.
   - JANGAN PERNAH menaruh Service Role Key / Database Password di frontend.
   - anon key AMAN untuk digunakan di sisi client karena akses data tetap
     dibatasi oleh Row Level Security (RLS) yang diaktifkan di database.
   ========================================================================== */

const SUPABASE_URL = "https://tyrkajcdusftbufmcmlu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_NSWl0rVfEjsUG6FgcwYn8g_i4ZG1xn1";

// Batas stok menipis. Ubah angka ini jika kebutuhan bisnis berbeda.
const LOW_STOCK_THRESHOLD = 5;

// Nama bucket Supabase Storage untuk gambar produk.
const PRODUCT_IMAGE_BUCKET = "product-images";
