// contractor.workers.add.jsx — saves to backend API (persistent SQLite storage)
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Field, inputCls, Btn } from "@/components/PageHelpers";
import { workerApi } from "@/lib/api";

export const Route = createFileRoute("/contractor/workers/add")({
  component: Page,
});

const ROLES = ["Packer", "Sorter", "QC Inspector", "Loader", "Helper"];

function Page() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ emp_id: "", name: "", role: "Packer", rate: 80 });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.emp_id.trim()) { setError("Employee ID is required."); return; }
    if (!form.name.trim())   { setError("Name is required."); return; }
    if (Number(form.rate) <= 0) { setError("Rate must be greater than 0."); return; }

    setSaving(true);
    try {
      await workerApi.create({
        emp_id:  form.emp_id.trim().toUpperCase(),
        name:    form.name.trim(),
        role:    form.role,
        rate:    Number(form.rate),
        hours:   0,
        present: false,
      });
      navigate({ to: "/contractor/daily" });
    } catch (err) {
      if (err.message?.includes("already exists") || err.message?.includes("409")) {
        setError(`Employee ID "${form.emp_id.trim().toUpperCase()}" already exists. Use a different ID.`);
      } else {
        setError(err.message || "Something went wrong. Is the backend running?");
      }
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="Add New Worker" subtitle="Register a new daily wage worker.">
      <div className="max-w-lg">
        <Section title="Worker Details">
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Employee ID">
              <input
                required
                className={inputCls}
                placeholder="e.g. EMP007"
                value={form.emp_id}
                onChange={set("emp_id")}
              />
            </Field>
            <Field label="Full Name">
              <input
                required
                className={inputCls}
                placeholder="Full Name"
                value={form.name}
                onChange={set("name")}
              />
            </Field>
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={set("role")}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Daily Rate / hr (₹)">
              <input
                required
                type="number"
                min="1"
                className={inputCls}
                placeholder="80"
                value={form.rate}
                onChange={set("rate")}
              />
            </Field>
            <div className="pt-3 flex flex-wrap gap-3">
              <Btn type="button" variant="ghost" onClick={() => navigate({ to: "/contractor/daily" })}>
                Cancel
              </Btn>
              <Btn type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save Worker"}
              </Btn>
            </div>
          </form>
        </Section>
      </div>
    </DashboardLayout>
  );
}
