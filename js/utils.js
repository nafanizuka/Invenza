/* ==========================================================================
   INVENZA — Utilities
   Fungsi bantuan yang dipakai bersama di seluruh halaman:
   toast notification, format rupiah, status stok, modal helper, dsb.
   ========================================================================== */

/* ---------- Toast Notification ---------- */
function ensureToastContainer() {
  let el = document.getElementById("toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function showToast(message, type = "success", duration = 3500) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const iconClass =
    type === "success" ? "bi-check-circle-fill" : type === "error" ? "bi-x-circle-fill" : "bi-info-circle-fill";
  toast.innerHTML = `<span><i class="bi ${iconClass}"></i></span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/* ---------- Escaping (basic XSS safety for injected text) ---------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------- Formatting ---------- */
function formatRupiah(value) {
  const num = Number(value) || 0;
  return "Rp" + num.toLocaleString("id-ID");
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- Stock Status ---------- */
function getStockStatus(stock) {
  const s = Number(stock);
  if (s === 0) return { label: "Stok Habis", cls: "badge-danger", key: "habis" };
  if (s <= LOW_STOCK_THRESHOLD) return { label: "Stok Menipis", cls: "badge-warning", key: "menipis" };
  return { label: "Stok Aman", cls: "badge-success", key: "aman" };
}

/* ---------- Button loading state ---------- */
function setButtonLoading(btn, isLoading, loadingText = "Memproses...") {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${escapeHtml(loadingText)}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
  }
}

/* ---------- Friendly error translation ---------- */
function translateError(err) {
  const msg = (err && err.message) ? err.message : String(err || "");
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "Email atau password salah, atau akun belum terdaftar.";
  }
  if (lower.includes("email not confirmed")) {
    return "Email belum diverifikasi. Silakan cek inbox Anda.";
  }
  if (lower.includes("user already registered") || lower.includes("already registered")) {
    return "Email sudah terdaftar. Silakan login.";
  }
  if (lower.includes("duplicate key") && lower.includes("code")) {
    return "Kode barang sudah digunakan.";
  }
  if (lower.includes("duplicate key")) {
    return "Data yang sama sudah ada.";
  }
  if (lower.includes("row-level security") || lower.includes("permission denied")) {
    return "Anda tidak memiliki izin untuk melakukan aksi ini.";
  }
  if (lower.includes("violates check constraint") || lower.includes("violates foreign key")) {
    return "Data yang dimasukkan tidak valid. Silakan periksa kembali.";
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("network request failed")) {
    return "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
  }
  if (lower.includes("jwt") || lower.includes("session")) {
    return "Sesi Anda telah berakhir. Silakan login kembali.";
  }
  if (msg) return msg;
  return "Terjadi kesalahan. Silakan coba lagi.";
}

/* ---------- Confirmation Dialog (Promise based) ---------- */
function confirmDialog({ title = "Konfirmasi", message = "Apakah Anda yakin?", confirmText = "Ya", cancelText = "Batal", danger = true }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-box modal-sm">
        <div class="modal-header">
          <h3>${escapeHtml(title)}</h3>
        </div>
        <div class="modal-body">
          <p style="margin:0; color:var(--color-text-muted); font-size:14px;">${escapeHtml(message)}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" data-action="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-action="confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }
    overlay.querySelector('[data-action="cancel"]').addEventListener("click", () => cleanup(false));
    overlay.querySelector('[data-action="confirm"]').addEventListener("click", () => cleanup(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/* ---------- Password show/hide toggle ---------- */
function initPasswordToggles(root = document) {
  root.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;
      const icon = btn.querySelector("i");
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      if (icon) {
        icon.classList.toggle("bi-eye", !isHidden);
        icon.classList.toggle("bi-eye-slash", isHidden);
      }
    });
  });
}

/* ---------- Query param helper ---------- */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------- Unique filename for storage uploads ---------- */
function buildUniqueFileName(originalName) {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "jpg";
  const base = originalName.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
  const rand = Math.random().toString(36).slice(2, 9);
  return `${base || "produk"}-${Date.now()}-${rand}.${ext}`;
}

/* ---------- Safe extension helper (never trust the raw filename) ---------- */
function getSafeImageExtension(file) {
  const allowed = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };
  return allowed[(file && file.type || "").toLowerCase()] || null;
}

/* ---------- Username validation ---------- */
function validateUsername(raw) {
  const value = (raw || "").trim();
  if (!value) return { valid: false, message: "Username wajib diisi." };
  if (/\s/.test(value)) return { valid: false, message: "Username tidak boleh mengandung spasi." };
  if (value.length < USERNAME_MIN_LENGTH || value.length > USERNAME_MAX_LENGTH) {
    return { valid: false, message: `Username harus ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} karakter.` };
  }
  if (!/^[a-zA-Z0-9_.]+$/.test(value)) {
    return { valid: false, message: "Username hanya boleh berisi huruf, angka, titik, dan garis bawah." };
  }
  return { valid: true, value };
}

/* ---------- Avatar file validation ---------- */
function validateAvatarFile(file) {
  if (!file) return { valid: false, message: "Pilih file gambar terlebih dahulu." };
  const ext = getSafeImageExtension(file);
  if (!ext) return { valid: false, message: "Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP." };
  if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
    return { valid: false, message: `Ukuran foto terlalu besar. Maksimal ${MAX_AVATAR_SIZE_MB}MB.` };
  }
  return { valid: true, ext };
}

/* ---------- Auto-generate Kode Barang berdasarkan Kategori ----------
   PENTING (lihat PRD #7): dipakai bersama oleh form Tambah/Edit Barang
   (products.js) DAN fitur Import Data (import.js), supaya logikanya
   tidak duplikat / berbeda-beda di tiap halaman.
   Contoh: kategori "GPU" -> GPU-001, lalu GPU-002, dst.
   TIDAK PERNAH menghasilkan "undefined-001", "null-001", atau "-001". */
function buildCategoryCodePrefix(category) {
  const cleaned = (category || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return cleaned || "BRG";
}

function generateProductCode(category, existingCodes) {
  const prefix = buildCategoryCodePrefix(category);
  const used = new Set((existingCodes || []).map((c) => (c || "").toString().toUpperCase()));
  let n = 1;
  let code;
  do {
    code = `${prefix}-${String(n).padStart(3, "0")}`;
    n += 1;
  } while (used.has(code));
  return code;
}

/* ---------- PWA: Service Worker registration ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("Registrasi service worker gagal:", err);
    });
  });
}
