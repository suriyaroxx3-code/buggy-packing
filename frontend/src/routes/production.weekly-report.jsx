// production.weekly-report.jsx — Reports powered by backend API data
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Section, Stat } from "@/components/PageHelpers";
import { batchApi } from "@/lib/api";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/production/weekly-report")({
  head: () => ({ meta: [{ title: "Reports — BrushPack" }] }),
  component: Page,
});

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildWeeklyData(batches) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekData = {};
  days.forEach((d) => { weekData[d] = { d, received: 0, packed: 0 }; });
  batches.forEach((b) => {
    const batchDate = new Date(b.date);
    const dayIndex = (batchDate.getDay() + 6) % 7;
    if (dayIndex >= 0 && dayIndex < 7) {
      const dayName = days[dayIndex];
      weekData[dayName].received += b.input  || 0;
      weekData[dayName].packed   += b.output || 0;
    }
  });
  return days.map((d) => weekData[d]);
}

function buildMonthlyData(batches) {
  const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
  const monthData = weeks.map((w) => ({ w, received: 0, packed: 0 }));
  const monthStart = getMonthStart();
  batches.forEach((b) => {
    const batchDate = new Date(b.date);
    if (batchDate >= monthStart) {
      const dayOfMonth = batchDate.getDate();
      const weekIndex = Math.min(Math.floor((dayOfMonth - 1) / 7), 3);
      monthData[weekIndex].received += b.input  || 0;
      monthData[weekIndex].packed   += b.output || 0;
    }
  });
  return monthData;
}

function Page() {
  const [batches, setBatches]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [mounted, setMounted]   = useState(false);
  const [reportPeriod, setReportPeriod] = useState("weekly");

  useEffect(() => {
    setMounted(true);
    batchApi.getAll()
      .then(setBatches)
      .catch(() => setBatches([]))
      .finally(() => setLoading(false));
  }, []);

  const weeklyData  = buildWeeklyData(batches);
  const monthlyData = buildMonthlyData(batches);

  const TODAY = new Date().toISOString().slice(0, 10);
  const todayBatches = batches.filter((b) => b.date === TODAY);
  const weekStart    = getWeekStart().toISOString().slice(0, 10);
  const weekBatches  = batches.filter((b) => b.date >= weekStart);

  const todayPacked  = todayBatches.reduce((s, b) => s + (b.output || 0), 0);
  const weekPacked   = weekBatches.reduce((s, b) => s + (b.output || 0), 0);
  const totalPacked  = batches.reduce((s, b) => s + (b.output || 0), 0);
  const efficiency   = batches.length > 0
    ? Math.round((batches.reduce((s, b) => s + (b.output || 0), 0) /
        Math.max(batches.reduce((s, b) => s + (b.input || 0), 0), 1)) * 100)
    : 0;

  const chartData   = reportPeriod === "weekly" ? weeklyData  : monthlyData;
  const chartKey    = reportPeriod === "weekly" ? "d"         : "w";

  return (
    <DashboardLayout
      title="Production Reports"
      subtitle="Weekly and monthly packing output powered by Dispatch Tracking data."
    >
      {/* Period toggle */}
      <div className="flex gap-2 mb-6">
        {["weekly", "monthly"].map((p) => (
          <button
            key={p}
            onClick={() => setReportPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border capitalize ${
              reportPeriod === p
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat label="Packed Today"    value={todayPacked.toLocaleString()}  hint={`${todayBatches.length} batch${todayBatches.length !== 1 ? "es" : ""}`} />
        <Stat label="Packed This Week" value={weekPacked.toLocaleString()}  hint={`${weekBatches.length} batch${weekBatches.length !== 1 ? "es" : ""}`} />
        <Stat label="Total Packed"    value={totalPacked.toLocaleString()}  hint="All time" />
        <Stat label="Efficiency"      value={`${efficiency}%`}              hint="Output / Input" />
      </div>

      {/* Bar Chart */}
      {mounted && (
        <Section title={`${reportPeriod === "weekly" ? "Weekly" : "Monthly"} Output`}>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey={chartKey} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="received" name="Received" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="packed"   name="Packed"   fill="#6b5ca5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      )}

      <div className="h-5 sm:h-6" />

      {/* Batch table */}
      <Section title="All Batch Records">
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 sm:px-6 py-3">Batch</th>
                <th className="px-4 sm:px-6 py-3">Product</th>
                <th className="px-4 sm:px-6 py-3">Date</th>
                <th className="px-4 sm:px-6 py-3">Received</th>
                <th className="px-4 sm:px-6 py-3">Packed</th>
                <th className="px-4 sm:px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</td>
                </tr>
              )}
              {!loading && batches.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/30 transition">
                  <td className="px-4 sm:px-6 py-3 font-medium">{b.batch}</td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground truncate max-w-[180px]">{b.product}</td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground text-xs">{b.date || "—"}</td>
                  <td className="px-4 sm:px-6 py-3">{(b.input  || 0).toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-3">{(b.output || 0).toLocaleString()}</td>
                  <td className="px-4 sm:px-6 py-3 text-muted-foreground">{b.dispatchStatus || "Pending"}</td>
                </tr>
              ))}
              {!loading && batches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                    No batch records yet. Add entries in Dispatch Tracking.
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
