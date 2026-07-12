"""
Core SBOM risk analysis engine.

Pipeline per dependency:
  1. Vulnerability matching  -> confirmed / potential CVE matches
  2. License compatibility   -> conflict / unknown / clean
  3. Maintenance freshness   -> unmaintained if last_updated > 2 years old
  4. Classification          -> single dominant risk_type (priority-ordered)
  5. Scoring                 -> 0-100 composite risk score

Then dependencies are rolled up into a per-application score and a
dependency graph (App -> direct libs -> transitive libs) is built with
networkx for visualization.
"""
from collections import defaultdict
from datetime import date

import networkx as nx
from packaging.version import InvalidVersion, Version

from .data_store import (
    REFERENCE_DATE,
    UNMAINTAINED_THRESHOLD_DAYS,
    store,
)

SEVERITY_WEIGHT = {"CRITICAL": 40, "HIGH": 28, "MEDIUM": 15, "LOW": 6, "NONE": 0}
SEVERITY_ORDER = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]
DEPTH_MULTIPLIER = {"direct": 1.0, "transitive": 0.7}
LICENSE_CONFLICT_PENALTY = {"CRITICAL": 35, "HIGH": 25, "MEDIUM": 8, "LOW": 0}
UNKNOWN_LICENSE_PENALTY = 20


def _parse_version(v):
    try:
        return Version(str(v))
    except InvalidVersion:
        return None


def match_vulnerabilities(library, version):
    """Return list of vulnerability matches with a confidence tier.

    CONFIRMED: dependency version exactly listed as affected, or is below
               the documented fixed_version.
    POTENTIAL: the library has a known CVE in the database but the exact
               version relationship couldn't be confirmed (kept visible so
               nothing is silently dropped -- these are the "review me"
               cases real scanners also surface).
    """
    entries = store.vuln_index.get(library.lower())
    if not entries:
        return []

    dv = _parse_version(version)
    matches = []
    for e in entries:
        affected = [a for a in (_parse_version(x) for x in e["affected_versions"]) if a]
        fixed = _parse_version(e["fixed_version"]) if e.get("fixed_version") else None

        confidence = "POTENTIAL"
        if dv is not None:
            if dv in affected:
                confidence = "CONFIRMED"
            elif fixed is not None and dv < fixed:
                confidence = "CONFIRMED"
            elif fixed is not None and dv >= fixed:
                # Patched build of an otherwise-vulnerable library; skip.
                continue

        matches.append({**e, "confidence": confidence})
    return matches


def check_license(license_name, app_license_model):
    """Classify a license into clean / conflict / unknown."""
    if not license_name or str(license_name).strip().upper() == "UNKNOWN":
        return {"status": "UNKNOWN", "risk_level": "HIGH", "rule": None}

    rule = store.license_index.get(license_name)
    if rule is None:
        return {"status": "UNKNOWN", "risk_level": "HIGH", "rule": None}

    is_conflict = bool(rule.get("viral")) and app_license_model == "proprietary"
    return {
        "status": "CONFLICT" if is_conflict else "CLEAN",
        "risk_level": rule["risk_level"],
        "rule": rule,
    }


def check_maintenance(last_updated: date):
    age_days = (REFERENCE_DATE - last_updated).days
    return {"age_days": age_days, "is_unmaintained": age_days > UNMAINTAINED_THRESHOLD_DAYS}


def classify_dependency(dep_type, vuln_matches, license_info, maintenance_info):
    """Priority-ordered single dominant classification, mirroring how a
    security team would triage: exploitable code risk first, then legal
    risk, then hygiene/maintenance risk."""
    has_vuln = len(vuln_matches) > 0

    if has_vuln and dep_type == "direct":
        return "VULNERABLE_DEPENDENCY"
    if has_vuln and dep_type == "transitive":
        return "TRANSITIVE_VULNERABILITY"

    if license_info["status"] == "CONFLICT" and dep_type == "direct":
        return "LICENSE_CONFLICT"
    if license_info["status"] == "CONFLICT" and dep_type == "transitive":
        return "TRANSITIVE_LICENSE_CONFLICT"

    if license_info["status"] == "UNKNOWN" and dep_type == "direct":
        return "LICENSE_UNKNOWN"

    if maintenance_info["is_unmaintained"]:
        return "UNMAINTAINED"

    return "NONE"


