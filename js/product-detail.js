/* ==========================================================================
   INVENZA — Product Detail Page Logic
   ========================================================================== */

let currentProduct = null;

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();
  await loadCurrentProfile();
  initUserNavbar();

  const id = getQueryParam("id");
  if (!id) {
    showNotFound();
    return;
  }

  await loadProductDetail(id);

  document.getElementById("detail-edit-btn").addEventListener("click", () => {
    window.location.href = `products.html?edit=${id}`;
  });
  document.getElementById("detail-delete-btn").addEventListener("click", () => deleteFromDetail(id));
});

async function loadProductDetail(id) {
  const loadingEl = document.getElementById("detail-loading");
  const contentEl = document.getElementById("detail-content");
  const notFoundEl = document.getElementById("detail-not-found");

  loadingEl.classList.remove("hidden");
  contentEl.classList.add("hidden");
  notFoundEl.classList.add("hidden");

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      showNotFound();
      return;
    }

    currentProduct = data;
    renderDetail(data);
    contentEl.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
    showNotFound();
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function showNotFound() {
  document.getElementById("detail-loading").classList.add("hidden");
  document.getElementById("detail-content").classList.add("hidden");
  document.getElementById("detail-not-found").classList.remove("hidden");
}

function renderDetail(p) {
  document.getElementById("detail-page-title").textContent = p.name;

  const imageWrap = document.getElementById("detail-image-wrap");
  imageWrap.innerHTML = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" class="detail-image" alt="${escapeHtml(p.name)}">`
    : `<div class="detail-image-placeholder"><i class="bi bi-box-seam"></i></div>`;

  document.getElementById("detail-name").textContent = p.name;
  document.getElementById("detail-code").textContent = `Kode: ${p.code}`;

  const status = getStockStatus(p.stock);
  document.getElementById("detail-status-badge").innerHTML = `<span class="badge ${status.cls}">${status.label}</span>`;

  document.getElementById("detail-category").textContent = p.category || "-";
  document.getElementById("detail-price").textContent = formatRupiah(p.price);
  document.getElementById("detail-stock").textContent = `${p.stock} ${p.unit || ""}`;
  document.getElementById("detail-supplier").textContent = p.supplier || "-";

  document.getElementById("detail-created").textContent = formatDate(p.created_at);
  document.getElementById("detail-updated").textContent = formatDate(p.updated_at);
}

async function deleteFromDetail(id) {
  if (!currentProduct) return;

  const confirmed = await confirmDialog({
    title: "Hapus Barang",
    message: `Apakah Anda yakin ingin menghapus "${currentProduct.name}"? Tindakan ini tidak dapat dibatalkan.`,
    confirmText: "Hapus",
    cancelText: "Batal",
    danger: true,
  });
  if (!confirmed) return;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabaseClient.from("products").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;

    if (currentProduct.image_url) {
      const parts = currentProduct.image_url.split(`${PRODUCT_IMAGE_BUCKET}/`);
      if (parts.length >= 2) {
        const path = decodeURIComponent(parts[1]);
        await supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
      }
    }

    showToast("Barang berhasil dihapus");
    setTimeout(() => window.location.replace("products.html"), 800);
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  }
}
