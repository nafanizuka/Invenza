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

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("reset-email").value.trim();
    if (!email) return showAlert(requestAlert, "Email wajib diisi.");

    setButtonLoading(requestSubmit, true, "Mengirim...");

    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setButtonLoading(requestSubmit, false);

    if (error) {
      showAlert(requestAlert, translateError(error));
      return;
    }
    showAlert(
      requestAlert,
      "Link reset password telah dikirim. Silakan cek email Anda.",
      "success"
    );
    requestForm.reset();
  });

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
