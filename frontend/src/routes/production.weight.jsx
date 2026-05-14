// production.weight.jsx — Dispatch Tracking, manual-entry only, localStorage-backed
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat, Field, inputCls, Btn, Pill } from "@/components/PageHelpers";
import { batchStore, DISPATCH_STATUSES } from "@/lib/store";
import { PackageCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/production/weight")({
  head: () => ({ meta: [{ title: "Dispatch Tracking — BrushPack" }] }),
  component: Page,
});

const EMPTY = { batchNo: "", product: "", input: "", output: "", dispatchStatus: "Pending" };

// Pill tone per dispatch status
function dispatchTone(s) {
  if (s === "Dispatched")  return "success";
  if (s === "In Transit")  return "info";
  if (s === "Cancelled")   return "danger";
  return "warn"; // Pending
}

function Page() {
  const [rows,   setRows]   = useState(() => batchStore.getAll());
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const inN  = parseFloat(form.input)  || 0;
  const outN = parseFloat(form.output) || 0;
  const remaining = Math.max(0, inN - outN);

  const totalReceived = rows.reduce((s, r) => s + (r.input  || 0), 0);
  const totalPacked   = rows.reduce((s, r) => s + (r.output || 0), 0);
  const totalPending  = totalReceived - totalPacked;

  // ── Save new batch entry ──────────────────────────────────────
  const saveEntry = () => {
    if (!form.batchNo.trim()) { alert("Batch number is required."); return; }
    if (!form.product.trim()) { alert("Product / pack type is required."); return; }
    if (!form.input)          { alert("Tips Received is required."); return; }
    if (!form.output)         { alert("Packed Units is required."); return; }
    if (outN > inN)           { alert("Packed units cannot exceed received units."); return; }

    setSaving(true);
    const entry = batchStore.add({
      batch:          form.batchNo.trim(),
      product:        form.product.trim(),
      input:          inN,
      output:         outN,
      dispatchStatus: form.dispatchStatus,
    });
    setRows(batchStore.getAll());
    setForm(EMPTY);
    setSaving(false);
    showToast(`Batch ${entry.batch} saved.`);
  };

  // ── Inline status update ──────────────────────────────────────
  const updateStatus = (id, newStatus) => {
    setRows(batchStore.update(id, { dispatchStatus: newStatus }));
    showToast(`Status updated to "${newStatus}".`);
  };

  const deleteRow = (id) => {
    if (!confirm("Delete this batch entry?")) return;
    setRows(batchStore.remove(id));
    showToast("Batch entry deleted.");
  };

  const resetForm = () => setForm(EMPTY);

  return (
    <DashboardLayout
      title="Dispatch Tracking"
      subtitle="Track received tips, packed units and dispatch status per order — enter real data only."
    >
      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label="Tips Received"  value={`${totalReceived.toLocaleString()} units`} hint={`${rows.length} batches`} />
        <Stat label="Packed"         value={`${totalPacked.toLocaleString()} units`}   hint="Sealed & labelled" />
        <Stat label="Remaining"      value={`${totalPending.toLocaleString()} units`}  hint="Pending across batches" />
      </div>

      {/* ── Add batch form ── */}
      <Section title="Add Batch Entry">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <Field label="Batch No.">
            <input
              className={inputCls}
              placeholder="PK-2382"
              value={form.batchNo}
              onChange={(e) => setForm({ ...form, batchNo: e.target.value })}
            />
          </Field>
          <Field label="Product / Pack Type">
            <input
              className={inputCls}
              placeholder="Round Tip 12mm — Cardboard"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            />
          </Field>
          <Field label="Tips Received (units)">
            <input
              type="number" min="0"
              className={inputCls}
              placeholder="0"
              value={form.input}
              onChange={(e) => setForm({ ...form, input: e.target.value })}
            />
          </Field>
          <Field label="Packed Units">
            <input
              type="number" min="0"
              className={inputCls}
              placeholder="0"
              value={form.output}
              onChange={(e) => setForm({ ...form, output: e.target.value })}
            />
          </Field>
          <Field label="Dispatch Status">
            <select
              className={inputCls + " bg-card"}
              value={form.dispatchStatus}
              onChange={(e) => setForm({ ...form, dispatchStatus: e.target.value })}
            >
              {DISPATCH_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="rounded-lg bg-secondary/60 border border-border px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">Remaining in this batch: </span>
            <span className="font-display text-base">{remaining.toLocaleString()} units</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant="ghost" onClick={resetForm}>Reset</Btn>
            <Btn onClick={saveEntry} disabled={saving}>
              <PackageCheck className="h-4 w-4" />
              {saving ? "Saving…" : "Save Entry"}
            </Btn>
          </div>
        </div>
      </Section>

      <div className="h-5 sm:h-6" />

      {/* ── Recent Patches table ── */}
      <Section title="Recent Patches">
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Batch</th>
                <th className="px-4 sm:px-6 py-3">Product / Pack</th>
                <th className="px-4 sm:px-6 py-3">Date</th>
                <th className="px-4 sm:px-6 py-3">Received</th>
                <th className="px-4 sm:px-6 py-3">Packed</th>
                <th className="px-4 sm:px-6 py-3">Remaining</th>
                <th className="px-4 sm:px-6 py-3">Dispatch Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rem = (r.input || 0) - (r.output || 0);
                const ds  = r.dispatchStatus || "Pending";
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                    <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">{r.batch}</td>
                    <td className="px-4 sm:px-6 py-3 text-muted-foreground max-w-[180px] truncate">{r.product}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-muted-foreground text-xs">
                      {r.date || "—"}
                    </td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{(r.input  || 0).toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{(r.output || 0).toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{rem.toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex flex-col gap-1.5">
                        {/* Inline status update dropdown */}
                        <select
                          value={ds}
                          onChange={(e) => updateStatus(r.id, e.target.value)}
                          className="rounded-lg border border-border bg-card text-xs px-2 py-1.5 outline-none focus:ring-2 focus:ring-ring/40 transition cursor-pointer"
                          style={{ minWidth: "112px" }}
                        >
                          {DISPATCH_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <Pill tone={dispatchTone(ds)}>{ds}</Pill>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-right">
                      <button
                        onClick={() => deleteRow(r.id)}
                        className="text-muted-foreground hover:text-destructive transition p-1"
                        title="Delete batch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    No batches yet — add a real entry above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <div className="mt-3 px-1 text-xs text-muted-foreground">
            Use the dropdown in the <strong>Dispatch Status</strong> column to update a batch status instantly.
          </div>
        )}
      </Section>
    </DashboardLayout>
  );
}
