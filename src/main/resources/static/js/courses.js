initLayout("courses");

let courses = [];
let stats = {};   // courseId -> { participants: [], certs: [] } (admin only, real backend data)

async function loadCourses() {
  const grid = document.getElementById("data-grid");
  grid.innerHTML = '<div class="spinner"></div>';
  try {
    if (Auth.isAdmin()) {
      const d = await loadCourseParticipation();
      courses = d.courses;
      stats = {};
      d.byCourse.forEach(x => { stats[x.course.id] = x; });
    } else {
      courses = await CoursesAPI.getAll();
    }
    renderCourses(courses);
  } catch (err) {
    errorState(grid, err.message, loadCourses); Toast.error(err.message);
  }
}

function renderCourses(list) {
  const grid = document.getElementById("data-grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-state-icon"><i class="fa-solid fa-book-open"></i></div><h3>No courses yet</h3><p>Create your first learning module.</p></div>`;
    return;
  }
  grid.innerHTML = list.map(c => `
    <div class="data-card">
      <div class="data-card-header">
        <div class="data-card-icon" style="background:rgba(6,182,212,0.15);color:var(--cyan)"><i class="fa-solid fa-graduation-cap"></i></div>
        <div class="data-card-actions">
          <button class="btn btn-secondary btn-sm admin-only" onclick="openEdit(${c.id})"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-danger btn-sm admin-only" onclick="deleteCourse(${c.id},'${escHtml(c.title).replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <div>
        <h3 class="data-card-title">${escHtml(c.title)}</h3>
        <p class="data-card-subtitle">Course ID: ${c.id}</p>
      </div>
      <div class="data-card-body">
        ${escHtml(c.description || 'No description provided.')}
      </div>
      ${stats[c.id] ? `<div class="course-metrics">
        <span><i class="fa-solid fa-users"></i> Participants: <strong>${stats[c.id].participants.length}</strong></span>
        <span><i class="fa-solid fa-certificate"></i> Certificates: <strong>${stats[c.id].certs.length}</strong></span>
      </div>
      <button class="btn btn-secondary btn-sm admin-only" onclick="viewParticipants(${c.id})"><i class="fa-solid fa-users"></i> View Participants</button>` : ""}
      <div class="data-card-footer">
        <span><i class="fa-regular fa-calendar" style="margin-right:5px"></i> Created ${fmtDate(c.createdAt)}</span>
      </div>
    </div>
  `).join("");
  
  if (!Auth.isAdmin()) {
    document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
  }
}


document.getElementById("btn-add-course")?.addEventListener("click", () => {
  document.getElementById("course-id").value = "";
  document.getElementById("course-form").reset();
  document.getElementById("course-modal-title").textContent = "Add Course";
  document.getElementById("course-submit-btn").innerHTML = '<i class="fa-solid fa-plus"></i> Add';
  Modal.open("course-modal");
});

function openEdit(id) {
  const c = courses.find(x => x.id === id);
  if (!c) return;
  document.getElementById("course-id").value = c.id;
  document.getElementById("course-title").value = c.title;
  document.getElementById("course-desc").value = c.description || "";
  document.getElementById("course-modal-title").textContent = "Edit Course";
  document.getElementById("course-submit-btn").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
  Modal.open("course-modal");
}

document.getElementById("course-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("course-id").value;
  const title = document.getElementById("course-title").value.trim();
  const desc = document.getElementById("course-desc").value.trim();
  if (!title) return Toast.error("Title is required.");
  // Re-read from the backend so the duplicate check never uses stale data.
  try { courses = await CoursesAPI.getAll(); } catch (err) { return Toast.error(err.message); }
  const dup = courses.find(c => normName(c.title) === normName(title) && String(c.id) !== String(id));
  if (dup) return Toast.error(`"${dup.title}" already exists. Please select the existing course.`);
  
  const btn = document.getElementById("course-submit-btn");
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div>';
  
  try {
    if (id) await CoursesAPI.update(id, { title, description: desc });
    else await CoursesAPI.create({ title, description: desc });
    Toast.success(id ? "Course updated successfully." : "Course created successfully.");
    Modal.close("course-modal");
    loadCourses();
  } catch (err) { Toast.error(err.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
});

function deleteCourse(id, title) {
  Modal.confirm({
    title: "Delete Course?",
    message: "Delete <strong>" + escHtml(title) + "</strong>? Certificates will also be deleted.",
    confirmText: "Delete",
    onConfirm: async () => {
      try {
        await CoursesAPI.delete(id);
        Toast.success("Course deleted successfully.");
        loadCourses();
      } catch (err) { Toast.error(err.message); }
    }
  });
}

loadCourses();

document.getElementById("search-input")?.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  renderCourses(q ? courses.filter(c => ((c.title||'')+' '+(c.description||'')).toLowerCase().includes(q)) : courses);
});

/* Participants who hold a certificate in this course (the only course link the backend stores). */
function viewParticipants(id) {
  const x = stats[id];
  if (!x) return;
  const rows = x.participants.length ? x.participants.map((p, i) => {
    const mine = x.certs.filter(c => c.participant && c.participant.id === p.id);
    return `<div class="pl-row"><div class="pl-av">${escHtml(initialsOf(p.fullName))}</div>
      <div class="pl-main"><strong>${i + 1}. ${escHtml(p.fullName)}</strong><small>${escHtml(p.email)}</small></div>
      <div class="pl-certs">${mine.map(c => `<span class="badge ${c.status === "ACTIVE" ? "badge-active" : "badge-revoked"}">${escHtml(c.certificateId)}</span>`).join(" ")}</div></div>`;
  }).join("") : '<p style="color:var(--text-sec)">No participants hold a certificate in this course yet.</p>';
  let ov = document.getElementById("cp-modal");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "cp-modal"; ov.className = "modal-overlay hidden";
    ov.innerHTML = '<div class="modal" style="max-width:640px"><div class="modal-header"><h3 class="modal-title" id="cp-title"></h3><button class="modal-close" aria-label="Close" onclick="Modal.close(\'cp-modal\')"><i class="fa-solid fa-xmark"></i></button></div><div id="cp-body"></div></div>';
    ov.addEventListener("click", e => { if (e.target === ov) Modal.close("cp-modal"); });
    document.body.appendChild(ov);
  }
  document.getElementById("cp-title").textContent = x.course.title + " — Participants";
  document.getElementById("cp-body").innerHTML = `<p class="cp-note">Course ID: ${x.course.id} · listed from issued certificates (the backend links participants to courses only through certificates).</p>` + rows;
  Modal.open("cp-modal");
}
