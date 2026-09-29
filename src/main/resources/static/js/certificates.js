initLayout("certificates", { adminOnly: true });

let allCerts = [];

function currentFilter() {
  const status = document.getElementById("filter-status")?.value || "";
  const q = (document.getElementById("search-input")?.value || "").trim().toLowerCase();
  return allCerts.filter(c =>
    (!status || c.status === status) &&
    (!q || [c.certificateId, c.verificationCode, c.participant?.fullName, c.course?.title].join(" ").toLowerCase().includes(q)));
}

async function loadCertificates() {
  const grid = document.getElementById("data-grid");
  grid.innerHTML = '<div class="spinner" style="margin:40px auto;grid-column:1/-1"></div>';
  try {
    allCerts = await loadCertificatesWithRelations();
    renderCerts(currentFilter());
    const v = new URLSearchParams(location.search).get("view");
    if (v) { openView(v); history.replaceState(null, "", "certificates.html"); }
  } catch (err) {
    errorState(grid, err.message, loadCertificates);
    Toast.error(err.message);
  }
}

const toCertData = (c) => ({ name: c.participant?.fullName, course: c.course?.title, certificateId: c.certificateId,
  verificationCode: c.verificationCode, issuedAt: c.issuedAt, status: c.status, revocationReason: c.revocationReason });

function renderCerts(list) {
  const grid = document.getElementById("data-grid");
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fa-solid fa-certificate"></i></div><h3>No certificates found</h3><p>Issued certificates will appear here.</p></div>`;
    return;
  }
  grid.innerHTML = `<table class="data-table"><thead><tr><th>Certificate ID</th><th>Participant</th><th>Course</th><th>Status</th><th>Issued</th><th>Verification code</th><th>Actions</th></tr></thead><tbody>` +
    list.map(c => {
      const id = escHtml(c.certificateId);
      return `<tr>
        <td class="mono">${id}</td>
        <td>${escHtml(c.participant?.fullName || "—")}</td>
        <td>${escHtml(c.course?.title || "—")}<div class="sub">Course ID: ${c.course?.id ?? "—"}</div></td>
        <td>${statusBadge(c.status)}</td>
        <td style="white-space:nowrap;color:var(--text-sec)">${fmtDate(c.issuedAt)}</td>
        <td class="mono">${escHtml(c.verificationCode)}</td>
        <td><div class="row-actions">
          <button class="btn btn-secondary btn-sm" data-act="view" data-id="${id}"><i class="fa-solid fa-eye"></i> View</button>
          <button class="btn btn-secondary btn-sm" data-act="print" data-id="${id}"><i class="fa-solid fa-print"></i> Print</button>
          ${c.status === "ACTIVE" ? `<button class="btn btn-danger btn-sm" data-act="revoke" data-id="${id}"><i class="fa-solid fa-ban"></i> Revoke</button>` : ""}
          <button class="btn btn-danger btn-sm" data-act="delete" data-id="${id}"><i class="fa-solid fa-trash"></i> Delete</button>
        </div></td></tr>`;
    }).join("") + "</tbody></table>";
}

document.getElementById("data-grid").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.dataset.id;
  if (btn.dataset.act === "view") openView(id);
  else if (btn.dataset.act === "print") { const c = allCerts.find(x => x.certificateId === id); if (c) CertView.print(toCertData(c)); }
  else if (btn.dataset.act === "revoke") openRevoke(id);
  else if (btn.dataset.act === "delete") deleteCert(id);
});

function openView(certId) {
  const c = allCerts.find(x => x.certificateId === certId);
  if (!c) return Toast.error("Certificate not found.");
  document.getElementById("view-body").innerHTML = `<div class="cert-viewer">
    <div class="cert-actions">
      <a class="btn btn-secondary" href="verify.html?code=${encodeURIComponent(c.verificationCode)}"><i class="fa-solid fa-magnifying-glass"></i> Verify</a>
      <button class="btn btn-primary" id="view-print-btn" type="button"><i class="fa-solid fa-print"></i> Print Certificate</button>
    </div>
    ${CertView.render(toCertData(c))}
    <div class="cert-facts">
      <div>Status<strong>${c.status}</strong></div>
      <div>Course ID<strong>${c.course?.id ?? "—"}</strong></div>
      ${c.status === "REVOKED" ? `<div>Revoked<strong>${fmtDate(c.revokedAt)} — ${escHtml(c.revocationReason || "No reason provided")}</strong></div>` : ""}
    </div></div>`;
  document.getElementById("view-print-btn").onclick = () => CertView.print(toCertData(c));
  Modal.open("view-modal");
}

function openRevoke(certId) {
  document.getElementById("revoke-cert-id").value = certId;
  document.getElementById("revoke-reason").value = "";
  Modal.open("revoke-modal");
}

document.getElementById("revoke-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const certId = document.getElementById("revoke-cert-id").value;
  const reason = document.getElementById("revoke-reason").value.trim();
  if (!reason) return Toast.error("Please enter a reason for revocation.");
  await api.withLoading(document.getElementById("revoke-submit-btn"), async () => {
    try {
      await CertificatesAPI.revoke(certId, reason);
      Toast.success("Certificate revoked successfully.");
      Modal.close("revoke-modal");
      await loadCertificates();
    } catch (err) { Toast.error(err.message); }
  });
});

function deleteCert(certId) {
  Modal.confirm({
    title: "Delete Certificate?",
    message: "Permanently delete <strong>" + escHtml(certId) + "</strong>? This cannot be undone.",
    confirmText: "Delete",
    onConfirm: async () => {
      try {
        await CertificatesAPI.delete(certId);
        Toast.success("Certificate deleted successfully.");
        loadCertificates();
      } catch (err) { Toast.error(err.message); }
    }
  });
}

document.getElementById("filter-status")?.addEventListener("change", () => renderCerts(currentFilter()));
document.getElementById("search-input")?.addEventListener("input", () => renderCerts(currentFilter()));
loadCertificates();
