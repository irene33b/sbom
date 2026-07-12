import { useEffect, useState } from "react";
import { FileBarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getEvaluation } from "../api/client";

const CATEGORY_LABEL = {
  VULNERABLE: "Vulnerability Detection",
  LICENSE_CONFLICT: "License Conflict Detection",
  UNMAINTAINED: "Maintenance Risk Detection",
  OVERALL_RISKY: "Overall Risk Classification",
};

const TARGETS = {
  VULNERABLE: { metric: "recall", target: 85, note: "> 85% recall target" },
  LICENSE_CONFLICT: { metric: "recall", target: 90, note: "> 90% recall target" },
  UNMAINTAINED: { metric: "recall", target: 85, note: "reference only" },
  OVERALL_RISKY: { metric: "false_positive_rate", target: 20, note: "< 20% false positive rate target" },
};

export default function Evaluation() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getEvaluation().then(setData);
  }, []);

  if (!data) return <div className="p-10 text-ink-500 text-base">Scoring detection accuracy against ground truth…</div>;

  const chartData = Object.entries(data).map(([key, v]) => ({
    name: CATEGORY_LABEL[key] || key,
    Precision: v.precision,
    Recall: v.recall,
    "F1 Score": v.f1_score,
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <FileBarChart2 size={18} className="text-signal-teal" />
        <h1 className="font-display text-2xl font-semibold text-white">Detection Accuracy</h1>
      </div>
      <p className="text-ink-500 text-base mb-8 max-w-2xl">
        SentryChain's classifications benchmarked against the provided
        ground-truth dependency labels — transparent self-evaluation, not a
        black box.
      </p>

      <div className="rounded-xl border border-ink-700 bg-ink-800/40 p-6 mb-8">
        <h2 className="font-display font-semibold text-white text-[17px] mb-4">Precision / Recall / F1 by category</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1B2436" />
            <XAxis dataKey="name" tick={{ fill: "#A9B4C8", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={70} />
            <YAxis tick={{ fill: "#A9B4C8", fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #28324A", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Precision" fill="#14B8AA" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Recall" fill="#EA7C1F" radius={[4, 4, 0, 0]} />
            <Bar dataKey="F1 Score" fill="#5B6B84" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, v]) => {
          const target = TARGETS[key];
          const metricValue = v[target.metric];
          const passing = target.metric === "false_positive_rate" ? metricValue < target.target : metricValue > target.target;
          return (
            <div key={key} className="rounded-xl border border-ink-700 bg-ink-800/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-white text-[16px]">{CATEGORY_LABEL[key] || key}</h3>
                <span className={`text-[13.5px] font-mono px-2 py-0.5 rounded-full border ${passing ? "text-risk-low border-risk-low/40 bg-risk-low/10" : "text-risk-high border-risk-high/40 bg-risk-high/10"}`}>
                  {passing ? "MEETS TARGET" : "BELOW TARGET"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center mb-3">
                <Metric label="Precision" value={v.precision} />
                <Metric label="Recall" value={v.recall} />
                <Metric label="F1" value={v.f1_score} />
                <Metric label="FP rate" value={v.false_positive_rate} />
              </div>
              <div className="text-[14px] text-ink-500 font-mono">
                TP {v.true_positive} · FP {v.false_positive} · FN {v.false_negative} · TN {v.true_negative}
              </div>
              <div className="text-[13.5px] text-ink-500 mt-1">{target.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-ink-900/60 py-2">
      <div className="font-display font-semibold text-slate-100 text-[17px]">{value}%</div>
      <div className="text-[12.5px] text-ink-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
