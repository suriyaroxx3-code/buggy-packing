// index.jsx — Dashboard (converted from TSX to JSX)
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
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
      { to: "/contractor/salary", label: "Contractor Salary",  icon: UserCog },
      { to: "/contractor/daily",  label: "Daily Workers Salary", icon: Users  },
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
      { to: "/inventory/stock",  label: "Stock",            icon: Boxes        },
      { to: "/inventory/alerts", label: "Low Stock Alerts", icon: AlertTriangle },
    ],
  },
];

const trend = [
  { d: "Mon", v: 8200  },
  { d: "Tue", v: 9450  },
  { d: "Wed", v: 8800  },
  { d: "Thu", v: 10200 },
  { d: "Fri", v: 11100 },
  { d: "Sat", v: 9700  },
  { d: "Sun", v: 5200  },
];

function Dashboard() {
  return (
    <DashboardLayout
      title="Good morning, Manager"
      subtitle="Here's what's moving through the packing floor today."
    >
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: "Units Packed Today", value: "11,100", trend: "+9.2%",         tone: "text-emerald-600" },
          { label: "Workers Present",    value: "92 / 96", trend: "+4 vs yesterday", tone: "text-emerald-600" },
          { label: "Pending Bills",      value: "₹3.8L",   trend: "7 invoices",    tone: "text-muted-foreground" },
          { label: "Low Stock Items",    value: "4",        trend: "Reorder soon",  tone: "text-accent" },
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
        <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft hover-lift">
          <div className="flex items-start justify-between mb-3 gap-2">
            <div>
              <h3 className="font-display text-base sm:text-lg">Weekly Packing Output</h3>
              <p className="text-xs text-muted-foreground">Brush tip units packed</p>
            </div>
            <Link to="/production/weekly-report" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
              View report <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="h-36 sm:h-40">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#0d7377" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0d7377" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.012 260)", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="#0d7377" strokeWidth={2.5} fill="url(#g1)" animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6 shadow-soft hover-lift">
          <h3 className="font-display text-base sm:text-lg mb-4">Recent Activity</h3>
          <ul className="space-y-3 sm:space-y-4">
            {[
              ["Order PK-2381 — 2,400 units packed",       "12 min ago", "bg-primary"    ],
              ["Salary processed for 22 daily workers",    "1 hr ago",   "bg-accent"     ],
              ["Quotation Q-104 sent to BrightBrush Co.",  "3 hr ago",   "bg-primary"    ],
              ["Cardboard sleeves — running low",          "Today",      "bg-destructive"],
            ].map(([t, w, c], i) => (
              <li key={t} style={{ animationDelay: `${i * 90}ms` }} className="animate-fade-in flex gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${c} animate-pulse shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground leading-tight">{t}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{w}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
