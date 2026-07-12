import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Radar, ArrowRight } from "lucide-react";
import { getApplications } from "../api/client";
import RiskBadge from "../components/RiskBadge";

export default function AnalyzerHome() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplications().then((a) => {
      setApps(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="p-10 text-ink-500 text-base">Loading applications…</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2.5 mb-2">
        <Radar size={18} className="text-signal-teal" />
        <h1 className="font-display text-2xl font-semibold text-white">SBOM Analyzer</h1>
      </div>
      <p className="text-ink-500 text-base mb-8 max-w-xl">
        Select an application to inspect its full dependency graph, CVE
        findings, license conflicts, and maintenance flags.
      </p>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map((a) => (
          <Link
            key={a.app_id}
            to={`/analyzer/${a.app_id}`}
            className="group rounded-xl border border-ink-700 bg-ink-800/40 p-5 hover:border-signal-teal/40 hover:bg-ink-800/70 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-display font-semibold text-white text-[17.5px] group-hover:text-signal-teal transition-colors">
                  {a.name}
                </h3>
                <p className="text-[14.5px] text-ink-500 font-mono mt-0.5">{a.app_id} · {a.language}</p>
              </div>
              <RiskBadge level={a.risk_tier} />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-[14.5px] text-ink-500">Risk score</span>
              <span className="font-display text-2xl font-semibold text-slate-100">{a.risk_score}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mb-4">
              <MiniStat value={a.vulnerable_count} label="Vulnerable" />
              <MiniStat value={a.license_conflict_count + a.license_unknown_count} label="License" />
              <MiniStat value={a.unmaintained_count} label="Stale" />
            </div>

            <div className="flex items-center justify-between text-[15px] pt-3 border-t border-ink-700">
              <span className="text-ink-500">{a.total_dependencies} dependencies</span>
              <span className="text-signal-teal font-medium inline-flex items-center gap-1">
                Analyze <ArrowRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ value, label }) {
  return (
    <div className="rounded-lg bg-ink-900/60 py-2">
      <div className="font-display font-semibold text-slate-100 text-[17px]">{value}</div>
      <div className="text-[12.5px] text-ink-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
