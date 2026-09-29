/* CertVerify — shared UI utilities (toasts, modals, layout, helpers). Load after auth.js and api.js. */
function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

const Toast = {
  show(message, type = "success", duration = 3500) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type} ${type}`;
    const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-xmark" : "fa-circle-info";
    const i = document.createElement("i");
    i.className = `fa-solid ${icon}`;
    const span = document.createElement("span");
    span.textContent = message;
    toast.append(i, span);
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
  success(msg) { this.show(msg, "success"); },
  error(msg)   { this.show(msg, "error", 5000); },
  info(msg)    { this.show(msg, "info"); }
};

const Modal = {
  open(id)  { document.getElementById(id)?.classList.remove("hidden"); },
  close(id) { document.getElementById(id)?.classList.add("hidden"); },
  confirm({ title, message, confirmText = "Confirm", confirmClass = "btn-danger", onConfirm }) {
    let overlay = document.getElementById("confirm-modal-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "confirm-modal-overlay";
      overlay.className = "modal-overlay hidden";
      overlay.innerHTML = `
        <div class="modal" style="max-width:420px">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title"></h3>
            <button class="modal-close" id="confirm-modal-x" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <p id="confirm-modal-msg" style="color:var(--text-sec);font-size:0.9rem;line-height:1.6"></p>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
            <button class="btn" id="confirm-modal-ok"></button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }
    overlay.querySelector("#confirm-modal-title").textContent = title;
    overlay.querySelector("#confirm-modal-msg").innerHTML = message; // callers pass escHtml()'d values
    const okBtn = overlay.querySelector("#confirm-modal-ok");
    okBtn.textContent = confirmText;
    okBtn.className = `btn ${confirmClass}`;
    overlay.classList.remove("hidden");
    const close = () => overlay.classList.add("hidden");
    overlay.querySelector("#confirm-modal-x").onclick = close;
    overlay.querySelector("#confirm-modal-cancel").onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    okBtn.onclick = () => { close(); onConfirm(); };
  }
};

