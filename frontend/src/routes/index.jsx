// index.jsx — Dashboard, backend API backed (SQLite persistent)
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { batchApi, workerApi, billingApi, stockApi } from "@/lib/api";
import {
  PackageCheck, Activity, LineChart, UserCog, Users,
  ReceiptText, FileText, Boxes, AlertTriangle, ArrowUpRight, TrendingUp,
  CalendarClock,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — BrushPack" },
      { name: "description", content: "Overview of packing production, workforce, billing and materials." },
    ],
  }),
  component: Dashboard,
});

const modules = [
  {
    title: "Packing Production",
    desc: "Dispatch, line status, reports & deadlines",
    accent: "bg-hero",
    items: [
      { to: "/production/weight",        label: "Dispatch Tracking",  icon: PackageCheck  },
      { to: "/production/status",        label: "Order Status",       icon: Activity      },
      { to: "/production/weekly-report", label: "Reports",            icon: LineChart     },
      { to: "/production/deadline",      label: "Deadline Tracking",  icon: CalendarClock },
    ],
  },
  {
    title: "Workforce",
    desc: "Contractors and daily workers",
    accent: "bg-warm",
    items: [
      { to: "/contractor/salary", label: "Contractor Salary",    icon: UserCog },
      { to: "/contractor/daily",  label: "Daily Workers Salary", icon: Users   },
    ],
  },
  {
    title: "Billing & Accounts",
    desc: "Invoices and quotations",
    accent: "bg-hero",
    items: [
      { to: "/billing/create",    label: "Create Billing", icon: ReceiptText },
      { to: "/billing/quotation", label: "Quotation",      icon: FileText    },
    ],
  },
  {
    title: "Materials & Inventory",
    desc: "Cardboard, plastic & supplies",
    accent: "bg-warm",
    items: [
      { to: "/inventory/stock",  label: "Stock",            icon: Boxes         },
      { to: "/inventory/alerts", label: "Low Stock Alerts", icon: AlertTriangle },
    ],
  },
];

function buildWeeklyTrend(batches) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayLabel = days[d.getDay()];
    const total = batches
      .filter((b) => b.date === dateStr)
      .reduce((sum, b) => sum + (Number(b.output) || 0), 0);
    result.push({ d: dayLabel, v: total });
  }
  return result;
}

function computeKPIs(batches, workers, bills, stock) {
  const TODAY = new Date().toISOString().slice(0, 10);
  const unitsPackedToday = batches
    .filter((b) => b.date === TODAY)
    .reduce((sum, b) => sum + (Number(b.output) || 0), 0);
  const presentCount  = workers.filter((w) => w.present).length;
  const totalWorkers  = workers.length;
  const pendingBills  = bills.filter((b) => b.status === "Pending");
  const pendingBillValue = pendingBills.reduce((sum, b) => sum + (Number(b.value) || 0), 0);
  const lowStockItems = stock.filter((s) => s.qty < s.min);
  return { unitsPackedToday, presentCount, totalWorkers, pendingBills, pendingBillValue, lowStockItems };
}

