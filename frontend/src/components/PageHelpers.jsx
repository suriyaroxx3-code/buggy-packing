// PageHelpers.jsx — shared UI primitives (converted from TSX to JSX)

export function Section({ title, action, children }) {
  return (
    <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border flex-wrap gap-2">
        <h3 className="font-display text-lg">{title}</h3>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-soft hover-lift">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-1 break-all">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition"
  + " [caret-color:#6b5ca5]";

export function Btn({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:     "bg-primary text-primary-foreground hover:opacity-95 shadow-soft",
    accent:      "bg-accent text-accent-foreground hover:opacity-95 shadow-soft",
    ghost:       "bg-secondary text-secondary-foreground hover:bg-secondary/70",
    destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  };
  const v = variants[variant] ?? variants.primary;
  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-medium transition ${v} ${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = "default" }) {
  const tones = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn:    "bg-amber-50  text-amber-700  border-amber-200",
    danger:  "bg-red-50    text-red-700    border-red-200",
    info:    "bg-secondary text-secondary-foreground border-border",
    muted:   "bg-muted     text-muted-foreground    border-border",
    default: "bg-secondary text-secondary-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${tones[tone] ?? tones.default}`}>
      {children}
    </span>
  );
}