function fmtDate(val) {
  if (!val) return "-";
  try {
    const d = Array.isArray(val)
      ? new Date(val[0], val[1]-1, val[2], val[3]||0, val[4]||0, val[5]||0)
      : new Date(val);
    if (isNaN(d)) return String(val);
    return d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return String(val); }
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function statusBadge(status) {
  return status === "ACTIVE"
    ? `<span class="badge badge-active"><i class="fa-solid fa-circle-check"></i> Active</span>`
    : `<span class="badge badge-revoked"><i class="fa-solid fa-ban"></i> Revoked</span>`;
}

function errorState(container, message, retryFn) {
  container.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon"><i class="fa-solid fa-triangle-exclamation"></i></div><h3>Could not load data</h3><p>${escHtml(message)}</p><button class="btn btn-secondary btn-sm" id="retry-btn"><i class="fa-solid fa-rotate"></i> Retry</button></div>`;
  container.querySelector("#retry-btn").onclick = retryFn;
}

/* GET /certificates does not include course/participant (@JsonIgnore on the backend entity).
   Courses and participants DO include their certificates, so we map certificateId -> owner from those. */
async function loadCertificatesWithRelations() {
  const certs = await CertificatesAPI.getAll();
  const [courses, parts] = await Promise.all([
    CoursesAPI.getAll().catch(e => { console.error(e); return []; }),
    ParticipantsAPI.getAll().catch(e => { console.error(e); return []; })
  ]);
  const cm = {}, pm = {};
  courses.forEach(c => (c.certificates || []).forEach(x => { cm[x.certificateId] = c; }));
  parts.forEach(p => (p.certificates || []).forEach(x => { pm[x.certificateId] = p; }));
  return certs.map(c => ({ ...c, course: cm[c.certificateId] || null, participant: pm[c.certificateId] || null }));
}

function initialsOf(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}
function normName(s) { return String(s || "").trim().replace(/\s+/g, " ").toLowerCase(); }

/* Course -> participants, derived ONLY from real backend data.
   The backend has no participant->course field; the only link is a Certificate row.
   Course.certificates[] and Participant.certificates[] are both serialized, so we join on certificateId. */
async function loadCourseParticipation() {
  const [courses, parts] = await Promise.all([CoursesAPI.getAll(), ParticipantsAPI.getAll()]);
  const owner = {};
  parts.forEach(p => (p.certificates || []).forEach(x => { owner[x.certificateId] = p; }));
  const byCourse = courses.map(c => {
    const certs = (c.certificates || []).map(x => ({ ...x, participant: owner[x.certificateId] || null }));
    const seen = new Map();
    certs.forEach(x => { if (x.participant && !seen.has(x.participant.id)) seen.set(x.participant.id, x.participant); });
    return { course: c, certs, participants: [...seen.values()] };
  });
  return { courses, parts, byCourse };
}

function initLayout(activeNav, opts = {}) {
  if (!Auth.requireAuth()) return false;
  const user = Auth.getCurrentUser();
  if (!user) { Auth.logout(); return false; }
  const isAdmin = user.role === "ADMIN";

  if (opts.adminOnly && !isAdmin) {
    window.location.replace("dashboard.html");
    return false;
  }

  const name = user.name || user.username;
  const initial = initialsOf(name);

  const topbarUser = document.getElementById("topbar-user");
  if (topbarUser) {
    if (!topbarUser.querySelector(".topbar-role")) {
      const un = topbarUser.querySelector(".topbar-username");
      const box = document.createElement("div");
      box.className = "topbar-ident";
      un.replaceWith(box);
      box.appendChild(un);
      const r = document.createElement("small");
      r.className = "topbar-role";
      box.appendChild(r);
    }
    topbarUser.querySelector(".topbar-role").textContent = user.role;
    topbarUser.querySelector(".topbar-username").textContent = name;
    topbarUser.title = name + " (" + user.role + ")";
    topbarUser.querySelector(".topbar-avatar").textContent = initial;
    topbarUser.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("topbar-dropdown")?.classList.toggle("hidden");
    });
  }
  ["topbar-dropdown", "sidebar-dropdown"].forEach(id => {
    const dd = document.getElementById(id);
    if (!dd || dd.querySelector(".dd-pw")) return;
    const item = document.createElement("div");
    item.className = "dropdown-item dd-pw";
    item.innerHTML = '<i class="fa-solid fa-key"></i> Change Password';
    item.addEventListener("click", () => { window.location.href = "profile.html#password"; });
    dd.querySelector(".danger")?.before(item);
  });
  document.getElementById("topbar-logout")?.addEventListener("click", () => Auth.logout());
  document.getElementById("topbar-profile")?.addEventListener("click", () => window.location.href = "profile.html");

  const sidebarUser = document.getElementById("sidebar-user");
  if (sidebarUser) {
    sidebarUser.querySelector(".user-name").textContent = name;
    const roleIcon = isAdmin ? '<i class="fa-solid fa-shield"></i>' : '<i class="fa-solid fa-user"></i>';
    sidebarUser.querySelector(".user-role").innerHTML = `${roleIcon} ${escHtml(user.role)}`;
    sidebarUser.querySelector(".user-avatar").textContent = initial;
    sidebarUser.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("sidebar-dropdown")?.classList.toggle("hidden");
    });
  }
  document.getElementById("sidebar-logout")?.addEventListener("click", () => Auth.logout());
  document.getElementById("sidebar-profile-link")?.addEventListener("click", () => window.location.href = "profile.html");

  document.addEventListener("click", () => {
    document.getElementById("topbar-dropdown")?.classList.add("hidden");
    document.getElementById("sidebar-dropdown")?.classList.add("hidden");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
  });

  const greetEl = document.getElementById("topbar-greeting");
  if (greetEl && activeNav === "dashboard") greetEl.textContent = `${getGreeting()}, ${name}`;

  if (activeNav) {
    document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.nav === activeNav));
  }

  const hamburger = document.getElementById("hamburger");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => { sidebar.classList.toggle("open"); overlay?.classList.toggle("active"); });
    overlay?.addEventListener("click", () => { sidebar.classList.remove("open"); overlay.classList.remove("active"); });
  }

  if (!isAdmin) applyRoleVisibility();

  // Back-button / bfcache and multi-tab logout protection
  window.addEventListener("pageshow", () => { if (!Auth.isLoggedIn()) window.location.replace("login.html"); });
  window.addEventListener("storage", () => { if (!Auth.isLoggedIn()) window.location.replace("login.html"); });
  return true;
}

function applyRoleVisibility() {
  if (Auth.isAdmin()) return;
  document.querySelectorAll(".admin-only, .nav-item[data-nav='certificates'], .nav-item[data-nav='statistics']").forEach(el => el.classList.add("hidden"));
}

function animateCount(el, target, duration = 900) {
  if (!el) return;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = Math.round((1 - Math.pow(1 - progress, 3)) * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
