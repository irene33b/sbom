"""Generates downloadable PDF risk reports using reportlab."""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from . import engine

NAVY = colors.HexColor("#0B1220")
SLATE = colors.HexColor("#334155")
ACCENT = colors.HexColor("#0EA5A4")
CRITICAL_C = colors.HexColor("#DC2626")
HIGH_C = colors.HexColor("#EA580C")
MEDIUM_C = colors.HexColor("#D97706")
LOW_C = colors.HexColor("#65A30D")
NONE_C = colors.HexColor("#94A3B8")

SEVERITY_COLOR = {
    "CRITICAL": CRITICAL_C,
    "HIGH": HIGH_C,
    "MEDIUM": MEDIUM_C,
    "LOW": LOW_C,
    "NONE": NONE_C,
}

styles = getSampleStyleSheet()
title_style = ParagraphStyle("TitleX", parent=styles["Title"], textColor=NAVY, fontSize=22, spaceAfter=4)
h2_style = ParagraphStyle("H2", parent=styles["Heading2"], textColor=NAVY, fontSize=14, spaceBefore=16, spaceAfter=8)
body_style = ParagraphStyle("BodyX", parent=styles["BodyText"], textColor=SLATE, fontSize=9.5, leading=13)
small_style = ParagraphStyle("SmallX", parent=styles["BodyText"], textColor=SLATE, fontSize=8, leading=11)
label_style = ParagraphStyle("LabelX", parent=styles["BodyText"], textColor=colors.white, fontSize=9, leading=12)


def _severity_tag(severity):
    color = SEVERITY_COLOR.get(severity, NONE_C)
    return Table(
        [[Paragraph(severity, ParagraphStyle("tag", parent=label_style, alignment=1))]],
        colWidths=[0.85 * inch],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        ),
    )


