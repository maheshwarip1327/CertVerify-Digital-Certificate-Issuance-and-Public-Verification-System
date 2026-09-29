initLayout("profile");

function renderProfile() {
  const user = Auth.getCurrentUser();
  const name = user.name || user.username;
  const isAdmin = user.role === "ADMIN";
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-role").innerHTML = `<i class="fa-solid fa-shield"></i> ${escHtml(user.role)}`;
  document.getElementById("profile-avatar").textContent = initialsOf(name);
  document.getElementById("info-name").textContent = name;
  document.getElementById("info-username").textContent = user.username;
  document.getElementById("info-role").textContent = user.role;
  if (location.hash === "#password") document.getElementById("password-form")?.scrollIntoView();
  document.getElementById("info-type").textContent = isAdmin ? "Built-in administrator (fixed credentials)" : "Registered account (stored in this browser)";
  document.getElementById("pref-name").value = name;
  if (isAdmin) {
    document.querySelectorAll("#profile-form input, #profile-form button, #password-form input, #password-form button").forEach(el => el.disabled = true);
  }
}

function refreshChrome(name) {
  const initial = initialsOf(name);
  document.querySelector("#topbar-user .topbar-username")?.replaceChildren(name);
  document.querySelector("#topbar-user .topbar-avatar")?.replaceChildren(initial);
  document.querySelector("#sidebar-user .user-name")?.replaceChildren(name);
  document.querySelector("#sidebar-user .user-avatar")?.replaceChildren(initial);
}

document.getElementById("profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const res = Auth.updateProfile(document.getElementById("pref-name").value);
  if (!res.success) return Toast.error(res.message);
  Toast.success(res.message);
  renderProfile();
  refreshChrome(Auth.getCurrentUser().name);
});

document.getElementById("password-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const res = Auth.changePassword(
    document.getElementById("pw-current").value,
    document.getElementById("pw-new").value,
    document.getElementById("pw-confirm").value);
  if (!res.success) return Toast.error(res.message);
  Toast.success(res.message);
  e.target.reset();
});

renderProfile();
