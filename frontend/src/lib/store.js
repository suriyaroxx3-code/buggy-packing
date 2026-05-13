/**
 * store.js — Central localStorage data store for BrushPack
 * All pages read/write through this module. No backend calls.
 * Data persists across page navigations and browser reloads.
 */

// ── Storage keys ───────────────────────────────────────────────
const K = {
  contractors: "bp_contractors",
  workers:     "bp_workers",
  stock:       "bp_stock",
  batches:     "bp_batches",
  billing:     "bp_billing",
  deadlines:   "bp_deadlines",
  users:       "bp_users",
};

// ── Seed data (used only on first load, never duplicated) ───────
const TODAY = new Date().toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const SEEDS = {
  contractors: [
    { id: "c1", name: "Suresh Pillai", area: "Cardboard Packing",  workers: 22, amount: 68000, status: "Paid"    },
    { id: "c2", name: "Rekha Menon",   area: "Plastic Sleeve Line", workers: 18, amount: 55000, status: "Pending" },
    { id: "c3", name: "Arjun Nair",    area: "Blister Pack",        workers: 14, amount: 44000, status: "Paid"    },
    { id: "c4", name: "Divya Thomas",  area: "QC & Dispatch",       workers: 16, amount: 51000, status: "Pending" },
    { id: "c5", name: "Biju Varghese", area: "Labelling",           workers: 12, amount: 39000, status: "Paid"    },
  ],
  workers: [
    { id: "w1", emp_id: "EMP001", name: "Ravi Kumar",   role: "Packer",       hours: 8, rate: 80,  present: true  },
    { id: "w2", emp_id: "EMP002", name: "Meena Devi",   role: "Sorter",       hours: 8, rate: 70,  present: true  },
    { id: "w3", emp_id: "EMP003", name: "Arun Sinha",   role: "QC Inspector", hours: 8, rate: 100, present: true  },
    { id: "w4", emp_id: "EMP004", name: "Latha Rao",    role: "Packer",       hours: 6, rate: 80,  present: true  },
    { id: "w5", emp_id: "EMP005", name: "Vinod Pillai", role: "Loader",       hours: 0, rate: 90,  present: false },
    { id: "w6", emp_id: "EMP006", name: "Priya Nair",   role: "Helper",       hours: 8, rate: 65,  present: true  },
  ],
  stock: [
    { id: "s1", name: "Cardboard Sheets - A4",        cat: "Cardboard", qty: 4200, unit: "sheets", min: 2000 },
    { id: "s2", name: "Cardboard Boxes - Small",      cat: "Cardboard", qty: 1100, unit: "pcs",    min: 1500 },
    { id: "s3", name: "Plastic Sleeves - Clear 12mm", cat: "Plastic",   qty: 8400, unit: "pcs",    min: 3000 },
    { id: "s4", name: "Blister Cards - 18mm",         cat: "Plastic",   qty: 920,  unit: "pcs",    min: 1500 },
    { id: "s5", name: "Printed Labels (Roll)",        cat: "Supplies",  qty: 32,   unit: "rolls",  min: 20   },
    { id: "s6", name: "Sealing Tape - 48mm",          cat: "Supplies",  qty: 14,   unit: "rolls",  min: 30   },
    { id: "s7", name: "Hot Glue Sticks",              cat: "Supplies",  qty: 540,  unit: "pcs",    min: 200  },
  ],
  batches: [
    { id: "b1", batch: "PK-2381", product: "Round Tip 12mm — Cardboard",     input: 2500, output: 2480 },
    { id: "b2", batch: "PK-2380", product: "Flat Tip 18mm — Plastic Sleeve", input: 1800, output: 1792 },
    { id: "b3", batch: "PK-2379", product: "Angled Tip 10mm — Blister Pack", input: 3200, output: 3168 },
    { id: "b4", batch: "PK-2378", product: "Detail Tip 6mm — Cardboard Box", input: 1600, output: 1590 },
  ],
  billing: [],
  deadlines: [
    { id: "d1", orderId: "PK-2381", product: "Round Tip 12mm — Cardboard",     client: "BrightBrush Co.",  deadline: addDays(2),   priority: "High",   status: "On Track",  assignedTo: "Suresh Pillai",  notes: "Client requested priority packing." },
    { id: "d2", orderId: "PK-2380", product: "Flat Tip 18mm — Plastic Sleeve", client: "ArtPro Supplies",  deadline: addDays(1),   priority: "Medium", status: "At Risk",   assignedTo: "Rekha Menon",    notes: "Sleeve stock running low." },
    { id: "d3", orderId: "PK-2379", product: "Angled Tip 10mm — Blister Pack", client: "Studio Mart",      deadline: addDays(-2),  priority: "High",   status: "Overdue",   assignedTo: "Arjun Nair",     notes: "Delayed due to QC failure." },
    { id: "d4", orderId: "PK-2378", product: "Detail Tip 6mm — Cardboard Box", client: "ColorWorks",       deadline: addDays(8),   priority: "Low",    status: "On Track",  assignedTo: "Divya Thomas",   notes: "" },
    { id: "d5", orderId: "PK-2377", product: "Fan Tip 25mm — Blister Card",    client: "Maven Brushes",    deadline: addDays(-1),  priority: "Medium", status: "Completed", assignedTo: "Biju Varghese",  notes: "Dispatched successfully." },
  ],
};

// ── Helpers ────────────────────────────────────────────────────
function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(key, data) {
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

// -- Batches (production output) ----------------------------------------------
export const batchStore = {
  getAll() { return getAll('batches'); },
  save(list) { setAll('batches', list); },
  add(data) {
    const list = this.getAll();
    const entry = { ...data, id: uid() };
    const updated = [entry, ...list];
    this.save(updated);
    return entry;
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
  add(username, password, role = "Staff") {
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
const SESSION_KEY = "bp_session";
export const sessionStore = {
  get() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
  },
  set(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
  },
  clear() { localStorage.removeItem(SESSION_KEY); },
};
