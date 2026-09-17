-- ============================================================================
-- INVENZA — SQL Schema untuk Supabase
-- Jalankan seluruh isi file ini di Supabase Dashboard -> SQL Editor -> New Query
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
  code text not null unique,
  name text not null,
  category text not null,
  price numeric(14, 2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  unit text not null,
  supplier text not null,
  image_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_code on public.products (code);
create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_name on public.products using gin (to_tsvector('simple', name));

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
-- Semua pengguna yang SUDAH LOGIN dapat membaca, menambah, mengubah,
-- dan menghapus data barang (kolaborasi sesama karyawan toko).
-- Pengguna yang BELUM login (anon) tidak mendapat akses sama sekali.
drop policy if exists "products_select_authenticated" on public.products;
create policy "products_select_authenticated"
  on public.products for select
  to authenticated
  using (true);

drop policy if exists "products_insert_authenticated" on public.products;
create policy "products_insert_authenticated"
  on public.products for insert
  to authenticated
  with check (true);

drop policy if exists "products_update_authenticated" on public.products;
create policy "products_update_authenticated"
  on public.products for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "products_delete_authenticated" on public.products;
create policy "products_delete_authenticated"
  on public.products for delete
  to authenticated
  using (true);

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
-- 8. DATA DUMMY (untuk testing & demonstrasi CRUD)
--    Jalankan bagian ini SETELAH Anda memiliki minimal satu user (setelah
--    mendaftar lewat halaman Sign Up), karena kolom created_by bersifat opsional.
-- ----------------------------------------------------------------------------
insert into public.products (code, name, category, price, stock, unit, supplier)
values
  ('BRG001', 'Keyboard Mechanical', 'Elektronik', 500000, 10, 'Unit', 'PT Teknologi Indonesia'),
  ('BRG002', 'Mouse Wireless',      'Elektronik', 150000, 25, 'Unit', 'PT Teknologi Indonesia'),
  ('BRG003', 'Monitor 24 Inch',     'Elektronik', 1800000, 5, 'Unit', 'CV Digital'),
  ('BRG004', 'Kabel HDMI',          'Aksesoris',  75000,   2, 'Unit', 'CV Digital')
on conflict (code) do nothing;

-- ============================================================================
-- SELESAI. Setelah menjalankan seluruh script di atas:
-- 1. Buka Table Editor untuk memastikan tabel "profiles" dan "products" sudah ada.
-- 2. Buka Storage untuk memastikan bucket "product-images" sudah ada.
-- 3. Buka Authentication -> Providers -> pastikan Email provider aktif.
-- ============================================================================