def _header_footer(canvas, doc, app_name=None):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, letter[1] - 0.55 * inch, letter[0], 0.55 * inch, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 11)
    canvas.drawString(0.6 * inch, letter[1] - 0.37 * inch, "SentryChain  |  Software Supply Chain Risk Report")
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#94A3B8"))
    canvas.drawRightString(letter[0] - 0.6 * inch, 0.35 * inch, f"Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    canvas.drawString(0.6 * inch, 0.35 * inch, f"Page {doc.page}")
    canvas.restoreState()


def _findings_table(deps, limit=None):
    rows = [["Library", "Version", "Type", "Risk", "Score", "Finding"]]
    sorted_deps = sorted(deps, key=lambda d: d["risk_score"], reverse=True)
    if limit:
        sorted_deps = sorted_deps[:limit]
    for d in sorted_deps:
        finding = d["risk_type"].replace("_", " ").title()
        rows.append(
            [
                Paragraph(d["library"], small_style),
                d["version"],
                d["dependency_type"],
                d["severity"],
                str(d["risk_score"]),
                Paragraph(finding, small_style),
            ]
        )
    t = Table(rows, colWidths=[1.3 * inch, 0.75 * inch, 0.7 * inch, 0.6 * inch, 0.5 * inch, 1.85 * inch], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    for i, d in enumerate(sorted_deps, start=1):
        color = SEVERITY_COLOR.get(d["severity"], NONE_C)
        style.append(("TEXTCOLOR", (3, i), (3, i), color))
        style.append(("FONTNAME", (3, i), (3, i), "Helvetica-Bold"))
    t.setStyle(TableStyle(style))
    return t


def generate_app_report(app_id: str) -> bytes:
    app = engine.store.applications_by_id[app_id]
    risk = engine.compute_app_risk(app_id)
    deps = engine.get_dependencies_for_app(app_id)
    risky_deps = [d for d in deps if d["is_risky"]]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter, topMargin=0.85 * inch, bottomMargin=0.7 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch
    )
    story = []

    story.append(Paragraph(app["name"], title_style))
    story.append(
        Paragraph(
            f"App ID {app['app_id']} &nbsp;|&nbsp; {app['language']} &nbsp;|&nbsp; "
            f"{app['deployment']} deployment &nbsp;|&nbsp; Owner: {app['business_owner']} ({app['department']})",
            body_style,
        )
    )
    story.append(Spacer(1, 10))

    summary_rows = [
        ["Risk Score", "Risk Tier", "Business Criticality", "Total Dependencies"],
        [str(risk["risk_score"]), risk["risk_tier"], app["criticality"], str(risk["total_dependencies"])],
    ]
    summary_table = Table(summary_rows, colWidths=[1.7 * inch] * 4)
    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("TEXTCOLOR", (0, 1), (0, 1), SEVERITY_COLOR.get(risk["risk_tier"], NAVY)),
                ("FONTNAME", (0, 1), (1, 1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 1), (1, 1), 14),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Risk Breakdown", h2_style))
    breakdown_rows = [
        ["Category", "Count"],
        ["Vulnerable dependencies (direct + transitive)", str(risk["vulnerable_count"])],
        ["License conflicts", str(risk["license_conflict_count"])],
        ["Unknown / undeclared licenses", str(risk["license_unknown_count"])],
        ["Unmaintained libraries (2+ years stale)", str(risk["unmaintained_count"])],
        ["Clean dependencies", str(risk["clean_count"])],
    ]
    bt = Table(breakdown_rows, colWidths=[4.5 * inch, 1.5 * inch])
    bt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(bt)
    story.append(Spacer(1, 14))

    story.append(Paragraph(f"Remediation Priorities ({len(risky_deps)} flagged dependencies)", h2_style))
    story.append(Paragraph("Sorted by composite risk score, worst first.", small_style))
    story.append(Spacer(1, 6))
    story.append(_findings_table(risky_deps))

    story.append(PageBreak())
    story.append(Paragraph("Detailed CVE Findings", h2_style))
    cve_deps = [d for d in risky_deps if d["vulnerabilities"]]
    if not cve_deps:
        story.append(Paragraph("No CVE matches for this application.", body_style))
    for d in sorted(cve_deps, key=lambda x: x["risk_score"], reverse=True):
        block = [
            Paragraph(f"<b>{d['library']}</b> {d['version']}  ({d['dependency_type']})", body_style),
        ]
        for v in d["vulnerabilities"]:
            patch = f"Patch available: upgrade to {v['fixed_version']}" if v["patch_available"] else "No patch available yet"
            block.append(
                Paragraph(
                    f"&bull; <b>{v['cve_id']}</b> — CVSS {v['cvss_score']} ({v['severity']}), "
                    f"exploitability {v['exploitability']}, confidence {v['confidence']}. {patch}.<br/>"
                    f"<i>{v['description']}</i>",
                    small_style,
                )
            )
        block.append(Spacer(1, 8))
        story.append(KeepTogether(block))

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()


def generate_org_report() -> bytes:
    apps = engine.get_application_summaries()
    org = engine.get_org_summary()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter, topMargin=0.85 * inch, bottomMargin=0.7 * inch, leftMargin=0.6 * inch, rightMargin=0.6 * inch
    )
    story = []
    story.append(Paragraph("Software Supply Chain Risk Report", title_style))
    story.append(Paragraph("Organization-wide summary across all tracked applications.", body_style))
    story.append(Spacer(1, 10))

    stats_rows = [
        ["Applications", "Dependencies", "Vulnerable", "License Issues", "Unmaintained"],
        [
            str(org["total_applications"]),
            str(org["total_dependencies"]),
            str(org["total_vulnerable"]),
            str(org["total_license_conflicts"] + org["total_license_unknown"]),
            str(org["total_unmaintained"]),
        ],
    ]
    st = Table(stats_rows, colWidths=[1.9 * inch] * 5)
    st.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 1), (-1, 1), 15),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(st)
    story.append(Spacer(1, 16))

    story.append(Paragraph("Applications Ranked by Risk", h2_style))
    rows = [["Rank", "Application", "Criticality", "Risk Score", "Tier", "Vulnerable", "License", "Unmaintained"]]
    for a in apps:
        rows.append(
            [
                str(a["rank"]),
                a["name"],
                a["criticality"],
                str(a["risk_score"]),
                a["risk_tier"],
                str(a["vulnerable_count"]),
                str(a["license_conflict_count"] + a["license_unknown_count"]),
                str(a["unmaintained_count"]),
            ]
        )
    at = Table(rows, colWidths=[0.4 * inch, 1.4 * inch, 0.8 * inch, 0.7 * inch, 0.7 * inch, 0.8 * inch, 0.6 * inch, 0.9 * inch], repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ("ALIGN", (3, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for i, a in enumerate(apps, start=1):
        style.append(("TEXTCOLOR", (4, i), (4, i), SEVERITY_COLOR.get(a["risk_tier"], NAVY)))
        style.append(("FONTNAME", (4, i), (4, i), "Helvetica-Bold"))
    at.setStyle(TableStyle(style))
    story.append(at)

    doc.build(story, onFirstPage=_header_footer, onLaterPages=_header_footer)
    return buf.getvalue()
