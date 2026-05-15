// inventory.alerts.jsx — Low Stock Alerts, backend API backed (SQLite persistent)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Btn } from "@/components/PageHelpers";
import { stockApi } from "@/lib/api";
import { AlertTriangle, ShoppingCart, RefreshCw, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/inventory/alerts")({
  head: () => ({ meta: [{ title: "Low Stock Alerts — BrushPack" }] }),
  component: Page,
});

// Supplier lookup for known items
const SUPPLIERS = {
  "Cardboard Boxes - Small":      { supplier: "PackKraft Industries", eta: "2 days" },
  "Blister Cards - 18mm":         { supplier: "ClearPlast Co.",       eta: "3 days" },
  "Sealing Tape - 48mm":          { supplier: "AdhesivePro",          eta: "1 day"  },
};

function enrich(item) {
  const s = SUPPLIERS[item.name] ?? { supplier: "TBD", eta: "Pending" };
  return { ...item, ...s };
}

function Page() {
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [reordered, setReordered] = useState([]);
  const [toast, setToast]         = useState("");

  useEffect(() => {
    stockApi.getAll()
      .then((items) => setAlerts(items.filter((i) => i.qty < i.min).map(enrich)))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const markReordered = (id) => {
    setReordered((p) => [...p, id]);
    showToast("✓ Marked as reordered.");
  };

  const refresh = () => {
    setLoading(true);
    stockApi.getAll()
      .then((items) => setAlerts(items.filter((i) => i.qty < i.min).map(enrich)))
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  const pending   = alerts.filter((a) => !reordered.includes(a.id));
  const done      = alerts.filter((a) =>  reordered.includes(a.id));

  return (
    <DashboardLayout
      title="Low Stock Alerts"
      subtitle="Items that have fallen below minimum threshold and require reordering."
    >
      {/* Toast */}
      {toast && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-10 text-center">
          <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="font-medium text-foreground">All stock levels are OK</p>
          <p className="text-sm text-muted-foreground mt-1">No items are below their minimum threshold.</p>
          <div className="mt-4">
            <Link to="/inventory/stock">
              <Btn variant="ghost">View Inventory</Btn>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-destructive">{pending.length}</span> item{pending.length !== 1 ? "s" : ""} need reordering
            </p>
            <Btn variant="ghost" onClick={refresh}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Btn>
          </div>

          {/* Pending alerts */}
          {pending.length > 0 && (
            <Section title="Action Required">
              <div className="space-y-3">
                {pending.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                      <div>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.qty} {a.unit} remaining · Min: {a.min} {a.unit} · Supplier: {a.supplier} · ETA: {a.eta}
                        </div>
                      </div>
                    </div>
                    <Btn variant="ghost" onClick={() => markReordered(a.id)}>
                      <ShoppingCart className="h-4 w-4" /> Mark Reordered
                    </Btn>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div className="mt-4">
              <Section title="Reordered">
                <div className="space-y-2">
                  {done.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-muted-foreground">
                      <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span className="text-sm">{a.name} — reorder placed</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