def score_dependency(dep_type, vuln_matches, license_info, maintenance_info):
    """Composite 0-100 risk score for a single dependency."""
    score = 0.0

    if vuln_matches:
        top_severity = max(vuln_matches, key=lambda m: SEVERITY_ORDER.index(m["severity"]))
        base = SEVERITY_WEIGHT[top_severity["severity"]]
        confidence_factor = 1.0 if any(m["confidence"] == "CONFIRMED" for m in vuln_matches) else 0.6
        score += base * DEPTH_MULTIPLIER[dep_type] * confidence_factor

    if license_info["status"] == "CONFLICT":
        score += LICENSE_CONFLICT_PENALTY.get(license_info["risk_level"], 10) * DEPTH_MULTIPLIER[dep_type]
    elif license_info["status"] == "UNKNOWN":
        score += UNKNOWN_LICENSE_PENALTY * DEPTH_MULTIPLIER[dep_type]

    if maintenance_info["is_unmaintained"]:
        age_factor = min(1.5, maintenance_info["age_days"] / UNMAINTAINED_THRESHOLD_DAYS)
        score += 12 * age_factor

    return round(min(100.0, score), 1)


def analyze_dependency_row(row):
    """Run the full pipeline on a single sbom_dependencies.csv row (a pandas Series)."""
    app = store.applications_by_id.get(row["application_id"], {})
    vuln_matches = match_vulnerabilities(row["library"], row["version"])
    license_info = check_license(row["license"], app.get("license_model"))
    maintenance_info = check_maintenance(row["last_updated"])
    risk_type = classify_dependency(row["dependency_type"], vuln_matches, license_info, maintenance_info)
    risk_score = score_dependency(row["dependency_type"], vuln_matches, license_info, maintenance_info)

    if risk_score >= 70:
        severity = "CRITICAL"
    elif risk_score >= 45:
        severity = "HIGH"
    elif risk_score >= 20:
        severity = "MEDIUM"
    elif risk_score > 0:
        severity = "LOW"
    else:
        severity = "NONE"

    return {
        "dep_id": row["dep_id"],
        "application_id": row["application_id"],
        "application_name": row["application_name"],
        "library": row["library"],
        "version": row["version"],
        "license": row["license"],
        "dependency_type": row["dependency_type"],
        "last_updated": str(row["last_updated"]),
        "age_days": maintenance_info["age_days"],
        "is_unmaintained": maintenance_info["is_unmaintained"],
        "vulnerabilities": [
            {
                "cve_id": m["cve_id"],
                "cvss_score": m["cvss_score"],
                "severity": m["severity"],
                "exploitability": m["exploitability"],
                "description": m["description"],
                "patch_available": m["patch_available"],
                "fixed_version": m.get("fixed_version"),
                "confidence": m["confidence"],
            }
            for m in vuln_matches
        ],
        "license_status": license_info["status"],
        "license_risk_level": license_info["risk_level"],
        "risk_type": risk_type,
        "risk_score": risk_score,
        "severity": severity,
        "is_risky": risk_type != "NONE",
    }


_analysis_cache = None


def get_all_dependency_analyses():
    """Analyze every row in the SBOM once and cache the result."""
    global _analysis_cache
    if _analysis_cache is None:
        _analysis_cache = [analyze_dependency_row(row) for _, row in store.sbom_df.iterrows()]
    return _analysis_cache


def get_dependencies_for_app(app_id):
    return [d for d in get_all_dependency_analyses() if d["application_id"] == app_id]


CRITICALITY_MULTIPLIER = {"CRITICAL": 1.15, "HIGH": 1.08, "MEDIUM": 1.0, "LOW": 0.95}


