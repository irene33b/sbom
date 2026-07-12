import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Network,
  Table2,
  X,
  ShieldAlert,
  ScaleIcon,
  Clock,
} from "lucide-react";
import {
  getApplication,
  getAppGraph,
  getAppDependencies,
  downloadAppReport,
} from "../api/client";
import DependencyGraph from "../components/DependencyGraph";
import RiskBadge from "../components/RiskBadge";

const RISK_TYPE_LABEL = {
  VULNERABLE_DEPENDENCY: "Vulnerable (direct)",
  TRANSITIVE_VULNERABILITY: "Vulnerable (transitive)",
  LICENSE_CONFLICT: "License conflict",
  TRANSITIVE_LICENSE_CONFLICT: "License conflict (transitive)",
  LICENSE_UNKNOWN: "Unknown license",
  UNMAINTAINED: "Unmaintained",
  NONE: "Clean",
};

export default function AppDetail() {
  const { appId } = useParams();
  const [tab, setTab] = useState("graph");
  const [app, setApp] = useState(null);
  const [graph, setGraph] = useState(null);
  const [deps, setDeps] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setSelectedNode(null);
    Promise.all([getApplication(appId), getAppGraph(appId), getAppDependencies(appId)]).then(
      ([a, g, d]) => {
        setApp(a);
        setGraph(g);
        setDeps(d);
        setLoading(false);
      }
    );
  }, [appId]);

  const filteredDeps = useMemo(() => {
    return deps
      .filter((d) => (filterType === "ALL" ? true : d.risk_type === filterType))
      .filter((d) => d.library.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.risk_score - a.risk_score);
  }, [deps, filterType, search]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadAppReport(appId, app.name);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div className="p-10 text-ink-500 text-base">Analyzing dependency chain…</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-ink-700 px-8 py-5 shrink-0">
        <Link to="/analyzer" className="inline-flex items-center gap-1.5 text-ink-500 hover:text-slate-200 text-[15px] mb-3 transition-colors">
          <ArrowLeft size={13} /> All applications
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-white">{app.name}</h1>
              <RiskBadge level={app.risk_tier} size="lg" />
            </div>
            <p className="text-ink-500 text-[15px] mt-1.5 font-mono">
              {app.app_id} · {app.language} · {app.deployment} · owner {app.business_owner} ({app.department})
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="font-display text-3xl font-semibold text-slate-100">{app.risk_score}<span className="text-base text-ink-500">/100</span></div>
              <div className="text-[13.5px] text-ink-500 uppercase tracking-wide">Risk score</div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-2 bg-signal-teal hover:bg-signal-tealSoft text-ink-950 font-semibold text-base rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60"
            >
              <Download size={15} />
              {downloading ? "Preparing…" : "Download report"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <SummaryPill icon={ShieldAlert} value={app.vulnerable_count} label="Vulnerable" tone="high" />
          <SummaryPill icon={ScaleIcon} value={app.license_conflict_count + app.license_unknown_count} label="License issues" tone="medium" />
          <SummaryPill icon={Clock} value={app.unmaintained_count} label="Unmaintained" tone="low" />
          <SummaryPill icon={Table2} value={app.total_dependencies} label="Total dependencies" tone="slate" />
        </div>

        <div className="flex items-center gap-1 mt-6 border-b border-ink-700 -mb-5">
          <TabButton active={tab === "graph"} onClick={() => setTab("graph")} icon={Network} label="Dependency Graph" />
          <TabButton active={tab === "table"} onClick={() => setTab("table")} icon={Table2} label="Dependency Table" />
        </div>
      </div>

      {/* Body */}
      {tab === "graph" ? (
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 relative">
            <DependencyGraph graphData={graph} onNodeSelect={setSelectedNode} />
            <Legend />
          </div>
          {selectedNode && (
            <NodeInspector node={selectedNode} onClose={() => setSelectedNode(null)} />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-8">
          <div className="flex items-center gap-3 mb-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search library name…"
              className="w-64 rounded-lg bg-ink-800 border border-ink-600 px-3.5 py-2 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-signal-teal/40 focus:border-signal-teal/60 transition"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg bg-ink-800 border border-ink-600 px-3 py-2 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-signal-teal/40"
            >
              <option value="ALL">All risk types</option>
              {Object.entries(RISK_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <span className="text-[15px] text-ink-500 ml-auto">{filteredDeps.length} of {deps.length} dependencies</span>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-800/40 overflow-hidden">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left text-[13.5px] uppercase tracking-wide text-ink-500 border-b border-ink-700">
                  <th className="px-4 py-3 font-medium">Library</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">License</th>
                  <th className="px-4 py-3 font-medium">Last Updated</th>
                  <th className="px-4 py-3 font-medium">Finding</th>
                  <th className="px-4 py-3 font-medium">Severity</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeps.map((d) => (
                  <tr key={d.dep_id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-800/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-100">{d.library}</td>
                    <td className="px-4 py-3 font-mono text-ink-500">{d.version}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[13.5px] px-2 py-0.5 rounded-full border ${d.dependency_type === "direct" ? "border-signal-teal/40 text-signal-teal bg-signal-teal/10" : "border-ink-600 text-ink-500 bg-ink-700/40"}`}>
                        {d.dependency_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{d.license}</td>
                    <td className="px-4 py-3 text-ink-500 font-mono">{d.last_updated}</td>
                    <td className="px-4 py-3 text-slate-300">{RISK_TYPE_LABEL[d.risk_type]}</td>
                    <td className="px-4 py-3"><RiskBadge level={d.severity} /></td>
                    <td className="px-4 py-3 font-display font-semibold text-slate-100">{d.risk_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryPill({ icon: Icon, value, label, tone }) {
  const toneMap = {
    high: "text-risk-high",
    medium: "text-risk-medium",
    low: "text-risk-low",
    slate: "text-slate-300",
  };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-1.5">
      <Icon size={14} className={toneMap[tone]} />
      <span className="font-display font-semibold text-slate-100 text-base">{value}</span>
      <span className="text-[14px] text-ink-500">{label}</span>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-base font-medium border-b-2 transition-colors ${
        active ? "border-signal-teal text-signal-teal" : "border-transparent text-ink-500 hover:text-slate-200"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function Legend() {
  const items = [
    { label: "Application", color: "#14B8AA" },
    { label: "Critical", color: "#E23B3B" },
    { label: "High", color: "#EA7C1F" },
    { label: "Medium", color: "#D9A62A" },
    { label: "Low / Clean", color: "#4FA35A" },
  ];
  return (
    <div className="absolute bottom-4 left-4 rounded-lg border border-ink-700 bg-ink-900/90 backdrop-blur px-4 py-3 flex items-center gap-4">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-1.5 text-[14px] text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: i.color, boxShadow: `0 0 6px ${i.color}` }} />
          {i.label}
        </div>
      ))}
    </div>
  );
}

function NodeInspector({ node, onClose }) {
  const isRoot = node.node_type === "root";
  return (
    <div className="w-96 shrink-0 border-l border-ink-700 bg-ink-900/95 backdrop-blur overflow-y-auto">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700">
        <h3 className="font-display font-semibold text-white text-[17px]">
          {isRoot ? "Application" : "Dependency"}
        </h3>
        <button onClick={onClose} className="text-ink-500 hover:text-slate-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <div className="font-mono text-lg text-slate-100">{node.label}</div>
          {!isRoot && <div className="font-mono text-[15px] text-ink-500">{node.version}</div>}
        </div>

        {!isRoot && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge level={node.severity} size="lg" />
              <span className="text-[14px] px-2.5 py-1 rounded-full border border-ink-600 text-ink-500 font-mono">
                {node.node_type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-base">
              <InfoField label="License" value={node.license || "—"} />
              <InfoField label="Risk score" value={`${node.risk_score ?? 0} / 100`} />
            </div>

            {node.cve_count > 0 && (
              <div>
                <div className="text-[13.5px] uppercase tracking-wide text-ink-500 mb-2">Vulnerabilities</div>
                <div className="rounded-lg border border-risk-critical/30 bg-risk-critical/5 px-3 py-2.5 text-[15px] text-slate-300">
                  {node.cve_count} known CVE{node.cve_count > 1 ? "s" : ""} associated with this library. Open the
                  Dependency Table tab and search "{node.label}" for full CVE details.
                </div>
              </div>
            )}

            {node.risk_type === "NONE" && (
              <div className="rounded-lg border border-risk-low/30 bg-risk-low/5 px-3 py-2.5 text-[15px] text-slate-300">
                No known vulnerabilities, license conflicts, or maintenance issues detected for this version.
              </div>
            )}
          </>
        )}

        {isRoot && (
          <p className="text-[15px] text-ink-500 leading-relaxed">
            Root node of the dependency tree. Direct dependencies branch out
            from here; transitive dependencies nest beneath each direct
            dependency, however many levels deep the chain goes.
          </p>
        )}
      </div>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div className="text-[13.5px] uppercase tracking-wide text-ink-500 mb-1">{label}</div>
      <div className="text-slate-200 font-medium">{value}</div>
    </div>
  );
}
