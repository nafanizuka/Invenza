/* ==========================================================================
   INVENZA — Sign Up Page Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initPasswordToggles();
  await redirectIfLoggedIn("dashboard.html");

  const form = document.getElementById("signup-form");
  const alertBox = document.getElementById("signup-alert");
  const submitBtn = document.getElementById("signup-submit");

  function showAlert(message, type = "error") {
    alertBox.textContent = message;
    alertBox.className = `auth-alert show ${type}`;
  }
  function hideAlert() {
    alertBox.className = "auth-alert";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert();

    const name = document.getElementById("signup-name").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const confirmPassword = document.getElementById("signup-confirm-password").value;

    // Validasi
    if (!name) return showAlert("Nama wajib diisi.");
    if (name.length < 3) return showAlert("Nama minimal 3 karakter.");
    if (!email) return showAlert("Email wajib diisi.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return showAlert("Format email tidak valid.");
    if (!password || password.length < 6) return showAlert("Password minimal 6 karakter.");
    if (password !== confirmPassword) return showAlert("Konfirmasi password tidak sama.");

    setButtonLoading(submitBtn, true, "Mendaftar...");

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      setButtonLoading(submitBtn, false);

      if (error) {
        console.error("Sign up error:", error);
        showAlert(translateError(error));
        return;
      }

      // Kasus aneh: signUp tidak error tapi juga tidak mengembalikan user (harusnya jarang terjadi)
      if (!data || !data.user) {
        showAlert("Pendaftaran gagal. Silakan coba lagi.");
        return;
      }

      form.reset();

      // Jika email confirmation aktif, session akan null meski user sudah dibuat di auth.users.
      if (data.session) {
        showAlert("Akun berhasil dibuat. Mengalihkan ke dashboard...", "success");
        setTimeout(() => window.location.replace("dashboard.html"), 1200);
      } else {
        showAlert("Akun berhasil dibuat. Mengalihkan ke halaman login...", "success");
        setTimeout(() => window.location.replace("login.html?registered=1"), 1500);
      }
    } catch (err) {
      // Menangkap error tak terduga (mis. jaringan putus, exception JS) supaya UI tidak diam saja
      console.error("Unexpected sign up error:", err);
      setButtonLoading(submitBtn, false);
      showAlert(translateError(err));
    }
  });
});
