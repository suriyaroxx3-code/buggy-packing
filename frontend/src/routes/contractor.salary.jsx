// contractor.salary.jsx — backend API backed (SQLite persistent storage)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat, Pill, Btn, inputCls } from "@/components/PageHelpers";
import { contractorApi } from "@/lib/api";
import { exportCSV } from "@/lib/store";
import { Download, Plus, Search, Trash2 } from "lucide-react";

export const Route = createFileRoute("/contractor/salary")({
  head: () => ({ meta: [{ title: "Contractor Salary — BrushPack" }] }),
  component: Page,
});

function Page() {
  const [rows, setRows]     = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contractorApi.getAll()
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const markPaid = async (id) => {
    try {
      const updated = await contractorApi.markPaid(id);
      setRows((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const removeRow = async (id) => {
    if (!confirm("Remove this contractor?")) return;
    try {
      await contractorApi.delete(id);
      setRows((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleExport = () => {
    exportCSV(
      "contractors.csv",
      ["name", "area", "workers", "amount", "status"],
      rows,
    );
  };

  const filtered = rows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.area.toLowerCase().includes(search.toLowerCase()),
  );

  const total   = rows.reduce((s, r) => s + r.amount, 0);
  const paid    = rows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.amount, 0);
  const pending = total - paid;

  return (
    <DashboardLayout
      title="Contractor Salary"
      subtitle="Monthly payouts to area contractors managing the packing lines."
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <Stat label="Total Payable" value={`₹${total.toLocaleString("en-IN")}`}   hint="May 2026" />
        <Stat label="Paid"          value={`₹${paid.toLocaleString("en-IN")}`}    hint={`${rows.filter((r) => r.status === "Paid").length} contractors`} />
        <Stat label="Pending"       value={`₹${pending.toLocaleString("en-IN")}`} hint={`${rows.filter((r) => r.status === "Pending").length} contractors`} />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contractor or area…"
            className={`${inputCls} pl-9 w-full sm:w-72`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link to="/contractor/add">
          <Btn variant="accent"><Plus className="h-4 w-4" /> Add Contractor</Btn>
        </Link>
      </div>

      {/* Table */}
      <Section
        title="Contractors"
        action={
          <Btn variant="ghost" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export CSV
          </Btn>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Contractor</th>
                <th className="px-4 sm:px-6 py-3">Line / Area</th>
                <th className="px-4 sm:px-6 py-3">Workers</th>
                <th className="px-4 sm:px-6 py-3">Amount</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-warm grid place-items-center text-accent-foreground text-xs font-medium shrink-0">
                        {r.name[0]}
                      </div>
                      <span className="font-medium truncate">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground whitespace-nowrap">{r.area}</td>
                  <td className="px-4 sm:px-6 py-3">{r.workers}</td>
                  <td className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">
                    ₹{r.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <Pill tone={r.status === "Paid" ? "success" : "warn"}>{r.status}</Pill>
                  </td>
                  <td className="px-4 sm:px-6 py-3">
                    <div className="flex gap-1 justify-end items-center">
                      {r.status !== "Paid" && (
                        <Btn variant="ghost" className="text-xs" onClick={() => markPaid(r.id)}>
                          Mark Paid
                        </Btn>
                      )}
                      <button
                        onClick={() => removeRow(r.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No contractors found.
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
