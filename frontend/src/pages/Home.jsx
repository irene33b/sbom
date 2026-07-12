import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ArrowRight,
  GitBranch,
  ScaleIcon,
  Clock,
  FileCheck2,
  Network,
  Gauge,
} from "lucide-react";
import Logo from "../components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-ink-700 bg-ink-950/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="xs" />
            <span className="font-display font-semibold text-[17px] text-white">SentryChain</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-base text-ink-500">
            <a href="#analyzer" className="hover:text-slate-200 transition-colors">SBOM Analyzer</a>
            <a href="#features" className="hover:text-slate-200 transition-colors">How it works</a>
            <a href="#framework" className="hover:text-slate-200 transition-colors">Compliance</a>
          </nav>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 bg-signal-teal hover:bg-signal-tealSoft text-ink-950 font-semibold text-base rounded-lg px-4 py-2 transition-colors"
          >
            Sign in <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-800/60 px-3 py-1 text-[14.5px] text-ink-500 font-mono mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-teal animate-pulse" />
            10 applications · 500 dependencies · live analysis
          </div>
          <h1 className="font-display text-5xl font-semibold text-white leading-[1.08]">
            Foundations for
            <br />
            <span className="text-signal-teal">trustworthy</span> software
          </h1>
          <p className="mt-6 text-ink-500 text-[17.5px] leading-relaxed max-w-lg">
            When the next Log4j happens, you shouldn't need three days and a
            spreadsheet to find out if you're exposed. SentryChain maps every
            direct and transitive dependency across your application
            portfolio, cross-references known CVEs and license terms, and
            ranks what to fix first.
          </p>
          <div className="mt-9 flex items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-signal-teal hover:bg-signal-tealSoft text-ink-950 font-semibold text-base rounded-lg px-5 py-3 transition-colors"
            >
              Open SBOM Analyzer <ArrowRight size={16} />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 border border-ink-600 hover:border-ink-500 text-slate-200 font-medium text-base rounded-lg px-5 py-3 transition-colors"
            >
              See how it works
            </a>
          </div>
        </div>

        <HeroLogoDisplay />
      </section>

      {/* Stat strip */}
      <section className="border-y border-ink-700 bg-ink-800/30">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat value="100%" label="Transitive dependency resolution" />
          <Stat value="<20%" label="False positive rate target" />
          <Stat value="40+ hrs" label="Manual tracing time eliminated" />
          <Stat value="10" label="Applications tracked live" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-14">
          <h2 className="font-display text-3xl font-semibold text-white">
            One pipeline, five kinds of hidden risk
          </h2>
          <p className="mt-3 text-ink-500 text-[17px]">
            Every dependency is run through the same analysis pipeline the
            moment its SBOM is ingested.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <FeatureCard
            icon={GitBranch}
            title="Transitive resolution"
            desc="Follows dependency chains multiple levels deep — App → Library A → Library B → vulnerable Library C — so nested risk never hides."
          />
          <FeatureCard
            icon={ShieldAlert}
            title="CVE cross-referencing"
            desc="Matches direct and transitive libraries against a live vulnerability database, scored by CVSS, exploitability, and patch availability."
          />
          <FeatureCard
            icon={ScaleIcon}
            title="License conflict detection"
            desc="Flags viral licenses (GPL/AGPL/SSPL) inside proprietary codebases, undeclared licenses, and transitive license contamination."
          />
          <FeatureCard
            icon={Clock}
            title="Maintenance risk"
            desc="Surfaces libraries with no updates in 2+ years — the quiet risk that accumulates unnoticed until it's exploited."
          />
          <FeatureCard
            icon={Network}
            title="Legible dependency graphs"
            desc="Every application renders as a clean, zoomable hierarchy — root, direct, and transitive nodes color-coded by severity."
          />
          <FeatureCard
            icon={FileCheck2}
            title="Board-ready reports"
            desc="One-click downloadable PDF reports per application or organization-wide, ranked by remediation priority."
          />
        </div>
      </section>

      {/* Analyzer CTA */}
      <section id="analyzer" className="max-w-7xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-800 to-ink-900 p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 text-signal-teal text-[14.5px] font-mono uppercase tracking-wide mb-3">
              <Gauge size={14} /> SBOM Analyzer
            </div>
            <h3 className="font-display text-2xl font-semibold text-white max-w-md">
              Sign in to rank your applications by supply chain risk right now.
            </h3>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-signal-teal hover:bg-signal-tealSoft text-ink-950 font-semibold text-base rounded-lg px-6 py-3.5 transition-colors shrink-0"
          >
            Launch analyzer <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Framework alignment */}
      <section id="framework" className="border-t border-ink-700">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-ink-500 text-[15px] font-mono">
            Aligned to NIST CSF (SC-2, CM-8) · OWASP A06:2021 · Executive Order 14028 SBOM requirements
          </p>
          <p className="text-ink-500 text-[15px]">© 2026 SentryChain. Built for supply chain risk teams.</p>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <div className="font-display text-3xl font-semibold text-signal-teal">{value}</div>
      <div className="text-[15px] text-ink-500 mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-800/40 p-6 hover:border-ink-600 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-signal-teal/10 border border-signal-teal/30 flex items-center justify-center mb-4">
        <Icon size={18} className="text-signal-teal" />
      </div>
      <h3 className="font-display font-semibold text-white text-[17.5px]">{title}</h3>
      <p className="mt-2 text-ink-500 text-[15.5px] leading-relaxed">{desc}</p>
    </div>
  );
}

function HeroLogoDisplay() {
  return (
    <div className="relative flex items-center justify-center h-[420px] lg:h-[480px]">
      {/* Ambient gradient glow, colors pulled from the mark itself */}
      <div
        className="absolute w-[420px] h-[420px] rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, rgba(217,42,143,0.35), transparent 55%), radial-gradient(circle at 65% 65%, rgba(20,184,170,0.35), transparent 55%)",
        }}
      />

      {/* Slow-rotating dashed orbit rings for a "live system" feel */}
      <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-ink-600 animate-spin-slow" />
      <div className="absolute w-[300px] h-[300px] rounded-full border border-ink-700 animate-spin-slow-reverse" />

      {/* Orbit markers */}
      <span className="absolute top-[calc(50%-180px)] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-signal-magenta shadow-[0_0_10px_rgba(217,42,143,0.8)]" />
      <span className="absolute bottom-[calc(50%-150px)] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-signal-teal shadow-[0_0_10px_rgba(20,184,170,0.8)]" />

      <img
        src="/logo-mark.svg"
        alt="SentryChain"
        className="relative w-64 h-64 lg:w-72 lg:h-72 object-contain animate-spin-slow drop-shadow-[0_0_36px_rgba(217,42,143,0.25)]"
      />
    </div>
  );
}
