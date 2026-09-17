/* ==========================================================================
   INVENZA — Supabase Client
   Membuat satu instance client Supabase yang dipakai di seluruh aplikasi.
   File ini bergantung pada:
     - Library supabase-js (dimuat lewat CDN di setiap halaman HTML)
     - js/config.js (harus dimuat SEBELUM file ini)
   ========================================================================== */

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
