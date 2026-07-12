import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Incorrect username or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-ink-700">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(20,184,170,0.18), transparent 40%), radial-gradient(circle at 80% 70%, rgba(226,59,59,0.12), transparent 40%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-14 w-full">
          <div className="flex items-center gap-2">
            <Logo size="xs" />
            <span className="font-display font-semibold text-lg text-white">SentryChain</span>
          </div>

          <div>
            <h1 className="font-display text-4xl font-semibold text-white leading-tight max-w-md">
              See every vulnerable dependency before it becomes an incident.
            </h1>
            <p className="mt-4 text-ink-500 max-w-sm text-[17px] leading-relaxed">
              SentryChain resolves direct and transitive SBOM dependencies against
              live CVE, license, and maintenance signals — so your team spends
              minutes on triage, not the 40+ hours a manual trace usually takes.
            </p>

            <div className="mt-10 flex items-center gap-6 text-base">
              <ManifestRow lib="log4j-core" version="2.14.1" sev="CRITICAL" />
              <ManifestRow lib="requests" version="2.6.0" sev="HIGH" />
              <ManifestRow lib="lodash" version="4.17.4" sev="MEDIUM" />
            </div>
          </div>

          <div className="text-[14.5px] text-ink-500 font-mono">
            NIST CSF · OWASP A06:2021 · EO 14028 SBOM
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10 justify-center">
            <Logo size="xs" />
            <span className="font-display font-semibold text-lg text-white">SentryChain</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-white">Sign in</h2>
          <p className="text-ink-500 text-base mt-1.5">Access your supply chain risk dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-base font-medium text-ink-500 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-ink-800 border border-ink-600 px-3.5 py-2.5 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-signal-teal/40 focus:border-signal-teal/60 transition"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-base font-medium text-ink-500 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-ink-800 border border-ink-600 px-3.5 py-2.5 text-base text-slate-100 focus:outline-none focus:ring-2 focus:ring-signal-teal/40 focus:border-signal-teal/60 transition"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-risk-critical text-base bg-risk-critical/10 border border-risk-critical/30 rounded-lg px-3 py-2">
                <AlertCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-signal-teal hover:bg-signal-tealSoft text-ink-950 font-semibold text-base rounded-lg py-3 transition-colors disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-ink-700 bg-ink-800/50 px-4 py-3 text-[15px] text-ink-500">
            <span className="text-slate-300 font-medium">Demo credentials:</span> admin / admin123
            <span className="mx-1.5">·</span> demo / demo123
          </div>

          <p className="mt-8 text-center text-[15px] text-ink-500">
            <Link to="/" className="hover:text-signal-teal transition-colors">
              ← Back to overview
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function ManifestRow({ lib, version, sev }) {
  const color =
    sev === "CRITICAL" ? "text-risk-critical border-risk-critical/30 bg-risk-critical/10" :
    sev === "HIGH" ? "text-risk-high border-risk-high/30 bg-risk-high/10" :
    "text-risk-medium border-risk-medium/30 bg-risk-medium/10";
  return (
    <div className={`font-mono text-[13.5px] rounded-md border px-2.5 py-1.5 ${color}`}>
      {lib}@{version}
    </div>
  );
}
