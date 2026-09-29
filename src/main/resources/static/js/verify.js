document.addEventListener("DOMContentLoaded", () => {
  if (Auth.isLoggedIn()) {
    const btn = document.getElementById("btn-dashboard-link");
    btn.href = "dashboard.html";
    btn.textContent = "Dashboard";
  }
  const code = new URLSearchParams(window.location.search).get("code");
  if (code) { document.getElementById("verify-code").value = code; verifyCode(code); }
});

document.getElementById("verify-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("verify-code").value.trim();
  if (!code) return Toast.error("Please enter a verification code.");
  verifyCode(code);
});

function showInvalid(title, icon, msg) {
  document.getElementById("invalid-title").innerHTML = `<i class="fa-solid ${icon}"></i> ${title}`;
  document.getElementById("invalid-msg").textContent = msg;
  document.getElementById("res-invalid").classList.add("active");
}

let currentCert = null;
function showCert(d, status, reason) {
  currentCert = { name: d.participantName, course: d.courseTitle, certificateId: d.certificateId, verificationCode: d.verificationCode,
    issuedAt: d.issuedAt, status, revocationReason: reason };
  document.getElementById("cert-preview").innerHTML = CertView.render(currentCert);
  document.getElementById("cert-area").classList.remove("hidden");
}
document.getElementById("print-cert-btn").addEventListener("click", () => { if (currentCert) CertView.print(currentCert); });

async function verifyCode(code) {
  const btn = document.getElementById("verify-btn");
  const line = document.getElementById("scanner-line");
  const vCard = document.getElementById("res-valid");
  const iCard = document.getElementById("res-invalid");
  vCard.classList.remove("active");
  iCard.classList.remove("active");
  document.getElementById("cert-area").classList.add("hidden");
  currentCert = null;
  btn.disabled = true;
  btn.innerHTML = "Verifying...";
  line.style.display = "block";
  try {
    const res = await PublicAPI.verify(code);
    const d = res.details || {};
    if (res.valid) {
      document.getElementById("res-msg").textContent = res.message || "Certificate is authentic and active.";
      document.getElementById("res-name").textContent = d.participantName || "N/A";
      document.getElementById("res-course").textContent = d.courseTitle || "N/A";
      document.getElementById("res-id").textContent = d.certificateId || "N/A";
      document.getElementById("res-date").textContent = fmtDate(d.issuedAt);
      vCard.classList.add("active");
      showCert(d, "ACTIVE");
    } else if (res.revocationReason || res.details) {
      // Backend: revoked certificates come back as status INVALID with details + revocationReason
      showInvalid("Certificate Revoked", "fa-ban",
        `This certificate (${d.certificateId || code}) has been revoked. Reason: ${res.revocationReason || "not provided"}.`);
      showCert(d, "REVOKED", res.revocationReason);
    } else if (/no certificate found/i.test(res.message || "")) {
      showInvalid("Certificate Not Found", "fa-magnifying-glass", "No certificate matches this verification code. Check the code and try again.");
    } else {
      showInvalid("Certificate Invalid", "fa-triangle-exclamation", res.message || "This verification code is not valid.");
    }
  } catch (err) {
    showInvalid("Verification Unavailable", "fa-plug-circle-xmark", err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-search"></i> Verify Certificate';
    line.style.display = "none";
  }
}
