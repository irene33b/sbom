const COLORS = {
  CRITICAL: "bg-risk-critical/15 text-risk-critical border-risk-critical/40",
  HIGH: "bg-risk-high/15 text-risk-high border-risk-high/40",
  MEDIUM: "bg-risk-medium/15 text-risk-medium border-risk-medium/40",
  LOW: "bg-risk-low/15 text-risk-low border-risk-low/40",
  NONE: "bg-risk-none/15 text-risk-none border-risk-none/40",
};

export default function RiskBadge({ level, size = "sm" }) {
  const cls = COLORS[level] || COLORS.NONE;
  const sizeCls = size === "lg" ? "text-base px-3 py-1" : "text-[13.5px] px-2 py-0.5";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-mono font-medium tracking-wide uppercase ${cls} ${sizeCls}`}
    >
      {level}
    </span>
  );
}
