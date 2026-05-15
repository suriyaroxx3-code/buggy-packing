// production.deadline.jsx — Deadline Tracking, backend API backed (SQLite persistent)
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat, Field, inputCls, Btn, Pill } from "@/components/PageHelpers";
import { deadlineApi } from "@/lib/api";
import { CalendarClock, Trash2, Pencil, X } from "lucide-react";

export const Route = createFileRoute("/production/deadline")({
  head: () => ({ meta: [{ title: "Deadline Tracking — BrushPack" }] }),
  component: Page,
});

const PRIORITIES = ["High", "Medium", "Low"];
const STATUSES   = ["On Track", "At Risk", "Overdue", "Completed"];

const EMPTY = {
  orderId:    "",
  product:    "",
  client:     "",
  deadline:   "",
  priority:   "Medium",
  status:     "On Track",
  assignedTo: "",
  notes:      "",
};

function statusTone(s) {
  if (s === "Completed") return "success";
  if (s === "Overdue")   return "danger";
  if (s === "At Risk")   return "warn";
  return "info";
}

function priorityTone(p) {
  if (p === "High")   return "danger";
  if (p === "Medium") return "warn";
  return "muted";
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

function Page() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [editId,  setEditId]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState("");
  const [filter,  setFilter]  = useState("All");

  useEffect(() => {
    deadlineApi.getAll()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const overdue   = rows.filter((r) => r.status === "Overdue").length;
  const atRisk    = rows.filter((r) => r.status === "At Risk").length;
  const onTrack   = rows.filter((r) => r.status === "On Track").length;
  const completed = rows.filter((r) => r.status === "Completed").length;

  const saveEntry = async () => {
    if (!form.orderId.trim())  { alert("Order ID is required.");    return; }
    if (!form.product.trim())  { alert("Product is required.");     return; }
    if (!form.client.trim())   { alert("Client is required.");      return; }
    if (!form.deadline)        { alert("Deadline date is required.");return; }

    setSaving(true);
    try {
      if (editId) {
        const updated = await deadlineApi.update(editId, form);
        setRows((prev) => prev.map((r) => (r.id === editId ? updated : r)));
        showToast(`✓ Deadline for ${form.orderId} updated.`);
        setEditId(null);
      } else {
        const created = await deadlineApi.create(form);
        setRows((prev) => [created, ...prev]);
        showToast(`✓ Deadline for ${form.orderId} saved.`);
      }
      setForm(EMPTY);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id) => {
    if (!confirm("Delete this deadline entry?")) return;
    try {
      await deadlineApi.delete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      showToast("Deadline entry deleted.");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const startEdit = (row) => {
    setEditId(row.id);
    setForm({
      orderId:    row.orderId    ?? "",
      product:    row.product    ?? "",
      client:     row.client     ?? "",
      deadline:   row.deadline   ?? "",
      priority:   row.priority   ?? "Medium",
      status:     row.status     ?? "On Track",
      assignedTo: row.assignedTo ?? "",
      notes:      row.notes      ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY); };

  const filterOptions = ["All", "On Track", "At Risk", "Overdue", "Completed"];
  const visible = filter === "All" ? rows : rows.filter((r) => r.status === filter);

  const selectCls = inputCls + " bg-card";

  return (
    <DashboardLayout
      title="Deadline Tracking"
      subtitle="Monitor order deadlines, priorities and delivery risk across all packing lines."
    >
      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Overdue"   value={String(overdue)}   hint="Need immediate action" />
        <Stat label="At Risk"   value={String(atRisk)}    hint="Monitor closely" />
        <Stat label="On Track"  value={String(onTrack)}   hint="Running on schedule" />
        <Stat label="Completed" value={String(completed)} hint="Dispatched" />
      </div>

      {/* Add / Edit form */}
      <Section
        title={editId ? `Edit Deadline — ${form.orderId}` : "Add Deadline"}
        action={editId ? (
          <Btn variant="ghost" onClick={cancelEdit}>
            <X className="h-4 w-4" /> Cancel Edit
          </Btn>
        ) : null}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Order ID">
            <input className={inputCls} placeholder="PK-2381" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} />
          </Field>
          <Field label="Product / Pack Type">
            <input className={inputCls} placeholder="Round Tip 12mm — Cardboard" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          </Field>
          <Field label="Client">
            <input className={inputCls} placeholder="BrightBrush Co." value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
          </Field>
          <Field label="Deadline Date">
            <input type="date" className={inputCls} value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </Field>
          <Field label="Priority">
            <select className={selectCls} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Assigned To">
            <input className={inputCls} placeholder="Contractor / supervisor name" value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} />
          </Field>
          <Field label="Notes">
            <input className={inputCls} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 sm:mt-5 flex flex-wrap gap-2 justify-end">
          {!editId && (
            <Btn variant="ghost" onClick={() => setForm(EMPTY)}>Reset</Btn>
          )}
          <Btn onClick={saveEntry} disabled={saving}>
            <CalendarClock className="h-4 w-4" />
            {saving ? "Saving…" : editId ? "Update Deadline" : "Save Deadline"}
          </Btn>
        </div>
      </Section>

      <div className="h-5 sm:h-6" />

      {/* Table */}
      <Section
        title="All Deadlines"
        action={
          <div className="flex gap-1 flex-wrap">
            {filterOptions.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition"
                style={{
                  backgroundColor: filter === f ? "#6b5ca5" : "#ffffff",
                  color: filter === f ? "#fff" : "#000000",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Order</th>
                <th className="px-4 sm:px-6 py-3">Product / Client</th>
                <th className="px-4 sm:px-6 py-3">Deadline</th>
                <th className="px-4 sm:px-6 py-3">Days Left</th>
                <th className="px-4 sm:px-6 py-3">Priority</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3">Assigned</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</td>
                </tr>
              )}
              {!loading && visible.map((r) => {
                const days = daysUntil(r.deadline);
                const daysLabel =
                  days === null ? "—"
                  : days === 0  ? "Today"
                  : days < 0   ? `${Math.abs(days)}d overdue`
                  :              `${days}d left`;
                const daysColor =
                  days === null ? "#000000"
                  : days < 0   ? "#e53e3e"
                  : days <= 2  ? "#000000"
                  :              "#38a169";
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                    <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">{r.orderId}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="font-medium truncate max-w-[180px]">{r.product}</div>
                      <div className="text-xs text-muted-foreground">{r.client}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-muted-foreground">{r.deadline || "—"}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap font-semibold" style={{ color: daysColor }}>{daysLabel}</td>
                    <td className="px-4 sm:px-6 py-3"><Pill tone={priorityTone(r.priority)}>{r.priority}</Pill></td>
                    <td className="px-4 sm:px-6 py-3"><Pill tone={statusTone(r.status)}>{r.status}</Pill></td>
                    <td className="px-4 sm:px-6 py-3 text-muted-foreground whitespace-nowrap">{r.assignedTo || "—"}</td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-primary transition p-1" title="Edit deadline">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteRow(r.id)} className="text-muted-foreground hover:text-destructive transition p-1" title="Delete deadline">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    No deadlines found. {filter !== "All" && `Try removing the "${filter}" filter.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </DashboardLayout>
  );
}
