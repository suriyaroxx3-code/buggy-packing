// contractor.daily.jsx — Daily Workers Salary, backend API backed (SQLite persistent)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat, Field, inputCls, Btn, Pill } from "@/components/PageHelpers";
import { workerApi } from "@/lib/api";
import { exportCSV } from "@/lib/store";
import { UserPlus, Download, Trash2, Search } from "lucide-react";

export const Route = createFileRoute("/contractor/daily")({
  head: () => ({ meta: [{ title: "Daily Workers Salary — BrushPack" }] }),
  component: Page,
});

const EMPTY = { id: "", emp_id: "", name: "", role: "", hours: 8, rate: 0 };

function Page() {
  const [workers, setWorkers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [quickEntry, setQuickEntry] = useState(EMPTY);
  const [toast, setToast]           = useState("");

  useEffect(() => {
    workerApi.getAll()
      .then(setWorkers)
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  /* Select employee from dropdown */
  const handleSelect = (empId) => {
    const w = workers.find((w) => w.emp_id === empId);
    if (w) {
      setQuickEntry({ id: w.id, emp_id: w.emp_id, name: w.name, role: w.role, hours: 8, rate: w.rate });
    } else {
      setQuickEntry(EMPTY);
    }
  };

  /* Mark Present and save */
  const handleMarkPresent = async () => {
    if (!quickEntry.id) { alert("Please select an Employee ID first."); return; }
    const worker = workers.find((w) => w.id === quickEntry.id);
    if (!worker) return;
    try {
      const updated = await workerApi.update(quickEntry.id, {
        ...worker,
        hours:   Number(quickEntry.hours),
        rate:    Number(quickEntry.rate),
        present: true,
      });
      setWorkers((prev) => prev.map((w) => (w.id === quickEntry.id ? updated : w)));
      setQuickEntry(EMPTY);
      showToast("✓ Attendance saved successfully.");
    } catch (err) {
      alert("Failed to save: " + err.message);
    }
  };

  /* Toggle present/absent from table row */
  const togglePresent = async (id, currentPresent) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;
    try {
      const updated = await workerApi.update(id, {
        ...worker,
        present: !currentPresent,
        hours: !currentPresent ? 8 : 0,
      });
      setWorkers((prev) => prev.map((w) => (w.id === id ? updated : w)));
      showToast(!currentPresent ? "✓ Marked Present." : "✓ Marked Absent.");
    } catch (err) {
      alert("Failed to update: " + err.message);
    }
  };

  /* Edit hours directly in table */
  const handleHoursChange = async (id, hours) => {
    const worker = workers.find((w) => w.id === id);
    if (!worker) return;
    const newHours = Math.max(0, Number(hours));
    // Optimistic update
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, hours: newHours } : w)));
    try {
      const updated = await workerApi.update(id, { ...worker, hours: newHours });
      setWorkers((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err) {
      // Revert optimistic update
      setWorkers((prev) => prev.map((w) => (w.id === id ? worker : w)));
      alert("Failed to update hours: " + err.message);
    }
  };

  /* Delete worker */
  const handleDelete = async (id) => {
    if (!confirm("Delete this worker record permanently?")) return;
    try {
      await workerApi.delete(id);
      setWorkers((prev) => prev.filter((w) => w.id !== id));
      showToast("Worker removed.");
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  /* Export */
  const handleExport = () => {
    exportCSV("daily_workers.csv", ["emp_id", "name", "role", "hours", "rate", "present"],
      workers.map((w) => ({ ...w, present: w.present ? "Present" : "Absent" }))
    );
  };

  const filtered = workers.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.emp_id.toLowerCase().includes(search.toLowerCase()) ||
      w.role.toLowerCase().includes(search.toLowerCase()),
  );

  const presentCount = workers.filter((w) => w.present).length;
  const totalWage    = workers.filter((w) => w.present).reduce((s, w) => s + w.hours * w.rate, 0);

  return (
    <DashboardLayout title="Daily Workers Salary" subtitle="Attendance tracking and daily wage calculation.">

      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label="Workers Present"  value={`${presentCount} / ${workers.length}`}   hint="Today" />
        <Stat label="Total Daily Wage" value={`₹${totalWage.toLocaleString("en-IN")}`} hint="Present workers" />
        <Stat label="Absent"           value={`${workers.length - presentCount}`}       hint="Not clocked in" />
      </div>

      {/* Quick Attendance Entry */}
      <Section title="Quick Attendance Entry">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Field label="Employee ID">
            <select
              className={inputCls}
              value={quickEntry.emp_id}
              onChange={(e) => handleSelect(e.target.value)}
            >
              <option value="">Select ID…</option>
              {workers.map((w) => (
                <option key={w.id} value={w.emp_id}>{w.emp_id} — {w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Name">
            <input readOnly className={inputCls + " bg-secondary/40"} value={quickEntry.name} placeholder="Auto-filled" />
          </Field>
          <Field label="Role">
            <input readOnly className={inputCls + " bg-secondary/40"} value={quickEntry.role} placeholder="Auto-filled" />
          </Field>
          <Field label="Hours Worked">
            <input
              type="number" min="0" max="12" step="0.5"
              className={inputCls}
              value={quickEntry.hours}
              onChange={(e) => setQuickEntry({ ...quickEntry, hours: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <Btn onClick={handleMarkPresent} disabled={!quickEntry.id}>
            <UserPlus className="h-4 w-4" /> Mark Present &amp; Save
          </Btn>
          <Link to="/contractor/workers/add">
            <Btn variant="accent"><UserPlus className="h-4 w-4" /> Add New Worker</Btn>
          </Link>
        </div>
      </Section>

      <div className="h-5 sm:h-6" />

      {/* Search + Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="Search workers…"
            className={`${inputCls} pl-9 w-full sm:w-64`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Btn variant="ghost" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export CSV
        </Btn>
      </div>

      {/* Workers Table */}
      <Section title="Workers">
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[660px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Emp ID</th>
                <th className="px-4 sm:px-6 py-3">Name</th>
                <th className="px-4 sm:px-6 py-3">Role</th>
                <th className="px-4 sm:px-6 py-3">Hours</th>
                <th className="px-4 sm:px-6 py-3">Rate / hr</th>
                <th className="px-4 sm:px-6 py-3">Total</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map((w) => (
                <tr key={w.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                  <td className="px-4 sm:px-6 py-3 font-medium text-xs text-muted-foreground">{w.emp_id}</td>
                  <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">{w.name}</td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground whitespace-nowrap">{w.role}</td>
                  <td className="px-4 sm:px-6 py-3">
                    <input
                      type="number" min="0" max="12" step="0.5"
                      className={inputCls + " w-20"}
                      value={w.hours}
                      onChange={(e) => handleHoursChange(w.id, e.target.value)}
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-3">₹{w.rate}</td>
                  <td className="px-4 sm:px-6 py-3 font-medium">₹{(w.hours * w.rate).toLocaleString("en-IN")}</td>
                  <td className="px-4 sm:px-6 py-3">
                    <Pill tone={w.present ? "success" : "warn"}>{w.present ? "Present" : "Absent"}</Pill>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex gap-1 justify-end items-center">
                      <button
                        onClick={() => togglePresent(w.id, w.present)}
                        className={`text-xs px-2 py-1 rounded border transition ${
                          w.present
                            ? "border-border hover:bg-secondary text-muted-foreground"
                            : "border-primary/30 hover:bg-primary/10 text-primary"
                        }`}
                      >
                        {w.present ? "Mark Absent" : "Mark Present"}
                      </button>
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No workers found.
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
