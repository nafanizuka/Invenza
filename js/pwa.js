/* ==========================================================================
   INVENZA — PWA Install Logic (SATU-SATUNYA sistem PWA).
   Mengontrol SEMUA tombol dengan atribut [data-pwa-install]:
     - "sidebar": tombol di atas Logout (drawer/sidebar)
     - "topbar" : tombol ringkas di topbar, terlihat langsung di Android
                  tanpa harus membuka menu drawer.

   State:
     installed   : berjalan standalone / event appinstalled.
     installable : beforeinstallprompt tersedia -> prompt install NATIF.
     manual      : tidak ada beforeinstallprompt, tapi tetap bisa install
                   lewat menu browser -> tampilkan instruksi platform.
     insecure    : halaman dibuka lewat http:// (bukan HTTPS/localhost).
                   Tombol TETAP tampil dan menjelaskan bahwa install
                   butuh HTTPS (tidak disembunyikan diam-diam).
   ========================================================================== */

(function () {
  let deferredPrompt = null;
  let currentState = "manual";
  const FLAG = "invenza_pwa_appinstalled";

  const isStandalone = () =>
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;

  const isSecureEnv = () =>
    window.isSecureContext ||
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

  function detectPlatform() {
    const ua = navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
    const isAndroid = /android/i.test(ua);
    const isFirefox = /firefox|fxios/i.test(ua);
    if (isIOS) return "ios-safari";
    if (isAndroid && isFirefox) return "android-firefox";
    if (isAndroid) return "android-chrome";
    if (isFirefox) return "desktop-firefox";
    return "desktop-chromium";
  }

  const PLATFORM = detectPlatform();

  function manualHint() {
    switch (PLATFORM) {
      case "ios-safari":
        return 'Di Safari: tap tombol Share (kotak dengan panah ke atas), lalu pilih "Add to Home Screen".';
      case "android-firefox":
        return 'Buka menu (⋮) di Firefox, lalu pilih "Install" atau "Add to Home screen".';
      case "android-chrome":
        return 'Buka menu (⋮) di Chrome, lalu pilih "Install app" atau "Add to Home screen".';
      case "desktop-firefox":
        return "Firefox desktop belum menyediakan prompt install untuk PWA. Anda bisa menyematkan (pin) tab ini atau membuat bookmark.";
      default:
        return 'Klik ikon install (⊕) di address bar, atau buka menu (⋮) browser lalu pilih "Install Invenza".';
    }
  }

  function buttons() {
    return document.querySelectorAll("[data-pwa-install]");
  }

  function render(state) {
    currentState = state;
    buttons().forEach((btn) => {
      const isTopbar = btn.dataset.pwaInstall === "topbar";
      const icon = btn.querySelector(".pwa-icon");
      const label = btn.querySelector(".pwa-label");
      btn.dataset.pwaState = state;
      btn.disabled = false;
      btn.classList.remove("hidden", "sidebar-pwa-installed");

      if (state === "installed") {
        if (isTopbar) {
          btn.classList.add("hidden"); // sudah terpasang: topbar tidak perlu tombol
        } else {
          if (icon) icon.className = "bi bi-check-circle-fill pwa-icon";
          if (label) label.textContent = "Invenza Terpasang";
          btn.disabled = true;
          btn.classList.add("sidebar-pwa-installed");
        }
      } else {
        if (icon) icon.className = "bi bi-download pwa-icon";
        if (label) label.textContent = isTopbar ? "Install" : "Install Invenza";
      }
    });
  }

  function showHint(message) {
    if (typeof showToast === "function") showToast(message, "info", 8000);
    else alert(message);
  }

  async function onClick() {
    if (currentState === "installed") return;

    if (deferredPrompt) {
      const promptEvent = deferredPrompt;
      deferredPrompt = null; // event hanya boleh dipakai sekali
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        localStorage.setItem(FLAG, "1");
        render("installed");
      } else {
        render("manual"); // user menolak; tetap tampil, klik lagi = instruksi
      }
      return;
    }

    if (!isSecureEnv()) {
      showHint(
        "Install aplikasi hanya bisa dilakukan lewat alamat HTTPS (atau localhost). Buka Invenza dari alamat https:// hosting Anda, lalu tombol ini akan memasang aplikasi."
      );
      return;
    }
    showHint(manualHint());
  }

  function init() {
    if (!buttons().length) return;

    if (isStandalone() || localStorage.getItem(FLAG) === "1") {
      // Jika flag ada tapi app dibuka di browser biasa (bukan standalone),
      // anggap belum terpasang di sesi ini agar tombol tetap berguna.
      render(isStandalone() ? "installed" : "manual");
    } else {
      render(isSecureEnv() ? "manual" : "insecure");
    }

    buttons().forEach((btn) => btn.addEventListener("click", onClick));

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      render("installable");
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      localStorage.setItem(FLAG, "1");
      render("installed");
      if (typeof showToast === "function") showToast("Invenza berhasil diinstall!", "success");
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
