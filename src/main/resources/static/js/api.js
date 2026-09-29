/* CertVerify — central API utility (Fetch). Backend is the single source of truth. */
const API_BASE_URL = "";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function friendlyError(status, data) {
  const raw = data && typeof data === "object" ? data.message : (typeof data === "string" ? data : "");
  const safe = raw && raw.length < 160 && !/exception|org\.|java\.|at com\.|<html/i.test(raw);
  if (/already in REVOKED/i.test(raw || "")) return "This certificate is already revoked.";
  if (status === 400 && safe) return raw;
  if (status === 401) return "Your session is not authorised. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return safe ? raw : "The requested item was not found.";
  if (status === 409) return safe ? raw : "This item conflicts with existing data.";
  if (status >= 500) return safe ? raw : "The server ran into a problem. Please try again.";
  return safe ? raw : "Something went wrong. Please try again.";
}

async function request(method, path, body) {
  const opts = { method, headers: { "Accept": "application/json" } };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(API_BASE_URL + path, opts);
  } catch (err) {
    console.error("[api] network error", method, path, err);
    throw new ApiError("Cannot reach the server. Make sure the backend is running.", 0, null);
  }
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    console.error("[api] " + res.status + " " + method + " " + path, data);
    throw new ApiError(friendlyError(res.status, data), res.status, data);
  }
  return data;
}

const api = {
  get:    (path)       => request("GET", path),
  post:   (path, body) => request("POST", path, body),
  put:    (path, body) => request("PUT", path, body),
  patch:  (path, body) => request("PATCH", path, body),
  delete: (path)       => request("DELETE", path),
  /* Disable a button + show spinner while an async action runs. */
  async withLoading(btn, fn) {
    if (!btn) return fn();
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner spinner-sm"></div>';
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
  }
};

const CoursesAPI = {
  getAll:  ()         => api.get("/courses"),
  getById: (id)       => api.get(`/courses/${id}`),
  create:  (body)     => api.post("/courses", body),
  update:  (id, body) => api.put(`/courses/${id}`, body),
  delete:  (id)       => api.delete(`/courses/${id}`)
};

const ParticipantsAPI = {
  getAll:  ()         => api.get("/participants"),
  getById: (id)       => api.get(`/participants/${id}`),
  create:  (body)     => api.post("/participants", body),
  update:  (id, body) => api.put(`/participants/${id}`, body),
  delete:  (id)       => api.delete(`/participants/${id}`)
};

const CertificatesAPI = {
  getAll: ()               => api.get("/certificates"),
  issue:  (body)           => api.post("/certificates/issue", body),
  revoke: (certId, reason) => api.patch(`/certificates/revoke/${encodeURIComponent(certId)}?reason=${encodeURIComponent(reason)}`),
  delete: (certId)         => api.delete(`/certificates/${encodeURIComponent(certId)}`),
  stats:  (courseId)       => api.get(`/certificates/stats/${courseId}`)
};

const PublicAPI = {
  verify: (code) => api.get(`/public/verify/${encodeURIComponent(code)}`)
};
