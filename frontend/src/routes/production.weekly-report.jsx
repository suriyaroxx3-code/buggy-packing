// production.weekly-report.jsx — Combined Weekly + Monthly Reports
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat } from "@/components/PageHelpers";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/production/weekly-report")({
  head: () => ({ meta: [{ title: "Reports — BrushPack" }] }),
  component: Page,
});

/* ── Weekly data (Mon–Sun) ── */
const weeklyData = [
  { d: "Mon", received: 8400,  packed: 8200  },
  { d: "Tue", received: 9600,  packed: 9450  },
  { d: "Wed", received: 8950,  packed: 8800  },
  { d: "Thu", received: 10400, packed: 10200 },
  { d: "Fri", received: 11300, packed: 11100 },
  { d: "Sat", received: 9900,  packed: 9700  },
  { d: "Sun", received: 5400,  packed: 5200  },
];

const weeklyEfficiency = weeklyData.map((x) => ({
  d: x.d,
  e: +(100 * x.packed / x.received).toFixed(1),
}));

/* ── Monthly data (Week 1–4 + full-month totals by type) ── */
const monthlyData = [
  { d: "Wk 1", received: 58200,  packed: 57100  },
  { d: "Wk 2", received: 63950,  packed: 62650  },
  { d: "Wk 3", received: 61400,  packed: 60200  },
  { d: "Wk 4", received: 67800,  packed: 66500  },
];

const monthlyEfficiency = monthlyData.map((x) => ({
  d: x.d,
  e: +(100 * x.packed / x.received).toFixed(1),
}));

const monthlyProductMix = [
  { name: "Round Tip 12mm",  units: 52400 },
  { name: "Flat Tip 18mm",   units: 38600 },
  { name: "Angled Tip 10mm", units: 47200 },
  { name: "Detail Tip 6mm",  units: 31200 },
  { name: "Fan Tip 25mm",    units: 22050 },
];

/* ── Tab button ── */
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        borderRadius: "10px",
        border: "none",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        fontSize: "14px",
        backgroundColor: active ? "#6b5ca5" : "transparent",
        color: active ? "#ffffff" : "#000000",
        transition: "all 0.2s ease",
      }}
    >
      {label}
    </button>
  );
}

function Page() {
  const [tab, setTab] = useState("weekly");
  const isWeekly = tab === "weekly";

  // Charts use ResizeObserver which only exists in the browser — never render on server
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /* ── Weekly KPIs ── */
  const weeklyStats = [
    { label: "Tips Received",    value: "63,950",  hint: "This week" },
    { label: "Units Packed",     value: "62,650",  hint: "98.0% yield" },
    { label: "Avg. Efficiency",  value: "98.0%",   hint: "+0.4% vs last week" },
  ];

  /* ── Monthly KPIs ── */
  const totalReceived = monthlyData.reduce((s, r) => s + r.received, 0);
  const totalPacked   = monthlyData.reduce((s, r) => s + r.packed, 0);
  const avgEff        = +(100 * totalPacked / totalReceived).toFixed(1);
  const monthlyStats  = [
    { label: "Total Tips Received",  value: totalReceived.toLocaleString(), hint: "May 2026" },
    { label: "Total Units Packed",   value: totalPacked.toLocaleString(),   hint: `${avgEff}% yield` },
    { label: "Avg. Monthly Eff.",    value: `${avgEff}%`,                   hint: "+1.2% vs Apr" },
  ];

  const stats   = isWeekly ? weeklyStats   : monthlyStats;
  const barData = isWeekly ? weeklyData    : monthlyData;
  const lineData= isWeekly ? weeklyEfficiency : monthlyEfficiency;

  return (
    <DashboardLayout
      title="Reports"
      subtitle="Packing trends, line efficiency and dispatch summaries — weekly & monthly."
    >
      {/* Tab switcher */}
      <div
        className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ backgroundColor: "#ffffff", border: "1px solid #6b5ca5" }}
      >
        <Tab label="Weekly Report"  active={isWeekly}  onClick={() => setTab("weekly")}  />
        <Tab label="Monthly Report" active={!isWeekly} onClick={() => setTab("monthly")} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {stats.map((s) => (
          <Stat key={s.label} label={s.label} value={s.value} hint={s.hint} />
        ))}
      </div>

      {/* Received vs Packed */}
      <Section title={isWeekly ? "Daily Received vs Packed (units)" : "Weekly Received vs Packed (units)"}>
        <div className="h-56 sm:h-72">
          {mounted ? (
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="received" name="Received" fill="#6b5ca5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="packed"   name="Packed"   fill="#000000" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-lg bg-secondary/30 animate-pulse" />
          )}
        </div>
      </Section>

      <div className="h-5 sm:h-6" />

      {/* Efficiency */}
      <Section title={isWeekly ? "Daily Efficiency (%)" : "Weekly Efficiency (%)"}>
        <div className="h-48 sm:h-64">
          {mounted ? (
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis domain={[95, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="e"
                  name="Efficiency %"
                  stroke="#6b5ca5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#000000" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full rounded-lg bg-secondary/30 animate-pulse" />
          )}
        </div>
      </Section>

      {/* Monthly only: Product Mix */}
      {!isWeekly && (
        <>
          <div className="h-5 sm:h-6" />
          <Section title="Monthly Product Mix (units packed)">
            <div className="h-48 sm:h-64">
              {mounted ? (
                <ResponsiveContainer>
                  <BarChart
                    data={monthlyProductMix}
                    layout="vertical"
                    margin={{ top: 5, right: 16, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#ffffff" strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="units" name="Units" fill="#6b5ca5" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full rounded-lg bg-secondary/30 animate-pulse" />
              )}
            </div>
          </Section>
        </>
      )}
    </DashboardLayout>
  );
}

