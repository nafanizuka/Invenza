/* ==========================================================================
   INVENZA — Auth Guard
   Fungsi reusable untuk melindungi halaman internal (dashboard, products,
   product-detail) dari akses tanpa login, serta menangani logout dan
   pergantian status sesi secara real-time.
   ========================================================================== */

let currentSession = null;
let currentProfile = null;

/**
 * Dipanggil di setiap halaman yang butuh login.
 * Jika tidak ada session aktif -> redirect ke login.html
 * Jika ada -> resolve dengan objek session.
 */
async function requireAuth() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error || !data || !data.session) {
    window.location.replace("login.html");
    return null;
  }

  currentSession = data.session;

  // Dengarkan perubahan status auth (misalnya token expired / logout di tab lain)
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      window.location.replace("login.html");
    } else {
      currentSession = session;
    }
  });

  return currentSession;
}

/**
 * Ambil user_id pengguna yang sedang login langsung dari Supabase Auth.
 * PENTING: digunakan sebagai satu-satunya sumber user_id untuk seluruh
 * query/insert data inventaris — JANGAN pernah mengambil user_id dari
 * input HTML atau state lain yang bisa dimanipulasi.
 */
async function getCurrentUserId() {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser();

  if (error || !user) {
    window.location.replace("login.html");
    return null;
  }
  return user.id;
}

/**
 * Ambil profil pengguna (tabel profiles) untuk ditampilkan di navbar.
 */
async function loadCurrentProfile() {
  if (!currentSession) return null;
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentSession.user.id)
    .single();

  if (error) {
    console.warn("Gagal memuat profil:", error.message);
    currentProfile = {
      full_name: currentSession.user.user_metadata?.full_name || currentSession.user.email,
      email: currentSession.user.email,
    };
  } else {
    currentProfile = data;
  }
  return currentProfile;
}

/**
 * Redirect pengguna yang SUDAH login menjauh dari halaman login/signup.
 */
async function redirectIfLoggedIn(destination = "dashboard.html") {
  const { data } = await supabaseClient.auth.getSession();
  if (data && data.session) {
    window.location.replace(destination);
    return true;
  }
  return false;
}

/**
 * Logout pengguna dan kembali ke login.html
 */
async function handleLogout() {
  const confirmed = await confirmDialog({
    title: "Logout",
    message: "Apakah Anda yakin ingin keluar dari akun ini?",
    confirmText: "Logout",
    cancelText: "Batal",
    danger: true,
  });
  if (!confirmed) return;

  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast(translateError(error), "error");
    return;
  }
  window.location.replace("login.html");
}

/**
 * Nama tampilan pengguna: prioritaskan username, lalu full_name, lalu email.
 * Dipakai di navbar dan halaman profil supaya konsisten.
 */
function getDisplayName(profile) {
  if (!profile) return "Pengguna";
  return (profile.username && profile.username.trim()) || profile.full_name || profile.email || "Pengguna";
}

/**
 * Render foto profil (jika ada avatar_url) atau inisial huruf sebagai fallback
 * ke dalam elemen avatar manapun (navbar, halaman profil, dsb).
 */
function renderAvatarInto(el, profile, fallbackName) {
  if (!el) return;
  const url = profile && profile.avatar_url;
  const name = fallbackName || getDisplayName(profile);
  const initial = name.trim().charAt(0).toUpperCase();
  if (url) {
    el.innerHTML = `<img src="${escapeHtml(url)}" alt="Foto profil" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    const img = el.querySelector("img");
    if (img) {
      img.addEventListener("error", () => {
        el.textContent = initial;
      });
    }
  } else {
    el.textContent = initial;
  }
}

/**
 * Inisialisasi elemen navbar umum (nama user, inisial avatar, tombol logout)
 * pada halaman-halaman yang dilindungi.
 */
function initUserNavbar() {
  const nameEl = document.getElementById("navbar-user-name");
  const avatarEl = document.getElementById("navbar-user-avatar");
  if (currentProfile) {
    const name = getDisplayName(currentProfile);
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) renderAvatarInto(avatarEl, currentProfile, name);
  }
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  // Sidebar toggle untuk mobile
  const menuToggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (menuToggle && sidebar && overlay) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.add("open");
      overlay.classList.add("show");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    });
    sidebar.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.classList.remove("show");
      });
    });
  }
}
