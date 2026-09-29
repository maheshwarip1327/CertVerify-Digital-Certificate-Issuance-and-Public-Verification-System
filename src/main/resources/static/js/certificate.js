/* CertVerify — certificate renderer + print. Depends on escHtml() from common.js when present. */
const CertView = (() => {
  const esc = (s) => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const fmt = (v) => {
    if (!v) return "-";
    const d = Array.isArray(v) ? new Date(v[0], v[1]-1, v[2], v[3]||0, v[4]||0, v[5]||0) : new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  };
  let sealN = 0;
  const seal = () => { const id = 'sealg' + (++sealN); return SEAL_TPL.replace(/sealg/g, id); };
  const SEAL_TPL = '<svg class="cert-seal" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="sealg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e08a"/><stop offset=".55" stop-color="#c9a13b"/><stop offset="1" stop-color="#8a6416"/></linearGradient></defs>'
    + '<circle cx="50" cy="50" r="47" fill="none" stroke="url(#sealg)" stroke-width="3" stroke-dasharray="2.2 2.2"/><circle cx="50" cy="50" r="42" fill="url(#sealg)"/><circle cx="50" cy="50" r="35" fill="none" stroke="#fff7d6" stroke-width="1.5"/>'
    + '<path d="M50 24l16 6v13c0 12-7 21-16 26-9-5-16-14-16-26V30z" fill="#0b1a3a"/><path d="M42 46l6 6 11-12" fill="none" stroke="#f6e08a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z" fill="#0b1a3a"/><path d="M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="#f6e08a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* d: { name, course, certificateId, verificationCode, issuedAt, status, revocationReason } */
  function render(d) {
    const revoked = d.status === "REVOKED";
    const url = location.origin + "/verify.html?code=" + encodeURIComponent(d.verificationCode || "");
    return `<div class="cert-frame"><div class="cert"><div class="cert-outer"><div class="cert-inner">
      <div class="cert-head"><div class="cert-brand">${LOGO}CertVerify</div>
        <div class="cert-status ${revoked ? "is-revoked" : ""}">${revoked ? "Revoked" : "Active"}</div></div>
      <div class="cert-main">
        <div class="cert-title">Certificate of Completion</div>
        <div class="cert-line">This is to certify that</div>
        <div class="cert-name">${esc(d.name || "Recipient")}</div>
        <div class="cert-line">has successfully completed the course</div>
        <div class="cert-course">${esc(d.course || "Course")}</div>
        ${revoked ? `<div class="cert-revoked-note">This credential was revoked${d.revocationReason ? ": " + esc(d.revocationReason) : ""}.</div>` : ""}
      </div>
      <div class="cert-foot">
        <div class="cert-meta">Certificate ID: <b>${esc(d.certificateId)}</b><br/>Verification code: <b>${esc(d.verificationCode)}</b><br/>Date of issue: <b>${esc(fmt(d.issuedAt))}</b><br/>Status: <b>${revoked ? "REVOKED" : "ACTIVE"}</b></div>
        ${seal()}
        <div class="cert-sign"><div class="sig-line"></div><strong>Authorised Signatory</strong>CertVerify Credential Authority</div>
      </div>
      <div class="cert-verify">Verify this credential online: ${esc(url)}</div>
    </div></div></div></div></div>`;
  }

  /* Copies a clean certificate into #print-root (a direct child of <body>) and opens the browser print dialog.
     print.css hides every other body child while body.printing is set. */
  function print(d) {
    let root = document.getElementById("print-root");
    if (!root) { root = document.createElement("div"); root.id = "print-root"; document.body.appendChild(root); }
    root.innerHTML = render(d);
    document.body.classList.add("printing");
    const done = () => { document.body.classList.remove("printing"); root.innerHTML = ""; window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    const go = () => setTimeout(() => window.print(), 60);
    (document.fonts && document.fonts.ready) ? document.fonts.ready.then(go) : go();
  }
  return { render, print };
})();
