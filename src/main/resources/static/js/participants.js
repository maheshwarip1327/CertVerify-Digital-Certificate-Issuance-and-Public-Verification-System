initLayout("participants", { adminOnly: true });

let participants = [];
let memberOf = {};   // participantId -> [course] (derived from certificates)
let courseList = [];

async function loadParticipants() {
  const grid = document.getElementById("data-grid");
  grid.innerHTML = '<div class="spinner"></div>';
  try {
    const d = await loadCourseParticipation();
    participants = d.parts; courseList = d.courses; memberOf = {};
    d.byCourse.forEach(x => x.participants.forEach(p => { (memberOf[p.id] = memberOf[p.id] || []).push(x.course); }));
    buildCourseFilter();
    applyFilters();
  } catch (err) {
    errorState(grid, err.message, loadParticipants); Toast.error(err.message);
  }
}

function avatarColor(name) {
  const colors = ["#1a56db","#06b6d4","#7c3aed","#10b981","#f59e0b","#ef4444"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

function renderParticipants(list) {
  const grid = document.getElementById("data-grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1;"><div class="empty-state-icon"><i class="fa-solid fa-users"></i></div><h3>No participants</h3><p>Add your first participant profile.</p></div>`;
    return;
  }
  grid.innerHTML = list.map(p => {
    const initials = (p.fullName || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);
    const color = avatarColor(p.fullName || "");
    return `
    <div class="data-card" style="text-align: center; align-items: center; padding: 30px 20px;">
      <div style="width: 72px; height: 72px; border-radius: 50%; background: ${color}; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; margin-bottom: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.3);">
        ${initials}
      </div>
      <h3 class="data-card-title">${escHtml(p.fullName)}</h3>
      <p class="data-card-subtitle" style="margin-bottom: 12px;">${escHtml(p.email)}</p>
      <div class="pcourses">${(memberOf[p.id] || []).map(c => `<span class="badge badge-active" title="Course ID: ${c.id}">${escHtml(c.title)} · Course ID: ${c.id}</span>`).join(" ") || '<span class="badge">No certificates yet</span>'}</div>
      
      <div style="width: 100%; display: flex; justify-content: center; gap: 10px; margin-top: auto; border-top: 1px solid var(--border); padding-top: 20px;">
        <button class="btn btn-secondary btn-sm admin-only" onclick="openEdit(${p.id})"><i class="fa-solid fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteParticipant(${p.id},'${escHtml(p.fullName).replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i> Delete</button>
      </div>
    </div>
    `;
  }).join("");
  
  if (!Auth.isAdmin()) {
    document.querySelectorAll(".admin-only").forEach(el => el.classList.add("hidden"));
  }
}


document.getElementById("btn-add-participant")?.addEventListener("click", () => {
  document.getElementById("participant-id").value = "";
  document.getElementById("participant-form").reset();
  document.getElementById("participant-modal-title").textContent = "Add Participant";
  document.getElementById("participant-submit-btn").innerHTML = '<i class="fa-solid fa-plus"></i> Add';
  Modal.open("participant-modal");
});

function openEdit(id) {
  const p = participants.find(x => x.id === id);
  if (!p) return;
  document.getElementById("participant-id").value = p.id;
  document.getElementById("participant-name").value = p.fullName;
  document.getElementById("participant-email").value = p.email;
  document.getElementById("participant-modal-title").textContent = "Edit Participant";
  document.getElementById("participant-submit-btn").innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save';
  Modal.open("participant-modal");
}

document.getElementById("participant-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("participant-id").value;
  const name = document.getElementById("participant-name").value.trim();
  const email = document.getElementById("participant-email").value.trim();
  if (!name || !email) return Toast.error("Full name and email are required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Toast.error("Please enter a valid email address.");
  // Backend allows duplicates, so guard here. Email is the identity field (names can repeat).
  try { participants = await ParticipantsAPI.getAll(); } catch (err) { return Toast.error(err.message); }
  if (participants.some(p => p.email.trim().toLowerCase() === email.toLowerCase() && String(p.id) !== String(id))) return Toast.error("Participant already exists.");
  
  const btn = document.getElementById("participant-submit-btn");
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner spinner-sm"></div>';
  
  try {
    if (id) await ParticipantsAPI.update(id, { fullName: name, email });
    else await ParticipantsAPI.create({ fullName: name, email });
    Toast.success(id ? "Participant updated successfully." : "Participant created successfully.");
    Modal.close("participant-modal");
    loadParticipants();
  } catch (err) { Toast.error(err.message); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save'; }
});

function deleteParticipant(id, name) {
  Modal.confirm({
    title: "Delete Participant?",
    message: "Delete <strong>" + escHtml(name) + "</strong>? Certificates will also be deleted.",
    confirmText: "Delete",
    onConfirm: async () => {
      try {
        await ParticipantsAPI.delete(id);
        Toast.success("Participant deleted successfully.");
        loadParticipants();
      } catch (err) { Toast.error(err.message); }
    }
  });
}

loadParticipants();

function buildCourseFilter() {
  let sel = document.getElementById("course-filter");
  if (!sel) {
    sel = document.createElement("select");
    sel.id = "course-filter"; sel.className = "form-control"; sel.style.maxWidth = "260px";
    sel.setAttribute("aria-label", "Filter by course");
    document.querySelector(".toolbar")?.appendChild(sel);
    sel.addEventListener("change", applyFilters);
  }
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Courses</option>' + courseList.map(c => `<option value="${c.id}">${escHtml(c.title)} (Course ID: ${c.id})</option>`).join("");
  sel.value = cur;
}
function applyFilters() {
  const q = (document.getElementById("search-input")?.value || "").trim().toLowerCase();
  const cid = document.getElementById("course-filter")?.value || "";
  renderParticipants(participants.filter(p =>
    (!q || ((p.fullName||'')+' '+(p.email||'')).toLowerCase().includes(q)) &&
    (!cid || (memberOf[p.id] || []).some(c => String(c.id) === cid))));
}
document.getElementById("search-input")?.addEventListener("input", applyFilters);
