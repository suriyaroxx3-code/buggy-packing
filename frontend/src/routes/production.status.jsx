// production.status.jsx — Order Status, driven by real dispatch tracking data
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Pill } from "@/components/PageHelpers";
import { batchStore } from "@/lib/store";

export const Route = createFileRoute("/production/status")({
  head: () => ({ meta: [{ title: "Order Status — BrushPack" }] }),
  component: Page,
});

const STAGES = ["Receiving", "Sorting", "Packing", "Sealing", "QC", "Dispatch"];

/** Map a dispatch status string to a pipeline stage index (0–5) */
function stageFromDispatch(ds) {
  if (ds === "Dispatched")  return 5;
  if (ds === "In Transit")  return 4;
  if (ds === "Cancelled")   return 0;
  return 2; // Pending — show at Packing stage
}

function stagePillTone(stageIdx) {
  if (stageIdx >= 5) return "success";
  if (stageIdx >= 3) return "info";
  return "warn";
}

function Page() {
  const [orders] = useState(() => batchStore.getAll());

  // Count per stage for Floor Summary
  const stageCounts = STAGES.map((_, i) =>
    orders.filter((o) => stageFromDispatch(o.dispatchStatus || "Pending") === i).length
  );

  return (
    <DashboardLayout
      title="Order Status"
      subtitle="Live pipeline progress of every packing order — reflects Dispatch Tracking data."
    >
      {orders.length === 0 ? (
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
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{o.batch}</div>
                    <div className="font-display text-base sm:text-lg mt-0.5 truncate">{o.product}</div>
                    <div className="text-sm text-muted-foreground">
                      {(o.input || 0).toLocaleString()} received · {(o.output || 0).toLocaleString()} packed
                    </div>
                  </div>
                  <Pill tone={stagePillTone(stage)}>{STAGES[stage]}</Pill>
                </div>

                {/* Progress bar */}
                <div className="mt-4 sm:mt-5">
                  <div className="flex items-center gap-1">
                    {STAGES.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          idx <= stage ? "bg-primary" : "bg-secondary"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] sm:text-[11px] text-muted-foreground overflow-hidden">
                    {STAGES.map((s) => (
                      <span key={s} className="truncate">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
