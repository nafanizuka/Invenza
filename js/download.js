/* ==========================================================================
   INVENZA — Download Data Page Logic
   Export data inventaris milik user yang sedang login saja (JSON, SQL, Excel).
   PENTING: Tidak pernah melakukan export seluruh database — setiap query
   selalu difilter dengan user_id milik akun yang sedang login.
   ========================================================================== */

let myProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();
  await loadCurrentProfile();
  initUserNavbar();

  await loadMyProductsForExport();

  document.getElementById("download-json-btn").addEventListener("click", downloadAsJson);
  document.getElementById("download-sql-btn").addEventListener("click", downloadAsSql);
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

function escapeSqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
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
    image_url: p.image_url,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
  const json = JSON.stringify(exportData, null, 2);
  triggerFileDownload(json, `invenza-data-${todayStamp()}.json`, "application/json");
  showToast("File JSON berhasil diunduh");
}

/* ---------- SQL Export ---------- */

function downloadAsSql() {
  if (!myProducts.length) {
    showToast("Belum ada data untuk di-export.", "error");
    return;
  }
  const lines = [
    "-- Invenza — Export Data Barang",
    `-- Diunduh pada: ${new Date().toISOString()}`,
    "-- Catatan: hanya berisi barang milik akun yang sedang login.",
    "",
  ];

  myProducts.forEach((p) => {
    lines.push(
      `INSERT INTO products (code, name, category, price, stock, unit, supplier) VALUES (${escapeSqlString(
        p.code
      )}, ${escapeSqlString(p.name)}, ${escapeSqlString(p.category)}, ${Number(p.price) || 0}, ${
        Number(p.stock) || 0
      }, ${escapeSqlString(p.unit)}, ${escapeSqlString(p.supplier)});`
    );
  });

  const sql = lines.join("\n");
  triggerFileDownload(sql, `invenza-data-${todayStamp()}.sql`, "application/sql");
  showToast("File SQL berhasil diunduh");
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
    "Tanggal Dibuat": formatDate(p.created_at),
    "Tanggal Diubah": formatDate(p.updated_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Barang");
  XLSX.writeFile(workbook, `invenza-data-${todayStamp()}.xlsx`);
  showToast("File Excel berhasil diunduh");
}
