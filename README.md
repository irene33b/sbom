# SentryChain — Software Supply Chain Risk Analyzer

Built for **Problem Statement 10: Software Supply Chain Risk Scorer (SBOM Analyzer)**,
Option B (Graph-Based Dependency Analysis).

A full-stack web app that ingests SBOM data, resolves transitive dependency
chains, cross-references CVEs and license terms, flags unmaintained
libraries, and ranks applications by composite supply chain risk — with a
legible, zoomable dependency graph and downloadable PDF reports.

---

## 1. What's inside

```
sbom-analyzer/
├── backend/                 FastAPI service + risk engine
│   ├── app/
│   │   ├── main.py          API routes
│   │   ├── auth.py          JWT login (demo users)
│   │   ├── data_store.py    Loads sample_data/ once at startup
│   │   ├── engine.py        Vulnerability/license/maintenance analysis, scoring, graph building
│   │   └── reports.py       PDF report generation (reportlab)
│   ├── data/                Copies of the provided sample_data files
│   └── requirements.txt
└── frontend/                React + Vite + Tailwind SPA
    └── src/
        ├── pages/           Login, Home, Dashboard, Analyzer, AppDetail, Evaluation
        ├── components/      Sidebar, DependencyGraph (React Flow), RiskBadge, etc.
        └── api/client.js    Axios client
```

## 2. Tools, frameworks & libraries used

**Backend**
- **FastAPI** — REST API framework
- **Uvicorn** — ASGI server
- **pandas** — SBOM CSV loading/wrangling
- **NetworkX** — dependency graph construction (direct → transitive resolution)
- **packaging** — semantic version comparison for CVE matching
- **python-jose** + **bcrypt** — JWT auth, password hashing
- **ReportLab** — PDF report generation

**Frontend** (no Streamlit, as requested — a real product-grade SPA)
- **React 18 + Vite** — app shell/build tooling
- **React Router** — client-side routing (login, dashboard, analyzer, app detail, evaluation)
- **Tailwind CSS** — design system (custom dark theme, see `tailwind.config.js`)
- **React Flow** + **dagre** — the dependency graph: auto-layout hierarchical graph, zoom/pan/minimap, click-to-inspect nodes
- **Recharts** — precision/recall charts on the Detection Accuracy page
- **lucide-react** — icon set
- **Axios** — API client with JWT interceptor

## 3. Running it locally

### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8000
```
API will be live at `http://localhost:8000` (interactive docs at `/docs`).

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App will be live at `http://localhost:5173`. It talks to the backend at
`http://localhost:8000` by default — change this via the `VITE_API_BASE`
value in `frontend/.env` if you deploy the backend elsewhere.

### Demo login
| Username | Password  | Access level | What they can do |
|----------|-----------|--------------|-------------------|
| admin    | admin123  | Admin (Security Lead) | Full access: Overview, SBOM Analyzer (graph + table + node inspector), Detection Accuracy, and all report downloads |
| demo     | demo123   | Viewer                | **Overview only** — org summary and the ranked application table. The SBOM Analyzer, Detection Accuracy, and every report-download endpoint are hidden from the nav and blocked server-side (403) even if called directly |

> Role enforcement isn't just hidden buttons — `backend/app/auth.py` has a
> `require_admin` dependency applied to every drill-down/report endpoint, so
> a Viewer token gets a real 403 even calling the API directly, not just a
> disabled button in the UI.

> This is a hackathon-scope demo auth (in-memory users, bcrypt-hashed,
> signed JWTs) — swap `USERS` in `backend/app/auth.py` for a real identity
> provider before using this outside a demo.

## 4. How the risk engine works

For every one of the 500 dependencies across the 10 applications:

1. **Vulnerability matching** — library name matched against
   `vulnerability_db.json`; a version is marked `CONFIRMED` if it exactly
   matches a listed affected version or sits below the documented
   `fixed_version`, otherwise `POTENTIAL` (kept visible rather than
   silently dropped, the same way real scanners surface "needs review"
   cases).
2. **License check** — flags a `CONFLICT` when a viral license (GPL/AGPL/
   SSPL, per `license_rules.json`) appears in a `proprietary`-model
   application (internal-only apps are exempted, matching the "GPL in an
   internal tool" edge case from the problem statement); flags `UNKNOWN`
   when no license is declared.
3. **Maintenance check** — a library is `UNMAINTAINED` if its
   `last_updated` is more than 2 years before the dataset's reference date.
4. **Classification** — one dominant `risk_type` per dependency, priority
   ordered: vulnerable (direct > transitive) → license conflict (direct >
   transitive) → unknown license → unmaintained → clean.
5. **Scoring** — a 0–100 composite score per dependency (CVSS-weighted,
   discounted for transitive depth, plus license/maintenance penalties),
   rolled up per application as a blend of overall exposure (mean across
   all dependencies) and worst-case severity (mean of the top 5 scores),
   adjusted by business criticality.
6. **Graph** — `NetworkX` builds a per-application `DiGraph` (root →
   direct → transitive, recursively resolved, deduplicated for diamond
   dependencies), which the frontend lays out with `dagre` into a clean
   left-to-right hierarchy.

The **Detection Accuracy** page in the app benchmarks all of this against
`dependency_labels.csv` live (precision/recall/F1/false-positive rate per
category) — this satisfies the "Self-Evaluation" section of the problem
statement transparently rather than just asserting numbers in a slide.

## 5. Notable design decisions worth mentioning to judges

- The **dependency graph is deliberately hierarchical (dagre), not a force
  blob** — for 50+ dependencies per app, a force-directed layout gets
  unreadable fast. A left-to-right tree keeps direct vs. transitive depth
  visually obvious and lets you follow an exact attack chain (App → A → B
  → vulnerable C).
- **Confidence tiers on CVE matches** (`CONFIRMED` vs `POTENTIAL`) instead
  of a binary yes/no — real vulnerability scanners always have some
  version-matching ambiguity, and hiding that would overstate precision.
- **Business criticality multiplier** on the app risk score — the same
  finding is a bigger deal on a `CRITICAL` payment service than an
  internal dev toolkit, which is closer to how a real risk register works.
