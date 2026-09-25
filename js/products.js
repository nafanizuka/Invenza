/* ==========================================================================
   INVENZA — Products (Data Barang) Page Logic
   Menangani: Read (list + search + filter), Create, Update, Delete,
   dan upload gambar ke Supabase Storage.
   ========================================================================== */

let allProducts = [];
let selectedImageFile = null;
let editingProductId = null;

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();
  await loadCurrentProfile();
  initUserNavbar();
  initPasswordToggles();

  bindToolbarEvents();
  bindModalEvents();

  await loadProducts();
});

/* ---------------------------------------------------------------------- */
/*  READ — Load & render product list                                     */
/* ---------------------------------------------------------------------- */

async function loadProducts() {
  const tableBody = document.getElementById("products-table-body");
  const cardsWrap = document.getElementById("products-cards");
  const emptyState = document.getElementById("products-empty");
  const loadingRow = document.getElementById("products-loading");

  if (loadingRow) loadingRow.classList.remove("hidden");
  if (emptyState) emptyState.classList.add("hidden");

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    allProducts = data || [];
    populateCategoryFilter(allProducts);
    renderProducts(allProducts);
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  } finally {
    if (loadingRow) loadingRow.classList.add("hidden");
  }
}

function populateCategoryFilter(products) {
  const select = document.getElementById("filter-category");
  if (!select) return;
  const current = select.value;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  select.innerHTML =
    `<option value="">Semua Kategori</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  if (categories.includes(current)) select.value = current;
}

function renderProducts(products) {
  const tableBody = document.getElementById("products-table-body");
  const cardsWrap = document.getElementById("products-cards");
  const emptyState = document.getElementById("products-empty");

  if (!products.length) {
    tableBody.innerHTML = "";
    cardsWrap.innerHTML = "";
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  tableBody.innerHTML = products.map(renderTableRow).join("");
  cardsWrap.innerHTML = products.map(renderProductCard).join("");

  // Bind row/card click -> detail page
  document.querySelectorAll("[data-detail-id]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return; // ignore action buttons
      window.location.href = `product-detail.html?id=${el.dataset.detailId}`;
    });
  });

  // Bind action buttons
  document.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(btn.dataset.id);
    });
  });
  document.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteProduct(btn.dataset.id);
    });
  });
}

function renderTableRow(p) {
  const status = getStockStatus(p.stock);
  const img = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" class="product-thumb" alt="${escapeHtml(p.name)}">`
    : `<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--color-text-muted);"><i class="bi bi-box-seam"></i></div>`;
  return `
    <tr data-detail-id="${p.id}">
      <td>${img}</td>
      <td>${escapeHtml(p.code)}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${formatRupiah(p.price)}</td>
      <td>${p.stock} <span class="badge ${status.cls}" style="margin-left:6px;">${status.label}</span></td>
      <td>${escapeHtml(p.unit)}</td>
      <td>${escapeHtml(p.supplier)}</td>
      <td>
        <div class="row-actions">
          <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
          <button class="btn-icon" data-action="delete" data-id="${p.id}" title="Hapus"><i class="bi bi-trash"></i></button>
        </div>
      </td>
    </tr>`;
}

