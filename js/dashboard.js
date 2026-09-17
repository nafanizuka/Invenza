/* ==========================================================================
   INVENZA — Dashboard Page Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  await requireAuth();
  await loadCurrentProfile();
  initUserNavbar();

  const welcomeName = document.getElementById("welcome-name");
  if (welcomeName && currentProfile) {
    welcomeName.textContent = currentProfile.full_name || currentProfile.email;
  }

  await loadDashboardStats();
});

async function loadDashboardStats() {
  const elTotalBarang = document.getElementById("stat-total-barang");
  const elTotalStok = document.getElementById("stat-total-stok");
  const elKategori = document.getElementById("stat-kategori");
  const elMenipis = document.getElementById("stat-menipis");
  const recentBody = document.getElementById("recent-products-body");
  const lowStockBody = document.getElementById("low-stock-body");

  try {
    const { data: products, error } = await supabaseClient
      .from("products")
      .select("id, code, name, category, stock, price, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const totalBarang = products.length;
    const totalStok = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const kategoriUnik = new Set(products.map((p) => (p.category || "").trim().toLowerCase()).filter(Boolean));
    const stokMenipis = products.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= LOW_STOCK_THRESHOLD);
    const stokHabis = products.filter((p) => Number(p.stock) === 0);

    elTotalBarang.textContent = totalBarang;
    elTotalStok.textContent = totalStok.toLocaleString("id-ID");
    elKategori.textContent = kategoriUnik.size;
    elMenipis.textContent = stokMenipis.length + stokHabis.length;

    // Recent products (5 terbaru)
    if (recentBody) {
      const recent = products.slice(0, 5);
      recentBody.innerHTML = recent.length
        ? recent
            .map(
              (p) => `
          <tr>
            <td>${escapeHtml(p.code)}</td>
            <td>${escapeHtml(p.name)}</td>
            <td>${formatRupiah(p.price)}</td>
            <td>${p.stock}</td>
          </tr>`
            )
            .join("")
        : `<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:20px;">Belum ada data barang.</td></tr>`;
    }

    // Low stock list
    if (lowStockBody) {
      const lowStockAll = [...stokHabis, ...stokMenipis].slice(0, 5);
      lowStockBody.innerHTML = lowStockAll.length
        ? lowStockAll
            .map((p) => {
              const status = getStockStatus(p.stock);
              return `
          <tr>
            <td>${escapeHtml(p.name)}</td>
            <td><span class="badge ${status.cls}">${status.label}</span></td>
          </tr>`;
            })
            .join("")
        : `<tr><td colspan="2" style="text-align:center;color:var(--color-text-muted);padding:20px;">Semua stok aman 🎉</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  }
}
