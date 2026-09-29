/* ==========================================================================
   INVENZA — Import Data Page Logic
   Flow: pilih file -> parse -> preview -> validasi -> konfirmasi -> insert.

   KEAMANAN (lihat PRD #10): kolom "user_id" pada file yang diupload TIDAK
   PERNAH dibaca/dipercaya. Pemilik data SELALU diambil dari
   getCurrentUserId() (Supabase Auth session yang sedang login), sehingga
   import tidak bisa dipakai untuk memasukkan data ke akun orang lain.
   ========================================================================== */

let importParsedRows = [];

const IMPORT_FIELD_ALIASES = {
  code: ["code", "kode", "kode barang", "kode_barang"],
  name: ["name", "nama", "nama barang", "nama_barang"],
  category: ["category", "kategori"],
  price: ["price", "harga"],
  stock: ["stock", "stok"],
  unit: ["unit", "satuan"],
  supplier: ["supplier"],
  publisher: ["publisher", "publisher game", "publisher_game"],
  kondisi: ["condition", "kondisi", "kondisi barang", "kondisi_barang"],
  lokasi: ["location", "lokasi", "lokasi barang", "lokasi_barang"],
  catatan: ["notes", "catatan"],
  image_url: ["image_url", "gambar_url", "gambar", "gambar url", "image", "image url", "photo", "foto"],
};
const IMPORT_KONDISI_VALUES = ["Bagus", "Rusak Ringan", "Rusak"];

// Validasi URL gambar bersifat LUNAK (lihat PRD): URL kosong = tidak apa-apa
// (image_url null), URL tidak valid = tetap boleh diimport (bukan error),
// hanya ditandai warning di preview supaya pengguna tahu.
function isLikelyValidImageUrl(value) {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();
  await loadCurrentProfile();
  initUserNavbar();
  bindImportEvents();
});

function bindImportEvents() {
  const dropWrap = document.getElementById("import-drop-wrap");
  const fileInput = document.getElementById("import-file-input");
  const confirmBtn = document.getElementById("import-confirm-btn");
  const cancelBtn = document.getElementById("import-cancel-btn");

  dropWrap.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) handleFileSelected(file);
  });

  confirmBtn.addEventListener("click", runImport);
  cancelBtn.addEventListener("click", resetImportUI);
}

function resetImportUI() {
  importParsedRows = [];
  document.getElementById("import-file-input").value = "";
  document.getElementById("import-filename").textContent = "";
  document.getElementById("import-error-box").textContent = "";
  document.getElementById("import-preview-section").classList.add("hidden");
  document.getElementById("import-result-section").classList.add("hidden");
}

/* ---------------------------------------------------------------------- */
/*  PARSE                                                                  */
/* ---------------------------------------------------------------------- */

async function handleFileSelected(file) {
  document.getElementById("import-error-box").textContent = "";
  document.getElementById("import-result-section").classList.add("hidden");
  document.getElementById("import-filename").textContent = file.name;

  const ext = (file.name.split(".").pop() || "").toLowerCase();

  try {
    let rawRows = [];
    if (ext === "json") {
      rawRows = await parseJsonFile(file);
    } else if (["csv", "xlsx", "xls"].includes(ext)) {
      rawRows = await parseSheetFile(file);
    } else {
      showImportError("Format file tidak didukung. Gunakan .xlsx, .xls, .csv, atau .json.");
      return;
    }

    if (!rawRows.length) {
      showImportError("File tidak berisi data yang bisa dibaca.");
      return;
    }

    importParsedRows = normalizeImportRows(rawRows);
    renderImportPreview(importParsedRows);
  } catch (err) {
    console.error(err);
    showImportError("Gagal membaca file: " + translateError(err));
  }
}

function showImportError(message) {
  document.getElementById("import-error-box").textContent = message;
  document.getElementById("import-preview-section").classList.add("hidden");
}

function parseJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        let arr = null;
        if (Array.isArray(data)) arr = data;
        else if (data && Array.isArray(data.products)) arr = data.products;
        else if (data && data.data && Array.isArray(data.data)) arr = data.data;
        if (!arr) {
          reject(new Error("Format JSON harus berupa array data barang."));
          return;
        }
        resolve(arr);
      } catch (e) {
        reject(new Error("File JSON tidak valid."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file JSON."));
    reader.readAsText(file);
  });
}

