"""
API Endpoint Tests

Tests for all FastAPI endpoints including health check, analyze, and baseline management.
"""

import pytest
from fastapi import status


class TestHealthEndpoint:
    """Tests for the health check endpoint."""
    
    def test_health_check_returns_ok(self, client):
        """Test that health endpoint returns OK status."""
        response = client.get("/health")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"
        assert "checks" in data
        assert data["checks"]["database"]["status"] == "healthy"
    
    def test_health_check_is_accessible(self, client):
        """Test that health endpoint is always accessible."""
        # Make multiple requests to ensure consistency
        for _ in range(5):
            response = client.get("/health")
            assert response.status_code == status.HTTP_200_OK


class TestAnalyzeEndpoint:
    """Tests for the main analysis endpoint."""
    
    def test_analyze_safe_content(self, client, sample_safe_prompt, sample_safe_response):
        """Test analysis of safe content returns low risk score."""
        response = client.post(
            "/api/analyze",
            json={
                "prompt": sample_safe_prompt,
                "response": sample_safe_response
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "final_risk_score" in data
        assert "flags" in data
        assert "confidence" in data
        assert "decision" in data
        assert "settings_version" in data
        assert "thresholds_applied" in data
        
        # Safe content should have low risk
        assert data["final_risk_score"] < 0.3
        assert data["decision"] == "allow"
    
    def test_analyze_harmful_content(self, client, sample_safe_prompt, sample_harmful_response):
        """Test analysis of harmful content returns high risk score."""
        response = client.post(
            "/api/analyze",
            json={
                "prompt": sample_safe_prompt,
                "response": sample_harmful_response
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Harmful content should have high risk
        assert data["final_risk_score"] > 0.7
        assert len(data["flags"]) > 0
        assert data["decision"] in ["warn", "block", "escalate"]
    
    def test_analyze_violence_content(self, client, sample_safe_prompt, sample_violence_response):
        """Test that violence content is properly flagged."""
        response = client.post(
            "/api/analyze",
            json={
                "prompt": sample_safe_prompt,
                "response": sample_violence_response
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert "violence" in data["flags"]
        assert data["final_risk_score"] > 0.6
    

    def test_analyze_missing_prompt(self, client, sample_safe_response):
        """Test that missing prompt returns validation error."""
        response = client.post(
            "/api/analyze",
            json={"response": sample_safe_response}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_analyze_missing_response(self, client, sample_safe_prompt):
        """Test that missing response returns validation error."""
        response = client.post(
            "/api/analyze",
            json={"prompt": sample_safe_prompt}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_analyze_empty_strings(self, client):
        """Test analysis with empty strings."""
        response = client.post(
            "/api/analyze",
            json={"prompt": "", "response": ""}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Empty content should have low risk
        assert data["final_risk_score"] < 0.3
    
    def test_analyze_jailbreak_attempt(self, client, sample_jailbreak_prompt, sample_safe_response):
        """Test that jailbreak attempts are detected."""
        response = client.post(
            "/api/analyze",
            json={
                "prompt": sample_jailbreak_prompt,
                "response": sample_safe_response
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Jailbreak attempts should increase risk
        assert data["final_risk_score"] > 0.0
    
    def test_analyze_returns_all_required_fields(self, client, sample_safe_prompt, sample_safe_response):
        """Test that response contains all required fields."""
        response = client.post(
            "/api/analyze",
            json={
                "prompt": sample_safe_prompt,
                "response": sample_safe_response
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        required_fields = [
            "final_risk_score",
            "flags",
            "confidence",
            "decision",
            "settings_version",
            "thresholds_applied",
        ]
        for field in required_fields:
            assert field in data


class TestBaselineEndpoints:
    """Tests for baseline management endpoints."""

    def test_get_baselines(self, client, test_db):
        """Test retrieving baselines."""
        # Add some baselines first
        from app.storage.baseline_crud import create_baseline
        create_baseline(test_db, "Test baseline 1")
        create_baseline(test_db, "Test baseline 2")

        response = client.get("/api/baselines/")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2

    def test_add_baseline(self, client):
        """Test adding a new baseline."""
        response = client.post(
            "/api/baselines/",
            json={"text": "New baseline prompt"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "id" in data
        assert data["text"] == "New baseline prompt"
