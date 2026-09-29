/* ==========================================================================
   INVENZA — Download Data Page Logic
   Export data inventaris milik user yang sedang login saja (JSON, Excel).
   PENTING: Tidak pernah melakukan export seluruh database — setiap query
   selalu difilter dengan user_id milik akun yang sedang login.

   Catatan (PRD patch — hapus Export SQL): fitur Export SQL (PostgreSQL),
   Export SQL (MySQL), dan Backup LocalStorage sengaja DIHAPUS dan TIDAK
   BOLEH dihidupkan kembali. Hanya Export JSON dan Export Excel yang
   disediakan di halaman ini.
   ========================================================================== */

let myProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();
  await loadCurrentProfile();
  initUserNavbar();

  await loadMyProductsForExport();

  document.getElementById("download-json-btn").addEventListener("click", downloadAsJson);
  document.getElementById("download-excel-btn").addEventListener("click", downloadAsExcel);
});

async function loadMyProductsForExport() {
  const infoEl = document.getElementById("download-count-info");
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    myProducts = data || [];
    infoEl.textContent = myProducts.length
      ? `${myProducts.length} barang siap untuk di-export.`
      : "Belum ada data barang untuk di-export.";
  } catch (err) {
    console.error(err);
    infoEl.textContent = "Gagal memuat data.";
    showToast(translateError(err), "error");
  }
}

/* ---------- Helpers ---------- */

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function triggerFileDownload(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- JSON Export ---------- */

function downloadAsJson() {
  if (!myProducts.length) {
    showToast("Belum ada data untuk di-export.", "error");
    return;
  }
  const exportData = myProducts.map((p) => ({
    code: p.code,
    name: p.name,
    category: p.category,
    price: p.price,
    stock: p.stock,
    unit: p.unit,
    supplier: p.supplier,
    publisher: p.publisher || null,
    kondisi: p.kondisi || null,
    lokasi: p.lokasi || null,
    catatan: p.catatan || null,
    image_url: p.image_url || null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  const json = JSON.stringify(exportData, null, 2);
  triggerFileDownload(json, `invenza-data-${todayStamp()}.json`, "application/json");
  showToast("File JSON berhasil diunduh");
}

/* ---------- Excel Export ---------- */

function downloadAsExcel() {
  if (!myProducts.length) {
    showToast("Belum ada data untuk di-export.", "error");
    return;
  }
  if (typeof XLSX === "undefined") {
    showToast("Gagal memuat pustaka Excel. Periksa koneksi internet Anda.", "error");
    return;
  }

  const rows = myProducts.map((p) => ({
    ID: p.id,
    Kode: p.code,
    "Nama Barang": p.name,
    Kategori: p.category,
    Harga: Number(p.price) || 0,
    Stok: Number(p.stock) || 0,
    Satuan: p.unit,
    Supplier: p.supplier,
    "Publisher Game": p.publisher || "",
    Kondisi: p.kondisi || "",
    "Lokasi Barang": p.lokasi || "",
    Catatan: p.catatan || "",
    Gambar: p.image_url || "",
    "Tanggal Dibuat": formatDate(p.created_at),
    "Tanggal Diubah": formatDate(p.updated_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Barang");
  XLSX.writeFile(workbook, `invenza-data-${todayStamp()}.xlsx`);
  showToast("File Excel berhasil diunduh");
}