def compute_app_risk(app_id):
    deps = get_dependencies_for_app(app_id)
    if not deps:
        return {"risk_score": 0, "risk_tier": "LOW", "counts": {}}

    # Blend overall exposure (mean across every dependency, direct + transitive)
    # with the severity of the worst few findings (mean of top 5), then adjust
    # for business criticality -- a CRITICAL app carries more real-world impact
    # for the same underlying findings than a LOW one.
    scores = [d["risk_score"] for d in deps]
    mean_all = sum(scores) / len(scores)
    top5 = sorted(scores, reverse=True)[:5]
    mean_top5 = sum(top5) / len(top5)
    blend = 0.35 * mean_all + 0.65 * mean_top5

    app = store.applications_by_id.get(app_id, {})
    multiplier = CRITICALITY_MULTIPLIER.get(app.get("criticality"), 1.0)

    total = round(min(100, blend * multiplier), 1)

    if total >= 65:
        tier = "CRITICAL"
    elif total >= 42:
        tier = "HIGH"
    elif total >= 25:
        tier = "MEDIUM"
    else:
        tier = "LOW"

    counts = defaultdict(int)
    for d in deps:
        counts[d["risk_type"]] += 1

    return {
        "risk_score": total,
        "risk_tier": tier,
        "total_dependencies": len(deps),
        "vulnerable_count": counts["VULNERABLE_DEPENDENCY"] + counts["TRANSITIVE_VULNERABILITY"],
        "license_conflict_count": counts["LICENSE_CONFLICT"] + counts["TRANSITIVE_LICENSE_CONFLICT"],
        "license_unknown_count": counts["LICENSE_UNKNOWN"],
        "unmaintained_count": counts["UNMAINTAINED"],
        "clean_count": counts["NONE"],
        "counts_by_type": dict(counts),
    }


def get_application_summaries():
    """One row per application: metadata + rolled-up risk score, sorted riskiest-first."""
    results = []
    for app in store.applications:
        risk = compute_app_risk(app["app_id"])
        results.append({**app, **risk})
    results.sort(key=lambda a: a["risk_score"], reverse=True)
    for i, r in enumerate(results, start=1):
        r["rank"] = i
    return results


def get_org_summary():
    apps = get_application_summaries()
    all_deps = get_all_dependency_analyses()
    total_vuln = sum(1 for d in all_deps if "VULNERABLE" in d["risk_type"])
    total_license = sum(1 for d in all_deps if "LICENSE_CONFLICT" in d["risk_type"])
    total_unknown_license = sum(1 for d in all_deps if d["risk_type"] == "LICENSE_UNKNOWN")
    total_unmaintained = sum(1 for d in all_deps if d["risk_type"] == "UNMAINTAINED")
    total_clean = sum(1 for d in all_deps if d["risk_type"] == "NONE")

    return {
        "total_applications": len(apps),
        "total_dependencies": len(all_deps),
        "total_vulnerable": total_vuln,
        "total_license_conflicts": total_license,
        "total_license_unknown": total_unknown_license,
        "total_unmaintained": total_unmaintained,
        "total_clean": total_clean,
        "critical_apps": sum(1 for a in apps if a["risk_tier"] == "CRITICAL"),
        "high_apps": sum(1 for a in apps if a["risk_tier"] == "HIGH"),
        "top_risk_apps": apps[:5],
    }


# ---------------------------------------------------------------------------
# Dependency graph construction
# ---------------------------------------------------------------------------

def _resolve_transitive_chain(app_id, parent_library, parent_version, visited):
    """Recursively resolve nested transitive children for one direct dependency."""
    children = []
    key = (app_id, parent_library, parent_version)
    for edge in store.transitive_index.get(key, []):
        child_key = (edge["child_library"], edge["child_version"])
        if child_key in visited:
            continue
        visited.add(child_key)
        children.append(edge)
        children.extend(
            _resolve_transitive_chain(app_id, edge["child_library"], edge["child_version"], visited)
        )
    return children


