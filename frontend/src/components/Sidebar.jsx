import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, LogOut, Radar, FileBarChart2, Eye } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, adminOnly: false },
  { to: "/analyzer", label: "SBOM Analyzer", icon: Radar, adminOnly: true },
  { to: "/evaluation", label: "Detection Accuracy", icon: FileBarChart2, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.access_level === "admin";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="w-64 shrink-0 border-r border-ink-700 bg-ink-950/60 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 flex items-center gap-2 border-b border-ink-700">
        <Logo size="xs" />
        <div>
          <div className="font-display font-semibold text-base leading-none text-white">SentryChain</div>
          <div className="text-sm text-ink-500 mt-1 font-mono">SBOM RISK ENGINE</div>
        </div>
      </div>

      {!isAdmin && (
        <div className="mx-3 mt-4 flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-800/60 px-3 py-2 text-sm text-ink-500">
          <Eye size={14} />
          Read-only viewer access
        </div>
      )}

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems
          .filter((item) => isAdmin || !item.adminOnly)
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                  isActive
                    ? "bg-signal-teal/10 text-signal-teal border border-signal-teal/25"
                    : "text-ink-500 hover:text-slate-200 hover:bg-ink-800 border border-transparent"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
      </nav>

      <div className="px-4 py-4 border-t border-ink-700">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-base font-semibold text-slate-200">
            {user?.name?.[0] ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base text-slate-100 truncate">{user?.name}</div>
            <div className="text-sm text-ink-500 truncate">{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="text-ink-500 hover:text-risk-critical transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
