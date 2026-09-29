/* ==========================================================================
   INVENZA — Profile Page Logic
   Menangani: tampilan info akun, Edit Profile (username, email, foto profil),
   Ganti Password, dan tombol Install PWA.
   ========================================================================== */

let profileSelectedAvatarFile = null;
let profileRemoveAvatarFlag = false;

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireAuth();
  if (!session) return;

  const profile = await loadCurrentProfile();
  initUserNavbar();
  initPasswordToggles();

  renderProfilePage(profile, session);
  bindEditProfileModal(session);
  bindChangePasswordModal();
});

/* ---------------------------------------------------------------------- */
/*  RENDER                                                                 */
/* ---------------------------------------------------------------------- */

function renderProfilePage(profile, session) {
  const email = session?.user?.email || profile?.email || "-";
  const name = getDisplayName(profile);

  document.getElementById("profile-name-hero").textContent = name;
  document.getElementById("profile-email-hero").textContent = email;
  renderAvatarInto(document.getElementById("profile-avatar-hero"), profile, name);

  document.getElementById("info-username").textContent =
    (profile && profile.username) ? profile.username : "Belum diatur";
  document.getElementById("info-email").textContent = email;
  document.getElementById("info-joined").textContent = profile && profile.created_at ? formatDate(profile.created_at) : "-";
}

/* ---------------------------------------------------------------------- */
/*  EDIT PROFILE MODAL                                                     */
/* ---------------------------------------------------------------------- */

function bindEditProfileModal(session) {
  const modal = document.getElementById("edit-profile-modal");
  const openBtn = document.getElementById("open-edit-profile-btn");
  const form = document.getElementById("edit-profile-form");
  const fileInput = document.getElementById("avatar-file-input");
  const changePhotoBtn = document.getElementById("change-photo-btn");
  const removePhotoBtn = document.getElementById("remove-photo-btn");
  const preview = document.getElementById("avatar-picker-preview");

  openBtn.addEventListener("click", () => openEditProfileModal(session));
  modal.querySelectorAll("[data-close-modal]").forEach((btn) =>
    btn.addEventListener("click", () => closeEditProfileModal())
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeEditProfileModal();
  });

  changePhotoBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    document.getElementById("error-avatar").textContent = "";
    if (!file) return;

    const check = validateAvatarFile(file);
    if (!check.valid) {
      document.getElementById("error-avatar").textContent = check.message;
      fileInput.value = "";
      return;
    }

    profileSelectedAvatarFile = file;
    profileRemoveAvatarFlag = false;

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview foto profil">`;
    };
    reader.readAsDataURL(file);
  });

  removePhotoBtn.addEventListener("click", () => {
    profileSelectedAvatarFile = null;
    profileRemoveAvatarFlag = true;
    fileInput.value = "";
    preview.textContent = getDisplayName(currentProfile).trim().charAt(0).toUpperCase();
    document.getElementById("error-avatar").textContent = "";
  });

  form.addEventListener("submit", (e) => handleEditProfileSubmit(e, session));
}

function openEditProfileModal(session) {
  profileSelectedAvatarFile = null;
  profileRemoveAvatarFlag = false;

  document.getElementById("edit-username").value = (currentProfile && currentProfile.username) || "";
  document.getElementById("edit-email").value = session?.user?.email || "";
  document.getElementById("avatar-file-input").value = "";
  clearEditProfileErrors();

  const preview = document.getElementById("avatar-picker-preview");
  renderAvatarInto(preview, currentProfile, getDisplayName(currentProfile));

  document.getElementById("edit-profile-modal").classList.remove("hidden");
}

function closeEditProfileModal() {
  document.getElementById("edit-profile-modal").classList.add("hidden");
}

function clearEditProfileErrors() {
  document.querySelectorAll("#edit-profile-form .form-error").forEach((el) => (el.textContent = ""));
}

