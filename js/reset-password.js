/* ==========================================================================
   INVENZA — Reset Password Page Logic
   Halaman ini punya dua mode:
   1. REQUEST mode: pengguna memasukkan email untuk menerima link reset.
   2. UPDATE mode: pengguna datang dari link email Supabase dan membuat
      password baru (terdeteksi lewat event PASSWORD_RECOVERY / access_token
      pada URL yang otomatis ditangani supabase-js).
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initPasswordToggles();

  const requestSection = document.getElementById("request-section");
  const updateSection = document.getElementById("update-section");

  const requestForm = document.getElementById("request-form");
  const requestAlert = document.getElementById("request-alert");
  const requestSubmit = document.getElementById("request-submit");

  const updateForm = document.getElementById("update-form");
  const updateAlert = document.getElementById("update-alert");
  const updateSubmit = document.getElementById("update-submit");

  function showAlert(box, message, type = "error") {
    box.textContent = message;
    box.className = `auth-alert show ${type}`;
  }

  // Supabase akan memicu event PASSWORD_RECOVERY ketika pengguna membuka
  // link reset password dari email.
  supabaseClient.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      requestSection.classList.add("hidden");
      updateSection.classList.remove("hidden");
    }
  });

  // Fallback: jika URL mengandung token type=recovery, tampilkan form update.
  if (window.location.hash.includes("type=recovery")) {
    requestSection.classList.add("hidden");
    updateSection.classList.remove("hidden");
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();

    if (!email) return showAlert(requestAlert, "Email wajib diisi.");
    if (!EMAIL_REGEX.test(email)) return showAlert(requestAlert, "Format email tidak valid.");

    setButtonLoading(requestSubmit, true, "Mengirim...");

    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setButtonLoading(requestSubmit, false);

    // PENTING (keamanan): JANGAN pernah membocorkan apakah suatu email
    // terdaftar atau tidak di sistem. Supabase sendiri TIDAK mengembalikan
    // error untuk email yang tidak terdaftar (supaya tidak bisa dipakai
    // untuk enumerasi akun), jadi UI di sini juga selalu memakai pesan
    // netral yang sama baik email tersebut terdaftar maupun tidak.
    // Kita tidak pernah melakukan query ke auth.users dari browser, dan
    // tidak pernah memakai Service Role Key di frontend untuk "memastikan"
    // akun ada terlebih dulu.
    if (error && !isTransientAuthError(error)) {
      // Hanya tampilkan error untuk kegagalan teknis nyata (mis. rate limit,
      // jaringan putus) — bukan untuk kasus "email tidak ditemukan".
      showAlert(requestAlert, translateError(error));
      return;
    }

    showAlert(
      requestAlert,
      "Jika email tersebut terdaftar, instruksi reset password akan dikirim. Silakan cek inbox (dan folder spam) Anda.",
      "success"
    );
    requestForm.reset();
  });

  function isTransientAuthError(error) {
    const msg = ((error && error.message) || "").toLowerCase();
    // Error yang murni "user not found" / semacamnya tetap harus tampil netral.
    return msg.includes("user not found") || msg.includes("not found");
  }

  updateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-new-password").value;

    if (!newPassword || newPassword.length < 6) {
      return showAlert(updateAlert, "Password minimal 6 karakter.");
    }
    if (newPassword !== confirmPassword) {
      return showAlert(updateAlert, "Konfirmasi password tidak sama.");
    }

    setButtonLoading(updateSubmit, true, "Menyimpan...");

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });

    setButtonLoading(updateSubmit, false);

    if (error) {
      showAlert(updateAlert, translateError(error));
      return;
    }

    showAlert(updateAlert, "Password berhasil diperbarui. Mengalihkan ke login...", "success");
    setTimeout(() => window.location.replace("login.html"), 1500);
  });
});