function parseSheetFile(file) {
  return new Promise((resolve, reject) => {
    if (typeof XLSX === "undefined") {
      reject(new Error("Pustaka pembaca file belum termuat. Periksa koneksi internet Anda."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workbook = XLSX.read(reader.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (e) {
        reject(new Error("Gagal membaca isi file."));
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
}

/* ---------------------------------------------------------------------- */
/*  NORMALIZE + VALIDATE                                                   */
/* ---------------------------------------------------------------------- */

function findAliasValue(row, aliases) {
  for (const key of Object.keys(row)) {
    const norm = key.toString().trim().toLowerCase();
    if (aliases.includes(norm)) return row[key];
  }
  return undefined;
}

function normalizeImportRows(rawRows) {
  return rawRows.map((row, idx) => {
    const get = (field) => {
      const v = findAliasValue(row, IMPORT_FIELD_ALIASES[field]);
      return v === undefined || v === null ? "" : String(v).trim();
    };

    const name = get("name");
    const category = get("category");

    const priceRaw = get("price").replace(/[^\d.-]/g, "");
    const stockRaw = get("stock").replace(/[^\d.-]/g, "");
    const price = priceRaw === "" ? 0 : Number(priceRaw);
    const stock = stockRaw === "" ? 0 : Number(stockRaw);

    let kondisi = get("kondisi");
    if (!IMPORT_KONDISI_VALUES.includes(kondisi)) kondisi = "Bagus";

    // Gambar: OPSIONAL. Kosong -> tidak apa-apa. Tidak valid -> tetap boleh
    // diimport (tidak menggagalkan proses), hanya ditandai warning di preview.
    const gambarRaw = get("image_url");
    let imageUrl = null;
    let imageWarning = false;
    if (gambarRaw) {
      if (isLikelyValidImageUrl(gambarRaw)) {
        imageUrl = gambarRaw;
      } else {
        imageWarning = true;
      }
    }

    const errors = [];
    if (!name) errors.push("Nama kosong");
    if (!category) errors.push("Kategori kosong");
    if (isNaN(price) || price < 0) errors.push("Harga tidak valid");
    if (isNaN(stock) || stock < 0) errors.push("Stok tidak valid");

    return {
      _row: idx + 1,
      code: get("code"), // boleh kosong -> auto-generate saat import
      name,
      category,
      price: isNaN(price) ? 0 : price,
      stock: isNaN(stock) ? 0 : stock,
      unit: get("unit") || "Unit",
      supplier: get("supplier") || "-",
      publisher: get("publisher") || null,
      kondisi,
      lokasi: get("lokasi") || null,
      catatan: get("catatan") || null,
      image_url: imageUrl,
      _imageWarning: imageWarning,
      _errors: errors,
    };
  });
}

function renderImportPreview(rows) {
  const section = document.getElementById("import-preview-section");
  const body = document.getElementById("import-preview-body");
  const countEl = document.getElementById("import-preview-count");

  countEl.textContent = rows.length;

  const MAX_PREVIEW_ROWS = 200;
  const toShow = rows.slice(0, MAX_PREVIEW_ROWS);

  body.innerHTML = toShow
    .map((r) => {
      const statusBadge = r._errors.length
        ? `<span class="badge badge-danger" title="${escapeHtml(r._errors.join(", "))}">Error</span>`
        : `<span class="badge badge-success">Siap</span>`;
      let gambarCell = '<span class="import-image-status none">-</span>';
      if (r._imageWarning) {
        gambarCell = '<span class="import-image-status warn" title="URL gambar tidak valid, barang tetap diimport tanpa gambar">⚠ URL tidak valid</span>';
      } else if (r.image_url) {
        gambarCell = '<span class="import-image-status ok" title="' + escapeHtml(r.image_url) + '">🖼 Ada gambar</span>';
      }
      return `
      <tr>
        <td>${r._row}</td>
        <td>${escapeHtml(r.code || "(otomatis)")}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.category)}</td>
        <td>${formatRupiah(r.price)}</td>
        <td>${r.stock}</td>
        <td>${escapeHtml(r.kondisi)}</td>
        <td>${gambarCell}</td>
        <td>${statusBadge}</td>
      </tr>`;
    })
    .join("");

  if (rows.length > MAX_PREVIEW_ROWS) {
    body.innerHTML += `<tr><td colspan="9" style="text-align:center;color:var(--color-text-muted);padding:10px;">... dan ${
      rows.length - MAX_PREVIEW_ROWS
    } baris lainnya</td></tr>`;
  }

  section.classList.remove("hidden");
  document.getElementById("import-result-section").classList.add("hidden");
}

/* ---------------------------------------------------------------------- */
/*  IMPORT (INSERT)                                                        */
/* ---------------------------------------------------------------------- */

async function runImport() {
  if (!importParsedRows.length) return;

  const confirmBtn = document.getElementById("import-confirm-btn");
  setButtonLoading(confirmBtn, true, "Mengimpor...");

  try {
    // user_id SELALU dari sesi Supabase Auth yang sedang login — TIDAK
    // PERNAH dari kolom "user_id" pada file yang diimport.
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data: existing, error: fetchError } = await supabaseClient
      .from("products")
      .select("code")
      .eq("user_id", userId);
    if (fetchError) throw fetchError;

    const existingCodes = new Set((existing || []).map((p) => (p.code || "").toUpperCase()));
    const usedInBatch = new Set();

    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of importParsedRows) {
      if (row._errors.length) {
        failed++;
        continue;
      }

      let code = row.code;
      if (!code) {
        code = generateProductCode(row.category, [...existingCodes, ...usedInBatch]);
      }
      const codeUpper = code.toUpperCase();

      if (existingCodes.has(codeUpper) || usedInBatch.has(codeUpper)) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabaseClient.from("products").insert({
        code,
        name: row.name,
        category: row.category,
        price: row.price,
        stock: row.stock,
        unit: row.unit,
        supplier: row.supplier,
        publisher: row.publisher,
        kondisi: row.kondisi,
        lokasi: row.lokasi,
        catatan: row.catatan,
        image_url: row.image_url,
        user_id: userId,
      });

      if (insertError) {
        console.error(insertError);
        failed++;
      } else {
        success++;
        usedInBatch.add(codeUpper);
      }
    }

    showImportResult(success, skipped, failed);
    showToast(`Import selesai — ${success} berhasil, ${skipped} dilewati, ${failed} error.`, success > 0 ? "success" : "error");
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  } finally {
    setButtonLoading(confirmBtn, false);
  }
}

function showImportResult(success, skipped, failed) {
  document.getElementById("result-success").textContent = success;
  document.getElementById("result-skipped").textContent = skipped;
  document.getElementById("result-failed").textContent = failed;
  document.getElementById("import-preview-section").classList.add("hidden");
  document.getElementById("import-result-section").classList.remove("hidden");
}