async function handleEditProfileSubmit(e, session) {
  e.preventDefault();
  clearEditProfileErrors();

  const usernameRaw = document.getElementById("edit-username").value;
  const emailRaw = document.getElementById("edit-email").value.trim();

  const usernameCheck = validateUsername(usernameRaw);
  if (!usernameCheck.valid) {
    document.getElementById("error-username").textContent = usernameCheck.message;
    return;
  }
  if (!emailRaw) {
    document.getElementById("error-email").textContent = "Email wajib diisi.";
    return;
  }

  const submitBtn = document.getElementById("edit-profile-submit-btn");
  const originalBtnHtml = submitBtn.innerHTML;
  setButtonLoading(submitBtn, true, "Saving...");

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    // ---- 1. Simpan username (tabel profiles) ----
    const { error: usernameError } = await supabaseClient
      .from("profiles")
      .update({ username: usernameCheck.value, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (usernameError) {
      if (usernameError.code === "23505") {
        document.getElementById("error-username").textContent = "Username sudah digunakan, coba yang lain.";
        return;
      }
      throw usernameError;
    }

    // ---- 2. Foto profil: upload baru / hapus, gunakan Supabase Storage ----
    if (profileSelectedAvatarFile || profileRemoveAvatarFlag) {
      setButtonLoading(submitBtn, true, "Uploading photo...");
      try {
        await applyAvatarChange(userId, profileSelectedAvatarFile);
      } catch (avatarErr) {
        console.error(avatarErr);
        showToast(translateError(avatarErr), "error");
        return;
      }
    }

    // ---- 3. Email: HARUS lewat supabase.auth.updateUser, bukan tabel profiles ----
    let emailPending = false;
    if (emailRaw && session?.user?.email && emailRaw !== session.user.email) {
      setButtonLoading(submitBtn, true, "Saving...");
      const { error: emailError } = await supabaseClient.auth.updateUser({ email: emailRaw });
      if (emailError) {
        document.getElementById("error-email").textContent = translateError(emailError);
        return;
      }
      emailPending = true;
    }

    await loadCurrentProfile();
    initUserNavbar();
    renderProfilePage(currentProfile, { user: { email: emailPending ? session.user.email : emailRaw } });

    closeEditProfileModal();

    if (emailPending) {
      showToast("Permintaan perubahan email berhasil. Silakan cek email baru kamu untuk verifikasi.", "info", 6000);
    } else {
      showToast("Profil berhasil diperbarui");
    }
  } catch (err) {
    console.error(err);
    showToast(translateError(err), "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
}

/**
 * Ganti/hapus foto profil dengan URUTAN YANG AMAN (lihat PRD #14):
 *   1. Upload foto BARU dulu (foto lama TIDAK disentuh sama sekali).
 *   2. Jika upload gagal -> berhenti, foto lama tetap aman.
 *   3. Jika upload berhasil -> update kolom profiles.avatar_url.
 *   4. Jika update DB gagal -> hapus file baru yang baru diupload (rollback),
 *      foto lama TETAP aman & tidak dihapus.
 *   5. Jika update DB berhasil -> BARU hapus file foto lama milik user ini
 *      (bukan menghapus seluruh isi folder secara membabi buta, hanya file
 *      lama yang tercatat sebelumnya di avatar_url, dan tidak pernah
 *      menghapus file yang baru saja diupload).
 */
async function applyAvatarChange(userId, file) {
  const previousAvatarUrl = currentProfile && currentProfile.avatar_url;
  let newAvatarUrl = null;
  let newPath = null;

  // ---- 1. Upload foto baru (jika ada) — foto lama belum disentuh ----
  if (file) {
    const check = validateAvatarFile(file);
    if (!check.valid) throw new Error(check.message);

    newPath = `${userId}/avatar-${Date.now()}.${check.ext}`;
    const { error: uploadError } = await supabaseClient.storage
      .from(PROFILE_IMAGE_BUCKET)
      .upload(newPath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw uploadError; // gagal upload -> foto lama tetap aman

    const { data } = supabaseClient.storage.from(PROFILE_IMAGE_BUCKET).getPublicUrl(newPath);
    newAvatarUrl = data.publicUrl;
  }
  // Jika file null (mode hapus foto), newAvatarUrl tetap null -> avatar_url akan diset NULL.

  // ---- 2. Update database dulu ----
  const { error: dbError } = await supabaseClient
    .from("profiles")
    .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (dbError) {
    // Update DB gagal -> rollback file baru (jika ada), foto lama TIDAK dihapus.
    if (newPath) {
      await supabaseClient.storage.from(PROFILE_IMAGE_BUCKET).remove([newPath]).catch(() => {});
    }
    throw dbError;
  }

  // ---- 3. Baru sekarang aman menghapus foto LAMA (bukan seluruh folder) ----
  if (previousAvatarUrl) {
    try {
      const parts = previousAvatarUrl.split(`${PROFILE_IMAGE_BUCKET}/`);
      if (parts.length >= 2) {
        const oldPath = decodeURIComponent(parts[1]);
        if (oldPath !== newPath) {
          await supabaseClient.storage.from(PROFILE_IMAGE_BUCKET).remove([oldPath]);
        }
      }
    } catch (cleanupErr) {
      console.warn("Gagal membersihkan foto lama (tidak fatal):", cleanupErr);
    }
  }
}

/* ---------------------------------------------------------------------- */
/*  CHANGE PASSWORD MODAL                                                  */
/* ---------------------------------------------------------------------- */

function bindChangePasswordModal() {
  const modal = document.getElementById("change-password-modal");
  const openBtn = document.getElementById("open-change-password-btn");
  const form = document.getElementById("change-password-form");

  openBtn.addEventListener("click", () => {
    form.reset();
    clearChangePasswordErrors();
    modal.classList.remove("hidden");
  });
  modal.querySelectorAll("[data-close-modal]").forEach((btn) =>
    btn.addEventListener("click", () => modal.classList.add("hidden"))
  );
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  });

  form.addEventListener("submit", handleChangePasswordSubmit);
}

function clearChangePasswordErrors() {
  document.querySelectorAll("#change-password-form .form-error").forEach((el) => (el.textContent = ""));
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  clearChangePasswordErrors();

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-new-password").value;

  if (!newPassword || newPassword.length < 6) {
    document.getElementById("error-new-password").textContent = "Password minimal 6 karakter.";
    return;
  }
  if (newPassword !== confirmPassword) {
    document.getElementById("error-confirm-password").textContent = "Konfirmasi password tidak sama.";
    return;
  }

  const submitBtn = document.getElementById("change-password-submit-btn");
  setButtonLoading(submitBtn, true, "Saving...");

  try {
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showToast("Password berhasil diperbarui");
    document.getElementById("change-password-modal").classList.add("hidden");
    document.getElementById("change-password-form").reset();
  } catch (err) {
    console.error(err);
    document.getElementById("error-new-password").textContent = translateError(err);
  } finally {
    setButtonLoading(submitBtn, false);
  }
}
