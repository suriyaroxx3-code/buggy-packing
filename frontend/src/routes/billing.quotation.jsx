// billing.quotation.jsx — Quotations & Orders, fully static localStorage-backed
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Pill, Btn, Stat, Field, inputCls } from "@/components/PageHelpers";
import { billingStore } from "@/lib/store";
import { Plus, X, Check, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/billing/quotation")({
  head: () => ({ meta: [{ title: "Quotation & Orders — BrushPack" }] }),
  component: Page,
});

const STATUSES = ["Draft", "Sent", "Pending", "Accepted", "Received"];
const tone     = (s) => ({ Accepted: "success", Received: "success", Sent: "info", Pending: "warn", Draft: "muted" }[s] ?? "muted");

const EMPTY = { id: "", contractor: "", date: new Date().toISOString().split("T")[0], value: "", status: "Draft" };

function Page() {
  const [records, setRecords]   = useState(() => billingStore.getAll());
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode]   = useState("quotation");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEntry, setNewEntry] = useState(EMPTY);
  const [editEntry, setEditEntry] = useState(EMPTY);
  const [toast, setToast]       = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  /* Add new quotation */
  const handleAdd = () => {
    if (!newEntry.id.trim())         { alert("Order ID is required."); return; }
    if (!newEntry.contractor.trim()) { alert("Contractor name is required."); return; }

    // Check for duplicate ID
    if (records.some((r) => r.id === newEntry.id.trim())) {
      alert(`Order ID "${newEntry.id.trim()}" already exists. Use a different ID.`);
      return;
    }

    const record = {
      ...newEntry,
      id: newEntry.id.trim(),
      contractor: newEntry.contractor.trim(),
      value: Number(newEntry.value) || 0,
      type: viewMode === "billing" ? "bill" : "quote",
    };
    const updated = billingStore.add(record);
    setRecords(Array.isArray(updated) ? updated : billingStore.getAll());
    setIsAdding(false);
    setNewEntry(EMPTY);
    showToast(`✓ ${viewMode === "billing" ? "Billing" : "Quotation"} added.`);
  };

  /* Save edit */
  const handleEdit = () => {
    if (!editEntry.id.trim() || !editEntry.contractor.trim()) { alert("ID and contractor are required."); return; }
    const updated = billingStore.update(editingId, { ...editEntry, value: Number(editEntry.value) || 0 });
    setRecords(updated);
    setEditingId(null);
    setEditEntry(EMPTY);
    showToast("✓ Record updated.");
  };

  /* Delete */
  const handleDelete = (id) => {
    if (!confirm("Delete this record? This cannot be undone.")) return;
    setRecords(billingStore.remove(id));
    showToast("Record deleted.");
  };

  /* Cancel add/edit */
  const cancelAdd  = () => { setIsAdding(false); setNewEntry(EMPTY); };
  const cancelEdit = () => { setEditingId(null); setEditEntry(EMPTY); };

  const filteredRecords = records.filter((r) =>
    viewMode === "billing"
      ? r.type === "bill"
      : r.type !== "bill"
  );

  const stats = [
    { label: "Accepted", value: filteredRecords.filter((r) => r.status === "Accepted").length },
    { label: "Sent",     value: filteredRecords.filter((r) => r.status === "Sent").length     },
    { label: "Pending",  value: filteredRecords.filter((r) => r.status === "Pending").length  },
    { label: "Received", value: filteredRecords.filter((r) => r.status === "Received").length },
  ];

  const displayed = activeTab === "status"
    ? filteredRecords.filter((r) => r.status !== "Draft")
    : filteredRecords;

  return (
    <DashboardLayout
      title={viewMode === "billing" ? "Billing" : "Quotation"}
      subtitle={viewMode === "billing" ? "Manage invoices and billing records." : "Manage quotes and track order statuses."}
    >

      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Top controls */}
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground"></p>
                <h3 className="mt-3 text-lg font-semibold">Quotation</h3>
              </div>
              <Btn variant={viewMode === "quotation" ? "accent" : "ghost"} onClick={() => setViewMode("quotation")}>Quotation</Btn>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Show quotes and order tracking records.</p>
          </div>
          <div className="rounded-3xl bg-card border border-border p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground"></p>
                <h3 className="mt-3 text-lg font-semibold">Billing</h3>
              </div>
              <Btn variant={viewMode === "billing" ? "accent" : "ghost"} onClick={() => setViewMode("billing")}>Billing</Btn>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Show invoices and billing records.</p>
          </div>
      </div>

      {/* Overview cards */}
      <Section title={`${viewMode === "billing" ? "Billing" : "Quotation"} Overview`}>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => <Stat key={s.label} label={s.label} value={s.value} />)}
        </div>
      </Section>

      <div className="h-5 sm:h-6" />

      {/* Records table */}
      <Section
        title={activeTab === "status" ? "Order Tracking Status" : `All ${viewMode === "billing" ? "Billing" : "Quotations"}`}
        action={
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <Link to="/billing/create">
              <Btn variant="ghost">Create Invoice</Btn>
            </Link>
            <Btn variant="accent" onClick={() => { setIsAdding(true); cancelEdit(); }}>
              <Plus className="h-4 w-4" /> New {viewMode === "billing" ? "Billing" : "Quotation"}
            </Btn>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[620px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3 text-primary">Order ID</th>
                <th className="px-4 sm:px-6 py-3">Contractor</th>
                <th className="px-4 sm:px-6 py-3">Date</th>
                <th className="px-4 sm:px-6 py-3">Amount</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>

              {/* Add new row */}
              {isAdding && (
                <tr className="bg-secondary/20 border-b border-border">
                  <td className="px-4 sm:px-6 py-2">
                    <input className={inputCls} placeholder="Q-0106" value={newEntry.id} onChange={(e) => setNewEntry({ ...newEntry, id: e.target.value })} />
                  </td>
                  <td className="px-4 sm:px-6 py-2">
                    <input className={inputCls} placeholder="Contractor name" value={newEntry.contractor} onChange={(e) => setNewEntry({ ...newEntry, contractor: e.target.value })} />
                  </td>
                  <td className="px-4 sm:px-6 py-2">
                    <input type="date" className={inputCls} value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                  </td>
                  <td className="px-4 sm:px-6 py-2">
                    <input type="number" min="0" className={inputCls} placeholder="0" value={newEntry.value} onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })} />
                  </td>
                  <td className="px-4 sm:px-6 py-2">
                    <select className={inputCls} value={newEntry.status} onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 sm:px-6 py-2">
                    <div className="flex gap-1 justify-end">
                      <Btn onClick={handleAdd}><Check className="h-4 w-4" /> Save</Btn>
                      <Btn variant="ghost" onClick={cancelAdd}><X className="h-4 w-4" /></Btn>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {displayed.map((r) =>
                editingId === r.id ? (
                  <tr key={r.id} className="bg-secondary/20 border-b border-border">
                    <td className="px-4 sm:px-6 py-2">
                      <input className={inputCls} value={editEntry.id} onChange={(e) => setEditEntry({ ...editEntry, id: e.target.value })} />
                    </td>
                    <td className="px-4 sm:px-6 py-2">
                      <input className={inputCls} value={editEntry.contractor} onChange={(e) => setEditEntry({ ...editEntry, contractor: e.target.value })} />
                    </td>
                    <td className="px-4 sm:px-6 py-2">
                      <input type="date" className={inputCls} value={editEntry.date} onChange={(e) => setEditEntry({ ...editEntry, date: e.target.value })} />
                    </td>
                    <td className="px-4 sm:px-6 py-2">
                      <input type="number" min="0" className={inputCls} value={editEntry.value} onChange={(e) => setEditEntry({ ...editEntry, value: e.target.value })} />
                    </td>
                    <td className="px-4 sm:px-6 py-2">
                      <select className={inputCls} value={editEntry.status} onChange={(e) => setEditEntry({ ...editEntry, status: e.target.value })}>
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 sm:px-6 py-2">
                      <div className="flex gap-1 justify-end">
                        <Btn onClick={handleEdit}><Check className="h-4 w-4" /> Save</Btn>
                        <Btn variant="ghost" onClick={cancelEdit}><X className="h-4 w-4" /></Btn>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                    <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">{r.id}</td>
                    <td className="px-4 sm:px-6 py-3">{r.contractor}</td>
                    <td className="px-4 sm:px-6 py-3 text-muted-foreground whitespace-nowrap">{r.date}</td>
                    <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">
                      ₹{Number(r.value).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <Pill tone={tone(r.status)}>{r.status}</Pill>
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => { setEditingId(r.id); setEditEntry({ ...r }); cancelAdd(); }}
                          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {displayed.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    {`No records yet. Click "New ${viewMode === "billing" ? "Billing" : "Quotation"}" to add one.`}
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
