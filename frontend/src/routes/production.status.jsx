// production.status.jsx — Order Status, driven by real dispatch tracking data (backend API)
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Pill } from "@/components/PageHelpers";
import { batchApi } from "@/lib/api";

export const Route = createFileRoute("/production/status")({
  head: () => ({ meta: [{ title: "Order Status — BrushPack" }] }),
  component: Page,
});

const STAGES = ["Receiving", "Sorting", "Packing", "Sealing", "QC", "Dispatch"];

function stageFromDispatch(ds) {
  if (ds === "Dispatched")  return 5;
  if (ds === "In Transit")  return 4;
  if (ds === "Cancelled")   return 0;
  return 2;
}

function stagePillTone(stageIdx) {
  if (stageIdx >= 5) return "success";
  if (stageIdx >= 3) return "info";
  return "warn";
}

function Page() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    batchApi.getAll()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const stageCounts = STAGES.map((_, i) =>
    orders.filter((o) => stageFromDispatch(o.dispatchStatus || "Pending") === i).length
  );

  return (
    <DashboardLayout
      title="Order Status"
      subtitle="Live pipeline progress of every packing order — reflects Dispatch Tracking data."
    >
      {loading ? (
        <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-10 text-center text-muted-foreground text-sm">
          No orders yet. Add batch entries in{" "}
          <a href="/production/weight" className="text-primary underline underline-offset-2">
            Dispatch Tracking
          </a>{" "}
          to see them here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {orders.map((o, i) => {
            const stage = stageFromDispatch(o.dispatchStatus || "Pending");
            return (
              <div
                key={o.id}
                style={{ animationDelay: `${i * 70}ms` }}
                className="animate-fade-in rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft hover-lift"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-base font-semibold">{o.batch}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{o.product}</div>
                  </div>
                  <Pill tone={stagePillTone(stage)}>{STAGES[stage]}</Pill>
                </div>

                {/* Pipeline progress */}
                <div className="mt-4">
                  <div className="flex gap-1">
                    {STAGES.map((s, si) => (
                      <div
                        key={s}
                        className={`flex-1 h-1.5 rounded-full transition ${
                          si <= stage ? "bg-primary" : "bg-secondary"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>{STAGES[0]}</span>
                    <span>{STAGES[STAGES.length - 1]}</span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Received: </span>
                    <span className="font-medium">{(o.input || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Packed: </span>
                    <span className="font-medium">{(o.output || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date: </span>
                    <span className="font-medium">{o.date || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status: </span>
                    <span className="font-medium">{o.dispatchStatus || "Pending"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floor summary */}
      {!loading && orders.length > 0 && (
        <Section title="Floor Summary" className="mt-6">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {STAGES.map((s, i) => (
              <div key={s} className="rounded-xl bg-secondary/40 border border-border p-3 text-center">
                <div className="font-display text-xl">{stageCounts[i]}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </DashboardLayout>
  );
}
