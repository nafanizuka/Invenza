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
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
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
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "🙈" : "👁";
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

/* ---------- PWA: Service Worker registration ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((err) => {
      console.warn("Registrasi service worker gagal:", err);
    });
  });
}
