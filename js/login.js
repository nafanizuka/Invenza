/* ==========================================================================
   INVENZA — Login Page Logic
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initPasswordToggles();

  // Jika sudah login, langsung ke dashboard
  await redirectIfLoggedIn("dashboard.html");

  const form = document.getElementById("login-form");
  const alertBoxInit = document.getElementById("login-alert");

  // Tampilkan pesan sukses kalau baru saja selesai sign up
  if (getQueryParam("registered") === "1" && alertBoxInit) {
    alertBoxInit.textContent = "Akun berhasil dibuat. Silakan login.";
    alertBoxInit.className = "auth-alert show success";
  }

  const alertBox = document.getElementById("login-alert");
  const submitBtn = document.getElementById("login-submit");

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

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email) return showAlert("Email wajib diisi.");
    if (!password) return showAlert("Password wajib diisi.");

    setButtonLoading(submitBtn, true, "Masuk...");

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      setButtonLoading(submitBtn, false);

      if (error) {
        console.error("Login error:", error);
        showAlert(translateError(error));
        return;
      }

      if (data && data.session) {
        window.location.replace("dashboard.html");
      } else {
        showAlert("Login gagal. Silakan coba lagi.");
      }
    } catch (err) {
      // Menangkap error tak terduga supaya UI tidak diam saja tanpa respon
      console.error("Unexpected login error:", err);
      setButtonLoading(submitBtn, false);
      showAlert(translateError(err));
    }
  });
});