def build_dependency_graph(app_id):
    """Build a networkx DiGraph: application root -> direct deps -> transitive deps."""
    app = store.applications_by_id.get(app_id)
    if app is None:
        return None

    deps_by_key = {(d["library"], d["version"]): d for d in get_dependencies_for_app(app_id)}

    g = nx.DiGraph()
    root_id = f"APP::{app_id}"
    g.add_node(
        root_id,
        node_type="root",
        label=app["name"],
        risk_type="ROOT",
        severity="NONE",
    )

    direct_rows = store.sbom_df[
        (store.sbom_df["application_id"] == app_id) & (store.sbom_df["dependency_type"] == "direct")
    ]

    for _, row in direct_rows.iterrows():
        dep = deps_by_key.get((row["library"], row["version"]))
        node_id = f"{row['library']}@{row['version']}"
        if not g.has_node(node_id):
            g.add_node(
                node_id,
                node_type="direct",
                label=row["library"],
                version=row["version"],
                risk_type=dep["risk_type"] if dep else "NONE",
                severity=dep["severity"] if dep else "NONE",
                license=row["license"],
                cve_count=len(dep["vulnerabilities"]) if dep else 0,
                risk_score=dep["risk_score"] if dep else 0,
            )
        g.add_edge(root_id, node_id)

        visited = {(row["library"], row["version"])}
        chain = _resolve_transitive_chain(app_id, row["library"], row["version"], visited)
        for edge in chain:
            parent_id = f"{edge['parent_library']}@{edge['parent_version']}"
            child_id = f"{edge['child_library']}@{edge['child_version']}"
            child_dep = deps_by_key.get((edge["child_library"], edge["child_version"]))
            if not g.has_node(child_id):
                g.add_node(
                    child_id,
                    node_type="transitive",
                    label=edge["child_library"],
                    version=edge["child_version"],
                    risk_type=child_dep["risk_type"] if child_dep else "NONE",
                    severity=child_dep["severity"] if child_dep else "NONE",
                    license=child_dep["license"] if child_dep else None,
                    cve_count=len(child_dep["vulnerabilities"]) if child_dep else 0,
                    risk_score=child_dep["risk_score"] if child_dep else 0,
                )
            if not g.has_edge(parent_id, child_id):
                g.add_edge(parent_id, child_id)

    return g


def graph_to_json(g):
    nodes = []
    for node_id, attrs in g.nodes(data=True):
        nodes.append({"id": node_id, **attrs})
    edges = [{"source": u, "target": v} for u, v in g.edges()]
    return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Self-evaluation against provided ground-truth labels
# ---------------------------------------------------------------------------

def compute_self_evaluation():
    if store.labels_df is None:
        return None

    all_deps = {d["dep_id"]: d for d in get_all_dependency_analyses()}

    categories = {
        "VULNERABLE": lambda rt: "VULNERABLE" in rt,
        "LICENSE_CONFLICT": lambda rt: "LICENSE_CONFLICT" in rt,
        "UNMAINTAINED": lambda rt: rt == "UNMAINTAINED",
        "OVERALL_RISKY": lambda rt: rt != "NONE",
    }

    results = {}
    for cat_name, matcher in categories.items():
        tp = fp = fn = tn = 0
        for _, row in store.labels_df.iterrows():
            truth = matcher(row["risk_type"])
            pred_row = all_deps.get(row["dep_id"])
            pred = matcher(pred_row["risk_type"]) if pred_row else False
            if pred and truth:
                tp += 1
            elif pred and not truth:
                fp += 1
            elif not pred and truth:
                fn += 1
            else:
                tn += 1

        precision = tp / (tp + fp) if (tp + fp) else 0
        recall = tp / (tp + fn) if (tp + fn) else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0
        fp_rate = fp / (fp + tn) if (fp + tn) else 0

        results[cat_name] = {
            "true_positive": tp,
            "false_positive": fp,
            "false_negative": fn,
            "true_negative": tn,
            "precision": round(precision * 100, 1),
            "recall": round(recall * 100, 1),
            "f1_score": round(f1 * 100, 1),
            "false_positive_rate": round(fp_rate * 100, 1),
        }

    return results
