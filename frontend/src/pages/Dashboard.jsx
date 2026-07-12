import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ArrowUpRight, ShieldAlert, ScaleIcon, Clock, Boxes, Lock } from "lucide-react";
import { getSummary, getApplications, downloadOrgReport } from "../api/client";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/StatCard";
import RiskBadge from "../components/RiskBadge";

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.access_level === "admin";
  const [summary, setSummary] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([getSummary(), getApplications()]).then(([s, a]) => {
      setSummary(s);
      setApps(a);
      setLoading(false);
    });
  }, []);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadOrgReport();
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-ink-500 text-base">Loading portfolio risk data…</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-white">Portfolio Overview</h1>
          <p className="text-ink-500 text-base mt-1">
            Supply chain risk across {summary.total_applications} applications, {summary.total_dependencies} dependencies.
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 border border-ink-600 hover:border-signal-teal/60 hover:text-signal-teal text-slate-200 text-base font-medium rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60"
          >
            <Download size={15} />
            {downloading ? "Preparing…" : "Download org report"}
          </button>
        ) : (
          <span
            title="Report downloads require admin access"
            className="inline-flex items-center gap-2 border border-ink-700 text-ink-500 text-base font-medium rounded-lg px-4 py-2.5 cursor-not-allowed"
          >
            <Lock size={14} />
            Admin only
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Critical / High Apps" value={summary.critical_apps + summary.high_apps} accent="critical" icon={ShieldAlert} sublabel={`${summary.critical_apps} critical · ${summary.high_apps} high`} />
        <StatCard label="Vulnerable Deps" value={summary.total_vulnerable} accent="high" icon={Boxes} sublabel="Direct + transitive CVE matches" />
        <StatCard label="License Issues" value={summary.total_license_conflicts + summary.total_license_unknown} accent="medium" icon={ScaleIcon} sublabel={`${summary.total_license_conflicts} conflicts · ${summary.total_license_unknown} unknown`} />
        <StatCard label="Unmaintained" value={summary.total_unmaintained} accent="low" icon={Clock} sublabel="No updates in 2+ years" />
      </div>

      <div className="rounded-xl border border-ink-700 bg-ink-800/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-700 flex items-center justify-between">
          <h2 className="font-display font-semibold text-white text-lg">Applications ranked by risk</h2>
          <span className="text-base text-ink-500 font-mono">{apps.length} applications</span>
        </div>
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm uppercase tracking-wide text-ink-500 border-b border-ink-700">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Application</th>
              <th className="px-5 py-3 font-medium">Criticality</th>
              <th className="px-5 py-3 font-medium">Risk Score</th>
              <th className="px-5 py-3 font-medium">Tier</th>
              <th className="px-5 py-3 font-medium">Vulnerable</th>
              <th className="px-5 py-3 font-medium">License</th>
              <th className="px-5 py-3 font-medium">Unmaintained</th>
              {isAdmin && <th className="px-5 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.app_id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-800/60 transition-colors">
                <td className="px-5 py-3.5 text-ink-500 font-mono">{a.rank}</td>
                <td className="px-5 py-3.5">
                  {isAdmin ? (
                    <Link to={`/analyzer/${a.app_id}`} className="font-medium text-slate-100 hover:text-signal-teal transition-colors inline-flex items-center gap-1.5">
                      {a.name}
                      <ArrowUpRight size={13} className="text-ink-500" />
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-100">{a.name}</span>
                  )}
                  <div className="text-base text-ink-500 font-mono mt-0.5">{a.language} · {a.deployment}</div>
                </td>
                <td className="px-5 py-3.5 text-ink-500">{a.criticality}</td>
                <td className="px-5 py-3.5">
                  <span className="font-display font-semibold text-slate-100">{a.risk_score}</span>
                  <span className="text-ink-500 text-base"> /100</span>
                </td>
                <td className="px-5 py-3.5"><RiskBadge level={a.risk_tier} /></td>
                <td className="px-5 py-3.5 text-slate-300">{a.vulnerable_count}</td>
                <td className="px-5 py-3.5 text-slate-300">{a.license_conflict_count + a.license_unknown_count}</td>
                <td className="px-5 py-3.5 text-slate-300">{a.unmaintained_count}</td>
                {isAdmin && (
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/analyzer/${a.app_id}`}
                      className="text-base font-medium text-signal-teal hover:text-signal-tealSoft transition-colors whitespace-nowrap"
                    >
                      View graph →
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
