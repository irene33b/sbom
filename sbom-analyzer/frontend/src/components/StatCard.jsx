export default function StatCard({ label, value, sublabel, accent = "teal", icon: Icon }) {
  const accentMap = {
    teal: "text-signal-teal",
    critical: "text-risk-critical",
    high: "text-risk-high",
    medium: "text-risk-medium",
    low: "text-risk-low",
    slate: "text-slate-200",
  };
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] uppercase tracking-wide text-ink-500 font-medium">{label}</span>
        {Icon && <Icon size={15} className="text-ink-500" />}
      </div>
      <div className={`font-display text-3xl font-semibold ${accentMap[accent]}`}>{value}</div>
      {sublabel && <div className="text-[14.5px] text-ink-500">{sublabel}</div>}
    </div>
  );
}
