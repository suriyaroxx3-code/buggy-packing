/**
 * api.js — HTTP client for the BrushPack FastAPI backend (http://localhost:8000)
 * All functions are async and return the parsed JSON response.
 * This replaces the localStorage-only store.js for persistent server-side storage.
 */

const BASE = "http://localhost:8000/api";

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined && body !== null) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
  return data;
}

// ── Contractors ───────────────────────────────────────────────────────────────
export const contractorApi = {
  getAll: ()           => req("GET",    "/contractors"),
  create: (data)       => req("POST",   "/contractors", data),
  update: (id, data)   => req("PUT",    `/contractors/${id}`, data),
  markPaid: (id)       => req("PATCH",  `/contractors/${id}/status?status_value=Paid`),
  delete:  (id)        => req("DELETE", `/contractors/${id}`),
};

// ── Workers ───────────────────────────────────────────────────────────────────
export const workerApi = {
  getAll: ()           => req("GET",    "/workers"),
  create: (data)       => req("POST",   "/workers", data),
  update: (id, data)   => req("PUT",    `/workers/${id}`, data),
  delete: (id)         => req("DELETE", `/workers/${id}`),
};

// ── Stock / Inventory ─────────────────────────────────────────────────────────
export const stockApi = {
  getAll: ()           => req("GET",    "/stock"),
  create: (data)       => req("POST",   "/stock", data),
  update: (id, data)   => req("PUT",    `/stock/${id}`, data),
  delete: (id)         => req("DELETE", `/stock/${id}`),
};

// ── Production Batches ────────────────────────────────────────────────────────
export const batchApi = {
  getAll: ()           => req("GET",    "/batches"),
  create: (data)       => req("POST",   "/batches", data),
  update: (id, data)   => req("PUT",    `/batches/${id}`, data),
  delete: (id)         => req("DELETE", `/batches/${id}`),
};

// ── Billing & Quotations ──────────────────────────────────────────────────────
export const billingApi = {
  getAll: ()           => req("GET",    "/billing"),
  create: (data)       => req("POST",   "/billing", data),
  update: (id, data)   => req("PUT",    `/billing/${id}`, data),
  delete: (id)         => req("DELETE", `/billing/${id}`),
};

// ── Deadlines ─────────────────────────────────────────────────────────────────
// Backend uses snake_case (order_id, assigned_to); UI form uses camelCase.
// These helpers normalise both directions.
function deadlineToApi(form) {
  return {
    order_id:    form.orderId    ?? form.order_id    ?? "",
    product:     form.product    ?? "",
    client:      form.client     ?? "",
    deadline:    form.deadline   ?? "",
    priority:    form.priority   ?? "Medium",
    status:      form.status     ?? "On Track",
    assigned_to: form.assignedTo ?? form.assigned_to ?? "",
    notes:       form.notes      ?? "",
  };
}
function deadlineFromApi(row) {
  return {
    ...row,
    orderId:    row.order_id    ?? "",
    assignedTo: row.assigned_to ?? "",
  };
}

export const deadlineApi = {
  getAll:  ()           => req("GET",    "/deadlines").then((list) => list.map(deadlineFromApi)),
  create:  (form)       => req("POST",   "/deadlines", deadlineToApi(form)).then(deadlineFromApi),
  update:  (id, form)   => req("PUT",    `/deadlines/${id}`, deadlineToApi(form)).then(deadlineFromApi),
  delete:  (id)         => req("DELETE", `/deadlines/${id}`),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:  (username, password) =>
    req("POST", "/auth/login",  { username, password }),
  register: (username, password, role) =>
    req("POST", "/auth/register", { username, password, role }),
  changePassword: (username, current_password, new_password) =>
    req("POST", "/auth/change-password", { username, current_password, new_password }),
};

// ── Session (still localStorage — session token only, not data) ───────────────
const SESSION_KEY = "bp3_session";
export const sessionStore = {
  get()  {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  },
  set(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
  },
  clear() { localStorage.removeItem(SESSION_KEY); },
};
