/**
 * store.js — Central localStorage data store for BrushPack
 * All pages read/write through this module. No backend calls.
 * Data persists across page navigations and browser reloads.
 */

// ── Storage keys ───────────────────────────────────────────────
// Version prefix bumped to "bp3_" — all old "bp2_" data is abandoned and
// the app starts completely fresh on next load.
const K = {
  contractors: "bp3_contractors",
  workers:     "bp3_workers",
  stock:       "bp3_stock",
  batches:     "bp3_batches",
  billing:     "bp3_billing",
  deadlines:   "bp3_deadlines",
  users:       "bp3_users",
};

// ── Seed data — all empty so only real manually-entered data is stored ─────
const SEEDS = {
  contractors: [],
  workers:     [],
  stock:       [],
  batches:     [],
  billing:     [],
  deadlines:   [],
};

// ── SSR / browser guard ────────────────────────────────────────
// localStorage does not exist during server-side rendering (TanStack Start / SSR).
// All reads return null on the server; writes are silently skipped.
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// ── Helpers ────────────────────────────────────────────────────
function read(key) {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key, data) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ── Generic get (seeds once, never duplicates) ─────────────────
function getAll(key) {
  const stored = read(K[key]);
  if (stored !== null) return stored;
  // First visit — write seed and return it
  write(K[key], SEEDS[key]);
  return SEEDS[key];
}

function setAll(key, data) {
  write(K[key], data);
}

