"""Red team report builders.

build_run_summary: short executive summary stored on the run.
build_full_report: full org-consumable markdown report (stats, per-class
breakdown, ranked findings with reproduction prompts).
"""

from typing import List

from app.redteam.attacks import BENIGN_OUTCOME, MALICIOUS_OUTCOME
from app.storage.redteam_models import RedTeamCase, RedTeamFinding, RedTeamRun


def build_run_summary(run: RedTeamRun, cases: List[RedTeamCase], findings: List[RedTeamFinding]) -> str:
    """Short executive summary persisted on the run row."""
    m = run.metrics or {}
    lines = [
        f"Red team run #{run.id} ({run.mode} mode) completed: "
        f"{m.get('detected', 0)}/{m.get('malicious_cases', 0)} attacks detected "
        f"(detection rate {m.get('detection_rate', 0.0):.1%}), "
        f"{m.get('evaded', 0)} evasions, "
        f"{m.get('false_positives', 0)} false positives, "
        f"{len(findings)} findings.",
    ]
    if findings:
        top = ", ".join(f"{f.severity} {f.finding_type}: {f.title}" for f in findings[:3])
        lines.append(f"Top findings: {top}.")
    return " ".join(lines)


def build_full_report(run: RedTeamRun, cases: List[RedTeamCase], findings: List[RedTeamFinding]) -> str:
    """Full markdown report for the report endpoint."""
    m = run.metrics or {}
    lines = [
        f"# Red Team Report — {run.name}",
        "",
        f"- Run: #{run.id} · mode `{run.mode}` · status `{run.status}`",
        f"- Started: {run.started_at.isoformat() if run.started_at else 'n/a'}",
        f"- Duration: {run.duration_ms} ms · tokens: {run.tokens_used}",
        "",
        "## Summary",
        "",
        f"| Metric | Value |",
        f"| --- | --- |",
        f"| Total cases | {m.get('total_cases', 0)} |",
        f"| Malicious cases | {m.get('malicious_cases', 0)} |",
        f"| Benign controls | {m.get('benign_cases', 0)} |",
        f"| Detected | {m.get('detected', 0)} |",
        f"| Evaded | {m.get('evaded', 0)} |",
        f"| Detection rate | {m.get('detection_rate', 0.0):.1%} |",
        f"| False positives | {m.get('false_positives', 0)} ({m.get('false_positive_rate', 0.0):.1%}) |",
        "",
        "## Detection rate by attack class",
        "",
        "| Attack class | Total | Detected | Rate |",
        "| --- | --- | --- | --- |",
    ]
    per_class = m.get("per_class", {})
    for cls, bucket in per_class.items():
        lines.append(
            f"| {cls} | {bucket['total']} | {bucket['detected']} | {bucket['detection_rate']:.1%} |"
        )
    lines += ["", "## Decisions", ""]
    for decision, count in (m.get("decisions", {}) or {}).items():
        lines.append(f"- {decision}: {count}")

    lines += ["", "## Findings", ""]
    if not findings:
        lines.append("_No findings — clean run._")
    for f in findings:
        case = next((c for c in cases if c.id == f.case_id), None)
        lines += [
            f"### [{f.severity.upper()}] {f.title}",
            f"- Type: {f.finding_type} · status: {f.status}",
            f"- {f.summary or ''}",
        ]
        if case and case.expected_outcome == MALICIOUS_OUTCOME:
            lines += ["- Reproduction prompt:"]
            lines += ["```", case.prompt, "```"]
        lines.append("")

    return "\n".join(lines)