function renderProductCard(p) {
  const status = getStockStatus(p.stock);
  const img = p.image_url
    ? `<img src="${escapeHtml(p.image_url)}" class="product-thumb" alt="${escapeHtml(p.name)}">`
    : `<div class="product-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--color-text-muted);"><i class="bi bi-box-seam"></i></div>`;
  return `
    <div class="product-card" data-detail-id="${p.id}">
      ${img}
      <div class="product-card-body">
        <div class="product-card-title">${escapeHtml(p.name)}</div>
        <div class="product-card-sub">${escapeHtml(p.code)} · ${escapeHtml(p.category)}</div>
        <div class="product-card-meta">
          <span class="product-card-price">${formatRupiah(p.price)}</span>
          <span class="badge ${status.cls}">${status.label}</span>
        </div>
      </div>
      <div class="product-card-actions">
        <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Edit"><i class="bi bi-pencil-square"></i></button>
        <button class="btn-icon" data-action="delete" data-id="${p.id}" title="Hapus"><i class="bi bi-trash"></i></button>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------------- */
/*  SEARCH & FILTER                                                        */
/* ---------------------------------------------------------------------- */

function bindToolbarEvents() {
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("filter-category");
  const stockFilter = document.getElementById("filter-stock");
  const addBtn = document.getElementById("add-product-btn");

  function applyFilters() {
    const query = (searchInput.value || "").trim().toLowerCase();
    const category = categoryFilter.value;
    const stockStatus = stockFilter.value;

    const filtered = allProducts.filter((p) => {
      const matchesQuery =
        !query ||
        [p.code, p.name, p.category, p.supplier].some((f) => (f || "").toLowerCase().includes(query));
      const matchesCategory = !category || p.category === category;
      const matchesStock = !stockStatus || getStockStatus(p.stock).key === stockStatus;
      return matchesQuery && matchesCategory && matchesStock;
    });

    renderProducts(filtered);
  }

  searchInput.addEventListener("input", applyFilters);
  categoryFilter.addEventListener("change", applyFilters);
  stockFilter.addEventListener("change", applyFilters);
  addBtn.addEventListener("click", openAddModal);
}

/* ---------------------------------------------------------------------- */
/*  MODAL — shared for Create & Update                                    */
/* ---------------------------------------------------------------------- */

function bindModalEvents() {
  const modal = document.getElementById("product-modal");
  const closeButtons = modal.querySelectorAll("[data-close-modal]");
  const form = document.getElementById("product-form");
  const fileInput = document.getElementById("product-image-input");
  const fileWrap = document.getElementById("file-input-wrap");
  const preview = document.getElementById("image-preview");

  closeButtons.forEach((btn) => btn.addEventListener("click", closeProductModal));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeProductModal();
  });

  fileWrap.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Gambar harus berupa file gambar.", "error");
      fileInput.value = "";
      return;
    }
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", handleProductFormSubmit);
}

function openAddModal() {
  editingProductId = null;
  selectedImageFile = null;
  document.getElementById("product-modal-title").textContent = "Tambah Barang";
  document.getElementById("product-form").reset();
  document.getElementById("image-preview").classList.add("hidden");
  clearFormErrors();
  document.getElementById("product-modal").classList.remove("hidden");
}

function openEditModal(id) {
  const product = allProducts.find((p) => String(p.id) === String(id));
  if (!product) return;

  editingProductId = id;
  selectedImageFile = null;
  clearFormErrors();

  document.getElementById("product-modal-title").textContent = "Edit Barang";
  document.getElementById("product-code").value = product.code || "";
  document.getElementById("product-name").value = product.name || "";
  document.getElementById("product-category").value = product.category || "";
  document.getElementById("product-price").value = product.price || "";
  document.getElementById("product-stock").value = product.stock || "";
  document.getElementById("product-unit").value = product.unit || "";
  document.getElementById("product-supplier").value = product.supplier || "";

  const preview = document.getElementById("image-preview");
  if (product.image_url) {
    preview.src = product.image_url;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }

  document.getElementById("product-modal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
  document.getElementById("product-form").reset();
  document.getElementById("product-image-input").value = "";
  selectedImageFile = null;
  editingProductId = null;
}

function clearFormErrors() {
  document.querySelectorAll("#product-form .form-error").forEach((el) => (el.textContent = ""));
}

/* ---------------------------------------------------------------------- */
/*  CREATE + UPDATE — validation, image upload, save                      */
/* ---------------------------------------------------------------------- */

function validateProductForm(values) {
  const errors = {};
  if (!values.code) errors.code = "Kode wajib diisi.";
  if (!values.name) errors.name = "Nama barang wajib diisi.";
  if (!values.category) errors.category = "Kategori wajib diisi.";

  if (values.price === "" || values.price === null) {
    errors.price = "Harga wajib diisi.";
  } else if (isNaN(Number(values.price))) {
    errors.price = "Harga harus berupa angka.";
  } else if (Number(values.price) < 0) {
    errors.price = "Harga tidak boleh negatif.";
  }

  if (values.stock === "" || values.stock === null) {
    errors.stock = "Stok wajib diisi.";
  } else if (isNaN(Number(values.stock))) {
    errors.stock = "Stok harus berupa angka.";
  } else if (Number(values.stock) < 0) {
    errors.stock = "Stok tidak boleh kurang dari 0.";
  }

  if (!values.unit) errors.unit = "Satuan wajib diisi.";
  if (!values.supplier) errors.supplier = "Supplier wajib diisi.";

  return errors;
}

function showFormErrors(errors) {
  clearFormErrors();
  Object.entries(errors).forEach(([field, message]) => {
    const el = document.getElementById(`error-${field}`);
    if (el) el.textContent = message;
  });
}

async function isDuplicateCode(code, excludeId) {
  const userId = await getCurrentUserId();
  if (!userId) return false;
  let query = supabaseClient.from("products").select("id").eq("code", code).eq("user_id", userId);
  if (excludeId) query = query.neq("id", excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0;
}

async function uploadProductImage(file) {
  const fileName = buildUniqueFileName(file.name);
  const { error: uploadError } = await supabaseClient.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(fileName);
  return { url: data.publicUrl, path: fileName };
}

async function deleteProductImageByUrl(imageUrl) {
  if (!imageUrl) return;
  try {
    const parts = imageUrl.split(`${PRODUCT_IMAGE_BUCKET}/`);
    if (parts.length < 2) return;
    const path = decodeURIComponent(parts[1]);
    await supabaseClient.storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  } catch (err) {
    console.warn("Gagal menghapus gambar lama:", err);
  }
}

async function handleProductFormSubmit(e) {
  e.preventDefault();

  const values = {
    code: document.getElementById("product-code").value.trim(),
    name: document.getElementById("product-name").value.trim(),
    category: document.getElementById("product-category").value.trim(),
    price: document.getElementById("product-price").value,
    stock: document.getElementById("product-stock").value,
    unit: document.getElementById("product-unit").value.trim(),
    supplier: document.getElementById("product-supplier").value.trim(),
  };

  const errors = validateProductForm(values);
  if (Object.keys(errors).length) {
    showFormErrors(errors);
    return;
  }
  clearFormErrors();

  const submitBtn = document.getElementById("product-submit-btn");
  setButtonLoading(submitBtn, true, editingProductId ? "Menyimpan..." : "Menyimpan...");

  try {
    // Ambil user_id langsung dari Supabase Auth — TIDAK PERNAH dari input HTML.
    const userId = await getCurrentUserId();
    if (!userId) return;

    // Cek duplikasi kode barang (hanya dalam lingkup data milik user ini)
    const duplicate = await isDuplicateCode(values.code, editingProductId);
    if (duplicate) {
      showFormErrors({ code: "Kode barang sudah digunakan." });
      setButtonLoading(submitBtn, false);
      return;
    }

    let imageUrl = null;
    let oldImageUrl = null;

    if (editingProductId) {
      const existing = allProducts.find((p) => String(p.id) === String(editingProductId));
      oldImageUrl = existing ? existing.image_url : null;
      imageUrl = oldImageUrl;
    }

    if (selectedImageFile) {
      setButtonLoading(submitBtn, true, "Mengupload gambar...");
      const uploaded = await uploadProductImage(selectedImageFile);
      imageUrl = uploaded.url;
    }

    const payload = {
      code: values.code,
      name: values.name,
      category: values.category,
      price: Number(values.price),
      stock: Number(values.stock),
      unit: values.unit,
      supplier: values.supplier,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };

    setButtonLoading(submitBtn, true, "Menyimpan data...");

    if (editingProductId) {
      const { error } = await supabaseClient
        .from("products")
        .update(payload)
        .eq("id", editingProductId)
        .eq("user_id", userId);
      if (error) throw error;

      // Hapus gambar lama jika diganti dengan gambar baru
      if (selectedImageFile && oldImageUrl && oldImageUrl !== imageUrl) {
        await deleteProductImageByUrl(oldImageUrl);
      }
      showToast("Data berhasil diperbarui");
    } else {
      // user_id diambil dari sesi Supabase Auth yang sedang login, bukan dari form.
      const { error } = await supabaseClient.from("products").insert({ ...payload, user_id: userId });
      if (error) throw error;
      showToast("Barang berhasil ditambahkan");
    }

    closeProductModal();
    await loadProducts();
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

/* ---------------------------------------------------------------------- */
/*  DELETE                                                                 */
/* ---------------------------------------------------------------------- */

async function deleteProduct(id) {
  const product = allProducts.find((p) => String(p.id) === String(id));
  if (!product) return;

  const confirmed = await confirmDialog({
    title: "Hapus Barang",
    message: `Apakah Anda yakin ingin menghapus "${product.name}"? Tindakan ini tidak dapat dibatalkan.`,
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

    if (product.image_url) {
      await deleteProductImageByUrl(product.image_url);
    }

    showToast("Barang berhasil dihapus");
    await loadProducts();
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  }
}