// ── CSV export helper ───────────────────────────────────────────
export function exportCSV(filename, headers, rows) {
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Contractors ────────────────────────────────────────────────
export const contractorStore = {
  getAll() { return getAll("contractors"); },
  save(list) { setAll("contractors", list); },
  add(data) {
    const list = this.getAll();
    const entry = { ...data, id: uid() };
    const updated = [...list, entry];
    this.save(updated);
    return entry;
  },
  markPaid(id) {
    const list = this.getAll().map((c) =>
      c.id === id ? { ...c, status: "Paid" } : c
    );
    this.save(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((c) => c.id !== id);
    this.save(list);
    return list;
  },
};

// ── Workers ────────────────────────────────────────────────────
export const workerStore = {
  getAll() { return getAll("workers"); },
  save(list) { setAll("workers", list); },
  add(data) {
    const list = this.getAll();
    if (list.some((w) => w.emp_id === data.emp_id)) {
      throw new Error("duplicate_emp_id");
    }
    const entry = { ...data, id: uid(), hours: 0, present: false };
    const updated = [...list, entry];
    this.save(updated);
    return entry;
  },
  update(id, patch) {
    const list = this.getAll().map((w) =>
      w.id === id ? { ...w, ...patch } : w
    );
    this.save(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((w) => w.id !== id);
    this.save(list);
    return list;
  },
};

// ── Stock ──────────────────────────────────────────────────────
export const stockStore = {
  getAll() { return getAll("stock"); },
  save(list) { setAll("stock", list); },
  add(data) {
    const list = this.getAll();
    const entry = { ...data, id: uid() };
    const updated = [...list, entry];
    this.save(updated);
    return entry;
  },
  updateQty(id, qty) {
    const list = this.getAll().map((i) =>
      i.id === id ? { ...i, qty } : i
    );
    this.save(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((i) => i.id !== id);
    this.save(list);
    return list;
  },
  getLowStock() {
    return this.getAll().filter((i) => i.qty < i.min);
  },
};

// -- Deadlines ---------------------------------------------------------------
export const deadlineStore = {
  getAll() { return getAll('deadlines'); },
  save(list) { setAll('deadlines', list); },
  add(data) {
    const list  = this.getAll();
    const entry = { ...data, id: uid() };
    const updated = [entry, ...list];
    this.save(updated);
    return entry;
  },
  update(id, patch) {
    const list = this.getAll().map((d) =>
      d.id === id ? { ...d, ...patch } : d
    );
    this.save(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((d) => d.id !== id);
    this.save(list);
    return list;
  },
  getOverdue() {
    return this.getAll().filter((d) => d.status === 'Overdue');
  },
  getAtRisk() {
    return this.getAll().filter((d) => d.status === 'At Risk');
  },
};

// -- Batches / Dispatch Tracking -----------------------------------------------
export const DISPATCH_STATUSES = ["Pending", "In Transit", "Dispatched", "Cancelled"];

export const batchStore = {
  getAll() { return getAll('batches'); },
  save(list) { setAll('batches', list); },
  add(data) {
    const TODAY = new Date().toISOString().slice(0, 10);
    const list  = this.getAll();
    const entry = {
      dispatchStatus: "Pending",
      date: TODAY,
      statusUpdatedAt: TODAY,
      ...data,
      id: uid(),
    };
    const updated = [entry, ...list];
    this.save(updated);
    return entry;
  },
  /** Update any fields (e.g. dispatchStatus) for an existing batch entry */
  update(id, patch) {
    const TODAY = new Date().toISOString().slice(0, 10);
    const list  = this.getAll().map((b) =>
      b.id === id
        ? { ...b, ...patch, statusUpdatedAt: TODAY }
        : b
    );
    this.save(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((b) => b.id !== id);
    this.save(list);
    return list;
  },
};

// -- Billing ------------------------------------------------------------------
export const billingStore = {
  getAll() { return getAll('billing'); },
  save(list) { setAll('billing', list); },
  add(data) {
    const list = this.getAll();
    const existing = list.find((r) => r.id === data.id);
    if (existing) {
      const updated = list.map((r) => r.id === data.id ? { ...r, ...data } : r);
      this.save(updated);
      return updated;
    }
    const updated = [data, ...list];
    this.save(updated);
    return updated;
  },
  update(id, data) {
    const list = this.getAll().map((r) =>
      r.id === id ? { ...r, ...data } : r
    );
    this.save(list);
    return list;
  },
  remove(id) {
    const list = this.getAll().filter((r) => r.id !== id);
    this.save(list);
    return list;
  },
};

// ── Users / Auth ───────────────────────────────────────────────
const USER_SEEDS = [
  { id: "u1", username: "manager", password: "brushpack2024", role: "Operations Manager" },
];

export const userStore = {
  getAll() {
    const stored = read(K.users);
    if (stored !== null) return stored;
    write(K.users, USER_SEEDS);
    return USER_SEEDS;
  },
  save(list) { write(K.users, list); },

  /** Returns user object on success, null on failure */
  authenticate(username, password) {
    const list = this.getAll();
    return list.find(
      (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
           && u.password === password
    ) || null;
  },

  /** Create a new user. Throws "username_taken" if duplicate. */
  add(username, password, role = "Operations Manager") {
    const list = this.getAll();
    if (list.some((u) => u.username.trim().toLowerCase() === username.trim().toLowerCase())) {
      throw new Error("username_taken");
    }
    const entry = { id: uid(), username: username.trim(), password, role };
    this.save([...list, entry]);
    return entry;
  },

  /** Change password. Throws "wrong_password" if currentPwd doesn't match. */
  changePassword(username, currentPwd, newPwd) {
    const list = this.getAll();
    const user = list.find(
      (u) => u.username.trim().toLowerCase() === username.trim().toLowerCase()
           && u.password === currentPwd
    );
    if (!user) throw new Error("wrong_password");
    const updated = list.map((u) =>
      u.id === user.id ? { ...u, password: newPwd } : u
    );
    this.save(updated);
    return updated;
  },
};

// ── Session helpers ─────────────────────────────────────────────
const SESSION_KEY = "bp3_session";
export const sessionStore = {
  get() {
    if (!isBrowser) return null;
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  },
  set(user) {
    if (!isBrowser) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
  },
  clear() {
    if (!isBrowser) return;
    localStorage.removeItem(SESSION_KEY);
  },
};
