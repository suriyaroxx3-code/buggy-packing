// production.weight.jsx — Dispatch Tracking, fully static localStorage-backed
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat, Field, inputCls, Btn, Pill } from "@/components/PageHelpers";
import { batchStore } from "@/lib/store";
import { Plus, PackageCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/production/weight")({
  head: () => ({ meta: [{ title: "Dispatch Tracking — BrushPack" }] }),
  component: Page,
});

const EMPTY = { batchNo: "", product: "", input: "", output: "" };

function Page() {
  const [rows, setRows]   = useState(() => batchStore.getAll());
  const [form, setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const inN  = parseFloat(form.input)  || 0;
  const outN = parseFloat(form.output) || 0;
  const remaining = Math.max(0, inN - outN);

  const totalReceived = rows.reduce((s, r) => s + r.input,  0);
  const totalPacked   = rows.reduce((s, r) => s + r.output, 0);
  const totalPending  = totalReceived - totalPacked;

  const saveEntry = () => {
    if (!form.batchNo.trim()) { alert("Batch number is required."); return; }
    if (!form.product.trim()) { alert("Product / pack type is required."); return; }
    if (!form.input)          { alert("Tips Received is required."); return; }
    if (!form.output)         { alert("Packed Units is required."); return; }
    if (outN > inN)           { alert("Packed units cannot exceed received units."); return; }

    setSaving(true);
    const entry = batchStore.add({
      batch:   form.batchNo.trim(),
      product: form.product.trim(),
      input:   inN,
      output:  outN,
    });
    setRows(batchStore.getAll());
    setForm(EMPTY);
    setSaving(false);
    showToast(`✓ Batch ${entry.batch} saved.`);
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
      subtitle="Track received tips, packed units and dispatched batches per order."
    >
      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label="Tips Received Today"  value={`${totalReceived.toLocaleString()} units`} hint={`${rows.length} batches`} />
        <Stat label="Packed Today"         value={`${totalPacked.toLocaleString()} units`}   hint="Sealed & labelled" />
        <Stat label="Remaining"            value={`${totalPending.toLocaleString()} units`}  hint="Pending across batches" />
      </div>

      {/* Add batch form */}
      <Section title="Add Batch Output">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Batches table */}
      <Section title="Recent Batches">
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Batch</th>
                <th className="px-4 sm:px-6 py-3">Product / Pack</th>
                <th className="px-4 sm:px-6 py-3">Received</th>
                <th className="px-4 sm:px-6 py-3">Packed</th>
                <th className="px-4 sm:px-6 py-3">Remaining</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rem = r.input - r.output;
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                    <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">{r.batch}</td>
                    <td className="px-4 sm:px-6 py-3 text-muted-foreground">{r.product}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{r.input.toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{r.output.toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{rem.toLocaleString()}</td>
                    <td className="px-4 sm:px-6 py-3">
                      <Pill tone={rem === 0 ? "success" : "warn"}>
                        {rem === 0 ? "Completed" : "Pending"}
                      </Pill>
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
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No batches yet. Add one above.
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
