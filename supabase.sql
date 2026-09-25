-- ============================================================================
-- INVENZA — SQL Schema untuk Supabase
-- Jalankan seluruh isi file ini di Supabase Dashboard -> SQL Editor -> New Query
--
-- File ini AMAN dijalankan berulang kali (idempotent) dan juga berfungsi
-- sebagai MIGRATION untuk project yang sudah berjalan sebelumnya:
--   - Jika tabel "products" Anda masih memakai kolom "created_by", kolom
--     tersebut akan otomatis di-rename menjadi "user_id".
--   - Batasan unique pada "code" diubah dari GLOBAL menjadi PER-USER, supaya
--     setiap akun bebas memakai kode barang yang sama tanpa bentrok dengan
--     akun lain.
--   - Row Level Security (RLS) diperketat agar setiap akun HANYA bisa
--     mengakses baris miliknya sendiri (user_id = auth.uid()).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 2. TABEL: profiles
--    Menyimpan data tambahan pengguna, terhubung 1:1 dengan auth.users
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. TABEL: products (Data Barang)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  category text not null,
  price numeric(14, 2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  unit text not null,
  supplier text not null,
  image_url text,
  user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---- MIGRATION: project lama memakai kolom "created_by" ----
-- Jika kolom "created_by" masih ada dan "user_id" belum ada, rename supaya
-- data lama tetap terhubung ke pemiliknya masing-masing (tidak hilang).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'created_by'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'user_id'
  ) then
    alter table public.products rename column created_by to user_id;
  end if;
end $$;

-- Pastikan kolom user_id ada (untuk kasus tabel lama dengan struktur berbeda).
alter table public.products add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- ---- MIGRATION: batasan unique pada "code" ----
-- Sebelumnya "code" unique secara GLOBAL (lintas semua akun). Sekarang harus
-- unique PER USER, supaya Akun A dan Akun B boleh sama-sama memakai kode
-- "BRG001" tanpa bentrok.
alter table public.products drop constraint if exists products_code_key;
drop index if exists idx_products_code;
create unique index if not exists idx_products_user_code on public.products (user_id, code);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', name));
create index if not exists idx_products_user_id on public.products (user_id);

-- ----------------------------------------------------------------------------
-- 4. TRIGGER: Auto-membuat baris profiles saat ada user baru mendaftar
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. TRIGGER: Auto-update kolom updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
--    Ini adalah lapisan keamanan UTAMA. Meskipun query JavaScript di frontend
--    selalu menyertakan filter .eq('user_id', user.id), filter tersebut BUKAN
--    security boundary — RLS di database inilah yang benar-benar mencegah
--    satu akun mengakses/mengubah/menghapus data akun lain, bahkan jika
--    seseorang mencoba memanipulasi request API secara langsung.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- ---- Policy: profiles ----
-- Pengguna hanya bisa melihat & mengubah profil miliknya sendiri.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- ---- Policy: products ----
-- Setiap akun HANYA dapat membaca, menambah, mengubah, dan menghapus
-- barang miliknya sendiri (user_id = auth.uid()). Data antar akun terisolasi
-- sepenuhnya. Pengguna yang belum login (anon) tidak mendapat akses sama sekali.
drop policy if exists "products_select_authenticated" on public.products;
drop policy if exists "products_select_own" on public.products;
create policy "products_select_own"
  on public.products for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "products_insert_authenticated" on public.products;
drop policy if exists "products_insert_own" on public.products;
create policy "products_insert_own"
  on public.products for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "products_update_authenticated" on public.products;
drop policy if exists "products_update_own" on public.products;
create policy "products_update_own"
  on public.products for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "products_delete_authenticated" on public.products;
drop policy if exists "products_delete_own" on public.products;
create policy "products_delete_own"
  on public.products for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. SUPABASE STORAGE — bucket "product-images"
--    NOTE: Membuat bucket lebih mudah lewat Dashboard (Storage -> New Bucket),
--    tapi juga bisa dijalankan lewat SQL berikut.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Policy storage: siapa saja boleh MELIHAT gambar (karena bucket public,
-- supaya <img> tag bisa menampilkan gambar tanpa perlu login), tetapi
-- hanya pengguna yang LOGIN yang boleh upload/update/hapus gambar.
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_auth_insert" on storage.objects;
create policy "product_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_auth_update" on storage.objects;
create policy "product_images_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product_images_auth_delete" on storage.objects;
create policy "product_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

-- ----------------------------------------------------------------------------
-- 8. DATA DUMMY (opsional, untuk testing & demonstrasi CRUD)
--    Karena "code" sekarang unique PER USER dan setiap baris WAJIB memiliki
--    user_id (untuk lolos RLS), ganti '00000000-0000-0000-0000-000000000000'
--    di bawah dengan UUID user sungguhan (lihat Authentication -> Users di
--    Supabase Dashboard) sebelum menjalankan bagian ini.
-- ----------------------------------------------------------------------------
-- insert into public.products (code, name, category, price, stock, unit, supplier, user_id)
-- values
--   ('BRG001', 'Keyboard Mechanical', 'Elektronik', 500000, 10, 'Unit', 'PT Teknologi Indonesia', '00000000-0000-0000-0000-000000000000'),
--   ('BRG002', 'Mouse Wireless',      'Elektronik', 150000, 25, 'Unit', 'PT Teknologi Indonesia', '00000000-0000-0000-0000-000000000000'),
--   ('BRG003', 'Monitor 24 Inch',     'Elektronik', 1800000, 5, 'Unit', 'CV Digital',              '00000000-0000-0000-0000-000000000000'),
--   ('BRG004', 'Kabel HDMI',          'Aksesoris',  75000,   2, 'Unit', 'CV Digital',              '00000000-0000-0000-0000-000000000000')
-- on conflict (user_id, code) do nothing;

-- ============================================================================
-- SELESAI. Setelah menjalankan seluruh script di atas:
-- 1. Buka Table Editor -> products -> pastikan kolom "user_id" sudah ada dan
--    terisi untuk setiap baris data lama (baris dengan user_id NULL tidak
--    akan terlihat oleh siapa pun karena RLS, jadi isi manual jika perlu).
-- 2. Buka Authentication -> Policies -> pastikan policy "*_own" di atas aktif
--    dan policy lama ("*_authenticated") sudah terhapus.
-- 3. Buka Storage untuk memastikan bucket "product-images" sudah ada.
-- 4. Buka Authentication -> Providers -> pastikan Email provider aktif.
-- 5. Uji isolasi data dengan minimal 2 akun berbeda (lihat README.md).
-- ============================================================================
