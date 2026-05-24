"""AI Pipeline for workspace intelligence.

Handles embedding generation, semantic retrieval, AI summarization,
agent execution, and incident analysis. Integrates with OpenAI SDK
for LLM operations and supports vector-based memory retrieval.
"""

import json
import hashlib
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.storage.workspace_models import Workspace, WorkspaceMember
from app.storage.workspace_intel_models import (
    Incident, IncidentStatus, IncidentSeverity,
    Deployment, DeploymentStatus,
    TimelineEvent, TimelineEventType, TimelineSeverity,
    AIMemory, MemoryType, AIAgent, AgentType, AgentRun,
    WorkspaceSummary, SummaryType,
)
from app.services.intelligence_service import (
    AIMemoryService, SummaryService, TimelineService, ActivityFeedService,
    ActivityType, PostmortemService,
)


class EmbeddingService:
    """Generate and manage embeddings for operational memory.
    
    In production, this would use OpenAI's text-embedding-3-small or
    a local model like sentence-transformers. For now, uses a hash-based
    approach for development.
    """

    @staticmethod
    def generate_embedding(text: str) -> Optional[List[float]]:
        try:
            import openai
            response = openai.embeddings.create(
                model="text-embedding-3-small",
                input=text[:8000],
            )
            return response.data[0].embedding
        except (ImportError, Exception):
            return None

    @staticmethod
    def cosine_similarity(a: List[float], b: List[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if not norm_a or not norm_b:
            return 0.0
        return dot / (norm_a * norm_b)


class SummarizationService:
    """AI-powered summarization for incidents, deployments, and workspace activity."""

    @staticmethod
    async def generate_incident_summary(incident: Incident) -> str:
        prompt = (
            f"Summarize this operational incident concisely:\n"
            f"Title: {incident.title}\n"
            f"Description: {incident.description or 'N/A'}\n"
            f"Severity: {incident.severity.value if incident.severity else 'N/A'}\n"
            f"Status: {incident.status.value if incident.status else 'N/A'}\n"
            f"Source: {incident.source.value if incident.source else 'N/A'}\n"
            f"Affected Services: {', '.join(incident.affected_services or [])}\n"
            f"Root Cause: {incident.root_cause or 'Not yet determined'}\n"
            f"Resolution: {incident.resolution or 'In progress'}\n\n"
            f"Provide: 1) What happened 2) Impact 3) Current status 4) Key actions taken"
        )
        return await SummarizationService._call_llm(prompt)

    @staticmethod
    async def generate_deployment_summary(deployment: Deployment) -> str:
        prompt = (
            f"Summarize this deployment:\n"
            f"Service: {deployment.service_name}\n"
            f"Version: {deployment.version}\n"
            f"Environment: {deployment.environment.value if deployment.environment else 'N/A'}\n"
            f"Status: {deployment.status.value if deployment.status else 'N/A'}\n"
            f"Branch: {deployment.branch or 'N/A'}\n"
            f"Risk Score: {deployment.risk_score or 'N/A'}\n"
            f"Duration: {deployment.duration_seconds or 'N/A'}s\n"
        )
        return await SummarizationService._call_llm(prompt)

    @staticmethod
    async def generate_daily_briefing(
        db: Session,
        workspace_id: int,
    ) -> str:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        incidents = db.query(Incident).filter(
            Incident.workspace_id == workspace_id,
            Incident.detected_at >= today_start,
        ).all()

        deployments = db.query(Deployment).filter(
            Deployment.workspace_id == workspace_id,
            Deployment.started_at >= today_start,
        ).all()

        events = db.query(TimelineEvent).filter(
            TimelineEvent.workspace_id == workspace_id,
            TimelineEvent.event_time >= today_start,
        ).count()

        prompt = (
            f"Generate a concise daily operational briefing:\n\n"
            f"Date: {today_start.date()}\n"
            f"Incidents today: {len(incidents)}\n"
        )
        if incidents:
            prompt += "Incidents:\n"
            for inc in incidents:
                prompt += f"- [{inc.severity.value}] {inc.title} ({inc.status.value})\n"

        prompt += f"\nDeployments today: {len(deployments)}\n"
        if deployments:
            for dep in deployments:
                prompt += f"- {dep.service_name} v{dep.version} [{dep.status.value}]\n"

        prompt += f"\nTotal timeline events: {events}\n"
        prompt += "\nFormat: Brief overview, key incidents, deployment summary, risk highlights."

        return await SummarizationService._call_llm(prompt)

    @staticmethod
    async def generate_operational_insight(events: List[TimelineEvent]) -> str:
        if not events:
            return "No recent events to analyze."

        event_summary = "\n".join(
            f"[{e.severity.value}] {e.event_type.value}: {e.title}"
            for e in events[:10]
        )
        prompt = (
            f"Analyze these recent operational events and provide insights:\n\n"
            f"{event_summary}\n\n"
            f"Identify: 1) Patterns or trends 2) Risk indicators 3) Recommendations"
        )
        return await SummarizationService._call_llm(prompt)

    @staticmethod
    async def answer_operational_question(
        db: Session,
        workspace_id: int,
        question: str,
    ) -> str:
        memories = AIMemoryService.search_memory(
            db=db, workspace_id=workspace_id,
            query_text=question, limit=5,
        )

        context = "Relevant historical context:\n"
        for m in memories:
            context += f"- [{m.memory_type.value}] {m.title}: {m.content[:500]}\n"

        incidents = db.query(Incident).filter(
            Incident.workspace_id == workspace_id,
        ).order_by(desc(Incident.detected_at)).limit(5).all()

        context += "\nRecent incidents:\n"
        for i in incidents:
            context += f"- [{i.severity.value}] {i.title}: root_cause={i.root_cause or 'unknown'}\n"

        prompt = (
            f"You are SentinelAI's operational memory assistant.\n"
            f"Answer the question based on historical context and recent incidents.\n\n"
            f"Question: {question}\n\n"
            f"{context}\n"
            f"Provide a clear, concise answer with references to specific incidents when relevant."
        )
        return await SummarizationService._call_llm(prompt)

    @staticmethod
    async def _call_llm(prompt: str) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI()
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are SentinelAI's operational intelligence engine. Provide concise, accurate, actionable insights."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1000,
                temperature=0.3,
            )
            return response.choices[0].message.content or "AI analysis unavailable."
        except (ImportError, Exception) as e:
            return f"AI analysis unavailable (LLM call failed: {str(e)})"


class AgentExecutor:
    """Execute specialized AI agents that monitor and analyze workspace operations."""

    AGENT_PROMPTS = {
        AgentType.DEPLOYMENT: (
            "You are SentinelAI's Deployment Agent. Monitor deployments, assess risks, "
            "and suggest rollback or canary strategies. Analyze patterns in deployment failures."
        ),
        AgentType.SECURITY: (
            "You are SentinelAI's Security Agent. Detect security-sensitive changes, "
            "identify auth-related risks, monitor for secrets exposure, and flag "
            "unusual access patterns in deployments and operations."
        ),
        AgentType.RELIABILITY: (
            "You are SentinelAI's Reliability Agent. Monitor service health, detect "
            "anomalies, analyze latency patterns, and recommend reliability improvements. "
            "Track SLOs and error budgets."
        ),
        AgentType.EXECUTIVE: (
            "You are SentinelAI's Executive Insights Agent. Generate high-level summaries "
            "of operational health, identify strategic risks, and provide actionable "
            "recommendations for leadership."
        ),
        AgentType.INCIDENT_COMMANDER: (
            "You are SentinelAI's Incident Commander Agent. Coordinate incident response, "
            "suggest escalation paths, track response SLAs, and recommend next steps "
            "based on incident severity and historical patterns."
        ),
    }

    @staticmethod
    async def execute_agent(
        db: Session,
        agent: AIAgent,
    ) -> AgentRun:
        run = AgentRun(
            agent_id=agent.id,
            workspace_id=agent.workspace_id,
            status="RUNNING",
            input_data={"schedule": agent.schedule, "config": agent.config},
        )
        db.add(run)
        db.flush()

        try:
            workspace_id = agent.workspace_id
            agent_type = AgentType(agent.agent_type)

            now = datetime.utcnow()
            since = now - timedelta(hours=24)

            recent_incidents = db.query(Incident).filter(
                Incident.workspace_id == workspace_id,
                Incident.detected_at >= since,
            ).count()

            recent_deployments = db.query(Deployment).filter(
                Deployment.workspace_id == workspace_id,
                Deployment.started_at >= since,
            ).count()

            recent_events = db.query(TimelineEvent).filter(
                TimelineEvent.workspace_id == workspace_id,
                TimelineEvent.event_time >= since,
            ).count()

            context = (
                f"Workspace Analysis Period: Last 24 hours\n"
                f"Incidents: {recent_incidents}\n"
                f"Deployments: {recent_deployments}\n"
                f"Timeline Events: {recent_events}\n"
            )

            prompt = AgentExecutor.AGENT_PROMPTS.get(agent_type, "")
            full_prompt = f"{prompt}\n\nCurrent context:\n{context}\n\nProvide your analysis and recommendations."

            insight = await SummarizationService._call_llm(full_prompt)

            run.status = "COMPLETED"
            run.completed_at = datetime.utcnow()
            run.output_data = {"insight": insight}
            run.insights = {"summary": insight[:500], "events_analyzed": recent_events}

            agent.last_run_at = datetime.utcnow()
            agent.run_count = (agent.run_count or 0) + 1

            TimelineService.create_event(
                db=db,
                workspace_id=workspace_id,
                event_type=TimelineEventType.AI_SUMMARY_GENERATED,
                title=f"AI insight: {agent.name}",
                description=insight[:300],
                severity=TimelineSeverity.INFO,
                source="AI",
                metadata={"agent_id": agent.id, "agent_type": agent_type.value, "insight": insight},
                ai_summary=insight,
            )

            ActivityFeedService.log_activity(
                db=db,
                workspace_id=workspace_id,
                activity_type=ActivityType.AI_INSIGHT,
                title=f"AI insight from {agent.name}",
                description=insight[:200],
                related_entity_type="agent",
                related_entity_id=agent.id,
                metadata={"agent_type": agent_type.value},
            )

        except Exception as e:
            run.status = "FAILED"
            run.completed_at = datetime.utcnow()
            run.error = str(e)
            agent.last_error = str(e)

        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    async def execute_pending_agents(db: Session, workspace_id: int) -> List[AgentRun]:
        agents = db.query(AIAgent).filter(
            AIAgent.workspace_id == workspace_id,
            AIAgent.is_active == True,
        ).all()

        results = []
        for agent in agents:
            run = await AgentExecutor.execute_agent(db, agent)
            results.append(run)
        return results


class IncidentAnalyzer:
    """Analyze incidents for patterns, root causes, and similarity."""

    @staticmethod
    def analyze_incident_patterns(db: Session, workspace_id: int) -> Dict[str, Any]:
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        incidents = db.query(Incident).filter(
            Incident.workspace_id == workspace_id,
            Incident.detected_at >= thirty_days_ago,
        ).all()

        if not incidents:
            return {"incidents_analyzed": 0, "patterns": []}

        severity_distribution = {}
        source_distribution = {}
        service_incidents = {}
        day_of_week = {}
        hour_distribution = {}

        for incident in incidents:
            sev = incident.severity.value if incident.severity else "UNKNOWN"
            severity_distribution[sev] = severity_distribution.get(sev, 0) + 1

            src = incident.source.value if incident.source else "UNKNOWN"
            source_distribution[src] = source_distribution.get(src, 0) + 1

            for svc in (incident.affected_services or []):
                service_incidents[svc] = service_incidents.get(svc, 0) + 1

            if incident.detected_at:
                dow = incident.detected_at.strftime("%A")
                day_of_week[dow] = day_of_week.get(dow, 0) + 1
                hour_distribution[incident.detected_at.hour] = hour_distribution.get(incident.detected_at.hour, 0) + 1

        top_services = sorted(service_incidents.items(), key=lambda x: -x[1])[:5]

        avg_resolution_time = None
        resolved = [i for i in incidents if i.resolved_at and i.detected_at]
        if resolved:
            times = [(i.resolved_at - i.detected_at).total_seconds() / 60 for i in resolved]
            avg_resolution_time = sum(times) / len(times)

        return {
            "incidents_analyzed": len(incidents),
            "severity_distribution": severity_distribution,
            "source_distribution": source_distribution,
            "top_affected_services": [{"service": s, "incidents": c} for s, c in top_services],
            "busiest_day": max(day_of_week, key=day_of_week.get) if day_of_week else None,
            "peak_hour": max(hour_distribution, key=hour_distribution.get) if hour_distribution else None,
            "avg_resolution_time_minutes": round(avg_resolution_time, 1) if avg_resolution_time else None,
            "total_critical": severity_distribution.get("CRITICAL", 0),
        }

    @staticmethod
    async def auto_generate_postmortem(
        db: Session,
        incident_id: int,
        workspace_id: int,
    ) -> Any:
        from app.services.intelligence_service import PostmortemService

        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise ValueError("Incident not found")

        timeline_events = db.query(TimelineEvent).filter(
            TimelineEvent.related_entity_type == "incident",
            TimelineEvent.related_entity_id == incident_id,
        ).order_by(TimelineEvent.event_time).all()

        timeline_data = [
            {
                "time": e.event_time.isoformat(),
                "event": e.event_type.value,
                "title": e.title,
                "severity": e.severity.value,
            }
            for e in timeline_events
        ]

        prompt = (
            f"Generate an incident postmortem based on this data:\n\n"
            f"Title: {incident.title}\n"
            f"Description: {incident.description or 'N/A'}\n"
            f"Severity: {incident.severity.value if incident.severity else 'N/A'}\n"
            f"Source: {incident.source.value if incident.source else 'N/A'}\n"
            f"Root Cause: {incident.root_cause or 'Under investigation'}\n"
            f"Resolution: {incident.resolution or 'In progress'}\n"
            f"Affected Services: {', '.join(incident.affected_services or [])}\n\n"
            f"Timeline:\n" + "\n".join(
                f"  {t['time']} - [{t['severity']}] {t['title']}"
                for t in timeline_data
            ) + "\n\n"
            f"Generate: 1) Executive summary 2) Detailed timeline 3) Root cause analysis "
            f"4) Impact assessment 5) Action items 6) Lessons learned"
        )

        content = await SummarizationService._call_llm(prompt)

        similar_memories = AIMemoryService.find_similar_incidents(
            db=db, workspace_id=workspace_id,
            incident_description=incident.title + " " + (incident.description or ""),
            limit=3,
        )

        postmortem = PostmortemService.create_postmortem(
            db=db, incident_id=incident_id, workspace_id=workspace_id,
            title=f"Postmortem: {incident.title}",
            overview=content[:1000] if content else None,
            timeline=timeline_data,
            root_cause=incident.root_cause,
            resolution=incident.resolution,
            action_items=[
                {"description": m.title, "source": "ai_memory", "priority": "medium"}
                for m in similar_memories
            ] if similar_memories else [],
            content=content,
        )

        if incident.root_cause:
            AIMemoryService.store_memory(
                db=db, workspace_id=workspace_id,
                memory_type=MemoryType.ROOT_CAUSE,
                title=f"Root cause: {incident.title}",
                content=incident.root_cause,
                source_incident_id=incident_id,
                tags=[s.lower().replace(" ", "-") for s in (incident.affected_services or [])],
            )

        return postmortem


class IntelligencePipeline:
    """Orchestrates all AI operations for workspace intelligence."""

    summarization = SummarizationService()
    embeddings = EmbeddingService()
    agents = AgentExecutor()
    analyzer = IncidentAnalyzer()

    @staticmethod
    async def generate_daily_summary(db: Session, workspace_id: int) -> WorkspaceSummary:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)

        content = await SummarizationService.generate_daily_briefing(
            db=db, workspace_id=workspace_id,
        )

        summary = SummaryService.create_summary(
            db=db, workspace_id=workspace_id,
            summary_type=SummaryType.DAILY,
            title=f"Daily Briefing - {yesterday_start.date()}",
            content=content,
            period_start=yesterday_start,
            period_end=today_start,
            metadata={"generated_by": "IntelligencePipeline"},
        )
        return summary

    @staticmethod
    async def analyze_deployment_risk(
        db: Session,
        deployment: Deployment,
    ) -> Dict[str, Any]:
        similar_failures = db.query(Deployment).filter(
            Deployment.workspace_id == deployment.workspace_id,
            Deployment.service_name == deployment.service_name,
            Deployment.status == DeploymentStatus.FAILED,
        ).count()

        recent_deployments = db.query(Deployment).filter(
            Deployment.workspace_id == deployment.workspace_id,
            Deployment.service_name == deployment.service_name,
            Deployment.started_at >= datetime.utcnow() - timedelta(days=7),
        ).count()

        risk_factors = []
        if similar_failures > 0:
            risk_factors.append(f"Service had {similar_failures} previous failures")
        if recent_deployments > 3:
            risk_factors.append(f"High deployment frequency ({recent_deployments} in 7 days)")

        if deployment.branch and deployment.branch != "main" and deployment.branch != "master":
            risk_factors.append(f"Deploying from non-default branch: {deployment.branch}")

        risk_score = min(1.0, (similar_failures * 0.2) + (recent_deployments * 0.05))

        memory = AIMemoryService.search_memory(
            db=db, workspace_id=deployment.workspace_id,
            query_text=f"{deployment.service_name} deployment failure",
            memory_types=[MemoryType.DEPLOYMENT_PATTERN, MemoryType.RECURRING_FAILURE],
            limit=3,
        )

        return {
            "risk_score": round(risk_score, 2),
            "risk_factors": risk_factors,
            "similar_previous_failures": similar_failures,
            "deployment_frequency_7d": recent_deployments,
            "similar_incidents": [
                {"title": m.title, "content": m.content[:200]} for m in memory
            ],
        }
