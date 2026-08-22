"""Red team pipeline executor.

Evaluates attack cases through the exact same detector -> aggregator ->
reasoner -> policy -> action path that POST /analyze uses (local path),
so results reflect production behavior. Write path persists runs, cases,
and findings per org.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.config.risk_config import ALLOW_MAX, WARN_MIN, BLOCK_MIN, ESCALATE_MIN
from app.signals.registry import build_default_registry
from app.scoring.aggregator import aggregate_risk_signals
from app.agent.reasoner import RiskReasoner
from app.policy.engine import PolicyEngine
from app.actions.executor import ActionExecutor
from app.services.llm_service import estimate_tokens
from app.redteam.attacks import (
    ATTACK_CASES,
    BENIGN_CONTROLS,
    MALICIOUS_OUTCOME,
    BENIGN_OUTCOME,
)
from app.redteam.mutator import attempt_mutations, DEFAULT_MAX_MUTATION_ROUNDS, DEFAULT_MAX_LLM_CALLS
from app.redteam.report import build_run_summary
from app.storage.redteam_models import RedTeamRun, RedTeamCase, RedTeamFinding

DEFAULT_MAX_CASES = 100

# Attack classes whose evasion is always a high-severity finding
HIGH_RISK_CLASSES = {"harmful_content", "pii_exfiltration"}

signal_registry = build_default_registry()
risk_reasoner = RiskReasoner()
policy_engine = PolicyEngine()
action_executor = ActionExecutor()


def evaluate_pair(prompt: str, response: str) -> Dict:
    """Run one prompt+response pair through the production local path."""
    prompt_signals = signal_registry.run_detectors("prompt", prompt=prompt)
    output_signals = signal_registry.run_detectors("output", text=response)

    prompt_anomaly_result = prompt_signals.get("prompt_anomaly", {})
    jailbreak_result = prompt_signals.get("jailbreak_rag", {})
    output_risk_result = output_signals.get("output_risk", {})

    detector_hits = {
        "prompt_anomaly": prompt_anomaly_result.get("is_anomalous") is True,
        "jailbreak_rag": jailbreak_result.get("jailbreak_detected") is True,
        "output_risk": "unsafe_output" in output_risk_result.get("flags", []),
    }

    aggregated_result = aggregate_risk_signals(
        prompt_signals={"present": detector_hits["prompt_anomaly"]},
        jailbreak_signals={"present": detector_hits["jailbreak_rag"]},
        output_signals={
            "present": detector_hits["output_risk"],
            "flags": output_risk_result.get("flags", []),
        },
    )

    risk_summary = risk_reasoner.analyze_aggregated_result(
        final_risk_score=aggregated_result["final_score"],
        flags=aggregated_result["flags"],
        confidence=aggregated_result.get("confidence", 1.0),
    )

    policy_decision = policy_engine.evaluate(risk_summary)
    action_executor.execute(policy_decision)

    final_risk_score = aggregated_result["final_score"]
    if final_risk_score <= 0:
        decision_scores = {
            "allow": ALLOW_MAX,
            "warn": (WARN_MIN + BLOCK_MIN) / 2,
            "block": (BLOCK_MIN + ESCALATE_MIN) / 2,
            "escalate": ESCALATE_MIN,
        }
        final_risk_score = decision_scores.get(
            policy_decision.action.value.lower(), ALLOW_MAX
        )

    return {
        "decision": policy_decision.action.value,
        "risk_score": int(final_risk_score),
        "confidence": aggregated_result.get("confidence", 1.0),
        "flags": aggregated_result["flags"],
        "detector_hits": detector_hits,
    }


def _build_cases(classes: Optional[List[str]], max_cases: int) -> List[Dict]:
    """Flatten the corpus into case dicts, capped at max_cases."""
    if classes is None:
        classes = list(ATTACK_CASES.keys())
    unknown = set(classes) - set(ATTACK_CASES.keys())
    if unknown:
        raise ValueError(f"Unknown attack classes: {sorted(unknown)}")

    cases: List[Dict] = []
    for cls in classes:
        for technique, prompt, response in ATTACK_CASES[cls]:
            cases.append({
                "attack_class": cls,
                "technique": technique,
                "prompt": prompt,
                "response": response,
                "expected_outcome": MALICIOUS_OUTCOME,
            })
    for technique, prompt, response in BENIGN_CONTROLS:
        cases.append({
            "attack_class": "benign_control",
            "technique": technique,
            "prompt": prompt,
            "response": response,
            "expected_outcome": BENIGN_OUTCOME,
        })
    return cases[:max_cases]


def _finding_for_case(case: RedTeamCase, result: Dict) -> Optional[RedTeamFinding]:
    """Create a finding for an evasion or a false positive, else None."""
    if case.expected_outcome == MALICIOUS_OUTCOME and not any(result["detector_hits"].values()):
        severity = (
            "high" if case.attack_class in HIGH_RISK_CLASSES else "medium"
        )
        return RedTeamFinding(
            run_id=case.run_id,
            case_id=case.id,
            finding_type="evasion",
            severity=severity,
            title=f"Evasion: {case.attack_class} / {case.technique}",
            summary=(
                f"The '{case.attack_class}' attack ({case.technique}) was not "
                f"detected by any detector (decision={result['decision']})."
            ),
            recommended_action=(
                "Add a detection pattern for this technique and re-run the "
                "evaluation."
            ),
        )
    if case.expected_outcome == BENIGN_OUTCOME and (
        any(result["detector_hits"].values())
        or result["decision"].lower() in ("warn", "block", "escalate")
    ):
        return RedTeamFinding(
            run_id=case.run_id,
            case_id=case.id,
            finding_type="false_positive",
            severity="medium",
            title=f"False positive: {case.technique}",
            summary=(
                f"A benign prompt ({case.technique}) was flagged as risky "
                f"(decision={result['decision']}, hits={result['detector_hits']})."
            ),
            recommended_action="Review the triggering detector and its thresholds.",
        )
    return None


def _compute_metrics(cases: List[RedTeamCase]) -> Dict:
    """Detection/evasion/FP metrics across cases."""
    total = len(cases)
    malicious = [c for c in cases if c.expected_outcome == MALICIOUS_OUTCOME]
    benign = [c for c in cases if c.expected_outcome == BENIGN_OUTCOME]

    detected = sum(1 for c in malicious if c.detected)
    evaded = len(malicious) - detected
    fp = sum(1 for c in benign if c.detected)
    mutated_cases = sum(1 for c in malicious if c.mutation_rounds > 0)

    per_class: Dict[str, Dict] = {}
    for c in malicious:
        bucket = per_class.setdefault(c.attack_class, {"total": 0, "detected": 0})
        bucket["total"] += 1
        if c.detected:
            bucket["detected"] += 1
    for cls, bucket in per_class.items():
        bucket["detection_rate"] = round(bucket["detected"] / bucket["total"], 3)

    decisions: Dict[str, int] = {}
    for c in cases:
        decisions[c.decision] = decisions.get(c.decision, 0) + 1

    return {
        "total_cases": total,
        "malicious_cases": len(malicious),
        "benign_cases": len(benign),
        "detected": detected,
        "evaded": evaded,
        "detection_rate": round(detected / len(malicious), 3) if malicious else 0.0,
        "evasion_rate": round(evaded / len(malicious), 3) if malicious else 0.0,
        "false_positives": fp,
        "false_positive_rate": round(fp / len(benign), 3) if benign else 0.0,
        "per_class": per_class,
        "decisions": decisions,
        "mutated_cases": mutated_cases,
    }


def execute_run(
    db: Session,
    org_id: int,
    created_by: Optional[int] = None,
    name: str = "Red team evaluation",
    classes: Optional[List[str]] = None,
    max_cases: int = DEFAULT_MAX_CASES,
    config: Optional[Dict] = None,
) -> RedTeamRun:
    """Create and execute a pipeline-mode red team run for an org."""
    started = datetime.now(timezone.utc)
    config = config or {}
    config.setdefault("llm_enabled", True)
    config.setdefault("max_mutation_rounds", DEFAULT_MAX_MUTATION_ROUNDS)
    config.setdefault("max_llm_calls", DEFAULT_MAX_LLM_CALLS)
    run = RedTeamRun(
        org_id=org_id,
        name=name,
        mode="pipeline",
        status="RUNNING",
        config=config,
        attack_classes=classes or list(ATTACK_CASES.keys()),
        created_by=created_by,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    tokens_used = 0
    persisted: List[RedTeamCase] = []
    findings: List[RedTeamFinding] = []
    llm_budget = [config.get("max_llm_calls", DEFAULT_MAX_LLM_CALLS)]
    try:
        for spec in _build_cases(classes, max_cases):
            result = evaluate_pair(spec["prompt"], spec["response"])
            case_tokens = estimate_tokens(spec["prompt"]) + estimate_tokens(spec["response"])

            final_prompt = spec["prompt"]
            mutation_rounds = 0
            if (
                config.get("llm_enabled", True)
                and spec["expected_outcome"] == MALICIOUS_OUTCOME
                and not any(result["detector_hits"].values())
            ):
                mutation = attempt_mutations(
                    attack_class=spec["attack_class"],
                    technique=spec["technique"],
                    prompt=spec["prompt"],
                    evaluate=evaluate_pair,
                    max_rounds=config.get("max_mutation_rounds", DEFAULT_MAX_MUTATION_ROUNDS),
                    llm_budget=llm_budget,
                )
                final_prompt = mutation["final_prompt"]
                mutation_rounds = mutation["mutation_rounds"]
                case_tokens += mutation["tokens_used"]
                if mutation["detected"]:
                    result = evaluate_pair(final_prompt, "")
                    case_tokens += estimate_tokens(final_prompt)

            case = RedTeamCase(
                run_id=run.id,
                org_id=org_id,
                attack_class=spec["attack_class"],
                technique=spec["technique"],
                prompt=spec["prompt"],
                final_prompt=final_prompt,
                expected_outcome=spec["expected_outcome"],
                detected=any(result["detector_hits"].values()),
                decision=result["decision"],
                risk_score=result["risk_score"],
                confidence=result["confidence"],
                detector_hits=result["detector_hits"],
                mutation_rounds=mutation_rounds,
                tokens_used=case_tokens,
            )
            tokens_used += case_tokens
            db.add(case)
            db.flush()
            persisted.append(case)

            finding = _finding_for_case(case, result)
            if finding:
                db.add(finding)
                findings.append(finding)

        metrics = _compute_metrics(persisted)
        duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        run.duration_ms = duration_ms
        run.tokens_used = tokens_used
        run.metrics = metrics
        run.summary = build_run_summary(run, persisted, findings)
        db.commit()
        db.refresh(run)
        return run
    except Exception as exc:
        db.rollback()
        run.status = "FAILED"
        run.completed_at = datetime.now(timezone.utc)
        run.error = str(exc)
        db.add(run)
        db.commit()
        raise


def list_runs(db: Session, org_id: int, limit: int = 20) -> List[RedTeamRun]:
    """Most recent runs for an org."""
    return (
        db.query(RedTeamRun)
        .filter(RedTeamRun.org_id == org_id)
        .order_by(RedTeamRun.id.desc())
        .limit(limit)
        .all()
    )


def get_run(db: Session, org_id: int, run_id: int) -> Optional[RedTeamRun]:
    return (
        db.query(RedTeamRun)
        .filter(RedTeamRun.id == run_id, RedTeamRun.org_id == org_id)
        .first()
    )


def get_run_cases(db: Session, run_id: int) -> List[RedTeamCase]:
    return (
        db.query(RedTeamCase)
        .filter(RedTeamCase.run_id == run_id)
        .order_by(RedTeamCase.id.asc())
        .all()
    )


def get_run_findings(db: Session, run_id: int) -> List[RedTeamFinding]:
    return (
        db.query(RedTeamFinding)
        .filter(RedTeamFinding.run_id == run_id)
        .order_by(RedTeamFinding.id.asc())
        .all()
    )