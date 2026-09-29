initLayout("dashboard");

const isAdmin = Auth.isAdmin();
document.getElementById(isAdmin ? "admin-view" : "user-view").classList.remove("hidden");

document.getElementById("quick-verify")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("quick-code").value.trim();
  if (!code) return Toast.error("Enter a verification code.");
  window.location.href = "verify.html?code=" + encodeURIComponent(code);
});

function loadUserView() {
  const u = Auth.getCurrentUser();
  const name = u.name || u.username;
  document.getElementById("user-welcome").textContent = "Welcome, " + name;
  document.getElementById("acct-av").textContent = initialsOf(name);
  document.getElementById("acct-name").textContent = name;
  document.getElementById("acct-user").textContent = "@" + u.username + " · " + u.role;
}

async function loadAdminView() {
  const tbody = document.getElementById("dash-recent-tbody");
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center"><div class="spinner" style="margin:auto"></div></td></tr>';
  try {
    const [certs, courses, parts] = await Promise.all([loadCertificatesWithRelations(), CoursesAPI.getAll(), ParticipantsAPI.getAll()]);
    const active = certs.filter(c => c.status === "ACTIVE").length;
    animateCount(document.getElementById("dash-certs"), certs.length);
    animateCount(document.getElementById("dash-active"), active);
    animateCount(document.getElementById("dash-revoked"), certs.length - active);
    animateCount(document.getElementById("dash-courses"), courses.length);
    animateCount(document.getElementById("dash-participants"), parts.length);
    renderParticipation();
    if (!certs.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-sec)">No certificates issued yet.</td></tr>';
      return;
    }
    const recent = [...certs].sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)).slice(0, 5);
    tbody.innerHTML = recent.map(c => `
      <tr>
        <td><div class="mono">${escHtml(c.certificateId)}</div><div class="sub">${escHtml(c.participant?.fullName || "—")} · ${escHtml(c.course?.title || "—")}</div></td>
        <td>${statusBadge(c.status)}</td>
        <td style="color:var(--text-sec);white-space:nowrap">${fmtDate(c.issuedAt)}</td>
        <td><a href="certificates.html?view=${encodeURIComponent(c.certificateId)}" class="btn btn-secondary btn-sm"><i class="fa-solid fa-eye"></i> View</a></td>
      </tr>`).join("");
  } catch (err) {
    console.error(err);
    Toast.error(err.message);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-sec)">${escHtml(err.message)}</td></tr>`;
  }
}

/* Course -> participants -> certificates overview, from real backend data. */
async function renderParticipation() {
  const body = document.getElementById("course-participation-body");
  try {
    const { byCourse } = await loadCourseParticipation();
    body.innerHTML = byCourse.length
      ? byCourse.map(x => `<div class="cp-line"><span><strong>${escHtml(x.course.title)}</strong> <small>Course ID: ${x.course.id}</small></span><span>${x.participants.length} participants · ${x.certs.length} certificates</span></div>`).join("")
      : '<p style="color:var(--text-sec)">No courses yet.</p>';
  } catch (e) { console.error(e); body.textContent = "Could not load courses."; }
}

if (isAdmin) loadAdminView(); else loadUserView();