function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [kpis,   setKpis]    = useState({ unitsPackedToday: 0, presentCount: 0, totalWorkers: 0, pendingBills: [], pendingBillValue: 0, lowStockItems: [] });
  const [trend,  setTrend]   = useState([]);

  const refreshAll = useCallback(async () => {
    try {
      const [batches, workers, bills, stock] = await Promise.all([
        batchApi.getAll(),
        workerApi.getAll(),
        billingApi.getAll(),
        stockApi.getAll(),
      ]);
      setKpis(computeKPIs(batches, workers, bills, stock));
      setTrend(buildWeeklyTrend(batches));
    } catch {
      // silently fail — backend may not be running
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    refreshAll();
    const interval = setInterval(refreshAll, 30_000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const {
    unitsPackedToday, presentCount, totalWorkers,
    pendingBills, pendingBillValue, lowStockItems,
  } = kpis;
  const lowStockCount = lowStockItems.length;

  return (
    <DashboardLayout
      title="Good morning, Manager"
      subtitle="Here's what's moving through the packing floor today."
      lowStockItems={lowStockItems}
    >
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          {
            label: "Units Packed Today",
            value: unitsPackedToday.toLocaleString("en-IN"),
            trend: unitsPackedToday > 0 ? "Live data" : "No entries today",
            tone:  unitsPackedToday > 0 ? "text-emerald-600" : "text-muted-foreground",
          },
          {
            label: "Workers Present",
            value: totalWorkers > 0 ? `${presentCount} / ${totalWorkers}` : "—",
            trend: presentCount > 0 ? `${presentCount} present` : "Mark attendance",
            tone:  presentCount > 0 ? "text-emerald-600" : "text-muted-foreground",
          },
          {
            label: "Pending Bills",
            value: `₹${pendingBillValue.toLocaleString("en-IN")}`,
            trend: `${pendingBills.length} invoice${pendingBills.length !== 1 ? "s" : ""}`,
            tone:  pendingBills.length > 0 ? "text-orange-500" : "text-muted-foreground",
          },
          {
            label: "Low Stock Items",
            value: String(lowStockCount),
            trend: lowStockCount > 0 ? "Reorder soon" : "Stock OK",
            tone:  lowStockCount > 0 ? "text-accent" : "text-emerald-600",
          },
        ].map((k, i) => (
          <div
            key={k.label}
            style={{ animationDelay: `${i * 80}ms` }}
            className="animate-fade-in rounded-2xl bg-card border border-border p-4 sm:p-5 shadow-soft hover-lift relative overflow-hidden group"
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 group-hover:bg-primary/10 transition" />
            <div className="text-xs sm:text-sm text-muted-foreground leading-tight">{k.label}</div>
            <div className="mt-2 flex items-baseline justify-between gap-1 flex-wrap">
              <div className="font-display text-2xl sm:text-3xl text-foreground">{k.value}</div>
              <div className={`text-xs font-medium ${k.tone} flex items-center gap-1`}>
                <TrendingUp className="h-3 w-3" />
                <span className="hidden sm:inline">{k.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modules ── */}
      <div className="mb-3 sm:mb-4">
        <h2 className="font-display text-xl sm:text-2xl">Modules</h2>
        <p className="text-sm text-muted-foreground">Everything you need to run the packing floor.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-10">
        {modules.map((m, i) => (
          <div
            key={m.title}
            style={{ animationDelay: `${i * 100}ms` }}
            className="animate-fade-in rounded-2xl bg-card border border-border overflow-hidden shadow-soft hover-lift group"
          >
            <div className={`${m.accent} h-1.5 w-full`} />
            <div className="p-4 sm:p-6">
              <h3 className="font-display text-lg sm:text-xl text-foreground">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{m.desc}</p>
              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                {m.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      className="flex items-center gap-3 rounded-xl border border-border bg-secondary/40 px-3 sm:px-4 py-2.5 sm:py-3 text-sm hover:bg-secondary hover:border-ring/40 hover:translate-x-0.5 transition"
                    >
                      <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-card border border-border grid place-items-center">
                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </span>
                      <span className="flex-1 text-foreground truncate">{it.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Chart + Activity ── */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Weekly chart */}
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft hover-lift">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <h3 className="font-display text-base sm:text-lg">Weekly Packing Output</h3>
              <p className="text-xs text-muted-foreground">Units packed per day — updates as you log dispatches</p>
            </div>
            <Link to="/production/weekly-report" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
              View report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-36 sm:h-40">
            {mounted ? (
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#6b5ca5" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#6b5ca5" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="v" stroke="#6b5ca5" strokeWidth={2.5} fill="url(#g1)" animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-lg bg-secondary/30 animate-pulse" />
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft hover-lift">
          <h3 className="font-display text-base sm:text-lg mb-4">Recent Activity</h3>
          <div className="flex flex-col items-center justify-center h-28 text-center gap-2">
            <div className="h-9 w-9 rounded-full bg-secondary grid place-items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No activity yet.</p>
            <p className="text-xs text-muted-foreground">Activity will appear as you enter data.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
