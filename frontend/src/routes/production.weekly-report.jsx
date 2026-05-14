// production.weekly-report.jsx — Reports powered by Dispatch Tracking data
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat } from "@/components/PageHelpers";
import { batchStore } from "@/lib/store";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/production/weekly-report")({
  head: () => ({ meta: [{ title: "Reports — BrushPack" }] }),
  component: Page,
});

/* ── Get current week start date (Monday) ── */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/* ── Get current month start ── */
function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/* ── Build weekly data from batches (Mon-Sun) ── */
function buildWeeklyData(batches) {
  const weekStart = getWeekStart();
  const weekData = {};
  
  // Initialize each day of the week
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  days.forEach((d, i) => {
    weekData[d] = { d, received: 0, packed: 0 };
  });

  // Aggregate batches by day of week
  batches.forEach((b) => {
    const batchDate = new Date(b.date);
    const dayIndex = (batchDate.getDay() + 6) % 7; // Convert to Monday=0
    if (dayIndex >= 0 && dayIndex < 7) {
      const dayName = days[dayIndex];
      weekData[dayName].received += b.input || 0;
      weekData[dayName].packed += b.output || 0;
    }
  });

  return Object.values(weekData);
}

/* ── Build monthly data from batches (Week 1-4) ── */
function buildMonthlyData(batches) {
  const monthStart = getMonthStart();
  const monthData = {
    "Wk 1": { d: "Wk 1", received: 0, packed: 0 },
    "Wk 2": { d: "Wk 2", received: 0, packed: 0 },
    "Wk 3": { d: "Wk 3", received: 0, packed: 0 },
    "Wk 4": { d: "Wk 4", received: 0, packed: 0 },
  };

  batches.forEach((b) => {
    const batchDate = new Date(b.date);
    if (batchDate.getMonth() === monthStart.getMonth()) {
      const dayOfMonth = batchDate.getDate();
      let week = "Wk 1";
      if (dayOfMonth > 21) week = "Wk 4";
      else if (dayOfMonth > 14) week = "Wk 3";
      else if (dayOfMonth > 7) week = "Wk 2";

      monthData[week].received += b.input || 0;
      monthData[week].packed += b.output || 0;
    }
  });

  return Object.values(monthData);
}

/* ── Build product mix from current month's batches ── */
function buildProductMix(batches) {
  const monthStart = getMonthStart();
  const productMap = {};

  batches.forEach((b) => {
    const batchDate = new Date(b.date);
    if (batchDate.getMonth() === monthStart.getMonth()) {
      const product = b.product || "Unknown";
      if (!productMap[product]) {
        productMap[product] = 0;
      }
      productMap[product] += b.output || 0;
    }
  });

  return Object.entries(productMap)
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units);
}

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
  const [batches, setBatches] = useState(() => batchStore.getAll());

  // Charts use ResizeObserver which only exists in the browser — never render on server
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Build report data from dispatch tracking batches
  const weeklyData = buildWeeklyData(batches);
  const monthlyData = buildMonthlyData(batches);
  const productMix = buildProductMix(batches);

  // Calculate efficiency
  const weeklyEfficiency = weeklyData.map((x) => ({
    d: x.d,
    e: x.received > 0 ? +(100 * x.packed / x.received).toFixed(1) : 0,
  }));

  const monthlyEfficiency = monthlyData.map((x) => ({
    d: x.d,
    e: x.received > 0 ? +(100 * x.packed / x.received).toFixed(1) : 0,
  }));

  /* ── Weekly KPIs ── */
  const weeklyTotalReceived = weeklyData.reduce((s, d) => s + d.received, 0);
  const weeklyTotalPacked = weeklyData.reduce((s, d) => s + d.packed, 0);
  const weeklyEffRate = weeklyTotalReceived > 0 ? +(100 * weeklyTotalPacked / weeklyTotalReceived).toFixed(1) : 0;
  const weeklyStats = [
    { label: "Tips Received", value: weeklyTotalReceived.toLocaleString(), hint: "This week" },
    { label: "Units Packed", value: weeklyTotalPacked.toLocaleString(), hint: `${weeklyEffRate}% yield` },
    { label: "Avg. Efficiency", value: `${weeklyEffRate}%`, hint: "Current week" },
  ];

  /* ── Monthly KPIs ── */
  const monthlyTotalReceived = monthlyData.reduce((s, d) => s + d.received, 0);
  const monthlyTotalPacked = monthlyData.reduce((s, d) => s + d.packed, 0);
  const monthlyEffRate = monthlyTotalReceived > 0 ? +(100 * monthlyTotalPacked / monthlyTotalReceived).toFixed(1) : 0;
  const monthlyStats = [
    { label: "Total Tips Received", value: monthlyTotalReceived.toLocaleString(), hint: "Current month" },
    { label: "Total Units Packed", value: monthlyTotalPacked.toLocaleString(), hint: `${monthlyEffRate}% yield` },
    { label: "Avg. Monthly Eff.", value: `${monthlyEffRate}%`, hint: "Current month" },
  ];

  const stats = isWeekly ? weeklyStats : monthlyStats;
  const barData = isWeekly ? weeklyData : monthlyData;
  const lineData = isWeekly ? weeklyEfficiency : monthlyEfficiency;


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
            {productMix.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No product data available. Add batch entries in{" "}
                <a href="/production/weight" className="text-primary underline underline-offset-2">
                  Dispatch Tracking
                </a>{" "}
                to see product breakdown.
              </div>
            ) : (
              <div className="h-48 sm:h-64">
                {mounted ? (
                  <ResponsiveContainer>
                    <BarChart
                      data={productMix}
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
            )}
          </Section>
        </>
      )}
    </DashboardLayout>
  );
}

