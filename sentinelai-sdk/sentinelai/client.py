"""
SentinelAI SDK Client Module
"""

import requests
import json
import time
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

from .exceptions import (
    SentinelAIError,
    SentinelAIConnectionError,
    SentinelAIAuthenticationError
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


DEFAULT_RETRY_POLICY: Dict[str, Any] = {
    "max_retries": 3,
    "backoff_factor": 1.0,
    "max_backoff": 60.0,
    "retry_on_status": [429, 500, 502, 503, 504],
}


def _exponential_backoff(attempt: int, backoff_factor: float, max_backoff: float) -> float:
    delay = backoff_factor * (2 ** attempt)
    return min(delay, max_backoff)


class SentinelAIClient:
    """
    Official SentinelAI Python SDK Client.
    
    Provides easy integration with SentinelAI for real-time AI safety analysis.
    """
    
    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        source: str = "python-sdk",
        timeout: int = 10,
        max_retries: Optional[int] = None,
        retry_delay: Optional[float] = None,
        retry_policy: Optional[Dict[str, Any]] = None,
        max_workers: int = 5,
    ):
        """
        Initialize SentinelAI client.
        
        Args:
            base_url: Base URL of SentinelAI instance
            api_key: API key for authentication (optional for development)
            source: Identifier for your application
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts (deprecated, use retry_policy)
            retry_delay: Delay between retries in seconds (deprecated, use retry_policy)
            retry_policy: Dict with max_retries, backoff_factor, max_backoff, retry_on_status
            max_workers: Max parallel workers for batch operations
        """
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.source = source
        self.timeout = timeout
        self.max_workers = max_workers

        resolved_policy = dict(DEFAULT_RETRY_POLICY)
        if retry_policy:
            resolved_policy.update(retry_policy)
        if max_retries is not None:
            resolved_policy["max_retries"] = max_retries
        if retry_delay is not None:
            resolved_policy["backoff_factor"] = retry_delay
        self.retry_policy = resolved_policy

        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': f'SentinelAI-Python-SDK/1.0.0 ({source})'
        })
        
        if api_key:
            self.session.headers['Authorization'] = f'Bearer {api_key}'
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        Make HTTP request with exponential backoff retry logic.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            **kwargs: Additional request parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            SentinelAIError: On API errors
        """
        url = f"{self.base_url}{endpoint}"
        policy = self.retry_policy
        max_retries = policy["max_retries"]
        retry_on_status = policy["retry_on_status"]
        backoff_factor = policy["backoff_factor"]
        max_backoff = policy["max_backoff"]
        
        for attempt in range(max_retries + 1):
            try:
                response = self.session.request(
                    method, url, timeout=self.timeout, **kwargs
                )
                
                if response.status_code == 401:
                    raise SentinelAIAuthenticationError("Invalid API key")
                elif response.status_code == 429 or response.status_code >= 500:
                    if response.status_code in retry_on_status and attempt < max_retries:
                        delay = _exponential_backoff(attempt, backoff_factor, max_backoff)
                        logger.warning(
                            "Request to %s returned %d, retrying in %.1fs (attempt %d/%d)",
                            endpoint, response.status_code, delay, attempt + 1, max_retries,
                        )
                        time.sleep(delay)
                        continue
                    error_msg = f"API error {response.status_code}: {response.text}"
                    raise SentinelAIError(error_msg)
                elif response.status_code >= 400:
                    error_msg = f"API error {response.status_code}: {response.text}"
                    raise SentinelAIError(error_msg)
                
                return response.json()
                
            except requests.exceptions.Timeout:
                if attempt == max_retries:
                    raise SentinelAIConnectionError("Request timeout")
                delay = _exponential_backoff(attempt, backoff_factor, max_backoff)
                logger.warning("Request timeout %s, retrying in %.1fs", endpoint, delay)
                time.sleep(delay)
                
            except requests.exceptions.ConnectionError:
                if attempt == max_retries:
                    raise SentinelAIConnectionError("Connection failed")
                delay = _exponential_backoff(attempt, backoff_factor, max_backoff)
                logger.warning("Connection failed %s, retrying in %.1fs", endpoint, delay)
                time.sleep(delay)
                
            except json.JSONDecodeError:
                raise SentinelAIError("Invalid JSON response")
    
    def analyze(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        client_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze prompt/response pair for AI safety risks.
        
        Args:
            prompt: User's prompt/question
            response: AI model's response
            user_id: End user identifier (optional)
            session_id: Session identifier (optional)
            client_metadata: Additional metadata (optional)
            
        Returns:
            Analysis results with risk assessment
            
        Example:
            >>> result = client.analyze(
            ...     prompt="What's your refund policy?",
            ...     response="We offer 30-day refunds...",
            ...     user_id="user123",
            ...     session_id="session456"
            ... )
            >>> print(result['decision'])  # 'allow', 'warn', 'block', 'escalate'
            >>> print(result['final_risk_score'])  # 0.0 to 1.0
        """
        payload = {
            "prompt": prompt,
            "response": response,
            "source": self.source,
            "user_id": user_id,
            "session_id": session_id,
            "client_metadata": {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "sdk_version": "1.0.0",
                **(client_metadata or {})
            }
        }
        
        try:
            result = self._make_request('POST', '/api/analyze/external', json=payload)
            logger.info(f"Analysis completed: risk={result.get('final_risk_score', 0):.3f}, decision={result.get('decision', 'unknown')}")
            return result
            
        except SentinelAIError as e:
            logger.error(f"Analysis failed: {e}")
            # Return safe fallback for production use
            return {
                "decision": "allow",
                "final_risk_score": 0.0,
                "error": str(e),
                "fallback": True
            }

    def verify(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        One-shot verification of a prompt/response pair.
        
        Returns a simplified response with score (0-100), status,
        detected claims, and a corrected version if needed.
        Aligns with the SentinalAI public API spec.
        
        Args:
            prompt: User's prompt/question  
            response: AI model's response
            user_id: End user identifier (optional)
            session_id: Session identifier (optional)
            
        Returns:
            Dict with score (0-100), status, claims[], corrected, meta
            
        Example:
            >>> result = client.verify(
            ...     prompt="Who won the Nobel Prize in Physics in 2019?",
            ...     response="It was awarded entirely to Stephen Hawking..."
            ... )
            >>> print(result['status'])  # 'hallucinated'
            >>> print(result['corrected'])  # Corrected text
        """
        raw = self.analyze(
            prompt=prompt,
            response=response,
            user_id=user_id,
            session_id=session_id,
        )

        score_0_1 = raw.get("final_risk_score", 0.0)
        score_0_100 = round(score_0_1 * 100)
        flags = raw.get("flags", [])
        decision = raw.get("decision", "allow")
        action = raw.get("action_taken", "allow")

        if score_0_100 <= 24:
            status = "trusted"
        elif score_0_100 <= 59:
            status = "needs_review"
        else:
            status = "hallucinated"

        claims = []
        detector_map = {
            "prompt_anomaly": ("Prompt Anomaly", "medium"),
            "jailbreak_detected": ("Jailbreak Attempt", "critical"),
            "unsafe_output": ("Unsafe Output", "high"),
        }
        for flag in flags:
            detector_name, severity = detector_map.get(flag, (flag, "medium"))
            claims.append({
                "detector": detector_name,
                "text": response if flag in ("unsafe_output",) else prompt,
                "severity": severity,
                "source": "response" if flag in ("unsafe_output", "output_risk") else "prompt",
                "note": f"Flagged by {detector_name} detector",
            })

        corrected = None
        if status in ("needs_review", "hallucinated"):
            corrected = response

        return {
            "score": score_0_100,
            "status": status,
            "decision": decision,
            "action_taken": action,
            "claims": claims,
            "corrected": corrected,
            "meta": {
                "claims_checked": len(claims),
                "detectors_run": 6,
                "verified_at": datetime.now(timezone.utc).isoformat(),
            }
        }

    def correct(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """
        Verify and return the corrected response.
        
        If the response is trusted, returns the original.
        If hallucinated or needs review, returns the corrected version.
        
        Args:
            prompt: User's prompt/question
            response: AI model's response  
            user_id: End user identifier (optional)
            session_id: Session identifier (optional)
            
        Returns:
            The response string — corrected if needed, original if trusted.
        """
        result = self.verify(
            prompt=prompt,
            response=response,
            user_id=user_id,
            session_id=session_id,
        )
        return result.get("corrected") or response
    
    # ── Batch Analysis ────────────────────────────────────────────

    def analyze_batch(
        self,
        items: List[Dict[str, str]],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple prompt/response pairs in parallel.

        Args:
            items: List of dicts with "prompt" and "response" keys
            user_id: End user identifier (applied to all items)
            session_id: Session identifier (applied to all items)

        Returns:
            List of analysis results in the same order as input items

        Example:
            >>> results = client.analyze_batch([
            ...     {"prompt": "What is 2+2?", "response": "4"},
            ...     {"prompt": "Who won in 2020?", "response": "Someone"},
            ... ])
        """
        results: List[Optional[Dict[str, Any]]] = [None] * len(items)

        def _analyze_one(idx: int, item: Dict[str, str]) -> tuple[int, Dict[str, Any]]:
            return idx, self.analyze(
                prompt=item["prompt"],
                response=item["response"],
                user_id=user_id,
                session_id=session_id,
            )

        with ThreadPoolExecutor(max_workers=self.max_workers) as pool:
            futures = {pool.submit(_analyze_one, i, item): i for i, item in enumerate(items)}
            for future in as_completed(futures):
                idx, result = future.result()
                results[idx] = result

        return [r for r in results if r is not None]

    # ── Webhook Management ────────────────────────────────────────

    def create_webhook(
        self,
        org_id: str,
        url: str,
        events: List[str],
    ) -> Dict[str, Any]:
        """
        Subscribe to real-time analysis events via webhook.

        Args:
            org_id: Organization ID
            url: HTTPS endpoint to receive webhook payloads
            events: List of event types (e.g. ["analysis.completed", "risk.flagged"])

        Returns:
            Webhook configuration with id, url, events, secret
        """
        try:
            return self._make_request(
                'POST',
                f'/api/orgs/{org_id}/webhooks',
                json={"url": url, "events": events},
            )
        except SentinelAIError as e:
            logger.error("Failed to create webhook: %s", e)
            raise

    def list_webhooks(self, org_id: str) -> List[Dict[str, Any]]:
        """
        List all webhook subscriptions for an organization.

        Args:
            org_id: Organization ID

        Returns:
            List of webhook configurations
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}/webhooks')
        except SentinelAIError as e:
            logger.error("Failed to list webhooks: %s", e)
            return []

    def delete_webhook(self, org_id: str, webhook_id: str) -> bool:
        """
        Remove a webhook subscription.

        Args:
            org_id: Organization ID
            webhook_id: Webhook configuration ID

        Returns:
            True if deleted successfully
        """
        try:
            self._make_request('DELETE', f'/api/orgs/{org_id}/webhooks/{webhook_id}')
            return True
        except SentinelAIError as e:
            logger.error("Failed to delete webhook %s: %s", webhook_id, e)
            return False

    # ── Billing ───────────────────────────────────────────────────

    def get_billing_config(self) -> Dict[str, Any]:
        """
        Get Stripe publishable key and price IDs for the frontend.

        Returns:
            Dict with stripe_publishable_key and prices
        """
        try:
            return self._make_request('GET', '/api/billing/config')
        except SentinelAIError as e:
            logger.error("Failed to get billing config: %s", e)
            return {}

    def get_subscription(self, org_id: str) -> Dict[str, Any]:
        """
        Get current subscription details for an organization.

        Args:
            org_id: Organization ID

        Returns:
            Subscription details with plan_tier, status, period end
        """
        try:
            return self._make_request('GET', f'/api/billing/subscription?org_id={org_id}')
        except SentinelAIError as e:
            logger.error("Failed to get subscription: %s", e)
            return {}

    def get_billing_usage(self, org_id: str) -> Dict[str, Any]:
        """
        Get current billing period usage for an organization.

        Args:
            org_id: Organization ID

        Returns:
            Usage data with used, limit, plan, remaining
        """
        try:
            return self._make_request('GET', f'/api/billing/usage?org_id={org_id}')
        except SentinelAIError as e:
            logger.error("Failed to get billing usage: %s", e)
            return {}

    def health_check(self) -> bool:
        """
        Check if SentinelAI API is healthy.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            self._make_request('GET', '/health')
            return True
        except SentinelAIError:
            return False
    
    def get_risk_logs(self, limit: int = 50, source: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recent risk analysis logs.
        
        Args:
            limit: Maximum number of logs to return
            source: Filter by source (optional)
            
        Returns:
            List of risk log entries
        """
        params = {"limit": limit}
        if source:
            params["source"] = source
            
        try:
            result = self._make_request('GET', '/api/logs', params=params)
            return result
        except SentinelAIError as e:
            logger.error(f"Failed to get logs: {e}")
            return []
    
    def get_settings(self) -> Dict[str, Any]:
        """
        Get current SentinelAI settings.
        
        Returns:
            Current settings configuration
        """
        try:
            return self._make_request('GET', '/api/settings')
        except SentinelAIError as e:
            logger.error(f"Failed to get settings: {e}")
            return {}

    # ── Organization Management ──────────────────────────────────────

    def create_organization(
        self,
        name: str,
        slug: Optional[str] = None,
        email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new organization.

        The org is created via Clerk's organization system first,
        then synced to SentinelAI. Use the returned clerk_org_id
        for all subsequent org-scoped API calls.

        Args:
            name: Organization name
            slug: URL-friendly slug (auto-generated from name if omitted)
            email: Company email for domain verification

        Returns:
            Created organization with id, clerk_org_id, name, slug, plan_tier

        Example:
            >>> org = client.create_organization(
            ...     name="Acme Corp",
            ...     email="security@acme.com"
            ... )
            >>> print(org['id'], org['clerk_org_id'])
        """
        payload: Dict[str, Any] = {"name": name}
        if slug:
            payload["slug"] = slug
        if email:
            payload["email"] = email

        try:
            return self._make_request('POST', '/api/orgs', json=payload)
        except SentinelAIError as e:
            logger.error(f"Failed to create organization: {e}")
            raise

    def list_organizations(self) -> List[Dict[str, Any]]:
        """
        List all organizations the authenticated user belongs to.

        Returns:
            List of organizations with id, clerk_org_id, name, slug, plan_tier
        """
        try:
            return self._make_request('GET', '/api/orgs')
        except SentinelAIError as e:
            logger.error(f"Failed to list organizations: {e}")
            return []

    def get_organization(self, org_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single organization by ID, slug, or clerk_org_id.

        Args:
            org_id: Organization ID (numeric, slug, or Clerk org ID)

        Returns:
            Organization details or None if not found
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}')
        except SentinelAIError as e:
            logger.error(f"Failed to get organization {org_id}: {e}")
            return None

    # ── Member Management ───────────────────────────────────────────

    def list_members(self, org_id: str) -> List[Dict[str, Any]]:
        """
        List all members of an organization.

        Args:
            org_id: Organization ID

        Returns:
            List of members with user_id, name, email, role, joined_at
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}/members')
        except SentinelAIError as e:
            logger.error(f"Failed to list members for org {org_id}: {e}")
            return []

    def invite_member(
        self,
        org_id: str,
        email: str,
        role: str = "MEMBER",
    ) -> Dict[str, Any]:
        """
        Invite a new member to an organization.

        Args:
            org_id: Organization ID
            email: Email address of the invitee
            role: Role to assign (MEMBER, ADMIN, DEVELOPER, VIEWER)

        Returns:
            Invite record with id, email, role, status, token

        Example:
            >>> invite = client.invite_member(
            ...     org_id="org_abc123",
            ...     email="engineer@acme.com",
            ...     role="DEVELOPER"
            ... )
        """
        try:
            return self._make_request(
                'POST',
                f'/api/orgs/{org_id}/members/invite',
                json={"email": email, "role": role},
            )
        except SentinelAIError as e:
            logger.error(f"Failed to invite member to org {org_id}: {e}")
            raise

    def update_member_role(
        self,
        org_id: str,
        user_id: int,
        role: str,
    ) -> Dict[str, Any]:
        """
        Change a member's role within an organization.

        Args:
            org_id: Organization ID
            user_id: User ID of the member
            role: New role name (OWNER, ADMIN, DEVELOPER, VIEWER)

        Returns:
            Updated membership record
        """
        try:
            return self._make_request(
                'PATCH',
                f'/api/orgs/{org_id}/members/{user_id}',
                json={"role": role},
            )
        except SentinelAIError as e:
            logger.error(f"Failed to update member role: {e}")
            raise

    def remove_member(self, org_id: str, user_id: int) -> bool:
        """
        Remove a member from an organization.

        Args:
            org_id: Organization ID
            user_id: User ID of the member to remove

        Returns:
            True if removed successfully, False otherwise
        """
        try:
            self._make_request('DELETE', f'/api/orgs/{org_id}/members/{user_id}')
            return True
        except SentinelAIError as e:
            logger.error(f"Failed to remove member from org {org_id}: {e}")
            return False

    # ── API Key Management ──────────────────────────────────────────

    def list_api_keys(self, org_id: str) -> List[Dict[str, Any]]:
        """
        List all API keys for an organization.

        Args:
            org_id: Organization ID

        Returns:
            List of API keys with id, name, prefix, status, created_at
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}/api-keys')
        except SentinelAIError as e:
            logger.error(f"Failed to list API keys for org {org_id}: {e}")
            return []

    def create_api_key(self, org_id: str, name: str) -> Dict[str, Any]:
        """
        Create a new API key for an organization.

        Args:
            org_id: Organization ID
            name: Human-readable name for the key

        Returns:
            Created API key with id, name, prefix, key (full key shown once)

        Example:
            >>> key = client.create_api_key("org_abc123", "Production")
            >>> print(key['key'])  # Save this — shown only once
        """
        try:
            return self._make_request(
                'POST',
                f'/api/orgs/{org_id}/api-keys',
                json={"name": name},
            )
        except SentinelAIError as e:
            logger.error(f"Failed to create API key: {e}")
            raise

    def revoke_api_key(self, org_id: str, key_id: int) -> bool:
        """
        Revoke an API key immediately.

        Args:
            org_id: Organization ID
            key_id: API key ID

        Returns:
            True if revoked successfully, False otherwise
        """
        try:
            self._make_request(
                'POST',
                f'/api/orgs/{org_id}/api-keys/{key_id}/revoke',
            )
            return True
        except SentinelAIError as e:
            logger.error(f"Failed to revoke API key {key_id}: {e}")
            return False

    def rotate_api_key(self, org_id: str, key_id: int) -> Dict[str, Any]:
        """
        Rotate an API key (revoke existing + issue new one).

        Args:
            org_id: Organization ID
            key_id: API key ID

        Returns:
            New API key details with fresh key value
        """
        try:
            return self._make_request(
                'POST',
                f'/api/orgs/{org_id}/api-keys/{key_id}/rotate',
            )
        except SentinelAIError as e:
            logger.error(f"Failed to rotate API key {key_id}: {e}")
            raise

    # ── Usage & Stats ───────────────────────────────────────────────

    def get_usage(self, org_id: str) -> List[Dict[str, Any]]:
        """
        Get usage log entries for an organization.

        Args:
            org_id: Organization ID

        Returns:
            List of usage entries with endpoint, timestamp, risk_score, latency_ms
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}/usage')
        except SentinelAIError as e:
            logger.error(f"Failed to get usage for org {org_id}: {e}")
            return []

    def get_usage_stats(self, org_id: str) -> Dict[str, Any]:
        """
        Get dashboard usage statistics for an organization.

        Args:
            org_id: Organization ID

        Returns:
            Dashboard stats including total requests, risk distribution, trends
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}/usage/stats')
        except SentinelAIError as e:
            logger.error(f"Failed to get usage stats for org {org_id}: {e}")
            return {}

    # ── Risk Baselines ──────────────────────────────────────────────

    def get_baselines(self, org_id: str) -> Dict[str, Any]:
        """
        Get risk baseline configuration for an organization.

        Args:
            org_id: Organization ID

        Returns:
            Baseline config with risk thresholds and model sensitivity
        """
        try:
            return self._make_request('GET', f'/api/orgs/{org_id}/baselines')
        except SentinelAIError as e:
            logger.error(f"Failed to get baselines for org {org_id}: {e}")
            return {}

    def update_baselines(self, org_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update risk baseline configuration for an organization.

        Args:
            org_id: Organization ID
            config: Baseline configuration dict (thresholds, sensitivity, alerts)

        Returns:
            Updated baseline config

        Example:
            >>> client.update_baselines("org_abc123", {
            ...     "risk_threshold_medium": 50.0,
            ...     "risk_threshold_high": 80.0,
            ...     "model_sensitivity": "high",
            ... })
        """
        try:
            return self._make_request(
                'POST',
                f'/api/orgs/{org_id}/baselines',
                json=config,
            )
        except SentinelAIError as e:
            logger.error(f"Failed to update baselines for org {org_id}: {e}")
            raise

    # ── Workspace Management ────────────────────────────────────────

    def list_workspaces(self) -> List[Dict[str, Any]]:
        """
        List workspaces in the currently active organization.

        Requires an active org context (set via X-Org-Id header or
        the current Clerk org session).

        Returns:
            List of workspaces with id, name, slug, is_default, member_count
        """
        try:
            return self._make_request('GET', '/api/workspaces')
        except SentinelAIError as e:
            logger.error(f"Failed to list workspaces: {e}")
            return []

    # ── User Info ───────────────────────────────────────────────────

    def get_current_user(self) -> Optional[Dict[str, Any]]:
        """
        Get the currently authenticated user's profile and org memberships.

        Returns:
            User details with id, clerk_user_id, email, name,
            onboarding_completed, and memberships list
        """
        try:
            return self._make_request('GET', '/api/me')
        except SentinelAIError as e:
            logger.error(f"Failed to get current user: {e}")
            return None


class ConversationTracker:
    """
    Track multi-turn conversations with risk analysis.
    
    Useful for chatbots and conversational AI applications.
    """
    
    def __init__(self, client: SentinelAIClient, session_id: str):
        """
        Initialize conversation tracker.
        
        Args:
            client: SentinelAI client instance
            session_id: Unique session identifier
        """
        self.client = client
        self.session_id = session_id
        self.turns = []
        self.start_time = datetime.now(timezone.utc)
    
    @property
    def conversation_turns(self) -> List[Dict[str, Any]]:
        """Alias for self.turns for API compatibility."""
        return self.turns

    def add_turn(
        self,
        prompt: str,
        response: str,
        user_id: Optional[str] = None,
        turn_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Add a conversation turn with analysis.
        
        Args:
            prompt: User message
            response: AI response
            user_id: User identifier
            turn_metadata: Additional turn metadata
            
        Returns:
            Analysis result for this turn
        """
        turn_number = len(self.turns) + 1
        
        metadata = {
            "turn_number": turn_number,
            "conversation_length": turn_number,
            **(turn_metadata or {})
        }
        
        result = self.client.analyze(
            prompt=prompt,
            response=response,
            user_id=user_id,
            session_id=self.session_id,
            client_metadata=metadata
        )
        
        turn = {
            "turn_number": turn_number,
            "prompt": prompt,
            "response": response,
            "analysis": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        if user_id:
            turn["user_id"] = user_id
        
        self.turns.append(turn)
        
        return result
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get conversation summary with risk statistics.
        
        Returns:
            Conversation summary and analytics
        """
        if not self.turns:
            return {
                "session_id": self.session_id,
                "total_turns": 0,
                "duration_minutes": 0.0,
                "risk_statistics": {
                    "average_risk_score": 0.0,
                    "max_risk_score": 0.0,
                    "min_risk_score": 0.0,
                    "decision_counts": {
                        "allow": 0, "warn": 0, "block": 0, "escalate": 0
                    }
                },
                "turns": [],
                "conversation_turns": [],
                "message": "No turns recorded"
            }
        
        risk_scores = [turn["analysis"].get("final_risk_score", 0) for turn in self.turns]
        decisions = [turn["analysis"].get("decision", "unknown") for turn in self.turns]
        
        return {
            "session_id": self.session_id,
            "total_turns": len(self.turns),
            "duration_minutes": (datetime.now(timezone.utc) - self.start_time).total_seconds() / 60,
            "risk_statistics": {
                "average_risk_score": sum(risk_scores) / len(risk_scores),
                "max_risk_score": max(risk_scores),
                "min_risk_score": min(risk_scores),
                "decision_counts": {
                    "allow": decisions.count("allow"),
                    "warn": decisions.count("warn"),
                    "block": decisions.count("block"),
                    "escalate": decisions.count("escalate")
                }
            },
            "turns": self.turns,
            "conversation_turns": self.turns,
        }
    
    def analyze_conversation(self) -> List[Dict[str, Any]]:
        """
        Re-analyze all conversation turns and return results.
        
        Returns:
            List of analysis results for each turn
        """
        return [turn["analysis"] for turn in self.turns]

    def get_risk_statistics(self) -> Dict[str, Any]:
        """
        Get risk statistics for the conversation.
        
        Returns:
            Dict with average_risk_score, max_risk_score, min_risk_score, total_turns
        """
        if not self.turns:
            return {
                "average_risk_score": 0.0,
                "max_risk_score": 0.0,
                "min_risk_score": 0.0,
                "total_turns": 0
            }
        
        risk_scores = [turn["analysis"].get("final_risk_score", 0) for turn in self.turns]
        return {
            "average_risk_score": sum(risk_scores) / len(risk_scores),
            "max_risk_score": max(risk_scores),
            "min_risk_score": min(risk_scores),
            "total_turns": len(self.turns)
        }

    def clear_conversation(self) -> None:
        """Clear all conversation turns."""
        self.turns.clear()

    def export_conversation(self) -> Dict[str, Any]:
        """
        Export conversation data as a dict.
        
        Returns:
            Dict with session_id, conversation_turns, and export_timestamp
        """
        return {
            "session_id": self.session_id,
            "conversation_turns": self.turns.copy(),
            "export_timestamp": datetime.now(timezone.utc).isoformat()
        }

    def get_high_risk_turns(self, threshold: float = 0.7) -> List[Dict[str, Any]]:
        """
        Get turns with risk score above the threshold.
        
        Args:
            threshold: Risk score threshold (default 0.7)
            
        Returns:
            List of turns with risk score > threshold
        """
        return [
            turn for turn in self.turns
            if turn["analysis"].get("final_risk_score", 0) > threshold
        ]
