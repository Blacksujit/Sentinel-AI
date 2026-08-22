"""Red team evaluation models.

An org runs an adversarial evaluation (RedTeamRun) composed of attack cases
(RedTeamCase). Cases that expose weaknesses become findings (RedTeamFinding)
for triage. Org-scoped; only OWNER-privileged roles may start runs.
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .db import Base


class RedTeamRun(Base):
    """An adversarial evaluation run against the org's security pipeline."""

    __tablename__ = "redteam_runs"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    mode = Column(String(50), nullable=False, default="pipeline")  # 'pipeline' | 'wire'
    status = Column(String(50), nullable=False, default="RUNNING")  # RUNNING | COMPLETED | FAILED

    config = Column(JSON, nullable=False, default=dict)
    attack_classes = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True, default=dict)
    summary = Column(Text, nullable=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    error = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    organization = relationship("Organization", backref="redteam_runs")
    creator = relationship("User", backref="redteam_runs")

    def __repr__(self):
        return f"<RedTeamRun(id={self.id}, org_id={self.org_id}, status={self.status})>"


class RedTeamCase(Base):
    """A single attack (or benign control) evaluated during a run."""

    __tablename__ = "redteam_cases"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("redteam_runs.id"), nullable=False, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)

    attack_class = Column(String(50), nullable=False, index=True)
    technique = Column(String(100), nullable=True)
    prompt = Column(Text, nullable=False)  # original prompt (or benign control)
    final_prompt = Column(Text, nullable=True)  # post-mutation prompt; same as prompt when no mutation
    expected_outcome = Column(String(20), nullable=False)  # 'malicious' | 'benign'

    detected = Column(Boolean, nullable=False, default=False)
    decision = Column(String(20), nullable=True)  # allow | warn | block | escalate
    risk_score = Column(Integer, nullable=True)
    confidence = Column(Float, nullable=True)
    detector_hits = Column(JSON, nullable=True, default=dict)

    mutation_rounds = Column(Integer, nullable=False, default=0)
    tokens_used = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("RedTeamRun", backref="cases")

    def __repr__(self):
        return f"<RedTeamCase(id={self.id}, attack_class={self.attack_class}, detected={self.detected})>"


class RedTeamFinding(Base):
    """A weakness surfaced by a run: an evasion or a false positive."""

    __tablename__ = "redteam_findings"

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(Integer, ForeignKey("redteam_runs.id"), nullable=False, index=True)
    case_id = Column(Integer, ForeignKey("redteam_cases.id"), nullable=False, unique=True, index=True)

    finding_type = Column(String(20), nullable=False)  # 'evasion' | 'false_positive'
    severity = Column(String(20), nullable=False, index=True)  # high | medium | low
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="open", index=True)  # open | acknowledged | fixed

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    run = relationship("RedTeamRun", backref="findings")
    case = relationship("RedTeamCase", backref="finding")

    def __repr__(self):
        return f"<RedTeamFinding(id={self.id}, finding_type={self.finding_type}, severity={self.severity})>"